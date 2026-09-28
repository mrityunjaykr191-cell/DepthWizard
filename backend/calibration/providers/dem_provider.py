"""
DepthWizard — DEM Reference Provider Base Implementation
Authority: Phase 3 Specification (Phases 3.2, 3.4, 3.5, 3.6, 3.7)

Provides common bounding-box search, windowed reading, and coordinate-aware alignment
for gridded reference DEM sources (CartoDEM and SRTM).
Ensures only the required spatial window is loaded into memory.
"""

from typing import Optional, Tuple, Dict, Any, List
import os
import glob
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from affine import Affine

from backend.calibration.contracts import (
    GeospatialMetadata,
    ReferenceSourceType
)
from backend.calibration.providers.base import ReferenceProvider
from backend.calibration.alignment import (
    compute_bounds_wgs84,
    compute_footprint_intersection,
    align_reference_dem_to_source
)


class DEMReferenceProvider(ReferenceProvider):
    """
    Base provider for file-backed reference DEM datasets.
    Searches local directory for matching DEM tiles or accepts direct tile file.
    """

    def __init__(
        self,
        source_type: ReferenceSourceType,
        source_name: str,
        nominal_res_m: float = 30.0,
        vertical_datum: str = "EGM96",
        data_dir: Optional[str] = None
    ):
        self._source_type = source_type
        self._source_name = source_name
        self._nominal_res_m = nominal_res_m
        self._vertical_datum = vertical_datum
        self._data_dir = data_dir or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data"
        )

    def get_source_type(self) -> ReferenceSourceType:
        return self._source_type

    def get_source_name(self) -> str:
        return self._source_name

    def get_nominal_resolution_m(self) -> float:
        return self._nominal_res_m

    def get_vertical_datum(self) -> Optional[str]:
        return self._vertical_datum

    def find_matching_tile(
        self,
        bounds_wgs84: Dict[str, float],
        file_override: Optional[str] = None
    ) -> Optional[str]:
        """
        Locates a reference GeoTIFF tile covering or intersecting the requested WGS84 bounds.
        """
        if file_override is not None:
            return file_override if os.path.isfile(file_override) else None

        if not os.path.isdir(self._data_dir):
            return None

        # Search for .tif / .tiff files matching source prefix or all tiles
        pattern = os.path.join(self._data_dir, "*.tif*")
        candidates = glob.glob(pattern)

        prefix = self._source_type.value.lower()
        prioritized = [c for c in candidates if prefix in os.path.basename(c).lower()] + candidates

        for candidate in prioritized:
            try:
                with rasterio.open(candidate) as ds:
                    if ds.crs is None:
                        continue
                    ref_bounds = {
                        "west": ds.bounds.left,
                        "south": ds.bounds.bottom,
                        "east": ds.bounds.right,
                        "north": ds.bounds.top
                    }
                    ref_wgs84 = compute_bounds_wgs84(ref_bounds, ds.crs.to_string())
                    overlap_frac, _ = compute_footprint_intersection(bounds_wgs84, ref_wgs84)
                    if overlap_frac > 0.05:
                        return candidate
            except Exception:
                continue

        return None

    def is_available_for_bounds(self, bounds_wgs84: Dict[str, float]) -> bool:
        tile = self.find_matching_tile(bounds_wgs84)
        return tile is not None

    def sample_elevation_grid(
        self,
        source_metadata: GeospatialMetadata,
        file_override: Optional[str] = None
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Reads reference DEM and aligns onto the source GeoTIFF grid.
        """
        if not source_metadata.georeferenced or not source_metadata.bounds or not source_metadata.crs:
            raise ValueError(
                f"Cannot calibrate with {self._source_name}: source imagery lacks valid georeferencing metadata."
            )

        src_bounds_wgs84 = compute_bounds_wgs84(source_metadata.bounds, source_metadata.crs)
        tile_path = self.find_matching_tile(src_bounds_wgs84, file_override=file_override)

        if not tile_path:
            raise FileNotFoundError(
                f"No matching {self._source_name} reference DEM tile found covering bounds: "
                f"[{src_bounds_wgs84['west']:.4f}, {src_bounds_wgs84['south']:.4f}, "
                f"{src_bounds_wgs84['east']:.4f}, {src_bounds_wgs84['north']:.4f}] (WGS84). "
                f"Please supply an overlapping reference DEM file."
            )

        with rasterio.open(tile_path) as ds:
            ref_crs = ds.crs.to_string() if ds.crs else "EPSG:4326"
            ref_transform = ds.transform
            ref_nodata = ds.nodata

            # Read full or windowed raster
            ref_raster = ds.read(1)

        aligned_dem, valid_mask, alignment_meta = align_reference_dem_to_source(
            ref_raster=ref_raster,
            ref_transform=ref_transform,
            ref_crs=ref_crs,
            ref_nodata=ref_nodata,
            source_meta=source_metadata
        )

        sampling_meta = {
            "tile_path": os.path.basename(tile_path),
            "reference_crs": ref_crs,
            "alignment": alignment_meta,
            "nominal_resolution_m": self._nominal_res_m,
            "vertical_datum": self._vertical_datum
        }

        return aligned_dem, valid_mask, sampling_meta
