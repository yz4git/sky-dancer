import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.14 boss reveal keeps the opening beat free of hostile fire", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "stage-practice",
    startStageId: "dawn-city",
    difficulty: "normal",
    seed: 401401,
  });
  runtime.setBossHpRatioForTests(.9);
  assert.equal(runtime.getSnapshot().bossActive, true);
  for (let frame = 0; frame < 18; frame += 1) runtime.step(.05);
  const reveal = runtime.getSnapshot();
  assert.equal(reveal.projectiles.some((projectile) => projectile.owner === "enemy"), false, "reveal beat should not already contain a boss volley");
  assert.equal(reveal.bossWeakpointOpen, false, "weakpoint stays closed while the reveal owns the frame");
});

test("V40.14 real boss kill near the course end holds the wreck shot before SECTION CLEAR", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "arcade-run",
    difficulty: "normal",
    seed: 401402,
  });
  const duration = runtime.getSnapshot().stageDurationSeconds;
  runtime.triggerV11TimelineForTests(.999);
  runtime.setBossHpRatioForTests(.02);
  const boss = runtime.getSnapshot().enemies.find((enemy) => enemy.boss);
  assert.ok(boss);
  runtime.spawnEnemyForTests("fighter", 1.15, .18, 24);
  runtime.damageEnemyForTests(boss.id, 100000, true);

  const killed = runtime.getSnapshot();
  assert.equal(killed.status, "running");
  assert.equal(killed.bossActive, false, "combat HUD releases the boss while its wreck remains visible");
  assert.ok(killed.enemies.some((enemy) => enemy.id === boss.id), "destroyed boss silhouette survives the kill frame");
  assert.equal(killed.stageEventLabel, "CLIMAX BREAK");

  for (let frame = 0; frame < 8; frame += 1) runtime.step(.05);
  const held = runtime.getSnapshot();
  assert.ok(held.stageTimeSeconds >= duration, "course has already crossed its authored end");
  assert.equal(held.status, "running", "SECTION CLEAR waits for the destruction beat");
  assert.equal(held.projectiles.some((projectile) => projectile.owner === "enemy"), false, "outro pressure is harmless");

  for (let frame = 0; frame < 18 && runtime.getSnapshot().status === "running"; frame += 1) runtime.step(.05);
  assert.equal(runtime.getSnapshot().status, "stage-clear", "result card arrives after the short wreck hold");
});

test("V40.14 source gates opening pressure and result transition with dedicated climax timers", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.match(source, /private bossIngressTimer = 0/);
  assert.match(source, /private bossOutroTimer = 0/);
  assert.match(source, /this\.bossIngressTimer > 0[\s\S]*enemy\.fireCooldown = Math\.max/);
  assert.match(source, /if \(this\.bossOutroTimer <= 0\) this\.completeStage\(\)/);
  assert.doesNotMatch(source, /this\.messageTimer = 2\.4;\s*if \(this\.stageTime >= this\.stage\.durationSeconds\) this\.completeStage\(\)/);
});
