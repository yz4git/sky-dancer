import * as THREE from "three";

interface GroundReadabilityRuntime {
  scene: THREE.Scene;
}

/**
 * Final high-altitude readability calibration for V31.
 *
 * Geometry size is owned by SkyDancerGroundDensityV31. This pass adjusts the
 * shared atmosphere and demotes the old single V29 skyline so distributed V31
 * fields, forests and settlements become the world hierarchy rather than one
 * oversized pale city block.
 */
export class SkyDancerGroundReadabilityV31 {
  private prepared = false;

  constructor(private readonly runtime: GroundReadabilityRuntime) {}

  update(): void {
    if (this.prepared) return;
    const scene = this.runtime.scene;
    const fields = scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    const buildings = scene.getObjectByName("sky-dancer-v31-settlement-buildings");
    const trees = scene.getObjectByName("sky-dancer-v31-forest-belts");
    const roads = scene.getObjectByName("sky-dancer-v31-road-network");
    const towers = scene.getObjectByName("sky-dancer-v31-landmark-towers");
    const skyline = scene.getObjectByName("sky-dancer-v29-reference-skyline");
    if (!(fields instanceof THREE.InstancedMesh)
      || !(buildings instanceof THREE.InstancedMesh)
      || !(trees instanceof THREE.InstancedMesh)
      || !(roads instanceof THREE.InstancedMesh)
      || !(towers instanceof THREE.InstancedMesh)
      || !skyline) return;

    skyline.position.set(-18, 0, 318);
    skyline.scale.setScalar(0.72);

    // Preserve enough atmospheric perspective for scale, but do not wash the
    // populated valley back into a cyan board at the 300 m flight level.
    scene.fog = new THREE.Fog(0x5b9fb9, 760, 1780);
    this.prepared = true;
  }
}
