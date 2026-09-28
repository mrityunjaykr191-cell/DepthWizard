import React, { useState } from 'react';
import { useWorkspace, CameraPreset } from '../../state/WorkspaceContext';
import { AnimatePresence, motion } from 'motion/react';
import { TerrainCanvas } from './terrain/TerrainCanvas';
import { CameraOrientation } from './terrain/TerrainCamera';
import {
  Box,
  Map,
  Footprints,
  Layers,
  Compass,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';

function getInteractionPrompt(activeTool: string, viewMode: string, autoRotate: boolean): string {
  if (viewMode === 'first-person') {
    return 'WASD / ARROWS TO MOVE · DRAG TO LOOK · ESC TO EXIT';
  }
  if (autoRotate && viewMode === '3d') {
    return 'AUTO-ROTATING · DRAG TO PAUSE';
  }

  switch (activeTool) {
    case 'height-probe':
      return 'CLICK TERRAIN TO SAMPLE HEIGHT';
    case 'two-point':
      return 'SELECT POINT A → SELECT POINT B';
    case 'slope':
      return 'REVIEW TERRAIN STEEPNESS';
    case 'cross-section':
      return 'SELECT START → SELECT END';
    case 'line-of-sight':
      return 'SELECT OBSERVER → SELECT TARGET';
    case 'route-profile':
      return 'SELECT START → SELECT END';
    case 'terrain-screening':
      return 'CONFIGURE SCREENING CRITERIA';
    case 'validation':
      return 'OPEN VALIDATION PANEL';
    default:
      return 'EXPLORE TERRAIN';
  }
}

export const TerrainViewport: React.FC = () => {
  const {
    result,
    viewMode,
    cameraPreset,
    setCameraPreset,
    autoRotate,
    setAutoRotate,
    activeLayer,
    setActiveLayer,
    activeLayerLegend,
    isAnalyticsLoading,
    activeTool,
    uiState,
    verticalExaggeration,
    setVerticalExaggeration,
    wireframe,
    setWireframe,
    imageInput,
    screeningMask,
    errorMapArray
  } = useWorkspace();

  const [cameraOrientation, setCameraOrientation] = useState<CameraOrientation>({
    azimuthDeg: 40,
    elevationDeg: 35,
    distance: 120
  });

  const presets: { id: CameraPreset; label: string; title: string }[] = [
    { id: 'TOP', label: 'TOP', title: 'Top-down overhead perspective' },
    { id: 'NORTH', label: 'N', title: 'Look North' },
    { id: 'SOUTH', label: 'S', title: 'Look South' },
    { id: 'EAST', label: 'E', title: 'Look East' },
    { id: 'WEST', label: 'W', title: 'Look West' }
  ];

  return (
    <main
      className="flex-1 flex flex-col bg-dw-base relative overflow-hidden select-none"
      aria-label="Terrain Viewport"
    >
      {/* Top Floating Telemetry & Controls HUD — Refactored Three-Part Structure */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none gap-2">
        {/* Left: View Mode Tag & Core Scientific Layer Switcher */}
        <div className="flex items-center space-x-2 pointer-events-auto shrink-0">
          {/* Active View Mode Tag */}
          <div
            className="px-2.5 py-1 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-xs font-mono flex items-center space-x-1.5 backdrop-blur-sm shadow-sm transition-all duration-fast"
            title={`Active View Mode: ${viewMode}`}
          >
            {viewMode === '3d' && <Box className="w-3.5 h-3.5 text-dw-accent" />}
            {viewMode === 'topographic' && <Map className="w-3.5 h-3.5 text-dw-accent" />}
            {viewMode === 'first-person' && <Footprints className="w-3.5 h-3.5 text-dw-accent" />}
            <span className="uppercase text-dw-text-primary font-semibold text-[11px]">
              {viewMode === 'first-person' ? '1ST PERSON' : viewMode}
            </span>
          </div>

          {/* Quick Analytical Layer Switcher */}
          <div className="px-1.5 py-0.5 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-xs font-mono flex items-center space-x-1 backdrop-blur-sm shadow-sm transition-all duration-fast">
            {([
              { id: 'rgb', label: 'RGB / IMAGERY', available: true },
              { id: 'elevation', label: 'ELEVATION', available: true },
              { id: 'slope', label: 'SLOPE', available: result.capabilities.slope },
              { id: 'hillshade', label: 'HILLSHADE', available: result.capabilities.hillshade }
            ] as const).map((l) => (
              <button
                key={l.id}
                onClick={() => l.available && setActiveLayer(l.id)}
                disabled={!l.available}
                title={l.available ? `Switch to ${l.label} layer` : `${l.label} unavailable`}
                className={`px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-medium transition-all ${
                  activeLayer === l.id
                    ? 'bg-dw-accent text-white font-semibold shadow-xs'
                    : l.available
                    ? 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/70'
                    : 'text-dw-text-disabled cursor-not-allowed opacity-35'
                }`}
              >
                {l.label}
              </button>
            ))}
            {isAnalyticsLoading && (
              <Loader2 className="w-3 h-3 text-dw-accent animate-spin ml-1 mr-1" />
            )}
          </div>

          {/* Geometry Mesh Mode Toggle: Solid / Wireframe */}
          <div
            className="px-1.5 py-0.5 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-xs font-mono flex items-center space-x-1 backdrop-blur-sm shadow-sm transition-all duration-fast"
            role="group"
            aria-label="Terrain geometry display mode"
          >
            <button
              type="button"
              onClick={() => setWireframe(false)}
              className={`px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-medium transition-all ${
                !wireframe
                  ? 'bg-dw-accent text-white font-semibold shadow-xs'
                  : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/70'
              }`}
              title="Solid terrain surface rendering (default)"
              aria-pressed={!wireframe}
            >
              SOLID
            </button>
            <button
              type="button"
              onClick={() => setWireframe(true)}
              className={`px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-medium transition-all ${
                wireframe
                  ? 'bg-dw-accent text-white font-semibold shadow-xs'
                  : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/70'
              }`}
              title="Wireframe analytical geometry mesh"
              aria-pressed={wireframe}
            >
              WIREFRAME
            </button>
          </div>

          {/* Active Overlay Indicator */}
          {(activeLayer === 'screening' || activeLayer === 'error' || activeLayer === 'confidence') && (
            <div className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-xs text-[10px] font-mono text-amber-300 flex items-center space-x-1.5 backdrop-blur-sm shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-semibold uppercase text-[10px]">
                OVERLAY: {activeLayer === 'screening' ? 'SCREENING MASK' : activeLayer === 'error' ? 'HEIGHT ERROR' : 'CONFIDENCE'}
              </span>
              <button
                onClick={() => setActiveLayer('elevation')}
                className="text-amber-400 hover:text-white p-0.5 rounded transition-colors"
                title="Close overlay and return to base elevation layer"
                aria-label="Close overlay"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Secondary Overlay Quick Toggles */}
          {(screeningMask || errorMapArray) && activeLayer !== 'screening' && activeLayer !== 'error' && (
            <div className="hidden lg:flex px-1.5 py-0.5 bg-dw-surface/90 border border-dw-border-subtle rounded-xs text-xs font-mono items-center space-x-1 backdrop-blur-sm shadow-sm pointer-events-auto">
              <span className="text-[10px] text-dw-text-muted mr-0.5">OVERLAYS:</span>
              {screeningMask && (
                <button
                  onClick={() => setActiveLayer('screening')}
                  className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono text-dw-text-secondary hover:text-amber-300 hover:bg-dw-panel/70 transition-all"
                  title="View Screening Mask Overlay"
                >
                  Screening
                </button>
              )}
              {errorMapArray && (
                <button
                  onClick={() => setActiveLayer('error')}
                  className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono text-dw-text-secondary hover:text-rose-300 hover:bg-dw-panel/70 transition-all"
                  title="View Height Error Overlay"
                >
                  Height Error
                </button>
              )}
            </div>
          )}
        </div>

        {/* Center / Context: Short Contextual Action Hint */}
        <div className="hidden sm:flex items-center justify-center pointer-events-auto px-2 min-w-0 max-w-md shrink">
          {activeTool !== 'none' || viewMode === 'first-person' || autoRotate ? (
            <div className="px-2.5 py-1 bg-sky-950/85 border border-sky-500/70 rounded-xs text-[11px] font-mono text-sky-300 flex items-center space-x-2 backdrop-blur-sm shadow-sm truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
              <span className="font-semibold uppercase tracking-wider truncate">
                {getInteractionPrompt(activeTool, viewMode, autoRotate)}
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-1 bg-dw-surface/85 border border-dw-border-subtle rounded-xs text-[11px] font-mono text-dw-text-muted flex items-center space-x-1.5 backdrop-blur-sm shadow-sm truncate">
              <span className="tracking-wider uppercase font-medium truncate">
                EXPLORE TERRAIN
              </span>
            </div>
          )}
        </div>

        {/* Right: Compact Scene Context (Identity, CRS, Grid Dimensions) */}
        <div className="flex items-center space-x-2 pointer-events-auto shrink-0">
          <div className="px-2.5 py-1 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-[11px] font-mono text-dw-text-muted flex items-center space-x-2 backdrop-blur-sm shadow-sm">
            <span
              className="text-dw-text-primary font-medium truncate max-w-[130px] md:max-w-[170px] lg:max-w-[220px]"
              title={imageInput?.metadata?.filename || result.source.filename || 'Synthetic Benchmark'}
            >
              {imageInput?.metadata?.filename || result.source.filename || 'Synthetic Benchmark'}
            </span>
            <span className="text-dw-border-strong">•</span>
            <span className={`font-semibold ${result.geospatial.crs ? 'text-emerald-400' : 'text-amber-400'}`}>
              {result.geospatial.crs ? result.geospatial.crs.split(' ')[0] : 'UNPROJECTED'}
            </span>
            <span className="text-dw-border-strong">•</span>
            <span className="text-dw-text-secondary">
              {result.source.dimensions.width}×{result.source.dimensions.height}
            </span>
          </div>
        </div>
      </div>

      {/* Central Viewport Workspace Area — Persistent Spatial Environment */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {/* Processing State Representation */}
          {uiState === 'PROCESSING' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="p-6 max-w-md w-full bg-dw-surface border border-dw-border-strong rounded-xs text-center space-y-4 shadow-xl z-20"
            >
              <div className="flex justify-center">
                <Loader2 className="w-7 h-7 text-dw-accent animate-spin" />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-dw-accent uppercase tracking-wider">
                  STAGE: {result.processing_progress?.stage || 'PROCESSING'}
                </div>
                <h3 className="text-sm font-semibold text-dw-text-primary">
                  {result.processing_progress?.message || 'Processing overhead imagery...'}
                </h3>
              </div>
              <div className="w-full bg-dw-panel h-1.5 rounded-xs overflow-hidden">
                <div
                  className="bg-dw-accent h-full transition-all duration-300"
                  style={{ width: `${(result.processing_progress?.progress || 0.45) * 100}%` }}
                />
              </div>
              <div className="text-[11px] font-mono text-dw-text-muted">
                Progress: {Math.round((result.processing_progress?.progress || 0) * 100)}%
              </div>
            </motion.div>
          )}

          {/* Error State Representation */}
          {uiState === 'ERROR' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="p-6 max-w-lg w-full bg-dw-surface border border-red-800/60 rounded-xs space-y-3 shadow-xl z-20"
            >
              <div className="flex items-center space-x-2 text-red-500 text-xs font-mono">
                <AlertCircle className="w-4 h-4" />
                <span>INGESTION FAILURE [{result.error?.code || 'ERROR'}]</span>
              </div>
              <h3 className="text-sm font-semibold text-dw-text-primary">
                {result.error?.message || 'Failed to process terrain input.'}
              </h3>
              {result.error?.details && (
                <p className="text-xs font-mono text-dw-text-muted bg-dw-panel p-2 rounded-xs border border-dw-border-subtle leading-relaxed">
                  {result.error.details}
                </p>
              )}
              <div className="text-[11px] text-dw-text-secondary">
                Diagnostic suggestion: Verify TIFF tags or switch to another scenario via the top header.
              </div>
            </motion.div>
          )}

          {/* Ready / Active State — Native Three.js Terrain Canvas */}
          {uiState === 'READY' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="w-full h-full relative"
            >
              <TerrainCanvas
                result={result}
                verticalExaggeration={verticalExaggeration}
                viewMode={viewMode}
                cameraPreset={cameraPreset}
                autoRotate={autoRotate}
                onOrientationChange={setCameraOrientation}
                onAutoRotateChange={setAutoRotate}
                onPresetChange={setCameraPreset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Analytical Legend (Phase 4C) */}
      {activeLayer !== 'rgb' && (
        <div className="absolute bottom-16 left-3 z-10 w-72 p-3 bg-dw-surface/95 border border-dw-border-strong rounded-xs shadow-lg backdrop-blur-md pointer-events-auto font-mono text-xs space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dw-border-subtle pb-1.5">
            <div className="flex items-center space-x-1.5 text-dw-accent">
              <Layers className="w-3.5 h-3.5" />
              <span className="font-semibold text-[11px] uppercase tracking-wider text-dw-text-primary">
                {activeLayerLegend.title}
              </span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
              activeLayerLegend.isVisualizationOnly
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : activeLayerLegend.isCalibrated
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              {activeLayerLegend.isVisualizationOnly
                ? 'VISUALIZATION ONLY'
                : activeLayerLegend.isCalibrated
                ? 'CALIBRATED METRIC'
                : 'RELATIVE'}
            </span>
          </div>

          {/* Subtitle / Method */}
          <div className="text-[10px] text-dw-text-muted leading-tight">
            {activeLayerLegend.subtitle}
          </div>

          {/* Color Ramp Bar */}
          <div className="space-y-1 pt-0.5">
            <div
              className="w-full h-3 rounded-xs border border-dw-border-subtle shadow-inner"
              style={{ background: activeLayerLegend.cssGradient }}
            />
            {/* Min and Max Scale Labels */}
            <div className="flex justify-between text-[10px] text-dw-text-secondary font-medium tabular-nums">
              <span>{activeLayerLegend.minLabel}</span>
              <span>{activeLayerLegend.maxLabel}</span>
            </div>
          </div>

          {/* NoData swatch note */}
          {activeLayerLegend.hasNoData && (
            <div className="flex items-center justify-between text-[9px] text-dw-text-muted pt-1 border-t border-dw-border-subtle/50">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-2xs bg-[#141a24] border border-dw-border-strong inline-block" />
                <span>NoData: Masked</span>
              </div>
              <span>Units: {activeLayerLegend.unit}</span>
            </div>
          )}
        </div>
      )}

      {/* Viewport Floating Bottom Controls — Themed UI Chrome */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {/* Left: Vertical Exaggeration Slider */}
        <div
          className="px-3 py-1.5 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-xs font-mono flex items-center space-x-2.5 pointer-events-auto backdrop-blur-sm shadow-sm"
          title="Visualization only — source elevations unchanged"
        >
          <span className="text-dw-text-muted">VERT EXAG:</span>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={verticalExaggeration}
            onChange={(e) => setVerticalExaggeration(parseFloat(e.target.value))}
            className="w-24 accent-dw-accent cursor-pointer"
            aria-label="Vertical Exaggeration"
          />
          <span className="text-dw-text-primary w-8 tabular-nums">{verticalExaggeration.toFixed(1)}x</span>
          <span className="text-[10px] text-dw-text-disabled hidden sm:inline" title="Visualization only — source elevations unchanged">
            (visual only)
          </span>
        </div>

        {/* Center: Camera Presets Quick-Selector (Orbit & Topographic) */}
        {viewMode !== 'first-person' && (
          <div className="px-2 py-1 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-xs font-mono flex items-center space-x-1 pointer-events-auto backdrop-blur-sm shadow-sm">
            <span className="text-[10px] text-dw-text-muted px-1">PRESET:</span>
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setCameraPreset(p.id)}
                title={p.title}
                className={`px-2 py-0.5 rounded-xs text-[11px] font-mono transition-all duration-fast ${
                  cameraPreset === p.id
                    ? 'bg-dw-accent text-white font-semibold shadow-xs'
                    : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Right: Orientation Compass */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="px-2.5 py-1.5 bg-dw-surface/90 border border-dw-border-strong rounded-xs text-xs font-mono text-dw-text-muted flex items-center space-x-2 backdrop-blur-sm shadow-sm">
            <Compass className="w-3.5 h-3.5 text-dw-text-secondary" />
            <span className="tabular-nums">AZ: {String(cameraOrientation.azimuthDeg).padStart(3, '0')}°</span>
            <span>•</span>
            <span className="tabular-nums">EL: {cameraOrientation.elevationDeg}°</span>
          </div>
        </div>
      </div>
    </main>
  );
};
