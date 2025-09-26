import io
import base64
import time
from typing import Any, Iterable, Optional, Sequence

import requests
import mapbox_vector_tile
from PIL import Image
from vt2geojson.tools import vt_bytes_to_geojson

from models import MapboxTile, TileCoords, TrafficSignFeature
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
    try:
        return mapbox_vector_tile.decode(base64.b64decode(geom_bytes))
    except Exception as e:
        print("Error decoding geometry:", e)
        return None


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
    return [f for f in tile.features if f.properties.value in classes]


def get_images_by_id_and_type(
    id_results: list[TrafficSignFeature], classes: Iterable[str]
) -> list[dict[str, Any]]:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
      - fetch detections and keep only those with values in `classes`
      - download best-available thumbnail and convert polygon => (xmin, ymin, xmax, ymax) pixels
    Returns: [{image(PIL), class, bbox, creator_username, creator_id, lat, lon}, ...]
    """
    classes = set(classes)
    candidates: list[dict[str, Any]] = []
    candidate_ids: set[int] = set()

    # Pass 1: enumerate candidate images for all features
    print(f"Pass 1: enumerate candidate images for {len(id_results)} features")
    for feat in id_results:
        fid = feat.id
        try:
            feat_url = f"https://graph.mapillary.com/{fid}"
            feat_params = {
                "access_token": MAP_CONFIG.TOKEN,
                "fields": (
                    "id,object_value,"
                    f"images.limit({MAP_CONFIG.MAX_IMAGES_PER_ID})"
                    "{id,camera_type,is_pano,width,height,"
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
                        {
                            "id": imeta["id"],
                            "url": url,
                            "camera_type": imeta["camera_type"],
                            "lat": feat.latitude,
                            "lon": feat.longitude,
                        }
                    )
                    candidate_ids.add(imeta["id"])

        except requests.RequestException as e:
            print(f"[warn] feature {fid} fetch failed: {e}")
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
    print(f"Found {len(candidate_ids)} unique candidate images")
    # Pass 2: pull detections & images
    results: list[dict[str, Any]] = []
    print(f"Pass 2: pull detections & images for {len(candidates)} candidate images")
    for cand in candidates:
        image_id = cand["id"]
        img_url = cand["url"]
        lat = cand["lat"]
        lon = cand["lon"]

        # 2a) detections
        try:
            det_url = f"https://graph.mapillary.com/{image_id}/detections"
            det_params = {
                "access_token": MAP_CONFIG.TOKEN,
                "fields": "id,value,geometry,image{id,creator}",
            }
            dr = MAP_CONFIG.session.get(det_url, params=det_params, timeout=60)
            dr.raise_for_status()
            dets_raw = dr.json().get("data", []) or []
        except requests.RequestException as e:
            print(f"[warn] detections fetch failed for image {image_id}: {e}")
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
            continue

        dets = [d for d in dets_raw if d.get("value") in classes]
        if not dets:
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
            continue

        # Grab creator info if present
        creator_username: Optional[str] = None
        creator_id: Optional[str] = None
        first_img = dets_raw[0].get("image") or {}
        creator = first_img.get("creator") or {}
        if creator:
            creator_id = creator.get("id")
            creator_username = creator.get("username")

        # 2b) image
        print(f"Pass 2b: download image for {image_id}")
        try:
            ir = MAP_CONFIG.session.get(img_url, timeout=120)
            ir.raise_for_status()
            im = Image.open(io.BytesIO(ir.content)).convert("RGB")
            W, H = im.size
        except requests.RequestException as e:
            print(f"[warn] image download failed for {image_id}: {e}")
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)
            continue

        # 2c) polygons => bboxes
        print(f"Pass 2c: polygons => bboxes for {len(dets)} detections")
        for det in dets:
            geom_raw = det.get("geometry")
            if not geom_raw:
                continue

            decoded = decode_geometry(geom_raw)
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

                    proj = project_coords(ring, W, H, extent=extent)
                    xs = [p[0] for p in proj]
                    ys = [p[1] for p in proj]
                    xmin, xmax = min(xs), max(xs)
                    ymin, ymax = min(ys), max(ys)
                    bxmin, bymin, bxmax, bymax = clamp_box(xmin, ymin, xmax, ymax, W, H)

                    results.append(
                        {
                            "image": im,
                            "class": det.get("value"),
                            "bbox": (bxmin, bymin, bxmax, bymax),
                            "creator_username": creator_username,
                            "creator_id": creator_id,
                            "lat": lat,
                            "lon": lon,
                            "image_id": image_id,
                        }
                    )

        time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    return results


if __name__ == "__main__":
    tile_coords = TileCoords(z=14, x=4578, y=5979)
    a = get_valid_ids_in_tile(tile_coords, ["regulatory--no-left-turn--g2"])
