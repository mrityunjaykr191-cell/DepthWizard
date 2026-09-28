/**
 * DepthWizard — Image Ingestion Service
 * Authority: docs/product/output-contract.md & Phase 2A Specification
 * 
 * Handles file validation, format detection, decoding, geospatial metadata inspection,
 * and memory-safe resource lifecycle management for single-view raster imagery.
 */

import { fromArrayBuffer, GeoTIFFImage } from 'geotiff';
import { 
  ImageInput, 
  ImageInputMetadata, 
  InputImageFormat, 
  SpatialMetadata,
  IngestionError 
} from '../types/imageInput';

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB ceiling

/**
 * Common EPSG code definitions for readable CRS display.
 * Avoids heavy projection libraries in Phase 2A while providing clean technical labels.
 */
const KNOWN_EPSG_NAMES: Record<number, string> = {
  4326: 'EPSG:4326 (WGS 84 / Geographic)',
  3857: 'EPSG:3857 (WGS 84 / Pseudo-Mercator)',
  32601: 'EPSG:32601 (WGS 84 / UTM Zone 1N)',
  32631: 'EPSG:32631 (WGS 84 / UTM Zone 31N)',
  32632: 'EPSG:32632 (WGS 84 / UTM Zone 32N)',
  32633: 'EPSG:32633 (WGS 84 / UTM Zone 33N)',
  32643: 'EPSG:32643 (WGS 84 / UTM Zone 43N)',
  32644: 'EPSG:32644 (WGS 84 / UTM Zone 44N)',
  32645: 'EPSG:32645 (WGS 84 / UTM Zone 45N)',
  25832: 'EPSG:25832 (ETRS89 / UTM Zone 32N)',
  2154: 'EPSG:2154 (RGF93 / Lambert-93)'
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function detectFormat(filename: string, mimeType: string): InputImageFormat {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.tif') || lowerName.endsWith('.tiff') || mimeType.includes('tiff')) {
    return 'tiff'; // Specific GeoTIFF detection occurs during metadata inspection
  }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || mimeType.includes('jpeg')) {
    return 'jpeg';
  }
  if (lowerName.endsWith('.png') || mimeType.includes('png')) {
    return 'png';
  }
  return 'unknown';
}

/**
 * Validates file existence, non-zero size, file size ceiling, and supported extensions.
 */
export function validateFile(file: File): { valid: boolean; error?: IngestionError } {
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: {
        code: 'EMPTY_FILE',
        message: 'The selected file is empty (0 bytes).',
        details: `File "${file?.name || 'unknown'}" contains no data.`,
        diagnosticAdvice: 'Please select a valid image file with non-zero byte size.'
      }
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size (${formatFileSize(file.size)}) exceeds the ${formatFileSize(MAX_FILE_SIZE_BYTES)} in-browser limit.`,
        details: `Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
        diagnosticAdvice: 'Please downsample or crop the imagery before uploading.'
      }
    };
  }

  const format = detectFormat(file.name, file.type);
  if (format === 'unknown') {
    return {
      valid: false,
      error: {
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format for "${file.name}".`,
        details: `Detected MIME: "${file.type || 'unknown'}". Accepted formats are JPG/JPEG, PNG, and GeoTIFF/TIFF.`,
        diagnosticAdvice: 'Convert or export the overhead capture as a standard JPG, PNG, or GeoTIFF.'
      }
    };
  }

  return { valid: true };
}

/**
 * Revokes a blob URL if it was created by URL.createObjectURL to avoid memory leaks.
 */
export function revokePreviewUrl(url: string | null): void {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore if already revoked
    }
  }
}

/**
 * Parses and decodes standard web raster images (JPG, PNG).
 */
async function parseStandardImage(file: File, format: 'jpeg' | 'png'): Promise<{
  metadata: ImageInputMetadata;
  previewUrl: string;
}> {
  const previewUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        revokePreviewUrl(previewUrl);
        reject({
          code: 'INVALID_DIMENSIONS',
          message: 'The image has invalid dimensions (0 × 0).',
          details: 'Image failed to decode into valid pixel dimensions.',
          diagnosticAdvice: 'Ensure the image file is not corrupted.'
        });
        return;
      }

      const isPng = format === 'png';
      const channels = isPng ? 4 : 3;
      const channelDescription = isPng ? 'RGBA (4 channels)' : 'RGB (3 channels)';

      const spatial: SpatialMetadata = {
        hasGeoreference: false,
        crs: null,
        epsgCode: null,
        geotransform: null,
        bounds: null,
        pixelResolution: null,
        noData: null
      };

      const metadata: ImageInputMetadata = {
        filename: file.name,
        fileSize: file.size,
        fileSizeBytesFormatted: formatFileSize(file.size),
        format,
        mimeType: file.type || (format === 'jpeg' ? 'image/jpeg' : 'image/png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
        channels,
        channelDescription,
        bitDepth: 8,
        spatial
      };

      resolve({ metadata, previewUrl });
    };

    img.onerror = () => {
      revokePreviewUrl(previewUrl);
      reject({
        code: 'DECODE_FAILURE',
        message: `Failed to decode ${format.toUpperCase()} image "${file.name}".`,
        details: 'The image file appears corrupted or has an unreadable encoding.',
        diagnosticAdvice: 'Re-export the image from your GIS or graphics tool and try again.'
      });
    };

    img.src = previewUrl;
  });
}

/**
 * Extracts geospatial metadata from a GeoTIFFImage instance.
 * Strictly adheres to geospatial truth: never fabricates coordinates or CRS if missing.
 */
async function extractGeoTiffSpatialMetadata(image: GeoTIFFImage, width: number, height: number): Promise<SpatialMetadata> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileDirectory = image.getFileDirectory() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoKeys = (image as any).geoKeys || (typeof (image as any).getGeoKeys === 'function' ? (image as any).getGeoKeys() : null);

  let epsgCode: number | null = null;
  let crs: string | null = null;

  if (geoKeys) {
    if (typeof geoKeys.ProjectedCSTypeGeoKey === 'number' && geoKeys.ProjectedCSTypeGeoKey > 0 && geoKeys.ProjectedCSTypeGeoKey !== 32767) {
      epsgCode = geoKeys.ProjectedCSTypeGeoKey;
    } else if (typeof geoKeys.GeographicTypeGeoKey === 'number' && geoKeys.GeographicTypeGeoKey > 0 && geoKeys.GeographicTypeGeoKey !== 32767) {
      epsgCode = geoKeys.GeographicTypeGeoKey;
    }
  }

  if (epsgCode) {
    crs = KNOWN_EPSG_NAMES[epsgCode] || `EPSG:${epsgCode}`;
  }

  let geotransform: [number, number, number, number, number, number] | null = null;
  let bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  let pixelResolution: { x: number; y: number } | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tiePoints: any[] | null = null;
  try {
    const rawTiePoints = await (image as any).getTiePoints();
    if (Array.isArray(rawTiePoints)) {
      tiePoints = rawTiePoints;
    }
  } catch {
    tiePoints = null;
  }

  const pixelScale = fileDirectory?.ModelPixelScale;

  if (tiePoints && tiePoints.length > 0 && pixelScale && pixelScale.length >= 2) {
    const originX = tiePoints[0].x;
    const originY = tiePoints[0].y;
    const scaleX = pixelScale[0];
    const scaleY = pixelScale[1];

    geotransform = [originX, scaleX, 0, originY, 0, -scaleY];
    pixelResolution = { x: scaleX, y: scaleY };

    bounds = {
      minX: originX,
      maxX: originX + width * scaleX,
      minY: originY - height * scaleY,
      maxY: originY
    };
  } else if (fileDirectory?.ModelTransformation && fileDirectory.ModelTransformation.length === 16) {
    const m = fileDirectory.ModelTransformation;
    const originX = m[3];
    const originY = m[7];
    const scaleX = Math.abs(m[0]);
    const scaleY = Math.abs(m[5]);

    geotransform = [originX, m[0], m[1], originY, m[4], m[5]];
    pixelResolution = { x: scaleX, y: scaleY };
    bounds = {
      minX: originX,
      maxX: originX + width * scaleX,
      minY: originY - height * scaleY,
      maxY: originY
    };
  } else {
    // Try native getBoundingBox() if available on GeoTIFFImage
    try {
      if (typeof (image as any).getBoundingBox === 'function') {
        const rawBbox = (image as any).getBoundingBox();
        if (Array.isArray(rawBbox) && rawBbox.length === 4) {
          bounds = {
            minX: rawBbox[0],
            minY: rawBbox[1],
            maxX: rawBbox[2],
            maxY: rawBbox[3]
          };
          const scaleX = (bounds.maxX - bounds.minX) / width;
          const scaleY = (bounds.maxY - bounds.minY) / height;
          pixelResolution = { x: scaleX, y: scaleY };
          geotransform = [bounds.minX, scaleX, 0, bounds.maxY, 0, -scaleY];
        }
      }
    } catch {
      // Ignored if not available
    }
  }

  const hasGeoreference = Boolean(crs || geotransform || bounds);
  const noData = typeof fileDirectory?.GDAL_NODATA === 'number' ? fileDirectory.GDAL_NODATA : null;

  return {
    hasGeoreference,
    crs,
    epsgCode,
    geotransform,
    bounds,
    pixelResolution,
    noData
  };
}

/**
 * Creates a browser-renderable PNG Object URL from a decoded GeoTIFF raster.
 */
async function createTiffPreviewUrl(image: GeoTIFFImage, width: number, height: number): Promise<string> {
  const canvas = document.createElement('canvas');
  // Downsample very large rasters for the preview to preserve memory
  const maxDimension = 2048;
  let targetWidth = width;
  let targetHeight = height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const scale = maxDimension / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  try {
    // Attempt standard RGB read
    const rgbData = await image.readRGB({
      width: targetWidth,
      height: targetHeight,
      interleave: true
    });

    const imageData = ctx.createImageData(targetWidth, targetHeight);
    const data = imageData.data;
    const rgbTyped = rgbData as unknown as Uint8Array | Uint8ClampedArray;

    let srcIdx = 0;
    let dstIdx = 0;
    const totalPixels = targetWidth * targetHeight;

    for (let i = 0; i < totalPixels; i++) {
      data[dstIdx] = rgbTyped[srcIdx];
      data[dstIdx + 1] = rgbTyped[srcIdx + 1];
      data[dstIdx + 2] = rgbTyped[srcIdx + 2];
      data[dstIdx + 3] = 255;
      srcIdx += 3;
      dstIdx += 4;
    }

    ctx.putImageData(imageData, 0, 0);
  } catch {
    // Fallback for single-channel float or non-standard photometric rasters
    const rasters = await image.readRasters({
      width: targetWidth,
      height: targetHeight,
      interleave: false
    });

    const firstBand = rasters[0] as unknown as Float32Array | Uint16Array | Uint8Array;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < firstBand.length; i++) {
      const v = firstBand[i];
      if (Number.isFinite(v) && v > -9990) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    const range = (max - min) || 1;
    const imageData = ctx.createImageData(targetWidth, targetHeight);
    const data = imageData.data;

    for (let i = 0; i < firstBand.length; i++) {
      const v = firstBand[i];
      const norm = Math.max(0, Math.min(255, Math.round(((v - min) / range) * 255)));
      const dst = i * 4;
      data[dst] = norm;
      data[dst + 1] = norm;
      data[dst + 2] = norm;
      data[dst + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        reject(new Error('Failed to create Blob from GeoTIFF canvas.'));
      }
    }, 'image/png');
  });
}

/**
 * Parses and decodes TIFF and GeoTIFF raster images.
 */
async function parseTiffImage(file: File): Promise<{
  metadata: ImageInputMetadata;
  previewUrl: string;
}> {
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    throw {
      code: 'UNREADABLE_FILE',
      message: `Failed to read file "${file.name}".`,
      details: 'Browser could not read the file into an ArrayBuffer.',
      diagnosticAdvice: 'Check file permissions or try re-selecting the file.'
    } as IngestionError;
  }

  // Parse TIFF headers
  let tiff;
  let image: GeoTIFFImage;
  try {
    tiff = await fromArrayBuffer(arrayBuffer);
    image = await tiff.getImage();
  } catch (err: unknown) {
    throw {
      code: 'MALFORMED_TIFF',
      message: `Failed to parse TIFF structure for "${file.name}".`,
      details: err instanceof Error ? err.message : 'Invalid or corrupted TIFF header/tags.',
      diagnosticAdvice: 'Verify that the file is a valid TIFF or GeoTIFF raster.'
    } as IngestionError;
  }

  const width = image.getWidth();
  const height = image.getHeight();

  if (!width || !height || width <= 0 || height <= 0) {
    throw {
      code: 'INVALID_DIMENSIONS',
      message: `Invalid raster dimensions (${width} × ${height}).`,
      details: 'Raster dimensions must be positive non-zero integers.',
      diagnosticAdvice: 'Check the TIFF image header in your GIS software.'
    } as IngestionError;
  }

  const samplesPerPixel = image.getSamplesPerPixel() || 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBps: any = image.getBitsPerSample();
  const bitDepth = Array.isArray(rawBps) ? Number(rawBps[0]) : (typeof rawBps === 'number' ? rawBps : 8);

  const spatial = await extractGeoTiffSpatialMetadata(image, width, height);
  const isGeoTiff = spatial.hasGeoreference;
  const format: InputImageFormat = isGeoTiff ? 'geotiff' : 'tiff';

  let channelDescription = 'Single-band (Grayscale)';
  if (samplesPerPixel === 3) channelDescription = 'RGB (3 channels)';
  if (samplesPerPixel === 4) channelDescription = 'RGBA (4 channels)';
  if (samplesPerPixel > 4) channelDescription = `Multispectral (${samplesPerPixel} channels)`;

  let previewUrl = '';
  try {
    previewUrl = await createTiffPreviewUrl(image, width, height);
  } catch (err: unknown) {
    throw {
      code: 'TIFF_PREVIEW_FAILURE',
      message: 'Failed to generate visual preview from TIFF raster.',
      details: err instanceof Error ? err.message : 'Unsupported compression or photometric interpretation.',
      diagnosticAdvice: 'Ensure the TIFF uses standard LZW, Deflate, or Uncompressed encoding.'
    } as IngestionError;
  }

  const metadata: ImageInputMetadata = {
    filename: file.name,
    fileSize: file.size,
    fileSizeBytesFormatted: formatFileSize(file.size),
    format,
    mimeType: file.type || 'image/tiff',
    width,
    height,
    channels: samplesPerPixel,
    channelDescription,
    bitDepth,
    spatial
  };

  return { metadata, previewUrl };
}

/**
 * Top-Level Image Ingestion Orchestrator.
 * Validates, decodes, extracts technical metadata, and produces a typed ImageInput representation.
 */
export async function ingestImageFile(file: File): Promise<ImageInput> {
  const id = `input-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Validation
  const validation = validateFile(file);
  if (!validation.valid && validation.error) {
    return {
      id,
      status: 'error',
      metadata: null,
      previewUrl: null,
      file: null,
      error: validation.error
    };
  }

  const format = detectFormat(file.name, file.type);

  try {
    // 2. Decoding & Metadata Inspection
    let result: { metadata: ImageInputMetadata; previewUrl: string };

    if (format === 'tiff') {
      result = await parseTiffImage(file);
    } else if (format === 'jpeg' || format === 'png') {
      result = await parseStandardImage(file, format);
    } else {
      throw {
        code: 'UNSUPPORTED_FORMAT',
        message: `Format ${format} is not supported.`,
        diagnosticAdvice: 'Select a JPG, PNG, or GeoTIFF image.'
      } as IngestionError;
    }

    return {
      id,
      status: 'ready',
      metadata: result.metadata,
      previewUrl: result.previewUrl,
      file,
      error: null
    };
  } catch (err: unknown) {
    const errorObj = err as IngestionError;
    return {
      id,
      status: 'error',
      metadata: null,
      previewUrl: null,
      file: null,
      error: {
        code: errorObj.code || 'INGESTION_ERROR',
        message: errorObj.message || 'An unexpected error occurred during image ingestion.',
        details: errorObj.details,
        diagnosticAdvice: errorObj.diagnosticAdvice || 'Verify the file format and try again.'
      }
    };
  }
}
