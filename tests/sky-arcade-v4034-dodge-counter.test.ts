import test from "node:test";
import assert from "node:assert/strict";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.34 hostile fire telegraphs before it can damage the player", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4034 });
  const projectileId = runtime.spawnEnemyProjectileForTests(0, 0, 16, .8, 24);
  const before = runtime.getSnapshot();
  const threat = before.projectiles.find((projectile) => projectile.id === projectileId);
  assert.ok(threat);
  assert.ok((threat.warningSeconds ?? 0) >= .79);
  assert.equal(threat.warningTargetX, 0);
  assert.equal(before.playerHp, before.playerMaxHp);

  for (let frame = 0; frame < 30; frame += 1) runtime.step(1 / 60);
  const during = runtime.getSnapshot();
  assert.equal(during.playerHp, during.playerMaxHp);
  assert.ok((during.projectiles.find((projectile) => projectile.id === projectileId)?.warningSeconds ?? 0) > 0);
});

test("V40.34 a committed close dodge opens the counter window", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4035 });
  runtime.spawnEnemyProjectileForTests(0, 0, 16, .35, 24);

  for (let frame = 0; frame < 24; frame += 1) runtime.step(1 / 60);
  runtime.setMove(.72, 0);
  for (let frame = 0; frame < 18; frame += 1) runtime.step(1 / 60);
  runtime.setMove(0, 0);

  let snapshot = runtime.getSnapshot();
  for (let frame = 0; frame < 150 && snapshot.nearMisses === 0; frame += 1) {
    runtime.step(1 / 60);
    snapshot = runtime.getSnapshot();
  }
  assert.equal(snapshot.nearMisses, 1);
  assert.equal(snapshot.evasionCounterActive, true);
  assert.ok(snapshot.evasionCounterSeconds > 0);
  assert.equal(snapshot.evasionChain, 1);
  assert.equal(snapshot.evasionSerial, 1);
  assert.equal(snapshot.playerHp, snapshot.playerMaxHp);
});

test("V40.34 taking a hostile shot is a meaningful multi-hit failure threat", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4036 });
  runtime.spawnEnemyProjectileForTests(0, 0, 3, 0, 24);
  for (let frame = 0; frame < 8; frame += 1) runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.ok(snapshot.playerHp <= snapshot.playerMaxHp - 23.9);
  assert.equal(snapshot.evasionCounterActive, false);
});
