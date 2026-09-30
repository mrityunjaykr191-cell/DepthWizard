/// <reference types="vite/client" />

/**
 * DepthWizard — Central API Configuration
 * 
 * Provides a canonical URL builder for all backend API service clients.
 * In local development (VITE_API_BASE_URL empty/unset), defaults to relative '/api/...' paths proxied by Vite.
 * In production (e.g., Vercel), prefixes calls with VITE_API_BASE_URL (e.g. Modal backend).
 */

const API_BASE_URL = "https://mrityunjaykr191-cell--depthwizard-backend-fastapi-app.modal.run"

export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
