import assert from "node:assert/strict";
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
