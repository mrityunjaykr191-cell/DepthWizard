/**
 * DepthWizard — Terrain OrbitControls Wrapper
 * Authority: Phase 1B.3 Scope & docs/design/interaction-rules.md
 *
 * Wraps native Three.js OrbitControls with technical geospatial constraints,
 * smooth inertial damping, gentle auto-rotation, and interaction priority.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface TerrainControlsEvents {
  onChange?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onManualInteraction?: () => void;
}

export class TerrainControls {
  public readonly controls: OrbitControls;
  public readonly camera: THREE.Camera;
  public readonly domElement: HTMLElement;

  private isInteracting: boolean = false;
  private autoRotateActive: boolean = false;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    events: TerrainControlsEvents = {}
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.controls = new OrbitControls(camera, domElement);

    // Damping configuration: smooth technical deceleration without jerky stops
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    // Speeds: responsive, fluid geospatial analyst feel
    this.controls.rotateSpeed = 1.0;
    this.controls.panSpeed = 0.85;
    this.controls.zoomSpeed = 0.9;

    // Auto-rotate defaults: gentle showcase speed (~0.19 rad/s ≈ 11°/s)
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.8;

    // Unrestricted horizontal azimuth rotation across full 360°
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    // Prevent camera from going underneath the terrain surface
    this.controls.maxPolarAngle = Math.PI * 0.5 - 0.02;
    this.controls.minPolarAngle = 0.04; // Prevent gimbal lock at pure zenith

    // Distance boundaries
    this.controls.minDistance = 8.0;
    this.controls.maxDistance = 2000.0;

    // Wire up events
    this.controls.addEventListener('change', () => {
      events.onChange?.();
    });

    this.controls.addEventListener('start', () => {
      this.isInteracting = true;
      // Immediate manual interaction priority: pauses/disables auto-rotation
      if (this.autoRotateActive) {
        this.setAutoRotate(false);
      }
      events.onManualInteraction?.();
      events.onStart?.();
    });

    this.controls.addEventListener('end', () => {
      this.isInteracting = false;
      events.onEnd?.();
    });
  }

  /**
   * Sets the OrbitControls target point.
   */
  public setTarget(target: THREE.Vector3): void {
    this.controls.target.copy(target);
    this.controls.update();
  }

  /**
   * Updates damping inertia and native auto-rotation.
   * Returns true if camera moved, false if settled.
   */
  public update(): boolean {
    return this.controls.update();
  }

  /**
   * Controls gentle showcase auto-rotation.
   */
  public setAutoRotate(enabled: boolean, speed: number = 1.8): void {
    this.autoRotateActive = enabled;
    this.controls.autoRotate = enabled;
    this.controls.autoRotateSpeed = speed;
  }

  public get isAutoRotating(): boolean {
    return this.autoRotateActive;
  }

  /**
   * Controls whether rotation is allowed (e.g. locked in Topographic 2D pan/zoom mode).
   */
  public setRotateEnabled(enabled: boolean): void {
    this.controls.enableRotate = enabled;
  }

  public setPanEnabled(enabled: boolean): void {
    this.controls.enablePan = enabled;
  }

  public setZoomEnabled(enabled: boolean): void {
    this.controls.enableZoom = enabled;
  }

  /**
   * Enables or disables OrbitControls globally (e.g. during First Person mode).
   */
  public setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  /**
   * Checks whether the user is actively holding/dragging the controls.
   */
  public get isUserInteracting(): boolean {
    return this.isInteracting;
  }

  /**
   * Cleans up OrbitControls event listeners and internal state.
   */
  public dispose(): void {
    this.controls.dispose();
  }
}
