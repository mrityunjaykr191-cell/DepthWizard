/**
 * DepthWizard — Visual Heightfield Pipeline (Three.js V2.4)
 * Authority: docs/design/design-system.md & Three.js V2.4 Visual Refinement Spec
 * 
 * ============================================================================
 * CORE ARCHITECTURAL RULE:
 * ============================================================================
 * STRICT SEPARATION BETWEEN ANALYTICAL DATA AND VISUAL RENDERING:
 * 
 * RAW MODEL OUTPUT
 *        │
 *        ▼
 * ANALYTICAL HEIGHTFIELD (Authoritative, 100% Unchanged)
 *        │
 *        ├──────────────────────────┬───────────────────────────┐
 *        ▼                          ▼                           ▼
 *  MEASUREMENTS / QA / EXPORT    TERRAIN ANALYTICS       VISUAL RENDER PIPELINE
 *  Raw Float32Array unchanged   Horn 3x3 on raw data     Derived visual copy only
 *                                                               │
 *                                                               ├─ 1. Visual Resampling (e.g. 512 -> 256)
 *                                                               ├─ 2. Edge-Aware Bilateral Smoothing
 *                                                               ├─ 3. Restrained Visual Relief
 *                                                               ├─ 4. Continuous Vertex Normals
 *                                                               ├─ 5. Matte Geological Material
 *                                                               └─ 6. Softened Balanced Illumination
 *                                                               │
 *                                                               ▼
 *                                                           THREE.JS
 * ============================================================================
 */

export interface TerrainVisualConfig {
  /** Maximum dimension for visual grid vertices (e.g. 256 for 256x256). Defaults to 256. */
  maxResolution: number;
  /** Whether visual spatial smoothing is active. Defaults to true. */
  smoothingEnabled: boolean;
  /** Spatial radius for smoothing kernel. 1 = 3x3 neighborhood. Defaults to 1. */
  smoothingRadius: number;
  /** Blend strength between raw resampled and smoothed heightfield [0..1]. Defaults to 0.70. */
  smoothingStrength: number;
  /** Relative height threshold ratio for bilateral edge preservation [0..1]. Defaults to 0.12. */
  edgeThresholdRatio: number;
  /** Target natural vertical relief percentage for uncalibrated relative scenes. Defaults to 10.0%. */
  targetReliefPercent: number;
  /** Monotonic visual gamma relief shaping curve. Defaults to 0.98. */
  reliefGamma: number;
}

export const DEFAULT_VISUAL_CONFIG: Readonly<TerrainVisualConfig> = {
  maxResolution: 256,
  smoothingEnabled: true,
  smoothingRadius: 1,
  smoothingStrength: 0.70,
  edgeThresholdRatio: 0.12,
  targetReliefPercent: 10.0,
  reliefGamma: 0.98,
};

export interface ProcessedVisualTerrain {
  readonly visualElevations: Float32Array;
  readonly visualCols: number;
  readonly visualRows: number;
  readonly worldWidth: number;
  readonly worldDepth: number;
  readonly baseElevation: number;
  readonly verticalScale: number;
  readonly analyticalElevations: Float32Array;
}

/**
 * Resamples a 2D scalar float grid using high-quality bilinear interpolation with NoData masking.
 * Never mutates source data.
 */
export function resampleScalarGrid(
  source: Float32Array,
  srcCols: number,
  srcRows: number,
  dstCols: number,
  dstRows: number,
  nodata?: number | null
): Float32Array {
  const dstCount = dstCols * dstRows;
  const result = new Float32Array(dstCount);

  if (srcCols === dstCols && srcRows === dstRows) {
    result.set(source);
    return result;
  }

  const isNoData = (val: number): boolean =>
    isNaN(val) || (nodata !== null && nodata !== undefined && Math.abs(val - nodata) < 1e-4);

  const scaleX = (srcCols - 1) / Math.max(1, dstCols - 1);
  const scaleY = (srcRows - 1) / Math.max(1, dstRows - 1);

  for (let r = 0; r < dstRows; r++) {
    const srcY = r * scaleY;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(srcRows - 1, y0 + 1);
    const fy = srcY - y0;

    const rowOffsetDst = r * dstCols;
    const rowOffsetSrc0 = y0 * srcCols;
    const rowOffsetSrc1 = y1 * srcCols;

    for (let c = 0; c < dstCols; c++) {
      const srcX = c * scaleX;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(srcCols - 1, x0 + 1);
      const fx = srcX - x0;

      const v00 = source[rowOffsetSrc0 + x0];
      const v10 = source[rowOffsetSrc0 + x1];
      const v01 = source[rowOffsetSrc1 + x0];
      const v11 = source[rowOffsetSrc1 + x1];

      // Handle NoData safely
      if (isNoData(v00) || isNoData(v10) || isNoData(v01) || isNoData(v11)) {
        // If all 4 are NoData, set NoData
        if (isNoData(v00) && isNoData(v10) && isNoData(v01) && isNoData(v11)) {
          result[rowOffsetDst + c] = nodata !== null && nodata !== undefined ? nodata : NaN;
          continue;
        }
        // Partial NoData: average only valid neighbors
        let sum = 0;
        let weight = 0;
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        if (!isNoData(v00)) { sum += v00 * w00; weight += w00; }
        if (!isNoData(v10)) { sum += v10 * w10; weight += w10; }
        if (!isNoData(v01)) { sum += v01 * w01; weight += w01; }
        if (!isNoData(v11)) { sum += v11 * w11; weight += w11; }

        result[rowOffsetDst + c] = weight > 1e-6 ? sum / weight : v00;
      } else {
        // Pure bilinear interpolation
        const val = (1 - fx) * (1 - fy) * v00 +
                    fx * (1 - fy) * v10 +
                    (1 - fx) * fy * v01 +
                    fx * fy * v11;
        result[rowOffsetDst + c] = val;
      }
    }
  }

  return result;
}

/**
 * Applies structure-preserving, edge-aware bilateral spatial smoothing to the visual heightfield.
 * 
 * Guarantees:
 * - High-frequency neural depth noise (1-2 pixel ripple) is smoothed into continuous surfaces.
 * - Sharp building roof edges, cliff drop-offs, and quarry terraces are protected from blurring.
 * - Relief ordering is preserved.
 * - Raw source array is untouched.
 */
export function smoothVisualHeightfield(
  grid: Float32Array,
  cols: number,
  rows: number,
  minElev: number,
  maxElev: number,
  config: TerrainVisualConfig,
  nodata?: number | null
): Float32Array {
  const count = cols * rows;
  if (!config.smoothingEnabled || config.smoothingStrength <= 0) {
    return new Float32Array(grid);
  }

  const isNoData = (val: number): boolean =>
    isNaN(val) || (nodata !== null && nodata !== undefined && Math.abs(val - nodata) < 1e-4);

  const span = Math.max(1e-4, maxElev - minElev);
  const edgeThreshold = Math.max(1e-3, span * config.edgeThresholdRatio);
  const twoSigmaRSquared = 2.0 * edgeThreshold * edgeThreshold;

  // Spatial binomial kernel: [0.25, 0.50, 0.25]
  const spatialWeights = [0.25, 0.50, 0.25];
  const radius = 1;

  // Separable passes: Pass 1 horizontal into tempBuffer, Pass 2 vertical into smoothedBuffer
  const tempBuffer = new Float32Array(count);
  const smoothedBuffer = new Float32Array(count);

  // Pass 1: Horizontal edge-aware convolution
  for (let r = 0; r < rows; r++) {
    const rowOffset = r * cols;
    for (let c = 0; c < cols; c++) {
      const centerIdx = rowOffset + c;
      const centerVal = grid[centerIdx];

      if (isNoData(centerVal)) {
        tempBuffer[centerIdx] = centerVal;
        continue;
      }

      let weightedSum = 0;
      let totalWeight = 0;

      for (let k = -radius; k <= radius; k++) {
        const sampleC = Math.max(0, Math.min(cols - 1, c + k));
        const sampleVal = grid[rowOffset + sampleC];

        if (!isNoData(sampleVal)) {
          const sw = spatialWeights[k + radius];
          const diff = sampleVal - centerVal;
          // Bilateral range weight: suppress blur across high-relief building/cliff steps
          const rw = Math.exp(-(diff * diff) / twoSigmaRSquared);
          const w = sw * rw;
          weightedSum += sampleVal * w;
          totalWeight += w;
        }
      }

      tempBuffer[centerIdx] = totalWeight > 1e-6 ? weightedSum / totalWeight : centerVal;
    }
  }

  // Pass 2: Vertical edge-aware convolution
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const centerIdx = r * cols + c;
      const centerVal = tempBuffer[centerIdx];

      if (isNoData(centerVal)) {
        smoothedBuffer[centerIdx] = centerVal;
        continue;
      }

      let weightedSum = 0;
      let totalWeight = 0;

      for (let k = -radius; k <= radius; k++) {
        const sampleR = Math.max(0, Math.min(rows - 1, r + k));
        const sampleVal = tempBuffer[sampleR * cols + c];

        if (!isNoData(sampleVal)) {
          const sw = spatialWeights[k + radius];
          const diff = sampleVal - centerVal;
          const rw = Math.exp(-(diff * diff) / twoSigmaRSquared);
          const w = sw * rw;
          weightedSum += sampleVal * w;
          totalWeight += w;
        }
      }

      smoothedBuffer[centerIdx] = totalWeight > 1e-6 ? weightedSum / totalWeight : centerVal;
    }
  }

  // Blend with raw grid according to configured strength
  const strength = Math.max(0.0, Math.min(1.0, config.smoothingStrength));
  const oneMinusStrength = 1.0 - strength;
  const result = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const rawVal = grid[i];
    if (isNoData(rawVal)) {
      result[i] = rawVal;
    } else {
      result[i] = oneMinusStrength * rawVal + strength * smoothedBuffer[i];
    }
  }

  return result;
}

/**
 * Creates the complete visual terrain representation from an analytical elevation input.
 * Strict guarantee: analytical elevations are NEVER mutated.
 */
export function createVisualHeightfield(
  analyticalElevations: Float32Array,
  srcCols: number,
  srcRows: number,
  minElev: number,
  maxElev: number,
  mode: 'relative' | 'absolute',
  userConfig?: Partial<TerrainVisualConfig>,
  geospatialBounds?: any,
  nodata?: number | null
): ProcessedVisualTerrain {
  const config: TerrainVisualConfig = { ...DEFAULT_VISUAL_CONFIG, ...userConfig };

  // 1. Determine optimal visual grid dimensions (Change 1: Visual Mesh Resampling)
  const maxSrcDim = Math.max(srcCols, srcRows);
  let visualCols = srcCols;
  let visualRows = srcRows;

  if (maxSrcDim > config.maxResolution) {
    const scale = config.maxResolution / maxSrcDim;
    visualCols = Math.max(32, Math.round(srcCols * scale));
    visualRows = Math.max(32, Math.round(srcRows * scale));
  }

  // 2. Resample analytical elevation grid to visual mesh grid
  const resampledGrid = resampleScalarGrid(
    analyticalElevations,
    srcCols,
    srcRows,
    visualCols,
    visualRows,
    nodata
  );

  // 3. Apply edge-aware conservative bilateral smoothing (Change 2: Conservative Smoothing)
  const smoothedVisualGrid = smoothVisualHeightfield(
    resampledGrid,
    visualCols,
    visualRows,
    minElev,
    maxElev,
    config,
    nodata
  );

  // 4. Calculate world dimensions and restrained vertical scale (Change 4: Visual Relief Control)
  const aspect = srcCols / Math.max(1, srcRows);
  const worldWidth = aspect >= 1.0 ? 100.0 : 100.0 * aspect;
  const worldDepth = aspect >= 1.0 ? 100.0 / aspect : 100.0;

  const baseElevation = minElev;
  const elevationSpan = Math.max(1e-4, maxElev - baseElevation);

  let verticalScale = 1.0;
  if (
    mode === 'absolute' &&
    geospatialBounds &&
    typeof geospatialBounds === 'object' &&
    'east' in geospatialBounds &&
    'west' in geospatialBounds
  ) {
    const extentX = Math.abs(geospatialBounds.east - geospatialBounds.west);
    if (extentX > 0) {
      const metricRatio = worldWidth / extentX;
      const nominalRelief = elevationSpan * metricRatio;
      // Cap extreme metric relief at 30% of horizontal extent for presentation stability
      verticalScale = nominalRelief > 30.0 ? 25.0 / elevationSpan : metricRatio;
    }
  } else {
    // Restrained natural relief ratio (10.0% of horizontal extent by default)
    // Prevents building block inflation while preserving readable ridges and terraces
    const targetRelief = config.targetReliefPercent;
    verticalScale = targetRelief / elevationSpan;
  }

  return {
    visualElevations: smoothedVisualGrid,
    visualCols,
    visualRows,
    worldWidth,
    worldDepth,
    baseElevation,
    verticalScale,
    analyticalElevations
  };
}
