import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { skyDancerArcadeStageById } from "../src/sky/arcade/SkyDancerArcadeData";
import { createReferenceFighter } from "../src/sky/arcade/SkyDancerArcadeReferenceAirframes";
import { createSkyDancerArcadeEnemyAirframeV18 } from "../src/sky/arcade/SkyDancerArcadeEnemyAirframes";

function materialsOf(root: THREE.Object3D): THREE.Material[] {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) materials.add(material);
  });
  return [...materials];
}

test("V40.46 hero airframe uses layered clearcoat and high-quality reflection response", () => {
  const player = createReferenceFighter(false, false, "default");
  const physical = materialsOf(player).filter((material): material is THREE.MeshPhysicalMaterial =>
    material instanceof THREE.MeshPhysicalMaterial
  );
  assert.ok(physical.length >= 4, `expected multiple physical hero surfaces, got ${physical.length}`);
  assert.ok(physical.some((material) => material.clearcoat >= .6 && material.roughness <= .28));
  assert.ok(physical.some((material) => material.metalness >= .8));
  assert.ok(physical.some((material) => material.envMapIntensity >= 1.08));
});

test("V40.46 hostile craft remain rougher and less reflective than the hero", () => {
  const stage = skyDancerArcadeStageById("dawn-city");
  const enemy = createSkyDancerArcadeEnemyAirframeV18(stage, "fighter");
  const materials = materialsOf(enemy);
  const standards = materials.filter((material): material is THREE.MeshStandardMaterial =>
    material instanceof THREE.MeshStandardMaterial && !(material instanceof THREE.MeshPhysicalMaterial)
  );
  const canopy = materials.find((material): material is THREE.MeshPhysicalMaterial =>
    material instanceof THREE.MeshPhysicalMaterial
  );
  assert.ok(standards.some((material) => material.roughness >= .4));
  assert.ok(standards.every((material) => material.envMapIntensity <= .62 || material.envMapIntensity === 1));
  assert.ok(canopy);
  assert.ok(canopy.envMapIntensity <= .72);
});

test("V40.46 city facades separate glass and wall roughness/metalness procedurally", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceMaterials.ts"), "utf8");
  assert.match(source, /roughnessFactor=mix\(roughnessFactor,\.24,arcadeGlass\)/);
  assert.match(source, /roughnessFactor=mix\(roughnessFactor,\.72/);
  assert.match(source, /metalnessFactor=mix\(metalnessFactor,\.52,arcadeGlass\)/);
  assert.match(source, /arcade-city-facade-reference-v4046/);
});

test("V40.46 city roofs, roads and banks use differentiated PBR surfaces without texture cost", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /architecturalSurface\(stage\.biome==="night"\?0x394a5a:0x58656d,\.42,\.48,\.16,\.3\)/);
  assert.match(source, /architecturalSurface\(0x132635,\.94,\.025\)/);
  assert.match(source, /architecturalSurface\(stage\.biome==="night"\?0x314559:0x506879,\.68,\.16,\.06,\.44\)/);
  assert.doesNotMatch(source, /TextureLoader/);
  assert.doesNotMatch(source, /CanvasTexture/);
});
