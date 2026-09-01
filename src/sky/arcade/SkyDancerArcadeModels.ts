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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: `void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=64.0;}`,
    fragmentShader: `uniform vec3 tint;
      void main(){vec2 p=gl_PointCoord*2.0-1.0;vec2 a=abs(p);
        float h=step(.48,a.x)*step(a.x,.9)*step(.75,a.y)*step(a.y,.9);
        float v=step(.75,a.x)*step(a.x,.9)*step(.48,a.y)*step(a.y,.9);
        float d=1.0-smoothstep(.025,.065,abs(a.x+a.y-.25));
        float alpha=max(max(h,v),d*.88);if(alpha<.03)discard;
        gl_FragColor=vec4(tint*1.75,alpha*.98);}`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const marker = new THREE.Points(geometry, material);
  marker.name = "arcade-lock-ring-mesh";
  marker.frustumCulled = false;
  marker.renderOrder = 30;
  group.add(marker);
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
  const cityLike = stage.biome === "city" || stage.biome === "night";

  if (cityLike && hazard.kind === "tower") {
    // V10.4.2: Dawn City / Night Metro towers are grounded route architecture,
    // not free-spinning boxes. Keep the hazard origin unchanged so collision and visuals agree;
    // only the model extends downward to visibly connect into the city below.
    group.userData.arcadeCityAnchoredHazardV1042 = true;
    group.userData.arcadeCityHazardKindV1042 = "tower";
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10.8, 1.4), primary);
    shaft.position.y = -4.9;
    group.add(shaft);
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.0, 2.1), warning);
    shoulder.position.y = 0.65;
    group.add(shoulder);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.2, 6), primary);
    mast.position.y = 3.1;
    group.add(mast);
    const beaconMaterial = flatMaterial(stage.palette.accent, stage.palette.accent);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 6), beaconMaterial);
    beacon.position.y = 5.35;
    group.add(beacon);
  } else if (cityLike && hazard.kind === "arch") {
    // V10.4.2: replace the floating semicircle with a supported urban fly-through gate.
    // Its supports extend below the gameplay origin, making it read as bridge/gantry structure.
    group.userData.arcadeCityAnchoredHazardV1042 = true;
    group.userData.arcadeCityHazardKindV1042 = "gantry";
    const glow = flatMaterial(stage.palette.accent, stage.palette.accent);
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.86, 7.8, 1.0), primary);
      support.position.set(side * 2.25, -2.75, 0);
      group.add(support);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 1.0), warning);
      shoulder.position.set(side * 1.55, 1.15, 0);
      shoulder.rotation.z = side * 0.38;
      group.add(shoulder);
    }
    const span = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.72, 1.0), primary);
    span.position.y = 1.95;
    group.add(span);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 0.16), glow);
    strip.position.set(0, 1.62, 0.54);
    group.add(strip);
  } else if (hazard.kind === "mine") {
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
