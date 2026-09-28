/**
 * DepthWizard — Product Landing Footer (Refined V2.2)
 * Authority: docs/engineering/deployment.md
 *
 * Clean product-facing footer without hackathon identifiers.
 */

import React from 'react';
import { Mountain, Shield, Terminal } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-dw-border-subtle bg-dw-surface/80 px-6 py-8 font-mono text-xs text-dw-text-muted space-y-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-dw-text-primary font-bold">
            <Mountain className="w-4 h-4 text-dw-accent" />
            <span>DEPTHWIZARD</span>
            <span className="text-[10px] text-dw-text-disabled font-normal">|</span>
            <span className="text-[10px] text-dw-text-secondary font-normal">OVERHEAD TERRAIN RECONSTRUCTION</span>
          </div>
          <div className="text-xs text-dw-text-secondary font-sans max-w-md">
            Single-view optical satellite and remote-sensing imagery transformed into 3D digital surface models, physical slope analytics, and standard geospatial exports.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xs bg-dw-base border border-dw-border-subtle">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-dw-text-primary">100% Local Inference</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xs bg-dw-base border border-dw-border-subtle">
            <Terminal className="w-3.5 h-3.5 text-dw-accent" />
            <span className="text-dw-text-primary">Terrain Intelligence System</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-4 border-t border-dw-border-subtle/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px]">
        <div>
          FASTAPI ENGINE + NATIVE THREE.JS WEBGL ARCHITECTURE
        </div>
        <div className="text-dw-text-disabled">
          DEPTHWIZARD TERRAIN INTELLIGENCE PLATFORM
        </div>
      </div>
    </footer>
  );
};
