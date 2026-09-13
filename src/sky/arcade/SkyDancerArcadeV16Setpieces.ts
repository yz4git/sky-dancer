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
  const rock = addMesh(group, new THREE.IcosahedronGeometry(5.4, 1), material, x, y, z);
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
  group.userData.arcadeV4024CoherentRockClearance = true;

  const heroSide = skyDancerArcadeV16HeroSide(index);
  const rock = solid(stage.palette.ground);
  const litRock = solid(stage.palette.primary);
  const warm = solid(stage.palette.secondary);
  const edge = glow(stage.palette.accent);

  // V40.24: keep the hero silhouette comfortably outside the phone combat corridor. Detail=1
  // breaks up large flat facets without making the object visually noisy at distance.
  const bladeX = heroSide * 59;
  addRockMass(group, litRock, bladeX, -17, -9, 1.32, 1.55, .98, heroSide * -.22, heroSide * .12);
  addRockMass(group, litRock, bladeX - heroSide * 2.8, -1, -11, 1.08, 1.58, .88, heroSide * -.31, heroSide * .19);
  addRockMass(group, warm, bladeX - heroSide * 6.3, 12.5, -9, .8, 1.06, .72, heroSide * -.39, heroSide * .24);

  addRockMass(group, rock, heroSide * 68, -18, 18, 1.38, 1.28, 1.12, heroSide * .1, heroSide * .08);
  addRockMass(group, rock, heroSide * 66.5, -5, 20, 1.08, 1.02, .95, heroSide * .16, -heroSide * .07);

  // Broken arch remains recognisable but no fragment reaches into the center lane.
  const archA = addMesh(group, new THREE.DodecahedronGeometry(6.5, 1), warm, heroSide * 47, 9.5, -2);
  archA.scale.set(1.26, .58, .8);
  archA.rotation.z = heroSide * -.24;
  archA.rotation.y = heroSide * .12;
  const archB = addMesh(group, new THREE.DodecahedronGeometry(5.2, 1), rock, heroSide * 40.5, 14.8, 4.5);
  archB.scale.set(1.08, .66, .84);
  archB.rotation.z = heroSide * -.34;
  archB.rotation.y = heroSide * .2;
  const archChip = addMesh(group, new THREE.OctahedronGeometry(3.7, 1), warm, heroSide * 35, 17.2, 8);
  archChip.scale.set(.98, .68, .76);
  archChip.rotation.z = heroSide * -.46;

  for (let mineral = 0; mineral < 3; mineral += 1) {
    const node = addMesh(
      group,
      new THREE.OctahedronGeometry(.8 + mineral * .14, 0),
      edge,
      heroSide * (49.5 - mineral * 4.4),
      6 + mineral * 4.2,
      -1 + mineral * 2.7,
    );
    node.scale.set(.66, 1.24, .66);
    node.rotation.z = heroSide * (.45 + mineral * .12);
  }

  const shard = addMesh(group, new THREE.OctahedronGeometry(4.4, 1), warm, -heroSide * 54, 2.5, 16);
  shard.scale.set(.75, 1.48, .72);
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
  group.userData.arcadeV4024CoherentRockClearance = true;

  const heroSide = skyDancerArcadeV16HeroSide(index);
  const basalt = solid(stage.palette.ground);
  const crust = solid(stage.palette.primary);
  const hotRock = solid(stage.palette.secondary);
  const lava = glow(stage.palette.accent);

  const wallX = heroSide * 63;
  addRockMass(group, basalt, wallX, -18, -12, 1.52, 1.46, 1.2, heroSide * -.12, heroSide * .08);
  addRockMass(group, basalt, wallX - heroSide * 2.8, -3, -14, 1.3, 1.36, 1.06, heroSide * -.2, heroSide * .13);
  addRockMass(group, crust, wallX - heroSide * 5.6, 10.5, -15, .96, 1.02, .86, heroSide * -.28, heroSide * .17);

  const shelf = addMesh(group, new THREE.DodecahedronGeometry(6.6, 1), crust, heroSide * 50, -13, 12);
  shelf.scale.set(1.5, .56, 1.05);
  shelf.rotation.z = heroSide * -.12;
  shelf.rotation.y = heroSide * .1;
  const splitCrown = addMesh(group, new THREE.DodecahedronGeometry(5.6, 1), hotRock, heroSide * 45, 9.8, -3);
  splitCrown.scale.set(1.22, .56, .84);
  splitCrown.rotation.z = heroSide * -.22;
  splitCrown.rotation.y = heroSide * .15;
  for (let seam = 0; seam < 3; seam += 1) {
    const magmaNode = addMesh(
      group,
      new THREE.OctahedronGeometry(.92 + seam * .15, 0),
      lava,
      heroSide * (48 - seam * 3.2),
      6.8 + seam * 2.7,
      -1 + seam * 1.7,
    );
    magmaNode.scale.set(.58, 1.28, .58);
  }

  const ventX = -heroSide * 58;
  addRockMass(group, hotRock, ventX, -18.5, 10, 1.0, .9, .98, -heroSide * .08, heroSide * .11);
  addRockMass(group, basalt, ventX + heroSide * 2.8, -11.5, 10.8, .8, .8, .8, -heroSide * .15, -heroSide * .09);

  bakeArcadeAirframe(group);

  const lavaFall = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 5, 23);
  lavaFall.name = "arcade-v4022-volcano-lava-fall";
  lavaFall.position.set(heroSide * 51, -15, -5);
  lavaFall.rotation.z = heroSide * -.07;
  lavaFall.scale.set(.64, .92, .64);
  group.add(lavaFall);

  const ventCore = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 17, 19);
  ventCore.name = "arcade-v4022-volcano-pressure-vent";
  ventCore.position.set(ventX, -18, 9);
  ventCore.rotation.z = -heroSide * .07;
  ventCore.scale.set(.7, .9, .7);
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

    // V40.24: these canyon/volcano meshes have already been baked into shared chunk-space geometry.
    // The old abs(x) >= 18 test moved only the outer vertices of a single rock and literally stretched
    // that rock into a huge flat wall. Translate every side vertex by the same signed offset instead.
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const x = position.getX(vertex);
      if (Math.abs(x) < .5) continue;
      position.setX(vertex, x + Math.sign(x) * amount);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    touched.add(geometry.uuid);
  });
}

/**
 * V16 Setpiece Pass + V40.23/V40.24 natural-rock cleanup.
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
    // Presentation-only clearance. Because the baked geometry is translated coherently, original
    // rock proportions are preserved instead of generating long artificial facets.
    pushLegacySetpieceGeometryOutward(chunk, stage.biome === "canyon" ? 18 : 20);
    chunk.userData.arcadeV16LegacySceneryPushedOut = true;
    chunk.userData.arcadeV4023LegacySceneryClearance = true;
    chunk.userData.arcadeV4024CoherentLegacyTranslation = true;
    if (!skyDancerArcadeV16IsHeroChunk(index)) return;

    const setpiece = stage.biome === "canyon"
      ? buildCanyonSetpiece(stage, index)
      : buildVolcanoSetpiece(stage, index);
    chunk.add(setpiece);
    chunk.userData.arcadeV16HeroSetpiece = true;
    chunk.userData.arcadeV16HeroSide = skyDancerArcadeV16HeroSide(index);
  });
}