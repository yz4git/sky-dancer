import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";

test("V40.48 close-pass facade relief reuses the bounded city detail draw batch", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const city = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.biome === "city");
  assert.ok(city);
  world.setStage(city);

  const batches: THREE.InstancedMesh[] = [];
  const chunks: THREE.Group[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && object.name.startsWith("arcade-city-architectural-details-")) {
      batches.push(object);
    }
    if (object instanceof THREE.Group && object.name.startsWith("arcade-course-chunk-")) chunks.push(object);
  });

  assert.equal(batches.length, 8, "V40.48 must not add another draw batch per streamed chunk");
  assert.ok(batches.every((batch) => batch.count > 70 && batch.count <= 144));
  assert.ok(batches.every((batch) => batch.userData.arcadeCityFacadeReliefV4048 === true));
  assert.ok(chunks.every((chunk) => chunk.userData.arcadeCityFacadeReliefInstancesV4048 === 36));

  world.dispose();
});

test("V40.48 facade relief uses shallow horizontal bands outside the corridor without texture cost", () => {
  const source = readFileSync(
    new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /const reliefX=x-side\*\(w\*\.51\+\.13\)/);
  assert.match(source, /writeRelief\(reliefX,-25\+h\*\.34,z,\.14,\.18,d\*\.78,detailDark\)/);
  assert.match(source, /writeRelief\(reliefX,-25\+h\*\.67,z,\.14,\.18,d\*\.78,detailMid\)/);
  assert.match(source, /writeRelief\(reliefX,-25\+h-\.42,z,\.18,\.34,d\*\.9,detailMetal\)/);
  assert.match(source, /arcadeCityFacadeReliefInstancesV4048=reliefCount/);
  assert.doesNotMatch(source, /arcade-city-facade-relief-/);
  assert.doesNotMatch(source, /TextureLoader/);
  assert.doesNotMatch(source, /CanvasTexture/);
});
