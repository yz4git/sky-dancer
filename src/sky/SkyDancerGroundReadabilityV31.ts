import * as THREE from "three";

interface GroundReadabilityRuntime {
  scene: THREE.Scene;
}

/**
 * Final high-altitude readability calibration for V31 ground instances.
 * Scaling the shared geometries preserves the deterministic instance positions
 * and draw-call budget while making districts, roads and forest belts readable
 * from the 300 m chase camera.
 */
export class SkyDancerGroundReadabilityV31 {
  private prepared = false;

  constructor(private readonly runtime: GroundReadabilityRuntime) {}

  update(): void {
    if (this.prepared) return;
    const scene = this.runtime.scene;
    const buildings = scene.getObjectByName("sky-dancer-v31-settlement-buildings");
    const trees = scene.getObjectByName("sky-dancer-v31-forest-belts");
    const roads = scene.getObjectByName("sky-dancer-v31-road-network");
    const towers = scene.getObjectByName("sky-dancer-v31-landmark-towers");
    if (!(buildings instanceof THREE.InstancedMesh)
      || !(trees instanceof THREE.InstancedMesh)
      || !(roads instanceof THREE.InstancedMesh)
      || !(towers instanceof THREE.InstancedMesh)) return;

    buildings.geometry.scale(1.48, 1.95, 1.48);
    trees.geometry.scale(1.32, 1.62, 1.32);
    roads.geometry.scale(1.65, 1, 1);
    towers.geometry.scale(1.34, 1.48, 1.34);

    buildings.geometry.computeBoundingSphere();
    trees.geometry.computeBoundingSphere();
    roads.geometry.computeBoundingSphere();
    towers.geometry.computeBoundingSphere();

    if (buildings.material instanceof THREE.MeshLambertMaterial) {
      buildings.material.color.setHex(0xffffff);
      buildings.material.needsUpdate = true;
    }
    if (trees.material instanceof THREE.MeshLambertMaterial) {
      trees.material.color.setHex(0xf4fff0);
      trees.material.needsUpdate = true;
    }
    if (roads.material instanceof THREE.MeshBasicMaterial) {
      roads.material.color.setHex(0xffffff);
      roads.material.toneMapped = false;
      roads.material.needsUpdate = true;
    }

    // Keep atmospheric perspective but delay full washout so the player sees a
    // populated world rather than an empty cyan floor at the 300 m flight level.
    scene.fog = new THREE.Fog(0x4c98ba, 780, 1810);
    this.prepared = true;
  }
}
