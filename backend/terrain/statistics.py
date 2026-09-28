"""
DepthWizard — Terrain Statistics Module
Authority: Phase 4A Specification (Section 13, 14, 16)

Calculates rigorous descriptive statistics over valid non-NoData terrain cells.
Strictly preserves calibration unit metadata. Never converts NoData to zero.
"""

from typing import Optional
import numpy as np

from .contracts import (
    TerrainGrid,
    TerrainStatistics,
    TerrainCalibrationState,
    ElevationMode
)


def compute_statistics(grid: TerrainGrid) -> TerrainStatistics:
    """
    Computes comprehensive elevation statistics for the provided TerrainGrid.

    Excludes NoData, NaN, and Inf values strictly without replacing them with zero.
    Attaches truthful units and calibration metadata.
    """
    elev = grid.elevations
    total_count = int(grid.rows * grid.cols)

    # Valid mask: finite and not equal to nodata
    valid_mask = np.isfinite(elev)
    if grid.nodata is not None and not np.isnan(grid.nodata):
        valid_mask = valid_mask & ~np.isclose(elev, grid.nodata, atol=1e-4)

    valid_vals = elev[valid_mask].astype(np.float64)
    valid_count = int(len(valid_vals))
    nodata_count = total_count - valid_count

    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    unit = grid.elevation_unit
    mode = grid.mode.value
    calib_state = grid.calibration_state.value

    if valid_count == 0:
        return TerrainStatistics(
            min=None,
            max=None,
            mean=None,
            median=None,
            std=None,
            relief=None,
            p5=None,
            p25=None,
            p75=None,
            p95=None,
            valid_count=0,
            nodata_count=nodata_count,
            total_count=total_count,
            unit=unit,
            is_metric=is_metric,
            mode=mode,
            calibration_state=calib_state
        )

    min_val = float(np.min(valid_vals))
    max_val = float(np.max(valid_vals))
    mean_val = float(np.mean(valid_vals))
    median_val = float(np.median(valid_vals))
    std_val = float(np.std(valid_vals))
    relief_val = float(max_val - min_val)

    p5 = float(np.percentile(valid_vals, 5))
    p25 = float(np.percentile(valid_vals, 25))
    p75 = float(np.percentile(valid_vals, 75))
    p95 = float(np.percentile(valid_vals, 95))

    return TerrainStatistics(
        min=round(min_val, 3),
        max=round(max_val, 3),
        mean=round(mean_val, 3),
        median=round(median_val, 3),
        std=round(std_val, 3),
        relief=round(relief_val, 3),
        p5=round(p5, 3),
        p25=round(p25, 3),
        p75=round(p75, 3),
        p95=round(p95, 3),
        valid_count=valid_count,
        nodata_count=nodata_count,
        total_count=total_count,
        unit=unit,
        is_metric=is_metric,
        mode=mode,
        calibration_state=calib_state
    )
