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

function applyReadableEnemyAttitudeV19(group: THREE.Group, enemy: SkyDancerArcadeEnemySnapshot): void {
  const rig = new THREE.Group();
  rig.name = "arcade-enemy-v19-readable-attitude-rig";

  // Keep lock/aim UI on the outer enemy group. Only the aircraft visual body is tilted.
  const visuals = [...group.children];
  for (const visual of visuals) rig.add(visual);
  group.add(rig);

  const kindIndex = enemy.kind === "fighter"
    ? 0
    : enemy.kind === "interceptor"
      ? 1
      : enemy.kind === "bomber"
        ? 2
        : enemy.kind === "missile-boat"
          ? 3
          : 4;
  const pitchSign = (enemy.id + kindIndex) % 3 === 0 ? 1 : -1;
  const rollSign = (enemy.id + kindIndex) % 2 === 0 ? 1 : -1;
  const pitchMagnitude = enemy.kind === "ace"
    ? .19
    : enemy.kind === "interceptor"
      ? .17
      : enemy.kind === "fighter"
        ? .155
        : enemy.kind === "missile-boat"
          ? .135
          : .115;
  const rollMagnitude = enemy.kind === "ace"
    ? .105
    : enemy.kind === "fighter" || enemy.kind === "interceptor"
      ? .08
      : .045;
  const yawMagnitude = enemy.kind === "bomber" ? .035 : .055;

  // A modest deterministic three-axis bias exposes wing surface and fuselage volume instead of
  // leaving the aircraft in a near-perfect frontal projection. Existing runtime pitch/bank still
  // applies on the outer group, so maneuvers and hit reactions remain authoritative.
  rig.rotation.set(
    pitchSign * pitchMagnitude,
    rollSign * yawMagnitude,
    rollSign * rollMagnitude,
  );
  rig.scale.y = enemy.kind === "bomber" || enemy.kind === "missile-boat" ? 1.08 : 1.1;
  rig.userData.arcadeEnemyReadableAttitudeV19 = true;
  rig.userData.arcadeEnemyPitchBiasV19 = pitchSign * pitchMagnitude;
  rig.userData.arcadeEnemyYawBiasV19 = rollSign * yawMagnitude;
  rig.userData.arcadeEnemyRollBiasV19 = rollSign * rollMagnitude;
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
