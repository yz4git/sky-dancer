import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { skyDancerArcadeCinematicTargetSizeV22 } from "../src/sky/arcade/SkyDancerArcadeCinematicRenderer";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

test("V22 keeps compact landscape post buffers below full iPhone DPR", () => {
  const size = skyDancerArcadeCinematicTargetSizeV22(844, 390, 3);
  assert.equal(size.compactLandscape, true);
  assert.equal(size.pixelRatio, 1.3);
  assert.equal(size.width, 1097);
  assert.equal(size.height, 507);
});

test("V22 rounds subpixel viewport jitter onto one backing-store size", () => {
  const a = skyDancerArcadeCinematicTargetSizeV22(844.1, 389.9, 1.6);
  const b = skyDancerArcadeCinematicTargetSizeV22(843.9, 390.1, 1.6);
  assert.deepEqual(a, b);
});

test("V22 preserves the larger-display quality ceiling", () => {
  const size = skyDancerArcadeCinematicTargetSizeV22(1440, 900, 2);
  assert.equal(size.compactLandscape, false);
  assert.equal(size.pixelRatio, 1.6);
  assert.equal(size.width, 2304);
  assert.equal(size.height, 1440);
});

test("V22 pins the Arcade Run stage to stable svh instead of dynamic browser chrome height", () => {
  const css = readFileSync(resolve(repoRoot, "app/globals.css"), "utf8");
  const stabilityBlock = css.slice(css.indexOf("V22 iPhone render stability"), css.indexOf("V15 phone playcheck"));
  assert.match(stabilityBlock, /section\[aria-label="Sky Dancer Arcade Run"\]/);
  assert.match(stabilityBlock, /height:\s*100svh\s*!important/);
  assert.doesNotMatch(stabilityBlock, /100dvh/);
  assert.match(stabilityBlock, /background:\s*#071323/);
});

test("V22 WebGL resize path coalesces callbacks and refuses to clear the same backing store", () => {
  const source = readFileSync(resolve(repoRoot, "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /new ResizeObserver\(\(\) => this\.scheduleResize\(\)\)/);
  assert.match(source, /if \(!force && width === this\.renderWidth && height === this\.renderHeight\) return;/);
  assert.match(source, /if \(width < 64 \|\| height < 64\) return;/);
  assert.match(source, /webglcontextlost/);
  assert.match(source, /webglcontextrestored/);
});
