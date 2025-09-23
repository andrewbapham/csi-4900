from __future__ import annotations

import os
import sys
import io
import time
import base64
import random
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import requests
import mapbox_vector_tile
from PIL import Image


# ----------------------------
# Config
# ----------------------------
class MAP_CONFIG:
    TOKEN = os.getenv("MAPILLARY_TOKEN")
    if not TOKEN:
        sys.exit("ERROR: set MAPILLARY_TOKEN (starts with 'MLY|...')")

    # (kept for parity even if unused by these funcs)
    DLON = 0.75
    DLAT = 0.50

    # API politeness / retries
    SLEEP_BETWEEN_PAGES = 0.10
    RETRY_BASE_SLEEP    = 1.0
    RETRY_TRIES         = 6

    # Image selection
    MAX_IMAGES_PER_ID   = 50
    ASPECT_PANO_RATIO   = 2.0  # width/height >= => treat as panoramic
    REJECT_CT           = {"spherical", "equirectangular", "fisheye"}

    # Shared session with token
    session = requests.Session()
    session.params.update({"access_token": TOKEN})


# ----------------------------
# Helpers
# ----------------------------
def _backoff_sleep(attempt: int) -> None:
    time.sleep(MAP_CONFIG.RETRY_BASE_SLEEP * (2 ** attempt) + random.uniform(0, 0.5))


def call_map_api(url: str, params: Optional[Dict[str, Any]] = None) -> Tuple[str, Optional[Dict[str, Any]]]:
    """GET with retry/backoff. Returns ("ok", json) | ("hard", None) | ("fail", None)."""
    for attempt in range(MAP_CONFIG.RETRY_TRIES):
        try:
            r = MAP_CONFIG.session.get(url, params=params, timeout=30)
            code = r.status_code

            if code == 429 or 500 <= code < 600:
                _backoff_sleep(attempt)
                continue

            if 400 <= code < 500:
                # Log and stop; caller decides what to do with "hard".
                try:
                    err = r.json()
                except Exception:
                    err = r.text
                print(f"[hard] {code} {url} params={params} body={err}")
                return "hard", None

            r.raise_for_status()
            return "ok", r.json()

        except requests.Timeout:
            _backoff_sleep(attempt)
            continue
        except requests.RequestException:
            _backoff_sleep(attempt)
            continue
        except Exception as e:
            print(f"[hard-exc] {e}")
            return "hard", None

    return "fail", None


def get_thumb_url(meta: Dict[str, Any]) -> Optional[str]:
    """Prefer the largest available variant."""
    return (
        meta.get("thumb_original_url")
        or meta.get("thumb_2048_url")
        or meta.get("thumb_1024_url")
        or meta.get("thumb_256_url")
    )


def is_perspective_like(meta: Dict[str, Any]) -> bool:
    """Filter out non-perspective (panos/fisheye/etc.)."""
    ct = str((meta or {}).get("camera_type", "")).lower()
    if ct in MAP_CONFIG.REJECT_CT:
        return False

    if (meta or {}).get("is_pano"):
        return False

    w, h = meta.get("width"), meta.get("height")
    if isinstance(w, int) and isinstance(h, int) and h > 0 and (w / h) >= MAP_CONFIG.ASPECT_PANO_RATIO:
        return False

    return True


def decode_geometry(geom_b64: str) -> Optional[Dict[str, Any]]:
    """Base64 MVT => dict, or None."""
    try:
        return mapbox_vector_tile.decode(base64.b64decode(geom_b64))
    except Exception:
        return None


def project_coords(coords: Sequence[Tuple[float, float]], img_w: int, img_h: int, extent: int = 4096) -> List[Tuple[float, float]]:
    """
    MVT coords: origin at bottom-left (0,0). Convert to image pixels with top-left origin.
      x_px = x / extent * img_w
      y_px = img_h - (y / extent * img_h)
    """
    sx, sy = img_w / extent, img_h / extent
    return [(x * sx, img_h - (y * sy)) for x, y in coords]


def clamp_box(xmin: float, ymin: float, xmax: float, ymax: float, W: int, H: int) -> Tuple[int, int, int, int]:
    """Clamp to image bounds with sane ordering."""
    xi1 = max(0, min(int(round(xmin)), W - 1))
    yi1 = max(0, min(int(round(ymin)), H - 1))
    xi2 = max(0, min(int(round(xmax)), W - 1))
    yi2 = max(0, min(int(round(ymax)), H - 1))
    if xi2 < xi1: xi1, xi2 = xi2, xi1
    if yi2 < yi1: yi1, yi2 = yi2, yi1
    return xi1, yi1, xi2, yi2


# ----------------------------
# Public functions
# ----------------------------
def get_valid_ids(bbox: Tuple[float, float, float, float], classes: Iterable[str]) -> List[Dict[str, Any]]:
    """
    Query `map_features` for traffic_sign features in a bbox.
    Returns: [{id, object_value, geometry, lat, lon, bbox}, ...]
    bbox = (west_lon, south_lat, east_lon, north_lat)
    """
    url = "https://graph.mapillary.com/map_features"
    params = {
        "layer": "traffic_sign",
        "fields": "id,object_value,geometry",
        "bbox": ",".join(map(str, bbox)),
        "limit": "1000",
        # keep explicit for absolute 'next' links
        "access_token": MAP_CONFIG.TOKEN,
    }

    out: List[Dict[str, Any]] = []

    while True:
        status, data = call_map_api(url, params=params)
        if status != "ok" or not data:
            return out  # return what we have

        for feat in (data.get("data") or []):
            val = (feat.get("object_value") or "")
            if val not in classes:
                continue

            # GeoJSON Point is [lon, lat]
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates") or [None, None]
            lon, lat = coords[0], coords[1]

            out.append({
                "id":           feat.get("id"),
                "object_value": val,
                "geometry":     geom,
                "lat":          lat,
                "lon":          lon,
                "bbox":         bbox,
            })

        next_url = (data.get("paging") or {}).get("next")
        if not next_url:
            break

        url, params = next_url, None
        time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    return out


def get_images_by_id_and_type(id_results: Sequence[Dict[str, Any]], classes: Iterable[str]) -> List[Dict[str, Any]]:
    """
    For each feature id:
      - fetch up to MAX_IMAGES_PER_ID images
      - keep perspective-like images
      - fetch detections and keep only those with values in `classes`
      - download best-available thumbnail and convert polygon => (xmin, ymin, xmax, ymax) pixels
    Returns: [{image(PIL), class, bbox, creator_username, creator_id, lat, lon}, ...]
    """
    classes = set(classes)
    candidates: List[Dict[str, Any]] = []

    # Pass 1: enumerate candidate images for all features
    for feat in id_results:
        fid = feat.get("id")
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

                candidates.append({
                    "id":          imeta["id"],
                    "url":         url,
                    "camera_type": imeta.get("camera_type"),
                    "lat":         feat.get("lat"),
                    "lon":         feat.get("lon"),
                })

        except requests.RequestException as e:
            print(f"[warn] feature {fid} fetch failed: {e}")
            time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    # Pass 2: pull detections & images
    results: List[Dict[str, Any]] = []

    for cand in candidates:
        image_id = cand["id"]
        img_url  = cand["url"]
        lat      = cand["lat"]
        lon      = cand["lon"]

        # 2a) detections
        try:
            det_url = f"https://graph.mapillary.com/{image_id}/detections"
            det_params = {"access_token": MAP_CONFIG.TOKEN, "fields": "id,value,geometry,image{id,creator}"}
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
        first_img = (dets_raw[0].get("image") or {})
        creator = first_img.get("creator") or {}
        if creator:
            creator_id = creator.get("id")
            creator_username = creator.get("username")

        # 2b) image
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
        for det in dets:
            geom_raw = det.get("geometry")
            if not geom_raw:
                continue

            decoded = decode_geometry(geom_raw)
            if not decoded:
                continue

            for _, layer in decoded.items():
                extent = layer.get("extent", 4096)
                for f in (layer.get("features") or []):
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

                    results.append({
                        "image":            im,
                        "class":            det.get("value"),
                        "bbox":             (bxmin, bymin, bxmax, bymax),
                        "creator_username": creator_username,
                        "creator_id":       creator_id,
                        "lat":              lat,
                        "lon":              lon,
                    })

        time.sleep(MAP_CONFIG.SLEEP_BETWEEN_PAGES)

    return results
