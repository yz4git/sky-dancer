import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE,
  SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE,
  SKY_DANCER_ARCADE_V40_PRISM_TRIALS,
  skyDancerArcadeV40OrbitalSafeX,
  skyDancerArcadeV40PrismTrialStageId,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 6 completes all eleven Arcade Run worlds", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("orbital-ascent").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("orbital-ascent").signature, "ZERO-G ASCENT");
  assert.equal(skyDancerArcadeV40WorldProfile("prism-citadel").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("prism-citadel").signature, "ROUTE REPRISE");
});

test("V40 Orbital Ascent uses a moving axis and turbo climb can clear the shaft", () => {
  assert.notEqual(skyDancerArcadeV40OrbitalSafeX(3), skyDancerArcadeV40OrbitalSafeX(3.6));
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "orbital-ascent", seed: 4060 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40OrbitalAscentForTests(true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakOrbitResolved, true);
  assert.equal(snapshot.worldBreakOrbitComplete, true);
  assert.equal(snapshot.worldBreakOrbitAltitude, SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE);
  assert.ok(snapshot.score > before);
});

test("V40 Orbital Ascent debris punishes losing the safe axis without soft-locking the section", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "orbital-ascent", seed: 4061 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40OrbitalAscentForTests(false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakOrbitStrikes, 1);
  assert.ok(snapshot.playerHp < hp);
  assert.equal(snapshot.worldBreakOrbitResolved, false);
});

test("V40 Prism Citadel derives its seven reprise identities from the flown route with a deterministic practice fallback", () => {
  assert.equal(SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length, 7);
  assert.equal(skyDancerArcadeV40PrismTrialStageId(["cloud-fleet", "storm-carrier", "floating-ruins", "volcano-core", "orbital-ascent", "prism-citadel"], 0), "cloud-fleet");
  assert.equal(skyDancerArcadeV40PrismTrialStageId(["prism-citadel"], 0), SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE[0]);
  assert.equal(skyDancerArcadeV40PrismTrialStageId(["prism-citadel"], 6), "prism-citadel");
});

test("V40 Prism Citadel can perfect all seven physical reprise gates", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "prism-citadel", seed: 4062 });
  const before = runtime.getSnapshot().score;
  for (const trial of SKY_DANCER_ARCADE_V40_PRISM_TRIALS) runtime.triggerV40PrismTrialForTests(trial.index, true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPrismComplete, true);
  assert.equal(snapshot.worldBreakPrismPerfect, true);
  assert.equal(snapshot.worldBreakPrismHits, 7);
  assert.equal(snapshot.worldBreakPrismMisses, 0);
  assert.ok(snapshot.score > before);
});

test("V40 Prism Citadel survives a reprise miss and still completes the final sequence", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "prism-citadel", seed: 4063 });
  const hp = runtime.getSnapshot().playerHp;
  for (const trial of SKY_DANCER_ARCADE_V40_PRISM_TRIALS) runtime.triggerV40PrismTrialForTests(trial.index, trial.index !== 2);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPrismComplete, true);
  assert.equal(snapshot.worldBreakPrismPerfect, false);
  assert.equal(snapshot.worldBreakPrismMisses, 1);
  assert.ok(snapshot.playerHp < hp);
});

test("V40 phase 6 keeps WebGL and Canvas parity and reattaches final-world roots", () => {
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.match(webgl, /syncWorldBreakOrbitalAscent\(snapshot\)/);
  assert.match(webgl, /syncWorldBreakPrismReprise\(snapshot\)/);
  assert.match(webgl, /worldBreakRoot\.add\(this\.worldBreakOrbitRoot, this\.worldBreakPrismRoot\)/);
  assert.match(canvas, /drawWorldBreakOrbitalAscent\(context, snapshot/);
  assert.match(canvas, /drawWorldBreakPrismReprise\(context, snapshot/);
});
