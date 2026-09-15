import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("V40.38 WebGL keeps hostile shots opaque and moves them offscreen before gameplay despawn", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /const hostileExitTravel = projectile\.owner === "enemy"/);
  assert.match(source, /const hostileExitPush = hostileExitTravel \* 2\.6/);
  assert.match(source, /projectile\.x \+ exitUx \* hostileExitPush/);
  assert.match(source, /projectile\.y \+ exitUy \* hostileExitPush/);
  assert.match(source, /mesh\.material\.opacity = warning \? \.5 : \.98/);
  assert.doesNotMatch(source, /hostileExitFade/);
});

test("V40.38 Canvas keeps hostile shots fully visible until their projected path leaves the viewport", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /const hostileExitTravel = projectile\.owner === "enemy"/);
  assert.match(source, /const hostileExitPush = hostileExitTravel \* 2\.6/);
  assert.match(source, /projectile\.x \+ exitUx \* hostileExitPush/);
  assert.match(source, /projectile\.y \+ exitUy \* hostileExitPush/);
  assert.doesNotMatch(source, /hostileExitFade/);
});
