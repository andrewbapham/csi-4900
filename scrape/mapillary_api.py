import time
import random
import logging
import io
from typing import Any, Optional, Iterable

import requests
from PIL import Image
from vt2geojson.tools import vt_bytes_to_geojson

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
            image=image,
        )
        for d in dets_raw
    ]
    return dets


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


def get_candidate_images(id_results: list[TrafficSignFeature]) -> list[MapillaryImage]:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
    Returns: [{id, url, lat, lon}, ...]
    """
    candidates: list[MapillaryImage] = []
    candidate_ids: set[int] = set()
    for feat in id_results:
        fid = feat.id
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
                    candidates.append(
                        MapillaryImage(
                            id=imeta["id"],
                            url=url,
                            camera_type=imeta["camera_type"],
                            lat=feat.latitude,
                            lon=feat.longitude,
                            sequence=imeta["sequence"],
                        )
                    )
                    candidate_ids.add(imeta["id"])

        except requests.RequestException as e:
            logger.warning("feature %s fetch failed: %s", fid, e)
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
    return candidates


def get_images_by_id(
    id_results: list[TrafficSignFeature],
) -> list[MapillaryImageWithDetections]:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
      - fetch detections and keep only those with values in `classes`
      - download best-available thumbnail and convert polygon => (xmin, ymin, xmax, ymax) pixels
    Returns: [{image(PIL), class, bbox, creator_username, creator_id, lat, lon}, ...]
    """

    candidates = get_candidate_images(id_results)
    logger.info(
        "Found %d unique candidate images for %d ids", len(candidates), len(id_results)
    )
    results: dict[int, MapillaryImageWithDetections] = {}

    for cand in candidates:
        dets = get_detections_by_image(cand)
        if not dets:
            logger.warning("no detections found for %s", cand.id)
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
            continue

        logger.info("Downloading image %s", cand.id)
        download_image(cand)
        logger.info(
            "Image %s downloaded, size: %dx%d", cand.id, cand.width, cand.height
        )

        for det in dets:
            if not det.geometry:
                continue

            decoded = decode_geometry(det.geometry)
            if not decoded:
                continue

            for _, layer in decoded.items():
                extent = layer.get("extent", 4096)
                for f in layer.get("features") or []:
                    geom = f.get("geometry") or {}
                    if geom.get("type") != "Polygon":
                        continue

                    ring = (geom.get("coordinates") or [[]])[0]
                    if not ring:
                        continue

                    proj = project_coords(ring, cand.width, cand.height, extent=extent)
                    xs = [p[0] for p in proj]
                    ys = [p[1] for p in proj]
                    xmin, xmax = min(xs), max(xs)
                    ymin, ymax = min(ys), max(ys)
                    bxmin, bymin, bxmax, bymax = clamp_box(
                        xmin, ymin, xmax, ymax, cand.width, cand.height
                    )

                    if cand.id not in results:
                        results[cand.id] = MapillaryImageWithDetections(
                            image=cand, detections=[]
                        )

                    results[cand.id].detections.append(
                        MapillaryImageDetection(
                            id=det.id,
                            value=det.value,
                            geometry=det.geometry,
                            image=cand,
                            bbox=(bxmin, bymin, bxmax, bymax),
                        )
                    )

        time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    return results.values()


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
    # Convert MVT to GeoJSON
    geojson_data = vt_bytes_to_geojson(data, tile.x, tile.y, tile.z)
    logger.debug("Converted MVT to GeoJSON")

    # Parse features from GeoJSON
    mapbox_tile = MapboxTile.model_validate(geojson_data)

    logger.info("found %d features for tile %s", len(mapbox_tile.features), str(tile))
    # return tile.features
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

    for tile_coords_item in tiles:
        feats = get_valid_ids_in_tile(tile_coords_item, classes)
        for f in feats:
            if f.id in seen_ids:
                continue
            seen_ids.add(f.id)
            results.append(f)
        time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    return results
