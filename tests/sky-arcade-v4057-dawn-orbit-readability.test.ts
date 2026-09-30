import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V4057_DAWN_ORBIT,
  skyDancerArcadeV4057DawnCityLaneX,
  skyDancerArcadeV4057OrbitFrameOffset,
} from "../src/sky/arcade/SkyDancerArcadeV4057DawnOrbitReadability";

test("V40.57 widens the Dawn City phone corridor", () => {
  const p = SKY_DANCER_ARCADE_V4057_DAWN_ORBIT;
  assert.ok(p.dawnNearPassClearance >= 37);
  assert.ok(p.dawnCityInnerLaneX >= 41);
  assert.ok(skyDancerArcadeV4057DawnCityLaneX(1, 0) > skyDancerArcadeV4057DawnCityLaneX(0, 0));
});

test("V40.57 keeps orbital near-pass pylons outside the old corridor", () => {
  const p = SKY_DANCER_ARCADE_V4057_DAWN_ORBIT;
  assert.ok(p.orbitNearPassClearance >= 48);
  assert.ok(p.orbitSidePylonX >= 46);
  assert.ok(p.orbitSidePanelX - p.orbitSidePanelWidth / 2 >= 56);
});

test("V40.57 reduces the screen-sized orbital frame footprint", () => {
  const p = SKY_DANCER_ARCADE_V4057_DAWN_ORBIT;
  assert.ok(p.orbitFrameRadius < 37.5);
  assert.ok(p.orbitFrameTube < 1.15);
  assert.ok(p.orbitFrameArc < Math.PI);
  assert.ok(p.orbitFrameOffsetX >= 8);
});

test("V40.57 compacts orbital helix cues without changing authored beat count", () => {
  const p = SKY_DANCER_ARCADE_V4057_DAWN_ORBIT;
  assert.equal(p.orbitCueCount, 10);
  assert.ok(p.orbitCueRadius < 29);
  assert.ok(p.orbitCueArcA < Math.PI * .78);
  assert.ok(p.orbitCueArcB < Math.PI * .58);
});

test("V40.57 alternates orbital structural sweeps instead of centering every frame", () => {
  assert.equal(skyDancerArcadeV4057OrbitFrameOffset(0), SKY_DANCER_ARCADE_V4057_DAWN_ORBIT.orbitFrameOffsetX);
  assert.equal(skyDancerArcadeV4057OrbitFrameOffset(1), -SKY_DANCER_ARCADE_V4057_DAWN_ORBIT.orbitFrameOffsetX);
});

test("V40.57 Reference World applies Dawn and Orbit readability profiles", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /dawnNearPassClearance/);
  assert.match(source, /skyDancerArcadeV4057DawnCityLaneX/);
  assert.match(source, /orbitNearPassClearance/);
  assert.match(source, /skyDancerArcadeV4057OrbitFrameOffset/);
  assert.match(source, /orbitCueCount/);
  assert.match(source, /orbitSidePanelX/);
});

test("V40.57 remains presentation-only", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeV4057DawnOrbitReadability.ts"), "utf8");
  assert.doesNotMatch(source, /damage|collision|projectile|courseSpeed|waveInterval|enemyAI/i);
});
