from pathlib import Path

ROOT = Path('.')

LEGACY_TESTS = [
    'tests/sky-v22.test.ts',
    'tests/sky-v26.test.ts',
    'tests/sky-v27.test.ts',
    'tests/sky-v28.test.ts',
    'tests/sky-v29.test.ts',
    'tests/sky-v30.test.ts',
    'tests/sky-v31.test.ts',
    'tests/sky-v32.test.ts',
    'tests/sky-v33.test.ts',
    'tests/sky-v34.test.ts',
    'tests/sky-v35.test.ts',
    'tests/sky-v36-v39.test.ts',
    'tests/sky-v40.test.ts',
    'tests/sky-v42.test.ts',
    'tests/sky-v43.test.ts',
    'tests/sky-v44.test.ts',
    'tests/sky-v45.test.ts',
    'tests/sky-v46-v49.test.ts',
    'tests/sky-v50-v54.test.ts',
]

for relative in LEGACY_TESTS:
    path = ROOT / relative
    if not path.exists():
        raise SystemExit(f'missing legacy test: {relative}')
    path.unlink()

(ROOT / 'tests/sky-rules.test.ts').write_text(r'''import assert from "node:assert/strict";
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

test("Sky Dancer starts from the expected arena contract", () => {
  const session = new CartArenaSession();
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeId, "arena-01");
  assert.equal(snapshot.gas, 1);
  assert.equal(snapshot.boostCharges, 2);
  assert.ok(snapshot.enemiesTotal > 0);
  assert.ok(snapshot.obstacles.length > 0);
});

test("steering and forward drive remain active", () => {
  const session = new CartArenaSession();
  const before = session.snapshot();
  for (let index = 0; index < 10; index += 1) session.advance(FIXED_STEP, { ...DRIVE_INPUT, steer: 1 });
  const after = session.snapshot();
  assert.notEqual(after.x, before.x);
  assert.ok(after.speed > 0);
});

test("airborne conversion preserves the route graph and enemy targets", () => {
  const session = new CartArenaSession();
  for (let index = 0; index < 30; index += 1) session.advance(FIXED_STEP, DRIVE_INPUT);
  const snapshot = session.snapshot();
  assert.equal(snapshot.nodeKind, "arena");
  assert.ok(snapshot.enemies.some((enemy) => enemy.kind === "blocker" || enemy.kind === "chaser"));
});

test("aircraft exhaust geometry points backward on the flight axis", () => {
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

test("enemy guidance breaks away early and keeps a physical standoff", () => {
  const safety = skyDancerEnemySafetyRadius(1.75);
  assert.equal(SKY_DANCER_ENEMY_PREFERRED_STANDOFF, 21);
  assert.ok(safety > 5.8);
  const close = skyDancerAvoidanceHeading(0, 0, 0, 12, 0, 12, 1);
  assert.ok(Math.abs(skyDancerNormalizeAngle(close)) > 2.3);
  const missileZone = skyDancerAvoidanceHeading(0, 0, 0, 22, 0, 22, 1);
  const crank = Math.abs(skyDancerNormalizeAngle(missileZone));
  assert.ok(crank >= 0.5 && crank <= 0.8);
});
''')

(ROOT / 'tests/sky-flight-runtime.test.ts').write_text(r'''import assert from "node:assert/strict";
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
  skyDancerStageActiveEnemyTarget,
  skyDancerStageKillTarget,
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
  assert.equal(skyDancerStageKillTarget(1), SKY_DANCER_STAGE_BASE_KILLS);
  assert.ok(skyDancerStageKillTarget(2) > skyDancerStageKillTarget(1));
  assert.ok(skyDancerStageKillTarget(5) >= skyDancerStageKillTarget(2));
  assert.equal(skyDancerStageKillTarget(99), skyDancerStageKillTarget(5));
  assert.ok(skyDancerStageActiveEnemyTarget(9) >= skyDancerStageActiveEnemyTarget(1));
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
''')

(ROOT / 'tests/sky-combat-runtime.test.ts').write_text(r'''import assert from "node:assert/strict";
import test from "node:test";
import type { CartEnemyState } from "../src/cart/CartCombat";
import {
  SKY_DANCER_V34_BOSS_BASE_HP,
  SKY_DANCER_V34_BOSS_MAX_HP,
  SKY_DANCER_V34_BOSS_MISSILE_DAMAGE_CAP,
  skyDancerBossCoreOpenV34,
  skyDancerBossDurabilityV34,
  skyDancerBossModeV34,
  skyDancerBossPhaseV34,
} from "../src/sky/SkyDancerBossCombatV34";
import {
  SKY_DANCER_V44_ATTACK_RUN_RELEASE_INTERVAL,
  SKY_DANCER_V44_ATTACK_RUN_SPEED,
  SKY_DANCER_V44_ATTACK_RUN_TARGET_DISTANCE,
  SKY_DANCER_V44_CLEANUP_ORBIT_MAX_DISTANCE,
  SKY_DANCER_V44_CLEANUP_ORBIT_MIN_DISTANCE,
  SKY_DANCER_V44_INTERCEPT_HEADING_RATE,
  SKY_DANCER_V44_INTERCEPT_SIDE_OFFSET,
} from "../src/sky/SkyDancerAttackRunsV44";
import {
  isSkyDancerCombatTargetableV42,
  setSkyDancerCombatOutOfSeekerRangeV44,
} from "../src/sky/SkyDancerCombatEligibilityV42";
import { SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE } from "../src/sky/SkyDancerPlayerWeapons";
import {
  SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS,
  getSkyDancerEnemyVerticalSnapshotV43,
  requestSkyDancerVerticalManeuverV44,
} from "../src/sky/SkyDancerVerticalFlightV43";
import {
  SKY_DANCER_V45_TURBO_ATTACK_SPEED,
  getSkyDancerEnemyDecisionV45,
} from "../src/sky/SkyDancerCombatDecisionV45";

function enemy(overrides: Partial<CartEnemyState>): CartEnemyState {
  return {
    id: overrides.id ?? "combat-enemy",
    nodeId: "arena-01",
    kind: overrides.kind ?? "chaser",
    archetype: overrides.archetype ?? "standard",
    x: 0,
    z: 20,
    radius: overrides.radius ?? 1.7,
    maxHp: overrides.maxHp ?? 100,
    hp: overrides.hp ?? overrides.maxHp ?? 100,
    alive: true,
    heading: 0,
    moveSpeed: overrides.moveSpeed ?? 4,
    weakPointExposed: overrides.weakPointExposed,
  };
}

test("boss durability and phase cadence create a multi-pass fight", () => {
  assert.equal(skyDancerBossDurabilityV34(1), SKY_DANCER_V34_BOSS_BASE_HP);
  assert.ok(skyDancerBossDurabilityV34(2) > skyDancerBossDurabilityV34(1));
  assert.equal(skyDancerBossDurabilityV34(99), SKY_DANCER_V34_BOSS_MAX_HP);
  assert.ok(SKY_DANCER_V34_BOSS_MISSILE_DAMAGE_CAP < 0.105);
  assert.equal(skyDancerBossPhaseV34({ hp: 100, maxHp: 100 }), 1);
  assert.equal(skyDancerBossPhaseV34({ hp: 60, maxHp: 100 }), 2);
  assert.equal(skyDancerBossPhaseV34({ hp: 30, maxHp: 100 }), 3);
  assert.equal(skyDancerBossModeV34(1, 1), "orbit");
  assert.equal(skyDancerBossModeV34(1, 4.2), "strike");
  assert.equal(skyDancerBossModeV34(1, 5.6), "break");
  assert.equal(skyDancerBossCoreOpenV34(1, 5.6), true);
});

test("cleanup staging stays outside missile lock before finite attack runs", () => {
  assert.ok(SKY_DANCER_V44_CLEANUP_ORBIT_MIN_DISTANCE > SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE);
  assert.ok(SKY_DANCER_V44_CLEANUP_ORBIT_MAX_DISTANCE >= SKY_DANCER_V44_CLEANUP_ORBIT_MIN_DISTANCE + 8);
  assert.ok(SKY_DANCER_V44_ATTACK_RUN_RELEASE_INTERVAL >= 5);
  assert.ok(SKY_DANCER_V44_ATTACK_RUN_SPEED >= 32 && SKY_DANCER_V44_ATTACK_RUN_SPEED <= 50);
  assert.ok(SKY_DANCER_V44_ATTACK_RUN_TARGET_DISTANCE < SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE);
  assert.ok(SKY_DANCER_V44_INTERCEPT_HEADING_RATE > 0 && SKY_DANCER_V44_INTERCEPT_HEADING_RATE < 1);
  assert.ok(SKY_DANCER_V44_INTERCEPT_SIDE_OFFSET >= 5 && SKY_DANCER_V44_INTERCEPT_SIDE_OFFSET <= 10);
});

test("seeker eligibility follows physical range", () => {
  const target = { id: "range-target", alive: true } as unknown as Parameters<typeof setSkyDancerCombatOutOfSeekerRangeV44>[0];
  setSkyDancerCombatOutOfSeekerRangeV44(target, true);
  assert.equal(isSkyDancerCombatTargetableV42(target), false);
  setSkyDancerCombatOutOfSeekerRangeV44(target, false);
  assert.equal(isSkyDancerCombatTargetableV42(target), true);
});

test("deliberate vertical maneuvers stay inside the flight envelope", () => {
  const striker = {
    id: "vertical-striker",
    kind: "chaser",
    archetype: "striker",
  } as unknown as Parameters<typeof requestSkyDancerVerticalManeuverV44>[0];
  requestSkyDancerVerticalManeuverV44(striker, 9.6, 1.2);
  const snapshot = getSkyDancerEnemyVerticalSnapshotV43(striker);
  assert.ok(snapshot.targetAltitudeMeters <= SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS);
  assert.ok(snapshot.targetAltitudeMeters >= -SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS);
  assert.equal(snapshot.avoiding, true);
});

test("heavy target decision changes at Turbo attack speed", () => {
  const heavy = enemy({ id: "heavy", kind: "heavy", archetype: "tank", maxHp: 240, hp: 240 });
  const normal = getSkyDancerEnemyDecisionV45(heavy, SKY_DANCER_V45_TURBO_ATTACK_SPEED - 2);
  const turbo = getSkyDancerEnemyDecisionV45(heavy, SKY_DANCER_V45_TURBO_ATTACK_SPEED + 4);
  assert.equal(normal.vulnerable, false);
  assert.match(normal.action, /BUILD TURBO/);
  assert.equal(turbo.vulnerable, true);
  assert.ok(turbo.missileDamage > normal.missileDamage);
  assert.match(turbo.action, /TURBO STRIKE/);
});

test("boss closed and open core produce distinct damage windows", () => {
  const boss = enemy({ id: "boss", kind: "boss", archetype: undefined, maxHp: 192, hp: 192, weakPointExposed: false });
  const closed = getSkyDancerEnemyDecisionV45(boss, 18);
  boss.weakPointExposed = true;
  const open = getSkyDancerEnemyDecisionV45(boss, 18);
  assert.equal(closed.vulnerable, false);
  assert.match(closed.action, /WAIT CORE/);
  assert.equal(open.vulnerable, true);
  assert.ok(open.missileDamage > closed.missileDamage);
  assert.match(open.action, /CORE OPEN/);
});
''')

(ROOT / 'tests/sky-campaign.test.ts').write_text(r'''import assert from "node:assert/strict";
import test from "node:test";
import {
  SKY_DANCER_CAMPAIGN_MISSIONS_V49,
  getSkyDancerMissionBeatV49,
  gradeSkyDancerMissionV49,
} from "../src/sky/SkyDancerCampaignV49";
import { skyDancerCampaignBossHpV49 } from "../src/sky/SkyDancerCampaignPacingV49";

test("campaign keeps six distinct compact arcade sorties", () => {
  assert.equal(SKY_DANCER_CAMPAIGN_MISSIONS_V49.length, 6);
  for (const mission of SKY_DANCER_CAMPAIGN_MISSIONS_V49) {
    assert.ok(mission.killTarget >= 5 && mission.killTarget <= 7);
    assert.ok(mission.activeThreatTarget >= 4 && mission.activeThreatTarget <= 5);
    assert.ok(mission.parSeconds >= 120 && mission.parSeconds <= 160);
    assert.equal(mission.beats.length, 4);
  }
  assert.deepEqual(
    SKY_DANCER_CAMPAIGN_MISSIONS_V49.map((mission) => mission.worldStyle),
    ["city", "clouds", "mountains", "facility", "storm", "citadel"],
  );
});

test("mission beats rotate cross, intercept, Turbo break and altitude duel decisions", () => {
  const mission = SKY_DANCER_CAMPAIGN_MISSIONS_V49[0];
  assert.equal(getSkyDancerMissionBeatV49(mission, 0).beat.kind, "cross");
  assert.equal(getSkyDancerMissionBeatV49(mission, 2).beat.kind, "intercept");
  assert.equal(getSkyDancerMissionBeatV49(mission, 3).beat.kind, "break");
  assert.equal(getSkyDancerMissionBeatV49(mission, 4).beat.kind, "vertical");
});

test("campaign boss durability rises by mission and remains capped", () => {
  const first = skyDancerCampaignBossHpV49(1);
  const middle = skyDancerCampaignBossHpV49(3);
  const final = skyDancerCampaignBossHpV49(6);
  assert.ok(first < middle);
  assert.ok(middle < final);
  assert.equal(skyDancerCampaignBossHpV49(20), final);
});

test("mission grade rewards time, accuracy, evades and FLOW", () => {
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 105, accuracy: 0.78, perfectEvades: 4, peakFlow: 96 }, 130), "S");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 130, accuracy: 0.60, perfectEvades: 3, peakFlow: 72 }, 130), "A");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 145, accuracy: 0.42, perfectEvades: 2, peakFlow: 48 }, 130), "B");
  assert.equal(gradeSkyDancerMissionV49({ elapsedSeconds: 190, accuracy: 0.24, perfectEvades: 0, peakFlow: 12 }, 130), "C");
});
''')

(ROOT / 'tests/README.md').write_text('''# Test policy\n\n`npm run test:rules` automatically runs every `tests/sky-*.test.ts` file. Do not maintain a manual file list.\n\nKeep tests behavior-oriented. Prefer exported rules, state transitions, geometry/math invariants, input-release safety, persistence, and bounded runtime behavior. A refactor that preserves behavior should normally preserve these tests.\n\nDo not create chronological `sky-vXX.test.ts` regression files. When a new pass adds lasting behavior, add the smallest assertion to the relevant current suite (`sky-flight-runtime`, `sky-combat-runtime`, `sky-campaign`, `sky-sky-raid`, or an Arcade suite). Visual quality belongs in browser/WebGL audit workflows rather than source-text snapshots of every rendering pass.\n\nSource-text assertions are reserved for small architecture/safety contracts that are difficult to observe in Node, such as iPhone pointer-release recovery or legacy Turbo input isolation. Do not use them to freeze private class names, inheritance order, exact rendering object names, or visual tuning literals.\n''')

print(f'Removed {len(LEGACY_TESTS)} chronological test files and rebuilt behavior suites.')
