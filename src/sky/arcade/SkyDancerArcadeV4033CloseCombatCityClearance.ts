import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

export const SKY_DANCER_ARCADE_V4033_CITY_TOWER_MIN_X = 48;
export const SKY_DANCER_ARCADE_V4033_CITY_TOWER_LIMIT_X = 82;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * V40.33 play-review follow-up: after V23/V27.1, Dawn City could still let the closest
 * decorative tower faces dominate a sharp-yaw close dogfight on an 844x390 phone frame.
 * This is a final, presentation-only clearance pass for the tower InstancedMeshes only.
 * Route gates, river/banks, collisions, hazards and combat placement remain untouched.
 */
export function skyDancerArcadeCityTowerPoseV4033(
  x: number,
  scaleX: number,
): { x: number; scaleX: number; tuned: boolean } {
  const ax = Math.abs(x);
  if (ax < SKY_DANCER_ARCADE_V4033_CITY_TOWER_MIN_X || ax >= SKY_DANCER_ARCADE_V4033_CITY_TOWER_LIMIT_X) {
    return { x, scaleX, tuned: false };
  }

  const strength = clamp(
    (SKY_DANCER_ARCADE_V4033_CITY_TOWER_LIMIT_X - ax)
      / (SKY_DANCER_ARCADE_V4033_CITY_TOWER_LIMIT_X - SKY_DANCER_ARCADE_V4033_CITY_TOWER_MIN_X),
    0,
    1,
  );
  const side = Math.sign(x) || 1;
  const outward = 5 + strength * 5.5;
  const widthScale = .9 - strength * .11;

  return {
    x: x + side * outward,
    scaleX: scaleX * widthScale,
    tuned: true,
  };
}

function tuneCityTowerInstancesV4033(chunk: THREE.Object3D): number {
  let tuned = 0;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  chunk.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    if (!object.name.startsWith("arcade-product-city-towers")) return;

    let changed = false;
    for (let index = 0; index < object.count; index += 1) {
      object.getMatrixAt(index, matrix);
      matrix.decompose(position, quaternion, scale);
      const next = skyDancerArcadeCityTowerPoseV4033(position.x, scale.x);
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
      object.userData.arcadeV4033CloseCombatClearance = true;
    }
  });

  return tuned;
}

export function applySkyDancerArcadeV4033CloseCombatCityClearance(
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
    tunedInstances += tuneCityTowerInstancesV4033(chunk);
  }

  root.userData.arcadeV4033CloseCombatCityClearance = true;
  root.userData.arcadeV4033CityTowerTunedInstances = tunedInstances;
  root.userData.arcadeV4033GameplayGeometryUnchanged = true;
}
