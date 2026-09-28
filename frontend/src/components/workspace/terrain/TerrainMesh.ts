/**
 * DepthWizard — Generic Terrain Mesh & Geometry (Three.js V2.4)
 * Authority: Phase 1B.2 Scope & Three.js V2.4 Visual Refinement Spec
 *
 * ============================================================================
 * COORDINATE SYSTEM CONVENTION:
 * ============================================================================
 * X = Horizontal terrain axis (relative lateral grid dimension)
 * Y = Elevation axis (positive is strictly vertically upward)
 * Z = Horizontal terrain axis (relative longitudinal grid dimension)
 *
 * IMPORTANT ARCHITECTURAL RULES:
 * 1. PURELY VISUAL: The Three.js mesh uses a lightweight, resampled, edge-aware
 *    smoothed copy of the heightfield for rendering geometry and continuous normals.
 * 2. SOURCE IMMUTABILITY: The raw analytical elevation array (this.currentData.elevations)
 *    is NEVER modified or mutated.
 * 3. NO DATA FABRICATION: Measurements, slope calculations, height probes, cross-sections,
 *    and exports continue referencing raw analytical data.
 * ============================================================================
 */

import * as THREE from 'three';
import { ElevationMode } from '../../../types/contract';
import { createTerrainMaterial, disposeMaterial } from './terrainMaterials';
import { TerrainLayer } from '../../../state/WorkspaceContext';
import {
  createVisualHeightfield,
  resampleScalarGrid,
  TerrainVisualConfig,
  DEFAULT_VISUAL_CONFIG,
  ProcessedVisualTerrain
} from './terrainVisualPipeline';
import {
  generateElevationVertexColors,
  generateSlopeVertexColors,
  generateHillshadeVertexColors,
  generateErrorVertexColors
} from './analyticalColormaps';

export interface AnalyticalLayerOptions {
  layer: TerrainLayer;
  elevations?: Float32Array;
  minElev?: number;
  maxElev?: number;
  slopeData?: Float32Array;
  minSlope?: number;
  maxSlope?: number;
  hillshadeData?: Float32Array;
  screeningMask?: Uint8Array;
  errorData?: Float32Array;
  minError?: number;
  maxError?: number;
  nodata?: number | null;
  rgbTextureUrl?: string | null;
}

export interface TerrainElevationGrid {
  readonly cols: number;
  readonly rows: number;
  readonly elevations: Float32Array;
  readonly minElevation: number;
  readonly maxElevation: number;
  readonly mode: ElevationMode;
  readonly sourceId?: string;
  readonly worldWidth?: number;
  readonly worldDepth?: number;
  readonly baseElevation?: number;
  readonly verticalScale?: number;
  readonly geospatialBounds?: any;
  readonly nodata?: number | null;
}

export class TerrainMesh {
  public readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  public geometry: THREE.BufferGeometry;
  public readonly material: THREE.MeshStandardMaterial;

  private currentData: TerrainElevationGrid;
  private currentExaggeration: number;
  private activeLayer: TerrainLayer = 'rgb';
  private isWireframe: boolean = false;
  private lastLayerOptions?: AnalyticalLayerOptions;
  private rgbTexture: THREE.Texture | null = null;
  private currentTextureUrl: string | null = null;

  // Processed visual heightfield representation (Change 1-4)
  private processedVisual: ProcessedVisualTerrain;
  private visualConfig: TerrainVisualConfig;

  private onTextureLoadedCallback?: () => void;

  /**
   * Sets or updates the draped RGB optical texture on the terrain mesh.
   */
  public setRgbTexture(textureUrl: string | null, onLoaded?: () => void): void {
    if (onLoaded) {
      this.onTextureLoadedCallback = onLoaded;
    }

    if (this.currentTextureUrl === textureUrl) {
      if (this.rgbTexture && this.activeLayer === 'rgb') {
        this.updateMaterialSurface();
        onLoaded?.();
      }
      return;
    }
    this.currentTextureUrl = textureUrl;

    if (!textureUrl) {
      if (this.rgbTexture) {
        this.rgbTexture.dispose();
        this.rgbTexture = null;
      }
      if (this.activeLayer === 'rgb') {
        this.updateMaterialSurface();
      }
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (tex) => {
        if (this.rgbTexture) {
          this.rgbTexture.dispose();
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = 8;
        this.rgbTexture = tex;

        if (this.activeLayer === 'rgb') {
          this.updateMaterialSurface();
        }
        this.onTextureLoadedCallback?.();
      },
      undefined,
      (err) => {
        console.warn('[TerrainMesh] Failed to load RGB texture:', err);
      }
    );
  }

  constructor(
    initialData: TerrainElevationGrid,
    initialExaggeration: number = 1.0,
    visualConfig?: Partial<TerrainVisualConfig>
  ) {
    this.validateGridData(initialData);

    this.currentData = initialData;
    this.currentExaggeration = initialExaggeration;
    this.visualConfig = { ...DEFAULT_VISUAL_CONFIG, ...visualConfig };

    // Generate visual heightfield via visual pipeline (resample -> edge-aware smoothing -> relief shaping)
    this.processedVisual = createVisualHeightfield(
      initialData.elevations,
      initialData.cols,
      initialData.rows,
      initialData.minElevation,
      initialData.maxElevation,
      initialData.mode,
      this.visualConfig,
      initialData.geospatialBounds,
      initialData.nodata
    );

    this.geometry = new THREE.BufferGeometry();
    this.buildGeometryBuffers();

    this.material = createTerrainMaterial();

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'DepthWizard_TerrainMesh';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /**
   * Validates that elevation array length matches cols * rows strictly.
   */
  private validateGridData(data: TerrainElevationGrid): void {
    if (!data.elevations) {
      throw new Error('TerrainElevationGrid: elevations array is required.');
    }
    const expected = data.cols * data.rows;
    if (data.elevations.length !== expected) {
      throw new Error(
        `TerrainElevationGrid dimension mismatch: expected ${data.cols}x${data.rows} = ${expected} values, got ${data.elevations.length}.`
      );
    }
  }

  /**
   * Constructs or updates the geometry buffer attributes and index arrays using the visual heightfield.
   */
  private buildGeometryBuffers(): void {
    const { visualCols, visualRows, visualElevations, worldWidth, worldDepth, baseElevation, verticalScale } = this.processedVisual;

    const vertexCount = visualCols * visualRows;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    const halfWidth = worldWidth * 0.5;
    const halfDepth = worldDepth * 0.5;

    for (let r = 0; r < visualRows; r++) {
      const v = r / (visualRows - 1);
      const z = -halfDepth + v * worldDepth;

      for (let c = 0; c < visualCols; c++) {
        const u = c / (visualCols - 1);
        const x = -halfWidth + u * worldWidth;
        const index = r * visualCols + c;

        // Position: X, Y (visual smoothed elevation * exaggeration), Z
        const posIdx = index * 3;
        positions[posIdx] = x;
        // Source elevations are NEVER mutated; visual smoothing and exaggeration are applied purely to rendered geometry
        positions[posIdx + 1] = (visualElevations[index] - baseElevation) * verticalScale * this.currentExaggeration;
        positions[posIdx + 2] = z;

        // UV coordinates [0..1] perfectly mapped to texture
        const uvIdx = index * 2;
        uvs[uvIdx] = u;
        uvs[uvIdx + 1] = 1.0 - v;
      }
    }

    // Generate indices for indexed triangle quads (2 triangles per quad)
    const quadsX = visualCols - 1;
    const quadsZ = visualRows - 1;
    const indexCount = quadsX * quadsZ * 6;
    const indices = new Uint32Array(indexCount);

    let idxPtr = 0;
    for (let r = 0; r < quadsZ; r++) {
      for (let c = 0; c < quadsX; c++) {
        const row1 = r * visualCols;
        const row2 = (r + 1) * visualCols;

        const iA = row1 + c;
        const iB = row1 + c + 1;
        const iC = row2 + c;
        const iD = row2 + c + 1;

        // First triangle: A -> C -> B (counter-clockwise front-facing)
        indices[idxPtr++] = iA;
        indices[idxPtr++] = iC;
        indices[idxPtr++] = iB;

        // Second triangle: B -> C -> D (counter-clockwise front-facing)
        indices[idxPtr++] = iB;
        indices[idxPtr++] = iC;
        indices[idxPtr++] = iD;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Computes continuous, smooth Gouraud/Phong vertex normals from the visual smoothed surface
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  /**
   * Replaces the terrain elevation data with new generic grid data.
   * Full buffer reconstruction guarantees accurate bounds, normals, UVs, and vertex positions.
   */
  public setTerrainData(data: TerrainElevationGrid): boolean {
    this.validateGridData(data);

    this.currentData = data;

    // Recompute visual heightfield using updated dataset
    this.processedVisual = createVisualHeightfield(
      data.elevations,
      data.cols,
      data.rows,
      data.minElevation,
      data.maxElevation,
      data.mode,
      this.visualConfig,
      data.geospatialBounds,
      data.nodata
    );

    // Rebuild geometry buffers completely on a clean BufferGeometry instance.
    // Disposing old geometry frees WebGL buffers, flushes cached VAOs in bindingStates,
    // and purges stale wireframe index attributes in WebGLGeometries, preventing
    // wireframe line collapse/corruption across dataset switches.
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.mesh.geometry = this.geometry;
    this.buildGeometryBuffers();

    if (this.lastLayerOptions) {
      this.setAnalyticalLayer(this.lastLayerOptions);
    }

    return true;
  }

  /**
   * Dynamically configures visual heightfield parameters without modifying raw analytical data.
   */
  public setVisualConfig(config: Partial<TerrainVisualConfig>): boolean {
    this.visualConfig = {
      ...this.visualConfig,
      ...config
    };

    this.processedVisual = createVisualHeightfield(
      this.currentData.elevations,
      this.currentData.cols,
      this.currentData.rows,
      this.currentData.minElevation,
      this.currentData.maxElevation,
      this.currentData.mode,
      this.visualConfig,
      this.currentData.geospatialBounds,
      this.currentData.nodata
    );

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.mesh.geometry = this.geometry;
    this.buildGeometryBuffers();

    if (this.lastLayerOptions) {
      this.setAnalyticalLayer(this.lastLayerOptions);
    }

    return true;
  }

  public getVisualConfig(): Readonly<TerrainVisualConfig> {
    return this.visualConfig;
  }

  public getVisualElevations(): Float32Array {
    return this.processedVisual.visualElevations;
  }

  public getActiveLayer(): TerrainLayer {
    return this.activeLayer;
  }

  public getLastLayerOptions(): AnalyticalLayerOptions | undefined {
    return this.lastLayerOptions;
  }

  /**
   * Applies a rendering-only vertical exaggeration.
   *
   * CRITICAL GUARANTEE:
   * The source elevation array (this.currentData.elevations) remains completely unchanged.
   * Only the rendered BufferGeometry position attribute Y values are modified.
   */
  public setVerticalExaggeration(exaggeration: number): boolean {
    if (Math.abs(this.currentExaggeration - exaggeration) < 1e-4) {
      return false;
    }

    this.currentExaggeration = exaggeration;

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (!posAttr) return false;

    const positions = posAttr.array as Float32Array;
    const count = this.processedVisual.visualCols * this.processedVisual.visualRows;
    const baseElevation = this.processedVisual.baseElevation;
    const verticalScale = this.processedVisual.verticalScale;
    const elevations = this.processedVisual.visualElevations;

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = (elevations[i] - baseElevation) * verticalScale * exaggeration;
    }

    posAttr.needsUpdate = true;

    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    return true;
  }

  public getVerticalExaggeration(): number {
    return this.currentExaggeration;
  }

  /**
   * Synchronizes material properties (texture map, vertex colors, base color)
   * depending on whether solid surface or analytical wireframe is active.
   *
   * When wireframe is active on RGB layer:
   * Detaches the photographic RGB texture map so individual photo pixels (e.g. dark asphalt/shadows)
   * do not black out wireframe edges against the dark viewport, and isolated bright structures
   * do not appear as disconnected solid patches. Renders clean, visible slate wireframe (0x94a3b8)
   * across the complete terrain bounds.
   */
  private updateMaterialSurface(): void {
    if (this.activeLayer === 'rgb') {
      if (this.isWireframe) {
        this.material.map = null;
        this.material.color.setHex(0x94a3b8);
        this.material.vertexColors = false;
        this.material.roughness = 0.88;
        this.material.metalness = 0.0;
      } else if (this.rgbTexture) {
        this.material.map = this.rgbTexture;
        this.material.color.setHex(0xffffff);
        this.material.vertexColors = false;
        this.material.roughness = 0.85;
        this.material.metalness = 0.0;
      } else {
        // Fallback default Bedrock: matte mineral slate
        this.material.map = null;
        this.material.color.setHex(0x5a6878);
        this.material.vertexColors = false;
        this.material.roughness = 0.88;
        this.material.metalness = 0.0;
      }
      this.material.needsUpdate = true;
    } else {
      // In analytical layers (elevation, slope, hillshade, screening, error),
      // the layer colormap provides vertex colors.
      this.material.map = null;
      if (this.geometry.getAttribute('color')) {
        this.material.vertexColors = true;
        this.material.color.setHex(0xffffff);
      }
      this.material.needsUpdate = true;
    }
  }

  public setWireframe(enabled: boolean): boolean {
    if (this.isWireframe === enabled) {
      return false;
    }
    this.isWireframe = enabled;
    this.material.wireframe = enabled;
    this.updateMaterialSurface();
    return true;
  }

  public getWireframe(): boolean {
    return this.isWireframe;
  }

  public getTerrainData(): TerrainElevationGrid {
    return this.currentData;
  }

  /**
   * Returns the rendered Y elevation of the terrain at given world (X, Z) coordinates.
   * Uses bilinear interpolation across the visual smoothed grid vertices so navigation conforms to rendered geometry.
   */
  public getElevationAt(worldX: number, worldZ: number): number {
    const { visualCols, visualRows, visualElevations, worldWidth, worldDepth, baseElevation, verticalScale } = this.processedVisual;

    const halfWidth = worldWidth * 0.5;
    const halfDepth = worldDepth * 0.5;

    const u = Math.max(0, Math.min(1, (worldX + halfWidth) / worldWidth));
    const v = Math.max(0, Math.min(1, (worldZ + halfDepth) / worldDepth));

    const gx = u * (visualCols - 1);
    const gz = v * (visualRows - 1);

    const c0 = Math.floor(gx);
    const c1 = Math.min(visualCols - 1, c0 + 1);
    const r0 = Math.floor(gz);
    const r1 = Math.min(visualRows - 1, r0 + 1);

    const fx = gx - c0;
    const fz = gz - r0;

    const h00 = visualElevations[r0 * visualCols + c0] ?? baseElevation;
    const h10 = visualElevations[r0 * visualCols + c1] ?? baseElevation;
    const h01 = visualElevations[r1 * visualCols + c0] ?? baseElevation;
    const h11 = visualElevations[r1 * visualCols + c1] ?? baseElevation;

    const rawH = (1 - fx) * (1 - fz) * h00 + fx * (1 - fz) * h10 + (1 - fx) * fz * h01 + fx * fz * h11;
    return (rawH - baseElevation) * verticalScale * this.currentExaggeration;
  }

  public get gridData(): TerrainElevationGrid {
    return this.currentData;
  }

  public get visualGridDimensions(): { cols: number; rows: number } {
    return { cols: this.processedVisual.visualCols, rows: this.processedVisual.visualRows };
  }

  /**
   * Applies an analytical visualization layer (Elevation, Slope, Hillshade, or Default Bedrock).
   *
   * CRITICAL GUARANTEES:
   * - Does NOT alter vertex positions X, Y, Z.
   * - Does NOT mutate underlying Float32 elevation or derivative arrays.
   * - Invariant to Three.js vertical exaggeration.
   */
  public setAnalyticalLayer(options: AnalyticalLayerOptions): boolean {
    this.lastLayerOptions = options;
    this.activeLayer = options.layer;
    const { visualCols, visualRows } = this.processedVisual;
    const vertexCount = visualCols * visualRows;

    let colors: Float32Array | null = null;

    if (options.layer === 'rgb') {
      this.updateMaterialSurface();
      return true;
    } else {
      // Remove RGB texture map when viewing analytical layer
      this.material.map = null;
    }

    if (options.layer === 'elevation') {
      const elevs = options.elevations ?? this.currentData.elevations;
      const minE = options.minElev ?? this.currentData.minElevation;
      const maxE = options.maxElev ?? this.currentData.maxElevation;
      const sampledElevs = elevs.length === vertexCount
        ? elevs
        : resampleScalarGrid(elevs, this.currentData.cols, this.currentData.rows, visualCols, visualRows, options.nodata);
      colors = generateElevationVertexColors(sampledElevs, minE, maxE, options.nodata);
      this.material.roughness = 0.88;
      this.material.metalness = 0.0;
    } else if (options.layer === 'slope') {
      if (options.slopeData) {
        const minS = options.minSlope ?? 0;
        const maxS = options.maxSlope ?? 45;
        const sampledSlope = options.slopeData.length === vertexCount
          ? options.slopeData
          : resampleScalarGrid(options.slopeData, this.currentData.cols, this.currentData.rows, visualCols, visualRows, options.nodata);
        colors = generateSlopeVertexColors(sampledSlope, minS, maxS, options.nodata);
      } else {
        this.material.vertexColors = false;
        this.material.color.setHex(0x5a6878);
        this.material.needsUpdate = true;
        return false;
      }
      this.material.roughness = 0.88;
      this.material.metalness = 0.0;
    } else if (options.layer === 'hillshade') {
      if (options.hillshadeData) {
        const sampledHillshade = options.hillshadeData.length === vertexCount
          ? options.hillshadeData
          : resampleScalarGrid(options.hillshadeData, this.currentData.cols, this.currentData.rows, visualCols, visualRows, options.nodata);
        colors = generateHillshadeVertexColors(sampledHillshade, options.nodata);
      } else {
        this.material.vertexColors = false;
        this.material.color.setHex(0x5a6878);
        this.material.needsUpdate = true;
        return false;
      }
      this.material.roughness = 0.90;
      this.material.metalness = 0.0;
    } else if (options.layer === 'screening') {
      if (options.screeningMask) {
        // Resample screening mask to visual grid via nearest neighbor
        colors = new Float32Array(vertexCount * 3);
        const srcCols = this.currentData.cols;
        const srcRows = this.currentData.rows;
        const mask = options.screeningMask;

        for (let r = 0; r < visualRows; r++) {
          const srcR = Math.min(srcRows - 1, Math.round(r * (srcRows - 1) / Math.max(1, visualRows - 1)));
          for (let c = 0; c < visualCols; c++) {
            const srcC = Math.min(srcCols - 1, Math.round(c * (srcCols - 1) / Math.max(1, visualCols - 1)));
            const val = mask[srcR * srcCols + srcC];
            const colorIdx = (r * visualCols + c) * 3;

            if (val === 1) {
              // Suitable: soft emerald green
              colors[colorIdx] = 0.063;
              colors[colorIdx + 1] = 0.725;
              colors[colorIdx + 2] = 0.506;
            } else if (val === 0) {
              // Unsuitable: soft muted red
              colors[colorIdx] = 0.937;
              colors[colorIdx + 1] = 0.267;
              colors[colorIdx + 2] = 0.267;
            } else {
              // Unknown / NoData: dark slate gray
              colors[colorIdx] = 0.278;
              colors[colorIdx + 1] = 0.333;
              colors[colorIdx + 2] = 0.412;
            }
          }
        }
      } else {
        this.material.vertexColors = false;
        this.material.color.setHex(0x5a6878);
        this.material.needsUpdate = true;
        return false;
      }
      this.material.roughness = 0.88;
      this.material.metalness = 0.0;
    } else if (options.layer === 'error') {
      if (options.errorData) {
        const minE = options.minError ?? -10;
        const maxE = options.maxError ?? 10;
        const sampledError = options.errorData.length === vertexCount
          ? options.errorData
          : resampleScalarGrid(options.errorData, this.currentData.cols, this.currentData.rows, visualCols, visualRows, options.nodata);
        colors = generateErrorVertexColors(sampledError, minE, maxE, options.nodata);
      } else {
        this.material.vertexColors = false;
        this.material.color.setHex(0x5a6878);
        this.material.needsUpdate = true;
        return false;
      }
      this.material.roughness = 0.88;
      this.material.metalness = 0.0;
    }

    if (colors) {
      const existingColorAttr = this.geometry.getAttribute('color');
      if (existingColorAttr && existingColorAttr.array.length === colors.length) {
        (existingColorAttr.array as Float32Array).set(colors);
        existingColorAttr.needsUpdate = true;
      } else {
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      this.material.vertexColors = true;
      this.material.color.setHex(0xffffff);
      this.material.needsUpdate = true;
      return true;
    }

    return false;
  }

  public dispose(): void {
    if (this.rgbTexture) {
      this.rgbTexture.dispose();
      this.rgbTexture = null;
    }
    this.geometry.dispose();
    disposeMaterial(this.material);
  }
}
