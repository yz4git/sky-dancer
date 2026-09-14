import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  SKY_DANCER_ARCADE_V4029_MAX_WRECKS,
  SkyDancerArcadeV4029EnemyBreakupDirector,
  skyDancerArcadeV4029BreakupProfile,
} from "../src/sky/arcade/SkyDancerArcadeV4029EnemyBreakup";

const makeEnemy = (id: number) => {
  const group = new THREE.Group();
  group.name = `arcade-enemy-${id}`;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, .3, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const lock = new THREE.Group();
  lock.name = "arcade-lock-ring";
  group.add(lock);
  const beacon = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
  beacon.name = "arcade-enemy-v18-round-beacons";
  group.add(beacon);
  return group;
};

test("V40.29 gives light, agile and heavy kills materially different wreck motion", () => {
  const light = skyDancerArcadeV4029BreakupProfile("fighter");
  const agile = skyDancerArcadeV4029BreakupProfile("ace");
  const heavy = skyDancerArcadeV4029BreakupProfile("gunship");
  assert.equal(light.className, "snap-roll");
  assert.equal(agile.className, "wing-over");
  assert.equal(heavy.className, "heavy-drop");
  assert.ok(light.rollSpeed > agile.rollSpeed && agile.rollSpeed > heavy.rollSpeed);
  assert.ok(agile.lateralSpeed > light.lateralSpeed && light.lateralSpeed > heavy.lateralSpeed);
  assert.ok(heavy.durationSeconds > agile.durationSeconds && agile.durationSeconds > light.durationSeconds);
  assert.ok(heavy.fragmentCount > light.fragmentCount);
});

test("V40.29 missile kills add impulse without changing the aircraft reaction class", () => {
  const gun = skyDancerArcadeV4029BreakupProfile("interceptor", false);
  const missile = skyDancerArcadeV4029BreakupProfile("interceptor", true);
  assert.equal(gun.className, missile.className);
  assert.equal(gun.durationSeconds, missile.durationSeconds);
  assert.ok(missile.forwardDrift > gun.forwardDrift);
  assert.ok(missile.lateralSpeed > gun.lateralSpeed);
});

test("V40.29 retires targeting cues and keeps the wreck pool bounded", () => {
  const director = new SkyDancerArcadeV4029EnemyBreakupDirector();
  let retired = 0;
  for (let id = 1; id <= SKY_DANCER_ARCADE_V4029_MAX_WRECKS + 2; id += 1) {
    const group = makeEnemy(id);
    retired += director.adopt(group, { enemyId: id, kind: id % 3 === 0 ? "gunship" : "fighter", missile: false }).length;
    assert.equal(group.getObjectByName("arcade-lock-ring")?.visible, false);
    assert.equal(group.getObjectByName("arcade-enemy-v18-round-beacons")?.visible, false);
  }
  assert.equal(director.activeCount, SKY_DANCER_ARCADE_V4029_MAX_WRECKS);
  assert.equal(retired, 4);
  let lights = 0;
  director.root.traverse((object) => { if (object instanceof THREE.Light) lights += 1; });
  assert.equal(lights, 0);
  assert.equal(director.root.userData.arcadeV4029CollisionUnchanged, true);
});

test("V40.29 wrecks visibly fall, tumble, then fully retire", () => {
  const director = new SkyDancerArcadeV4029EnemyBreakupDirector();
  const group = makeEnemy(7);
  group.position.set(2, 3, -20);
  director.adopt(group, { enemyId: 7, kind: "ace", missile: true });
  const start = group.position.clone();
  for (let i = 0; i < 12; i += 1) director.update(.05);
  assert.notEqual(group.position.x, start.x);
  assert.ok(group.position.y < start.y);
  assert.ok(group.position.z < start.z);
  assert.notEqual(group.rotation.z, 0);
  let retired: THREE.Object3D[] = [];
  for (let i = 0; i < 20; i += 1) retired = retired.concat(director.update(.05));
  assert.equal(director.activeCount, 0);
  assert.ok(retired.includes(group));
});

test("V40.29 consumes real destroyed impacts in WebGL only and never owns runtime gameplay", () => {
  const webgl = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(webgl, /SkyDancerArcadeV4029EnemyBreakupDirector/);
  assert.match(webgl, /impact\.destroyed/);
  assert.match(webgl, /v4029PendingBreakups/);
  assert.match(webgl, /v4029Breakups\.adopt/);
  assert.equal(runtime.includes("V4029EnemyBreakup"), false);
});
