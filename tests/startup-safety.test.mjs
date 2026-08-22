import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Sky Dancer has a WebGL renderer, Canvas fallback, and shared factory", async () => {
  const webgl = await readFile(new URL("../src/sky/SkyDancerWebGLDemo.ts", import.meta.url), "utf8");
  const canvas = await readFile(new URL("../src/sky/SkyDancerCanvasPreview.ts", import.meta.url), "utf8");
  assert.match(webgl, /new THREE\.WebGLRenderer/);
  assert.match(webgl, /setPixelRatio/);
  assert.match(webgl, /requestAnimationFrame/);
  assert.match(webgl, /buildAirWorld/);
  assert.match(webgl, /buildAircraftVisual/);
  assert.match(canvas, /CanvasRenderingContext2D/);
  assert.match(canvas, /requestAnimationFrame/);
  assert.match(canvas, /SkyDancerCanvasPreview/);
});

test("Sky Dancer keeps the touch controls multi-pointer safe", async () => {
  const page = await readFile(new URL("../app/SkyDancerGame.tsx", import.meta.url), "utf8");
  assert.match(page, /setPointerCapture/);
  assert.match(page, /onPointerCancel=\{releaseSteer\}/);
  assert.match(page, /onPointerCancel=\{releaseBoost\}/);
  assert.match(page, /onPointerCancel=\{releaseBrake\}/);
  assert.match(page, /boostPointersRef/);
  assert.match(page, /brakePointersRef/);
  assert.doesNotMatch(page, /FIRE/);
});
