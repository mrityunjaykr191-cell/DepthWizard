/**
 * DepthWizard — Relative Heightfield Transformation & TerrainResult Bridge
 * Authority: Phase 2C Specification & docs/product/output-contract.md
 *
 * Transforms raw model DepthResult into an explicit RelativeHeightfield and constructs
 * the canonical TerrainResult driving the native Three.js terrain viewport.
 *
 * CRITICAL SCIENTIFIC TRUTH:
 * - Depth Anything V2 outputs uncalibrated relative inverse depth (disparity/distance).
 * - Inversion (Z_max - Z) is a DISPLAY CONVENTION so that proximal/elevated features
 *   project upward (+Y in Three.js coordinates). It is NOT physical metric elevation.
 * - calibration_status is strictly 'uncalibrated_relative' / 'unavailable'.
 * - Absolutely NO metric units (meters) or fake datum/geoid elevations are fabricated.
 */

import { 
  TerrainResult, 
  validateElevationData 
} from '../types/contract';
import { DepthResult } from '../types/depthResult';
import { ImageInput } from '../types/imageInput';
import { 
  RelativeHeightfield, 
  RelativeHeightfieldTransformation 
} from '../types/relativeHeightfield';

/**
 * Validates raw numerical depth array and transforms model-space depth
 * into a normalized, display-oriented relative surface heightfield.
 */
export function transformDepthToRelativeHeightfield(
  depthResult: DepthResult,
  sourceFilename: string = 'image.png'
): RelativeHeightfield {
  // 1. Numerical & Dimension Validation (Section 2C.3)
  if (!depthResult) {
    throw new Error('Cannot transform depth: DepthResult is null or undefined.');
  }

  const { width, height, rawDepth, provenance } = depthResult;

  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid depth dimensions: ${width}x${height}. Must be positive integers.`);
  }

  if (!rawDepth || !(rawDepth instanceof Float32Array)) {
    throw new Error('DepthResult.rawDepth is missing or is not a valid Float32Array.');
  }

  const expectedLength = width * height;
  if (rawDepth.length !== expectedLength) {
    throw new Error(
      `Depth array length mismatch: expected ${width}x${height} = ${expectedLength} elements, got ${rawDepth.length}.`
    );
  }

  // 2. Finite Value & Range Inspection
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  let hasNaN = false;
  let hasInf = false;

  for (let i = 0; i < expectedLength; i++) {
    const val = rawDepth[i];
    if (Number.isNaN(val)) {
      hasNaN = true;
      break;
    }
    if (!Number.isFinite(val)) {
      hasInf = true;
      break;
    }
    if (val < minDepth) minDepth = val;
    if (val > maxDepth) maxDepth = val;
  }

  if (hasNaN) {
    throw new Error(`Depth estimation output for '${sourceFilename}' contains invalid NaN values.`);
  }

  if (hasInf) {
    throw new Error(`Depth estimation output for '${sourceFilename}' contains non-finite Infinity values.`);
  }

  const depthSpan = maxDepth - minDepth;
  if (depthSpan < 1e-6) {
    throw new Error(
      `Depth estimation output for '${sourceFilename}' has near-zero variation (min=${minDepth.toFixed(4)}, max=${maxDepth.toFixed(4)}). Surface cannot be reconstructed.`
    );
  }

  // 3. Depth -> Heightfield Display Transformation (Phase 3C Corrected Convention)
  //
  // MODEL CONVENTION:
  // Depth Anything V2 outputs affine-invariant disparity / inverse depth (D).
  // In monocular disparity models and DSM fine-tuned checkpoints:
  // Elevated/proximal features (peaks, ridges, rooftops) have LARGER values.
  // Distant ground/valleys/background have SMALLER values.
  //
  // DISPLAY CONVENTION:
  // To correctly orient peaks upward (+Y in Three.js coordinates) without asserting physical metric scale:
  // H = ((D - minDepth) / depthSpan) * TARGET_HEIGHT_SCALE
  const TARGET_HEIGHT_SCALE = 100.0;
  const heightData = new Float32Array(expectedLength);

  let sumHeight = 0;
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let i = 0; i < expectedLength; i++) {
    const d = rawDepth[i];
    // Direct normalization: higher model disparity/elevation projects upward (+Y)
    const norm = (d - minDepth) / depthSpan;
    const h = norm * TARGET_HEIGHT_SCALE;
    heightData[i] = h;

    if (h < minHeight) minHeight = h;
    if (h > maxHeight) maxHeight = h;
    sumHeight += h;
  }

  const meanHeight = sumHeight / expectedLength;

  const transformation: RelativeHeightfieldTransformation = {
    convention: 'direct_normalized',
    description: 
      'Normalized relative surface heightfield ((D - D_min) / depthSpan * 100) where elevated/proximal terrain features project upward (+Y in Three.js). This is an uncalibrated display convention for 3D visualization, NOT physical elevation.',
    sourceDepthMin: minDepth,
    sourceDepthMax: maxDepth,
    invertedForDisplay: false,
    targetHeightScale: TARGET_HEIGHT_SCALE
  };

  return {
    id: `heightfield-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    width,
    height,
    data: heightData,
    min: minHeight,
    max: maxHeight,
    mean: meanHeight,
    provenance,
    transformation,
    calibrationStatus: 'uncalibrated_relative',
    sourceDimensions: { width, height }
  };
}

/**
 * Constructs a canonical TerrainResult driven by the real model-derived RelativeHeightfield.
 * Adheres strictly to the output contract and integrates cleanly into the existing Three.js viewer.
 */
export function createTerrainResultFromHeightfield(
  heightfield: RelativeHeightfield,
  imageInput?: ImageInput | null
): TerrainResult {
  const metadata = imageInput?.metadata;
  const filename = metadata?.filename ?? 'optical_source.png';
  const format = metadata?.format ?? 'png';
  const channels = metadata?.channels ?? 3;
  const fileSize = metadata?.fileSize ?? (heightfield.width * heightfield.height * 4);

  // Preserve georeferencing metadata if available, but NEVER fabricate metric elevation
  const isGeoreferenced = Boolean(metadata?.spatial?.hasGeoreference);
  const spatialMeta = metadata?.spatial;

  const result: TerrainResult = {
    schema_version: '0.1.0',
    result_id: heightfield.id,
    status: 'complete',
    source: {
      filename,
      input_type: format,
      dimensions: {
        width: heightfield.width,
        height: heightfield.height,
      },
      channels,
      file_size: fileSize,
    },
    geospatial: {
      georeferenced: isGeoreferenced,
      crs: spatialMeta?.crs ?? null,
      transform: spatialMeta?.geotransform ?? null,
      bounds: spatialMeta?.bounds ? {
        north: spatialMeta.bounds.maxY,
        south: spatialMeta.bounds.minY,
        east: spatialMeta.bounds.maxX,
        west: spatialMeta.bounds.minX,
      } : null,
      pixel_resolution: spatialMeta?.pixelResolution ?? null,
      nodata: spatialMeta?.noData ?? null,
      horizontal_reference: spatialMeta?.crs ? spatialMeta.crs.split(' ')[0] : null,
      vertical_reference: null, // Strictly null: uncalibrated relative heightfield
    },
    elevation: {
      mode: 'relative',
      unit: 'relative units',
      min: Math.round(heightfield.min * 10) / 10,
      max: Math.round(heightfield.max * 10) / 10,
      mean: Math.round(heightfield.mean * 10) / 10,
      source: `${heightfield.provenance.modelVariant} [${heightfield.provenance.provider}]`,
      data: heightfield.data,
      grid_dimensions: {
        cols: heightfield.width,
        rows: heightfield.height,
      },
    },
    calibration: {
      status: spatialMeta?.hasGeoreference ? 'pending' : 'unavailable',
      method: null,
      reference: null,
      scale: null,
      offset: null,
      residual: null,
    },
    terrain: {
      // Analytical derivatives are not computed on uncalibrated model-space fields
      slope: { available: false },
      aspect: { available: false },
      hillshade: { available: true }, // Visual Three.js directional shading supported
      roughness: { available: false },
    },
    confidence: {
      available: false,
      method: null,
      overall: null,
      raster: null,
    },
    validation: {
      available: false,
      reference: null,
      rmse: null,
      mae: null,
      correlation: null,
    },
    measurements: [],
    visualizations: {
      rgb: imageInput?.previewUrl ?? null,
      elevation: null,
      slope: null,
      aspect: null,
      hillshade: null,
      confidence: null,
      error_map: null,
      terrain_mesh: null,
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
      first_person: true,
      pdf_export: false,
      geotiff_export: false,
    },
    exports: {},
    imagery: {
      rgb: imageInput?.previewUrl ?? null,
      format,
    },
  };

  // Enforce contract validation before returning
  const validation = validateElevationData(result.elevation);
  if (!validation.valid) {
    throw new Error(`TerrainResult construction failed: ${validation.error}`);
  }

  return result;
}
