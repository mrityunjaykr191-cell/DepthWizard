/**
 * DepthWizard — Generic Terrain Render Adapter
 * Authority: Phase 1B.3 Scope & docs/architecture/frontend.md
 *
 * Bridges the generic TerrainResult data contract with the Three.js imperative rendering engine.
 * Supports:
 * - 3D Orbit (primary inspection mode with OrbitControls damping)
 * - Controlled showcase Auto Rotate with immediate manual interaction priority
 * - Camera presets (TOP, NORTH, SOUTH, EAST, WEST, FREE) with smooth cubic ease transitions
 * - Topographic view (overhead map inspection with rotation lock and pan/zoom)
 * - First-Person foundation (ground-relative inspection camera)
 * - Demand-driven rendering (0 FPS idle when at rest)
 */

import * as THREE from 'three';
import { TerrainResult, validateElevationData } from '../../../types/contract';
import { CameraPreset, ViewMode, AnalysisTool } from '../../../state/WorkspaceContext';
import { LineOfSightResponse } from '../../../types/intelligence';
import { TerrainScene } from './TerrainScene';
import { TerrainCamera, CameraOrientation } from './TerrainCamera';
import { TerrainMesh, TerrainElevationGrid, AnalyticalLayerOptions } from './TerrainMesh';
import { TerrainVisualConfig } from './terrainVisualPipeline';
import { TerrainControls } from './TerrainControls';
import { TerrainFirstPersonControls } from './TerrainFirstPersonControls';
import { createSyntheticDevTerrainResult } from './terrainFixture';

export interface TerrainAdapterOptions {
  result?: TerrainResult;
  initialExaggeration?: number;
  initialViewMode?: ViewMode;
  initialPreset?: CameraPreset;
  initialWireframe?: boolean;
  autoRotate?: boolean;
  visualConfig?: Partial<TerrainVisualConfig>;
  onOrientationChange?: (orientation: CameraOrientation) => void;
  onAutoRotateChange?: (enabled: boolean) => void;
  onPresetChange?: (preset: CameraPreset) => void;
  onTerrainClick?: (coords: { rasterX: number; rasterY: number; worldPoint: THREE.Vector3 }) => void;
}

export class TerrainRenderAdapter {
  private readonly container: HTMLElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: TerrainScene;
  public readonly camera: TerrainCamera;
  public readonly terrainMesh: TerrainMesh;
  public readonly measurementGroup: THREE.Group;
  public readonly controls: TerrainControls;
  public readonly firstPersonControls: TerrainFirstPersonControls;

  private onTerrainClickCallback?: (coords: { rasterX: number; rasterY: number; worldPoint: THREE.Vector3 }) => void;

  private currentResult: TerrainResult;
  private activeMode: ViewMode = '3d';
  private currentPreset: CameraPreset = 'FREE';

  private resizeObserver: ResizeObserver | null = null;
  private animFrameId: number | null = null;
  private isLoopRunning: boolean = false;
  private isDisposed: boolean = false;
  private lastFrameTime: number = performance.now();

  private readonly onOrientationChange?: (orientation: CameraOrientation) => void;
  private readonly onAutoRotateChange?: (enabled: boolean) => void;
  private readonly onPresetChange?: (preset: CameraPreset) => void;

  constructor(container: HTMLElement, options: TerrainAdapterOptions = {}) {
    this.container = container;
    this.onOrientationChange = options.onOrientationChange;
    this.onAutoRotateChange = options.onAutoRotateChange;
    this.onPresetChange = options.onPresetChange;
    this.activeMode = options.initialViewMode ?? '3d';
    this.currentPreset = options.initialPreset ?? 'FREE';

    // 1. Initialize WebGLRenderer with modern sRGB color space
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1.0, 2.0));

    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    this.container.appendChild(canvas);

    // 2. Initialize Scene & Camera
    this.scene = new TerrainScene();
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 600;
    this.camera = new TerrainCamera(initialWidth / Math.max(initialHeight, 1));

    // Phase 4B: Measurement Overlays Group
    this.measurementGroup = new THREE.Group();
    this.measurementGroup.name = 'MeasurementOverlays';
    this.scene.add(this.measurementGroup);

    // 3. Resolve initial TerrainResult
    this.currentResult = options.result ?? createSyntheticDevTerrainResult(65, 65);
    const initialGrid = this.extractElevationGrid(this.currentResult);

    // 4. Construct generic TerrainMesh from the elevation grid
    this.terrainMesh = new TerrainMesh(initialGrid, options.initialExaggeration ?? 1.0, options.visualConfig);
    if (options.initialWireframe) {
      this.terrainMesh.setWireframe(true);
    }
    this.scene.add(this.terrainMesh.mesh);

    // 5. Initial Camera framing around terrain bounding box
    const boundingBox = this.terrainMesh.geometry.boundingBox ?? new THREE.Box3();
    this.camera.frameBounds(boundingBox, initialWidth / Math.max(initialHeight, 1));

    // 6. Initialize OrbitControls with damping and event coordination
    this.controls = new TerrainControls(this.camera.camera, canvas, {
      onChange: () => {
        if (!this.isLoopRunning) {
          this.requestRender();
        }
      },
      onStart: () => {
        // Immediate user priority: cancel any running transition and auto-rotation
        this.camera.cancelTransition();
        if (this.controls.isAutoRotating) {
          this.controls.setAutoRotate(false);
          this.onAutoRotateChange?.(false);
        }
        if (this.currentPreset !== 'FREE') {
          this.currentPreset = 'FREE';
          this.onPresetChange?.('FREE');
        }
        this.startLoop();
      },
      onEnd: () => {
        // Damping loop continues until motion naturally settles
      }
    });

    this.controls.setTarget(this.camera.target);

    // 7. Initialize First Person Controls foundation
    this.firstPersonControls = new TerrainFirstPersonControls(
      this.camera.camera,
      canvas,
      (x, z) => this.terrainMesh.getElevationAt(x, z),
      {
        onChange: () => {
          if (!this.isLoopRunning) {
            this.requestRender();
          }
        },
        onStart: () => {
          this.camera.cancelTransition();
          this.startLoop();
        }
      }
    );
    this.firstPersonControls.setBounds(initialGrid.worldWidth ?? 100.0, initialGrid.worldDepth ?? 100.0);

    // Phase 4B: Raycasting Pointer Listener for interactive measurements
    this.onTerrainClickCallback = options.onTerrainClick;
    let pointerDownPos = { x: 0, y: 0 };
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.isDisposed) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 5) return; // Disregard camera drags

      if (!this.onTerrainClickCallback) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera.camera);
      const intersects = raycaster.intersectObject(this.terrainMesh.mesh, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const grid = this.terrainMesh.gridData;
        const worldWidth = grid.worldWidth ?? 100.0;
        const worldDepth = grid.worldDepth ?? 100.0;
        const halfWidth = worldWidth * 0.5;
        const halfDepth = worldDepth * 0.5;

        const u = (hit.point.x + halfWidth) / worldWidth;
        const v = (hit.point.z + halfDepth) / worldDepth;

        const rasterX = Math.max(0, Math.min(grid.cols - 1, u * (grid.cols - 1)));
        const rasterY = Math.max(0, Math.min(grid.rows - 1, v * (grid.rows - 1)));

        this.onTerrainClickCallback({
          rasterX,
          rasterY,
          worldPoint: hit.point.clone()
        });
      }
    });

    // 8. Setup ResizeObserver
    this.setupResizeObserver();

    // 9. Apply initial view mode and auto-rotate
    if (this.activeMode !== '3d') {
      this.setViewMode(this.activeMode);
    } else if (options.autoRotate) {
      this.setAutoRotate(true);
    }

    // 10. Initial render pass
    this.requestRender();
  }

  /**
   * Translates and validates a TerrainResult into a generic TerrainElevationGrid.
   */
  private extractElevationGrid(result: TerrainResult): TerrainElevationGrid {
    const { elevation, geospatial } = result;

    if (elevation.data) {
      const validation = validateElevationData(elevation);
      if (!validation.valid) {
        console.error(`[TerrainRenderAdapter] Elevation validation failed: ${validation.error}`);
        throw new Error(validation.error);
      }

      const cols = elevation.grid_dimensions!.cols;
      const rows = elevation.grid_dimensions!.rows;
      const aspect = cols / Math.max(1, rows);
      const worldWidth = aspect >= 1.0 ? 100.0 : 100.0 * aspect;
      const worldDepth = aspect >= 1.0 ? 100.0 / aspect : 100.0;

      const baseElevation = elevation.min ?? 0;
      const elevationSpan = Math.max(1e-4, (elevation.max ?? 1) - baseElevation);

      let verticalScale = 1.0;
      if (elevation.mode === 'absolute' && geospatial?.bounds && typeof geospatial.bounds === 'object' && 'east' in geospatial.bounds) {
        const extentX = Math.abs(geospatial.bounds.east - geospatial.bounds.west);
        if (extentX > 0) {
          const metricRatio = worldWidth / extentX;
          const nominalRelief = elevationSpan * metricRatio;
          verticalScale = nominalRelief > 45.0 ? (35.0 / elevationSpan) : metricRatio;
        }
      } else {
        // Restrained natural relief ratio (10.0% of horizontal extent) to prevent acute needle/spire distortions on urban structures
        const targetRelief = 10.0;
        verticalScale = targetRelief / elevationSpan;
      }

      return {
        cols,
        rows,
        elevations: elevation.data,
        minElevation: elevation.min,
        maxElevation: elevation.max,
        mode: elevation.mode,
        sourceId: result.result_id,
        worldWidth,
        worldDepth,
        baseElevation,
        verticalScale,
        geospatialBounds: geospatial?.bounds,
        nodata: geospatial?.nodata
      };
    }

    const defaultCols = 65;
    const defaultRows = 65;
    const emptyArray = new Float32Array(defaultCols * defaultRows);
    Object.freeze(emptyArray.buffer);

    return {
      cols: defaultCols,
      rows: defaultRows,
      elevations: emptyArray,
      minElevation: elevation.min || 0,
      maxElevation: elevation.max || 0,
      mode: elevation.mode,
      sourceId: result.result_id,
      worldWidth: 100.0,
      worldDepth: 100.0,
      baseElevation: 0,
      verticalScale: 1.0
    };
  }

  /**
   * Receives a new generic TerrainResult and updates the 3D terrain geometry.
   */
  public setTerrainResult(result: TerrainResult): boolean {
    if (this.isDisposed) return false;

    if (this.currentResult.result_id === result.result_id && this.currentResult.elevation === result.elevation) {
      return false;
    }

    try {
      const gridData = this.extractElevationGrid(result);
      this.currentResult = result;

      this.terrainMesh.setTerrainData(gridData);
      this.firstPersonControls.setBounds(gridData.worldWidth ?? 100.0, gridData.worldDepth ?? 100.0);

      // Re-frame camera cleanly to the new terrain bounding box
      if (this.activeMode !== 'first-person') {
        const box = this.terrainMesh.geometry.boundingBox ?? new THREE.Box3();
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;
        const aspect = width / Math.max(height, 1);

        if (this.activeMode === 'topographic') {
          const framing = this.camera.getPresetFraming('TOP', box, aspect);
          this.camera.camera.position.copy(framing.position);
          this.camera.setTarget(framing.target);
          this.controls.setTarget(framing.target);
        } else {
          this.camera.frameBounds(box, aspect);
          this.controls.setTarget(this.camera.target);
        }
      }

      this.requestRender();
      return true;
    } catch (err) {
      console.error('[TerrainRenderAdapter] Failed to update terrain result:', err);
      return false;
    }
  }

  /**
   * Sets the active navigation view mode.
   * Ensures strict control hand-off so only one controller is active at a time.
   */
  public setViewMode(mode: ViewMode): void {
    if (this.isDisposed) return;
    const prevMode = this.activeMode;
    this.activeMode = mode;

    const box = this.terrainMesh.geometry.boundingBox ?? new THREE.Box3();
    const aspect = (this.container.clientWidth || 800) / Math.max(this.container.clientHeight || 600, 1);

    if (mode === 'topographic') {
      // 1. Topographic: OrbitControls active with rotation locked (2D pan/zoom map)
      this.firstPersonControls.disable();
      this.controls.setEnabled(true);
      this.controls.setRotateEnabled(false);
      this.controls.setAutoRotate(false);
      this.onAutoRotateChange?.(false);

      const targetFraming = this.camera.getPresetFraming('TOP', box, aspect);
      this.camera.startTransition(targetFraming.position, targetFraming.target, 320, () => {
        this.controls.setTarget(targetFraming.target);
      });
      this.currentPreset = 'TOP';
      this.onPresetChange?.('TOP');
      this.startLoop();
    } else if (mode === 'first-person') {
      // 2. First Person: OrbitControls completely disabled; firstPersonControls active
      this.controls.setAutoRotate(false);
      this.onAutoRotateChange?.(false);
      this.controls.setEnabled(false);

      // Teleport to terrain center at eye height
      this.firstPersonControls.teleportTo(0, 0);
      this.firstPersonControls.enable();
      this.currentPreset = 'FREE';
      this.onPresetChange?.('FREE');
      this.requestRender();
    } else {
      // 3. 3D Orbit: Primary general-purpose inspection mode
      this.firstPersonControls.disable();
      this.controls.setEnabled(true);
      this.controls.setRotateEnabled(true);

      if (prevMode === 'first-person' || prevMode === 'topographic') {
        const targetFraming = this.camera.getPresetFraming('FREE', box, aspect);
        this.camera.startTransition(targetFraming.position, targetFraming.target, 320, () => {
          this.controls.setTarget(targetFraming.target);
        });
        this.currentPreset = 'FREE';
        this.onPresetChange?.('FREE');
        this.startLoop();
      }
    }
  }

  /**
   * Transitions the camera smoothly to a named orientation preset.
   */
  public setCameraPreset(preset: CameraPreset, durationMs: number = 320): void {
    if (this.isDisposed || this.activeMode === 'first-person') return;

    if (preset === 'FREE') {
      this.currentPreset = 'FREE';
      this.onPresetChange?.('FREE');
      return;
    }

    // Stop auto-rotation when switching to a fixed preset
    if (this.controls.isAutoRotating) {
      this.controls.setAutoRotate(false);
      this.onAutoRotateChange?.(false);
    }

    const box = this.terrainMesh.geometry.boundingBox ?? new THREE.Box3();
    const aspect = (this.container.clientWidth || 800) / Math.max(this.container.clientHeight || 600, 1);
    const targetFraming = this.camera.getPresetFraming(preset, box, aspect);

    this.currentPreset = preset;
    this.onPresetChange?.(preset);

    this.camera.startTransition(targetFraming.position, targetFraming.target, durationMs, () => {
      this.controls.setTarget(targetFraming.target);
      this.requestRender();
    });

    this.startLoop();
  }

  /**
   * Controls gentle showcase auto-rotation in 3D Orbit mode.
   */
  public setAutoRotate(enabled: boolean): void {
    if (this.isDisposed) return;

    // Auto Rotate is strictly for 3D Orbit mode
    if (enabled && this.activeMode !== '3d') {
      this.setViewMode('3d');
    }

    // Check prefers-reduced-motion
    if (enabled && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.controls.setAutoRotate(false);
      this.onAutoRotateChange?.(false);
      return;
    }

    this.controls.setAutoRotate(enabled, 1.8);
    this.onAutoRotateChange?.(enabled);

    if (enabled) {
      this.camera.cancelTransition();
      this.startLoop();
    }
  }

  public getTerrainResult(): TerrainResult {
    return this.currentResult;
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.isDisposed || entries.length === 0) return;
      const entry = entries[0];
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);

      if (width > 0 && height > 0) {
        this.camera.updateAspect(width, height);
        this.renderer.setSize(width, height, false);
        this.requestRender();
      }
    });

    this.resizeObserver.observe(this.container);
  }

  private startLoop(): void {
    if (this.isLoopRunning || this.isDisposed) return;
    this.isLoopRunning = true;
    this.lastFrameTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  }

  /**
   * Unified, frame-rate independent demand render loop.
   * Halts completely when all motion (transition, damping, auto-rotate) settles.
   */
  private renderLoop = (now: number): void => {
    if (this.isDisposed) return;

    const deltaSec = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // 1. Update camera transition if animating
    const isTransitioning = this.camera.updateTransition(now);
    if (isTransitioning && this.activeMode !== 'first-person') {
      this.controls.controls.target.copy(this.camera.target);
    }

    // 2. Update active controller
    let isControlsMoving = false;
    if (this.activeMode === 'first-person') {
      isControlsMoving = this.firstPersonControls.update(deltaSec);
    } else {
      isControlsMoving = this.controls.update();
    }

    // 3. Render single frame
    this.renderSingleFrame();

    // 4. Check if next frame is needed
    const needsNextFrame = 
      isTransitioning || 
      isControlsMoving || 
      this.controls.isAutoRotating || 
      this.controls.isUserInteracting || 
      (this.activeMode === 'first-person' && this.firstPersonControls.isMoving);

    if (needsNextFrame) {
      this.animFrameId = requestAnimationFrame(this.renderLoop);
    } else {
      this.isLoopRunning = false;
      this.animFrameId = null;
    }
  };

  public requestRender(): void {
    if (this.isDisposed) return;
    this.renderSingleFrame();
  }

  private renderSingleFrame(): void {
    if (this.isDisposed) return;
    this.renderer.render(this.scene.scene, this.camera.camera);
    if (this.onOrientationChange) {
      const activeTarget = this.activeMode === 'first-person' 
        ? this.firstPersonControls.target 
        : this.controls.controls.target;
      this.onOrientationChange(this.camera.getOrientation(activeTarget));
    }
  }

  public setVerticalExaggeration(scale: number): void {
    if (this.isDisposed) return;
    const changed = this.terrainMesh.setVerticalExaggeration(scale);
    if (changed) {
      this.requestRender();
    }
  }

  public setWireframe(enabled: boolean): void {
    if (this.isDisposed) return;
    const changed = this.terrainMesh.setWireframe(enabled);
    if (changed) {
      this.requestRender();
    }
  }

  public setVisualConfig(config: Partial<TerrainVisualConfig>): void {
    if (this.isDisposed) return;
    const changed = this.terrainMesh.setVisualConfig(config);
    if (changed) {
      this.requestRender();
    }
  }

  public setOnTerrainClick(cb?: (coords: { rasterX: number; rasterY: number; worldPoint: THREE.Vector3 }) => void): void {
    this.onTerrainClickCallback = cb;
  }

  public clearMeasurementMarkers(): void {
    while (this.measurementGroup.children.length > 0) {
      const child = this.measurementGroup.children[0];
      this.measurementGroup.remove(child);
      child.traverse((node: any) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach((m: any) => m.dispose());
          else node.material.dispose();
        }
      });
    }
    this.requestRender();
  }

  public updateMeasurementMarkers(options: {
    tool: AnalysisTool;
    pointA?: { x: number; y: number } | null;
    pointB?: { x: number; y: number } | null;
    observerOffsetA?: number;
    targetOffsetB?: number;
    losResult?: LineOfSightResponse | null;
  }): void {
    if (this.isDisposed) return;
    this.clearMeasurementMarkers();

    const { tool, pointA, pointB, observerOffsetA = 0, targetOffsetB = 0, losResult } = options;
    if (tool === 'none' || (!pointA && !pointB)) {
      return;
    }

    const grid = this.terrainMesh.gridData;
    const worldWidth = grid.worldWidth ?? 100.0;
    const worldDepth = grid.worldDepth ?? 100.0;
    const halfWidth = worldWidth * 0.5;
    const halfDepth = worldDepth * 0.5;
    const cols = grid.cols;
    const rows = grid.rows;

    const rasterToWorld = (rx: number, ry: number) => {
      const u = rx / (cols - 1);
      const v = ry / (rows - 1);
      const wx = -halfWidth + u * worldWidth;
      const wz = -halfDepth + v * worldDepth;
      const wy = this.terrainMesh.getElevationAt(wx, wz);
      return new THREE.Vector3(wx, wy, wz);
    };

    const createBeacon = (pos: THREE.Vector3, colorHex: number, heightOffset = 0) => {
      const group = new THREE.Group();

      // Disc on surface
      const discGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
      const discMat = new THREE.MeshBasicMaterial({ color: colorHex, opacity: 0.85, transparent: true });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(pos.x, pos.y + 0.05, pos.z);
      group.add(disc);

      // Vertical stem (extends up to include heightOffset + 2.5)
      const stemH = 2.5 + heightOffset;
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, stemH, 8);
      const stemMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(pos.x, pos.y + stemH * 0.5, pos.z);
      group.add(stem);

      // Top sphere at the observer/target altitude
      const sphereGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(pos.x, pos.y + stemH, pos.z);
      group.add(sphere);

      return group;
    };

    if (tool === 'height-probe' && pointA) {
      const pos = rasterToWorld(pointA.x, pointA.y);
      this.measurementGroup.add(createBeacon(pos, 0x38bdf8));
    } else if (tool === 'two-point' || tool === 'cross-section' || tool === 'route-profile') {
      let posA: THREE.Vector3 | null = null;
      let posB: THREE.Vector3 | null = null;

      if (pointA) {
        posA = rasterToWorld(pointA.x, pointA.y);
        this.measurementGroup.add(createBeacon(posA, 0x10b981)); // Emerald for Point A
      }
      if (pointB) {
        posB = rasterToWorld(pointB.x, pointB.y);
        this.measurementGroup.add(createBeacon(posB, 0xf59e0b)); // Amber for Point B
      }

      if (posA && posB && pointA && pointB) {
        // Sample line points along the terrain surface to drape nicely
        const steps = 40;
        const linePoints: THREE.Vector3[] = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const curRx = pointA.x + t * (pointB.x - pointA.x);
          const curRy = pointA.y + t * (pointB.y - pointA.y);
          const curWorld = rasterToWorld(curRx, curRy);
          curWorld.y += 0.3; // Raise slightly above terrain to prevent z-fighting
          linePoints.push(curWorld);
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
        const line = new THREE.Line(lineGeo, lineMat);
        this.measurementGroup.add(line);
      }
    } else if (tool === 'line-of-sight') {
      let posA: THREE.Vector3 | null = null;
      let posB: THREE.Vector3 | null = null;

      if (pointA) {
        posA = rasterToWorld(pointA.x, pointA.y);
        this.measurementGroup.add(createBeacon(posA, 0x10b981, observerOffsetA)); // Emerald for Observer A
      }
      if (pointB) {
        posB = rasterToWorld(pointB.x, pointB.y);
        this.measurementGroup.add(createBeacon(posB, 0x0ea5e9, targetOffsetB)); // Sky blue for Target B
      }

      if (posA && posB && pointA && pointB) {
        // 1. Draped surface path
        const steps = 40;
        const groundPoints: THREE.Vector3[] = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const curRx = pointA.x + t * (pointB.x - pointA.x);
          const curRy = pointA.y + t * (pointB.y - pointA.y);
          const curWorld = rasterToWorld(curRx, curRy);
          curWorld.y += 0.15;
          groundPoints.push(curWorld);
        }
        const groundLineGeo = new THREE.BufferGeometry().setFromPoints(groundPoints);
        const groundLineMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
        this.measurementGroup.add(new THREE.Line(groundLineGeo, groundLineMat));

        // 2. Direct 3D LOS ray
        const rayStart = new THREE.Vector3(posA.x, posA.y + 2.5 + observerOffsetA, posA.z);
        const rayEnd = new THREE.Vector3(posB.x, posB.y + 2.5 + targetOffsetB, posB.z);

        const isBlocked = losResult?.status === 'BLOCKED';
        const isVis = losResult?.status === 'VISIBLE';
        const rayColor = isBlocked ? 0xef4444 : (isVis ? 0x10b981 : 0x38bdf8);

        const rayGeo = new THREE.BufferGeometry().setFromPoints([rayStart, rayEnd]);
        const rayMat = new THREE.LineBasicMaterial({ color: rayColor, linewidth: 3 });
        this.measurementGroup.add(new THREE.Line(rayGeo, rayMat));

        // 3. Highlight first blocking point if blocked
        if (isBlocked && losResult?.first_blocking_point) {
          const bp = losResult.first_blocking_point;
          const blockWorld = rasterToWorld(bp.x, bp.y);

          // Red obstruction marker
          const blockGeo = new THREE.SphereGeometry(0.8, 16, 16);
          const blockMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
          const blockMesh = new THREE.Mesh(blockGeo, blockMat);
          blockMesh.position.set(blockWorld.x, blockWorld.y + 0.8, blockWorld.z);
          this.measurementGroup.add(blockMesh);
        }
      }
    }

    this.requestRender();
  }

  /**
   * Updates the analytical visualization layer on the terrain mesh.
   */
  public setTerrainLayer(options: AnalyticalLayerOptions): void {
    if (this.isDisposed) return;
    if (options.rgbTextureUrl !== undefined) {
      this.terrainMesh.setRgbTexture(options.rgbTextureUrl, () => {
        if (!this.isDisposed) this.requestRender();
      });
    }
    this.terrainMesh.setAnalyticalLayer(options);
    this.requestRender();
  }

  /**
   * Directly sets or updates the draped RGB texture on the terrain.
   */
  public setRgbTexture(url: string | null): void {
    if (this.isDisposed) return;
    this.terrainMesh.setRgbTexture(url, () => {
      if (!this.isDisposed) this.requestRender();
    });
    this.requestRender();
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isLoopRunning = false;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.firstPersonControls.dispose();
    this.controls.dispose();

    this.scene.remove(this.terrainMesh.mesh);
    this.terrainMesh.dispose();

    this.scene.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
