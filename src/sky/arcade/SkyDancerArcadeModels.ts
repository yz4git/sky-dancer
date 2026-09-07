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

function polishEnemySilhouetteV18(group: THREE.Group): void {
  const beacons = group.getObjectByName("arcade-enemy-v18-round-beacons");
  if (beacons instanceof THREE.Points && beacons.material instanceof THREE.ShaderMaterial) {
    beacons.material.vertexShader = beacons.material.vertexShader.replace("gl_PointSize=6.0", "gl_PointSize=4.2");
    beacons.material.needsUpdate = true;
    beacons.userData.arcadeEnemyBeaconPointSizeV18 = 4.2;
  }

  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const luminance = material.color.r + material.color.g + material.color.b;
      if (luminance < .38) continue;
      material.emissive.copy(material.color).multiplyScalar(.2);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, .24);
    }
  });
  group.userData.arcadeEnemyBodyReadabilityV18 = true;
}

function createStandardEnemy(stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  if (enemy.kind === "boss") return createReferenceCarrier(stage);
  const fighter = createSkyDancerArcadeEnemyAirframeV18(stage, enemy.kind);
  const visualScale = skyDancerArcadeEnemyVisualScaleV17(enemy.kind);
  fighter.scale.multiplyScalar(visualScale);
  polishEnemySilhouetteV18(fighter);
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
