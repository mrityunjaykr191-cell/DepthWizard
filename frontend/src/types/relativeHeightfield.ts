/**
 * DepthWizard — Relative Heightfield Contract
 * Authority: Phase 2C Specification & docs/product/output-contract.md
 *
 * Defines the explicit intermediate representation distinguishing raw model-space
 * depth prediction from a normalized, display-oriented relative surface heightfield.
 *
 * CRITICAL SCIENTIFIC TRUTH:
 * - This heightfield represents an uncalibrated relative surface where topographic peaks project upward (+Y).
 * - It is strictly NOT metric elevation, NOT a physical Digital Surface Model (DSM), and has NO vertical datum.
 * - Inversion is a DISPLAY CONVENTION for 3D visualization, not a physical elevation conversion.
 * - Metric/geospatial calibration belongs strictly to Phase 3.
 */

import { DepthModelProvenance } from './depthResult';

export type HeightfieldTransformationConvention = 'inverted_normalized_display' | 'direct_normalized';

export interface RelativeHeightfieldTransformation {
  /** Machine-readable transformation convention tag */
  readonly convention: HeightfieldTransformationConvention;
  /** Human-readable explanation of the display convention */
  readonly description: string;
  /** Minimum raw depth value from the model output prior to transformation */
  readonly sourceDepthMin: number;
  /** Maximum raw depth value from the model output prior to transformation */
  readonly sourceDepthMax: number;
  /** Whether values were inverted so that camera-proximal features project upward (+Y) */
  readonly invertedForDisplay: boolean;
  /** Heightfield range multiplier in relative visualization units (default: 100.0) */
  readonly targetHeightScale: number;
}

export interface RelativeHeightfield {
  readonly id: string;
  /** Grid width in columns (along X axis) */
  readonly width: number;
  /** Grid height in rows (along Z axis) */
  readonly height: number;
  
  /**
   * Dense relative surface height array (Float32Array) stored in row-major order:
   * index = row * width + col.
   * Values range from 0.0 to targetHeightScale (100.0) relative units.
   */
  readonly data: Float32Array;
  
  /** Minimum relative height value (typically 0.0) */
  readonly min: number;
  /** Maximum relative height value (typically 100.0) */
  readonly max: number;
  /** Mean relative height value */
  readonly mean: number;
  
  /** Full model provenance carried from DepthResult */
  readonly provenance: DepthModelProvenance;
  
  /** Explicit transformation metadata */
  readonly transformation: RelativeHeightfieldTransformation;
  
  /** Explicit scientific integrity status */
  readonly calibrationStatus: 'uncalibrated_relative';
  
  /** Dimensions of the optical source raster */
  readonly sourceDimensions: {
    readonly width: number;
    readonly height: number;
  };
}
