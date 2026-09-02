import * as THREE from "three";
import { createReferenceCarrier, createReferenceFighter } from "./SkyDancerArcadeReferenceAirframes";
import type { SkyDancerArcadeEnemySnapshot, SkyDancerArcadeHazardSnapshot } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadePaintScheme } from "./SkyDancerArcadeProgress";

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

function markArcadeGroundConnectorV1052(mesh: THREE.Mesh, baseHeight: number): void {
  mesh.userData.arcadeGroundConnectorV1052 = true;
  mesh.userData.arcadeGroundConnectorTopYV1052 = mesh.position.y + baseHeight * .5;
  mesh.userData.arcadeGroundConnectorBaseHeightV1052 = baseHeight;
  mesh.userData.arcadeGroundConnectorBaseScaleYV1052 = mesh.scale.y;
}

export function extendArcadeGroundConnectorsV1052(group: THREE.Group, groundLocalY: number): void {
  let connected = 0;
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object.userData.arcadeGroundConnectorV1052 !== true) return;
    const top = Number(object.userData.arcadeGroundConnectorTopYV1052);
    const baseHeight = Number(object.userData.arcadeGroundConnectorBaseHeightV1052);
    const baseScaleY = Number(object.userData.arcadeGroundConnectorBaseScaleYV1052);
    if (!Number.isFinite(top) || !Number.isFinite(baseHeight) || baseHeight <= 0 || !Number.isFinite(baseScaleY)) return;
    // Never shorten authored geometry. Only grow downward, preserving the top/collision silhouette exactly.
    const targetHeight = Math.max(baseHeight, top - groundLocalY);
    object.scale.y = baseScaleY * targetHeight / baseHeight;
    object.position.y = top - targetHeight * .5;
    object.userData.arcadeGroundConnectorBottomYV1052 = top - targetHeight;
    connected += 1;
  });
  group.userData.arcadeGroundConnectedV1052 = connected > 0;
  group.userData.arcadeGroundConnectorCountV1052 = connected;
  group.userData.arcadeGroundLocalYV1052 = groundLocalY;
}

export function createSkyDancerArcadePlayer(paintScheme: SkyDancerArcadePaintScheme = "default"): THREE.Group {
  return createReferenceFighter(false, false, paintScheme);
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
  const secondary = flatMaterial(stage.palette.secondary);
  const warning = flatMaterial(0xff704f, 0x5a1008);
  const accent = flatMaterial(stage.palette.accent, stage.palette.accent);
  const courseAnchored = hazard.kind === "tower" || hazard.kind === "arch" || hazard.kind === "rock";
  if (courseAnchored) group.userData.arcadeWorldAnchoredHazardV105 = true;

  if ((stage.biome === "city" || stage.biome === "night") && hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = stage.biome === "night" ? "neon-pylon" : "city-pylon";
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10.8, 1.4), primary);
    shaft.position.y = -4.9;
    markArcadeGroundConnectorV1052(shaft, 10.8);
    group.add(shaft);
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.0, 2.1), warning);
    shoulder.position.y = 0.65;
    group.add(shoulder);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.2, 6), primary);
    mast.position.y = 3.1;
    group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 6), accent);
    beacon.position.y = 5.35;
    group.add(beacon);
  } else if ((stage.biome === "city" || stage.biome === "night") && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = stage.biome === "night" ? "neon-gantry" : "city-gantry";
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.86, 7.8, 1.0), primary);
      support.position.set(side * 2.25, -2.75, 0);
      markArcadeGroundConnectorV1052(support, 7.8);
      group.add(support);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 1.0), warning);
      shoulder.position.set(side * 1.55, 1.15, 0);
      shoulder.rotation.z = side * 0.38;
      group.add(shoulder);
    }
    const span = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.72, 1.0), primary);
    span.position.y = 1.95;
    group.add(span);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 0.16), accent);
    strip.position.set(0, 1.62, 0.54);
    group.add(strip);
  } else if (stage.biome === "canyon" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "basalt-spire";
    const main = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.8, 10.5, 7, 3), primary);
    main.position.y = -4.2;
    markArcadeGroundConnectorV1052(main, 10.5);
    main.rotation.y = 0.22;
    group.add(main);
    const shard = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.35, 6.6, 6, 2), secondary);
    shard.position.set(1.45, -3.0, -0.4);
    shard.rotation.z = -0.12;
    group.add(shard);
  } else if (stage.biome === "canyon" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "canyon-rock-bridge";
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.0, 8.8, 7, 2), primary);
      pillar.position.set(side * 2.55, -3.1, 0);
      markArcadeGroundConnectorV1052(pillar, 8.8);
      pillar.rotation.z = side * 0.08;
      group.add(pillar);
    }
    const bridge = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), secondary);
    bridge.scale.set(2.25, 0.62, 0.9);
    bridge.position.y = 1.55;
    group.add(bridge);
  } else if (stage.biome === "desert" && hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = "fortress-pylon";
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.1, 9.4, 2.5), primary);
    shaft.position.y = -4.0;
    markArcadeGroundConnectorV1052(shaft, 9.4);
    group.add(shaft);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.15, 3.0), secondary);
    crown.position.y = 0.9;
    group.add(crown);
    for (const side of [-1, 1]) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.0, 0.9), warning);
      merlon.position.set(side * 1.15, 1.9, 0);
      group.add(merlon);
    }
  } else if (stage.biome === "ice" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "crystal-rib";
    for (const side of [-1, 1]) {
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(1.55, 9.2, 6), primary);
      crystal.position.set(side * 2.55, -2.75, 0);
      markArcadeGroundConnectorV1052(crystal, 9.2);
      crystal.rotation.z = side * 0.13;
      group.add(crystal);
    }
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), accent);
    crown.scale.set(2.45, 0.66, 0.8);
    crown.position.y = 1.85;
    group.add(crown);
  } else if (stage.biome === "ice" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "ice-stalagmite";
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), primary);
    crystal.scale.set(1.35, 3.7, 1.25);
    crystal.position.y = -3.35;
    group.add(crystal);
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.82, 0), accent);
    shard.scale.set(0.7, 2.15, 0.65);
    shard.position.set(1.25, -2.75, 0.25);
    shard.rotation.z = -0.2;
    group.add(shard);
  } else if (stage.biome === "ruins" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "ruin-portal";
    for (const side of [-1, 1]) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(1.15, 7.8, 1.3), primary);
      column.position.set(side * 2.4, -2.65, 0);
      group.add(column);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.7, 1.6), secondary);
      cap.position.set(side * 2.4, 1.25, 0);
      group.add(cap);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.92, 1.45), secondary);
    lintel.position.y = 1.75;
    group.add(lintel);
    const glyph = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.14), accent);
    glyph.position.set(0, 1.38, 0.78);
    group.add(glyph);
  } else if (stage.biome === "ruins" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "ruin-island-shard";
    const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 0), primary);
    shard.scale.set(1.7, 2.65, 1.55);
    shard.position.y = -2.2;
    group.add(shard);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.62, 3.1), secondary);
    slab.position.y = 0.25;
    group.add(slab);
  } else if (stage.biome === "volcano" && hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "magma-pillar";
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 3.0, 10.2, 7, 3), primary);
    pillar.position.y = -4.15;
    markArcadeGroundConnectorV1052(pillar, 10.2);
    group.add(pillar);
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.4, 0.16), accent);
    crack.position.set(0.55, -2.7, 1.52);
    crack.rotation.z = 0.16;
    group.add(crack);
  } else if (stage.biome === "orbit" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "orbital-truss-ring";
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.2, 7, 32), primary);
    group.add(ring);
    for (let index = 0; index < 4; index += 1) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.3), secondary);
      const angle = index * Math.PI / 2;
      strut.position.set(Math.cos(angle) * 2.35, Math.sin(angle) * 2.35, 0);
      strut.rotation.z = angle;
      group.add(strut);
    }
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.16), accent);
    marker.position.y = 2.95;
    group.add(marker);
  } else if (stage.biome === "citadel" && hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "prism-blade-gate";
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 6.2, 0.65), primary);
      blade.position.set(side * 1.75, -0.55, 0);
      markArcadeGroundConnectorV1052(blade, 6.2);
      blade.rotation.z = side * 0.34;
      group.add(blade);
    }
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), accent);
    crown.scale.set(1.8, 0.55, 0.7);
    crown.position.y = 2.45;
    group.add(crown);
  } else if (stage.biome === "citadel" && hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = "prism-spire";
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.7, 10.2, 6, 3), primary);
    spire.position.y = -4.0;
    markArcadeGroundConnectorV1052(spire, 10.2);
    group.add(spire);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.0, 6), accent);
    tip.position.y = 2.55;
    group.add(tip);
  } else if (hazard.kind === "rock") {
    group.userData.arcadeHazardIdentityV105 = "terrain-spire";
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), primary);
    rock.scale.set(1.0, 2.9, 0.95);
    rock.position.y = -2.65;
    group.add(rock);
  } else if (hazard.kind === "arch") {
    group.userData.arcadeHazardIdentityV105 = "supported-gate";
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.78, 7.0, 0.9), primary);
      support.position.set(side * 2.3, -2.45, 0);
      group.add(support);
    }
    const span = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.72, 0.9), secondary);
    span.position.y = 1.2;
    group.add(span);
  } else if (hazard.kind === "tower") {
    group.userData.arcadeHazardIdentityV105 = "grounded-tower";
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 9.0, 1.5), primary);
    tower.position.y = -3.9;
    group.add(tower);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 2.0), secondary);
    cap.position.y = 0.8;
    group.add(cap);
  } else if (hazard.kind === "mine") {
    group.userData.arcadeHazardIdentityV105 = "mine";
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), warning));
    for (let index = 0; index < 6; index += 1) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 5), primary);
      spike.rotation.z = (index / 6) * Math.PI * 2;
      spike.position.set(Math.sin(spike.rotation.z) * 0.78, Math.cos(spike.rotation.z) * 0.78, 0);
      group.add(spike);
    }
  } else if (hazard.kind === "lightning") {
    group.userData.arcadeAtmosphericHazardV105 = true;
    group.userData.arcadeHazardIdentityV105 = "lightning-bolt";
    const points: Array<[number, number]> = [[-0.15, 4.4], [0.55, 2.7], [-0.35, 1.15], [0.42, -0.3], [-0.6, -2.0], [0.1, -4.4]];
    for (let index = 0; index < points.length - 1; index += 1) {
      const [x0, y0] = points[index];
      const [x1, y1] = points[index + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const length = Math.hypot(dx, dy);
      const segment = new THREE.Mesh(new THREE.BoxGeometry(0.22, length, 0.22), accent);
      segment.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, 0);
      segment.rotation.z = -Math.atan2(dx, dy);
      group.add(segment);
    }
  } else {
    group.userData.arcadeHazardIdentityV105 = "debris";
    const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), primary);
    debris.scale.set(0.8, 1.35, 0.72);
    group.add(debris);
  }

  group.scale.setScalar(hazard.scale);
  return group;
}
