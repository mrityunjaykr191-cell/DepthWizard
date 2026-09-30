"""
DepthWizard — FastAPI Depth Estimation Backend
Authority: docs/architecture/backend.md & Phase 2B Specification

Serves the canonical DepthResult contract to the frontend.
Provides /api/health and /api/depth endpoints with model lifecycle management.
"""

import os
import glob
import base64
from typing import Optional
from contextlib import asynccontextmanager
import io
import numpy as np
from pathlib import Path
from PIL import Image, ImageFile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import rasterio

# Enable robust decoding of partially buffered or non-standard JPEGs
ImageFile.LOAD_TRUNCATED_IMAGES = True

from backend.config import (
    DEPTH_MODEL_PROVIDER,
    DEPTH_MODEL_CHECKPOINT,
    DEPTH_DEVICE,
    MAX_FILE_SIZE_BYTES,
)
from backend.estimators.registry import get_global_estimator, dispose_global_estimator
from backend.schemas.depth import HealthResponse, DepthResultResponse
from backend.schemas.calibration import CalibrationSourcesResponse, CalibrationResponse
from backend.calibration.service import CalibrationService
from backend.calibration.contracts import (
    CalibrationInput,
    CalibrationStatus,
    ReferenceSourceType,
    GeospatialMetadata
)
from backend.utils.serialization import encode_depth_raw, decode_depth_raw, generate_preview_data_url

# Initialize Calibration Service
calibration_service = CalibrationService()

# Initialize Terrain Analytics Engine (Phase 4A)
from backend.schemas.terrain import (
    ElevationQueryRequest,
    ElevationQueryResponse,
    TerrainAnalyticsRequest,
    TerrainAnalyticsResponse,
    TerrainStatisticsResponse,
    PointProbeRequest,
    PointProbeResponse,
    TwoPointMeasureRequest,
    TwoPointMeasureResponse,
    CrossSectionRequest,
    CrossSectionResponse,
    ProfileSampleSchema,
    TerrainQARequest,
    TerrainQAResponse,
    ReferenceFitSchema,
    LineOfSightRequest,
    LineOfSightResponse,
    LineOfSightSampleSchema,
    BlockingPointSchema,
    RouteProfileRequest,
    RouteProfileResponse,
    RouteProfileSampleSchema,
    TerrainScreeningRequest,
    TerrainScreeningResponse,
    TerrainValidationRequest,
    TerrainValidationResponse,
    ValidationMetricsSchema,
    SpatialSplitSchema
)
from backend.schemas.export import (
    TerrainExportRequest,
    AnalysisExportRequest,
    ReportExportRequest
)
from backend.export import (
    SessionExport,
    validate_export_eligibility,
    sanitize_export_filename,
    export_calibrated_geotiff,
    export_relative_heightmap,
    export_signed_error_geotiff,
    export_analysis_json,
    export_measurements_geojson,
    export_profile_csv,
    generate_html_report,
    generate_pdf_report,
)
from backend.terrain import (
    TerrainAnalyticsEngine,
    ElevationMode as TerrainElevationMode,
    TerrainCalibrationState as TerrainCalibState,
    evaluate_terrain_qa
)
terrain_engine = TerrainAnalyticsEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages startup preload and graceful shutdown of the depth estimation model.
    """
    print(f"[DepthWizard Backend] Initializing provider '{DEPTH_MODEL_PROVIDER}' ({DEPTH_MODEL_CHECKPOINT})...")
    try:
        estimator = get_global_estimator(DEPTH_MODEL_PROVIDER, DEPTH_MODEL_CHECKPOINT, DEPTH_DEVICE)
        print(f"[DepthWizard Backend] Model ready on device '{estimator.get_metadata()['device']}'.")
    except Exception as e:
        print(f"[DepthWizard Backend] Warning during model initialization: {e}")
    yield
    print("[DepthWizard Backend] Shutting down, disposing model resources...")
    dispose_global_estimator()


app = FastAPI(
    title="DepthWizard Depth Estimation Engine",
    description="Replaceable Depth Estimation Service for DepthWizard Geospatial Terrain Reconstruction",
    version="0.2.0",
    lifespan=lifespan,
)

# Allow CORS for production and development frontends
allowed_origins = [
    "https://depthwizard-sih26.vercel.app",
    "https://depth-wizard-lime.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
cors_extra = os.environ.get("ALLOWED_ORIGINS")
if cors_extra:
    allowed_origins.extend([o.strip() for o in cors_extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Returns backend service health, model provider identity, and readiness state.
    """
    try:
        estimator = get_global_estimator(DEPTH_MODEL_PROVIDER, DEPTH_MODEL_CHECKPOINT, DEPTH_DEVICE)
        meta = estimator.get_metadata()
        return HealthResponse(
            status="ok",
            model_ready=meta.get("loaded", False),
            provider=meta.get("provider", DEPTH_MODEL_PROVIDER),
            model_variant=meta.get("model_variant", "Depth Anything V2 Small"),
            checkpoint=meta.get("checkpoint", DEPTH_MODEL_CHECKPOINT),
            device=meta.get("device", DEPTH_DEVICE),
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            model_ready=False,
            provider=DEPTH_MODEL_PROVIDER,
            model_variant="Depth Anything V2 Small",
            checkpoint=DEPTH_MODEL_CHECKPOINT,
            device=DEPTH_DEVICE,
        )


@app.post("/api/depth", response_model=DepthResultResponse)
async def estimate_depth(
    file: UploadFile = File(...),
    provider: Optional[str] = Form(None)
) -> DepthResultResponse:
    """
    Estimates relative depth from an uploaded optical image (PNG, JPEG, GeoTIFF).
    Returns lossless Float32 depth array (base64) and Viridis 2D preview data URL.
    """
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES} bytes."
        )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode image raster: {str(e)}"
        )

    orig_w, orig_h = image.size
    if orig_w <= 0 or orig_h <= 0:
        raise HTTPException(status_code=400, detail="Invalid image dimensions (0x0).")

    # Resolve provider and checkpoint (defaults to configured DEPTH_MODEL_PROVIDER)
    req_provider = provider if provider in ("da2_zero_shot", "da2_fine_tuned") else DEPTH_MODEL_PROVIDER
    if req_provider == DEPTH_MODEL_PROVIDER and DEPTH_MODEL_CHECKPOINT:
        req_checkpoint = DEPTH_MODEL_CHECKPOINT
    elif req_provider == "da2_zero_shot":
        req_checkpoint = "depth-anything/Depth-Anything-V2-Small-hf"
    elif req_provider == "da2_fine_tuned":
        req_checkpoint = "backend/checkpoints/da2_finetuned.pth"
    else:
        req_checkpoint = DEPTH_MODEL_CHECKPOINT

    try:
        estimator = get_global_estimator(req_provider, req_checkpoint, DEPTH_DEVICE)
        depth_arr, metadata = estimator.predict(image)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Depth estimation inference error: {str(e)}"
        )

    # Calculate statistics
    d_min = float(np.nanmin(depth_arr))
    d_max = float(np.nanmax(depth_arr))
    d_mean = float(np.nanmean(depth_arr))

    # Lossless Float32 array encoding
    depth_raw_b64 = encode_depth_raw(depth_arr)

    # 8-bit visual preview for 2D UI display
    preview_data_url = generate_preview_data_url(depth_arr)

    return DepthResultResponse(
        status="complete",
        width=orig_w,
        height=orig_h,
        depth_min=d_min,
        depth_max=d_max,
        depth_mean=d_mean,
        model_id=metadata["model_id"],
        model_variant=metadata["model_variant"],
        provider=metadata["provider"],
        checkpoint=metadata["checkpoint"],
        device=metadata["device"],
        inference_time_ms=metadata["inference_time_ms"],
        calibration_status="uncalibrated_relative",
        depth_raw_b64=depth_raw_b64,
        preview_data_url=preview_data_url,
    )


@app.get("/api/calibration/sources", response_model=CalibrationSourcesResponse)
async def get_calibration_sources() -> CalibrationSourcesResponse:
    """
    Returns available reference elevation sources (CartoDEM, SRTM) and local tile readiness.
    """
    data_dir = calibration_service._cartodem_provider._data_dir
    local_tiles = os.path.isdir(data_dir) and bool(glob.glob(os.path.join(data_dir, "*.tif*")))
    return CalibrationSourcesResponse(
        supported_sources=["CartoDEM", "SRTM"],
        preferred_source="CartoDEM",
        fallback_source="SRTM",
        local_tiles_available=local_tiles
    )


@app.post("/api/calibrate", response_model=CalibrationResponse)
async def calibrate_elevation(
    file: UploadFile = File(...),
    reference_source: str = Form("CartoDEM"),
    relative_heightfield_b64: Optional[str] = Form(None),
    raw_depth_b64: Optional[str] = Form(None)
) -> CalibrationResponse:
    """
    Calibrates a model-derived relative surface heightfield into an absolute metric DSM
    using coordinate-aware spatial alignment with a reference DEM (CartoDEM or SRTM).
    """
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES} bytes."
        )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Inspect Geospatial Metadata
    georeferenced = False
    crs_str = None
    transform_tuple = None
    bounds_dict = None
    res_dict = None
    nodata_val = None
    width, height = 0, 0

    try:
        with rasterio.open(io.BytesIO(contents)) as ds:
            width = ds.width
            height = ds.height
            if ds.crs is not None:
                georeferenced = True
                crs_str = ds.crs.to_string()
                transform_tuple = tuple(ds.transform)[:6]
                bounds_dict = {
                    "west": float(ds.bounds.left),
                    "south": float(ds.bounds.bottom),
                    "east": float(ds.bounds.right),
                    "north": float(ds.bounds.top)
                }
                res_dict = {"x": float(ds.res[0]), "y": float(ds.res[1])}
                nodata_val = float(ds.nodata) if ds.nodata is not None else None
    except Exception:
        pass

    # 2. Rejection of Non-georeferenced Inputs (Phase 3.3 & 3.17)
    if not georeferenced or width == 0 or height == 0:
        return CalibrationResponse(
            status="unavailable",
            failure_reason="Source imagery is non-georeferenced. Automatic DEM calibration requires geospatial coordinates (CRS and affine transform).",
            elevation_unit="relative units"
        )

    # 3. Obtain Relative Surface Heightfield [0..100]
    if relative_heightfield_b64:
        # Direct consumption of precomputed, correctly oriented relative heightfield
        try:
            rel_heightfield = decode_depth_raw(relative_heightfield_b64, (height, width))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid relative_heightfield_b64 payload: {e}")

        h_min = float(np.nanmin(rel_heightfield))
        h_max = float(np.nanmax(rel_heightfield))
        if not np.all(np.isfinite(rel_heightfield)) or (h_max - h_min) < 1e-6:
            return CalibrationResponse(
                status="failed",
                failure_reason="Relative heightfield contains non-finite values or has near-zero variation. Surface cannot be calibrated.",
                elevation_unit="relative units"
            )
    elif raw_depth_b64:
        # Backwards-compatible raw depth input: convert to relative heightfield [0..100]
        try:
            raw_depth = decode_depth_raw(raw_depth_b64, (height, width))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid raw_depth_b64 payload: {e}")

        d_min = float(np.nanmin(raw_depth))
        d_max = float(np.nanmax(raw_depth))
        d_span = d_max - d_min
        if d_span < 1e-6:
            return CalibrationResponse(
                status="failed",
                failure_reason="Depth estimation output has near-zero variation. Surface cannot be calibrated.",
                elevation_unit="relative units"
            )
        # Direct normalization: higher model disparity/elevation corresponds to higher terrain
        rel_heightfield = (((raw_depth - d_min) / d_span) * 100.0).astype(np.float32)
    else:
        # Run inference if not precomputed
        try:
            image = Image.open(io.BytesIO(contents))
            image.load()
            estimator = get_global_estimator(DEPTH_MODEL_PROVIDER, DEPTH_MODEL_CHECKPOINT, DEPTH_DEVICE)
            raw_depth, _ = estimator.predict(image)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Depth estimation error: {e}")

        d_min = float(np.nanmin(raw_depth))
        d_max = float(np.nanmax(raw_depth))
        d_span = d_max - d_min
        if d_span < 1e-6:
            return CalibrationResponse(
                status="failed",
                failure_reason="Depth estimation output has near-zero variation. Surface cannot be calibrated.",
                elevation_unit="relative units"
            )
        rel_heightfield = (((raw_depth - d_min) / d_span) * 100.0).astype(np.float32)

    # 5. Build Calibration Input & Execute Calibration
    source_meta = GeospatialMetadata(
        georeferenced=True,
        crs=crs_str,
        transform=transform_tuple,
        bounds=bounds_dict,
        pixel_resolution=res_dict,
        nodata=nodata_val,
        width=width,
        height=height,
        vertical_reference="EGM96"
    )

    ref_type = ReferenceSourceType.SRTM if reference_source.strip().upper() == "SRTM" else ReferenceSourceType.CARTODEM

    calib_result = calibration_service.calibrate(CalibrationInput(
        relative_heightfield=rel_heightfield,
        source_metadata=source_meta,
        reference_source=ref_type
    ))

    # 6. Format API Response
    calibrated_raw_b64 = (
        encode_depth_raw(calib_result.calibrated_elevation)
        if calib_result.calibrated_elevation is not None
        else None
    )
    residuals_raw_b64 = (
        encode_depth_raw(calib_result.residuals_map)
        if calib_result.residuals_map is not None
        else None
    )

    return CalibrationResponse(
        status=calib_result.status.value,
        scale=calib_result.scale,
        offset=calib_result.offset,
        elevation_unit="meters" if calib_result.status == CalibrationStatus.CALIBRATED else "relative units",
        elevation_min=calib_result.elevation_min,
        elevation_max=calib_result.elevation_max,
        elevation_mean=calib_result.elevation_mean,
        method=calib_result.method.value if calib_result.method else None,
        reference_source=calib_result.reference_source,
        reference_crs=calib_result.reference_crs,
        vertical_reference=calib_result.vertical_reference,
        sample_count=calib_result.residuals.sample_count if calib_result.residuals else None,
        mae=calib_result.residuals.mae if calib_result.residuals else None,
        rmse=calib_result.residuals.rmse if calib_result.residuals else None,
        bias=calib_result.residuals.bias if calib_result.residuals else None,
        correlation=calib_result.residuals.correlation if calib_result.residuals else None,
        median_absolute_error=calib_result.residuals.median_absolute_error if calib_result.residuals else None,
        calibrated_elevation_raw_b64=calibrated_raw_b64,
        residuals_map_raw_b64=residuals_raw_b64,
        failure_reason=calib_result.failure_reason,
        provenance=calib_result.provenance
    )


@app.post("/api/terrain/query", response_model=ElevationQueryResponse)
async def query_terrain_elevation(req: ElevationQueryRequest) -> ElevationQueryResponse:
    """
    Continuous elevation probe query using bilinear interpolation on TerrainGrid.
    Authority: Phase 4A Specification (Section 5, 6, 22)
    """
    if req.elevations_raw_b64:
        elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    else:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for terrain query.")

    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit
    )

    query_res = terrain_engine.elevation_at(grid, req.x, req.y)

    return ElevationQueryResponse(
        x=query_res.x,
        y=query_res.y,
        valid=query_res.valid,
        elevation=query_res.elevation,
        unit=query_res.unit,
        is_metric=query_res.is_metric,
        mode=query_res.mode,
        out_of_bounds=query_res.out_of_bounds,
        is_nodata=query_res.is_nodata,
        interpolated=query_res.interpolated,
        failure_reason=query_res.failure_reason
    )


@app.post("/api/terrain/analytics", response_model=TerrainAnalyticsResponse)
async def analyze_terrain(req: TerrainAnalyticsRequest) -> TerrainAnalyticsResponse:
    """
    Executes full terrain analytics (slope, aspect, hillshade, statistics) on TerrainGrid.
    Authority: Phase 4A Specification (Section 4, 8, 10, 11, 13, 22)
    """
    if req.elevations_raw_b64:
        elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    else:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for terrain analytics.")

    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    stats = terrain_engine.compute_statistics(grid)
    slope = terrain_engine.compute_slope(grid)
    aspect = terrain_engine.compute_aspect(grid)
    hillshade = terrain_engine.compute_hillshade(
        grid, sun_azimuth_deg=req.sun_azimuth_deg, sun_altitude_deg=req.sun_altitude_deg
    )

    return TerrainAnalyticsResponse(
        status="complete",
        grid_dimensions={"cols": grid.cols, "rows": grid.rows},
        calibration_state=grid.calibration_state.value,
        elevation_mode=grid.mode.value,
        elevation_unit=grid.elevation_unit,
        horizontal_spacing={"dx": grid.dx, "dy": grid.dy, "unit": grid.horizontal_unit},
        has_metric_horizontal_scale=grid.has_metric_horizontal_scale,
        statistics=TerrainStatisticsResponse(
            min=stats.min,
            max=stats.max,
            mean=stats.mean,
            median=stats.median,
            std=stats.std,
            relief=stats.relief,
            p5=stats.p5,
            p25=stats.p25,
            p75=stats.p75,
            p95=stats.p95,
            valid_count=stats.valid_count,
            nodata_count=stats.nodata_count,
            total_count=stats.total_count,
            unit=stats.unit,
            is_metric=stats.is_metric
        ),
        slope={
            "unit": slope.unit.value,
            "is_physical": slope.is_physical,
            "method": slope.method,
            "min": slope.min_slope,
            "max": slope.max_slope,
            "mean": slope.mean_slope,
            "warning": slope.warning
        },
        aspect={
            "convention": aspect.convention,
            "valid_count": aspect.valid_count,
            "flat_count": aspect.flat_count,
            "nodata_count": aspect.nodata_count
        },
        hillshade={
            "sun_azimuth_deg": hillshade.azimuth_deg,
            "sun_altitude_deg": hillshade.altitude_deg,
            "is_visualization_only": True
        },
        slope_raw_b64=encode_depth_raw(slope.slope_map),
        aspect_raw_b64=encode_depth_raw(aspect.aspect_map),
        hillshade_raw_b64=encode_depth_raw(hillshade.hillshade_f32)
    )


@app.post("/api/terrain/probe", response_model=PointProbeResponse)
async def probe_terrain_point(req: PointProbeRequest) -> PointProbeResponse:
    """
    Evaluates elevation, local slope, and aspect at continuous raster coordinates (x, y).
    Authority: Phase 4B Specification (Section 4B.1)
    """
    if not req.elevations_raw_b64:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for terrain probe.")

    elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    probe_res = terrain_engine.probe_point(grid, req.x, req.y)
    return PointProbeResponse(
        x=probe_res.x,
        y=probe_res.y,
        valid=probe_res.valid,
        elevation=probe_res.elevation,
        unit=probe_res.unit,
        is_metric=probe_res.is_metric,
        mode=probe_res.mode,
        calibration_state=probe_res.calibration_state,
        slope=probe_res.slope,
        slope_unit=probe_res.slope_unit,
        slope_is_physical=probe_res.slope_is_physical,
        aspect=probe_res.aspect,
        is_flat=probe_res.is_flat,
        out_of_bounds=probe_res.out_of_bounds,
        is_nodata=probe_res.is_nodata,
        failure_reason=probe_res.failure_reason
    )


@app.post("/api/terrain/measure", response_model=TwoPointMeasureResponse)
async def measure_terrain_points(req: TwoPointMeasureRequest) -> TwoPointMeasureResponse:
    """
    Measures distance, elevation delta, 3D distance, and slope between two points.
    Authority: Phase 4B Specification (Section 4B.2)
    """
    if not req.elevations_raw_b64:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for two-point measurement.")

    elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    measure_res = terrain_engine.measure_two_points(grid, req.x_a, req.y_a, req.x_b, req.y_b)

    pt_a_resp = PointProbeResponse(
        x=measure_res.point_a.x,
        y=measure_res.point_a.y,
        valid=measure_res.point_a.valid,
        elevation=measure_res.point_a.elevation,
        unit=measure_res.point_a.unit,
        is_metric=measure_res.point_a.is_metric,
        mode=measure_res.point_a.mode,
        calibration_state=measure_res.point_a.calibration_state,
        slope=measure_res.point_a.slope,
        slope_unit=measure_res.point_a.slope_unit,
        slope_is_physical=measure_res.point_a.slope_is_physical,
        aspect=measure_res.point_a.aspect,
        is_flat=measure_res.point_a.is_flat,
        out_of_bounds=measure_res.point_a.out_of_bounds,
        is_nodata=measure_res.point_a.is_nodata,
        failure_reason=measure_res.point_a.failure_reason
    )
    pt_b_resp = PointProbeResponse(
        x=measure_res.point_b.x,
        y=measure_res.point_b.y,
        valid=measure_res.point_b.valid,
        elevation=measure_res.point_b.elevation,
        unit=measure_res.point_b.unit,
        is_metric=measure_res.point_b.is_metric,
        mode=measure_res.point_b.mode,
        calibration_state=measure_res.point_b.calibration_state,
        slope=measure_res.point_b.slope,
        slope_unit=measure_res.point_b.slope_unit,
        slope_is_physical=measure_res.point_b.slope_is_physical,
        aspect=measure_res.point_b.aspect,
        is_flat=measure_res.point_b.is_flat,
        out_of_bounds=measure_res.point_b.out_of_bounds,
        is_nodata=measure_res.point_b.is_nodata,
        failure_reason=measure_res.point_b.failure_reason
    )

    return TwoPointMeasureResponse(
        point_a=pt_a_resp,
        point_b=pt_b_resp,
        horizontal_distance=measure_res.horizontal_distance,
        horizontal_unit=measure_res.horizontal_unit,
        has_metric_horizontal_scale=measure_res.has_metric_horizontal_scale,
        elevation_delta=measure_res.elevation_delta,
        elevation_unit=measure_res.elevation_unit,
        straight_line_3d_distance=measure_res.straight_line_3d_distance,
        slope_between_points=measure_res.slope_between_points,
        slope_unit=measure_res.slope_unit,
        slope_is_physical=measure_res.slope_is_physical,
        calibration_state=measure_res.calibration_state,
        valid=measure_res.valid,
        failure_reason=measure_res.failure_reason
    )


@app.post("/api/terrain/profile", response_model=CrossSectionResponse)
async def sample_terrain_profile(req: CrossSectionRequest) -> CrossSectionResponse:
    """
    Extracts regularly spaced elevation samples along transect A->B.
    Authority: Phase 4B Specification (Section 4B.3)
    """
    if not req.elevations_raw_b64:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for cross-section profile.")

    elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    profile_res = terrain_engine.sample_cross_section(
        grid, req.x_a, req.y_a, req.x_b, req.y_b, num_samples=req.num_samples
    )

    samples_schema = [
        ProfileSampleSchema(
            distance=s.distance,
            x=s.x,
            y=s.y,
            elevation=s.elevation,
            valid=s.valid
        )
        for s in profile_res.samples
    ]

    return CrossSectionResponse(
        samples=samples_schema,
        total_distance=profile_res.total_distance,
        distance_unit=profile_res.distance_unit,
        elevation_unit=profile_res.elevation_unit,
        is_metric=profile_res.is_metric,
        calibration_state=profile_res.calibration_state,
        min_elevation=profile_res.min_elevation,
        max_elevation=profile_res.max_elevation,
        elevation_relief=profile_res.elevation_relief,
        valid_sample_count=profile_res.valid_sample_count,
        nodata_sample_count=profile_res.nodata_sample_count,
        point_a=profile_res.point_a,
        point_b=profile_res.point_b
    )


@app.post("/api/terrain/qa", response_model=TerrainQAResponse)
async def get_terrain_qa(req: TerrainQARequest) -> TerrainQAResponse:
    """
    Evaluates basic QA indicators, coverage percentages, and capability gating.
    Authority: Phase 4D Specification (Sections 4D.1 - 4D.5)
    """
    if req.elevations_raw_b64:
        elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    else:
        elev_arr = np.zeros((req.height, req.width), dtype=np.float32)

    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=1.0,
        dy=1.0,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit
    )

    return evaluate_terrain_qa(
        grid=grid,
        reference_source=req.reference_source,
        rejection_reason=req.rejection_reason,
        reference_fit=req.reference_fit
    )


@app.post("/api/terrain/los", response_model=LineOfSightResponse)
async def evaluate_line_of_sight(req: LineOfSightRequest) -> LineOfSightResponse:
    """
    Computes deterministic terrain surface line-of-sight between Point A and Point B.
    Authority: Phase 4E Specification (Section 4E.1)
    """
    if not req.elevations_raw_b64:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for line of sight.")

    elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    res = terrain_engine.calculate_line_of_sight(
        grid=grid,
        x_a=req.x_a,
        y_a=req.y_a,
        x_b=req.x_b,
        y_b=req.y_b,
        observer_offset_a=req.observer_offset_a,
        target_offset_b=req.target_offset_b,
        num_samples=req.num_samples
    )

    first_blocking = (
        BlockingPointSchema(
            distance=res.first_blocking_point.distance,
            x=res.first_blocking_point.x,
            y=res.first_blocking_point.y,
            terrain_elevation=res.first_blocking_point.terrain_elevation,
            los_elevation=res.first_blocking_point.los_elevation,
            obstruction=res.first_blocking_point.obstruction
        )
        if res.first_blocking_point
        else None
    )

    samples_schema = [
        LineOfSightSampleSchema(
            distance=s.distance,
            x=s.x,
            y=s.y,
            terrain_elevation=s.terrain_elevation,
            los_elevation=s.los_elevation,
            clearance=s.clearance,
            status=s.status,
            valid=s.valid
        )
        for s in res.samples
    ]

    return LineOfSightResponse(
        is_visible=res.is_visible,
        status=res.status,
        point_a=res.point_a,
        point_b=res.point_b,
        observer_offset_a=res.observer_offset_a,
        target_offset_b=res.target_offset_b,
        total_distance=res.total_distance,
        distance_unit=res.distance_unit,
        elevation_unit=res.elevation_unit,
        is_metric=res.is_metric,
        calibration_state=res.calibration_state,
        first_blocking_point=first_blocking,
        min_clearance=res.min_clearance,
        max_obstruction=res.max_obstruction,
        samples=samples_schema,
        valid_samples=res.valid_samples,
        nodata_samples=res.nodata_samples,
        disclaimer=res.disclaimer
    )


@app.post("/api/terrain/route", response_model=RouteProfileResponse)
async def evaluate_route_profile(req: RouteProfileRequest) -> RouteProfileResponse:
    """
    Computes deterministic route profile assessment along transect A->B.
    Authority: Phase 4E Specification (Section 4E.2)
    """
    if not req.elevations_raw_b64:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for route profile assessment.")

    elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    res = terrain_engine.assess_route_profile(
        grid=grid,
        x_a=req.x_a,
        y_a=req.y_a,
        x_b=req.x_b,
        y_b=req.y_b,
        num_samples=req.num_samples
    )

    samples_schema = [
        RouteProfileSampleSchema(
            distance=s.distance,
            x=s.x,
            y=s.y,
            elevation=s.elevation,
            gradient=s.gradient,
            valid=s.valid
        )
        for s in res.samples
    ]

    return RouteProfileResponse(
        point_a=res.point_a,
        point_b=res.point_b,
        total_distance=res.total_distance,
        distance_unit=res.distance_unit,
        elevation_gain=res.elevation_gain,
        elevation_loss=res.elevation_loss,
        net_elevation_change=res.net_elevation_change,
        max_uphill_gradient=res.max_uphill_gradient,
        max_downhill_gradient=res.max_downhill_gradient,
        mean_absolute_gradient=res.mean_absolute_gradient,
        max_slope=res.max_slope,
        max_slope_unit=res.max_slope_unit,
        max_slope_is_physical=res.max_slope_is_physical,
        classification=res.classification,
        classification_rationale=res.classification_rationale,
        elevation_unit=res.elevation_unit,
        is_metric=res.is_metric,
        calibration_state=res.calibration_state,
        valid_samples_count=res.valid_samples_count,
        nodata_samples_count=res.nodata_samples_count,
        nodata_pct=res.nodata_pct,
        samples=samples_schema,
        disclaimer=res.disclaimer
    )


@app.post("/api/terrain/screening", response_model=TerrainScreeningResponse)
async def evaluate_terrain_screening(req: TerrainScreeningRequest) -> TerrainScreeningResponse:
    """
    Performs transparent rule-based screening over terrain cells.
    Authority: Phase 4E Specification (Section 4E.3)
    """
    if not req.elevations_raw_b64:
        raise HTTPException(status_code=400, detail="elevations_raw_b64 is required for terrain screening.")

    elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit,
        horizontal_unit=req.horizontal_unit,
        has_metric_horizontal_scale=req.has_metric_horizontal_scale
    )

    try:
        res = terrain_engine.screen_terrain_suitability(
            grid=grid,
            max_slope=req.max_slope,
            min_elevation=req.min_elevation,
            max_elevation=req.max_elevation,
            exclude_nodata=req.exclude_nodata
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mask_bytes = np.ascontiguousarray(res.mask, dtype=np.uint8).tobytes()
    mask_b64 = base64.b64encode(mask_bytes).decode("ascii")

    return TerrainScreeningResponse(
        suitable_cells=res.suitable_cells,
        unsuitable_cells=res.unsuitable_cells,
        unknown_cells=res.unknown_cells,
        total_cells=res.total_cells,
        suitable_pct=res.suitable_pct,
        unsuitable_pct=res.unsuitable_pct,
        unknown_pct=res.unknown_pct,
        max_slope_threshold=res.max_slope_threshold,
        slope_unit=res.slope_unit,
        min_elevation_threshold=res.min_elevation_threshold,
        max_elevation_threshold=res.max_elevation_threshold,
        elevation_unit=res.elevation_unit,
        is_calibrated=res.is_calibrated,
        mask_raw_b64=mask_b64,
        disclaimer=res.disclaimer
    )


@app.post("/api/terrain/validation", response_model=TerrainValidationResponse)
async def evaluate_terrain_validation_endpoint(req: TerrainValidationRequest) -> TerrainValidationResponse:
    """
    Executes empirical validation and error analysis against reference data.
    Authority: Phase 5A Specification (Sections 5A.2 - 5A.5)
    """
    if req.elevations_raw_b64:
        elev_arr = decode_depth_raw(req.elevations_raw_b64, (req.height, req.width))
    else:
        elev_arr = np.zeros((req.height, req.width), dtype=np.float32)

    mode = TerrainElevationMode.ABSOLUTE if req.mode == "absolute" else TerrainElevationMode.RELATIVE
    calib_state = TerrainCalibState(req.calibration_state) if req.calibration_state in TerrainCalibState._value2member_map_ else TerrainCalibState.RELATIVE

    grid = terrain_engine.create_grid(
        elevations=elev_arr,
        dx=req.dx,
        dy=req.dy,
        nodata=req.nodata,
        mode=mode,
        calibration_state=calib_state,
        elevation_unit=req.elevation_unit
    )

    ref_arr = None
    if req.reference_elevations_raw_b64:
        ref_arr = decode_depth_raw(req.reference_elevations_raw_b64, (req.height, req.width))

    rel_h = None
    if req.relative_heightfield_raw_b64:
        rel_h = decode_depth_raw(req.relative_heightfield_raw_b64, (req.height, req.width))

    res = terrain_engine.validate_terrain(
        grid=grid,
        reference_elevations=ref_arr,
        relative_heightfield=rel_h,
        reference_source=req.reference_source,
        rejection_reason=req.rejection_reason,
        perform_holdout=req.perform_holdout
    )

    error_map_b64 = None
    if res.error_map is not None:
        error_map_bytes = np.ascontiguousarray(res.error_map, dtype=np.float32).tobytes()
        error_map_b64 = base64.b64encode(error_map_bytes).decode("ascii")

    overall_schema = None
    if res.overall_metrics:
        overall_schema = ValidationMetricsSchema(
            sample_count=res.overall_metrics.sample_count,
            mae=res.overall_metrics.mae,
            rmse=res.overall_metrics.rmse,
            bias=res.overall_metrics.bias,
            pearson_r=res.overall_metrics.pearson_r,
            spearman_r=res.overall_metrics.spearman_r,
            min_error=res.overall_metrics.min_error,
            max_error=res.overall_metrics.max_error,
            median_absolute_error=res.overall_metrics.median_absolute_error,
            p90_absolute_error=res.overall_metrics.p90_absolute_error,
            p95_absolute_error=res.overall_metrics.p95_absolute_error
        )

    calib_fit_schema = None
    if res.calibration_fit_metrics:
        calib_fit_schema = ValidationMetricsSchema(
            sample_count=res.calibration_fit_metrics.sample_count,
            mae=res.calibration_fit_metrics.mae,
            rmse=res.calibration_fit_metrics.rmse,
            bias=res.calibration_fit_metrics.bias,
            pearson_r=res.calibration_fit_metrics.pearson_r,
            spearman_r=res.calibration_fit_metrics.spearman_r,
            min_error=res.calibration_fit_metrics.min_error,
            max_error=res.calibration_fit_metrics.max_error,
            median_absolute_error=res.calibration_fit_metrics.median_absolute_error,
            p90_absolute_error=res.calibration_fit_metrics.p90_absolute_error,
            p95_absolute_error=res.calibration_fit_metrics.p95_absolute_error
        )

    holdout_schema = None
    if res.holdout_metrics:
        holdout_schema = ValidationMetricsSchema(
            sample_count=res.holdout_metrics.sample_count,
            mae=res.holdout_metrics.mae,
            rmse=res.holdout_metrics.rmse,
            bias=res.holdout_metrics.bias,
            pearson_r=res.holdout_metrics.pearson_r,
            spearman_r=res.holdout_metrics.spearman_r,
            min_error=res.holdout_metrics.min_error,
            max_error=res.holdout_metrics.max_error,
            median_absolute_error=res.holdout_metrics.median_absolute_error,
            p90_absolute_error=res.holdout_metrics.p90_absolute_error,
            p95_absolute_error=res.holdout_metrics.p95_absolute_error
        )

    spatial_split_schema = None
    if res.spatial_split:
        spatial_split_schema = SpatialSplitSchema(
            split_name=res.spatial_split.split_name,
            train_description=res.spatial_split.train_description,
            holdout_description=res.spatial_split.holdout_description,
            train_sample_count=res.spatial_split.train_sample_count,
            holdout_sample_count=res.spatial_split.holdout_sample_count,
            generalization_gap_rmse=res.spatial_split.generalization_gap_rmse
        )

    return TerrainValidationResponse(
        status=res.status.value,
        status_label=res.status_label,
        is_independent=res.is_independent,
        reference_source=res.reference_source,
        elevation_unit=res.elevation_unit,
        overall_metrics=overall_schema,
        calibration_fit_metrics=calib_fit_schema,
        holdout_metrics=holdout_schema,
        spatial_split=spatial_split_schema,
        error_min=res.error_min,
        error_max=res.error_max,
        error_mean=res.error_mean,
        error_std=res.error_std,
        error_map_raw_b64=error_map_b64,
        rejection_reason=res.rejection_reason,
        limitations=res.limitations,
        explanatory_notes=res.explanatory_notes,
        disclaimer=res.disclaimer
    )


# =============================================================================
# Geospatial Export & Terrain Analysis Report Endpoints (Phase 5B)
# =============================================================================

@app.post("/api/export/session")
async def export_session_endpoint(session: SessionExport):
    """
    Exports full session state as a canonical machine-readable JSON file.
    """
    try:
        json_str = export_analysis_json(session)
        scene_name = session.input.scene_name or session.input.filename or "session"
        filename = sanitize_export_filename(scene_name, "session", "json")
        return Response(
            content=json_str,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export session: {str(e)}")


@app.post("/api/export/terrain")
async def export_terrain_endpoint(request: TerrainExportRequest):
    """
    Exports terrain raster as calibrated GeoTIFF DSM, relative heightmap raster, or signed error map.
    Strictly gates calibrated GeoTIFF & error map exports based on calibration state.
    """
    # 1. Scientific gating verification
    is_eligible, reason = validate_export_eligibility(request.format, request.calibration_status)
    if not is_eligible:
        raise HTTPException(status_code=400, detail=reason)

    # 2. Decode raw float32 elevation/error raster
    try:
        raw_bytes = base64.b64decode(request.height_data_raw_b64)
        expected_len = request.width * request.height * 4
        if len(raw_bytes) != expected_len:
            raise ValueError(f"Byte buffer length {len(raw_bytes)} does not match {request.width}x{request.height} float32 ({expected_len} bytes)")
        arr = np.frombuffer(raw_bytes, dtype=np.float32).reshape((request.height, request.width))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid raster payload: {str(e)}")

    # 3. Handle affine transform if provided
    affine_trans = None
    if request.transform and len(request.transform) == 6:
        try:
            affine_trans = rasterio.Affine(*request.transform)
        except Exception:
            affine_trans = None

    # 4. Generate raster format
    try:
        if request.format == "geotiff":
            buf = export_calibrated_geotiff(
                elevation_grid=arr,
                crs=request.crs or "EPSG:32610",
                transform=affine_trans,
                nodata=request.nodata if request.nodata is not None else -9999.0,
                ground_resolution_m=request.ground_resolution_m
            )
            filename = sanitize_export_filename(request.scene_name, "dsm", "tif")
            return Response(
                content=buf.getvalue(),
                media_type="image/tiff",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        elif request.format == "relative_geotiff":
            buf = export_relative_heightmap(arr)
            filename = sanitize_export_filename(request.scene_name, "relative_heightfield", "tif")
            return Response(
                content=buf.getvalue(),
                media_type="image/tiff",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        elif request.format == "error_geotiff":
            buf = export_signed_error_geotiff(
                error_grid=arr,
                crs=request.crs or "EPSG:32610",
                transform=affine_trans,
                nodata=request.nodata if request.nodata is not None else -9999.0
            )
            filename = sanitize_export_filename(request.scene_name, "signed_error", "tif")
            return Response(
                content=buf.getvalue(),
                media_type="image/tiff",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported raster format: {request.format}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {str(e)}")


@app.post("/api/export/analysis")
async def export_analysis_endpoint(request: AnalysisExportRequest):
    """
    Exports terrain analytics, measurements, or profiles as JSON, GeoJSON, or CSV.
    """
    try:
        scene_name = request.session.input.scene_name or request.session.input.filename or "analysis"
        if request.format == "json":
            json_str = export_analysis_json(request.session)
            filename = sanitize_export_filename(scene_name, "analysis", "json")
            return Response(
                content=json_str,
                media_type="application/json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        elif request.format == "geojson":
            geojson_str = export_measurements_geojson(request.session)
            filename = sanitize_export_filename(scene_name, "measurements", "geojson")
            return Response(
                content=geojson_str,
                media_type="application/geo+json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        elif request.format == "csv":
            csv_str = export_profile_csv(request.session, tool=request.profile_tool or "cross_section")
            filename = sanitize_export_filename(scene_name, f"profile_{request.profile_tool or 'cross_section'}", "csv")
            return Response(
                content=csv_str,
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported analysis format: {request.format}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis export failed: {str(e)}")


@app.post("/api/export/report")
async def export_report_endpoint(request: ReportExportRequest):
    """
    Generates and returns the 10-section Terrain Analysis Report as HTML or PDF.
    """
    try:
        scene_name = request.session.input.scene_name or request.session.input.filename or "terrain"
        if request.format == "html":
            html_content = generate_html_report(request.session)
            filename = sanitize_export_filename(scene_name, "terrain_report", "html")
            return Response(
                content=html_content,
                media_type="text/html; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        elif request.format == "pdf":
            pdf_bytes = generate_pdf_report(request.session)
            filename = sanitize_export_filename(scene_name, "terrain_report", "pdf")
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported report format: {request.format}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


# =============================================================================
# Static Frontend Serving (Standalone Production Deployment)
# Serves the pre-built React + native Three.js frontend from frontend/dist
# Placed AFTER all /api routes so API endpoints take absolute precedence.
# =============================================================================
_FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _FRONTEND_DIST_DIR.is_dir():
    @app.get("/workspace", include_in_schema=False)
    async def serve_workspace():
        return FileResponse(str(_FRONTEND_DIST_DIR / "index.html"))

    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST_DIR), html=True), name="static_frontend")
