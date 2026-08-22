import assert from "node:assert/strict";
import test from "node:test";
import { CartArenaSession } from "../src/cart/CartArenaSession";

const FIXED_STEP = 1 / 60;
const DRIVE_INPUT = { throttle: 0.84, brake: 0, steer: 0, boost: false } as const;

test("Sky Dancer starts from the Cart Rogue arena contract", () => {
  const session = new CartArenaSession();
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeId, "arena-01");
  assert.equal(snapshot.gas, 1);
  assert.equal(snapshot.boostCharges, 2);
  assert.ok(snapshot.enemiesTotal > 0);
  assert.ok(snapshot.obstacles.length > 0);
});

test("the original arcade steering and forward drive remain active", () => {
  const session = new CartArenaSession();
  const before = session.snapshot();
  for (let index = 0; index < 10; index += 1) {
    session.advance(FIXED_STEP, { ...DRIVE_INPUT, steer: 1 });
  }
  const after = session.snapshot();
  assert.notEqual(after.x, before.x);
  assert.ok(after.speed > 0);
});

test("BRAKE and TURBO use the same input contract as Cart Rogue", () => {
  const session = new CartArenaSession();
  session.advance(FIXED_STEP, { ...DRIVE_INPUT, boost: true });
  assert.equal(session.snapshot().boostActive, true);
  for (let index = 0; index < 150; index += 1) {
    session.advance(FIXED_STEP, { throttle: 0, brake: 1, steer: 0, boost: false });
  }
  assert.equal(session.snapshot().boostActive, false);
  assert.ok(session.snapshot().gas <= 1);
});

test("the first airborne conversion keeps the route graph and enemy targets intact", () => {
  const session = new CartArenaSession();
  for (let index = 0; index < 30; index += 1) session.advance(FIXED_STEP, DRIVE_INPUT);
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeKind, "arena");
  assert.ok(snapshot.enemies.some((enemy) => enemy.kind === "blocker" || enemy.kind === "chaser"));
});
