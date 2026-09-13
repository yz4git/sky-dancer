import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  createSkyDancerArcadeEnvironmentalLightningFx,
  createSkyDancerArcadeVolcanicPlumeFx,
} from "../src/sky/arcade/SkyDancerArcadeV4022EnvironmentalFx";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function renderables(root: THREE.Object3D): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  root.traverse((object) => objects.push(object));
  return objects;
}

test("V40.22 storm scenery uses additive lightning FX with no solid bolt meshes", () => {
  const effect = createSkyDancerArcadeEnvironmentalLightningFx(stage("storm-carrier"), 3, 38);
  const objects = renderables(effect);
  assert.ok(objects.some((object) => object instanceof THREE.Line));
  assert.ok(objects.some((object) => object instanceof THREE.Points));
  assert.equal(objects.some((object) => object instanceof THREE.Mesh), false);
  assert.equal(effect.userData.arcadeV4022PresentationOnly, true);
});

test("V40.22 volcanic emissions are lines and embers rather than solid cones", () => {
  const effect = createSkyDancerArcadeVolcanicPlumeFx(0xffa743, 9, 24);
  const objects = renderables(effect);
  assert.ok(objects.some((object) => object instanceof THREE.Line));
  assert.ok(objects.some((object) => object instanceof THREE.Points));
  assert.equal(objects.some((object) => object instanceof THREE.Mesh), false);
  assert.equal(effect.userData.arcadeV4022SolidGeometryRemoved, true);
});

test("V40.22 removes the audited storm and volcano solid-effect primitives", () => {
  const world = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8");
  assert.equal(world.includes("new THREE.CylinderGeometry(.12,.23,9+j*.8,5)"), false);
  assert.equal(world.includes("new THREE.ConeGeometry(.4,11+r(i)*9,6)"), false);
  assert.equal(world.includes("new THREE.ConeGeometry(.28,8+r(j+57)*10,5)"), false);
  assert.match(world, /createSkyDancerArcadeEnvironmentalLightningFx/);
  assert.match(world, /createSkyDancerArcadeVolcanicPlumeFx/);
});

test("V40.22 replaces V16 foreground boards and solid lava columns with faceted rock plus FX", () => {
  const source = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV16Setpieces.ts", import.meta.url), "utf8");
  assert.equal(source.includes("new THREE.BoxGeometry(34, 5.2, 9)"), false);
  assert.equal(source.includes("new THREE.BoxGeometry(31, 4.5, 18)"), false);
  assert.equal(source.includes("new THREE.BoxGeometry(2.3, 30, 2.1)"), false);
  assert.equal(source.includes("new THREE.ConeGeometry(1.25, 26, 7)"), false);
  assert.match(source, /DodecahedronGeometry/);
  assert.match(source, /createSkyDancerArcadeVolcanicPlumeFx/);
});

test("V40.22 stays out of runtime gameplay ownership", () => {
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.equal(runtime.includes("V4022EnvironmentalFx"), false);
});
