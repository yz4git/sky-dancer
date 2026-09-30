import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V4055_RUINS_DESERT,
  skyDancerArcadeV4055RuinsIslandProfile,
} from "../src/sky/arcade/SkyDancerArcadeV4055RuinsDesertReadability";

test("V40.55 moves Floating Ruins islands outside the old central corridor", () => {
  const hero = skyDancerArcadeV4055RuinsIslandProfile(true);
  const far = skyDancerArcadeV4055RuinsIslandProfile(false);
  assert.ok(hero.x - hero.radius >= 18);
  assert.ok(far.x - far.radius >= 30);
  assert.ok(SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsNearPassClearance >= 47);
});

test("V40.55 shortens the Ruins causeway reach", () => {
  const hero = skyDancerArcadeV4055RuinsIslandProfile(true);
  const far = skyDancerArcadeV4055RuinsIslandProfile(false);
  assert.ok(hero.bridgeX - hero.bridgeWidth / 2 >= 18);
  assert.ok(far.bridgeX - far.bridgeWidth / 2 >= 28);
  assert.ok(SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsFragmentX >= 22);
});

test("V40.55 opens Desert Fortress breach-side scenery", () => {
  const p = SKY_DANCER_ARCADE_V4055_RUINS_DESERT;
  assert.ok(p.desertNearPassClearance >= 42);
  assert.ok(p.desertBreachWallX - p.desertBreachWallWidth / 2 >= 22);
  assert.ok(p.desertBreachRampX - p.desertBreachRampWidth / 2 >= 18);
});

test("V40.55 splits the distant Desert keep into a readable gate", () => {
  const p = SKY_DANCER_ARCADE_V4055_RUINS_DESERT;
  const innerEdge = p.desertKeepHalfX - p.desertKeepHalfWidth / 2;
  assert.ok(innerEdge >= 4);
  assert.ok(p.desertKeepHalfWidth < 20);
});

test("V40.55 Reference World applies Ruins and Desert composition profiles", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"), "utf8");
  assert.match(source, /ruinsNearPassClearance/);
  assert.match(source, /desertNearPassClearance/);
  assert.match(source, /skyDancerArcadeV4055RuinsIslandProfile/);
  assert.match(source, /ruinsFragmentX/);
  assert.match(source, /desertBreachWallX/);
  assert.match(source, /desertBreachRampX/);
  assert.match(source, /desertKeepHalfX/);
});

test("V40.55 changes presentation geometry without adding gameplay hooks", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeV4055RuinsDesertReadability.ts"), "utf8");
  assert.doesNotMatch(source, /damage|collision|hazard|projectile|enemyAI|courseSpeed/i);
});
