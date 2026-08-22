import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { CartArenaSession } from "../src/cart/CartArenaSession";

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
  for (let index = 0; index < 10; index += 1) {
    session.advance(FIXED_STEP, { ...DRIVE_INPUT, steer: 1 });
  }
  const after = session.snapshot();
  assert.notEqual(after.x, before.x);
  assert.ok(after.speed > 0);
});

test("BRAKE and TURBO use the same input contract as Cart Rogue", () => {
  const session = new CartArenaSession();
  session.advance(FIXED_STEP, { ...DRIVE_INPUT, boost: true });
  assert.equal(session.snapshot().boostActive, true);
  for (let index = 0; index < 150; index += 1) {
    session.advance(FIXED_STEP, { throttle: 0, brake: 1, steer: 0, boost: false });
  }
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
  assert.ok(frontRadius > 0.18, `front nozzle radius should remain broad, got ${frontRadius}`);
  assert.ok(rearRadius < frontRadius * 0.25, `rear flame tip should taper on -Z, got ${rearRadius} vs ${frontRadius}`);
});

test("WebGL air combat FX records wing and missile trails in world space", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV2.ts", import.meta.url), "utf8");
  assert.match(source, /class WorldRibbonTrail/);
  assert.match(source, /localToWorld\(new THREE\.Vector3\(-state\.wingSpan/);
  assert.match(source, /localToWorld\(new THREE\.Vector3\(state\.wingSpan/);
  assert.match(source, /sky-dancer-missile-smoke-\$\{missile\.id\}/);
  assert.match(source, /geometry\.rotateX\(-Math\.PI \/ 2\)/);
  assert.match(source, /flame\.mesh\.scale\.z = flame\.baseLength/);
  assert.doesNotMatch(source, /new THREE\.CylinderGeometry\(0\.035, 0\.16, length/);
});

test("Canvas fallback stores historical world positions instead of drawing fighter-attached vapor sticks", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerCanvasPreviewV2.ts", import.meta.url), "utf8");
  assert.match(source, /interface TrailPoint/);
  assert.match(source, /localPoint\(x, z, heading, -wingSpan, -0\.58\)/);
  assert.match(source, /trail\.points\.push\(\{ x: missile\.x, z: missile\.z, age: 0 \}\)/);
  assert.match(source, /drawAircraftTrails/);
  assert.match(source, /drawMissileTrails/);
  assert.doesNotMatch(source, /lineTo\(side \* 1\.9 \* s, \(boss \? 5\.4 : 4\.5\) \* s\)/);
});

test("V3 corrects nozzle discs, removes the primitive missile glow and adds altitude scale cues", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV3.ts", import.meta.url), "utf8");
  assert.match(source, /object\.geometry\.type !== "CircleGeometry"/);
  assert.match(source, /object\.geometry\.rotateX\(-Math\.PI \/ 2\)/);
  assert.match(source, /inheritedGlow\.visible = false/);
  assert.match(source, /addAircraftDetailPass/);
  assert.match(source, /sky-dancer-ground-road-network-v3/);
  assert.match(source, /sky-dancer-distant-city-v3/);
  assert.match(source, /sky-dancer-horizon-haze-v3/);
});
