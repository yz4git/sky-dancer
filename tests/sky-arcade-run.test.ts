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
