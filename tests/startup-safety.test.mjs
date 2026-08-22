import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Sky Dancer has a WebGL renderer, Canvas fallback, and shared factory", async () => {
  const webgl = await readFile(new URL("../src/sky/SkyWebGLDemo.ts", import.meta.url), "utf8");
  const canvas = await readFile(new URL("../src/sky/SkyCanvasPreview.ts", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../src/sky/SkyRenderer.ts", import.meta.url), "utf8");
  assert.match(webgl, /new THREE\.WebGLRenderer/);
  assert.match(webgl, /setPixelRatio/);
  assert.match(webgl, /requestAnimationFrame/);
  assert.match(canvas, /CanvasRenderingContext2D/);
  assert.match(canvas, /requestAnimationFrame/);
  assert.match(renderer, /forceCanvas/);
  assert.match(renderer, /createCanvas/);
});

test("Sky Dancer keeps the touch controls multi-pointer safe", async () => {
  const page = await readFile(new URL("../app/SkyDancerGame.tsx", import.meta.url), "utf8");
  assert.match(page, /setPointerCapture/);
  assert.match(page, /onPointerCancel=\{endMove\}/);
  assert.match(page, /onPointerCancel=\{endFire\}/);
  assert.match(page, /firePointerRef/);
  assert.match(page, /movePointerRef/);
});
