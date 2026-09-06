import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CartArenaSession } from "../src/cart/CartArenaSession";
import { enableCartTurboHunt } from "../src/cart/CartRoguePhase67TurboHunt";
import {
  CART_TURBO_HUNT_FIELD,
  CART_TURBO_HUNT_WORLD_DEPTH,
  CART_TURBO_HUNT_WORLD_WIDTH,
  cartTurboHuntNearestCoordinate,
  cartTurboHuntTileCenter,
  cartTurboHuntWrapCoordinate,
  cartTurboHuntWrappedDelta,
} from "../src/cart/CartTurboHuntTrack";
import { installSkyDancerInfiniteWorld } from "../src/sky/SkyDancerInfiniteWorld";
import {
  SKY_DANCER_TURBO_RELEASE_BASE_KICK,
  getSkyDancerTurboState,
  setSkyDancerTurboHeld,
} from "../src/sky/SkyDancerTurboModel";
import {
  SKY_DANCER_STAGE_BASE_KILLS,
  SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS,
  skyDancerStageActiveEnemyTarget,
  skyDancerStageKillTarget,
  skyDancerStageMinimumReinforcementSeconds,
  skyDancerStageReinforcementsComplete,
  skyDancerStageSpawnSlot,
} from "../src/sky/SkyDancerStageCycle";
import {
  SKY_DANCER_V40_CLEANUP_HOLD_DISTANCE,
  SKY_DANCER_V40_LOCK_HALF_ANGLE,
  SKY_DANCER_V40_LOCK_RANGE,
  SKY_DANCER_V40_REENGAGE_TRIGGER,
  skyDancerCleanupHoldingPositionV40,
  skyDancerReengagementClosingSpeedV40,
  SKY_DANCER_V42_CLEANUP_RELEASE_MAX_DISTANCE,
  skyDancerCleanupReleasePositionV42,
  skyDancerCleanupSlotOrderV42,
} from "../src/sky/SkyDancerReengagementV40";
import {
  isSkyDancerCombatTargetableV42,
  setSkyDancerCleanupHeldV42,
} from "../src/sky/SkyDancerCombatEligibilityV42";
import type { CartEnemyState } from "../src/cart/CartCombat";
import { pointSegmentDistanceSquared3DV43 } from "../src/sky/SkyDancerPlayerWeapons";
import {
  SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS,
  SKY_DANCER_VERTICAL_COLLISION_CLEARANCE_METERS,
  SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS,
  getSkyDancerEnemyVerticalSnapshotV43,
  skyDancerDistance3DV43,
  stepSkyDancerEnemyVerticalFlightV43,
} from "../src/sky/SkyDancerVerticalFlightV43";

function enemy(id: string, x: number, z: number, heading = 0): CartEnemyState {
  return {
    id,
    nodeId: "arena-01",
    kind: "chaser",
    archetype: "striker",
    x,
    z,
    radius: 1.4,
    maxHp: 40,
    hp: 40,
    alive: true,
    heading,
    moveSpeed: 11,
  } as CartEnemyState;
}

test("Turbo hold is physics-neutral and release is a dedicated dash", () => {
  const session = new CartArenaSession();
  session.car.forwardVelocity = 16;
  session.car.lateralVelocity = 2.5;
  session.car.velocity.x = Math.sin(session.car.heading) * 16 + Math.cos(session.car.heading) * 2.5;
  session.car.velocity.z = Math.cos(session.car.heading) * 16 - Math.sin(session.car.heading) * 2.5;
  const boostChargesBefore = session.car.boostCharges;

  setSkyDancerTurboHeld(session, true);
  assert.equal(session.car.forwardVelocity, 16);
  assert.equal(session.car.lateralVelocity, 2.5);
  assert.equal(session.car.boostCharges, boostChargesBefore);

  setSkyDancerTurboHeld(session, false);
  const turbo = getSkyDancerTurboState(session);
  assert.equal(turbo.held, false);
  assert.ok(turbo.postReleaseForwardSpeed >= turbo.preReleaseForwardSpeed + SKY_DANCER_TURBO_RELEASE_BASE_KICK - 0.02);
  assert.equal(session.car.boostCharges, boostChargesBefore - 1);
  assert.equal(session.car.boostActive, true);
});

test("Turbo input isolation never forwards a held legacy boost", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerTurboInputIsolation.ts", import.meta.url), "utf8");
  assert.match(source, /inheritedSetBoost\.call\(this, false\)/);
  assert.doesNotMatch(source, /inheritedSetBoost\.call\(this, true\)/);
  assert.match(source, /setSkyDancerTurboHeld\(this\.session, active\)/);
});

test("iPhone steering recovery reclaims and releases pointer ownership", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerSteeringRecovery.ts", import.meta.url), "utf8");
  assert.match(source, /activePointerId = event\.pointerId/);
  assert.match(source, /pointercancel/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /runtime\.steer = 0/);
});

test("Turbo Hunt wrap math is continuous across all airspace seams", () => {
  const eastEdge = CART_TURBO_HUNT_FIELD.centerX + CART_TURBO_HUNT_FIELD.halfWidth;
  const northEdge = CART_TURBO_HUNT_FIELD.centerZ + CART_TURBO_HUNT_FIELD.halfDepth;
  assert.equal(
    cartTurboHuntWrapCoordinate(eastEdge, CART_TURBO_HUNT_FIELD.centerX, CART_TURBO_HUNT_WORLD_WIDTH),
    CART_TURBO_HUNT_FIELD.centerX - CART_TURBO_HUNT_FIELD.halfWidth,
  );
  assert.equal(
    cartTurboHuntWrapCoordinate(northEdge, CART_TURBO_HUNT_FIELD.centerZ, CART_TURBO_HUNT_WORLD_DEPTH),
    CART_TURBO_HUNT_FIELD.centerZ - CART_TURBO_HUNT_FIELD.halfDepth,
  );
  assert.equal(cartTurboHuntNearestCoordinate(469, 651, CART_TURBO_HUNT_WORLD_WIDTH), 653);
  assert.equal(cartTurboHuntWrappedDelta(469, 651, CART_TURBO_HUNT_WORLD_WIDTH), 2);
  assert.equal(cartTurboHuntTileCenter(653, 560, CART_TURBO_HUNT_WORLD_WIDTH), 744);
});

test("aircraft crosses a Hunt seam without wall sliding or teleporting", () => {
  installSkyDancerInfiniteWorld();
  const session = new CartArenaSession();
  enableCartTurboHunt(session);
  const eastEdge = CART_TURBO_HUNT_FIELD.centerX + CART_TURBO_HUNT_FIELD.halfWidth;
  session.car.position.x = eastEdge - 0.08;
  session.car.position.z = CART_TURBO_HUNT_FIELD.centerZ;
  session.car.heading = Math.PI / 2;
  session.car.forwardVelocity = 22;
  session.car.velocity.set(22, 0, 0);
  session.step({ throttle: 1, brake: 0, steer: 0, boost: false }, 1 / 60);
  const snapshot = session.snapshot();
  assert.ok(snapshot.x > eastEdge, `expected continuous eastbound coordinate, got ${snapshot.x}`);
  assert.equal(snapshot.wallSliding, false);
});

test("stage reinforcement targets scale gradually and cap", () => {
  assert.equal(SKY_DANCER_STAGE_BASE_KILLS, 36);
  assert.equal(skyDancerStageKillTarget(1), 36);
  assert.equal(skyDancerStageKillTarget(2), 44);
  assert.equal(skyDancerStageKillTarget(5), 68);
  assert.equal(skyDancerStageKillTarget(99), 68);
  assert.ok(skyDancerStageActiveEnemyTarget(9) >= skyDancerStageActiveEnemyTarget(1));
});

test("stage progression cannot be rushed by missile kills before the combat floor", () => {
  const target = skyDancerStageKillTarget(1);
  const minimum = skyDancerStageMinimumReinforcementSeconds(1);
  assert.equal(SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS, 84);
  assert.equal(minimum, 84);
  assert.equal(skyDancerStageMinimumReinforcementSeconds(2), 92);
  assert.equal(skyDancerStageMinimumReinforcementSeconds(5), 116);
  assert.equal(skyDancerStageReinforcementsComplete(1, 6, target * 3), false);
  assert.equal(skyDancerStageReinforcementsComplete(1, minimum - 0.01, target * 3), false);
  assert.equal(skyDancerStageReinforcementsComplete(1, minimum, target - 1), false);
  assert.equal(skyDancerStageReinforcementsComplete(1, minimum, target), true);
  assert.ok(skyDancerStageMinimumReinforcementSeconds(5) > minimum);
  assert.equal(skyDancerStageMinimumReinforcementSeconds(99), 116);
});

test("stage reinforcement lanes stay separated while remaining in the forward combat cone", () => {
  const slots = Array.from({ length: 12 }, (_, serial) => skyDancerStageSpawnSlot(serial));
  const points = slots.map((slot) => ({
    x: Math.sin(slot.angleOffset) * slot.distance,
    z: Math.cos(slot.angleOffset) * slot.distance,
  }));
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      minimum = Math.min(minimum, Math.hypot(points[left].x - points[right].x, points[left].z - points[right].z));
    }
  }
  assert.ok(minimum > 8, `spawn lane minimum spacing was ${minimum.toFixed(2)}m`);
  assert.ok(Math.max(...slots.map((slot) => Math.abs(slot.angleOffset))) <= 0.65);
  assert.ok(slots.filter((slot) => Math.abs(slot.angleOffset) <= 0.4).length >= 8);
});

test("re-engagement geometry remains inside the missile lock envelope", () => {
  assert.ok(SKY_DANCER_V40_REENGAGE_TRIGGER < SKY_DANCER_V40_LOCK_RANGE);
  assert.ok(SKY_DANCER_V40_CLEANUP_HOLD_DISTANCE < SKY_DANCER_V40_LOCK_RANGE);
  assert.ok(skyDancerReengagementClosingSpeedV40(80, true) > 31.5);
  assert.ok(skyDancerReengagementClosingSpeedV40(100, true) <= 60);
  const hold = skyDancerCleanupHoldingPositionV40(0, 0, 0, 2);
  assert.ok(Math.hypot(hold.x, hold.z) < SKY_DANCER_V40_LOCK_RANGE);
  assert.ok(Math.abs(Math.atan2(hold.x, hold.z)) > SKY_DANCER_V40_LOCK_HALF_ANGLE);
});

test("cleanup releases nearest survivor first and leashes it inside lock range", () => {
  const survivors = [
    { id: "enemy-far", x: 63, z: 0 },
    { id: "enemy-near", x: 46, z: 0 },
    { id: "enemy-mid", x: 54, z: 0 },
  ] as unknown as Parameters<typeof skyDancerCleanupSlotOrderV42>[0];
  const ordered = skyDancerCleanupSlotOrderV42(survivors, 0, 0);
  assert.deepEqual(ordered.map((target) => target.id), ["enemy-near", "enemy-mid", "enemy-far"]);
  const pulled = skyDancerCleanupReleasePositionV42(0, 0, 64, 0);
  assert.ok(Math.hypot(pulled.x, pulled.z) <= SKY_DANCER_V42_CLEANUP_RELEASE_MAX_DISTANCE + 0.001);
  assert.ok(SKY_DANCER_V42_CLEANUP_RELEASE_MAX_DISTANCE < SKY_DANCER_V40_LOCK_RANGE);
});

test("held cleanup aircraft are visible but not targetable", () => {
  const target = { id: "held-cleanup-aircraft" } as unknown as Parameters<typeof setSkyDancerCleanupHeldV42>[0];
  assert.equal(isSkyDancerCombatTargetableV42(target), true);
  setSkyDancerCleanupHeldV42(target, true);
  assert.equal(isSkyDancerCombatTargetableV42(target), false);
  setSkyDancerCleanupHeldV42(target, false);
  assert.equal(isSkyDancerCombatTargetableV42(target), true);
});

test("enemy vertical flight stays bounded while using meaningful altitude and pitch", () => {
  const fighter = enemy("vertical-flight", 22, 14, 0.4);
  let maxAbsAltitude = 0;
  let maxAbsPitch = 0;
  for (let frame = 0; frame < 900; frame += 1) {
    stepSkyDancerEnemyVerticalFlightV43([fighter], {
      nodeId: "arena-01",
      playerX: 0,
      playerZ: 0,
      playerHeading: 0,
      playerSpeed: 12,
      delta: 1 / 60,
    });
    const vertical = getSkyDancerEnemyVerticalSnapshotV43(fighter);
    maxAbsAltitude = Math.max(maxAbsAltitude, Math.abs(vertical.altitudeOffsetMeters));
    maxAbsPitch = Math.max(maxAbsPitch, Math.abs(vertical.pitchRadians));
    assert.ok(Math.abs(vertical.altitudeOffsetMeters) <= SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS + 0.0001);
    assert.ok(Math.abs(vertical.pitchRadians) <= SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS + 0.0001);
  }
  assert.ok(maxAbsAltitude > 2);
  assert.ok(maxAbsPitch > 0.02);
});

test("converging aircraft split into opposite altitude lanes", () => {
  const left = enemy("pair-a", -1.2, 5, Math.PI);
  const right = enemy("pair-b", 1.2, 5, Math.PI);
  for (let frame = 0; frame < 150; frame += 1) {
    stepSkyDancerEnemyVerticalFlightV43([left, right], {
      nodeId: "arena-01",
      playerX: 50,
      playerZ: 50,
      playerHeading: 0,
      playerSpeed: 10,
      delta: 1 / 60,
    });
  }
  const a = getSkyDancerEnemyVerticalSnapshotV43(left);
  const b = getSkyDancerEnemyVerticalSnapshotV43(right);
  assert.ok(a.altitudeOffsetMeters * b.altitudeOffsetMeters < 0);
  assert.ok(Math.abs(a.altitudeOffsetMeters - b.altitudeOffsetMeters) >= SKY_DANCER_VERTICAL_COLLISION_CLEARANCE_METERS);
});

test("3D distance and swept collision distinguish altitude-separated targets", () => {
  assert.equal(skyDancerDistance3DV43(0, 0, 0, 3, 4, 0), 5);
  const directHit = pointSegmentDistanceSquared3DV43(5, 0, 0, 0, 0, 0, 10, 0, 0);
  const overflight = pointSegmentDistanceSquared3DV43(5, 5, 0, 0, 0, 0, 10, 0, 0);
  assert.ok(directHit < 0.0001);
  assert.ok(overflight >= 25);
});
