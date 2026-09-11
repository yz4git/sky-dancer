import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  skyDancerArcadeV408SceneFocus,
  skyDancerArcadeV408SignatureEnvelope,
  skyDancerArcadeV408TargetLookBias,
} from "../src/sky/arcade/SkyDancerArcadeV408CinematicFocus";

const base = {
  status: "running" as const,
  stageProgress: .24,
  worldBreakLive: true,
  rivalAceActive: false,
  bossActive: false,
  finalBossReactive: false,
};

test("V40.8 signature focus fades in and out instead of owning the whole section", () => {
  assert.equal(skyDancerArcadeV408SignatureEnvelope(.04), 0);
  assert.ok(skyDancerArcadeV408SignatureEnvelope(.24) > .95);
  assert.equal(skyDancerArcadeV408SignatureEnvelope(.56), 0);
  const focus = skyDancerArcadeV408SceneFocus(base);
  assert.equal(focus.mode, "signature");
  assert.ok(focus.cameraPullback > 0 && focus.cameraPullback < .5);
  assert.ok(focus.vignette < .1);
});

test("V40.8 rival and boss focus keep a stronger but bounded target composition", () => {
  const rival = skyDancerArcadeV408SceneFocus({ ...base, rivalAceActive: true });
  const boss = skyDancerArcadeV408SceneFocus({ ...base, bossActive: true });
  const finalBoss = skyDancerArcadeV408SceneFocus({ ...base, bossActive: true, finalBossReactive: true });
  assert.equal(rival.mode, "rival");
  assert.equal(boss.mode, "boss");
  assert.ok(rival.targetLookWeight > boss.targetLookWeight);
  assert.ok(finalBoss.cameraPullback > boss.cameraPullback);
  assert.ok(finalBoss.cameraFovKick > boss.cameraFovKick);
  for (const focus of [rival, boss, finalBoss]) {
    assert.ok(focus.cameraPullback <= 1.1);
    assert.ok(focus.cameraFovKick <= 1.5);
    assert.ok(focus.bloomBoost <= .05);
  }
});

test("V40.8 debrief focus settles the camera instead of adding another speed kick", () => {
  const handoff = skyDancerArcadeV408SceneFocus({ ...base, status: "stage-clear" });
  const finale = skyDancerArcadeV408SceneFocus({ ...base, status: "run-clear" });
  assert.equal(handoff.mode, "handoff");
  assert.equal(finale.mode, "finale");
  assert.ok(handoff.cameraFovKick < 0);
  assert.ok(finale.cameraFovKick < handoff.cameraFovKick);
  assert.ok(finale.vignette > handoff.vignette);
});

test("V40.8 target look bias stays subtle even for edge-case target coordinates", () => {
  const rival = skyDancerArcadeV408SceneFocus({ ...base, rivalAceActive: true });
  const bias = skyDancerArcadeV408TargetLookBias(rival, 20, -20);
  assert.deepEqual(bias, { x: 1.05, y: -.55 });
  const neutral = skyDancerArcadeV408TargetLookBias(skyDancerArcadeV408SceneFocus({ ...base, worldBreakLive: false }), 2, 2);
  assert.deepEqual(neutral, { x: 0, y: 0 });
});

test("V40.8 is presentation-only and wires WebGL, Canvas and product HUD to one scene-focus contract", () => {
  const runtime = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  const webgl = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  const canvas = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  const mode = readFileSync(resolve("app/SkyDancerArcadeMode.tsx"), "utf8");
  const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");
  assert.doesNotMatch(runtime, /V408CinematicFocus/);
  assert.match(webgl, /skyDancerArcadeV408SceneFocus/);
  assert.match(webgl, /skyDancerArcadeV408TargetLookBias/);
  assert.match(webgl, /v408Focus\.cameraPullback/);
  assert.match(canvas, /drawCinematicFocusV408/);
  assert.match(mode, /data-v408-scene=\{v408Focus\.mode\}/);
  assert.match(mode, /cinematicFocusV408/);
  assert.match(css, /V40\.8 Cinematic Focus Pass/);
  assert.match(css, /max-height:430px/);
});
