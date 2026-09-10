import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";
import {
  SKY_DANCER_ARCADE_V271_FRONT_CAP_HARD,
  SKY_DANCER_ARCADE_V271_FRONT_CAP_NORMAL,
  SKY_DANCER_ARCADE_V271_FRONT_DEPTH,
  skyDancerArcadeCityInstancePoseV271,
  skyDancerArcadeV271CombatCorridorCrowded,
  skyDancerArcadeV271CueBudget,
  skyDancerArcadeV271FrontCombatCrowded,
  skyDancerArcadeV271ThreatCueScore,
} from "../src/sky/arcade/SkyDancerArcadeV271ScreenPolish";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

test("V27.1 gives the nearest city visual lane extra phone-screen clearance", () => {
  const inner = skyDancerArcadeCityInstancePoseV271(45, 8);
  assert.equal(inner.tuned, true);
  assert.ok(inner.x >= 52, `inner x ${inner.x}`);
  assert.ok(inner.scaleX < 6.3, `inner width ${inner.scaleX}`);

  const middle = skyDancerArcadeCityInstancePoseV271(68, 8);
  assert.equal(middle.tuned, true);
  assert.ok(middle.x > 72);
  assert.ok(middle.scaleX < 8);

  assert.deepEqual(skyDancerArcadeCityInstancePoseV271(90, 8), { x: 90, scaleX: 8, tuned: false });
});

test("V27.1 live Dawn City keeps gameplay geometry but further opens instanced architecture", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("dawn-city"));
  const root = scene.getObjectByName("arcade-course-environment")!;
  assert.equal(root.userData.arcadeV271ScreenPolish, true);
  assert.equal(root.userData.arcadeV271GameplayGeometryUnchanged, true);
  assert.ok(Number(root.userData.arcadeV271CityTunedInstances) > 0);

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
  assert.ok(nearest >= 52, `nearest V27.1 city tower should clear 52m, got ${nearest}`);
  assert.ok(scene.getObjectByName("arcade-city-river-ribbon-surface") instanceof THREE.Mesh);
  environment.dispose();
});

test("V27.1 budgets full targeting cues while preserving secondary lock visibility", () => {
  const phone = skyDancerArcadeV271CueBudget(true);
  const large = skyDancerArcadeV271CueBudget(false);
  assert.deepEqual(phone, { primaryLocks: 4, aimCues: 2, counterplayCues: 2, secondaryLockScale: .52 });
  assert.ok(large.primaryLocks > phone.primaryLocks);
  assert.ok(phone.secondaryLockScale > .45 && phone.secondaryLockScale < .6);
  assert.ok(skyDancerArcadeV271ThreatCueScore(18, .25, true, false) > skyDancerArcadeV271ThreatCueScore(55, 1.5, false, false));
  assert.ok(skyDancerArcadeV271ThreatCueScore(45, 1.1, false, true) > skyDancerArcadeV271ThreatCueScore(15, .1, false, false));
});

test("V27.1 adds a front-band density ceiling before enemies become extreme-close", () => {
  assert.equal(SKY_DANCER_ARCADE_V271_FRONT_DEPTH, 58);
  assert.equal(SKY_DANCER_ARCADE_V271_FRONT_CAP_NORMAL, 7);
  assert.equal(SKY_DANCER_ARCADE_V271_FRONT_CAP_HARD, 9);
  assert.equal(skyDancerArcadeV271FrontCombatCrowded([10, 18, 25, 33, 42, 49, 56], false), true);
  assert.equal(skyDancerArcadeV271FrontCombatCrowded([10, 18, 25, 33, 42, 49], false), false);
  assert.equal(skyDancerArcadeV271CombatCorridorCrowded([8, 14, 20, 28, 34], false), true);
});
