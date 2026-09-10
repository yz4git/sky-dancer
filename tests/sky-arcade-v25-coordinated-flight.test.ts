import test from "node:test";
import assert from "node:assert/strict";
import {
  skyDancerArcadeV25ClosureScale,
  skyDancerArcadeV25ControlProfile,
  skyDancerArcadeV25Step,
  skyDancerArcadeV25VisualAttitude,
} from "../src/sky/arcade/SkyDancerArcadeV25CoordinatedFlight";

test("V25 rolls before the flight path acquires meaningful lateral velocity", () => {
  const start = { x: -1.7, y: 0, vx: 0, vy: 0, bank: 0, pitch: 0, energy: 1 };
  const first = skyDancerArcadeV25Step(start, 1.7, 0, "fighter", 1 / 60);
  assert.ok(first.bank > 0.03, "bank should begin immediately");
  assert.ok(first.vx > 0, "bank should generate lateral acceleration");
  assert.ok(first.vx < 0.08, "path should not instantly strafe sideways");
});

test("V25 heavy aircraft roll and turn more slowly than fighters", () => {
  const fighter = skyDancerArcadeV25ControlProfile("fighter");
  const gunship = skyDancerArcadeV25ControlProfile("gunship");
  assert.ok(fighter.rollRate > gunship.rollRate * 2.5);
  assert.ok(fighter.turnAcceleration > gunship.turnAcceleration * 2);
  assert.ok(fighter.maxBank > gunship.maxBank);
});

test("V25 sustained high-G maneuver spends energy and widens closure speed", () => {
  let state = { x: -2, y: -.2, vx: 0, vy: 0, bank: 0, pitch: 0, energy: 1 };
  for (let i = 0; i < 150; i += 1) {
    state = skyDancerArcadeV25Step(state, 2, 1.7, "fighter", 1 / 60, 1.3);
  }
  assert.ok(state.energy < .96, `expected energy bleed, got ${state.energy}`);
  const hardTurnScale = skyDancerArcadeV25ClosureScale("fighter", state.energy, state.bank, state.pitch, "close-bank");
  const unloadedScale = skyDancerArcadeV25ClosureScale("fighter", 1.02, 0, 0, "approach");
  assert.ok(hardTurnScale < unloadedScale);
});

test("V25 descending unloaded aircraft recover energy", () => {
  let state = { x: 0, y: 1.4, vx: 0, vy: -.3, bank: 0, pitch: -.2, energy: .68 };
  const before = state.energy;
  for (let i = 0; i < 90; i += 1) {
    state = skyDancerArcadeV25Step(state, 0, -1.2, "interceptor", 1 / 60, .8);
  }
  assert.ok(state.energy > before, `expected recovery above ${before}, got ${state.energy}`);
});

test("V25 render attitude banks on acceleration before large displacement", () => {
  const attitude = skyDancerArcadeV25VisualAttitude(.18, .02, 5.4, .2, "cross-pass");
  assert.ok(attitude.bank < -.35);
  assert.ok(attitude.headingOffset > .1);
  assert.ok(attitude.pitchOffset > 0);
});
