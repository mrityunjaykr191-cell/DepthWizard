/**
 * DepthWizard — Terrain Materials
 * Authority: docs/design/design-system.md & Three.js V2.4 Specification
 *
 * Implements restrained, technically credible materials for the terrain viewport.
 * Configured as a pure dielectric matte geological surface with zero artificial glossiness.
 */

import * as THREE from 'three';

export interface TerrainMaterialOptions {
  wireframe?: boolean;
  color?: number | string;
  roughness?: number;
  metalness?: number;
}

/**
 * Creates the primary MeshStandardMaterial for technical terrain visualization.
 * Tuned as a matte, non-specular scientific geological surface.
 */
export function createTerrainMaterial(options: TerrainMaterialOptions = {}): THREE.MeshStandardMaterial {
  const {
    wireframe = false,
    color = 0x5a6878, // Neutral matte mineral slate bedrock tone with balanced diffuse luminance
    roughness = 0.88, // Clean matte diffuse response suppressing specular glare and micro-hotspots
    metalness = 0.0   // Pure dielectric natural ground (zero metallic sheen)
  } = options;

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    wireframe,
    flatShading: false,
    side: THREE.FrontSide
  });
}

/**
 * Disposes a Three.js material cleanly to prevent WebGL memory leaks.
 */
export function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose());
  } else if (material) {
    material.dispose();
  }
}
