import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";
import {
  SKY_DANCER_ARCADE_V23_CITY_INNER_INSTANCE_LIMIT,
  SKY_DANCER_ARCADE_V23_CITY_OUTWARD_SHIFT,
  SKY_DANCER_ARCADE_V23_CITY_INNER_WIDTH_SCALE,
  skyDancerArcadeCityInstancePoseV23,
} from "../src/sky/arcade/SkyDancerArcadeV23ScreenReview";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

test("V23 moves only the closest Dawn City instance lane outward and slims its visual width", () => {
  assert.deepEqual(skyDancerArcadeCityInstancePoseV23(38, 8), {
    x: 38 + SKY_DANCER_ARCADE_V23_CITY_OUTWARD_SHIFT,
    scaleX: 8 * SKY_DANCER_ARCADE_V23_CITY_INNER_WIDTH_SCALE,
    tuned: true,
  });
  assert.deepEqual(skyDancerArcadeCityInstancePoseV23(-42, 6), {
    x: -42 - SKY_DANCER_ARCADE_V23_CITY_OUTWARD_SHIFT,
    scaleX: 6 * SKY_DANCER_ARCADE_V23_CITY_INNER_WIDTH_SCALE,
    tuned: true,
  });
  assert.deepEqual(skyDancerArcadeCityInstancePoseV23(SKY_DANCER_ARCADE_V23_CITY_INNER_INSTANCE_LIMIT, 5), {
    x: SKY_DANCER_ARCADE_V23_CITY_INNER_INSTANCE_LIMIT,
    scaleX: 5,
    tuned: false,
  });
});

test("V23 live Dawn City opens its instanced architecture without touching gameplay geometry", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("dawn-city"));

  const root = scene.getObjectByName("arcade-course-environment")!;
  assert.equal(root.userData.arcadeV23ScreenReview, true);
  assert.equal(root.userData.arcadeV23GameplayGeometryUnchanged, true);
  assert.ok(Number(root.userData.arcadeV23CityTunedInstances) > 0);

  const tower = scene.getObjectsByProperty("name", "arcade-product-city-towers-0")[0];
  assert.ok(tower instanceof THREE.InstancedMesh);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < tower.count; index += 1) {
    tower.getMatrixAt(index, matrix);
    matrix.decompose(position, quaternion, scale);
    nearest = Math.min(nearest, Math.abs(position.x));
  }
  assert.ok(nearest >= 45, `nearest tuned city tower should clear 45m, got ${nearest}`);
  assert.ok(scene.getObjectByName("arcade-city-river-ribbon-surface") instanceof THREE.Mesh);
  assert.ok(scene.getObjectByName("arcade-city-bank-ribbon-left") instanceof THREE.Mesh);
  assert.ok(scene.getObjectByName("arcade-city-bank-ribbon-right") instanceof THREE.Mesh);

  environment.dispose();
});

test("V23 city tuning remains scoped away from non-city stages", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("ice-cavern"));
  const root = scene.getObjectByName("arcade-course-environment")!;
  assert.notEqual(root.userData.arcadeV23ScreenReview, true);
  environment.dispose();
});

test("V23 compact HUD removes secondary telemetry while preserving the control elements", () => {
  const css = readFileSync(resolve(repoRoot, "app/globals.css"), "utf8");
  const block = css.slice(css.indexOf("V23 844x390 playcheck"));
  assert.match(block, /\[aria-label="Flight status"\] > \[data-loadout\][\s\S]*display:\s*none\s*!important/);
  assert.match(block, /\[aria-label="Arcade combat controls"\] button small[\s\S]*display:\s*none\s*!important/);
  assert.match(block, /\[aria-label="Flight stick"\] > div[\s\S]*opacity:\s*\.64/);
  assert.match(block, /\[class\*="routeSelected"\][\s\S]*opacity:\s*\.96/);
  assert.doesNotMatch(block, /\[aria-label="Arcade combat controls"\] button\s*\{[^}]*\bwidth\s*:/);
});
