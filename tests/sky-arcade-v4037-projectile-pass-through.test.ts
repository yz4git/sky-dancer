import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("V40.37 WebGL hostile shots stay in front of the near clip plane after the player pass", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /Math\.max\(\.58, projectile\.depth\)/);
});

test("V40.37 Canvas hostile shots mirror the protected near-pass presentation depth", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /Math\.max\(\.58, projectile\.depth\)/);
});
