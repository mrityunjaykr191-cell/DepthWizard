/**
 * DepthWizard — Geospatial Export & Terrain Analysis Report Types
 * Authority: docs/product/output-contract.md & Phase 5B Specification
 */

export type ExportFormat = 
  | 'session'
  | 'geotiff_dsm'
  | 'relative_heightfield'
  | 'error_map_geotiff'
  | 'analysis_json'
  | 'measurements_geojson'
  | 'profile_csv'
  | 'report_html'
  | 'report_pdf';

export interface InputMetadataExport {
  filename: string;
  format: string;
  width: number;
  height: number;
  scene_name?: string;
  file_size_bytes?: number;
  georeferenced: boolean;
  crs?: string | null;
  pixel_resolution_x?: number | null;
  pixel_resolution_y?: number | null;
  resolution_unit?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  affine_transform?: number[] | null;
  nodata?: number | null;
}

export interface ModelProvenanceExport {
  provider: string;
  model_name: string;
  checkpoint_file?: string | null;
  checkpoint?: string | null;
  fine_tuned_dataset?: string | null;
  inference_width: number;
  inference_height: number;
  surface_convention: string;
  is_fine_tuned: boolean;
  elevation_mode: string;
}

export interface TerrainSummaryExport {
  rows: number;
  cols: number;
  total_cells: number;
  valid_cells: number;
  nodata_cells: number;
  valid_percentage: number;
  nodata_percentage: number;
  elevation_min: number;
  elevation_max: number;
  elevation_mean: number;
  elevation_median?: number | null;
  elevation_std?: number | null;
  relief: number;
  elevation_relief?: number | null;
  elevation_mode?: string;
  unit: string;
  is_metric: boolean;
}

export interface CalibrationExport {
  scientific_status: string;
  status_label: string;
  reference_source?: string | null;
  method?: string | null;
  scale?: number | null;
  offset?: number | null;
  sample_count?: number | null;
  mae?: number | null;
  rmse?: number | null;
  bias?: number | null;
  correlation?: number | null;
  rejection_reason?: string | null;
  is_metric_eligible: boolean;
}

export interface TerrainAnalyticsExport {
  slope_available: boolean;
  slope_min?: number | null;
  slope_max?: number | null;
  slope_mean?: number | null;
  slope_unit: string;
  slope_is_physical: boolean;
  aspect_available: boolean;
  aspect_convention: string;
  hillshade_available: boolean;
  hillshade_azimuth_deg?: number | null;
  hillshade_altitude_deg?: number | null;
}

export interface ValidationMetricsExport {
  sample_count: number;
  rmse: number;
  mae: number;
  bias: number;
  pearson_r?: number | null;
  spearman_r?: number | null;
  min_error?: number | null;
  max_error?: number | null;
  p90_error?: number | null;
}

export interface SpatialHoldoutExport {
  split_name: string;
  train_description: string;
  holdout_description: string;
  train_sample_count: number;
  holdout_sample_count: number;
  generalization_gap_rmse: number;
  val_rmse: number;
  val_mae: number;
}

export interface ValidationSessionExport {
  status: string;
  is_independent: boolean;
  reference_source?: string | null;
  overall_fit?: ValidationMetricsExport | null;
  spatial_holdout?: SpatialHoldoutExport | null;
  error_min?: number | null;
  error_max?: number | null;
  error_mean?: number | null;
  error_std?: number | null;
  has_error_map: boolean;
  disclaimer: string;
}

export interface SessionExport {
  schema_version: string;
  session_id: string;
  exported_at: string;
  scientific_status: string;
  is_metric: boolean;
  input: InputMetadataExport;
  processing: ModelProvenanceExport;
  terrain: TerrainSummaryExport;
  calibration: CalibrationExport;
  analytics: TerrainAnalyticsExport;
  measurements: Record<string, any>;
  validation: ValidationSessionExport;
  scientific_limitations: string[];
  available_exports: Record<string, boolean>;
}

export interface TerrainExportParams {
  format: 'geotiff' | 'relative_geotiff' | 'error_geotiff';
  height_data_raw_b64: string;
  width: number;
  height: number;
  scene_name: string;
  calibration_status: string;
  crs?: string;
  transform?: number[];
  ground_resolution_m?: number;
  nodata?: number;
}
