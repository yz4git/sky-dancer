import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V31 course timeout makes an undefeated boss disengage instead of popping away", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "arcade-run",
    startStageId: "dawn-city",
    difficulty: "normal",
    seed: 3101,
  });
  runtime.setBossHpRatioForTests(.9);
  const before = runtime.getSnapshot();
  const bossBefore = before.enemies.find((enemy) => enemy.boss);
  assert.ok(bossBefore);

  runtime.triggerV11TimelineForTests(.999);
  runtime.step(.08);
  const disengage = runtime.getSnapshot();
  assert.equal(disengage.bossActive, false, "combat HUD releases the retreating boss immediately");
  assert.equal(disengage.status, "running", "V40.14 keeps the exit shot alive during the boss outro hold");
  const departing = disengage.enemies.find((enemy) => enemy.id === bossBefore.id);
  assert.ok(departing, "boss visual survives the timeout frame");
  const disengageDepth = departing.depth;

  for (let index = 0; index < 3; index += 1) runtime.step(.05);
  const moving = runtime.getSnapshot();
  const movingBoss = moving.enemies.find((enemy) => enemy.id === bossBefore.id);
  assert.ok(movingBoss, "boss remains visible during the authored outro hold");
  assert.ok(movingBoss.depth > disengageDepth, "boss visibly recedes before the SECTION CLEAR card");

  for (let index = 0; index < 30 && runtime.getSnapshot().status === "running"; index += 1) runtime.step(.05);
  const clear = runtime.getSnapshot();
  assert.equal(clear.status, "stage-clear");
  const clearDistance = clear.distance;
  runtime.step(.1);
  assert.ok(runtime.getSnapshot().distance > clearDistance, "stage-clear backdrop keeps drifting instead of freezing");
});

test("V31 stage handoff drains leftover actors before the next route loads", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "arcade-run",
    startStageId: "dawn-city",
    difficulty: "normal",
    seed: 3102,
  });
  const escortId = runtime.spawnEnemyForTests("fighter", 1.2, .2, 22);
  runtime.setBossHpRatioForTests(.9);
  runtime.triggerV11TimelineForTests(.999);
  runtime.step(.08);
  const outro = runtime.getSnapshot();
  assert.equal(outro.status, "running");
  assert.ok(outro.enemies.some((enemy) => enemy.id === escortId), "surviving aircraft enters the authored retreat instead of hard-clearing");

  for (let index = 0; index < 30 && runtime.getSnapshot().status === "running"; index += 1) runtime.step(.05);
  const clear = runtime.getSnapshot();
  assert.equal(clear.status, "stage-clear");

  for (let index = 0; index < 30; index += 1) runtime.step(.05);
  const next = runtime.getSnapshot();
  assert.equal(next.status, "running");
  assert.notEqual(next.stage.id, "dawn-city");
  assert.equal(next.enemies.some((enemy) => enemy.id === escortId), false, "old-stage actor does not leak into the new stage");
});

test("V31 source keeps course-end boss alive for presentation and animates stage-clear", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  const start = source.indexOf("private breakClimaxTargetAtCourseEnd(): void");
  const end = source.indexOf("private completeStage(): void", start);
  const transition = source.slice(start, end);
  assert.doesNotMatch(transition, /boss\.alive = false/);
  assert.match(transition, /TARGET DISENGAGING/);
  assert.match(transition, /updateStageClearPresentation/);
  assert.match(source, /if \(this\.status === "stage-clear"\) \{[\s\S]*this\.updateStageClearPresentation\(delta\)/);
  assert.match(source, /enemy\.alive && enemy\.boss && !enemy\.retreating/);
});
