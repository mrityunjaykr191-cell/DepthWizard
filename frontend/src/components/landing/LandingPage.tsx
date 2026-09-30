/**
 * DepthWizard — Product Landing Page (Refined V2.3)
 * Authority: docs/design/design-system.md
 *
 * Implements a confident, editorial scientific/geospatial product experience:
 * 1. Controlled 3-line editorial headline (FROM ONE \n IMAGE. \n TO TERRAIN.) within 72–92px desktop target
 * 2. New continuous Hero Transformation Visual: Optical Image -> Disparity Field -> 3D Terrain
 * 3. Seamless spatial integration without card borders or rectangular boundaries
 * 4. Persistent scroll-aware navigation header
 * 5. Authentic mathematical typography in Transformation section
 * 6. Asymmetrical Bento Terrain Intelligence showcase
 * 7. Disciplined 4-state capability gating: "KNOW WHAT THE DATA KNOWS."
 * 8. Pure product-facing identity (all hackathon / demo labels removed)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router/Router';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';
import { SpatialBackground } from './SpatialBackground';
import { HeroProductPreview } from './HeroProductPreview';
import { TransformationSection } from './TransformationSection';
import { IntelligenceSection } from './IntelligenceSection';
import { ScientificIntegritySection } from './ScientificIntegritySection';
import { ArrowRight, Binary, ChevronRight, ChevronDown, Mountain } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigate } = useRouter();

  // Scroll-linked progress for subtle technical timeline tracking
  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Fade out continuation cue smoothly as user begins scrolling down
  const scrollCueOpacity = useTransform(scrollY, [0, 80], [1, 0]);

  // Respect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const scrollToNextSection = () => {
    document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-dw-base text-dw-text-primary flex flex-col justify-between selection:bg-dw-accent selection:text-white font-sans antialiased overflow-x-hidden relative">
      {/* Top Reading/Scroll Progress Indicator */}
      <motion.div 
        style={{ scaleX }} 
        className="fixed top-0 left-0 right-0 h-[2px] bg-dw-accent z-50 origin-left" 
      />

      {/* Continuous Spatial / Cartographic Atmosphere Background */}
      <SpatialBackground />

      {/* Persistent Navigation Header */}
      <LandingHeader />

      {/* Main Content Flow */}
      <main className="flex-1 flex flex-col relative z-10">
        
        {/* ===================================================================
            1. HERO SECTION (Controlled 3-Line Headline + Transformation Visual)
            =================================================================== */}
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 sm:pt-24 lg:pt-28 pb-14 lg:pb-16 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full">
            
            {/* Left Column: Command & Content */}
            <motion.div 
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 space-y-6 z-10"
            >
              {/* Technical Eyebrow */}
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-dw-surface/80 border border-dw-border-strong rounded-xs text-[11px] font-mono text-dw-accent shadow-xs">
                <Binary className="w-3.5 h-3.5 text-dw-accent" />
                <span className="tracking-widest uppercase font-semibold">GEOSPATIAL ELEVATION PLATFORM</span>
              </div>

              {/* Controlled 3-Line Editorial Headline */}
              <div className="space-y-0.5">
                <h1 className="text-[clamp(2.75rem,5.2vw,5.5rem)] font-black tracking-tight leading-[0.98] select-none text-balance">
                  <span className="block text-dw-text-primary whitespace-nowrap">FROM ONE</span>
                  <span className="block text-dw-text-primary">IMAGE.</span>
                  <span className="block text-dw-accent">TO TERRAIN.</span>
                </h1>
              </div>

              {/* Supporting Copy (18–20px desktop) */}
              <p className="text-lg sm:text-xl text-dw-text-secondary leading-relaxed font-normal text-pretty max-w-xl">
                Reconstruct and explore 3D terrain from single-view optical imagery. Extract quantitative slope gradients, directional solar relief, and verified elevation profiles.
              </p>

              {/* Primary Call to Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/workspace')}
                  className="px-7 py-4 bg-dw-accent hover:bg-dw-accent-hover text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-xs transition-colors flex items-center justify-center space-x-2.5 shadow-md focus-visible:outline-none"
                >
                  <span>OPEN WORKSPACE</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <div className="text-xs font-mono text-dw-text-muted">
                  <div className="text-dw-text-primary font-semibold tracking-wider uppercase text-[11px]">
                    SINGLE-VIEW OPTICAL
                  </div>
                  <div className="text-dw-text-secondary text-[11px]">
                    TERRAIN INTELLIGENCE
                  </div>
                </div>
              </div>

              {/* Supporting Product-Status Strip */}
              <div className="pt-5 border-t border-dw-border-subtle flex items-center space-x-1.5 sm:space-x-2 font-mono text-[10px] sm:text-xs text-dw-text-muted overflow-x-auto whitespace-nowrap">
                <span className="px-2 py-0.5 rounded-xs bg-dw-surface border border-dw-border-subtle text-dw-text-secondary font-semibold">
                  OPTICAL INPUT
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-dw-text-disabled shrink-0" />
                <span className="px-2 py-0.5 rounded-xs bg-dw-surface border border-dw-border-subtle text-dw-text-secondary font-semibold">
                  RELATIVE DEPTH
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-dw-accent shrink-0" />
                <span className="px-2 py-0.5 rounded-xs bg-dw-accent/15 border border-dw-accent/40 text-dw-accent font-semibold shadow-xs">
                  RECONSTRUCTED TERRAIN
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-dw-accent shrink-0" />
                <button
                  onClick={scrollToNextSection}
                  className="px-2 py-0.5 rounded-xs bg-dw-surface border border-dw-border-subtle hover:border-dw-accent/50 text-dw-text-secondary hover:text-dw-accent font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer group"
                  title="Explore Analytical Progression"
                >
                  <span>ANALYSIS</span>
                  <ChevronDown className="w-3 h-3 text-dw-accent group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Right Column: Interactive Product Hero (Optical -> Depth -> 3D Terrain) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="lg:col-span-6 w-full flex items-center justify-center"
            >
              <HeroProductPreview />
            </motion.div>

          </div>

          {/* Subtle Scroll Continuation Cue (Visual Handoff: Hero -> Analytical Progression) */}
          <motion.div
            style={{ opacity: scrollCueOpacity }}
            className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-20 select-none"
          >
            <button
              onClick={scrollToNextSection}
              className="flex flex-col items-center space-y-1 group cursor-pointer focus-visible:outline-none"
              aria-label="Scroll to Analytical Progression"
            >
              <span className="font-mono text-[9px] tracking-widest uppercase text-dw-text-muted group-hover:text-dw-accent transition-colors">
                SCROLL TO EXPLORE
              </span>
              <div className="w-[1px] h-5 bg-gradient-to-b from-dw-border-strong via-dw-accent to-dw-border-subtle group-hover:via-dw-accent-hover transition-colors" />
              <motion.div
                animate={reducedMotion ? {} : { y: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              >
                <ChevronDown className="w-3.5 h-3.5 text-dw-text-muted group-hover:text-dw-accent transition-colors -mt-1" />
              </motion.div>
            </button>
          </motion.div>
        </section>

        {/* ===================================================================
            2. TRANSFORMATION (Animated 4-Stage Editorial Pipeline)
            =================================================================== */}
        <div className="border-t border-dw-border-subtle bg-dw-surface/20 relative">
          <TransformationSection />
        </div>

        {/* ===================================================================
            3. TERRAIN INTELLIGENCE (Asymmetric Bento Analytics Showcase)
            =================================================================== */}
        <div className="border-t border-dw-border-subtle relative">
          <IntelligenceSection />
        </div>

        {/* ===================================================================
            4. SCIENTIFIC INTEGRITY (Disciplined 4-State Truth Model)
            =================================================================== */}
        <div className="border-t border-dw-border-subtle bg-dw-surface/20 relative">
          <ScientificIntegritySection />
        </div>

        {/* ===================================================================
            5. FINAL CTA SECTION ("EXPLORE THE TERRAIN.")
            =================================================================== */}
        <section className="py-28 px-6 border-t border-dw-border-subtle relative overflow-hidden bg-gradient-to-b from-dw-base via-dw-surface/40 to-dw-base">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute w-[600px] h-[400px] rounded-full bg-dw-accent/10 blur-[130px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-dw-panel border border-dw-border-strong rounded-xs font-mono text-xs text-dw-accent">
              <Mountain className="w-3.5 h-3.5 text-dw-accent" />
              <span className="uppercase tracking-widest font-semibold">MISSION READY</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-dw-text-primary">
                EXPLORE THE TERRAIN.
              </h2>
              <p className="text-lg sm:text-xl text-dw-text-secondary max-w-2xl mx-auto font-normal leading-relaxed">
                Ingest single-view optical GeoTIFFs, calibrate against regional DEM references, extract physical slopes, and generate standard geospatial exports.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/workspace')}
                className="px-8 py-4 bg-dw-accent hover:bg-dw-accent-hover text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-xs transition-colors flex items-center space-x-2.5 shadow-lg focus-visible:outline-none"
              >
                <span>OPEN WORKSPACE →</span>
              </motion.button>
            </div>

            {/* Technical Attribute Badges (Clean Product Identifiers) */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-dw-text-muted">
              <span className="px-2.5 py-1 rounded-xs bg-dw-surface border border-dw-border-subtle">FastAPI Engine</span>
              <span className="px-2.5 py-1 rounded-xs bg-dw-surface border border-dw-border-subtle">Native Three.js WebGL</span>
              <span className="px-2.5 py-1 rounded-xs bg-dw-surface border border-dw-border-subtle">GDAL / Rasterio</span>
              <span className="px-2.5 py-1 rounded-xs bg-dw-surface border border-dw-border-subtle">Standard Geospatial Exports</span>
            </div>
          </div>
        </section>
      </main>

      {/* Technical Footer */}
      <LandingFooter />
    </div>
  );
};
