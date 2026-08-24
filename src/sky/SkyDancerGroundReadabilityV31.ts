import * as THREE from "three";

interface GroundReadabilityRuntime {
  scene: THREE.Scene;
}

/**
 * Final high-altitude readability calibration for V31.
 *
 * Geometry size is owned by SkyDancerGroundDensityV31. This pass restores the
 * green valley itself before tuning secondary details: the opaque V30 foundation
 * stays intact, but it no longer receives long-distance blue fog that made the
 * entire lower frame look like sky in real WebGL captures.
 */
export class SkyDancerGroundReadabilityV31 {
  private prepared = false;

  constructor(private readonly runtime: GroundReadabilityRuntime) {}

  update(): void {
    if (this.prepared) return;
    const scene = this.runtime.scene;
    const foundation = scene.getObjectByName("sky-dancer-v30-ground-foundation");
    const fields = scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    const buildings = scene.getObjectByName("sky-dancer-v31-settlement-buildings");
    const trees = scene.getObjectByName("sky-dancer-v31-forest-belts");
    const roads = scene.getObjectByName("sky-dancer-v31-road-network");
    const towers = scene.getObjectByName("sky-dancer-v31-landmark-towers");
    const skyline = scene.getObjectByName("sky-dancer-v29-reference-skyline");
    if (!(foundation instanceof THREE.Mesh)
      || !(foundation.material instanceof THREE.MeshLambertMaterial)
      || !(fields instanceof THREE.InstancedMesh)
      || !(buildings instanceof THREE.InstancedMesh)
      || !(trees instanceof THREE.InstancedMesh)
      || !(roads instanceof THREE.InstancedMesh)
      || !(towers instanceof THREE.InstancedMesh)
      || !skyline) return;

    // The V30 foundation is the safety layer that eliminated black/transparent
    // ground gaps. Keep it opaque and depth-writing, but remove fog from that
    // material so its authored green vertex colours survive the 300 m view.
    foundation.material.fog = false;
    foundation.material.transparent = false;
    foundation.material.depthWrite = true;
    foundation.material.color.setHex(0xffffff);
    foundation.material.emissive.setHex(0x0a1e10);
    foundation.material.emissiveIntensity = 0.12;
    foundation.material.needsUpdate = true;

    skyline.position.set(-18, 0, 336);
    skyline.scale.setScalar(0.64);

    // Atmosphere begins beyond the useful ground-detail range. Mountains and
    // horizon clouds still fade with distance, while fields and settlements are
    // explicitly fog-free and remain legible like the supplied arcade reference.
    scene.fog = new THREE.Fog(0x6ba8be, 900, 1920);
    this.prepared = true;
  }
}
