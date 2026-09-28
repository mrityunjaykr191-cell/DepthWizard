/**
 * DepthWizard — Validation & Error Analysis Service Client
 * Authority: Phase 5A Specification & docs/product/output-contract.md
 */

import { TerrainValidationRequest, TerrainValidationResponse } from '../types/validation';

const API_BASE = '/api';

export async function fetchTerrainValidation(
  req: TerrainValidationRequest
): Promise<TerrainValidationResponse> {
  const resp = await fetch(`${API_BASE}/terrain/validation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Failed to run terrain validation' }));
    throw new Error(errorData.detail || `Validation request failed with status ${resp.status}`);
  }

  return resp.json();
}
