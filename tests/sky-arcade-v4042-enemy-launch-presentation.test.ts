import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.42 hostile projectile snapshot retains its firing craft identity", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4042 });
  const id = runtime.spawnEnemyProjectileForTests(0, 0, 24, .6, 24, "seeker", 0, 77);
  const projectile = runtime.getSnapshot().projectiles.find((candidate) => candidate.id === id);
  assert.ok(projectile);
  assert.equal(projectile.sourceEnemyId, 77);
  assert.equal(projectile.projectileClass, "seeker");
});

test("V40.42 WebGL binds charge, muzzle flash and launch-origin interpolation to the firing craft", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /arcade-enemy-muzzle-v4042/);
  assert.match(source, /arcade-enemy-muzzle-charge-v4042/);
  assert.match(source, /arcade-enemy-muzzle-flash-v4042/);
  assert.match(source, /hostileLaunchHardpointV4042/);
  assert.match(source, /visualParent\.localToWorld\(this\.v4042MuzzleWorld\)/);
  assert.match(source, /mesh\.position\.lerpVectors\(this\.v4042MuzzleLocal, this\.v4042ProjectileNatural, launchEase\)/);
  assert.match(source, /1\.52 - launchEase \* \.52/);
});

test("V40.42 Canvas fallback shows source charge and a bounded launch bridge", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /sourceEnemyV4042/);
  assert.match(source, /createRadialGradient/);
  assert.match(source, /globalCompositeOperation = "lighter"/);
  assert.match(source, /launchFlash/);
  assert.match(source, /projectile\.flightAge \?\? 1\) < \.15/);
});
