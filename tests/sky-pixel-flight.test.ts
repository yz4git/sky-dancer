import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PIXEL_RUN_SECONDS, PIXEL_WORLD_SIZE, createPixelWorld, createPixelFlightRun,
  pixelWorldDelta, samplePixelTerrain, stepPixelFlight, terrainIndex,
} from "../src/sky/pixel/SkyDancerPixelFlightCore";

test("procedural island terrain is deterministic, tiled and bounded", () => {
  const a = createPixelWorld(812), b = createPixelWorld(812);
  assert.equal(a.heights.length, PIXEL_WORLD_SIZE ** 2);
  assert.deepEqual(a.heights, b.heights);
  for (const [x, y] of [[0, 0], [32, 96], [129, 217], [-21, 301]]) {
    assert.equal(samplePixelTerrain(a, x, y), samplePixelTerrain(a, x + 256, y - 256));
    assert.ok(samplePixelTerrain(a, x, y) >= 11);
    assert.ok(samplePixelTerrain(a, x, y) <= 88);
  }
  assert.equal(terrainIndex(a, 256, 256), terrainIndex(a, 0, 0));
});
test("wrapping shortest distances cross map borders correctly", () => {
  assert.equal(pixelWorldDelta(250, 4), 10);
  assert.equal(pixelWorldDelta(4, 250), -10);
  assert.equal(pixelWorldDelta(8, 10), 2);
});
test("flight steers, climbs and boosts without going outside the world", () => {
  const world = createPixelWorld(41), state = createPixelFlightRun(world, 9);
  const initial = state.heading;
  for (let i = 0; i < 120; i++) stepPixelFlight(world, state, { x: 1, y: 1, boost: true }, 1 / 60);
  assert.notEqual(state.heading, initial);
  assert.ok(state.z >= 14 && state.z <= 112);
  assert.ok(state.x >= 0 && state.x < PIXEL_WORLD_SIZE);
  assert.ok(state.y >= 0 && state.y < PIXEL_WORLD_SIZE);
  assert.ok(state.speed > 25);
  assert.ok(state.charge < 1);
});
test("ring captures replenish boost and add combo score", () => {
  const world = createPixelWorld(34), state = createPixelFlightRun(world, 23);
  const gate = state.gates[0];
  gate.x = state.x;
  gate.y = state.y + 1;
  gate.z = state.z;
  const before = state.score;
  stepPixelFlight(world, state, { x: 0, y: 0, boost: true }, 1 / 60);
  assert.equal(state.gatesPassed, 1);
  assert.ok(state.score >= before + 220);
  assert.ok(state.gates[0].id !== gate.id);
});
test("terrain collision has invulnerability and timer ends run", () => {
  const world = createPixelWorld(35), state = createPixelFlightRun(world, 44);
  state.z = samplePixelTerrain(world, state.x, state.y) - 1;
  stepPixelFlight(world, state, { x: 0, y: 0, boost: false }, 0.001);
  assert.equal(state.shield, 2);
  stepPixelFlight(world, state, { x: 0, y: 0, boost: false }, 0.001);
  assert.equal(state.shield, 2);
  state.elapsed = PIXEL_RUN_SECONDS - 0.01;
  stepPixelFlight(world, state, { x: 0, y: 0, boost: false }, 0.05);
  assert.equal(state.finished, true);
  assert.equal(state.elapsed, PIXEL_RUN_SECONDS);
});
