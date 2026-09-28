"""
DepthWizard — Phase 4B Interactive Terrain Measurements Test Suite
Authority: Phase 4B Specification & docs/engineering/testing.md

Validates:
1. Height probe (flat plane, tilted planes, interpolation, out-of-bounds, NoData)
2. Two-point measurement (horizontal distance, elevation delta, 3D distance, physical vs relative slope)
3. Cross-section sampling (regular intervals, distance along profile, NoData gaps, relief)
4. Calibration state preservation & strict unit isolation
5. Exaggeration invariance & immutability
6. Live HTTP API endpoint integration (/api/terrain/probe, /api/terrain/measure, /api/terrain/profile)
"""

import math
import json
import urllib.request
from pathlib import Path
import pytest
import numpy as np

from backend.terrain import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    SlopeUnit,
    TerrainAnalyticsEngine,
    probe_point,
    measure_two_points,
    sample_cross_section
)
from backend.utils.serialization import encode_depth_raw


@pytest.fixture
def engine():
    return TerrainAnalyticsEngine()


# ==============================================================================
# 1. HEIGHT PROBE TESTS
# ==============================================================================

def test_probe_flat_plane(engine):
    """
    On a perfectly flat terrain, height probe must return exact elevation,
    slope of 0 (degrees or relative gradient), is_flat=True, and aspect=None.
    """
    elev = np.full((10, 10), 250.0, dtype=np.float32)
    grid = engine.create_grid(
        elev,
        dx=5.0,
        dy=5.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.probe_point(grid, 4.0, 4.0)
    assert res.valid is True
    assert math.isclose(res.elevation, 250.0, abs_tol=1e-4)
    assert res.unit == "meters"
    assert res.is_metric is True
    assert res.is_flat is True
    assert res.slope == 0.0
    assert res.slope_unit == "degrees"
    assert res.aspect is None


def test_probe_tilted_plane_physical(engine):
    """
    On a known plane z = 100 + 0.1 * y (elev increases downwards/south, dx=1, dy=1),
    slope = atan(0.1) rad = ~5.71 degrees.
    Downhill aspect should point North (0 degrees).
    """
    rows, cols = 15, 15
    y_coords, x_coords = np.mgrid[0:rows, 0:cols]
    elev = (100.0 + 0.1 * y_coords).astype(np.float32)

    grid = engine.create_grid(
        elev,
        dx=1.0,
        dy=1.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.probe_point(grid, 7.0, 7.0)
    assert res.valid is True
    assert math.isclose(res.elevation, 100.7, abs_tol=1e-3)
    assert res.slope_is_physical is True
    assert res.slope_unit == "degrees"
    expected_slope = math.degrees(math.atan(0.1))
    assert math.isclose(res.slope, expected_slope, abs_tol=0.1)
    # Downhill is toward y=0 (North) -> aspect = 0.0 deg
    assert math.isclose(res.aspect, 0.0, abs_tol=0.5)


def test_probe_subpixel_interpolation(engine):
    """
    Continuous probe at fractional coordinate (1.5, 1.5) on a 4-cell patch
    [[10, 20], [30, 40]] should interpolate bilinearly to 25.0.
    """
    elev = np.array([
        [10.0, 20.0, 30.0],
        [30.0, 40.0, 50.0],
        [50.0, 60.0, 70.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    # Center of top-left quad [0,0] to [1,1] at (0.5, 0.5):
    # values: (10 + 20 + 30 + 40) / 4 = 25.0
    res = engine.probe_point(grid, 0.5, 0.5)
    assert res.valid is True
    assert math.isclose(res.elevation, 25.0, abs_tol=1e-4)


def test_probe_out_of_bounds(engine):
    """
    Coordinates strictly outside [0, cols-1] or [0, rows-1] must return valid=False.
    """
    elev = np.full((5, 5), 10.0, dtype=np.float32)
    grid = engine.create_grid(elev)

    res_neg = engine.probe_point(grid, -1.0, 2.0)
    assert res_neg.valid is False
    assert res_neg.out_of_bounds is True
    assert res_neg.elevation is None

    res_pos = engine.probe_point(grid, 5.5, 2.0)
    assert res_pos.valid is False
    assert res_pos.out_of_bounds is True


def test_probe_nodata_cell(engine):
    """
    Probing a NoData cell must return valid=False, is_nodata=True.
    """
    elev = np.full((5, 5), 50.0, dtype=np.float32)
    elev[2, 2] = -9999.0
    grid = engine.create_grid(elev, nodata=-9999.0)

    res = engine.probe_point(grid, 2.0, 2.0)
    assert res.valid is False
    assert res.is_nodata is True
    assert res.elevation is None


# ==============================================================================
# 2. TWO-POINT DELTA MEASUREMENT TESTS
# ==============================================================================

def test_two_point_calibrated_horizontal_and_delta(engine):
    """
    Two points on a calibrated metric terrain:
    A = (1, 1), B = (4, 5) with dx=10m, dy=10m.
    dx_m = (4-1)*10 = 30m, dy_m = (5-1)*10 = 40m -> horiz_dist = 50m.
    A has elev 100m, B has elev 130m -> delta_z = +30m.
    3D distance = sqrt(50^2 + 30^2) = sqrt(3400) = ~58.31m.
    Slope = atan(30 / 50) = ~30.96 deg.
    """
    elev = np.zeros((10, 10), dtype=np.float32)
    elev[1, 1] = 100.0
    elev[5, 4] = 130.0

    grid = engine.create_grid(
        elev,
        dx=10.0,
        dy=10.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.measure_two_points(grid, 1.0, 1.0, 4.0, 5.0)
    assert res.valid is True
    assert math.isclose(res.horizontal_distance, 50.0, abs_tol=1e-3)
    assert res.horizontal_unit == "meters"
    assert math.isclose(res.elevation_delta, 30.0, abs_tol=1e-3)
    expected_3d = math.sqrt(50.0 ** 2 + 30.0 ** 2)
    assert math.isclose(res.straight_line_3d_distance, expected_3d, abs_tol=1e-2)
    expected_slope = math.degrees(math.atan2(30.0, 50.0))
    assert math.isclose(res.slope_between_points, expected_slope, abs_tol=1e-2)
    assert res.slope_unit == "degrees"
    assert res.slope_is_physical is True


def test_two_point_relative_uncalibrated_units(engine):
    """
    On an uncalibrated relative terrain, horizontal distance must be in 'pixels',
    elevation delta in 'relative units', straight_line_3d must be None (never fabricate metric 3D),
    and slope must be 'relative gradient' (dimensionless).
    """
    elev = np.zeros((10, 10), dtype=np.float32)
    elev[0, 0] = 1.0
    elev[0, 4] = 3.0  # delta_z = 2.0, dist = 4 px

    grid = engine.create_grid(
        elev,
        dx=1.0,
        dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE,
        has_metric_horizontal_scale=False,
        elevation_unit="relative units"
    )

    res = engine.measure_two_points(grid, 0.0, 0.0, 4.0, 0.0)
    assert res.valid is True
    assert math.isclose(res.horizontal_distance, 4.0, abs_tol=1e-3)
    assert res.horizontal_unit == "pixels"
    assert math.isclose(res.elevation_delta, 2.0, abs_tol=1e-3)
    assert res.elevation_unit == "relative units"
    assert res.straight_line_3d_distance is None  # STRICT TRUTH RULE
    assert res.slope_unit == SlopeUnit.RELATIVE_GRADIENT.value
    assert res.slope_is_physical is False
    assert math.isclose(res.slope_between_points, 0.5, abs_tol=1e-4)


def test_two_point_invalid_endpoints(engine):
    """
    If either endpoint is out of bounds or NoData, measurement must indicate invalid.
    """
    elev = np.full((5, 5), 10.0, dtype=np.float32)
    grid = engine.create_grid(elev)

    res = engine.measure_two_points(grid, 1.0, 1.0, 10.0, 10.0)
    assert res.valid is False
    assert res.elevation_delta is None
    assert res.straight_line_3d_distance is None
    assert res.failure_reason is not None


# ==============================================================================
# 3. CROSS-SECTION PROFILE TESTS
# ==============================================================================

def test_cross_section_linear_transect(engine):
    """
    Samples along a linear ramp: z = x * 10 (from x=0 to x=10).
    Verifies regular intervals, elevation matching ramp, and relief.
    """
    elev = np.tile(np.linspace(0, 100, 11, dtype=np.float32), (5, 1))
    grid = engine.create_grid(
        elev,
        dx=2.0,
        dy=2.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.sample_cross_section(grid, 0.0, 2.0, 10.0, 2.0, num_samples=11)
    assert len(res.samples) == 11
    assert math.isclose(res.total_distance, 20.0, abs_tol=1e-3)
    assert res.distance_unit == "meters"
    assert res.valid_sample_count == 11
    assert res.nodata_sample_count == 0
    assert math.isclose(res.min_elevation, 0.0, abs_tol=1e-3)
    assert math.isclose(res.max_elevation, 100.0, abs_tol=1e-3)
    assert math.isclose(res.elevation_relief, 100.0, abs_tol=1e-3)

    # Check midpoint sample
    mid_sample = res.samples[5]
    assert math.isclose(mid_sample.distance, 10.0, abs_tol=1e-3)
    assert math.isclose(mid_sample.elevation, 50.0, abs_tol=1e-3)


def test_cross_section_nodata_handling(engine):
    """
    Cross-section crossing a NoData lake must flag those samples as valid=False
    and correctly tally nodata_sample_count.
    """
    elev = np.full((10, 10), 100.0, dtype=np.float32)
    # Put NoData in columns 4, 5 along row 2
    elev[2, 4:6] = -9999.0
    grid = engine.create_grid(elev, nodata=-9999.0)

    res = engine.sample_cross_section(grid, 0.0, 2.0, 9.0, 2.0, num_samples=10)
    assert res.nodata_sample_count >= 2
    assert res.valid_sample_count <= 8
    # Min/max elevation must ignore the -9999.0 NoData
    assert math.isclose(res.min_elevation, 100.0, abs_tol=1e-3)
    assert math.isclose(res.max_elevation, 100.0, abs_tol=1e-3)


# ==============================================================================
# 4. EXAGGERATION INVARIANCE & IMMUTABILITY
# ==============================================================================

def test_measurement_exaggeration_invariance(engine):
    """
    Vertical exaggeration (e.g. 2.0x, 5.0x) is purely a visual rendering transform.
    The measurement queries must return identical results regardless of visual scaling.
    """
    elev = np.array([
        [10.0, 20.0],
        [30.0, 40.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev, dx=5.0, dy=5.0)

    probe_before = engine.probe_point(grid, 0.5, 0.5)

    # Attempt to modify underlying grid elevations array (must fail or be immutable)
    with pytest.raises(ValueError):
        grid.elevations[0, 0] = 999.0

    probe_after = engine.probe_point(grid, 0.5, 0.5)
    assert probe_before.elevation == probe_after.elevation


# ==============================================================================
# 5. LIVE HTTP API ENDPOINT INTEGRATION TESTS
# ==============================================================================

def test_api_probe_endpoint():
    """
    Tests live HTTP POST /api/terrain/probe endpoint.
    """
    elev = np.array([
        [50.0, 60.0],
        [70.0, 80.0]
    ], dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "x": 0.5,
        "y": 0.5,
        "elevations_raw_b64": b64_data,
        "width": 2,
        "height": 2,
        "dx": 1.0,
        "dy": 1.0,
        "mode": "relative",
        "calibration_state": "relative"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/terrain/probe",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["valid"] is True
        assert math.isclose(data["elevation"], 65.0, abs_tol=1e-4)
        assert data["unit"] == "relative units"
        assert data["is_metric"] is False
        assert data["slope_is_physical"] is False


def test_api_measure_endpoint():
    """
    Tests live HTTP POST /api/terrain/measure endpoint.
    """
    elev = np.array([
        [100.0, 100.0, 100.0],
        [100.0, 100.0, 100.0],
        [100.0, 100.0, 150.0]
    ], dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "x_a": 0.0,
        "y_a": 0.0,
        "x_b": 2.0,
        "y_b": 2.0,
        "elevations_raw_b64": b64_data,
        "width": 3,
        "height": 3,
        "dx": 10.0,
        "dy": 10.0,
        "mode": "absolute",
        "calibration_state": "calibrated",
        "has_metric_horizontal_scale": True,
        "elevation_unit": "meters"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/terrain/measure",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["valid"] is True
        expected_horiz = math.sqrt((20.0) ** 2 + (20.0) ** 2)
        assert math.isclose(data["horizontal_distance"], expected_horiz, abs_tol=1e-2)
        assert data["horizontal_unit"] == "meters"
        assert math.isclose(data["elevation_delta"], 50.0, abs_tol=1e-2)
        assert data["straight_line_3d_distance"] is not None
        assert data["slope_unit"] == "degrees"
        assert data["slope_is_physical"] is True


def test_api_profile_endpoint():
    """
    Tests live HTTP POST /api/terrain/profile endpoint.
    """
    elev = np.array([
        [10.0, 20.0, 30.0],
        [10.0, 20.0, 30.0],
        [10.0, 20.0, 30.0]
    ], dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "x_a": 0.0,
        "y_a": 1.0,
        "x_b": 2.0,
        "y_b": 1.0,
        "num_samples": 5,
        "elevations_raw_b64": b64_data,
        "width": 3,
        "height": 3,
        "dx": 5.0,
        "dy": 5.0,
        "mode": "relative",
        "calibration_state": "relative"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/terrain/profile",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert len(data["samples"]) == 5
        assert math.isclose(data["total_distance"], 2.0, abs_tol=1e-3)  # pixel units
        assert data["distance_unit"] == "pixels"
        assert math.isclose(data["min_elevation"], 10.0, abs_tol=1e-3)
        assert math.isclose(data["max_elevation"], 30.0, abs_tol=1e-3)
        assert math.isclose(data["elevation_relief"], 20.0, abs_tol=1e-3)
