import test from "node:test";
import assert from "node:assert/strict";
import {
  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,
  skyDancerArcadeV40DawnCityGateAnchorDistance,
  skyDancerArcadeV40RouteDoctrine,
  skyDancerArcadeV40RouteEffect,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 gives every Arcade Run world a signature objective and tracks the currently implemented World Break stages", () => {
  const profiles = SKY_DANCER_ARCADE_STAGES.map((stage) => skyDancerArcadeV40WorldProfile(stage.id));
  assert.equal(profiles.length, 11);
  assert.equal(new Set(profiles.map((profile) => profile.objective)).size, 11);
  assert.equal(skyDancerArcadeV40WorldProfile("dawn-city").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("red-canyon").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("cloud-fleet").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("storm-carrier").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("ice-cavern").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("floating-ruins").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("night-metro").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("orbital-ascent").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("prism-citadel").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 11);
});

test("V40 route doctrine turns two-way and three-way gates into explicit risk contracts", () => {
  assert.equal(skyDancerArcadeV40RouteDoctrine(0, 2), "SAFE");
  assert.equal(skyDancerArcadeV40RouteDoctrine(1, 2), "DANGER");
  assert.equal(skyDancerArcadeV40RouteDoctrine(0, 3), "SAFE");
  assert.equal(skyDancerArcadeV40RouteDoctrine(1, 3), "SCORE");
  assert.equal(skyDancerArcadeV40RouteDoctrine(2, 3), "DANGER");
  const safe = skyDancerArcadeV40RouteEffect("SAFE");
  const score = skyDancerArcadeV40RouteEffect("SCORE");
  const danger = skyDancerArcadeV40RouteEffect("DANGER");
  assert.ok(safe.entryHpRecovery > score.entryHpRecovery);
  assert.ok(danger.scoreMultiplier > score.scoreMultiplier);
  assert.ok(danger.pressureScale < safe.pressureScale);
});

test("V40 Dawn City skyline gates are spaced before the route branch", () => {
  const distances = SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES.map((gate) => skyDancerArcadeV40DawnCityGateAnchorDistance(gate, 28, 96));
  assert.equal(distances.length, 3);
  assert.ok(distances[0] < distances[1] && distances[1] < distances[2]);
  assert.ok(SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES.at(-1)!.progress < .27);
});

test("V40 runtime exposes and resolves Dawn City physical gate objectives", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "arcade-run", seed: 4040 });
  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakObjective, "THREAD SKYLINE GATES");
  assert.equal(snapshot.worldBreakGateTotal, 3);
  runtime.triggerV40WorldBreakGateForTests(0, -1.24, .12);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakGateHits, 1);
  assert.equal(snapshot.worldBreakGateStreak, 1);
  assert.ok(snapshot.score > 0);
  runtime.triggerV40WorldBreakGateForTests(1, -1.5, 1.5);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakGateMisses, 1);
  assert.equal(snapshot.worldBreakGateStreak, 0);
});

test("V40 chosen route doctrine changes the next section recovery, score contract and pressure", () => {
  const safeRun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "arcade-run", seed: 40 });
  safeRun.completeCurrentStageForTests("red-canyon");
  safeRun.advanceResultForTests();
  const safe = safeRun.getSnapshot();
  assert.equal(safe.worldBreakRouteDoctrine, "SAFE");
  assert.equal(safe.worldBreakScoreMultiplier, 1);
  assert.ok(safe.worldBreakPressureScale > 1);

  const dangerRun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "arcade-run", seed: 40 });
  dangerRun.completeCurrentStageForTests("cloud-fleet");
  dangerRun.advanceResultForTests();
  const danger = dangerRun.getSnapshot();
  assert.equal(danger.worldBreakRouteDoctrine, "DANGER");
  assert.ok(danger.worldBreakScoreMultiplier > safe.worldBreakScoreMultiplier);
  assert.ok(danger.worldBreakPressureScale < safe.worldBreakPressureScale);
  assert.ok(danger.playerHp <= safe.playerHp);
});
