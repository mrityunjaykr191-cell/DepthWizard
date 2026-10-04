import React from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ToolNavigation } from './ToolNavigation';
import { TerrainViewport } from './TerrainViewport';
import { InspectorPanel } from './InspectorPanel';
import { ImageIngestionModal } from './input/ImageIngestionModal';
import { ExportModal } from './export/ExportModal';
import { ReferenceComparisonModal } from './ReferenceComparisonModal';

export const WorkspaceShell: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-dw-base overflow-hidden selection:bg-dw-accent selection:text-white">
      {/* Workspace Header */}
      <WorkspaceHeader />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tool Navigation Rail */}
        <ToolNavigation />

        {/* Central Terrain Viewport */}
        <TerrainViewport />

        {/* Right Contextual Inspector Panel */}
        <InspectorPanel />
      </div>

      {/* Image Ingestion Modal / Technical Overlay */}
      <ImageIngestionModal />

      {/* Geospatial Export & Report Modal */}
      <ExportModal />

      {/* GAMUS Paired Reference Comparison Modal */}
      <ReferenceComparisonModal />
    </div>
  );
};
