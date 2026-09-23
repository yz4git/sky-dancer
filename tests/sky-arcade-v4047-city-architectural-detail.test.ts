import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";

test("V40.47 city adds bounded instanced architectural detail to streamed chunks", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const city = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.biome === "city");
  assert.ok(city);
  world.setStage(city);

  const detailBatches: THREE.InstancedMesh[] = [];
  scene.traverse((object) => {
    if (
      object instanceof THREE.InstancedMesh &&
      object.name.startsWith("arcade-city-architectural-details-")
    ) detailBatches.push(object);
  });

  assert.equal(detailBatches.length, 8, "one architectural detail draw batch per streamed city chunk");
  assert.ok(detailBatches.every((batch) => batch.count > 35 && batch.count <= 96));
  assert.ok(detailBatches.every((batch) => batch.userData.arcadeCityArchitecturalDetailV4047 === true));
  assert.ok(detailBatches.every((batch) => batch.material instanceof THREE.MeshPhysicalMaterial));
  assert.ok(detailBatches.every((batch) => {
    const material = batch.material as THREE.MeshPhysicalMaterial;
    return material.roughness >= .4 && material.roughness <= .55 && material.metalness >= .35;
  }));

  world.dispose();
});

test("V40.47 architectural detail stays texture-free and instanced for phone performance", async () => {
  const source = await import("node:fs").then(({ readFileSync }) =>
    readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8")
  );
  assert.match(source, /new THREE\.InstancedMesh\([\s\S]*architecturalSurface\(0xffffff,\.46,\.42,\.12,\.28\),[\s\S]*96/);
  assert.match(source, /arcade-city-architectural-details-/);
  assert.match(source, /lane===0 \|\| \(lane===1 && random\(seed\+151\)>\.35\)/);
  assert.doesNotMatch(source, /TextureLoader/);
  assert.doesNotMatch(source, /CanvasTexture/);
});
