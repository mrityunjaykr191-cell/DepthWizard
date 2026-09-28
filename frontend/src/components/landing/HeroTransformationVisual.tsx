/**
 * DepthWizard — Hero Transformation Visual (Refined V2.3.1)
 * Authority: docs/design/design-system.md
 *
 * Core Concept:
 * ONE CONTINUOUS SPATIAL OBJECT illustrating the DepthWizard transformation:
 * OPTICAL INPUT → DEPTH FIELD → RECONSTRUCTED TERRAIN
 *
 * Visual Hierarchy:
 * 1. Reconstructed 3D terrain is the primary visual focal point (dominating right side)
 * 2. Continuous depth disparity transformation in center
 * 3. Compact optical satellite input on left
 *
 * Polished for Light & Dark modes:
 * - Reduced micro-annotations (only 3 quiet labels: OPTICAL INPUT, DEPTH FIELD, RECONSTRUCTED TERRAIN)
 * - Light mode: muted slate, charcoal/navy contours, subdued blue, warm neutral relief, no neon/white wash
 * - Dark mode: deep navy/graphite, restrained cyan/sky-blue ridgeline crests, soft diffuse shadows
 * - Soft radial vignette masking with zero card or rectangular boundary
 */

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

export const HeroTransformationVisual: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  // Mouse coordinates for gentle spatial parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Damped springs for fluid, non-jarring parallax
  const springX = useSpring(mouseX, { stiffness: 45, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 45, damping: 25 });

  const rotateX = useTransform(springY, [-300, 300], [9, 3]);
  const rotateY = useTransform(springX, [-300, 300], [-6, 6]);
  const translateX = useTransform(springX, [-300, 300], [-8, 8]);
  const translateY = useTransform(springY, [-300, 300], [-5, 5]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-[560px] flex items-center justify-center pointer-events-none select-none overflow-visible">
      {/* 1. Ambient Lighting (dark mode has subtle cyan/navy pool; light mode has very faint cool slate) */}
      <div className="absolute w-[480px] h-[480px] lg:w-[600px] lg:h-[600px] rounded-full bg-dw-accent/6 dark:bg-dw-accent/10 blur-[140px] -top-8 -right-8 pointer-events-none" />
      <div className="absolute w-[340px] h-[340px] rounded-full bg-sky-500/4 dark:bg-cyan-500/5 blur-[100px] bottom-0 right-1/4 pointer-events-none" />

      {/* 2. Parallax Vector Composition with Soft Radial Vignette Mask (No card border) */}
      <motion.div
        style={{
          rotateX: reducedMotion ? 6 : rotateX,
          rotateY: reducedMotion ? 0 : rotateY,
          x: reducedMotion ? 0 : translateX,
          y: reducedMotion ? 0 : translateY,
          transformPerspective: 1200,
          maskImage: 'radial-gradient(ellipse at 52% 50%, black 52%, transparent 93%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 52% 50%, black 52%, transparent 93%)'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[840px] aspect-[16/10] flex items-center justify-center"
      >
        <svg
          viewBox="0 0 920 540"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Horizontal Surface Transition across the continuous geographic sheet */}
            <linearGradient id="transSurfaceDark" x1="100" y1="260" x2="840" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#0c1527" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="transSurfaceLight" x1="100" y1="260" x2="840" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.85" />
              <stop offset="30%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#64748b" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
            </linearGradient>

            {/* Continuous Isoline Elevation Gradient */}
            <linearGradient id="transIsolineDark" x1="260" y1="260" x2="840" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.25" />
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="transIsolineLight" x1="260" y1="260" x2="840" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.35" />
              <stop offset="40%" stopColor="#0284c7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Hillshade Elevation Facet Shading for 3D Mountain Massif */}
            <linearGradient id="massifShadeDark" x1="480" y1="110" x2="820" y2="440" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="35%" stopColor="#0284c7" stopOpacity="0.18" />
              <stop offset="75%" stopColor="#020617" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="massifShadeLight" x1="480" y1="110" x2="820" y2="440" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.65" />
              <stop offset="75%" stopColor="#64748b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Coordinate Reference Frame (Subtle dashed axes) */}
          <g className="text-slate-400 dark:text-slate-600 opacity-20" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3">
            <line x1="100" y1="130" x2="840" y2="130" />
            <line x1="100" y1="270" x2="840" y2="270" />
            <line x1="100" y1="410" x2="840" y2="410" />
            <line x1="270" y1="90" x2="270" y2="450" />
            <line x1="500" y1="90" x2="500" y2="450" />
          </g>

          {/* ==============================================================
              CONTINUOUS SPATIAL SHEET (Left Optical -> Center Depth -> Right 3D)
              ============================================================== */}
          
          {/* Main Continuous Base Sheet */}
          <path
            d="M 120,200 L 270,170 Q 420,130 540,110 Q 690,50 830,85 L 810,445 Q 670,455 530,430 Q 380,420 260,405 L 110,415 Z"
            className="fill-[url(#transSurfaceLight)] dark:fill-[url(#transSurfaceDark)] stroke-slate-400/40 dark:stroke-slate-700/40"
            strokeWidth="1"
          />

          {/* ==============================================================
              1. LEFT REGION: OPTICAL SATELLITE INPUT
              Compact planar parcel texture representing single-view overhead capture
              ============================================================== */}
          <g id="optical-region">
            {/* Agricultural Land Parcels & Geometric Fields */}
            <polygon points="120,205 190,192 185,255 116,265" className="fill-emerald-800/25 dark:fill-emerald-900/35 stroke-emerald-600/30" strokeWidth="0.75" />
            <polygon points="195,191 265,178 260,242 190,254" className="fill-amber-700/20 dark:fill-amber-900/30 stroke-amber-600/30" strokeWidth="0.75" />
            <polygon points="115,272 184,262 178,328 110,336" className="fill-slate-400/25 dark:fill-slate-700/45 stroke-slate-500/30" strokeWidth="0.75" />
            <polygon points="189,261 259,249 253,315 183,326" className="fill-emerald-700/20 dark:fill-emerald-950/45 stroke-emerald-600/30" strokeWidth="0.75" />
            <polygon points="109,343 177,334 172,402 104,409" className="fill-amber-800/20 dark:fill-amber-950/35 stroke-amber-600/25" strokeWidth="0.75" />
            <polygon points="182,333 252,322 246,389 176,399" className="fill-slate-300/35 dark:fill-slate-800/55 stroke-slate-500/30" strokeWidth="0.75" />

            {/* Rural Roads Connecting Parcels */}
            <path d="M 98,268 L 270,240" className="stroke-slate-400/60 dark:stroke-slate-500/60" strokeWidth="1.2" />
            <path d="M 188,188 L 175,404" className="stroke-slate-400/60 dark:stroke-slate-500/60" strokeWidth="1.2" />

            {/* Natural Drainage Creek Arc */}
            <path d="M 130,200 Q 155,290 220,340 T 250,395" className="stroke-sky-600/50 dark:stroke-sky-400/50" strokeWidth="1" fill="none" strokeDasharray="3 2" />

            {/* Single Subtle Label */}
            <text x="120" y="175" className="fill-slate-600 dark:fill-slate-400 font-mono text-[10px] tracking-wider uppercase font-semibold">
              OPTICAL INPUT
            </text>
          </g>

          {/* ==============================================================
              2. CENTER REGION: DISPARITY FIELD TRANSITION
              Smooth texture dissolve with emerging elevation isolines
              ============================================================== */}
          <g id="disparity-region">
            {/* Emerging Elevation Disparity Isolines */}
            <g className="stroke-[url(#transIsolineLight)] dark:stroke-[url(#transIsolineDark)]" fill="none">
              <path d="M 270,200 Q 380,180 500,165" strokeWidth="1" strokeOpacity="0.45" />
              <path d="M 270,230 Q 390,205 510,190" strokeWidth="1.1" strokeOpacity="0.55" />
              <path d="M 270,260 Q 400,230 520,220" strokeWidth="1.2" strokeOpacity="0.65" />
              <path d="M 268,295 Q 405,265 525,255" strokeWidth="1.3" strokeOpacity="0.7" />
              <path d="M 266,330 Q 395,305 520,295" strokeWidth="1.2" strokeOpacity="0.6" />
              <path d="M 264,365 Q 385,345 510,335" strokeWidth="1.1" strokeOpacity="0.5" />
            </g>

            {/* Single Subtle Label */}
            <text x="355" y="145" className="fill-slate-600 dark:fill-slate-400 font-mono text-[10px] tracking-wider uppercase font-semibold">
              DEPTH FIELD
            </text>
          </g>

          {/* ==============================================================
              3. RIGHT REGION: RECONSTRUCTED 3D TERRAIN (PRIMARY FOCAL POINT)
              Dramatic perspective mountain massif with analytical hillshade,
              prominent ridge crests, and layered elevation contours
              ============================================================== */}
          <g id="terrain-focal-point">
            {/* Base 3D Massif Shading */}
            <path
              d="M 520,110 Q 670,45 830,85 L 810,445 Q 670,455 530,430 Z"
              className="fill-[url(#massifShadeLight)] dark:fill-[url(#massifShadeDark)] stroke-dw-accent/50"
              strokeWidth="1.2"
            />

            {/* Primary High-Relief Ridge Facet (Sunlit Northwest Aspect) */}
            <path
              d="M 540,190 Q 650,90 770,115 L 730,225 Q 630,195 540,190 Z"
              className="fill-sky-400/25 dark:fill-sky-400/18 stroke-dw-accent/80"
              strokeWidth="1.6"
            />

            {/* Shadowed Southeast Escarpment Wall */}
            <path
              d="M 540,190 L 730,225 L 755,335 Q 630,345 525,295 Z"
              className="fill-slate-500/35 dark:fill-slate-950/80 stroke-slate-500/50 dark:stroke-dw-border-strong"
              strokeWidth="1.2"
            />

            {/* Secondary Foothill / Knoll Peak */}
            <path
              d="M 610,325 Q 710,270 790,295 L 765,395 Q 670,405 590,375 Z"
              className="fill-sky-500/20 dark:fill-sky-500/12 stroke-dw-accent/70"
              strokeWidth="1.4"
            />

            {/* Topographic 3D Elevation Contours Climbing the Massif */}
            <g className="stroke-slate-900 dark:stroke-cyan-400" fill="none">
              <path d="M 515,225 C 595,205 670,155 760,170 C 785,175 800,190 815,205" strokeWidth="1.3" strokeOpacity="0.8" />
              <path d="M 520,260 C 605,240 680,190 770,205 C 790,210 805,225 820,240" strokeWidth="1.4" strokeOpacity="0.85" />
              <path d="M 525,295 C 615,275 690,225 780,240 C 800,245 815,260 825,275" strokeWidth="1.5" strokeOpacity="0.9" />
              <path d="M 530,330 C 625,310 700,265 790,280 C 805,285 820,300 830,315" strokeWidth="1.4" strokeOpacity="0.85" />
            </g>

            {/* High-Contrast Peak Ridgeline Crests */}
            <path
              d="M 520,155 Q 640,65 790,95"
              className="stroke-dw-accent dark:stroke-sky-300"
              strokeWidth="2.8"
              fill="none"
            />
            <path
              d="M 540,190 Q 650,90 770,115"
              className="stroke-dw-accent dark:stroke-sky-300"
              strokeWidth="2.2"
              fill="none"
            />

            {/* Single Subtle Label */}
            <text x="640" y="70" className="fill-dw-accent font-mono text-[10px] tracking-wider uppercase font-bold">
              RECONSTRUCTED TERRAIN
            </text>
          </g>

          {/* Continuous Flow Arc along the lower edge (grounding the single continuous object) */}
          <path
            d="M 110,415 Q 380,420 530,430 Q 670,455 810,445"
            className="stroke-dw-accent/40"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      </motion.div>
    </div>
  );
};
