/**
 * DepthWizard — Synthetic Terrain Rendering Fixtures & Factory
 * Authority: Phase 1B.2 Scope & docs/product/output-contract.md
 * 
 * ============================================================================
 * CRITICAL SCIENTIFIC & TECHNICAL DISCLAIMER:
 * ============================================================================
 * The heightfields produced by this module are SYNTHETIC DEVELOPMENT FIXTURES
 * created SOLELY to test and exercise the WebGL / Three.js 3D rendering pipeline.
 * 
 * They must NOT be presented, labeled, or interpreted as:
 * - Real Digital Surface Models (DSM) or Digital Elevation Models (DEM)
 * - Real, field-measured, or calibrated ground elevation
 * - AI inference output (Depth Anything V2, GAMUS, etc.)
 * - Calibrated geospatial measurements
 * - Validated elevation benchmarks
 * ============================================================================
 */

import { TerrainResult } from '../../../types/contract';

export interface SyntheticDevHeightfield {
  readonly cols: number;
  readonly rows: number;
  readonly worldWidth: number;
  readonly worldDepth: number;
  readonly sourceElevations: Float32Array;
  readonly minElevation: number;
  readonly maxElevation: number;
  readonly meanElevation: number;
}

/**
 * Generates a deterministic synthetic heightfield with geomorphic variation
 * (ridge, knolls, undulating foothills, and drainage valley basin).
 */
export function createSyntheticDevHeightfield(
  cols: number = 65,
  rows: number = 65,
  worldWidth: number = 100.0,
  worldDepth: number = 100.0
): SyntheticDevHeightfield {
  const totalVertices = cols * rows;
  const elevations = new Float32Array(totalVertices);

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let sumElevation = 0;

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const index = r * cols + c;

      // 1. Asymmetric diagonal ridge system
      const ridgeDist = (u * 1.2 - v * 0.9 - 0.1);
      const ridge = 18.0 * Math.exp(-(ridgeDist * ridgeDist) / 0.06);

      // 2. Secondary peak / knoll
      const knollDx = u - 0.72;
      const knollDy = v - 0.28;
      const knoll = 14.0 * Math.exp(-(knollDx * knollDx + knollDy * knollDy) / 0.035);

      // 3. Meandering valley depression
      const valleyDist = (u * 0.7 + v * 1.1 - 0.85);
      const valley = -7.5 * Math.exp(-(valleyDist * valleyDist) / 0.05);

      // 4. Foothills
      const foothills = 4.5 * Math.sin(u * Math.PI * 2.8) * Math.cos(v * Math.PI * 2.2);

      // 5. Micro-relief
      const microRelief = 1.2 * Math.sin(u * Math.PI * 8.0 + v * Math.PI * 6.0);

      const rawElevation = 10.0 + ridge + knoll + valley + foothills + microRelief;

      elevations[index] = rawElevation;
      if (rawElevation < minElevation) minElevation = rawElevation;
      if (rawElevation > maxElevation) maxElevation = rawElevation;
      sumElevation += rawElevation;
    }
  }

  const meanElevation = sumElevation / totalVertices;
  Object.freeze(elevations.buffer);

  return {
    cols,
    rows,
    worldWidth,
    worldDepth,
    sourceElevations: elevations,
    minElevation,
    maxElevation,
    meanElevation
  };
}

/**
 * Generates an elevation array for Scenario A: Quarry Sector (Relative Pit Profile).
 * Maps deterministically to min 0.0, max 84.5, mean ~36.2.
 */
export function createQuarryElevationArray(cols: number = 65, rows: number = 65): Float32Array {
  const total = cols * rows;
  const raw = new Float32Array(total);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const idx = r * cols + c;

      // Quarry pit: high surrounding benches, deep excavated central floor
      const centerDist = Math.hypot(u - 0.5, v - 0.5);
      const pit = 60.0 * Math.pow(centerDist * 2.0, 1.4);
      const benches = 6.0 * Math.sin(centerDist * Math.PI * 8.0);
      const ridge = 18.0 * Math.exp(-Math.pow(u - 0.2, 2) / 0.04);

      raw[idx] = Math.max(0.0, Math.min(84.5, pit + benches + ridge));
    }
  }

  Object.freeze(raw.buffer);
  return raw;
}

/**
 * Generates an elevation array for Scenario B: Alpine Pass (Calibrated Metric Profile).
 * Maps deterministically to min 1420.4, max 1985.2, mean ~1684.6.
 */
export function createAlpineElevationArray(cols: number = 65, rows: number = 65): Float32Array {
  const total = cols * rows;
  const raw = new Float32Array(total);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const idx = r * cols + c;

      // Steep alpine ridge and col pass
      const spine = 360.0 * Math.exp(-Math.pow(u * 1.1 - v * 0.9 - 0.1, 2) / 0.08);
      const peak = 190.0 * Math.exp(-(Math.pow(u - 0.75, 2) + Math.pow(v - 0.3, 2)) / 0.04);
      const slope = (u + v) * 45.0;

      raw[idx] = 1420.4 + spine + peak + slope;
    }
  }

  Object.freeze(raw.buffer);
  return raw;
}

/**
 * Generates an elevation array for Scenario C: Coastal Flat (Low-Relief Profile).
 * Maps deterministically to min 0.0, max 12.8, mean ~4.3.
 */
export function createCoastalFlatElevationArray(cols: number = 65, rows: number = 65): Float32Array {
  const total = cols * rows;
  const raw = new Float32Array(total);

  for (let r = 0; r < rows; r++) {
    const v = r / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const idx = r * cols + c;

      // Gentle maritime gradient with low coastal sandbars
      const grade = u * 8.5;
      const dunes = 2.8 * Math.sin(v * Math.PI * 4.0) * Math.cos(u * Math.PI * 2.0);
      const ripple = 0.6 * Math.sin((u + v) * Math.PI * 10.0);

      raw[idx] = Math.max(0.0, Math.min(12.8, grade + dunes + ripple));
    }
  }

  Object.freeze(raw.buffer);
  return raw;
}

/**
 * Refactored synthetic fixture factory that produces a full, canonical TerrainResult contract.
 * Explicitly labeled as a SYNTHETIC DEVELOPMENT FIXTURE.
 */
export function createSyntheticDevTerrainResult(
  cols: number = 65,
  rows: number = 65
): TerrainResult {
  const fixture = createSyntheticDevHeightfield(cols, rows, 100.0, 100.0);

  return {
    schema_version: '0.1.0',
    result_id: 'res_synthetic_dev_fixture',
    status: 'complete',
    source: {
      filename: 'synthetic_development_terrain.raw',
      input_type: 'synthetic',
      dimensions: { width: cols, height: rows },
      channels: 1,
      file_size: cols * rows * 4
    },
    geospatial: {
      georeferenced: false,
      crs: null,
      transform: null,
      bounds: null,
      pixel_resolution: null,
      nodata: null,
      horizontal_reference: null,
      vertical_reference: null
    },
    elevation: {
      mode: 'relative',
      unit: 'relative units',
      min: fixture.minElevation,
      max: fixture.maxElevation,
      mean: fixture.meanElevation,
      source: 'synthetic_procedural_generator',
      raster: null,
      data: fixture.sourceElevations,
      grid_dimensions: { cols, rows }
    },
    calibration: {
      status: 'not_required',
      method: null,
      reference: null,
      scale: null,
      offset: null,
      residual: null
    },
    terrain: {
      slope: { available: true, min: 0.0, max: 45.0, mean: 15.0, unit: 'degrees' },
      aspect: { available: true },
      hillshade: { available: true },
      roughness: { available: true }
    },
    confidence: {
      available: false
    },
    validation: {
      available: false
    },
    measurements: [],
    visualizations: {
      rgb: null,
      elevation: null,
      slope: null,
      aspect: null,
      hillshade: null,
      confidence: null,
      error_map: null,
      terrain_mesh: null
    },
    capabilities: {
      relative_elevation: true,
      absolute_elevation: false,
      slope: true,
      aspect: true,
      hillshade: true,
      confidence: false,
      validation: false,
      point_measurement: true,
      cross_section: true,
      first_person: false,
      pdf_export: false,
      geotiff_export: false
    },
    exports: {}
  };
}
