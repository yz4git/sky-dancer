import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";

test("V40.48 close-pass facade relief stays bounded, instanced and outside the flight corridor", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const city = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.biome === "city");
  assert.ok(city);
  world.setStage(city);

  const batches: THREE.InstancedMesh[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && object.name.startsWith("arcade-city-facade-relief-")) {
      batches.push(object);
    }
  });

  assert.equal(batches.length, 8, "one relief draw batch per streamed city chunk");
  assert.ok(batches.every((batch) => batch.count === 36 && batch.count <= 48));
  assert.ok(batches.every((batch) => batch.userData.arcadeCityFacadeReliefV4048 === true));
  assert.ok(batches.every((batch) => batch.material instanceof THREE.MeshPhysicalMaterial));

  const matrix = new THREE.Matrix4();
  for (const batch of batches) {
    for (let i = 0; i < batch.count; i++) {
      batch.getMatrixAt(i, matrix);
      assert.ok(Math.abs(matrix.elements[12]) > 31, "relief must stay outside the central river/flight corridor");
    }
  }

  world.dispose();
});

test("V40.48 facade relief uses shallow horizontal bands without texture cost", () => {
  const source = readFileSync(
    new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /arcade-city-facade-relief-/);
  assert.match(source, /architecturalSurface\(0xffffff,\.52,\.3,\.08,\.36\)/);
  assert.match(source, /writeRelief\(reliefX,-25\+h\*\.34,z,\.14,\.18,d\*\.78,detailDark\)/);
  assert.match(source, /writeRelief\(reliefX,-25\+h\*\.67,z,\.14,\.18,d\*\.78,detailMid\)/);
  assert.match(source, /writeRelief\(reliefX,-25\+h-\.42,z,\.18,\.34,d\*\.9,detailMetal\)/);
  assert.doesNotMatch(source, /TextureLoader/);
  assert.doesNotMatch(source, /CanvasTexture/);
});
