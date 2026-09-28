"""
DepthWizard — Geospatial Calibration Contracts
Authority: Phase 3 Specification & docs/architecture/backend.md & docs/product/output-contract.md

Defines typed dataclasses for calibration input, reference DEM data, alignment parameters,
and calibration results adhering strictly to geospatial truth principles:
- No fabricated metric units.
- Explicit status, reference source, and parameter provenance.
- Clean separation from image decoding, model inference, and 3D rendering.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any, List, Tuple
import numpy as np


class CalibrationStatus(str, Enum):
    UNAVAILABLE = "unavailable"
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    CALIBRATED = "calibrated"
    FAILED = "failed"


class ReferenceSourceType(str, Enum):
    CARTODEM = "CartoDEM"
    SRTM = "SRTM"
    GCP = "GCP"
    CUSTOM = "Custom"


class CalibrationMethod(str, Enum):
    AFFINE_OLS = "affine_scale_offset"
    AFFINE_ROBUST = "affine_robust_trimmed"


@dataclass
class GeospatialMetadata:
    """
    Structured spatial metadata extracted from source GeoTIFF or reference DEM.
    Preserves true CRS, affine transform, bounds, and resolution without fabrication.
    """
    georeferenced: bool
    crs: Optional[str] = None
    transform: Optional[Tuple[float, float, float, float, float, float]] = None
    bounds: Optional[Dict[str, float]] = None  # west, south, east, north
    pixel_resolution: Optional[Dict[str, float]] = None  # x, y
    nodata: Optional[float] = None
    width: int = 0
    height: int = 0
    vertical_reference: Optional[str] = None  # e.g., 'EGM96', 'WGS84 ellipsoid', or None


@dataclass
class AlignmentMetadata:
    """
    Details of the spatial alignment between source raster and reference DEM.
    """
    source_crs: str
    reference_crs: str
    transformed: bool
    resampling_method: str
    source_footprint_in_ref_crs: Dict[str, float]
    overlap_fraction: float
    matched_pixel_count: int


@dataclass
class ResidualMetrics:
    """
    Residual error metrics computed on valid matched reference samples.
    """
    mae: float
    rmse: float
    bias: float
    correlation: float
    sample_count: int
    median_absolute_error: Optional[float] = None


@dataclass
class CalibrationInput:
    """
    Input data provided to the calibration pipeline.
    """
    relative_heightfield: np.ndarray  # 2D float32 array [0..100]
    source_metadata: GeospatialMetadata
    reference_source: ReferenceSourceType = ReferenceSourceType.CARTODEM
    reference_dem_override: Optional[str] = None  # Path to user-supplied reference DEM
    masks: Optional[np.ndarray] = None


@dataclass
class CalibrationResult:
    """
    Authoritative result of the geospatial calibration process.
    """
    status: CalibrationStatus
    calibrated_elevation: Optional[np.ndarray] = None  # 2D float32 array in meters
    scale: Optional[float] = None  # 'a' in E = aH + b
    offset: Optional[float] = None  # 'b' in E = aH + b
    elevation_unit: str = "meters"
    elevation_min: Optional[float] = None
    elevation_max: Optional[float] = None
    elevation_mean: Optional[float] = None
    method: Optional[CalibrationMethod] = None
    reference_source: Optional[str] = None
    reference_crs: Optional[str] = None
    vertical_reference: Optional[str] = None
    alignment: Optional[AlignmentMetadata] = None
    residuals: Optional[ResidualMetrics] = None
    residuals_map: Optional[np.ndarray] = None  # Error map array (calibrated - reference) on matched pixels
    failure_reason: Optional[str] = None
    provenance: Dict[str, Any] = field(default_factory=dict)
