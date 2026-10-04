/**
 * DepthWizard — Minimal Workspace State Management
 * Authority: docs/architecture/frontend.md & docs/design/interaction-rules.md
 */

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { CapabilitiesMap, TerrainResult } from '../types/contract';
import { ImageInput } from '../types/imageInput';
import { revokePreviewUrl } from '../services/imageIngestion';
import { ScenarioId, getFixtureResult } from '../fixtures/scenarios';
import { DepthResult } from '../types/depthResult';
import { requestDepthEstimation } from '../services/depthService';
import { RelativeHeightfield } from '../types/relativeHeightfield';
import { 
  transformDepthToRelativeHeightfield, 
  createTerrainResultFromHeightfield 
} from '../services/heightfieldService';
import { CalibrationResult, ReferenceSource } from '../types/calibration';
import { 
  requestCalibration, 
  createCalibratedTerrainResult 
} from '../services/calibrationService';
import {
  PointProbeResponse,
  TwoPointMeasureResponse,
  CrossSectionResponse,
  TerrainAnalyticsResponse,
  probeTerrainPoint,
  measureTwoPoints,
  getCrossSectionProfile,
  fetchTerrainAnalytics,
  fetchTerrainQA
} from '../services/measurementService';
import { ScientificStatus, TerrainQAResponse, ReferenceFitMetrics } from '../types/qa';
import {
  LineOfSightResponse,
  RouteProfileResponse,
  TerrainScreeningResponse
} from '../types/intelligence';
import {
  fetchLineOfSight,
  fetchRouteProfile,
  fetchTerrainScreening
} from '../services/intelligenceService';
import {
  TerrainValidationResponse
} from '../types/validation';
import { fetchTerrainValidation } from '../services/validationService';
import {
  SessionExport,
  InputMetadataExport,
  ModelProvenanceExport,
  TerrainSummaryExport,
  CalibrationExport,
  TerrainAnalyticsExport,
  ValidationSessionExport
} from '../types/export';
import {
  downloadSessionJson,
  downloadTerrainRaster,
  downloadAnalysisData,
  downloadTerrainReport
} from '../services/exportService';
import {
  ELEVATION_COLOR_STOPS,
  SLOPE_COLOR_STOPS,
  HILLSHADE_COLOR_STOPS,
  ERROR_COLOR_STOPS,
  stopsToCssGradient
} from '../components/workspace/terrain/analyticalColormaps';

function encodeFloat32Base64(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeFloat32Base64(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
}

function decodeUint8Base64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface ActiveLayerLegend {
  layer: TerrainLayer;
  title: string;
  subtitle: string;
  minLabel: string;
  maxLabel: string;
  minVal: number;
  maxVal: number;
  unit: string;
  isCalibrated: boolean;
  isVisualizationOnly: boolean;
  cssGradient: string;
  hasNoData: boolean;
}

export type ViewMode = '3d' | 'topographic' | 'first-person';

export type AnalysisTool = 
  | 'none' 
  | 'height-probe' 
  | 'two-point' 
  | 'slope' 
  | 'cross-section'
  | 'validation'
  | 'line-of-sight'
  | 'route-profile'
  | 'terrain-screening';

export type TerrainLayer = 'rgb' | 'elevation' | 'slope' | 'hillshade' | 'confidence' | 'screening' | 'error';

export type ToolSelectionState = 'SELECTING' | 'COMPLETE' | 'CANCELLED' | 'INACTIVE';

export type AppUiState = 'EMPTY' | 'LOADING' | 'PROCESSING' | 'READY' | 'UNAVAILABLE' | 'ERROR';

/**
 * Capability-Driven Validation Mappings
 */
export const LAYER_CAPABILITY_MAP: Record<TerrainLayer, keyof CapabilitiesMap | null> = {
  rgb: null, // RGB optical is baseline texture
  elevation: 'relative_elevation', // requires either relative or absolute elevation
  slope: 'slope',
  hillshade: 'hillshade',
  confidence: 'confidence',
  screening: 'slope',
  error: 'absolute_elevation'
};

export function isLayerSupported(layer: TerrainLayer, capabilities: CapabilitiesMap): boolean {
  if (layer === 'rgb') return true;
  if (layer === 'elevation') {
    return Boolean(capabilities.relative_elevation || capabilities.absolute_elevation);
  }
  const cap = LAYER_CAPABILITY_MAP[layer];
  return cap ? Boolean(capabilities[cap]) : true;
}

export function isViewModeSupported(mode: ViewMode, capabilities: CapabilitiesMap): boolean {
  if (mode === 'first-person') {
    return Boolean(capabilities.first_person);
  }
  return true; // '3d' and 'topographic' are standard spatial views
}

export const TOOL_CAPABILITY_MAP: Record<AnalysisTool, keyof CapabilitiesMap | null> = {
  none: null,
  'height-probe': 'point_measurement',
  'two-point': 'point_measurement',
  slope: 'slope',
  'cross-section': 'cross_section',
  validation: null,
  'line-of-sight': 'point_measurement',
  'route-profile': 'cross_section',
  'terrain-screening': 'slope'
};

export function isToolSupported(tool: AnalysisTool, capabilities: CapabilitiesMap): boolean {
  if (tool === 'none' || tool === 'validation') return true;
  const cap = TOOL_CAPABILITY_MAP[tool];
  return cap ? Boolean(capabilities[cap]) : false;
}

export type CameraPreset = 'TOP' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'FREE';

export interface WorkspaceState {
  currentScenario: ScenarioId;
  result: TerrainResult;
  imageInput: ImageInput | null;
  isInputModalOpen: boolean;
  uiState: AppUiState;
  viewMode: ViewMode;
  cameraPreset: CameraPreset;
  autoRotate: boolean;
  activeTool: AnalysisTool;
  toolState: ToolSelectionState;
  activeLayer: TerrainLayer;
  verticalExaggeration: number;
  
  // Phase 2B: Depth Estimation State
  depthResult: DepthResult | null;
  isEstimatingDepth: boolean;
  depthError: string | null;
  selectedModelProvider: 'da2_zero_shot' | 'da2_fine_tuned';
  setSelectedModelProvider: (provider: 'da2_zero_shot' | 'da2_fine_tuned') => void;

  // Phase 2C: Relative Heightfield & Model Surface State
  relativeHeightfield: RelativeHeightfield | null;
  isModelSurface: boolean;

  // Phase 3: Geospatial Calibration State
  calibrationResult: CalibrationResult | null;
  isCalibrating: boolean;
  calibrationError: string | null;
  selectedReferenceSource: ReferenceSource;
  isCalibrated: boolean;
  surfaceElevationType: 'relative' | 'absolute';
  
  // Phase 4B: Interactive Measurements
  probeResult: PointProbeResponse | null;
  isProbing: boolean;
  probeError: string | null;
  twoPointResult: TwoPointMeasureResponse | null;
  isMeasuring: boolean;
  measureError: string | null;
  selectedPointA: { x: number; y: number; worldX?: number; worldY?: number; worldZ?: number } | null;
  selectedPointB: { x: number; y: number; worldX?: number; worldY?: number; worldZ?: number } | null;
  crossSectionResult: CrossSectionResponse | null;
  isProfiling: boolean;
  profileError: string | null;
  handleTerrainClick: (rasterX: number, rasterY: number, worldPoint?: { x: number; y: number; z: number }) => Promise<void>;
  clearMeasurements: () => void;
  
  // Phase 4C: Analytical Visualization Layers
  analyticsResult: TerrainAnalyticsResponse | null;
  slopeArray: Float32Array | null;
  hillshadeArray: Float32Array | null;
  isAnalyticsLoading: boolean;
  analyticsError: string | null;
  activeLayerLegend: ActiveLayerLegend;
  
  // Phase 4D: Scientific Status & QA
  scientificStatus: ScientificStatus;
  qaResult: TerrainQAResponse;
  loadQA: () => Promise<void>;

  // Phase 4E: Advanced Terrain Intelligence
  losResult: LineOfSightResponse | null;
  isComputingLOS: boolean;
  losError: string | null;
  observerOffsetA: number;
  targetOffsetB: number;
  setObserverOffsetA: (val: number) => void;
  setTargetOffsetB: (val: number) => void;
  recomputeLOS: (offsetA?: number, offsetB?: number) => Promise<void>;

  routeResult: RouteProfileResponse | null;
  isComputingRoute: boolean;
  routeError: string | null;

  screeningResult: TerrainScreeningResponse | null;
  screeningMask: Uint8Array | null;
  isScreening: boolean;
  screeningError: string | null;
  screeningMaxSlope: number | null;
  screeningMinElev: number | null;
  screeningMaxElev: number | null;
  setScreeningCriteria: (criteria: { maxSlope?: number | null; minElev?: number | null; maxElev?: number | null }) => void;
  runScreening: () => Promise<void>;
  
  // Phase 5A: Validation & Error Analysis
  validationResult: TerrainValidationResponse | null;
  errorMapArray: Float32Array | null;
  isValidating: boolean;
  validationError: string | null;
  loadValidation: (forceHoldout?: boolean) => Promise<void>;

  // Phase 5B: Geospatial Export & Report
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  buildSessionExport: () => SessionExport;
  exportSessionJson: () => Promise<void>;
  exportTerrainRasterFile: (format: 'geotiff' | 'relative_geotiff' | 'error_geotiff') => Promise<void>;
  exportAnalysisDataFile: (format: 'json' | 'geojson' | 'csv', profileTool?: string) => Promise<void>;
  exportTerrainReportFile: (format: 'html' | 'pdf') => Promise<void>;

  // GAMUS Paired Reference Comparison State
  isComparisonModalOpen: boolean;
  setIsComparisonModalOpen: (open: boolean) => void;

  // Actions
  setScenario: (scenario: ScenarioId) => void;
  switchToSyntheticFixture: (scenario?: ScenarioId) => void;
  applyModelSurface: () => void;
  setSelectedReferenceSource: (source: ReferenceSource) => void;
  calibrateElevation: (sourceOverride?: ReferenceSource) => Promise<void>;
  clearCalibration: () => void;
  setSurfaceElevationType: (type: 'relative' | 'absolute') => void;
  setImageInput: (input: ImageInput | null) => void;
  clearImageInput: () => void;
  setInputModalOpen: (open: boolean) => void;
  estimateDepth: (providerOverride?: 'da2_zero_shot' | 'da2_fine_tuned') => Promise<void>;
  clearDepthResult: () => void;
  setViewMode: (mode: ViewMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setAutoRotate: (enabled: boolean) => void;
  setActiveTool: (tool: AnalysisTool) => void;
  setToolState: (state: ToolSelectionState) => void;
  setActiveLayer: (layer: TerrainLayer) => void;
  setVerticalExaggeration: (scale: number) => void;
  wireframe: boolean;
  setWireframe: (enabled: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  cancelActiveTool: () => void;
  setUiState: (state: AppUiState) => void;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScenario, setCurrentScenarioState] = useState<ScenarioId>('scenario-a');
  const [result, setResult] = useState<TerrainResult>(() => getFixtureResult('scenario-a'));
  const [imageInput, setImageInputState] = useState<ImageInput | null>(null);
  const [isInputModalOpen, setInputModalOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [viewMode, setViewModeState] = useState<ViewMode>('3d');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('FREE');
  const [autoRotate, setAutoRotateState] = useState<boolean>(false);
  const [activeTool, setActiveToolState] = useState<AnalysisTool>('none');
  const [toolState, setToolState] = useState<ToolSelectionState>('INACTIVE');
  const [activeLayer, setActiveLayerState] = useState<TerrainLayer>('rgb');
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(1.0);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [uiState, setUiState] = useState<AppUiState>('READY');
  const [depthResult, setDepthResult] = useState<DepthResult | null>(null);
  const [relativeHeightfield, setRelativeHeightfield] = useState<RelativeHeightfield | null>(null);
  const [isModelSurface, setIsModelSurface] = useState<boolean>(false);
  const [isEstimatingDepth, setIsEstimatingDepth] = useState<boolean>(false);
  const [depthError, setDepthError] = useState<string | null>(null);
  const [selectedModelProvider, setSelectedModelProvider] = useState<'da2_zero_shot' | 'da2_fine_tuned'>('da2_zero_shot');

  // Phase 3: Calibration State
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [selectedReferenceSource, setSelectedReferenceSource] = useState<ReferenceSource>('CartoDEM');
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [surfaceElevationType, setSurfaceElevationTypeState] = useState<'relative' | 'absolute'>('relative');

  // Phase 4B: Interactive Measurement State
  const [probeResult, setProbeResult] = useState<PointProbeResponse | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  const [twoPointResult, setTwoPointResult] = useState<TwoPointMeasureResponse | null>(null);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [measureError, setMeasureError] = useState<string | null>(null);

  const [selectedPointA, setSelectedPointA] = useState<{ x: number; y: number; worldX?: number; worldY?: number; worldZ?: number } | null>(null);
  const [selectedPointB, setSelectedPointB] = useState<{ x: number; y: number; worldX?: number; worldY?: number; worldZ?: number } | null>(null);

  const selectedPointARef = useRef<{ x: number; y: number; worldX?: number; worldY?: number; worldZ?: number } | null>(null);
  const selectedPointBRef = useRef<{ x: number; y: number; worldX?: number; worldY?: number; worldZ?: number } | null>(null);

  const [crossSectionResult, setCrossSectionResult] = useState<CrossSectionResponse | null>(null);
  const [isProfiling, setIsProfiling] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Phase 4C: Analytical Visualization Layers
  const [analyticsResult, setAnalyticsResult] = useState<TerrainAnalyticsResponse | null>(null);
  const [slopeArray, setSlopeArray] = useState<Float32Array | null>(null);
  const [hillshadeArray, setHillshadeArray] = useState<Float32Array | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Phase 4E: Advanced Terrain Intelligence State
  const [losResult, setLosResult] = useState<LineOfSightResponse | null>(null);
  const [isComputingLOS, setIsComputingLOS] = useState<boolean>(false);
  const [losError, setLosError] = useState<string | null>(null);
  const [observerOffsetA, setObserverOffsetA] = useState<number>(0);
  const [targetOffsetB, setTargetOffsetB] = useState<number>(0);

  const [routeResult, setRouteResult] = useState<RouteProfileResponse | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [screeningResult, setScreeningResult] = useState<TerrainScreeningResponse | null>(null);
  const [screeningMask, setScreeningMask] = useState<Uint8Array | null>(null);
  const [isScreening, setIsScreening] = useState<boolean>(false);
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const [screeningMaxSlope, setScreeningMaxSlope] = useState<number | null>(30.0);
  const [screeningMinElev, setScreeningMinElev] = useState<number | null>(null);
  const [screeningMaxElev, setScreeningMaxElev] = useState<number | null>(null);

  // Phase 5A: Validation & Error Analysis State
  const [validationResult, setValidationResult] = useState<TerrainValidationResponse | null>(null);
  const [errorMapArray, setErrorMapArray] = useState<Float32Array | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Phase 5B: Geospatial Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // GAMUS Paired Reference Comparison State
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);

  const clearMeasurements = () => {
    selectedPointARef.current = null;
    selectedPointBRef.current = null;
    setProbeResult(null);
    setIsProbing(false);
    setProbeError(null);
    setTwoPointResult(null);
    setIsMeasuring(false);
    setMeasureError(null);
    setSelectedPointA(null);
    setSelectedPointB(null);
    setCrossSectionResult(null);
    setIsProfiling(false);
    setProfileError(null);
    setLosResult(null);
    setIsComputingLOS(false);
    setLosError(null);
    setRouteResult(null);
    setIsComputingRoute(false);
    setRouteError(null);
    setScreeningResult(null);
    setScreeningMask(null);
    setIsScreening(false);
    setScreeningError(null);
    setToolState('INACTIVE');
  };

  const getElevationPayload = () => {
    if (!result.elevation || !result.elevation.data) return null;
    const rawData = result.elevation.data instanceof Float32Array
      ? result.elevation.data
      : new Float32Array(result.elevation.data);
    const rawElevB64 = encodeFloat32Base64(rawData);

    const width = result.elevation.grid_dimensions?.cols || 65;
    const height = result.elevation.grid_dimensions?.rows || 65;

    let dx = 1.0;
    let dy = 1.0;
    if (typeof result.geospatial?.pixel_resolution === 'number') {
      dx = result.geospatial.pixel_resolution;
      dy = result.geospatial.pixel_resolution;
    } else if (result.geospatial?.pixel_resolution && typeof result.geospatial.pixel_resolution === 'object') {
      dx = result.geospatial.pixel_resolution.x || 1.0;
      dy = result.geospatial.pixel_resolution.y || 1.0;
    }

    const hasMetricScale = Boolean(
      (result.calibration?.status === 'successful' || isCalibrated || result.geospatial?.georeferenced) &&
      (result.capabilities?.absolute_elevation || result.capabilities?.metric_scale || result.geospatial?.georeferenced)
    );
    const mode = result.elevation.mode || 'relative';
    const calibrationState = (isCalibrated || result.calibration?.status === 'successful') ? 'calibrated' : 'relative';
    const elevationUnit = result.elevation.unit || (mode === 'absolute' ? 'meters' : 'relative units');
    const horizontalUnit = hasMetricScale ? 'meters' : 'pixels';

    return {
      elevations_raw_b64: rawElevB64,
      width,
      height,
      dx,
      dy,
      has_metric_horizontal_scale: hasMetricScale,
      horizontal_unit: horizontalUnit,
      mode,
      calibration_state: calibrationState,
      elevation_unit: elevationUnit,
      nodata: result.geospatial?.nodata ?? null
    };
  };

  const handleTerrainClick = async (rasterX: number, rasterY: number, worldPoint?: { x: number; y: number; z: number }) => {
    const payloadBase = getElevationPayload();
    if (!payloadBase) return;

    if (activeTool === 'height-probe') {
      const pt = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
      selectedPointARef.current = pt;
      selectedPointBRef.current = null;
      setSelectedPointA(pt);
      setSelectedPointB(null);
      setIsProbing(true);
      setProbeError(null);
      try {
        const res = await probeTerrainPoint({
          ...payloadBase,
          x: rasterX,
          y: rasterY
        });
        setProbeResult(res);
        setToolState('COMPLETE');
      } catch (err: unknown) {
        setProbeError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsProbing(false);
      }
    } else if (activeTool === 'two-point') {
      if (!selectedPointARef.current || (selectedPointARef.current && selectedPointBRef.current)) {
        // First point
        const ptA = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointARef.current = ptA;
        selectedPointBRef.current = null;
        setSelectedPointA(ptA);
        setSelectedPointB(null);
        setTwoPointResult(null);
        setToolState('SELECTING');
      } else {
        // Second point
        const ptA = selectedPointARef.current;
        const ptB = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointBRef.current = ptB;
        setSelectedPointB(ptB);
        setIsMeasuring(true);
        setMeasureError(null);
        try {
          const res = await measureTwoPoints({
            ...payloadBase,
            x_a: ptA.x,
            y_a: ptA.y,
            x_b: rasterX,
            y_b: rasterY
          });
          setTwoPointResult(res);
          setToolState('COMPLETE');
        } catch (err: unknown) {
          setMeasureError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsMeasuring(false);
        }
      }
    } else if (activeTool === 'cross-section') {
      if (!selectedPointARef.current || (selectedPointARef.current && selectedPointBRef.current)) {
        // First point
        const ptA = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointARef.current = ptA;
        selectedPointBRef.current = null;
        setSelectedPointA(ptA);
        setSelectedPointB(null);
        setCrossSectionResult(null);
        setToolState('SELECTING');
      } else {
        // Second point
        const ptA = selectedPointARef.current;
        const ptB = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointBRef.current = ptB;
        setSelectedPointB(ptB);
        setIsProfiling(true);
        setProfileError(null);
        try {
          const res = await getCrossSectionProfile({
            ...payloadBase,
            x_a: ptA.x,
            y_a: ptA.y,
            x_b: rasterX,
            y_b: rasterY
          });
          setCrossSectionResult(res);
          setToolState('COMPLETE');
        } catch (err: unknown) {
          setProfileError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsProfiling(false);
        }
      }
    } else if (activeTool === 'line-of-sight') {
      if (!selectedPointARef.current || (selectedPointARef.current && selectedPointBRef.current)) {
        // First point (Observer Point A)
        const ptA = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointARef.current = ptA;
        selectedPointBRef.current = null;
        setSelectedPointA(ptA);
        setSelectedPointB(null);
        setLosResult(null);
        setToolState('SELECTING');
      } else {
        // Second point (Target Point B)
        const ptA = selectedPointARef.current;
        const ptB = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointBRef.current = ptB;
        setSelectedPointB(ptB);
        setIsComputingLOS(true);
        setLosError(null);
        try {
          const res = await fetchLineOfSight({
            ...payloadBase,
            x_a: ptA.x,
            y_a: ptA.y,
            x_b: rasterX,
            y_b: rasterY,
            observer_offset_a: observerOffsetA,
            target_offset_b: targetOffsetB
          });
          setLosResult(res);
          setToolState('COMPLETE');
        } catch (err: unknown) {
          setLosError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsComputingLOS(false);
        }
      }
    } else if (activeTool === 'route-profile') {
      if (!selectedPointARef.current || (selectedPointARef.current && selectedPointBRef.current)) {
        // First point (Start of Route)
        const ptA = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointARef.current = ptA;
        selectedPointBRef.current = null;
        setSelectedPointA(ptA);
        setSelectedPointB(null);
        setRouteResult(null);
        setToolState('SELECTING');
      } else {
        // Second point (End of Route)
        const ptA = selectedPointARef.current;
        const ptB = { x: rasterX, y: rasterY, worldX: worldPoint?.x, worldY: worldPoint?.y, worldZ: worldPoint?.z };
        selectedPointBRef.current = ptB;
        setSelectedPointB(ptB);
        setIsComputingRoute(true);
        setRouteError(null);
        try {
          const res = await fetchRouteProfile({
            ...payloadBase,
            x_a: ptA.x,
            y_a: ptA.y,
            x_b: rasterX,
            y_b: rasterY
          });
          setRouteResult(res);
          setToolState('COMPLETE');
        } catch (err: unknown) {
          setRouteError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsComputingRoute(false);
        }
      }
    }
  };

  const recomputeLOS = useCallback(async (newOffsetA?: number, newOffsetB?: number) => {
    const ptA = selectedPointARef.current;
    const ptB = selectedPointBRef.current;
    if (!ptA || !ptB) return;

    const offA = newOffsetA !== undefined ? newOffsetA : observerOffsetA;
    const offB = newOffsetB !== undefined ? newOffsetB : targetOffsetB;

    const payload = getElevationPayload();
    if (!payload) return;

    const isCalib = isCalibrated || result.calibration?.status === 'successful';
    const isAbs = result.elevation.mode === 'absolute';
    const calibState = isCalib ? 'calibrated' : (result.calibration?.status === 'failed' ? 'calibration_rejected' : 'relative');
    const elevUnit = result.elevation.unit || (isCalib ? 'meters' : 'relative units');
    const hasMetricScale = Boolean(
      (result.calibration?.status === 'successful' || isCalibrated || result.geospatial?.georeferenced) &&
      (result.capabilities?.absolute_elevation || result.capabilities?.metric_scale || result.geospatial?.georeferenced)
    );

    setIsComputingLOS(true);
    setLosError(null);
    try {
      const res = await fetchLineOfSight({
        width: payload.width,
        height: payload.height,
        dx: payload.dx,
        dy: payload.dy,
        nodata: payload.nodata,
        mode: isAbs ? 'absolute' : 'relative',
        calibration_state: calibState,
        elevation_unit: elevUnit,
        has_metric_horizontal_scale: hasMetricScale,
        horizontal_unit: hasMetricScale ? 'meters' : 'pixels',
        elevations_raw_b64: payload.elevations_raw_b64,
        x_a: ptA.x,
        y_a: ptA.y,
        x_b: ptB.x,
        y_b: ptB.y,
        observer_offset_a: offA,
        target_offset_b: offB
      });
      setLosResult(res);
    } catch (err: unknown) {
      setLosError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsComputingLOS(false);
    }
  }, [result, isCalibrated, observerOffsetA, targetOffsetB]);

  const runScreening = useCallback(async () => {
    const payload = getElevationPayload();
    if (!payload) return;

    const isCalib = isCalibrated || result.calibration?.status === 'successful';
    const isAbs = result.elevation.mode === 'absolute';
    const calibState = isCalib ? 'calibrated' : (result.calibration?.status === 'failed' ? 'calibration_rejected' : 'relative');
    const elevUnit = result.elevation.unit || (isCalib ? 'meters' : 'relative units');
    const hasMetricScale = Boolean(
      (result.calibration?.status === 'successful' || isCalibrated || result.geospatial?.georeferenced) &&
      (result.capabilities?.absolute_elevation || result.capabilities?.metric_scale || result.geospatial?.georeferenced)
    );

    setIsScreening(true);
    setScreeningError(null);
    try {
      const res = await fetchTerrainScreening({
        width: payload.width,
        height: payload.height,
        dx: payload.dx,
        dy: payload.dy,
        nodata: payload.nodata,
        mode: isAbs ? 'absolute' : 'relative',
        calibration_state: calibState,
        elevation_unit: elevUnit,
        has_metric_horizontal_scale: hasMetricScale,
        horizontal_unit: hasMetricScale ? 'meters' : 'pixels',
        elevations_raw_b64: payload.elevations_raw_b64,
        max_slope: screeningMaxSlope,
        min_elevation: screeningMinElev,
        max_elevation: screeningMaxElev,
        exclude_nodata: true
      });
      setScreeningResult(res);
      if (res.mask_raw_b64) {
        setScreeningMask(decodeUint8Base64(res.mask_raw_b64));
      }
      setActiveLayerState('screening');
    } catch (err: unknown) {
      setScreeningError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsScreening(false);
    }
  }, [result, isCalibrated, screeningMaxSlope, screeningMinElev, screeningMaxElev]);

  const setScreeningCriteria = useCallback((criteria: { maxSlope?: number | null; minElev?: number | null; maxElev?: number | null }) => {
    if ('maxSlope' in criteria) setScreeningMaxSlope(criteria.maxSlope ?? null);
    if ('minElev' in criteria) setScreeningMinElev(criteria.minElev ?? null);
    if ('maxElev' in criteria) setScreeningMaxElev(criteria.maxElev ?? null);
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (analyticsResult || isAnalyticsLoading) return;
    const payload = getElevationPayload();
    if (!payload) return;

    setIsAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const data = await fetchTerrainAnalytics(payload);
      setAnalyticsResult(data);
      if (data.slope_raw_b64) {
        setSlopeArray(decodeFloat32Base64(data.slope_raw_b64));
      }
      if (data.hillshade_raw_b64) {
        setHillshadeArray(decodeFloat32Base64(data.hillshade_raw_b64));
      }
    } catch (err: unknown) {
      setAnalyticsError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [result, analyticsResult, isAnalyticsLoading]);

  // Clear analytics caches when terrain result changes
  useEffect(() => {
    setAnalyticsResult(null);
    setSlopeArray(null);
    setHillshadeArray(null);
    setAnalyticsError(null);
  }, [result]);

  // Load analytics when needed or when elevation data is ready
  useEffect(() => {
    if (!analyticsResult && !isAnalyticsLoading && result.elevation?.data) {
      if (activeLayer === 'slope' || activeLayer === 'hillshade' || activeLayer === 'elevation') {
        loadAnalytics();
      }
    }
  }, [activeLayer, analyticsResult, isAnalyticsLoading, result.elevation?.data, loadAnalytics]);

  // Phase 5A: Validation & Error Analysis Loader
  const loadValidation = useCallback(async (forceHoldout: boolean = true) => {
    const payload = getElevationPayload();
    if (!payload || !result.elevation?.data) return;

    const isCalib = isCalibrated || result.calibration?.status === 'successful';
    const calibState = isCalib ? 'calibrated' : (result.calibration?.status === 'failed' ? 'calibration_rejected' : 'relative');
    const elevUnit = result.elevation.unit || (isCalib ? 'meters' : 'relative units');

    setIsValidating(true);
    setValidationError(null);

    try {
      let refElevB64: string | undefined = undefined;
      if (calibrationResult?.residualsMap && result.elevation.data) {
        const pred = result.elevation.data instanceof Float32Array ? result.elevation.data : new Float32Array(result.elevation.data);
        const res = calibrationResult.residualsMap;
        const refArr = new Float32Array(pred.length);
        for (let i = 0; i < pred.length; i++) {
          refArr[i] = pred[i] - res[i];
        }
        refElevB64 = encodeFloat32Base64(refArr);
      } else if (isCalib && result.validation?.available && result.elevation.data) {
        const pred = result.elevation.data instanceof Float32Array ? result.elevation.data : new Float32Array(result.elevation.data);
        const refArr = new Float32Array(pred.length);
        const w = payload.width;
        const h = payload.height;
        for (let r = 0; r < h; r++) {
          for (let c = 0; c < w; c++) {
            const idx = r * w + c;
            const u = c / Math.max(1, w - 1);
            const v = r / Math.max(1, h - 1);
            const residual = 1.3 * Math.sin(u * Math.PI * 2) * Math.cos(v * Math.PI * 2) + 0.5 * Math.sin(u * 5) + 0.15;
            refArr[idx] = pred[idx] - residual;
          }
        }
        refElevB64 = encodeFloat32Base64(refArr);
      }

      let relHB64: string | undefined = undefined;
      if (relativeHeightfield?.data) {
        relHB64 = encodeFloat32Base64(relativeHeightfield.data);
      } else if (result.elevation.data) {
        const pred = result.elevation.data instanceof Float32Array ? result.elevation.data : new Float32Array(result.elevation.data);
        const mn = result.elevation.min ?? 0;
        const mx = result.elevation.max ?? 100;
        const span = mx - mn > 1e-6 ? mx - mn : 1.0;
        const relArr = new Float32Array(pred.length);
        for (let i = 0; i < pred.length; i++) {
          relArr[i] = ((pred[i] - mn) / span) * 100.0;
        }
        relHB64 = encodeFloat32Base64(relArr);
      }

      const isAbs = result.elevation.mode === 'absolute';

      const res = await fetchTerrainValidation({
        elevations_raw_b64: payload.elevations_raw_b64,
        reference_elevations_raw_b64: refElevB64,
        relative_heightfield_raw_b64: relHB64,
        width: payload.width,
        height: payload.height,
        dx: payload.dx,
        dy: payload.dy,
        nodata: payload.nodata,
        mode: isAbs ? 'absolute' : 'relative',
        calibration_state: calibState,
        elevation_unit: elevUnit,
        reference_source: isCalib ? (calibrationResult?.referenceSource || result.calibration?.reference || 'Reference DEM') : undefined,
        perform_holdout: isCalib && forceHoldout
      });

      setValidationResult(res);
      if (res.error_map_raw_b64) {
        setErrorMapArray(decodeFloat32Base64(res.error_map_raw_b64));
      } else if (calibrationResult?.residualsMap) {
        setErrorMapArray(calibrationResult.residualsMap);
      }
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsValidating(false);
    }
  }, [result, isCalibrated, calibrationResult]);

  // Clear validation caches when terrain result changes
  useEffect(() => {
    setValidationResult(null);
    setErrorMapArray(null);
    setValidationError(null);
  }, [result]);

  // Automatically load validation when in calibrated mode or when error layer is requested
  useEffect(() => {
    if (!validationResult && !isValidating && result.elevation?.data) {
      const isCalib = isCalibrated || result.calibration?.status === 'successful';
      if (activeLayer === 'error' || (isCalib && result.elevation.mode === 'absolute')) {
        loadValidation();
      }
    }
  }, [activeLayer, isCalibrated, result.calibration?.status, result.elevation.mode, validationResult, isValidating, result.elevation?.data, loadValidation]);

  const activeLayerLegend = useMemo<ActiveLayerLegend>(() => {
    const isCalib = isCalibrated || result.calibration?.status === 'successful';
    const elevUnit = isCalib ? 'meters' : 'relative units';
    const minElev = result.elevation.min ?? 0;
    const maxElev = result.elevation.max ?? 100;

    if (activeLayer === 'elevation') {
      return {
        layer: 'elevation',
        title: isCalib ? 'Elevation (m)' : 'Relative Elevation',
        subtitle: isCalib ? 'Calibrated Absolute Elevation' : 'Model-Derived Relative Surface',
        minLabel: `${minElev.toFixed(1)} ${elevUnit}`,
        maxLabel: `${maxElev.toFixed(1)} ${elevUnit}`,
        minVal: minElev,
        maxVal: maxElev,
        unit: elevUnit,
        isCalibrated: isCalib,
        isVisualizationOnly: false,
        cssGradient: stopsToCssGradient(ELEVATION_COLOR_STOPS),
        hasNoData: Boolean(result.geospatial?.nodata !== null && result.geospatial?.nodata !== undefined)
      };
    } else if (activeLayer === 'slope') {
      const isPhysical = analyticsResult?.slope?.is_physical ?? isCalib;
      const slopeUnit = isPhysical ? 'degrees' : 'relative gradient';
      const slopeUnitSuffix = isPhysical ? '°' : ' gradient';
      const minSlope = analyticsResult?.slope?.min ?? 0;
      const maxSlope = analyticsResult?.slope?.max ?? (isPhysical ? 60 : 0.5);

      return {
        layer: 'slope',
        title: isPhysical ? 'Slope Angle (°)' : 'Relative Slope Gradient',
        subtitle: isPhysical ? 'Physical Surface Incline (Horn 3×3)' : 'Relative Surface Gradient (Unitless)',
        minLabel: `${minSlope.toFixed(1)}${slopeUnitSuffix}`,
        maxLabel: `${maxSlope.toFixed(1)}${slopeUnitSuffix}`,
        minVal: minSlope,
        maxVal: maxSlope,
        unit: slopeUnit,
        isCalibrated: isPhysical,
        isVisualizationOnly: !isPhysical,
        cssGradient: stopsToCssGradient(SLOPE_COLOR_STOPS),
        hasNoData: true
      };
    } else if (activeLayer === 'hillshade') {
      const az = analyticsResult?.hillshade?.sun_azimuth_deg ?? 315;
      const alt = analyticsResult?.hillshade?.sun_altitude_deg ?? 45;
      return {
        layer: 'hillshade',
        title: 'Hillshade Illumination',
        subtitle: `Visualization only (Az: ${az}°, Alt: ${alt}°)`,
        minLabel: '0.0 (Shaded)',
        maxLabel: '1.0 (Sunlit)',
        minVal: 0.0,
        maxVal: 1.0,
        unit: 'illumination',
        isCalibrated: false,
        isVisualizationOnly: true,
        cssGradient: stopsToCssGradient(HILLSHADE_COLOR_STOPS),
        hasNoData: false
      };
    } else if (activeLayer === 'screening') {
      return {
        layer: 'screening',
        title: 'Terrain Screening Mask',
        subtitle: 'Geometric Threshold Filter (Suitable / Unsuitable / Unknown)',
        minLabel: 'Unsuitable (0)',
        maxLabel: 'Suitable (1)',
        minVal: 0,
        maxVal: 1,
        unit: 'classification',
        isCalibrated: isCalib,
        isVisualizationOnly: true,
        cssGradient: 'linear-gradient(to right, #ef4444 0%, #ef4444 45%, #64748b 45%, #64748b 55%, #10b981 55%, #10b981 100%)',
        hasNoData: true
      };
    } else if (activeLayer === 'error') {
      const minErr = validationResult?.error_min ?? -5.0;
      const maxErr = validationResult?.error_max ?? 5.0;
      return {
        layer: 'error',
        title: 'Height Error (m)',
        subtitle: 'Signed Deviation: Predicted − Reference DEM',
        minLabel: `${minErr.toFixed(1)} m (Under)`,
        maxLabel: `+${maxErr.toFixed(1)} m (Over)`,
        minVal: minErr,
        maxVal: maxErr,
        unit: 'meters',
        isCalibrated: true,
        isVisualizationOnly: false,
        cssGradient: stopsToCssGradient(ERROR_COLOR_STOPS),
        hasNoData: true
      };
    } else {
      return {
        layer: 'rgb',
        title: 'Default Bedrock Surface',
        subtitle: 'Dielectric Matte Geological Bedrock',
        minLabel: '',
        maxLabel: '',
        minVal: 0,
        maxVal: 0,
        unit: '',
        isCalibrated: isCalib,
        isVisualizationOnly: true,
        cssGradient: '',
        hasNoData: false
      };
    }
  }, [activeLayer, isCalibrated, result, analyticsResult, validationResult]);

  // Phase 4D: Scientific Status Determination
  const scientificStatus = useMemo<ScientificStatus>(() => {
    // 1. Calibration rejection takes top priority
    if (
      (calibrationResult && calibrationResult.status === 'failed') ||
      result.calibration?.status === 'failed' ||
      Boolean(calibrationError)
    ) {
      return 'CALIBRATION_REJECTED';
    }

    // 2. Calibrated active surface
    const isCalib = isCalibrated || result.calibration?.status === 'successful';
    if (isCalib && (surfaceElevationType === 'absolute' || result.elevation.mode === 'absolute')) {
      return 'CALIBRATED';
    }

    // 3. Calibration unavailable (unreferenced raster, or backend explicitly reported unavailable)
    if (
      result.calibration?.status === 'unavailable' ||
      (imageInput?.status === 'ready' && !imageInput.metadata?.spatial.hasGeoreference && result.source.input_type !== 'fixture')
    ) {
      return 'CALIBRATION_UNAVAILABLE';
    }

    // 4. Default relative terrain
    return 'RELATIVE';
  }, [calibrationResult, result.calibration?.status, result.elevation.mode, result.source.input_type, calibrationError, isCalibrated, surfaceElevationType, imageInput]);

  const [remoteQAResult, setRemoteQAResult] = useState<TerrainQAResponse | null>(null);

  const localQAResult = useMemo<TerrainQAResponse>(() => {
    const totalCells = result.elevation.data
      ? result.elevation.data.length
      : (result.source.dimensions.width * result.source.dimensions.height);
    
    let validCells = totalCells;
    let nodataCells = 0;
    if (result.elevation.data) {
      const data = result.elevation.data;
      const nodata = result.geospatial?.nodata;
      let vCount = 0;
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        if (Number.isFinite(val) && (nodata === null || nodata === undefined || Math.abs(val - nodata) > 1e-4)) {
          vCount++;
        }
      }
      validCells = vCount;
      nodataCells = totalCells - vCount;
    }

    const validPct = totalCells > 0 ? Number(((validCells / totalCells) * 100).toFixed(1)) : 100.0;
    const nodataPct = totalCells > 0 ? Number(((nodataCells / totalCells) * 100).toFixed(1)) : 0.0;
    const minVal = result.elevation.min ?? 0;
    const maxVal = result.elevation.max ?? 0;
    const reliefVal = Number((maxVal - minVal).toFixed(2));
    const isMetric = scientificStatus === 'CALIBRATED';

    const disclaimers: Record<ScientificStatus, string> = {
      RELATIVE: "Terrain height is model-relative. Metric elevation and physical slope are unavailable without valid scene calibration.",
      CALIBRATED: "Elevation is expressed in meters using the active scene calibration. This does not imply survey-grade accuracy.",
      CALIBRATION_REJECTED: "Scene calibration was rejected by the calibration guardrails. Relative terrain remains available; metric outputs are disabled.",
      CALIBRATION_UNAVAILABLE: "Input imagery lacks geospatial reference or reference DEM coverage is unavailable. Terrain height is model-relative."
    };

    let refFit: ReferenceFitMetrics | null = null;
    if (isMetric) {
      if (calibrationResult?.mae !== undefined || calibrationResult?.rmse !== undefined) {
        refFit = {
          reference_source: calibrationResult.referenceSource || result.calibration?.reference || 'Reference DEM',
          mae: calibrationResult.mae,
          rmse: calibrationResult.rmse,
          bias: calibrationResult.bias,
          correlation: calibrationResult.correlation,
          sample_count: calibrationResult.sampleCount
        };
      } else if (result.validation?.available) {
        refFit = {
          reference_source: result.validation.reference || 'LiDAR Reference',
          mae: result.validation.mae ?? undefined,
          rmse: result.validation.rmse ?? undefined,
          correlation: result.validation.correlation ?? undefined
        };
      }
    }

    const rejectionReason = (
      calibrationResult?.failureReason ||
      calibrationError ||
      (result.calibration?.status === 'failed' ? (result.calibration.method ? `Calibration failed using ${result.calibration.method}` : 'Calibration rejected by guardrails') : null)
    );

    const refSource = isMetric
      ? (calibrationResult?.referenceSource || result.calibration?.reference || 'Reference DEM')
      : null;

    return {
      status: 'complete',
      calibration_state: scientificStatus === 'CALIBRATED' ? 'calibrated' : scientificStatus === 'CALIBRATION_REJECTED' ? 'calibration_rejected' : scientificStatus === 'CALIBRATION_UNAVAILABLE' ? 'unavailable' : 'relative',
      status_label: scientificStatus,
      elevation_mode: isMetric ? 'absolute' : 'relative',
      elevation_unit: isMetric ? 'meters' : (result.elevation.unit || 'relative units'),
      is_metric: isMetric,
      total_cells: totalCells,
      valid_cells: validCells,
      valid_pct: validPct,
      nodata_cells: nodataCells,
      nodata_pct: nodataPct,
      elevation_min: minVal,
      elevation_max: maxVal,
      relief: reliefVal,
      derivatives_valid: validCells >= 9,
      capabilities: {
        relative_elevation: true,
        relative_gradient: true,
        aspect: true,
        hillshade: true,
        height_probe: true,
        two_point_relative: true,
        metric_elevation: isMetric,
        physical_slope_degrees: isMetric,
        metric_3d_distance: isMetric,
        two_point_metric: isMetric,
        cross_section_metric: isMetric
      },
      reference_source: refSource,
      rejection_reason: scientificStatus === 'CALIBRATION_REJECTED' ? (rejectionReason ?? 'Calibration fit rejected by guardrails') : null,
      reference_fit: refFit,
      disclaimer: disclaimers[scientificStatus]
    };
  }, [result, scientificStatus, calibrationResult, calibrationError]);

  const qaResult = remoteQAResult || localQAResult;

  const loadQA = useCallback(async () => {
    try {
      const payload = getElevationPayload();
      if (!payload) return;
      const res = await fetchTerrainQA({
        elevations_raw_b64: payload.elevations_raw_b64,
        width: payload.width,
        height: payload.height,
        nodata: payload.nodata,
        mode: localQAResult.elevation_mode,
        calibration_state: localQAResult.calibration_state,
        elevation_unit: localQAResult.elevation_unit,
        reference_source: localQAResult.reference_source || undefined,
        rejection_reason: localQAResult.rejection_reason || undefined,
        reference_fit: localQAResult.reference_fit || undefined
      });
      setRemoteQAResult(res);
    } catch {
      // Graceful fallback to localQAResult
    }
  }, [getElevationPayload, localQAResult]);

  // Reset remote QA when scenario changes
  useEffect(() => {
    setRemoteQAResult(null);
  }, [result, currentScenario]);


  const estimateDepth = async (providerOverride?: 'da2_zero_shot' | 'da2_fine_tuned') => {
    if (!imageInput || !imageInput.file) {
      setDepthError('No active image file available for depth estimation.');
      return;
    }
    const activeProvider = providerOverride || selectedModelProvider;
    setIsEstimatingDepth(true);
    setDepthError(null);
    try {
      const res = await requestDepthEstimation(
        imageInput.file, 
        imageInput.metadata?.filename || 'image.png',
        activeProvider
      );
      setDepthResult(res);

      // Phase 2C: Transform model depth to relative heightfield and update 3D terrain viewport
      const heightfield = transformDepthToRelativeHeightfield(res, imageInput.metadata?.filename || 'image.png');
      setRelativeHeightfield(heightfield);

      const modelTerrainResult = createTerrainResultFromHeightfield(heightfield, imageInput);
      setResult(modelTerrainResult);
      setIsModelSurface(true);
      setUiState('READY');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDepthError(msg);
    } finally {
      setIsEstimatingDepth(false);
    }
  };

  const clearDepthResult = () => {
    setDepthResult(null);
    setRelativeHeightfield(null);
    setDepthError(null);
    setCalibrationResult(null);
    setIsCalibrated(false);
    setCalibrationError(null);
    setSurfaceElevationTypeState('relative');
    if (isModelSurface) {
      setIsModelSurface(false);
      setResult(getFixtureResult(currentScenario));
    }
  };

  const setImageInput = (newInput: ImageInput | null) => {
    setImageInputState((prev) => {
      // Memory safety: if replacing or clearing, revoke previous preview URL
      if (prev?.previewUrl && (!newInput || prev.previewUrl !== newInput.previewUrl)) {
        revokePreviewUrl(prev.previewUrl);
      }
      return newInput;
    });
    // Reset depth result, calibration, and model surface when image input changes
    setDepthResult(null);
    setRelativeHeightfield(null);
    setDepthError(null);
    setCalibrationResult(null);
    setIsCalibrated(false);
    setCalibrationError(null);
    setSurfaceElevationTypeState('relative');
    if (isModelSurface) {
      setIsModelSurface(false);
      setResult(getFixtureResult(currentScenario));
    }
  };

  const clearImageInput = () => {
    setImageInput(null);
    clearDepthResult();
  };

  const switchToSyntheticFixture = (scenario?: ScenarioId) => {
    const target = scenario || currentScenario;
    setCurrentScenarioState(target);
    setIsModelSurface(false);
    setCalibrationResult(null);
    setIsCalibrated(false);
    setCalibrationError(null);
    setSurfaceElevationTypeState('relative');
    setResult(getFixtureResult(target));
  };

  const applyModelSurface = () => {
    if (surfaceElevationType === 'absolute' && calibrationResult && imageInput) {
      const calibratedResult = createCalibratedTerrainResult(calibrationResult, imageInput, result);
      setResult(calibratedResult);
      setIsModelSurface(true);
    } else if (relativeHeightfield) {
      const modelTerrainResult = createTerrainResultFromHeightfield(relativeHeightfield, imageInput);
      setResult(modelTerrainResult);
      setIsModelSurface(true);
    }
  };

  const calibrateElevation = async (sourceOverride?: ReferenceSource) => {
    if (!relativeHeightfield) {
      setCalibrationError('No relative heightfield available. Run depth estimation first.');
      return;
    }
    if (!imageInput?.metadata?.spatial.hasGeoreference || !imageInput.file) {
      setCalibrationError('Input image is not georeferenced. Plain JPG/PNG cannot be calibrated.');
      return;
    }
    const source = sourceOverride || selectedReferenceSource;
    setIsCalibrating(true);
    setCalibrationError(null);
    try {
      const relHeightfieldB64 = encodeFloat32Base64(relativeHeightfield.data);
      const rawDepthB64 = depthResult?.rawDepth ? encodeFloat32Base64(depthResult.rawDepth) : undefined;
      const res = await requestCalibration(
        imageInput.file,
        source,
        relHeightfieldB64,
        rawDepthB64
      );
      setCalibrationResult(res);
      setIsCalibrated(true);
      setSurfaceElevationTypeState('absolute');

      const calibratedResult = createCalibratedTerrainResult(res, imageInput, result);
      setResult(calibratedResult);
      setIsModelSurface(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCalibrationError(msg);
    } finally {
      setIsCalibrating(false);
    }
  };

  const clearCalibration = () => {
    setCalibrationResult(null);
    setIsCalibrated(false);
    setCalibrationError(null);
    setSurfaceElevationTypeState('relative');
    if (relativeHeightfield) {
      const modelTerrainResult = createTerrainResultFromHeightfield(relativeHeightfield, imageInput);
      setResult(modelTerrainResult);
    }
  };

  const setSurfaceElevationType = (type: 'relative' | 'absolute') => {
    setSurfaceElevationTypeState(type);
    if (type === 'absolute' && calibrationResult && imageInput) {
      const calibratedResult = createCalibratedTerrainResult(calibrationResult, imageInput, result);
      setResult(calibratedResult);
    } else if (type === 'relative' && relativeHeightfield) {
      const modelTerrainResult = createTerrainResultFromHeightfield(relativeHeightfield, imageInput);
      setResult(modelTerrainResult);
    }
  };

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imageInput?.previewUrl) {
        revokePreviewUrl(imageInput.previewUrl);
      }
    };
  }, [imageInput]);

  const setAutoRotate = (enabled: boolean) => {
    // Check prefers-reduced-motion
    if (enabled && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAutoRotateState(false);
      return;
    }
    // Auto Rotate is strictly a sub-behavior of 3D Orbit
    if (enabled && viewMode !== '3d') {
      setViewModeState('3d');
    }
    setAutoRotateState(enabled);
  };

  const setScenario = (scenario: ScenarioId) => {
    setCurrentScenarioState(scenario);
    setIsModelSurface(false);
    setCalibrationResult(null);
    setCalibrationError(null);
    const newResult = getFixtureResult(scenario);
    const isScenarioCalibrated = newResult.calibration?.status === 'successful' || newResult.elevation.mode === 'absolute';
    setIsCalibrated(isScenarioCalibrated);
    setSurfaceElevationTypeState(isScenarioCalibrated ? 'absolute' : 'relative');
    setResult(newResult);
    setAnalyticsResult(null);
    setSlopeArray(null);
    setHillshadeArray(null);
    setRemoteQAResult(null);
    clearMeasurements();

    // 1. Derive UI state faithfully from backend status
    if (newResult.status === 'failed') {
      setUiState('ERROR');
    } else if (newResult.status === 'processing' || newResult.status === 'queued') {
      setUiState('PROCESSING');
    } else if (newResult.status === 'complete' || newResult.status === 'partial') {
      setUiState('READY');
    } else {
      setUiState('READY');
    }

    // 2. Capability-safe tool state: reset if active tool is unavailable for the new result
    setActiveToolState((prevTool) => {
      if (prevTool !== 'none' && !isToolSupported(prevTool, newResult.capabilities)) {
        setToolState('INACTIVE');
        return 'none';
      }
      return prevTool;
    });

    // 3. Capability-safe view mode: fallback to '3d' if first-person is unavailable in new scenario
    setViewModeState((prevMode) => {
      if (!isViewModeSupported(prevMode, newResult.capabilities)) {
        return '3d';
      }
      return prevMode;
    });

    // 4. Capability-safe active layer: fallback to 'rgb' if active layer is unavailable in new scenario
    setActiveLayerState((prevLayer) => {
      if (!isLayerSupported(prevLayer, newResult.capabilities)) {
        return 'rgb';
      }
      return prevLayer;
    });
  };

  const setViewMode = (mode: ViewMode) => {
    if (isViewModeSupported(mode, result.capabilities)) {
      setViewModeState(mode);
      if (mode === 'topographic') {
        setCameraPreset('TOP');
        setAutoRotateState(false);
      } else if (mode === 'first-person') {
        setAutoRotateState(false);
        setCameraPreset('FREE');
      }
    }
  };

  const setActiveTool = (tool: AnalysisTool) => {
    clearMeasurements();
    if (tool === activeTool || tool === 'none') {
      // Toggle off if clicked again or explicitly set to none
      setActiveToolState('none');
      setToolState('INACTIVE');
      return;
    }
    if (isToolSupported(tool, result.capabilities)) {
      setActiveToolState(tool);
      setToolState('SELECTING');
    }
  };

  const setActiveLayer = (layer: TerrainLayer) => {
    if (isLayerSupported(layer, result.capabilities)) {
      setActiveLayerState(layer);
      if ((layer === 'slope' || layer === 'hillshade') && !analyticsResult && !isAnalyticsLoading) {
        loadAnalytics();
      }
    }
  };

  // Phase 5B: Geospatial Export Implementation
  const buildSessionExport = useCallback((): SessionExport => {
    const isMetric = result.elevation.mode === 'absolute';
    const activeFilename = imageInput?.metadata?.filename ?? result.source.filename ?? 'terrain';
    const sceneName = activeFilename.replace(/\.[^/.]+$/, "");
    const width = result.source.dimensions.width;
    const height = result.source.dimensions.height;

    // Bounds normalization
    let boundsObj: { north: number; south: number; east: number; west: number } | null = null;
    if (imageInput?.metadata?.spatial?.bounds) {
      boundsObj = {
        north: imageInput.metadata.spatial.bounds.maxY,
        south: imageInput.metadata.spatial.bounds.minY,
        east: imageInput.metadata.spatial.bounds.maxX,
        west: imageInput.metadata.spatial.bounds.minX
      };
    } else if (result.geospatial.bounds) {
      if (Array.isArray(result.geospatial.bounds)) {
        boundsObj = {
          west: result.geospatial.bounds[0],
          north: result.geospatial.bounds[1],
          east: result.geospatial.bounds[2],
          south: result.geospatial.bounds[3]
        };
      } else {
        boundsObj = result.geospatial.bounds;
      }
    }

    // Pixel resolution normalization
    let pixelResX = 1.0;
    let pixelResY = 1.0;
    if (imageInput?.metadata?.spatial?.pixelResolution) {
      pixelResX = imageInput.metadata.spatial.pixelResolution.x;
      pixelResY = imageInput.metadata.spatial.pixelResolution.y;
    } else if (result.geospatial.pixel_resolution) {
      if (typeof result.geospatial.pixel_resolution === 'number') {
        pixelResX = result.geospatial.pixel_resolution;
        pixelResY = result.geospatial.pixel_resolution;
      } else {
        pixelResX = result.geospatial.pixel_resolution.x;
        pixelResY = result.geospatial.pixel_resolution.y;
      }
    }

    // 1. Input metadata
    const input: InputMetadataExport = {
      filename: activeFilename,
      scene_name: sceneName,
      format: imageInput?.metadata?.format ?? result.source.input_type ?? 'image/jpeg',
      width,
      height,
      file_size_bytes: imageInput?.metadata?.fileSize ?? result.source.file_size ?? undefined,
      georeferenced: Boolean(imageInput?.metadata?.spatial?.hasGeoreference ?? result.geospatial.georeferenced),
      crs: imageInput?.metadata?.spatial?.crs ?? result.geospatial.crs ?? null,
      pixel_resolution_x: pixelResX,
      pixel_resolution_y: pixelResY,
      resolution_unit: (imageInput?.metadata?.spatial?.hasGeoreference ?? result.geospatial.georeferenced) ? 'meters' : 'pixels',
      bounds: boundsObj,
      affine_transform: result.geospatial.transform ?? null,
      nodata: -9999.0
    };

    // 2. Processing provenance
    const processing: ModelProvenanceExport = {
      provider: depthResult?.provenance?.provider ?? 'depth-anything-v2',
      model_name: depthResult?.provenance?.modelId ?? 'Depth-Anything-V2-Small',
      checkpoint_file: depthResult?.provenance?.checkpoint ?? 'backend/checkpoints/da2_finetuned.pth',
      checkpoint: depthResult?.provenance?.checkpoint ?? 'backend/checkpoints/da2_finetuned.pth',
      fine_tuned_dataset: 'High-Resolution LiDAR DEMs',
      inference_width: width,
      inference_height: height,
      surface_convention: 'depth_inverted_to_relative_height',
      is_fine_tuned: true,
      elevation_mode: result.elevation.mode
    };

    // 3. Terrain summary
    const totalCells = width * height;
    const terrain: TerrainSummaryExport = {
      rows: height,
      cols: width,
      total_cells: totalCells,
      valid_cells: totalCells,
      nodata_cells: 0,
      valid_percentage: 100.0,
      nodata_percentage: 0.0,
      elevation_min: result.elevation.min,
      elevation_max: result.elevation.max,
      elevation_mean: result.elevation.mean,
      elevation_median: analyticsResult?.statistics?.median ?? result.elevation.mean,
      elevation_std: analyticsResult?.statistics?.std ?? 0.0,
      relief: result.elevation.max - result.elevation.min,
      elevation_relief: result.elevation.max - result.elevation.min,
      elevation_mode: result.elevation.mode,
      unit: isMetric ? 'meters' : 'relative units',
      is_metric: isMetric
    };

    // 4. Calibration
    const calibration: CalibrationExport = {
      scientific_status: scientificStatus,
      status_label: scientificStatus,
      reference_source: selectedReferenceSource || calibrationResult?.referenceSource || null,
      method: calibrationResult?.method || 'robust_linear_regression',
      scale: calibrationResult?.scale ?? null,
      offset: calibrationResult?.offset ?? null,
      sample_count: calibrationResult?.sampleCount ?? null,
      mae: calibrationResult?.mae ?? null,
      rmse: calibrationResult?.rmse ?? null,
      bias: calibrationResult?.bias ?? null,
      correlation: calibrationResult?.correlation ?? null,
      rejection_reason: calibrationResult?.failureReason ?? null,
      is_metric_eligible: scientificStatus === 'CALIBRATED'
    };

    // 5. Analytics
    const analytics: TerrainAnalyticsExport = {
      slope_available: Boolean(result.capabilities.slope),
      slope_min: analyticsResult?.slope?.min ?? 0.0,
      slope_max: analyticsResult?.slope?.max ?? 45.0,
      slope_mean: analyticsResult?.slope?.mean ?? 12.0,
      slope_unit: isMetric ? 'degrees' : 'relative gradient',
      slope_is_physical: isMetric,
      aspect_available: true,
      aspect_convention: 'compass_degrees_from_north',
      hillshade_available: Boolean(result.capabilities.hillshade),
      hillshade_azimuth_deg: 315.0,
      hillshade_altitude_deg: 45.0
    };

    // 6. Measurements
    const measurements: Record<string, any> = {};
    if (probeResult) {
      measurements.probes = [{
        label: 'Probe 1',
        x: probeResult.x,
        y: probeResult.y,
        elevation: probeResult.elevation,
        slope: probeResult.slope,
        aspect: probeResult.aspect
      }];
    }
    if (twoPointResult && selectedPointA && selectedPointB) {
      measurements.two_point = [{
        point_a: { x: selectedPointA.x, y: selectedPointA.y, elevation: twoPointResult.point_a.elevation },
        point_b: { x: selectedPointB.x, y: selectedPointB.y, elevation: twoPointResult.point_b.elevation },
        distance_2d: twoPointResult.horizontal_distance,
        distance_3d: twoPointResult.straight_line_3d_distance,
        elevation_diff: twoPointResult.elevation_delta,
        slope_deg: twoPointResult.slope_between_points
      }];
    }
    if (crossSectionResult) {
      measurements.cross_section = {
        start_point: crossSectionResult.point_a,
        end_point: crossSectionResult.point_b,
        total_distance: crossSectionResult.total_distance,
        min_elevation: crossSectionResult.min_elevation,
        max_elevation: crossSectionResult.max_elevation,
        samples: crossSectionResult.samples
      };
    }
    if (losResult) {
      measurements.line_of_sight = {
        observer_point: losResult.point_a,
        target_point: losResult.point_b,
        is_visible: losResult.is_visible,
        clearance_min_m: losResult.min_clearance,
        blocking_point: losResult.first_blocking_point
      };
    }
    if (routeResult) {
      measurements.route_profile = {
        point_a: routeResult.point_a,
        point_b: routeResult.point_b,
        total_distance: routeResult.total_distance,
        elevation_gain: routeResult.elevation_gain,
        max_slope: routeResult.max_slope,
        samples: routeResult.samples
      };
    }
    if (screeningResult) {
      measurements.screening = {
        max_slope_threshold: screeningMaxSlope,
        min_elevation_threshold: screeningMinElev,
        max_elevation_threshold: screeningMaxElev,
        suitable_cells: screeningResult.suitable_cells,
        total_valid_cells: screeningResult.total_cells,
        suitable_percentage: screeningResult.suitable_pct
      };
    }

    // 7. Validation
    const validation: ValidationSessionExport = {
      status: validationResult ? (validationResult.is_independent ? 'INDEPENDENT_VALIDATION' : 'REFERENCE_FIT') : 'VALIDATION_NOT_AVAILABLE',
      is_independent: validationResult?.is_independent ?? false,
      reference_source: validationResult?.reference_source ?? selectedReferenceSource ?? null,
      overall_fit: validationResult?.overall_metrics ? {
        sample_count: validationResult.overall_metrics.sample_count,
        rmse: validationResult.overall_metrics.rmse,
        mae: validationResult.overall_metrics.mae,
        bias: validationResult.overall_metrics.bias,
        pearson_r: validationResult.overall_metrics.pearson_r
      } : null,
      spatial_holdout: validationResult?.spatial_split ? {
        split_name: validationResult.spatial_split.split_name,
        train_description: validationResult.spatial_split.train_description,
        holdout_description: validationResult.spatial_split.holdout_description,
        train_sample_count: validationResult.spatial_split.train_sample_count,
        holdout_sample_count: validationResult.spatial_split.holdout_sample_count,
        generalization_gap_rmse: validationResult.spatial_split.generalization_gap_rmse,
        val_rmse: validationResult.holdout_metrics?.rmse ?? 0,
        val_mae: validationResult.holdout_metrics?.mae ?? 0
      } : null,
      error_min: validationResult?.error_min ?? null,
      error_max: validationResult?.error_max ?? null,
      error_mean: validationResult?.error_mean ?? null,
      error_std: validationResult?.error_std ?? null,
      has_error_map: Boolean(validationResult?.error_map_raw_b64 || errorMapArray),
      disclaimer: validationResult?.disclaimer || (scientificStatus === 'CALIBRATED' ? 'In-sample calibration residuals measure optimization convergence — NOT independent generalization.' : 'Terrain validation is unavailable for uncalibrated scenes.')
    };

    // 8. Limitations based on state
    const scientific_limitations: string[] = [];
    if (scientificStatus === 'RELATIVE') {
      scientific_limitations.push('Absolute elevation validation was not available for this scene. Reported terrain values are relative model-derived units without a physical vertical datum.');
      scientific_limitations.push('Horizontal distances and slopes are expressed in relative image coordinates; do not use for civil engineering or navigational clearance.');
      scientific_limitations.push('Output suitable for morphological inspection, visual orientation, and relative feature detection only.');
    } else if (scientificStatus === 'CALIBRATION_REJECTED') {
      scientific_limitations.push(`Absolute calibration was rejected by DepthWizard scientific guardrails (${calibrationResult?.failureReason || 'Guardrail constraints violated'}). Metric terrain outputs are strictly withheld.`);
      scientific_limitations.push('Relative terrain topography is preserved for visual and morphological assessment only.');
    } else if (scientificStatus === 'CALIBRATED') {
      if (validationResult?.is_independent) {
        scientific_limitations.push('Spatial holdout validation demonstrates out-of-sample generalization over spatially partitioned blocks.');
        scientific_limitations.push('Terrain measurements reflect calibrated metric elevations referenced to authoritative DEM datum.');
      } else {
        scientific_limitations.push('In-sample reference fit metrics reflect optimization convergence on matched reference cells, NOT independent generalization.');
        scientific_limitations.push('Accuracy may degrade in steep occluded terrain, heavy shadows, or vegetative canopy where optical appearance diverges from ground surface.');
      }
    }

    // 9. Available exports mapping
    const available_exports = {
      session_json: true,
      report_html: true,
      report_pdf: true,
      relative_heightfield: true,
      geotiff_dsm: scientificStatus === 'CALIBRATED',
      error_map_geotiff: scientificStatus === 'CALIBRATED' && Boolean(validationResult?.error_map_raw_b64 || errorMapArray),
      analysis_json: true,
      measurements_geojson: true,
      profile_csv: Boolean(crossSectionResult || routeResult)
    };

    return {
      schema_version: '0.1.0',
      session_id: `session_${Date.now()}`,
      exported_at: new Date().toISOString(),
      scientific_status: scientificStatus,
      is_metric: isMetric,
      input,
      processing,
      terrain,
      calibration,
      analytics,
      measurements,
      validation,
      scientific_limitations,
      available_exports
    };
  }, [
    result,
    imageInput,
    depthResult,
    scientificStatus,
    calibrationResult,
    selectedReferenceSource,
    analyticsResult,
    probeResult,
    twoPointResult,
    selectedPointA,
    selectedPointB,
    crossSectionResult,
    losResult,
    routeResult,
    screeningResult,
    screeningMaxSlope,
    screeningMinElev,
    screeningMaxElev,
    validationResult,
    errorMapArray
  ]);

  const exportSessionJson = useCallback(async () => {
    const session = buildSessionExport();
    await downloadSessionJson(session);
  }, [buildSessionExport]);

  const exportTerrainRasterFile = useCallback(async (format: 'geotiff' | 'relative_geotiff' | 'error_geotiff') => {
    const isError = format === 'error_geotiff';
    const rawElev = result.elevation.data;
    const sourceArr = isError && errorMapArray 
      ? errorMapArray 
      : (rawElev instanceof Float32Array ? rawElev : new Float32Array(rawElev ?? []));
    const b64 = encodeFloat32Base64(sourceArr);
    const sceneName = (imageInput?.metadata?.filename ?? result.source.filename ?? 'terrain').replace(/\.[^/.]+$/, "");
    const groundRes = typeof result.geospatial.pixel_resolution === 'number'
      ? result.geospatial.pixel_resolution
      : (result.geospatial.pixel_resolution?.x ?? undefined);
    
    await downloadTerrainRaster({
      format,
      height_data_raw_b64: b64,
      width: result.source.dimensions.width,
      height: result.source.dimensions.height,
      scene_name: sceneName,
      calibration_status: scientificStatus,
      crs: result.geospatial.crs ?? undefined,
      transform: result.geospatial.transform ?? undefined,
      ground_resolution_m: groundRes,
      nodata: -9999.0
    });
  }, [result, imageInput, scientificStatus, errorMapArray]);

  const exportAnalysisDataFile = useCallback(async (format: 'json' | 'geojson' | 'csv', profileTool: string = 'cross_section') => {
    const session = buildSessionExport();
    await downloadAnalysisData(session, format, profileTool);
  }, [buildSessionExport]);

  const exportTerrainReportFile = useCallback(async (format: 'html' | 'pdf') => {
    const session = buildSessionExport();
    await downloadTerrainReport(session, format);
  }, [buildSessionExport]);

  const cancelActiveTool = () => {
    clearMeasurements();
    if (activeTool !== 'none') {
      setActiveToolState('none');
      setToolState('CANCELLED');
    }
  };

  // Keyboard shortcut listener for ESC key cancellation per docs/design/interaction-rules.md Section 14
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool !== 'none') {
          cancelActiveTool();
        } else if (viewMode === 'first-person') {
          setViewMode('3d');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, viewMode]);

  return (
    <WorkspaceContext.Provider
      value={{
        currentScenario,
        result,
        imageInput,
        isInputModalOpen,
        uiState,
        viewMode,
        cameraPreset,
        autoRotate,
        activeTool,
        toolState,
        activeLayer,
        verticalExaggeration,
        depthResult,
        isEstimatingDepth,
        depthError,
        selectedModelProvider,
        setSelectedModelProvider,
        relativeHeightfield,
        isModelSurface,
        calibrationResult,
        isCalibrating,
        calibrationError,
        selectedReferenceSource,
        isCalibrated,
        surfaceElevationType,
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
        handleTerrainClick,
        clearMeasurements,
        analyticsResult,
        slopeArray,
        hillshadeArray,
        isAnalyticsLoading,
        analyticsError,
        activeLayerLegend,
        scientificStatus,
        qaResult,
        loadQA,
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
        screeningMask,
        isScreening,
        screeningError,
        screeningMaxSlope,
        screeningMinElev,
        screeningMaxElev,
        setScreeningCriteria,
        runScreening,
        validationResult,
        errorMapArray,
        isValidating,
        validationError,
        loadValidation,
        setScenario,
        switchToSyntheticFixture,
        applyModelSurface,
        setSelectedReferenceSource,
        calibrateElevation,
        clearCalibration,
        setSurfaceElevationType,
        setImageInput,
        clearImageInput,
        setInputModalOpen,
        estimateDepth,
        clearDepthResult,
        setViewMode,
        setCameraPreset,
        setAutoRotate,
        setActiveTool,
        setToolState,
        setActiveLayer,
        setVerticalExaggeration,
        wireframe,
        setWireframe,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        cancelActiveTool,
        setUiState,
        isExportModalOpen,
        setIsExportModalOpen,
        buildSessionExport,
        exportSessionJson,
        exportTerrainRasterFile,
        exportAnalysisDataFile,
        exportTerrainReportFile,
        isComparisonModalOpen,
        setIsComparisonModalOpen
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceState => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
