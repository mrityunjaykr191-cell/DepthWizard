"""
DepthWizard — Elevation Query & Bilinear Interpolation
Authority: Phase 4A Specification (Section 5, 6, 16)

Provides pure, continuous elevation queries on TerrainGrid using bilinear interpolation.
Strictly handles boundary conditions, NoData neighborhoods, and out-of-bounds queries.
Does not mutate source data. Does not silently clamp coordinates.
"""

import math
from typing import Optional
import numpy as np

from .contracts import (
    TerrainGrid,
    ElevationQueryResult,
    ElevationMode,
    TerrainCalibrationState
)


def is_valid_cell_value(val: float, nodata: Optional[float]) -> bool:
    """
    Checks whether an elevation scalar is finite and not equal to declared NoData.
    """
    if not math.isfinite(val):
        return False
    if nodata is not None and not math.isnan(nodata):
        if math.isclose(val, nodata, rel_tol=1e-5, abs_tol=1e-5):
            return False
    return True


def elevation_at(grid: TerrainGrid, x: float, y: float) -> ElevationQueryResult:
    """
    Samples or interpolates elevation at continuous coordinate (x, y).

    Coordinate convention:
    - x corresponds to the horizontal column coordinate: 0.0 <= x <= cols - 1
    - y corresponds to the vertical row coordinate: 0.0 <= y <= rows - 1
    
    Returns ElevationQueryResult with:
    - valid=True and elevation value if strictly inside bounds and neighbors are valid.
    - valid=False and out_of_bounds=True if (x, y) lies outside [0, cols-1] or [0, rows-1].
    - valid=False and is_nodata=True if query hits or interpolates across NoData/NaN.
    """
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    unit = grid.elevation_unit
    mode = grid.mode.value

    # 1. Boundary check — strict rejection of out-of-bounds coordinates
    if not (math.isfinite(x) and math.isfinite(y)):
        return ElevationQueryResult(
            x=x, y=y, valid=False, elevation=None, unit=unit, is_metric=is_metric, mode=mode,
            out_of_bounds=True, failure_reason="Coordinate values must be finite numbers."
        )

    if x < 0.0 or x > (grid.cols - 1) or y < 0.0 or y > (grid.rows - 1):
        return ElevationQueryResult(
            x=x, y=y, valid=False, elevation=None, unit=unit, is_metric=is_metric, mode=mode,
            out_of_bounds=True, failure_reason=f"Coordinates ({x:.3f}, {y:.3f}) are outside grid bounds [0, {grid.cols-1}] x [0, {grid.rows-1}]."
        )

    # 2. Discrete Grid Point Check (exact sample without interpolation)
    nearest_c = round(x)
    nearest_r = round(y)
    is_exact_point = (
        math.isclose(x, nearest_c, abs_tol=1e-7)
        and math.isclose(y, nearest_r, abs_tol=1e-7)
    )

    if is_exact_point:
        val = float(grid.elevations[nearest_r, nearest_c])
        if not is_valid_cell_value(val, grid.nodata):
            return ElevationQueryResult(
                x=x, y=y, valid=False, elevation=None, unit=unit, is_metric=is_metric, mode=mode,
                is_nodata=True, interpolated=False, failure_reason="Sample point contains NoData or non-finite elevation."
            )
        return ElevationQueryResult(
            x=x, y=y, valid=True, elevation=val, unit=unit, is_metric=is_metric, mode=mode,
            interpolated=False
        )

    # 3. Bilinear Interpolation
    c0 = math.floor(x)
    c1 = min(grid.cols - 1, c0 + 1)
    r0 = math.floor(y)
    r1 = min(grid.rows - 1, r0 + 1)

    fx = x - c0
    fy = y - r0

    # Weights for the 4 corners:
    # (c0, r0) -> top-left
    # (c1, r0) -> top-right
    # (c0, r1) -> bottom-left
    # (c1, r1) -> bottom-right
    w00 = (1.0 - fx) * (1.0 - fy)
    w10 = fx * (1.0 - fy)
    w01 = (1.0 - fx) * fy
    w11 = fx * fy

    corners = [
        (r0, c0, w00),
        (r0, c1, w10),
        (r1, c0, w01),
        (r1, c1, w11),
    ]

    # Verify that all corners with non-zero weight are valid
    z_interp = 0.0
    for r, c, w in corners:
        if w > 1e-7:
            val = float(grid.elevations[r, c])
            if not is_valid_cell_value(val, grid.nodata):
                return ElevationQueryResult(
                    x=x, y=y, valid=False, elevation=None, unit=unit, is_metric=is_metric, mode=mode,
                    is_nodata=True, interpolated=True,
                    failure_reason=f"Interpolation neighborhood cell (r={r}, c={c}) contains NoData or non-finite value."
                )
            z_interp += w * val

    return ElevationQueryResult(
        x=x, y=y, valid=True, elevation=float(z_interp), unit=unit, is_metric=is_metric, mode=mode,
        interpolated=True
    )
