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

function decorateV405FinalBoss(group: THREE.Group, enemy: SkyDancerArcadeEnemySnapshot): void {
  if (!enemy.finalBossForm) return;
  const accent = enemy.finalBossAccent ?? 0xb993ff;
  const glow = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 2.15,
    roughness: .24,
    metalness: .62,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151328, roughness: .4, metalness: .72 });
  const rig = new THREE.Group();
  rig.name = "arcade-v405-final-boss-form";

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    rig.add(mesh);
    return mesh;
  };

  if (enemy.finalBossForm === "MIRROR_AEGIS") {
    for (const side of [-1, 1]) {
      const ring = add(new THREE.TorusGeometry(2.05, .13, 6, 20), glow, side * 7.2, 1.45, .2);
      ring.rotation.y = side * .18;
      const shield = add(new THREE.BoxGeometry(.3, 3.8, 4.8), dark, side * 6.9, .2, 1.1);
      shield.rotation.z = side * .12;
    }
  } else if (enemy.finalBossForm === "PRISM_CROWN") {
    for (let index = 0; index < 5; index += 1) {
      const x = (index - 2) * 2.15;
      const shard = add(new THREE.OctahedronGeometry(.72 + Math.abs(index - 2) * .08, 0), glow, x, 3.25 + (2 - Math.abs(index - 2)) * .45, -.6);
      shard.rotation.z = index * .35;
    }
  } else if (enemy.finalBossForm === "HELLSTAR") {
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index += 1) {
        const spike = add(new THREE.ConeGeometry(.34, 2.6 + index * .45, 6), glow, side * (4.9 + index * 1.45), 2.25 - index * .38, .4 + index * .8);
        spike.rotation.z = side * (Math.PI * .42);
      }
    }
    add(new THREE.TorusGeometry(3.15, .16, 6, 24), glow, 0, 1.2, 2.2);
  } else {
    for (let index = 0; index < 3; index += 1) {
      const ring = add(new THREE.TorusGeometry(2.25 + index * .72, .1, 6, 24), glow, 0, 1.35, .3 + index * .45);
      ring.rotation.x = index * .38;
      ring.rotation.y = index * .52;
    }
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2;
      add(new THREE.TetrahedronGeometry(.48, 0), glow, Math.cos(angle) * 5.2, 1.2 + Math.sin(angle) * 2.1, 1.1);
    }
  }

  rig.userData.arcadeV405Form = enemy.finalBossForm;
  rig.userData.arcadeV405Accent = accent;
  group.add(rig);
}

function createBoss(stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  const group = createReferenceCarrier(stage);
  if (stage.id === "prism-citadel") decorateV405FinalBoss(group, enemy);
  return group;
}

export function createSkyDancerArcadeEnemy(
  stage: SkyDancerArcadeStageDefinition,
  enemy: SkyDancerArcadeEnemySnapshot,
): THREE.Group {
  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage, enemy) : createStandardEnemy(stage, enemy);
  group.name = `arcade-enemy-${enemy.id}`;
  if (enemy.locked) group.add(createSkyDancerArcadeLockRing(0xff3970));
  return group;
}
