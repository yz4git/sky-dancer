import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";
import {
  skyDancerArcadeV16HeroSide,
  skyDancerArcadeV16IsHeroChunk,
} from "../src/sky/arcade/SkyDancerArcadeV16Setpieces";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function chunks(scene: THREE.Scene): THREE.Object3D[] {
  const root = scene.getObjectByName("arcade-course-environment")!;
  return root.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
}

test("V16 authors four alternating hero beats instead of filling every chunk", () => {
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => skyDancerArcadeV16IsHeroChunk(index)),
    [true, false, true, false, true, false, true, false],
  );
  assert.deepEqual(
    [0, 2, 4, 6].map((index) => skyDancerArcadeV16HeroSide(index)),
    [-1, 1, -1, 1],
  );
});

test("V16 Red Canyon exposes four broken-arch hero setpieces with alternating sides", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("red-canyon"));

  const courseChunks = chunks(scene);
  assert.equal(courseChunks.length, 8);
  assert.ok(courseChunks.every((chunk) => chunk.userData.arcadeV16LegacySceneryPushedOut === true));
  assert.equal(courseChunks.filter((chunk) => chunk.userData.arcadeV16HeroSetpiece === true).length, 4);
  assert.deepEqual(
    courseChunks.filter((chunk) => chunk.userData.arcadeV16HeroSetpiece === true).map((chunk) => chunk.userData.arcadeV16HeroSide),
    [-1, 1, -1, 1],
  );
  assert.equal(scene.getObjectsByProperty("name", "arcade-v16-canyon-broken-arch").length, 4);

  environment.dispose();
});

test("V16 Volcano Core exposes four caldera-spire beats without changing the magma ribbon owner", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("volcano-core"));

  const courseChunks = chunks(scene);
  assert.equal(courseChunks.filter((chunk) => chunk.userData.arcadeV16HeroSetpiece === true).length, 4);
  assert.equal(scene.getObjectsByProperty("name", "arcade-v16-volcano-caldera-spire").length, 4);
  assert.ok(scene.getObjectByName("arcade-volcano-course-ribbon-outer") instanceof THREE.Mesh);
  assert.ok(scene.getObjectByName("arcade-volcano-course-ribbon-core") instanceof THREE.Mesh);

  environment.dispose();
});

test("V16 setpiece layer stays scoped to Red Canyon and Volcano Core", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("ice-cavern"));

  assert.equal(scene.getObjectsByProperty("name", "arcade-v16-canyon-broken-arch").length, 0);
  assert.equal(scene.getObjectsByProperty("name", "arcade-v16-volcano-caldera-spire").length, 0);
  assert.ok(chunks(scene).every((chunk) => chunk.userData.arcadeV16HeroSetpiece !== true));

  environment.dispose();
});
