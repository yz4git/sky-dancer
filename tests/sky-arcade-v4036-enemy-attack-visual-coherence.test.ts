import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("V40.36 WebGL hostile shots point at their locked solution and trail behind the projectile", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /projectile\.warningTargetX \?\? snapshot\.playerX/);
  assert.match(source, /mesh\.lookAt\(/);
  assert.match(source, /trail\.position\.z = -1\.2/);
  assert.match(source, /depthTest: true/);
  assert.match(source, /1\.22 \+ Math\.sin/);
});

test("V40.36 Canvas hostile shots use the locked solution and a fading directional streak", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /const targetPoint = this\.project/);
  assert.match(source, /projectile\.warningTargetX \?\? snapshot\.playerX/);
  assert.match(source, /createLinearGradient/);
  assert.match(source, /trailGradient\.addColorStop\(1, "rgba\(255,106,50,0\)"\)/);
  assert.match(source, /const danger = projectile\.depth < 9/);
});
