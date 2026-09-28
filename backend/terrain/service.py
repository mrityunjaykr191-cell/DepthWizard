"""
DepthWizard — Unified Terrain Analytics Engine & Service
Authority: Phase 4A Specification & docs/architecture/backend.md

Coordinates all core terrain analytical operations on canonical TerrainGrid instances:
- Continuous elevation queries with bilinear interpolation
- Defensible finite-difference slope (degrees or relative gradient)
- Compass aspect with flat-terrain detection
- Directional photometric hillshade
- Descriptive elevation statistics ignoring NoData
Strictly guarantees source array immutability and vertical exaggeration invariance.
"""

from typing import Optional, Dict, Any, Tuple
import numpy as np

from .contracts import (
    TerrainGrid,
    ElevationMode,
    TerrainCalibrationState,
    ElevationQueryResult,
    SlopeResult,
    AspectResult,
    HillshadeResult,
    TerrainStatistics
)
from .elevation import elevation_at
from .slope import compute_slope
from .aspect import compute_aspect
from .hillshade import compute_hillshade
from .statistics import compute_statistics
from .measurement import (
    PointProbeResult,
    TwoPointMeasurementResult,
    CrossSectionResult,
    ProfileSample,
    probe_point,
    measure_two_points,
    sample_cross_section
)
from .intelligence import (
    LineOfSightResult,
    RouteProfileResult,
    TerrainScreeningResult,
    calculate_line_of_sight,
    assess_route_profile,
    screen_terrain_suitability
)
from .validation import (
    ValidationStatus,
    ValidationMetrics,
    SpatialSplitInfo,
    TerrainValidationResult,
    compute_error_metrics,
    compute_error_map,
    perform_spatial_holdout_validation,
    evaluate_terrain_validation
)


class TerrainAnalyticsEngine:
    """
    Authoritative service orchestrating pure terrain analytics algorithms.
    """

    @staticmethod
    def create_grid(
        elevations: np.ndarray,
        dx: float = 1.0,
        dy: float = 1.0,
        nodata: Optional[float] = None,
        mode: ElevationMode = ElevationMode.RELATIVE,
        calibration_state: TerrainCalibrationState = TerrainCalibrationState.RELATIVE,
        elevation_unit: Optional[str] = None,
        horizontal_unit: str = "pixels",
        has_metric_horizontal_scale: bool = False,
        crs: Optional[str] = None,
        transform: Optional[Tuple[float, float, float, float, float, float]] = None
    ) -> TerrainGrid:
        """
        Factory helper to construct a strictly validated, immutable TerrainGrid.
        """
        if elevations.ndim != 2:
            raise ValueError(f"Elevations must be 2D array, got shape {elevations.shape}")

        rows, cols = elevations.shape

        # Default unit strings
        if elevation_unit is None:
            if calibration_state == TerrainCalibrationState.CALIBRATED and mode == ElevationMode.ABSOLUTE:
                elevation_unit = "meters"
            else:
                elevation_unit = "relative units"

        # Copy array as read-only Float32 to guarantee immutability
        elev_copy = elevations.astype(np.float32, copy=True)
        elev_copy.flags.writeable = False

        return TerrainGrid(
            elevations=elev_copy,
            rows=rows,
            cols=cols,
            dx=float(dx),
            dy=float(dy),
            nodata=float(nodata) if nodata is not None else None,
            mode=mode,
            calibration_state=calibration_state,
            elevation_unit=elevation_unit,
            horizontal_unit=horizontal_unit,
            has_metric_horizontal_scale=has_metric_horizontal_scale,
            crs=crs,
            transform=transform
        )

    @staticmethod
    def create_grid_from_terrain_result(result_dict: Dict[str, Any]) -> TerrainGrid:
        """
        Constructs a TerrainGrid directly from a canonical TerrainResult dictionary or payload.
        Extracts elevation array, dimensions, geospatial resolution, and calibration status.
        """
        elev_obj = result_dict.get("elevation", {})
        calib_obj = result_dict.get("calibration", {})
        geo_obj = result_dict.get("geospatial", {})

        # 1. Resolve Elevation Array
        data = elev_obj.get("data")
        dims = elev_obj.get("grid_dimensions")
        if dims:
            cols = int(dims.get("cols", 0))
            rows = int(dims.get("rows", 0))
        else:
            cols = 0
            rows = 0

        if data is None:
            raise ValueError("TerrainResult contains no elevation data.")

        if isinstance(data, list):
            elev_arr = np.array(data, dtype=np.float32)
        elif isinstance(data, np.ndarray):
            elev_arr = data.astype(np.float32)
        else:
            raise ValueError(f"Unsupported elevation data type: {type(data)}")

        if elev_arr.ndim == 1:
            if rows > 0 and cols > 0 and elev_arr.size == rows * cols:
                elev_arr = elev_arr.reshape((rows, cols))
            else:
                raise ValueError(f"Cannot reshape 1D elevation of size {elev_arr.size} to {cols}x{rows}")
        elif elev_arr.ndim == 2:
            rows, cols = elev_arr.shape

        # 2. Resolve Calibration & Mode
        mode_str = str(elev_obj.get("mode", "relative")).lower()
        mode = ElevationMode.ABSOLUTE if mode_str == "absolute" else ElevationMode.RELATIVE

        calib_status_str = str(calib_obj.get("status", "unavailable")).lower()
        if calib_status_str in ("calibrated", "successful"):
            calib_state = TerrainCalibrationState.CALIBRATED
        elif calib_status_str in ("calibration_rejected", "rejected", "failed"):
            calib_state = TerrainCalibrationState.CALIBRATION_REJECTED
        elif calib_status_str == "not_required":
            calib_state = TerrainCalibrationState.RELATIVE
        else:
            calib_state = TerrainCalibrationState.UNAVAILABLE

        # 3. Resolve Units and Horizontal Resolution
        elev_unit = elev_obj.get("unit")
        georeferenced = bool(geo_obj.get("georeferenced", False))
        pixel_res = geo_obj.get("pixel_resolution")
        crs = geo_obj.get("crs")
        transform = geo_obj.get("transform")

        dx, dy = 1.0, 1.0
        has_metric_scale = False
        horizontal_unit = "pixels"

        if georeferenced and pixel_res is not None:
            if isinstance(pixel_res, dict):
                dx = float(pixel_res.get("x", 1.0))
                dy = float(pixel_res.get("y", 1.0))
            elif isinstance(pixel_res, (int, float)):
                dx = float(pixel_res)
                dy = float(pixel_res)

            # Check if CRS is projected metric (e.g. UTM)
            if crs and ("UTM" in crs.upper() or "326" in crs or "327" in crs or "EPSG:3857" in crs.upper()):
                has_metric_scale = True
                horizontal_unit = "meters"

        nodata_val = geo_obj.get("nodata")

        return TerrainAnalyticsEngine.create_grid(
            elevations=elev_arr,
            dx=dx,
            dy=dy,
            nodata=nodata_val,
            mode=mode,
            calibration_state=calib_state,
            elevation_unit=elev_unit,
            horizontal_unit=horizontal_unit,
            has_metric_horizontal_scale=has_metric_scale,
            crs=crs,
            transform=tuple(transform) if transform else None
        )

    def elevation_at(self, grid: TerrainGrid, x: float, y: float) -> ElevationQueryResult:
        return elevation_at(grid, x, y)

    def compute_slope(self, grid: TerrainGrid, method: str = "horn_finite_difference") -> SlopeResult:
        return compute_slope(grid, method=method)

    def compute_aspect(self, grid: TerrainGrid, flat_threshold: float = 1e-6) -> AspectResult:
        return compute_aspect(grid, flat_threshold=flat_threshold)

    def compute_hillshade(
        self,
        grid: TerrainGrid,
        sun_azimuth_deg: float = 315.0,
        sun_altitude_deg: float = 45.0,
        z_factor: float = 1.0
    ) -> HillshadeResult:
        return compute_hillshade(
            grid,
            sun_azimuth_deg=sun_azimuth_deg,
            sun_altitude_deg=sun_altitude_deg,
            z_factor=z_factor
        )

    def compute_statistics(self, grid: TerrainGrid) -> TerrainStatistics:
        return compute_statistics(grid)

    def probe_point(self, grid: TerrainGrid, x: float, y: float) -> PointProbeResult:
        return probe_point(grid, x, y)

    def measure_two_points(
        self, grid: TerrainGrid, x_a: float, y_a: float, x_b: float, y_b: float
    ) -> TwoPointMeasurementResult:
        return measure_two_points(grid, x_a, y_a, x_b, y_b)

    def sample_cross_section(
        self, grid: TerrainGrid, x_a: float, y_a: float, x_b: float, y_b: float, num_samples: Optional[int] = None
    ) -> CrossSectionResult:
        return sample_cross_section(grid, x_a, y_a, x_b, y_b, num_samples=num_samples)

    def calculate_line_of_sight(
        self,
        grid: TerrainGrid,
        x_a: float, y_a: float,
        x_b: float, y_b: float,
        observer_offset_a: float = 0.0,
        target_offset_b: float = 0.0,
        num_samples: Optional[int] = None,
        tolerance: float = 1e-4
    ) -> LineOfSightResult:
        return calculate_line_of_sight(
            grid, x_a, y_a, x_b, y_b,
            observer_offset_a=observer_offset_a,
            target_offset_b=target_offset_b,
            num_samples=num_samples,
            tolerance=tolerance
        )

    def assess_route_profile(
        self,
        grid: TerrainGrid,
        x_a: float, y_a: float,
        x_b: float, y_b: float,
        num_samples: Optional[int] = None
    ) -> RouteProfileResult:
        return assess_route_profile(grid, x_a, y_a, x_b, y_b, num_samples=num_samples)

    def screen_terrain_suitability(
        self,
        grid: TerrainGrid,
        max_slope: Optional[float] = None,
        min_elevation: Optional[float] = None,
        max_elevation: Optional[float] = None,
        exclude_nodata: bool = True
    ) -> TerrainScreeningResult:
        return screen_terrain_suitability(
            grid,
            max_slope=max_slope,
            min_elevation=min_elevation,
            max_elevation=max_elevation,
            exclude_nodata=exclude_nodata
        )

    def run_full_analytics(
        self,
        grid: TerrainGrid,
        sun_azimuth_deg: float = 315.0,
        sun_altitude_deg: float = 45.0
    ) -> Dict[str, Any]:
        """
        Runs comprehensive analytics on the grid and packages results with full provenance.
        """
        stats = self.compute_statistics(grid)
        slope = self.compute_slope(grid)
        aspect = self.compute_aspect(grid)
        hillshade = self.compute_hillshade(
            grid, sun_azimuth_deg=sun_azimuth_deg, sun_altitude_deg=sun_altitude_deg
        )

        return {
            "grid_dimensions": {"cols": grid.cols, "rows": grid.rows},
            "calibration_state": grid.calibration_state.value,
            "elevation_mode": grid.mode.value,
            "elevation_unit": grid.elevation_unit,
            "horizontal_spacing": {"dx": grid.dx, "dy": grid.dy, "unit": grid.horizontal_unit},
            "has_metric_horizontal_scale": grid.has_metric_horizontal_scale,
            "statistics": {
                "min": stats.min,
                "max": stats.max,
                "mean": stats.mean,
                "median": stats.median,
                "std": stats.std,
                "relief": stats.relief,
                "p5": stats.p5,
                "p25": stats.p25,
                "p75": stats.p75,
                "p95": stats.p95,
                "valid_count": stats.valid_count,
                "nodata_count": stats.nodata_count,
                "total_count": stats.total_count,
                "unit": stats.unit,
                "is_metric": stats.is_metric
            },
            "slope": {
                "unit": slope.unit.value,
                "is_physical": slope.is_physical,
                "method": slope.method,
                "min": slope.min_slope,
                "max": slope.max_slope,
                "mean": slope.mean_slope,
                "warning": slope.warning
            },
            "aspect": {
                "convention": aspect.convention,
                "valid_count": aspect.valid_count,
                "flat_count": aspect.flat_count,
                "nodata_count": aspect.nodata_count
            },
            "hillshade": {
                "sun_azimuth_deg": hillshade.azimuth_deg,
                "sun_altitude_deg": hillshade.altitude_deg,
                "is_visualization_only": True
            }
        }

    @staticmethod
    def validate_terrain(
        grid: TerrainGrid,
        reference_elevations: Optional[np.ndarray] = None,
        relative_heightfield: Optional[np.ndarray] = None,
        reference_source: Optional[str] = None,
        rejection_reason: Optional[str] = None,
        perform_holdout: bool = True
    ) -> TerrainValidationResult:
        """
        Executes empirical validation and error analysis against reference data.
        Authority: Phase 5A Specification (Sections 5A.2 - 5A.5)
        """
        return evaluate_terrain_validation(
            grid=grid,
            reference_elevations=reference_elevations,
            relative_heightfield=relative_heightfield,
            reference_source=reference_source,
            rejection_reason=rejection_reason,
            perform_holdout=perform_holdout
        )

