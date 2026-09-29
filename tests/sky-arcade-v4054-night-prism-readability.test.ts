import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V4054_NIGHT_PRISM,
  skyDancerArcadeV4054NightCityLaneX,
  skyDancerArcadeV4054PrismBastionX,
} from "../src/sky/arcade/SkyDancerArcadeV4054NightPrismReadability";

test("V40.54 pushes Night Metro decorative mass outside the old phone corridor", () => {
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.nightNearPassClearance >= 44);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.nightCityInnerLaneX >= 43);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.nightLeadRailX >= 28);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.nightLeadCanopyX >= 34);
});

test("V40.54 Night Metro city lane helper preserves lane ordering", () => {
  const inner = skyDancerArcadeV4054NightCityLaneX(0, 0);
  const next = skyDancerArcadeV4054NightCityLaneX(1, 0);
  const jittered = skyDancerArcadeV4054NightCityLaneX(0, 3.5);
  assert.equal(inner, SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.nightCityInnerLaneX);
  assert.ok(next > inner);
  assert.ok(jittered > inner);
});

test("V40.54 opens Prism Citadel bastions and close-pass prisms", () => {
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismNearPassClearance >= 42);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismBastionBaseX >= 44);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismTerraceX >= 41);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismBladeBaseX >= 33);
  assert.ok(SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismCrownX >= 27);
});

test("V40.54 Prism bastion helper keeps deterministic tier spacing", () => {
  assert.equal(skyDancerArcadeV4054PrismBastionX(0), SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismBastionBaseX);
  assert.equal(skyDancerArcadeV4054PrismBastionX(1) - skyDancerArcadeV4054PrismBastionX(0), 3.5);
  assert.equal(skyDancerArcadeV4054PrismBastionX(3), SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismBastionBaseX);
});

test("V40.54 Reference World applies Night and Prism presentation-only clearances", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /nightNearPassClearance/);
  assert.match(source, /skyDancerArcadeV4054NightCityLaneX/);
  assert.match(source, /nightLeadRailX/);
  assert.match(source, /nightLeadCanopyX/);
  assert.match(source, /skyDancerArcadeV4054PrismBastionX/);
  assert.match(source, /prismTerraceX/);
  assert.match(source, /prismBladeBaseX/);
  assert.match(source, /prismCrownX/);
});

test("V40.54 leaves World Break Prism gameplay presentation code untouched", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /syncWorldBreakPrismReprise/);
  assert.match(source, /arcade-world-break-prism-outer/);
  assert.match(source, /snapshot\.worldBreakPrismRadius/);
});
