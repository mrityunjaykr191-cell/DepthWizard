/**
 * DepthWizard — Phase 4D Scientific Status & QA Contracts
 * Authority: Phase 4D Specification & docs/product/output-contract.md
 */

export type ScientificStatus = 
  | 'RELATIVE' 
  | 'CALIBRATED' 
  | 'CALIBRATION_REJECTED' 
  | 'CALIBRATION_UNAVAILABLE';

export interface ReferenceFitMetrics {
  reference_source: string;
  mae?: number | null;
  rmse?: number | null;
  bias?: number | null;
  correlation?: number | null;
  sample_count?: number | null;
}

export interface TerrainQARequest {
  elevations_raw_b64?: string;
  width: number;
  height: number;
  nodata?: number | null;
  mode: 'relative' | 'absolute';
  calibration_state: 'relative' | 'calibrated' | 'calibration_rejected' | 'unavailable';
  elevation_unit?: string;
  reference_source?: string;
  rejection_reason?: string;
  reference_fit?: ReferenceFitMetrics;
}

export interface TerrainQAResponse {
  status: string;
  calibration_state: 'relative' | 'calibrated' | 'calibration_rejected' | 'unavailable';
  status_label: ScientificStatus;
  elevation_mode: 'relative' | 'absolute';
  elevation_unit: string;
  is_metric: boolean;
  total_cells: number;
  valid_cells: number;
  valid_pct: number;
  nodata_cells: number;
  nodata_pct: number;
  elevation_min?: number | null;
  elevation_max?: number | null;
  relief?: number | null;
  derivatives_valid: boolean;
  capabilities: {
    relative_elevation: boolean;
    relative_gradient: boolean;
    aspect: boolean;
    hillshade: boolean;
    height_probe: boolean;
    two_point_relative: boolean;
    metric_elevation: boolean;
    physical_slope_degrees: boolean;
    metric_3d_distance: boolean;
    two_point_metric: boolean;
    cross_section_metric: boolean;
    [key: string]: boolean;
  };
  reference_source?: string | null;
  rejection_reason?: string | null;
  reference_fit?: ReferenceFitMetrics | null;
  disclaimer: string;
}
