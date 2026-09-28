"""
DepthWizard — Interactive Terrain Measurement Functions
Authority: Phase 4B Specification (Sections 4B.1, 4B.2, 4B.3)

Provides pure, deterministic measurement algorithms operating on TerrainGrid:
1. Height Probe: point query with local slope and aspect.
2. Two-Point Delta: horizontal distance, elevation delta, 3D distance, segment slope.
3. Cross-Section Profile: regularly spaced linear sampling along transect A->B.
Strictly respects calibration states and avoids inventing metric units.
"""

import math
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
import numpy as np

from .contracts import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    SlopeUnit
)
from .elevation import elevation_at
from .slope import compute_gradients_2d


@dataclass
class PointProbeResult:
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


@dataclass
class TwoPointMeasurementResult:
    point_a: PointProbeResult
    point_b: PointProbeResult
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


@dataclass
class ProfileSample:
    distance: float
    x: float
    y: float
    elevation: Optional[float]
    valid: bool


@dataclass
class CrossSectionResult:
    samples: List[ProfileSample]
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


def probe_point(grid: TerrainGrid, x: float, y: float) -> PointProbeResult:
    """
    Evaluates elevation, local slope, and downhill aspect at continuous coordinate (x, y).
    """
    elev_res = elevation_at(grid, x, y)
    calib_state = grid.calibration_state.value
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    is_physical_slope = is_metric and grid.has_metric_horizontal_scale

    if not elev_res.valid:
        return PointProbeResult(
            x=x, y=y, valid=False, elevation=None, unit=grid.elevation_unit,
            is_metric=is_metric, mode=grid.mode.value, calibration_state=calib_state,
            slope=None, slope_unit=SlopeUnit.DEGREES.value if is_physical_slope else SlopeUnit.RELATIVE_GRADIENT.value,
            slope_is_physical=is_physical_slope, aspect=None, is_flat=False,
            out_of_bounds=elev_res.out_of_bounds, is_nodata=elev_res.is_nodata,
            failure_reason=elev_res.failure_reason
        )

    # Compute local slope and aspect at nearest grid vertex or finite-difference window
    nearest_c = int(np.clip(round(x), 0, grid.cols - 1))
    nearest_r = int(np.clip(round(y), 0, grid.rows - 1))

    dz_dx, dz_dy, grad_valid = compute_gradients_2d(
        grid.elevations, grid.dx, grid.dy, grid.nodata
    )

    slope_val = None
    slope_unit = SlopeUnit.DEGREES.value if is_physical_slope else SlopeUnit.RELATIVE_GRADIENT.value
    aspect_val = None
    is_flat = False

    if grad_valid[nearest_r, nearest_c]:
        gx = float(dz_dx[nearest_r, nearest_c])
        gy = float(dz_dy[nearest_r, nearest_c])
        grad_mag = math.sqrt(gx ** 2 + gy ** 2)

        if is_physical_slope:
            slope_val = round(math.degrees(math.atan(grad_mag)), 2)
        else:
            slope_val = round(grad_mag, 4)

        if grad_mag < 1e-6:
            is_flat = True
            aspect_val = None
        else:
            # theta = atan2(-dz/dx, dz/dy) in degrees clockwise from North
            ang_deg = math.degrees(math.atan2(-gx, gy)) % 360.0
            if math.isclose(ang_deg, 360.0, abs_tol=1e-4):
                ang_deg = 0.0
            aspect_val = round(ang_deg, 1)

    return PointProbeResult(
        x=round(x, 3),
        y=round(y, 3),
        valid=True,
        elevation=elev_res.elevation,
        unit=grid.elevation_unit,
        is_metric=is_metric,
        mode=grid.mode.value,
        calibration_state=calib_state,
        slope=slope_val,
        slope_unit=slope_unit,
        slope_is_physical=is_physical_slope,
        aspect=aspect_val,
        is_flat=is_flat
    )


def measure_two_points(
    grid: TerrainGrid,
    x_a: float, y_a: float,
    x_b: float, y_b: float
) -> TwoPointMeasurementResult:
    """
    Computes two-point delta metrics between Point A and Point B.
    """
    pt_a = probe_point(grid, x_a, y_a)
    pt_b = probe_point(grid, x_b, y_b)

    calib_state = grid.calibration_state.value
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )
    has_metric_scale = grid.has_metric_horizontal_scale

    # Compute horizontal distance
    if has_metric_scale:
        dx_m = (x_b - x_a) * grid.dx
        dy_m = (y_b - y_a) * grid.dy
        horiz_dist = math.sqrt(dx_m ** 2 + dy_m ** 2)
        horiz_unit = "meters"
    else:
        dx_px = x_b - x_a
        dy_px = y_b - y_a
        horiz_dist = math.sqrt(dx_px ** 2 + dy_px ** 2)
        horiz_unit = "pixels"

    if not pt_a.valid or not pt_b.valid:
        return TwoPointMeasurementResult(
            point_a=pt_a,
            point_b=pt_b,
            horizontal_distance=round(horiz_dist, 3),
            horizontal_unit=horiz_unit,
            has_metric_horizontal_scale=has_metric_scale,
            elevation_delta=None,
            elevation_unit=grid.elevation_unit,
            straight_line_3d_distance=None,
            slope_between_points=None,
            slope_unit=SlopeUnit.DEGREES.value if (is_metric and has_metric_scale) else SlopeUnit.RELATIVE_GRADIENT.value,
            slope_is_physical=bool(is_metric and has_metric_scale),
            calibration_state=calib_state,
            valid=False,
            failure_reason="One or both measurement endpoints are invalid or outside terrain bounds."
        )

    elev_delta = pt_b.elevation - pt_a.elevation
    slope_is_phys = bool(is_metric and has_metric_scale)

    if slope_is_phys:
        straight_line_3d = math.sqrt(horiz_dist ** 2 + elev_delta ** 2)
        slope_deg = math.degrees(math.atan2(abs(elev_delta), max(horiz_dist, 1e-6)))
        slope_val = round(slope_deg, 2)
        slope_unit = SlopeUnit.DEGREES.value
    else:
        # Relative terrain: do not mix pixels with relative elevation units into fake 3D distance
        straight_line_3d = None
        rel_grad = abs(elev_delta) / max(horiz_dist, 1e-6)
        slope_val = round(rel_grad, 4)
        slope_unit = SlopeUnit.RELATIVE_GRADIENT.value

    return TwoPointMeasurementResult(
        point_a=pt_a,
        point_b=pt_b,
        horizontal_distance=round(horiz_dist, 3),
        horizontal_unit=horiz_unit,
        has_metric_horizontal_scale=has_metric_scale,
        elevation_delta=round(elev_delta, 3),
        elevation_unit=grid.elevation_unit,
        straight_line_3d_distance=round(straight_line_3d, 3) if straight_line_3d is not None else None,
        slope_between_points=slope_val,
        slope_unit=slope_unit,
        slope_is_physical=slope_is_phys,
        calibration_state=calib_state,
        valid=True
    )


def sample_cross_section(
    grid: TerrainGrid,
    x_a: float, y_a: float,
    x_b: float, y_b: float,
    num_samples: Optional[int] = None
) -> CrossSectionResult:
    """
    Extracts regularly spaced elevation samples along transect A->B using bilinear interpolation.
    """
    has_metric_scale = grid.has_metric_horizontal_scale
    is_metric = (
        grid.calibration_state == TerrainCalibrationState.CALIBRATED
        and grid.mode == ElevationMode.ABSOLUTE
    )

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

    # Default sample count proportional to pixel distance
    pixel_dist = math.hypot(x_b - x_a, y_b - y_a)
    if num_samples is None:
        n_samples = max(20, min(200, int(math.ceil(pixel_dist))))
    else:
        n_samples = max(2, min(500, int(num_samples)))

    samples: List[ProfileSample] = []
    valid_elevations = []

    for i in range(n_samples):
        t = float(i) / float(n_samples - 1)
        cur_x = x_a + t * (x_b - x_a)
        cur_y = y_a + t * (y_b - y_a)
        cur_dist = t * total_dist

        elev_res = elevation_at(grid, cur_x, cur_y)
        if elev_res.valid and elev_res.elevation is not None:
            samples.append(ProfileSample(
                distance=round(cur_dist, 3),
                x=round(cur_x, 3),
                y=round(cur_y, 3),
                elevation=elev_res.elevation,
                valid=True
            ))
            valid_elevations.append(elev_res.elevation)
        else:
            samples.append(ProfileSample(
                distance=round(cur_dist, 3),
                x=round(cur_x, 3),
                y=round(cur_y, 3),
                elevation=None,
                valid=False
            ))

    valid_count = len(valid_elevations)
    nodata_count = n_samples - valid_count

    if valid_count > 0:
        min_elev = round(float(np.min(valid_elevations)), 3)
        max_elev = round(float(np.max(valid_elevations)), 3)
        relief = round(max_elev - min_elev, 3)
    else:
        min_elev, max_elev, relief = None, None, None

    return CrossSectionResult(
        samples=samples,
        total_distance=round(total_dist, 3),
        distance_unit=dist_unit,
        elevation_unit=grid.elevation_unit,
        is_metric=is_metric,
        calibration_state=grid.calibration_state.value,
        min_elevation=min_elev,
        max_elevation=max_elev,
        elevation_relief=relief,
        valid_sample_count=valid_count,
        nodata_sample_count=nodata_count,
        point_a=(round(x_a, 3), round(y_a, 3)),
        point_b=(round(x_b, 3), round(y_b, 3))
    )
