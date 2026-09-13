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

test("V40.23 marks canyon hero chunks as naturalized while preserving four-beat ownership", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("red-canyon"));
  const setpieces = heroSetpieces(scene, "arcade-v16-canyon-broken-arch");
  assert.equal(setpieces.length, 4);
  assert.ok(setpieces.every((object) => object.userData.arcadeV4023NaturalRockMasses === true));
  environment.dispose();
});

test("V40.23 marks volcano hero chunks as naturalized without changing runtime ownership", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("volcano-core"));
  const setpieces = heroSetpieces(scene, "arcade-v16-volcano-caldera-spire");
  assert.equal(setpieces.length, 4);
  assert.ok(setpieces.every((object) => object.userData.arcadeV4023NaturalRockMasses === true));
  assert.ok(scene.getObjectByName("arcade-volcano-course-ribbon-core") instanceof THREE.Mesh);
  environment.dispose();
});
