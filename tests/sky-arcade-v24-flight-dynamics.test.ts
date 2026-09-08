import test from "node:test";
import assert from "node:assert/strict";
import {
  skyDancerArcadeV24BankTarget,
  skyDancerArcadeV24FlightProfile,
  skyDancerArcadeV24HeadingOffset,
  skyDancerArcadeV24Steer,
} from "../src/sky/arcade/SkyDancerArcadeV24FlightDynamics";

test("V24 light fighters pull harder than heavy aircraft", () => {
  const raider = skyDancerArcadeV24FlightProfile("raider");
  const gunship = skyDancerArcadeV24FlightProfile("gunship");
  assert.ok(raider.lateralAcceleration > gunship.lateralAcceleration * 2);
  assert.ok(raider.maxLateralSpeed > gunship.maxLateralSpeed * 2);
});

test("V24 steering accelerates toward a target instead of teleporting", () => {
  const start = { x: -1.8, y: 0, vx: 0, vy: 0 };
  const first = skyDancerArcadeV24Steer(start, 1.8, .8, "fighter", 1 / 60);
  assert.ok(first.x > start.x);
  assert.ok(first.x < -1.7);
  assert.ok(first.vx > 0);
  assert.ok(first.vx <= skyDancerArcadeV24FlightProfile("fighter").lateralAcceleration / 60 + 1e-9);
});

test("V24 direction reversal preserves aircraft inertia for at least one frame", () => {
  let state = { x: -1.2, y: 0, vx: 0, vy: 0 };
  for (let i = 0; i < 18; i += 1) state = skyDancerArcadeV24Steer(state, 1.5, 0, "fighter", 1 / 60);
  assert.ok(state.vx > 0.8);
  const reversed = skyDancerArcadeV24Steer(state, -1.5, 0, "fighter", 1 / 60);
  assert.ok(reversed.vx > 0, "aircraft should keep moving through the turn before reversing lateral velocity");
});

test("V24 visual attitude points and banks into lateral motion", () => {
  assert.ok(skyDancerArcadeV24HeadingOffset(1.5, "close-bank") > 0.2);
  assert.ok(skyDancerArcadeV24BankTarget(1.5, "close-bank") < -0.2);
  assert.equal(skyDancerArcadeV24HeadingOffset(0, "approach"), 0);
  assert.equal(skyDancerArcadeV24BankTarget(0, "approach"), 0);
});
