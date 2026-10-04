/**
 * DepthWizard — GAMUS Reference Comparison Service
 * Authority: docs/product/output-contract.md & Final Prototype Patch
 * 
 * Provides on-demand loading of paired GAMUS reference arrays (.npy),
 * spatial dimension alignment verification, tile-specific metric calculation
 * (MAE, RMSE, Pearson r, Spearman rho), and colormapped visual canvas rendering.
 * 
 * CRITICAL SCIENTIFIC DISTINCTION:
 * - This is a DEMONSTRATION / REFERENCE COMPARISON for the GAMUS sample (DC_01_25).
 * - Fresh tile-specific metrics are calculated directly on this tile.
 * - This is NOT the project's aggregate held-out evaluation benchmark (MAE 3.15m, RMSE 5.02m).
 */

import { 
  ELEVATION_COLOR_STOPS, 
  ERROR_COLOR_STOPS, 
  interpolateColormap 
} from '../components/workspace/terrain/analyticalColormaps';

export interface ReferenceComparisonMetrics {
  mae: number;
  rmse: number;
  pearson: number;
  spearman: number;
  validCount: number;
  totalPixels: number;
  predMin: number;
  predMax: number;
  predMean: number;
  refMin: number;
  refMax: number;
  refMean: number;
  errorMin: number;
  errorMax: number;
  errorMean: number;
}

export interface ReferenceComparisonResult {
  sampleName: string;
  referenceSource: string;
  width: number;
  height: number;
  prediction: Float32Array;
  reference: Float32Array;
  error: Float32Array;
  metrics: ReferenceComparisonMetrics;
}

/**
 * Parses a NumPy .npy binary buffer (version 1.0 or 2.0) containing little-endian float32 data.
 * Zero external dependencies.
 */
export function parseNpyFloat32(buffer: ArrayBuffer): {
  data: Float32Array;
  shape: [number, number];
} {
  const u8 = new Uint8Array(buffer);
  
  // Validate magic bytes \x93NUMPY
  if (
    u8[0] !== 0x93 || 
    u8[1] !== 0x4e || 
    u8[2] !== 0x55 || 
    u8[3] !== 0x4d || 
    u8[4] !== 0x50 || 
    u8[5] !== 0x59
  ) {
    throw new Error('Invalid .npy magic header: Expected \\x93NUMPY');
  }

  const major = u8[6];
  let headerLen = 0;
  let offset = 0;

  if (major === 1) {
    headerLen = u8[8] | (u8[9] << 8);
    offset = 10 + headerLen;
  } else if (major === 2) {
    headerLen = u8[8] | (u8[9] << 8) | (u8[10] << 16) | (u8[11] << 24);
    offset = 12 + headerLen;
  } else {
    throw new Error(`Unsupported .npy format version: ${major}.${u8[7]}`);
  }

  const headerBytes = u8.subarray(major === 1 ? 10 : 12, offset);
  const headerText = new TextDecoder('latin1').decode(headerBytes);

  const shapeMatch = headerText.match(/['"]shape['"]\s*:\s*\(([^)]+)\)/);
  if (!shapeMatch) {
    throw new Error('Failed to parse shape attribute from .npy header');
  }

  const dims = shapeMatch[1]
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  if (dims.length < 2) {
    throw new Error(`Expected 2D raster shape from .npy header, got [${dims.join(', ')}]`);
  }

  const rows = dims[0];
  const cols = dims[1];
  const totalElements = rows * cols;

  // Extract aligned Float32Array
  const dataBuffer = buffer.slice(offset, offset + totalElements * 4);
  const data = new Float32Array(dataBuffer);

  return {
    data,
    shape: [rows, cols]
  };
}

// In-memory cache for reference data so subsequent comparisons are instantaneous
let cachedReference: {
  url: string;
  data: Float32Array;
  width: number;
  height: number;
} | null = null;

/**
 * Loads the paired GAMUS reference AGL raster from the static public directory.
 */
export async function loadGamusReference(url = '/samples/DC_01_25_AGL.npy'): Promise<{
  data: Float32Array;
  width: number;
  height: number;
}> {
  if (cachedReference && cachedReference.url === url) {
    return cachedReference;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load GAMUS reference array from '${url}': HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const { data, shape } = parseNpyFloat32(buffer);

  cachedReference = {
    url,
    data,
    width: shape[1],
    height: shape[0]
  };

  return cachedReference;
}

/**
 * Computes ranks with fractional averages for ties.
 */
function computeRanks(arr: Float32Array): Float32Array {
  const n = arr.length;
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;

  // Sort indices based on array values
  idx.sort((a, b) => arr[a] - arr[b]);

  const ranks = new Float32Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && arr[idx[j + 1]] === arr[idx[j]]) {
      j++;
    }
    // Assign 1-based average rank for ties
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) {
      ranks[idx[k]] = avgRank;
    }
    i = j + 1;
  }

  return ranks;
}

/**
 * Computes rigorous tile-specific metrics between predicted and reference rasters.
 * Strictly verifies dimension equality without silent resizing.
 */
export function comparePredictionToReference(
  prediction: Float32Array,
  predWidth: number,
  predHeight: number,
  reference: Float32Array,
  refWidth: number,
  refHeight: number,
  sampleName = 'DC_01_25'
): ReferenceComparisonResult {
  // Spatial alignment verification (STEP 5 constraint: DO NOT silently resize)
  if (predWidth !== refWidth || predHeight !== refHeight) {
    throw new Error(
      `Spatial dimension mismatch: Prediction is ${predWidth}×${predHeight}, but Reference is ${refWidth}×${refHeight}. Spatial alignment cannot be verified.`
    );
  }

  const totalPixels = predWidth * predHeight;
  if (prediction.length !== totalPixels || reference.length !== totalPixels) {
    throw new Error(
      `Array buffer length mismatch: Prediction has ${prediction.length} elements, Reference has ${reference.length} elements (expected ${totalPixels}).`
    );
  }

  const error = new Float32Array(totalPixels);
  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumP = 0;
  let sumR = 0;
  let sumErr = 0;

  let predMin = Infinity;
  let predMax = -Infinity;
  let refMin = Infinity;
  let refMax = -Infinity;
  let errorMin = Infinity;
  let errorMax = -Infinity;

  let validCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const p = prediction[i];
    const r = reference[i];

    if (Number.isFinite(p) && Number.isFinite(r)) {
      // error = prediction - reference
      const err = p - r;
      error[i] = err;

      sumAbsErr += Math.abs(err);
      sumSqErr += err * err;
      sumErr += err;
      sumP += p;
      sumR += r;

      if (p < predMin) predMin = p;
      if (p > predMax) predMax = p;
      if (r < refMin) refMin = r;
      if (r > refMax) refMax = r;
      if (err < errorMin) errorMin = err;
      if (err > errorMax) errorMax = err;

      validCount++;
    } else {
      error[i] = NaN;
    }
  }

  if (validCount === 0) {
    throw new Error('Zero valid finite pixels found between prediction and reference rasters.');
  }

  const mae = sumAbsErr / validCount;
  const rmse = Math.sqrt(sumSqErr / validCount);
  const predMean = sumP / validCount;
  const refMean = sumR / validCount;
  const errorMean = sumErr / validCount;

  // Pearson correlation
  let cov = 0;
  let varP = 0;
  let varR = 0;

  for (let i = 0; i < totalPixels; i++) {
    const p = prediction[i];
    const r = reference[i];
    if (Number.isFinite(p) && Number.isFinite(r)) {
      const dp = p - predMean;
      const dr = r - refMean;
      cov += dp * dr;
      varP += dp * dp;
      varR += dr * dr;
    }
  }

  // Graceful zero-variance edge case handling
  const pearson = (varP > 1e-12 && varR > 1e-12) 
    ? cov / (Math.sqrt(varP) * Math.sqrt(varR)) 
    : 0;

  // Spearman rank correlation
  // Create compact arrays of valid values for ranking
  const validP = new Float32Array(validCount);
  const validR = new Float32Array(validCount);
  let vIdx = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (Number.isFinite(prediction[i]) && Number.isFinite(reference[i])) {
      validP[vIdx] = prediction[i];
      validR[vIdx] = reference[i];
      vIdx++;
    }
  }

  const rankP = computeRanks(validP);
  const rankR = computeRanks(validR);

  let meanRankP = 0;
  let meanRankR = 0;
  for (let i = 0; i < validCount; i++) {
    meanRankP += rankP[i];
    meanRankR += rankR[i];
  }
  meanRankP /= validCount;
  meanRankR /= validCount;

  let covRank = 0;
  let varRankP = 0;
  let varRankR = 0;

  for (let i = 0; i < validCount; i++) {
    const dp = rankP[i] - meanRankP;
    const dr = rankR[i] - meanRankR;
    covRank += dp * dr;
    varRankP += dp * dp;
    varRankR += dr * dr;
  }

  const spearman = (varRankP > 1e-12 && varRankR > 1e-12)
    ? covRank / (Math.sqrt(varRankP) * Math.sqrt(varRankR))
    : 0;

  return {
    sampleName,
    referenceSource: 'GAMUS AGL Reference (1024×1024)',
    width: predWidth,
    height: predHeight,
    prediction,
    reference,
    error,
    metrics: {
      mae,
      rmse,
      pearson,
      spearman,
      validCount,
      totalPixels,
      predMin,
      predMax,
      predMean,
      refMin,
      refMax,
      refMean,
      errorMin,
      errorMax,
      errorMean
    }
  };
}

/**
 * Draws a Float32 raster array onto an HTML5 Canvas using standard analytical colormaps.
 */
export function drawRasterToCanvas(
  canvas: HTMLCanvasElement,
  data: Float32Array,
  width: number,
  height: number,
  mode: 'elevation' | 'error',
  options?: {
    customMin?: number;
    customMax?: number;
  }
): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.createImageData(width, height);
  const pixels = imgData.data;

  let minVal = options?.customMin ?? Infinity;
  let maxVal = options?.customMax ?? -Infinity;

  if (options?.customMin === undefined || options?.customMax === undefined) {
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Number.isFinite(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
  }

  if (mode === 'error') {
    // For diverging error map, balance symmetrically around 0.0
    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal), 0.1);
    minVal = -absMax;
    maxVal = absMax;
  }

  const span = (maxVal - minVal) > 1e-6 ? (maxVal - minVal) : 1.0;
  const stops = mode === 'error' ? ERROR_COLOR_STOPS : ELEVATION_COLOR_STOPS;

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const pxIdx = i * 4;

    if (!Number.isFinite(v)) {
      pixels[pxIdx] = 20;
      pixels[pxIdx + 1] = 26;
      pixels[pxIdx + 2] = 36;
      pixels[pxIdx + 3] = 255;
      continue;
    }

    const t = Math.max(0.0, Math.min(1.0, (v - minVal) / span));
    const rgb = interpolateColormap(stops, t);

    pixels[pxIdx] = Math.round(rgb.r * 255);
    pixels[pxIdx + 1] = Math.round(rgb.g * 255);
    pixels[pxIdx + 2] = Math.round(rgb.b * 255);
    pixels[pxIdx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}
