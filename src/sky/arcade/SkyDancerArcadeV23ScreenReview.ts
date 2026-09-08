import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

export const SKY_DANCER_ARCADE_V23_CITY_INNER_INSTANCE_LIMIT = 55;
export const SKY_DANCER_ARCADE_V23_CITY_OUTWARD_SHIFT = 7;
export const SKY_DANCER_ARCADE_V23_CITY_INNER_WIDTH_SCALE = .78;

/**
 * V23 screenshot review: the closest Dawn City tower lane still read as broad flat slabs on a
 * 844x390 phone capture. Keep the exact route/collision geometry, but open the visual canyon by
 * moving only instanced architecture farther from centre and slimming its screen-facing width.
 */
export function skyDancerArcadeCityInstancePoseV23(
  x: number,
  scaleX: number,
): { x: number; scaleX: number; tuned: boolean } {
  if (Math.abs(x) >= SKY_DANCER_ARCADE_V23_CITY_INNER_INSTANCE_LIMIT || Math.abs(x) < 1) {
    return { x, scaleX, tuned: false };
  }
  const side = Math.sign(x);
  return {
    x: x + side * SKY_DANCER_ARCADE_V23_CITY_OUTWARD_SHIFT,
    scaleX: scaleX * SKY_DANCER_ARCADE_V23_CITY_INNER_WIDTH_SCALE,
    tuned: true,
  };
}

function tuneCityInstances(chunk: THREE.Object3D): number {
  let tuned = 0;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  chunk.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    // Cloud puffs are intentional near/far atmosphere, not architecture.
    if (object.name.startsWith("arcade-product-cloud-deck")) return;

    let changed = false;
    for (let index = 0; index < object.count; index += 1) {
      object.getMatrixAt(index, matrix);
      matrix.decompose(position, quaternion, scale);
      const next = skyDancerArcadeCityInstancePoseV23(position.x, scale.x);
      if (!next.tuned) continue;
      position.x = next.x;
      scale.x = next.scaleX;
      matrix.compose(position, quaternion, scale);
      object.setMatrixAt(index, matrix);
      tuned += 1;
      changed = true;
    }
    if (changed) {
      object.instanceMatrix.needsUpdate = true;
      object.computeBoundingSphere();
      object.userData.arcadeV23PhoneCityTuned = true;
    }
  });
  return tuned;
}

/** Presentation-only pass. Gameplay hazards, route spline, city river, banks and bridges are untouched. */
export function applySkyDancerArcadeV23ScreenReview(
  scene: THREE.Scene,
  stage: SkyDancerArcadeStageDefinition,
): void {
  if (stage.biome !== "city") return;
  const root = scene.getObjectByName("arcade-course-environment");
  if (!root) return;

  let tunedInstances = 0;
  for (const chunk of root.children) {
    if (!chunk.name.startsWith("arcade-course-chunk-")) continue;
    if (chunk.userData.arcadeCityCompositionV1033 !== true) continue;
    tunedInstances += tuneCityInstances(chunk);
    chunk.userData.arcadeV23ScreenReview = true;
  }
  root.userData.arcadeV23ScreenReview = true;
  root.userData.arcadeV23CityTunedInstances = tunedInstances;
  root.userData.arcadeV23GameplayGeometryUnchanged = true;
}
