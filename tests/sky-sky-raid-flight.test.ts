import assert from "node:assert/strict";
import test from "node:test";
import {
  SKY_RAID_MAX_ALTITUDE,
  SKY_RAID_MAX_BANK,
  SKY_RAID_MIN_ALTITUDE,
  SkyDancerSkyRaidFlightController,
  skyRaidBankTarget,
  skyRaidHeadingDelta,
} from "../src/sky/SkyDancerSkyRaidFlight";

test("SKY RAID heading delta wraps across pi", () => {
  assert.ok(Math.abs(skyRaidHeadingDelta(-Math.PI + 0.05, Math.PI - 0.05) - 0.1) < 0.001);
});

test("SKY RAID bank follows turn rate and stays aircraft-safe", () => {
  assert.ok(skyRaidBankTarget(1.5, 1) < 0);
  assert.ok(skyRaidBankTarget(-1.5, -1) > 0);
  assert.ok(Math.abs(skyRaidBankTarget(99, 1)) <= SKY_RAID_MAX_BANK);
});

test("SKY RAID supports sustained climb and descent with altitude limits", () => {
  const flight = new SkyDancerSkyRaidFlightController();
  flight.setVerticalInput(1);
  let state = flight.step(1 / 60, 0, 0, false);
  for (let i = 0; i < 360; i += 1) state = flight.step(1 / 60, 0, 0, false);
  assert.ok(state.altitude > 10);
  assert.ok(state.altitude <= SKY_RAID_MAX_ALTITUDE);
  assert.ok(state.pitch < 0);
  flight.setVerticalInput(-1);
  for (let i = 0; i < 600; i += 1) state = flight.step(1 / 60, 0, 0, false);
  assert.ok(state.altitude >= SKY_RAID_MIN_ALTITUDE);
  assert.ok(state.pitch > 0);
});


test("SKY RAID flight tuning changes controller response without violating flight caps", () => {
  const baseline = new SkyDancerSkyRaidFlightController();
  const tuned = new SkyDancerSkyRaidFlightController();
  tuned.setTuning({ verticalSpeedScale: 1.2, bankScale: 1.15, bankResponseScale: 1.1, pitchScale: 1.1 });
  baseline.setVerticalInput(1);
  tuned.setVerticalInput(1);
  let baseState = baseline.step(1 / 60, 0, 0.5, false);
  let tunedState = tuned.step(1 / 60, 0, 0.5, false);
  for (let frame = 1; frame <= 90; frame += 1) {
    const heading = frame * 0.008;
    baseState = baseline.step(1 / 60, heading, 0.5, false);
    tunedState = tuned.step(1 / 60, heading, 0.5, false);
  }
  assert.ok(tunedState.verticalSpeed > baseState.verticalSpeed);
  assert.ok(Math.abs(tunedState.bank) >= Math.abs(baseState.bank));
  assert.ok(Math.abs(tunedState.bank) <= SKY_RAID_MAX_BANK);
  assert.ok(tunedState.altitude <= SKY_RAID_MAX_ALTITUDE);
});
