"""
DepthWizard — Ground Control Point (GCP) Reference Provider Extension Point
Authority: Phase 3 Specification (Phase 3.16)

Provides the formal architecture extension point for calibration via sparse Ground Control Points (GCPs).
Accepts survey/control points:
    (image_x, image_y, world_easting/lon, world_northing/lat, known_elevation_m)
Enables future point-based affine scale and datum offset estimation.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict, Any
import numpy as np

from backend.calibration.contracts import (
    GeospatialMetadata,
    ReferenceSourceType
)
from backend.calibration.providers.base import ReferenceProvider


@dataclass
class GroundControlPoint:
    """
    Individual Ground Control Point (GCP) observation.
    """
    id: str
    pixel_x: float
    pixel_y: float
    world_x: float  # Easting or Longitude
    world_y: float  # Northing or Latitude
    elevation_m: float  # Absolute metric elevation
    crs: str = "EPSG:4326"
    vertical_datum: Optional[str] = "EGM96"
    description: Optional[str] = None


class GCPReferenceProvider(ReferenceProvider):
    """
    Ground Control Point reference provider.
    Maintains a set of surveyed control points and interpolates/samples them onto the raster.
    """

    def __init__(
        self,
        gcps: Optional[List[GroundControlPoint]] = None,
        vertical_datum: str = "EGM96"
    ):
        self._gcps: List[GroundControlPoint] = gcps or []
        self._vertical_datum = vertical_datum

    def get_source_type(self) -> ReferenceSourceType:
        return ReferenceSourceType.GCP

    def get_source_name(self) -> str:
        return f"Ground Control Points ({len(self._gcps)} surveyed points)"

    def get_nominal_resolution_m(self) -> float:
        # GCPs represent discrete point observations
        return 0.1

    def get_vertical_datum(self) -> Optional[str]:
        return self._vertical_datum

    def add_gcp(self, gcp: GroundControlPoint) -> None:
        self._gcps.append(gcp)

    def is_available_for_bounds(self, bounds_wgs84: Dict[str, float]) -> bool:
        # Requires at least 3 non-collinear GCPs inside footprint for planar calibration
        if len(self._gcps) < 3:
            return False
        w, s, e, n = bounds_wgs84["west"], bounds_wgs84["south"], bounds_wgs84["east"], bounds_wgs84["north"]
        in_bounds = [p for p in self._gcps if (w <= p.world_x <= e and s <= p.world_y <= n)]
        return len(in_bounds) >= 3

    def sample_elevation_grid(
        self,
        source_metadata: GeospatialMetadata
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Samples sparse GCPs into a sparse reference elevation grid matching source dimensions.
        """
        if len(self._gcps) < 3:
            raise ValueError(
                f"Insufficient Ground Control Points: {len(self._gcps)} provided, at least 3 required."
            )

        dst_grid = np.full((source_metadata.height, source_metadata.width), np.nan, dtype=np.float32)
        valid_mask = np.zeros((source_metadata.height, source_metadata.width), dtype=bool)

        for p in self._gcps:
            px = int(round(p.pixel_x))
            py = int(round(p.pixel_y))
            if 0 <= px < source_metadata.width and 0 <= py < source_metadata.height:
                dst_grid[py, px] = p.elevation_m
                valid_mask[py, px] = True

        metadata = {
            "gcp_count": len(self._gcps),
            "matched_gcp_count": int(np.count_nonzero(valid_mask)),
            "vertical_datum": self._vertical_datum
        }

        return dst_grid, valid_mask, metadata
