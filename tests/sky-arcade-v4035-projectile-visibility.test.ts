import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("V40.35 hostile projectiles have a dedicated WebGL glow, bright core and trail", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /arcade-enemy-projectile-glow-v4035/);
  assert.match(source, /arcade-enemy-projectile-core-v4035/);
  assert.match(source, /arcade-enemy-projectile-trail-v4035/);
  assert.match(source, /depthTest: false/);
  assert.match(source, /1\.55 \+ Math\.sin/);
});

test("V40.35 Canvas hostile projectiles keep a large phone-readable footprint", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /const radius = Math\.max\(5, projected\.scale \* 4\.2\)/);
  assert.match(source, /trailLength/);
  assert.match(source, /#fff2d8/);
  assert.match(source, /projectile\.depth < 14/);
});
