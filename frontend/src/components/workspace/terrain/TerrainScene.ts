/**
 * DepthWizard — Terrain Scene & Lighting Environment (Three.js V2.4)
 * Authority: Three.js V2.4 Specification & docs/design/design-system.md
 *
 * Implements softened, presentation-quality geospatial illumination:
 * - Directional relief preserved (NW 315° Swiss topographic relief angle)
 * - Soft shadow transitions with balanced ambient fill (no pitch-black cavities)
 * - Restrained peak intensity (no blown-out white summits)
 * - Full resource disposal on scene teardown
 */

import * as THREE from 'three';

export class TerrainScene {
  public readonly scene: THREE.Scene;

  public readonly ambientLight: THREE.AmbientLight;
  public readonly hemisphereLight: THREE.HemisphereLight;
  public readonly primaryDirectionalLight: THREE.DirectionalLight;
  public readonly fillDirectionalLight: THREE.DirectionalLight;
  public readonly rimDirectionalLight: THREE.DirectionalLight;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.name = 'DepthWizard_TerrainScene';

    // Deep graphite/navy background matching design tokens (#080c12)
    this.scene.background = new THREE.Color(0x080c12);

    // 1. Soft atmospheric hemisphere light: cool sky radiance above, subtle geological ground bounce below
    this.hemisphereLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.60);
    this.hemisphereLight.name = 'Hemisphere_AmbientFill';
    this.scene.add(this.hemisphereLight);

    // 2. Controlled base ambient illumination ensuring zero completely black shadowed valleys
    this.ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.32);
    this.ambientLight.name = 'AmbientLight_Base';
    this.scene.add(this.ambientLight);

    // 3. Primary directional sun lighting: NW 315° cartographic relief angle (Swiss topographic relief standard)
    // Soft specular highlight, natural contrast
    this.primaryDirectionalLight = new THREE.DirectionalLight(0xfffbf5, 1.15);
    this.primaryDirectionalLight.name = 'Sun_PrimaryDirectional';
    this.primaryDirectionalLight.position.set(-70, 75, -70);
    this.scene.add(this.primaryDirectionalLight);

    // 4. Secondary directional fill light from SE opposite quadrant to soften shadows and illuminate valleys
    this.fillDirectionalLight = new THREE.DirectionalLight(0xa5b4fc, 0.35);
    this.fillDirectionalLight.name = 'Fill_SecondaryDirectional';
    this.fillDirectionalLight.position.set(65, 40, 65);
    this.scene.add(this.fillDirectionalLight);

    // 5. Subtle grazing rim light to delineate terrain edge silhouettes against the dark graphite background
    this.rimDirectionalLight = new THREE.DirectionalLight(0xa0aec0, 0.15);
    this.rimDirectionalLight.name = 'Rim_EdgeDirectional';
    this.rimDirectionalLight.position.set(20, 25, -80);
    this.scene.add(this.rimDirectionalLight);
  }

  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Cleans up scene lights and child objects.
   */
  public dispose(): void {
    this.scene.remove(this.hemisphereLight);
    this.hemisphereLight.dispose();

    this.scene.remove(this.ambientLight);
    this.ambientLight.dispose();

    this.scene.remove(this.primaryDirectionalLight);
    this.primaryDirectionalLight.dispose();

    this.scene.remove(this.fillDirectionalLight);
    this.fillDirectionalLight.dispose();

    this.scene.remove(this.rimDirectionalLight);
    this.rimDirectionalLight.dispose();

    this.scene.clear();
  }
}
