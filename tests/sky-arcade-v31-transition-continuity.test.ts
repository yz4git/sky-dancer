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
  runtime.step(.05);
  const clear = runtime.getSnapshot();
  assert.equal(clear.status, "stage-clear");
  assert.equal(clear.bossActive, false, "combat HUD releases the retreating boss immediately");
  const departing = clear.enemies.find((enemy) => enemy.id === bossBefore.id);
  assert.ok(departing, "boss visual survives the timeout frame");
  const clearDepth = departing.depth;

  for (let index = 0; index < 8; index += 1) runtime.step(.05);
  const moving = runtime.getSnapshot();
  const movingBoss = moving.enemies.find((enemy) => enemy.id === bossBefore.id);
  assert.ok(movingBoss, "boss remains visible during the result handoff");
  assert.ok(movingBoss.depth > clearDepth + 8, "boss visibly recedes into the course");
  assert.ok(moving.distance > clear.distance, "stage-clear backdrop keeps drifting instead of freezing");
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
  runtime.step(.05);
  const clear = runtime.getSnapshot();
  assert.equal(clear.status, "stage-clear");
  assert.ok(clear.enemies.some((enemy) => enemy.id === escortId), "surviving aircraft is not hard-cleared on result entry");

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
