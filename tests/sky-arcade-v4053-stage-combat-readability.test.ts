import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V4053_STAGE_READABILITY,
  skyDancerArcadeV4053VolcanoContact,
} from "../src/sky/arcade/SkyDancerArcadeV4053StageCombatReadability";

test("V40.53 opens the Storm foreground corridor", () => {
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.stormNearPassClearance >= 44);
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.stormPressureShipX >= 34);
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.stormPressureDeckWidth <= 28);
});

test("V40.53 narrows and calms the Volcano route ribbon", () => {
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.volcanoRibbonOuterWidth < 19);
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.volcanoRibbonCoreWidth < 10);
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.volcanoRibbonOuterOpacity < .62);
  assert.ok(SKY_DANCER_ARCADE_V4053_STAGE_READABILITY.volcanoRibbonCoreOpacity < .92);
});

test("V40.53 Volcano contact lights strengthen toward close combat", () => {
  const far = skyDancerArcadeV4053VolcanoContact({ depth: 60, priority: false, incomingThreat: false });
  const close = skyDancerArcadeV4053VolcanoContact({ depth: 14, priority: false, incomingThreat: false });
  assert.equal(far.visible, true);
  assert.equal(close.visible, true);
  assert.ok(close.opacity > far.opacity);
  assert.ok(close.pointSize > far.pointSize);
});

test("V40.53 priority and firing contacts get a bounded cool separation cue", () => {
  const base = skyDancerArcadeV4053VolcanoContact({ depth: 24, priority: false, incomingThreat: false });
  const priority = skyDancerArcadeV4053VolcanoContact({ depth: 24, priority: true, incomingThreat: false });
  const firing = skyDancerArcadeV4053VolcanoContact({ depth: 24, priority: true, incomingThreat: true });
  assert.ok(priority.opacity > base.opacity);
  assert.ok(firing.opacity > priority.opacity);
  assert.ok(firing.pointSize > priority.pointSize);
  assert.ok(firing.pointSize < 7);
});

test("V40.53 contact lights disappear outside useful combat depth", () => {
  assert.equal(skyDancerArcadeV4053VolcanoContact({ depth: 3, priority: true, incomingThreat: true }).visible, false);
  assert.equal(skyDancerArcadeV4053VolcanoContact({ depth: 80, priority: true, incomingThreat: true }).visible, false);
});

test("V40.53 Reference World side-biases Volcano vents and Storm carrier pressure", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /volcanoPlumeClearance/);
  assert.match(source, /for\(let i=0;i<2;i\+\+\)/);
  assert.match(source, /stormPressureShipX/);
  assert.match(source, /stormPressureDeckWidth/);
  assert.match(source, /volcanoRibbonOuterWidth/);
  assert.match(source, /volcanoRibbonCoreWidth/);
});

test("V40.53 WebGL renderer adds physical cool contact lights only to Volcano normal enemies", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /snapshot\.stage\.id === "volcano-core" && !enemy\.boss/);
  assert.match(source, /arcade-v4053-volcano-contact-lights/);
  assert.match(source, /sizeAttenuation: false/);
  assert.match(source, /skyDancerArcadeV4053VolcanoContact/);
  assert.doesNotMatch(source, /arcade-v4053-volcano-contact-ring/);
});
