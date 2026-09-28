/**
 * DepthWizard — Terrain Intelligence Showcase Section (Refined V2.2)
 * Authority: docs/product/capabilities.md
 *
 * Editorial Bento showcase of the 6 core analytical capabilities:
 * 1. Continuous Elevation (Hypsometric colormap & contour isolines)
 * 2. Physical Slope (Horn gradient filter, degree angles vs relative fallback)
 * 3. Directional Hillshade (Lambertian reflectance, configurable solar azimuth)
 * 4. Cross-Section Transects (Continuous 2-point elevation slicing)
 * 5. Metric 3D Measurement (Raycast calipers, planimetric 2D vs Euclidean 3D vs ΔZ)
 * 6. First-Person Walkthrough (Eye-level observer with collision clamping)
 *
 * Prioritizes WHAT IT DOES + visual demonstration + concise explanation.
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Mountain, 
  Activity, 
  Sun, 
  Ruler, 
  Navigation,
  TrendingUp
} from 'lucide-react';

export const IntelligenceSection: React.FC = () => {
  return (
    <section id="capabilities" className="py-28 px-6 max-w-7xl mx-auto space-y-16 relative z-10">
      {/* Section Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center space-x-2 text-dw-accent font-mono text-xs uppercase tracking-widest font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-dw-accent" />
          <span>GEOSPATIAL INTELLIGENCE SUITE</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-dw-text-primary leading-tight">
          TERRAIN INTELLIGENCE & DERIVATIVES.
        </h2>
        <p className="text-lg sm:text-xl text-dw-text-secondary font-normal leading-relaxed">
          Extract actionable spatial intelligence with calibrated elevation probes, analytical slope mapping, directional solar illumination, and profile transects.
        </p>
      </div>

      {/* Asymmetric Editorial Bento Grid (6 Capabilities) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ==============================================================
            CARD 1: Continuous Elevation (Span 7 cols - Prominent Feature)
            ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-7 bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-dw-accent/50 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2 text-dw-accent font-semibold tracking-wider">
                <Mountain className="w-4 h-4" />
                <span>01 / SURFACE TOPOGRAPHY</span>
              </div>
              <span className="px-2 py-0.5 rounded-xs border border-dw-border-subtle bg-dw-panel text-[10px] text-dw-text-muted">
                FLOAT32 RASTER
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-dw-text-primary tracking-tight">
              Per-Pixel Continuous Elevation
            </h3>
            <p className="text-sm sm:text-base text-dw-text-secondary leading-relaxed font-sans max-w-xl">
              Renders continuous topography via a perceptually uniform geological colormap with dynamic elevation range queries and micro-relief visualization.
            </p>
          </div>

          {/* Visual Graphic: Hypsometric Elevation Colormap with Topographic Contours */}
          <div className="w-full h-44 rounded-xs border border-dw-border-subtle bg-[#080d14] relative overflow-hidden flex flex-col justify-between p-3.5 font-mono">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1b3a4b] via-[#2c5d63] via-[#7f9172] via-[#c99a6b] to-[#f0ebd8] opacity-80" />
            
            <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 400 160" preserveAspectRatio="none">
              <path d="M 0 120 Q 80 80 160 110 T 320 70 T 400 90" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M 0 90 Q 90 60 180 80 T 340 40 T 400 60" fill="none" stroke="#ffffff" strokeWidth="1.2" />
              <path d="M 0 60 Q 100 30 200 50 T 360 20 T 400 40" fill="none" stroke="#ffffff" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10 flex items-center justify-between text-xs text-white font-semibold">
              <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded-xs border border-white/20">
                SCENARIO: 1,420m .. 1,985m
              </span>
              <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded-xs border border-white/20">
                GEOLOGICAL COLORMAP
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[10px] text-white/95 font-mono">
              <span className="bg-black/50 px-2 py-0.5 rounded-xs">VALLEY BASIN</span>
              <span className="bg-black/50 px-2 py-0.5 rounded-xs">FOOTHILLS</span>
              <span className="bg-black/50 px-2 py-0.5 rounded-xs">RIDGE CREST</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dw-border-subtle font-mono text-xs">
            <div>
              <div className="text-[10px] text-dw-text-muted uppercase">SURFACE STORAGE</div>
              <div className="font-semibold text-dw-text-primary">Continuous Float32</div>
            </div>
            <div>
              <div className="text-[10px] text-dw-text-muted uppercase">VERTICAL EXAGGERATION</div>
              <div className="font-semibold text-dw-text-primary">0.1× to 3.0× Interactive</div>
            </div>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 2: Physical Slope Gradient (Span 5 cols)
            ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-5 bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold tracking-wider">
                <Activity className="w-4 h-4" />
                <span>02 / TERRAIN GRADIENT</span>
              </div>
              <span className="px-2 py-0.5 rounded-xs border border-dw-border-subtle bg-dw-panel text-[10px] text-dw-text-muted">
                HORN 3×3
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-dw-text-primary tracking-tight">
              Physical Slope Gradient
            </h3>
            <p className="text-sm sm:text-base text-dw-text-secondary leading-relaxed font-sans">
              Calculates slope in true degrees for calibrated terrains, with clean fallback to relative gradient for unanchored imagery.
            </p>
          </div>

          {/* Slope Bands for Terrain Screening */}
          <div className="w-full h-44 rounded-xs border border-dw-border-subtle bg-[#090d13] p-3.5 flex flex-col justify-between font-mono">
            <div className="flex items-center justify-between text-xs text-dw-text-muted">
              <span>SLOPE BANDS FOR TERRAIN SCREENING</span>
              <span className="text-amber-400 font-semibold">MAX: 42.8°</span>
            </div>

            <div className="h-14 rounded-xs border border-dw-border-subtle bg-gradient-to-r from-[#2d5a4c] via-[#6b8e23] via-[#d48b38] to-[#9b2226] relative flex items-center justify-center shadow-md">
              <span className="px-3 py-1 bg-black/75 backdrop-blur-xs rounded-xs border border-white/20 text-white text-xs font-semibold">
                ANALYTICAL SLOPE FILTER
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-mono">
              <div className="p-1 rounded-xs bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
                LOW (0°–15°)
              </div>
              <div className="p-1 rounded-xs bg-amber-950/40 border border-amber-500/30 text-amber-300">
                MODERATE (15°–30°)
              </div>
              <div className="p-1 rounded-xs bg-rose-950/40 border border-rose-500/30 text-rose-300">
                STEEP (30°+)
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-dw-border-subtle font-mono text-xs flex justify-between">
            <span className="text-dw-text-muted">UNIT TRUTH:</span>
            <span className="font-semibold text-dw-text-primary">Physical Degrees or Relative</span>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 3: Directional Hillshade (Span 5 cols)
            ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-5 bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-dw-border-strong transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2 text-dw-text-primary font-semibold tracking-wider">
                <Sun className="w-4 h-4 text-dw-accent" />
                <span>03 / ILLUMINATION</span>
              </div>
              <span className="px-2 py-0.5 rounded-xs border border-dw-border-subtle bg-dw-panel text-[10px] text-dw-text-muted">
                LAMBERTIAN
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-dw-text-primary tracking-tight">
              Directional Hillshade
            </h3>
            <p className="text-sm sm:text-base text-dw-text-secondary leading-relaxed font-sans">
              Simulates solar relief at configurable azimuth and altitude, revealing subtle geomorphic scarps and structural facades.
            </p>
          </div>

          {/* Micro-Geomorphic Shadow Relief Graphic */}
          <div className="w-full h-44 rounded-xs border border-dw-border-subtle bg-[#0a0e14] p-3.5 flex flex-col justify-between font-mono">
            <div className="flex justify-between items-center text-xs text-dw-text-muted">
              <span>SOLAR AZIMUTH: 315° NW</span>
              <span className="text-dw-text-secondary font-semibold">ALTITUDE: 45°</span>
            </div>

            <div className="h-16 rounded-xs border border-dw-border-subtle bg-gradient-to-r from-[#0d1117] via-[#52606d] to-[#e6edf3] relative flex items-center justify-center shadow-md">
              <span className="px-3 py-1 bg-black/75 backdrop-blur-xs rounded-xs border border-white/20 text-white text-xs font-semibold">
                ANALYTICAL SOLAR RELIEF
              </span>
            </div>

            <div className="flex justify-between text-[10px] text-dw-text-muted">
              <span>DEEP SHADOW</span>
              <span>DIFFUSE MIDTONE</span>
              <span>SUNLIT FACET</span>
            </div>
          </div>

          <div className="pt-3 border-t border-dw-border-subtle font-mono text-xs flex justify-between">
            <span className="text-dw-text-muted">REFLECTANCE:</span>
            <span className="font-semibold text-dw-text-primary">Cosine Shading Angle</span>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 4: Cross-Section Transects (Span 7 cols - Prominent Transect)
            ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-7 bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-dw-accent/50 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2 text-dw-accent font-semibold tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>04 / TERRAIN TRANSECTS</span>
              </div>
              <span className="px-2 py-0.5 rounded-xs border border-dw-border-subtle bg-dw-panel text-[10px] text-dw-text-muted">
                2-POINT SLICING
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-dw-text-primary tracking-tight">
              Continuous Cross-Section Profiles
            </h3>
            <p className="text-sm sm:text-base text-dw-text-secondary leading-relaxed font-sans max-w-xl">
              Extracts continuous elevation transects between arbitrary surface coordinates with distance-vs-elevation curves and relief deltas.
            </p>
          </div>

          {/* Interactive Transect Profile Graph Line */}
          <div className="w-full h-44 rounded-xs border border-dw-border-subtle bg-[#080d14] p-3.5 flex flex-col justify-between font-mono">
            <div className="flex justify-between items-center text-xs text-dw-text-muted">
              <span>TRANSECT: POINT A → POINT B</span>
              <span className="text-dw-accent font-semibold">DISTANCE: 452.5m · ΔZ: +259.5m</span>
            </div>

            <div className="h-20 w-full relative flex items-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 320 80">
                <path
                  d="M 15 65 Q 80 60 120 30 T 210 40 T 305 12"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                />
                <circle cx="15" cy="65" r="4" fill="#0284c7" />
                <circle cx="305" cy="12" r="4" fill="#38bdf8" />
                <text x="20" y="58" fill="#94a3b8" fontSize="8">START [1,420m]</text>
                <text x="245" y="10" fill="#38bdf8" fontSize="8">PEAK [1,680m]</text>
              </svg>
            </div>

            <div className="flex justify-between text-[10px] text-dw-text-disabled">
              <span>0m ORIGIN</span>
              <span>226m MIDPOINT</span>
              <span>452.5m DESTINATION</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dw-border-subtle font-mono text-xs">
            <div>
              <div className="text-[10px] text-dw-text-muted uppercase">INTERPOLATION</div>
              <div className="font-semibold text-dw-text-primary">Bilinear Surface Sampling</div>
            </div>
            <div>
              <div className="text-[10px] text-dw-text-muted uppercase">DATA EXPORT</div>
              <div className="font-semibold text-dw-text-primary">CSV / GeoJSON Profile</div>
            </div>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 5: Metric 3D Measurement (Span 6 cols)
            ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-6 bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold tracking-wider">
                <Ruler className="w-4 h-4" />
                <span>05 / SPATIAL PROBES</span>
              </div>
              <span className="px-2 py-0.5 rounded-xs border border-dw-border-subtle bg-dw-panel text-[10px] text-dw-text-muted">
                RAYCAST CALIPERS
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-dw-text-primary tracking-tight">
              Metric 3D Measurement
            </h3>
            <p className="text-sm sm:text-base text-dw-text-secondary leading-relaxed font-sans">
              Raycasted measuring probe providing instant 2D planimetric distance, 3D Euclidean distance, and vertical elevation delta ΔZ between landmarks.
            </p>
          </div>

          {/* Interactive Raycast Caliper Display */}
          <div className="w-full h-36 rounded-xs border border-dw-border-subtle bg-[#080d14] p-4 flex flex-col justify-between font-mono">
            <div className="flex justify-between items-center text-xs text-dw-text-muted">
              <span>3D RAYCAST CALIPERS</span>
              <span className="text-emerald-400 font-semibold">EUCLIDEAN 3D: 334.8m</span>
            </div>

            <div className="space-y-1 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-dw-panel border border-dw-border-strong rounded-xs text-xs text-dw-text-primary">
                <span>POINT A</span>
                <span className="text-dw-accent">→</span>
                <span>POINT B</span>
              </div>
              <div className="text-xs text-dw-text-secondary">
                Planimetric 2D: 212.6m · Vertical ΔZ: 259.5m · Slope: 28.5°
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-dw-text-disabled">
              <span>SURFACE PICKING</span>
              <span>INVARIANT TO EXAGGERATION</span>
            </div>
          </div>

          <div className="pt-3 border-t border-dw-border-subtle font-mono text-xs flex justify-between">
            <span className="text-dw-text-muted">CALIPER MARKERS:</span>
            <span className="font-semibold text-dw-text-primary">Real-Time Mesh Anchors</span>
          </div>
        </motion.div>

        {/* ==============================================================
            CARD 6: First-Person Observer (Span 6 cols)
            ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-6 bg-dw-surface/60 border border-dw-border-strong rounded-xs p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group hover:border-dw-accent/50 transition-colors"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2 text-dw-accent font-semibold tracking-wider">
                <Navigation className="w-4 h-4" />
                <span>06 / OBSERVER VIEWPOINT</span>
              </div>
              <span className="px-2 py-0.5 rounded-xs border border-dw-border-subtle bg-dw-panel text-[10px] text-dw-text-muted">
                2.0m AGL
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-dw-text-primary tracking-tight">
              First-Person Exploration
            </h3>
            <p className="text-sm sm:text-base text-dw-text-secondary leading-relaxed font-sans">
              Ground-relative observer mode allows walking along ridgelines and valleys to evaluate visual occlusion and sightlines with terrain collision clamping.
            </p>
          </div>

          {/* Eye-level HUD Graphic */}
          <div className="w-full h-36 rounded-xs border border-dw-border-subtle bg-[#080d14] p-4 flex flex-col justify-between font-mono">
            <div className="flex justify-between items-center text-xs text-dw-text-muted">
              <span>GROUND PERSPECTIVE</span>
              <span className="text-dw-accent font-semibold">SURFACE CLAMPED</span>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <div className="w-10 h-10 rounded-full border border-dw-accent/50 flex items-center justify-center text-dw-accent bg-dw-accent/10">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-dw-text-primary font-semibold">EYE-LEVEL TERRAIN RECONNAISSANCE</div>
                <div className="text-[10px] text-dw-text-muted">WASD / Arrow navigation with elevation clamping</div>
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-dw-text-disabled">
              <span>TACTICAL SIGHTLINES</span>
              <span>LOW-ALTITUDE PERSPECTIVE</span>
            </div>
          </div>

          <div className="pt-3 border-t border-dw-border-subtle font-mono text-xs flex justify-between">
            <span className="text-dw-text-muted">CONTROLS:</span>
            <span className="font-semibold text-dw-text-primary">Pointer Lock & Clamped Walkthrough</span>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
