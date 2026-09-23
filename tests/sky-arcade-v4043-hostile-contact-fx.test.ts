import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.43 records a committed hostile near-miss without changing the projectile hit radius", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4043 });
  runtime.setMove(1, 0);
  runtime.spawnEnemyProjectileForTests(.65, 0, 2.1, 0, 24, "seeker", 0, 41);
  runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.hostileContact?.kind, "near-miss");
  assert.equal(snapshot.hostileContact?.projectileClass, "seeker");
  assert.equal(snapshot.hostileContact?.committed, true);
  assert.ok(Math.abs(snapshot.hostileContact?.offsetX ?? 0) > .3);
  assert.equal(snapshot.playerHp, snapshot.playerMaxHp);
});

test("V40.43 records the impact side for a real hostile hit", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4044 });
  runtime.spawnEnemyProjectileForTests(.12, .04, 2.1, 0, 24, "heavy", 0, 42);
  runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.hostileContact?.kind, "hit");
  assert.equal(snapshot.hostileContact?.projectileClass, "heavy");
  assert.equal(snapshot.hostileContact?.committed, false);
  assert.ok((snapshot.hostileContact?.serial ?? 0) > 0);
  assert.ok(snapshot.playerHp < snapshot.playerMaxHp);
});

test("V40.43 WebGL renders bounded pressure wake and directional impact sparks", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /arcade-hostile-contact-pressure-ring-v4043/);
  assert.match(source, /arcade-hostile-contact-impact-arc-v4043/);
  assert.match(source, /arcade-hostile-contact-wake-v4043/);
  assert.match(source, /arcade-hostile-contact-spark-v4043/);
  assert.match(source, /snapshot\.runTimeSeconds - event\.runTimeSeconds/);
  assert.match(source, /event\.offsetX \* 3\.15/);
  assert.match(source, /for \(const mesh of this\.projectileMeshes\.values\(\)\) this\.disposeObject\(mesh\)/);
});

test("V40.43 Canvas fallback mirrors the pressure wave and directional hit arc", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  assert.match(source, /drawHostileContactFxV4043/);
  assert.match(source, /globalCompositeOperation = "lighter"/);
  assert.match(source, /wakeGradient/);
  assert.match(source, /sideAngle - \.76, sideAngle \+ \.76/);
});
