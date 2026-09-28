import React from 'react';
import { useRouter } from '../../router/Router';
import { useWorkspace } from '../../state/WorkspaceContext';
import { SCENARIO_METAS, ScenarioId } from '../../fixtures/scenarios';
import { ThemeToggle } from '../common/ThemeToggle';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Mountain, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  UploadCloud
} from 'lucide-react';

export const WorkspaceHeader: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    result, 
    currentScenario, 
    setScenario, 
    uiState,
    imageInput,
    setInputModalOpen,
    isEstimatingDepth,
    isCalibrating,
    scientificStatus
  } = useWorkspace();

  const isRealInputLoaded = Boolean(imageInput?.status === 'ready' && imageInput?.metadata);
  const activeFilename = imageInput?.metadata?.filename ?? result.source.filename;
  const activeInputType = (imageInput?.metadata?.format ?? result.source.input_type).toUpperCase();
  const isGeoreferenced = imageInput?.metadata 
    ? imageInput.metadata.spatial.hasGeoreference 
    : result.geospatial.georeferenced;

  return (
    <header className="h-12 border-b border-dw-border-subtle bg-dw-surface px-4 flex items-center justify-between select-none z-20">
      {/* Brand & File Identity */}
      <div className="flex items-center space-x-3.5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-1.5 text-dw-text-secondary hover:text-dw-text-primary text-xs font-mono transition-all duration-fast ease-dw active:scale-[0.96] focus-visible:outline-none"
          title="Back to Overview"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>EXIT</span>
        </button>

        <div className="h-4 w-px bg-dw-border-muted" />

        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-dw-panel border border-dw-border-strong flex items-center justify-center rounded-xs text-dw-accent">
            <Mountain className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-dw-text-primary">DEPTHWIZARD</span>
        </div>

        <div className="h-4 w-px bg-dw-border-muted" />

        {/* Single Primary Ingestion Entry Point */}
        <button
          onClick={() => setInputModalOpen(true)}
          className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-1 rounded-xs border transition-all duration-fast active:scale-[0.97] focus-visible:outline-none ${
            isRealInputLoaded
              ? 'bg-dw-elevated border-dw-accent text-dw-accent font-semibold shadow-xs hover:bg-dw-panel'
              : 'bg-dw-accent/15 hover:bg-dw-accent/25 border-dw-accent/50 text-dw-accent font-medium'
          }`}
          title={isRealInputLoaded ? "Inspect or replace current input image" : "Load real imagery (JPG, PNG, GeoTIFF)"}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{isRealInputLoaded ? 'Change Image' : 'Open Image'}</span>
        </button>

        <div className="h-4 w-px bg-dw-border-muted" />

        {/* Active Dataset Identity */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-dw-text-primary font-medium truncate max-w-[200px]" title={activeFilename}>
            {activeFilename}
          </span>
          <span className="text-dw-border-muted">/</span>
          <span className="text-dw-text-muted uppercase text-[10px] font-semibold tracking-wider">
            {activeInputType}
          </span>
          {isGeoreferenced ? (
            <span className="px-1.5 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium text-[10px] uppercase tracking-wider">
              GEOREFERENCED
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-xs bg-dw-panel text-dw-text-muted border border-dw-border-subtle font-medium text-[10px] uppercase tracking-wider">
              UNPROJECTED
            </span>
          )}

          {isEstimatingDepth && (
            <span className="px-2 py-0.5 rounded-xs bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-mono animate-pulse">
              ESTIMATING DEPTH...
            </span>
          )}
          {isCalibrating && (
            <span className="px-2 py-0.5 rounded-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono animate-pulse">
              CALIBRATING DSM...
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Scientific Truth, Theme & Readiness */}
      <div className="flex items-center space-x-3.5">
        {/* Scientific Surface Elevation Badge */}
        <div className="flex items-center">
          {scientificStatus === 'CALIBRATED' ? (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>METRIC TERRAIN</span>
            </span>
          ) : scientificStatus === 'CALIBRATION_REJECTED' ? (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-semibold tracking-wider">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>CALIBRATION REJECTED</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-xs bg-dw-panel text-dw-text-secondary border border-dw-border-subtle text-[10px] font-mono font-medium tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>RELATIVE TERRAIN</span>
            </span>
          )}
        </div>

        {/* Demo Scenario Selector (subtle fallback when no real image ingested) */}
        {!isRealInputLoaded && (
          <>
            <div className="h-4 w-px bg-dw-border-muted" />
            <div className="flex items-center space-x-1.5">
              <label htmlFor="scenario-select" className="text-[10px] font-mono text-dw-text-disabled uppercase">
                DEMO:
              </label>
              <select
                id="scenario-select"
                value={currentScenario}
                onChange={(e) => setScenario(e.target.value as ScenarioId)}
                className="bg-dw-panel hover:bg-dw-elevated border border-dw-border-subtle text-dw-text-secondary hover:text-dw-text-primary text-[10px] font-mono py-0.5 px-1.5 rounded-xs transition-colors cursor-pointer focus-visible:outline-none"
                title="Select synthetic demo scene"
              >
                {SCENARIO_METAS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name.split('—')[1]?.trim() || m.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="h-4 w-px bg-dw-border-muted" />

        {/* Theme Toggle Button */}
        <ThemeToggle showLabel={false} />

        <div className="h-4 w-px bg-dw-border-muted" />

        {/* State Badge */}
        <div className="flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={uiState}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="flex items-center space-x-1.5 font-mono text-xs"
            >
              {uiState === 'READY' && (
                <span className="inline-flex items-center text-emerald-500 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  READY
                </span>
              )}
              {uiState === 'PROCESSING' && (
                <span className="inline-flex items-center text-sky-500 animate-pulse font-medium text-[11px]">
                  <Clock className="w-3.5 h-3.5 mr-1 text-sky-500" />
                  PROCESSING
                </span>
              )}
              {uiState === 'ERROR' && (
                <span className="inline-flex items-center text-red-500 font-medium text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500" />
                  ERROR
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
