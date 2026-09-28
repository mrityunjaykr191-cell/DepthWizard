"""
DepthWizard — Advanced Terrain Intelligence Algorithms
Authority: Phase 4E Specification (Sections 4E.1, 4E.2, 4E.3)

Provides pure, deterministic terrain intelligence functions operating on TerrainGrid:
1. Line of Sight (LOS) / Visibility: Terrain surface raycasting with clearance and obstruction analysis.
2. Route Profile Assessment: Linear transect sampling with cumulative gain/loss, gradients, and classification.
3. Terrain Screening: Transparent rule-based threshold screening (slope and elevation bounds).

CRITICAL SCIENTIFIC PRINCIPLES:
- Zero machine learning or fabricated heuristics.
- Deterministic geometric analysis strictly on the terrain surface.
- Strict unit isolation: No metric claims on uncalibrated/relative surfaces.
- Preserves NoData; missing data is NEVER treated as zero or assumed visible.
"""

import math
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
import numpy as np

from .contracts import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    SlopeUnit
)
from .elevation import elevation_at
from .slope import compute_slope


# ==============================================================================
# 1. LINE OF SIGHT (LOS) CONTRACTS & IMPLEMENTATION
# ==============================================================================

@dataclass
class LineOfSightSample:
    distance: float
    x: float
    y: float
    terrain_elevation: Optional[float]
    los_elevation: float
    clearance: Optional[float]
    status: str  # "VISIBLE", "BLOCKED", or "UNKNOWN"
    valid: bool


@dataclass
class BlockingPoint:
    distance: float
    x: float
    y: float
    terrain_elevation: float
    los_elevation: float
    obstruction: float  # Absolute amount terrain penetrates above LOS ray


@dataclass
class LineOfSightResult:
    is_visible: bool
    status: str  # "VISIBLE", "BLOCKED", "UNKNOWN"
    point_a: Tuple[float, float]
    point_b: Tuple[float, float]
    observer_offset_a: float
    target_offset_b: float
    total_distance: float
    distance_unit: str
    elevation_unit: str
    is_metric: bool
    calibration_state: str
    first_blocking_point: Optional[BlockingPoint]
    min_clearance: Optional[float]
    max_obstruction: float
    samples: List[LineOfSightSample]
    valid_samples: int
    nodata_samples: int
    tolerance: float = 1e-4
    disclaimer: str = (
        "TERRAIN LINE-OF-SIGHT: Pure geometric terrain surface visibility analysis. "
        "Does not model vegetation, structures, atmospheric refraction, or sensor parameters."
    )


def calculate_line_of_sight(
    grid: TerrainGrid,
    x_a: float, y_a: float,
    x_b: float, y_b: float,
    observer_offset_a: float = 0.0,
    target_offset_b: float = 0.0,
    num_samples: Optional[int] = None,
    tolerance: float = 1e-4
) -> LineOfSightResult:
    """
    Computes deterministic line-of-sight between Point A and Point B across the terrain surface.
    """
    calib_state = grid.calibration_state.value
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    has_metric_scale = grid.has_metric_horizontal_scale

    # Compute horizontal total distance
    if has_metric_scale:
        dx_m = (x_b - x_a) * grid.dx
        dy_m = (y_b - y_a) * grid.dy
        total_dist = math.sqrt(dx_m ** 2 + dy_m ** 2)
        dist_unit = "meters"
    else:
        dx_px = x_b - x_a
        dy_px = y_b - y_a
        total_dist = math.sqrt(dx_px ** 2 + dy_px ** 2)
        dist_unit = "pixels"

    # Query endpoints
    elev_a_res = elevation_at(grid, x_a, y_a)
    elev_b_res = elevation_at(grid, x_b, y_b)

    if not elev_a_res.valid or elev_a_res.elevation is None or not elev_b_res.valid or elev_b_res.elevation is None:
        return LineOfSightResult(
            is_visible=False,
            status="UNKNOWN",
            point_a=(round(x_a, 3), round(y_a, 3)),
            point_b=(round(x_b, 3), round(y_b, 3)),
            observer_offset_a=float(observer_offset_a),
            target_offset_b=float(target_offset_b),
            total_distance=round(total_dist, 3),
            distance_unit=dist_unit,
            elevation_unit=grid.elevation_unit,
            is_metric=is_metric,
            calibration_state=calib_state,
            first_blocking_point=None,
            min_clearance=None,
            max_obstruction=0.0,
            samples=[],
            valid_samples=0,
            nodata_samples=0,
            tolerance=tolerance
        )

    # Ray origin and target altitudes
    z_start = elev_a_res.elevation + float(observer_offset_a)
    z_end = elev_b_res.elevation + float(target_offset_b)

    # Determine sample count
    pixel_dist = math.hypot(x_b - x_a, y_b - y_a)
    if num_samples is None:
        n_samples = max(20, min(300, int(math.ceil(pixel_dist * 1.5))))
    else:
        n_samples = max(2, min(500, int(num_samples)))

    samples: List[LineOfSightSample] = []
    first_blocking: Optional[BlockingPoint] = None
    min_clearance: Optional[float] = None
    max_obstruction: float = 0.0
    has_nodata_in_interior: bool = False
    is_blocked: bool = False
    valid_count: int = 0
    nodata_count: int = 0

    for i in range(n_samples):
        t = float(i) / float(n_samples - 1)
        cur_x = x_a + t * (x_b - x_a)
        cur_y = y_a + t * (y_b - y_a)
        cur_dist = t * total_dist
        los_z = z_start + t * (z_end - z_start)

        elev_res = elevation_at(grid, cur_x, cur_y)
        is_endpoint = (i == 0 or i == n_samples - 1)

        if elev_res.valid and elev_res.elevation is not None:
            terr_z = elev_res.elevation
            clearance = los_z - terr_z
            valid_count += 1

            # Check obstruction for interior points (endpoints naturally meet or exceed surface)
            if is_endpoint:
                sample_status = "VISIBLE"
            else:
                if min_clearance is None or clearance < min_clearance:
                    min_clearance = clearance

                # Subject to small numerical tolerance: blocked if terrain penetrates above ray by more than tolerance
                if clearance < -tolerance:
                    sample_status = "BLOCKED"
                    is_blocked = True
                    obstruction_amt = abs(clearance)
                    if obstruction_amt > max_obstruction:
                        max_obstruction = obstruction_amt

                    if first_blocking is None:
                        first_blocking = BlockingPoint(
                            distance=round(cur_dist, 3),
                            x=round(cur_x, 3),
                            y=round(cur_y, 3),
                            terrain_elevation=round(terr_z, 3),
                            los_elevation=round(los_z, 3),
                            obstruction=round(obstruction_amt, 3)
                        )
                else:
                    sample_status = "VISIBLE"

            samples.append(LineOfSightSample(
                distance=round(cur_dist, 3),
                x=round(cur_x, 3),
                y=round(cur_y, 3),
                terrain_elevation=round(terr_z, 3),
                los_elevation=round(los_z, 3),
                clearance=round(clearance, 3),
                status=sample_status,
                valid=True
            ))
        else:
            nodata_count += 1
            if not is_endpoint:
                has_nodata_in_interior = True

            samples.append(LineOfSightSample(
                distance=round(cur_dist, 3),
                x=round(cur_x, 3),
                y=round(cur_y, 3),
                terrain_elevation=None,
                los_elevation=round(los_z, 3),
                clearance=None,
                status="UNKNOWN",
                valid=False
            ))

    # Overall visibility determination:
    # A line is blocked when terrain rises above the LOS ray.
    # If missing data exists and no obstruction before it, status is UNKNOWN (cannot assume visible).
    if is_blocked:
        overall_visible = False
        overall_status = "BLOCKED"
    elif has_nodata_in_interior:
        overall_visible = False
        overall_status = "UNKNOWN"
    else:
        overall_visible = True
        overall_status = "VISIBLE"

    return LineOfSightResult(
        is_visible=overall_visible,
        status=overall_status,
        point_a=(round(x_a, 3), round(y_a, 3)),
        point_b=(round(x_b, 3), round(y_b, 3)),
        observer_offset_a=float(observer_offset_a),
        target_offset_b=float(target_offset_b),
        total_distance=round(total_dist, 3),
        distance_unit=dist_unit,
        elevation_unit=grid.elevation_unit,
        is_metric=is_metric,
        calibration_state=calib_state,
        first_blocking_point=first_blocking,
        min_clearance=round(min_clearance, 3) if min_clearance is not None else None,
        max_obstruction=round(max_obstruction, 3),
        samples=samples,
        valid_samples=valid_count,
        nodata_samples=nodata_count,
        tolerance=tolerance
    )


# ==============================================================================
# 2. ROUTE PROFILE ASSESSMENT CONTRACTS & IMPLEMENTATION
# ==============================================================================

@dataclass
class RouteProfileSample:
    distance: float
    x: float
    y: float
    elevation: Optional[float]
    gradient: Optional[float]
    valid: bool


@dataclass
class RouteProfileResult:
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
    samples: List[RouteProfileSample]
    disclaimer: str = (
        "TERRAIN PROFILE ASSESSMENT: Pure geometric analysis along straight-line transect. "
        "Does not account for trails, roads, vehicular dynamics, or certified navigability."
    )


def assess_route_profile(
    grid: TerrainGrid,
    x_a: float, y_a: float,
    x_b: float, y_b: float,
    num_samples: Optional[int] = None
) -> RouteProfileResult:
    """
    Computes a deterministic terrain route profile assessment along transect A->B.
    """
    calib_state = grid.calibration_state.value
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    has_metric_scale = grid.has_metric_horizontal_scale

    if has_metric_scale:
        dx_m = (x_b - x_a) * grid.dx
        dy_m = (y_b - y_a) * grid.dy
        total_dist = math.sqrt(dx_m ** 2 + dy_m ** 2)
        dist_unit = "meters"
    else:
        dx_px = x_b - x_a
        dy_px = y_b - y_a
        total_dist = math.sqrt(dx_px ** 2 + dy_px ** 2)
        dist_unit = "pixels"

    pixel_dist = math.hypot(x_b - x_a, y_b - y_a)
    if num_samples is None:
        n_samples = max(20, min(300, int(math.ceil(pixel_dist * 1.5))))
    else:
        n_samples = max(2, min(500, int(num_samples)))

    # Sample elevation along path
    raw_samples: List[Tuple[float, float, float, Optional[float], bool]] = []
    for i in range(n_samples):
        t = float(i) / float(n_samples - 1)
        cur_x = x_a + t * (x_b - x_a)
        cur_y = y_a + t * (y_b - y_a)
        cur_dist = t * total_dist

        elev_res = elevation_at(grid, cur_x, cur_y)
        if elev_res.valid and elev_res.elevation is not None:
            raw_samples.append((cur_dist, cur_x, cur_y, elev_res.elevation, True))
        else:
            raw_samples.append((cur_dist, cur_x, cur_y, None, False))

    # Calculate metrics between consecutive valid samples
    elevation_gain = 0.0
    elevation_loss = 0.0
    max_uphill_grad = 0.0
    max_downhill_grad = 0.0
    weighted_grad_sum = 0.0
    valid_step_dist_sum = 0.0

    valid_samples_count = sum(1 for s in raw_samples if s[4])
    nodata_samples_count = n_samples - valid_samples_count
    nodata_pct = round((nodata_samples_count / n_samples) * 100.0, 1)

    profile_samples: List[RouteProfileSample] = []
    prev_valid: Optional[Tuple[float, float, float, float]] = None  # (dist, x, y, elev)

    for dist, x, y, elev, valid in raw_samples:
        grad_here = None
        if valid and elev is not None:
            if prev_valid is not None:
                p_dist, p_x, p_y, p_elev = prev_valid
                step_dist = dist - p_dist
                step_elev = elev - p_elev
                if step_dist > 1e-6:
                    grad = step_elev / step_dist
                    grad_here = round(grad, 4)
                    abs_grad = abs(grad)

                    if step_elev > 0:
                        elevation_gain += step_elev
                        if grad > max_uphill_grad:
                            max_uphill_grad = grad
                    elif step_elev < 0:
                        elevation_loss += abs(step_elev)
                        if abs_grad > max_downhill_grad:
                            max_downhill_grad = abs_grad

                    weighted_grad_sum += abs_grad * step_dist
                    valid_step_dist_sum += step_dist

            prev_valid = (dist, x, y, elev)

        profile_samples.append(RouteProfileSample(
            distance=round(dist, 3),
            x=round(x, 3),
            y=round(y, 3),
            elevation=round(elev, 3) if elev is not None else None,
            gradient=grad_here,
            valid=valid
        ))

    # Net elevation change (from first valid sample to last valid sample)
    first_valid = next((s for s in raw_samples if s[4] and s[3] is not None), None)
    last_valid = next((s for s in reversed(raw_samples) if s[4] and s[3] is not None), None)

    if first_valid is not None and last_valid is not None:
        net_change = round(last_valid[3] - first_valid[3], 3)
    else:
        net_change = None

    mean_abs_grad = round(weighted_grad_sum / valid_step_dist_sum, 4) if valid_step_dist_sum > 0 else 0.0

    # Max slope encountered
    overall_max_grad = max(max_uphill_grad, max_downhill_grad)
    slope_is_phys = bool(is_metric and has_metric_scale)

    if slope_is_phys:
        max_slope_val = round(math.degrees(math.atan(overall_max_grad)), 1)
        max_slope_unit = SlopeUnit.DEGREES.value
    else:
        max_slope_val = round(overall_max_grad, 4)
        max_slope_unit = SlopeUnit.RELATIVE_GRADIENT.value

    # Transparent, descriptive route classification based purely on geometry
    if slope_is_phys:
        if max_slope_val < 10.0:
            classification = "GENTLE"
            rationale = f"Maximum slope is {max_slope_val}° (< 10° threshold)"
        elif max_slope_val <= 25.0:
            classification = "MODERATE"
            rationale = f"Maximum slope is {max_slope_val}° (10° - 25° threshold)"
        else:
            classification = "STEEP"
            rationale = f"Maximum slope is {max_slope_val}° (> 25° threshold)"
    else:
        total_relief = elevation_gain + elevation_loss
        if total_relief < 5.0:
            classification = "LOW RELIEF"
            rationale = f"Total relative vertical variation is {total_relief:.1f} (< 5.0 relative units)"
        elif total_relief <= 20.0:
            classification = "MODERATE RELIEF"
            rationale = f"Total relative vertical variation is {total_relief:.1f} (5.0 - 20.0 relative units)"
        else:
            classification = "HIGH RELIEF"
            rationale = f"Total relative vertical variation is {total_relief:.1f} (> 20.0 relative units)"

    return RouteProfileResult(
        point_a=(round(x_a, 3), round(y_a, 3)),
        point_b=(round(x_b, 3), round(y_b, 3)),
        total_distance=round(total_dist, 3),
        distance_unit=dist_unit,
        elevation_gain=round(elevation_gain, 3),
        elevation_loss=round(elevation_loss, 3),
        net_elevation_change=net_change,
        max_uphill_gradient=round(max_uphill_grad, 4),
        max_downhill_gradient=round(max_downhill_grad, 4),
        mean_absolute_gradient=mean_abs_grad,
        max_slope=max_slope_val,
        max_slope_unit=max_slope_unit,
        max_slope_is_physical=slope_is_phys,
        classification=classification,
        classification_rationale=rationale,
        elevation_unit=grid.elevation_unit,
        is_metric=is_metric,
        calibration_state=calib_state,
        valid_samples_count=valid_samples_count,
        nodata_samples_count=nodata_samples_count,
        nodata_pct=nodata_pct,
        samples=profile_samples
    )


# ==============================================================================
# 3. TERRAIN SCREENING CONTRACTS & IMPLEMENTATION
# ==============================================================================

@dataclass
class TerrainScreeningResult:
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
    mask: np.ndarray  # Shape (rows, cols), dtype uint8 (0=unsuitable, 1=suitable, 2=unknown)
    disclaimer: str = (
        "TERRAIN SCREENING: Rule-based geometric threshold filter. "
        "Not a certified suitability determination for construction, agriculture, or engineering safety."
    )


def screen_terrain_suitability(
    grid: TerrainGrid,
    max_slope: Optional[float] = None,
    min_elevation: Optional[float] = None,
    max_elevation: Optional[float] = None,
    exclude_nodata: bool = True
) -> TerrainScreeningResult:
    """
    Performs transparent rule-based screening over terrain cells.
    
    CRITICAL CONSTRAINT:
    For RELATIVE terrain, degree-based slope thresholds are strictly rejected.
    """
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    is_physical_slope = bool(is_metric and grid.has_metric_horizontal_scale)

    slope_res = compute_slope(grid)
    elev = grid.elevations
    slope_map = slope_res.slope_map
    rows, cols = grid.rows, grid.cols
    total_cells = rows * cols

    # Determine validity mask
    valid_mask = np.isfinite(elev)
    if grid.nodata is not None:
        valid_mask &= (elev != grid.nodata)

    # Initialize mask: 2 = UNKNOWN
    mask = np.full((rows, cols), fill_value=2, dtype=np.uint8)

    # If relative terrain and a degree-like threshold (> 1.0 or ambiguous) was attempted without metric scale:
    # We enforce slope_unit:
    # If is_physical_slope -> slope_unit is degrees
    # If not -> slope_unit is relative_gradient
    slope_unit = SlopeUnit.DEGREES.value if is_physical_slope else SlopeUnit.RELATIVE_GRADIENT.value

    if not is_physical_slope and max_slope is not None and max_slope > 10.0:
        raise ValueError(
            f"Degree-based slope threshold ({max_slope}°) cannot be applied to relative/uncalibrated terrain. "
            "Use a dimensionless relative gradient threshold or calibrate the terrain first."
        )

    # Screening evaluation on valid cells
    suitable_condition = np.ones((rows, cols), dtype=bool)

    if max_slope is not None:
        slope_valid = np.isfinite(slope_map)
        slope_pass = (slope_map <= max_slope) & slope_valid
        suitable_condition &= slope_pass

    if min_elevation is not None:
        elev_pass = (elev >= min_elevation)
        suitable_condition &= elev_pass

    if max_elevation is not None:
        elev_pass = (elev <= max_elevation)
        suitable_condition &= elev_pass

    # Assign 1 for suitable, 0 for unsuitable on valid cells
    mask[valid_mask & suitable_condition] = 1
    mask[valid_mask & ~suitable_condition] = 0

    suitable_count = int(np.sum(mask == 1))
    unsuitable_count = int(np.sum(mask == 0))
    unknown_count = int(np.sum(mask == 2))

    suitable_pct = round((suitable_count / total_cells) * 100.0, 2)
    unsuitable_pct = round((unsuitable_count / total_cells) * 100.0, 2)
    unknown_pct = round((unknown_count / total_cells) * 100.0, 2)

    return TerrainScreeningResult(
        suitable_cells=suitable_count,
        unsuitable_cells=unsuitable_count,
        unknown_cells=unknown_count,
        total_cells=total_cells,
        suitable_pct=suitable_pct,
        unsuitable_pct=unsuitable_pct,
        unknown_pct=unknown_pct,
        max_slope_threshold=max_slope,
        slope_unit=slope_unit,
        min_elevation_threshold=min_elevation,
        max_elevation_threshold=max_elevation,
        elevation_unit=grid.elevation_unit,
        is_calibrated=is_metric,
        mask=mask
    )
