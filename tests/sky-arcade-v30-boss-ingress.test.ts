import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V30 boss ingress keeps surviving wave aircraft visible while they peel away", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "stage-practice",
    startStageId: "dawn-city",
    difficulty: "normal",
    seed: 3001,
  });
  const nearId = runtime.spawnEnemyForTests("fighter", -1.15, -0.1, 18);
  const farId = runtime.spawnEnemyForTests("bomber", 1.1, 0.22, 52);
  const before = runtime.getSnapshot();
  assert.ok(before.enemies.some((enemy) => enemy.id === nearId));
  assert.ok(before.enemies.some((enemy) => enemy.id === farId));

  runtime.setBossHpRatioForTests(0.9);
  const ingress = runtime.getSnapshot();
  assert.equal(ingress.bossActive, true);
  const leaving = ingress.enemies.filter((enemy) => enemy.id === nearId || enemy.id === farId);
  assert.equal(leaving.length, 2, "wave aircraft must not pop out on the boss-spawn frame");
  assert.ok(leaving.every((enemy) => !enemy.locked));

  const ingressDepth = new Map(leaving.map((enemy) => [enemy.id, enemy.depth]));
  for (let index = 0; index < 4; index += 1) runtime.step(0.05);
  const moving = runtime.getSnapshot().enemies.filter((enemy) => enemy.id === nearId || enemy.id === farId);
  assert.ok(moving.length >= 1, "at least one aircraft remains visible during the short handoff");
  assert.ok(moving.some((enemy) => Math.abs(enemy.depth - (ingressDepth.get(enemy.id) ?? enemy.depth)) > 0.5), "retreat uses visible flight motion");

  for (let index = 0; index < 60; index += 1) runtime.step(0.05);
  const settled = runtime.getSnapshot();
  assert.equal(settled.enemies.some((enemy) => enemy.id === nearId || enemy.id === farId), false, "retreaters eventually leave the arena");
  assert.equal(settled.bossActive, true, "boss remains after the handoff");
});

test("V30 retires boss-ingress threats instead of deleting the arrays instantly", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  const start = source.indexOf("private spawnBoss(): void");
  const end = source.indexOf("private spawnBossPhaseEscorts", start);
  const spawnBoss = source.slice(start, end);
  assert.doesNotMatch(spawnBoss, /enemy\.alive = false/);
  assert.doesNotMatch(spawnBoss, /this\.hazards = \[\]/);
  assert.doesNotMatch(spawnBoss, /this\.projectiles = this\.projectiles\.filter/);
  assert.match(spawnBoss, /enemy\.retreating = true/);
  assert.match(spawnBoss, /projectile\.retiring = true/);
  assert.match(spawnBoss, /hazard\.retiring = true/);
});
