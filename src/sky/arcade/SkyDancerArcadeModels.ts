import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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

function createEnemyVisibilityBeacons(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -3.62, .12, 1.28,
    3.62, .12, 1.28,
    0, .28, -2.82,
  ], 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute([
    1, .08, .34,
    1, .08, .34,
    1, .88, .72,
  ], 3));
  const material = new THREE.PointsMaterial({
    size: 5.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: .96,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "arcade-enemy-visibility-beacons";
  points.renderOrder = 7;
  return points;
}

function createStandardEnemy(_stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  const fighter = createReferenceFighter(true, enemy.kind === "bomber" || enemy.kind === "missile-boat");
  fighter.add(createEnemyVisibilityBeacons());
  return fighter;
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
  if (enemy.locked) group.add(createSkyDancerArcadeLockRing(0xff3970));
  return group;
}

export function createSkyDancerArcadeLockRing(color: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-lock-ring";
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: .98,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const geometries: THREE.BufferGeometry[] = [];
  const place = (geometry: THREE.BufferGeometry, x: number, y: number, z = 0) => {
    geometry.translate(x, y, z);
    geometries.push(geometry);
  };
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      place(new THREE.BoxGeometry(.46, .072, .045), x * .93 - x * .19, y * .93, 0);
      place(new THREE.BoxGeometry(.072, .46, .045), x * .93, y * .93 - y * .19, 0);
    }
  }
  const diamond = new THREE.TorusGeometry(.34, .035, 4, 4);
  diamond.rotateZ(Math.PI / 4);
  geometries.push(diamond);
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  if (merged) {
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = "arcade-lock-ring-mesh";
    mesh.renderOrder = 30;
    group.add(mesh);
  } else {
    material.dispose();
  }
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
