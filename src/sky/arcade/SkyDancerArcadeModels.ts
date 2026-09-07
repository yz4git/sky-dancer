import * as THREE from "three";
import { createReferenceCarrier } from "./SkyDancerArcadeReferenceAirframes";
import { createSkyDancerArcadeEnemyAirframeV18 } from "./SkyDancerArcadeEnemyAirframes";
import type { SkyDancerArcadeEnemySnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
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

function applyReadableEnemyAttitudeV19(group: THREE.Group, enemy: SkyDancerArcadeEnemySnapshot): void {
  const rig = new THREE.Group();
  rig.name = "arcade-enemy-v19-readable-attitude-rig";

  // Keep lock/aim UI on the outer enemy group. Only the aircraft visual body is tilted.
  const visuals = [...group.children];
  for (const visual of visuals) rig.add(visual);
  group.add(rig);

  if (enemy.kind === "boss") return;
  const kindIndex: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: 0, interceptor: 1, bomber: 2, "missile-boat": 3, ace: 4,
    drone: 5, striker: 6, gunship: 7, raider: 8,
  };
  const pitchByKind: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: .155, interceptor: .17, bomber: .115, "missile-boat": .135, ace: .19,
    drone: .205, striker: .16, gunship: .12, raider: .185,
  };
  const rollByKind: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: .08, interceptor: .08, bomber: .045, "missile-boat": .045, ace: .105,
    drone: .12, striker: .09, gunship: .05, raider: .115,
  };
  const yawByKind: Record<SkyDancerArcadeEnemyKind, number> = {
    fighter: .055, interceptor: .055, bomber: .035, "missile-boat": .055, ace: .06,
    drone: .07, striker: .06, gunship: .038, raider: .068,
  };
  const index = kindIndex[enemy.kind];
  const pitchSign = (enemy.id + index) % 3 === 0 ? 1 : -1;
  const rollSign = (enemy.id + index) % 2 === 0 ? 1 : -1;

  rig.rotation.set(
    pitchSign * pitchByKind[enemy.kind],
    rollSign * yawByKind[enemy.kind],
    rollSign * rollByKind[enemy.kind],
  );
  rig.scale.y = enemy.kind === "bomber" || enemy.kind === "missile-boat" || enemy.kind === "gunship" ? 1.08 : 1.1;
  rig.userData.arcadeEnemyReadableAttitudeV19 = true;
  rig.userData.arcadeEnemyPitchBiasV19 = rig.rotation.x;
  rig.userData.arcadeEnemyYawBiasV19 = rig.rotation.y;
  rig.userData.arcadeEnemyRollBiasV19 = rig.rotation.z;
  rig.userData.arcadeEnemyRosterV20 = enemy.kind;
  group.userData.arcadeEnemyReadableAttitudeV19 = true;
  group.userData.arcadeEnemyLogicalCollisionUnchangedV19 = true;
}

function createStandardEnemy(stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  if (enemy.kind === "boss") return createReferenceCarrier(stage);
  const fighter = createSkyDancerArcadeEnemyAirframeV18(stage, enemy.kind);
  const visualScale = skyDancerArcadeEnemyVisualScaleV17(enemy.kind);
  fighter.scale.multiplyScalar(visualScale);
  polishEnemySilhouetteV18(fighter);
  applyReadableEnemyAttitudeV19(fighter, enemy);
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
