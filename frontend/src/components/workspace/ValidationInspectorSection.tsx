import React from 'react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { 
  FileCheck2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock, 
  Eye, 
  RefreshCw 
} from 'lucide-react';

export const ValidationInspectorSection: React.FC = () => {
  const {
    scientificStatus,
    result,
    calibrationResult,
    calibrationError,
    validationResult,
    isValidating,
    validationError,
    loadValidation,
    qaResult,
    errorMapArray,
    activeLayer,
    setActiveLayer
  } = useWorkspace();

  // Determine if this is a cached/demo fixture or live backend result
  const isDemoFixture = !validationResult && Boolean(result?.validation?.available);

  // Extract reference dataset and type
  const referenceDataset = 
    validationResult?.reference_source || 
    calibrationResult?.referenceSource || 
    result?.validation?.reference || 
    qaResult.reference_source || 
    'Reference DEM';

  let referenceType = 'Authoritative Reference DEM (In-sample)';
  if (validationResult?.is_independent || result?.validation?.reference?.toLowerCase().includes('lidar')) {
    referenceType = 'Airborne LiDAR (Ground Truth)';
  } else if (validationResult?.spatial_split) {
    referenceType = 'Spatial Holdout Partition (Out-of-sample)';
  }

  // Sample counts and coverage
  const sampleCount = 
    validationResult?.overall_metrics?.sample_count ?? 
    calibrationResult?.sampleCount ?? 
    qaResult.valid_cells;
  const coveragePct = qaResult.valid_pct;
  const coverageDisplay = sampleCount > 0 
    ? `${sampleCount.toLocaleString()} cells (${coveragePct.toFixed(1)}% coverage)` 
    : `${coveragePct.toFixed(1)}% coverage`;

  // Validation metrics
  const rmse = 
    validationResult?.overall_metrics?.rmse ?? 
    calibrationResult?.rmse ?? 
    result?.validation?.rmse ?? 
    null;
  const mae = 
    validationResult?.overall_metrics?.mae ?? 
    calibrationResult?.mae ?? 
    result?.validation?.mae ?? 
    null;
  const correlation = 
    validationResult?.overall_metrics?.pearson_r ?? 
    calibrationResult?.correlation ?? 
    result?.validation?.correlation ?? 
    null;
  const bias = 
    validationResult?.overall_metrics?.bias ?? 
    calibrationResult?.bias ?? 
    null;

  // Validation status label
  let validationStatusLabel = 'REFERENCE FIT (IN-SAMPLE)';
  if (isDemoFixture) {
    validationStatusLabel = 'SYNTHETIC BENCHMARK';
  } else if (validationResult?.status === 'INDEPENDENT_VALIDATION') {
    validationStatusLabel = 'INDEPENDENT (HOLDOUT)';
  }

  // Short status / reason message
  let statusMessage = '';
  if (isDemoFixture) {
    statusMessage = 'Synthetic benchmark reference from regional airborne LiDAR fixture. Demonstrates capability-gated validation contract.';
  } else if (validationResult?.is_independent) {
    statusMessage = 'Out-of-sample validation against independent spatial partition. Demonstrates regional generalization.';
  } else {
    statusMessage = `In-sample reference fit residuals measure regression convergence against ${referenceDataset} — not independent generalization.`;
  }

  // Error map availability
  const hasErrorMap = Boolean(
    errorMapArray || 
    validationResult?.error_map_raw_b64 || 
    result?.visualizations?.error_map || 
    calibrationResult?.residualsMap
  );

  const errorMin = validationResult?.error_min ?? (calibrationResult?.residualsMap ? -5.0 : null);
  const errorMax = validationResult?.error_max ?? (calibrationResult?.residualsMap ? 5.0 : null);
  const errorRange = (errorMin !== null && errorMax !== null) 
    ? `[${errorMin.toFixed(1)}m .. ${errorMax.toFixed(1)}m]` 
    : null;

  // Rejection reason
  const rejectionReason = 
    calibrationResult?.failureReason || 
    qaResult?.rejection_reason || 
    calibrationError || 
    'Vertical scale factor is non-positive or relief contradicts reference trend.';

  return (
    <div className="p-3 bg-dw-panel/85 border border-dw-border-strong rounded-xs space-y-3 font-mono">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle">
        <div className="flex items-center space-x-1.5 text-dw-text-muted">
          <FileCheck2 className="w-3.5 h-3.5 text-dw-accent" />
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
            VALIDATION
          </span>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center space-x-1.5">
          {scientificStatus === 'CALIBRATED' && (
            <>
              {isDemoFixture ? (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-semibold">
                  <Clock className="w-2.5 h-2.5" />
                  <span>DEMO FIXTURE</span>
                </span>
              ) : (
                <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs text-[9px] font-semibold ${
                  validationResult?.is_independent
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{validationResult?.is_independent ? 'INDEPENDENT' : 'CALIBRATED'}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => loadValidation(true)}
                disabled={isValidating}
                className="text-[9px] text-dw-accent hover:text-dw-text-primary p-0.5 rounded border border-dw-border-subtle hover:bg-dw-surface-hover transition-colors disabled:opacity-40"
                title="Run or refresh spatial holdout validation"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isValidating ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}

          {(scientificStatus === 'RELATIVE' || scientificStatus === 'CALIBRATION_UNAVAILABLE') && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>RELATIVE TERRAIN</span>
            </span>
          )}

          {scientificStatus === 'CALIBRATION_REJECTED' && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[9px] font-semibold">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>CALIBRATION REJECTED</span>
            </span>
          )}
        </div>
      </div>

      {validationError && (
        <div className="p-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xs text-[10px] leading-tight">
          {validationError}
        </div>
      )}

      {/* STATE 1: RELATIVE */}
      {scientificStatus === 'RELATIVE' && (
        <div className="space-y-2">
          <div className="p-2.5 bg-dw-base/50 border border-dw-border-subtle rounded-xs space-y-1">
            <div className="text-[11px] font-mono text-sky-400 font-semibold flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Metric validation unavailable — no external elevation reference.</span>
            </div>
            <p className="text-[10px] text-dw-text-secondary leading-relaxed font-sans pt-0.5">
              Reported terrain values are relative, unitless estimates without a physical vertical datum. Numerical validation and metric error metrics are withheld without an authoritative reference.
            </p>
          </div>
          <dl className="divide-y divide-dw-border-subtle/50 text-[11px] font-mono">
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">REFERENCE SOURCE</dt>
              <dd className="text-dw-text-secondary">None (Unreferenced optical)</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">METRIC ACCURACY</dt>
              <dd className="text-dw-text-muted italic">Withheld (Uncalibrated)</dd>
            </div>
          </dl>
        </div>
      )}

      {/* STATE 2: CALIBRATED */}
      {scientificStatus === 'CALIBRATED' && (
        <div className="space-y-2.5">
          {/* Explicit Cached / Demo Validation Marker */}
          {isDemoFixture && (
            <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xs flex items-center justify-between text-[10px] font-mono text-amber-300">
              <span className="flex items-center space-x-1 font-semibold">
                <Clock className="w-3 h-3" />
                <span>CACHED / DEMO VALIDATION</span>
              </span>
              <span className="text-[9px] text-amber-400/80">SYNTHETIC BENCHMARK</span>
            </div>
          )}

          {/* Reference Provenance Details */}
          <dl className="divide-y divide-dw-border-subtle/50 text-[11px] font-mono">
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">REFERENCE DATASET</dt>
              <dd className="text-dw-text-primary font-medium truncate max-w-[160px]" title={referenceDataset}>
                {referenceDataset}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">REFERENCE TYPE</dt>
              <dd className="text-dw-text-primary font-medium">{referenceType}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">COVERAGE / VALID CELLS</dt>
              <dd className="text-dw-text-primary tabular-nums">
                {coverageDisplay}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">VALIDATION STATUS</dt>
              <dd className={`font-semibold ${validationResult?.is_independent ? 'text-purple-400' : 'text-emerald-400'}`}>
                {validationStatusLabel}
              </dd>
            </div>
          </dl>

          {/* Key Metrics: Compact 3-Column Display */}
          <div className="grid grid-cols-3 gap-1.5 p-2 bg-dw-base/70 border border-dw-border-subtle rounded-xs text-center font-mono">
            <div className="space-y-0.5">
              <div className="text-[9px] text-dw-text-muted uppercase tracking-wider">RMSE</div>
              <div className="text-xs font-semibold text-dw-text-primary tabular-nums">
                {rmse !== null ? `±${rmse.toFixed(2)}m` : 'N/A'}
              </div>
            </div>
            <div className="space-y-0.5 border-x border-dw-border-subtle/60 px-1">
              <div className="text-[9px] text-dw-text-muted uppercase tracking-wider">MAE</div>
              <div className="text-xs font-semibold text-dw-text-primary tabular-nums">
                {mae !== null ? `±${mae.toFixed(2)}m` : 'N/A'}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[9px] text-dw-text-muted uppercase tracking-wider">CORRELATION</div>
              <div className="text-xs font-semibold text-emerald-400 tabular-nums">
                {correlation !== null ? correlation.toFixed(3) : 'N/A'}
              </div>
            </div>
          </div>

          {bias !== null && (
            <div className="flex justify-between text-[10px] font-mono text-dw-text-muted px-1">
              <span>SYSTEMATIC BIAS</span>
              <span className="text-dw-text-primary tabular-nums">
                {bias >= 0 ? `+${bias.toFixed(2)}m` : `${bias.toFixed(2)}m`}
              </span>
            </div>
          )}

          {/* Additional Holdout Details if Present */}
          {validationResult?.spatial_split && validationResult?.holdout_metrics && (
            <div className="p-1.5 bg-purple-950/20 border border-purple-800/40 rounded-xs flex justify-between items-center text-[10px] font-mono text-purple-300">
              <span className="truncate max-w-[140px]">HOLDOUT: {validationResult.spatial_split.holdout_description || 'Spatial block'}</span>
              <span className="font-semibold tabular-nums">RMSE: {validationResult.holdout_metrics.rmse.toFixed(2)}m</span>
            </div>
          )}

          {/* Short Status / Reason Message */}
          <p className="text-[10px] text-dw-text-secondary leading-tight font-sans">
            {statusMessage}
          </p>

          {/* Access to Existing Error Map Visualization */}
          {hasErrorMap && (
            <div className="pt-2 border-t border-dw-border-subtle/60 flex items-center justify-between">
              <div className="text-[10px] font-mono text-dw-text-muted">
                <span>ERROR LAYER</span>
                {errorRange && <span className="ml-1 text-[9px] text-dw-text-disabled">{errorRange}</span>}
              </div>
              <button
                type="button"
                onClick={() => setActiveLayer(activeLayer === 'error' ? 'elevation' : 'error')}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-xs text-[10px] font-mono font-medium transition-all active:scale-[0.98] ${
                  activeLayer === 'error'
                    ? 'bg-dw-accent text-white shadow-xs font-semibold'
                    : 'bg-dw-surface hover:bg-dw-surface-hover text-dw-text-secondary hover:text-dw-text-primary border border-dw-border-subtle'
                }`}
                title={activeLayer === 'error' ? "Switch back to standard elevation view" : "Display signed error map on 3D terrain"}
              >
                <Eye className="w-3 h-3" />
                <span>{activeLayer === 'error' ? 'Viewing Error Map' : 'View Error Map'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* STATE 3: CALIBRATION_REJECTED */}
      {scientificStatus === 'CALIBRATION_REJECTED' && (
        <div className="space-y-2">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Calibration rejected</span>
            </div>
            <div className="p-1.5 bg-black/30 rounded-xs border border-rose-500/20 text-[10px] font-mono text-rose-300 leading-tight">
              <span className="text-rose-400/80 uppercase mr-1">Reason:</span>
              {rejectionReason}
            </div>
            <p className="text-[10px] text-dw-text-secondary font-sans leading-relaxed pt-0.5">
              Metric DSM is strictly withheld. Relative terrain visualization remains available for morphological inspection.
            </p>
          </div>
          <dl className="divide-y divide-dw-border-subtle/50 text-[11px] font-mono">
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">VALIDATION STATUS</dt>
              <dd className="text-rose-400 font-semibold">REJECTED BY GUARDRAILS</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">METRIC ELEVATION</dt>
              <dd className="text-dw-text-muted italic">Disabled (Uncalibrated)</dd>
            </div>
          </dl>
        </div>
      )}

      {/* STATE 4: CALIBRATION_UNAVAILABLE */}
      {scientificStatus === 'CALIBRATION_UNAVAILABLE' && (
        <div className="space-y-2">
          <div className="p-2.5 bg-dw-base/50 border border-dw-border-subtle rounded-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono font-semibold text-zinc-300">
              <Info className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>Metric validation unavailable</span>
            </div>
            <p className="text-[10px] text-dw-text-secondary leading-relaxed font-sans">
              Metric validation cannot currently be performed because the required reference elevation is unavailable.
            </p>
            <p className="text-[10px] text-dw-text-muted leading-tight font-sans">
              Input imagery lacks embedded georeferencing (CRS/affine transform) or external reference DEM tiles are unconfigured. Surface is displayed in unitless relative height.
            </p>
          </div>
          <dl className="divide-y divide-dw-border-subtle/50 text-[11px] font-mono">
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">REFERENCE SOURCE</dt>
              <dd className="text-dw-text-muted italic">None available</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-dw-text-muted">TERRAIN MODE</dt>
              <dd className="text-amber-400 font-medium">Relative heightfield</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};
