from typing import Any
from pydantic import BaseModel, Field
from dataclasses import dataclass


class Tile(BaseModel):
    z: int
    x: int
    y: int

    def __str__(self):
        return f"({self.x}, {self.y}, {self.z})"


class BBox(BaseModel):
    west: float
    south: float
    east: float
    north: float

    def bbox(self) -> tuple[float, float, float, float]:
        """return bounding box points (xMin, yMin, xMax, yMax)"""
        return (self.west, self.south, self.east, self.north)


# ----------------------------
# Pydantic Models
# ----------------------------
class PointGeometry(BaseModel):
    type: str = Field(default="Point")
    # GeoJSON format: [longitude, latitude]
    coordinates: tuple[float, float]


class TrafficSignProperties(BaseModel):
    first_seen_at: int
    id: int
    last_seen_at: int
    value: str


class TrafficSignFeature(BaseModel):
    geometry: PointGeometry
    properties: TrafficSignProperties
    type: str = Field(default="Feature")

    @property
    def id(self) -> int:
        return self.properties.id

    @property
    def longitude(self) -> float:
        """Get longitude (first coordinate in GeoJSON format)."""
        return self.geometry.coordinates[0]

    @property
    def latitude(self) -> float:
        """Get latitude (second coordinate in GeoJSON format)."""
        return self.geometry.coordinates[1]


class MapboxTile(BaseModel):
    type: str = Field(default="FeatureCollection")
    features: list[TrafficSignFeature] = Field(default_factory=list)


class MapillaryImageCreator(BaseModel):
    id: int
    username: str


class MapillaryImage(BaseModel):
    id: int
    url: str
    camera_type: str
    lat: float
    lon: float
    creator: MapillaryImageCreator = None
    image_bytes: bytes = None  # PIL image bytes
    image: Any = None  # PIL image
    width: int = None
    height: int = None
    sequence: str = None


class MapillaryImageDetection(BaseModel):
    id: int
    value: str
    geometry: str  # base64 encoded geometry for bounding box
    image: MapillaryImage
    bbox: tuple[int, int, int, int] = None


class MapillaryImageWithDetections(BaseModel):
    image: MapillaryImage
    detections: list[MapillaryImageDetection] = Field(default_factory=list)
