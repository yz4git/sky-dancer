import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SkyDancerArcadeStageId } from "../src/sky/arcade/SkyDancerArcadeData";
import { skyDancerArcadeV4020WeakpointContrast } from "../src/sky/arcade/SkyDancerArcadeV4020WeakpointContrast";

const stageIds: SkyDancerArcadeStageId[] = [
  "dawn-city", "red-canyon", "cloud-fleet", "storm-carrier", "desert-fortress", "ice-cavern",
  "floating-ruins", "night-metro", "volcano-core", "orbital-ascent", "prism-citadel",
];

const profile = (stageId: SkyDancerArcadeStageId, weakpointOpen: boolean, compactLandscape = true) =>
  skyDancerArcadeV4020WeakpointContrast({ stageId, compactLandscape, weakpointOpen, bossPhase: 2, hpRatio: .55 });

test("V40.20 gives every stage a valid authored OPEN weakpoint contrast", () => {
  for (const stageId of stageIds) {
    const open = profile(stageId, true);
    const closed = profile(stageId, false);
    assert.notEqual(open.coreColor, closed.coreColor);
    assert.ok(open.coreOpacity > closed.coreOpacity);
    assert.ok(open.outlineOpacity > closed.outlineOpacity + .45);
    assert.ok(open.canvasRadius > closed.canvasRadius + .3);
    assert.ok(open.coreColor >= 0 && open.coreColor <= 0xffffff);
    assert.ok(open.outlineColor >= 0 && open.outlineColor <= 0xffffff);
  }
});

test("V40.20 uses deliberately different contrast families for storm, volcano and prism", () => {
  const storm = profile("storm-carrier", true);
  const volcano = profile("volcano-core", true);
  const prism = profile("prism-citadel", true);
  assert.equal(storm.coreColor, 0xffe970);
  assert.equal(volcano.coreColor, 0x78f6ff);
  assert.equal(prism.coreColor, 0xcaff61);
  assert.notEqual(storm.coreColor, volcano.coreColor);
  assert.notEqual(volcano.coreColor, prism.coreColor);
});

test("V40.20 gives compact landscape a stronger but bounded outline", () => {
  const phone = profile("volcano-core", true, true);
  const desktop = profile("volcano-core", true, false);
  assert.ok(phone.outlineOpacity > desktop.outlineOpacity);
  assert.ok(phone.outlineScale > desktop.outlineScale);
  assert.ok(phone.outlineOpacity <= .9);
  assert.ok(phone.outlineScale < 1.4);
  assert.ok(phone.canvasRadius < 1.5);
});

test("V40.20 is presentation-only and isolates the carrier weakpoint material", () => {
  const models = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeModels.ts"), "utf8");
  const runtime = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.match(models, /skyDancerArcadeV4020WeakpointContrast/);
  assert.match(models, /arcade-v4020-weakpoint-outline/);
  assert.match(models, /weakPoint\.material = coreMaterial/);
  assert.match(models, /weakPoint\.scale\.x > 1\.12/);
  assert.match(models, /arcadeV4020LogicalCollisionUnchanged/);
  assert.doesNotMatch(runtime, /V4020WeakpointContrast|v4020-weakpoint/);
});
