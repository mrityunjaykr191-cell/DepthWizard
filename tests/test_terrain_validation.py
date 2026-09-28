"""
DepthWizard — Phase 5A Validation & Error Analysis Test Suite
Authority: Phase 5A Specification (Sections 5A.2 - 5A.11)

Tests:
1. Perfect prediction (MAE=0, RMSE=0, Bias=0, r=1.0)
2. Constant positive bias (+5.0 m)
3. Constant negative bias (-5.0 m)
4. Known RMSE/MAE on synthetic test arrays
5. NoData and NaN masking
6. Grid shape mismatch handling
7. Reference-fit vs independent-validation distinction
8. Spatial block holdout cross-validation (West -> East)
9. RELATIVE state metric validation rejection
10. CALIBRATED state validation
11. CALIBRATION_REJECTED state handling
12. CALIBRATION_UNAVAILABLE state handling
13. Error map generation & signed divergence statistics
14. Error map NoData propagation
15. FastAPI endpoint integration (POST /api/terrain/validation)
"""

import math
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.terrain.contracts import (
    TerrainGrid,
    TerrainCalibrationState,
    ElevationMode
)
from backend.terrain.validation import (
    ValidationStatus,
    compute_error_metrics,
    compute_error_map,
    perform_spatial_holdout_validation,
    evaluate_terrain_validation
)
from backend.utils.serialization import encode_depth_raw


@pytest.fixture
def test_client():
    return TestClient(app)


# 1. Perfect prediction
def test_perfect_prediction_metrics():
    ref = np.array([100.0, 110.0, 120.0, 130.0, 140.0], dtype=np.float32)
    pred = ref.copy()

    metrics = compute_error_metrics(pred, ref)
    assert metrics is not None
    assert metrics.sample_count == 5
    assert metrics.mae == 0.0
    assert metrics.rmse == 0.0
    assert metrics.bias == 0.0
    assert metrics.min_error == 0.0
    assert metrics.max_error == 0.0
    assert metrics.median_absolute_error == 0.0
    assert metrics.pearson_r == 1.0
    assert metrics.spearman_r == 1.0


# 2. Constant positive bias
def test_constant_positive_bias_metrics():
    ref = np.array([100.0, 105.0, 110.0, 115.0, 120.0], dtype=np.float32)
    pred = ref + 5.0

    metrics = compute_error_metrics(pred, ref)
    assert metrics is not None
    assert metrics.sample_count == 5
    assert metrics.mae == 5.0
    assert metrics.rmse == 5.0
    assert metrics.bias == 5.0
    assert metrics.min_error == 5.0
    assert metrics.max_error == 5.0
    assert metrics.median_absolute_error == 5.0
    assert metrics.pearson_r == 1.0


# 3. Constant negative bias
def test_constant_negative_bias_metrics():
    ref = np.array([100.0, 105.0, 110.0, 115.0, 120.0], dtype=np.float32)
    pred = ref - 3.5

    metrics = compute_error_metrics(pred, ref)
    assert metrics is not None
    assert metrics.sample_count == 5
    assert metrics.mae == 3.5
    assert metrics.rmse == 3.5
    assert metrics.bias == -3.5
    assert metrics.min_error == -3.5
    assert metrics.max_error == -3.5
    assert metrics.median_absolute_error == 3.5
    assert metrics.pearson_r == 1.0


# 4. Known RMSE / MAE on synthetic test arrays
def test_known_rmse_mae_calculation():
    ref = np.array([10.0, 20.0, 30.0, 40.0], dtype=np.float32)
    # Errors: +2.0, -2.0, +4.0, -4.0
    # Abs errors: 2.0, 2.0, 4.0, 4.0 -> MAE = 3.0
    # Squared errors: 4, 4, 16, 16 -> Mean = 10.0 -> RMSE = sqrt(10) ≈ 3.162
    # Bias = (2 - 2 + 4 - 4) / 4 = 0.0
    pred = np.array([12.0, 18.0, 34.0, 36.0], dtype=np.float32)

    metrics = compute_error_metrics(pred, ref)
    assert metrics is not None
    assert metrics.mae == 3.0
    assert abs(metrics.rmse - math.sqrt(10.0)) < 0.005
    assert metrics.bias == 0.0
    assert metrics.min_error == -4.0
    assert metrics.max_error == 4.0


# 5. NoData and NaN masking
def test_nodata_and_nan_masking():
    ref = np.array([10.0, np.nan, 30.0, 40.0, -9999.0], dtype=np.float32)
    pred = np.array([12.0, 20.0, np.nan, 42.0, 50.0], dtype=np.float32)
    valid_mask = (ref != -9999.0)

    metrics = compute_error_metrics(pred, ref, valid_mask=valid_mask)
    assert metrics is not None
    # Valid indices: index 0 (12 vs 10) and index 3 (42 vs 40)
    assert metrics.sample_count == 2
    assert metrics.mae == 2.0
    assert metrics.rmse == 2.0
    assert metrics.bias == 2.0


# 6. Grid shape mismatch handling
def test_error_map_shape_mismatch():
    pred = np.zeros((10, 10), dtype=np.float32)
    ref = np.zeros((12, 10), dtype=np.float32)

    with pytest.raises(ValueError, match="Shape mismatch"):
        compute_error_map(pred, ref)


# 7. Reference-fit vs independent-validation distinction
def test_reference_fit_vs_independent_validation_distinction():
    # Construct synthetic calibrated terrain grid
    elev = np.ones((20, 20), dtype=np.float32) * 50.0
    grid = TerrainGrid(
        elevations=elev,
        rows=20,
        cols=20,
        dx=1.0,
        dy=1.0,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        elevation_unit="meters"
    )

    # A: Case without relative heightfield -> REFERENCE_FIT (NOT independent)
    res_fit = evaluate_terrain_validation(
        grid=grid,
        reference_elevations=elev + 1.0,
        relative_heightfield=None,
        perform_holdout=False
    )
    assert res_fit.status == ValidationStatus.REFERENCE_FIT
    assert res_fit.is_independent is False
    assert "not independent" in res_fit.status_label.lower()
    assert res_fit.holdout_metrics is None
    assert any("not independent" in lim.lower() for lim in res_fit.limitations)


# 8. Spatial block holdout cross-validation
def test_spatial_block_holdout_validation():
    rows, cols = 30, 30
    ys, xs = np.indices((rows, cols))

    # True terrain plane
    E_true = (100.0 + 2.0 * xs + 1.5 * ys).astype(np.float32)

    # Relative heightfield: 0..100 with scale = 0.5, offset = 100.0
    # E = a * H + b -> 0.5 * H + 100.0 = E_true -> H = (E_true - 100) / 0.5
    H_rel = ((E_true - 100.0) / 0.5).astype(np.float32)

    # Add small noise to right half (holdout) to test generalization gap
    E_ref_noisy = E_true.copy()
    E_ref_noisy[:, 15:] += 2.0  # +2m offset on East half

    train_m, holdout_m, split_info, holdout_err = perform_spatial_holdout_validation(
        relative_heights=H_rel,
        reference_elevations=E_ref_noisy,
        valid_mask=np.ones((rows, cols), dtype=bool),
        split_axis="horizontal",
        min_samples_per_partition=15
    )

    assert train_m.sample_count == rows * 15
    assert holdout_m.sample_count == rows * 15
    assert split_info.split_name == "Spatial Block (West Fit -> East Holdout)"
    assert split_info.train_sample_count == 450
    assert split_info.holdout_sample_count == 450
    # Training fit has near-zero error; holdout has ~2m error
    assert train_m.mae < 0.1
    assert abs(holdout_m.mae - 2.0) < 0.1
    assert split_info.generalization_gap_rmse > 1.5


# 9. RELATIVE state metric validation rejection
def test_relative_state_rejects_metric_validation():
    grid = TerrainGrid(
        elevations=np.full((10, 10), 42.0, dtype=np.float32),
        rows=10,
        cols=10,
        dx=1.0,
        dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE,
        elevation_unit="relative units"
    )

    res = evaluate_terrain_validation(grid=grid)
    assert res.status == ValidationStatus.VALIDATION_NOT_AVAILABLE
    assert res.is_independent is False
    assert res.overall_metrics is None
    assert res.error_map is None
    assert any("model-relative" in lim.lower() for lim in res.limitations)


# 10. CALIBRATION_REJECTED state handling
def test_calibration_rejected_state_handling():
    grid = TerrainGrid(
        elevations=np.full((10, 10), 42.0, dtype=np.float32),
        rows=10,
        cols=10,
        dx=1.0,
        dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.CALIBRATION_REJECTED,
        elevation_unit="relative units"
    )

    res = evaluate_terrain_validation(
        grid=grid,
        rejection_reason="Inverted vertical scale factor contradicted reference trend."
    )
    assert res.status == ValidationStatus.VALIDATION_NOT_AVAILABLE
    assert res.is_independent is False
    assert res.rejection_reason == "Inverted vertical scale factor contradicted reference trend."
    assert res.overall_metrics is None
    assert res.error_map is None


# 11. CALIBRATION_UNAVAILABLE state handling
def test_calibration_unavailable_state_handling():
    grid = TerrainGrid(
        elevations=np.full((10, 10), 42.0, dtype=np.float32),
        rows=10,
        cols=10,
        dx=1.0,
        dy=1.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.UNAVAILABLE,
        elevation_unit="relative units"
    )

    res = evaluate_terrain_validation(grid=grid)
    assert res.status == ValidationStatus.VALIDATION_NOT_AVAILABLE
    assert res.is_independent is False
    assert any("lacks geospatial reference" in lim.lower() for lim in res.limitations)


# 12. Error map generation & signed divergence statistics
def test_error_map_generation_and_divergence():
    rows, cols = 4, 4
    ref = np.array([
        [10.0, 10.0, 10.0, 10.0],
        [20.0, 20.0, 20.0, 20.0],
        [30.0, 30.0, 30.0, 30.0],
        [40.0, 40.0, 40.0, 40.0]
    ], dtype=np.float32)

    # Predicted has varying signed errors: -2 on row 0, 0 on row 1, +2 on row 2, +4 on row 3
    pred = np.array([
        [8.0, 8.0, 8.0, 8.0],
        [20.0, 20.0, 20.0, 20.0],
        [32.0, 32.0, 32.0, 32.0],
        [44.0, 44.0, 44.0, 44.0]
    ], dtype=np.float32)

    err_map, e_min, e_max, e_mean, e_std = compute_error_map(pred, ref)
    assert err_map.shape == (4, 4)
    assert e_min == -2.0
    assert e_max == 4.0
    # Mean = (-2 + 0 + 2 + 4) / 4 = 1.0
    assert e_mean == 1.0
    assert err_map[0, 0] == -2.0
    assert err_map[1, 1] == 0.0
    assert err_map[2, 2] == 2.0
    assert err_map[3, 3] == 4.0


# 13. Error map NoData propagation
def test_error_map_nodata_propagation():
    ref = np.array([[10.0, -9999.0], [20.0, 25.0]], dtype=np.float32)
    pred = np.array([[12.0, 15.0], [np.nan, 23.0]], dtype=np.float32)

    err_map, e_min, e_max, e_mean, _ = compute_error_map(pred, ref, nodata=-9999.0)
    # [0, 0]: 12 - 10 = +2.0
    assert err_map[0, 0] == 2.0
    # [0, 1]: reference is NoData -> must be NaN
    assert np.isnan(err_map[0, 1])
    # [1, 0]: predicted is NaN -> must be NaN
    assert np.isnan(err_map[1, 0])
    # [1, 1]: 23 - 25 = -2.0
    assert err_map[1, 1] == -2.0
    assert e_min == -2.0
    assert e_max == 2.0
    assert e_mean == 0.0


# 14. API endpoint: POST /api/terrain/validation for RELATIVE
def test_api_validation_relative(test_client):
    req_body = {
        "width": 10,
        "height": 10,
        "mode": "relative",
        "calibration_state": "relative",
        "elevation_unit": "relative units"
    }
    resp = test_client.post("/api/terrain/validation", json=req_body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "VALIDATION_NOT_AVAILABLE"
    assert data["is_independent"] is False
    assert data["overall_metrics"] is None
    assert len(data["limitations"]) > 0


# 15. API endpoint: POST /api/terrain/validation with CALIBRATED independent holdout
def test_api_validation_calibrated_independent(test_client):
    rows, cols = 20, 20
    ys, xs = np.indices((rows, cols))
    E_ref = (100.0 + 1.0 * xs + 2.0 * ys).astype(np.float32)
    H_rel = ((E_ref - 100.0) / 0.5).astype(np.float32)
    E_pred = (0.5 * H_rel + 100.0).astype(np.float32)

    req_body = {
        "elevations_raw_b64": encode_depth_raw(E_pred),
        "reference_elevations_raw_b64": encode_depth_raw(E_ref),
        "relative_heightfield_raw_b64": encode_depth_raw(H_rel),
        "width": cols,
        "height": rows,
        "mode": "absolute",
        "calibration_state": "calibrated",
        "elevation_unit": "meters",
        "reference_source": "Copernicus GLO-30 DEM",
        "perform_holdout": True
    }

    resp = test_client.post("/api/terrain/validation", json=req_body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "INDEPENDENT_VALIDATION"
    assert data["is_independent"] is True
    assert data["reference_source"] == "Copernicus GLO-30 DEM"
    assert data["overall_metrics"] is not None
    assert data["overall_metrics"]["mae"] < 0.1
    assert data["holdout_metrics"] is not None
    assert data["spatial_split"] is not None
    assert data["error_map_raw_b64"] is not None
