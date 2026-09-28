"""
DepthWizard — Phase 5B Geospatial Export & Terrain Analysis Report Test Suite
Authority: Phase 5B Specification (Section 5B.12) & docs/product/output-contract.md

Tests (20 canonical tests):
1. test_session_export_schema_validity
2. test_export_gating_relative
3. test_export_gating_calibrated
4. test_export_gating_rejected
5. test_export_gating_error_map
6. test_export_relative_heightmap_unprojected
7. test_export_calibrated_geotiff_crs
8. test_export_calibrated_geotiff_nodata
9. test_export_signed_error_geotiff
10. test_export_analysis_json
11. test_export_measurements_geojson_georeferenced
12. test_export_measurements_geojson_unprojected
13. test_export_profile_csv
14. test_html_report_10_sections
15. test_html_report_in_sample_vs_holdout_distinction
16. test_html_report_relative_limitations
17. test_html_report_rejected_limitations
18. test_pdf_report_generation
19. test_pdf_report_disclaimers
20. test_export_filename_sanitization
"""

import io
import json
import csv
import numpy as np
import pytest
import rasterio
import fitz
from fastapi.testclient import TestClient

from backend.app import app
from backend.export.contracts import (
    SessionExport,
    InputMetadataExport,
    ModelProvenanceExport,
    TerrainSummaryExport,
    CalibrationExport,
    TerrainAnalyticsExport,
    ValidationSessionExport,
    ValidationMetricsExport,
    SpatialHoldoutExport,
    ExportFormat
)
from backend.export.gating import (
    validate_export_eligibility,
    get_state_specific_limitations,
    sanitize_export_filename
)
from backend.export.raster import (
    export_calibrated_geotiff,
    export_relative_heightmap,
    export_signed_error_geotiff
)
from backend.export.analysis import (
    export_analysis_json,
    export_measurements_geojson,
    export_profile_csv
)
from backend.export.report import (
    generate_html_report
)
from backend.export.pdf_report import (
    generate_pdf_report
)


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def sample_calibrated_session():
    """Creates a fully populated, valid calibrated session contract."""
    return SessionExport(
        schema_version="0.1.0",
        session_id="session_test_calib_001",
        exported_at="2026-09-14T00:00:00Z",
        scientific_status="CALIBRATED",
        is_metric=True,
        input=InputMetadataExport(
            filename="scene_alps.tif",
            scene_name="scene_alps",
            format="geotiff",
            width=200,
            height=200,
            file_size_bytes=160000,
            georeferenced=True,
            crs="EPSG:32610",
            pixel_resolution_x=2.0,
            pixel_resolution_y=2.0,
            resolution_unit="meters",
            bounds={"north": 4000400.0, "south": 4000000.0, "east": 500400.0, "west": 500000.0},
            affine_transform=[2.0, 0.0, 500000.0, 0.0, -2.0, 4000400.0],
            nodata=-9999.0
        ),
        processing=ModelProvenanceExport(
            provider="depth-anything-v2",
            model_name="Depth-Anything-V2-Small",
            checkpoint_file="backend/checkpoints/da2_finetuned.pth",
            checkpoint="backend/checkpoints/da2_finetuned.pth",
            fine_tuned_dataset="High-Resolution LiDAR DEMs",
            inference_width=200,
            inference_height=200,
            surface_convention="depth_inverted_to_relative_height",
            is_fine_tuned=True,
            elevation_mode="absolute"
        ),
        terrain=TerrainSummaryExport(
            rows=200,
            cols=200,
            total_cells=40000,
            valid_cells=40000,
            nodata_cells=0,
            valid_percentage=100.0,
            nodata_percentage=0.0,
            elevation_min=1250.0,
            elevation_max=1850.0,
            elevation_mean=1550.0,
            elevation_median=1540.0,
            elevation_std=125.0,
            relief=600.0,
            elevation_relief=600.0,
            elevation_mode="absolute",
            unit="meters",
            is_metric=True
        ),
        calibration=CalibrationExport(
            scientific_status="CALIBRATED",
            status_label="CALIBRATED",
            reference_source="CartoDEM",
            method="robust_linear_regression",
            scale=142.5,
            offset=1250.0,
            sample_count=5000,
            mae=1.85,
            rmse=2.35,
            bias=-0.12,
            correlation=0.965,
            rejection_reason=None,
            is_metric_eligible=True
        ),
        analytics=TerrainAnalyticsExport(
            slope_available=True,
            slope_min=1.5,
            slope_max=42.0,
            slope_mean=18.4,
            slope_unit="degrees",
            slope_is_physical=True,
            aspect_available=True,
            aspect_convention="compass_degrees_from_north",
            hillshade_available=True,
            hillshade_azimuth_deg=315.0,
            hillshade_altitude_deg=45.0
        ),
        measurements={
            "probes": [
                {"label": "Probe 1", "x": 50, "y": 60, "elevation": 1420.5, "slope": 12.3, "aspect": 180.0}
            ],
            "two_point": [
                {
                    "point_a": {"x": 50, "y": 60, "elevation": 1420.5},
                    "point_b": {"x": 120, "y": 140, "elevation": 1680.0},
                    "distance_2d": 212.6,
                    "distance_3d": 334.8,
                    "elevation_diff": 259.5,
                    "slope_deg": 28.5
                }
            ],
            "cross_section": {
                "start_point": [20, 20],
                "end_point": [180, 180],
                "total_distance": 452.5,
                "min_elevation": 1300.0,
                "max_elevation": 1780.0,
                "samples": [
                    {"distance": 0.0, "x": 20.0, "y": 20.0, "elevation": 1300.0, "valid": True},
                    {"distance": 226.0, "x": 100.0, "y": 100.0, "elevation": 1550.0, "valid": True},
                    {"distance": 452.5, "x": 180.0, "y": 180.0, "elevation": 1780.0, "valid": True}
                ]
            }
        },
        validation=ValidationSessionExport(
            status="INDEPENDENT_VALIDATION",
            is_independent=True,
            reference_source="USGS 3DEP LiDAR DEM",
            overall_fit=ValidationMetricsExport(
                sample_count=20000,
                rmse=2.15,
                mae=1.72,
                bias=-0.15,
                pearson_r=0.972,
                spearman_r=0.968,
                min_error=-6.4,
                max_error=5.8,
                p90_error=3.1
            ),
            spatial_holdout=SpatialHoldoutExport(
                split_name="Spatial Block Split (East Block Holdout)",
                train_description="West Block (X <= 100)",
                holdout_description="East Block (X > 100)",
                train_sample_count=10000,
                holdout_sample_count=10000,
                generalization_gap_rmse=0.35,
                val_rmse=2.45,
                val_mae=1.92
            ),
            error_min=-6.4,
            error_max=5.8,
            error_mean=-0.15,
            error_std=2.12,
            has_error_map=True,
            disclaimer="Independent spatial holdout validation demonstrates out-of-sample generalization."
        ),
        scientific_limitations=[
            "In-sample reference fit reflects optimization residuals, not independent generalization.",
            "Accuracy may degrade in steep terrain with severe shadow occlusions."
        ],
        available_exports={
            "session_json": True,
            "report_html": True,
            "report_pdf": True,
            "relative_heightfield": True,
            "geotiff_dsm": True,
            "error_map_geotiff": True,
            "analysis_json": True,
            "measurements_geojson": True,
            "profile_csv": True
        }
    )


@pytest.fixture
def sample_relative_session():
    """Creates a valid session contract for relative uncalibrated terrain."""
    return SessionExport(
        schema_version="0.1.0",
        session_id="session_test_rel_002",
        exported_at="2026-09-14T00:00:00Z",
        scientific_status="RELATIVE",
        is_metric=False,
        input=InputMetadataExport(
            filename="drone_uncalib.jpg",
            scene_name="drone_uncalib",
            format="jpeg",
            width=100,
            height=100,
            georeferenced=False,
            crs=None,
            resolution_unit="pixels"
        ),
        processing=ModelProvenanceExport(
            provider="depth-anything-v2",
            model_name="Depth-Anything-V2-Small",
            checkpoint_file="backend/checkpoints/da2_finetuned.pth",
            inference_width=100,
            inference_height=100,
            surface_convention="depth_inverted_to_relative_height",
            elevation_mode="relative"
        ),
        terrain=TerrainSummaryExport(
            rows=100,
            cols=100,
            total_cells=10000,
            valid_cells=10000,
            nodata_cells=0,
            valid_percentage=100.0,
            nodata_percentage=0.0,
            elevation_min=0.0,
            elevation_max=1.0,
            elevation_mean=0.52,
            relief=1.0,
            unit="relative units",
            is_metric=False
        ),
        calibration=CalibrationExport(
            scientific_status="RELATIVE",
            status_label="RELATIVE",
            is_metric_eligible=False
        ),
        analytics=TerrainAnalyticsExport(
            slope_available=True,
            slope_mean=0.08,
            slope_unit="relative gradient",
            slope_is_physical=False
        ),
        measurements={},
        validation=ValidationSessionExport(
            status="VALIDATION_NOT_AVAILABLE",
            is_independent=False,
            disclaimer="Absolute elevation validation is not available for uncalibrated relative scenes."
        ),
        scientific_limitations=[
            "Absolute elevation validation was not available for this scene.",
            "Reported terrain values are relative model-derived units without a physical vertical datum."
        ],
        available_exports={
            "session_json": True,
            "report_html": True,
            "report_pdf": True,
            "relative_heightfield": True,
            "geotiff_dsm": False,
            "error_map_geotiff": False,
            "analysis_json": True,
            "measurements_geojson": True,
            "profile_csv": False
        }
    )


# =============================================================================
# 1. Contract & Schema Validity
# =============================================================================

def test_session_export_schema_validity(sample_calibrated_session):
    """Asserts that SessionExport validates properly and serializes cleanly."""
    json_data = sample_calibrated_session.model_dump()
    assert json_data["schema_version"] == "0.1.0"
    assert json_data["scientific_status"] == "CALIBRATED"
    assert json_data["is_metric"] is True
    assert json_data["terrain"]["rows"] == 200
    assert json_data["calibration"]["reference_source"] == "CartoDEM"
    assert json_data["validation"]["is_independent"] is True


# =============================================================================
# 2-5. Scientific Export Gating
# =============================================================================

def test_export_gating_relative():
    """Asserts that metric GeoTIFF DSM export is blocked on RELATIVE state."""
    is_permitted, reason = validate_export_eligibility("geotiff", "RELATIVE")
    assert is_permitted is False
    assert "RELATIVE" in reason
    assert "unavailable" in reason.lower() or "withheld" in reason.lower()


def test_export_gating_calibrated():
    """Asserts that metric GeoTIFF DSM export is allowed on CALIBRATED state."""
    is_permitted, reason = validate_export_eligibility("geotiff", "CALIBRATED")
    assert is_permitted is True


def test_export_gating_rejected():
    """Asserts that metric GeoTIFF DSM export is blocked on CALIBRATION_REJECTED state."""
    is_permitted, reason = validate_export_eligibility("geotiff", "CALIBRATION_REJECTED")
    assert is_permitted is False
    assert "CALIBRATION_REJECTED" in reason


def test_export_gating_error_map():
    """Asserts that signed error map is gated strictly to calibrated sessions."""
    is_rel_perm, _ = validate_export_eligibility("error_geotiff", "RELATIVE")
    assert is_rel_perm is False

    is_cal_perm, _ = validate_export_eligibility("error_geotiff", "CALIBRATED")
    assert is_cal_perm is True


# =============================================================================
# 6-9. Raster Export Integrity
# =============================================================================

def test_export_relative_heightmap_unprojected():
    """Verifies that relative heightmap has NO fabricated CRS and retains Float32 shape."""
    grid = np.linspace(0.0, 1.0, 100, dtype=np.float32).reshape((10, 10))
    buf = export_relative_heightmap(grid)
    
    with rasterio.open(buf) as src:
        assert src.crs is None  # CRITICAL: Never fabricate CRS
        assert src.shape == (10, 10)
        assert src.dtypes[0] == 'float32'
        assert src.nodata == -9999.0
        data = src.read(1)
        assert np.isclose(data.min(), 0.0)
        assert np.isclose(data.max(), 1.0)


def test_export_calibrated_geotiff_crs():
    """Verifies exported metric GeoTIFF has authoritative EPSG CRS and affine transform."""
    grid = np.full((20, 20), 1500.0, dtype=np.float32)
    buf = export_calibrated_geotiff(grid, crs="EPSG:32610", ground_resolution_m=2.5)

    with rasterio.open(buf) as src:
        assert src.crs.to_string() == "EPSG:32610"
        assert src.shape == (20, 20)
        assert src.transform.a == 2.5  # pixel width
        assert src.transform.e == -2.5  # pixel height


def test_export_calibrated_geotiff_nodata():
    """Verifies NoData value is preserved and GDAL metadata tags are embedded."""
    grid = np.full((15, 15), 1200.0, dtype=np.float32)
    grid[0, 0] = -9999.0  # NoData cell

    buf = export_calibrated_geotiff(grid, crs="EPSG:32610", nodata=-9999.0)
    with rasterio.open(buf) as src:
        assert src.nodata == -9999.0
        tags = src.tags()
        assert tags.get("TIFFTAG_SOFTWARE") == "DepthWizard 0.1.0"
        assert tags.get("ELEVATION_UNIT") == "meters"
        assert src.read(1)[0, 0] == -9999.0


def test_export_signed_error_geotiff():
    """Verifies signed error map preserves negative, zero, and positive residuals."""
    err_grid = np.array([[-3.5, 0.0], [1.2, 4.8]], dtype=np.float32)
    buf = export_signed_error_geotiff(err_grid, crs="EPSG:32610")

    with rasterio.open(buf) as src:
        assert src.crs.to_string() == "EPSG:32610"
        data = src.read(1)
        assert np.isclose(data[0, 0], -3.5)
        assert np.isclose(data[0, 1], 0.0)
        assert np.isclose(data[1, 0], 1.2)
        assert np.isclose(data[1, 1], 4.8)
        assert src.tags().get("RESIDUAL_CONVENTION") == "predicted_minus_reference"


# =============================================================================
# 10-13. Machine-Readable Analysis Export
# =============================================================================

def test_export_analysis_json(sample_calibrated_session):
    """Verifies analysis JSON contains all required quantitative metrics."""
    json_str = export_analysis_json(sample_calibrated_session)
    data = json.loads(json_str)

    assert data["session_id"] == "session_test_calib_001"
    assert data["scientific_status"] == "CALIBRATED"
    assert data["terrain_statistics"]["elevation_min"] == 1250.0
    assert data["calibration"]["scale"] == 142.5
    assert data["validation"]["overall_fit"]["rmse"] == 2.15
    assert data["validation"]["spatial_holdout"]["val_rmse"] == 2.45


def test_export_measurements_geojson_georeferenced(sample_calibrated_session):
    """Verifies projected spatial coordinates are used when georeferenced."""
    geojson_str = export_measurements_geojson(sample_calibrated_session)
    data = json.loads(geojson_str)

    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 3  # Probe, Two-Point, Cross-Section
    # Verify CRS metadata is present
    assert data["crs"]["properties"]["name"] == "EPSG:32610"

    # Verify first probe feature coordinates
    probe_feat = next(f for f in data["features"] if f["properties"]["feature_type"] == "height_probe")
    coords = probe_feat["geometry"]["coordinates"]
    # Check projected coordinates (col 50 * 2.0 + 500000 = 500100)
    assert np.isclose(coords[0], 500100.0, atol=1.0)


def test_export_measurements_geojson_unprojected(sample_relative_session):
    """Verifies pixel coordinates are explicitly tagged as local_image_grid_pixels without fake lat/lon."""
    sample_relative_session.measurements = {
        "probes": [{"label": "Probe 1", "x": 25.0, "y": 30.0, "elevation": 0.45}]
    }
    geojson_str = export_measurements_geojson(sample_relative_session)
    data = json.loads(geojson_str)

    assert data["properties"]["coordinate_system"] == "local_image_grid_pixels"
    assert "crs" not in data  # No fabricated CRS
    feat = data["features"][0]
    assert feat["geometry"]["coordinates"] == [25.0, 30.0]


def test_export_profile_csv(sample_calibrated_session):
    """Verifies CSV tabular output contains proper column headers and rows."""
    csv_str = export_profile_csv(sample_calibrated_session, tool="cross_section")
    reader = csv.reader(io.StringIO(csv_str))
    rows = list(reader)

    assert rows[0] == ["sample_index", "distance_m", "elevation_m", "is_metric", "x_coord", "y_coord"]
    assert len(rows) == 4  # 1 header + 3 samples
    assert rows[1][0] == "0"
    assert float(rows[1][1]) == 0.0
    assert float(rows[1][2]) == 1300.0


# =============================================================================
# 14-17. Terrain Analysis Report (HTML)
# =============================================================================

def test_html_report_10_sections(sample_calibrated_session):
    """Verifies all 10 required report sections are rendered in the HTML report."""
    html_content = generate_html_report(sample_calibrated_session)

    required_sections = [
        "1. Input Imagery & Geospatial Reference",
        "2. Depth Estimation & Model Provenance",
        "3. Terrain Summary & Elevation Extents",
        "4. Geospatial Calibration & Scientific Guardrails",
        "5. Terrain Analytics & Derivatives",
        "6. Interactive Analysis & Intelligence Results",
        "7. Empirical Validation & Error Analysis",
        "8. Signed Height-Error Analysis",
        "9. Scientific Limitations & Operational Constraints",
        "10. Report Metadata"
    ]

    for sec in required_sections:
        assert sec in html_content, f"Missing section: {sec}"


def test_html_report_in_sample_vs_holdout_distinction(sample_calibrated_session):
    """Verifies report explicitly distinguishes in-sample residuals from independent generalization."""
    html_content = generate_html_report(sample_calibrated_session)

    assert "In-Sample Reference Fit" in html_content
    assert "Independent Spatial Holdout" in html_content
    assert "Measures affine calibration optimization fit on training samples" in html_content
    assert "Spatial block partitioning prevents autocorrelation leakage" in html_content


def test_html_report_relative_limitations(sample_relative_session):
    """Verifies HTML report for relative terrain contains mandatory limitation statements."""
    html_content = generate_html_report(sample_relative_session)

    assert "RELATIVE" in html_content
    assert "Absolute elevation validation was not available for this scene" in html_content
    assert "relative model-derived units without a physical vertical datum" in html_content


def test_html_report_rejected_limitations(sample_relative_session):
    """Verifies HTML report for rejected calibration contains guardrail rejection notice."""
    sample_relative_session.scientific_status = "CALIBRATION_REJECTED"
    sample_relative_session.calibration.rejection_reason = "Residual RMSE exceeded 15.0m threshold"
    sample_relative_session.scientific_limitations = get_state_specific_limitations(
        "CALIBRATION_REJECTED", rejection_reason="Residual RMSE exceeded 15.0m threshold"
    )

    html_content = generate_html_report(sample_relative_session)
    assert "CALIBRATION_REJECTED" in html_content
    assert "Absolute calibration was rejected by DepthWizard scientific guardrails" in html_content
    assert "Residual RMSE exceeded 15.0m threshold" in html_content


# =============================================================================
# 18-19. Native PDF Report
# =============================================================================

def test_pdf_report_generation(sample_calibrated_session):
    """Verifies PyMuPDF generates a valid 2-page PDF document."""
    pdf_bytes = generate_pdf_report(sample_calibrated_session)

    assert pdf_bytes.startswith(b"%PDF")
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count == 2
    
    # Page 1 text check
    p1_text = doc[0].get_text()
    assert "TERRAIN ANALYSIS REPORT" in p1_text
    assert "CALIBRATED" in p1_text
    assert "scene_alps" in p1_text


def test_pdf_report_disclaimers(sample_calibrated_session):
    """Verifies PDF report contains scientific disclaimers on page 2."""
    pdf_bytes = generate_pdf_report(sample_calibrated_session)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    p2_text = doc[1].get_text()
    assert "SCIENTIFIC LIMITATIONS" in p2_text
    assert "In-sample reference fit reflects optimization residuals" in p2_text


# =============================================================================
# 20. Filename Sanitization
# =============================================================================

def test_export_filename_sanitization():
    """Verifies filenames are sanitized against path traversal and illegal characters."""
    clean1 = sanitize_export_filename("../../../alps/mountains.jpg", "dsm", "tif")
    assert clean1 == "DepthWizard_dsm_mountains.tif"
    assert ".." not in clean1
    assert "/" not in clean1

    clean2 = sanitize_export_filename("Test Scene #1 (Special)!", "report", "html")
    assert clean2 == "DepthWizard_report_Test_Scene_1_Special.html"
    assert "#" not in clean2
    assert "!" not in clean2


# =============================================================================
# 21. Regression: SessionExport -> Report Generation Endpoint
# =============================================================================

def test_report_export_endpoint_session_export_contract(test_client, sample_calibrated_session, sample_relative_session):
    """
    Regression test for Task 5.1:
    Verifies /api/export/report accepts the canonical SessionExport contract
    and successfully generates HTML and PDF reports without raising
    'SessionExport' object has no attribute 'input_metadata'.
    Also tests relative terrain gating integrity.
    """
    # 1. Calibrated HTML Report via endpoint
    res_html = test_client.post(
        "/api/export/report",
        json={"format": "html", "session": sample_calibrated_session.model_dump()}
    )
    assert res_html.status_code == 200, f"HTML report failed: {res_html.text}"
    assert "text/html" in res_html.headers.get("content-type", "")
    assert "DepthWizard_terrain_report_scene_alps.html" in res_html.headers.get("content-disposition", "")
    assert "1. Input Imagery & Geospatial Reference" in res_html.text
    assert "CALIBRATED" in res_html.text

    # 2. Calibrated PDF Report via endpoint
    res_pdf = test_client.post(
        "/api/export/report",
        json={"format": "pdf", "session": sample_calibrated_session.model_dump()}
    )
    assert res_pdf.status_code == 200, f"PDF report failed: {res_pdf.text}"
    assert "application/pdf" in res_pdf.headers.get("content-type", "")
    assert "DepthWizard_terrain_report_scene_alps.pdf" in res_pdf.headers.get("content-disposition", "")
    assert res_pdf.content.startswith(b"%PDF")

    # 3. Relative Scene HTML Report via endpoint (Gating Check)
    res_rel_html = test_client.post(
        "/api/export/report",
        json={"format": "html", "session": sample_relative_session.model_dump()}
    )
    assert res_rel_html.status_code == 200, f"Relative HTML report failed: {res_rel_html.text}"
    assert "RELATIVE" in res_rel_html.text
    assert "relative model-derived units without a physical vertical datum" in res_rel_html.text
    # Ensure relative scene does not fabricate a physical datum or RMSE
    assert "Absolute elevation validation was not available for this scene" in res_rel_html.text

    # 4. Session JSON export endpoint regression
    res_sess = test_client.post(
        "/api/export/session",
        json=sample_calibrated_session.model_dump()
    )
    assert res_sess.status_code == 200, f"Session export failed: {res_sess.text}"
    assert "DepthWizard_session_scene_alps.json" in res_sess.headers.get("content-disposition", "")

    # 5. Analysis export endpoint regression
    res_ana = test_client.post(
        "/api/export/analysis",
        json={"format": "json", "session": sample_calibrated_session.model_dump()}
    )
    assert res_ana.status_code == 200, f"Analysis export failed: {res_ana.text}"
    assert "DepthWizard_analysis_scene_alps.json" in res_ana.headers.get("content-disposition", "")

