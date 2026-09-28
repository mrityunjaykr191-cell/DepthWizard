"""
DepthWizard — Canonical Export & Session Contracts
Authority: Phase 5B Specification & docs/product/output-contract.md

Defines machine-readable, typed session export contracts representing
the actual current workspace session without fabricating demo values.
"""

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class ExportFormat(str, Enum):
    SESSION_JSON = "session_json"
    GEOTIFF_DSM = "geotiff_dsm"
    RELATIVE_HEIGHTMAP = "relative_heightmap"
    ERROR_MAP_GEOTIFF = "error_map_geotiff"
    ANALYSIS_JSON = "analysis_json"
    MEASUREMENTS_GEOJSON = "measurements_geojson"
    PROFILE_CSV = "profile_csv"
    REPORT_PDF = "report_pdf"
    REPORT_HTML = "report_html"


class InputMetadataExport(BaseModel):
    filename: str
    format: str
    width: int
    height: int
    scene_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    georeferenced: bool
    crs: Optional[str] = None
    pixel_resolution_x: Optional[float] = None
    pixel_resolution_y: Optional[float] = None
    resolution_unit: str = "pixels"
    bounds: Optional[Dict[str, float]] = None
    affine_transform: Optional[List[float]] = None
    nodata: Optional[float] = None


class ModelProvenanceExport(BaseModel):
    provider: str
    model_name: str
    checkpoint_file: Optional[str] = None
    checkpoint: Optional[str] = None
    fine_tuned_dataset: Optional[str] = None
    inference_width: int
    inference_height: int
    surface_convention: str
    is_fine_tuned: bool = True
    elevation_mode: str = "relative"  # "relative" or "absolute"


class TerrainSummaryExport(BaseModel):
    rows: int
    cols: int
    total_cells: int
    valid_cells: int
    nodata_cells: int
    valid_percentage: float
    nodata_percentage: float
    elevation_min: float
    elevation_max: float
    elevation_mean: float
    elevation_median: Optional[float] = None
    elevation_std: Optional[float] = None
    relief: float
    elevation_relief: Optional[float] = None
    elevation_mode: Optional[str] = "relative"
    unit: str = "relative units"  # "meters" or "relative units"
    is_metric: bool


class CalibrationExport(BaseModel):
    scientific_status: str  # "RELATIVE", "CALIBRATED", "CALIBRATION_REJECTED", "CALIBRATION_UNAVAILABLE"
    status_label: str
    reference_source: Optional[str] = None
    method: Optional[str] = None
    scale: Optional[float] = None
    offset: Optional[float] = None
    sample_count: Optional[int] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    correlation: Optional[float] = None
    rejection_reason: Optional[str] = None
    is_metric_eligible: bool


class TerrainAnalyticsExport(BaseModel):
    slope_available: bool = False
    slope_min: Optional[float] = None
    slope_max: Optional[float] = None
    slope_mean: Optional[float] = None
    slope_unit: str = "relative gradient"
    slope_is_physical: bool = False
    aspect_available: bool = False
    aspect_convention: str = "compass_degrees_from_north"
    hillshade_available: bool = False
    hillshade_azimuth_deg: Optional[float] = None
    hillshade_altitude_deg: Optional[float] = None


class PointProbeExport(BaseModel):
    id: str
    x: float
    y: float
    world_x: Optional[float] = None
    world_y: Optional[float] = None
    world_z: Optional[float] = None
    elevation: Optional[float] = None
    unit: str
    is_metric: bool
    slope: Optional[float] = None
    aspect: Optional[float] = None
    label: Optional[str] = None


class TwoPointMeasureExport(BaseModel):
    id: str
    point_a: Dict[str, Any]
    point_b: Dict[str, Any]
    horizontal_distance: float
    distance_unit: str
    elevation_delta: float
    elevation_unit: str
    slope_deg: Optional[float] = None
    direct_distance_3d: Optional[float] = None
    is_metric: bool


class CrossSectionSampleExport(BaseModel):
    distance: float
    elevation: Optional[float] = None
    relative_fraction: float


class CrossSectionExport(BaseModel):
    point_a: Dict[str, float]
    point_b: Dict[str, float]
    total_distance: float
    distance_unit: str
    elevation_unit: str
    is_metric: bool
    min_elevation: float
    max_elevation: float
    relief: float
    samples_count: int
    samples: List[CrossSectionSampleExport] = Field(default_factory=list)


class LineOfSightExport(BaseModel):
    status: str  # "VISIBLE", "BLOCKED", "UNKNOWN"
    observer_point: Dict[str, float]
    target_point: Dict[str, float]
    observer_offset_m: float
    target_offset_m: float
    clearance_min_m: Optional[float] = None
    first_blocking_distance: Optional[float] = None
    is_metric: bool


class RouteProfileExport(BaseModel):
    status: str
    total_ground_distance: float
    elevation_gain: float
    elevation_loss: float
    net_elevation_change: float
    max_gradient_pct: float
    terrain_difficulty: str
    distance_unit: str
    elevation_unit: str
    is_metric: bool


class TerrainScreeningExport(BaseModel):
    suitable_cells: int
    unsuitable_cells: int
    unknown_cells: int
    total_cells: int
    suitable_percentage: float
    unsuitable_percentage: float
    unknown_percentage: float
    max_slope_threshold: Optional[float] = None
    min_elevation_threshold: Optional[float] = None
    max_elevation_threshold: Optional[float] = None
    elevation_unit: str
    is_calibrated: bool


class ValidationMetricsExport(BaseModel):
    sample_count: int
    mae: float
    rmse: float
    bias: float
    pearson_r: Optional[float] = None
    min_error: Optional[float] = None
    max_error: Optional[float] = None
    median_absolute_error: Optional[float] = None
    p90_absolute_error: Optional[float] = None


class SpatialHoldoutExport(BaseModel):
    split_name: str
    train_description: str
    holdout_description: str
    train_sample_count: int
    holdout_sample_count: int
    generalization_gap_rmse: float
    val_rmse: float
    val_mae: float


class ValidationSessionExport(BaseModel):
    status: str  # "VALIDATION_NOT_AVAILABLE", "REFERENCE_FIT", "INDEPENDENT_VALIDATION"
    is_independent: bool
    reference_source: Optional[str] = None
    overall_fit: Optional[ValidationMetricsExport] = None
    spatial_holdout: Optional[SpatialHoldoutExport] = None
    error_min: Optional[float] = None
    error_max: Optional[float] = None
    error_mean: Optional[float] = None
    error_std: Optional[float] = None
    has_error_map: bool = False
    disclaimer: str


class SessionExport(BaseModel):
    schema_version: str = "0.1.0"
    session_id: str
    exported_at: str
    scientific_status: str  # "RELATIVE", "CALIBRATED", "CALIBRATION_REJECTED", "CALIBRATION_UNAVAILABLE"
    is_metric: bool
    input: InputMetadataExport
    processing: ModelProvenanceExport
    terrain: TerrainSummaryExport
    calibration: CalibrationExport
    analytics: TerrainAnalyticsExport
    measurements: Dict[str, Any] = Field(default_factory=dict)
    validation: ValidationSessionExport
    scientific_limitations: List[str] = Field(default_factory=list)
    available_exports: Dict[str, bool] = Field(default_factory=dict)
