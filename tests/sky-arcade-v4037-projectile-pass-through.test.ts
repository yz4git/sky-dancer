import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("V40.37 WebGL hostile shots do not cross behind the near clip plane before fading", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /const hostileExitFade = projectile\.owner === "enemy"/);
  assert.match(source, /Math\.max\(\.58, projectile\.depth\)/);
  assert.match(source, /\.98 \* hostileExitFade/);
  assert.match(source, /\.18 \* hostileExitFade/);
  assert.match(source, /\.94 \* hostileExitFade/);
  assert.match(source, /\.38 \* hostileExitFade/);
});

test("V40.37 Canvas hostile shots use the same near-pass fade instead of popping", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /const hostileExitFade = projectile\.owner === "enemy"/);
  assert.match(source, /Math\.max\(\.58, projectile\.depth\)/);
  assert.match(source, /context\.globalAlpha \*= hostileExitFade/);
});
