import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { motion } from 'motion/react';
import { 
  X, 
  Loader2, 
  AlertTriangle, 
  FileCheck2, 
  Info
} from 'lucide-react';
import { 
  loadGamusReference, 
  comparePredictionToReference, 
  drawRasterToCanvas,
  ReferenceComparisonResult 
} from '../../services/referenceComparisonService';

export const ReferenceComparisonModal: React.FC = () => {
  const { 
    isComparisonModalOpen, 
    setIsComparisonModalOpen, 
    depthResult, 
    imageInput
  } = useWorkspace();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ReferenceComparisonResult | null>(null);

  const predCanvasRef = useRef<HTMLCanvasElement>(null);
  const refCanvasRef = useRef<HTMLCanvasElement>(null);
  const errCanvasRef = useRef<HTMLCanvasElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isComparisonModalOpen) {
        setIsComparisonModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComparisonModalOpen, setIsComparisonModalOpen]);

  // Compute comparison when modal opens
  useEffect(() => {
    if (!isComparisonModalOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const executeComparison = async () => {
      try {
        if (!depthResult || !depthResult.rawDepth) {
          throw new Error('No prediction array available. Please run depth estimation on DC_01_25 first.');
        }

        // Fetch paired GAMUS reference raster
        const refObj = await loadGamusReference('/samples/DC_01_25_AGL.npy');

        if (!isMounted) return;

        // Perform rigorous tile comparison
        const comp = comparePredictionToReference(
          depthResult.rawDepth,
          depthResult.width,
          depthResult.height,
          refObj.data,
          refObj.width,
          refObj.height,
          imageInput?.metadata?.filename || 'DC_01_25'
        );

        if (!isMounted) return;
        setComparisonResult(comp);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Reference comparison failed');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    executeComparison();

    return () => {
      isMounted = false;
    };
  }, [isComparisonModalOpen, depthResult, imageInput]);

  // Draw rasters to canvases when comparison completes
  useEffect(() => {
    if (!comparisonResult) return;

    // Small timeout to allow canvas elements to mount
    const timer = setTimeout(() => {
      if (predCanvasRef.current) {
        drawRasterToCanvas(
          predCanvasRef.current,
          comparisonResult.prediction,
          comparisonResult.width,
          comparisonResult.height,
          'elevation'
        );
      }
      if (refCanvasRef.current) {
        drawRasterToCanvas(
          refCanvasRef.current,
          comparisonResult.reference,
          comparisonResult.width,
          comparisonResult.height,
          'elevation'
        );
      }
      if (errCanvasRef.current) {
        drawRasterToCanvas(
          errCanvasRef.current,
          comparisonResult.error,
          comparisonResult.width,
          comparisonResult.height,
          'error'
        );
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [comparisonResult]);

  if (!isComparisonModalOpen) return null;

  const metrics = comparisonResult?.metrics;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ref-comparison-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-4xl bg-dw-surface border border-dw-border-strong rounded-xs shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="h-12 px-5 border-b border-dw-border-subtle bg-dw-panel/80 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 bg-dw-surface border border-dw-border-strong rounded-xs flex items-center justify-center text-dw-accent">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="ref-comparison-title" className="text-xs font-mono font-bold tracking-wider text-dw-text-primary uppercase">
                  REFERENCE COMPARISON
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  GAMUS · DC_01_25
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsComparisonModalOpen(false)}
            className="p-1 text-dw-text-muted hover:text-dw-text-primary rounded-xs hover:bg-dw-surface transition-colors focus-visible:ring-2 focus-visible:ring-dw-accent"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs font-mono overflow-y-auto max-h-[82vh]">
          {/* Loading State */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-dw-accent animate-spin" />
              <div className="text-sm font-semibold text-dw-text-primary">
                Loading Paired GAMUS AGL Reference...
              </div>
              <div className="text-[11px] text-dw-text-muted">
                Aligning 1024×1024 prediction against reference raster and computing tile residuals...
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-4 bg-rose-950/20 border border-rose-800/60 rounded-xs space-y-2">
              <div className="flex items-center space-x-2 text-rose-400 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span className="uppercase tracking-wider">COMPARISON FAILED</span>
              </div>
              <p className="text-xs text-rose-300 font-medium">
                {error}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="px-3 py-1.5 bg-dw-surface hover:bg-dw-panel border border-dw-border-subtle text-dw-text-secondary text-xs rounded-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Comparison Content */}
          {!isLoading && comparisonResult && metrics && (
            <div className="space-y-5">
              {/* Raster Previews: Prediction vs Reference vs Error Map */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. DepthWizard Prediction */}
                <div className="p-3 bg-dw-panel/70 border border-dw-border-subtle rounded-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-dw-border-subtle pb-1">
                    <span className="text-[10px] font-semibold text-dw-text-primary uppercase tracking-wider">
                      DepthWizard Prediction
                    </span>
                    <span className="text-[9px] text-dw-accent">1024 × 1024</span>
                  </div>
                  <div className="relative aspect-square bg-dw-base rounded-xs overflow-hidden border border-dw-border-subtle/80 flex items-center justify-center">
                    <canvas 
                      ref={predCanvasRef} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid grid-cols-3 text-[10px] text-dw-text-muted pt-0.5">
                    <div>MIN: <span className="text-dw-text-primary">{metrics.predMin.toFixed(1)}m</span></div>
                    <div className="text-center">MEAN: <span className="text-dw-text-primary">{metrics.predMean.toFixed(1)}m</span></div>
                    <div className="text-right">MAX: <span className="text-dw-text-primary">{metrics.predMax.toFixed(1)}m</span></div>
                  </div>
                </div>

                {/* 2. GAMUS AGL Reference */}
                <div className="p-3 bg-dw-panel/70 border border-dw-border-subtle rounded-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-dw-border-subtle pb-1">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      GAMUS AGL Reference
                    </span>
                    <span className="text-[9px] text-emerald-400">1024 × 1024</span>
                  </div>
                  <div className="relative aspect-square bg-dw-base rounded-xs overflow-hidden border border-dw-border-subtle/80 flex items-center justify-center">
                    <canvas 
                      ref={refCanvasRef} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid grid-cols-3 text-[10px] text-dw-text-muted pt-0.5">
                    <div>MIN: <span className="text-emerald-300">{metrics.refMin.toFixed(1)}m</span></div>
                    <div className="text-center">MEAN: <span className="text-emerald-300">{metrics.refMean.toFixed(1)}m</span></div>
                    <div className="text-right">MAX: <span className="text-emerald-300">{metrics.refMax.toFixed(1)}m</span></div>
                  </div>
                </div>

                {/* 3. Error Map */}
                <div className="p-3 bg-dw-panel/70 border border-dw-border-subtle rounded-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-dw-border-subtle pb-1">
                    <span className="text-[10px] font-semibold text-dw-accent uppercase tracking-wider">
                      Error Map
                    </span>
                    <span className="text-[9px] text-dw-text-muted">pred - ref</span>
                  </div>
                  <div className="relative aspect-square bg-dw-base rounded-xs overflow-hidden border border-dw-border-subtle/80 flex items-center justify-center">
                    <canvas 
                      ref={errCanvasRef} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid grid-cols-3 text-[10px] text-dw-text-muted pt-0.5">
                    <div>MIN: <span className="text-sky-400">{metrics.errorMin.toFixed(1)}m</span></div>
                    <div className="text-center">MEAN: <span className="text-dw-text-primary">{metrics.errorMean.toFixed(1)}m</span></div>
                    <div className="text-right">MAX: <span className="text-rose-400">{metrics.errorMax.toFixed(1)}m</span></div>
                  </div>
                </div>
              </div>

              {/* Tile-Specific Metrics Dashboard */}
              <div className="p-4 bg-dw-panel border border-dw-border-strong rounded-xs space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle">
                  <div className="text-[11px] font-bold text-dw-text-primary uppercase tracking-wider">
                    TILE-SPECIFIC COMPARISON METRICS
                  </div>
                  <div className="text-[10px] text-dw-text-muted">
                    {metrics.validCount.toLocaleString()} / {metrics.totalPixels.toLocaleString()} valid cells (100.0%)
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* MAE */}
                  <div className="p-3 bg-dw-base/70 border border-dw-border-subtle rounded-xs space-y-1">
                    <div className="text-[10px] text-dw-text-muted uppercase">MEAN ABSOLUTE ERROR</div>
                    <div className="text-2xl font-bold tracking-tight text-dw-text-primary">
                      {metrics.mae.toFixed(2)} <span className="text-xs font-normal text-dw-text-secondary">m</span>
                    </div>
                    <div className="text-[10px] text-dw-text-muted font-sans">mean(|pred - ref|)</div>
                  </div>

                  {/* RMSE */}
                  <div className="p-3 bg-dw-base/70 border border-dw-border-subtle rounded-xs space-y-1">
                    <div className="text-[10px] text-dw-text-muted uppercase">ROOT MEAN SQ ERROR</div>
                    <div className="text-2xl font-bold tracking-tight text-dw-text-primary">
                      {metrics.rmse.toFixed(2)} <span className="text-xs font-normal text-dw-text-secondary">m</span>
                    </div>
                    <div className="text-[10px] text-dw-text-muted font-sans">sqrt(mean(error²))</div>
                  </div>

                  {/* Pearson Correlation */}
                  <div className="p-3 bg-dw-base/70 border border-dw-border-subtle rounded-xs space-y-1">
                    <div className="text-[10px] text-dw-text-muted uppercase">PEARSON CORRELATION</div>
                    <div className="text-2xl font-bold tracking-tight text-emerald-400">
                      {metrics.pearson.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-dw-text-muted font-sans">Linear correlation r</div>
                  </div>

                  {/* Spearman Correlation */}
                  <div className="p-3 bg-dw-base/70 border border-dw-border-subtle rounded-xs space-y-1">
                    <div className="text-[10px] text-dw-text-muted uppercase">SPEARMAN RANK CORR</div>
                    <div className="text-2xl font-bold tracking-tight text-emerald-400">
                      {metrics.spearman.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-dw-text-muted font-sans">Monotonic rank ρ</div>
                  </div>
                </div>
              </div>

              {/* Scientific Distinction Notice */}
              <div className="p-3 bg-dw-base/80 border border-dw-border-subtle rounded-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 text-dw-accent text-[11px] font-semibold">
                  <Info className="w-3.5 h-3.5 text-dw-accent shrink-0" />
                  <span className="uppercase tracking-wider">SCIENTIFIC INTEGRITY NOTICE</span>
                </div>
                <p className="text-[11px] text-dw-text-secondary leading-relaxed font-sans">
                  This comparison is a <strong>single-tile demonstration</strong> evaluating the model prediction on the 
                  paired 1024×1024 GAMUS reference tile (<span className="font-mono text-dw-text-primary">DC_01_25</span>). 
                  These values are calculated freshly for this tile and must <strong>not</strong> be confused with the 
                  project&apos;s aggregate benchmark evaluation on the held-out test split (which reports MAE 3.15 m, RMSE 5.02 m, 
                  Pearson 0.868, Spearman 0.840).
                </p>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex justify-end space-x-3 pt-2 border-t border-dw-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="px-4 py-2 bg-dw-accent hover:bg-dw-accent-hover text-white text-xs font-semibold rounded-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
