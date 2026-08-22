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

test("WebGL air combat FX records wing and enemy missile trails in world space", () => {
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

test("enemy guidance starts its break-away much farther from the player", () => {
  const safety = skyDancerEnemySafetyRadius(1.75);
  assert.equal(SKY_DANCER_ENEMY_PREFERRED_STANDOFF, 21);
  assert.ok(safety > 5.8);
  assert.ok(SKY_DANCER_ENEMY_PREFERRED_STANDOFF > safety * 2.8);

  const direct = 0;
  const close = skyDancerAvoidanceHeading(0, 0, 0, 12, 0, 12, 1);
  assert.ok(Math.abs(skyDancerNormalizeAngle(close - direct)) > 2.3, "12-unit encounter should already be a peel-away");

  const missileZone = skyDancerAvoidanceHeading(0, 0, 0, 22, 0, 22, 1);
  const crank = Math.abs(skyDancerNormalizeAngle(missileZone - direct));
  assert.ok(crank >= 0.5 && crank <= 0.8, `expected missile-zone crank, got ${crank}`);

  const runtime = readFileSync(new URL("../src/sky/SkyDancerFlightAvoidance.ts", import.meta.url), "utf8");
  assert.match(runtime, /const lookAhead = 0\.95/);
  assert.match(runtime, /predictedDistance < safetyRadius \+ 5\.4/);
  assert.match(runtime, /distance < 34/);
});

test("Turbo hold keeps forward throttle while preserving drift yaw and slip", () => {
  const source = readFileSync(new URL("../src/cart/CartRoguePhase15Turbo.ts", import.meta.url), "utf8");
  assert.match(source, /throttle: input\.throttle/);
  assert.doesNotMatch(source, /Math\.min\(input\.throttle, 0\.24\)/);
  assert.doesNotMatch(source, /const damping = Math\.pow/);
  assert.match(source, /const yawRate =/);
  assert.match(source, /const targetSlip =/);
  assert.match(source, /applyTurboDriftHold/);
  assert.match(source, /applyReleaseDash/);
});

test("player missiles support forward lock homing swept hits and enemy damage", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerPlayerWeapons.ts", import.meta.url), "utf8");
  assert.match(source, /SKY_DANCER_PLAYER_MISSILE_COOLDOWN = 0\.34/);
  assert.match(source, /SKY_DANCER_PLAYER_MISSILE_MAX_ACTIVE = 5/);
  assert.match(source, /SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE = 58/);
  assert.match(source, /function pointSegmentDistanceSquared/);
  assert.match(source, /targetEnemyId/);
  assert.match(source, /requestSkyDancerPlayerMissile/);
  assert.match(source, /hit\.hp = Math\.max\(0, hit\.hp - damage\)/);
  assert.match(source, /hit\.kind === "boss" \? 24 : hit\.kind === "heavy" \? 30 : 38/);
});

test("V7 drives fighter roll from actual turn rate and lowers presentation altitude", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV7.ts", import.meta.url), "utf8");
  assert.match(source, /SKY_DANCER_PRESENTATION_ALTITUDE_METERS = 105/);
  assert.match(source, /previousPlayerHeading/);
  assert.match(source, /turnRate = normalizeAngle/);
  assert.match(source, /turnBank = THREE\.MathUtils\.clamp\(-turnRate \* 0\.78, -0\.98, 0\.98\)/);
  assert.match(source, /targetBank = THREE\.MathUtils\.clamp\(-angularRate \* 0\.68, -0\.98, 0\.98\)/);
  assert.match(source, /LOW_ALTITUDE_GROUND_SHIFT = 12/);
});

test("V8 removes residual scene-level player-underfoot radial rings", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV8.ts", import.meta.url), "utf8");
  assert.match(source, /geometryType !== "TorusGeometry" && geometryType !== "RingGeometry"/);
  assert.match(source, /dx \* dx \+ dz \* dz > 5\.2 \* 5\.2/);
  assert.match(source, /sky-dancer-air-gate-/);
});

test("V9 fills the low-altitude world and replaces the cheap Turbo cone", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV9.ts", import.meta.url), "utf8");
  assert.match(source, /sky-dancer-q9-forest-canopy/);
  assert.match(source, /sky-dancer-q9-settlement-grid/);
  assert.match(source, /sky-dancer-q9-village-roofs/);
  assert.match(source, /sky-dancer-q9-primary-roads/);
  assert.match(source, /sky-dancer-q9-lakes/);
  assert.match(source, /sky-dancer-q9-utility-towers/);
  assert.match(source, /sky-dancer-q9-shock-diamond/);
  assert.match(source, /sky-dancer-q9-exhaust-ring/);
  assert.match(source, /object\.name === "sky-dancer-jet-flame-v2"/);
});

test("V10 renders player missiles and exposes the Shot fire hook", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV10.ts", import.meta.url), "utf8");
  const entry = readFileSync(new URL("../src/sky/SkyDancerAirCombatFx.ts", import.meta.url), "utf8");
  assert.match(source, /__skyDancerFireMissile/);
  assert.match(source, /sky-dancer-q10-player-missiles/);
  assert.match(source, /getSkyDancerPlayerWeaponState/);
  assert.match(source, /requestSkyDancerPlayerMissile/);
  assert.match(entry, /SkyDancerAirCombatFxV10/);
});

test("Canvas V4 exposes Shot firing and draws player missiles", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerCanvasPreviewV4.ts", import.meta.url), "utf8");
  assert.match(source, /__skyDancerFireMissile/);
  assert.match(source, /requestSkyDancerPlayerMissile/);
  assert.match(source, /drawPlayerMissiles/);
  assert.match(source, /globalCompositeOperation = "lighter"/);
});
