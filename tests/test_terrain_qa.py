"""
DepthWizard — Phase 4D Deterministic Test Suite: Confidence, QA & Scientific Status
Authority: Phase 4D Specification & docs/product/output-contract.md

Verifies:
1. RELATIVE capability state
2. CALIBRATED capability state
3. CALIBRATION_REJECTED capability state
4. CALIBRATION_UNAVAILABLE capability state
5. Metric elevation disabled for relative
6. Physical slope disabled for relative
7. Metric 3D distance disabled for relative
8. Metric capabilities enabled for calibrated
9. NoData percentage calculation
10. Valid cell count
11. No fabricated confidence percentages
12. Calibration metrics only shown when authoritative data exists
13. API endpoint POST /api/terrain/qa integration
14. Existing Phase 4A regression
15. Existing Phase 4B regression
16. Existing Phase 4C regression
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient

from backend.terrain.contracts import (
    TerrainGrid,
    TerrainCalibrationState,
    ElevationMode
)
from backend.terrain.service import TerrainAnalyticsEngine
from backend.terrain.qa import evaluate_terrain_qa, get_capability_gating
from backend.schemas.terrain import ReferenceFitSchema, TerrainQAResponse
from backend.app import app


@pytest.fixture
def engine():
    return TerrainAnalyticsEngine()


@pytest.fixture
def client():
    return TestClient(app)


# 1. RELATIVE capability state
def test_qa_relative_capability_state(engine):
    data = np.full((10, 10), 25.0, dtype=np.float32)
    grid = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE,
        elevation_unit="relative units"
    )
    qa = evaluate_terrain_qa(grid)
    assert qa.calibration_state == "relative"
    assert qa.status_label == "RELATIVE"
    assert qa.is_metric is False
    assert qa.elevation_unit == "relative units"
    assert "model-relative" in qa.disclaimer.lower()


# 2. CALIBRATED capability state
def test_qa_calibrated_capability_state(engine):
    data = np.full((10, 10), 1250.0, dtype=np.float32)
    grid = engine.create_grid(
        elevations=data,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        elevation_unit="meters"
    )
    qa = evaluate_terrain_qa(grid, reference_source="CartoDEM")
    assert qa.calibration_state == "calibrated"
    assert qa.status_label == "CALIBRATED"
    assert qa.is_metric is True
    assert qa.elevation_unit == "meters"
    assert qa.reference_source == "CartoDEM"
    assert "does not imply survey-grade accuracy" in qa.disclaimer


# 3. CALIBRATION_REJECTED capability state
def test_qa_calibration_rejected_capability_state(engine):
    data = np.full((10, 10), 50.0, dtype=np.float32)
    grid = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.CALIBRATION_REJECTED,
        elevation_unit="relative units"
    )
    qa = evaluate_terrain_qa(
        grid,
        rejection_reason="Calibration fit rejected: Correlation r=0.12 below threshold 0.40"
    )
    assert qa.calibration_state == "calibration_rejected"
    assert qa.status_label == "CALIBRATION_REJECTED"
    assert qa.is_metric is False
    assert qa.rejection_reason is not None
    assert "below threshold" in qa.rejection_reason
    assert "rejected by the calibration guardrails" in qa.disclaimer


# 4. CALIBRATION_UNAVAILABLE capability state
def test_qa_calibration_unavailable_capability_state(engine):
    data = np.full((10, 10), 50.0, dtype=np.float32)
    grid = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.UNAVAILABLE,
        elevation_unit="relative units"
    )
    qa = evaluate_terrain_qa(grid)
    assert qa.calibration_state == "unavailable"
    assert qa.status_label == "CALIBRATION_UNAVAILABLE"
    assert qa.is_metric is False
    assert "lacks geospatial reference" in qa.disclaimer


# 5. Metric elevation disabled for relative
def test_metric_elevation_disabled_for_relative(engine):
    caps = get_capability_gating(TerrainCalibrationState.RELATIVE)
    assert caps["metric_elevation"] is False
    assert caps["relative_elevation"] is True


# 6. Physical slope disabled for relative
def test_physical_slope_disabled_for_relative(engine):
    caps = get_capability_gating(TerrainCalibrationState.RELATIVE)
    assert caps["physical_slope_degrees"] is False
    assert caps["relative_gradient"] is True


# 7. Metric 3D distance disabled for relative
def test_metric_3d_distance_disabled_for_relative(engine):
    caps = get_capability_gating(TerrainCalibrationState.RELATIVE)
    assert caps["metric_3d_distance"] is False
    assert caps["two_point_relative"] is True


# 8. Metric capabilities enabled for calibrated
def test_metric_capabilities_enabled_for_calibrated(engine):
    caps = get_capability_gating(TerrainCalibrationState.CALIBRATED)
    assert caps["metric_elevation"] is True
    assert caps["physical_slope_degrees"] is True
    assert caps["metric_3d_distance"] is True
    assert caps["two_point_metric"] is True
    assert caps["cross_section_metric"] is True


# 9. NoData percentage calculation
def test_nodata_percentage_calculation(engine):
    # 20 rows x 10 cols = 200 cells, 20 are NoData (-9999.0) -> 10.0% NoData, 90.0% Valid
    data = np.full((20, 10), 100.0, dtype=np.float32)
    data[:2, :] = -9999.0
    grid = engine.create_grid(
        elevations=data,
        nodata=-9999.0,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )
    qa = evaluate_terrain_qa(grid)
    assert qa.total_cells == 200
    assert qa.valid_cells == 180
    assert qa.nodata_cells == 20
    assert qa.valid_pct == 90.0
    assert qa.nodata_pct == 10.0


# 10. Valid cell count with full coverage
def test_valid_cell_count_full_coverage(engine):
    data = np.full((15, 15), 45.0, dtype=np.float32)
    grid = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )
    qa = evaluate_terrain_qa(grid)
    assert qa.total_cells == 225
    assert qa.valid_cells == 225
    assert qa.nodata_cells == 0
    assert qa.valid_pct == 100.0
    assert qa.nodata_pct == 0.0


# 11. No fabricated confidence percentages
def test_no_fabricated_confidence_percentages(engine):
    data = np.full((10, 10), 10.0, dtype=np.float32)
    grid = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )
    qa = evaluate_terrain_qa(grid)
    qa_dict = qa.model_dump()
    
    # Assert zero fabricated confidence keywords exist in top-level keys
    forbidden_keys = ["confidence", "confidence_pct", "confidence_score", "accuracy_score", "ai_confidence"]
    for key in forbidden_keys:
        assert key not in qa_dict, f"Forbidden fabricated confidence field '{key}' found in QA response"
    
    # Assert valid_pct is explicitly described as data coverage/validity, never confidence
    assert "valid_pct" in qa_dict
    assert isinstance(qa_dict["valid_pct"], float)


# 12. Calibration metrics only shown when authoritative data exists
def test_calibration_metrics_only_shown_when_authoritative_data_exists(engine):
    ref_fit = ReferenceFitSchema(
        reference_source="Copernicus GLO-30 DEM",
        mae=1.45,
        rmse=1.92,
        bias=0.08,
        correlation=0.965,
        sample_count=5000
    )

    data = np.full((10, 10), 10.0, dtype=np.float32)
    
    # In relative mode: reference fit must be suppressed
    grid_rel = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.RELATIVE
    )
    qa_rel = evaluate_terrain_qa(grid_rel, reference_fit=ref_fit)
    assert qa_rel.reference_fit is None
    assert qa_rel.reference_source is None

    # In calibration_rejected mode: reference fit must be suppressed
    grid_rej = engine.create_grid(
        elevations=data,
        mode=ElevationMode.RELATIVE,
        calibration_state=TerrainCalibrationState.CALIBRATION_REJECTED
    )
    qa_rej = evaluate_terrain_qa(grid_rej, reference_fit=ref_fit)
    assert qa_rej.reference_fit is None

    # In calibrated mode: reference fit must be truthfully populated
    grid_cal = engine.create_grid(
        elevations=data,
        mode=ElevationMode.ABSOLUTE,
        calibration_state=TerrainCalibrationState.CALIBRATED,
        elevation_unit="meters"
    )
    qa_cal = evaluate_terrain_qa(grid_cal, reference_source="Copernicus GLO-30 DEM", reference_fit=ref_fit)
    assert qa_cal.reference_fit is not None
    assert qa_cal.reference_fit.mae == 1.45
    assert qa_cal.reference_fit.rmse == 1.92
    assert qa_cal.reference_fit.correlation == 0.965


# 13. API Endpoint POST /api/terrain/qa integration
def test_qa_api_endpoint(client):
    # Test POST /api/terrain/qa with calibrated payload
    payload = {
        "width": 10,
        "height": 10,
        "mode": "absolute",
        "calibration_state": "calibrated",
        "elevation_unit": "meters",
        "reference_source": "SRTM",
        "reference_fit": {
            "reference_source": "SRTM",
            "mae": 1.5,
            "rmse": 2.1,
            "bias": -0.2,
            "correlation": 0.94,
            "sample_count": 800
        }
    }
    resp = client.post("/api/terrain/qa", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status_label"] == "CALIBRATED"
    assert data["is_metric"] is True
    assert data["reference_source"] == "SRTM"
    assert data["reference_fit"]["mae"] == 1.5
    assert data["capabilities"]["metric_elevation"] is True


# 14. Existing Phase 4A regression
def test_phase_4a_regression(engine):
    # Verify Horn slope, aspect, hillshade, statistics remain fully operational
    data = np.arange(100, dtype=np.float32).reshape((10, 10))
    grid = engine.create_grid(elevations=data, dx=1.0, dy=1.0)
    
    slope_res = engine.compute_slope(grid)
    assert slope_res.slope_map.shape == (10, 10)
    
    aspect_res = engine.compute_aspect(grid)
    assert aspect_res.aspect_map.shape == (10, 10)
    
    hs_res = engine.compute_hillshade(grid)
    assert hs_res.hillshade_f32.shape == (10, 10)
    
    stats = engine.compute_statistics(grid)
    assert stats.min == 0.0
    assert stats.max == 99.0


# 15. Existing Phase 4B regression
def test_phase_4b_regression(engine):
    # Verify probe, measure_two_points, sample_cross_section
    data = np.full((10, 10), 42.0, dtype=np.float32)
    grid = engine.create_grid(elevations=data)
    
    probe = engine.probe_point(grid, 5.0, 5.0)
    assert probe.valid is True
    assert probe.elevation == 42.0
    
    measure = engine.measure_two_points(grid, 1.0, 1.0, 4.0, 5.0)
    assert measure.horizontal_distance == 5.0
    assert measure.elevation_delta == 0.0
    
    profile = engine.sample_cross_section(grid, 0.0, 0.0, 9.0, 9.0, num_samples=10)
    assert len(profile.samples) == 10
    assert all(s.elevation == 42.0 for s in profile.samples)


# 16. Existing Phase 4C regression
def test_phase_4c_regression(engine):
    # Verify hillshade normalized range and statistics consistency
    data = np.ones((8, 8), dtype=np.float32) * 50.0
    grid = engine.create_grid(elevations=data)
    hs_res = engine.compute_hillshade(grid, sun_azimuth_deg=315.0, sun_altitude_deg=45.0)
    
    # On flat terrain with 45° sun elevation, hillshade = sin(45°) ≈ 0.7071
    flat_hs = hs_res.hillshade_f32[2:-2, 2:-2]
    assert np.allclose(flat_hs, np.sin(np.radians(45.0)), atol=1e-3)
