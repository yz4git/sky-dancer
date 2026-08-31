import * as THREE from "three";
import { createReferenceCarrier, createReferenceFighter } from "./SkyDancerArcadeReferenceAirframes";
import type { SkyDancerArcadeEnemySnapshot, SkyDancerArcadeHazardSnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

function flatMaterial(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.26,
    flatShading: true,
    emissive,
    emissiveIntensity: emissive ? 0.58 : 0,
  });
}

export function createSkyDancerArcadePlayer(): THREE.Group {
  return createReferenceFighter();
}

function createStandardEnemy(_stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  return createReferenceFighter(true, enemy.kind === "bomber" || enemy.kind === "missile-boat");
}

function createBoss(stage: SkyDancerArcadeStageDefinition): THREE.Group {
  // arcade-boss-weakpoint and arcade-engine-trail are owned by the baked reference airframe.
  return createReferenceCarrier(stage);
}

export function createSkyDancerArcadeEnemy(
  stage: SkyDancerArcadeStageDefinition,
  enemy: SkyDancerArcadeEnemySnapshot,
): THREE.Group {
  const group = enemy.boss ? createBoss(stage) : createStandardEnemy(stage, enemy);
  group.name = `arcade-enemy-${enemy.id}`;
  if (enemy.locked) group.add(createSkyDancerArcadeLockRing(stage.palette.accent));
  return group;
}

export function createSkyDancerArcadeLockRing(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-lock-ring";
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, depthWrite: false, toneMapped: false });
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      const corner = new THREE.Group();
      corner.position.set(x * 0.68, y * 0.68, 0);
      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.035), material);
      horizontal.position.x = -x * 0.14;
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.035), material);
      vertical.position.y = -y * 0.14;
      corner.add(horizontal, vertical);
      group.add(corner);
    }
  }
  const diamond = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 4, 4), material);
  diamond.name = "arcade-lock-ring-mesh";
  diamond.rotation.z = Math.PI / 4;
  group.add(diamond);
  return group;
}

export function createSkyDancerArcadeHazard(
  stage: SkyDancerArcadeStageDefinition,
  hazard: SkyDancerArcadeHazardSnapshot,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-hazard-${hazard.id}`;
  const primary = flatMaterial(stage.palette.primary);
  const warning = flatMaterial(0xff704f, 0x5a1008);
  if (hazard.kind === "mine") {
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), warning));
    for (let index = 0; index < 6; index += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 5), primary);
      spike.rotation.z = (index / 6) * Math.PI * 2;
      spike.position.set(Math.sin(spike.rotation.z) * 0.78, Math.cos(spike.rotation.z) * 0.78, 0);
      group.add(spike);
    }
  } else if (hazard.kind === "lightning") {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 8, 5), warning);
    bolt.rotation.z = 0.12;
    group.add(bolt);
  } else if (hazard.kind === "arch") {
    if (stage.biome === "citadel") {
      // V8.9: Citadel arches are split sovereign blades, not another circular tunnel motif.
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.9, 0.6), primary);
        blade.position.set(side * 1.55, 0.1, 0);
        blade.rotation.z = side * 0.42;
        group.add(blade);
      }
      const crown = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 0.52), warning);
      crown.position.y = 2.15;
      group.add(crown);
    } else {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.28, 7, 24, Math.PI), primary);
      arch.rotation.z = Math.PI;
      group.add(arch);
    }
  } else if (hazard.kind === "tower") {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.25, 7, 1.25), primary);
    tower.position.y = -2.4;
    group.add(tower);
  } else {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(hazard.kind === "rock" ? 1.35 : 0.72, 0), primary);
    rock.scale.set(0.8, 1.35, 0.72);
    group.add(rock);
  }
  group.scale.setScalar(hazard.scale);
  return group;
}
