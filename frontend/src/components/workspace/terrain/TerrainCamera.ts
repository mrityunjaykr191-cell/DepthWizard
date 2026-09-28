/**
 * DepthWizard — Terrain Camera
 * Authority: Phase 1B.3 Scope & docs/design/interaction-rules.md
 *
 * Manages PerspectiveCamera setup, framing, presets, smooth transitions, and orientation telemetry.
 */

import * as THREE from 'three';
import { CameraPreset } from '../../../state/WorkspaceContext';

export interface CameraOrientation {
  azimuthDeg: number;
  elevationDeg: number;
  distance: number;
}

export interface FramingTarget {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class TerrainCamera {
  public readonly camera: THREE.PerspectiveCamera;

  private defaultTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Smooth camera transition state (restrained 250–350ms, frame-rate independent)
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 320;
  private startPosition = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private onTransitionComplete?: () => void;

  constructor(aspect: number = 1.0) {
    // 45 degree FOV balances natural perspective without fish-eye distortion
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 5000.0);
    this.camera.name = 'DepthWizard_PerspectiveCamera';

    // Default technical vantage point
    this.camera.position.set(0, 80, 110);
    this.camera.lookAt(this.defaultTarget);
  }

  /**
   * Calculates a camera position and target for a given orientation preset around a 3D bounding box.
   */
  public getPresetFraming(preset: CameraPreset, box: THREE.Box3, aspect: number): FramingTarget {
    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 20.0);
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);

    let distance = (maxDim * 0.5) / Math.tan(fovRad * 0.5);
    if (aspect < 1.0) {
      distance = distance / aspect;
    }

    // Balanced technical framing margins (15% margin ensures terrain fills viewport authoritatively)
    distance *= 1.15;

    // 30° pitch angle provides strong relief silhouette and parallax depth at 1x exaggeration
    const pitchRad = THREE.MathUtils.degToRad(30);

    switch (preset) {
      case 'TOP': {
        // Overhead Topographic inspection: directly above terrain looking vertically down
        // Offset very slightly along Z to prevent pure-zenith gimbal singularities
        return {
          position: new THREE.Vector3(center.x, center.y + distance, center.z + 0.001),
          target: center.clone()
        };
      }
      case 'NORTH': {
        // Viewer-space North: looking from South toward North
        const y = center.y + distance * Math.sin(pitchRad);
        const horizontalDist = distance * Math.cos(pitchRad);
        return {
          position: new THREE.Vector3(center.x, y, center.z + horizontalDist),
          target: center.clone()
        };
      }
      case 'SOUTH': {
        // Viewer-space South: looking from North toward South
        const y = center.y + distance * Math.sin(pitchRad);
        const horizontalDist = distance * Math.cos(pitchRad);
        return {
          position: new THREE.Vector3(center.x, y, center.z - horizontalDist),
          target: center.clone()
        };
      }
      case 'EAST': {
        // Viewer-space East: looking from West toward East
        const y = center.y + distance * Math.sin(pitchRad);
        const horizontalDist = distance * Math.cos(pitchRad);
        return {
          position: new THREE.Vector3(center.x - horizontalDist, y, center.z),
          target: center.clone()
        };
      }
      case 'WEST': {
        // Viewer-space West: looking from East toward West
        const y = center.y + distance * Math.sin(pitchRad);
        const horizontalDist = distance * Math.cos(pitchRad);
        return {
          position: new THREE.Vector3(center.x + horizontalDist, y, center.z),
          target: center.clone()
        };
      }
      case 'FREE':
      default: {
        // Default oblique technical perspective (40° azimuth, 35° pitch)
        const yawRad = THREE.MathUtils.degToRad(40);
        const y = center.y + distance * Math.sin(pitchRad);
        const horizontalDist = distance * Math.cos(pitchRad);
        const x = center.x + horizontalDist * Math.sin(yawRad);
        const z = center.z + horizontalDist * Math.cos(yawRad);
        return {
          position: new THREE.Vector3(x, y, z),
          target: center.clone()
        };
      }
    }
  }

  /**
   * Automatically frames the camera around a 3D bounding box with comfortable margins.
   */
  public frameBounds(box: THREE.Box3, aspect: number): void {
    const framing = this.getPresetFraming('FREE', box, aspect);
    this.defaultTarget.copy(framing.target);
    this.camera.position.copy(framing.position);
    this.camera.lookAt(this.defaultTarget);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Initiates a smooth, restrained camera transition to target coordinates.
   * Frame-rate independent interpolation with cubic ease-in-out.
   */
  public startTransition(
    targetPos: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    durationMs: number = 320,
    onComplete?: () => void
  ): void {
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionDuration = Math.max(100, durationMs);
    this.startPosition.copy(this.camera.position);
    this.targetPosition.copy(targetPos);
    this.startTarget.copy(this.defaultTarget);
    this.targetLookAt.copy(targetLookAt);
    this.onTransitionComplete = onComplete;
  }

  /**
   * Updates camera position during transition.
   * Returns true if transition is still active, false when settled.
   */
  public updateTransition(now: number): boolean {
    if (!this.isTransitioning) return false;

    const elapsed = now - this.transitionStartTime;
    const progress = Math.min(1.0, elapsed / this.transitionDuration);

    // Natural cubic ease-in-out curve (settles smoothly without overshoot)
    const ease = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    this.camera.position.lerpVectors(this.startPosition, this.targetPosition, ease);
    this.defaultTarget.lerpVectors(this.startTarget, this.targetLookAt, ease);
    this.camera.lookAt(this.defaultTarget);
    this.camera.updateProjectionMatrix();

    if (progress >= 1.0) {
      this.isTransitioning = false;
      this.camera.position.copy(this.targetPosition);
      this.defaultTarget.copy(this.targetLookAt);
      this.camera.lookAt(this.defaultTarget);
      this.camera.updateProjectionMatrix();
      
      const callback = this.onTransitionComplete;
      this.onTransitionComplete = undefined;
      callback?.();
      return false;
    }

    return true;
  }

  /**
   * Cancels any active camera transition immediately if manual user input begins.
   */
  public cancelTransition(): void {
    if (this.isTransitioning) {
      this.isTransitioning = false;
      this.onTransitionComplete = undefined;
    }
  }

  public get isTransitionActive(): boolean {
    return this.isTransitioning;
  }

  /**
   * Updates camera aspect ratio on canvas resize.
   */
  public updateAspect(width: number, height: number): void {
    const safeHeight = Math.max(height, 1);
    this.camera.aspect = width / safeHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Calculates current camera orientation angles relative to the view target.
   */
  public getOrientation(target: THREE.Vector3 = this.defaultTarget): CameraOrientation {
    const offset = new THREE.Vector3().subVectors(this.camera.position, target);
    const distance = offset.length();

    // Horizontal plane (X-Z)
    const horizontalDist = Math.sqrt(offset.x * offset.x + offset.z * offset.z);

    // Pure zenith case (Topographic mode)
    if (horizontalDist < 1e-4) {
      return {
        azimuthDeg: 0,
        elevationDeg: 90,
        distance: Math.round(distance * 10) / 10
      };
    }

    // Azimuth in horizontal plane (X-Z)
    let azimuthRad = Math.atan2(offset.x, offset.z);
    if (azimuthRad < 0) azimuthRad += 2 * Math.PI;

    // Elevation angle above horizontal plane
    const elevationRad = Math.atan2(offset.y, horizontalDist);

    return {
      azimuthDeg: Math.round(THREE.MathUtils.radToDeg(azimuthRad)),
      elevationDeg: Math.round(THREE.MathUtils.radToDeg(elevationRad)),
      distance: Math.round(distance * 10) / 10
    };
  }

  public get target(): THREE.Vector3 {
    return this.defaultTarget;
  }

  public setTarget(newTarget: THREE.Vector3): void {
    this.defaultTarget.copy(newTarget);
  }
}
