import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS,
  SKY_DANCER_ARCADE_V40_STORM_LANES,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 3 activates Storm Carrier and Desert Fortress as distinct World Break stages", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("storm-carrier").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("storm-carrier").signature, "LIGHTNING GRID");
  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").signature, "FORTRESS GATE");
});

test("V40 Storm Carrier resolves a moving safe lane and punishes the lightning side", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "storm-carrier", seed: 4045 });
  let snapshot = runtime.getSnapshot();
  const beforeScore = snapshot.score;
  const beforeHp = snapshot.playerHp;
  assert.equal(snapshot.worldBreakStormTotal, SKY_DANCER_ARCADE_V40_STORM_LANES.length);
  runtime.triggerV40StormLaneForTests(0, true);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakStormHits, 1);
  assert.equal(snapshot.worldBreakStormMisses, 0);
  assert.ok(snapshot.score > beforeScore);
  runtime.triggerV40StormLaneForTests(1, false);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakStormHits, 1);
  assert.equal(snapshot.worldBreakStormMisses, 1);
  assert.ok(snapshot.playerHp < beforeHp);
});

test("V40 Desert Fortress requires all batteries before the physical breach can score", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "desert-fortress", seed: 4046 });
  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakTargetTotal, SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length);
  assert.equal(snapshot.worldBreakFortressBreachOpen, false);
  for (const target of SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS) runtime.destroyV40FortressTargetForTests(target.index);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakTargetHits, SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length);
  assert.equal(snapshot.worldBreakFortressBreachOpen, true);
  const scoreBeforeBreach = snapshot.score;
  runtime.triggerV40FortressBreachForTests(true);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakFortressBreachResolved, true);
  assert.equal(snapshot.worldBreakFortressBreachSuccess, true);
  assert.ok(snapshot.score > scoreBeforeBreach);
});

test("V40 Desert Fortress keeps the wall lethal when a required battery escapes", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "desert-fortress", seed: 4047 });
  runtime.missV40FortressTargetForTests(0);
  for (const target of SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.slice(1)) runtime.destroyV40FortressTargetForTests(target.index);
  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakFortressBreachOpen, false);
  const hp = snapshot.playerHp;
  runtime.triggerV40FortressBreachForTests(true);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakFortressBreachResolved, true);
  assert.equal(snapshot.worldBreakFortressBreachSuccess, false);
  assert.ok(snapshot.playerHp < hp);
});

test("V40 WebGL keeps authored World Break roots attached across stage handoffs", () => {
  const source = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  assert.match(source, /worldBreakRoot\.add\(this\.worldBreakKnifeRoot, this\.worldBreakStormRoot, this\.worldBreakFortressRoot\)/);
  assert.match(source, /syncWorldBreakStormLane\(snapshot\)/);
  assert.match(source, /syncWorldBreakFortressBreach\(snapshot\)/);
});
