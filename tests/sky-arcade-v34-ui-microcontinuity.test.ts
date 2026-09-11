import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = readFileSync(resolve("app/SkyDancerArcadeMode.tsx"), "utf8");
const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");

test("V34 transient combat HUD cues linger through a short exit instead of unmounting instantly", () => {
  assert.match(mode, /function useExitLinger<T>/);
  assert.match(mode, /useExitLinger\(snapshot\.message, 220\)/);
  assert.match(mode, /snapshot\.chain > 1 \? snapshot\.chain : null, 260/);
  assert.match(mode, /data-exiting=\{missileCue\.exiting\}/);
  assert.match(css, /v34MessageExit/);
  assert.match(css, /v34ChainExit/);
  assert.match(css, /v34MissileExit/);
  assert.match(css, /translateX\(-50%\).*rotate\(-4deg\)/);
});

test("V34 boss HUD enters on the same authored boss beat and exits with the wreck shot", () => {
  assert.match(css, /\.bossHud:not\(\.bossHudExit\)\{animation:v34BossHudEnter/);
  assert.match(css, /\.bossHudExit\{animation:v34BossHudExit/);
});

test("V34 section result card owns both an entrance and a timed handoff exit", () => {
  assert.match(mode, /data-practice=\{snapshot\.mode === "stage-practice"\}/);
  assert.match(css, /v34ResultBackdropIn/);
  assert.match(css, /v34ResultBackdropOut/);
  assert.match(css, /v34ResultPanelIn/);
  assert.match(css, /v34ResultPanelOut/);
});
