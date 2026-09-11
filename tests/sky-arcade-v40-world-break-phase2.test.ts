import test from "node:test";
import assert from "node:assert/strict";
import {
  SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 2 activates distinct Red Canyon and Cloud Fleet world objectives", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("red-canyon").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("red-canyon").signature, "KNIFE RUN");
  assert.equal(skyDancerArcadeV40WorldProfile("cloud-fleet").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("cloud-fleet").signature, "DECK STRIKE");
});

test("V40 Red Canyon knife run rewards sustained low altitude rather than another kill check", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "red-canyon", seed: 4042 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40KnifeRunForTests(SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS + .2, -1.05);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakKnifeComplete, true);
  assert.ok(snapshot.worldBreakKnifeSeconds >= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS);
  assert.ok(snapshot.score > before);
  assert.equal(snapshot.worldBreakTargetTotal, 0);
});

test("V40 Cloud Fleet uses lockable destructible flagship subsystems", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "cloud-fleet", seed: 4043 });
  let snapshot = runtime.getSnapshot();
  const targets = snapshot.enemies.filter((enemy) => enemy.worldBreakTarget);
  assert.equal(snapshot.worldBreakTargetTotal, SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS.length);
  assert.equal(targets.length, SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS.length);
  assert.equal(snapshot.worldBreakTargetCurrentLabel, "PORT BATTERY");

  runtime.destroyV40FleetTargetForTests(0);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakTargetHits, 1);
  assert.equal(snapshot.worldBreakTargetMisses, 0);
  assert.equal(snapshot.worldBreakTargetCurrentLabel, "ENGINE ARRAY");
});

test("V40 Cloud Fleet records a passed subsystem as a miss without damaging the player", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "cloud-fleet", seed: 4044 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.missV40FleetTargetForTests(0);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakTargetHits, 0);
  assert.equal(snapshot.worldBreakTargetMisses, 1);
  assert.equal(snapshot.playerHp, hp);
  assert.equal(snapshot.worldBreakTargetCurrentLabel, "ENGINE ARRAY");
});
