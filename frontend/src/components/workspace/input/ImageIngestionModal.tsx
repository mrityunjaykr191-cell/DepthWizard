import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../../state/WorkspaceContext';
import { ingestImageFile } from '../../../services/imageIngestion';
import { motion } from 'motion/react';
import { 
  UploadCloud, 
  FileImage, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Trash2, 
  MapPin, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Cpu,
  FlaskConical
} from 'lucide-react';

// ── Built-in sample definitions ────────────────────────────────────────────────
interface SampleDef {
  /** Browser path (served from frontend/public) */
  url: string;
  filename: string;
  label: string;
  sublabel: string;
}
const SAMPLES: SampleDef[] = [
  {
    url: '/samples/DC_01_25.tif',
    filename: 'DC_01_25.tif',
    label: 'GAMUS · DC_01_25',
    sublabel: 'Training RGB · 1024 × 1024',
  },
  {
    url: '/samples/SV_Berlin_52.5082_13.4359_RGB.tif',
    filename: 'SV_Berlin_52.5082_13.4359_RGB.tif',
    label: 'Berlin · Demo Scene',
    sublabel: 'Demo imagery',
  },
];

export const ImageIngestionModal: React.FC = () => {
  const { 
    imageInput, 
    setImageInput, 
    clearImageInput, 
    isInputModalOpen, 
    setInputModalOpen,
    depthResult,
    isEstimatingDepth,
    depthError,
    estimateDepth,
    selectedModelProvider,
    setSelectedModelProvider
  } = useWorkspace();

  const [activePreviewTab, setActivePreviewTab] = useState<'rgb' | 'depth' | 'side-by-side'>('rgb');

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSampleLoad = async (sample: SampleDef) => {
    if (loadingSample) return; // prevent duplicate clicks
    setLoadingSample(sample.filename);
    try {
      const res = await fetch(sample.url);
      if (!res.ok) throw new Error(`Failed to fetch sample: HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], sample.filename, { type: 'image/tiff' });
      await handleFile(file);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DepthWizard] Sample load error:', err);
    } finally {
      setLoadingSample(null);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInputModalOpen) {
        setInputModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInputModalOpen, setInputModalOpen]);

  if (!isInputModalOpen) return null;

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStage('Validating file header...');

    try {
      // Simulate quick stage transition for user transparency
      setTimeout(() => {
        setProcessingStage(
          file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff')
            ? 'Inspecting GeoTIFF tags & spatial reference...'
            : 'Decoding image raster & dimensions...'
        );
      }, 150);

      const result = await ingestImageFile(file);
      setImageInput(result);
    } catch {
      // Handled internally by ingestImageFile
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    clearImageInput();
  };

  const metadata = imageInput?.metadata;
  const isReady = imageInput?.status === 'ready' && metadata;
  const isError = imageInput?.status === 'error' && imageInput.error;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingestion-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-3xl bg-dw-surface border border-dw-border-strong rounded-xs shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Hidden Accessible File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="image-upload-input"
          accept=".jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff"
          onChange={onFileInputChange}
          className="sr-only"
          tabIndex={-1}
        />

        {/* Modal Header */}
        <div className="h-12 px-5 border-b border-dw-border-subtle bg-dw-panel/80 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 bg-dw-surface border border-dw-border-strong rounded-xs flex items-center justify-center text-dw-accent">
              <UploadCloud className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 id="ingestion-modal-title" className="text-xs font-mono font-bold tracking-wider text-dw-text-primary uppercase">
                IMAGE INPUT & INGESTION
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setInputModalOpen(false)}
              className="p-1 text-dw-text-muted hover:text-dw-text-primary rounded-xs hover:bg-dw-surface transition-colors focus-visible:ring-2 focus-visible:ring-dw-accent"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs font-mono">
          {/* Live Status Announcement for Screen Readers */}
          <div className="sr-only" role="status" aria-live="polite">
            {isProcessing && `Processing image: ${processingStage}`}
            {isReady && `Image ${metadata.filename} successfully loaded and validated.`}
            {isError && `Image loading failed: ${imageInput.error?.message}`}
          </div>

          {/* 1. Processing State */}
          {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="w-8 h-8 text-dw-accent animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-dw-text-primary">
                  Ingesting Optical Imagery...
                </div>
                <div className="text-xs text-dw-text-secondary font-mono">
                  {processingStage}
                </div>
              </div>
              <div className="text-[11px] text-dw-text-muted">
                Extracting pixel array, color channels, and embedded spatial tags.
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {!isProcessing && isError && (
            <div className="space-y-4">
              <div className="p-4 bg-red-950/20 border border-red-800/60 rounded-xs space-y-2.5">
                <div className="flex items-center space-x-2 text-red-400 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="uppercase tracking-wider">
                    INGESTION FAILED [{imageInput.error?.code}]
                  </span>
                </div>
                <div className="text-xs text-dw-text-primary font-medium">
                  {imageInput.error?.message}
                </div>
                {imageInput.error?.details && (
                  <div className="text-[11px] text-dw-text-secondary bg-dw-base/50 p-2 rounded-xs border border-dw-border-subtle">
                    {imageInput.error.details}
                  </div>
                )}
                {imageInput.error?.diagnosticAdvice && (
                  <div className="text-[11px] text-dw-accent">
                    Diagnostic advice: {imageInput.error.diagnosticAdvice}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleReset}
                  className="px-3.5 py-1.5 border border-dw-border-strong bg-dw-surface hover:bg-dw-panel text-dw-text-secondary hover:text-dw-text-primary rounded-xs transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={triggerFilePicker}
                  className="px-4 py-1.5 bg-dw-accent hover:bg-dw-accent-hover text-white font-semibold rounded-xs transition-all flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Ready State (Successful Ingestion) */}
          {!isProcessing && isReady && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* Image / Depth Preview Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-dw-text-muted font-semibold pb-1 border-b border-dw-border-subtle">
                    <div className="flex items-center space-x-2">
                      <span className="uppercase tracking-wider">VIEWPORT PREVIEW</span>
                      {depthResult && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xs font-mono">
                          DEPTH READY
                        </span>
                      )}
                    </div>
                    {/* View Switcher when depth is available */}
                    {depthResult ? (
                      <div className="flex items-center space-x-1 font-mono text-[10px]">
                        <button
                          onClick={() => setActivePreviewTab('rgb')}
                          className={`px-1.5 py-0.5 rounded-xs transition-colors ${
                            activePreviewTab === 'rgb' 
                              ? 'bg-dw-elevated text-dw-accent font-semibold' 
                              : 'text-dw-text-muted hover:text-dw-text-primary'
                          }`}
                        >
                          RGB
                        </button>
                        <span className="text-dw-text-disabled">|</span>
                        <button
                          onClick={() => setActivePreviewTab('depth')}
                          className={`px-1.5 py-0.5 rounded-xs transition-colors ${
                            activePreviewTab === 'depth' 
                              ? 'bg-dw-elevated text-dw-accent font-semibold' 
                              : 'text-dw-text-muted hover:text-dw-text-primary'
                          }`}
                        >
                          DEPTH
                        </button>
                        <span className="text-dw-text-disabled">|</span>
                        <button
                          onClick={() => setActivePreviewTab('side-by-side')}
                          className={`px-1.5 py-0.5 rounded-xs transition-colors ${
                            activePreviewTab === 'side-by-side' 
                              ? 'bg-dw-elevated text-dw-accent font-semibold' 
                              : 'text-dw-text-muted hover:text-dw-text-primary'
                          }`}
                        >
                          SPLIT
                        </button>
                      </div>
                    ) : (
                      <span className="text-dw-text-disabled">RGB OPTICAL</span>
                    )}
                  </div>

                  <div className="relative w-full aspect-4/3 bg-dw-panel border border-dw-border-strong rounded-xs overflow-hidden flex items-center justify-center group">
                    {/* Side by side preview */}
                    {depthResult && activePreviewTab === 'side-by-side' ? (
                      <div className="w-full h-full grid grid-cols-2 divide-x divide-dw-border-subtle">
                        <div className="relative h-full flex items-center justify-center bg-dw-base/40">
                          {imageInput.previewUrl && (
                            <img
                              src={imageInput.previewUrl}
                              alt="Optical RGB"
                              className="w-full h-full object-contain"
                            />
                          )}
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-dw-base/80 text-[9px] font-mono text-dw-text-secondary border border-dw-border-subtle rounded-xs">
                            OPTICAL RGB
                          </span>
                        </div>
                        <div className="relative h-full flex items-center justify-center bg-dw-base/40">
                          <img
                            src={depthResult.previewDataUrl}
                            alt="Relative Depth Map"
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-dw-base/80 text-[9px] font-mono text-dw-accent border border-dw-border-subtle rounded-xs">
                            VIRIDIS DEPTH
                          </span>
                        </div>
                      </div>
                    ) : depthResult && activePreviewTab === 'depth' ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={depthResult.previewDataUrl}
                          alt="Viridis relative depth preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-dw-base/80 backdrop-blur-xs border border-dw-border-subtle rounded-xs text-[10px] text-dw-accent font-mono">
                          RELATIVE DEPTH (VIRIDIS)
                        </div>
                      </div>
                    ) : imageInput.previewUrl ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={imageInput.previewUrl}
                          alt={`Optical source preview for ${metadata.filename}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-dw-base/80 backdrop-blur-xs border border-dw-border-subtle rounded-xs text-[10px] text-dw-text-secondary font-mono">
                          OPTICAL SOURCE
                        </div>
                      </div>
                    ) : (
                      <div className="text-dw-text-muted">No preview available</div>
                    )}

                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-dw-base/80 backdrop-blur-xs border border-dw-border-subtle rounded-xs text-[10px] text-dw-text-secondary font-mono">
                      {metadata.width} × {metadata.height} px
                    </div>

                    {depthResult && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-dw-base/80 backdrop-blur-xs border border-dw-border-subtle rounded-xs text-[10px] text-emerald-400 font-mono">
                        {depthResult.provenance.inferenceTimeMs} ms
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Metadata Table */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-dw-text-muted font-semibold pb-1 border-b border-dw-border-subtle uppercase tracking-wider">
                      INGESTION SPECIFICATIONS
                    </div>

                    <dl className="divide-y divide-dw-border-subtle text-xs font-mono">
                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">FILENAME</dt>
                        <dd className="text-dw-text-primary font-medium truncate max-w-[180px]" title={metadata.filename}>
                          {metadata.filename}
                        </dd>
                      </div>

                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">FORMAT</dt>
                        <dd className="text-dw-text-primary uppercase font-semibold text-dw-accent">
                          {metadata.format}
                        </dd>
                      </div>

                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">DIMENSIONS</dt>
                        <dd className="text-dw-text-primary tabular-nums">
                          {metadata.width} × {metadata.height}
                        </dd>
                      </div>

                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">CHANNELS</dt>
                        <dd className="text-dw-text-primary">
                          {metadata.channelDescription}
                        </dd>
                      </div>

                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">BIT DEPTH</dt>
                        <dd className="text-dw-text-primary tabular-nums">
                          {metadata.bitDepth}-bit per sample
                        </dd>
                      </div>

                      <div className="flex justify-between py-1.5">
                        <dt className="text-dw-text-muted">FILE SIZE</dt>
                        <dd className="text-dw-text-primary tabular-nums">
                          {metadata.fileSizeBytesFormatted}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Geospatial Reference Inspection Box */}
                  <div className="p-3 bg-dw-panel border border-dw-border-subtle rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-dw-text-muted uppercase tracking-wider font-semibold">
                        GEOSPATIAL REFERENCE
                      </div>
                      {metadata.spatial.hasGeoreference ? (
                        <span className="inline-flex items-center text-[10px] text-emerald-500 font-medium space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>GEOREFERENCED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-amber-500 font-medium space-x-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>NON-GEOREFERENCED</span>
                        </span>
                      )}
                    </div>

                    {metadata.spatial.hasGeoreference ? (
                      <dl className="text-[11px] space-y-1 divide-y divide-dw-border-subtle/50">
                        <div className="flex justify-between pt-1">
                          <dt className="text-dw-text-muted">CRS</dt>
                          <dd className="text-dw-text-primary truncate max-w-[190px]" title={metadata.spatial.crs || 'Detected'}>
                            {metadata.spatial.crs || `EPSG:${metadata.spatial.epsgCode}`}
                          </dd>
                        </div>
                        {metadata.spatial.pixelResolution && (
                          <div className="flex justify-between pt-1">
                            <dt className="text-dw-text-muted">PIXEL RESOLUTION</dt>
                            <dd className="text-dw-text-primary tabular-nums">
                              {metadata.spatial.pixelResolution.x.toFixed(3)} m/px
                            </dd>
                          </div>
                        )}
                        {metadata.spatial.bounds && (
                          <div className="flex justify-between pt-1">
                            <dt className="text-dw-text-muted">SPATIAL EXTENT</dt>
                            <dd className="text-dw-text-primary tabular-nums text-[10px]">
                              [{Math.round(metadata.spatial.bounds.minX)}, {Math.round(metadata.spatial.bounds.minY)}] .. [{Math.round(metadata.spatial.bounds.maxX)}, {Math.round(metadata.spatial.bounds.maxY)}]
                            </dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-[11px] text-dw-text-muted leading-relaxed">
                        Source lacks embedded geospatial tags. Coordinates are unprojected pixel space; elevation is relative.
                      </p>
                    )}
                  </div>

                  {/* Model Provider Selection */}
                  <div className="p-3 bg-dw-panel border border-dw-border-subtle rounded-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-dw-text-muted uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                        <Cpu className="w-3 h-3 text-dw-accent" />
                        <span>ESTIMATION MODEL</span>
                      </div>
                      <span className="text-[10px] text-dw-accent font-semibold">{selectedModelProvider === 'da2_zero_shot' ? 'ZERO-SHOT' : 'FINE-TUNED'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedModelProvider('da2_zero_shot')}
                        disabled={isEstimatingDepth}
                        className={`p-2 rounded-xs border text-left transition-all ${
                          selectedModelProvider === 'da2_zero_shot'
                            ? 'bg-dw-elevated border-dw-accent text-dw-accent font-semibold shadow-xs'
                            : 'bg-dw-base/60 hover:bg-dw-base border-dw-border-subtle text-dw-text-secondary'
                        }`}
                      >
                        <div className="text-xs font-mono">DA2 Zero-Shot</div>
                        <div className="text-[10px] text-dw-text-muted mt-0.5 font-sans leading-tight">
                          Continuous terrain surface
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedModelProvider('da2_fine_tuned')}
                        disabled={isEstimatingDepth}
                        className={`p-2 rounded-xs border text-left transition-all ${
                          selectedModelProvider === 'da2_fine_tuned'
                            ? 'bg-dw-elevated border-amber-500 text-amber-400 font-semibold shadow-xs'
                            : 'bg-dw-base/60 hover:bg-dw-base border-dw-border-subtle text-dw-text-secondary'
                        }`}
                      >
                        <div className="text-xs font-mono">DA2 Fine-Tuned</div>
                        <div className="text-[10px] text-dw-text-muted mt-0.5 font-sans leading-tight">
                          GAMUS AGL structure height
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Phase 2B: Depth Estimation Telemetry & Scientific Notice */}
                  {depthResult && (
                    <div className="p-3 bg-dw-panel border border-dw-accent/40 rounded-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-dw-accent uppercase tracking-wider font-semibold flex items-center space-x-1.5">
                          <Cpu className="w-3 h-3" />
                          <span>DEPTH MODEL PROVENANCE</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {depthResult.provenance.device.toUpperCase()}
                        </span>
                      </div>

                      <dl className="text-[11px] font-mono space-y-1 divide-y divide-dw-border-subtle/50">
                        <div className="flex justify-between pt-1">
                          <dt className="text-dw-text-muted">MODEL</dt>
                          <dd className="text-dw-text-primary font-medium truncate max-w-[190px]" title={depthResult.provenance.modelVariant}>
                            {depthResult.provenance.modelVariant || 'Depth Anything V2 Small'}
                          </dd>
                        </div>
                        <div className="flex justify-between pt-1">
                          <dt className="text-dw-text-muted">PROVIDER SLOT</dt>
                          <dd className="text-dw-text-primary">
                            {depthResult.provenance.provider}
                          </dd>
                        </div>
                        <div className="flex justify-between pt-1">
                          <dt className="text-dw-text-muted">LATENCY</dt>
                          <dd className="text-dw-text-primary tabular-nums">
                            {depthResult.provenance.inferenceTimeMs} ms
                          </dd>
                        </div>
                        <div className="flex justify-between pt-1">
                          <dt className="text-dw-text-muted">RELATIVE RANGE</dt>
                          <dd className="text-dw-text-primary tabular-nums">
                            [{depthResult.depthMin.toFixed(2)} .. {depthResult.depthMax.toFixed(2)}]
                          </dd>
                        </div>
                      </dl>

                      <div className="pt-1 text-[10px] text-amber-400/90 leading-tight border-t border-dw-border-subtle/40">
                        ⚠ UNCALIBRATED RELATIVE DEPTH: Unitless inverse depth. Requires geospatial calibration for metric elevations.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Banner if Depth Estimation Failed */}
              {depthError && (
                <div className="p-3 bg-red-950/30 border border-red-800/60 rounded-xs flex items-center justify-between text-xs text-red-300">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{depthError}</span>
                  </div>
                  <button
                    onClick={() => estimateDepth()}
                    className="px-2.5 py-1 bg-red-900/50 hover:bg-red-800/60 border border-red-700 text-red-200 text-xs rounded-xs transition-colors shrink-0 ml-3"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Ready State Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-dw-border-subtle">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 border border-red-900/40 hover:border-red-700 bg-dw-surface hover:bg-red-950/20 text-red-400 text-xs rounded-xs transition-all flex items-center space-x-1.5"
                    title="Remove this image and reset input"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Image</span>
                  </button>
                  <button
                    onClick={triggerFilePicker}
                    className="px-3 py-1.5 border border-dw-border-strong hover:bg-dw-panel text-dw-text-secondary hover:text-dw-text-primary text-xs rounded-xs transition-all flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace File</span>
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Phase 2B Estimate Depth Action Button */}
                  <button
                    onClick={async () => {
                      await estimateDepth();
                      setActivePreviewTab('depth');
                    }}
                    disabled={isEstimatingDepth}
                    className={`px-4 py-2 border rounded-xs font-mono text-xs transition-all flex items-center space-x-2 ${
                      isEstimatingDepth
                        ? 'bg-dw-panel border-dw-border-subtle text-dw-text-muted cursor-wait'
                        : depthResult
                        ? 'bg-dw-panel hover:bg-dw-elevated border-dw-accent/60 text-dw-text-primary'
                        : 'bg-dw-elevated hover:bg-dw-accent/20 border-dw-accent text-dw-accent font-semibold shadow-xs'
                    }`}
                    title="Execute Depth Anything V2 inference on backend"
                  >
                    {isEstimatingDepth ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-dw-accent" />
                        <span>Estimating Depth (DA2)...</span>
                      </>
                    ) : depthResult ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-dw-accent" />
                        <span>Re-estimate Depth</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5 text-dw-accent" />
                        <span>ESTIMATE DEPTH (DA2)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={async () => {
                      if (!depthResult) {
                        await estimateDepth();
                      }
                      setInputModalOpen(false);
                    }}
                    disabled={isEstimatingDepth}
                    className={`px-5 py-2 font-semibold rounded-xs transition-all flex items-center space-x-2 shadow-sm active:scale-[0.98] ${
                      isEstimatingDepth
                        ? 'bg-dw-panel border border-dw-border-subtle text-dw-text-muted cursor-wait'
                        : 'bg-dw-accent hover:bg-dw-accent-hover text-white'
                    }`}
                    title={depthResult ? "Open workspace with model surface" : "Estimate depth and open workspace with model surface"}
                  >
                    {isEstimatingDepth ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-dw-accent" />
                        <span>Estimating & Opening...</span>
                      </>
                    ) : (
                      <>
                        <span>{depthResult ? 'Accept & View In Workspace' : 'Estimate & View In Workspace'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Empty State (Initial Dropzone) */}
          {!isProcessing && !isReady && !isError && (
            <div className="space-y-5">
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={triggerFilePicker}
                className={`py-12 px-6 border-2 border-dashed rounded-xs flex flex-col items-center justify-center space-y-3 cursor-pointer transition-all duration-fast ${
                  isDragOver
                    ? 'border-dw-accent bg-dw-accent/5 scale-[0.99]'
                    : 'border-dw-border-strong hover:border-dw-accent/70 bg-dw-panel/40 hover:bg-dw-panel/70'
                }`}
                tabIndex={0}
                role="button"
                aria-label="Upload optical raster image. Drag and drop file here, or press enter to browse files."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerFilePicker();
                  }
                }}
              >
                <div className="w-12 h-12 rounded-full bg-dw-surface border border-dw-border-strong flex items-center justify-center text-dw-accent shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="space-y-1 text-center">
                  <div className="text-sm font-semibold text-dw-text-primary">
                    Drop single-view overhead capture here
                  </div>
                  <div className="text-xs text-dw-text-secondary">
                    or click to browse local files
                  </div>
                </div>

                <div className="text-[11px] text-dw-text-muted text-center pt-2">
                  Supports JPG/JPEG, PNG, and GeoTIFF/TIFF up to 100 MB
                </div>
              </div>

              {/* ── TRY A SAMPLE ─────────────────────────────────────────── */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-dw-text-muted uppercase tracking-wider select-none">
                  <FlaskConical className="w-3 h-3 text-dw-accent" />
                  <span>TRY A SAMPLE</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLES.map((sample) => {
                    const isThis = loadingSample === sample.filename;
                    const isAny  = loadingSample !== null;
                    return (
                      <button
                        key={sample.filename}
                        type="button"
                        disabled={isAny}
                        onClick={() => handleSampleLoad(sample)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xs border text-left transition-all focus-visible:ring-2 focus-visible:ring-dw-accent ${
                          isAny
                            ? 'border-dw-border-subtle bg-dw-panel/40 cursor-wait opacity-70'
                            : 'border-dw-border-subtle bg-dw-panel/70 hover:border-dw-accent/60 hover:bg-dw-panel'
                        }`}
                        aria-label={`Load sample image: ${sample.label}`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-mono font-semibold text-dw-text-primary truncate">
                            {sample.label}
                          </div>
                          <div className="text-[11px] font-mono text-dw-text-muted">
                            {sample.sublabel}
                          </div>
                        </div>
                        <div className="shrink-0 ml-3">
                          {isThis ? (
                            <Loader2 className="w-3.5 h-3.5 text-dw-accent animate-spin" />
                          ) : (
                            <span className="text-[10px] font-mono font-semibold text-dw-accent border border-dw-accent/40 rounded-xs px-1.5 py-0.5 whitespace-nowrap">
                              Use Sample
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supported Format Specifications Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="p-3 bg-dw-panel/70 border border-dw-border-subtle rounded-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-dw-text-primary font-semibold">
                    <FileImage className="w-3.5 h-3.5 text-dw-accent" />
                    <span>JPEG / JPG</span>
                  </div>
                  <p className="text-[11px] text-dw-text-muted leading-relaxed font-sans">
                    Standard 24-bit RGB aerial or UAS photos. Uncalibrated relative elevation.
                  </p>
                </div>

                <div className="p-3 bg-dw-panel/70 border border-dw-border-subtle rounded-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-dw-text-primary font-semibold">
                    <Layers className="w-3.5 h-3.5 text-dw-accent" />
                    <span>PNG</span>
                  </div>
                  <p className="text-[11px] text-dw-text-muted leading-relaxed font-sans">
                    Lossless RGB or RGBA imagery. Uncalibrated relative elevation.
                  </p>
                </div>

                <div className="p-3 bg-dw-panel/70 border border-dw-border-subtle rounded-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-dw-text-primary font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-dw-accent" />
                    <span>GeoTIFF / TIFF</span>
                  </div>
                  <p className="text-[11px] text-dw-text-muted leading-relaxed font-sans">
                    Projected rasters with EPSG CRS and affine transform preservation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-2.5 bg-dw-panel border-t border-dw-border-subtle flex items-center justify-between text-[11px] font-mono text-dw-text-muted select-none">
          <span>DEPTH ANYTHING V2 TERRAIN ESTIMATION</span>
          <span>RELATIVE DEPTH • METRIC CALIBRATION REQUIRES GEODETIC REFERENCE</span>
        </div>
      </motion.div>
    </div>
  );
};
