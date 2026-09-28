/**
 * DepthWizard — Centralized Motion System
 * 
 * Defines standardized timing tiers, cubic-bezier easing curves,
 * and transition configurations for the geospatial UI.
 * 
 * Rules:
 * - Alive, precise, and responsive — never animated for decoration.
 * - Zero bounce.
 * - High-frequency interactions remain fast and interruptible.
 */

export const MOTION_DURATION = {
  FAST: 0.1,    // 100ms: Micro-interactions, tactile button press, icon crossfade
  NORMAL: 0.15, // 150ms: Selection changes, tab switching, hover states
  MEDIUM: 0.22, // 220ms: Content panel updates, tool transitions, status changes
  LONG: 0.35,   // 350ms: Macro route transitions, spatial viewport changes
} as const;

export const MOTION_DURATION_MS = {
  FAST: 100,
  NORMAL: 150,
  MEDIUM: 220,
  LONG: 350,
} as const;

/**
 * Standard cubic-bezier easing curves
 */
export const MOTION_EASING = {
  // Default technical deceleration curve (interruptible)
  DEFAULT: [0.2, 0, 0, 1] as const,
  // Fast enter curve
  ENTER: [0, 0, 0.2, 1] as const,
  // Subtle exit curve
  EXIT: [0.4, 0, 1, 1] as const,
  // Tactile button response
  TACTILE: [0.25, 1, 0.5, 1] as const,
} as const;

/**
 * motion/react preset configurations
 */
export const TRANSITION_PRESETS = {
  fast: {
    duration: MOTION_DURATION.FAST,
    ease: MOTION_EASING.DEFAULT,
  },
  normal: {
    duration: MOTION_DURATION.NORMAL,
    ease: MOTION_EASING.DEFAULT,
  },
  medium: {
    duration: MOTION_DURATION.MEDIUM,
    ease: MOTION_EASING.DEFAULT,
  },
  contentFade: {
    duration: MOTION_DURATION.NORMAL,
    ease: MOTION_EASING.DEFAULT,
  },
} as const;
