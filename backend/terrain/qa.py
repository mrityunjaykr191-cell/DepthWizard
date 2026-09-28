"""
DepthWizard — Terrain Quality Assurance & Scientific Status Module
Authority: Phase 4D Specification & docs/product/output-contract.md

Computes authoritative QA indicators, capability gating, and scientific status
derived strictly from canonical TerrainGrid data without fabricating confidence values.
"""

from typing import Optional, Dict, Any
import numpy as np

from .contracts import (
    TerrainGrid,
    TerrainCalibrationState,
    ElevationMode
)
from .statistics import compute_statistics
from backend.schemas.terrain import (
    TerrainQAResponse,
    ReferenceFitSchema
)

# Canonical scientific disclaimers per Phase 4D.5
SCIENTIFIC_DISCLAIMERS: Dict[TerrainCalibrationState, str] = {
    TerrainCalibrationState.RELATIVE: (
        "Terrain height is model-relative. Metric elevation and physical slope are unavailable without valid scene calibration."
    ),
    TerrainCalibrationState.CALIBRATED: (
        "Elevation is expressed in meters using the active scene calibration. This does not imply survey-grade accuracy."
    ),
    TerrainCalibrationState.CALIBRATION_REJECTED: (
        "Scene calibration was rejected by the calibration guardrails. Relative terrain remains available; metric outputs are disabled."
    ),
    TerrainCalibrationState.UNAVAILABLE: (
        "Input imagery lacks geospatial reference or reference DEM coverage is unavailable. Terrain height is model-relative."
    ),
}

# Human-readable status labels per Phase 4D.1
STATUS_LABELS: Dict[TerrainCalibrationState, str] = {
    TerrainCalibrationState.RELATIVE: "RELATIVE",
    TerrainCalibrationState.CALIBRATED: "CALIBRATED",
    TerrainCalibrationState.CALIBRATION_REJECTED: "CALIBRATION_REJECTED",
    TerrainCalibrationState.UNAVAILABLE: "CALIBRATION_UNAVAILABLE",
}


def get_capability_gating(calibration_state: TerrainCalibrationState) -> Dict[str, bool]:
    """
    Returns authoritative capability permissions for the specified calibration state.
    Strictly gates metric elevation, physical slope degrees, and 3D metric distance
    to verified CALIBRATED states per Phase 4D.2.
    """
    is_calibrated = (calibration_state == TerrainCalibrationState.CALIBRATED)
    return {
        # Uncalibrated / relative capabilities always available
        "relative_elevation": True,
        "relative_gradient": True,
        "aspect": True,
        "hillshade": True,
        "height_probe": True,
        "two_point_relative": True,
        # Physical metric capabilities strictly disabled unless CALIBRATED
        "metric_elevation": is_calibrated,
        "physical_slope_degrees": is_calibrated,
        "metric_3d_distance": is_calibrated,
        "two_point_metric": is_calibrated,
        "cross_section_metric": is_calibrated,
    }


def evaluate_terrain_qa(
    grid: TerrainGrid,
    reference_source: Optional[str] = None,
    rejection_reason: Optional[str] = None,
    reference_fit: Optional[ReferenceFitSchema] = None
) -> TerrainQAResponse:
    """
    Evaluates basic QA indicators directly from the provided TerrainGrid.
    Never fabricates model accuracy or AI confidence scores.
    """
    calib_state = grid.calibration_state
    if isinstance(calib_state, str):
        try:
            calib_state = TerrainCalibrationState(calib_state)
        except ValueError:
            calib_state = TerrainCalibrationState.RELATIVE

    # Compute elevation raster statistics over valid cells
    stats = compute_statistics(grid)

    total_cells = int(grid.rows * grid.cols)
    valid_cells = stats.valid_count
    nodata_cells = stats.nodata_count

    valid_pct = round((valid_cells / total_cells * 100.0) if total_cells > 0 else 100.0, 1)
    nodata_pct = round((nodata_cells / total_cells * 100.0) if total_cells > 0 else 0.0, 1)

    # Derivatives are mathematically valid if at least 9 valid cells exist (minimum for 3x3 kernel)
    derivatives_valid = (valid_cells >= 9)

    capabilities = get_capability_gating(calib_state)
    status_label = STATUS_LABELS.get(calib_state, "RELATIVE")
    disclaimer = SCIENTIFIC_DISCLAIMERS.get(calib_state, SCIENTIFIC_DISCLAIMERS[TerrainCalibrationState.RELATIVE])

    # Reference fit is strictly permitted only for CALIBRATED terrain per Phase 4D.4
    fit_to_expose = reference_fit if calib_state == TerrainCalibrationState.CALIBRATED else None

    # Reference source is only populated if CALIBRATED
    ref_source_to_expose = reference_source if calib_state == TerrainCalibrationState.CALIBRATED else None

    # Rejection reason is only populated if CALIBRATION_REJECTED
    rejection_to_expose = rejection_reason if calib_state == TerrainCalibrationState.CALIBRATION_REJECTED else None

    return TerrainQAResponse(
        status="complete",
        calibration_state=calib_state.value,
        status_label=status_label,
        elevation_mode=grid.mode.value,
        elevation_unit=grid.elevation_unit,
        is_metric=stats.is_metric,
        total_cells=total_cells,
        valid_cells=valid_cells,
        valid_pct=valid_pct,
        nodata_cells=nodata_cells,
        nodata_pct=nodata_pct,
        elevation_min=stats.min,
        elevation_max=stats.max,
        relief=stats.relief,
        derivatives_valid=derivatives_valid,
        capabilities=capabilities,
        reference_source=ref_source_to_expose,
        rejection_reason=rejection_to_expose,
        reference_fit=fit_to_expose,
        disclaimer=disclaimer
    )
