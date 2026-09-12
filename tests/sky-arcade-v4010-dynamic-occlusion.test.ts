import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,
  skyDancerArcadeV4010DynamicOcclusion,
  skyDancerArcadeV4010EntityOcclusion,
} from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";

test("V40.10 leaves large displays on the full-strength presentation path", () => {
  const profile = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: false, sceneMode: "boss", incomingThreats: 6 });
  assert.equal(profile.incidentalScaleFloor, 1);
  assert.deepEqual(profile.fxClarity, SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY);
});

test("V40.10 removes smoke before impact identity as phone scenes become more important", () => {
  const signature = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "signature", incomingThreats: 0 });
  const rival = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "rival", incomingThreats: 0 });
  const boss = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "boss", incomingThreats: 0 });
  assert.ok(signature.fxClarity.smokeAlpha > rival.fxClarity.smokeAlpha);
  assert.ok(rival.fxClarity.smokeAlpha > boss.fxClarity.smokeAlpha);
  assert.ok(boss.fxClarity.detonationAlpha >= .82, "impact ring/flash identity must survive");
  assert.ok(boss.fxClarity.sparkAlpha > boss.fxClarity.smokeAlpha, "smoke should yield before sparks");
});

test("V40.10 incoming missiles increase clarity pressure without deleting impact feedback", () => {
  const calm = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "flight", incomingThreats: 0 });
  const danger = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "flight", incomingThreats: 5 });
  assert.ok(danger.fxClarity.smokeAlpha < calm.fxClarity.smokeAlpha);
  assert.ok(danger.incidentalScaleFloor < calm.incidentalScaleFloor);
  assert.ok(danger.fxClarity.detonationAlpha >= .82);
});

test("V40.10 only thins incidental foreground craft that cross the protected sightline", () => {
  const profile = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "boss", incomingThreats: 2 });
  const occluder = skyDancerArcadeV4010EntityOcclusion({
    profile, protectedTarget: false, entityX: .08, entityY: .04, entityDepth: 8,
    centerX: 0, centerY: 0, focusX: .05, focusY: .02, focusDepth: 24, hasFocusTarget: true,
  });
  const sideCraft = skyDancerArcadeV4010EntityOcclusion({
    profile, protectedTarget: false, entityX: 2.1, entityY: 1.2, entityDepth: 8,
    centerX: 0, centerY: 0, focusX: .05, focusY: .02, focusDepth: 24, hasFocusTarget: true,
  });
  const protectedCraft = skyDancerArcadeV4010EntityOcclusion({
    profile, protectedTarget: true, entityX: 0, entityY: 0, entityDepth: 5,
    centerX: 0, centerY: 0, focusX: 0, focusY: 0, focusDepth: 24, hasFocusTarget: true,
  });
  assert.ok(occluder.scale < .82);
  assert.ok(occluder.alpha < .82);
  assert.ok(sideCraft.scale > .96);
  assert.deepEqual(protectedCraft, { scale: 1, alpha: 1, pressure: 0 });
});

test("V40.10 wiring stays presentation-only across WebGL, Canvas and pooled FX", () => {
  const helper = readFileSync("src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  const presentation = readFileSync("src/sky/arcade/SkyDancerArcadeProductPresentation.ts", "utf8");
  assert.doesNotMatch(helper, /SkyDancerArcadeRuntime/);
  assert.match(webgl, /v4010Occlusion\.scale/);
  assert.match(webgl, /v4010Profile\.fxClarity/);
  assert.match(canvas, /v4010Occlusion\.alpha/);
  assert.match(presentation, /setClarityAlpha/);
  assert.match(presentation, /clarity\.smokeAlpha/);
  assert.match(presentation, /clarity\.detonationAlpha/);
});
