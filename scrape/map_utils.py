import io
import base64
import time
from typing import Any, Iterable, Optional, Sequence

import requests
import mapbox_vector_tile
from PIL import Image
from vt2geojson.tools import vt_bytes_to_geojson

from models import (
    MapboxTile,
    MapillaryImageCreator,
    MapillaryImageWithDetections,
    TileCoords,
    TrafficSignFeature,
    MapillaryImage,
    MapillaryImageDetection,
)
from config import MAP_CONFIG
from api import call_map_api


# ----------------------------
# Helpers
# ----------------------------


def get_thumb_url(meta: dict[str, Any]) -> Optional[str]:
    """Prefer the largest available variant."""
    return (
        meta.get("thumb_original_url")
        or meta.get("thumb_2048_url")
        or meta.get("thumb_1024_url")
        or meta.get("thumb_256_url")
    )


def is_perspective_like(meta: dict[str, Any]) -> bool:
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


def decode_geometry(geom_bytes: str) -> Optional[dict[str, Any]]:
    """Base64 MVT => dict, or None."""
    return mapbox_vector_tile.decode(base64.b64decode(geom_bytes))


def project_coords(
    coords: Sequence[tuple[float, float]], img_w: int, img_h: int, extent: int = 4096
) -> list[tuple[float, float]]:
    """
    MVT coords: origin at bottom-left (0,0). Convert to image pixels with top-left origin.
      x_px = x / extent * img_w
      y_px = img_h - (y / extent * img_h)
    """
    sx, sy = img_w / extent, img_h / extent
    return [(x * sx, img_h - (y * sy)) for x, y in coords]


def clamp_box(
    xmin: float, ymin: float, xmax: float, ymax: float, W: int, H: int
) -> tuple[int, int, int, int]:
    """Clamp to image bounds with sane ordering."""
    xi1 = max(0, min(int(round(xmin)), W - 1))
    yi1 = max(0, min(int(round(ymin)), H - 1))
    xi2 = max(0, min(int(round(xmax)), W - 1))
    yi2 = max(0, min(int(round(ymax)), H - 1))
    if xi2 < xi1:
        xi1, xi2 = xi2, xi1
    if yi2 < yi1:
        yi1, yi2 = yi2, yi1
    return xi1, yi1, xi2, yi2


# ----------------------------
# Public functions
# ----------------------------
def get_valid_ids_in_tile(
    tile_coords: TileCoords, classes: Iterable[str]
) -> list[TrafficSignFeature]:
    """
    Query `map_features` for traffic_sign features in a bbox.
    Returns: [{id, object_value, geometry, lat, lon, bbox}, ...]
    bbox = (west_lon, south_lat, east_lon, north_lat)
    """
    if tile_coords.z != 14:
        raise ValueError(
            f"Tile coordinates must be at zoom (z) level 14, got {tile_coords.z}"
        )
    url = "https://tiles.mapillary.com/maps/vtp/mly_map_feature_traffic_sign/2/{z}/{x}/{y}?access_token={token}"

    out: list[TrafficSignFeature] = []

    request_url = url.format(
        z=tile_coords.z, x=tile_coords.x, y=tile_coords.y, token=MAP_CONFIG.TOKEN
    )
    print("request_url:", request_url)
    status, data = call_map_api(request_url, raw_bytes=True)
    print("completed call_map_api, status:", status)
    if status != "ok" or not data:
        return out  # return what we have
    # Convert MVT to GeoJSON
    geojson_data = vt_bytes_to_geojson(
        data, tile_coords.x, tile_coords.y, tile_coords.z
    )
    print("Converted MVT to GeoJSON")

    # Parse features from GeoJSON
    tile = MapboxTile.model_validate(geojson_data)

    print(f"found {len(tile.features)} features")
    # return tile.features
    if classes:
        return [f for f in tile.features if f.properties.value in classes]
    return tile.features


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
                if not is_perspective_like(imeta):
                    continue
                url = get_thumb_url(imeta)
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
            print(f"[warn] feature {fid} fetch failed: {e}")
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
    return candidates


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
        print(f"[warn] detections fetch failed for image {image.id}: {e}")
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


def get_images_by_id_and_type(
    id_results: list[TrafficSignFeature],
) -> list[MapillaryImageDetection]:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
      - fetch detections and keep only those with values in `classes`
      - download best-available thumbnail and convert polygon => (xmin, ymin, xmax, ymax) pixels
    Returns: [{image(PIL), class, bbox, creator_username, creator_id, lat, lon}, ...]
    """

    candidates = get_candidate_images(id_results)
    print(f"Found {len(candidates)} unique candidate images")
    results: dict[int, MapillaryImageWithDetections] = {}

    for cand in candidates:
        dets = get_detections_by_image(cand)
        if not dets:
            print(f"[warn] no detections found for {cand.id}")
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
            continue

        print(f"Downloading image {cand.id}")
        download_image(cand)
        print(f"Image {cand.id} downloaded, size: {cand.width}x{cand.height}")

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


if __name__ == "__main__":
    tile_coords = TileCoords(z=14, x=4578, y=5979)
    a = get_valid_ids_in_tile(tile_coords, ["regulatory--no-left-turn--g2"])
