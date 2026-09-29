/**
 * DepthWizard — Interactive Terrain Measurement Service
 * Authority: Phase 4B Specification & docs/architecture/frontend.md
 * 
 * Provides typed API clients to query backend terrain analytics endpoints:
 * - /api/terrain/probe: Height Probe (elevation, local slope, downhill aspect)
 * - /api/terrain/measure: Two-Point Delta (horizontal distance, delta z, 3D dist, slope)
 * - /api/terrain/profile: Cross-Section (bilinear profile transect sampling)
 */

import { apiUrl } from './api';

export interface PointProbeRequest {
  x: number;
  y: number;
  elevations_raw_b64: string;
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

export interface PointProbeResponse {
  x: number;
  y: number;
  valid: boolean;
  elevation: number | null;
  unit: string;
  is_metric: boolean;
  mode: string;
  calibration_state: string;
  slope: number | null;
  slope_unit: string;
  slope_is_physical: boolean;
  aspect: number | null;
  is_flat: boolean;
  out_of_bounds: boolean;
  is_nodata: boolean;
  failure_reason?: string | null;
}

export interface TwoPointMeasureRequest {
  x_a: number;
  y_a: number;
  x_b: number;
  y_b: number;
  elevations_raw_b64: string;
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

export interface TwoPointMeasureResponse {
  point_a: PointProbeResponse;
  point_b: PointProbeResponse;
  horizontal_distance: number;
  horizontal_unit: string;
  has_metric_horizontal_scale: boolean;
  elevation_delta: number | null;
  elevation_unit: string;
  straight_line_3d_distance: number | null;
  slope_between_points: number | null;
  slope_unit: string;
  slope_is_physical: boolean;
  calibration_state: string;
  valid: boolean;
  failure_reason?: string | null;
}

export interface ProfileSample {
  distance: number;
  x: number;
  y: number;
  elevation: number | null;
  valid: boolean;
}

export interface CrossSectionRequest {
  x_a: number;
  y_a: number;
  x_b: number;
  y_b: number;
  num_samples?: number;
  elevations_raw_b64: string;
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

export interface CrossSectionResponse {
  samples: ProfileSample[];
  total_distance: number;
  distance_unit: string;
  elevation_unit: string;
  is_metric: boolean;
  calibration_state: string;
  min_elevation: number | null;
  max_elevation: number | null;
  elevation_relief: number | null;
  valid_sample_count: number;
  nodata_sample_count: number;
  point_a: [number, number];
  point_b: [number, number];
}

/**
 * Executes a continuous height probe at coordinates (x, y) on the terrain raster.
 */
export async function probeTerrainPoint(req: PointProbeRequest): Promise<PointProbeResponse> {
  const resp = await fetch(apiUrl('/api/terrain/probe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Terrain probe failed (${resp.status}): ${errorText}`);
  }

  return resp.json();
}

/**
 * Computes two-point delta metrics between Point A and Point B.
 */
export async function measureTwoPoints(req: TwoPointMeasureRequest): Promise<TwoPointMeasureResponse> {
  const resp = await fetch(apiUrl('/api/terrain/measure'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Two-point measurement failed (${resp.status}): ${errorText}`);
  }

  return resp.json();
}

/**
 * Extracts a cross-section elevation profile along transect A->B.
 */
export async function getCrossSectionProfile(req: CrossSectionRequest): Promise<CrossSectionResponse> {
  const resp = await fetch(apiUrl('/api/terrain/profile'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Cross-section profile failed (${resp.status}): ${errorText}`);
  }

  return resp.json();
}

export interface TerrainAnalyticsRequest {
  elevations_raw_b64: string;
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
  sun_azimuth_deg?: number;
  sun_altitude_deg?: number;
}

export interface TerrainAnalyticsResponse {
  status: string;
  grid_dimensions: { rows: number; cols: number };
  calibration_state: string;
  elevation_mode: string;
  elevation_unit: string;
  horizontal_spacing: { dx: number; dy: number };
  has_metric_horizontal_scale: boolean;
  statistics: {
    min: number | null;
    max: number | null;
    mean: number | null;
    median: number | null;
    std: number | null;
    relief: number | null;
    p5: number | null;
    p25: number | null;
    p75: number | null;
    p95: number | null;
    valid_count: number;
    nodata_count: number;
    total_count: number;
    unit: string;
    is_metric: boolean;
  };
  slope: {
    unit: string;
    is_physical: boolean;
    method: string;
    min: number | null;
    max: number | null;
    mean: number | null;
    warning?: string | null;
  };
  aspect: {
    convention: string;
    valid_count: number;
    flat_count: number;
    nodata_count: number;
  };
  hillshade: {
    sun_azimuth_deg: number;
    sun_altitude_deg: number;
    is_visualization_only: boolean;
  };
  slope_raw_b64?: string | null;
  aspect_raw_b64?: string | null;
  hillshade_raw_b64?: string | null;
}

/**
 * Computes full terrain analytics (slope, aspect, hillshade, statistics) from canonical TerrainGrid.
 * Authority: Phase 4A & Phase 4C Specification
 */
export async function fetchTerrainAnalytics(req: TerrainAnalyticsRequest): Promise<TerrainAnalyticsResponse> {
  const resp = await fetch(apiUrl('/api/terrain/analytics'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Terrain analytics request failed (${resp.status}): ${errorText}`);
  }

  return resp.json();
}

import { TerrainQARequest, TerrainQAResponse } from '../types/qa';

/**
 * Queries authoritative backend QA indicators, coverage percentages, and capability gating.
 * Authority: Phase 4D Specification
 */
export async function fetchTerrainQA(req: TerrainQARequest): Promise<TerrainQAResponse> {
  const resp = await fetch(apiUrl('/api/terrain/qa'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Terrain QA request failed (${resp.status}): ${errorText}`);
  }

  return resp.json();
}


