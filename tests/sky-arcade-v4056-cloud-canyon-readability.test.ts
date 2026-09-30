import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V4056_CLOUD_CANYON,
  skyDancerArcadeV4056CloudShipX,
  skyDancerArcadeV4056CanyonChunkX,
} from "../src/sky/arcade/SkyDancerArcadeV4056CloudCanyonReadability";

test("V40.56 moves Cloud Fleet lead hulls out of the old phone corridor", () => {
  const p = SKY_DANCER_ARCADE_V4056_CLOUD_CANYON;
  assert.ok(p.cloudLeadShipX >= 35);
  assert.ok(p.cloudNearPassClearance >= 44);
  assert.ok(p.cloudLeadShipX - p.cloudLeadDeckWidth / 2 >= 25);
  assert.ok(p.cloudLeadDeckWidth < 25);
});

test("V40.56 keeps the far fleet layer farther than the pressure ship", () => {
  const lead = skyDancerArcadeV4056CloudShipX(true);
  const far = skyDancerArcadeV4056CloudShipX(false);
  assert.ok(far > lead);
  assert.equal(lead, SKY_DANCER_ARCADE_V4056_CLOUD_CANYON.cloudLeadShipX);
});

test("V40.56 gives Red Canyon a wider visual-only near-pass corridor", () => {
  const p = SKY_DANCER_ARCADE_V4056_CLOUD_CANYON;
  assert.ok(p.canyonNearPassClearance >= 47);
  assert.ok(p.canyonChunkWallClearance >= 47);
  assert.ok(p.canyonInnerBaseRadiusMax < 10);
});

test("V40.56 Canyon chunk helper preserves alternating outer wall depth", () => {
  const inner = Math.abs(skyDancerArcadeV4056CanyonChunkX(1, false));
  const outer = Math.abs(skyDancerArcadeV4056CanyonChunkX(-1, true));
  assert.equal(inner, SKY_DANCER_ARCADE_V4056_CLOUD_CANYON.canyonChunkWallClearance);
  assert.equal(outer - inner, 30);
});

test("V40.56 Reference World applies Cloud and Canyon readability profiles", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /cloudNearPassClearance/);
  assert.match(source, /canyonNearPassClearance/);
  assert.match(source, /skyDancerArcadeV4056CloudShipX/);
  assert.match(source, /skyDancerArcadeV4056CanyonChunkX/);
  assert.match(source, /cloudLeadDeckWidth/);
  assert.match(source, /canyonInnerBaseRadiusMax/);
});

test("V40.56 remains presentation-only", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeV4056CloudCanyonReadability.ts"), "utf8");
  assert.doesNotMatch(source, /damage|collision|projectile|courseSpeed|waveInterval|enemyAI/i);
});
