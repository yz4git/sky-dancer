import * as THREE from "three";

interface GroundReadabilityRuntime {
  scene: THREE.Scene;
}

/**
 * Final high-altitude readability calibration for V31.
 *
 * Geometry size is now owned by SkyDancerGroundDensityV31 itself. This pass only
 * adjusts atmosphere once, avoiding the previous shared-geometry scale-up that
 * turned one district into a dominant white block in the real WebGL captures.
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
    if (!(fields instanceof THREE.InstancedMesh)
      || !(buildings instanceof THREE.InstancedMesh)
      || !(trees instanceof THREE.InstancedMesh)
      || !(roads instanceof THREE.InstancedMesh)
      || !(towers instanceof THREE.InstancedMesh)) return;

    // Preserve enough atmospheric perspective for scale, but do not wash the
    // populated valley back into a cyan board at the 300 m flight level.
    scene.fog = new THREE.Fog(0x5da4be, 690, 1760);
    this.prepared = true;
  }
}
