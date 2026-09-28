/**
 * DepthWizard — Canonical Fixture Scenarios
 * Authority: docs/implementation-brief.md (Section 5)
 *
 * DEVELOPER NOTE — FIXTURE DATA STATUS:
 * All numerical elevation values, calibration parameters (scale/offset/residuals),
 * confidence scores, validation metrics (RMSE, MAE, correlation), reference datasets,
 * and geographic coordinates in this file are SYNTHETIC FIXTURE DATA created solely
 * for UI testing, capability gating verification, and interface state exercising in Phase 1.
 * They do NOT represent real model benchmark claims, calibrated probabilities, or genuine
 * field measurements. The TerrainResult contract is strictly preserved without modification.
 */

import { TerrainResult } from '../types/contract';
import { 
  createQuarryElevationArray, 
  createAlpineElevationArray, 
  createCoastalFlatElevationArray 
} from '../components/workspace/terrain/terrainFixture';

export type ScenarioId = 
  | 'scenario-a' 
  | 'scenario-b' 
  | 'scenario-c' 
  | 'scenario-d-processing' 
  | 'scenario-d-error';

export interface ScenarioMeta {
  id: ScenarioId;
  name: string;
  description: string;
  category: 'A: Relative' | 'B: Calibrated' | 'C: Limited' | 'D: Processing / Error';
}

export const SCENARIO_METAS: ScenarioMeta[] = [
  {
    id: 'scenario-a',
    name: 'Scenario A — Relative JPG/PNG Result',
    description: 'Ungeoreferenced optical image. Relative elevation only; metric values and geographic coordinates are unavailable.',
    category: 'A: Relative'
  },
  {
    id: 'scenario-b',
    name: 'Scenario B — Calibrated GeoTIFF Result',
    description: 'Georeferenced satellite tile with DEM-calibrated metric elevation, UTM coordinates, and LiDAR benchmark validation.',
    category: 'B: Calibrated'
  },
  {
    id: 'scenario-c',
    name: 'Scenario C — Deliberately Unavailable Capabilities',
    description: 'Low-contrast aerial scene where calibration failed, confidence is unavailable, and cross-section is disabled.',
    category: 'C: Limited'
  },
  {
    id: 'scenario-d-processing',
    name: 'Scenario D1 — Processing State',
    description: 'Job in-flight: Height estimation and surface normals actively computing.',
    category: 'D: Processing / Error'
  },
  {
    id: 'scenario-d-error',
    name: 'Scenario D2 — Ingestion Error State',
    description: 'Unrecoverable format/header failure with clear technical diagnostic code.',
    category: 'D: Processing / Error'
  }
];

export const SCENARIO_A: TerrainResult = {
  schema_version: '0.1.0',
  result_id: 'res_01J8K9A2M9QW8',
  status: 'complete',
  source: {
    filename: 'aerial_quarry_sector4.png',
    input_type: 'png',
    dimensions: { width: 1024, height: 1024 },
    channels: 3,
    file_size: 2489120
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
    min: 0.0,
    max: 84.5,
    mean: 36.2,
    source: 'depth_anything_v2_vits_gamus',
    raster: '/fixtures/rasters/scenario_a_relative.bin',
    data: createQuarryElevationArray(65, 65),
    grid_dimensions: { cols: 65, rows: 65 }
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
    slope: {
      available: true,
      min: 0.0,
      max: 68.4,
      mean: 18.2,
      unit: 'degrees'
    },
    aspect: {
      available: true
    },
    hillshade: {
      available: true
    },
    roughness: {
      available: true
    }
  },
  confidence: {
    available: true,
    method: 'learned_vs_physical_disagreement',
    overall: 0.82,
    raster: '/fixtures/rasters/scenario_a_confidence.bin'
  },
  validation: {
    available: false,
    reference: null,
    rmse: null,
    mae: null,
    correlation: null,
    error_map: null
  },
  measurements: [
    {
      id: 'm-001',
      type: 'point',
      geometry: { coordinates: [480, 520] },
      values: { relative_height: 42.8 },
      units: { relative_height: 'rel' },
      timestamp: '2026-09-12T21:04:12Z',
      label: 'Pit Floor Center'
    },
    {
      id: 'm-002',
      type: 'line',
      geometry: { coordinates: [[320, 310], [610, 590]] },
      values: { pixel_distance: 410.2, relative_elevation_delta: 28.4, slope: 21.6 },
      units: { pixel_distance: 'px', relative_elevation_delta: 'rel', slope: 'deg' },
      timestamp: '2026-09-12T21:05:40Z',
      label: 'North Face Traverse'
    }
  ],
  visualizations: {
    rgb: '/fixtures/textures/scenario_a_rgb.jpg',
    elevation: '/fixtures/textures/scenario_a_elevation.png',
    slope: '/fixtures/textures/scenario_a_slope.png',
    aspect: '/fixtures/textures/scenario_a_aspect.png',
    hillshade: '/fixtures/textures/scenario_a_hillshade.png',
    confidence: '/fixtures/textures/scenario_a_confidence.png',
    error_map: null,
    terrain_mesh: null
  },
  capabilities: {
    relative_elevation: true,
    absolute_elevation: false,
    slope: true,
    aspect: true,
    hillshade: true,
    confidence: true,
    validation: false,
    point_measurement: true,
    cross_section: true,
    first_person: true,
    pdf_export: true,
    geotiff_export: false
  },
  exports: {
    rdsm: {
      available: true,
      format: 'PNG / Relative DSM 16-bit',
      path_or_id: 'export_rdsm_01',
      status: 'ready'
    },
    png_preview: {
      available: true,
      format: 'PNG 8-bit RGB + Hillshade',
      path_or_id: 'export_png_01',
      status: 'ready'
    },
    pdf_report: {
      available: true,
      format: 'PDF Technical Summary',
      path_or_id: 'export_pdf_01',
      status: 'available'
    },
    geotiff: {
      available: false,
      format: 'GeoTIFF 32-bit Float',
      path_or_id: null,
      status: 'unavailable'
    }
  }
};

export const SCENARIO_B: TerrainResult = {
  schema_version: '0.1.0',
  result_id: 'res_01J8K9B7K2P19',
  status: 'complete',
  source: {
    filename: 'alpine_pass_utm32n_sub.tif',
    input_type: 'geotiff',
    dimensions: { width: 1024, height: 1024 },
    channels: 4,
    file_size: 8388608
  },
  geospatial: {
    georeferenced: true,
    crs: 'EPSG:32632 (WGS 84 / UTM zone 32N)',
    transform: [0.5, 0.0, 453600.0, 0.0, -0.5, 5123400.0],
    bounds: {
      north: 5123400.0,
      south: 5122888.0,
      east: 454112.0,
      west: 453600.0
    },
    pixel_resolution: { x: 0.5, y: 0.5 },
    nodata: -9999.0,
    horizontal_reference: 'WGS84 / UTM zone 32N',
    vertical_reference: 'EGM96 Geoid Height'
  },
  elevation: {
    mode: 'absolute',
    unit: 'm',
    min: 1420.4,
    max: 1985.2,
    mean: 1684.6,
    source: 'depth_anything_v2_vits_calibrated',
    raster: '/fixtures/rasters/scenario_b_metric.bin',
    data: createAlpineElevationArray(65, 65),
    grid_dimensions: { cols: 65, rows: 65 }
  },
  // Synthetic calibration values for UI capability testing; not a real-world scale claim
  calibration: {
    status: 'successful',
    method: 'COP_DEM_COREGISTRATION_ROBUST_OLS',
    reference: 'Copernicus GLO-30 DEM',
    scale: 1.038,
    offset: 142.6,
    residual: 1.45
  },
  terrain: {
    slope: {
      available: true,
      min: 0.4,
      max: 54.8,
      mean: 24.1,
      unit: 'degrees'
    },
    aspect: {
      available: true
    },
    hillshade: {
      available: true
    },
    roughness: {
      available: true
    }
  },
  confidence: {
    available: true,
    method: 'learned_vs_physical_disagreement',
    overall: 0.91,
    raster: '/fixtures/rasters/scenario_b_confidence.bin'
  },
  // Synthetic validation metrics (RMSE, MAE, correlation) to exercise inspector UI; not benchmark claims
  validation: {
    available: true,
    reference: 'Regional Airborne LiDAR DEM 1m',
    rmse: 1.76,
    mae: 1.34,
    correlation: 0.972,
    error_map: '/fixtures/textures/scenario_b_error_map.png'
  },
  measurements: [
    {
      id: 'm-101',
      type: 'point',
      geometry: { coordinates: [453856.2, 5123140.8] },
      values: { absolute_elevation: 1742.6 },
      units: { absolute_elevation: 'm' },
      timestamp: '2026-09-12T21:12:00Z',
      label: 'Ridgeline Peak'
    },
    {
      id: 'm-102',
      type: 'line',
      geometry: { coordinates: [[453650.0, 5123300.0], [453980.0, 5123010.0]] },
      values: { ground_distance: 438.5, elevation_delta: 184.2, mean_slope: 22.8 },
      units: { ground_distance: 'm', elevation_delta: 'm', mean_slope: 'deg' },
      timestamp: '2026-09-12T21:15:22Z',
      label: 'Valley Approach Gradient'
    }
  ],
  visualizations: {
    rgb: '/fixtures/textures/scenario_b_rgb.jpg',
    elevation: '/fixtures/textures/scenario_b_elevation.png',
    slope: '/fixtures/textures/scenario_b_slope.png',
    aspect: '/fixtures/textures/scenario_b_aspect.png',
    hillshade: '/fixtures/textures/scenario_b_hillshade.png',
    confidence: '/fixtures/textures/scenario_b_confidence.png',
    error_map: '/fixtures/textures/scenario_b_error_map.png',
    terrain_mesh: null
  },
  capabilities: {
    relative_elevation: true,
    absolute_elevation: true,
    slope: true,
    aspect: true,
    hillshade: true,
    confidence: true,
    validation: true,
    point_measurement: true,
    cross_section: true,
    first_person: true,
    pdf_export: true,
    geotiff_export: true
  },
  exports: {
    geotiff: {
      available: true,
      format: 'GeoTIFF 32-bit Float (EPSG:32632)',
      path_or_id: 'export_dsm_geotiff_b',
      status: 'ready'
    },
    png_elevation: {
      available: true,
      format: 'PNG Colorized Elevation (Viridis/Turbo)',
      path_or_id: 'export_png_b',
      status: 'ready'
    },
    pdf_report: {
      available: true,
      format: 'PDF Technical Geospatial Report',
      path_or_id: 'export_pdf_b',
      status: 'available'
    }
  }
};

export const SCENARIO_C: TerrainResult = {
  schema_version: '0.1.0',
  result_id: 'res_01J8K9C3F0X71',
  status: 'complete',
  source: {
    filename: 'overcast_coastal_flat.jpg',
    input_type: 'jpg',
    dimensions: { width: 800, height: 800 },
    channels: 3,
    file_size: 1145320
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
    min: 0.0,
    max: 12.8,
    mean: 4.3,
    source: 'depth_anything_v2_vits_gamus',
    raster: '/fixtures/rasters/scenario_c_relative.bin',
    data: createCoastalFlatElevationArray(65, 65),
    grid_dimensions: { cols: 65, rows: 65 }
  },
  calibration: {
    status: 'failed',
    method: 'SHADOW_SOLAR_GEOMETRY',
    reference: null,
    scale: null,
    offset: null,
    residual: null
  },
  terrain: {
    slope: {
      available: true,
      min: 0.0,
      max: 14.2,
      mean: 3.1,
      unit: 'degrees'
    },
    aspect: {
      available: false
    },
    hillshade: {
      available: false
    },
    roughness: {
      available: false
    }
  },
  confidence: {
    available: false,
    method: null,
    overall: null,
    raster: null
  },
  validation: {
    available: false,
    reference: null,
    rmse: null,
    mae: null,
    correlation: null,
    error_map: null
  },
  measurements: [],
  visualizations: {
    rgb: '/fixtures/textures/scenario_c_rgb.jpg',
    elevation: '/fixtures/textures/scenario_c_elevation.png',
    slope: '/fixtures/textures/scenario_c_slope.png',
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
    aspect: false,
    hillshade: false,
    confidence: false,
    validation: false,
    point_measurement: true,
    cross_section: false,
    first_person: false,
    pdf_export: true,
    geotiff_export: false
  },
  exports: {
    rdsm: {
      available: true,
      format: 'PNG Relative Heightmap',
      path_or_id: 'export_rdsm_c',
      status: 'ready'
    },
    geotiff: {
      available: false,
      format: 'GeoTIFF',
      path_or_id: null,
      status: 'unavailable'
    },
    pdf_report: {
      available: true,
      format: 'PDF Summary',
      path_or_id: 'export_pdf_c',
      status: 'available'
    }
  }
};

export const SCENARIO_D_PROCESSING: TerrainResult = {
  schema_version: '0.1.0',
  result_id: 'res_01J8K9D1P9988',
  status: 'processing',
  source: {
    filename: 'satellite_aoi_sector12.tif',
    input_type: 'geotiff',
    dimensions: { width: 1024, height: 1024 },
    channels: 3,
    file_size: 4194304
  },
  geospatial: {
    georeferenced: true,
    crs: 'EPSG:32643',
    transform: [0.5, 0, 310000, 0, -0.5, 3400000],
    bounds: { north: 3400000, south: 3399488, east: 310512, west: 310000 },
    pixel_resolution: 0.5,
    nodata: 0,
    horizontal_reference: 'WGS 84 / UTM zone 43N',
    vertical_reference: null
  },
  elevation: {
    mode: 'relative',
    unit: 'relative units',
    min: 0,
    max: 0,
    mean: 0,
    source: 'depth_anything_v2',
    raster: null
  },
  calibration: {
    status: 'pending',
    method: 'DEM_COREGISTRATION'
  },
  terrain: {},
  confidence: {
    available: false
  },
  validation: {
    available: false
  },
  measurements: [],
  visualizations: {},
  capabilities: {
    relative_elevation: false,
    absolute_elevation: false,
    slope: false,
    aspect: false,
    hillshade: false,
    confidence: false,
    validation: false,
    point_measurement: false,
    cross_section: false,
    first_person: false,
    pdf_export: false,
    geotiff_export: false
  },
  exports: {},
  processing_progress: {
    stage: 'height_estimation',
    progress: 0.62,
    message: 'Inferring dense elevation field via frozen DINOv2 backbone and fine-tuned decoder...'
  }
};

export const SCENARIO_D_ERROR: TerrainResult = {
  schema_version: '0.1.0',
  result_id: 'res_01J8K9D9ERR01',
  status: 'failed',
  source: {
    filename: 'corrupted_payload_header.tif',
    input_type: 'geotiff',
    dimensions: { width: 0, height: 0 },
    channels: 0,
    file_size: 12400
  },
  geospatial: {
    georeferenced: false
  },
  elevation: {
    mode: 'relative',
    unit: 'relative units',
    min: 0,
    max: 0,
    mean: 0,
    source: 'none'
  },
  calibration: {
    status: 'failed'
  },
  terrain: {},
  confidence: {
    available: false
  },
  validation: {
    available: false
  },
  measurements: [],
  visualizations: {},
  capabilities: {
    relative_elevation: false,
    absolute_elevation: false,
    slope: false,
    aspect: false,
    hillshade: false,
    confidence: false,
    validation: false,
    point_measurement: false,
    cross_section: false,
    first_person: false,
    pdf_export: false,
    geotiff_export: false
  },
  exports: {},
  error: {
    code: 'INVALID_GEOTIFF',
    message: 'Raster metadata extraction failed: Directory tag IFD 0 is corrupted or missing required spatial projection keys.',
    stage: 'ingestion',
    recoverable: true,
    details: 'GDAL Open returned error 4: Not a recognized TIFF file or projection metadata block could not be parsed.'
  }
};

export const SCENARIOS: Record<ScenarioId, TerrainResult> = {
  'scenario-a': SCENARIO_A,
  'scenario-b': SCENARIO_B,
  'scenario-c': SCENARIO_C,
  'scenario-d-processing': SCENARIO_D_PROCESSING,
  'scenario-d-error': SCENARIO_D_ERROR
};

export function getFixtureResult(id: ScenarioId): TerrainResult {
  return SCENARIOS[id] || SCENARIO_A;
}
