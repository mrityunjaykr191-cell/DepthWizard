/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dw: {
          base: 'rgb(var(--dw-base) / <alpha-value>)',
          surface: 'rgb(var(--dw-surface) / <alpha-value>)',
          panel: 'rgb(var(--dw-panel) / <alpha-value>)',
          elevated: 'rgb(var(--dw-elevated) / <alpha-value>)',
          hover: 'rgb(var(--dw-hover) / <alpha-value>)',
          border: {
            subtle: 'rgb(var(--dw-border-subtle) / <alpha-value>)',
            muted: 'rgb(var(--dw-border-muted) / <alpha-value>)',
            strong: 'rgb(var(--dw-border-strong) / <alpha-value>)'
          },
          text: {
            primary: 'rgb(var(--dw-text-primary) / <alpha-value>)',
            secondary: 'rgb(var(--dw-text-secondary) / <alpha-value>)',
            muted: 'rgb(var(--dw-text-muted) / <alpha-value>)',
            disabled: 'rgb(var(--dw-text-disabled) / <alpha-value>)'
          },
          accent: {
            DEFAULT: 'rgb(var(--dw-accent) / <alpha-value>)',
            hover: 'rgb(var(--dw-accent-hover) / <alpha-value>)',
            active: 'rgb(var(--dw-accent-active) / <alpha-value>)',
            subtle: 'rgb(var(--dw-accent-subtle) / <alpha-value>)'
          },
          status: {
            ready: 'rgb(var(--dw-status-ready) / <alpha-value>)',
            processing: 'rgb(var(--dw-status-processing) / <alpha-value>)',
            warning: 'rgb(var(--dw-status-warning) / <alpha-value>)',
            error: 'rgb(var(--dw-status-error) / <alpha-value>)',
            unavailable: 'rgb(var(--dw-status-unavailable) / <alpha-value>)'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        xs: '2px',
        sm: '3px',
        DEFAULT: '4px',
        md: '6px'
      },
      transitionDuration: {
        fast: '100ms',
        normal: '150ms',
        medium: '220ms',
        long: '350ms'
      },
      transitionTimingFunction: {
        dw: 'cubic-bezier(0.2, 0, 0, 1)',
        'dw-enter': 'cubic-bezier(0, 0, 0.2, 1)',
        'dw-exit': 'cubic-bezier(0.4, 0, 1, 1)',
        'dw-tactile': 'cubic-bezier(0.25, 1, 0.5, 1)'
      }
    },
  },
  plugins: [],
}
