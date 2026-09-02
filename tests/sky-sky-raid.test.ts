import assert from "node:assert/strict";
import test from "node:test";
import {
  SKY_DANCER_SKY_RAID_ACTS,
  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidKillScore,
  skyDancerSkyRaidPressure,
  skyDancerSkyRaidRushActive,
} from "../src/sky/SkyDancerSkyRaidRules";

test("SKY RAID spans five arcade acts across the free-flight run", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACTS.length, 5);
  assert.equal(skyDancerSkyRaidActFor(0).id, "dawn-city");
  assert.equal(skyDancerSkyRaidActFor(24).id, "red-canyon");
  assert.equal(skyDancerSkyRaidActFor(48).id, "cloud-fleet");
  assert.equal(skyDancerSkyRaidActFor(72).id, "storm-carrier");
  assert.equal(skyDancerSkyRaidActFor(96).id, "prism-citadel");
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 96);
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS < 120);
});

test("SKY RAID scoring rewards chain, Turbo and formation rush", () => {
  const base = skyDancerSkyRaidKillScore(1, false, false);
  const chained = skyDancerSkyRaidKillScore(6, false, false);
  const turbo = skyDancerSkyRaidKillScore(6, true, false);
  const rush = skyDancerSkyRaidKillScore(6, true, true);
  assert.equal(base, 100);
  assert.ok(chained > base);
  assert.ok(turbo > chained);
  assert.equal(rush, turbo * 2);
});

test("SKY RAID pressure rises and every normal act contains a rush window", () => {
  assert.ok(skyDancerSkyRaidPressure(100) > skyDancerSkyRaidPressure(5));
  for (const act of SKY_DANCER_SKY_RAID_ACTS.slice(0, 4)) {
    assert.equal(skyDancerSkyRaidRushActive(act.startSeconds + 8, act), true);
    assert.equal(skyDancerSkyRaidRushActive(act.startSeconds + 2, act), false);
  }
});
