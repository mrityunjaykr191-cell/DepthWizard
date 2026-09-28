/**
 * DepthWizard — Depth Estimation Client Service
 * Authority: docs/architecture/ml-integration.md & Phase 2B Specification
 * 
 * Communicates with the FastAPI Depth Estimation backend, performs base64-to-Float32Array
 * binary reconstruction for lossless numerical depth transport, and handles connection states.
 */

import { 
  DepthResult, 
  BackendDepthResponse, 
  BackendHealthResponse 
} from '../types/depthResult';

/**
 * Decodes a base64-encoded little-endian Float32 binary buffer into a typed Float32Array.
 * Maintains full 32-bit floating point precision without JSON conversion overhead.
 */
export function decodeBase64ToFloat32(b64: string): Float32Array {
  const binaryString = window.atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

/**
 * Verifies that the FastAPI depth estimation backend is online and reachable.
 */
export async function checkDepthBackendHealth(): Promise<BackendHealthResponse> {
  const response = await fetch('/api/health', {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Depth estimation backend returned HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sends an optical image raster to the depth estimation backend and receives
 * the canonical relative depth map with model provenance and lossless Float32 array.
 */
export async function requestDepthEstimation(
  file: File | Blob, 
  filename: string = 'image.png',
  provider?: string
): Promise<DepthResult> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append('file', file, file.name);
  } else {
    formData.append('file', file, filename);
  }
  if (provider) {
    formData.append('provider', provider);
  }

  let response: Response;
  try {
    response = await fetch('/api/depth', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to connect to depth estimation service: ${errorMsg}. Ensure the Python backend is running on port 8000.`
    );
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    throw new Error(`Depth estimation failed: ${errorDetail}`);
  }

  const data: BackendDepthResponse = await response.json();

  // Lossless binary decode of raw Float32 array
  const rawDepth = decodeBase64ToFloat32(data.depth_raw_b64);

  // Validate array size against declared dimensions
  const expectedLength = data.width * data.height;
  if (rawDepth.length !== expectedLength) {
    console.warn(
      `[DepthService] Warning: Decoded depth array length (${rawDepth.length}) differs from dimensions ${data.width}x${data.height} (${expectedLength})`
    );
  }

  const result: DepthResult = {
    id: `depth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: 'complete',
    width: data.width,
    height: data.height,
    depthMin: data.depth_min,
    depthMax: data.depth_max,
    depthMean: data.depth_mean,
    provenance: {
      modelId: data.model_id,
      modelVariant: data.model_variant,
      provider: data.provider,
      checkpoint: data.checkpoint,
      device: data.device,
      inferenceTimeMs: data.inference_time_ms,
    },
    calibrationStatus: 'uncalibrated_relative',
    rawDepth,
    previewDataUrl: data.preview_data_url,
  };

  return result;
}
