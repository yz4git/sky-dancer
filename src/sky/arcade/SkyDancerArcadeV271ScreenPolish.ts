import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { skyDancerArcadeV27CloseCombatCrowded } from "./SkyDancerArcadeV27CombatReadability";

export const SKY_DANCER_ARCADE_V271_CITY_INNER_LIMIT = 82;
export const SKY_DANCER_ARCADE_V271_CITY_MIN_TUNED_X = 36;
export const SKY_DANCER_ARCADE_V271_FRONT_DEPTH = 58;
export const SKY_DANCER_ARCADE_V271_FRONT_CAP_NORMAL = 7;
export const SKY_DANCER_ARCADE_V271_FRONT_CAP_HARD = 9;

export interface SkyDancerArcadeV271CueBudget {
  primaryLocks: number;
  aimCues: number;
  counterplayCues: number;
  secondaryLockScale: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * V27.1 screen review: V23 opened the first city lane, but sharp yaw still let the nearest
 * 3D tower faces cover too much of an 844x390 frame. Apply a second presentation-only falloff
 * to the two inner visual lanes; route, collision, river and bank geometry are unchanged.
 */
export function skyDancerArcadeCityInstancePoseV271(
  x: number,
  scaleX: number,
): { x: number; scaleX: number; tuned: boolean } {
  const ax = Math.abs(x);
  if (ax < SKY_DANCER_ARCADE_V271_CITY_MIN_TUNED_X || ax >= SKY_DANCER_ARCADE_V271_CITY_INNER_LIMIT) {
    return { x, scaleX, tuned: false };
  }
  const strength = clamp(
    (SKY_DANCER_ARCADE_V271_CITY_INNER_LIMIT - ax)
      / (SKY_DANCER_ARCADE_V271_CITY_INNER_LIMIT - SKY_DANCER_ARCADE_V271_CITY_MIN_TUNED_X),
    0,
    1,
  );
  const side = Math.sign(x) || 1;
  const outward = 3.5 + strength * 4.5;
  const widthScale = 1 - strength * .26;
  return {
    x: x + side * outward,
    scaleX: scaleX * widthScale,
    tuned: true,
  };
}

/** Phone-size targeting information budget. Secondary locks stay visible, but stop competing with the current threats. */
export function skyDancerArcadeV271CueBudget(compactLandscape: boolean): SkyDancerArcadeV271CueBudget {
  return compactLandscape
    ? { primaryLocks: 4, aimCues: 2, counterplayCues: 2, secondaryLockScale: .52 }
    : { primaryLocks: 6, aimCues: 3, counterplayCues: 3, secondaryLockScale: .68 };
}

/** Stable threat score used only to decide which targeting cues get the full visual footprint. */
export function skyDancerArcadeV271ThreatCueScore(
  depth: number,
  aimDistance: number,
  locked: boolean,
  boss: boolean,
): number {
  return (boss ? 2400 : 0)
    + (locked ? 1200 : 0)
    + Math.max(0, 72 - depth) * 3.2
    + Math.max(0, 2.2 - aimDistance) * 220;
}

export function skyDancerArcadeV271FrontCombatCrowded(depths: readonly number[], hard: boolean): boolean {
  const cap = hard ? SKY_DANCER_ARCADE_V271_FRONT_CAP_HARD : SKY_DANCER_ARCADE_V271_FRONT_CAP_NORMAL;
  return depths.filter((depth) => depth > -2 && depth <= SKY_DANCER_ARCADE_V271_FRONT_DEPTH).length >= cap;
}

/** V27.1 adds a mid-range/front-band budget on top of V27's close-range budget. */
export function skyDancerArcadeV271CombatCorridorCrowded(depths: readonly number[], hard: boolean): boolean {
  return skyDancerArcadeV27CloseCombatCrowded(depths, hard)
    || skyDancerArcadeV271FrontCombatCrowded(depths, hard);
}

function tuneCityInstancesV271(chunk: THREE.Object3D): number {
  let tuned = 0;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  chunk.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    if (object.name.startsWith("arcade-product-cloud-deck")) return;

    let changed = false;
    for (let index = 0; index < object.count; index += 1) {
      object.getMatrixAt(index, matrix);
      matrix.decompose(position, quaternion, scale);
      const next = skyDancerArcadeCityInstancePoseV271(position.x, scale.x);
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
      object.userData.arcadeV271PhoneCityTuned = true;
    }
  });
  return tuned;
}

/** Presentation-only. It intentionally runs after the V23 city pass. */
export function applySkyDancerArcadeV271ScreenPolish(
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
    tunedInstances += tuneCityInstancesV271(chunk);
    chunk.userData.arcadeV271ScreenPolish = true;
  }
  root.userData.arcadeV271ScreenPolish = true;
  root.userData.arcadeV271CityTunedInstances = tunedInstances;
  root.userData.arcadeV271GameplayGeometryUnchanged = true;
}
