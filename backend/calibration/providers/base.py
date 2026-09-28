"""
DepthWizard — Reference Provider Base Contract
Authority: Phase 3 Specification (Phases 3.2, 3.5, 3.16)

Defines the polymorphic interface for geospatial reference sources.
Supports both DEM-based reference sources (CartoDEM, SRTM) and
the GCP (Ground Control Point) extension point.
"""

from abc import ABC, abstractmethod
from typing import Optional, Tuple, Dict, Any
import numpy as np
from backend.calibration.contracts import (
    GeospatialMetadata,
    ReferenceSourceType
)


class ReferenceProvider(ABC):
    """
    Abstract base class for all elevation reference providers.
    """

    @abstractmethod
    def get_source_type(self) -> ReferenceSourceType:
        """Returns the canonical reference source type identifier."""
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Returns human-readable name of the reference dataset."""
        pass

    @abstractmethod
    def get_nominal_resolution_m(self) -> float:
        """Returns nominal spatial resolution in meters (e.g. 30.0 for 1 arc-second DEM)."""
        pass

    @abstractmethod
    def get_vertical_datum(self) -> Optional[str]:
        """Returns vertical datum if known (e.g. 'EGM96', 'WGS84 ellipsoid', or None)."""
        pass

    @abstractmethod
    def is_available_for_bounds(
        self,
        bounds_wgs84: Dict[str, float]
    ) -> bool:
        """
        Checks whether this reference source has valid coverage for the given
        WGS84 bounding box {west, south, east, north}.
        """
        pass

    @abstractmethod
    def sample_elevation_grid(
        self,
        source_metadata: GeospatialMetadata
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Samples or resamples the reference elevation onto the target raster grid.

        Returns:
            (ref_elevation_grid, valid_mask, sampling_metadata)
            - ref_elevation_grid: 2D float32 array matching source height × width
            - valid_mask: 2D bool array where True indicates valid reference elevation
            - sampling_metadata: details on CRS transformation and resampling
        """
        pass
