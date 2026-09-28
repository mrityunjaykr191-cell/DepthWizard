/**
 * DepthWizard — Scientific Integrity & State Model Section (Refined V2.2)
 * Authority: docs/product/output-contract.md
 *
 * Explains the 4-state scientific truth model:
 * - RELATIVE
 * - CALIBRATED
 * - CALIBRATION REJECTED
 * - CALIBRATION UNAVAILABLE
 *
 * Headline: "KNOW WHAT THE DATA KNOWS."
 * Strictly enforces that metric elevation and physical slope are capability-gated.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Lock, 
  Layers 
} from 'lucide-react';

interface StateCard {
  id: string;
  stateLabel: string;
  statusBadge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  condition: string;
  scientificRule: string;
  capabilities: {
    relative3d: boolean;
    relativeGradient: boolean;
    metricElevation: boolean;
    physicalSlopeDegrees: boolean;
    metricGeoTiffExport: boolean;
    errorMapExport: boolean;
  };
}

const STATES: StateCard[] = [
  {
    id: 'relative',
    stateLabel: 'RELATIVE',
    statusBadge: 'DIMENSIONLESS (0–100)',
    badgeColor: 'text-dw-text-muted bg-dw-panel border-dw-border-strong',
    icon: Layers,
    summary: 'Relative surface representation on a normalized 0–100 display scale.',
    condition: 'Standard optical imagery without external elevation reference datum.',
    scientificRule: 'Metric elevation, true vertical meters, and physical slope degrees are strictly withheld to avoid inventing ungrounded precision.',
    capabilities: {
      relative3d: true,
      relativeGradient: true,
      metricElevation: false,
      physicalSlopeDegrees: false,
      metricGeoTiffExport: false,
      errorMapExport: false
    }
  },
  {
    id: 'calibrated',
    stateLabel: 'CALIBRATED',
    statusBadge: 'ANCHORED METRIC DSM',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    icon: CheckCircle2,
    summary: 'Externally anchored metric interpretation anchored to authoritative DEM reference tiles.',
    condition: 'Georeferenced imagery co-registered with regional Copernicus DEM or LiDAR benchmarks.',
    scientificRule: 'Vertical scale factor must be strictly positive (a > 0). Reference source, coverage, and residual validation metrics are fully disclosed.',
    capabilities: {
      relative3d: true,
      relativeGradient: true,
      metricElevation: true,
      physicalSlopeDegrees: true,
      metricGeoTiffExport: true,
      errorMapExport: true
    }
  },
  {
    id: 'rejected',
    stateLabel: 'CALIBRATION REJECTED',
    statusBadge: 'GUARDRAIL REJECTION',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
    summary: 'Metric interpretation withheld because automated scientific calibration guardrails failed.',
    condition: 'Fitted scale factor is non-positive (a <= 0), trend contradicts reference, or residual error is excessive.',
    scientificRule: 'Guards against inverted topography or invalid physical inferences. Relative 3D mode remains fully available for qualitative exploration.',
    capabilities: {
      relative3d: true,
      relativeGradient: true,
      metricElevation: false,
      physicalSlopeDegrees: false,
      metricGeoTiffExport: false,
      errorMapExport: false
    }
  },
  {
    id: 'unavailable',
    stateLabel: 'CALIBRATION UNAVAILABLE',
    statusBadge: 'REFERENCE MISSING',
    badgeColor: 'text-dw-text-disabled bg-dw-surface/40 border-dw-border-subtle',
    icon: HelpCircle,
    summary: 'Input lacks required geospatial bounds or external reference DEM tiles.',
    condition: 'Imagery is unprojected or regional reference coverage is not found on disk.',
    scientificRule: 'Transparently communicates reference absence rather than synthesizing coordinates or fabricating false elevation datums.',
    capabilities: {
      relative3d: true,
      relativeGradient: true,
      metricElevation: false,
      physicalSlopeDegrees: false,
      metricGeoTiffExport: false,
      errorMapExport: false
    }
  }
];

export const ScientificIntegritySection: React.FC = () => {
  const [selectedStateId, setSelectedStateId] = useState('calibrated');
  const activeCard = STATES.find((s) => s.id === selectedStateId) || STATES[1];
  const CardIcon = activeCard.icon;

  return (
    <section id="integrity" className="py-28 px-6 max-w-7xl mx-auto space-y-16 relative z-10">
      {/* Section Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center space-x-2 text-dw-accent font-mono text-xs uppercase tracking-widest font-semibold">
          <ShieldCheck className="w-4 h-4 text-dw-accent" />
          <span>SCIENTIFIC INTEGRITY & GATING</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-dw-text-primary leading-tight">
          KNOW WHAT THE DATA KNOWS.
        </h2>
        <p className="text-lg sm:text-xl text-dw-text-secondary font-normal leading-relaxed">
          DepthWizard enforces strict scientific guardrails. Metric elevations, physical slopes, and geospatial exports are unlocked only when anchored to verified external reference data.
        </p>
      </div>

      {/* 4 State Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATES.map((state) => {
          const isSelected = state.id === selectedStateId;
          const Icon = state.icon;
          return (
            <button
              key={state.id}
              onClick={() => setSelectedStateId(state.id)}
              className={`p-6 rounded-xs border text-left font-mono transition-all duration-normal flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-dw-surface border-dw-accent shadow-md ring-1 ring-dw-accent/50'
                  : 'bg-dw-surface/40 hover:bg-dw-surface/80 border-dw-border-subtle hover:border-dw-border-strong'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`px-2 py-0.5 rounded-xs border text-[10px] font-semibold tracking-wider ${state.badgeColor}`}>
                  {state.statusBadge}
                </span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-dw-accent' : 'text-dw-text-muted'}`} />
              </div>

              <div className="space-y-2">
                <div className="text-base font-bold text-dw-text-primary">
                  {state.stateLabel}
                </div>
                <div className="text-xs sm:text-sm text-dw-text-secondary font-sans leading-relaxed line-clamp-2">
                  {state.summary}
                </div>
              </div>

              <div className="text-[11px] text-dw-text-muted pt-2 border-t border-dw-border-subtle truncate">
                {state.condition}
              </div>
            </button>
          );
        })}
      </div>

      {/* Deep-Dive Capability Gating Panel for Selected State */}
      <motion.div 
        key={activeCard.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 lg:p-8 space-y-6 shadow-xl font-mono"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dw-border-subtle">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xs bg-dw-panel border border-dw-border-strong text-dw-accent">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold text-dw-text-primary">
                {activeCard.stateLabel} // STATE BEHAVIOR
              </div>
              <div className="text-xs sm:text-sm text-dw-text-muted">
                {activeCard.condition}
              </div>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-xs border text-xs font-semibold self-start sm:self-auto ${activeCard.badgeColor}`}>
            {activeCard.statusBadge}
          </div>
        </div>

        {/* Scientific Rule & Rationale */}
        <div className="p-4 bg-dw-base/80 border border-dw-border-subtle rounded-xs space-y-1">
          <div className="text-[10px] text-dw-text-muted uppercase tracking-wider font-semibold">
            SCIENTIFIC RULE
          </div>
          <p className="text-sm sm:text-base text-dw-text-primary leading-relaxed font-sans">
            {activeCard.scientificRule}
          </p>
        </div>

        {/* Capability Enforcement Checklist */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-dw-text-muted uppercase tracking-wider">
            FEATURE GATING
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
            {[
              { name: '3D Terrain Orbit', enabled: activeCard.capabilities.relative3d },
              { name: 'Relative Gradient', enabled: activeCard.capabilities.relativeGradient },
              { name: 'Metric Elevation (m)', enabled: activeCard.capabilities.metricElevation },
              { name: 'Physical Slope (deg)', enabled: activeCard.capabilities.physicalSlopeDegrees },
              { name: 'Standard GeoTIFF DSM', enabled: activeCard.capabilities.metricGeoTiffExport },
              { name: 'Signed Error Map', enabled: activeCard.capabilities.errorMapExport }
            ].map((cap) => (
              <div
                key={cap.name}
                className={`p-3.5 rounded-xs border flex items-center justify-between ${
                  cap.enabled
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                    : 'bg-dw-base/40 border-dw-border-subtle text-dw-text-muted'
                }`}
              >
                <span>{cap.name}</span>
                {cap.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="flex items-center space-x-1 text-[11px] text-dw-text-disabled">
                    <Lock className="w-3 h-3" />
                    <span>WITHHELD</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};
