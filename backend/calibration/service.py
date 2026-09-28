"""
DepthWizard — Geospatial Calibration Service Orchestrator
Authority: Phase 3 Specification & docs/architecture/backend.md

Coordinates the end-to-end transformation of a model-derived RelativeHeightfield
into an absolute metric Digital Surface Model (DSM).
Ensures zero fabricated coordinates or units.
"""

from typing import Optional, Dict, Any
import numpy as np
import rasterio

from backend.calibration.contracts import (
    CalibrationInput,
    CalibrationResult,
    CalibrationStatus,
    ReferenceSourceType,
    GeospatialMetadata
)
from backend.calibration.providers.cartodem import CartoDEMProvider
from backend.calibration.providers.srtm import SRTMProvider
from backend.calibration.fitting import fit_affine_scale_offset


class CalibrationService:
    """
    Authoritative geospatial calibration orchestrator.
    """

    def __init__(self, data_dir: Optional[str] = None):
        self._cartodem_provider = CartoDEMProvider(data_dir=data_dir)
        self._srtm_provider = SRTMProvider(data_dir=data_dir)

    def get_provider(self, source_type: ReferenceSourceType):
        if source_type == ReferenceSourceType.CARTODEM:
            return self._cartodem_provider
        elif source_type == ReferenceSourceType.SRTM:
            return self._srtm_provider
        else:
            raise ValueError(f"Unsupported reference source type: '{source_type}'")

    def calibrate(self, calib_input: CalibrationInput) -> CalibrationResult:
        """
        Executes coordinate-aware spatial alignment, valid sample masking,
        least-squares affine scale & offset estimation, and metric elevation field construction.
        """
        source_meta = calib_input.source_metadata
        rel_heights = calib_input.relative_heightfield

        # 1. Geospatial Input Requirement (Phase 3.3 & 3.17)
        if not source_meta.georeferenced or not source_meta.crs or not source_meta.transform:
            return CalibrationResult(
                status=CalibrationStatus.UNAVAILABLE,
                failure_reason="Source imagery is non-georeferenced (lacks valid CRS and affine transform). Automatic DEM calibration requires geospatial coordinates."
            )

        # 2. Validate Relative Heightfield Dimensions
        if rel_heights is None or rel_heights.size == 0:
            return CalibrationResult(
                status=CalibrationStatus.FAILED,
                failure_reason="Input relative heightfield is empty or None."
            )

        expected_shape = (source_meta.height, source_meta.width)
        if rel_heights.shape != expected_shape:
            # Attempt 1D to 2D reshape if total size matches
            if rel_heights.size == source_meta.width * source_meta.height:
                rel_heights = rel_heights.reshape(expected_shape)
            else:
                return CalibrationResult(
                    status=CalibrationStatus.FAILED,
                    failure_reason=f"Heightfield dimensions {rel_heights.shape} do not match metadata {expected_shape}."
                )

        # 3. Resolve Reference Provider
        try:
            provider = self.get_provider(calib_input.reference_source)
        except Exception as err:
            return CalibrationResult(
                status=CalibrationStatus.FAILED,
                failure_reason=f"Failed to initialize reference provider: {err}"
            )

        # 4. Reference DEM Acquisition & Spatial Alignment (Phase 3.5 & 3.6)
        try:
            ref_elevations, valid_mask, sampling_meta = provider.sample_elevation_grid(
                source_metadata=source_meta,
                file_override=calib_input.reference_dem_override
            )
        except FileNotFoundError as err:
            return CalibrationResult(
                status=CalibrationStatus.FAILED,
                failure_reason=str(err),
                reference_source=provider.get_source_name()
            )
        except Exception as err:
            return CalibrationResult(
                status=CalibrationStatus.FAILED,
                failure_reason=f"Spatial alignment error with reference DEM: {err}",
                reference_source=provider.get_source_name()
            )

        alignment_meta = sampling_meta.get("alignment")

        # 5. Overlap Check (Phase 3.6 & 3.10)
        if alignment_meta and alignment_meta.overlap_fraction < 0.05:
            return CalibrationResult(
                status=CalibrationStatus.FAILED,
                failure_reason=f"Insufficient spatial overlap between source footprint and reference DEM coverage ({alignment_meta.overlap_fraction * 100:.1f}%). Minimum 5% required.",
                reference_source=provider.get_source_name(),
                alignment=alignment_meta
            )

        # Incorporate optional external mask if provided
        if calib_input.masks is not None and calib_input.masks.shape == valid_mask.shape:
            valid_mask = valid_mask & calib_input.masks

        # 6. Robust Affine Scale + Offset Fit (Phase 3.9 & 3.10)
        try:
            scale_a, offset_b, metrics, residuals_map, method_used = fit_affine_scale_offset(
                relative_heights=rel_heights,
                reference_elevations=ref_elevations,
                valid_mask=valid_mask,
                min_samples=15,
                trim_outliers=True
            )
        except ValueError as err:
            return CalibrationResult(
                status=CalibrationStatus.FAILED,
                failure_reason=f"Calibration fit rejected: {err}",
                reference_source=provider.get_source_name(),
                alignment=alignment_meta
            )

        # 7. Absolute DSM Generation (Phase 3.13)
        # Formula: E_absolute = a * H_relative + b
        calibrated_dsm = (scale_a * rel_heights.astype(np.float64) + offset_b).astype(np.float32)

        # 8. Compute Calibrated Elevation Field Statistics
        min_elev = float(np.min(calibrated_dsm))
        max_elev = float(np.max(calibrated_dsm))
        mean_elev = float(np.mean(calibrated_dsm))

        # 9. Provenance Tracking (Phase 3.23)
        provenance = {
            "source_crs": source_meta.crs,
            "reference_source": provider.get_source_name(),
            "reference_tile": sampling_meta.get("tile_path"),
            "reference_crs": sampling_meta.get("reference_crs"),
            "nominal_resolution_m": provider.get_nominal_resolution_m(),
            "vertical_datum": provider.get_vertical_datum(),
            "calibration_method": method_used.value,
            "scale": scale_a,
            "offset": offset_b,
            "sample_count": metrics.sample_count,
            "mae_m": metrics.mae,
            "rmse_m": metrics.rmse,
            "bias_m": metrics.bias,
            "correlation": metrics.correlation,
            "elevation_unit": "meters"
        }

        return CalibrationResult(
            status=CalibrationStatus.CALIBRATED,
            calibrated_elevation=calibrated_dsm,
            scale=round(scale_a, 6),
            offset=round(offset_b, 3),
            elevation_unit="meters",
            elevation_min=round(min_elev, 2),
            elevation_max=round(max_elev, 2),
            elevation_mean=round(mean_elev, 2),
            method=method_used,
            reference_source=calib_input.reference_source.value,
            reference_crs=sampling_meta.get("reference_crs"),
            vertical_reference=provider.get_vertical_datum(),
            alignment=alignment_meta,
            residuals=metrics,
            residuals_map=residuals_map,
            provenance=provenance
        )
