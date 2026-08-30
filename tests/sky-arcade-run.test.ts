import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("arcade mode authors eleven distinct compact product sections", () => {
  assert.equal(SKY_DANCER_ARCADE_STAGES.length, 11);
  assert.equal(new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.id)).size, 11);
  assert.equal(new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.biome)).size, 11);
  assert.equal(new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => stage.boss)).size, 11);
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    assert.ok(stage.durationSeconds >= 14 && stage.durationSeconds <= 21, `${stage.id} duration`);
    assert.ok(stage.enemies.length >= 3, `${stage.id} enemy variety`);
    assert.ok(stage.formations.length >= 3, `${stage.id} formation variety`);
    assert.ok(stage.hazards.length >= 2, `${stage.id} hazard variety`);
  }
});

test("every authored route is a seven-section two-minute start-to-finale run", () => {
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
  runtime.setLock(true);
  for (let frame = 0; frame < 270; frame += 1) runtime.step(1 / 60);
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
  runtime.setMove(0.8, -1);
  runtime.setFire(true);
  runtime.setTurbo(true);
  runtime.setLock(true);
  for (let frame = 0; frame < 230; frame += 1) runtime.step(1 / 60);
  assert.ok(runtime.getSnapshot().lockedCount > 0);
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

test("wide-field combat source keeps enemies, guided threats and missile visuals in the expanded arena", async () => {
  const [runtimeSource, cameraSource, webglSource, presentationSource] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeCamera.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(runtimeSource, /PLAYER_X_LIMIT = 2\.2/);
  assert.match(runtimeSource, /PLAYER_Y_LIMIT = 1\.75/);
  assert.match(runtimeSource, /ENEMY_X_LIMIT = 2\.62/);
  assert.match(runtimeSource, /guidance = enemy\.boss/);
  assert.match(runtimeSource, /projectile\.guidance > 0/);
  assert.match(cameraSource, /playerX \* \(5\.15 \+ phone \* 2\.55\)/);
  assert.match(runtimeSource, /MAX_ENEMY_PROJECTILES_NORMAL = 6/);
  assert.match(runtimeSource, /threatBudget - activeThreats/);
  assert.match(webglSource, /arcade-aim-ring/);
  assert.match(webglSource, /ConeGeometry\(0\.36, 1\.62, 8\)/);
  assert.match(presentationSource, /trailSamples: 18/);
  assert.match(presentationSource, /width: enemy \? \.19 : \.22/);
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
  assert.ok(maxThreats <= 6, `normal threat budget ${maxThreats}`);
});

test("enemy missiles curve during guidance then commit to a dodgeable terminal path", async () => {
  const runtimeSource = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(runtimeSource, /curvePhase = projectile\.id \* 1\.731/);
  assert.match(runtimeSource, /projectile\.depth > 15/);
  assert.match(runtimeSource, /projectile\.depth <= 15/);
  assert.match(runtimeSource, /projectile\.guidance = 0/);
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

test("close fly-bys and route guidance stay readable", async () => {
  const [runtimeSource, webglSource, css] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeMode.module.css", import.meta.url), "utf8"),
  ]);
  assert.match(runtimeSource, /ENEMY_FLYBY_CULL_DEPTH = -11\.5/);
  assert.match(runtimeSource, /enemy\.depth < ENEMY_FLYBY_CULL_DEPTH/);
  assert.match(webglSource, /PerspectiveCamera\(55, 1, 0\.04, 1200\)/);
  assert.match(css, /\.routeOverlay\{[^}]*top:max\(76px/);
  assert.match(css, /\.routeOption\{padding:1px 4px/);
  assert.match(css, /\.missileWarningBoss\{top:max\(108px/);
});

test("title menu exposes all modes and keeps Turbo Hunt presentation isolated", async () => {
  const [menu, phase, arcade, legacyGrade, legacyHud] = await Promise.all([
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CartRogueGamePhase13.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerColorGradeV31.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerHudV30.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(menu, /ARCADE RUN/);
  assert.match(menu, /TURBO HUNT/);
  assert.match(menu, /STAGE PRACTICE/);
  assert.match(phase, /activeRequest\?\.mode === "turbo-hunt"/);
  assert.match(phase, /dataset\.skyDancerMode/);
  assert.match(phase, /SkyDancerArcadeMode/);
  assert.match(legacyGrade, /data-sky-dancer-mode=\"turbo-hunt\"/);
  assert.match(legacyHud, /dataset\.skyDancerMode !== "turbo-hunt"/);
  assert.match(arcade, /LOCK \/ RELEASE · MISSILE SALVO|RELEASE SALVO/);
  assert.match(arcade, /CONTINUE\?/);
  assert.match(arcade, /FLY THROUGH A ROUTE GATE/);
  assert.match(arcade, /window\.addEventListener\("pointerup"/);
  assert.match(arcade, /window\.addEventListener\("orientationchange"/);
  assert.match(arcade, /releaseAllInputs/);
});

test("product graphics are derived from the generated Arcade Run reference", async () => {
  const [webgl, models, environment, presentation, reference] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeModels.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeEnvironment.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/ARCADE_RUN_PRODUCT_REFERENCE.md", import.meta.url), "utf8"),
  ]);
  assert.match(webgl, /arcadeProductReference/);
  assert.match(models, /arcade-boss-weakpoint/);
  assert.match(models, /arcade-engine-trail/);
  assert.match(environment, /arcade-product-gradient-sky/);
  assert.match(environment, /arcade-product-sun/);
  assert.match(presentation, /arcade-product-speed-streaks/);
  assert.match(presentation, /arcade-projectile-trail/);
  assert.match(reference, /arcade-run-product-reference\.png/);
});
