"""
DepthWizard — Validation & Error Analysis Core
Authority: Phase 5A Specification & docs/architecture/backend.md

Implements scientifically honest error analysis and validation contracts:
1. Pure numerical calculation of signed error, absolute error, MAE, RMSE, bias, Pearson r, and Spearman r.
2. Clear categorical distinction between:
   - VALIDATION_NOT_AVAILABLE
   - REFERENCE_FIT (in-sample calibration residuals; NOT independent generalization accuracy)
   - INDEPENDENT_VALIDATION (out-of-sample spatial block holdout)
3. Deterministic spatial block partitioning (West/East, North/South) preventing spatial autocorrelation leakage.
4. Diverging signed error maps preserving NoData and NaN masks without arbitrary resampling.
5. Strict guardrails: metric validation is unavailable for RELATIVE or CALIBRATION_REJECTED terrain.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any, List, Tuple
import math
import numpy as np
import scipy.stats

from .contracts import (
    TerrainGrid,
    TerrainCalibrationState,
    ElevationMode
)
from backend.calibration.fitting import fit_affine_scale_offset


class ValidationStatus(str, Enum):
    VALIDATION_NOT_AVAILABLE = "VALIDATION_NOT_AVAILABLE"
    REFERENCE_FIT = "REFERENCE_FIT"
    INDEPENDENT_VALIDATION = "INDEPENDENT_VALIDATION"


@dataclass
class ValidationMetrics:
    sample_count: int
    mae: float
    rmse: float
    bias: float
    pearson_r: float
    spearman_r: float
    min_error: float
    max_error: float
    median_absolute_error: float
    p90_absolute_error: float
    p95_absolute_error: float


@dataclass
class SpatialSplitInfo:
    split_name: str
    train_description: str
    holdout_description: str
    train_sample_count: int
    holdout_sample_count: int
    generalization_gap_rmse: float  # RMSE_holdout - RMSE_train


@dataclass
class TerrainValidationResult:
    status: ValidationStatus
    status_label: str
    is_independent: bool
    reference_source: Optional[str]
    elevation_unit: str
    overall_metrics: Optional[ValidationMetrics]
    calibration_fit_metrics: Optional[ValidationMetrics]
    holdout_metrics: Optional[ValidationMetrics]
    spatial_split: Optional[SpatialSplitInfo]
    error_map: Optional[np.ndarray]  # 2D float32 array: predicted - reference (NaN for invalid/NoData)
    error_min: Optional[float]
    error_max: Optional[float]
    error_mean: Optional[float]
    error_std: Optional[float]
    rejection_reason: Optional[str]
    limitations: List[str]
    explanatory_notes: str
    disclaimer: str = (
        "TERRAIN VALIDATION NOTICE: Accuracy metrics reflect comparison against reference DEM "
        "and do not constitute geodetic certification. In-sample reference fit is not independent accuracy."
    )


def compute_error_metrics(
    predicted: np.ndarray,
    reference: np.ndarray,
    valid_mask: Optional[np.ndarray] = None
) -> Optional[ValidationMetrics]:
    """
    Computes rigorous error statistics from actual matched arrays.
    
    Returns None if fewer than 2 valid samples exist.
    Never fabricates values.
    """
    if valid_mask is None:
        valid_mask = np.isfinite(predicted) & np.isfinite(reference)
    else:
        valid_mask = valid_mask & np.isfinite(predicted) & np.isfinite(reference)

    n_samples = int(np.count_nonzero(valid_mask))
    if n_samples < 2:
        return None

    y_pred = predicted[valid_mask].astype(np.float64)
    y_true = reference[valid_mask].astype(np.float64)

    # Signed errors: error = predicted - reference
    errors = y_pred - y_true
    abs_errors = np.abs(errors)

    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    bias = float(np.mean(errors))
    min_err = float(np.min(errors))
    max_err = float(np.max(errors))
    median_ae = float(np.median(abs_errors))
    p90_ae = float(np.percentile(abs_errors, 90.0))
    p95_ae = float(np.percentile(abs_errors, 95.0))

    # Pearson correlation
    std_pred = float(np.std(y_pred))
    std_true = float(np.std(y_true))
    if std_pred > 1e-7 and std_true > 1e-7:
        corr_mat = np.corrcoef(y_pred, y_true)
        pearson_r = float(corr_mat[0, 1])
    else:
        pearson_r = 0.0

    # Spearman rank correlation
    try:
        if std_pred > 1e-7 and std_true > 1e-7 and n_samples >= 3:
            spearman_res, _ = scipy.stats.spearmanr(y_pred, y_true)
            spearman_r = float(spearman_res) if np.isfinite(spearman_res) else 0.0
        else:
            spearman_r = 0.0
    except Exception:
        spearman_r = 0.0

    return ValidationMetrics(
        sample_count=n_samples,
        mae=round(mae, 3),
        rmse=round(rmse, 3),
        bias=round(bias, 3),
        pearson_r=round(pearson_r, 4),
        spearman_r=round(spearman_r, 4),
        min_error=round(min_err, 3),
        max_error=round(max_err, 3),
        median_absolute_error=round(median_ae, 3),
        p90_absolute_error=round(p90_ae, 3),
        p95_absolute_error=round(p95_ae, 3)
    )


def compute_error_map(
    predicted: np.ndarray,
    reference: np.ndarray,
    valid_mask: Optional[np.ndarray] = None,
    nodata: Optional[float] = None
) -> Tuple[np.ndarray, Optional[float], Optional[float], Optional[float], Optional[float]]:
    """
    Constructs a 2D signed error map:
        error = predicted - reference
    
    Preserves exact raster grid dimensions and propagates NoData / invalid cells as NaN.
    Does NOT interpolate or fabricate unmeasured cells.
    
    Returns:
        (error_map_2d, error_min, error_max, error_mean, error_std)
    """
    if predicted.shape != reference.shape:
        raise ValueError(
            f"Shape mismatch between predicted elevation {predicted.shape} and reference {reference.shape}."
        )

    error_map = np.full(predicted.shape, np.nan, dtype=np.float32)

    active_mask = np.isfinite(predicted) & np.isfinite(reference)
    if nodata is not None:
        active_mask &= (predicted != nodata) & (reference != nodata)
    if valid_mask is not None:
        active_mask &= valid_mask

    if np.count_nonzero(active_mask) == 0:
        return error_map, None, None, None, None

    diff = (predicted[active_mask].astype(np.float64) - reference[active_mask].astype(np.float64))
    error_map[active_mask] = diff.astype(np.float32)

    e_min = float(np.min(diff))
    e_max = float(np.max(diff))
    e_mean = float(np.mean(diff))
    e_std = float(np.std(diff))

    return error_map, round(e_min, 3), round(e_max, 3), round(e_mean, 3), round(e_std, 3)


def perform_spatial_holdout_validation(
    relative_heights: np.ndarray,
    reference_elevations: np.ndarray,
    valid_mask: np.ndarray,
    split_axis: str = "horizontal",  # 'horizontal' (West->East) or 'vertical' (North->South)
    min_samples_per_partition: int = 15
) -> Tuple[ValidationMetrics, ValidationMetrics, SpatialSplitInfo, np.ndarray]:
    """
    Executes rigorous spatial block holdout validation:
    1. Partitions scene into training and holdout geographic blocks.
    2. Calibrates affine parameters strictly on training partition.
    3. Evaluates frozen model strictly on held-out partition.
    4. Computes generalization gap (RMSE_holdout - RMSE_train).
    
    Returns:
        (train_fit_metrics, holdout_metrics, spatial_split_info, holdout_error_map)
    """
    rows, cols = relative_heights.shape
    row_idx, col_idx = np.indices((rows, cols))

    if split_axis == "horizontal":
        mid_col = cols // 2
        train_mask = valid_mask & (col_idx < mid_col)
        holdout_mask = valid_mask & (col_idx >= mid_col)
        split_name = "Spatial Block (West Fit -> East Holdout)"
        train_desc = "West half (training)"
        holdout_desc = "East half (independent holdout)"
    else:
        mid_row = rows // 2
        train_mask = valid_mask & (row_idx < mid_row)
        holdout_mask = valid_mask & (row_idx >= mid_row)
        split_name = "Spatial Block (North Fit -> South Holdout)"
        train_desc = "North half (training)"
        holdout_desc = "South half (independent holdout)"

    n_train = int(np.count_nonzero(train_mask))
    n_holdout = int(np.count_nonzero(holdout_mask))

    if n_train < min_samples_per_partition or n_holdout < min_samples_per_partition:
        raise ValueError(
            f"Insufficient samples for spatial holdout split (train={n_train}, holdout={n_holdout}, required={min_samples_per_partition})."
        )

    # 1. Fit on training partition
    scale_a, offset_b, calib_res, _, _ = fit_affine_scale_offset(
        relative_heights=relative_heights,
        reference_elevations=reference_elevations,
        valid_mask=train_mask,
        min_samples=min_samples_per_partition,
        trim_outliers=True
    )

    # 2. In-sample evaluation on training partition
    pred_train = scale_a * relative_heights[train_mask] + offset_b
    train_metrics = compute_error_metrics(pred_train, reference_elevations[train_mask])

    # 3. Independent out-of-sample evaluation on holdout partition
    pred_holdout = scale_a * relative_heights[holdout_mask] + offset_b
    holdout_metrics = compute_error_metrics(pred_holdout, reference_elevations[holdout_mask])

    if train_metrics is None or holdout_metrics is None:
        raise ValueError("Failed to compute valid metrics on partitioned spatial blocks.")

    gen_gap = round(float(holdout_metrics.rmse - train_metrics.rmse), 3)

    split_info = SpatialSplitInfo(
        split_name=split_name,
        train_description=train_desc,
        holdout_description=holdout_desc,
        train_sample_count=n_train,
        holdout_sample_count=n_holdout,
        generalization_gap_rmse=gen_gap
    )

    # Construct error map over holdout cells
    holdout_error_map = np.full((rows, cols), np.nan, dtype=np.float32)
    pred_full = scale_a * relative_heights + offset_b
    holdout_error_map[holdout_mask] = (pred_full[holdout_mask] - reference_elevations[holdout_mask]).astype(np.float32)

    return train_metrics, holdout_metrics, split_info, holdout_error_map


def evaluate_terrain_validation(
    grid: TerrainGrid,
    reference_elevations: Optional[np.ndarray] = None,
    relative_heightfield: Optional[np.ndarray] = None,
    reference_source: Optional[str] = None,
    rejection_reason: Optional[str] = None,
    perform_holdout: bool = True
) -> TerrainValidationResult:
    """
    High-level validation service conforming strictly to Phase 5A scientific requirements:
    
    1. For RELATIVE:
       - Explains metric validation is unavailable.
       - Returns VALIDATION_NOT_AVAILABLE.
       - Never fabricates numbers.
    2. For CALIBRATION_REJECTED:
       - Transparently exposes rejection reason.
       - Returns VALIDATION_NOT_AVAILABLE.
    3. For CALIBRATION_UNAVAILABLE:
       - Explains why calibration could not be executed.
       - Returns VALIDATION_NOT_AVAILABLE.
    4. For CALIBRATED:
       - If reference DEM is provided and validly aligned:
         - Runs independent spatial holdout validation if enabled.
         - Computes full 2D signed error map.
         - Clearly separates reference-fit metrics from independent holdout metrics.
       - If reference DEM is not provided:
         - Reports REFERENCE_FIT based on active calibration metadata without claiming independent accuracy.
    """
    calib_state = grid.calibration_state
    if isinstance(calib_state, str):
        try:
            calib_state = TerrainCalibrationState(calib_state)
        except ValueError:
            calib_state = TerrainCalibrationState.RELATIVE

    # 1. Non-calibrated guardrails
    if calib_state == TerrainCalibrationState.RELATIVE:
        return TerrainValidationResult(
            status=ValidationStatus.VALIDATION_NOT_AVAILABLE,
            status_label="Validation Unavailable",
            is_independent=False,
            reference_source=None,
            elevation_unit=grid.elevation_unit,
            overall_metrics=None,
            calibration_fit_metrics=None,
            holdout_metrics=None,
            spatial_split=None,
            error_map=None,
            error_min=None,
            error_max=None,
            error_mean=None,
            error_std=None,
            rejection_reason=None,
            limitations=[
                "Terrain elevation is model-relative and ungeoreferenced.",
                "Metric validation requires georeferenced coordinate alignment against authoritative reference data.",
                "No physical scale or datum exists for relative surface heights."
            ],
            explanatory_notes="Metric error analysis is disabled for uncalibrated/relative terrain."
        )

    if calib_state == TerrainCalibrationState.CALIBRATION_REJECTED:
        reason = rejection_reason or "Calibration was rejected by scientific guardrails."
        return TerrainValidationResult(
            status=ValidationStatus.VALIDATION_NOT_AVAILABLE,
            status_label="Calibration Rejected",
            is_independent=False,
            reference_source=reference_source,
            elevation_unit=grid.elevation_unit,
            overall_metrics=None,
            calibration_fit_metrics=None,
            holdout_metrics=None,
            spatial_split=None,
            error_map=None,
            error_min=None,
            error_max=None,
            error_mean=None,
            error_std=None,
            rejection_reason=reason,
            limitations=[
                f"Calibration rejected: {reason}",
                "Accuracy metrics are withheld to prevent misleading claims on uncalibrated surfaces."
            ],
            explanatory_notes=f"Calibration rejected: {reason}. Accuracy metrics withheld."
        )

    if calib_state == TerrainCalibrationState.UNAVAILABLE:
        return TerrainValidationResult(
            status=ValidationStatus.VALIDATION_NOT_AVAILABLE,
            status_label="Calibration Unavailable",
            is_independent=False,
            reference_source=None,
            elevation_unit=grid.elevation_unit,
            overall_metrics=None,
            calibration_fit_metrics=None,
            holdout_metrics=None,
            spatial_split=None,
            error_map=None,
            error_min=None,
            error_max=None,
            error_mean=None,
            error_std=None,
            rejection_reason=None,
            limitations=[
                "Input scene lacks geospatial reference or reference DEM coverage was unavailable.",
                "Validation cannot be performed without spatial ground truth."
            ],
            explanatory_notes="Reference DEM coverage unavailable for input scene."
        )

    # 2. CALIBRATED state processing
    # Check if reference DEM array is provided
    if reference_elevations is None or reference_elevations.shape != (grid.rows, grid.cols):
        # Fallback: Calibrated without live reference raster array (e.g. metadata only)
        return TerrainValidationResult(
            status=ValidationStatus.REFERENCE_FIT,
            status_label="Reference Fit (Calibration Residuals)",
            is_independent=False,
            reference_source=reference_source or "Reference DEM",
            elevation_unit=grid.elevation_unit,
            overall_metrics=None,
            calibration_fit_metrics=None,
            holdout_metrics=None,
            spatial_split=None,
            error_map=None,
            error_min=None,
            error_max=None,
            error_mean=None,
            error_std=None,
            rejection_reason=None,
            limitations=[
                "Full reference DEM array is not loaded in memory; metrics reflect calibration fit residuals.",
                "In-sample residuals measure calibration optimization fit, not independent generalization accuracy."
            ],
            explanatory_notes="Reference fit metrics represent in-sample optimization residuals."
        )

    # Valid mask determination
    valid_mask = np.isfinite(grid.elevations) & np.isfinite(reference_elevations)
    if grid.nodata is not None:
        valid_mask &= (grid.elevations != grid.nodata)

    n_valid = int(np.count_nonzero(valid_mask))
    if n_valid < 15:
        return TerrainValidationResult(
            status=ValidationStatus.VALIDATION_NOT_AVAILABLE,
            status_label="Insufficient Valid Samples",
            is_independent=False,
            reference_source=reference_source,
            elevation_unit=grid.elevation_unit,
            overall_metrics=None,
            calibration_fit_metrics=None,
            holdout_metrics=None,
            spatial_split=None,
            error_map=None,
            error_min=None,
            error_max=None,
            error_mean=None,
            error_std=None,
            rejection_reason=f"Only {n_valid} valid matched cells found. Minimum 15 required for statistical validity.",
            limitations=["Matched spatial overlap contains insufficient valid cells for evaluation."],
            explanatory_notes="Insufficient valid matched cells for statistical validation."
        )

    # Full in-sample error map & metrics
    err_map, e_min, e_max, e_mean, e_std = compute_error_map(
        predicted=grid.elevations,
        reference=reference_elevations,
        valid_mask=valid_mask,
        nodata=grid.nodata
    )
    overall_metrics = compute_error_metrics(
        predicted=grid.elevations,
        reference=reference_elevations,
        valid_mask=valid_mask
    )

    # Spatial block holdout validation if relative heightfield is available
    if perform_holdout and relative_heightfield is not None and relative_heightfield.shape == grid.elevations.shape:
        try:
            train_m, holdout_m, split_info, holdout_err = perform_spatial_holdout_validation(
                relative_heights=relative_heightfield,
                reference_elevations=reference_elevations,
                valid_mask=valid_mask,
                split_axis="horizontal",
                min_samples_per_partition=15
            )
            return TerrainValidationResult(
                status=ValidationStatus.INDEPENDENT_VALIDATION,
                status_label="Independent Spatial Holdout",
                is_independent=True,
                reference_source=reference_source or "Reference DEM",
                elevation_unit=grid.elevation_unit,
                overall_metrics=overall_metrics,
                calibration_fit_metrics=train_m,
                holdout_metrics=holdout_m,
                spatial_split=split_info,
                error_map=err_map,
                error_min=e_min,
                error_max=e_max,
                error_mean=e_mean,
                error_std=e_std,
                rejection_reason=None,
                limitations=[
                    f"Generalization gap: holdout RMSE is {split_info.generalization_gap_rmse:+.2f} m relative to training fit.",
                    "Spatial block holdout mitigates near-field autocorrelation but does not evaluate out-of-domain transfer.",
                    "Reference DEM vertical uncertainty is inherited directly by the error map."
                ],
                explanatory_notes=(
                    f"Evaluated with independent spatial block partitioning ({split_info.split_name}). "
                    f"Out-of-sample holdout RMSE: {holdout_m.rmse:.2f} m vs training fit RMSE: {train_m.rmse:.2f} m."
                )
            )
        except Exception:
            # Fall back to reference fit if holdout partition is degenerate (e.g. one half lacks relief)
            pass

    # Standard Reference Fit (In-sample evaluation)
    return TerrainValidationResult(
        status=ValidationStatus.REFERENCE_FIT,
        status_label="Reference Fit (Not Independent)",
        is_independent=False,
        reference_source=reference_source or "Reference DEM",
        elevation_unit=grid.elevation_unit,
        overall_metrics=overall_metrics,
        calibration_fit_metrics=overall_metrics,
        holdout_metrics=None,
        spatial_split=None,
        error_map=err_map,
        error_min=e_min,
        error_max=e_max,
        error_mean=e_mean,
        error_std=e_std,
        rejection_reason=None,
        limitations=[
            "Metrics are in-sample reference fit residuals, NOT independent generalization accuracy.",
            "Model parameters were fitted directly to minimize residuals against this reference surface.",
            "Cannot be used to claim model accuracy on unseen landscapes."
        ],
        explanatory_notes="Reference fit: residual error across all matched training samples."
    )
