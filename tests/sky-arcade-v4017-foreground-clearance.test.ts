import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skyDancerArcadeV4017ForegroundClearance } from "../src/sky/arcade/SkyDancerArcadeV4017ForegroundClearance";

const base = {
  compactLandscape: true,
  focusPressure: .9,
  protectedTarget: false,
  entityId: 12,
  entityX: 0,
  entityY: 0,
  entityDepth: 8,
  focusX: 0,
  focusY: 0,
  focusDepth: 20,
  hasFocusTarget: true,
} as const;

test("V40.17 leaves desktop and protected hero targets on their authored render pose", () => {
  assert.deepEqual(skyDancerArcadeV4017ForegroundClearance({ ...base, compactLandscape: false }), { pressure: 0, offsetX: 0, scale: 1 });
  assert.deepEqual(skyDancerArcadeV4017ForegroundClearance({ ...base, protectedTarget: true }), { pressure: 0, offsetX: 0, scale: 1 });
});

test("V40.17 peels a close incidental aircraft away from the protected sightline", () => {
  const result = skyDancerArcadeV4017ForegroundClearance(base);
  assert.ok(result.pressure > .6);
  assert.ok(Math.abs(result.offsetX) > .3);
  assert.ok(result.scale < 1 && result.scale >= .9);
});

test("V40.17 pushes opposite-side aircraft away from the focus instead of across it", () => {
  const left = skyDancerArcadeV4017ForegroundClearance({ ...base, entityId: 11, entityX: -.12 });
  const right = skyDancerArcadeV4017ForegroundClearance({ ...base, entityId: 12, entityX: .12 });
  assert.ok(left.offsetX < 0);
  assert.ok(right.offsetX > 0);
});

test("V40.17 leaves side-lane and far aircraft effectively alone", () => {
  const side = skyDancerArcadeV4017ForegroundClearance({ ...base, entityX: 2.4 });
  const far = skyDancerArcadeV4017ForegroundClearance({ ...base, entityDepth: 44 });
  assert.equal(side.offsetX, 0);
  assert.equal(far.offsetX, 0);
});

test("V40.17 WebGL wiring is render-only and compounds the existing V40.10 clearance", () => {
  const webgl = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(webgl, /skyDancerArcadeV4017ForegroundClearance/);
  assert.match(webgl, /v4017Clearance\.offsetX \* 8\.4/);
  assert.match(webgl, /v4010Occlusion\.scale \* v4017Clearance\.scale/);
  assert.doesNotMatch(runtime, /V4017ForegroundClearance|v4017Clearance/);
});
