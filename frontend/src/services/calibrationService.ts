/**
 * DepthWizard — Geospatial Calibration API Client & TerrainResult Extension
 * Authority: Phase 3 Specification & docs/product/output-contract.md
 *
 * Connects frontend to /api/calibrate and bridges the calibrated metric elevation array
 * into the canonical TerrainResult driving the native Three.js terrain viewport.
 */

import { TerrainResult, validateElevationData } from '../types/contract';
import { ImageInput } from '../types/imageInput';
import { 
  CalibrationResult, 
  CalibrationSourcesInfo, 
  ReferenceSource,
  CalibrationStatus 
} from '../types/calibration';

/**
 * Decodes base64-encoded Float32Array lossless binary payload.
 */
function decodeFloat32Base64(b64: string): Float32Array {
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

/**
 * Queries backend for supported reference DEM sources and tile availability.
 */
export async function fetchCalibrationSources(): Promise<CalibrationSourcesInfo> {
  const res = await fetch('/api/calibration/sources');
  if (!res.ok) {
    throw new Error(`Failed to query calibration sources: HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    supportedSources: data.supported_sources as ReferenceSource[],
    preferredSource: data.preferred_source as ReferenceSource,
    fallbackSource: data.fallback_source as ReferenceSource,
    localTilesAvailable: Boolean(data.local_tiles_available)
  };
}

/**
 * Requests geospatial calibration against a reference DEM (CartoDEM or SRTM).
 */
export async function requestCalibration(
  file: File,
  referenceSource: ReferenceSource = 'CartoDEM',
  relativeHeightfieldB64?: string,
  rawDepthB64?: string
): Promise<CalibrationResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('reference_source', referenceSource);
  if (relativeHeightfieldB64) {
    formData.append('relative_heightfield_b64', relativeHeightfieldB64);
  }
  if (rawDepthB64) {
    formData.append('raw_depth_b64', rawDepthB64);
  }

  const res = await fetch('/api/calibrate', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || errorText;
    } catch {}
    throw new Error(`Calibration API error (HTTP ${res.status}): ${detail}`);
  }

  const data = await res.json();

  let calibratedElev: Float32Array | undefined = undefined;
  if (data.calibrated_elevation_raw_b64) {
    calibratedElev = decodeFloat32Base64(data.calibrated_elevation_raw_b64);
  }

  let residualsMap: Float32Array | undefined = undefined;
  if (data.residuals_map_raw_b64) {
    residualsMap = decodeFloat32Base64(data.residuals_map_raw_b64);
  }

  return {
    status: data.status as CalibrationStatus,
    scale: data.scale,
    offset: data.offset,
    elevationUnit: data.elevation_unit || 'meters',
    elevationMin: data.elevation_min,
    elevationMax: data.elevation_max,
    elevationMean: data.elevation_mean,
    method: data.method,
    referenceSource: data.reference_source,
    referenceCrs: data.reference_crs,
    verticalReference: data.vertical_reference,
    sampleCount: data.sample_count,
    mae: data.mae,
    rmse: data.rmse,
    bias: data.bias,
    correlation: data.correlation,
    medianAbsoluteError: data.median_absolute_error,
    calibratedElevation: calibratedElev,
    residualsMap: residualsMap,
    failureReason: data.failure_reason,
    provenance: data.provenance || {}
  };
}

/**
 * Extends the existing canonical TerrainResult into an absolute metric DSM result.
 * Strictly adheres to docs/product/output-contract.md.
 */
export function createCalibratedTerrainResult(
  calibResult: CalibrationResult,
  imageInput: ImageInput,
  baseResult: TerrainResult
): TerrainResult {
  if (calibResult.status !== 'calibrated' || !calibResult.calibratedElevation) {
    throw new Error('Cannot construct calibrated TerrainResult: calibration was not successful.');
  }

  const meta = imageInput.metadata;
  const width = meta?.width ?? baseResult.source.dimensions.width;
  const height = meta?.height ?? baseResult.source.dimensions.height;

  const calibratedElevation = calibResult.calibratedElevation;

  // Construct calibrated canonical TerrainResult
  const updated: TerrainResult = {
    ...baseResult,
    result_id: `calibrated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: 'complete',
    elevation: {
      mode: 'absolute',
      unit: 'm', // Calibrated absolute elevation in meters
      min: calibResult.elevationMin ?? Math.round(Math.min(...calibratedElevation.slice(0, 100)) * 10) / 10,
      max: calibResult.elevationMax ?? Math.round(Math.max(...calibratedElevation.slice(0, 100)) * 10) / 10,
      mean: calibResult.elevationMean ?? 0,
      source: `${baseResult.elevation.source} [Calibrated with ${calibResult.referenceSource}]`,
      data: calibratedElevation,
      grid_dimensions: {
        cols: width,
        rows: height,
      }
    },
    calibration: {
      status: 'successful',
      method: calibResult.method ?? 'affine_scale_offset',
      reference: calibResult.referenceSource ?? 'CartoDEM',
      scale: calibResult.scale ?? null,
      offset: calibResult.offset ?? null,
      residual: calibResult.mae ?? null,
    },
    capabilities: {
      ...baseResult.capabilities,
      absolute_elevation: true,
      relative_elevation: true,
      point_measurement: true,
      slope: true, // Slope in degrees is now mathematically meaningful on metric DSM
    },
    geospatial: {
      ...baseResult.geospatial,
      vertical_reference: calibResult.verticalReference ?? 'EGM96',
    }
  };

  const validation = validateElevationData(updated.elevation);
  if (!validation.valid) {
    throw new Error(`Calibrated TerrainResult failed elevation validation: ${validation.error}`);
  }

  return updated;
}
