"""
DepthWizard — Robust Affine Scale & Offset Fitting
Authority: Phase 3 Specification (Phases 3.8, 3.9, 3.10, 3.11)

Fits the linear calibration equation:
    E_absolute = a * H_relative + b

where:
    H_relative = model-derived relative surface height
    E_absolute = reference DEM elevation (in meters)
    a = vertical scale factor
    b = vertical offset (in meters)

Includes:
- Robust sample masking and outlier trimming
- Numerically stable least-squares solver (using SVD / np.linalg.lstsq)
- Degenerate fit rejection (near-zero variance, negative/inverted scale)
- Comprehensive residual error statistics (MAE, RMSE, bias, Pearson correlation, median error)
"""

from typing import Tuple, Optional
import numpy as np
from backend.calibration.contracts import (
    CalibrationMethod,
    ResidualMetrics
)


def fit_affine_scale_offset(
    relative_heights: np.ndarray,
    reference_elevations: np.ndarray,
    valid_mask: np.ndarray,
    min_samples: int = 15,
    min_variance: float = 1e-5,
    trim_outliers: bool = True
) -> Tuple[float, float, ResidualMetrics, np.ndarray, CalibrationMethod]:
    """
    Fits vertical scale 'a' and offset 'b' using spatially corresponding valid samples.

    Returns:
        (scale_a, offset_b, residual_metrics, residuals_map, method_used)

    Raises:
        ValueError: with actionable explanation if the sample set is degenerate or insufficient.
    """
    # 1. Finite and Valid Sample Masking
    finite_mask = (
        valid_mask &
        np.isfinite(relative_heights) &
        np.isfinite(reference_elevations)
    )

    n_valid = int(np.count_nonzero(finite_mask))
    if n_valid < min_samples:
        raise ValueError(
            f"Insufficient valid matched samples for calibration: found {n_valid}, minimum required is {min_samples}."
        )

    H_raw = relative_heights[finite_mask].astype(np.float64)
    E_raw = reference_elevations[finite_mask].astype(np.float64)

    # 2. Check Relative Surface Variation
    h_var = float(np.var(H_raw))
    h_span = float(np.max(H_raw) - np.min(H_raw))
    if h_var < min_variance or h_span < 1e-4:
        raise ValueError(
            f"Insufficient relative-surface variation in matched region (span={h_span:.6f}, variance={h_var:.6e}). Scale cannot be estimated."
        )

    # Check Reference Elevation Variation
    e_var = float(np.var(E_raw))
    e_span = float(np.max(E_raw) - np.min(E_raw))
    if e_span < 1e-4:
        raise ValueError(
            f"Reference DEM has near-zero elevation variation (span={e_span:.4f} m). Insufficient relief for affine calibration."
        )

    # 3. Initial Ordinary Least Squares (OLS) Fit: [H, 1] [a; b] = E
    A = np.column_stack([H_raw, np.ones_like(H_raw)])
    params, residuals, rank, s = np.linalg.lstsq(A, E_raw, rcond=None)
    a_init, b_init = float(params[0]), float(params[1])

    if not np.isfinite(a_init) or not np.isfinite(b_init):
        raise ValueError("Least-squares calibration solver produced non-finite parameters (NaN/Inf).")

    active_mask = np.ones(len(H_raw), dtype=bool)
    method_used = CalibrationMethod.AFFINE_OLS

    # 4. Outlier Resistance / Trimming (Phase 3.9)
    # Rejects extreme 2.5% tail residuals on either end to avoid cloud / shadow boundary artifacts
    if trim_outliers and len(H_raw) >= 40:
        res_init = np.abs(E_raw - (a_init * H_raw + b_init))
        cutoff = float(np.percentile(res_init, 97.5))
        inliers = res_init <= cutoff
        if np.count_nonzero(inliers) >= min_samples:
            active_mask = inliers
            A_trim = A[inliers]
            E_trim = E_raw[inliers]
            params_trim, _, _, _ = np.linalg.lstsq(A_trim, E_trim, rcond=None)
            a_fit, b_fit = float(params_trim[0]), float(params_trim[1])
            method_used = CalibrationMethod.AFFINE_ROBUST
        else:
            a_fit, b_fit = a_init, b_init
    else:
        a_fit, b_fit = a_init, b_init

    # 5. Calibration Sanity Checks (Phase 3.10)
    if not np.isfinite(a_fit) or not np.isfinite(b_fit):
        raise ValueError("Calibrated affine parameters are non-finite.")

    if abs(a_fit) < 1e-6:
        raise ValueError(
            f"Fitted vertical scale factor is effectively zero (scale={a_fit:.2e}). Calibration rejected."
        )

    if a_fit <= 0:
        # Inverted scale indicates fundamental contradiction with display convention
        raise ValueError(
            f"Fitted vertical scale factor is non-positive (scale={a_fit:.4f}). Surface relief contradicts reference trend."
        )

    # 6. Compute Residual Metrics on Matched Samples (Phase 3.11)
    H_fit = H_raw[active_mask]
    E_fit = E_raw[active_mask]
    E_pred = a_fit * H_fit + b_fit
    diff = E_pred - E_fit

    mae = float(np.mean(np.abs(diff)))
    rmse = float(np.sqrt(np.mean(diff ** 2)))
    bias = float(np.mean(diff))
    median_ae = float(np.median(np.abs(diff)))

    # Pearson correlation coefficient between predicted and reference
    if np.std(E_pred) > 1e-6 and np.std(E_fit) > 1e-6:
        corr_matrix = np.corrcoef(E_pred, E_fit)
        correlation = float(corr_matrix[0, 1])
    else:
        correlation = 0.0

    sample_count = int(len(H_fit))

    metrics = ResidualMetrics(
        mae=round(mae, 3),
        rmse=round(rmse, 3),
        bias=round(bias, 3),
        correlation=round(correlation, 4),
        sample_count=sample_count,
        median_absolute_error=round(median_ae, 3)
    )

    # 7. Construct Full 2D Residuals Map (for Error Map Foundation)
    residuals_map = np.full(relative_heights.shape, np.nan, dtype=np.float32)
    pred_full = a_fit * relative_heights + b_fit
    residuals_map[finite_mask] = (pred_full - reference_elevations)[finite_mask]

    return a_fit, b_fit, metrics, residuals_map, method_used
