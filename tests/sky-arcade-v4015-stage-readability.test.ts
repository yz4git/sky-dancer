import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { skyDancerArcadeV4015StageReadability } from "../src/sky/arcade/SkyDancerArcadeV4015StageReadability";
import { SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY } from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";

const base = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY;
const profile = (overrides: Partial<Parameters<typeof skyDancerArcadeV4015StageReadability>[0]> = {}) =>
  skyDancerArcadeV4015StageReadability({
    compactLandscape: true,
    stageId: "dawn-city",
    rhythmPhase: "build",
    screenStress: 0,
    bossActive: false,
    turboActive: false,
    baseFxClarity: base,
    baseSpeedLineAlpha: .88,
    ...overrides,
  });

test("V40.15 is an identity pass on non-phone layouts and handoff shots", () => {
  const desktop = profile({ compactLandscape: false, stageId: "storm-carrier", rhythmPhase: "boss", bossActive: true });
  assert.deepEqual(desktop.fxClarity, base);
  assert.equal(desktop.speedLineAlpha, .88);
  const handoff = profile({ stageId: "volcano-core", rhythmPhase: "handoff", screenStress: 1 });
  assert.deepEqual(handoff.fxClarity, base);
  assert.equal(handoff.focusPressure, 0);
});

test("clutter-heavy stage boss beats clear more aggressively than ordinary Dawn City flight", () => {
  const dawn = profile();
  const stormBoss = profile({ stageId: "storm-carrier", rhythmPhase: "boss", bossActive: true, screenStress: .55 });
  assert.ok(stormBoss.focusPressure > dawn.focusPressure + .35);
  assert.ok(stormBoss.fxClarity.smokeAlpha < dawn.fxClarity.smokeAlpha);
  assert.ok(stormBoss.fxClarity.missileSmokeAlpha < dawn.fxClarity.missileSmokeAlpha);
  assert.ok(stormBoss.speedLineAlpha < dawn.speedLineAlpha);
  assert.ok(stormBoss.fxClarity.detonationAlpha >= .78);
});

test("boss-rise yields more corridor space than build on the same stage", () => {
  const build = profile({ stageId: "ice-cavern", rhythmPhase: "build" });
  const rise = profile({ stageId: "ice-cavern", rhythmPhase: "boss-rise" });
  assert.ok(rise.focusPressure > build.focusPressure);
  assert.ok(rise.fxClarity.smokeAlpha < build.fxClarity.smokeAlpha);
  assert.ok(rise.speedLineAlpha < build.speedLineAlpha);
});

test("Orbital Ascent preserves its deliberately sparse normal-flight presentation", () => {
  const orbit = profile({ stageId: "orbital-ascent", rhythmPhase: "build" });
  assert.ok(orbit.focusPressure < .07);
  assert.ok(orbit.fxClarity.smokeAlpha > .98);
  assert.ok(orbit.speedLineAlpha > .85);
});

test("turbo keeps a minimum speed-line presence even under maximum focus pressure", () => {
  const turbo = profile({
    stageId: "prism-citadel", rhythmPhase: "boss", screenStress: 1,
    bossActive: true, turboActive: true, baseSpeedLineAlpha: .5,
  });
  assert.ok(turbo.speedLineAlpha >= .5);
  assert.ok(turbo.fxClarity.sparkAlpha >= .76);
  assert.ok(turbo.fxClarity.detonationAlpha >= .78);
});

test("V40.15 is wired after stress and rhythm governors in WebGL presentation", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /skyDancerArcadeV4015StageReadability/);
  assert.match(source, /baseFxClarity: v4015BaseFxClarity/);
  assert.match(source, /baseSpeedLineAlpha: v4011Stress\.speedStreakAlpha \* v4012Rhythm\.speedLineGain/);
  assert.match(source, /this\.v4010FxClarity = v4015Readability\.fxClarity/);
  assert.match(source, /this\.v4011SpeedStreakAlpha = v4015Readability\.speedLineAlpha/);
});
