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
    opacity: .86,
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

  // A giant asymmetric blade gives Red Canyon a recognizable silhouette without closing the hero line.
  const bladeX = heroSide * 52;
  const blade = addMesh(group, new THREE.ConeGeometry(8.5, 48, 5, 2), litRock, bladeX, -2, -10);
  blade.scale.set(1, 1.28, .72);
  blade.rotation.z = heroSide * -.34;
  blade.rotation.y = heroSide * .18;

  const buttress = addMesh(group, new THREE.CylinderGeometry(7, 11, 28, 6, 2), rock, heroSide * 57, -11, 18);
  buttress.rotation.z = heroSide * .12;

  // Broken bridge fragments reach toward the route but stop well outside the central combat lane.
  const spanA = addMesh(group, new THREE.BoxGeometry(28, 4.4, 9), warm, heroSide * 39, 12, -2);
  spanA.rotation.z = heroSide * -.12;
  spanA.rotation.y = heroSide * .08;
  const spanB = addMesh(group, new THREE.BoxGeometry(18, 3.2, 7), rock, heroSide * 31.5, 16, 5);
  spanB.rotation.z = heroSide * -.24;
  spanB.rotation.y = heroSide * .16;

  // A thin glowing mineral cut reads at speed and gives the canyon its own visual language.
  const vein = addMesh(group, new THREE.BoxGeometry(.55, 34, 1.5), edge, heroSide * 47, 3, -5);
  vein.rotation.z = heroSide * -.3;
  const shard = addMesh(group, new THREE.OctahedronGeometry(4.4, 0), warm, -heroSide * 46, 7, 15);
  shard.scale.set(.7, 2.2, .72);
  shard.rotation.z = -heroSide * .28;

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

  // Massive split caldera wall: tall, readable, and deliberately kept off the center line.
  const wallX = heroSide * 54;
  const spire = addMesh(group, new THREE.CylinderGeometry(6, 12, 42, 6, 2), basalt, wallX, -5, -12);
  spire.rotation.z = heroSide * -.2;
  spire.rotation.y = heroSide * .16;
  const crown = addMesh(group, new THREE.ConeGeometry(9, 17, 6), crust, wallX - heroSide * 4, 20, -15);
  crown.rotation.z = heroSide * .14;

  // Broken basalt terraces point at the magma ribbon but never cover it.
  const shelf = addMesh(group, new THREE.BoxGeometry(29, 4.2, 18), crust, heroSide * 40, -12, 12);
  shelf.rotation.z = heroSide * -.08;
  shelf.rotation.y = heroSide * .06;
  const shelfEdge = addMesh(group, new THREE.BoxGeometry(22, .5, 14), lava, heroSide * 37, -9.7, 11);
  shelfEdge.rotation.z = heroSide * -.08;
  shelfEdge.rotation.y = heroSide * .06;

  // One pressure vent gives each hero beat a strong vertical motion cue.
  const ventX = -heroSide * 47;
  const ventCore = addMesh(group, new THREE.ConeGeometry(1.15, 24, 7), lava, ventX, -8, 9);
  ventCore.rotation.z = -heroSide * .08;
  const ventShell = addMesh(group, new THREE.ConeGeometry(4.7, 21, 6), hotRock, ventX, -16, 10);
  ventShell.rotation.z = -heroSide * .08;
  const ember = addMesh(group, new THREE.OctahedronGeometry(3.6, 0), lava, ventX + heroSide * 3, 9, 7);
  ember.scale.set(.62, 1.75, .62);

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
    // V15 already opened the corridor; V16 moves the old generic columns slightly farther out so
    // the new silhouette, not a wall of cylinders, owns the composition.
    pushLegacySetpieceGeometryOutward(chunk, stage.biome === "canyon" ? 4 : 2.5);
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
