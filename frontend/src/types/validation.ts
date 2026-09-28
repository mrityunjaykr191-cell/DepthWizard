/**
 * DepthWizard — Phase 5A Validation & Error Analysis Contracts
 * Authority: Phase 5A Specification & docs/product/output-contract.md
 * 
 * SCIENTIFIC CONTRACT RULES:
 * 1. Distinguishes in-sample calibration residuals (REFERENCE_FIT) from
 *    independent spatial generalization (INDEPENDENT_VALIDATION).
 * 2. In-sample residuals MUST NOT be claimed as independent accuracy.
 * 3. Relative or calibration-rejected terrains MUST NOT produce metric error claims.
 */

export type ValidationStatus = 
  | 'VALIDATION_NOT_AVAILABLE'
  | 'REFERENCE_FIT'
  | 'INDEPENDENT_VALIDATION';

export interface ValidationMetrics {
  sample_count: number;
  mae: number;
  rmse: number;
  bias: number;
  pearson_r?: number | null;
  spearman_r?: number | null;
  min_error: number;
  max_error: number;
  median_absolute_error?: number | null;
  p90_absolute_error?: number | null;
  p95_absolute_error?: number | null;
}

export interface SpatialSplitInfo {
  split_name: string;
  train_description: string;
  holdout_description: string;
  train_sample_count: number;
  holdout_sample_count: number;
  generalization_gap_rmse: number;
}

export interface TerrainValidationRequest {
  elevations_raw_b64?: string;
  reference_elevations_raw_b64?: string;
  relative_heightfield_raw_b64?: string;
  width: number;
  height: number;
  dx?: number;
  dy?: number;
  nodata?: number | null;
  mode?: 'relative' | 'absolute';
  calibration_state: 'relative' | 'calibrated' | 'calibration_rejected' | 'unavailable';
  elevation_unit?: string;
  reference_source?: string;
  rejection_reason?: string;
  perform_holdout?: boolean;
}

export interface TerrainValidationResponse {
  status: ValidationStatus;
  status_label: string;
  is_independent: boolean;
  reference_source?: string | null;
  elevation_unit: string;
  overall_metrics?: ValidationMetrics | null;
  calibration_fit_metrics?: ValidationMetrics | null;
  holdout_metrics?: ValidationMetrics | null;
  spatial_split?: SpatialSplitInfo | null;
  error_min?: number | null;
  error_max?: number | null;
  error_mean?: number | null;
  error_std?: number | null;
  error_map_raw_b64?: string | null;
  rejection_reason?: string | null;
  limitations?: string[];
  explanatory_notes: string;
  disclaimer: string;
}
