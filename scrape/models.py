from pydantic import BaseModel, Field
from dataclasses import dataclass


@dataclass
class TileCoords:
    z: int
    x: int
    y: int


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
