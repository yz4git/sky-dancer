import test from "node:test";
import assert from "node:assert/strict";
import { skyDancerArcadeV28ReadableAttitude } from "../src/sky/arcade/SkyDancerArcadeV28DogfightReadability";

const base = {
  kind: "fighter" as const,
  maneuver: "cross-pass",
  relativeX: .8,
  relativeY: .35,
  lateralVelocity: 1.2,
  verticalVelocity: .45,
  lateralAcceleration: 2.1,
  verticalAcceleration: .7,
  id: 7,
  runTimeSeconds: 12.5,
};

test("V28 increases body reveal as a crossing aircraft enters the phone foreground", () => {
  const far = skyDancerArcadeV28ReadableAttitude({ ...base, depth: 92 });
  const mid = skyDancerArcadeV28ReadableAttitude({ ...base, depth: 52 });
  const close = skyDancerArcadeV28ReadableAttitude({ ...base, depth: 16 });

  assert.ok(mid.reveal > far.reveal, `${mid.reveal} should exceed ${far.reveal}`);
  assert.ok(close.reveal > mid.reveal, `${close.reveal} should exceed ${mid.reveal}`);
  assert.ok(Math.abs(close.yawOffset) > Math.abs(far.yawOffset));
  assert.ok(Math.abs(close.pitchOffset) > Math.abs(far.pitchOffset));
});

test("V28 turns opposite screen lanes into opposite readable body presentation", () => {
  const left = skyDancerArcadeV28ReadableAttitude({ ...base, depth: 24, relativeX: -.9, relativeY: -.4 });
  const right = skyDancerArcadeV28ReadableAttitude({ ...base, depth: 24, relativeX: .9, relativeY: .4 });

  assert.notEqual(Math.sign(left.yawOffset), Math.sign(right.yawOffset));
  assert.notEqual(Math.sign(left.pitchOffset), Math.sign(right.pitchOffset));
});

test("V28 keeps agile aircraft more expressive than heavy gunships", () => {
  const drone = skyDancerArcadeV28ReadableAttitude({ ...base, kind: "drone", depth: 18 });
  const gunship = skyDancerArcadeV28ReadableAttitude({ ...base, kind: "gunship", depth: 18 });

  assert.ok(Math.abs(drone.yawOffset) > Math.abs(gunship.yawOffset));
  assert.ok(Math.abs(drone.pitchOffset) > Math.abs(gunship.pitchOffset));
  assert.ok(drone.response > gunship.response);
});

test("V28 offsets remain bounded even under pathological motion samples", () => {
  const extreme = skyDancerArcadeV28ReadableAttitude({
    ...base,
    kind: "ace",
    depth: 0,
    lateralVelocity: 99,
    verticalVelocity: -99,
    lateralAcceleration: 999,
    verticalAcceleration: -999,
  });

  assert.ok(Math.abs(extreme.yawOffset) <= .32);
  assert.ok(Math.abs(extreme.pitchOffset) <= .24);
  assert.ok(Math.abs(extreme.rollOffset) <= .18);
  assert.ok(extreme.reveal <= 1);
});

test("V28 never applies the presentation-only rescue to bosses", () => {
  assert.deepEqual(
    skyDancerArcadeV28ReadableAttitude({ ...base, kind: "boss", depth: 8 }),
    { pitchOffset: 0, yawOffset: 0, rollOffset: 0, reveal: 0, response: 4 },
  );
});
