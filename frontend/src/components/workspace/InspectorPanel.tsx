import React, { useState } from 'react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { AnimatePresence, motion } from 'motion/react';
import { ValidationInspectorSection } from './ValidationInspectorSection';
import { ToolGuidance } from './ToolGuidance';
import { 
  Crosshair, 
  Ruler, 
  Activity, 
  SplitSquareVertical, 
  FileCheck2, 
  Check, 
  UploadCloud,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
  TrendingUp,
  Filter,
  Sliders,
  XCircle,
  FileText,
  Download,
  X
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const { 
    result, 
    viewMode,
    setViewMode,
    activeTool, 
    setActiveTool,
    cancelActiveTool,
    validationResult,
    imageInput, 
    setInputModalOpen, 
    clearImageInput,
    calibrationResult,
    probeResult,
    isProbing,
    probeError,
    twoPointResult,
    isMeasuring,
    measureError,
    selectedPointA,
    selectedPointB,
    crossSectionResult,
    isProfiling,
    profileError,
    clearMeasurements,
    scientificStatus,
    qaResult,
    losResult,
    isComputingLOS,
    losError,
    observerOffsetA,
    targetOffsetB,
    setObserverOffsetA,
    setTargetOffsetB,
    recomputeLOS,
    routeResult,
    isComputingRoute,
    routeError,
    screeningResult,
    isScreening,
    screeningError,
    screeningMaxSlope,
    screeningMinElev,
    screeningMaxElev,
    setScreeningCriteria,
    runScreening,
    setIsExportModalOpen,
    exportSessionJson,
    exportTerrainRasterFile,
    exportAnalysisDataFile,
    exportTerrainReportFile
  } = useWorkspace();
  const [reportAdded, setReportAdded] = useState(false);
  const [quickExporting, setQuickExporting] = useState<string | null>(null);
  const [quickExportSuccess, setQuickExportSuccess] = useState<string | null>(null);
  const [quickExportError, setQuickExportError] = useState<string | null>(null);

  const handleQuickExport = async (key: string, fn: () => Promise<void>, msg: string) => {
    try {
      setQuickExporting(key);
      setQuickExportError(null);
      setQuickExportSuccess(null);
      await fn();
      setQuickExportSuccess(msg);
      setTimeout(() => setQuickExportSuccess(null), 3500);
    } catch (err: any) {
      setQuickExportError(err.message || 'Export action failed');
      setTimeout(() => setQuickExportError(null), 4000);
    } finally {
      setQuickExporting(null);
    }
  };

  const handleAddToReport = () => {
    setReportAdded(true);
    setTimeout(() => setReportAdded(false), 2000);
  };

  const isCalibrated = scientificStatus === 'CALIBRATED';
  const unit = isCalibrated ? (result.elevation.unit === 'relative units' ? 'm' : result.elevation.unit) : 'relative units';

  return (
    <aside className="w-80 border-l border-dw-border-subtle bg-dw-surface flex flex-col justify-between select-none z-10 min-h-0 overflow-hidden">
      {/* Panel Title Bar */}
      <div className="h-10 px-4 border-b border-dw-border-subtle flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted">
          CONTEXTUAL INSPECTION
        </span>
        <span className="text-[10px] font-mono text-dw-text-disabled">
          SCHEMA {result.schema_version}
        </span>
      </div>

      {/* Main Inspection Body with smooth state transitions */}
      <div className="p-4 flex-1 overflow-y-auto min-h-0 text-xs font-mono">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="space-y-6"
          >
            {/* Tool-Specific Contextual View: Height Probe */}
            {activeTool === 'height-probe' && (
              <div className="space-y-4">
                <ToolGuidance tool="height-probe" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <Crosshair className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">ANALYSIS READOUT</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {probeResult && (
                      <button
                        onClick={clearMeasurements}
                        className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors font-mono"
                        title="Clear probe measurement"
                      >
                        CLEAR
                      </button>
                    )}
                    <button
                      onClick={cancelActiveTool}
                      className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                      title="Close probe view (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>CLOSE</span>
                    </button>
                  </div>
                </div>

                {isProbing && (
                  <div className="flex items-center space-x-2 py-4 text-dw-accent text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sampling surface elevation...</span>
                  </div>
                )}

                {probeError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[11px] leading-relaxed">
                    {probeError}
                  </div>
                )}

                {!probeResult && !isProbing && (
                  <div className="py-4 text-center border border-dashed border-dw-border-subtle rounded-xs p-3">
                    <Crosshair className="w-5 h-5 mx-auto mb-2 text-dw-accent opacity-60" />
                    <p className="text-[11px] text-dw-text-muted leading-relaxed">
                      Click anywhere on the 3D terrain surface to sample localized elevation, slope, and aspect.
                    </p>
                  </div>
                )}

                {probeResult && (
                  <div className="space-y-4">
                    {/* Primary Elevation */}
                    <div className="space-y-1">
                      <div className="text-[10px] text-dw-text-muted uppercase tracking-wider">
                        ELEVATION AT PROBE
                      </div>
                      <div className="text-3xl font-semibold tracking-tight text-dw-text-primary">
                        {probeResult.elevation !== null 
                          ? `${probeResult.elevation >= 0 ? '+' : ''}${probeResult.elevation.toFixed(1)} `
                          : 'N/A '}
                        <span className="text-xs font-normal text-dw-text-secondary">{probeResult.unit}</span>
                      </div>
                      <div className="flex items-center space-x-2 pt-0.5">
                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-xs ${
                          probeResult.is_metric 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : scientificStatus === 'CALIBRATION_REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {probeResult.is_metric
                            ? 'METRIC TERRAIN'
                            : scientificStatus === 'CALIBRATION_REJECTED'
                            ? 'CALIBRATION REJECTED'
                            : 'RELATIVE TERRAIN'}
                        </span>
                        <span className="text-[10px] text-dw-text-muted">
                          STATE: {probeResult.calibration_state.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Slope & Aspect Matrix */}
                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">LOCAL SLOPE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {probeResult.slope !== null 
                            ? (probeResult.slope_is_physical ? `${probeResult.slope.toFixed(1)}°` : `${probeResult.slope.toFixed(4)} gradient`)
                            : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">DOWNHILL ASPECT</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {probeResult.is_flat 
                            ? 'Flat (undefined)' 
                            : (probeResult.aspect !== null ? `${probeResult.aspect.toFixed(1)}° (from N)` : 'N/A')}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">RASTER (X, Y)</dt>
                        <dd className="text-dw-text-secondary">
                          {probeResult.x.toFixed(1)}, {probeResult.y.toFixed(1)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}

            {/* Tool-Specific Contextual View: Two-Point Delta */}
            {activeTool === 'two-point' && (
              <div className="space-y-4">
                <ToolGuidance tool="two-point" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <Ruler className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">ANALYSIS READOUT</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {(selectedPointA || twoPointResult) && (
                      <button
                        onClick={clearMeasurements}
                        className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors font-mono"
                        title="Clear measurement"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      onClick={cancelActiveTool}
                      className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                      title="Close measure view (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>CLOSE</span>
                    </button>
                  </div>
                </div>

                {isMeasuring && (
                  <div className="flex items-center space-x-2 py-4 text-dw-accent text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Computing baseline delta metrics...</span>
                  </div>
                )}

                {measureError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[11px] leading-relaxed">
                    {measureError}
                  </div>
                )}

                {!selectedPointA && !twoPointResult && (
                  <div className="py-4 text-center border border-dashed border-dw-border-subtle rounded-xs p-3">
                    <Ruler className="w-5 h-5 mx-auto mb-2 text-dw-accent opacity-60" />
                    <p className="text-[11px] text-dw-text-muted leading-relaxed">
                      Click Point A on the terrain surface to begin distance and elevation delta measurement.
                    </p>
                  </div>
                )}

                {selectedPointA && !selectedPointB && !twoPointResult && (
                  <div className="p-3 bg-dw-panel border border-dw-accent/30 rounded-xs space-y-1 text-xs">
                    <div className="text-dw-accent font-semibold text-[10px] uppercase">POINT A LOCKED</div>
                    <div className="text-dw-text-primary">X: {selectedPointA.x.toFixed(1)}, Y: {selectedPointA.y.toFixed(1)}</div>
                    <p className="text-[10px] text-dw-text-muted pt-1">
                      Now click Point B on the terrain mesh to complete the delta measurement.
                    </p>
                  </div>
                )}

                {twoPointResult && (
                  <div className="space-y-3">
                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-2">
                        <dt className="text-dw-text-muted">GROUND DISTANCE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {twoPointResult.horizontal_distance.toFixed(1)} {twoPointResult.horizontal_unit}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-dw-text-muted">ELEVATION Δ (B − A)</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {twoPointResult.elevation_delta !== null 
                            ? `${twoPointResult.elevation_delta >= 0 ? '+' : ''}${twoPointResult.elevation_delta.toFixed(1)} `
                            : 'N/A '}
                          <span className="text-dw-text-muted text-[10px]">{twoPointResult.elevation_unit}</span>
                        </dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-dw-text-muted">3D DISTANCE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {twoPointResult.straight_line_3d_distance !== null 
                            ? `${twoPointResult.straight_line_3d_distance.toFixed(1)} m`
                            : <span className="text-dw-text-disabled italic text-[10px]">Disabled (Relative)</span>}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-dw-text-muted">SEGMENT SLOPE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {twoPointResult.slope_between_points !== null 
                            ? (twoPointResult.slope_is_physical 
                                ? `${twoPointResult.slope_between_points.toFixed(1)}°` 
                                : `${twoPointResult.slope_between_points.toFixed(4)} relative gradient`)
                            : 'N/A'}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-2 border-t border-dw-border-subtle flex justify-between text-[10px] text-dw-text-muted">
                      <span>Pt A: ({twoPointResult.point_a.x.toFixed(1)}, {twoPointResult.point_a.y.toFixed(1)})</span>
                      <span>Pt B: ({twoPointResult.point_b.x.toFixed(1)}, {twoPointResult.point_b.y.toFixed(1)})</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool-Specific Contextual View: Slope Analysis */}
            {activeTool === 'slope' && (
              <div className="space-y-4">
                <ToolGuidance tool="slope" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <Activity className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">SLOPE DISTRIBUTION</span>
                  </div>
                  <button
                    onClick={cancelActiveTool}
                    className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                    title="Close slope view (Esc)"
                  >
                    <X className="w-3 h-3" />
                    <span>CLOSE</span>
                  </button>
                </div>

                <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                  <div className="flex justify-between py-2">
                    <dt className="text-dw-text-muted">MAX GRADIENT</dt>
                    <dd className="text-dw-text-primary font-medium">
                      {result.terrain.slope?.max ? `${result.terrain.slope.max}°` : 'N/A'}
                    </dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-dw-text-muted">MEAN GRADIENT</dt>
                    <dd className="text-dw-text-primary font-medium">
                      {result.terrain.slope?.mean ? `${result.terrain.slope.mean}°` : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Tool-Specific Contextual View: Cross-Section */}
            {activeTool === 'cross-section' && (
              <div className="space-y-4">
                <ToolGuidance tool="cross-section" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <SplitSquareVertical className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">ANALYSIS READOUT</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {(selectedPointA || crossSectionResult) && (
                      <button
                        onClick={clearMeasurements}
                        className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors font-mono"
                        title="Clear profile"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      onClick={cancelActiveTool}
                      className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                      title="Close cross-section view (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>CLOSE</span>
                    </button>
                  </div>
                </div>

                {isProfiling && (
                  <div className="flex items-center space-x-2 py-4 text-dw-accent text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting cross-section profile...</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[11px] leading-relaxed">
                    {profileError}
                  </div>
                )}

                {!selectedPointA && !crossSectionResult && (
                  <div className="py-4 text-center border border-dashed border-dw-border-subtle rounded-xs p-3">
                    <SplitSquareVertical className="w-5 h-5 mx-auto mb-2 text-dw-accent opacity-60" />
                    <p className="text-[11px] text-dw-text-muted leading-relaxed">
                      Click Point A on the terrain to set the profile transect start.
                    </p>
                  </div>
                )}

                {selectedPointA && !selectedPointB && !crossSectionResult && (
                  <div className="p-3 bg-dw-panel border border-dw-accent/30 rounded-xs space-y-1 text-xs">
                    <div className="text-dw-accent font-semibold text-[10px] uppercase">TRANSECT START (A) LOCKED</div>
                    <div className="text-dw-text-primary">X: {selectedPointA.x.toFixed(1)}, Y: {selectedPointA.y.toFixed(1)}</div>
                    <p className="text-[10px] text-dw-text-muted pt-1">
                      Now click Point B to generate the cross-section elevation curve.
                    </p>
                  </div>
                )}

                {crossSectionResult && (
                  <div className="space-y-3">
                    {/* SVG Profile Visualization */}
                    <div className="p-2 bg-[#0c1017] border border-dw-border-strong rounded-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-dw-text-muted font-mono">
                        <span>MAX: {crossSectionResult.max_elevation?.toFixed(1)} {crossSectionResult.elevation_unit}</span>
                        <span>RELIEF: {crossSectionResult.elevation_relief?.toFixed(1)} {crossSectionResult.elevation_unit}</span>
                      </div>

                      {/* SVG Canvas */}
                      <div className="w-full h-24 relative">
                        {(() => {
                          const w = 260;
                          const h = 88;
                          const pad = 8;
                          const minE = crossSectionResult.min_elevation ?? 0;
                          const maxE = crossSectionResult.max_elevation ?? 1;
                          const rangeE = Math.max(maxE - minE, 0.001);
                          const totalD = crossSectionResult.total_distance || 1;

                          const pts = crossSectionResult.samples
                            .filter(s => s.valid && s.elevation !== null)
                            .map(s => {
                              const x = pad + (s.distance / totalD) * (w - 2 * pad);
                              const y = h - pad - ((s.elevation! - minE) / rangeE) * (h - 2 * pad);
                              return `${x.toFixed(1)},${y.toFixed(1)}`;
                            });

                          const polylineStr = pts.join(' ');

                          return (
                            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                              <defs>
                                <linearGradient id="profileGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                                </linearGradient>
                              </defs>
                              {/* Background grid lines */}
                              <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke="#1e293b" strokeDasharray="2,2" strokeWidth="0.8" />
                              <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="#1e293b" strokeDasharray="2,2" strokeWidth="0.8" />
                              <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#1e293b" strokeWidth="1" />
                              {/* Filled gradient under curve */}
                              {pts.length > 1 && (
                                <polygon
                                  points={`${pad},${h - pad} ${polylineStr} ${w - pad},${h - pad}`}
                                  fill="url(#profileGrad)"
                                />
                              )}
                              {/* Elevation curve */}
                              {pts.length > 1 && (
                                <polyline
                                  points={polylineStr}
                                  fill="none"
                                  stroke="#38bdf8"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                            </svg>
                          );
                        })()}
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-dw-text-muted font-mono pt-0.5 border-t border-dw-border-subtle/50">
                        <span>A (0.0 {crossSectionResult.distance_unit})</span>
                        <span>MIN: {crossSectionResult.min_elevation?.toFixed(1)}</span>
                        <span>B ({crossSectionResult.total_distance.toFixed(1)} {crossSectionResult.distance_unit})</span>
                      </div>
                    </div>

                    {/* Cross-section metrics table */}
                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">TRANSECT LENGTH</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {crossSectionResult.total_distance.toFixed(1)} {crossSectionResult.distance_unit}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">VERTICAL RELIEF</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {crossSectionResult.elevation_relief?.toFixed(1)} {crossSectionResult.elevation_unit}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">SAMPLES</dt>
                        <dd className="text-dw-text-secondary">
                          {crossSectionResult.valid_sample_count} valid
                          {crossSectionResult.nodata_sample_count > 0 && ` (${crossSectionResult.nodata_sample_count} NoData)`}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}

            {/* Tool-Specific Contextual View: Line of Sight */}
            {activeTool === 'line-of-sight' && (
              <div className="space-y-4">
                <ToolGuidance tool="line-of-sight" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <Eye className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">ANALYSIS READOUT</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {(selectedPointA || losResult) && (
                      <button
                        onClick={clearMeasurements}
                        className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors font-mono"
                        title="Clear measurement"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      onClick={cancelActiveTool}
                      className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                      title="Close line of sight view (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>CLOSE</span>
                    </button>
                  </div>
                </div>

                {/* Observer & Target Offsets */}
                <div className="p-2.5 bg-dw-panel/60 border border-dw-border-subtle rounded-xs space-y-2 text-xs font-mono">
                  <div className="text-[10px] text-dw-text-muted uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-3 h-3 text-dw-accent" />
                    <span>OBSERVATION HEIGHT OFFSETS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-dw-text-muted block mb-0.5">POINT A (OBSERVER)</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={observerOffsetA}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setObserverOffsetA(val);
                            if (selectedPointA && selectedPointB) {
                              recomputeLOS(val, targetOffsetB);
                            }
                          }}
                          className="w-full bg-dw-base border border-dw-border-subtle px-1.5 py-1 text-xs text-dw-text-primary rounded-xs focus:border-dw-accent focus:outline-none"
                        />
                        <span className="text-[10px] text-dw-text-muted">{scientificStatus === 'CALIBRATED' ? 'm' : 'rel'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-dw-text-muted block mb-0.5">POINT B (TARGET)</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={targetOffsetB}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setTargetOffsetB(val);
                            if (selectedPointA && selectedPointB) {
                              recomputeLOS(observerOffsetA, val);
                            }
                          }}
                          className="w-full bg-dw-base border border-dw-border-subtle px-1.5 py-1 text-xs text-dw-text-primary rounded-xs focus:border-dw-accent focus:outline-none"
                        />
                        <span className="text-[10px] text-dw-text-muted">{scientificStatus === 'CALIBRATED' ? 'm' : 'rel'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {isComputingLOS && (
                  <div className="flex items-center space-x-2 py-4 text-dw-accent text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating line-of-sight clearance...</span>
                  </div>
                )}

                {losError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[11px] leading-relaxed">
                    {losError}
                  </div>
                )}

                {!selectedPointA && !losResult && (
                  <div className="py-4 text-center border border-dashed border-dw-border-subtle rounded-xs p-3">
                    <Eye className="w-5 h-5 mx-auto mb-2 text-dw-accent opacity-60" />
                    <p className="text-[11px] text-dw-text-muted leading-relaxed">
                      Click Point A (Observer) on the terrain to initiate line-of-sight inspection.
                    </p>
                  </div>
                )}

                {selectedPointA && !selectedPointB && !losResult && (
                  <div className="p-3 bg-dw-panel border border-dw-accent/30 rounded-xs space-y-1 text-xs font-mono">
                    <div className="text-dw-accent font-semibold text-[10px] uppercase">OBSERVER (A) LOCKED</div>
                    <div className="text-dw-text-primary">X: {selectedPointA.x.toFixed(1)}, Y: {selectedPointA.y.toFixed(1)}</div>
                    <p className="text-[10px] text-dw-text-muted pt-1 font-sans">
                      Now click Point B (Target) to cast the terrain line-of-sight ray.
                    </p>
                  </div>
                )}

                {losResult && (
                  <div className="space-y-3">
                    {/* Status Badge */}
                    <div className="p-2.5 rounded-xs border flex items-center justify-between text-xs font-mono font-semibold"
                      style={{
                        backgroundColor: losResult.status === 'VISIBLE' ? 'rgba(16, 185, 129, 0.1)' : losResult.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        borderColor: losResult.status === 'VISIBLE' ? 'rgba(16, 185, 129, 0.3)' : losResult.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                        color: losResult.status === 'VISIBLE' ? '#34d399' : losResult.status === 'BLOCKED' ? '#f87171' : '#fbbf24'
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        {losResult.status === 'VISIBLE' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {losResult.status === 'BLOCKED' && <XCircle className="w-4 h-4 text-rose-400" />}
                        {losResult.status === 'UNKNOWN' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        <span>LINE-OF-SIGHT: {losResult.status}</span>
                      </div>
                      <span className="text-[10px] font-normal uppercase opacity-80">
                        {losResult.is_metric ? 'METRIC' : 'GEOMETRIC'}
                      </span>
                    </div>

                    {/* SVG LOS Canvas */}
                    <div className="p-2 bg-[#0c1017] border border-dw-border-strong rounded-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-dw-text-muted font-mono">
                        <span>A ({losResult.observer_offset_a > 0 ? `+${losResult.observer_offset_a}` : '0'}{losResult.elevation_unit === 'meters' ? 'm' : ''})</span>
                        <span>CLEARANCE: {losResult.min_clearance != null ? (losResult.min_clearance >= 0 ? '+' : '') + losResult.min_clearance.toFixed(1) : 'N/A'} {losResult.elevation_unit}</span>
                        <span>B ({losResult.target_offset_b > 0 ? `+${losResult.target_offset_b}` : '0'}{losResult.elevation_unit === 'meters' ? 'm' : ''})</span>
                      </div>

                      <div className="w-full h-24 relative">
                        {(() => {
                          const w = 260;
                          const h = 88;
                          const pad = 8;
                          const validSamples = losResult.samples.filter(s => s.valid && s.terrain_elevation !== null);
                          const allZ = [
                            ...validSamples.map(s => s.terrain_elevation!),
                            ...losResult.samples.map(s => s.los_elevation)
                          ];
                          const minZ = Math.min(...allZ, 0);
                          const maxZ = Math.max(...allZ, 1);
                          const rangeZ = Math.max(maxZ - minZ, 0.001);
                          const totalD = losResult.total_distance || 1;

                          const terrPts = validSamples.map(s => {
                            const x = pad + (s.distance / totalD) * (w - 2 * pad);
                            const y = h - pad - ((s.terrain_elevation! - minZ) / rangeZ) * (h - 2 * pad);
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          });

                          const losStartPt = {
                            x: pad,
                            y: h - pad - ((losResult.samples[0].los_elevation - minZ) / rangeZ) * (h - 2 * pad)
                          };
                          const losEndPt = {
                            x: w - pad,
                            y: h - pad - ((losResult.samples[losResult.samples.length - 1].los_elevation - minZ) / rangeZ) * (h - 2 * pad)
                          };

                          let blockSvgPt: { x: number; y: number } | null = null;
                          if (losResult.first_blocking_point) {
                            const bx = pad + (losResult.first_blocking_point.distance / totalD) * (w - 2 * pad);
                            const by = h - pad - ((losResult.first_blocking_point.terrain_elevation - minZ) / rangeZ) * (h - 2 * pad);
                            blockSvgPt = { x: bx, y: by };
                          }

                          return (
                            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                              <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#1e293b" strokeWidth="1" />
                              {/* Terrain surface polyline */}
                              {terrPts.length > 1 && (
                                <polyline
                                  points={terrPts.join(' ')}
                                  fill="none"
                                  stroke="#64748b"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              )}
                              {/* Straight LOS ray */}
                              <line
                                x1={losStartPt.x}
                                y1={losStartPt.y}
                                x2={losEndPt.x}
                                y2={losEndPt.y}
                                stroke={losResult.status === 'VISIBLE' ? '#10b981' : (losResult.status === 'BLOCKED' ? '#ef4444' : '#f59e0b')}
                                strokeWidth="2"
                                strokeDasharray={losResult.status === 'BLOCKED' ? '3,2' : undefined}
                              />
                              {/* Highlight obstruction */}
                              {blockSvgPt && (
                                <circle cx={blockSvgPt.x} cy={blockSvgPt.y} r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                              )}
                            </svg>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Metrics Table */}
                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">TRANSECT LENGTH</dt>
                        <dd className="text-dw-text-primary font-medium">{losResult.total_distance.toFixed(1)} {losResult.distance_unit}</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">MINIMUM CLEARANCE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {losResult.min_clearance != null ? `${losResult.min_clearance.toFixed(2)} ${losResult.elevation_unit}` : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">MAX OBSTRUCTION</dt>
                        <dd className={`font-medium ${losResult.max_obstruction > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {losResult.max_obstruction.toFixed(2)} {losResult.elevation_unit}
                        </dd>
                      </div>
                      {losResult.first_blocking_point && (
                        <div className="py-2 border-t border-dw-border-subtle bg-rose-500/5 p-2 rounded-xs space-y-1">
                          <div className="text-[10px] uppercase font-semibold text-rose-400 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>FIRST BLOCKING OBSTRUCTION</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-dw-text-muted">Distance from A:</span>
                            <span className="text-dw-text-primary">{losResult.first_blocking_point.distance.toFixed(1)} {losResult.distance_unit}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-dw-text-muted">Obstruction penetration:</span>
                            <span className="text-rose-400 font-semibold">+{losResult.first_blocking_point.obstruction.toFixed(2)} {losResult.elevation_unit}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-dw-text-muted">Terrain / LOS elevation:</span>
                            <span className="text-dw-text-secondary">{losResult.first_blocking_point.terrain_elevation.toFixed(1)} / {losResult.first_blocking_point.los_elevation.toFixed(1)} {losResult.elevation_unit}</span>
                          </div>
                        </div>
                      )}
                    </dl>

                    {/* Scientific Disclaimer */}
                    <div className="p-2.5 bg-dw-surface border border-dw-border-subtle rounded-xs space-y-1">
                      <div className="text-[10px] font-mono uppercase text-dw-accent font-semibold flex items-center space-x-1">
                        <Info className="w-3 h-3 text-dw-accent" />
                        <span>SCIENTIFIC NOTICE</span>
                      </div>
                      <p className="text-[11px] text-dw-text-secondary leading-relaxed font-sans">
                        {losResult.disclaimer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool-Specific Contextual View: Route Profile Assessment */}
            {activeTool === 'route-profile' && (
              <div className="space-y-4">
                <ToolGuidance tool="route-profile" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <TrendingUp className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">ANALYSIS READOUT</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {(selectedPointA || routeResult) && (
                      <button
                        onClick={clearMeasurements}
                        className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors font-mono"
                        title="Clear measurement"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      onClick={cancelActiveTool}
                      className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                      title="Close route profile view (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>CLOSE</span>
                    </button>
                  </div>
                </div>

                {isComputingRoute && (
                  <div className="flex items-center space-x-2 py-4 text-dw-accent text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating route profile & slope gradients...</span>
                  </div>
                )}

                {routeError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[11px] leading-relaxed">
                    {routeError}
                  </div>
                )}

                {!selectedPointA && !routeResult && (
                  <div className="py-4 text-center border border-dashed border-dw-border-subtle rounded-xs p-3">
                    <TrendingUp className="w-5 h-5 mx-auto mb-2 text-dw-accent opacity-60" />
                    <p className="text-[11px] text-dw-text-muted leading-relaxed">
                      Click Point A to begin route terrain profile assessment.
                    </p>
                  </div>
                )}

                {selectedPointA && !selectedPointB && !routeResult && (
                  <div className="p-3 bg-dw-panel border border-dw-accent/30 rounded-xs space-y-1 text-xs font-mono">
                    <div className="text-dw-accent font-semibold text-[10px] uppercase">ROUTE START (A) LOCKED</div>
                    <div className="text-dw-text-primary">X: {selectedPointA.x.toFixed(1)}, Y: {selectedPointA.y.toFixed(1)}</div>
                    <p className="text-[10px] text-dw-text-muted pt-1 font-sans">
                      Now click Point B to complete the route profile assessment.
                    </p>
                  </div>
                )}

                {routeResult && (
                  <div className="space-y-3">
                    {/* Classification Banner */}
                    <div className="p-2.5 bg-dw-panel border border-dw-accent/30 rounded-xs space-y-1 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-wider text-dw-text-muted">TERRAIN RELIEF CLASS</span>
                        <span className="font-semibold text-dw-accent px-1.5 py-0.5 rounded-xs bg-dw-accent/10 border border-dw-accent/20">
                          {routeResult.classification}
                        </span>
                      </div>
                      <div className="text-[10px] text-dw-text-muted pt-0.5 font-sans leading-tight">
                        {routeResult.classification_rationale}
                      </div>
                    </div>

                    {/* SVG Route Profile */}
                    <div className="p-2 bg-[#0c1017] border border-dw-border-strong rounded-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] text-dw-text-muted font-mono">
                        <span>GAIN: +{routeResult.elevation_gain.toFixed(1)} {routeResult.elevation_unit}</span>
                        <span>LOSS: -{routeResult.elevation_loss.toFixed(1)} {routeResult.elevation_unit}</span>
                      </div>

                      <div className="w-full h-24 relative">
                        {(() => {
                          const w = 260;
                          const h = 88;
                          const pad = 8;
                          const validS = routeResult.samples.filter(s => s.valid && s.elevation !== null);
                          if (validS.length < 2) return null;

                          const elevs = validS.map(s => s.elevation!);
                          const minE = Math.min(...elevs);
                          const maxE = Math.max(...elevs);
                          const rangeE = Math.max(maxE - minE, 0.001);
                          const totalD = routeResult.total_distance || 1;

                          const pts = validS.map(s => {
                            const x = pad + (s.distance / totalD) * (w - 2 * pad);
                            const y = h - pad - ((s.elevation! - minE) / rangeE) * (h - 2 * pad);
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          });

                          return (
                            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
                              <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#1e293b" strokeWidth="1" />
                              <polyline
                                points={pts.join(' ')}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Metrics Table */}
                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">TOTAL DISTANCE</dt>
                        <dd className="text-dw-text-primary font-medium">{routeResult.total_distance.toFixed(1)} {routeResult.distance_unit}</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">ELEVATION GAIN</dt>
                        <dd className="text-emerald-400 font-medium">+{routeResult.elevation_gain.toFixed(1)} {routeResult.elevation_unit}</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">ELEVATION LOSS</dt>
                        <dd className="text-rose-400 font-medium">-{routeResult.elevation_loss.toFixed(1)} {routeResult.elevation_unit}</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">NET CHANGE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {routeResult.net_elevation_change != null ? (routeResult.net_elevation_change >= 0 ? '+' : '') + routeResult.net_elevation_change.toFixed(1) : 'N/A'} {routeResult.elevation_unit}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">MAX UPHILL GRADIENT</dt>
                        <dd className="text-dw-text-primary font-medium">{(routeResult.max_uphill_gradient * 100).toFixed(1)}%</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">MAX DOWNHILL GRADIENT</dt>
                        <dd className="text-dw-text-primary font-medium">{(routeResult.max_downhill_gradient * 100).toFixed(1)}%</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">MEAN ABS GRADIENT</dt>
                        <dd className="text-dw-text-primary font-medium">{(routeResult.mean_absolute_gradient * 100).toFixed(1)}%</dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">MAX ENCOUNTERED SLOPE</dt>
                        <dd className="text-dw-text-primary font-medium">
                          {routeResult.max_slope != null ? (routeResult.max_slope_is_physical ? `${routeResult.max_slope.toFixed(1)}°` : `${routeResult.max_slope.toFixed(4)} gradient`) : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">NODATA COVERAGE</dt>
                        <dd className="text-dw-text-secondary">{routeResult.nodata_pct.toFixed(1)}% ({routeResult.nodata_samples_count} gaps)</dd>
                      </div>
                    </dl>

                    {/* Scientific Disclaimer */}
                    <div className="p-2.5 bg-dw-surface border border-dw-border-subtle rounded-xs space-y-1">
                      <div className="text-[10px] font-mono uppercase text-dw-accent font-semibold flex items-center space-x-1">
                        <Info className="w-3 h-3 text-dw-accent" />
                        <span>SCIENTIFIC NOTICE</span>
                      </div>
                      <p className="text-[11px] text-dw-text-secondary leading-relaxed font-sans">
                        {routeResult.disclaimer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool-Specific Contextual View: Terrain Screening */}
            {activeTool === 'terrain-screening' && (
              <div className="space-y-4">
                <ToolGuidance tool="terrain-screening" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <Filter className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">SCREENING ANALYSIS</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {screeningResult && (
                      <button
                        onClick={clearMeasurements}
                        className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors font-mono"
                        title="Clear screening"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      onClick={cancelActiveTool}
                      className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                      title="Close terrain screening view (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>CLOSE</span>
                    </button>
                  </div>
                </div>

                {/* Screening Controls */}
                <div className="p-3 bg-dw-panel border border-dw-border-subtle rounded-xs space-y-3 text-xs font-mono">
                  <div className="text-[10px] font-semibold uppercase text-dw-accent tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>RULE-BASED SCREENING CRITERIA</span>
                  </div>

                  {/* Slope Threshold */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-dw-text-muted">MAX SLOPE THRESHOLD:</span>
                      <span className="text-dw-text-primary font-semibold">
                        {scientificStatus === 'CALIBRATED' 
                          ? `${screeningMaxSlope ?? 30}°` 
                          : `${screeningMaxSlope ?? 0.5} (rel gradient)`}
                      </span>
                    </div>
                    {scientificStatus === 'CALIBRATED' ? (
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={screeningMaxSlope ?? 30}
                        onChange={(e) => setScreeningCriteria({ maxSlope: parseFloat(e.target.value) })}
                        className="w-full accent-dw-accent"
                      />
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="number"
                          min="0.01"
                          max="2.0"
                          step="0.05"
                          value={screeningMaxSlope ?? 0.5}
                          onChange={(e) => setScreeningCriteria({ maxSlope: parseFloat(e.target.value) })}
                          className="w-full bg-dw-base border border-dw-border-subtle px-2 py-1 text-xs text-dw-text-primary rounded-xs focus:border-dw-accent focus:outline-none"
                        />
                        <p className="text-[10px] text-amber-400/80 font-sans leading-tight">
                          Relative terrain: degree-based screening disabled. Use relative gradient.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Elevation Bounds */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-dw-text-muted block mb-0.5">MIN ELEVATION</label>
                      <input
                        type="number"
                        placeholder="None"
                        value={screeningMinElev ?? ''}
                        onChange={(e) => setScreeningCriteria({ minElev: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                        className="w-full bg-dw-base border border-dw-border-subtle px-1.5 py-1 text-xs text-dw-text-primary rounded-xs focus:border-dw-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-dw-text-muted block mb-0.5">MAX ELEVATION</label>
                      <input
                        type="number"
                        placeholder="None"
                        value={screeningMaxElev ?? ''}
                        onChange={(e) => setScreeningCriteria({ maxElev: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                        className="w-full bg-dw-base border border-dw-border-subtle px-1.5 py-1 text-xs text-dw-text-primary rounded-xs focus:border-dw-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    onClick={runScreening}
                    disabled={isScreening}
                    className="w-full py-2 bg-dw-accent hover:bg-dw-accent-hover text-white text-xs font-semibold rounded-xs transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
                  >
                    {isScreening ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>EVALUATING CELLS...</span>
                      </>
                    ) : (
                      <>
                        <Filter className="w-3.5 h-3.5" />
                        <span>RUN SCREENING</span>
                      </>
                    )}
                  </button>
                </div>

                {screeningError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[11px] leading-relaxed">
                    {screeningError}
                  </div>
                )}

                {screeningResult && (
                  <div className="space-y-3">
                    {/* Distribution Bar */}
                    <div className="space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between text-dw-text-muted">
                        <span>SUITABILITY DISTRIBUTION</span>
                        <span className="text-emerald-400 font-semibold">{screeningResult.suitable_pct.toFixed(1)}% SUITABLE</span>
                      </div>
                      <div className="w-full h-3 bg-[#1e293b] rounded-xs overflow-hidden flex">
                        <div style={{ width: `${screeningResult.suitable_pct}%` }} className="h-full bg-emerald-500 transition-all duration-300" title={`Suitable: ${screeningResult.suitable_pct}%`} />
                        <div style={{ width: `${screeningResult.unsuitable_pct}%` }} className="h-full bg-rose-500 transition-all duration-300" title={`Unsuitable: ${screeningResult.unsuitable_pct}%`} />
                        <div style={{ width: `${screeningResult.unknown_pct}%` }} className="h-full bg-slate-500 transition-all duration-300" title={`Unknown: ${screeningResult.unknown_pct}%`} />
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-1.5">
                        <dt className="text-emerald-400 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>SUITABLE CELLS</span>
                        </dt>
                        <dd className="text-dw-text-primary font-medium">
                          {screeningResult.suitable_pct.toFixed(1)}% ({screeningResult.suitable_cells.toLocaleString()})
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-rose-400 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          <span>UNSUITABLE CELLS</span>
                        </dt>
                        <dd className="text-dw-text-primary font-medium">
                          {screeningResult.unsuitable_pct.toFixed(1)}% ({screeningResult.unsuitable_cells.toLocaleString()})
                        </dd>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <dt className="text-slate-400 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>UNKNOWN / NODATA</span>
                        </dt>
                        <dd className="text-dw-text-secondary">
                          {screeningResult.unknown_pct.toFixed(1)}% ({screeningResult.unknown_cells.toLocaleString()})
                        </dd>
                      </div>
                    </dl>

                    {/* Scientific Disclaimer */}
                    <div className="p-2.5 bg-dw-surface border border-dw-border-subtle rounded-xs space-y-1">
                      <div className="text-[10px] font-mono uppercase text-dw-accent font-semibold flex items-center space-x-1">
                        <Info className="w-3 h-3 text-dw-accent" />
                        <span>SCIENTIFIC NOTICE</span>
                      </div>
                      <p className="text-[11px] text-dw-text-secondary leading-relaxed font-sans">
                        {screeningResult.disclaimer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool-Specific Contextual View: Validation & Benchmark */}
            {activeTool === 'validation' && (
              <div className="space-y-4">
                <ToolGuidance tool="validation" onClose={cancelActiveTool} />

                <div className="flex items-center justify-between border-b border-dw-border-subtle pb-2">
                  <div className="flex items-center space-x-2 text-dw-text-secondary">
                    <FileCheck2 className="w-3.5 h-3.5 text-dw-accent" />
                    <span className="font-semibold uppercase tracking-wider text-xs">BENCHMARK REPORT</span>
                  </div>
                  <button
                    onClick={cancelActiveTool}
                    className="text-[10px] text-dw-text-muted hover:text-dw-text-primary px-1.5 py-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors flex items-center space-x-1 font-mono"
                    title="Close validation view (Esc)"
                  >
                    <X className="w-3 h-3" />
                    <span>CLOSE</span>
                  </button>
                </div>
                <ValidationInspectorSection />
              </div>
            )}

        {/* Default Overview (When no specific tool is active) */}
        {activeTool === 'none' && (
          <div className="space-y-4">
            {viewMode === 'first-person' && (
              <ToolGuidance 
                tool="first-person" 
                onClose={() => setViewMode('3d')} 
              />
            )}

            {/* 1. SCENE / INPUT IDENTITY */}
            <div className="p-3 bg-dw-panel/85 border border-dw-border-strong rounded-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle">
                <div className="flex items-center space-x-1.5 text-dw-accent">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
                    SCENE / INPUT
                  </span>
                </div>
                <span className="text-[10px] text-dw-accent font-semibold uppercase px-1.5 py-0.2 rounded-xs bg-dw-accent/10 border border-dw-accent/30 font-mono">
                  {imageInput?.metadata?.format || (imageInput?.status === 'ready' ? 'IMAGE' : result.source.input_type.toUpperCase())}
                </span>
              </div>

              {/* Compact horizontal preview row when image is loaded */}
              {imageInput?.previewUrl && (
                <div 
                  onClick={() => setInputModalOpen(true)}
                  className="flex items-center space-x-2.5 p-1.5 bg-dw-base border border-dw-border-subtle rounded-xs cursor-pointer group hover:border-dw-accent/60 transition-colors"
                  title="Click to inspect full image specifications"
                >
                  <div className="w-12 h-12 rounded-xs overflow-hidden border border-dw-border-subtle shrink-0 bg-dw-panel">
                    <img 
                      src={imageInput.previewUrl} 
                      alt="Source preview" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <div className="text-xs font-semibold text-dw-text-primary truncate" title={imageInput.metadata?.filename}>
                      {imageInput.metadata?.filename || 'Loaded image'}
                    </div>
                    <div className="text-[10px] text-dw-text-muted">
                      {imageInput.metadata?.width} × {imageInput.metadata?.height} px
                    </div>
                    <div className="text-[10px] text-dw-accent group-hover:underline flex items-center space-x-1 pt-0.5">
                      <span>Inspect specifications</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>
              )}

              <dl className="divide-y divide-dw-border-subtle/60 text-xs font-mono">
                {!imageInput?.previewUrl && (
                  <div className="flex justify-between py-1">
                    <dt className="text-dw-text-muted">DATASET</dt>
                    <dd className="text-dw-text-primary font-medium truncate max-w-[150px]" title={imageInput?.metadata?.filename || result.source.filename}>
                      {imageInput?.metadata?.filename || result.source.filename}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">GRID DIMENSIONS</dt>
                  <dd className="text-dw-text-primary tabular-nums">
                    {result.source.dimensions.width} × {result.source.dimensions.height} px
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">SOURCE FORMAT</dt>
                  <dd className="text-dw-text-primary font-medium uppercase text-[11px]">
                    {imageInput?.metadata?.format || result.source.input_type}
                  </dd>
                </div>
              </dl>

              <div className="pt-1 flex items-center justify-between border-t border-dw-border-subtle/60">
                <button
                  onClick={() => setInputModalOpen(true)}
                  className="text-[10px] text-dw-accent hover:underline font-mono"
                >
                  {imageInput?.metadata ? 'Inspect / Replace Image →' : 'Ingest Real Image →'}
                </button>
                {imageInput?.status === 'ready' && (
                  <button
                    onClick={clearImageInput}
                    className="text-[10px] text-red-400 hover:text-red-300 font-mono transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* 2. TERRAIN STATUS */}
            <div className="p-3 bg-dw-panel/85 border border-dw-border-strong rounded-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle">
                <span className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted font-semibold">
                  TERRAIN STATUS
                </span>
                <div>
                  {scientificStatus === 'CALIBRATED' && (
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>METRIC TERRAIN</span>
                    </span>
                  )}
                  {scientificStatus === 'CALIBRATION_REJECTED' && (
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-semibold tracking-wider">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>CALIBRATION REJECTED</span>
                    </span>
                  )}
                  {(scientificStatus === 'RELATIVE' || scientificStatus === 'CALIBRATION_UNAVAILABLE') && (
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-semibold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>RELATIVE TERRAIN</span>
                    </span>
                  )}
                </div>
              </div>

              {scientificStatus === 'CALIBRATION_REJECTED' && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[10px] space-y-1">
                  <div className="font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>Calibration Rejected by Guardrails</span>
                  </div>
                  <p className="text-rose-300/80 leading-normal">
                    {qaResult.rejection_reason || calibrationResult?.failureReason || 'Elevation data failed scientific validation. Values remain uncalibrated relative height.'}
                  </p>
                </div>
              )}

              <dl className="divide-y divide-dw-border-subtle/60 text-xs font-mono">
                <div className="flex justify-between py-1 items-center">
                  <dt className="text-dw-text-muted">ELEVATION RANGE</dt>
                  <dd className="text-dw-text-primary font-medium tabular-nums">
                    {typeof result.elevation.min === 'number' ? result.elevation.min.toFixed(1) : result.elevation.min} – {typeof result.elevation.max === 'number' ? result.elevation.max.toFixed(1) : result.elevation.max} {unit}
                  </dd>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <dt className="text-dw-text-muted">MEAN ELEVATION</dt>
                  <dd className="text-dw-text-primary font-medium tabular-nums">
                    {typeof result.elevation.mean === 'number' ? result.elevation.mean.toFixed(1) : result.elevation.mean} {unit}
                  </dd>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <dt className="text-dw-text-muted">VERTICAL DATUM</dt>
                  <dd className="text-dw-text-primary font-medium text-[11px] truncate max-w-[150px]" title={isCalibrated ? (result.geospatial.vertical_reference || calibrationResult?.verticalReference || 'EGM96 Geoid Height') : 'Arbitrary Relative Surface'}>
                    {isCalibrated ? (result.geospatial.vertical_reference || calibrationResult?.verticalReference || 'EGM96 Geoid Height') : 'Arbitrary Relative Surface (Uncalibrated)'}
                  </dd>
                </div>
                <div className="flex justify-between py-1 items-center text-dw-text-disabled text-[10px]">
                  <dt className="text-dw-text-muted">SURFACE MODEL</dt>
                  <dd className="text-dw-text-secondary truncate max-w-[150px]">
                    {isCalibrated ? 'Calibrated Absolute DSM' : 'Continuous Relative Elevation'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 3. GEOSPATIAL STATUS */}
            <div className="p-3 bg-dw-panel/85 border border-dw-border-strong rounded-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle">
                <span className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted font-semibold">
                  GEOSPATIAL STATUS
                </span>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-xs ${
                  imageInput?.metadata?.spatial.hasGeoreference || result.geospatial.georeferenced
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-dw-base text-amber-400 border border-amber-500/30'
                }`}>
                  {imageInput?.metadata?.spatial.hasGeoreference || result.geospatial.georeferenced ? 'GEOREFERENCED' : 'UNPROJECTED'}
                </span>
              </div>

              <dl className="divide-y divide-dw-border-subtle/60 text-xs font-mono">
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">COORDINATE SYSTEM</dt>
                  <dd className={`font-semibold text-[11px] truncate max-w-[140px] ${
                    result.geospatial.crs ? 'text-emerald-400' : 'text-amber-400'
                  }`} title={result.geospatial.crs || 'UNPROJECTED (RELATIVE GRID)'}>
                    {result.geospatial.crs ? result.geospatial.crs.split(' ')[0] : 'UNPROJECTED'}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">PIXEL RESOLUTION</dt>
                  <dd className="text-dw-text-primary tabular-nums">
                    {imageInput?.metadata?.spatial.pixelResolution 
                      ? `${imageInput.metadata.spatial.pixelResolution.x.toFixed(2)} m/px` 
                      : (result.geospatial.pixel_resolution 
                          ? (typeof result.geospatial.pixel_resolution === 'number' 
                              ? `${result.geospatial.pixel_resolution.toFixed(2)} m/px` 
                              : `${result.geospatial.pixel_resolution.x.toFixed(2)} m/px`) 
                          : 'Arbitrary grid')}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">DATA VALIDITY</dt>
                  <dd className="text-emerald-400 font-semibold tabular-nums">
                    {qaResult.valid_pct.toFixed(1)}% valid cells
                  </dd>
                </div>
              </dl>
            </div>

            {/* 4. VALIDATION STATUS */}
            <div className="p-3 bg-dw-panel/85 border border-dw-border-strong rounded-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle">
                <div className="flex items-center space-x-1.5 text-dw-accent">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono uppercase font-bold tracking-wider">
                    VALIDATION STATUS
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-xs ${
                  validationResult?.status === 'INDEPENDENT_VALIDATION'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : validationResult?.status === 'REFERENCE_FIT'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'bg-dw-base text-dw-text-disabled border border-dw-border-subtle'
                }`}>
                  {validationResult?.status === 'INDEPENDENT_VALIDATION'
                    ? 'INDEPENDENT'
                    : validationResult?.status === 'REFERENCE_FIT'
                    ? 'REFERENCE FIT'
                    : 'NOT VALIDATED'}
                </span>
              </div>

              <dl className="divide-y divide-dw-border-subtle/60 text-xs font-mono">
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">REFERENCE SOURCE</dt>
                  <dd className="text-dw-text-primary font-medium truncate max-w-[140px]" title={validationResult?.reference_source || result.validation?.reference || (isCalibrated ? 'Reference DEM' : 'None')}>
                    {validationResult?.reference_source || result.validation?.reference || (isCalibrated ? 'Reference DEM' : 'None')}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">RMSE ACCURACY</dt>
                  <dd className="text-dw-text-primary font-semibold tabular-nums">
                    {isCalibrated && typeof validationResult?.overall_metrics?.rmse === 'number'
                      ? `±${validationResult.overall_metrics.rmse.toFixed(2)} m`
                      : isCalibrated && typeof calibrationResult?.rmse === 'number'
                      ? `±${calibrationResult.rmse.toFixed(2)} m`
                      : isCalibrated && typeof result.validation?.rmse === 'number'
                      ? `±${result.validation.rmse.toFixed(2)} m`
                      : 'N/A (Relative Surface)'}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-dw-text-muted">PEARSON r</dt>
                  <dd className="text-emerald-400 font-semibold tabular-nums">
                    {typeof validationResult?.overall_metrics?.pearson_r === 'number'
                      ? validationResult.overall_metrics.pearson_r.toFixed(3)
                      : typeof calibrationResult?.correlation === 'number'
                      ? calibrationResult.correlation.toFixed(3)
                      : typeof result.validation?.correlation === 'number'
                      ? result.validation.correlation.toFixed(3)
                      : 'N/A'}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => setActiveTool('validation')}
                className="w-full py-1.5 px-2 bg-dw-elevated hover:bg-dw-base border border-dw-accent/80 hover:border-dw-accent text-dw-accent rounded-xs font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs active:scale-[0.98]"
              >
                <span>OPEN VALIDATION PANEL →</span>
              </button>
            </div>

            {/* 5. NEXT ACTIONS */}
            <div className="p-3 bg-dw-panel/85 border border-dw-border-strong rounded-xs space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted font-semibold pb-1.5 border-b border-dw-border-subtle">
                NEXT ACTIONS
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTool('height-probe')}
                  className="w-full py-1.5 px-2.5 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong hover:border-dw-accent rounded-xs text-xs font-mono font-medium text-dw-text-primary hover:text-dw-accent flex items-center justify-between transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-2">
                    <Crosshair className="w-3.5 h-3.5 text-dw-accent" />
                    <span>Analyse Terrain</span>
                  </div>
                  <span className="text-[10px] text-dw-text-muted">Probe / Measure →</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('validation')}
                  className="w-full py-1.5 px-2.5 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong hover:border-dw-accent rounded-xs text-xs font-mono font-medium text-dw-text-primary hover:text-dw-accent flex items-center justify-between transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-2">
                    <FileCheck2 className="w-3.5 h-3.5 text-dw-accent" />
                    <span>Validate Results</span>
                  </div>
                  <span className="text-[10px] text-dw-text-muted">Accuracy / QA →</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full py-1.5 px-2.5 bg-dw-elevated hover:bg-dw-base border border-dw-accent/60 hover:border-dw-accent text-dw-accent rounded-xs text-xs font-mono font-semibold flex items-center justify-between transition-all active:scale-[0.98] shadow-xs"
                >
                  <div className="flex items-center space-x-2">
                    <Download className="w-3.5 h-3.5 text-dw-accent" />
                    <span>Export & Report</span>
                  </div>
                  <span className="text-[10px] bg-dw-accent/15 px-1.5 py-0.2 rounded-xs font-mono">Dialog →</span>
                </button>
              </div>

              {/* Status feedback */}
              {quickExporting && (
                <div className="p-1.5 bg-dw-base/70 border border-dw-border-subtle rounded-xs flex items-center space-x-1.5 text-[10px] text-dw-accent">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Preparing export download...</span>
                </div>
              )}
              {quickExportSuccess && (
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xs flex items-center space-x-1.5 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{quickExportSuccess}</span>
                </div>
              )}
              {quickExportError && (
                <div className="p-1.5 bg-red-500/10 border border-red-500/30 rounded-xs flex items-center space-x-1.5 text-[10px] text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{quickExportError}</span>
                </div>
              )}

              {/* Compact 1-click quick-export shortcuts */}
              <div className="pt-1.5 border-t border-dw-border-subtle/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-dw-text-muted">QUICK EXPORT:</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleQuickExport('terrain', () => exportTerrainRasterFile(scientificStatus === 'CALIBRATED' ? 'geotiff' : 'relative_geotiff'), 'GeoTIFF downloaded')}
                    disabled={quickExporting !== null}
                    className="px-1.5 py-0.5 bg-dw-base hover:bg-dw-elevated text-dw-text-secondary hover:text-dw-text-primary rounded-xs border border-dw-border-subtle transition-colors disabled:opacity-50"
                    title="Quick download GeoTIFF raster"
                  >
                    GeoTIFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExport('report', () => exportTerrainReportFile('html'), 'HTML report downloaded')}
                    disabled={quickExporting !== null}
                    className="px-1.5 py-0.5 bg-dw-base hover:bg-dw-elevated text-dw-text-secondary hover:text-dw-text-primary rounded-xs border border-dw-border-subtle transition-colors disabled:opacity-50"
                    title="Quick download HTML report"
                  >
                    Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExport('session', () => exportSessionJson(), 'Session JSON downloaded')}
                    disabled={quickExporting !== null}
                    className="px-1.5 py-0.5 bg-dw-base hover:bg-dw-elevated text-dw-text-secondary hover:text-dw-text-primary rounded-xs border border-dw-border-subtle transition-colors disabled:opacity-50"
                    title="Quick download Session JSON"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExport('analysis', () => exportAnalysisDataFile('geojson'), 'GeoJSON transects downloaded')}
                    disabled={quickExporting !== null}
                    className="px-1.5 py-0.5 bg-dw-base hover:bg-dw-elevated text-dw-text-secondary hover:text-dw-text-primary rounded-xs border border-dw-border-subtle transition-colors disabled:opacity-50"
                    title="Quick download GeoJSON vector transects"
                  >
                    GeoJSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </motion.div>
      </AnimatePresence>
      </div>

      {/* Action Footer: Generate Report & Export */}
      <div className="p-3.5 border-t border-dw-border-subtle bg-dw-surface space-y-2">
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="w-full py-2 bg-dw-elevated hover:bg-dw-base border border-dw-accent text-dw-accent text-xs font-mono font-semibold rounded-xs transition-all duration-fast ease-dw active:scale-[0.98] flex items-center justify-center space-x-2 shadow-xs"
          title="Open Geospatial Export & Terrain Analysis Report Dialog"
        >
          <FileText className="w-3.5 h-3.5 text-dw-accent" />
          <span>GENERATE REPORT & EXPORT</span>
        </button>

        <button
          onClick={handleAddToReport}
          className={`w-full py-1.5 border text-[11px] font-mono rounded-xs transition-all duration-fast ease-dw active:scale-[0.97] flex items-center justify-center space-x-2 focus-visible:outline-none ${
            reportAdded
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-xs'
              : 'bg-dw-panel hover:bg-dw-elevated border-dw-border-strong text-dw-text-secondary hover:text-dw-text-primary'
          }`}
        >
          <div className="relative w-3.5 h-3.5 flex items-center justify-center" aria-hidden="true">
            <Check 
              className={`w-3.5 h-3.5 text-emerald-500 absolute transition-all duration-fast ease-dw ${
                reportAdded ? 'scale-100 opacity-100' : 'scale-[0.25] opacity-0 pointer-events-none'
              }`} 
            />
            <FileCheck2 
              className={`w-3.5 h-3.5 text-dw-accent absolute transition-all duration-fast ease-dw ${
                !reportAdded ? 'scale-100 opacity-100' : 'scale-[0.25] opacity-0 pointer-events-none'
              }`} 
            />
          </div>
          <span className="transition-colors duration-fast">
            {reportAdded ? 'SAVED TO OBSERVATIONS' : 'ADD NOTE TO REPORT DRAFT'}
          </span>
        </button>
      </div>
    </aside>
  );
};
