import assert from "node:assert/strict";
import test from "node:test";
import { FIXED_STEP, SkySimulation } from "../src/sky/SkySimulation";

test("Sky Simulation stays ready until the player starts the flight", () => {
  const simulation = new SkySimulation();
  simulation.step(FIXED_STEP * 30);
  assert.equal(simulation.phase, "ready");
  assert.equal(simulation.score, 0);
  assert.equal(simulation.shots, 0);
});

test("aircraft movement is bounded and uses the fixed-step loop", () => {
  const simulation = new SkySimulation();
  simulation.start();
  simulation.setMove(4, -4);
  for (let index = 0; index < 180; index += 1) simulation.step(FIXED_STEP);
  assert.ok(simulation.plane.x <= 10 && simulation.plane.x >= -10);
  assert.ok(simulation.plane.y <= 11.5 && simulation.plane.y >= 3.2);
  assert.ok(simulation.plane.x > 5);
  assert.ok(simulation.plane.y < 6.5);
});

test("holding fire emits bounded forward bullets", () => {
  const simulation = new SkySimulation();
  simulation.start();
  simulation.setFire(true);
  for (let index = 0; index < 30; index += 1) simulation.step(FIXED_STEP);
  assert.ok(simulation.shots >= 2);
  assert.ok(simulation.bullets.length > 0);
  assert.ok(simulation.bullets.every((bullet) => bullet.z < 0));
});

test("a bullet destroys a drone and increases score", () => {
  const simulation = new SkySimulation();
  simulation.start();
  simulation.enemies.push({ id: 900, x: 0, y: simulation.plane.y, z: -3, phase: 0 });
  simulation.setFire(true);
  for (let index = 0; index < 20; index += 1) simulation.step(FIXED_STEP);
  assert.ok(simulation.hits >= 1);
  assert.ok(simulation.score >= 25);
});

test("a drone crossing the player damages the airframe", () => {
  const simulation = new SkySimulation();
  simulation.start();
  simulation.enemies.push({ id: 901, x: 0, y: simulation.plane.y, z: 4.4, phase: 0 });
  simulation.step(FIXED_STEP);
  assert.equal(simulation.hull, simulation.maxHull - 1);
  assert.equal(simulation.phase, "running");
});
