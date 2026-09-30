/**
 * DepthWizard — Hero Product Preview Component
 * Authority: docs/design/design-system.md & SIH PS 26175
 *
 * Transforms the landing page hero into a true PRODUCT HERO:
 * 1. Visual Hierarchy:
 *    RGB / OPTICAL INPUT
 *            ↓
 *    RELATIVE DEPTH
 *            ↓
 *    3D TERRAIN
 * 2. Real Interactive Three.js WebGL canvas running DepthWizard's native terrain engine
 * 3. Surface modes: Elevation colormap, Solid / Bedrock hillshade, Analytical Wireframe, Slope
 * 4. Authentic telemetry and metadata — no fake statistics or fabricated benchmarks
 * 5. Compact workspace UI chrome that immediately proves DepthWizard is a real application
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SCENARIO_A } from '../../fixtures/scenarios';
import { TerrainRenderAdapter } from '../workspace/terrain/terrainRenderAdapter';
import { Compass, Play, Pause, Mountain, ArrowDown, Grid3X3, Layers } from 'lucide-react';

type SurfaceMode = 'elevation' | 'solid' | 'wireframe' | 'slope';

export const HeroProductPreview: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<TerrainRenderAdapter | null>(null);

  const [activeLayer, setActiveLayer] = useState<SurfaceMode>('elevation');
  const [isRotating, setIsRotating] = useState(true);
  const [azimuthDeg, setAzimuthDeg] = useState(315);
  const [pitchDeg, setPitchDeg] = useState(38);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsRotating(false);
    }
  }, []);

  // Initialize Native Three.js Terrain Adapter
  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = new TerrainRenderAdapter(containerRef.current, {
      result: SCENARIO_A,
      initialExaggeration: 1.25,
      initialViewMode: '3d',
      initialPreset: 'FREE',
      autoRotate: isRotating,
      onOrientationChange: (orientation) => {
        setAzimuthDeg(Math.round(orientation.azimuthDeg));
        setPitchDeg(Math.round(orientation.elevationDeg));
      }
    });

    adapterRef.current = adapter;

    // Default: Analytical elevation colormap
    adapter.setTerrainLayer({
      layer: 'elevation',
      elevations: SCENARIO_A.elevation.data ?? undefined,
      minElev: SCENARIO_A.elevation.min,
      maxElev: SCENARIO_A.elevation.max
    });

    return () => {
      adapter.dispose();
      adapterRef.current = null;
    };
  }, []);

  // Handle Layer Switching (Elevation, Solid, Wireframe, Slope)
  const handleLayerChange = useCallback((layer: SurfaceMode) => {
    setActiveLayer(layer);
    setHasInteracted(true);
    if (!adapterRef.current) return;

    if (layer === 'wireframe') {
      adapterRef.current.setWireframe(true);
      adapterRef.current.setTerrainLayer({ layer: 'rgb' });
    } else {
      adapterRef.current.setWireframe(false);
      if (layer === 'elevation') {
        adapterRef.current.setTerrainLayer({
          layer: 'elevation',
          elevations: SCENARIO_A.elevation.data ?? undefined,
          minElev: SCENARIO_A.elevation.min,
          maxElev: SCENARIO_A.elevation.max
        });
      } else if (layer === 'solid') {
        adapterRef.current.setTerrainLayer({ layer: 'rgb' });
      } else if (layer === 'slope') {
        adapterRef.current.setTerrainLayer({
          layer: 'slope',
          elevations: SCENARIO_A.elevation.data ?? undefined,
          minElev: SCENARIO_A.elevation.min,
          maxElev: SCENARIO_A.elevation.max,
          minSlope: 0,
          maxSlope: 45
        });
      }
    }
  }, []);

  // Toggle Auto-Orbit
  const toggleAutoRotate = useCallback(() => {
    const next = !isRotating;
    setIsRotating(next);
    setHasInteracted(true);
    if (adapterRef.current) {
      adapterRef.current.setAutoRotate(next);
    }
  }, [isRotating]);

  return (
    <div className="relative w-full max-w-[700px] flex flex-col rounded-xs border border-dw-border-strong bg-[#090d14] shadow-2xl overflow-hidden select-none">
      
      {/* 1. Technical Window Chrome / Workspace Header */}
      <div className="px-3.5 py-2 bg-dw-surface/90 border-b border-dw-border-subtle flex items-center justify-between font-mono text-[11px] z-20">
        <div className="flex items-center space-x-2">
          {/* Status dots */}
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500/70" />
            <span className="w-2 h-2 rounded-full bg-amber-500/70" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-dw-text-disabled pl-1">|</span>
          <span className="text-dw-text-primary font-bold tracking-wider uppercase text-[10px] hidden sm:inline">
            DEPTHWIZARD // 3D VIEWPORT
          </span>
          <span className="text-dw-text-primary font-bold tracking-wider uppercase text-[10px] sm:hidden">
            3D VIEWPORT
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-dw-base/80 border border-dw-border-subtle text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-dw-text-secondary font-semibold">RELATIVE TERRAIN</span>
          </div>
          <span className="text-[10px] text-dw-text-disabled hidden md:inline">65×65 MESH</span>
        </div>
      </div>

      {/* 2. Interactive 3D WebGL Canvas Container */}
      <div 
        className="relative w-full h-[360px] sm:h-[420px] lg:h-[460px] overflow-hidden"
        onMouseDown={() => setHasInteracted(true)}
        onTouchStart={() => setHasInteracted(true)}
      >
        {/* Three.js Canvas Mount */}
        <div 
          ref={containerRef} 
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Ambient Depth Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#090d14] via-transparent to-[#090d14]/30" />

        {/* 3. Floating Pipeline Hierarchy Card:
            RGB / OPTICAL INPUT
                    ↓
            RELATIVE DEPTH
                    ↓
            3D TERRAIN
        */}
        <div className="absolute top-3 left-3 z-10 pointer-events-auto bg-dw-base/85 backdrop-blur-md border border-dw-border-strong rounded-xs p-2.5 shadow-xl font-mono text-[10px] space-y-1.5 max-w-[190px] sm:max-w-[210px]">
          <div className="flex items-center justify-between text-dw-text-muted border-b border-dw-border-subtle pb-1">
            <span className="font-semibold tracking-wider uppercase text-[9px] text-dw-text-secondary">
              WORKFLOW PIPELINE
            </span>
            <span className="text-[8px] text-dw-text-disabled">3-STAGE</span>
          </div>

          {/* Stage 1: Optical RGB Input */}
          <div className="flex items-center space-x-2 p-1 rounded-xs bg-dw-surface/60 border border-dw-border-subtle">
            <div className="w-6 h-6 rounded-2xs overflow-hidden shrink-0 border border-emerald-500/40 relative">
              {/* Synthetic optical satellite crop preview */}
              <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-stone-700 to-amber-900" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-dw-text-primary uppercase leading-tight truncate">
                1. OPTICAL INPUT
              </div>
              <div className="text-[8px] text-dw-text-muted leading-tight truncate">
                Single-view RGB
              </div>
            </div>
          </div>

          {/* Downward flow connector */}
          <div className="flex justify-center -my-1">
            <ArrowDown className="w-2.5 h-2.5 text-dw-accent" />
          </div>

          {/* Stage 2: Relative Depth Prior */}
          <div className="flex items-center space-x-2 p-1 rounded-xs bg-dw-surface/60 border border-dw-border-subtle">
            <div className="w-6 h-6 rounded-2xs overflow-hidden shrink-0 border border-sky-400/40 relative">
              {/* Synthetic depth colormap crop preview */}
              <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-sky-500 to-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-dw-text-primary uppercase leading-tight truncate">
                2. RELATIVE DEPTH
              </div>
              <div className="text-[8px] text-dw-text-muted leading-tight truncate">
                Estimated Disparity
              </div>
            </div>
          </div>

          {/* Downward flow connector */}
          <div className="flex justify-center -my-1">
            <ArrowDown className="w-2.5 h-2.5 text-dw-accent" />
          </div>

          {/* Stage 3: 3D Reconstructed Terrain (Active) */}
          <div className="flex items-center space-x-2 p-1 rounded-xs bg-dw-accent/15 border border-dw-accent/50 shadow-xs">
            <div className="w-6 h-6 rounded-2xs overflow-hidden shrink-0 bg-dw-accent/30 border border-dw-accent/60 flex items-center justify-center">
              <Mountain className="w-3.5 h-3.5 text-dw-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold text-dw-accent uppercase leading-tight truncate">
                3. 3D TERRAIN
              </div>
              <div className="text-[8px] text-dw-text-secondary leading-tight truncate">
                Active in Viewport
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Drag Hint (Visible before first interaction) */}
        {!hasInteracted && (
          <div className="absolute top-3 right-3 pointer-events-none hidden sm:flex items-center space-x-1.5 px-2 py-1 bg-dw-base/70 backdrop-blur-sm border border-dw-border-subtle rounded-xs font-mono text-[9px] text-dw-text-muted animate-pulse">
            <Compass className="w-3 h-3 text-dw-accent" />
            <span>DRAG TO ORBIT 3D</span>
          </div>
        )}

        {/* Bottom-Left: Elevation Color Legend */}
        <div className="absolute bottom-3 left-3 pointer-events-auto flex flex-col space-y-1 font-mono text-[9px]">
          <div className="px-2.5 py-1.5 bg-dw-base/85 backdrop-blur-md border border-dw-border-strong rounded-xs shadow-md space-y-1">
            <div className="flex items-center justify-between space-x-3 text-dw-text-secondary">
              <span className="font-semibold uppercase tracking-wider text-[8px] flex items-center space-x-1">
                <Layers className="w-2.5 h-2.5 text-dw-accent" />
                <span>{activeLayer.toUpperCase()}</span>
              </span>
              <span className="text-[8px] text-dw-text-muted">0 .. 85 (RELATIVE)</span>
            </div>
            {/* Color ramp bar */}
            <div className="w-28 sm:w-32 h-1.5 rounded-xs overflow-hidden bg-gradient-to-r from-[#1b3a4b] via-[#2c5d63] via-[#7f9172] via-[#c99a6b] to-[#f0ebd8]" />
          </div>
        </div>

        {/* Bottom-Right: Viewport Surface & Orbit Controls */}
        <div className="absolute bottom-3 right-3 pointer-events-auto flex items-center space-x-1.5 sm:space-x-2">
          {/* Surface Mode Toggle */}
          <div className="flex items-center bg-dw-base/85 backdrop-blur-md border border-dw-border-strong rounded-xs p-0.5 shadow-md">
            <button
              onClick={() => handleLayerChange('elevation')}
              title="Hypsometric Elevation Tint"
              className={`px-2 py-1 text-[9px] font-mono font-semibold rounded-xs transition-colors ${
                activeLayer === 'elevation'
                  ? 'bg-dw-accent text-white shadow-xs'
                  : 'text-dw-text-muted hover:text-dw-text-primary'
              }`}
            >
              Elevation
            </button>
            <button
              onClick={() => handleLayerChange('solid')}
              title="Solid Hillshaded Surface"
              className={`px-2 py-1 text-[9px] font-mono font-semibold rounded-xs transition-colors ${
                activeLayer === 'solid'
                  ? 'bg-dw-accent text-white shadow-xs'
                  : 'text-dw-text-muted hover:text-dw-text-primary'
              }`}
            >
              Solid
            </button>
            <button
              onClick={() => handleLayerChange('wireframe')}
              title="Analytical Wireframe Grid"
              className={`px-2 py-1 text-[9px] font-mono font-semibold rounded-xs transition-colors flex items-center space-x-1 ${
                activeLayer === 'wireframe'
                  ? 'bg-dw-accent text-white shadow-xs'
                  : 'text-dw-text-muted hover:text-dw-text-primary'
              }`}
            >
              <Grid3X3 className="w-2.5 h-2.5" />
              <span>Wire</span>
            </button>
            <button
              onClick={() => handleLayerChange('slope')}
              title="Slope Angle Gradient"
              className={`px-2 py-1 text-[9px] font-mono font-semibold rounded-xs transition-colors ${
                activeLayer === 'slope'
                  ? 'bg-dw-accent text-white shadow-xs'
                  : 'text-dw-text-muted hover:text-dw-text-primary'
              }`}
            >
              Slope
            </button>
          </div>

          {/* Orbit Pause/Play */}
          <button
            onClick={toggleAutoRotate}
            title={isRotating ? "Pause Orbit" : "Resume Orbit"}
            className="p-1.5 bg-dw-base/85 hover:bg-dw-surface backdrop-blur-md border border-dw-border-strong rounded-xs text-dw-text-secondary hover:text-dw-text-primary transition-colors shadow-md"
          >
            {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          {/* Orientation Telemetry */}
          <div className="hidden md:flex items-center space-x-1 px-2 py-1 bg-dw-base/85 backdrop-blur-md border border-dw-border-strong rounded-xs font-mono text-[8px] text-dw-text-muted">
            <span>AZ: {azimuthDeg}°</span>
            <span>·</span>
            <span>PITCH: {pitchDeg}°</span>
          </div>
        </div>

      </div>

    </div>
  );
};
