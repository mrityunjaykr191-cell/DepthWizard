"""
DepthWizard — Terrain Analytics & Measurement API Schemas
Authority: Phase 4A & Phase 4B Specifications & docs/engineering/api-contract.md
"""

from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field


class ElevationQueryRequest(BaseModel):
    x: float = Field(..., description="Continuous column coordinate [0, cols-1]")
    y: float = Field(..., description="Continuous row coordinate [0, rows-1]")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of shape (height, width)")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation (e.g. 'meters' or 'relative units')")


class ElevationQueryResponse(BaseModel):
    x: float
    y: float
    valid: bool
    elevation: Optional[float]
    unit: str
    is_metric: bool
    mode: str
    out_of_bounds: bool
    is_nodata: bool
    interpolated: bool
    failure_reason: Optional[str] = None


class PointProbeRequest(BaseModel):
    x: float = Field(..., description="Continuous column coordinate [0, cols-1]")
    y: float = Field(..., description="Continuous row coordinate [0, rows-1]")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of shape (height, width)")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    has_metric_horizontal_scale: bool = Field(False, description="Whether horizontal resolution is in true meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation")


class PointProbeResponse(BaseModel):
    x: float
    y: float
    valid: bool
    elevation: Optional[float]
    unit: str
    is_metric: bool
    mode: str
    calibration_state: str
    slope: Optional[float]
    slope_unit: str
    slope_is_physical: bool
    aspect: Optional[float]
    is_flat: bool
    out_of_bounds: bool = False
    is_nodata: bool = False
    failure_reason: Optional[str] = None


class TwoPointMeasureRequest(BaseModel):
    x_a: float = Field(..., description="Point A column coordinate")
    y_a: float = Field(..., description="Point A row coordinate")
    x_b: float = Field(..., description="Point B column coordinate")
    y_b: float = Field(..., description="Point B row coordinate")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of shape (height, width)")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    has_metric_horizontal_scale: bool = Field(False, description="Whether horizontal resolution is in true meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation")


class TwoPointMeasureResponse(BaseModel):
    point_a: PointProbeResponse
    point_b: PointProbeResponse
    horizontal_distance: float
    horizontal_unit: str
    has_metric_horizontal_scale: bool
    elevation_delta: Optional[float]
    elevation_unit: str
    straight_line_3d_distance: Optional[float]
    slope_between_points: Optional[float]
    slope_unit: str
    slope_is_physical: bool
    calibration_state: str
    valid: bool
    failure_reason: Optional[str] = None


class ProfileSampleSchema(BaseModel):
    distance: float
    x: float
    y: float
    elevation: Optional[float]
    valid: bool


class CrossSectionRequest(BaseModel):
    x_a: float = Field(..., description="Point A column coordinate")
    y_a: float = Field(..., description="Point A row coordinate")
    x_b: float = Field(..., description="Point B column coordinate")
    y_b: float = Field(..., description="Point B row coordinate")
    num_samples: Optional[int] = Field(None, description="Number of sample intervals along line (default automatic)")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of shape (height, width)")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    has_metric_horizontal_scale: bool = Field(False, description="Whether horizontal resolution is in true meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation")


class CrossSectionResponse(BaseModel):
    samples: List[ProfileSampleSchema]
    total_distance: float
    distance_unit: str
    elevation_unit: str
    is_metric: bool
    calibration_state: str
    min_elevation: Optional[float]
    max_elevation: Optional[float]
    elevation_relief: Optional[float]
    valid_sample_count: int
    nodata_sample_count: int
    point_a: Tuple[float, float]
    point_b: Tuple[float, float]


class TerrainAnalyticsRequest(BaseModel):
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of shape (height, width)")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing in meters or pixels")
    dy: float = Field(1.0, description="Vertical row spacing in meters or pixels")
    has_metric_horizontal_scale: bool = Field(False, description="Whether dx/dy are true physical meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation (e.g. 'meters' or 'relative units')")
    sun_azimuth_deg: float = Field(315.0, description="Sun azimuth angle (degrees clockwise from North)")
    sun_altitude_deg: float = Field(45.0, description="Sun altitude angle above horizon")


class TerrainStatisticsResponse(BaseModel):
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


class TerrainAnalyticsResponse(BaseModel):
    status: str = Field("complete", description="Processing status")
    grid_dimensions: Dict[str, int]
    calibration_state: str
    elevation_mode: str
    elevation_unit: str
    horizontal_spacing: Dict[str, Any]
    has_metric_horizontal_scale: bool
    statistics: TerrainStatisticsResponse
    slope: Dict[str, Any]
    aspect: Dict[str, Any]
    hillshade: Dict[str, Any]
    slope_raw_b64: Optional[str] = Field(None, description="Base64 encoded slope raster (Float32)")
    aspect_raw_b64: Optional[str] = Field(None, description="Base64 encoded aspect raster (Float32)")
    hillshade_raw_b64: Optional[str] = Field(None, description="Base64 encoded normalized hillshade raster (Float32)")


class ReferenceFitSchema(BaseModel):
    reference_source: str = Field(..., description="Name of reference dataset (e.g. CartoDEM, SRTM, Copernicus GLO-30)")
    mae: Optional[float] = Field(None, description="Mean Absolute Error in meters")
    rmse: Optional[float] = Field(None, description="Root Mean Square Error in meters")
    bias: Optional[float] = Field(None, description="Mean residual bias in meters")
    correlation: Optional[float] = Field(None, description="Pearson correlation coefficient")
    sample_count: Optional[int] = Field(None, description="Number of valid reference sample points")


class TerrainQARequest(BaseModel):
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array of shape (height, width)")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation (e.g. 'meters' or 'relative units')")
    reference_source: Optional[str] = Field(None, description="Reference DEM name if calibrated")
    rejection_reason: Optional[str] = Field(None, description="Reason if calibration was rejected")
    reference_fit: Optional[ReferenceFitSchema] = Field(None, description="Authoritative calibration fit residuals if calibrated")


class TerrainQAResponse(BaseModel):
    status: str = Field("complete", description="Processing status")
    calibration_state: str = Field(..., description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    status_label: str = Field(..., description="'RELATIVE', 'CALIBRATED', 'CALIBRATION_REJECTED', or 'CALIBRATION_UNAVAILABLE'")
    elevation_mode: str = Field(..., description="'relative' or 'absolute'")
    elevation_unit: str = Field(..., description="'meters' or 'relative units'")
    is_metric: bool = Field(..., description="Whether vertical values represent physical meters")
    total_cells: int = Field(..., description="Total grid cells (rows * cols)")
    valid_cells: int = Field(..., description="Count of valid finite non-NoData cells")
    valid_pct: float = Field(..., description="Percentage of valid data coverage (NOT confidence)")
    nodata_cells: int = Field(..., description="Count of NoData cells")
    nodata_pct: float = Field(..., description="Percentage of NoData cells")
    elevation_min: Optional[float] = Field(None, description="Minimum elevation value")
    elevation_max: Optional[float] = Field(None, description="Maximum elevation value")
    relief: Optional[float] = Field(None, description="Terrain relief (max - min)")
    derivatives_valid: bool = Field(..., description="Whether finite analytical derivatives can be computed")
    capabilities: Dict[str, bool] = Field(..., description="Permitted analytical and measurement capabilities")
    reference_source: Optional[str] = Field(None, description="Reference dataset name if calibrated")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection if calibration failed")
    reference_fit: Optional[ReferenceFitSchema] = Field(None, description="Authoritative reference fit residuals")
    disclaimer: str = Field(..., description="Scientific disclaimer statement")


# ==============================================================================
# Phase 4E: Advanced Terrain Intelligence Schemas
# ==============================================================================

class BlockingPointSchema(BaseModel):
    distance: float
    x: float
    y: float
    terrain_elevation: float
    los_elevation: float
    obstruction: float


class LineOfSightSampleSchema(BaseModel):
    distance: float
    x: float
    y: float
    terrain_elevation: Optional[float]
    los_elevation: float
    clearance: Optional[float]
    status: str
    valid: bool


class LineOfSightRequest(BaseModel):
    x_a: float = Field(..., description="Point A column coordinate")
    y_a: float = Field(..., description="Point A row coordinate")
    x_b: float = Field(..., description="Point B column coordinate")
    y_b: float = Field(..., description="Point B row coordinate")
    observer_offset_a: float = Field(0.0, description="Observer height above ground at Point A")
    target_offset_b: float = Field(0.0, description="Target height above ground at Point B")
    num_samples: Optional[int] = Field(None, description="Sample count along line")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    has_metric_horizontal_scale: bool = Field(False, description="Whether horizontal resolution is in true meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation")


class LineOfSightResponse(BaseModel):
    is_visible: bool
    status: str
    point_a: Tuple[float, float]
    point_b: Tuple[float, float]
    observer_offset_a: float
    target_offset_b: float
    total_distance: float
    distance_unit: str
    elevation_unit: str
    is_metric: bool
    calibration_state: str
    first_blocking_point: Optional[BlockingPointSchema] = None
    min_clearance: Optional[float] = None
    max_obstruction: float
    samples: List[LineOfSightSampleSchema]
    valid_samples: int
    nodata_samples: int
    disclaimer: str


class RouteProfileSampleSchema(BaseModel):
    distance: float
    x: float
    y: float
    elevation: Optional[float]
    gradient: Optional[float]
    valid: bool


class RouteProfileRequest(BaseModel):
    x_a: float = Field(..., description="Point A column coordinate")
    y_a: float = Field(..., description="Point A row coordinate")
    x_b: float = Field(..., description="Point B column coordinate")
    y_b: float = Field(..., description="Point B row coordinate")
    num_samples: Optional[int] = Field(None, description="Sample count along route")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    has_metric_horizontal_scale: bool = Field(False, description="Whether horizontal resolution is in true meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation")


class RouteProfileResponse(BaseModel):
    point_a: Tuple[float, float]
    point_b: Tuple[float, float]
    total_distance: float
    distance_unit: str
    elevation_gain: float
    elevation_loss: float
    net_elevation_change: Optional[float]
    max_uphill_gradient: float
    max_downhill_gradient: float
    mean_absolute_gradient: float
    max_slope: Optional[float]
    max_slope_unit: str
    max_slope_is_physical: bool
    classification: str
    classification_rationale: str
    elevation_unit: str
    is_metric: bool
    calibration_state: str
    valid_samples_count: int
    nodata_samples_count: int
    nodata_pct: float
    samples: List[RouteProfileSampleSchema]
    disclaimer: str


class TerrainScreeningRequest(BaseModel):
    max_slope: Optional[float] = Field(None, description="Maximum allowable slope (degrees if calibrated, gradient if relative)")
    min_elevation: Optional[float] = Field(None, description="Minimum allowable elevation")
    max_elevation: Optional[float] = Field(None, description="Maximum allowable elevation")
    exclude_nodata: bool = Field(True, description="Exclude NoData cells")
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded float32 array")
    width: int = Field(..., description="Width / cols")
    height: int = Field(..., description="Height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    has_metric_horizontal_scale: bool = Field(False, description="Whether horizontal resolution is in true meters")
    horizontal_unit: str = Field("pixels", description="'pixels' or 'meters'")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation")


class TerrainScreeningResponse(BaseModel):
    suitable_cells: int
    unsuitable_cells: int
    unknown_cells: int
    total_cells: int
    suitable_pct: float
    unsuitable_pct: float
    unknown_pct: float
    max_slope_threshold: Optional[float]
    slope_unit: str
    min_elevation_threshold: Optional[float]
    max_elevation_threshold: Optional[float]
    elevation_unit: str
    is_calibrated: bool
    mask_raw_b64: Optional[str] = Field(None, description="Base64 encoded uint8 array of shape (height, width)")
    disclaimer: str


# ==============================================================================
# Phase 5A: Validation & Error Analysis Schemas
# ==============================================================================

class ValidationMetricsSchema(BaseModel):
    sample_count: int
    mae: float
    rmse: float
    bias: float
    pearson_r: float
    spearman_r: float
    min_error: float
    max_error: float
    median_absolute_error: float
    p90_absolute_error: float
    p95_absolute_error: float


class SpatialSplitSchema(BaseModel):
    split_name: str
    train_description: str
    holdout_description: str
    train_sample_count: int
    holdout_sample_count: int
    generalization_gap_rmse: float


class TerrainValidationRequest(BaseModel):
    elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded predicted elevation float32 array")
    reference_elevations_raw_b64: Optional[str] = Field(None, description="Base64 encoded reference DEM float32 array")
    relative_heightfield_raw_b64: Optional[str] = Field(None, description="Base64 encoded relative heightfield [0..100] for spatial holdout split")
    width: int = Field(..., description="Grid width / cols")
    height: int = Field(..., description="Grid height / rows")
    dx: float = Field(1.0, description="Horizontal column spacing")
    dy: float = Field(1.0, description="Vertical row spacing")
    nodata: Optional[float] = Field(None, description="NoData value")
    mode: str = Field("relative", description="'relative' or 'absolute'")
    calibration_state: str = Field("relative", description="'relative', 'calibrated', 'calibration_rejected', or 'unavailable'")
    elevation_unit: Optional[str] = Field(None, description="Unit of elevation (e.g. 'meters' or 'relative units')")
    reference_source: Optional[str] = Field(None, description="Name of reference source dataset")
    rejection_reason: Optional[str] = Field(None, description="Reason if calibration was rejected")
    perform_holdout: bool = Field(True, description="Whether to execute independent spatial block holdout validation")


class TerrainValidationResponse(BaseModel):
    status: str = Field(..., description="'VALIDATION_NOT_AVAILABLE', 'REFERENCE_FIT', or 'INDEPENDENT_VALIDATION'")
    status_label: str = Field(..., description="Human-readable status label")
    is_independent: bool = Field(..., description="Whether validation represents independent out-of-sample evaluation")
    reference_source: Optional[str] = Field(None, description="Reference dataset name")
    elevation_unit: str = Field("meters", description="Elevation unit")
    overall_metrics: Optional[ValidationMetricsSchema] = Field(None, description="In-sample full comparison metrics")
    calibration_fit_metrics: Optional[ValidationMetricsSchema] = Field(None, description="In-sample training fit metrics")
    holdout_metrics: Optional[ValidationMetricsSchema] = Field(None, description="Independent holdout validation metrics")
    spatial_split: Optional[SpatialSplitSchema] = Field(None, description="Spatial partitioning details")
    error_min: Optional[float] = Field(None, description="Minimum signed error")
    error_max: Optional[float] = Field(None, description="Maximum signed error")
    error_mean: Optional[float] = Field(None, description="Mean signed error / bias")
    error_std: Optional[float] = Field(None, description="Standard deviation of signed error")
    error_map_raw_b64: Optional[str] = Field(None, description="Base64 encoded 2D float32 error map (predicted - reference)")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason if validation unavailable")
    limitations: List[str] = Field(default_factory=list, description="Defensive list of scientific limitations")
    explanatory_notes: str = Field(..., description="Transparent explanatory summary")
    disclaimer: str = Field(..., description="Scientific disclaimer statement")


