import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Sky Dancer uses the Cart WebGL renderer with Sky presentation and Canvas fallback", async () => {
  const skyWebgl = await readFile(new URL("../src/sky/SkyDancerWebGLDemo.ts", import.meta.url), "utf8");
  const cartWebgl = await readFile(new URL("../src/cart/CartRogueWebGLDemo.ts", import.meta.url), "utf8");
  const canvasEntry = await readFile(new URL("../src/sky/SkyDancerCanvasPreview.ts", import.meta.url), "utf8");
  const canvasV2 = await readFile(new URL("../src/sky/SkyDancerCanvasPreviewV2.ts", import.meta.url), "utf8");
  const cartCanvas = await readFile(new URL("../src/cart/CartRogueCanvasPreview.ts", import.meta.url), "utf8");
  const game = await readFile(new URL("../app/CartRogueGame.tsx", import.meta.url), "utf8");

  assert.match(skyWebgl, /extends CartRogueWebGLDemo/);
  assert.match(skyWebgl, /SkyDancerAirCombatFx/);
  assert.match(skyWebgl, /Sky Dancer WebGL game view/);
  assert.match(cartWebgl, /new THREE\.WebGLRenderer/);
  assert.match(cartWebgl, /setPixelRatio/);
  assert.match(cartWebgl, /requestAnimationFrame/);

  assert.match(canvasEntry, /SkyDancerCanvasPreviewV2/);
  assert.match(canvasV2, /extends CartRogueCanvasPreview/);
  assert.match(cartCanvas, /CanvasRenderingContext2D/);
  assert.match(cartCanvas, /requestAnimationFrame/);

  assert.match(game, /new SkyDancerWebGLDemo/);
  assert.match(game, /new SkyDancerCanvasPreview/);
  assert.match(game, /probe\.getContext\("webgl2"\) \|\| probe\.getContext\("webgl"\)/);
  assert.match(game, /WebGL runtime failure/);
});

test("Sky Dancer keeps the active Cart-based touch controls multi-pointer safe", async () => {
  const page = await readFile(new URL("../app/CartRogueGame.tsx", import.meta.url), "utf8");
  assert.match(page, /setPointerCapture/);
  assert.match(page, /onPointerCancel=\{releaseSteer\}/);
  assert.match(page, /onPointerCancel=\{releaseBoost\}/);
  assert.match(page, /onPointerCancel=\{releaseBrake\}/);
  assert.match(page, /boostPointersRef/);
  assert.match(page, /brakePointersRef/);
  assert.doesNotMatch(page, />FIRE</);
});
