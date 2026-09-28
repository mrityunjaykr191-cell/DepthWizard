"""
DepthWizard — Phase 4E Advanced Terrain Intelligence Test Suite
Authority: Phase 4E Specification (Sections 4E.1, 4E.2, 4E.3)

Validates:
1. Terrain Line of Sight (flat visible, ridge blocked, numerical tolerance, NoData unknown, observer offsets, relative vs calibrated units)
2. Route Profile Assessment (flat, monotonic uphill, uphill+downhill, gain/loss, max gradient, NoData gaps, descriptive classifications)
3. Terrain Screening (slope thresholding, elevation min/max bounds, NoData unknown, relative degree-rejection vs calibrated)
4. Fast, hermetic API endpoint integration using FastAPI TestClient (/api/terrain/los, /api/terrain/route, /api/terrain/screening)
"""

import math
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.terrain import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    SlopeUnit,
    TerrainAnalyticsEngine,
    calculate_line_of_sight,
    assess_route_profile,
    screen_terrain_suitability
)
from backend.utils.serialization import encode_depth_raw


@pytest.fixture
def engine():
    return TerrainAnalyticsEngine()


@pytest.fixture
def client():
    return TestClient(app)


# ==============================================================================
# 1. LINE OF SIGHT (LOS) / VISIBILITY TESTS
# ==============================================================================

def test_los_flat_terrain_is_visible(engine):
    """
    On flat terrain with zero observer offsets, all interior points have clearance 0.0,
    which satisfies clearance >= -tolerance, resulting in VISIBLE status.
    """
    elev = np.full((20, 20), 100.0, dtype=np.float32)
    grid = engine.create_grid(
        elev, dx=5.0, dy=5.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.calculate_line_of_sight(grid, x_a=2.0, y_a=10.0, x_b=18.0, y_b=10.0)
    assert res.is_visible is True
    assert res.status == "VISIBLE"
    assert res.first_blocking_point is None
    assert res.max_obstruction == 0.0
    assert res.distance_unit == "meters"
    assert res.elevation_unit == "meters"
    assert res.is_metric is True
    assert len(res.samples) > 10


def test_los_ridge_crossing_is_blocked(engine):
    """
    When a ridge sits between Point A and Point B, the ray should be BLOCKED,
    and first_blocking_point must capture the location of obstruction.
    """
    elev = np.full((21, 21), 50.0, dtype=np.float32)
    # Ridge spanning columns 9 to 11 rising to 120.0
    elev[:, 9:12] = 120.0

    grid = engine.create_grid(
        elev, dx=2.0, dy=2.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.calculate_line_of_sight(grid, x_a=2.0, y_a=10.0, x_b=18.0, y_b=10.0)
    assert res.is_visible is False
    assert res.status == "BLOCKED"
    assert res.first_blocking_point is not None
    assert res.first_blocking_point.obstruction > 0.0
    assert res.max_obstruction == pytest.approx(70.0, abs=1.0)
    assert res.min_clearance == pytest.approx(-70.0, abs=1.0)


def test_los_observer_offsets_unblock_obstruction(engine):
    """
    If observer or target heights are elevated above the ridge, the line becomes VISIBLE.
    """
    elev = np.full((21, 21), 50.0, dtype=np.float32)
    elev[:, 10] = 70.0  # Ridge is 20m high above base

    grid = engine.create_grid(
        elev, dx=2.0, dy=2.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    # With 0 offset -> blocked
    res_blocked = engine.calculate_line_of_sight(grid, 2.0, 10.0, 18.0, 10.0, 0.0, 0.0)
    assert res_blocked.is_visible is False

    # With 30m tower at Point A and 30m tower at Point B -> ray at ridge is at 80m > 70m terrain -> VISIBLE
    res_clear = engine.calculate_line_of_sight(grid, 2.0, 10.0, 18.0, 10.0, observer_offset_a=30.0, target_offset_b=30.0)
    assert res_clear.is_visible is True
    assert res_clear.status == "VISIBLE"
    assert res_clear.first_blocking_point is None
    assert res_clear.min_clearance is not None and res_clear.min_clearance >= 0.0


def test_los_tolerance_boundary_behavior(engine):
    """
    Micro-obstructions smaller than tolerance (e.g. 1e-6 < 1e-4) should not trigger BLOCKED.
    Obstructions exceeding tolerance must trigger BLOCKED.
    """
    elev = np.full((15, 15), 100.0, dtype=np.float32)
    # Ridge that rises by 0.00005 (below default tolerance 1e-4)
    elev[7, 7] = 100.00005

    grid = engine.create_grid(elev, dx=1.0, dy=1.0)
    res_sub_tol = engine.calculate_line_of_sight(grid, 2.0, 7.0, 12.0, 7.0, tolerance=1e-4)
    assert res_sub_tol.is_visible is True

    # Now with tight tolerance 1e-6 -> blocked
    res_strict = engine.calculate_line_of_sight(grid, 2.0, 7.0, 12.0, 7.0, tolerance=1e-6)
    assert res_strict.is_visible is False
    assert res_strict.status == "BLOCKED"


def test_los_nodata_crossing_results_in_unknown(engine):
    """
    When missing / NoData terrain lies along the transect, line cannot be confirmed visible.
    Status must be UNKNOWN and is_visible must be False.
    """
    elev = np.full((15, 15), 50.0, dtype=np.float32)
    elev[7, 6:9] = -9999.0  # NoData gap

    grid = engine.create_grid(elev, dx=1.0, dy=1.0, nodata=-9999.0)
    res = engine.calculate_line_of_sight(grid, 2.0, 7.0, 12.0, 7.0)

    assert res.is_visible is False
    assert res.status == "UNKNOWN"
    assert res.nodata_samples > 0


def test_los_relative_state_uses_relative_units(engine):
    """
    On uncalibrated relative terrain, units must be 'pixels' and 'relative units',
    with is_metric=False and no metric claims.
    """
    elev = np.full((10, 10), 20.0, dtype=np.float32)
    grid = engine.create_grid(
        elev, dx=1.0, dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )

    res = engine.calculate_line_of_sight(grid, 1.0, 5.0, 8.0, 5.0)
    assert res.is_metric is False
    assert res.distance_unit == "pixels"
    assert res.elevation_unit == "relative units"
    assert "meters" not in res.distance_unit
    assert "meters" not in res.elevation_unit


# ==============================================================================
# 2. ROUTE PROFILE ASSESSMENT TESTS
# ==============================================================================

def test_route_profile_flat_terrain(engine):
    """
    Flat terrain route profile must have 0 gain, 0 loss, 0 gradient, GENTLE classification.
    """
    elev = np.full((10, 10), 150.0, dtype=np.float32)
    grid = engine.create_grid(
        elev, dx=10.0, dy=10.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.assess_route_profile(grid, 1.0, 5.0, 9.0, 5.0)
    assert res.total_distance == pytest.approx(80.0, abs=0.1)
    assert res.distance_unit == "meters"
    assert res.elevation_gain == pytest.approx(0.0, abs=1e-3)
    assert res.elevation_loss == pytest.approx(0.0, abs=1e-3)
    assert res.net_elevation_change == pytest.approx(0.0, abs=1e-3)
    assert res.max_uphill_gradient == pytest.approx(0.0, abs=1e-3)
    assert res.max_downhill_gradient == pytest.approx(0.0, abs=1e-3)
    assert res.classification == "GENTLE"
    assert res.nodata_pct == 0.0


def test_route_profile_monotonic_uphill_plane(engine):
    """
    Along a tilted plane with slope dz/dx = 0.5 (gradient 0.5, ~26.57°):
    Elevation gain = delta_z, elevation loss = 0, max gradient = 0.5.
    """
    rows, cols = 10, 10
    c_coords = np.arange(cols, dtype=np.float32)
    elev = np.tile(c_coords * 5.0, (rows, 1))  # dz/dx = 5.0 / 10.0m = 0.5

    grid = engine.create_grid(
        elev, dx=10.0, dy=10.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    # From col 0 to col 8 (distance 80m, elevation from 0m to 40m)
    res = engine.assess_route_profile(grid, x_a=0.0, y_a=4.0, x_b=8.0, y_b=4.0)
    assert res.total_distance == pytest.approx(80.0, abs=0.1)
    assert res.elevation_gain == pytest.approx(40.0, abs=0.5)
    assert res.elevation_loss == pytest.approx(0.0, abs=0.1)
    assert res.net_elevation_change == pytest.approx(40.0, abs=0.5)
    assert res.max_uphill_gradient == pytest.approx(0.5, abs=0.01)
    assert res.max_downhill_gradient == pytest.approx(0.0, abs=0.01)
    assert res.max_slope_unit == "degrees"
    assert res.max_slope == pytest.approx(26.6, abs=0.5)
    assert res.classification == "STEEP"  # > 25 degrees threshold


def test_route_profile_uphill_and_downhill(engine):
    """
    Route passing over a hill has positive gain and positive loss.
    """
    # 1D slice: [100, 120, 140, 160, 140, 120, 100]
    elev_1d = np.array([100.0, 120.0, 140.0, 160.0, 140.0, 120.0, 100.0], dtype=np.float32)
    elev = np.tile(elev_1d, (5, 1))

    grid = engine.create_grid(
        elev, dx=5.0, dy=5.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.assess_route_profile(grid, 0.0, 2.0, 6.0, 2.0, num_samples=7)
    assert res.elevation_gain == pytest.approx(60.0, abs=1.0)
    assert res.elevation_loss == pytest.approx(60.0, abs=1.0)
    assert res.net_elevation_change == pytest.approx(0.0, abs=0.5)
    assert res.max_uphill_gradient > 0.0
    assert res.max_downhill_gradient > 0.0


def test_route_profile_nodata_preservation(engine):
    """
    NoData cells along the route must be reported in nodata_samples_count and nodata_pct.
    """
    elev = np.full((11, 11), 200.0, dtype=np.float32)
    elev[5, 4:7] = -9999.0

    grid = engine.create_grid(elev, dx=1.0, dy=1.0, nodata=-9999.0)
    res = engine.assess_route_profile(grid, 1.0, 5.0, 9.0, 5.0)

    assert res.nodata_samples_count > 0
    assert res.nodata_pct > 0.0
    assert res.valid_samples_count < len(res.samples)


def test_route_profile_relative_state_classification(engine):
    """
    On relative terrain, relief classification applies (LOW / MODERATE / HIGH RELIEF).
    Units are relative units.
    """
    elev = np.array([
        [0.0, 15.0, 30.0],
        [0.0, 15.0, 30.0],
        [0.0, 15.0, 30.0]
    ], dtype=np.float32)

    grid = engine.create_grid(
        elev, dx=1.0, dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )

    res = engine.assess_route_profile(grid, 0.0, 1.0, 2.0, 1.0)
    assert res.is_metric is False
    assert res.max_slope_unit == "relative_gradient"
    assert res.classification == "HIGH RELIEF"  # relief is 30.0 > 20.0 threshold


# ==============================================================================
# 3. TERRAIN SCREENING TESTS
# ==============================================================================

def test_screening_flat_terrain_100_percent_suitable(engine):
    """
    Flat terrain screened with max_slope=30° should result in 100% suitable cells.
    """
    elev = np.full((10, 10), 100.0, dtype=np.float32)
    grid = engine.create_grid(
        elev, dx=5.0, dy=5.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.screen_terrain_suitability(grid, max_slope=30.0)
    assert res.suitable_cells == 100
    assert res.unsuitable_cells == 0
    assert res.unknown_cells == 0
    assert res.suitable_pct == 100.0
    assert np.all(res.mask == 1)


def test_screening_steep_slope_unsuitable(engine):
    """
    On a steep plane (> 30°), screening with max_slope=20° results in 0% suitable interior cells.
    """
    rows, cols = 10, 10
    c_coords = np.arange(cols, dtype=np.float32)
    # dz/dx = 10.0 / 5.0m = 2.0 -> slope = atan(2.0) = 63.4°
    elev = np.tile(c_coords * 10.0, (rows, 1))

    grid = engine.create_grid(
        elev, dx=5.0, dy=5.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.screen_terrain_suitability(grid, max_slope=20.0)
    assert res.unsuitable_cells > 0
    assert res.suitable_pct < 50.0


def test_screening_elevation_bounds(engine):
    """
    Screening with min_elevation=200 and max_elevation=300 selects only cells in that range.
    """
    elev = np.array([
        [100.0, 250.0, 400.0],
        [100.0, 250.0, 400.0],
        [100.0, 250.0, 400.0]
    ], dtype=np.float32)

    grid = engine.create_grid(
        elev, dx=5.0, dy=5.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=True,
        elevation_unit="meters"
    )

    res = engine.screen_terrain_suitability(grid, min_elevation=200.0, max_elevation=300.0)
    assert res.suitable_cells == 3  # Center column only
    assert res.unsuitable_cells == 6
    assert res.suitable_pct == pytest.approx(33.33, abs=0.1)


def test_screening_nodata_cells_marked_unknown(engine):
    """
    Cells with NoData must receive mask value 2 (UNKNOWN) and count in unknown_cells.
    """
    elev = np.full((6, 6), 50.0, dtype=np.float32)
    elev[0:2, 0:2] = -9999.0  # 4 cells NoData

    grid = engine.create_grid(elev, dx=1.0, dy=1.0, nodata=-9999.0)
    res = engine.screen_terrain_suitability(grid, max_slope=1.0)

    assert res.unknown_cells == 4
    assert res.unknown_pct == pytest.approx((4 / 36) * 100.0, abs=0.1)
    assert np.all(res.mask[0:2, 0:2] == 2)


def test_screening_relative_terrain_rejects_degree_threshold(engine):
    """
    CRITICAL CONSTRAINT:
    Relative terrain MUST reject degree-based slope thresholds (>10.0°).
    """
    elev = np.full((10, 10), 50.0, dtype=np.float32)
    grid = engine.create_grid(
        elev, dx=1.0, dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )

    with pytest.raises(ValueError, match="cannot be applied to relative/uncalibrated terrain"):
        engine.screen_terrain_suitability(grid, max_slope=30.0)


# ==============================================================================
# 4. FASTAPI HTTP API ENDPOINT TESTS (TestClient)
# ==============================================================================

def test_api_los_endpoint(client):
    """
    Tests POST /api/terrain/los with TestClient.
    """
    elev = np.full((10, 10), 100.0, dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "x_a": 1.0,
        "y_a": 5.0,
        "x_b": 8.0,
        "y_b": 5.0,
        "observer_offset_a": 0.0,
        "target_offset_b": 0.0,
        "elevations_raw_b64": b64_data,
        "width": 10,
        "height": 10,
        "dx": 5.0,
        "dy": 5.0,
        "has_metric_horizontal_scale": True,
        "horizontal_unit": "meters",
        "mode": "absolute",
        "calibration_state": "calibrated",
        "elevation_unit": "meters"
    }

    resp = client.post("/api/terrain/los", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_visible"] is True
    assert data["status"] == "VISIBLE"
    assert data["distance_unit"] == "meters"
    assert "TERRAIN LINE-OF-SIGHT" in data["disclaimer"]


def test_api_route_endpoint(client):
    """
    Tests POST /api/terrain/route with TestClient.
    """
    elev = np.full((10, 10), 100.0, dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "x_a": 1.0,
        "y_a": 5.0,
        "x_b": 8.0,
        "y_b": 5.0,
        "elevations_raw_b64": b64_data,
        "width": 10,
        "height": 10,
        "dx": 5.0,
        "dy": 5.0,
        "has_metric_horizontal_scale": True,
        "horizontal_unit": "meters",
        "mode": "absolute",
        "calibration_state": "calibrated",
        "elevation_unit": "meters"
    }

    resp = client.post("/api/terrain/route", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["classification"] == "GENTLE"
    assert data["elevation_gain"] == 0.0
    assert "TERRAIN PROFILE ASSESSMENT" in data["disclaimer"]


def test_api_screening_endpoint(client):
    """
    Tests POST /api/terrain/screening with TestClient.
    """
    elev = np.full((8, 8), 100.0, dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "max_slope": 30.0,
        "min_elevation": 50.0,
        "max_elevation": 150.0,
        "elevations_raw_b64": b64_data,
        "width": 8,
        "height": 8,
        "dx": 5.0,
        "dy": 5.0,
        "has_metric_horizontal_scale": True,
        "horizontal_unit": "meters",
        "mode": "absolute",
        "calibration_state": "calibrated",
        "elevation_unit": "meters"
    }

    resp = client.post("/api/terrain/screening", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["suitable_cells"] == 64
    assert data["suitable_pct"] == 100.0
    assert data["mask_raw_b64"] is not None
    assert "TERRAIN SCREENING" in data["disclaimer"]
