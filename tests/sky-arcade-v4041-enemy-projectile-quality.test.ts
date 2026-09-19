import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.41 hostile shots accelerate out of launch without changing hit radius", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4041 });
  const id = runtime.spawnEnemyProjectileForTests(.6, .2, 24, 0, 24, "heavy", 0);
  const before = runtime.getSnapshot().projectiles.find((shot) => shot.id === id);
  assert.ok(before);
  assert.equal(before.projectileClass, "heavy");
  assert.equal(before.flightAge, 0);
  assert.ok((before.dangerRadius ?? 0) > 0);

  runtime.step(1 / 60);
  const after = runtime.getSnapshot().projectiles.find((shot) => shot.id === id);
  assert.ok(after);
  assert.ok((after.flightAge ?? 0) > 0);
  // 14.5 units/s full cruise would travel ~0.242 in one 60 Hz step.
  assert.ok(24 - after.depth < .23, "launch frame should still be accelerating");
});

test("V40.41 seeker correction stays far-field and becomes ballistic inside dodge range", () => {
  const far = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4042 });
  const farId = far.spawnEnemyProjectileForTests(0, 0, 30, 0, 24, "seeker", 1.4);
  far.setMove(.9, 0);
  for (let frame = 0; frame < 24; frame += 1) far.step(1 / 60);
  const farShot = far.getSnapshot().projectiles.find((shot) => shot.id === farId);
  assert.ok(farShot);
  assert.ok(farShot.x > .01, "far seeker should make a bounded correction toward live movement");

  const close = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4043 });
  const closeId = close.spawnEnemyProjectileForTests(0, 0, 14.5, 0, 24, "seeker", 1.4);
  close.setMove(.9, 0);
  for (let frame = 0; frame < 18; frame += 1) close.step(1 / 60);
  const closeShot = close.getSnapshot().projectiles.find((shot) => shot.id === closeId);
  assert.ok(closeShot);
  assert.ok(Math.abs(closeShot.x) < .01, "inside 15 depth the shot must stop homing and preserve a readable dodge");
});

test("V40.41 WebGL hostile fire uses class identity, dual trails and an energy ring", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /hostileClass === "seeker"/);
  assert.match(source, /arcade-enemy-projectile-hot-trail-v4041/);
  assert.match(source, /arcade-enemy-projectile-ring-v4041/);
  assert.match(source, /new THREE\.TorusGeometry/);
  assert.match(source, /this\.disposeObject\(mesh\)/);
});

test("V40.41 Canvas fallback preserves projectile class identity and layered motion", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /const hostileClass = projectile\.projectileClass \?\? "bolt"/);
  assert.match(source, /const trailMultiplier = hostileClass === "boss"/);
  assert.match(source, /context\.ellipse\(/);
  assert.match(source, /launchBloom/);
});
