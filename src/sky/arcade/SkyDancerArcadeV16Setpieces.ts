import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";
import { createSkyDancerArcadeVolcanicPlumeFx } from "./SkyDancerArcadeV4022EnvironmentalFx";

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

  // V40.22 visual audit: the old rectangular spans read as giant floating boards at phone distance.
  // Build the same broken-arch silhouette from separate faceted rock masses instead.
  const archA = addMesh(group, new THREE.DodecahedronGeometry(7.2, 0), warm, heroSide * 37, 12, -2);
  archA.scale.set(1.55, .62, .82);
  archA.rotation.z = heroSide * -.24;
  archA.rotation.y = heroSide * .12;
  const archB = addMesh(group, new THREE.DodecahedronGeometry(5.8, 0), rock, heroSide * 29.5, 18.2, 4.5);
  archB.scale.set(1.35, .7, .86);
  archB.rotation.z = heroSide * -.34;
  archB.rotation.y = heroSide * .2;
  const archChip = addMesh(group, new THREE.OctahedronGeometry(4.2, 0), warm, heroSide * 23.5, 21, 8);
  archChip.scale.set(1.15, .72, .8);
  archChip.rotation.z = heroSide * -.46;

  // Small mineral nodes keep the warm accent without drawing a rigid neon ruler across the rock.
  for (let mineral = 0; mineral < 3; mineral += 1) {
    const node = addMesh(
      group,
      new THREE.OctahedronGeometry(.9 + mineral * .16, 0),
      edge,
      heroSide * (40.5 - mineral * 4.8),
      7.5 + mineral * 5.2,
      -1 + mineral * 2.7,
    );
    node.scale.set(.7, 1.35, .7);
    node.rotation.z = heroSide * (.45 + mineral * .12);
  }

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

  // V40.22 visual audit: faceted caldera shelves replace broad rectangular slabs.
  const shelf = addMesh(group, new THREE.DodecahedronGeometry(7.4, 0), crust, heroSide * 37, -12, 12);
  shelf.scale.set(2.05, .58, 1.15);
  shelf.rotation.z = heroSide * -.12;
  shelf.rotation.y = heroSide * .1;
  const splitCrown = addMesh(group, new THREE.DodecahedronGeometry(6.2, 0), hotRock, heroSide * 32, 14.5, -3);
  splitCrown.scale.set(1.65, .55, .88);
  splitCrown.rotation.z = heroSide * -.22;
  splitCrown.rotation.y = heroSide * .15;
  for (let seam = 0; seam < 3; seam += 1) {
    const magmaNode = addMesh(
      group,
      new THREE.OctahedronGeometry(1.05 + seam * .18, 0),
      lava,
      heroSide * (35 - seam * 3.5),
      9.5 + seam * 3.2,
      -1 + seam * 1.7,
    );
    magmaNode.scale.set(.62, 1.45, .62);
  }

  // An opposing physical vent shell remains rock; its emission is now additive FX.
  const ventX = -heroSide * 45;
  const ventShell = addMesh(group, new THREE.ConeGeometry(4.9, 22, 6), hotRock, ventX, -16, 10);
  ventShell.rotation.z = -heroSide * .09;

  bakeArcadeAirframe(group);

  const lavaFall = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 5, 30);
  lavaFall.name = "arcade-v4022-volcano-lava-fall";
  lavaFall.position.set(heroSide * 39.5, -12, -5);
  lavaFall.rotation.z = heroSide * -.09;
  lavaFall.scale.set(.82, 1, .82);
  group.add(lavaFall);

  const ventCore = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 17, 26);
  ventCore.name = "arcade-v4022-volcano-pressure-vent";
  ventCore.position.set(ventX, -18, 9);
  ventCore.rotation.z = -heroSide * .09;
  ventCore.scale.set(.9, 1, .9);
  group.add(ventCore);
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
