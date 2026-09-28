"""
DepthWizard — Terrain Slope Calculation
Authority: Phase 4A Specification (Section 8, 9, 16)

Calculates terrain surface gradient and slope using rigorous finite-difference methods
(Horn's 3x3 weighted method with robust cardinal fallback for boundaries and NoData).
Strictly separates relative gradient from physical metric slope angles.
"""

from typing import Optional, Tuple
import numpy as np

from .contracts import (
    TerrainGrid,
    SlopeResult,
    SlopeUnit,
    TerrainCalibrationState,
    ElevationMode
)


def compute_gradients_2d(
    elevations: np.ndarray,
    dx: float,
    dy: float,
    nodata: Optional[float] = None
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes spatial derivatives dz/dx and dz/dy using Horn's weighted 3x3 finite-difference
    method with adaptive cardinal central/forward/backward differences at boundaries and near NoData.

    Returns:
        (dz_dx, dz_dy, valid_mask)
    """
    rows, cols = elevations.shape
    dz_dx = np.full((rows, cols), np.nan, dtype=np.float32)
    dz_dy = np.full((rows, cols), np.nan, dtype=np.float32)

    # Valid mask for finite non-nodata cells
    valid = np.isfinite(elevations)
    if nodata is not None and not np.isnan(nodata):
        valid = valid & ~np.isclose(elevations, nodata, atol=1e-4)

    # Pre-pad valid and elevations arrays to evaluate 3x3 windows safely
    for r in range(rows):
        for c in range(cols):
            if not valid[r, c]:
                continue

            # Determine available neighbors
            has_w = (c > 0) and valid[r, c - 1]
            has_e = (c < cols - 1) and valid[r, c + 1]
            has_n = (r > 0) and valid[r - 1, c]
            has_s = (r < rows - 1) and valid[r + 1, c]

            # 3x3 diagonal neighbors for Horn's method
            has_nw = (r > 0 and c > 0) and valid[r - 1, c - 1]
            has_ne = (r > 0 and c < cols - 1) and valid[r - 1, c + 1]
            has_sw = (r < rows - 1 and c > 0) and valid[r + 1, c - 1]
            has_se = (r < rows - 1 and c < cols - 1) and valid[r + 1, c + 1]

            # 1. Compute dz/dx (horizontal gradient along columns)
            if has_w and has_e and has_nw and has_ne and has_sw and has_se:
                # Full Horn's weighted 3x3 estimator
                dz_dx[r, c] = (
                    (elevations[r - 1, c + 1] + 2.0 * elevations[r, c + 1] + elevations[r + 1, c + 1])
                    - (elevations[r - 1, c - 1] + 2.0 * elevations[r, c - 1] + elevations[r + 1, c - 1])
                ) / (8.0 * dx)
            elif has_w and has_e:
                # Central difference
                dz_dx[r, c] = (elevations[r, c + 1] - elevations[r, c - 1]) / (2.0 * dx)
            elif has_e:
                # Forward difference (left boundary or west NoData)
                dz_dx[r, c] = (elevations[r, c + 1] - elevations[r, c]) / dx
            elif has_w:
                # Backward difference (right boundary or east NoData)
                dz_dx[r, c] = (elevations[r, c] - elevations[r, c - 1]) / dx
            else:
                dz_dx[r, c] = np.nan

            # 2. Compute dz/dy (vertical gradient along rows, row increasing southward)
            if has_n and has_s and has_nw and has_ne and has_sw and has_se:
                # Full Horn's weighted 3x3 estimator
                dz_dy[r, c] = (
                    (elevations[r + 1, c - 1] + 2.0 * elevations[r + 1, c] + elevations[r + 1, c + 1])
                    - (elevations[r - 1, c - 1] + 2.0 * elevations[r - 1, c] + elevations[r - 1, c + 1])
                ) / (8.0 * dy)
            elif has_n and has_s:
                # Central difference
                dz_dy[r, c] = (elevations[r + 1, c] - elevations[r - 1, c]) / (2.0 * dy)
            elif has_s:
                # Forward difference (top boundary or north NoData)
                dz_dy[r, c] = (elevations[r + 1, c] - elevations[r, c]) / dy
            elif has_n:
                # Backward difference (bottom boundary or south NoData)
                dz_dy[r, c] = (elevations[r, c] - elevations[r - 1, c]) / dy
            else:
                dz_dy[r, c] = np.nan

    valid_gradient = valid & np.isfinite(dz_dx) & np.isfinite(dz_dy)
    return dz_dx, dz_dy, valid_gradient


def compute_slope(
    grid: TerrainGrid,
    method: str = "horn_finite_difference"
) -> SlopeResult:
    """
    Computes slope raster for the provided TerrainGrid.

    Scientific status enforcement:
    - If grid is CALIBRATED and has trustworthy metric horizontal scale:
      returns physical slope in DEGREES [0°, 90°].
    - If grid is RELATIVE or lacks metric horizontal scale:
      returns RELATIVE_GRADIENT (dimensionless steepness) and sets is_physical=False.
      NEVER reports fake physical degrees on relative uncalibrated terrain!
    """
    is_physical = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
        and grid.has_metric_horizontal_scale
    )

    dz_dx, dz_dy, valid_mask = compute_gradients_2d(
        grid.elevations, grid.dx, grid.dy, grid.nodata
    )

    grad_mag = np.full(grid.elevations.shape, np.nan, dtype=np.float32)
    grad_mag[valid_mask] = np.sqrt(dz_dx[valid_mask] ** 2 + dz_dy[valid_mask] ** 2)

    nodata_count = int(np.count_nonzero(~valid_mask))

    if is_physical:
        # Physical slope in degrees: slope_deg = atan(gradient) * 180 / pi
        slope_map = np.full(grid.elevations.shape, np.nan, dtype=np.float32)
        slope_map[valid_mask] = np.degrees(np.arctan(grad_mag[valid_mask]))
        unit = SlopeUnit.DEGREES
        warning = None
    else:
        # Relative steepness / gradient magnitude
        slope_map = grad_mag
        unit = SlopeUnit.RELATIVE_GRADIENT
        warning = (
            "Surface is uncalibrated relative heightfield or lacks trustworthy metric horizontal scale. "
            "Slope is reported as relative gradient magnitude, not physical degrees."
        )

    valid_vals = slope_map[valid_mask]
    if len(valid_vals) > 0:
        min_s = float(np.min(valid_vals))
        max_s = float(np.max(valid_vals))
        mean_s = float(np.mean(valid_vals))
    else:
        min_s, max_s, mean_s = None, None, None

    return SlopeResult(
        slope_map=slope_map,
        unit=unit,
        is_physical=is_physical,
        method=method,
        min_slope=round(min_s, 3) if min_s is not None else None,
        max_slope=round(max_s, 3) if max_s is not None else None,
        mean_slope=round(mean_s, 3) if mean_s is not None else None,
        nodata_count=nodata_count,
        warning=warning
    )
