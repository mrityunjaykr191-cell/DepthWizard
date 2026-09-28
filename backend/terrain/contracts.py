"""
DepthWizard — Terrain Analytics Contracts & Data Model
Authority: Phase 4A Specification & docs/product/output-contract.md

Defines authoritative typed models and contracts for terrain analytics:
- Elevation queries
- Slope computation
- Aspect computation
- Hillshade illumination
- Terrain statistics
- Explicit calibration state and unit truth
"""

from enum import Enum
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
import numpy as np


class TerrainCalibrationState(str, Enum):
    RELATIVE = "relative"
    CALIBRATED = "calibrated"
    CALIBRATION_REJECTED = "calibration_rejected"
    UNAVAILABLE = "unavailable"


class ElevationMode(str, Enum):
    RELATIVE = "relative"
    ABSOLUTE = "absolute"


class SlopeUnit(str, Enum):
    DEGREES = "degrees"
    PERCENT = "percent"
    RELATIVE_GRADIENT = "relative_gradient"


@dataclass(frozen=True)
class TerrainGrid:
    """
    In-memory canonical 2D terrain elevation raster representation.
    
    Coordinate convention:
    - Array shape is (rows, cols) where rows = Y dimension (height), cols = X dimension (width).
    - index = row * cols + col.
    - row 0 is top (North in standard cartographic orientation).
    - col 0 is left (West in standard cartographic orientation).
    - elevations is strictly immutable.
    """
    elevations: np.ndarray
    rows: int
    cols: int
    dx: float = 1.0
    dy: float = 1.0
    nodata: Optional[float] = None
    mode: ElevationMode = ElevationMode.RELATIVE
    calibration_state: TerrainCalibrationState = TerrainCalibrationState.RELATIVE
    elevation_unit: str = "relative units"
    horizontal_unit: str = "pixels"
    has_metric_horizontal_scale: bool = False
    crs: Optional[str] = None
    transform: Optional[Tuple[float, float, float, float, float, float]] = None

    def __post_init__(self):
        if self.elevations.ndim != 2:
            raise ValueError(f"TerrainGrid elevations array must be 2D, got shape {self.elevations.shape}")
        if self.elevations.shape != (self.rows, self.cols):
            raise ValueError(
                f"TerrainGrid shape mismatch: array is {self.elevations.shape} but declared (rows={self.rows}, cols={self.cols})"
            )
        if self.rows <= 0 or self.cols <= 0:
            raise ValueError(f"Invalid grid dimensions: {self.cols}x{self.rows}")
        if self.dx <= 0 or self.dy <= 0:
            raise ValueError(f"Grid spacing dx, dy must be strictly positive, got dx={self.dx}, dy={self.dy}")


@dataclass
class ElevationQueryResult:
    """
    Result of a continuous or discrete elevation query at coordinate (x, y).
    """
    x: float
    y: float
    valid: bool
    elevation: Optional[float]
    unit: str
    is_metric: bool
    mode: str
    out_of_bounds: bool = False
    is_nodata: bool = False
    interpolated: bool = False
    failure_reason: Optional[str] = None


@dataclass
class SlopeResult:
    """
    Result of a full-raster slope analysis.
    """
    slope_map: np.ndarray
    unit: SlopeUnit
    is_physical: bool
    method: str
    min_slope: Optional[float]
    max_slope: Optional[float]
    mean_slope: Optional[float]
    nodata_count: int
    warning: Optional[str] = None


@dataclass
class AspectResult:
    """
    Result of a full-raster terrain aspect analysis.
    Aspect is the compass direction of steepest downhill descent:
    0° = North, 90° = East, 180° = South, 270° = West.
    Flat cells (near-zero gradient) are explicitly NaN / undefined.
    """
    aspect_map: np.ndarray
    flat_mask: np.ndarray
    valid_count: int
    flat_count: int
    nodata_count: int
    convention: str = "0=North, 90=East, 180=South, 270=West, flat=undefined"


@dataclass
class HillshadeResult:
    """
    Result of a full-raster hillshade illumination calculation.
    Purely a visualization derivative representing surface shading under directional illumination.
    """
    hillshade_f32: np.ndarray  # Normalized [0.0, 1.0]
    hillshade_u8: np.ndarray   # Visual 8-bit [0, 255]
    azimuth_deg: float
    altitude_deg: float
    is_visualization_only: bool = True


@dataclass
class TerrainStatistics:
    """
    Exhaustive statistics over valid non-NoData terrain cells.
    """
    min: Optional[float]
    max: Optional[float]
    mean: Optional[float]
    median: Optional[float]
    std: Optional[float]
    relief: Optional[float]
    p5: Optional[float]
    p25: Optional[float]
    p75: Optional[float]
    p95: Optional[float]
    valid_count: int
    nodata_count: int
    total_count: int
    unit: str
    is_metric: bool
    mode: str
    calibration_state: str
