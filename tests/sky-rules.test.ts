import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { CartArenaSession } from "../src/cart/CartArenaSession";
import {
  SKY_DANCER_ENEMY_PREFERRED_STANDOFF,
  skyDancerAvoidanceHeading,
  skyDancerEnemySafetyRadius,
  skyDancerNormalizeAngle,
} from "../src/sky/SkyDancerFlightAvoidanceMath";

const FIXED_STEP = 1 / 60;
const DRIVE_INPUT = { throttle: 0.84, brake: 0, steer: 0, boost: false } as const;

test("Sky Dancer starts from the Cart Rogue arena contract", () => {
  const session = new CartArenaSession();
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeId, "arena-01");
  assert.equal(snapshot.gas, 1);
  assert.equal(snapshot.boostCharges, 2);
  assert.ok(snapshot.enemiesTotal > 0);
  assert.ok(snapshot.obstacles.length > 0);
});

test("the original arcade steering and forward drive remain active", () => {
  const session = new CartArenaSession();
  const before = session.snapshot();
  for (let index = 0; index < 10; index += 1) session.advance(FIXED_STEP, { ...DRIVE_INPUT, steer: 1 });
  const after = session.snapshot();
  assert.notEqual(after.x, before.x);
  assert.ok(after.speed > 0);
});

test("BRAKE and TURBO use the same input contract as Cart Rogue", () => {
  const session = new CartArenaSession();
  session.advance(FIXED_STEP, { ...DRIVE_INPUT, boost: true });
  assert.equal(session.snapshot().boostActive, true);
  for (let index = 0; index < 150; index += 1) session.advance(FIXED_STEP, { throttle: 0, brake: 1, steer: 0, boost: false });
  assert.equal(session.snapshot().boostActive, false);
  assert.ok(session.snapshot().gas <= 1);
});

test("the first airborne conversion keeps the route graph and enemy targets intact", () => {
  const session = new CartArenaSession();
  for (let index = 0; index < 30; index += 1) session.advance(FIXED_STEP, DRIVE_INPUT);
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeKind, "arena");
  assert.ok(snapshot.enemies.some((enemy) => enemy.kind === "blocker" || enemy.kind === "chaser"));
});

test("aircraft exhaust geometry points backward on the -Z flight axis", () => {
  const geometry = new THREE.ConeGeometry(0.22, 1.7, 10, 1, true);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  assert.ok(bounds);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const epsilon = 0.002;
  let rearRadius = 0;
  let frontRadius = 0;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const radius = Math.hypot(x, y);
    if (Math.abs(z - bounds.min.z) < epsilon) rearRadius = Math.max(rearRadius, radius);
    if (Math.abs(z - bounds.max.z) < epsilon) frontRadius = Math.max(frontRadius, radius);
  }
  assert.ok(frontRadius > 0.18);
  assert.ok(rearRadius < frontRadius * 0.25);
});

test("WebGL air combat FX records wing and missile trails in world space", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV2.ts", import.meta.url), "utf8");
  assert.match(source, /class WorldRibbonTrail/);
  assert.match(source, /localToWorld\(new THREE\.Vector3\(-state\.wingSpan/);
  assert.match(source, /localToWorld\(new THREE\.Vector3\(state\.wingSpan/);
  assert.match(source, /sky-dancer-missile-smoke-\$\{missile\.id\}/);
  assert.match(source, /geometry\.rotateX\(-Math\.PI \/ 2\)/);
  assert.match(source, /flame\.mesh\.scale\.z = flame\.baseLength/);
});

test("Canvas fallback stores historical world positions instead of fighter-attached vapor sticks", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerCanvasPreviewV2.ts", import.meta.url), "utf8");
  assert.match(source, /interface TrailPoint/);
  assert.match(source, /localPoint\(x, z, heading, -wingSpan, -0\.58\)/);
  assert.match(source, /trail\.points\.push\(\{ x: missile\.x, z: missile\.z, age: 0 \}\)/);
  assert.match(source, /drawAircraftTrails/);
  assert.match(source, /drawMissileTrails/);
});

test("V3 corrects nozzle discs and adds altitude scale cues", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV3.ts", import.meta.url), "utf8");
  assert.match(source, /object\.geometry\.type !== "CircleGeometry"/);
  assert.match(source, /object\.geometry\.rotateX\(-Math\.PI \/ 2\)/);
  assert.match(source, /inheritedGlow\.visible = false/);
  assert.match(source, /sky-dancer-ground-road-network-v3/);
  assert.match(source, /sky-dancer-distant-city-v3/);
});

test("enemy guidance keeps missile alignment but breaks away before contact", () => {
  const safety = skyDancerEnemySafetyRadius(1.75);
  assert.ok(safety > 5.5);
  assert.ok(SKY_DANCER_ENEMY_PREFERRED_STANDOFF > safety);

  const direct = 0;
  const close = skyDancerAvoidanceHeading(0, 0, 0, 5, 0, 5, 1);
  assert.ok(Math.abs(skyDancerNormalizeAngle(close - direct)) > 2.4, "close fighter should peel away from the player");

  const missileZone = skyDancerAvoidanceHeading(0, 0, 0, 14, 0, 14, 1);
  assert.ok(Math.abs(skyDancerNormalizeAngle(missileZone - direct)) <= 0.58, "missile-zone crank should keep firing alignment");

  const runtime = readFileSync(new URL("../src/sky/SkyDancerFlightAvoidance.ts", import.meta.url), "utf8");
  assert.match(runtime, /predictedDistance < safetyRadius \+ 2\.4/);
  assert.match(runtime, /if \(distance < safetyRadius\)/);
  assert.match(runtime, /applyCollisionAvoidance\(this as unknown as AvoidanceSessionView, delta\)/);
});

test("V7 increases fighter bank and lowers presentation altitude", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV7.ts", import.meta.url), "utf8");
  assert.match(source, /SKY_DANCER_PRESENTATION_ALTITUDE_METERS = 105/);
  assert.match(source, /targetPlayerBank/);
  assert.match(source, /-0\.82, 0\.82/);
  assert.match(source, /targetBank.*-0\.86, 0\.86/);
  assert.match(source, /cameraFlightRoll/);
  assert.match(source, /LOW_ALTITUDE_GROUND_SHIFT = 12/);
});

test("V8 removes residual scene-level player-underfoot radial rings", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV8.ts", import.meta.url), "utf8");
  assert.match(source, /geometryType !== "TorusGeometry" && geometryType !== "RingGeometry"/);
  assert.match(source, /dx \* dx \+ dz \* dz > 5\.2 \* 5\.2/);
  assert.match(source, /sky-dancer-air-gate-/);
  assert.match(source, /object\.visible = false/);
});
