import React from 'react';
import { useWorkspace, CameraPreset } from '../../state/WorkspaceContext';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Box, 
  Map, 
  Footprints, 
  Crosshair, 
  Ruler, 
  Activity, 
  SplitSquareVertical, 
  FileCheck2,
  RotateCw,
  X,
  UploadCloud,
  Eye,
  TrendingUp,
  Filter,
  Download,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const ToolNavigation: React.FC = () => {
  const { 
    result, 
    viewMode, 
    setViewMode, 
    cameraPreset,
    setCameraPreset,
    autoRotate,
    setAutoRotate,
    activeTool, 
    setActiveTool, 
    cancelActiveTool,
    imageInput,
    setInputModalOpen,
    validationResult,
    setIsExportModalOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed
  } = useWorkspace();

  const capabilities = result.capabilities;

  const primaryAnalysisTools = [
    { id: 'height-probe', label: 'Height Probe', icon: Crosshair, available: capabilities.point_measurement },
    { id: 'two-point', label: 'Two-Point Measure', icon: Ruler, available: capabilities.point_measurement },
    { id: 'slope', label: 'Slope Analysis', icon: Activity, available: capabilities.slope },
    { id: 'cross-section', label: 'Cross-section', icon: SplitSquareVertical, available: capabilities.cross_section },
  ];

  const validationTools = [
    { id: 'validation', label: 'Validation', icon: FileCheck2, available: true },
  ];

  const advancedTools = [
    { id: 'line-of-sight', label: 'Visibility', icon: Eye, available: capabilities.point_measurement },
    { id: 'route-profile', label: 'Route Profile', icon: TrendingUp, available: capabilities.cross_section },
    { id: 'terrain-screening', label: 'Terrain Screening', icon: Filter, available: capabilities.slope },
  ];

  const validationBadge = (() => {
    if (!validationResult || validationResult.status === 'VALIDATION_NOT_AVAILABLE') {
      return {
        text: 'NOT_AVAILABLE',
        className: 'bg-dw-panel text-dw-text-disabled border border-dw-border-subtle/50'
      };
    }
    if (validationResult.status === 'INDEPENDENT_VALIDATION') {
      return {
        text: 'INDEPENDENT',
        className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      };
    }
    return {
      text: 'REFERENCE_FIT',
      className: 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
    };
  })();

  const crsDisplay = result.geospatial.crs ? result.geospatial.crs.split(' ')[0] : 'UNPROJECTED';

  return (
    <aside 
      className={`${
        isSidebarCollapsed ? 'w-14' : 'w-60'
      } border-r border-dw-border-subtle bg-dw-surface flex flex-col justify-between select-none z-10 transition-all duration-200 ease-dw overflow-hidden shrink-0`}
      aria-label="Tool Navigation"
    >
      {/* Sidebar Header with Collapse Toggle */}
      <div className={`h-10 px-3 border-b border-dw-border-subtle flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} shrink-0`}>
        {!isSidebarCollapsed && (
          <span className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted font-semibold truncate">
            NAVIGATION
          </span>
        )}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="p-1 rounded-xs text-dw-text-muted hover:text-dw-text-primary hover:bg-dw-panel transition-colors focus-visible:outline-none"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isSidebarCollapsed}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-dw-accent" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-dw-text-secondary" />
          )}
        </button>
      </div>

      <div className={`${isSidebarCollapsed ? 'p-1.5 space-y-3' : 'p-3.5 space-y-5'} overflow-y-auto flex-1 min-h-0`}>
        {/* Active Tool Notification / Cancellation */}
        <AnimatePresence>
          {activeTool !== 'none' && (
            <motion.div 
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden"
            >
              {isSidebarCollapsed ? (
                <div 
                  className="py-2 flex flex-col items-center justify-center bg-dw-panel border-l-2 border-dw-accent rounded-xs shadow-xs space-y-1 mb-1" 
                  title={`Active tool: ${activeTool.replace(/-/g, ' ')} (Click to cancel)`}
                >
                  <span className="text-[9px] font-mono uppercase text-dw-accent font-bold">TOOL</span>
                  <button 
                    onClick={cancelActiveTool}
                    className="text-dw-text-muted hover:text-red-400 p-0.5 transition-colors"
                    title="Cancel active tool (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="py-2.5 px-3 bg-dw-panel border-l-2 border-dw-accent rounded-xs space-y-1 mb-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-dw-accent font-semibold tracking-wider">
                      ACTIVE TOOL
                    </span>
                    <button 
                      onClick={cancelActiveTool}
                      className="text-dw-text-muted hover:text-dw-text-primary p-0.5 transition-colors duration-fast active:scale-[0.90]"
                      title="Cancel tool (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-mono font-medium text-dw-text-primary uppercase">
                    {activeTool.replace(/-/g, ' ')}
                  </div>
                  <div className="text-[11px] text-dw-text-muted font-mono">
                    Press [Esc] to cancel
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 0. Input Imagery Foundation */}
        <div className="space-y-1.5">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted px-2.5 py-1 font-semibold">
              INPUT
            </div>
          )}

          {imageInput?.status === 'ready' && imageInput.metadata ? (
            isSidebarCollapsed ? (
              <button
                onClick={() => setInputModalOpen(true)}
                className="w-full flex items-center justify-center p-1.5 bg-dw-panel hover:bg-dw-elevated border border-dw-border-strong rounded-xs transition-colors"
                title={`Input image: ${imageInput.metadata.filename} (${imageInput.metadata.width}x${imageInput.metadata.height})`}
              >
                {imageInput.previewUrl ? (
                  <div className="w-7 h-7 rounded-xs overflow-hidden border border-dw-border-subtle bg-dw-base">
                    <img 
                      src={imageInput.previewUrl} 
                      alt="Source thumbnail" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ) : (
                  <UploadCloud className="w-4 h-4 text-dw-accent" />
                )}
              </button>
            ) : (
              <button
                onClick={() => setInputModalOpen(true)}
                className="w-full text-left p-2 bg-dw-panel hover:bg-dw-elevated border border-dw-border-strong rounded-xs space-y-1.5 transition-all duration-fast group focus-visible:outline-none"
                title="Inspect or replace ingested input image"
              >
                <div className="flex items-center space-x-2">
                  {imageInput.previewUrl ? (
                    <div className="w-9 h-9 rounded-xs overflow-hidden border border-dw-border-subtle shrink-0 bg-dw-base">
                      <img 
                        src={imageInput.previewUrl} 
                        alt="Source thumbnail" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xs bg-dw-surface border border-dw-border-subtle flex items-center justify-center text-dw-accent shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                  )}
                  <div className="overflow-hidden flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold text-dw-text-primary truncate" title={imageInput.metadata.filename}>
                      {imageInput.metadata.filename}
                    </div>
                    <div className="text-[10px] font-mono text-dw-accent uppercase">
                      {imageInput.metadata.format} • {imageInput.metadata.width}×{imageInput.metadata.height}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-dw-text-secondary flex justify-between border-t border-dw-border-subtle/60 pt-1">
                  <span>STATUS: READY</span>
                  <span className="text-dw-accent group-hover:underline">INSPECT →</span>
                </div>
              </button>
            )
          ) : (
            isSidebarCollapsed ? (
              <button
                onClick={() => setInputModalOpen(true)}
                className="w-full flex items-center justify-center py-2.5 rounded-xs border border-dashed border-dw-border-strong hover:border-dw-accent/70 bg-dw-panel/40 hover:bg-dw-panel/70 text-dw-accent transition-colors"
                title="Ingest Real Image (JPG, PNG, GeoTIFF)"
              >
                <UploadCloud className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setInputModalOpen(true)}
                className="w-full flex items-center space-x-2.5 px-2.5 py-2.5 rounded-xs border border-dashed border-dw-border-strong hover:border-dw-accent/70 bg-dw-panel/40 hover:bg-dw-panel/70 text-xs font-medium text-dw-text-secondary hover:text-dw-text-primary transition-all duration-fast active:scale-[0.98] focus-visible:outline-none"
                title="Ingest real JPG, PNG, or GeoTIFF capture"
              >
                <UploadCloud className="w-4 h-4 text-dw-accent shrink-0" />
                <div className="text-left overflow-hidden">
                  <div className="font-semibold text-dw-text-primary">Ingest Real Image</div>
                  <div className="text-[10px] text-dw-text-muted">JPG, PNG, GeoTIFF</div>
                </div>
              </button>
            )
          )}
        </div>

        {/* 1. View Modes */}
        <div className="space-y-1.5">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted px-2.5 py-1 font-semibold">
              VIEW
            </div>
          )}
          <div className="space-y-1">
            {/* 3D Orbit Mode */}
            <button
              onClick={() => setViewMode('3d')}
              title="3D Orbit Mode"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'space-x-2.5 px-2.5 py-2'} rounded-xs text-xs font-medium transition-all duration-fast ease-dw active:scale-[0.98] ${
                viewMode === '3d'
                  ? 'bg-dw-elevated text-dw-accent font-semibold border-l-2 border-dw-accent shadow-xs'
                  : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/60 border-l-2 border-transparent'
              }`}
            >
              <Box className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>3D Orbit</span>}
            </button>

            {/* Secondary 3D Orbit Controls (Only shown when expanded and in 3D Orbit mode) */}
            {viewMode === '3d' && !isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="pl-4 pr-1 pt-1.5 pb-2 space-y-2 border-l border-dw-border-subtle ml-3.5 my-1"
              >
                {/* Auto Rotate Toggle */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-dw-text-muted px-0.5">
                    AUTO ROTATE
                  </div>
                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xs text-[11px] font-mono transition-all duration-fast ${
                      autoRotate 
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 shadow-xs' 
                        : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/70 border border-dw-border-subtle/50'
                    }`}
                    title="Showcase slow rotation (manual interaction pauses rotation)"
                  >
                    <div className="flex items-center space-x-1.5">
                      <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                      <span>Rotation</span>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-1 rounded-xs ${autoRotate ? 'bg-sky-500/20 text-sky-300' : 'text-dw-text-muted'}`}>
                      {autoRotate ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Camera Presets Grid */}
                <div className="space-y-1 pt-0.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-dw-text-muted px-0.5">
                    CAMERA PRESETS
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                    {(['TOP', 'NORTH', 'SOUTH', 'EAST', 'WEST', 'FREE'] as CameraPreset[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCameraPreset(p)}
                        className={`py-1 px-1 rounded-xs text-center transition-all ${
                          cameraPreset === p
                            ? 'bg-dw-accent text-white font-semibold shadow-xs'
                            : 'bg-dw-panel/60 text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel border border-dw-border-subtle/30'
                        }`}
                      >
                        {p === 'NORTH' ? 'N' : p === 'SOUTH' ? 'S' : p === 'EAST' ? 'E' : p === 'WEST' ? 'W' : p}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Topographic Mode */}
            <button
              onClick={() => setViewMode('topographic')}
              title="Topographic View"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'space-x-2.5 px-2.5 py-2'} rounded-xs text-xs font-medium transition-all duration-fast ease-dw active:scale-[0.98] ${
                viewMode === 'topographic'
                  ? 'bg-dw-elevated text-dw-accent font-semibold border-l-2 border-dw-accent shadow-xs'
                  : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/60 border-l-2 border-transparent'
              }`}
            >
              <Map className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Topographic</span>}
            </button>

            {/* First Person Mode */}
            <button
              onClick={() => capabilities.first_person && setViewMode('first-person')}
              disabled={!capabilities.first_person}
              title={capabilities.first_person ? 'Ground inspection walk camera' : 'First-person mode unavailable for this dataset'}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2.5 py-2'} rounded-xs text-xs font-medium transition-all duration-fast ease-dw ${
                !capabilities.first_person
                  ? 'opacity-35 cursor-not-allowed text-dw-text-disabled border-l-2 border-transparent'
                  : viewMode === 'first-person'
                  ? 'bg-dw-elevated text-dw-accent font-semibold border-l-2 border-dw-accent active:scale-[0.98] shadow-xs'
                  : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/60 active:scale-[0.98] border-l-2 border-transparent'
              }`}
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}>
                <Footprints className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>First Person</span>}
              </div>
              {!isSidebarCollapsed && !capabilities.first_person && (
                <span className="text-[10px] font-mono text-dw-text-disabled">N/A</span>
              )}
            </button>

          </div>
        </div>

        {/* 3. Analyse Tools */}
        <div className="space-y-1.5">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted px-2.5 py-1 font-semibold">
              ANALYSE
            </div>
          )}
          <div className="space-y-1">
            {primaryAnalysisTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => tool.available && setActiveTool(tool.id as any)}
                  disabled={!tool.available}
                  title={tool.label}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2.5 py-2'} rounded-xs text-xs font-medium transition-all duration-fast ease-dw ${
                    !tool.available
                      ? 'opacity-35 cursor-not-allowed text-dw-text-disabled border-l-2 border-transparent'
                      : isActive
                      ? 'bg-dw-elevated text-dw-accent font-semibold border-l-2 border-dw-accent active:scale-[0.98] shadow-xs'
                      : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/60 active:scale-[0.98] border-l-2 border-transparent'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>{tool.label}</span>}
                  </div>
                  {!isSidebarCollapsed && !tool.available && (
                    <span className="text-[10px] font-mono text-dw-text-disabled">N/A</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Validate */}
        <div className="space-y-1.5">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted px-2.5 py-1 font-semibold">
              VALIDATE
            </div>
          )}
          <div className="space-y-1">
            {validationTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => tool.available && setActiveTool(tool.id as any)}
                  disabled={!tool.available}
                  title={tool.label}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2.5 py-2'} rounded-xs text-xs font-medium transition-all duration-fast ease-dw ${
                    !tool.available
                      ? 'opacity-35 cursor-not-allowed text-dw-text-disabled border-l-2 border-transparent'
                      : isActive
                      ? 'bg-dw-elevated text-dw-accent font-semibold border-l-2 border-dw-accent active:scale-[0.98] shadow-xs'
                      : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/60 active:scale-[0.98] border-l-2 border-transparent'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>{tool.label}</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs font-semibold ${validationBadge.className}`}>
                      {validationBadge.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Advanced Analysis */}
        <div className="space-y-1.5">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted px-2.5 py-1 font-semibold">
              ADVANCED
            </div>
          )}
          <div className="space-y-1">
            {advancedTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => tool.available && setActiveTool(tool.id as any)}
                  disabled={!tool.available}
                  title={tool.label}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2.5 py-2'} rounded-xs text-xs font-medium transition-all duration-fast ease-dw ${
                    !tool.available
                      ? 'opacity-35 cursor-not-allowed text-dw-text-disabled border-l-2 border-transparent'
                      : isActive
                      ? 'bg-dw-elevated text-dw-accent font-semibold border-l-2 border-dw-accent active:scale-[0.98] shadow-xs'
                      : 'text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel/60 active:scale-[0.98] border-l-2 border-transparent'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isSidebarCollapsed && <span>{tool.label}</span>}
                  </div>
                  {!isSidebarCollapsed && !tool.available && (
                    <span className="text-[10px] font-mono text-dw-text-disabled">N/A</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Output */}
        <div className="space-y-1.5 pt-1">
          {!isSidebarCollapsed && (
            <div className="text-[11px] font-mono uppercase tracking-wider text-dw-text-muted px-2.5 py-1 font-semibold">
              OUTPUT
            </div>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2.5 py-2.5'} bg-dw-panel hover:bg-dw-elevated border border-dw-border-strong hover:border-dw-accent/60 rounded-xs text-xs font-semibold text-dw-accent transition-all duration-fast ease-dw active:scale-[0.98] shadow-xs group focus-visible:outline-none`}
            title="Open Geospatial Export and Terrain Analysis Report dialog"
          >
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}>
              <Download className="w-4 h-4 text-dw-accent shrink-0 group-hover:scale-105 transition-transform" />
              {!isSidebarCollapsed && <span className="tracking-wide">Export & Report</span>}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-mono bg-dw-accent/15 text-dw-accent border border-dw-accent/30 px-1.5 py-0.5 rounded-xs font-medium">
                EXPORT →
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Technical Status */}
      <div className={`border-t border-dw-border-subtle text-xs font-mono text-dw-text-muted ${isSidebarCollapsed ? 'p-2 flex flex-col items-center space-y-1' : 'p-3.5 space-y-1.5'}`}>
        {isSidebarCollapsed ? (
          <div 
            className="flex flex-col items-center text-[10px] cursor-help"
            title={`CRS: ${result.geospatial.crs || 'UNPROJECTED'} | MODE: ${result.elevation.mode.toUpperCase()}`}
          >
            <span className={`w-2 h-2 rounded-full ${result.elevation.mode === 'absolute' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-dw-text-muted">CRS:</span>
              <span className="text-dw-text-primary truncate max-w-[130px] font-medium" title={result.geospatial.crs || 'UNPROJECTED'}>
                {crsDisplay}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-dw-text-muted">MODE:</span>
              <span className={`uppercase font-semibold text-[11px] ${result.elevation.mode === 'absolute' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {result.elevation.mode}
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
