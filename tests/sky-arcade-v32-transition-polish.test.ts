import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V32 defeated boss remains as a harmless moving wreck instead of disappearing on the kill frame", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode:"stage-practice", startStageId:"dawn-city", difficulty:"normal", seed:3201 });
  runtime.setBossHpRatioForTests(.02);
  const before = runtime.getSnapshot();
  const boss = before.enemies.find(enemy => enemy.boss);
  assert.ok(boss);
  runtime.damageEnemyForTests(boss.id, 100000, true);
  const killed = runtime.getSnapshot();
  assert.equal(killed.bossActive, false, "combat HUD releases a defeated boss immediately");
  const wreck = killed.enemies.find(enemy => enemy.id === boss.id);
  assert.ok(wreck, "boss hull remains visible on the destruction frame");
  assert.equal(wreck.hp, 0);
  const depth0 = wreck.depth;
  for (let i = 0; i < 8; i += 1) runtime.step(.05);
  const moving = runtime.getSnapshot().enemies.find(enemy => enemy.id === boss.id);
  assert.ok(moving, "wreck survives long enough for the explosion/exit shot to read");
  assert.ok(moving.depth > depth0 + 5, "wreck visibly clears away under motion");
  for (let i = 0; i < 28; i += 1) runtime.step(.05);
  assert.equal(runtime.getSnapshot().enemies.some(enemy => enemy.id === boss.id), false, "wreck eventually leaves the scene");
});

test("V32 boss phase mechanics arm after the phase-shift telegraph", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode:"stage-practice", startStageId:"dawn-city", difficulty:"normal", seed:3202 });
  runtime.setBossHpRatioForTests(.9);
  const base = runtime.getSnapshot();
  const serial = base.bossMechanicSerial;
  runtime.setBossHpRatioForTests(.6);
  const shifted = runtime.getSnapshot();
  assert.equal(shifted.bossPhase, 2);
  assert.equal(shifted.bossMechanicSerial, serial, "mechanic does not spawn on the HP threshold frame");
  for (let i = 0; i < 8; i += 1) runtime.step(.05);
  assert.equal(runtime.getSnapshot().bossMechanicSerial, serial, "telegraph remains readable for the first portion of the shift");
  for (let i = 0; i < 8; i += 1) runtime.step(.05);
  assert.ok(runtime.getSnapshot().bossMechanicSerial > serial, "mechanic arms after the telegraph window");
});

test("V32 source keeps failure and rejoin transitions moving and delays fresh pressure", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.match(source, /if \(this\.status === "continue" \|\| this\.status === "game-over"\) \{[\s\S]*updateStageClearPresentation\(delta\)/);
  assert.match(source, /retireStagePresentationActors\(\);[\s\S]*this\.status = this\.continuesRemaining/);
  assert.match(source, /CONTINUE · REJOINING FORMATION/);
  assert.match(source, /if \(this\.stageEntryTimer > 0\) return;/);
  assert.match(source, /PHASE \$\{nextPhase\} SHIFT/);
  assert.match(source, /68 \+ escort \* 7/);
});
