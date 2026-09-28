/**
 * DepthWizard — Editorial Pipeline Transformation Narrative (Refined V2.2)
 * Authority: docs/architecture/ml-integration.md
 *
 * Visually communicates the 4-stage progression:
 * RGB IMAGE → DEPTH → rDSM → 3D TERRAIN
 * Features authentic semantic HTML/CSS mathematical typography (no raw LaTeX text).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface Stage {
  id: number;
  label: string;
  tag: string;
  headline: string;
  summary: string;
  formulaComponent: React.ReactNode;
  formulaCaption: string;
  visual: {
    accent: string;
    bgGradient: string;
    badge: string;
  };
}

const STAGES: Stage[] = [
  {
    id: 1,
    label: 'RGB IMAGE',
    tag: '01 / OPTICAL INGESTION',
    headline: 'Single-View Overhead Capture',
    summary: 'Ingests standard optical satellite or aerial photography. Georeferenced raster bounds and projection matrices are preserved without inventing geospatial coordinates.',
    formulaComponent: (
      <div className="text-xl sm:text-2xl font-serif text-dw-text-primary tracking-wide flex items-center space-x-2 py-1">
        <span className="italic font-bold">I</span>
        <span className="text-dw-text-secondary">(x, y)</span>
        <span className="text-dw-accent font-sans px-1">∈</span>
        <span className="font-serif font-bold text-dw-text-primary">ℝ</span>
        <sup className="text-xs sm:text-sm font-sans tracking-normal -top-2.5 text-dw-text-secondary">
          H × W × 3
        </sup>
      </div>
    ),
    formulaCaption: 'OPTICAL RADIANCE TENSOR',
    visual: {
      accent: 'text-emerald-400',
      bgGradient: 'from-emerald-950/30 via-slate-900/50 to-emerald-900/20',
      badge: 'OPTICAL SATELLITE TILE'
    }
  },
  {
    id: 2,
    label: 'DEPTH',
    tag: '02 / LEARNED PRIOR',
    headline: 'Monocular Depth Disparity',
    summary: 'Vision transformer extracts continuous relative disparity from monocular optical cues, resolving subtle ridge crests, structural facets, and local relief.',
    formulaComponent: (
      <div className="text-xl sm:text-2xl font-serif text-dw-text-primary tracking-wide flex items-center space-x-2 py-1">
        <span className="italic font-bold">D</span>
        <span className="text-dw-text-secondary">(x, y)</span>
        <span className="text-dw-accent font-sans px-1">=</span>
        <span className="font-serif italic font-bold text-dw-accent">ℱ</span>
        <sub className="text-xs font-sans not-italic text-dw-text-muted">depth</sub>
        <span>(</span>
        <span className="italic text-dw-text-primary">I</span>
        <span>)</span>
      </div>
    ),
    formulaCaption: 'CONTINUOUS RELATIVE DISPARITY PRIOR',
    visual: {
      accent: 'text-amber-400',
      bgGradient: 'from-amber-950/30 via-slate-900/50 to-rose-950/20',
      badge: 'RELATIVE DISPARITY PRIOR'
    }
  },
  {
    id: 3,
    label: 'rDSM',
    tag: '03 / NORMALIZATION',
    headline: 'Relative Surface & Metric Anchor',
    summary: 'Normalizes disparity to a relative 0–100 scale. When regional DEM or ground control points are supplied, linear least-squares anchors metric elevation with strictly enforced positive scaling.',
    formulaComponent: (
      <div className="space-y-4 py-1">
        {/* Equation 1: Relative Normalization with actual fraction bar */}
        <div className="flex items-center space-x-3 text-lg sm:text-2xl font-serif text-dw-text-primary">
          <span className="italic font-bold">H</span>
          <span className="font-sans text-dw-accent">=</span>
          <div className="inline-flex flex-col items-center justify-center px-1">
            <span className="border-b border-dw-text-primary/70 pb-0.5 text-base sm:text-xl italic">
              D − D<sub className="text-xs not-italic">min</sub>
            </span>
            <span className="pt-0.5 text-base sm:text-xl italic">
              D<sub className="text-xs not-italic">max</sub> − D<sub className="text-xs not-italic">min</sub>
            </span>
          </div>
          <span className="font-sans">×</span>
          <span className="font-sans font-bold">100</span>
        </div>

        {/* Equation 2: Metric Anchoring */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base sm:text-xl font-serif text-dw-text-primary pt-2 border-t border-dw-border-subtle/50">
          <div className="flex items-center space-x-2">
            <span className="italic">Z<sub className="text-xs not-italic">metric</sub></span>
            <span className="font-sans text-dw-accent">=</span>
            <span className="italic">a · D + b</span>
          </div>
          <div className="inline-flex items-center px-2 py-0.5 rounded-xs bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs font-semibold text-emerald-400">
            a &gt; 0
          </div>
        </div>
      </div>
    ),
    formulaCaption: 'RELATIVE HEIGHT FIELD OR ANCHORED METRIC ELEVATION',
    visual: {
      accent: 'text-sky-400',
      bgGradient: 'from-sky-950/30 via-slate-900/50 to-indigo-950/20',
      badge: 'GUARDED SCALE a > 0'
    }
  },
  {
    id: 4,
    label: '3D TERRAIN',
    tag: '04 / RECONSTRUCTION',
    headline: 'Interactive 3D Terrain Model',
    summary: 'Reconstructs continuous digital surface topography in native WebGL. Supports interactive orbit, physical slope gradient filtering, solar hillshade, and standard geospatial export.',
    formulaComponent: (
      <div className="text-lg sm:text-xl font-serif text-dw-text-primary tracking-wide flex items-center space-x-2 py-1">
        <span className="italic font-bold">V</span>
        <span className="text-dw-text-secondary">(r, c)</span>
        <span className="text-dw-accent font-sans px-1">=</span>
        <div className="inline-flex items-center space-x-1.5 font-mono text-sm sm:text-base">
          <span>(</span>
          <span>X<sub>c</sub>,</span>
          <span className="font-serif italic text-dw-accent">H<sub>r,c</sub> · s<sub>exag</sub>,</span>
          <span>Z<sub>r</sub></span>
          <span>)</span>
        </div>
      </div>
    ),
    formulaCaption: 'DEMAND-DRIVEN 3D SURFACE TOPOGRAPHY',
    visual: {
      accent: 'text-cyan-400',
      bgGradient: 'from-cyan-950/30 via-slate-900/50 to-blue-950/30',
      badge: 'NATIVE THREE.JS WEBGL'
    }
  }
];

export const TransformationSection: React.FC = () => {
  const [activeStageId, setActiveStageId] = useState(1);
  const currentStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  return (
    <section id="pipeline" className="py-28 px-6 max-w-7xl mx-auto relative z-10 space-y-16">
      {/* Editorial Section Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center space-x-2 text-dw-accent font-mono text-xs uppercase tracking-widest font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-dw-accent animate-pulse" />
          <span>ANALYTICAL PROGRESSION</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-dw-text-primary leading-tight">
          TURNING OPTICAL IMAGERY INTO TERRAIN.
        </h2>
        <p className="text-lg sm:text-xl text-dw-text-secondary font-normal leading-relaxed">
          From single overhead optical captures to verified continuous digital surface models. An end-to-end transformation built on deep priors and disciplined spatial calibration.
        </p>
      </div>

      {/* Interactive Horizontal Pipeline Track */}
      <div className="space-y-6">
        {/* Track Step Headers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          {STAGES.map((stage) => {
            const isActive = stage.id === activeStageId;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={`p-4 rounded-xs border text-left transition-all duration-normal relative overflow-hidden flex flex-col justify-between space-y-3 ${
                  isActive
                    ? 'bg-dw-surface/90 border-dw-accent shadow-lg shadow-dw-accent/5 ring-1 ring-dw-accent/40'
                    : 'bg-dw-surface/30 hover:bg-dw-surface/60 border-dw-border-subtle hover:border-dw-border-muted'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="pipeline-active-line"
                    className="absolute top-0 left-0 right-0 h-[2px] bg-dw-accent" 
                  />
                )}
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${isActive ? 'text-dw-accent' : 'text-dw-text-muted'}`}>
                    {stage.tag}
                  </span>
                  <span className={`text-[10px] ${isActive ? 'text-dw-text-primary' : 'text-dw-text-disabled'}`}>
                    0{stage.id}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-dw-text-primary tracking-wide">
                  {stage.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Stage Presentation Container */}
        <div className="relative rounded-xs border border-dw-border-strong bg-dw-surface/70 backdrop-blur-md overflow-hidden shadow-xl p-6 sm:p-10 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              {/* Left Column: Story & Sleek Editorial Formula Callout */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold text-dw-accent tracking-widest uppercase">
                    {currentStage.tag}
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-extrabold text-dw-text-primary tracking-tight">
                    {currentStage.headline}
                  </h3>
                  <p className="text-base sm:text-lg text-dw-text-secondary leading-relaxed font-sans">
                    {currentStage.summary}
                  </p>
                </div>

                {/* Sleek Editorial Formula Callout with True Math Typography */}
                <div className="pl-5 border-l-2 border-dw-accent/50 space-y-2 py-2 font-mono">
                  <div className="text-[10px] text-dw-accent uppercase tracking-widest font-semibold">
                    MATHEMATICAL MODEL
                  </div>
                  <div className="overflow-x-auto py-1">
                    {currentStage.formulaComponent}
                  </div>
                  <div className="text-[10px] text-dw-text-muted uppercase tracking-wider pt-1">
                    {currentStage.formulaCaption}
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center space-x-4 pt-2 font-mono text-xs">
                  <button
                    onClick={() => setActiveStageId((prev) => (prev > 1 ? prev - 1 : 4))}
                    className="px-3 py-1.5 rounded-xs border border-dw-border-strong hover:bg-dw-hover text-dw-text-secondary hover:text-dw-text-primary transition-colors"
                  >
                    ← PREV STAGE
                  </button>
                  <button
                    onClick={() => setActiveStageId((prev) => (prev < 4 ? prev + 1 : 1))}
                    className="px-3 py-1.5 rounded-xs bg-dw-accent hover:bg-dw-accent-hover text-white font-semibold transition-colors flex items-center space-x-1"
                  >
                    <span>NEXT STAGE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Visual Spatial Graphic */}
              <div className="lg:col-span-6 relative aspect-[16/10] sm:aspect-[16/9] rounded-xs border border-dw-border-subtle bg-dw-base/80 overflow-hidden flex items-center justify-center p-6">
                <div className={`absolute inset-0 bg-gradient-to-tr ${currentStage.visual.bgGradient} opacity-60`} />

                {/* Stage 1: Optical RGB Graphic */}
                {currentStage.id === 1 && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center space-y-3 font-mono">
                    <div className="w-52 h-40 border border-emerald-500/40 rounded-xs relative overflow-hidden bg-emerald-950/20 flex items-center justify-center shadow-lg">
                      <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 divide-x divide-y divide-emerald-500/10" />
                      <div className="z-10 text-center space-y-1">
                        <div className="text-sm font-bold text-emerald-300">RGB SENSOR ARRAY</div>
                        <div className="text-[10px] text-emerald-400/80">3-CHANNEL PLANAR RADIANCE</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-dw-text-muted">
                      NATIVE SPECTRAL BANDS · COORDINATE INTEGRITY
                    </div>
                  </div>
                )}

                {/* Stage 2: Monocular Depth Disparity Graphic */}
                {currentStage.id === 2 && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center space-y-3 font-mono">
                    <div className="w-52 h-40 border border-amber-500/40 rounded-xs relative overflow-hidden bg-gradient-to-tr from-amber-950/40 via-purple-950/30 to-rose-950/30 flex items-center justify-center shadow-lg">
                      <div className="z-10 text-center space-y-1">
                        <div className="text-sm font-bold text-amber-300">DISPARITY FIELD</div>
                        <div className="text-[10px] text-amber-400/80">DENSE MONOCULAR PRIOR</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-dw-text-muted">
                      RESOLVES RIDGE CRESTS & SUBTLE SCARPS
                    </div>
                  </div>
                )}

                {/* Stage 3: Normalized rDSM Graphic */}
                {currentStage.id === 3 && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center space-y-3 font-mono">
                    <div className="w-52 h-40 border border-sky-500/40 rounded-xs relative overflow-hidden bg-gradient-to-r from-[#1b3a4b] via-[#2c5d63] via-[#7f9172] via-[#c99a6b] to-[#f0ebd8] flex items-center justify-center shadow-lg">
                      <div className="z-10 px-3.5 py-2 bg-black/80 backdrop-blur-xs rounded-xs border border-white/20 text-center">
                        <div className="text-sm font-bold text-white">GUARDED rDSM</div>
                        <div className="text-[10px] text-sky-300">SCALE a &gt; 0 · DEM ANCHORING</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-dw-text-muted">
                      RELATIVE 0–100 OR ANCHORED METRIC ELEVATION
                    </div>
                  </div>
                )}

                {/* Stage 4: 3D Terrain Mesh Graphic */}
                {currentStage.id === 4 && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center space-y-3 font-mono">
                    <div className="w-52 h-40 border border-cyan-500/50 rounded-xs relative overflow-hidden bg-[#0c1420] flex items-center justify-center shadow-lg">
                      <div className="absolute inset-2 border border-cyan-500/30 rounded-xs transform -rotate-6 skew-x-6 grid grid-cols-5 grid-rows-4 divide-x divide-y divide-cyan-500/20" />
                      <div className="z-10 px-3.5 py-2 bg-dw-base/90 rounded-xs border border-cyan-500/60 text-center">
                        <div className="text-sm font-bold text-cyan-300">3D TERRAIN MESH</div>
                        <div className="text-[10px] text-cyan-400">DEMAND-DRIVEN WEBGL</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-dw-text-muted">
                      CONTINUOUS ORBIT, FIRST-PERSON & GEOTIFF EXPORT
                    </div>
                  </div>
                )}

                <div className="absolute bottom-2.5 right-3 font-mono text-[9px] text-dw-text-disabled tracking-widest">
                  {currentStage.visual.badge}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
