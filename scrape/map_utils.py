import base64
import math
import logging
from typing import Any, Optional, Sequence

import mapbox_vector_tile

from models import (
    Tile,
    BBox,
)

logger = logging.getLogger(__name__)


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


def lonlat_to_tile(lon: float, lat: float, z: int) -> tuple[int, int]:
    """
    Convert longitude and latitude to tile x, y at zoom z.
    """
    n = 2**z
    x = (lon + 180.0) / 360.0 * n
    lat_rad = math.radians(lat)
    y = (
        (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi)
        / 2.0
        * n
    )
    return int(x), int(y)


def tile_to_bbox(tile: Tile) -> BBox:
    """
    Convert tile coordinates to a bounding box.
    """
    zoom_factor = 2**tile.z
    ul_lon_deg = tile.x / zoom_factor * 360.0 - 180.0
    ul_lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * tile.y / zoom_factor)))
    ul_lat_deg = math.degrees(ul_lat_rad)

    lr_lon_deg = (tile.x + 1) / zoom_factor * 360.0 - 180.0
    lr_lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * (tile.y + 1) / zoom_factor)))
    lr_lat_deg = math.degrees(lr_lat_rad)
    return BBox(west=ul_lon_deg, south=lr_lat_deg, east=lr_lon_deg, north=ul_lat_deg)


def tile_in_bbox(tile: Tile, bbox: BBox) -> bool:
    """
    Check if a tile is fully inside in a bounding box.
    """
    tile_bbox = tile_to_bbox(tile)
    return (
        tile_bbox.west >= bbox.west
        and tile_bbox.east <= bbox.east
        and tile_bbox.south >= bbox.south
        and tile_bbox.north <= bbox.north
    )


def get_tiles_in_bbox(bbox: BBox, strict=False) -> list[Tile]:
    """
    From a bounding box, get all vector tiles of zoom level 14 that overlap in it.
    If strict is True, only return tiles that fully contain the bbox.
    """
    z = 14
    x_min, y_max = lonlat_to_tile(bbox.west, bbox.north, z)
    x_max, y_min = lonlat_to_tile(bbox.east, bbox.south, z)

    # Clamp to valid tile indices
    n = 2**z
    x_min = max(0, min(x_min, n - 1))
    x_max = max(0, min(x_max, n - 1))
    y_min = max(0, min(y_min, n - 1))
    y_max = max(0, min(y_max, n - 1))

    tiles = []
    for x in range(min(x_min, x_max), max(x_min, x_max) + 1):
        for y in range(min(y_min, y_max), max(y_min, y_max) + 1):
            if strict and not tile_in_bbox(Tile(z=z, x=x, y=y), bbox):
                continue
            tiles.append(Tile(z=z, x=x, y=y))
    return tiles
