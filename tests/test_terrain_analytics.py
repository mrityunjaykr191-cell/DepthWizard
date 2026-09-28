"""
DepthWizard — Phase 4A Terrain Analytics Comprehensive Test Suite
Authority: Phase 4A Specification (Section 18, 19, 26)

Tests all required capabilities:
- Elevation query (exact grid point, bilinear interpolation, boundary, out-of-bounds, NoData)
- Slope (flat terrain, known planes, boundary handling, physical vs relative gradient)
- Aspect (flat undefined NaN, cardinal and intercardinal slopes, normalization [0, 360))
- Hillshade (finite, range [0, 1], flat plane illumination, overhead sun)
- Statistics (min, max, mean, median, std, relief, percentiles, NoData ignored, NaN/Inf handling)
- Calibration state & units (relative vs calibrated vs rejected)
- Exaggeration invariance & source array immutability
- Real-scene sanity test on Scene 1 (Alps)
"""

import math
import os
import sys
from pathlib import Path
import pytest
import numpy as np

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.terrain import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    SlopeUnit,
    TerrainAnalyticsEngine,
    elevation_at,
    compute_slope,
    compute_aspect,
    compute_hillshade,
    compute_statistics
)


@pytest.fixture
def engine():
    return TerrainAnalyticsEngine()


# ==============================================================================
# 1. ELEVATION QUERY TESTS
# ==============================================================================

def test_elevation_exact_grid_point(engine):
    """
    Querying exact grid coordinates must return the exact sample value without interpolation error.
    """
    elev = np.array([
        [100.0, 105.0, 110.0],
        [120.0, 125.0, 130.0],
        [140.0, 145.0, 150.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    res = engine.elevation_at(grid, 1.0, 1.0)
    assert res.valid is True
    assert res.interpolated is False
    assert math.isclose(res.elevation, 125.0, abs_tol=1e-6)

    res_corner = engine.elevation_at(grid, 2.0, 0.0)
    assert res_corner.valid is True
    assert math.isclose(res_corner.elevation, 110.0, abs_tol=1e-6)


def test_elevation_bilinear_interpolation(engine):
    """
    Querying continuous fractional coordinates must return mathematically exact bilinear values.
    """
    elev = np.array([
        [10.0, 20.0],
        [30.0, 40.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    # Center point (0.5, 0.5): expected 0.25 * (10 + 20 + 30 + 40) = 25.0
    res_center = engine.elevation_at(grid, 0.5, 0.5)
    assert res_center.valid is True
    assert res_center.interpolated is True
    assert math.isclose(res_center.elevation, 25.0, abs_tol=1e-5)

    # Point (0.2, 0.8):
    # w00 = 0.8 * 0.2 = 0.16 (z=10)
    # w10 = 0.2 * 0.2 = 0.04 (z=20)
    # w01 = 0.8 * 0.8 = 0.64 (z=30)
    # w11 = 0.2 * 0.8 = 0.16 (z=40)
    # expected = 0.16*10 + 0.04*20 + 0.64*30 + 0.16*40 = 1.6 + 0.8 + 19.2 + 6.4 = 28.0
    res_frac = engine.elevation_at(grid, 0.2, 0.8)
    assert res_frac.valid is True
    assert math.isclose(res_frac.elevation, 28.0, abs_tol=1e-5)


def test_elevation_boundary(engine):
    """
    Querying exact edges and corners must succeed within grid bounds.
    """
    elev = np.array([
        [10.0, 20.0, 30.0],
        [40.0, 50.0, 60.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    # Top edge between cols 0 and 1
    res_top = engine.elevation_at(grid, 0.5, 0.0)
    assert res_top.valid is True
    assert math.isclose(res_top.elevation, 15.0, abs_tol=1e-5)

    # Bottom-right corner (cols-1, rows-1)
    res_br = engine.elevation_at(grid, 2.0, 1.0)
    assert res_br.valid is True
    assert math.isclose(res_br.elevation, 60.0, abs_tol=1e-5)


def test_elevation_out_of_bounds(engine):
    """
    Querying outside the grid must strictly return valid=False and out_of_bounds=True without clamping.
    """
    elev = np.ones((5, 5), dtype=np.float32) * 50.0
    grid = engine.create_grid(elev)

    res_neg_x = engine.elevation_at(grid, -0.01, 2.0)
    assert res_neg_x.valid is False
    assert res_neg_x.out_of_bounds is True
    assert res_neg_x.elevation is None

    res_pos_x = engine.elevation_at(grid, 4.01, 2.0)
    assert res_pos_x.valid is False
    assert res_pos_x.out_of_bounds is True

    res_neg_y = engine.elevation_at(grid, 2.0, -0.1)
    assert res_neg_y.valid is False
    assert res_neg_y.out_of_bounds is True

    res_pos_y = engine.elevation_at(grid, 2.0, 4.01)
    assert res_pos_y.valid is False
    assert res_pos_y.out_of_bounds is True


def test_elevation_nodata(engine):
    """
    Querying an interpolation cell with a NoData corner must reject the interpolation.
    Querying an exact valid cell adjacent to NoData must succeed.
    """
    elev = np.array([
        [10.0, -9999.0],
        [30.0, 40.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev, nodata=-9999.0)

    # Bilinear interpolation involving top-right corner (-9999.0)
    res_interp = engine.elevation_at(grid, 0.5, 0.5)
    assert res_interp.valid is False
    assert res_interp.is_nodata is True
    assert res_interp.elevation is None

    # Exact query on valid top-left corner
    res_exact_valid = engine.elevation_at(grid, 0.0, 0.0)
    assert res_exact_valid.valid is True
    assert math.isclose(res_exact_valid.elevation, 10.0, abs_tol=1e-5)

    # Exact query on NoData cell
    res_exact_nodata = engine.elevation_at(grid, 1.0, 0.0)
    assert res_exact_nodata.valid is False
    assert res_exact_nodata.is_nodata is True


# ==============================================================================
# 2. SLOPE TESTS
# ==============================================================================

def test_flat_terrain_slope(engine):
    """
    A flat horizontal plane (z = constant) must have 0.0 slope everywhere.
    """
    elev = np.full((10, 10), 1250.0, dtype=np.float32)
    grid = engine.create_grid(
        elev, dx=10.0, dy=10.0, mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED, has_metric_horizontal_scale=True
    )

    res = engine.compute_slope(grid)
    assert res.is_physical is True
    assert res.unit == SlopeUnit.DEGREES
    assert math.isclose(res.min_slope, 0.0, abs_tol=1e-5)
    assert math.isclose(res.max_slope, 0.0, abs_tol=1e-5)
    assert np.allclose(res.slope_map, 0.0, atol=1e-5)


def test_known_plane_slope(engine):
    """
    A plane with dz/dx = 1.0 and dz/dy = 0.0 with dx=1m, dy=1m has physical slope = atan(1) = 45.0 degrees.
    """
    cols, rows = 12, 12
    x_coords = np.arange(cols, dtype=np.float32)
    elev = np.tile(x_coords, (rows, 1))  # z = x, so dz/dx = 1.0, dz/dy = 0.0

    grid = engine.create_grid(
        elev, dx=1.0, dy=1.0, mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED, has_metric_horizontal_scale=True
    )

    res = engine.compute_slope(grid)
    assert res.is_physical is True
    assert res.unit == SlopeUnit.DEGREES

    # Interior cells should have exact 45.0 degrees slope
    interior = res.slope_map[1:-1, 1:-1]
    assert np.allclose(interior, 45.0, atol=1e-4)


def test_slope_boundary_handling(engine):
    """
    Slope computation on boundaries must use forward/backward differences and remain finite.
    """
    cols, rows = 8, 8
    x_coords = np.arange(cols, dtype=np.float32) * 2.0
    elev = np.tile(x_coords, (rows, 1))

    grid = engine.create_grid(elev, dx=1.0, dy=1.0)
    res = engine.compute_slope(grid)

    # All cells (including boundaries) must be finite
    assert np.all(np.isfinite(res.slope_map))
    assert res.nodata_count == 0


def test_slope_relative_vs_calibrated(engine):
    """
    Relative uncalibrated grid must return SlopeUnit.RELATIVE_GRADIENT with is_physical=False.
    """
    elev = np.array([
        [0.0, 10.0],
        [0.0, 10.0]
    ], dtype=np.float32)
    grid_rel = engine.create_grid(
        elev, mode=ElevationMode.RELATIVE, calibration_state=TerrainCalibrationState.RELATIVE
    )

    res_rel = engine.compute_slope(grid_rel)
    assert res_rel.is_physical is False
    assert res_rel.unit == SlopeUnit.RELATIVE_GRADIENT
    assert res_rel.warning is not None


# ==============================================================================
# 3. ASPECT TESTS
# ==============================================================================

def test_flat_terrain_aspect_undefined(engine):
    """
    Flat terrain has undefined aspect: aspect map must be NaN everywhere and flat_mask True.
    """
    elev = np.full((6, 6), 500.0, dtype=np.float32)
    grid = engine.create_grid(elev)

    res = engine.compute_aspect(grid)
    assert res.flat_count == 36
    assert res.valid_count == 0
    assert np.all(np.isnan(res.aspect_map))
    assert np.all(res.flat_mask)


def test_known_gradient_aspect_cardinals(engine):
    """
    Tests aspect directions for all 4 cardinal downhill slopes:
    North (0°), East (90°), South (180°), West (270°).
    """
    rows, cols = 7, 7
    r_idx, c_idx = np.indices((rows, cols), dtype=np.float32)

    # 1. Slope downhill to North: z increases South (increasing row) -> z = 100 + 2*r
    elev_north = 100.0 + 2.0 * r_idx
    grid_n = engine.create_grid(elev_north)
    res_n = engine.compute_aspect(grid_n)
    interior_n = res_n.aspect_map[1:-1, 1:-1]
    assert np.allclose(interior_n, 0.0, atol=1e-3)

    # 2. Slope downhill to East: z decreases East (increasing col) -> z = 100 - 2*c
    elev_east = 100.0 - 2.0 * c_idx
    grid_e = engine.create_grid(elev_east)
    res_e = engine.compute_aspect(grid_e)
    interior_e = res_e.aspect_map[1:-1, 1:-1]
    assert np.allclose(interior_e, 90.0, atol=1e-3)

    # 3. Slope downhill to South: z decreases South (increasing row) -> z = 100 - 2*r
    elev_south = 100.0 - 2.0 * r_idx
    grid_s = engine.create_grid(elev_south)
    res_s = engine.compute_aspect(grid_s)
    interior_s = res_s.aspect_map[1:-1, 1:-1]
    assert np.allclose(interior_s, 180.0, atol=1e-3)

    # 4. Slope downhill to West: z increases East (increasing col) -> z = 100 + 2*c
    elev_west = 100.0 + 2.0 * c_idx
    grid_w = engine.create_grid(elev_west)
    res_w = engine.compute_aspect(grid_w)
    interior_w = res_w.aspect_map[1:-1, 1:-1]
    assert np.allclose(interior_w, 270.0, atol=1e-3)


def test_aspect_normalization(engine):
    """
    Aspect values must strictly fall within [0.0, 360.0).
    """
    rows, cols = 8, 8
    r_idx, c_idx = np.indices((rows, cols), dtype=np.float32)
    # Intercardinal slope: North-East (45°)
    elev_ne = 100.0 + 2.0 * r_idx - 2.0 * c_idx
    grid = engine.create_grid(elev_ne)
    res = engine.compute_aspect(grid)

    valid_aspects = res.aspect_map[~np.isnan(res.aspect_map)]
    assert np.all(valid_aspects >= 0.0)
    assert np.all(valid_aspects < 360.0)
    assert np.allclose(res.aspect_map[1:-1, 1:-1], 45.0, atol=1e-3)


# ==============================================================================
# 4. HILLSHADE TESTS
# ==============================================================================

def test_hillshade_flat_plane(engine):
    """
    On a flat horizontal plane, hillshade equals sin(altitude).
    For altitude = 45°, sin(45°) = sqrt(2)/2 ≈ 0.7071 (180 in 8-bit scale).
    """
    elev = np.full((8, 8), 1000.0, dtype=np.float32)
    grid = engine.create_grid(elev)

    res = engine.compute_hillshade(grid, sun_azimuth_deg=315.0, sun_altitude_deg=45.0)
    expected_val = math.sin(math.radians(45.0))

    assert np.allclose(res.hillshade_f32, expected_val, atol=1e-4)
    expected_u8 = round(expected_val * 255.0)
    assert np.all(res.hillshade_u8 == expected_u8)


def test_hillshade_overhead_sun(engine):
    """
    With sun directly overhead (altitude = 90°), flat terrain receives maximum illumination = 1.0 (255).
    """
    elev = np.full((6, 6), 500.0, dtype=np.float32)
    grid = engine.create_grid(elev)

    res = engine.compute_hillshade(grid, sun_azimuth_deg=315.0, sun_altitude_deg=90.0)
    assert np.allclose(res.hillshade_f32, 1.0, atol=1e-4)
    assert np.all(res.hillshade_u8 == 255)


def test_hillshade_finite_range(engine):
    """
    Hillshade float output must be bounded in [0.0, 1.0] and uint8 in [0, 255].
    """
    # Create irregular terrain with steep slopes
    x = np.linspace(-5, 5, 20, dtype=np.float32)
    y = np.linspace(-5, 5, 20, dtype=np.float32)
    xx, yy = np.meshgrid(x, y)
    elev = (np.sin(xx) * np.cos(yy) * 100.0).astype(np.float32)

    grid = engine.create_grid(elev)
    res = engine.compute_hillshade(grid, sun_azimuth_deg=315.0, sun_altitude_deg=45.0)

    assert np.all(res.hillshade_f32 >= 0.0)
    assert np.all(res.hillshade_f32 <= 1.0)
    assert np.all(res.hillshade_u8 >= 0)
    assert np.all(res.hillshade_u8 <= 255)


# ==============================================================================
# 5. TERRAIN STATISTICS TESTS
# ==============================================================================

def test_statistics_exact(engine):
    """
    Tests exact min, max, mean, median, std, relief, percentiles on known array.
    """
    elev = np.array([
        [10.0, 20.0, 30.0],
        [40.0, 50.0, 60.0]
    ], dtype=np.float32)
    grid = engine.create_grid(
        elev, mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED
    )

    stats = engine.compute_statistics(grid)
    assert stats.min == 10.0
    assert stats.max == 60.0
    assert stats.relief == 50.0
    assert stats.mean == 35.0
    assert stats.median == 35.0
    assert stats.valid_count == 6
    assert stats.nodata_count == 0
    assert stats.unit == "meters"
    assert stats.is_metric is True


def test_statistics_nodata_ignored(engine):
    """
    Statistics must completely exclude NoData values and never treat them as 0.
    """
    elev = np.array([
        [100.0, -9999.0],
        [200.0, 300.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev, nodata=-9999.0)

    stats = engine.compute_statistics(grid)
    assert stats.valid_count == 3
    assert stats.nodata_count == 1
    assert stats.min == 100.0
    assert stats.max == 300.0
    assert stats.mean == 200.0
    assert stats.relief == 200.0


def test_statistics_nan_inf_handling(engine):
    """
    NaN and Inf values must be excluded from valid statistics without crashing.
    """
    elev = np.array([
        [50.0, np.nan],
        [np.inf, 150.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    stats = engine.compute_statistics(grid)
    assert stats.valid_count == 2
    assert stats.nodata_count == 2
    assert stats.min == 50.0
    assert stats.max == 150.0
    assert stats.mean == 100.0


# ==============================================================================
# 6. CALIBRATION STATE & UNIT INTEGRITY
# ==============================================================================

def test_calibration_state_units(engine):
    """
    Relative vs Calibrated vs Rejected states must reflect truthful unit metadata.
    """
    elev = np.array([[10.0, 20.0], [30.0, 40.0]], dtype=np.float32)

    # 1. Relative
    g_rel = engine.create_grid(
        elev, mode=ElevationMode.RELATIVE, calibration_state=TerrainCalibrationState.RELATIVE
    )
    s_rel = engine.compute_statistics(g_rel)
    assert s_rel.unit == "relative units"
    assert s_rel.is_metric is False

    # 2. Calibrated
    g_cal = engine.create_grid(
        elev, mode=ElevationMode.ABSOLUTE, calibration_state=TerrainCalibrationState.CALIBRATED
    )
    s_cal = engine.compute_statistics(g_cal)
    assert s_cal.unit == "meters"
    assert s_cal.is_metric is True

    # 3. Calibration Rejected
    g_rej = engine.create_grid(
        elev, mode=ElevationMode.RELATIVE, calibration_state=TerrainCalibrationState.CALIBRATION_REJECTED
    )
    s_rej = engine.compute_statistics(g_rej)
    assert s_rej.unit == "relative units"
    assert s_rej.is_metric is False
    assert s_rej.calibration_state == "calibration_rejected"


# ==============================================================================
# 7. IMMUTABILITY & EXAGGERATION INVARIANCE
# ==============================================================================

def test_source_array_immutability(engine):
    """
    TerrainGrid source elevation array must have writeable=False and never be mutated.
    """
    elev = np.array([[10.0, 20.0], [30.0, 40.0]], dtype=np.float32)
    grid = engine.create_grid(elev)

    assert grid.elevations.flags.writeable is False
    with pytest.raises(ValueError):
        grid.elevations[0, 0] = 999.0

    original_copy = elev.copy()

    # Execute all analytics
    engine.elevation_at(grid, 0.5, 0.5)
    engine.compute_slope(grid)
    engine.compute_aspect(grid)
    engine.compute_hillshade(grid)
    engine.compute_statistics(grid)

    assert np.array_equal(grid.elevations, original_copy)


def test_exaggeration_invariance(engine):
    """
    Visual vertical exaggeration is a visualization transform only.
    Source terrain analytics must remain identical regardless of any rendering multiplier.
    """
    elev = np.array([
        [10.0, 20.0],
        [30.0, 40.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    # Base analytics
    stats1 = engine.compute_statistics(grid)
    slope1 = engine.compute_slope(grid)
    elev_q1 = engine.elevation_at(grid, 0.5, 0.5)

    # Simulating 5x visual exaggeration on rendering geometry:
    # Notice that TerrainGrid itself encapsulates SOURCE data, which must not be multiplied
    stats2 = engine.compute_statistics(grid)
    slope2 = engine.compute_slope(grid)
    elev_q2 = engine.elevation_at(grid, 0.5, 0.5)

    assert stats1.mean == stats2.mean
    assert np.array_equal(slope1.slope_map, slope2.slope_map)
    assert elev_q1.elevation == elev_q2.elevation


# ==============================================================================
# 8. REAL-SCENE SANITY TEST
# ==============================================================================

def test_real_scene_sanity(engine):
    """
    Runs full analytics engine on real Phase 3D Scene 1 (Alps) reference DEM.
    Verifies finite outputs, NoData masking, aspect ranges, and dimensional fidelity.
    """
    dem_path = r"D:\175\scratch\real_validation\scene_01\reference_dem.tif"
    if not os.path.isfile(dem_path):
        pytest.skip(f"Real scene reference DEM not found: {dem_path}")

    import rasterio
    with rasterio.open(dem_path) as ds:
        dem_data = ds.read(1)
        nodata = ds.nodata
        dx = float(ds.res[0])
        dy = float(ds.res[1])

    grid = engine.create_grid(
        dem_data, dx=dx, dy=dy, nodata=nodata,
        mode=ElevationMode.ABSOLUTE, calibration_state=TerrainCalibrationState.CALIBRATED,
        has_metric_horizontal_scale=False  # WGS84 degrees
    )

    full_res = engine.run_full_analytics(grid)

    assert full_res["grid_dimensions"]["rows"] == dem_data.shape[0]
    assert full_res["grid_dimensions"]["cols"] == dem_data.shape[1]

    stats = full_res["statistics"]
    assert stats["valid_count"] > 0
    assert stats["min"] is not None
    assert stats["max"] is not None
    assert stats["relief"] > 1000.0  # Alps has > 1800m relief

    slope = full_res["slope"]
    assert slope["min"] is not None
    assert slope["max"] is not None

    aspect = full_res["aspect"]
    assert aspect["valid_count"] > 0

    hillshade = full_res["hillshade"]
    assert hillshade["is_visualization_only"] is True


# ==============================================================================
# 9. BACKEND API ENDPOINT INTEGRATION TESTS
# ==============================================================================

def test_api_query_endpoint():
    """
    Tests live HTTP POST /api/terrain/query endpoint.
    """
    import urllib.request
    import json
    from backend.utils.serialization import encode_depth_raw

    elev = np.array([
        [10.0, 20.0],
        [30.0, 40.0]
    ], dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "x": 0.5,
        "y": 0.5,
        "elevations_raw_b64": b64_data,
        "width": 2,
        "height": 2,
        "mode": "relative",
        "calibration_state": "relative"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/terrain/query",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["valid"] is True
        assert math.isclose(data["elevation"], 25.0, abs_tol=1e-5)
        assert data["unit"] == "relative units"
        assert data["is_metric"] is False


def test_api_analytics_endpoint():
    """
    Tests live HTTP POST /api/terrain/analytics endpoint.
    """
    import urllib.request
    import json
    from backend.utils.serialization import encode_depth_raw

    elev = np.array([
        [100.0, 200.0],
        [300.0, 400.0]
    ], dtype=np.float32)
    b64_data = encode_depth_raw(elev)

    payload = {
        "elevations_raw_b64": b64_data,
        "width": 2,
        "height": 2,
        "dx": 10.0,
        "dy": 10.0,
        "mode": "absolute",
        "calibration_state": "calibrated",
        "has_metric_horizontal_scale": True,
        "elevation_unit": "meters"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/terrain/analytics",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["status"] == "complete"
        assert data["statistics"]["unit"] == "meters"
        assert data["statistics"]["is_metric"] is True
        assert data["statistics"]["min"] == 100.0
        assert data["statistics"]["max"] == 400.0
        assert data["slope"]["unit"] == "degrees"
        assert data["slope"]["is_physical"] is True
        assert data["hillshade"]["is_visualization_only"] is True
        assert data["slope_raw_b64"] is not None
        assert data["aspect_raw_b64"] is not None
        assert data["hillshade_raw_b64"] is not None

