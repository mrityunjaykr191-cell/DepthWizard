/**
 * DepthWizard — Canonical Output Contract Types
 * Schema Version: 0.1.0
 * Authority: docs/product/output-contract.md
 */

export type ResultStatus = 'queued' | 'processing' | 'complete' | 'partial' | 'failed';

export type InputFileType = 'jpg' | 'png' | 'geotiff' | string;

export interface SourceMetadata {
  filename: string;
  input_type: InputFileType;
  dimensions: {
    width: number;
    height: number;
  };
  channels: number;
  file_size: number;
}

export interface GeospatialBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeospatialMetadata {
  georeferenced: boolean;
  crs?: string | null;
  transform?: number[] | null;
  bounds?: GeospatialBounds | [number, number, number, number] | null;
  pixel_resolution?: { x: number; y: number } | number | null;
  nodata?: number | null;
  horizontal_reference?: string | null;
  vertical_reference?: string | null;
}

export type ElevationMode = 'relative' | 'absolute';

export interface ElevationData {
  mode: ElevationMode;
  unit: string;
  min: number;
  max: number;
  mean: number;
  source: string;
  raster?: string | null;
  /**
   * In-memory dense elevation array (Float32Array) for direct 3D terrain rendering.
   * Stored in row-major order: index = r * cols + c.
   * When present, data.length MUST equal grid_dimensions.cols * grid_dimensions.rows.
   */
  data?: Float32Array | null;
  /**
   * Explicit grid dimensions (columns along X, rows along Z) for the elevation array.
   */
  grid_dimensions?: {
    cols: number;
    rows: number;
  } | null;
}

export type CalibrationStatus = 'not_required' | 'unavailable' | 'pending' | 'successful' | 'failed';

export interface CalibrationData {
  status: CalibrationStatus;
  method?: string | null;
  reference?: string | null;
  scale?: number | null;
  offset?: number | null;
  residual?: number | null;
}

export interface TerrainDerivative {
  available: boolean;
  min?: number;
  max?: number;
  mean?: number;
  unit?: string;
  raster?: string | null;
}

export interface TerrainDerivatives {
  slope?: TerrainDerivative;
  aspect?: TerrainDerivative;
  hillshade?: TerrainDerivative;
  roughness?: TerrainDerivative;
}

export interface ConfidenceData {
  available: boolean;
  method?: string | null;
  overall?: number | null;
  raster?: string | null;
}

export interface ValidationData {
  available: boolean;
  reference?: string | null;
  rmse?: number | null;
  mae?: number | null;
  correlation?: number | null;
  error_map?: string | null;
}

export type MeasurementType = 'point' | 'line' | 'cross_section' | 'area';

export interface MeasurementRecord {
  id: string;
  type: MeasurementType;
  geometry: {
    coordinates: number[] | number[][] | { x: number; y: number }[];
    [key: string]: unknown;
  };
  values: Record<string, number | string>;
  units: Record<string, string>;
  timestamp: string;
  label?: string;
}

export interface VisualizationsData {
  rgb?: string | null;
  elevation?: string | null;
  slope?: string | null;
  aspect?: string | null;
  hillshade?: string | null;
  confidence?: string | null;
  error_map?: string | null;
  terrain_mesh?: string | null;
}

export interface CapabilitiesMap {
  relative_elevation: boolean;
  absolute_elevation: boolean;
  slope: boolean;
  aspect: boolean;
  hillshade: boolean;
  confidence: boolean;
  validation: boolean;
  point_measurement: boolean;
  cross_section: boolean;
  first_person: boolean;
  pdf_export: boolean;
  geotiff_export: boolean;
  [key: string]: boolean | undefined;
}

export type ExportStatus = 'available' | 'preparing' | 'ready' | 'failed' | 'unavailable';

export interface ExportProduct {
  available: boolean;
  format: string;
  path_or_id?: string | null;
  status: ExportStatus;
}

export interface ErrorData {
  code: string;
  message: string;
  stage?: string;
  recoverable?: boolean;
  details?: string;
}

export interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface TerrainImagery {
  rgb?: string | null;
  format?: string | null;
}

/**
 * Top-Level Authoritative Result Contract
 */
export interface TerrainResult {
  schema_version: string;
  result_id: string;
  status: ResultStatus;
  source: SourceMetadata;
  geospatial: GeospatialMetadata;
  elevation: ElevationData;
  calibration: CalibrationData;
  terrain: TerrainDerivatives;
  confidence: ConfidenceData;
  validation: ValidationData;
  measurements: MeasurementRecord[];
  visualizations: VisualizationsData;
  capabilities: CapabilitiesMap;
  exports: Record<string, ExportProduct>;
  imagery?: TerrainImagery | null;
  error?: ErrorData | null;
  processing_progress?: ProcessingProgress | null;
}

/**
 * Validates that an elevation data array conforms strictly to its declared dimensions.
 * Rejects mismatched lengths, non-finite values, and malformed structures.
 */
export function validateElevationData(elevation: ElevationData): { valid: boolean; error?: string } {
  if (!elevation.data) {
    return { valid: false, error: 'No elevation data array provided.' };
  }

  if (!elevation.grid_dimensions) {
    return { valid: false, error: 'Elevation grid dimensions (cols, rows) are missing.' };
  }

  const { cols, rows } = elevation.grid_dimensions;
  if (!Number.isInteger(cols) || cols <= 0 || !Number.isInteger(rows) || rows <= 0) {
    return { valid: false, error: `Invalid grid dimensions: ${cols}x${rows}. Both must be positive integers.` };
  }

  const expectedLength = cols * rows;
  if (elevation.data.length !== expectedLength) {
    return { 
      valid: false, 
      error: `Elevation array length (${elevation.data.length}) does not match declared dimensions (${cols}x${rows} = ${expectedLength}).` 
    };
  }

  return { valid: true };
}
