import time
import random
import logging
import io
import os
from typing import Any, Optional, Iterable
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import tqdm
import requests
from PIL import Image
from vt2geojson.tools import vt_bytes_to_geojson
import mapbox_vector_tile

from config import MAP_CONFIG
from models import (
    MapillaryImage,
    MapillaryImageDetection,
    MapillaryImageCreator,
    TrafficSignFeature,
    MapboxTile,
    Tile,
    BBox,
)
from map_utils import decode_geometry, get_tiles_in_bbox, project_coords, clamp_box

logger = logging.getLogger(__name__)


TRAFFIC_SIGN_REGEX = r"^regulatory--.*|^information--.*|^warning--.*|^complementary--.*"


def _backoff_sleep(attempt: int) -> None:
    time.sleep(MAP_CONFIG.RETRY_BASE_SLEEP * (2**attempt) + random.uniform(0, 0.5))


def _call_map_api(
    url: str, params: Optional[dict] = None, raw_bytes: bool = False
) -> tuple[str, Optional[dict]]:
    """GET with retry/backoff. Returns ("ok", json) | ("hard", None) | ("fail", None)."""
    for attempt in range(MAP_CONFIG.RETRY_TRIES):
        try:
            logger.debug(
                "attempt %d/%d calling map_api with url: %s",
                attempt,
                MAP_CONFIG.RETRY_TRIES,
                url,
            )
            r = MAP_CONFIG.session.get(url, params=params, timeout=30)
            code = r.status_code
            logger.debug("HTTP status code: %d", code)
            if code == 429 or 500 <= code < 600:
                _backoff_sleep(attempt)
                continue

            if 400 <= code < 500:
                # Log and stop; caller decides what to do with "hard".
                try:
                    err = r.json()
                except requests.RequestException:
                    err = r.text
                logger.warning("[hard] %d %s params=%s body=%s", code, url, params, err)
                return "hard", None

            r.raise_for_status()
            if raw_bytes:
                return "ok", r.content
            return "ok", r.json()

        except requests.Timeout:
            _backoff_sleep(attempt)
            continue
        except requests.RequestException as e:
            logger.warning("Request failed: %s", e)
            _backoff_sleep(attempt)
            continue

    return "fail", None


def _get_thumb_url(meta: dict[str, Any]) -> Optional[str]:
    """Prefer the largest available variant."""
    return (
        meta.get("thumb_original_url")
        or meta.get("thumb_2048_url")
        or meta.get("thumb_1024_url")
        or meta.get("thumb_256_url")
    )


def _is_perspective_like(meta: dict[str, Any]) -> bool:
    """Filter out non-perspective (panos/fisheye/etc.)."""
    ct = str((meta or {}).get("camera_type", "")).lower()
    if ct in MAP_CONFIG.REJECT_CT:
        return False

    if (meta or {}).get("is_pano"):
        return False

    w, h = meta.get("width"), meta.get("height")
    if (
        isinstance(w, int)
        and isinstance(h, int)
        and h > 0
        and (w / h) >= MAP_CONFIG.ASPECT_PANO_RATIO
    ):
        return False

    return True


def _parse_mvt_bbox_coords_to_pixel_coords_bbox(
    bbox: list[tuple[float, float]], image: MapillaryImage, extent: int = 4096
) -> tuple[int, int, int, int]:
    """
    Parses the Map Vectory Tile (MVT) format bbox (originating at bottom-left (0,0))
    to pixel coordinates (top-left (0,0)) and returns a tuple of representing the bounding box.
    """
    proj = project_coords(bbox, image.width, image.height, extent=extent)
    xs = [p[0] for p in proj]
    ys = [p[1] for p in proj]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    bxmin, bymin, bxmax, bymax = clamp_box(
        xmin, ymin, xmax, ymax, image.width, image.height
    )
    return bxmin, bymin, bxmax, bymax


def _parse_geometry_to_multiple_bboxes(
    geometry: str, image: MapillaryImage
) -> list[tuple[int, int, int, int]]:
    """
    Parse the detections geometry MVT to a list of pixel coordinate bounding boxes.
    Each box is a tuple of (xmin, ymin, xmax, ymax).
    """
    decoded = decode_geometry(geometry)
    if not decoded:
        return []
    boxes = []
    for _, layer in decoded.items():
        extent = layer.get("extent", 4096)
        for feature in layer.get("features") or []:
            geom = feature.get("geometry") or {}
            if geom.get("type") != "Polygon":
                continue
            box = (geom.get("coordinates") or [[]])[0]
            if not box:
                continue

            new_box = _parse_mvt_bbox_coords_to_pixel_coords_bbox(box, image, extent)
            boxes.append(new_box)

    return boxes


def download_image(image: MapillaryImage) -> None:
    """
    Download an image from the Mapillary API.
    Updates the image object in place.
    """
    ir = MAP_CONFIG.session.get(image.url, timeout=120)
    ir.raise_for_status()
    image.image_bytes = ir.content
    image.image = Image.open(io.BytesIO(ir.content)).convert("RGB")
    image.width, image.height = image.image.size


def get_detections_by_image(image: MapillaryImage) -> list[MapillaryImageDetection]:
    """
    Fetch detections in an image.
    """
    try:
        det_url = f"https://graph.mapillary.com/{image.id}/detections"
        det_params = {
            "fields": "id,value,geometry,image{id,creator}",
        }
        dr = MAP_CONFIG.session.get(det_url, params=det_params, timeout=60)
        dr.raise_for_status()
        dets_raw = dr.json().get("data", []) or []
    except requests.RequestException as e:
        logger.warning("detections fetch failed for image %s: %s", image.id, e)
        return []
    if not dets_raw:
        return []

    # Grab creator info for this image from first detection object if present
    first_det = dets_raw[0]
    creator = MapillaryImageCreator(
        id=first_det.get("image", {}).get("creator", {}).get("id"),
        username=first_det.get("image", {}).get("creator", {}).get("username"),
    )
    image.creator = creator

    dets = [
        MapillaryImageDetection(
            id=d.get("id"),
            value=d.get("value"),
            geometry=d.get("geometry"),
            image_id=image.id,
        )
        for d in dets_raw
    ]

    return dets


def get_candidate_images(id_results: list[TrafficSignFeature]) -> list[MapillaryImage]:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
    Returns: [{id, url, lat, lon}, ...]
    """
    candidates: list[MapillaryImage] = []
    candidate_ids: set[int] = set()
    for feat in tqdm.tqdm(
        id_results,
        total=len(id_results),
        desc="Getting candidate images",
        unit="feature",
    ):
        fid = feat.id
        logger.debug("fetching images for feature %s", fid)
        try:
            feat_url = f"https://graph.mapillary.com/{fid}"
            feat_params = {
                "fields": (
                    "id,object_value,"
                    f"images.limit({MAP_CONFIG.MAX_IMAGES_PER_ID})"
                    "{id,camera_type,is_pano,width,height,sequence,"
                    "thumb_original_url,thumb_2048_url,thumb_1024_url,thumb_256_url}"
                ),
            }
            r = MAP_CONFIG.session.get(feat_url, params=feat_params, timeout=60)
            r.raise_for_status()
            info = r.json()

            for imeta in (info.get("images") or {}).get("data", []) or []:
                if not _is_perspective_like(imeta):
                    continue
                url = _get_thumb_url(imeta)
                if not url:
                    continue

                if not imeta["id"] in candidate_ids:
                    candidate = MapillaryImage(
                        id=imeta["id"],
                        url=url,
                        camera_type=imeta["camera_type"],
                        lat=feat.latitude,
                        lon=feat.longitude,
                        sequence=imeta["sequence"],
                        width=imeta["width"],
                        height=imeta["height"],
                    )

                    candidates.append(candidate)
                    candidate_ids.add(candidate.id)

        except requests.RequestException as e:
            logger.warning("feature %s fetch failed: %s", fid, e)
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
    return candidates


def _save_image_with_detections(
    image: MapillaryImage, output_dir: str, json_only=False
) -> None:
    dets = get_detections_by_image(image)
    dets = [det for det in dets if re.match(TRAFFIC_SIGN_REGEX, det.value)]

    if not dets:
        logger.warning("no detections found for %s", image.id)
        return

    if not json_only:
        download_image(image)
        logger.debug(
            "Image %s downloaded, size: %dx%d", image.id, image.width, image.height
        )

    for det in dets:
        detection_bboxes = _parse_geometry_to_multiple_bboxes(det.geometry, image)
        if not detection_bboxes:
            continue

        for detection_bbox in detection_bboxes:
            image.detections.append(
                MapillaryImageDetection(
                    id=det.id,
                    value=det.value,
                    geometry=det.geometry,
                    bbox=detection_bbox,
                    image_id=image.id,
                )
            )

    if not json_only:
        image.save_image_and_detections(f"{output_dir}/{image.id}")
    else:
        image.save_detections(f"{output_dir}/{image.id}/{image.id}.json")
    # clear out to save mem when processing huge amounts of images
    image.image = None
    image.image_bytes = None


def save_images_with_detections_by_id(
    id_results: list[TrafficSignFeature],
    output_dir: str = "images",
    json_only: bool = False,
) -> int:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
      - fetch detections and keep only those with values in `classes`
      - download best-available thumbnail and convert polygon => (xmin, ymin, xmax, ymax) pixels
      - save images and detections to disk in batches to manage memory
    Returns: number of images saved
    """

    # Split id_results into roughly equal chunks
    def chunkify(lst, n):
        k, m = divmod(len(lst), n)
        return [lst[i * k + min(i, m) : (i + 1) * k + min(i + 1, m)] for i in range(n)]

    num_chunks = MAP_CONFIG.MAX_CONCURRENT_WORKERS
    id_chunks = chunkify(id_results, num_chunks)

    # get candidate images
    candidates: list[MapillaryImage] = []
    with ThreadPoolExecutor(max_workers=MAP_CONFIG.MAX_CONCURRENT_WORKERS) as executor:
        futures = [executor.submit(get_candidate_images, chunk) for chunk in id_chunks]
        for future in tqdm.tqdm(
            as_completed(futures),
            total=len(futures),
            desc=f"Getting candidate images in chunks of size {num_chunks}",
            unit="chunk",
        ):
            result = future.result()
            if result:
                candidates.extend(result)

    logger.info(
        "Found %d unique candidate images for %d ids", len(candidates), len(id_results)
    )

    existing_image_set = set()
    for entry in os.listdir(output_dir):
        existing_image_set.add(entry)
    logger.info("%d existing images", len(existing_image_set))
    candidates = [cand for cand in candidates if str(cand.id) not in existing_image_set]
    logger.info("found %d new candidate images", len(candidates))

    # get detections and their bboxes in each candidate image
    saved = 0
    with ThreadPoolExecutor(max_workers=MAP_CONFIG.MAX_CONCURRENT_WORKERS) as executor:
        future_to_cand = {
            executor.submit(
                _save_image_with_detections, cand, output_dir, json_only
            ): cand
            for cand in candidates
        }
        for future in tqdm.tqdm(
            as_completed(future_to_cand.keys()),
            total=len(future_to_cand),
            desc="Saving images with detections",
            unit="image",
        ):
            cand = future_to_cand[future]
            if cand:
                saved += 1
                # clear image from memory
                cand.image = None
                cand.image_bytes = None

    logger.info("Saved %d images with detections", saved)
    return saved


def filter_only_traffic_sign_features(
    features: list[TrafficSignFeature],
) -> list[TrafficSignFeature]:
    """
    Filter out non-traffic sign features.
    """
    return [f for f in features if re.match(TRAFFIC_SIGN_REGEX, f.properties.value)]


def get_valid_ids_in_tile(
    tile: Tile, classes: Iterable[str] = None
) -> list[TrafficSignFeature]:
    """
    Query `map_features` for traffic_sign features in a bbox.
    Returns: [{id, object_value, geometry, lat, lon, bbox}, ...]
    bbox = (west_lon, south_lat, east_lon, north_lat)
    """
    if tile.z != 14:
        raise ValueError(f"Tile coordinates must be at zoom (z) level 14, got {tile.z}")
    url = "https://tiles.mapillary.com/maps/vtp/mly_map_feature_traffic_sign/2/{z}/{x}/{y}?access_token={token}"

    out: list[TrafficSignFeature] = []

    request_url = url.format(z=tile.z, x=tile.x, y=tile.y, token=MAP_CONFIG.TOKEN)
    logger.debug("request_url: %s", request_url)
    status, data = _call_map_api(request_url, raw_bytes=True)
    logger.debug("completed call_map_api, status: %s", status)
    if status != "ok" or not data:
        return out  # return what we have

    geojson_data = vt_bytes_to_geojson(data, tile.x, tile.y, tile.z)
    logger.debug("Converted MVT to GeoJSON")

    mvt_repr = mapbox_vector_tile.decode(data)
    if "water" in mvt_repr:
        logger.warning("tile %s is empty", str(tile))
        # this is the representation of the tile when it is empty. wtf mapillary??
        return []

    mapbox_tile = MapboxTile.model_validate(geojson_data)
    logger.info("found %d features for tile %s", len(mapbox_tile.features), str(tile))

    if classes:
        return [f for f in mapbox_tile.features if f.properties.value in classes]
    else:
        return mapbox_tile.features


def get_valid_ids_in_bbox(
    bbox: BBox, classes: Iterable[str] = None, strict: bool = False
) -> list[TrafficSignFeature]:
    """
    Query all tiles intersecting a bounding box and aggregate traffic sign features.

    - bbox: geographic bounding box
    - classes: iterable of class values to keep (empty/None => keep all)
    - strict: when True, only tiles fully contained in bbox are queried

    Returns a de-duplicated list of features across all tiles.
    """
    tiles = get_tiles_in_bbox(bbox, strict=strict)
    seen_ids: set[int] = set()
    results: list[TrafficSignFeature] = []

    for tile_coords_item in tqdm.tqdm(
        tiles, desc="Getting features in tiles", unit="tile"
    ):
        feats = get_valid_ids_in_tile(tile_coords_item, classes)
        for f in feats:
            if f.id in seen_ids:
                continue
            seen_ids.add(f.id)
            results.append(f)
        time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    return results
