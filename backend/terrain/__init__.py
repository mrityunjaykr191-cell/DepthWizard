"""
DepthWizard — Terrain Analytics Core & Interactive Measurements Package
Authority: Phase 4A & Phase 4B Specifications
"""

from .contracts import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    SlopeUnit,
    ElevationQueryResult,
    SlopeResult,
    AspectResult,
    HillshadeResult,
    TerrainStatistics
)
from .elevation import elevation_at
from .slope import compute_slope, compute_gradients_2d
from .aspect import compute_aspect
from .hillshade import compute_hillshade
from .statistics import compute_statistics
from .measurement import (
    PointProbeResult,
    TwoPointMeasurementResult,
    CrossSectionResult,
    ProfileSample,
    probe_point,
    measure_two_points,
    sample_cross_section
)
from .service import TerrainAnalyticsEngine
from .qa import evaluate_terrain_qa, get_capability_gating, SCIENTIFIC_DISCLAIMERS
from .intelligence import (
    LineOfSightSample,
    BlockingPoint,
    LineOfSightResult,
    RouteProfileSample,
    RouteProfileResult,
    TerrainScreeningResult,
    calculate_line_of_sight,
    assess_route_profile,
    screen_terrain_suitability
)
from .validation import (
    ValidationStatus,
    ValidationMetrics,
    SpatialSplitInfo,
    TerrainValidationResult,
    compute_error_metrics,
    compute_error_map,
    perform_spatial_holdout_validation,
    evaluate_terrain_validation
)

__all__ = [
    "TerrainGrid",
    "ElevationMode",
    "TerrainCalibrationState",
    "SlopeUnit",
    "ElevationQueryResult",
    "SlopeResult",
    "AspectResult",
    "HillshadeResult",
    "TerrainStatistics",
    "PointProbeResult",
    "TwoPointMeasurementResult",
    "CrossSectionResult",
    "ProfileSample",
    "elevation_at",
    "compute_slope",
    "compute_gradients_2d",
    "compute_aspect",
    "compute_hillshade",
    "compute_statistics",
    "probe_point",
    "measure_two_points",
    "sample_cross_section",
    "TerrainAnalyticsEngine",
    "evaluate_terrain_qa",
    "get_capability_gating",
    "SCIENTIFIC_DISCLAIMERS",
    "LineOfSightSample",
    "BlockingPoint",
    "LineOfSightResult",
    "RouteProfileSample",
    "RouteProfileResult",
    "TerrainScreeningResult",
    "calculate_line_of_sight",
    "assess_route_profile",
    "screen_terrain_suitability",
    "ValidationStatus",
    "ValidationMetrics",
    "SpatialSplitInfo",
    "TerrainValidationResult",
    "compute_error_metrics",
    "compute_error_map",
    "perform_spatial_holdout_validation",
    "evaluate_terrain_validation"
]
