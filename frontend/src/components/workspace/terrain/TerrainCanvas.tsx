/**
 * DepthWizard — Terrain Canvas Host Component
 * Authority: Phase 1B.3 Scope & docs/architecture/frontend.md
 *
 * Encapsulates the native Three.js WebGL canvas within React's component lifecycle.
 * Maintains strict separation: React owns application state, Three.js owns 3D rendering.
 */

import React, { useEffect, useRef } from 'react';
import { TerrainResult } from '../../../types/contract';
import { CameraPreset, ViewMode, useWorkspace } from '../../../state/WorkspaceContext';
import { TerrainRenderAdapter } from './terrainRenderAdapter';
import { CameraOrientation } from './TerrainCamera';

export interface TerrainCanvasProps {
  result: TerrainResult;
  verticalExaggeration: number;
  viewMode?: ViewMode;
  cameraPreset?: CameraPreset;
  autoRotate?: boolean;
  onOrientationChange?: (orientation: CameraOrientation) => void;
  onAutoRotateChange?: (enabled: boolean) => void;
  onPresetChange?: (preset: CameraPreset) => void;
}

export const TerrainCanvas: React.FC<TerrainCanvasProps> = ({
  result,
  verticalExaggeration,
  viewMode,
  cameraPreset,
  autoRotate,
  onOrientationChange,
  onAutoRotateChange,
  onPresetChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<TerrainRenderAdapter | null>(null);

  const {
    imageInput,
    activeTool,
    activeLayer,
    slopeArray,
    hillshadeArray,
    analyticsResult,
    selectedPointA,
    selectedPointB,
    handleTerrainClick,
    observerOffsetA,
    targetOffsetB,
    losResult,
    screeningMask,
    errorMapArray,
    validationResult,
    isModelSurface
  } = useWorkspace();

  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate native Three.js adapter with generic TerrainResult
    const adapter = new TerrainRenderAdapter(containerRef.current, {
      result,
      initialExaggeration: verticalExaggeration,
      initialViewMode: viewMode,
      initialPreset: cameraPreset,
      autoRotate,
      onOrientationChange,
      onAutoRotateChange,
      onPresetChange,
      onTerrainClick: (coords) => {
        handleTerrainClick(coords.rasterX, coords.rasterY, coords.worldPoint);
      }
    });
    adapterRef.current = adapter;

    // Strict cleanup routine to eliminate memory and WebGL context leaks
    return () => {
      adapter.dispose();
      adapterRef.current = null;
    };
  }, []); // Run on mount/unmount only

  // Keep click handler updated with current tool & context
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setOnTerrainClick((coords) => {
        handleTerrainClick(coords.rasterX, coords.rasterY, coords.worldPoint);
      });
    }
  }, [handleTerrainClick, activeTool]);

  // Update visual 3D measurement markers whenever active tool or points change
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.updateMeasurementMarkers({
        tool: activeTool,
        pointA: selectedPointA,
        pointB: selectedPointB,
        observerOffsetA,
        targetOffsetB,
        losResult
      });
    }
  }, [activeTool, selectedPointA, selectedPointB, observerOffsetA, targetOffsetB, losResult]);

  // Propagate analytical layer updates (Elevation, Slope, Hillshade, Screening, or Default Bedrock)
  useEffect(() => {
    if (adapterRef.current && result.elevation?.data) {
      let minElev = result.elevation.min;
      let maxElev = result.elevation.max;
      if (minElev === undefined || maxElev === undefined) {
        const data = result.elevation.data;
        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i < data.length; i++) {
          const v = data[i];
          if (!isNaN(v)) {
            if (v < mn) mn = v;
            if (v > mx) mx = v;
          }
        }
        minElev = mn === Infinity ? 0 : mn;
        maxElev = mx === -Infinity ? 100 : mx;
      }

      adapterRef.current.setTerrainLayer({
        layer: activeLayer,
        elevations: result.elevation.data instanceof Float32Array ? result.elevation.data : new Float32Array(result.elevation.data),
        minElev,
        maxElev,
        slopeData: slopeArray ?? undefined,
        minSlope: analyticsResult?.slope?.min ?? 0,
        maxSlope: analyticsResult?.slope?.max ?? (analyticsResult?.slope?.is_physical ? 60 : 0.5),
        hillshadeData: hillshadeArray ?? undefined,
        screeningMask: screeningMask ?? undefined,
        errorData: errorMapArray ?? undefined,
        minError: validationResult?.error_min ?? -5.0,
        maxError: validationResult?.error_max ?? 5.0,
        nodata: result.geospatial?.nodata ?? null,
        rgbTextureUrl: (isModelSurface && imageInput?.previewUrl) ? imageInput.previewUrl : null
      });
    }
  }, [activeLayer, result, slopeArray, hillshadeArray, analyticsResult, screeningMask, errorMapArray, validationResult, imageInput?.previewUrl, isModelSurface]);

  // Propagate terrain data changes imperatively when the active result updates
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setTerrainResult(result);
    }
  }, [result]);

  // Propagate vertical exaggeration updates imperatively without rebuilding the scene
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setVerticalExaggeration(verticalExaggeration);
    }
  }, [verticalExaggeration]);

  // Propagate viewMode changes
  useEffect(() => {
    if (adapterRef.current && viewMode) {
      adapterRef.current.setViewMode(viewMode);
    }
  }, [viewMode]);

  // Propagate cameraPreset changes
  useEffect(() => {
    if (adapterRef.current && cameraPreset) {
      adapterRef.current.setCameraPreset(cameraPreset);
    }
  }, [cameraPreset]);

  // Propagate autoRotate changes
  useEffect(() => {
    if (adapterRef.current && typeof autoRotate === 'boolean') {
      adapterRef.current.setAutoRotate(autoRotate);
    }
  }, [autoRotate]);

  const isMeasurementActive = activeTool === 'height-probe' || activeTool === 'two-point' || activeTool === 'cross-section';
  const cursorClass = viewMode === 'first-person' || isMeasurementActive
    ? 'cursor-crosshair'
    : 'cursor-grab active:cursor-grabbing';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden bg-[#080c12] focus:outline-none ${cursorClass}`}
      tabIndex={0}
      aria-label="Native Three.js 3D Terrain Viewport"
      role="region"
    />
  );
};
