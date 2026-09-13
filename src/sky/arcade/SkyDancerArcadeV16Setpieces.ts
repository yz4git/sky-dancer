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

function addRockMass(
  group: THREE.Group,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rz: number,
  ry = 0,
): THREE.Mesh {
  const rock = addMesh(group, new THREE.IcosahedronGeometry(5.4, 0), material, x, y, z);
  rock.scale.set(sx, sy, sz);
  rock.rotation.z = rz;
  rock.rotation.y = ry;
  return rock;
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
  group.userData.arcadeV4023NaturalRockMasses = true;

  const heroSide = skyDancerArcadeV16HeroSide(index);
  const rock = solid(stage.palette.ground);
  const litRock = solid(stage.palette.primary);
  const warm = solid(stage.palette.secondary);
  const edge = glow(stage.palette.accent);

  // V40.23: the former five-sided 54m knife prism turned into one huge flat board on phone.
  // Keep the tall hero silhouette, but build it from overlapping faceted rock masses with broken edges.
  const bladeX = heroSide * 49;
  addRockMass(group, litRock, bladeX, -17, -9, 1.45, 1.7, 1.05, heroSide * -.22, heroSide * .12);
  addRockMass(group, litRock, bladeX - heroSide * 2.8, -1, -11, 1.18, 1.75, .92, heroSide * -.31, heroSide * .19);
  addRockMass(group, warm, bladeX - heroSide * 6.3, 13.5, -9, .88, 1.2, .78, heroSide * -.39, heroSide * .24);

  // The support is also split so its nearest face cannot fill the screen as one regular polygon.
  addRockMass(group, rock, heroSide * 58, -17, 18, 1.55, 1.45, 1.25, heroSide * .1, heroSide * .08);
  addRockMass(group, rock, heroSide * 56.5, -3, 20, 1.22, 1.15, 1.05, heroSide * .16, -heroSide * .07);

  // Broken arch: short, separated rock masses instead of a single spanning slab.
  const archA = addMesh(group, new THREE.DodecahedronGeometry(7.2, 0), warm, heroSide * 37, 10.5, -2);
  archA.scale.set(1.38, .64, .86);
  archA.rotation.z = heroSide * -.24;
  archA.rotation.y = heroSide * .12;
  const archB = addMesh(group, new THREE.DodecahedronGeometry(5.8, 0), rock, heroSide * 30.5, 16.2, 4.5);
  archB.scale.set(1.18, .72, .9);
  archB.rotation.z = heroSide * -.34;
  archB.rotation.y = heroSide * .2;
  const archChip = addMesh(group, new THREE.OctahedronGeometry(4.2, 0), warm, heroSide * 25.5, 18.8, 8);
  archChip.scale.set(1.05, .75, .82);
  archChip.rotation.z = heroSide * -.46;

  for (let mineral = 0; mineral < 3; mineral += 1) {
    const node = addMesh(
      group,
      new THREE.OctahedronGeometry(.9 + mineral * .16, 0),
      edge,
      heroSide * (40.5 - mineral * 4.8),
      6.5 + mineral * 4.8,
      -1 + mineral * 2.7,
    );
    node.scale.set(.7, 1.35, .7);
    node.rotation.z = heroSide * (.45 + mineral * .12);
  }

  // Opposing shard is kept lower and closer to the terrain so it reads as rock, not a floating prop.
  const shard = addMesh(group, new THREE.OctahedronGeometry(5, 0), warm, -heroSide * 43, 4.5, 16);
  shard.scale.set(.82, 1.75, .78);
  shard.rotation.z = -heroSide * .25;

  bakeArcadeAirframe(group);
  return group;
}

function buildVolcanoSetpiece(stage: SkyDancerArcadeStageDefinition, index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "arcade-v16-volcano-caldera-spire";
  group.userData.arcadeV16Setpiece = "volcano-caldera-spire";
  group.userData.arcadeV16HeroSide = skyDancerArcadeV16HeroSide(index);
  group.userData.arcadeV4023NaturalRockMasses = true;

  const heroSide = skyDancerArcadeV16HeroSide(index);
  const basalt = solid(stage.palette.ground);
  const crust = solid(stage.palette.primary);
  const hotRock = solid(stage.palette.secondary);
  const lava = glow(stage.palette.accent);

  // V40.23: replace the tall six-sided cylinder/cone pair that became a red vertical wall at close range.
  const wallX = heroSide * 51;
  addRockMass(group, basalt, wallX, -18, -12, 1.75, 1.65, 1.35, heroSide * -.12, heroSide * .08);
  addRockMass(group, basalt, wallX - heroSide * 2.5, -2, -14, 1.48, 1.55, 1.18, heroSide * -.2, heroSide * .13);
  addRockMass(group, crust, wallX - heroSide * 5.2, 13, -15, 1.08, 1.15, .95, heroSide * -.28, heroSide * .17);

  const shelf = addMesh(group, new THREE.DodecahedronGeometry(7.4, 0), crust, heroSide * 38, -13, 12);
  shelf.scale.set(1.72, .62, 1.18);
  shelf.rotation.z = heroSide * -.12;
  shelf.rotation.y = heroSide * .1;
  const splitCrown = addMesh(group, new THREE.DodecahedronGeometry(6.2, 0), hotRock, heroSide * 33, 11.8, -3);
  splitCrown.scale.set(1.38, .62, .92);
  splitCrown.rotation.z = heroSide * -.22;
  splitCrown.rotation.y = heroSide * .15;
  for (let seam = 0; seam < 3; seam += 1) {
    const magmaNode = addMesh(
      group,
      new THREE.OctahedronGeometry(1.05 + seam * .18, 0),
      lava,
      heroSide * (36 - seam * 3.5),
      7.5 + seam * 3,
      -1 + seam * 1.7,
    );
    magmaNode.scale.set(.62, 1.45, .62);
  }

  // Opposing vent shell is a grounded broken basalt cluster; only the plume is energy.
  const ventX = -heroSide * 46;
  addRockMass(group, hotRock, ventX, -18.5, 10, 1.12, 1.0, 1.08, -heroSide * .08, heroSide * .11);
  addRockMass(group, basalt, ventX + heroSide * 2.8, -10.5, 10.8, .9, .9, .88, -heroSide * .15, -heroSide * .09);

  bakeArcadeAirframe(group);

  const lavaFall = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 5, 26);
  lavaFall.name = "arcade-v4022-volcano-lava-fall";
  lavaFall.position.set(heroSide * 39.5, -14, -5);
  lavaFall.rotation.z = heroSide * -.07;
  lavaFall.scale.set(.72, 1, .72);
  group.add(lavaFall);

  const ventCore = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 17, 22);
  ventCore.name = "arcade-v4022-volcano-pressure-vent";
  ventCore.position.set(ventX, -17.5, 9);
  ventCore.rotation.z = -heroSide * .07;
  ventCore.scale.set(.78, 1, .78);
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
 * V16 Setpiece Pass + V40.23 natural-rock cleanup.
 * Reframes Red Canyon and Volcano Core around authored hero beats while preserving
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
    // V40.23: give generic side scenery extra phone clearance so hero rock clusters never combine
    // with legacy columns into one apparently solid wall. Collision/hazards remain untouched.
    pushLegacySetpieceGeometryOutward(chunk, stage.biome === "canyon" ? 16 : 14);
    chunk.userData.arcadeV16LegacySceneryPushedOut = true;
    chunk.userData.arcadeV4023LegacySceneryClearance = true;
    if (!skyDancerArcadeV16IsHeroChunk(index)) return;

    const setpiece = stage.biome === "canyon"
      ? buildCanyonSetpiece(stage, index)
      : buildVolcanoSetpiece(stage, index);
    chunk.add(setpiece);
    chunk.userData.arcadeV16HeroSetpiece = true;
    chunk.userData.arcadeV16HeroSide = skyDancerArcadeV16HeroSide(index);
  });
}