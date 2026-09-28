/**
 * DepthWizard — Analytical Terrain Colormaps & Visual Ramps
 * Authority: Phase 4C Specification & docs/design/design-system.md
 * 
 * Provides restrained, scientifically credible color ramps for terrain analytics:
 * 1. Elevation: Perceptually continuous geological elevation ramp (Navy/Teal -> Sage -> Ochre -> Pale Stone).
 * 2. Slope: Restrained gradient ramp (Gentle Forest Green -> Olive -> Warm Amber -> Terracotta Rust).
 * 3. Hillshade: Directional monochrome illumination luminance ramp.
 * 4. Transparent/Dark Masking for NaN and NoData cells.
 * 
 * CRITICAL SCIENTIFIC GUARANTEES:
 * - Does NOT convert relative gradient into degrees.
 * - Does NOT fabricate physical units for relative surfaces.
 * - Does NOT mutate underlying Float32 elevation/slope arrays.
 * - Invariant to Three.js vertical exaggeration.
 */

export interface RgbColor {
  r: number; // [0.0, 1.0]
  g: number; // [0.0, 1.0]
  b: number; // [0.0, 1.0]
}

// Color stop definition: [normalizedValue: 0..1, r: 0..1, g: 0..1, b: 0..1]
export type ColorStop = [number, number, number, number];

/**
 * Geological / Topographic Elevation Ramp
 * Deep basin / valley -> lowlands -> foothills -> highland sandstone -> ridge peak.
 */
export const ELEVATION_COLOR_STOPS: readonly ColorStop[] = [
  [0.00, 0.145, 0.282, 0.388], // #254863 (Deep Basin / Valley — readable midtone navy)
  [0.25, 0.216, 0.451, 0.478], // #37737a (Mineral Teal Lowlands)
  [0.50, 0.525, 0.596, 0.475], // #869879 (Sage Foothills)
  [0.75, 0.812, 0.635, 0.447], // #cfa272 (Warm Ochre Highlands)
  [1.00, 0.961, 0.945, 0.886], // #f5f1e2 (Pale Granite Peak)
];

/**
 * Restrained Slope Ramp
 * Flat / stable green -> mild incline -> moderate slope -> steep precipitous cliff.
 */
export const SLOPE_COLOR_STOPS: readonly ColorStop[] = [
  [0.00, 0.180, 0.420, 0.340], // #2e6b57 (Gentle / Flat Ground)
  [0.35, 0.470, 0.600, 0.180], // #78992e (Olive / Mild Incline)
  [0.65, 0.850, 0.560, 0.220], // #d98f38 (Warm Ochre / Moderate Slope)
  [1.00, 0.680, 0.160, 0.160], // #ad2929 (Terracotta / Steep Cliff)
];

/**
 * Directional Hillshade Monochrome Shading
 * Ambient shadow -> midtone -> sunlit face.
 */
export const HILLSHADE_COLOR_STOPS: readonly ColorStop[] = [
  [0.00, 0.150, 0.180, 0.225], // #262e3a (Readable Ambient Shadow)
  [0.50, 0.480, 0.535, 0.590], // #7a8896 (Midtone Topographic Relief)
  [1.00, 0.950, 0.965, 0.980], // #f2f6fa (Sunlit Face)
];

/**
 * Diverging Signed Height Error Ramp (Phase 5A)
 * Negative / Underestimation: Steel Blue
 * Zero Error (±0.0m): Neutral Pale Stone Gray
 * Positive / Overestimation: Terracotta Red
 */
export const ERROR_COLOR_STOPS: readonly ColorStop[] = [
  [0.00, 0.145, 0.388, 0.922], // #2563eb (Steel Blue / Underestimated)
  [0.25, 0.450, 0.620, 0.880], // Soft Slate Blue
  [0.50, 0.850, 0.870, 0.900], // #d9dee6 (Pale Stone Gray / Zero Error)
  [0.75, 0.920, 0.480, 0.400], // Soft Warm Terracotta
  [1.00, 0.863, 0.149, 0.149], // #dc2626 (Terracotta Red / Overestimated)
];

// Dark neutral color used to represent NoData or NaN cells without visual noise
export const NODATA_COLOR: RgbColor = {
  r: 0.078, // #141a24
  g: 0.102,
  b: 0.141
};

/**
 * Interpolates smoothly across a sorted sequence of ColorStops for parameter t in [0.0, 1.0].
 */
export function interpolateColormap(stops: readonly ColorStop[], t: number): RgbColor {
  const clampedT = Math.max(0.0, Math.min(1.0, isNaN(t) ? 0.0 : t));

  if (clampedT <= stops[0][0]) {
    return { r: stops[0][1], g: stops[0][2], b: stops[0][3] };
  }
  const lastIdx = stops.length - 1;
  if (clampedT >= stops[lastIdx][0]) {
    return { r: stops[lastIdx][1], g: stops[lastIdx][2], b: stops[lastIdx][3] };
  }

  // Find surrounding interval
  for (let i = 0; i < lastIdx; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (clampedT >= s0[0] && clampedT <= s1[0]) {
      const span = s1[0] - s0[0];
      const factor = span > 1e-6 ? (clampedT - s0[0]) / span : 0.0;
      return {
        r: s0[1] + factor * (s1[1] - s0[1]),
        g: s0[2] + factor * (s1[2] - s0[2]),
        b: s0[3] + factor * (s1[3] - s0[3])
      };
    }
  }

  return { r: stops[lastIdx][1], g: stops[lastIdx][2], b: stops[lastIdx][3] };
}

/**
 * Converts color stops to a CSS linear-gradient string for HTML UI legends.
 */
export function stopsToCssGradient(stops: readonly ColorStop[], direction: string = 'to right'): string {
  const parts = stops.map(([t, r, g, b]) => {
    const rInt = Math.round(r * 255);
    const gInt = Math.round(g * 255);
    const bInt = Math.round(b * 255);
    const pct = (t * 100).toFixed(0);
    return `rgb(${rInt}, ${gInt}, ${bInt}) ${pct}%`;
  });
  return `linear-gradient(${direction}, ${parts.join(', ')})`;
}

/**
 * Generates vertex colors (RGB Float32Array of length count * 3) for the Elevation layer.
 */
export function generateElevationVertexColors(
  elevations: Float32Array,
  minElev: number,
  maxElev: number,
  nodata?: number | null
): Float32Array {
  const count = elevations.length;
  const colors = new Float32Array(count * 3);
  const range = maxElev - minElev;
  const invRange = range > 1e-6 ? 1.0 / range : 0.0;

  for (let i = 0; i < count; i++) {
    const val = elevations[i];
    const ptr = i * 3;

    if (isNaN(val) || (nodata !== null && nodata !== undefined && Math.abs(val - nodata) < 1e-4)) {
      colors[ptr] = NODATA_COLOR.r;
      colors[ptr + 1] = NODATA_COLOR.g;
      colors[ptr + 2] = NODATA_COLOR.b;
      continue;
    }

    const t = range > 1e-6 ? (val - minElev) * invRange : 0.5;
    const rgb = interpolateColormap(ELEVATION_COLOR_STOPS, t);
    colors[ptr] = rgb.r;
    colors[ptr + 1] = rgb.g;
    colors[ptr + 2] = rgb.b;
  }

  return colors;
}

/**
 * Generates vertex colors (RGB Float32Array of length count * 3) for the Slope layer.
 */
export function generateSlopeVertexColors(
  slopes: Float32Array,
  minSlope: number,
  maxSlope: number,
  nodata?: number | null
): Float32Array {
  const count = slopes.length;
  const colors = new Float32Array(count * 3);
  const range = maxSlope - minSlope;
  const invRange = range > 1e-6 ? 1.0 / range : 0.0;

  for (let i = 0; i < count; i++) {
    const val = slopes[i];
    const ptr = i * 3;

    if (isNaN(val) || (nodata !== null && nodata !== undefined && Math.abs(val - nodata) < 1e-4)) {
      colors[ptr] = NODATA_COLOR.r;
      colors[ptr + 1] = NODATA_COLOR.g;
      colors[ptr + 2] = NODATA_COLOR.b;
      continue;
    }

    const t = range > 1e-6 ? (val - minSlope) * invRange : 0.0;
    const rgb = interpolateColormap(SLOPE_COLOR_STOPS, t);
    colors[ptr] = rgb.r;
    colors[ptr + 1] = rgb.g;
    colors[ptr + 2] = rgb.b;
  }

  return colors;
}

/**
 * Generates vertex colors (RGB Float32Array of length count * 3) for the Hillshade layer.
 */
export function generateHillshadeVertexColors(
  hillshades: Float32Array,
  nodata?: number | null
): Float32Array {
  const count = hillshades.length;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const val = hillshades[i];
    const ptr = i * 3;

    if (isNaN(val) || (nodata !== null && nodata !== undefined && Math.abs(val - nodata) < 1e-4)) {
      colors[ptr] = NODATA_COLOR.r;
      colors[ptr + 1] = NODATA_COLOR.g;
      colors[ptr + 2] = NODATA_COLOR.b;
      continue;
    }

    const t = Math.max(0.0, Math.min(1.0, val));
    const rgb = interpolateColormap(HILLSHADE_COLOR_STOPS, t);
    colors[ptr] = rgb.r;
    colors[ptr + 1] = rgb.g;
    colors[ptr + 2] = rgb.b;
  }

  return colors;
}

/**
 * Generates vertex colors (RGB Float32Array of length count * 3) for the Height Error layer.
 * Uses a symmetric diverging scale centered at 0.0m.
 */
export function generateErrorVertexColors(
  errors: Float32Array,
  minError: number,
  maxError: number,
  nodata?: number | null
): Float32Array {
  const count = errors.length;
  const colors = new Float32Array(count * 3);

  // Symmetric boundary around zero error to keep 0.0m firmly at the center stop (0.5)
  const maxAbs = Math.max(Math.abs(minError), Math.abs(maxError), 1.0);

  for (let i = 0; i < count; i++) {
    const val = errors[i];
    const ptr = i * 3;

    if (isNaN(val) || (nodata !== null && nodata !== undefined && Math.abs(val - nodata) < 1e-4)) {
      colors[ptr] = NODATA_COLOR.r;
      colors[ptr + 1] = NODATA_COLOR.g;
      colors[ptr + 2] = NODATA_COLOR.b;
      continue;
    }

    // Map [-maxAbs, +maxAbs] linearly to [0.0, 1.0]
    const t = Math.max(0.0, Math.min(1.0, 0.5 + 0.5 * (val / maxAbs)));
    const rgb = interpolateColormap(ERROR_COLOR_STOPS, t);
    colors[ptr] = rgb.r;
    colors[ptr + 1] = rgb.g;
    colors[ptr + 2] = rgb.b;
  }

  return colors;
}
