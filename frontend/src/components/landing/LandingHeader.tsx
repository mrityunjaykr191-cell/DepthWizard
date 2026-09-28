/**
 * DepthWizard — Persistent Technical Landing Header (Refined V2.2)
 * Authority: docs/design/design-system.md
 *
 * Implements persistent top navigation:
 * - Fixed/sticky at top, stays above landing visual layers
 * - scrollY ≈ 0: clean transparent / integrated into background
 * - scrollY > threshold: translucent glass-like surface with backdrop blur and subtle border
 * - Zero layout shift, no dramatic resizing
 * - Accessible in both light and dark modes
 * - Removed hackathon identifiers for clean product-facing identity
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router/Router';
import { useScroll } from 'motion/react';
import { ThemeToggle } from '../common/ThemeToggle';
import { Mountain, ArrowRight } from 'lucide-react';

export const LandingHeader: React.FC = () => {
  const { navigate } = useRouter();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setIsScrolled(latest > 20);
    });
  }, [scrollY]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 w-full px-6 transition-all duration-300 ${
        isScrolled
          ? 'py-3 bg-dw-base/85 backdrop-blur-md border-b border-dw-border-subtle/80 shadow-xs'
          : 'py-4 bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Identity */}
        <div 
          className="flex items-center space-x-3.5 cursor-pointer select-none" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-8 h-8 bg-dw-panel border border-dw-border-strong flex items-center justify-center rounded-xs text-dw-accent shadow-xs">
            <Mountain className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="font-bold tracking-wider text-sm font-mono text-dw-text-primary">DEPTHWIZARD</span>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-mono text-dw-text-secondary">
          <button 
            onClick={() => scrollTo('pipeline')}
            className="hover:text-dw-text-primary transition-colors uppercase tracking-wider"
          >
            Pipeline
          </button>
          <button 
            onClick={() => scrollTo('capabilities')}
            className="hover:text-dw-text-primary transition-colors uppercase tracking-wider"
          >
            Intelligence
          </button>
          <button 
            onClick={() => scrollTo('integrity')}
            className="hover:text-dw-text-primary transition-colors uppercase tracking-wider"
          >
            Integrity
          </button>
        </nav>

        {/* Right Action & Theme */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <ThemeToggle showLabel={false} />
          <button
            onClick={() => navigate('/workspace')}
            className="px-4 py-2 bg-dw-accent hover:bg-dw-accent-hover active:scale-[0.98] text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-xs transition-all duration-fast ease-dw flex items-center space-x-2 focus-visible:outline-none shadow-sm"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
