/**
 * DepthWizard — Image Ingestion Contract
 * Authority: docs/product/output-contract.md & Phase 2A Specification
 * 
 * Defines the clean typed representation of raw user-uploaded imagery
 * before any downstream AI inference (Phase 2B) or DSM reconstruction (Phase 2C).
 */

export type InputImageFormat = 'jpeg' | 'png' | 'geotiff' | 'tiff' | 'unknown';

export type IngestionStatus = 'idle' | 'validating' | 'decoding' | 'ready' | 'error';

export interface SpatialMetadata {
  /** Whether valid georeferencing metadata (CRS, tiepoints, affine transform) was detected */
  hasGeoreference: boolean;
  /** Detected Coordinate Reference System string (e.g., "EPSG:32632 (WGS 84 / UTM zone 32N)") or null */
  crs: string | null;
  /** Explicit EPSG integer code if detected */
  epsgCode: number | null;
  /** Affine geotransform: [originX, pixelWidth, rotX, originY, rotY, pixelHeight] or null */
  geotransform: [number, number, number, number, number, number] | null;
  /** Geospatial bounding box in projected/geographic units or null */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
  /** Physical pixel resolution (in projected map units per pixel) or null */
  pixelResolution: { x: number; y: number } | null;
  /** Declared NoData value or null */
  noData: number | null;
}

export interface ImageInputMetadata {
  filename: string;
  fileSize: number; // bytes
  fileSizeBytesFormatted: string; // e.g. "4.2 MB"
  format: InputImageFormat;
  mimeType: string;
  width: number;
  height: number;
  channels: number; // 1 (grayscale), 3 (RGB), 4 (RGBA)
  channelDescription: string; // e.g. "RGB (3 channels)" or "RGBA (4 channels)"
  bitDepth: number; // e.g. 8, 16, 32
  spatial: SpatialMetadata;
}

export interface IngestionError {
  code: string;
  message: string;
  details?: string;
  diagnosticAdvice?: string;
}

export interface ImageInput {
  id: string;
  status: IngestionStatus;
  metadata: ImageInputMetadata | null;
  /** Managed Object URL for DOM image preview. Must be revoked when replaced or removed. */
  previewUrl: string | null;
  /** Reference to original File handle for subsequent Phase 2B inference */
  file: File | null;
  error: IngestionError | null;
}
