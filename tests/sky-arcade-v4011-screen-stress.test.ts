import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skyDancerArcadeV409PhoneClarity } from "../src/sky/arcade/SkyDancerArcadeV409PhoneClarity";
import {
  skyDancerArcadeV4010DynamicOcclusion,
  skyDancerArcadeV4010EntityOcclusion,
} from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";
import {
  skyDancerArcadeV4011ForegroundCraftCount,
  skyDancerArcadeV4011ScreenStress,
} from "../src/sky/arcade/SkyDancerArcadeV4011ScreenStress";

function profile(overrides: Partial<Parameters<typeof skyDancerArcadeV4011ScreenStress>[0]> = {}) {
  const compactLandscape = overrides.compactLandscape ?? true;
  const sceneMode = overrides.sceneMode ?? "flight";
  const incomingThreats = overrides.incomingThreats ?? 0;
  const baseOcclusion = overrides.baseOcclusion ?? skyDancerArcadeV4010DynamicOcclusion({ compactLandscape, sceneMode, incomingThreats });
  const baseClarity = overrides.baseClarity ?? skyDancerArcadeV409PhoneClarity({ compactLandscape, sceneMode, incomingThreats });
  return skyDancerArcadeV4011ScreenStress({
    compactLandscape, sceneMode, incomingThreats,
    foregroundCraft: 0, impactCount: 0, destroyedImpacts: 0, worldBreakLive: false,
    baseOcclusion, baseClarity, ...overrides,
  });
}

test("V40.11 leaves large displays and single-source spectacle on the V40.10 path", () => {
  const large = profile({ compactLandscape: false, sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  assert.equal(large.pressure, 0);
  assert.equal(large.speedStreakAlpha, 1);

  const single = profile({ sceneMode: "flight", incomingThreats: 5 });
  assert.equal(single.pressure, 0, "V40.10 already owns one isolated source of clutter");
  assert.equal(single.band, "clear");
});

test("V40.11 shared foreground counter ignores protected targets and side-lane craft", () => {
  const count = skyDancerArcadeV4011ForegroundCraftCount([
    { x: .1, y: .05, depth: 8 },
    { x: -.2, y: .1, depth: 12 },
    { x: 0, y: 0, depth: 7, boss: true },
    { x: .15, y: 0, depth: 9, rivalAce: true },
    { x: 2.3, y: 1.2, depth: 8 },
    { x: 0, y: 0, depth: 28 },
  ], 0, 0);
  assert.equal(count, 2);
});

test("V40.11 escalates only when independent clutter signals overlap", () => {
  const busy = profile({ sceneMode: "signature", incomingThreats: 3, foregroundCraft: 2, impactCount: 1, worldBreakLive: true });
  const critical = profile({ sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  assert.ok(busy.pressure >= .34 && busy.pressure < critical.pressure);
  assert.equal(busy.band, "busy");
  assert.equal(critical.band, "critical");
  assert.ok(critical.pressure >= .8);
});

test("V40.11 worst-case stress clears smoke and speed lines before impact identity", () => {
  const critical = profile({ sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  assert.ok(critical.fxClarity.smokeAlpha <= .46);
  assert.ok(critical.fxClarity.sparkAlpha >= .78);
  assert.ok(critical.fxClarity.detonationAlpha >= .78);
  assert.ok(critical.fxClarity.detonationAlpha > critical.fxClarity.smokeAlpha);
  assert.ok(critical.speedStreakAlpha >= .58 && critical.speedStreakAlpha < .7);
  assert.equal(critical.clarity.primaryLocks, 1);
  assert.equal(critical.clarity.aimCues, 0);
  assert.ok(critical.clarity.counterplayCues >= 0 && critical.clarity.counterplayCues <= 1);
});

test("V40.11 never thins the protected boss/rival/World Break target contract", () => {
  const critical = profile({ sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  const protectedTarget = skyDancerArcadeV4010EntityOcclusion({
    profile: critical.occlusion, protectedTarget: true,
    entityX: 0, entityY: 0, entityDepth: 4, centerX: 0, centerY: 0,
    focusX: 0, focusY: 0, focusDepth: 24, hasFocusTarget: true,
  });
  assert.deepEqual(protectedTarget, { scale: 1, alpha: 1, pressure: 0 });
});

test("V40.11 wiring is presentation-only and shared by WebGL, Canvas and pooled FX", () => {
  const helper = readFileSync("src/sky/arcade/SkyDancerArcadeV4011ScreenStress.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  const presentation = readFileSync("src/sky/arcade/SkyDancerArcadeProductPresentation.ts", "utf8");
  assert.doesNotMatch(helper, /SkyDancerArcadeRuntime/);
  assert.doesNotMatch(helper, /playerHp|damageTaken|addScore|courseSpeed/);
  assert.match(webgl, /skyDancerArcadeV4011ForegroundCraftCount/);
  assert.match(webgl, /snapshot\.impacts\.filter/);
  assert.match(webgl, /v4011Stress\.fxClarity/);
  assert.match(webgl, /v4011SpeedStreakAlpha/);
  assert.match(canvas, /skyDancerArcadeV4011ForegroundCraftCount/);
  assert.match(canvas, /v4011OcclusionProfile/);
  assert.match(presentation, /stressAlpha/);
  assert.match(presentation, /THREE\.MathUtils\.clamp\(stressAlpha, \.58, 1\)/);
});
