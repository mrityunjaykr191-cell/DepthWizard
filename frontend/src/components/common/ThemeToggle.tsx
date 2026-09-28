import React from 'react';
import { useTheme } from '../../state/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === 'dark' ? 'Active theme: Dark. Switch to Light theme' : 'Active theme: Light. Switch to Dark theme'}
      title={theme === 'dark' ? 'Active theme: Dark. Switch to Light theme' : 'Active theme: Light. Switch to Dark theme'}
      className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-xs text-xs font-mono text-dw-text-secondary hover:text-dw-text-primary hover:bg-dw-panel border border-dw-border-subtle hover:border-dw-border-strong transition-all duration-fast ease-dw active:scale-[0.96] focus-visible:outline-none"
    >
      <div className="relative w-3.5 h-3.5 flex items-center justify-center" aria-hidden="true">
        <Moon 
          className={`w-3.5 h-3.5 text-dw-accent absolute transition-all duration-normal ease-dw ${
            theme === 'dark' 
              ? 'scale-100 opacity-100 rotate-0' 
              : 'scale-[0.25] opacity-0 -rotate-45 pointer-events-none'
          }`} 
        />
        <Sun 
          className={`w-3.5 h-3.5 text-dw-accent absolute transition-all duration-normal ease-dw ${
            theme === 'light' 
              ? 'scale-100 opacity-100 rotate-0' 
              : 'scale-[0.25] opacity-0 rotate-45 pointer-events-none'
          }`} 
        />
      </div>
      {showLabel && (
        <span className="text-[11px] uppercase tracking-wider font-medium select-none transition-colors duration-normal">
          {theme}
        </span>
      )}
    </button>
  );
};
