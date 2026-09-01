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
import { arcadeCoursePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";
import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";

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

test("V5.1 near-pass framing and shock-ring climax stay readable", async () => {
  const [world, presentation, menu] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(world, /const x=side\*\(25\+r\(j\+71\)\*8\.5\)/);
  assert.match(world, /w\*1\.38,h\*\.22,d\*1\.18/);
  assert.match(presentation, /arcade-climax-shock-ring-v51/);
  assert.match(presentation, /RingGeometry\(\.58, \.72, 48\)/);
  assert.match(menu, /7 SECTIONS · 4 MIN/);
});

test("environment density and destruction climax V5 stay authored and bounded", async () => {
  assert.equal(SKY_DANCER_ARCADE_RUN_DURATION_SECONDS, 240);
  const [world, presentation, webgl] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
  ]);
  assert.match(world, /arcade-near-pass-setpieces-v5/);
  assert.match(world, /const count=72/);
  assert.match(world, /SURFACE_CHUNK_DEPTH = CHUNK_LENGTH \+ 32/);
  assert.match(world, /PlaneGeometry\(260,SURFACE_CHUNK_DEPTH,48,36\)/);
  assert.match(presentation, /arcade-climax-flash-v5/);
  assert.match(presentation, /sparks: 240, smoke: 84/);
  assert.match(webgl, /impact\.boss[\s\S]*emitBossExplosion\(position, impact\.missile\)/);
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
  assert.match(cameraSource, /playerX \* \(5\.15 \+ phone \* 2\.55 \+ turboFollow \* \.95\)/);
  assert.match(runtimeSource, /MAX_ENEMY_PROJECTILES_NORMAL = 5/);
  assert.match(runtimeSource, /threatBudget - activeThreats/);
  assert.match(webglSource, /arcade-aim-ring/);
  assert.match(webglSource, /ConeGeometry\(0\.36, 1\.62, 8\)/);
  assert.match(presentationSource, /trailSamples: 18/);
  assert.match(presentationSource, /width: enemy \? \.19 : playerMissile \? \.72 : \.22/);
assert.match(presentationSource, /arcade-pooled-missile-white-smoke/);
assert.match(presentationSource, /missileSmoke: 160/);
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

test("V6.2 NORMAL opening pressure preserves reaction time and readable damage cadence", async () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  for (let frame = 0; frame < 720; frame += 1) runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.status, "running");
  assert.equal(snapshot.continuesRemaining, SKY_DANCER_ARCADE_MAX_CONTINUES);
  assert.ok(snapshot.playerHp > 20, `opening HP ${snapshot.playerHp}`);

  const [runtimeSource, webglSource, presentationSource] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(runtimeSource, /damageCooldown = this\.options\.difficulty === "hard" \? \.28 : \.5/);
  assert.match(runtimeSource, /enemyCap = this\.options\.difficulty === "hard" \? 15 : 11/);
  assert.match(webglSource, /const heavyCraft = impact\.kind === "bomber" \|\| impact\.kind === "missile-boat"/);
  assert.match(webglSource, /if \(impact\.boss\)[\s\S]*emitBossExplosion\(position, impact\.missile\)/);
  assert.match(webglSource, /else if \(heavyCraft\)[\s\S]*emitHeavyExplosion\(position, impact\.missile\)/);
  assert.match(webglSource, /emitSmallExplosion\(position, impact\.missile\)/);
  assert.match(presentationSource, /addScaledVector\(this\.forward, 3\.8\)/);
  assert.match(webglSource, /denseSkyline = snapshot\.stage\.biome === "city" \|\| snapshot\.stage\.biome === "night"/);
  assert.match(webglSource, /course\.bank \* \(denseSkyline \? \.34 : \.56\)/);
  assert.match(webglSource, /nearCourse\.bank \* \(denseSkyline \? \.07 : \.14\)/);
  assert.match(webglSource, /farCourse = arcadeCourseRelativePose\(snapshot\.stage, snapshot\.distance, 132\)/);
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


test("V7 signature stages have measurably distinct course geometry", () => {
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


test("V7.1 chase camera deliberately lags the shared course so bends remain visible", async () => {
  const webgl = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  assert.match(webgl, /nearCourse = arcadeCourseRelativePose\(snapshot\.stage, snapshot\.distance, 42\)/);
  assert.match(webgl, /farCourse = arcadeCourseRelativePose\(snapshot\.stage, snapshot\.distance, 132\)/);
  assert.match(webgl, /nearCourse\.x \* \.14 \+ farCourse\.x \* \.06 \+ course\.yaw \* 3\.6/);
  assert.doesNotMatch(webgl, /courseAim\.x \* \.16/);
  assert.match(webgl, /const iceCourse = snapshot\.stage\.biome === "ice"/);
  assert.match(webgl, /nearCourse\.y \* \(iceCourse \? \.018 : \.105\)/);
  assert.match(webgl, /farCourse\.y \* \(iceCourse \? \.006 : \.032\) \+ course\.pitch \* 2\.2/);
});


test("V8 speed pass keeps enemies close and choreographs dogfight fly-bys", async () => {
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
  assert.ok(seen.has("close-bank"), `maneuvers ${[...seen].join(",")}`);
  assert.ok(seen.has("overtake"), `maneuvers ${[...seen].join(",")}`);
  assert.ok(seen.has("parallel"), `maneuvers ${[...seen].join(",")}`);
  assert.ok(rearToFront, "rear overtaker should pass into the forward field");
  assert.ok(closeSamples >= 120, `close silhouette samples ${closeSamples}`);

  const [runtimeSource, presentationSource, cameraSource] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeCamera.ts", import.meta.url), "utf8"),
  ]);
  assert.match(runtimeSource, /turboActive \? 1\.44 : 1/);
  assert.match(presentationSource, /turboActive \? 205 : 78/);
  assert.match(cameraSource, /fov: turbo \? 69 : 56/);
});


test("V8.1 playcheck keeps close dogfights readable and the Turbo airframe on-screen", async () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  let minCrossPassSeparation = Number.POSITIVE_INFINITY;
  for (let frame = 0; frame < 1500; frame += 1) {
    const snapshot = runtime.getSnapshot();
    for (const enemy of snapshot.enemies) {
      if (enemy.boss || enemy.maneuver !== "cross-pass" || enemy.depth >= 18) continue;
      minCrossPassSeparation = Math.min(minCrossPassSeparation, Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY));
    }
    runtime.step(1 / 60);
    if (runtime.getSnapshot().status !== "running") break;
  }
  assert.ok(Number.isFinite(minCrossPassSeparation), "expected at least one close cross-pass sample");
  assert.ok(minCrossPassSeparation >= .58, `cross-pass separation ${minCrossPassSeparation}`);

  const [webgl, presentation, camera] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeCamera.ts", import.meta.url), "utf8"),
  ]);
  assert.match(webgl, /extremeCloseClamp/);
  assert.match(webgl, /if \(impact\.boss\)[\s\S]*emitBossExplosion\(position, impact\.missile\)/);
  assert.match(webgl, /heavyCraft[\s\S]*emitHeavyExplosion\(position, impact\.missile\)/);
  assert.match(presentation, /Math\.min\(\.2, \.018 \+ this\.climaxEnergy \* \.15\)/);
  assert.match(presentation, /Math\.min\(\.24, this\.climaxPulse \* \.27\)/);
  assert.match(camera, /turboFollow \* \.95/);
  assert.match(camera, /turboFollow \* 1\.08/);
  assert.match(camera, /fov: turbo \? 69 : 56/);
});


test("V8.2 branch stages carry independent course signatures and no decorative horizon carrier", async () => {
  const sample = (id: "cloud-fleet" | "storm-carrier" | "desert-fortress" | "floating-ruins" | "night-metro" | "prism-citadel") => {
    const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;
    const length = stage.durationSeconds * stage.courseSpeed;
    return Array.from({ length: 121 }, (_, index) => arcadeCoursePose(stage, length * index / 120));
  };
  const span = (values: number[]) => Math.max(...values) - Math.min(...values);
  const signChanges = (values: number[], epsilon = .03) => {
    const signs = values.filter((value) => Math.abs(value) >= epsilon).map((value) => Math.sign(value));
    return signs.reduce((count, sign, index) => index > 0 && sign !== signs[index - 1] ? count + 1 : count, 0);
  };

  const cloud = sample("cloud-fleet");
  assert.ok(span(cloud.map((pose) => pose.y)) > 25, "cloud stage should crest vertically");
  const storm = sample("storm-carrier");
  assert.ok(signChanges(storm.map((pose) => pose.yaw)) >= 5, "storm should dodge laterally");
  assert.ok(span(storm.map((pose) => pose.y)) > 25, "storm should change altitude sharply");
  const desert = sample("desert-fortress");
  assert.ok(span(desert.map((pose) => pose.x)) > 55, "desert fortress should alternate wall approaches");
  const ruins = sample("floating-ruins");
  assert.ok(span(ruins.map((pose) => pose.x)) > 55, "ruins should weave through islands");
  assert.ok(span(ruins.map((pose) => pose.y)) > 35, "ruins should be a multi-level labyrinth");
  const night = sample("night-metro");
  assert.ok(signChanges(night.map((pose) => pose.yaw)) >= 6, "night metro should chicane repeatedly");
  const citadel = sample("prism-citadel");
  assert.ok(citadel.at(-1)!.y - citadel[0].y > 10, "citadel should climb into the finale");

  const world = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8");
  assert.doesNotMatch(world, /arcade-horizon-fleet-carrier/);
  assert.doesNotMatch(world, /createReferenceCarrier/);
  assert.match(world, /const lift=tier\*9\.5\+\(hero\?3:-3\)/);
  assert.match(world, /arcadeDesertV93SandwallCitadel/);
  assert.match(world, /arcadeDesertV93BreachSide/);
  assert.match(world, /arcade-desert-fortress-citadel/);
  assert.match(world, /const stormSide=index%2===0\?1:-1/);
});


test("V9.5 presentation director stacks speed, near-miss, damage and boss peaks without touching gameplay", async () => {
  const base = { turboActive: false, nearMisses: 0, enemiesDefeated: 0, bossActive: false, hitSerial: 0, damageSerial: 0, stageSerial: 0, resultSerial: 0 };
  const director = new SkyDancerArcadePresentationDirector();
  const turbo = director.update({ ...base, turboActive: true }, base, 1 / 60);
  assert.ok(turbo.rush > 0);
  assert.ok(turbo.fovKick >= 5);
  assert.ok(turbo.bloomBoost > 0);

  director.reset();
  const near = director.update({ ...base, nearMisses: 1 }, base, 1 / 60);
  assert.ok(near.nearMiss > .9);
  assert.ok(near.cameraShake > .1);
  assert.ok(near.fovKick > 1.5);

  director.reset();
  const damage = director.update({ ...base, damageSerial: 1 }, base, 1 / 60);
  assert.ok(damage.damage > .9);
  assert.ok(damage.cameraShake > .2);

  director.reset();
  const boss = director.update({ ...base, bossActive: true }, base, 1 / 60);
  assert.ok(boss.boss > .9);
  assert.ok(boss.pullback > .4);

  const cinematic = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeCinematicRenderer.ts", import.meta.url), "utf8");
  assert.match(cinematic, /only two velocity-color taps/);
  assert.match(cinematic, /rushStrength/);
  assert.match(cinematic, /damageStrength/);
});
