/**
 * DepthWizard — Geospatial Export & Report API Client
 * Phase 5B: Geospatial Export + Terrain Analysis Report
 */

import { SessionExport, TerrainExportParams } from '../types/export';
import { apiUrl } from './api';

const API_BASE = apiUrl('/api/export');

/**
 * Downloads a binary Blob in the user's browser.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Export full canonical Session JSON.
 */
export async function downloadSessionJson(session: SessionExport): Promise<void> {
  const response = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'Session export failed');
  }

  const filename = getFilenameFromHeader(response, `DepthWizard_session_${session.input.filename || 'terrain'}.json`);
  const blob = await response.blob();
  triggerBrowserDownload(blob, filename);
}

/**
 * Export terrain raster as GeoTIFF DSM, relative heightmap, or signed error map.
 */
export async function downloadTerrainRaster(params: TerrainExportParams): Promise<void> {
  const response = await fetch(`${API_BASE}/terrain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'Terrain raster export failed');
  }

  const defaultExt = 'tif';
  const filename = getFilenameFromHeader(response, `DepthWizard_${params.format}_${params.scene_name}.${defaultExt}`);
  const blob = await response.blob();
  triggerBrowserDownload(blob, filename);
}

/**
 * Export quantitative analysis as JSON, GeoJSON, or CSV.
 */
export async function downloadAnalysisData(
  session: SessionExport, 
  format: 'json' | 'geojson' | 'csv', 
  profileTool: string = 'cross_section'
): Promise<void> {
  const response = await fetch(`${API_BASE}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, session, profile_tool: profileTool })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'Analysis export failed');
  }

  const extMap: Record<string, string> = { json: 'json', geojson: 'geojson', csv: 'csv' };
  const filename = getFilenameFromHeader(response, `DepthWizard_${format}_${session.input.filename || 'analysis'}.${extMap[format]}`);
  const blob = await response.blob();
  triggerBrowserDownload(blob, filename);
}

/**
 * Export Terrain Analysis Report as HTML or PDF.
 */
export async function downloadTerrainReport(
  session: SessionExport, 
  format: 'html' | 'pdf'
): Promise<void> {
  const response = await fetch(`${API_BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, session })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'Report generation failed');
  }

  const filename = getFilenameFromHeader(response, `DepthWizard_report_${session.input.filename || 'scene'}.${format}`);
  const blob = await response.blob();
  triggerBrowserDownload(blob, filename);
}

/**
 * Helper to extract filename from Content-Disposition header if present.
 */
function getFilenameFromHeader(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return fallback;
}
