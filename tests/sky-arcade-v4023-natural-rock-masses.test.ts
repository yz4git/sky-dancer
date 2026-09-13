import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function heroSetpieces(scene: THREE.Scene, name: string): THREE.Object3D[] {
  return scene.getObjectsByProperty("name", name);
}

function courseChunks(scene: THREE.Scene): THREE.Object3D[] {
  const root = scene.getObjectByName("arcade-course-environment")!;
  return root.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
}

test("V40.23 canyon hero walls are faceted rock masses instead of tall cone prisms", () => {
  const source = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV16Setpieces.ts", import.meta.url), "utf8");
  assert.equal(source.includes("new THREE.ConeGeometry(9.2, 54, 5, 2)"), false);
  assert.equal(source.includes("new THREE.CylinderGeometry(7, 12, 30, 6, 2)"), false);
  assert.match(source, /addRockMass\(group, litRock/);
});

test("V40.23 volcano hero wall no longer uses the close-range cylinder/cone pair", () => {
  const source = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV16Setpieces.ts", import.meta.url), "utf8");
  assert.equal(source.includes("new THREE.CylinderGeometry(6.5, 12.5, 44, 6, 2)"), false);
  assert.equal(source.includes("new THREE.ConeGeometry(9.5, 18, 6)"), false);
  assert.equal(source.includes("new THREE.ConeGeometry(4.9, 22, 6)"), false);
});

test("V40.24 never stretches only the outer vertices of a baked rock", () => {
  const source = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV16Setpieces.ts", import.meta.url), "utf8");
  assert.equal(source.includes("Math.abs(x) < 18"), false);
  assert.match(source, /Math\.abs\(x\) < \.5/);
  assert.match(source, /x \+ Math\.sign\(x\) \* amount/);
});

test("V40.24 marks canyon chunks as coherent translations while preserving four-beat ownership", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("red-canyon"));
  const setpieces = heroSetpieces(scene, "arcade-v16-canyon-broken-arch");
  assert.equal(setpieces.length, 4);
  assert.ok(setpieces.every((object) => object.userData.arcadeV4023NaturalRockMasses === true));
  assert.ok(setpieces.every((object) => object.userData.arcadeV4024CoherentRockClearance === true));
  assert.ok(courseChunks(scene).every((chunk) => chunk.userData.arcadeV4024CoherentLegacyTranslation === true));
  environment.dispose();
});

test("V40.24 marks volcano chunks as coherent translations without changing magma ownership", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("volcano-core"));
  const setpieces = heroSetpieces(scene, "arcade-v16-volcano-caldera-spire");
  assert.equal(setpieces.length, 4);
  assert.ok(setpieces.every((object) => object.userData.arcadeV4023NaturalRockMasses === true));
  assert.ok(setpieces.every((object) => object.userData.arcadeV4024CoherentRockClearance === true));
  assert.ok(courseChunks(scene).every((chunk) => chunk.userData.arcadeV4024CoherentLegacyTranslation === true));
  assert.ok(scene.getObjectByName("arcade-volcano-course-ribbon-core") instanceof THREE.Mesh);
  environment.dispose();
});
