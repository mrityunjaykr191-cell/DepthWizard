/**
 * DepthWizard — Continuous Spatial Background System
 * Authority: docs/design/design-system.md
 *
 * Implements a continuous technical cartographic terrain sheet across all sections:
 * - Subtle topographic contour curves etched across edges
 * - Very subtle coordinate/grid lines (faded towards center, zero competing clutter)
 * - REMOVED: all repeated '+' cross markers
 * - Soft ambient radial lighting (electric cyan/navy in dark mode; soft neutral in light mode)
 * - Tonal balance for both themes:
 *   - Dark: deep graphite/navy base (#090d12 / #0f151d)
 *   - Light: cool off-white / pale blue-gray (#f8fafc / #f1f5f9)
 */

import React from 'react';

export const SpatialBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
      {/* 1. Primary Ambient Radial Illumination */}
      {/* Dark mode: controlled cyan-blue pool top right & slate pool bottom left. Light mode: faint cool neutral. */}
      <div className="absolute -top-48 -right-48 w-[640px] h-[640px] rounded-full bg-dw-accent/5 dark:bg-dw-accent/8 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-[520px] h-[520px] rounded-full bg-sky-500/5 dark:bg-cyan-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-48 right-1/4 w-[640px] h-[640px] rounded-full bg-dw-accent/5 dark:bg-dw-accent/6 blur-[160px] pointer-events-none" />

      {/* 2. Technical Coordinate Map Grid (extremely faint, faded towards center) */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] text-slate-900 dark:text-slate-100"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '96px 96px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, transparent 25%, black 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, transparent 25%, black 80%)'
        }}
      />

      {/* 3. Fine Topographic Isolines (Margins & Edge Accents Only) */}
      <svg 
        className="absolute top-0 right-0 w-[540px] h-[540px] opacity-[0.05] dark:opacity-[0.10] text-slate-700 dark:text-dw-accent overflow-visible"
        viewBox="0 0 500 500" 
        fill="none"
      >
        <path d="M 100 0 C 180 80 280 120 500 150" stroke="currentColor" strokeWidth="1" />
        <path d="M 50 0 C 140 110 250 170 500 220" stroke="currentColor" strokeWidth="1" />
        <path d="M 0 0 C 100 140 220 220 500 290" stroke="currentColor" strokeWidth="1" />
        <path d="M 0 80 C 80 180 190 270 500 360" stroke="currentColor" strokeWidth="1" />
        <path d="M 0 160 C 60 220 160 320 500 430" stroke="currentColor" strokeWidth="1" />
      </svg>

      <svg 
        className="absolute bottom-0 left-0 w-[540px] h-[540px] opacity-[0.04] dark:opacity-[0.08] text-slate-700 dark:text-dw-accent overflow-visible"
        viewBox="0 0 500 500" 
        fill="none"
      >
        <path d="M 0 350 C 220 380 320 420 500 500" stroke="currentColor" strokeWidth="1" />
        <path d="M 0 280 C 250 330 360 390 500 450" stroke="currentColor" strokeWidth="1" />
        <path d="M 0 210 C 280 280 400 360 500 400" stroke="currentColor" strokeWidth="1" />
        <path d="M 0 140 C 310 230 440 330 500 350" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
};
