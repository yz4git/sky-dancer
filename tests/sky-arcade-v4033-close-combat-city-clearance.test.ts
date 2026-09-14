import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";
import {
  SKY_DANCER_ARCADE_V4033_CITY_TOWER_LIMIT_X,
  SKY_DANCER_ARCADE_V4033_CITY_TOWER_MIN_X,
  skyDancerArcadeCityTowerPoseV4033,
} from "../src/sky/arcade/SkyDancerArcadeV4033CloseCombatCityClearance";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

test("V40.33 opens the closest Dawn City tower lane after the proven V27.1 pass", () => {
  assert.equal(SKY_DANCER_ARCADE_V4033_CITY_TOWER_MIN_X, 48);
  assert.equal(SKY_DANCER_ARCADE_V4033_CITY_TOWER_LIMIT_X, 82);

  const inner = skyDancerArcadeCityTowerPoseV4033(52, 6);
  assert.equal(inner.tuned, true);
  assert.ok(inner.x >= 61, `inner x ${inner.x}`);
  assert.ok(inner.scaleX < 5, `inner width ${inner.scaleX}`);

  const middle = skyDancerArcadeCityTowerPoseV4033(68, 6);
  assert.equal(middle.tuned, true);
  assert.ok(middle.x > 75, `middle x ${middle.x}`);
  assert.ok(middle.scaleX < 5.3, `middle width ${middle.scaleX}`);

  assert.deepEqual(skyDancerArcadeCityTowerPoseV4033(90, 6), { x: 90, scaleX: 6, tuned: false });
});

test("V40.33 live Dawn City clears decorative towers without changing gameplay geometry", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("dawn-city"));

  const root = scene.getObjectByName("arcade-course-environment")!;
  assert.equal(root.userData.arcadeV4033CloseCombatCityClearance, true);
  assert.equal(root.userData.arcadeV4033GameplayGeometryUnchanged, true);
  assert.ok(Number(root.userData.arcadeV4033CityTowerTunedInstances) > 0);

  const tower = scene.getObjectsByProperty("name", "arcade-product-city-towers-0")[0];
  assert.ok(tower instanceof THREE.InstancedMesh);
  assert.equal(tower.userData.arcadeV4033CloseCombatClearance, true);

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
  assert.ok(nearest >= 61, `nearest V40.33 city tower should clear 61m, got ${nearest}`);

  assert.ok(scene.getObjectByName("arcade-city-river-ribbon-surface") instanceof THREE.Mesh);
  environment.dispose();
});

test("V40.33 stays scoped away from non-city worlds", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("red-canyon"));
  const root = scene.getObjectByName("arcade-course-environment")!;
  assert.notEqual(root.userData.arcadeV4033CloseCombatCityClearance, true);
  environment.dispose();
});
