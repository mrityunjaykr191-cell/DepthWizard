import React from 'react';
import { useWorkspace } from '../../state/WorkspaceContext';
import {
  Crosshair,
  Ruler,
  Activity,
  SplitSquareVertical,
  FileCheck2,
  Eye,
  TrendingUp,
  Filter,
  Footprints,
  Box,
  Map,
  Info,
  X
} from 'lucide-react';

export type GuidanceTool =
  | 'height-probe'
  | 'two-point'
  | 'slope'
  | 'cross-section'
  | 'validation'
  | 'line-of-sight'
  | 'route-profile'
  | 'terrain-screening'
  | 'first-person'
  | '3d'
  | 'topographic';

export interface ToolGuidanceProps {
  tool: GuidanceTool;
  onClose?: () => void;
  className?: string;
}

interface ToolGuidanceConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  purpose: string;
  instructions: string[];
  actionHint: string;
  exitHint?: string;
  scientificNote: string;
  isScientificWarning?: boolean;
}

function getGuidanceConfig(
  tool: GuidanceTool,
  isCalibrated: boolean,
  scientificStatus: string
): ToolGuidanceConfig | null {
  switch (tool) {
    case 'height-probe':
      return {
        icon: Crosshair,
        title: 'Height Probe',
        purpose: 'Inspect the estimated surface height at a selected location.',
        instructions: [
          'Click anywhere on the terrain to place a probe marker.',
          'Review sampled elevation and local gradient in the inspector below.'
        ],
        actionHint: 'Click terrain → sample point',
        exitHint: 'Exit tool',
        scientificNote: isCalibrated
          ? 'Metric elevation calibrated against reference datum.'
          : 'Relative scene: values represent model-derived relative units, not physical meters.',
        isScientificWarning: !isCalibrated
      };

    case 'two-point':
      return {
        icon: Ruler,
        title: 'Two-Point Measure',
        purpose: 'Compare ground distance and elevation difference between two terrain locations.',
        instructions: [
          '1. Select Point A on the terrain.',
          '2. Select Point B on the terrain.',
          '3. Review ground distance, elevation delta, and slope.'
        ],
        actionHint: 'Click 2 points → measure delta',
        exitHint: 'Cancel',
        scientificNote: isCalibrated
          ? 'Metric horizontal distance and physical vertical delta.'
          : 'Relative scene: vertical relief in relative units; 3D distance disabled without calibration.',
        isScientificWarning: !isCalibrated
      };

    case 'slope':
      return {
        icon: Activity,
        title: 'Slope Analysis',
        purpose: 'Inspect terrain steepness across the reconstructed surface.',
        instructions: [
          'Review gradient distribution metrics in the inspector below.',
          'Toggle the Slope layer in the viewport for full spatial colormapping.'
        ],
        actionHint: 'Review gradient metrics',
        exitHint: 'Exit',
        scientificNote: isCalibrated
          ? 'Physical slope in degrees computed from calibrated elevation.'
          : 'Relative scene: values represent dimensionless relative gradient, not physical slope in degrees.',
        isScientificWarning: !isCalibrated
      };

    case 'cross-section':
      return {
        icon: SplitSquareVertical,
        title: 'Cross-Section',
        purpose: 'Inspect how terrain elevation changes along a transect.',
        instructions: [
          '1. Click Point A for transect start.',
          '2. Click Point B for transect end.',
          '3. Review the extracted elevation profile curve.'
        ],
        actionHint: 'Click start & end points',
        exitHint: 'Close',
        scientificNote: isCalibrated
          ? 'Elevation profile plotted in calibrated meters.'
          : 'Uncalibrated scene: transect profile is plotted in model-derived relative units.',
        isScientificWarning: !isCalibrated
      };

    case 'validation':
      return {
        icon: FileCheck2,
        title: 'Validation',
        purpose: 'Compare the reconstructed terrain against an external elevation reference.',
        instructions: [
          '1. Select or confirm an elevation reference dataset.',
          '2. Execute calibration or independent validation.',
          '3. Inspect RMSE, MAE, and spatial error distribution.'
        ],
        actionHint: 'Select reference → evaluate',
        exitHint: 'Close',
        scientificNote: isCalibrated
          ? 'Independent validation evaluates absolute vertical accuracy against external ground truth.'
          : scientificStatus === 'CALIBRATION_REJECTED'
          ? 'Calibration was rejected: metric accuracy withheld due to excessive discrepancy.'
          : 'Terrain is uncalibrated. Numerical validation is unavailable without ground truth reference data.',
        isScientificWarning: !isCalibrated
      };

    case 'line-of-sight':
      return {
        icon: Eye,
        title: 'Line of Sight',
        purpose: 'Evaluate whether terrain obstructs visibility between selected locations.',
        instructions: [
          '1. Select Point A (Observer location).',
          '2. Select Point B (Target location).',
          '3. Adjust height offsets and review obstruction analysis.'
        ],
        actionHint: 'Click observer & target',
        exitHint: 'Close',
        scientificNote: isCalibrated
          ? 'Geometric ray-casting analysis. Not a certified operational or aviation determination.'
          : 'Geometric analysis in relative units. Not a certified operational determination.',
        isScientificWarning: false
      };

    case 'route-profile':
      return {
        icon: TrendingUp,
        title: 'Route Profile',
        purpose: 'Inspect terrain change along a selected route profile.',
        instructions: [
          '1. Select route departure point (A).',
          '2. Select route arrival point (B).',
          '3. Review elevation gain, loss, and relief classification.'
        ],
        actionHint: 'Click route endpoints',
        exitHint: 'Close',
        scientificNote: isCalibrated
          ? 'Geometric terrain analysis. Does not model road networks, vehicles, or certified navigability.'
          : 'Geometric analysis in relative units. Does not model roads, vehicles, or certified navigability.',
        isScientificWarning: !isCalibrated
      };

    case 'terrain-screening':
      return {
        icon: Filter,
        title: 'Terrain Screening',
        purpose: 'Identify terrain areas that satisfy selected screening criteria.',
        instructions: [
          '1. Configure slope threshold and elevation bounds.',
          '2. Execute screening to compute suitable terrain cells.',
          '3. Inspect cell distribution and toggle the screening mask overlay.'
        ],
        actionHint: 'Configure criteria → run',
        exitHint: 'Close',
        scientificNote: isCalibrated
          ? 'Rule-based terrain filter. Not a certified engineering suitability assessment.'
          : 'Relative terrain: degree-based screening disabled; uses relative gradient threshold.',
        isScientificWarning: !isCalibrated
      };

    case 'first-person':
      return {
        icon: Footprints,
        title: 'First Person',
        purpose: 'Explore the reconstructed terrain from ground level.',
        instructions: [
          'W A S D / Arrows → Move across terrain',
          'Mouse Drag → Look around / rotate camera'
        ],
        actionHint: 'WASD + Mouse look',
        exitHint: 'Exit mode',
        scientificNote: 'Geometric ground-level vantage exploration; not a physical or photorealistic simulation.',
        isScientificWarning: false
      };

    case '3d':
      return {
        icon: Box,
        title: '3D Orbit',
        purpose: 'Explore the reconstructed surface from different viewing angles.',
        instructions: [
          'Drag to orbit camera around terrain.',
          'Scroll wheel to zoom in and out.'
        ],
        actionHint: 'Drag to orbit • Scroll to zoom',
        exitHint: 'Active',
        scientificNote: 'Full 3D orbital perspective.',
        isScientificWarning: false
      };

    case 'topographic':
      return {
        icon: Map,
        title: 'Topographic View',
        purpose: 'Inspect the terrain from an overhead perspective.',
        instructions: [
          'Overhead nadir view to examine overall terrain structure and elevation patterns.'
        ],
        actionHint: 'Top-down nadir inspection',
        exitHint: 'Return to 3D',
        scientificNote: 'Direct nadir orthogonal perspective.',
        isScientificWarning: false
      };

    default:
      return null;
  }
}

export const ToolGuidance: React.FC<ToolGuidanceProps> = ({
  tool,
  onClose,
  className = ''
}) => {
  const { scientificStatus } = useWorkspace();
  const isCalibrated = scientificStatus === 'CALIBRATED';

  const config = getGuidanceConfig(tool, isCalibrated, scientificStatus);
  if (!config) return null;

  const Icon = config.icon;

  return (
    <section
      aria-label={`${config.title} Guidance`}
      className={`p-2.5 bg-dw-panel/90 border border-dw-border-strong rounded-xs space-y-2 text-xs select-none ${className}`}
    >
      {/* Header: Icon + Tool Name + Close/Dismiss Affordance */}
      <div className="flex items-center justify-between pb-1.5 border-b border-dw-border-subtle/80">
        <div className="flex items-center space-x-1.5 text-dw-accent">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">
            {config.title}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-dw-text-muted hover:text-dw-text-primary p-0.5 rounded-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dw-accent"
            title={`Exit ${config.title} (Esc)`}
            aria-label={`Exit ${config.title}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Purpose: Single concise sentence */}
      <p className="text-[11px] font-sans text-dw-text-secondary leading-snug">
        {config.purpose}
      </p>

      {/* Instructions list */}
      <ul className="space-y-0.5 text-[10px] font-mono text-dw-text-muted">
        {config.instructions.map((step, idx) => (
          <li key={idx} className="flex items-start space-x-1.5 leading-tight">
            <span className="text-dw-accent font-semibold">•</span>
            <span>{step}</span>
          </li>
        ))}
      </ul>

      {/* Action and Keyboard Shortcut Hints */}
      <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-dw-border-subtle/60 text-dw-text-muted">
        <span className="text-dw-text-secondary truncate mr-2">{config.actionHint}</span>
        <span className="flex items-center space-x-1 shrink-0">
          <kbd className="px-1 py-0.2 bg-dw-base border border-dw-border-subtle rounded-xs text-[9px] font-mono text-dw-text-secondary">
            ESC
          </kbd>
          <span>{config.exitHint || 'Exit'}</span>
        </span>
      </div>

      {/* Scientific Note / Guardrail */}
      {config.scientificNote && (
        <div
          className={`text-[10px] font-mono flex items-start space-x-1.5 pt-1.5 border-t border-dw-border-subtle/50 ${
            config.isScientificWarning ? 'text-amber-400/90' : 'text-dw-text-muted'
          }`}
        >
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="leading-tight">{config.scientificNote}</span>
        </div>
      )}
    </section>
  );
};
