/**
 * DepthWizard — Depth Estimation Contract
 * Authority: docs/product/output-contract.md & Phase 2B Specification
 * 
 * Represents the numerical relative depth map output from the DepthEstimator backend,
 * maintaining Float32 scientific integrity and 2D colormap preview.
 * 
 * CRITICAL SCIENTIFIC TRUTH:
 * calibrationStatus is explicitly 'uncalibrated_relative'.
 * Relative depth values do NOT represent real-world metric elevation or DSM (Phase 2C / Phase 3).
 */

export interface DepthModelProvenance {
  modelId: string;
  modelVariant: string;
  provider: string;
  checkpoint: string;
  device: string;
  inferenceTimeMs: number;
}

export interface DepthResult {
  id: string;
  status: 'complete';
  width: number;
  height: number;
  depthMin: number;
  depthMax: number;
  depthMean: number;
  provenance: DepthModelProvenance;
  /** Explicit scientific truth flag: values are uncalibrated unitless relative depth */
  calibrationStatus: 'uncalibrated_relative';
  /** Lossless raw 32-bit floating point depth values [height * width] */
  rawDepth: Float32Array;
  /** Base64 PNG data URL of Viridis colormap for instantaneous 2D rendering */
  previewDataUrl: string;
}

export interface BackendDepthResponse {
  status: string;
  width: number;
  height: number;
  depth_min: number;
  depth_max: number;
  depth_mean: number;
  model_id: string;
  model_variant: string;
  provider: string;
  checkpoint: string;
  device: string;
  inference_time_ms: number;
  calibration_status: string;
  depth_raw_b64: string;
  preview_data_url: string;
}

export interface BackendHealthResponse {
  status: string;
  model_ready: boolean;
  provider: string;
  model_variant: string;
  checkpoint: string;
  device: string;
}
