import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  skyDancerArcadeV405FinalBossContract,
  skyDancerArcadeV405FinalBossPhase,
  skyDancerArcadeV405RivalMemory,
  skyDancerArcadeV405RouteMemory,
} from "../src/sky/arcade/SkyDancerArcadeV405RouteReactiveFinalBoss";

test("V40.5 route memory selects four genuinely different Prism Sovereign forms", () => {
  assert.equal(skyDancerArcadeV405RouteMemory(["SAFE", "SAFE", "SCORE"]), "SAFE");
  assert.equal(skyDancerArcadeV405RouteMemory(["SCORE", "SCORE", "SAFE"]), "SCORE");
  assert.equal(skyDancerArcadeV405RouteMemory(["DANGER", "DANGER", "SAFE"]), "DANGER");
  assert.equal(skyDancerArcadeV405RouteMemory(["SAFE", "SCORE", "DANGER"]), "MIXED");

  const safe = skyDancerArcadeV405FinalBossContract(["SAFE", "SAFE"], ["BROKEN", "OUTFLOWN", "BROKEN"]);
  const score = skyDancerArcadeV405FinalBossContract(["SCORE", "SCORE"], ["BROKEN", "OUTFLOWN", "BROKEN"]);
  const danger = skyDancerArcadeV405FinalBossContract(["DANGER", "DANGER"], ["ESCAPED", "ESCAPED", "BROKEN"]);
  const mixed = skyDancerArcadeV405FinalBossContract(["SAFE", "SCORE"], ["BROKEN", "ESCAPED", "OUTFLOWN"]);

  assert.equal(safe.form, "MIRROR_AEGIS");
  assert.equal(score.form, "PRISM_CROWN");
  assert.equal(danger.form, "HELLSTAR");
  assert.equal(mixed.form, "SEVEN_SKY");
  assert.notEqual(safe.cadenceScale, danger.cadenceScale);
  assert.ok(danger.hpScale > safe.hpScale);
});

test("V40.5 remembers whether NOVA-7 was conquered, escaped, or contested", () => {
  assert.equal(skyDancerArcadeV405RivalMemory(["BROKEN", "OUTFLOWN", "BROKEN"]), "NOVA_BROKEN");
  assert.equal(skyDancerArcadeV405RivalMemory(["ESCAPED", "ESCAPED", "BROKEN"]), "NOVA_DEBT");
  assert.equal(skyDancerArcadeV405RivalMemory(["BROKEN", "ESCAPED", "OUTFLOWN"]), "CONTESTED");
});

test("V40.5 final boss phase contract changes hazard, cadence and final memory", () => {
  const contract = skyDancerArcadeV405FinalBossContract(
    ["DANGER", "DANGER", "SCORE"],
    ["ESCAPED", "ESCAPED", "BROKEN"],
  );
  const phase2 = skyDancerArcadeV405FinalBossPhase(contract, 2);
  const phase3 = skyDancerArcadeV405FinalBossPhase(contract, 3);
  assert.equal(phase2.hazard, "lightning");
  assert.equal(phase3.escortKind, "ace");
  assert.ok(phase3.cadenceScale < phase2.cadenceScale);
  assert.match(phase3.label, /NOVA DEBT/);
});

test("V40.5 runtime spawns a route-reactive Prism Sovereign and arms its remembered attack", () => {
  const runtime = new SkyDancerArcadeRuntime({
    difficulty: "normal",
    mode: "stage-practice",
    startStageId: "prism-citadel",
    seed: 405,
  });
  runtime.configureV405FinalBossMemoryForTests(
    ["DANGER", "DANGER", "SCORE"],
    ["ESCAPED", "ESCAPED", "BROKEN"],
  );
  runtime.spawnV405FinalBossForTests();
  let snapshot = runtime.getSnapshot();

  assert.equal(snapshot.bossActive, true);
  assert.equal(snapshot.finalBossReactive, true);
  assert.equal(snapshot.finalBossForm, "HELLSTAR");
  assert.equal(snapshot.finalBossRouteMemory, "DANGER");
  assert.equal(snapshot.finalBossRivalMemory, "NOVA_DEBT");
  assert.ok(snapshot.bossMaxHp > 1280);
  assert.equal(snapshot.enemies.find((enemy) => enemy.boss)?.finalBossForm, "HELLSTAR");

  runtime.triggerBossPhaseForTests(2);
  snapshot = runtime.getSnapshot();
  assert.match(snapshot.bossMechanicLabel, /DANGER-LANE PUNISH/);
  assert.ok(snapshot.hazards.some((hazard) => hazard.kind === "lightning"));
});

test("V40.5 keeps WebGL, Canvas and HUD on the same final-boss memory contract", () => {
  const models = readFileSync("src/sky/arcade/SkyDancerArcadeModels.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  const mode = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  assert.match(models, /arcade-v405-final-boss-form/);
  assert.match(webgl, /finalBossSerial/);
  assert.match(canvas, /finalBossAccent/);
  assert.match(mode, /ROUTE MEMORY/);
  assert.match(mode, /RIVAL MEMORY/);
});
