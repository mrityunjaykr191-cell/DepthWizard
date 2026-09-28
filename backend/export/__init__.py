"""
DepthWizard — Geospatial & Analysis Export Engine
Phase 5B Authority: contracts, gating, raster, analysis, and report modules.
"""

from backend.export.contracts import (
    ExportFormat,
    InputMetadataExport,
    ModelProvenanceExport,
    TerrainSummaryExport,
    CalibrationExport,
    TerrainAnalyticsExport,
    PointProbeExport,
    TwoPointMeasureExport,
    CrossSectionExport,
    LineOfSightExport,
    RouteProfileExport,
    TerrainScreeningExport,
    ValidationSessionExport,
    SessionExport,
)

from backend.export.gating import (
    validate_export_eligibility,
    get_state_specific_limitations,
    sanitize_export_filename,
)

from backend.export.raster import (
    export_calibrated_geotiff,
    export_relative_heightmap,
    export_signed_error_geotiff,
)

from backend.export.analysis import (
    export_analysis_json,
    export_measurements_geojson,
    export_profile_csv,
)

from backend.export.report import (
    generate_html_report,
)

from backend.export.pdf_report import (
    generate_pdf_report,
)

__all__ = [
    "ExportFormat",
    "InputMetadataExport",
    "ModelProvenanceExport",
    "TerrainSummaryExport",
    "CalibrationExport",
    "TerrainAnalyticsExport",
    "PointProbeExport",
    "TwoPointMeasureExport",
    "CrossSectionExport",
    "LineOfSightExport",
    "RouteProfileExport",
    "TerrainScreeningExport",
    "ValidationSessionExport",
    "SessionExport",
    "validate_export_eligibility",
    "get_state_specific_limitations",
    "sanitize_export_filename",
    "export_calibrated_geotiff",
    "export_relative_heightmap",
    "export_signed_error_geotiff",
    "export_analysis_json",
    "export_measurements_geojson",
    "export_profile_csv",
    "generate_html_report",
    "generate_pdf_report",
]
