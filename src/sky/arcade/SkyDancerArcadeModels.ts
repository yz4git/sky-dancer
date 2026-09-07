import * as THREE from "three";
import { createReferenceCarrier } from "./SkyDancerArcadeReferenceAirframes";
import { createSkyDancerArcadeEnemyAirframeV18 } from "./SkyDancerArcadeEnemyAirframes";
import type { SkyDancerArcadeEnemySnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import {
  createSkyDancerArcadeHazard,
  createSkyDancerArcadeLockRing,
  createSkyDancerArcadePlayer,
  extendArcadeGroundConnectorsV1052,
  skyDancerArcadeEnemyVisualScaleV17,
} from "./SkyDancerArcadeModelsLegacy";

export {
  createSkyDancerArcadeHazard,
  createSkyDancerArcadeLockRing,
  createSkyDancerArcadePlayer,
  extendArcadeGroundConnectorsV1052,
  skyDancerArcadeEnemyVisualScaleV17,
};

function createStandardEnemy(stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  if (enemy.kind === "boss") return createReferenceCarrier(stage);
  const fighter = createSkyDancerArcadeEnemyAirframeV18(stage, enemy.kind);
  const visualScale = skyDancerArcadeEnemyVisualScaleV17(enemy.kind);
  fighter.scale.multiplyScalar(visualScale);
  fighter.userData.arcadeEnemyReadabilityV17 = true;
  fighter.userData.arcadeEnemyVisualScaleV17 = visualScale;
  fighter.userData.arcadeEnemyLogicalCollisionUnchangedV17 = true;
  fighter.userData.arcadeEnemySilhouetteV18 = true;
  fighter.userData.arcadeEnemyLogicalCollisionUnchangedV18 = true;
  return fighter;
}

function createBoss(stage: SkyDancerArcadeStageDefinition): THREE.Group {
  return createReferenceCarrier(stage);
}

export function createSkyDancerArcadeEnemy(
  stage: SkyDancerArcadeStageDefinition,
  enemy: SkyDancerArcadeEnemySnapshot,
): THREE.Group {
  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage) : createStandardEnemy(stage, enemy);
  group.name = `arcade-enemy-${enemy.id}`;
  if (enemy.locked) group.add(createSkyDancerArcadeLockRing(0xff3970));
  return group;
}
