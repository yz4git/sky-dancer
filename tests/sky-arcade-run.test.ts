import test from "node:test";
import assert from "node:assert/strict";
import {
  SKY_DANCER_ARCADE_FINAL_STAGE,
  SKY_DANCER_ARCADE_FIRST_STAGE,
  SKY_DANCER_ARCADE_MAX_CONTINUES,
  SKY_DANCER_ARCADE_MAX_LOCKS,
  SKY_DANCER_ARCADE_RUN_DURATION_SECONDS,
  SKY_DANCER_ARCADE_STAGES,
  SKY_DANCER_ARCADE_STAGES_PER_RUN,
  enumerateSkyDancerArcadeRoutes,
  skyDancerArcadeRunMinutes,
} from "../src/sky/arcade/SkyDancerArcadeData";
import {
  SkyDancerArcadeRuntime,
  skyDancerArcadeRankForScore,
} from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { arcadeCoursePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";
import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";
import { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";
import { skyDancerArcadeV12CombatPlan } from "../src/sky/arcade/SkyDancerArcadeV12Director";
import { skyDancerArcadeV121EncounterGrammar } from "../src/sky/arcade/SkyDancerArcadeV121EncounterGrammar";
import { skyDancerArcadeV122EncounterContinuity } from "../src/sky/arcade/SkyDancerArcadeV122EncounterContinuity";
import {
  SKY_DANCER_ARCADE_MASTERY_REWARDS,
  SKY_DANCER_ARCADE_MAX_MEDALS,
  skyDancerArcadeMasteryUnlocks,
  skyDancerArcadeNextMasteryReward,
} from "../src/sky/arcade/SkyDancerArcadeProgress";

test("arcade mode authors eleven distinct compact product sections", () => {
  assert.equal(SKY_DANCER_ARCADE_STAGES.length, 11);
  assert.equal(new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.id)).size, 11);
  assert.equal(new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.biome)).size, 11);
  assert.equal(new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.boss)).size, 11);
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    assert.ok(stage.durationSeconds >= 28 && stage.durationSeconds <= 42, `${stage.id} duration`);
    assert.ok(stage.enemies.length >= 3, `${stage.id} enemy variety`);
    assert.ok(stage.formations.length >= 3, `${stage.id} formation variety`);
    assert.ok(stage.hazards.length >= 2, `${stage.id} hazard variety`);
  }
});

test("every authored route is a seven-section four-minute start-to-finale run", () => {
  const routes = enumerateSkyDancerArcadeRoutes();
  assert.equal(routes.length, 12);
  for (const route of routes) {
    assert.equal(route.length, SKY_DANCER_ARCADE_STAGES_PER_RUN);
    assert.equal(route[0], SKY_DANCER_ARCADE_FIRST_STAGE);
    assert.equal(route.at(-1), SKY_DANCER_ARCADE_FINAL_STAGE);
    assert.equal(skyDancerArcadeRunMinutes(route), SKY_DANCER_ARCADE_RUN_DURATION_SECONDS / 60);
  }
});


test("route graph references only authored stages and has one finale", () => {
  const ids = new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.id));
  const finales = SKY_DANCER_ARCADE_STAGES.filter((stage) => stage.next.length === 0);
  assert.deepEqual(finales.map((stage) => stage.id), [SKY_DANCER_ARCADE_FINAL_STAGE]);
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    for (const next of stage.next) assert.ok(ids.has(next), `${stage.id} -> ${next}`);
  }
});

test("runtime follows a selected branch through the complete arcade run", () => {
  const route = enumerateSkyDancerArcadeRoutes()[7];
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 17 });
  for (let index = 0; index < route.length; index += 1) {
    assert.equal(runtime.getSnapshot().stage.id, route[index]);
    runtime.completeCurrentStageForTests(route[index + 1]);
    assert.equal(runtime.getSnapshot().status, "stage-clear");
    runtime.advanceResultForTests();
  }
  const result = runtime.getSnapshot();
  assert.equal(result.status, "run-clear");
  assert.equal(result.stagesCleared, SKY_DANCER_ARCADE_STAGES_PER_RUN);
  assert.deepEqual(result.route, route);
  assert.equal(result.continuesRemaining, SKY_DANCER_ARCADE_MAX_CONTINUES);
  assert.equal(result.runTimeSeconds, SKY_DANCER_ARCADE_RUN_DURATION_SECONDS);
});

test("practice mode clears one chosen stage without entering the route", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "stage-practice",
    difficulty: "hard",
    startStageId: "ice-cavern",
    seed: 29,
  });
  assert.equal(runtime.getSnapshot().stage.id, "ice-cavern");
  runtime.completeCurrentStageForTests();
  runtime.advanceResultForTests();
  assert.equal(runtime.getSnapshot().status, "practice-clear");
  assert.deepEqual(runtime.getSnapshot().route, ["ice-cavern"]);
});

test("an early boss defeat never shortens its authored run section", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 31 });
  const duration = runtime.getSnapshot().stageDurationSeconds;
  runtime.defeatBossEarlyForTests(duration - 2);
  for (let frame = 0; frame < 119; frame += 1) runtime.step(1 / 60);
  assert.equal(runtime.getSnapshot().status, "running");
  runtime.step(1 / 60);
  if (runtime.getSnapshot().status === "running") runtime.step(1 / 60);
  assert.equal(runtime.getSnapshot().status, "stage-clear");
  assert.ok(runtime.getSnapshot().stageTimeSeconds >= duration);
});

test("combat contract includes eight locks, continues and score ranks", () => {
  assert.equal(SKY_DANCER_ARCADE_MAX_LOCKS, 8);
  assert.equal(SKY_DANCER_ARCADE_MAX_CONTINUES, 2);
  assert.equal(skyDancerArcadeRankForScore(5_000, 1, 0, 0), "D");
  assert.equal(skyDancerArcadeRankForScore(70_000, 1, 0, 0), "SS");
  assert.equal(skyDancerArcadeRankForScore(70_000, 1, 0, 2), "A");
});

test("holding lock acquires targets and release launches a bounded salvo", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 42 });
  // Keep this combat-control contract deterministic: Encounter Grammar is allowed to change
  // automatic wave timing and attack lanes, so the lock test owns its target geometry.
  runtime.spawnEnemyForTests("fighter", -0.16, 0.02, 46);
  runtime.spawnEnemyForTests("fighter", 0, -0.03, 49);
  runtime.spawnEnemyForTests("fighter", 0.16, 0.04, 52);
  runtime.setLock(true);
  for (let frame = 0; frame < 60; frame += 1) runtime.step(1 / 60);
  const acquired = runtime.getSnapshot();
  assert.ok(acquired.lockedCount > 1);
  assert.ok(acquired.lockedCount <= SKY_DANCER_ARCADE_MAX_LOCKS);
  runtime.setLock(false);
  const launched = runtime.getSnapshot();
  assert.equal(launched.missileSerial, 1);
  assert.equal(launched.lockedCount, 0);
  assert.ok(launched.projectiles.filter((projectile) => projectile.owner === "player-missile").length > 1);
  assert.ok(launched.projectiles.filter((projectile) => projectile.owner === "player-missile").length <= SKY_DANCER_ARCADE_MAX_LOCKS);
});

test("forced input release clears touch state without launching a lock salvo", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 51 });
  // Acquire a real lock first; moving at the arena edge is intentionally allowed to leave the lock cone.
  runtime.setLock(true);
  for (let frame = 0; frame < 300; frame += 1) runtime.step(1 / 60);
  assert.ok(runtime.getSnapshot().lockedCount > 0);
  // Then exercise the actual touch-release contract with every continuous input active.
  runtime.setMove(0.8, -1);
  runtime.setFire(true);
  runtime.setTurbo(true);
  for (let frame = 0; frame < 8; frame += 1) runtime.step(1 / 60);
  runtime.releaseInputs();
  const released = runtime.getSnapshot();
  assert.equal(released.fireActive, false);
  assert.equal(released.lockActive, false);
  assert.equal(released.turboActive, false);
  assert.equal(released.missileSerial, 0);
});

test("flight steering reaches evasive positions quickly", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 61 });
  runtime.setMove(1, 1);
  for (let frame = 0; frame < 30; frame += 1) runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.ok(snapshot.playerX > 0.6, `horizontal response ${snapshot.playerX}`);
  assert.ok(snapshot.playerY > 0.55, `vertical response ${snapshot.playerY}`);
});

test("wide-field steering traverses roughly two legacy screens and reverses quickly", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 611 });
  runtime.setMove(1, 1);
  for (let frame = 0; frame < 45; frame += 1) runtime.step(1 / 60);
  let snapshot = runtime.getSnapshot();
  assert.ok(snapshot.playerX > 1.75, `right reach ${snapshot.playerX}`);
  assert.ok(snapshot.playerY > 1.45, `upper reach ${snapshot.playerY}`);
  for (let frame = 0; frame < 30; frame += 1) runtime.step(1 / 60);
  snapshot = runtime.getSnapshot();
  assert.ok(snapshot.playerX <= 2.201 && snapshot.playerY <= 1.751);
  runtime.setMove(-1, -1);
  for (let frame = 0; frame < 95; frame += 1) runtime.step(1 / 60);
  snapshot = runtime.getSnapshot();
  assert.ok(snapshot.playerX < -1.65, `left reverse ${snapshot.playerX}`);
  assert.ok(snapshot.playerY < -1.35, `lower reverse ${snapshot.playerY}`);
});


test("normal difficulty caps simultaneous enemy missile pressure", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 31415 });
  let maxThreats = 0;
  for (let frame = 0; frame < 1500; frame += 1) {
    runtime.step(1 / 60);
    const snapshot = runtime.getSnapshot();
    maxThreats = Math.max(maxThreats, snapshot.projectiles.filter((projectile) => projectile.owner === "enemy").length);
    if (snapshot.status !== "running") break;
  }
  assert.ok(maxThreats <= 5, `normal threat budget ${maxThreats}`);
});


test("climax targets survive a real attack run", () => {
  const first = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 62 });
  for (let frame = 0; frame < 1200 && !first.getSnapshot().bossActive; frame += 1) first.step(1 / 60);
  assert.ok(first.getSnapshot().bossMaxHp >= 550, `opening boss HP ${first.getSnapshot().bossMaxHp}`);

  const final = new SkyDancerArcadeRuntime({
    mode: "stage-practice",
    difficulty: "normal",
    startStageId: SKY_DANCER_ARCADE_FINAL_STAGE,
    seed: 63,
  });
  for (let frame = 0; frame < 1200 && !final.getSnapshot().bossActive; frame += 1) final.step(1 / 60);
  assert.ok(final.getSnapshot().bossMaxHp >= 1200, `final boss HP ${final.getSnapshot().bossMaxHp}`);
});


test("signature stages have measurably distinct course geometry", () => {
  const sample = (id: "red-canyon" | "ice-cavern" | "volcano-core" | "orbital-ascent") => {
    const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;
    const length = stage.durationSeconds * stage.courseSpeed;
    return Array.from({ length: 121 }, (_, index) => arcadeCoursePose(stage, length * index / 120));
  };
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const signChanges = (values: number[], epsilon = .03) => {
    const signs = values.filter((value) => Math.abs(value) >= epsilon).map((value) => Math.sign(value));
    return signs.reduce((count, sign, index) => index > 0 && sign !== signs[index - 1] ? count + 1 : count, 0);
  };

  const canyon = sample("red-canyon");
  assert.ok(span(canyon.map((pose) => pose.x)) > 90, "canyon switchback width");
  assert.ok(signChanges(canyon.map((pose) => pose.yaw)) >= 5, "canyon switchback reversals");

  const ice = sample("ice-cavern");
  assert.ok(span(ice.map((pose) => pose.y)) > 42, "ice tunnel vertical span");
  assert.ok(signChanges(ice.map((pose) => pose.yaw)) >= 6, "ice slalom reversals");

  const volcano = sample("volcano-core");
  assert.ok(span(volcano.map((pose) => pose.y)) > 25, "volcano crater dive span");
  assert.ok(Math.min(...volcano.map((pose) => pose.y)) < -25, "volcano dives toward the core");

  const orbit = sample("orbital-ascent");
  assert.ok(orbit.at(-1)!.y - orbit[0].y > 40, "orbit gains major altitude");
  assert.ok(span(orbit.map((pose) => pose.x)) > 60, "orbit corkscrew opens laterally");
});


test("structural arch stays at one absolute course point while turbo advances the world", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1051 });
  const debugRuntime = runtime as unknown as { spawnHazardPattern(kind: "arch"): void };
  debugRuntime.spawnHazardPattern("arch");
  const before = runtime.getSnapshot();
  const arch = before.hazards.find((hazard) => hazard.kind === "arch");
  assert.ok(arch, "forced city arch exists");
  const anchorBefore = before.distance + arch.depth;
  runtime.setTurbo(true);
  for (let frame = 0; frame < 18; frame += 1) runtime.step(1 / 60);
  const after = runtime.getSnapshot();
  const movedArch = after.hazards.find((hazard) => hazard.id === arch.id);
  assert.ok(movedArch, "arch remains ahead after moving sample");
  assert.ok(after.distance > before.distance + 20, "turbo advances course distance during sample");
  assert.ok(movedArch.depth < arch.depth - 20, "arch approaches because the aircraft advances");
  const anchorAfter = after.distance + movedArch.depth;
  assert.ok(Math.abs(anchorAfter - anchorBefore) < 1e-9, `world anchor drifted: ${anchorBefore} -> ${anchorAfter}`);
});

test("dynamic debris keeps independent motion instead of masquerading as scenery", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "cloud-fleet", seed: 0x1052 });
  const debugRuntime = runtime as unknown as { spawnHazardPattern(kind: "debris"): void };
  debugRuntime.spawnHazardPattern("debris");
  const before = runtime.getSnapshot();
  const debris = before.hazards.find((hazard) => hazard.kind === "debris");
  assert.ok(debris, "forced debris exists");
  const anchorBefore = before.distance + debris.depth;
  for (let frame = 0; frame < 18; frame += 1) runtime.step(1 / 60);
  const after = runtime.getSnapshot();
  const moved = after.hazards.find((hazard) => hazard.id === debris.id);
  assert.ok(moved, "debris remains during moving sample");
  const anchorAfter = after.distance + moved.depth;
  assert.ok(Math.abs(anchorAfter - anchorBefore) > 1, "dynamic debris retains motion independent from course scenery");
});


test("exposes three persistent mastery goals for every practice stage", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const goals = skyDancerArcadeV11StageMedalGoals(stage.id);
    assert.equal(goals.length, 3, stage.id);
    assert.deepEqual(goals.map((goal) => goal.id), ["score", "signature", "no-damage"]);
    assert.equal(new Set(goals.map((goal) => goal.label)).size, 3, stage.id);
    assert.ok(goals.every((goal) => goal.description.length > 0), stage.id);
  }
});


test("Gun Focus fires a visible twin-cannon burst instead of a scalar-only buff", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1171 });
  runtime.setFire(true);
  runtime.step(1 / 60);
  const shots = runtime.getSnapshot().projectiles.filter((projectile) => projectile.owner === "player-gun");
  assert.equal(runtime.getSnapshot().shotSerial, 1);
  assert.equal(shots.length, 2);
  assert.ok(shots[0].x < shots[1].x, "twin cannons originate from separate left/right lanes");
});

test("Missile Focus widens acquisition and releases a twin ripple per lock", () => {
  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1172 });
  const missile = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "missile-focus", seed: 0x1172 });
  const standardDebug = standard as unknown as { spawnEnemy(kind: "fighter", x: number, y: number, depth: number): void };
  const missileDebug = missile as unknown as { spawnEnemy(kind: "fighter", x: number, y: number, depth: number): void };
  standardDebug.spawnEnemy("fighter", 1.68, 0, 30);
  missileDebug.spawnEnemy("fighter", 1.68, 0, 30);
  standard.setLock(true);
  missile.setLock(true);
  standard.step(1 / 60);
  missile.step(1 / 60);
  assert.equal(standard.getSnapshot().lockedCount, 0, "standard cone leaves the edge target outside acquisition");
  assert.equal(missile.getSnapshot().lockedCount, 1, "missile focus acquires the wider edge target");
  missile.setLock(false);
  const ripple = missile.getSnapshot().projectiles.filter((projectile) => projectile.owner === "player-missile");
  assert.equal(ripple.length, 2, "one lock becomes a two-missile ripple");
  assert.equal(ripple[0].targetEnemyId, ripple[1].targetEnemyId);
});

test("Standard Fusion Link changes weapon cadence only while Turbo is engaged", () => {
  const normal = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1173 });
  const linked = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1173 });
  normal.setFire(true);
  linked.setFire(true);
  linked.setTurbo(true);
  for (let frame = 0; frame < 60; frame += 1) {
    normal.step(1 / 60);
    linked.step(1 / 60);
  }
  assert.ok(linked.getSnapshot().shotSerial > normal.getSnapshot().shotSerial, `${linked.getSnapshot().shotSerial} should exceed ${normal.getSnapshot().shotSerial}`);
});


test("Gun Focus converts twin-cannon hits into armor shred and tactical rewards", () => {
  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1181 });
  const gun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1181 });
  const standardId = standard.spawnEnemyForTests("bomber", 0, 0, 30);
  const gunId = gun.spawnEnemyForTests("bomber", 0, 0, 30);
  standard.damageEnemyForTests(standardId, 18, false);
  gun.damageEnemyForTests(gunId, 18, false);
  const standardEnemy = standard.getSnapshot().enemies.find((enemy) => enemy.id === standardId);
  const gunEnemy = gun.getSnapshot().enemies.find((enemy) => enemy.id === gunId);
  assert.ok(standardEnemy && gunEnemy);
  assert.ok(gunEnemy.armor < standardEnemy.armor, `${gunEnemy.armor} < ${standardEnemy.armor}`);
  assert.ok(gunEnemy.stagger > standardEnemy.stagger, `${gunEnemy.stagger} > ${standardEnemy.stagger}`);
  assert.equal(gun.getSnapshot().impacts.at(-1)?.reaction, "twin-cannon");
  gun.damageEnemyForTests(gunId, 999, false);
  assert.ok(gun.getSnapshot().loadoutBonusScore > 0);
  assert.ok(gun.getSnapshot().loadoutReactionSerial > 0);
});

test("Missile Focus creates a stronger ripple shock reaction than a standard missile", () => {
  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1182 });
  const missile = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "missile-focus", seed: 0x1182 });
  const standardId = standard.spawnEnemyForTests("bomber", 0, 0, 30);
  const missileId = missile.spawnEnemyForTests("bomber", 0, 0, 30);
  standard.damageEnemyForTests(standardId, 16, true);
  missile.damageEnemyForTests(missileId, 16, true);
  const standardEnemy = standard.getSnapshot().enemies.find((enemy) => enemy.id === standardId);
  const rippleEnemy = missile.getSnapshot().enemies.find((enemy) => enemy.id === missileId);
  assert.ok(standardEnemy && rippleEnemy);
  assert.ok(rippleEnemy.armor < standardEnemy.armor, `${rippleEnemy.armor} < ${standardEnemy.armor}`);
  assert.ok(rippleEnemy.stagger > standardEnemy.stagger, `${rippleEnemy.stagger} > ${standardEnemy.stagger}`);
  assert.equal(missile.getSnapshot().impacts.at(-1)?.reaction, "ripple-shock");
  missile.damageEnemyForTests(missileId, 999, true);
  assert.ok(missile.getSnapshot().loadoutBonusScore > 0);
});

test("Standard only earns Fusion tactical finish rewards while Turbo Link is active", () => {
  const idle = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1183 });
  const linked = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1183 });
  const idleId = idle.spawnEnemyForTests("fighter", 0, 0, 30);
  const linkedId = linked.spawnEnemyForTests("fighter", 0, 0, 30);
  linked.setTurbo(true);
  idle.damageEnemyForTests(idleId, 999, false);
  linked.damageEnemyForTests(linkedId, 999, false);
  assert.equal(idle.getSnapshot().impacts.at(-1)?.reaction, "none");
  assert.equal(idle.getSnapshot().loadoutBonusScore, 0);
  assert.equal(linked.getSnapshot().impacts.at(-1)?.reaction, "fusion-link");
  assert.ok(linked.getSnapshot().loadoutBonusScore > 0);
  assert.match(linked.getSnapshot().loadoutReactionLabel ?? "", /FUSION/);
});


test("Gun Focus provokes armor brace that reduces direct cannon penetration but can be broken", () => {
  const braced = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1191 });
  const open = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1191 });
  const bracedId = braced.spawnEnemyForTests("bomber", 0, 0, 30);
  const openId = open.spawnEnemyForTests("bomber", 0, 0, 30);
  braced.forceEnemyCounterplayForTests(bracedId);
  assert.equal(braced.getSnapshot().enemies.find((enemy) => enemy.id === bracedId)?.counterplay, "armor-brace");
  braced.damageEnemyForTests(bracedId, 18, false);
  open.damageEnemyForTests(openId, 18, false);
  const bracedEnemy = braced.getSnapshot().enemies.find((enemy) => enemy.id === bracedId);
  const openEnemy = open.getSnapshot().enemies.find((enemy) => enemy.id === openId);
  assert.ok(bracedEnemy && openEnemy);
  assert.ok(bracedEnemy.armor > openEnemy.armor, `${bracedEnemy.armor} > ${openEnemy.armor}`);
  const firstBreaks = braced.getSnapshot().counterplayBreaks;
  const firstBreakLabel = braced.getSnapshot().loadoutReactionLabel;
  braced.damageEnemyForTests(bracedId, 999, false);
  assert.ok(braced.getSnapshot().counterplayBreaks >= 1);
  if (firstBreaks > 0) assert.match(firstBreakLabel ?? "", /BRACE BREAK/);
});

test("Missile Focus provokes evasive roll and rewards a tracked missile punish", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "missile-focus", seed: 0x1192 });
  const id = runtime.spawnEnemyForTests("interceptor", .2, .1, 30);
  runtime.forceEnemyCounterplayForTests(id);
  const before = runtime.getSnapshot().enemies.find((enemy) => enemy.id === id);
  assert.equal(before?.counterplay, "evasive-roll");
  runtime.step(.05);
  const after = runtime.getSnapshot().enemies.find((enemy) => enemy.id === id);
  assert.ok(before && after);
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > .01, "evasive roll changes the target lane");
  runtime.damageEnemyForTests(id, 999, true);
  assert.ok(runtime.getSnapshot().counterplayBreaks >= 1);
  assert.match(runtime.getSnapshot().loadoutReactionLabel ?? "", /EVADE PUNISH/);
});

test("Standard Turbo Link can be jammed until the counter aircraft is broken", () => {
  const jammed = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1193 });
  const clear = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1193 });
  const id = jammed.spawnEnemyForTests("missile-boat", 0, 0, 30);
  jammed.forceEnemyCounterplayForTests(id);
  jammed.setTurbo(true);
  clear.setTurbo(true);
  for (let frame = 0; frame < 24; frame += 1) { jammed.step(1 / 60); clear.step(1 / 60); }
  assert.equal(jammed.getSnapshot().turboJammed, true);
  assert.ok(jammed.getSnapshot().turbo < clear.getSnapshot().turbo, `${jammed.getSnapshot().turbo} < ${clear.getSnapshot().turbo}`);
  jammed.damageEnemyForTests(id, 999, false);
  assert.ok(jammed.getSnapshot().counterplayBreaks >= 1);
  assert.match(jammed.getSnapshot().loadoutReactionLabel ?? "", /JAMMER BREAK/);
});


test("director reacts to actual combat behavior instead of only equipped loadout", () => {
  const common = { recentDamage: 0, hpRatio: 1, chain: 5, beatIntensity: .82, hard: false };
  assert.equal(skyDancerArcadeV12CombatPlan({ ...common, gunHeat: 2.4, missileHeat: .2, turboHeat: .2 }).mode, "armor-screen");
  assert.equal(skyDancerArcadeV12CombatPlan({ ...common, gunHeat: .2, missileHeat: 2.4, turboHeat: .2 }).mode, "hunter-sweep");
  assert.equal(skyDancerArcadeV12CombatPlan({ ...common, gunHeat: .2, missileHeat: .2, turboHeat: 2.4 }).mode, "jammer-net");
  const relief = skyDancerArcadeV12CombatPlan({ ...common, gunHeat: 2.4, missileHeat: .2, turboHeat: .2, recentDamage: 1.3, hpRatio: .28 });
  assert.equal(relief.mode, "relief-window");
  assert.ok(relief.waveCountDelta < 0);
  assert.ok(relief.cadenceScale > 1);
});

test("runtime turns sustained gun pressure into an armor-screen encounter", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1201 });
  runtime.setFire(true);
  for (let frame = 0; frame < 155; frame += 1) runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.ok(snapshot.combatDirectorWaveSerial >= 1);
  assert.equal(snapshot.combatDirectorPlayerStyle, "gun");
  assert.equal(snapshot.combatDirectorMode, "armor-screen");
  assert.match(snapshot.combatDirectorIntent, /BREAK THE LINE/);
});

test("relief window reduces encounter density and delays enemy counters after heavy damage", () => {
  const pressure = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1202 });
  const relief = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1202 });
  pressure.setV12DirectorSignalsForTests(2.2, .1, .1, 0, 1);
  relief.setV12DirectorSignalsForTests(2.2, .1, .1, 1.4, .25);
  pressure.spawnV12EncounterForTests();
  relief.spawnV12EncounterForTests();
  const aggressiveEnemies = pressure.getSnapshot().enemies;
  const reliefEnemies = relief.getSnapshot().enemies;
  assert.equal(relief.getSnapshot().combatDirectorMode, "relief-window");
  assert.ok(reliefEnemies.length < aggressiveEnemies.length, `${reliefEnemies.length} < ${aggressiveEnemies.length}`);
  assert.ok(reliefEnemies.every((enemy) => enemy.counterplay === "none"));
});


test("Dawn City encounter grammar authors a real three-step combat sentence", () => {
  const first = skyDancerArcadeV121EncounterGrammar("dawn-city", "adaptive-mix", 0, "city-entry", .72, false);
  const second = skyDancerArcadeV121EncounterGrammar("dawn-city", "adaptive-mix", 1, "city-entry", .72, false);
  assert.equal(first.phases.length, 3);
  assert.ok(first.phases[0].delay < first.phases[1].delay && first.phases[1].delay < first.phases[2].delay);
  assert.ok(first.phases[1].delay >= .75, "second beat must be visually separable");
  assert.ok(first.phases[2].delay - first.phases[1].delay >= .7, "final beat must not collapse into the crosscut");
  assert.notEqual(first.signature, second.signature, "successive encounters alternate authored grammar variants");
  assert.notEqual(first.label, second.label, "Dawn City alternates skyline and gantry attack sentences");
  assert.notEqual(first.phases[0].maneuver, first.phases[1].maneuver, "a grammar changes maneuver between phases");
});

test("runtime advances encounter phases over time instead of spawning one undifferentiated wave", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1211 });
  runtime.setV12DirectorSignalsForTests(.2, 2.4, .2, 0, 1);
  runtime.spawnV12EncounterForTests();
  const first = runtime.getSnapshot();
  assert.equal(first.encounterGrammarPhaseIndex, 1);
  assert.equal(first.encounterGrammarPhaseCount, 3);
  assert.ok(first.enemies.length > 0);
  const firstPhase = first.encounterGrammarPhaseLabel;
  const firstManeuvers = new Set(first.enemies.map((enemy) => enemy.maneuver));
  assert.equal(runtime.advanceV121EncounterForTests(), true);
  const second = runtime.getSnapshot();
  assert.equal(second.encounterGrammarPhaseIndex, 2);
  assert.notEqual(second.encounterGrammarPhaseLabel, firstPhase);
  assert.ok(second.enemies.length > first.enemies.length, `${second.enemies.length} > ${first.enemies.length}`);
  assert.ok(second.enemies.some((enemy) => !firstManeuvers.has(enemy.maneuver)), "second phase introduces a different attack maneuver");
});

test("relief grammar is intentionally shorter and lighter than pressure grammar", () => {
  const pressure = skyDancerArcadeV121EncounterGrammar("dawn-city", "armor-screen", 0, "city-entry", .8, false);
  const relief = skyDancerArcadeV121EncounterGrammar("dawn-city", "relief-window", 0, "city-entry", .8, false);
  const pressureMass = pressure.phases.reduce((sum, phase) => sum + phase.countScale + phase.countDelta * .2, 0);
  const reliefMass = relief.phases.reduce((sum, phase) => sum + phase.countScale + phase.countDelta * .2, 0);
  assert.equal(relief.phases.length, 2);
  assert.ok(reliefMass < pressureMass, `${reliefMass} < ${pressureMass}`);
  assert.ok(relief.cadenceScale > pressure.cadenceScale);
});


test("continuity blocks the player break lane and fills the empty side", () => {
  const rightBreak = skyDancerArcadeV122EncounterContinuity({ playerX: .3, playerVX: 1.2, survivorXs: [-.4, .2], phaseIndex: 1 });
  assert.equal(rightBreak.breakSign, 1);
  assert.equal(rightBreak.entrySign, 1);
  assert.ok(rightBreak.lateralBias > 0);
  assert.match(rightBreak.label, /BLOCK R/);

  const fillLeft = skyDancerArcadeV122EncounterContinuity({ playerX: 0, playerVX: 0, survivorXs: [.8, 1.2], phaseIndex: 1 });
  assert.equal(fillLeft.breakSign, 0);
  assert.equal(fillLeft.entrySign, -1);
  assert.ok(fillLeft.lateralBias < 0);
  assert.match(fillLeft.label, /FILL L/);
});

test("Encounter Continuity carries survivor IDs and steers each reinforcement phase", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", difficulty: "normal", startStageId: "dawn-city", seed: 122 });
  runtime.setV12DirectorSignalsForTests(.1, 1.8, .1);
  runtime.setV122PlayerFlowForTests(1.1, 1.35);
  runtime.spawnV12EncounterForTests();
  const first = runtime.getSnapshot();
  assert.equal(first.combatDirectorMode, "hunter-sweep");
  const firstIds = new Set(first.enemies.map((enemy) => enemy.id));
  assert.ok(firstIds.size > 0);

  assert.equal(runtime.advanceV121EncounterForTests(), true);
  const second = runtime.getSnapshot();
  assert.equal(second.encounterGrammarPhaseIndex, 2);
  assert.equal(second.encounterContinuityBreakSign, 1);
  assert.equal(second.encounterContinuityEntrySign, 1);
  assert.ok(second.encounterContinuitySurvivors >= firstIds.size);
  assert.ok([...firstIds].every((id) => second.enemies.some((enemy) => enemy.id === id)), "phase-one enemies must survive into phase two");
  const secondReinforcements = second.enemies.filter((enemy) => !firstIds.has(enemy.id));
  assert.ok(secondReinforcements.length > 0);
  assert.ok(secondReinforcements.reduce((sum, enemy) => sum + enemy.x, 0) / secondReinforcements.length > .05, "right break should bias the cut to the right lane");

  const secondIds = new Set(second.enemies.map((enemy) => enemy.id));
  runtime.setV122PlayerFlowForTests(-1.1, -1.35);
  assert.equal(runtime.advanceV121EncounterForTests(), true);
  const third = runtime.getSnapshot();
  assert.equal(third.encounterGrammarPhaseIndex, 3);
  assert.equal(third.encounterContinuityBreakSign, -1);
  assert.equal(third.encounterContinuityEntrySign, -1);
  assert.ok([...secondIds].every((id) => third.enemies.some((enemy) => enemy.id === id)), "phase-two enemies must carry into the finishing phase");
  const thirdReinforcements = third.enemies.filter((enemy) => !secondIds.has(enemy.id));
  assert.ok(thirdReinforcements.length > 0);
  assert.ok(thirdReinforcements.reduce((sum, enemy) => sum + enemy.x, 0) / thirdReinforcements.length < -.05, "left break should pull the finishing cut into the left lane");
});


test("dogfight choreography includes close-bank, overtake, parallel and rear-to-front passes", () => {
  assert.ok(Math.min(...SKY_DANCER_ARCADE_STAGES.map((stage) => stage.courseSpeed)) >= 80);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  const seen = new Set<string>();
  const rearIds = new Set<number>();
  let rearToFront = false;
  let closeSamples = 0;
  for (let frame = 0; frame < 780; frame += 1) {
    const snapshot = runtime.getSnapshot();
    for (const enemy of snapshot.enemies) {
      if (enemy.boss) continue;
      seen.add(enemy.maneuver);
      if (enemy.depth > 4 && enemy.depth < 24) closeSamples += 1;
      if (enemy.maneuver === "overtake" && enemy.depth < 0) rearIds.add(enemy.id);
      if (rearIds.has(enemy.id) && enemy.depth > 12) rearToFront = true;
    }
    runtime.step(1 / 60);
    if (runtime.getSnapshot().status !== "running") break;
  }
  assert.ok(seen.has("close-bank"));
  assert.ok(seen.has("overtake"));
  assert.ok(seen.has("parallel"));
  assert.ok(rearToFront);
  assert.ok(closeSamples >= 120);
});

test("close cross-pass choreography preserves a readable separation", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  let minCrossPassSeparation = Number.POSITIVE_INFINITY;
  for (let frame = 0; frame < 1500; frame += 1) {
    const snapshot = runtime.getSnapshot();
    for (const enemy of snapshot.enemies) {
      if (enemy.boss || enemy.maneuver !== "cross-pass" || enemy.depth >= 18) continue;
      minCrossPassSeparation = Math.min(
        minCrossPassSeparation,
        Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY),
      );
    }
    runtime.step(1 / 60);
    if (runtime.getSnapshot().status !== "running") break;
  }
  assert.ok(Number.isFinite(minCrossPassSeparation));
  assert.ok(minCrossPassSeparation >= 0.58, "cross-pass separation " + minCrossPassSeparation);
});

test("mastery rewards form a deterministic 33-medal unlock track", () => {
  assert.equal(SKY_DANCER_ARCADE_MAX_MEDALS, 33);
  assert.deepEqual(SKY_DANCER_ARCADE_MASTERY_REWARDS.map((reward) => reward.threshold), [6, 12, 18, 24, 30, 33]);
  assert.equal(skyDancerArcadeNextMasteryReward(0)?.label, "SUNSET PAINT");
  assert.equal(skyDancerArcadeNextMasteryReward(6)?.label, "MISSILE FOCUS");
  assert.equal(skyDancerArcadeNextMasteryReward(33), null);
  assert.deepEqual(skyDancerArcadeMasteryUnlocks(5), { paintSchemes: [], loadouts: [] });
  assert.deepEqual(skyDancerArcadeMasteryUnlocks(30), {
    paintSchemes: ["sunset", "storm", "prism"],
    loadouts: ["missile-focus", "gun-focus"],
  });
});

test("hangar loadout and paint selections change the actual sortie profile", () => {
  const standard = new SkyDancerArcadeRuntime({
    difficulty: "normal",
    mode: "stage-practice",
    startStageId: "dawn-city",
    loadout: "standard",
    paintScheme: "default",
    seed: 116,
  });
  const gun = new SkyDancerArcadeRuntime({
    difficulty: "normal",
    mode: "stage-practice",
    startStageId: "dawn-city",
    loadout: "gun-focus",
    paintScheme: "prism",
    seed: 116,
  });
  standard.setFire(true);
  gun.setFire(true);
  for (let frame = 0; frame < 60; frame += 1) {
    standard.step(1 / 60);
    gun.step(1 / 60);
  }
  assert.equal(gun.getSnapshot().paintScheme, "prism");
  assert.equal(gun.getSnapshot().loadout, "gun-focus");
  assert.ok(gun.getSnapshot().shotSerial > standard.getSnapshot().shotSerial);
});
