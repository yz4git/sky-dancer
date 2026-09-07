import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";

const HERO_CHUNK_INDICES = new Set([0, 2, 4, 6]);

function solid(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: .84,
    metalness: .05,
    emissive,
    emissiveIntensity: emissive ? .7 : 0,
  });
}

function glow(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: .9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function skyDancerArcadeV16HeroSide(index: number): -1 | 1 {
  return index % 4 === 0 ? -1 : 1;
}

export function skyDancerArcadeV16IsHeroChunk(index: number): boolean {
  return HERO_CHUNK_INDICES.has(index);
}

function buildCanyonSetpiece(stage: SkyDancerArcadeStageDefinition, index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-v16-canyon-broken-arch";
  group.userData.arcadeV16Setpiece = "canyon-broken-arch";
  group.userData.arcadeV16HeroSide = skyDancerArcadeV16HeroSide(index);

  const heroSide = skyDancerArcadeV16HeroSide(index);
  const rock = solid(stage.palette.ground);
  const litRock = solid(stage.palette.primary);
  const warm = solid(stage.palette.secondary);
  const edge = glow(stage.palette.accent);

  // One unmistakable knife-shaped wall owns the hero side. It stays outside the combat lane,
  // while its broken top reaches inward high above the reticle instead of forming another tunnel.
  const bladeX = heroSide * 48;
  const blade = addMesh(group, new THREE.ConeGeometry(9.2, 54, 5, 2), litRock, bladeX, -1, -11);
  blade.scale.set(1.05, 1.28, .72);
  blade.rotation.z = heroSide * -.38;
  blade.rotation.y = heroSide * .2;

  const buttress = addMesh(group, new THREE.CylinderGeometry(7, 12, 30, 6, 2), rock, heroSide * 57, -12, 19);
  buttress.rotation.z = heroSide * .13;

  // Broken arch fragments define a dramatic "almost overhead" silhouette but stop around |x|=18.
  const spanA = addMesh(group, new THREE.BoxGeometry(34, 5.2, 9), warm, heroSide * 36, 11.5, -2);
  spanA.rotation.z = heroSide * -.22;
  spanA.rotation.y = heroSide * .09;
  const spanB = addMesh(group, new THREE.BoxGeometry(23, 3.8, 7), rock, heroSide * 29.5, 18, 5);
  spanB.rotation.z = heroSide * -.31;
  spanB.rotation.y = heroSide * .18;

  // High-contrast mineral cuts make the authored arch readable through the warm canyon palette.
  const spanEdge = addMesh(group, new THREE.BoxGeometry(29, .62, 2), edge, heroSide * 34.5, 9.2, -1.5);
  spanEdge.rotation.z = heroSide * -.22;
  spanEdge.rotation.y = heroSide * .09;
  const vein = addMesh(group, new THREE.BoxGeometry(.72, 38, 1.8), edge, heroSide * 43, 3, -6);
  vein.rotation.z = heroSide * -.34;

  const shard = addMesh(group, new THREE.OctahedronGeometry(5, 0), warm, -heroSide * 43, 9, 16);
  shard.scale.set(.72, 2.5, .72);
  shard.rotation.z = -heroSide * .31;

  bakeArcadeAirframe(group);
  return group;
}

function buildVolcanoSetpiece(stage: SkyDancerArcadeStageDefinition, index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-v16-volcano-caldera-spire";
  group.userData.arcadeV16Setpiece = "volcano-caldera-spire";
  group.userData.arcadeV16HeroSide = skyDancerArcadeV16HeroSide(index);

  const heroSide = skyDancerArcadeV16HeroSide(index);
  const basalt = solid(stage.palette.ground);
  const crust = solid(stage.palette.primary);
  const hotRock = solid(stage.palette.secondary);
  const lava = glow(stage.palette.accent);

  // A split caldera wall gives the stage a large-scale landmark rather than another cylinder forest.
  const wallX = heroSide * 50;
  const spire = addMesh(group, new THREE.CylinderGeometry(6.5, 12.5, 44, 6, 2), basalt, wallX, -5, -13);
  spire.rotation.z = heroSide * -.22;
  spire.rotation.y = heroSide * .17;
  const crown = addMesh(group, new THREE.ConeGeometry(9.5, 18, 6), crust, wallX - heroSide * 4, 21, -16);
  crown.rotation.z = heroSide * .15;

  // Terraces aim toward the continuous magma ribbon without ever becoming a floor replacement.
  const shelf = addMesh(group, new THREE.BoxGeometry(31, 4.5, 18), crust, heroSide * 37, -12, 12);
  shelf.rotation.z = heroSide * -.1;
  shelf.rotation.y = heroSide * .07;
  const shelfEdge = addMesh(group, new THREE.BoxGeometry(25, .62, 14), lava, heroSide * 34.5, -9.5, 11);
  shelfEdge.rotation.z = heroSide * -.1;
  shelfEdge.rotation.y = heroSide * .07;

  // A vertical lava fall is the signature read at phone scale and visually connects wall to river.
  const lavaFall = addMesh(group, new THREE.BoxGeometry(2.3, 30, 2.1), lava, heroSide * 39.5, 2.5, -5);
  lavaFall.rotation.z = heroSide * -.09;
  const splitCrown = addMesh(group, new THREE.BoxGeometry(24, 3.6, 7), hotRock, heroSide * 32, 14.5, -3);
  splitCrown.rotation.z = heroSide * -.2;
  splitCrown.rotation.y = heroSide * .12;
  const crownSeam = addMesh(group, new THREE.BoxGeometry(19, .55, 2), lava, heroSide * 30.5, 12.7, -2.5);
  crownSeam.rotation.z = heroSide * -.2;
  crownSeam.rotation.y = heroSide * .12;

  // An opposing pressure vent keeps the composition asymmetric and sells an active crater.
  const ventX = -heroSide * 45;
  const ventCore = addMesh(group, new THREE.ConeGeometry(1.25, 26, 7), lava, ventX, -7, 9);
  ventCore.rotation.z = -heroSide * .09;
  const ventShell = addMesh(group, new THREE.ConeGeometry(4.9, 22, 6), hotRock, ventX, -16, 10);
  ventShell.rotation.z = -heroSide * .09;
  const ember = addMesh(group, new THREE.OctahedronGeometry(3.9, 0), lava, ventX + heroSide * 3, 10, 7);
  ember.scale.set(.62, 1.9, .62);

  bakeArcadeAirframe(group);
  return group;
}

function pushLegacySetpieceGeometryOutward(chunk: THREE.Object3D, amount: number): void {
  const touched = new Set<string>();
  chunk.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    const geometry = object.geometry;
    if (touched.has(geometry.uuid)) return;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!position) return;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const x = position.getX(vertex);
      if (Math.abs(x) < 18) continue;
      position.setX(vertex, x + Math.sign(x) * amount);
    }
    position.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    touched.add(geometry.uuid);
  });
}

/**
 * V16 Setpiece Pass.
 * Reframes Red Canyon and Volcano Core around four authored hero beats each while preserving
 * the existing spline, collision runtime, enemies and continuous terrain/ribbon systems.
 */
export function applySkyDancerArcadeV16Setpieces(
  scene: THREE.Scene,
  stage: SkyDancerArcadeStageDefinition,
): void {
  if (stage.biome !== "canyon" && stage.biome !== "volcano") return;
  const environment = scene.getObjectByName("arcade-course-environment");
  if (!environment) return;

  const chunks = environment.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
  chunks.forEach((chunk, index) => {
    // Visual playcheck: generic columns still dominated V16's first screenshot. Move them decisively
    // outward so authored hero shapes own the phone composition; collision/hazards remain untouched.
    pushLegacySetpieceGeometryOutward(chunk, stage.biome === "canyon" ? 13 : 10);
    chunk.userData.arcadeV16LegacySceneryPushedOut = true;
    if (!skyDancerArcadeV16IsHeroChunk(index)) return;

    const setpiece = stage.biome === "canyon"
      ? buildCanyonSetpiece(stage, index)
      : buildVolcanoSetpiece(stage, index);
    chunk.add(setpiece);
    chunk.userData.arcadeV16HeroSetpiece = true;
    chunk.userData.arcadeV16HeroSide = skyDancerArcadeV16HeroSide(index);
  });
}
