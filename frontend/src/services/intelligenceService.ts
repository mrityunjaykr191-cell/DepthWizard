/**
 * DepthWizard — Advanced Terrain Intelligence Service Client
 * Authority: Phase 4E Specification
 */

import {
  LineOfSightRequest,
  LineOfSightResponse,
  RouteProfileRequest,
  RouteProfileResponse,
  TerrainScreeningRequest,
  TerrainScreeningResponse
} from '../types/intelligence';
import { apiUrl } from './api';

const API_BASE = apiUrl('/api');

export async function fetchLineOfSight(req: LineOfSightRequest): Promise<LineOfSightResponse> {
  const resp = await fetch(`${API_BASE}/terrain/los`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Failed to compute line of sight' }));
    throw new Error(errorData.detail || `Line of sight request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function fetchRouteProfile(req: RouteProfileRequest): Promise<RouteProfileResponse> {
  const resp = await fetch(`${API_BASE}/terrain/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Failed to assess route profile' }));
    throw new Error(errorData.detail || `Route profile request failed with status ${resp.status}`);
  }

  return resp.json();
}

export async function fetchTerrainScreening(req: TerrainScreeningRequest): Promise<TerrainScreeningResponse> {
  const resp = await fetch(`${API_BASE}/terrain/screening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Failed to screen terrain' }));
    throw new Error(errorData.detail || `Terrain screening request failed with status ${resp.status}`);
  }

  return resp.json();
}
