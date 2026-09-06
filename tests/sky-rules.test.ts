import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { CartArenaSession } from "../src/cart/CartArenaSession";
import { cartTurboHuntProductProgressionOwned } from "../src/cart/CartTurboHuntProductOwnership";
import {
  SKY_DANCER_ENEMY_PREFERRED_STANDOFF,
  skyDancerAvoidanceHeading,
  skyDancerEnemySafetyRadius,
  skyDancerEnemyPairHorizontalClearance,
  skyDancerEnemyPairMinimumSeparation,
  skyDancerNormalizeAngle,
} from "../src/sky/SkyDancerFlightAvoidanceMath";

const FIXED_STEP = 1 / 60;
const DRIVE_INPUT = { throttle: 0.84, brake: 0, steer: 0, boost: false } as const;

test("Sky Dancer starts from the expected arena contract", () => {
  const session = new CartArenaSession();
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeId, "arena-01");
  assert.equal(snapshot.gas, 1);
  assert.equal(snapshot.boostCharges, 2);
  assert.ok(snapshot.enemiesTotal > 0);
  assert.ok(snapshot.obstacles.length > 0);
});

test("steering and forward drive remain active", () => {
  const session = new CartArenaSession();
  const before = session.snapshot();
  for (let index = 0; index < 10; index += 1) session.advance(FIXED_STEP, { ...DRIVE_INPUT, steer: 1 });
  const after = session.snapshot();
  assert.notEqual(after.x, before.x);
  assert.ok(after.speed > 0);
});

test("airborne conversion preserves the route graph and enemy targets", () => {
  const session = new CartArenaSession();
  for (let index = 0; index < 30; index += 1) session.advance(FIXED_STEP, DRIVE_INPUT);
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeKind, "arena");
  assert.ok(snapshot.enemies.some((enemy) => enemy.kind === "blocker" || enemy.kind === "chaser"));
});

test("aircraft exhaust geometry points backward on the flight axis", () => {
  const geometry = new THREE.ConeGeometry(0.22, 1.7, 10, 1, true);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  assert.ok(bounds);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const epsilon = 0.002;
  let rearRadius = 0;
  let frontRadius = 0;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const radius = Math.hypot(x, y);
    if (Math.abs(z - bounds.min.z) < epsilon) rearRadius = Math.max(rearRadius, radius);
    if (Math.abs(z - bounds.max.z) < epsilon) frontRadius = Math.max(frontRadius, radius);
  }
  assert.ok(frontRadius > 0.18);
  assert.ok(rearRadius < frontRadius * 0.25);
});

test("enemy guidance breaks away early and keeps a physical standoff", () => {
  const safety = skyDancerEnemySafetyRadius(1.75);
  assert.equal(SKY_DANCER_ENEMY_PREFERRED_STANDOFF, 21);
  assert.ok(safety > 5.8);
  const close = skyDancerAvoidanceHeading(0, 0, 0, 12, 0, 12, 1);
  assert.ok(Math.abs(skyDancerNormalizeAngle(close)) > 2.3);
  const missileZone = skyDancerAvoidanceHeading(0, 0, 0, 22, 0, 22, 1);
  const crank = Math.abs(skyDancerNormalizeAngle(missileZone));
  assert.ok(crank >= 0.5 && crank <= 0.8);
});


test("enemy pair spacing keeps same-altitude aircraft visually separated", () => {
  const standard = skyDancerEnemyPairMinimumSeparation(1.4, 1.4);
  assert.ok(standard >= 6.4);
  assert.equal(skyDancerEnemyPairHorizontalClearance(1.4, 1.4, 0), standard);
  assert.ok(skyDancerEnemyPairHorizontalClearance(1.4, 1.4, 4) < standard);
  assert.equal(skyDancerEnemyPairHorizontalClearance(1.4, 1.4, standard), 0);
  assert.ok(skyDancerEnemyPairMinimumSeparation(2.4, 2.4) > standard);
});

test("Sky Dancer product modes reserve Turbo Hunt progression from legacy cart directors", () => {
  assert.equal(cartTurboHuntProductProgressionOwned("turbo-hunt"), true);
  assert.equal(cartTurboHuntProductProgressionOwned("sky-raid"), true);
  assert.equal(cartTurboHuntProductProgressionOwned("title"), false);
  assert.equal(cartTurboHuntProductProgressionOwned(undefined), false);
});
