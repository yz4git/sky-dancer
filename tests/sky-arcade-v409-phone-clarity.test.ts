import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { skyDancerArcadeV409PhoneClarity } from "../src/sky/arcade/SkyDancerArcadeV409PhoneClarity";

test("V40.9 leaves larger displays on the proven V27.1 cue budget", () => {
  const clarity = skyDancerArcadeV409PhoneClarity({ compactLandscape: false, sceneMode: "boss", incomingThreats: 6 });
  assert.deepEqual(clarity, { primaryLocks: 6, aimCues: 3, counterplayCues: 3, secondaryLockScale: .68, cueOpacity: 1, canvasLockLimit: 8 });
});

test("V40.9 progressively clears helper markers around signature, rival and boss play on phones", () => {
  const flight = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "flight", incomingThreats: 0 });
  const signature = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "signature", incomingThreats: 0 });
  const rival = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "rival", incomingThreats: 0 });
  const boss = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "boss", incomingThreats: 0 });
  assert.ok(flight.primaryLocks > signature.primaryLocks);
  assert.equal(signature.primaryLocks, rival.primaryLocks);
  assert.ok(boss.primaryLocks < rival.primaryLocks);
  assert.ok(boss.cueOpacity < signature.cueOpacity);
  assert.equal(boss.canvasLockLimit, 2);
});

test("V40.9 incoming missile pressure removes optional aim clutter before logical locks", () => {
  const calm = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "flight", incomingThreats: 0 });
  const pressure = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "flight", incomingThreats: 4 });
  assert.equal(pressure.aimCues, 0);
  assert.equal(pressure.counterplayCues, 1);
  assert.ok(pressure.primaryLocks >= 2);
  assert.ok(pressure.secondaryLockScale < calm.secondaryLockScale);
  assert.ok(pressure.cueOpacity < calm.cueOpacity);
});

test("V40.9 keeps handoff/finale quiet while preserving at least one primary cue contract", () => {
  for (const sceneMode of ["handoff", "finale"] as const) {
    const clarity = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode, incomingThreats: 0 });
    assert.equal(clarity.primaryLocks, 1);
    assert.equal(clarity.aimCues, 0);
    assert.equal(clarity.counterplayCues, 0);
    assert.equal(clarity.canvasLockLimit, 1);
  }
});

test("V40.9 is rendering-only and protects the phone control corridor in WebGL, Canvas and CSS", () => {
  const runtime = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  const webgl = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  const canvas = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");
  assert.doesNotMatch(runtime, /V409PhoneClarity/);
  assert.match(webgl, /skyDancerArcadeV409PhoneClarity/);
  assert.match(webgl, /v409Clarity\.primaryLocks/);
  assert.match(webgl, /v409Clarity\.secondaryLockScale/);
  assert.match(canvas, /v409PrimaryLockIds/);
  assert.match(canvas, /v409Clarity\.canvasLockLimit/);
  assert.match(css, /V40\.9 Phone Clarity Pass/);
  assert.match(css, /orientation:landscape/);
  assert.match(css, /\.bottomHud\{left:50%;right:auto/);
  assert.match(css, /\.combatReadout\{display:none/);
  assert.match(css, /\.stage\[data-v407-focus=\"critical\"\] \.chain/);
});
