/**
 * DepthWizard — Advanced Terrain Intelligence Types
 * Authority: Phase 4E Specification (Sections 4E.1, 4E.2, 4E.3)
 */

export interface BlockingPoint {
  distance: number;
  x: number;
  y: number;
  terrain_elevation: number;
  los_elevation: number;
  obstruction: number;
}

export interface LineOfSightSample {
  distance: number;
  x: number;
  y: number;
  terrain_elevation: number | null;
  los_elevation: number;
  clearance: number | null;
  status: 'VISIBLE' | 'BLOCKED' | 'UNKNOWN';
  valid: boolean;
}

export interface LineOfSightRequest {
  x_a: number;
  y_a: number;
  x_b: number;
  y_b: number;
  observer_offset_a?: number;
  target_offset_b?: number;
  num_samples?: number;
  elevations_raw_b64?: string | null;
  width: number;
  height: number;
  dx?: number;
  dy?: number;
  has_metric_horizontal_scale?: boolean;
  horizontal_unit?: string;
  nodata?: number | null;
  mode?: string;
  calibration_state?: string;
  elevation_unit?: string | null;
}

export interface LineOfSightResponse {
  is_visible: boolean;
  status: 'VISIBLE' | 'BLOCKED' | 'UNKNOWN';
  point_a: [number, number];
  point_b: [number, number];
  observer_offset_a: number;
  target_offset_b: number;
  total_distance: number;
  distance_unit: string;
  elevation_unit: string;
  is_metric: boolean;
  calibration_state: string;
  first_blocking_point?: BlockingPoint | null;
  min_clearance?: number | null;
  max_obstruction: number;
  samples: LineOfSightSample[];
  valid_samples: number;
  nodata_samples: number;
  disclaimer: string;
}

export interface RouteProfileSample {
  distance: number;
  x: number;
  y: number;
  elevation: number | null;
  gradient: number | null;
  valid: boolean;
}

export interface RouteProfileRequest {
  x_a: number;
  y_a: number;
  x_b: number;
  y_b: number;
  num_samples?: number;
  elevations_raw_b64?: string | null;
  width: number;
  height: number;
  dx?: number;
  dy?: number;
  has_metric_horizontal_scale?: boolean;
  horizontal_unit?: string;
  nodata?: number | null;
  mode?: string;
  calibration_state?: string;
  elevation_unit?: string | null;
}

export interface RouteProfileResponse {
  point_a: [number, number];
  point_b: [number, number];
  total_distance: number;
  distance_unit: string;
  elevation_gain: number;
  elevation_loss: number;
  net_elevation_change?: number | null;
  max_uphill_gradient: number;
  max_downhill_gradient: number;
  mean_absolute_gradient: number;
  max_slope?: number | null;
  max_slope_unit: string;
  max_slope_is_physical: boolean;
  classification: string;
  classification_rationale: string;
  elevation_unit: string;
  is_metric: boolean;
  calibration_state: string;
  valid_samples_count: number;
  nodata_samples_count: number;
  nodata_pct: number;
  samples: RouteProfileSample[];
  disclaimer: string;
}

export interface TerrainScreeningRequest {
  max_slope?: number | null;
  min_elevation?: number | null;
  max_elevation?: number | null;
  exclude_nodata?: boolean;
  elevations_raw_b64?: string | null;
  width: number;
  height: number;
  dx?: number;
  dy?: number;
  has_metric_horizontal_scale?: boolean;
  horizontal_unit?: string;
  nodata?: number | null;
  mode?: string;
  calibration_state?: string;
  elevation_unit?: string | null;
}

export interface TerrainScreeningResponse {
  suitable_cells: number;
  unsuitable_cells: number;
  unknown_cells: number;
  total_cells: number;
  suitable_pct: number;
  unsuitable_pct: number;
  unknown_pct: number;
  max_slope_threshold?: number | null;
  slope_unit: string;
  min_elevation_threshold?: number | null;
  max_elevation_threshold?: number | null;
  elevation_unit: string;
  is_calibrated: boolean;
  mask_raw_b64?: string | null;
  disclaimer: string;
}
