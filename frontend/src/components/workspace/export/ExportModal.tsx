/**
 * DepthWizard — Geospatial Export & Terrain Analysis Report Modal
 * Phase 5B: Geospatial Export + Terrain Analysis Report
 * Authority: docs/product/output-contract.md & Phase 5B Specification
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../../state/WorkspaceContext';
import { motion } from 'motion/react';
import {
  FileText,
  Download,
  FileCode,
  Table,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export const ExportModal: React.FC = () => {
  const {
    isExportModalOpen,
    setIsExportModalOpen,
    scientificStatus,
    imageInput,
    result,
    calibrationResult,
    validationResult,
    errorMapArray,
    exportSessionJson,
    exportTerrainRasterFile,
    exportAnalysisDataFile,
    exportTerrainReportFile
  } = useWorkspace();

  const [activeExporting, setActiveExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExportModalOpen) {
        setIsExportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportModalOpen, setIsExportModalOpen]);

  if (!isExportModalOpen) return null;

  const isCalibrated = scientificStatus === 'CALIBRATED';
  const isRejected = scientificStatus === 'CALIBRATION_REJECTED';
  const hasErrorMap = Boolean(validationResult?.error_map_raw_b64 || errorMapArray);

  const sceneName = (imageInput?.metadata?.filename ?? result.source.filename ?? 'terrain').replace(/\.[^/.]+$/, "");
  const activeCrs = imageInput?.metadata?.spatial?.crs ?? result.geospatial.crs ?? 'Unprojected';

  const handleExportAction = async (actionId: string, actionFn: () => Promise<void>, successMsg: string) => {
    try {
      setActiveExporting(actionId);
      setExportError(null);
      setExportSuccess(null);
      await actionFn();
      setExportSuccess(successMsg);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err: any) {
      setExportError(err.message || 'Export failed');
    } finally {
      setActiveExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="bg-dw-surface border border-dw-border-strong rounded-xs shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-dw-text-primary"
      >
        {/* Header */}
        <div className="p-4 border-b border-dw-border-subtle bg-dw-panel flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-dw-elevated border border-dw-border-strong flex items-center justify-center rounded-xs text-dw-accent">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wider font-mono uppercase text-dw-text-primary">
                GEOSPATIAL EXPORT & REPORT
              </h2>
              <div className="text-xs font-mono text-dw-text-muted flex items-center space-x-2">
                <span>SCENE: {sceneName}</span>
                <span>•</span>
                <span>{result.source.dimensions.width}×{result.source.dimensions.height}</span>
                <span>•</span>
                <span>CRS: {activeCrs}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Scientific Status Badge */}
            <div className={`px-2.5 py-1 rounded-xs border text-[11px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 ${
              isCalibrated
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                : isRejected
                ? 'bg-red-500/10 border-red-500/40 text-red-500'
                : 'bg-sky-500/10 border-sky-500/40 text-sky-500'
            }`}>
              {isCalibrated ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : isRejected ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span>{scientificStatus}</span>
            </div>

            <button
              onClick={() => setIsExportModalOpen(false)}
              className="text-dw-text-muted hover:text-dw-text-primary p-1 transition-colors"
              title="Close [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {exportError && (
          <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/30 text-red-500 text-xs font-mono flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {exportSuccess && (
          <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-500 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 space-y-5 overflow-y-auto font-mono text-xs">
          {/* Section 1: Terrain Analysis Report */}
          <div className="border border-dw-border-subtle rounded-xs bg-dw-panel p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-dw-text-primary font-semibold tracking-wider uppercase text-[11px]">
                <FileText className="w-4 h-4 text-dw-accent" />
                <span>1. Publication Terrain Analysis Report</span>
              </div>
              <span className="text-[10px] text-dw-text-muted font-normal">10 Required Sections</span>
            </div>

            <p className="text-dw-text-secondary text-[11px] leading-relaxed">
              Standardized report incorporating model provenance, elevation statistics, reference fit, independent holdouts, signed error distribution, and operational disclaimers.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleExportAction('report_html', () => exportTerrainReportFile('html'), 'HTML report downloaded successfully')}
                disabled={activeExporting !== null}
                className="py-2 px-3 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong rounded-xs text-dw-text-primary font-semibold transition-all duration-fast flex items-center justify-center space-x-2 hover:border-dw-accent active:scale-[0.98] disabled:opacity-50"
              >
                {activeExporting === 'report_html' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-dw-accent" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-dw-accent" />
                )}
                <span>HTML REPORT</span>
              </button>

              <button
                onClick={() => handleExportAction('report_pdf', () => exportTerrainReportFile('pdf'), 'PDF report downloaded successfully')}
                disabled={activeExporting !== null}
                className="py-2 px-3 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong rounded-xs text-dw-text-primary font-semibold transition-all duration-fast flex items-center justify-center space-x-2 hover:border-dw-accent active:scale-[0.98] disabled:opacity-50"
              >
                {activeExporting === 'report_pdf' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-dw-accent" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-dw-accent" />
                )}
                <span>PDF REPORT</span>
              </button>
            </div>
          </div>

          {/* Section 2: Geospatial Raster Export */}
          <div className="border border-dw-border-subtle rounded-xs bg-dw-panel p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-dw-text-primary font-semibold tracking-wider uppercase text-[11px]">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>2. Geospatial Raster Export</span>
              </div>
              <span className="text-[10px] text-dw-text-muted font-normal">GeoTIFF 32-Bit Float</span>
            </div>

            <div className="space-y-2 pt-1">
              {/* Metric GeoTIFF DSM */}
              <div className="flex items-center justify-between p-2.5 bg-dw-elevated border border-dw-border-subtle rounded-xs">
                <div>
                  <div className="font-semibold text-dw-text-primary flex items-center space-x-2">
                    <span>GeoTIFF Metric DSM</span>
                    {!isCalibrated && (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded-xs">
                        GATED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-dw-text-muted">
                    {isCalibrated 
                      ? 'Calibrated elevation surface with authoritative vertical datum (meters).'
                      : isRejected
                      ? `Withheld: Calibration rejected (${calibrationResult?.failureReason || 'guardrails'}).`
                      : 'Withheld: Only calibrated terrains may be exported as metric DSMs.'}
                  </div>
                </div>

                <button
                  onClick={() => handleExportAction('geotiff', () => exportTerrainRasterFile('geotiff'), 'Calibrated GeoTIFF DSM exported')}
                  disabled={!isCalibrated || activeExporting !== null}
                  className={`px-3 py-1.5 rounded-xs font-semibold shrink-0 transition-all ${
                    isCalibrated
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 active:scale-[0.98]'
                      : 'opacity-40 cursor-not-allowed bg-dw-panel border border-dw-border-subtle text-dw-text-disabled'
                  }`}
                  title={isCalibrated ? 'Download Calibrated GeoTIFF' : 'Metric export withheld for non-calibrated terrain'}
                >
                  {activeExporting === 'geotiff' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'EXPORT DSM'
                  )}
                </button>
              </div>

              {/* Relative Heightfield TIFF */}
              <div className="flex items-center justify-between p-2.5 bg-dw-elevated border border-dw-border-subtle rounded-xs">
                <div>
                  <div className="font-semibold text-dw-text-primary">
                    Relative Heightfield (TIFF)
                  </div>
                  <div className="text-[11px] text-dw-text-muted">
                    Unprojected 32-bit floating point relative surface for 3D modeling and rendering.
                  </div>
                </div>

                <button
                  onClick={() => handleExportAction('relative_geotiff', () => exportTerrainRasterFile('relative_geotiff'), 'Relative heightfield raster exported')}
                  disabled={activeExporting !== null}
                  className="px-3 py-1.5 bg-dw-panel hover:bg-dw-base border border-dw-border-strong text-dw-text-primary rounded-xs font-semibold shrink-0 transition-all hover:border-dw-accent active:scale-[0.98]"
                >
                  {activeExporting === 'relative_geotiff' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-dw-accent" />
                  ) : (
                    'EXPORT TIFF'
                  )}
                </button>
              </div>

              {/* Signed Error GeoTIFF */}
              <div className="flex items-center justify-between p-2.5 bg-dw-elevated border border-dw-border-subtle rounded-xs">
                <div>
                  <div className="font-semibold text-dw-text-primary flex items-center space-x-2">
                    <span>Signed Height-Error Map (GeoTIFF)</span>
                    {!isCalibrated && (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded-xs">
                        GATED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-dw-text-muted">
                    Signed residual grid (E_pred − E_ref) with color mapping convention.
                  </div>
                </div>

                <button
                  onClick={() => handleExportAction('error_geotiff', () => exportTerrainRasterFile('error_geotiff'), 'Signed error GeoTIFF exported')}
                  disabled={!isCalibrated || !hasErrorMap || activeExporting !== null}
                  className={`px-3 py-1.5 rounded-xs font-semibold shrink-0 transition-all ${
                    isCalibrated && hasErrorMap
                      ? 'bg-dw-panel hover:bg-dw-base border border-dw-border-strong text-dw-text-primary active:scale-[0.98]'
                      : 'opacity-40 cursor-not-allowed bg-dw-panel border border-dw-border-subtle text-dw-text-disabled'
                  }`}
                  title={isCalibrated && hasErrorMap ? 'Export Signed Error Map' : 'Requires calibrated DEM comparison'}
                >
                  {activeExporting === 'error_geotiff' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'EXPORT ERROR'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Machine-Readable Analysis & GIS Vectors */}
          <div className="border border-dw-border-subtle rounded-xs bg-dw-panel p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-dw-text-primary font-semibold tracking-wider uppercase text-[11px]">
                <Table className="w-4 h-4 text-sky-500" />
                <span>3. Machine-Readable Analysis & Vectors</span>
              </div>
              <span className="text-[10px] text-dw-text-muted font-normal">JSON / GeoJSON / CSV</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleExportAction('session_json', exportSessionJson, 'Session JSON exported')}
                disabled={activeExporting !== null}
                className="py-2 px-2.5 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong rounded-xs font-semibold text-center hover:border-dw-accent transition-all active:scale-[0.98]"
              >
                {activeExporting === 'session_json' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-dw-accent" />
                ) : (
                  <>
                    <div className="text-dw-text-primary">SESSION JSON</div>
                    <div className="text-[10px] text-dw-text-muted mt-0.5">Full Provenance</div>
                  </>
                )}
              </button>

              <button
                onClick={() => handleExportAction('geojson', () => exportAnalysisDataFile('geojson'), 'GeoJSON measurements exported')}
                disabled={activeExporting !== null}
                className="py-2 px-2.5 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong rounded-xs font-semibold text-center hover:border-dw-accent transition-all active:scale-[0.98]"
              >
                {activeExporting === 'geojson' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-dw-accent" />
                ) : (
                  <>
                    <div className="text-dw-text-primary">GEOJSON</div>
                    <div className="text-[10px] text-dw-text-muted mt-0.5">Probes & Profiles</div>
                  </>
                )}
              </button>

              <button
                onClick={() => handleExportAction('csv', () => exportAnalysisDataFile('csv', 'cross_section'), 'Profile CSV exported')}
                disabled={activeExporting !== null}
                className="py-2 px-2.5 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong rounded-xs font-semibold text-center hover:border-dw-accent transition-all active:scale-[0.98]"
              >
                {activeExporting === 'csv' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-dw-accent" />
                ) : (
                  <>
                    <div className="text-dw-text-primary">PROFILE CSV</div>
                    <div className="text-[10px] text-dw-text-muted mt-0.5">1D Elevation Samples</div>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 4: Scientific Disclaimers Notice */}
          <div className="p-3 bg-dw-panel/60 border border-dw-border-subtle rounded-xs space-y-1 text-[11px] text-dw-text-secondary">
            <div className="flex items-center space-x-1.5 font-semibold text-dw-text-primary uppercase text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Scientific Integrity & Operational Notice</span>
            </div>
            <div>
              {isCalibrated ? (
                'In-sample calibration residuals measure optimization convergence — NOT independent generalization. For mission-critical decisions, verify against independent ground truth.'
              ) : isRejected ? (
                'Scene failed scientific calibration guardrails. Metric elevation, distance, and slope outputs are withheld. Relative topography is preserved for visual inspection only.'
              ) : (
                'Terrain output is in relative model units without physical vertical datum. Slopes and elevations cannot be used for engineering or navigational safety.'
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-dw-border-subtle bg-dw-panel flex justify-between items-center text-xs font-mono text-dw-text-muted">
          <span>DepthWizard v0.1.0 • Geospatial Export Engine</span>
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="px-4 py-1.5 bg-dw-elevated hover:bg-dw-base border border-dw-border-strong rounded-xs text-dw-text-primary font-semibold transition-colors"
          >
            CLOSE
          </button>
        </div>
      </motion.div>
    </div>
  );
};
