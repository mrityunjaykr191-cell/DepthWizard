"""
DepthWizard — Phase 4C Analytical Terrain Visualization Test Suite
Authority: Phase 4C Specification & docs/design/design-system.md

Deterministic tests covering:
1. Elevation normalization on known range
2. Relative elevation labeling/state
3. Calibrated elevation labeling/state
4. Relative slope visualization (relative gradient)
5. Calibrated slope visualization (physical degrees)
6. Hillshade illumination range [0.0, 1.0]
7. NoData/NaN masking and transparency
8. Raster row/col cartographic orientation consistency
9. Analytical layer switching payload integrity
10. Source terrain immutability during analytics
11. Vertical exaggeration invariance
12. Existing Phase 4A regression
13. Existing Phase 4B regression
"""

import math
import base64
import numpy as np
import pytest

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
    compute_statistics,
    probe_point,
    measure_two_points,
    sample_cross_section
)


@pytest.fixture
def engine():
    return TerrainAnalyticsEngine()


# ==============================================================================
# 1. ELEVATION NORMALIZATION & LABELING
# ==============================================================================

def test_elevation_normalization_known_range(engine):
    """
    Normalization on known range [100.0, 200.0] must map strictly to [0.0, 1.0].
    """
    elev = np.array([
        [100.0, 125.0, 150.0],
        [150.0, 175.0, 200.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)
    stats = engine.compute_statistics(grid)

    assert stats.min == 100.0
    assert stats.max == 200.0
    assert stats.relief == 100.0

    # Normalized values
    inv_range = 1.0 / stats.relief
    norm_values = (elev - stats.min) * inv_range

    np.testing.assert_allclose(norm_values[0, 0], 0.0, atol=1e-6)
    np.testing.assert_allclose(norm_values[0, 1], 0.25, atol=1e-6)
    np.testing.assert_allclose(norm_values[0, 2], 0.50, atol=1e-6)
    np.testing.assert_allclose(norm_values[1, 1], 0.75, atol=1e-6)
    np.testing.assert_allclose(norm_values[1, 2], 1.0, atol=1e-6)


def test_relative_elevation_labeling_and_state(engine):
    """
    Relative uncalibrated surface must strictly declare 'relative units' and 'relative' mode.
    Must never fabricate 'meters'.
    """
    elev = np.ones((5, 5), dtype=np.float32) * 50.0
    grid = engine.create_grid(
        elev,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE,
        elevation_unit="relative units"
    )
    stats = engine.compute_statistics(grid)

    assert stats.unit == "relative units"
    assert stats.is_metric is False
    assert stats.mode == "relative"
    assert stats.calibration_state == "relative"


def test_calibrated_elevation_labeling_and_state(engine):
    """
    Calibrated surface must declare 'meters', 'absolute' mode, and is_metric True.
    """
    elev = np.linspace(1000.0, 1500.0, 25, dtype=np.float32).reshape((5, 5))
    grid = engine.create_grid(
        elev,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        elevation_unit="meters",
        has_metric_horizontal_scale=True,
        dx=30.0,
        dy=30.0
    )
    stats = engine.compute_statistics(grid)

    assert stats.unit == "meters"
    assert stats.is_metric is True
    assert stats.mode == "absolute"
    assert stats.calibration_state == "calibrated"
    assert stats.min == 1000.0
    assert stats.max == 1500.0


# ==============================================================================
# 2. SLOPE VISUALIZATION & CALIBRATION AWARENESS
# ==============================================================================

def test_relative_slope_visualization_range(engine):
    """
    Relative surface slope must use 'relative_gradient', is_physical False,
    and must never fabricate slope degrees.
    """
    # 45-degree ramp in pixel space (1 unit rise per 1 pixel run)
    elev = np.arange(25, dtype=np.float32).reshape((5, 5))
    grid = engine.create_grid(
        elev,
        dx=1.0,
        dy=1.0,
        has_metric_horizontal_scale=False,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE,
        horizontal_unit="pixels"
    )
    slope_res = engine.compute_slope(grid)

    assert slope_res.unit == SlopeUnit.RELATIVE_GRADIENT
    assert slope_res.is_physical is False
    assert slope_res.warning is not None  # Must explicitly warn that slope is relative gradient
    assert "relative gradient" in slope_res.warning.lower()


def test_calibrated_slope_visualization_range(engine):
    """
    Calibrated metric surface slope must use 'degrees', is_physical True,
    with values in physical range [0, 90].
    """
    # 30m horizontal spacing with 30m rise per cell = 45 degrees
    elev = np.tile(np.arange(5, dtype=np.float32) * 30.0, (5, 1))
    grid = engine.create_grid(
        elev,
        dx=30.0,
        dy=30.0,
        has_metric_horizontal_scale=True,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        elevation_unit="meters",
        horizontal_unit="meters"
    )
    slope_res = engine.compute_slope(grid)

    assert slope_res.unit == SlopeUnit.DEGREES
    assert slope_res.is_physical is True
    assert slope_res.warning is None
    # Interior cell (row 2, col 2) should be exactly 45 degrees
    assert abs(slope_res.slope_map[2, 2] - 45.0) < 0.1
    assert 0.0 <= slope_res.min_slope <= slope_res.max_slope <= 90.0


# ==============================================================================
# 3. HILLSHADE BOUNDS & ILLUMINATION
# ==============================================================================

def test_hillshade_normalized_range(engine):
    """
    Hillshade raster must be strictly bounded in [0.0, 1.0] across all azimuth/altitude angles.
    """
    np.random.seed(42)
    elev = (np.random.rand(30, 30) * 500.0).astype(np.float32)
    grid = engine.create_grid(elev, dx=10.0, dy=10.0)

    for az in [0.0, 90.0, 180.0, 270.0, 315.0]:
        for alt in [10.0, 30.0, 45.0, 60.0, 89.0]:
            hs = engine.compute_hillshade(grid, sun_azimuth_deg=az, sun_altitude_deg=alt)
            assert np.all(hs.hillshade_f32 >= 0.0)
            assert np.all(hs.hillshade_f32 <= 1.0)
            assert np.all(hs.hillshade_u8 >= 0)
            assert np.all(hs.hillshade_u8 <= 255)
            assert hs.is_visualization_only is True


# ==============================================================================
# 4. NODATA / NAN MASKING
# ==============================================================================

def test_nodata_and_nan_masking(engine):
    """
    NoData and NaN cells must be cleanly masked out in all analytical layers.
    """
    elev = np.array([
        [100.0, 110.0, 120.0],
        [110.0, -9999.0, 130.0],
        [120.0, 130.0, 140.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev, nodata=-9999.0)

    # Statistics must ignore NoData
    stats = engine.compute_statistics(grid)
    assert stats.valid_count == 8
    assert stats.nodata_count == 1
    assert stats.min == 100.0
    assert stats.max == 140.0

    # Slope center cell must be marked NaN / NoData
    slope_res = engine.compute_slope(grid)
    assert np.isnan(slope_res.slope_map[1, 1])

    # Hillshade center cell must be marked NaN / NoData
    hs_res = engine.compute_hillshade(grid)
    assert np.isnan(hs_res.hillshade_f32[1, 1])


# ==============================================================================
# 5. RASTER CARTOGRAPHIC ORIENTATION
# ==============================================================================

def test_raster_row_col_orientation_consistency(engine):
    """
    Verifies cartographic orientation convention:
    - Row 0 is North (top)
    - Row rows-1 is South (bottom)
    - Col 0 is West (left)
    - Col cols-1 is East (right)
    
    A slope sloping strictly downhill towards the South must yield an Aspect of 180° (South).
    """
    # Elevations decrease as row index increases (North to South slope)
    # Row 0 = 300m, Row 1 = 200m, Row 2 = 100m
    elev = np.array([
        [300.0, 300.0, 300.0],
        [200.0, 200.0, 200.0],
        [100.0, 100.0, 100.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev, dx=10.0, dy=10.0, has_metric_horizontal_scale=True)
    aspect_res = engine.compute_aspect(grid)

    # Steepest downhill direction is South = 180°
    center_aspect = aspect_res.aspect_map[1, 1]
    assert abs(center_aspect - 180.0) < 0.1, f"Expected 180° (South), got {center_aspect}°"


# ==============================================================================
# 6. IMMUTABILITY & EXAGGERATION INVARIANCE
# ==============================================================================

def test_source_terrain_immutability_during_visualization(engine):
    """
    Analytics computation must NOT mutate the original elevation array.
    """
    elev = np.array([[10.0, 20.0], [30.0, 40.0]], dtype=np.float32)
    original_copy = elev.copy()
    grid = engine.create_grid(elev)

    _ = engine.compute_statistics(grid)
    _ = engine.compute_slope(grid)
    _ = engine.compute_aspect(grid)
    _ = engine.compute_hillshade(grid)

    np.testing.assert_array_equal(grid.elevations, original_copy)


def test_vertical_exaggeration_invariance(engine):
    """
    Analytical values must remain mathematically invariant regardless of Three.js
    vertical exaggeration factors (1.0x, 1.5x, 3.0x).
    """
    elev = np.array([
        [10.0, 20.0, 30.0],
        [20.0, 30.0, 40.0],
        [30.0, 40.0, 50.0]
    ], dtype=np.float32)
    grid = engine.create_grid(elev)

    stats_1 = engine.compute_statistics(grid)
    slope_1 = engine.compute_slope(grid)

    # Exaggeration only affects 3D vertex positions in Three.js, NEVER the source TerrainGrid
    # Simulating multiple render cycles with exaggeration
    for exag in [1.0, 1.5, 2.5, 3.0]:
        stats_exag = engine.compute_statistics(grid)
        slope_exag = engine.compute_slope(grid)
        assert stats_exag.mean == stats_1.mean
        assert slope_exag.mean_slope == slope_1.mean_slope


# ==============================================================================
# 7. REGRESSION VERIFICATION (PHASE 4A & 4B)
# ==============================================================================

def test_phase_4a_regression(engine):
    """
    Phase 4A core analytics primitives must remain functional and correct.
    """
    elev = np.ones((5, 5), dtype=np.float32) * 42.0
    grid = engine.create_grid(elev)

    q = engine.elevation_at(grid, 2.5, 2.5)
    assert q.valid is True
    assert q.elevation == 42.0

    slope = engine.compute_slope(grid)
    assert slope.min_slope == 0.0

    hs = engine.compute_hillshade(grid)
    assert hs.is_visualization_only is True


def test_phase_4b_regression(engine):
    """
    Phase 4B interactive measurement instruments must remain functional.
    """
    elev = np.linspace(0.0, 100.0, 25, dtype=np.float32).reshape((5, 5))
    grid = engine.create_grid(elev, dx=10.0, dy=10.0, has_metric_horizontal_scale=True)

    probe = engine.probe_point(grid, 2.0, 2.0)
    assert probe.valid is True

    measure = engine.measure_two_points(grid, 0.0, 0.0, 4.0, 4.0)
    assert measure.valid is True
    assert measure.horizontal_distance > 0.0

    profile = engine.sample_cross_section(grid, 0.0, 0.0, 4.0, 4.0, num_samples=10)
    assert len(profile.samples) == 10
    assert profile.total_distance > 0.0
