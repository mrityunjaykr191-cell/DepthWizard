/**
 * DepthWizard — Frontend Geospatial Calibration Types
 * Authority: Phase 3 Specification & docs/product/output-contract.md
 */

export type CalibrationStatus = 'unavailable' | 'not_required' | 'pending' | 'calibrated' | 'failed';

export type ReferenceSource = 'CartoDEM' | 'SRTM';

export interface CalibrationResiduals {
  mae: number;
  rmse: number;
  bias: number;
  correlation: number;
  sampleCount: number;
  medianAbsoluteError?: number;
}

export interface CalibrationResult {
  status: CalibrationStatus;
  scale?: number;
  offset?: number;
  elevationUnit: string;
  elevationMin?: number;
  elevationMax?: number;
  elevationMean?: number;
  method?: string;
  referenceSource?: string;
  referenceCrs?: string;
  verticalReference?: string;
  sampleCount?: number;
  mae?: number;
  rmse?: number;
  bias?: number;
  correlation?: number;
  medianAbsoluteError?: number;
  calibratedElevation?: Float32Array;
  residualsMap?: Float32Array;
  failureReason?: string;
  provenance: Record<string, unknown>;
}

export interface CalibrationSourcesInfo {
  supportedSources: ReferenceSource[];
  preferredSource: ReferenceSource;
  fallbackSource: ReferenceSource;
  localTilesAvailable: boolean;
}
