/**
 * DepthWizard — Minimal First-Person Inspection Controls Foundation
 * Authority: Phase 1B.3 & Phase 3C Scope & docs/architecture/frontend.md
 *
 * Provides an intuitive, robust ground-level inspection perspective for terrain analysts.
 * Strictly non-game: no physics engines, no Rapier, no collision meshes.
 * Maintains terrain-following eye height, dynamic terrain boundary protection,
 * fluid WASD/arrow navigation, and unrestricted 360° look yaw with clamped pitch.
 */

import * as THREE from 'three';

export interface FirstPersonEvents {
  onChange?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class TerrainFirstPersonControls {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly getTerrainElevation: (x: number, z: number) => number;
  private readonly events: FirstPersonEvents;

  private isEnabled: boolean = false;
  private isPointerDown: boolean = false;
  private previousPointerX: number = 0;
  private previousPointerY: number = 0;

  // View angles (radians)
  private yaw: number = 0;
  private pitch: number = 0;

  // Eye height above ground in local units
  private readonly eyeHeight: number = 2.0;

  // Walking speed in units / second
  private readonly walkSpeed: number = 22.0;

  // Dynamic terrain boundary bounds
  private boundsWidth: number = 100.0;
  private boundsDepth: number = 100.0;

  // Movement key states
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;

  private targetLookVector = new THREE.Vector3();

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    getTerrainElevation: (x: number, z: number) => number,
    events: FirstPersonEvents = {}
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.getTerrainElevation = getTerrainElevation;
    this.events = events;
  }

  public setBounds(width: number, depth: number): void {
    if (Number.isFinite(width) && width > 0) this.boundsWidth = width;
    if (Number.isFinite(depth) && depth > 0) this.boundsDepth = depth;
  }

  public enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;

    // Attach pointer listeners for look-around
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

    // Attach key listeners for controlled lateral inspection
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Initialise yaw and pitch from current camera direction
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.yaw = Math.atan2(dir.x, dir.z);
    this.pitch = Math.asin(Math.max(-0.95, Math.min(0.95, dir.y)));

    // Constrain position to terrain surface + eye height
    const groundY = this.getTerrainElevation(this.camera.position.x, this.camera.position.z);
    this.camera.position.y = groundY + this.eyeHeight;
    this.updateCameraLook();
  }

  public disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.isPointerDown = false;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  public teleportTo(worldX: number, worldZ: number): void {
    const halfW = (this.boundsWidth * 0.5) - 2.0;
    const halfD = (this.boundsDepth * 0.5) - 2.0;
    const clampedX = Math.max(-halfW, Math.min(halfW, worldX));
    const clampedZ = Math.max(-halfD, Math.min(halfD, worldZ));

    const groundY = this.getTerrainElevation(clampedX, clampedZ);
    this.camera.position.set(clampedX, groundY + this.eyeHeight, clampedZ);
    this.updateCameraLook();
    this.events.onChange?.();
  }

  /**
   * Updates position and view based on input keys and elapsed time.
   * Returns true if the camera moved, false if idle.
   */
  public update(deltaSeconds: number): boolean {
    if (!this.isEnabled) return false;

    const hasMotion = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (!hasMotion) return false;

    // True world-space forward vector (projected onto horizontal X-Z plane)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-4) {
      forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    }
    forward.normalize();

    // True world-space right vector
    const right = new THREE.Vector3();
    right.crossVectors(forward, this.camera.up).normalize();

    const moveDir = new THREE.Vector3();
    if (this.moveForward) moveDir.add(forward);
    if (this.moveBackward) moveDir.sub(forward);
    if (this.moveRight) moveDir.add(right);
    if (this.moveLeft) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const step = this.walkSpeed * deltaSeconds;

      const halfW = (this.boundsWidth * 0.5) - 2.0;
      const halfD = (this.boundsDepth * 0.5) - 2.0;

      const newX = Math.max(-halfW, Math.min(halfW, this.camera.position.x + moveDir.x * step));
      const newZ = Math.max(-halfD, Math.min(halfD, this.camera.position.z + moveDir.z * step));
      const groundY = this.getTerrainElevation(newX, newZ);

      this.camera.position.x = newX;
      this.camera.position.z = newZ;
      // Terrain-following: camera Y is strictly clamped to ground elevation + eyeHeight
      this.camera.position.y = groundY + this.eyeHeight;

      this.updateCameraLook();
      this.events.onChange?.();
      return true;
    }

    return false;
  }

  private updateCameraLook(): void {
    // Reconstruct target direction vector from yaw and pitch
    const cosPitch = Math.cos(this.pitch);
    this.targetLookVector.set(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch
    );

    const lookTarget = this.camera.position.clone().add(this.targetLookVector);
    this.camera.lookAt(lookTarget);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.isPointerDown = true;
    this.previousPointerX = e.clientX;
    this.previousPointerY = e.clientY;
    this.events.onStart?.();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;

    const dx = e.clientX - this.previousPointerX;
    const dy = e.clientY - this.previousPointerY;
    this.previousPointerX = e.clientX;
    this.previousPointerY = e.clientY;

    // Natural rotation sensitivity
    const sensitivity = 0.0035;
    // Yaw: moving pointer right rotates camera view to the right
    this.yaw -= dx * sensitivity;
    // Pitch: moving pointer down pitches view downward; moving up pitches upward
    this.pitch -= dy * sensitivity;
    // Clamp pitch between approx -80° and +80° (-1.40 to +1.40 rad)
    this.pitch = Math.max(-1.40, Math.min(1.40, this.pitch));

    this.updateCameraLook();
    this.events.onChange?.();
  };

  private onPointerUp = (): void => {
    if (this.isPointerDown) {
      this.isPointerDown = false;
      this.events.onEnd?.();
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    let triggered = false;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        triggered = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        triggered = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        triggered = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        triggered = true;
        break;
    }

    if (triggered) {
      // Immediately wake up render loop on movement start
      this.events.onStart?.();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
    }

    if (!this.isMoving) {
      this.events.onEnd?.();
    }
  };

  public get target(): THREE.Vector3 {
    return this.camera.position.clone().add(this.targetLookVector);
  }

  public get isMoving(): boolean {
    return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
  }

  public dispose(): void {
    this.disable();
  }
}
