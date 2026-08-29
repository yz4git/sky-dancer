import type { CartEnemyState } from "../cart/CartCombat";
import { getSkyDancerEnemyVerticalSnapshotV43 } from "./SkyDancerVerticalFlightV43";

export type SkyDancerCombatDecisionClassV45 =
  | "boss"
  | "heavy"
  | "striker"
  | "orbiter"
  | "bomber"
  | "drifter"
  | "standard";

export interface SkyDancerEnemyDecisionV45 {
  className: SkyDancerCombatDecisionClassV45;
  label: string;
  action: string;
  vulnerable: boolean;
  priority: number;
  missileDamage: number;
  altitudeMeters: number;
  tacticalPhase: number;
}

export const SKY_DANCER_V45_TURBO_ATTACK_SPEED = 27;
export const SKY_DANCER_V45_ORBITER_ARC_ALTITUDE = 4.8;

function oneShotDamage(enemy: CartEnemyState): number {
  return Math.max(1, enemy.hp, enemy.maxHp);
}

/**
 * V45 turns enemy archetypes into actual player decisions without adding input.
 * The same small SHOT + TURBO control set now asks for different timing:
 * - Striker: fire on the recovery/counter phase after the dive crossing.
 * - Orbiter: fire when vertical separation opens a clean high-arc seeker lane.
 * - Heavy/Tank: normal missiles chip armor; high-speed/Turbo attacks hit harder.
 * - Bomber: remains fragile but receives highest target urgency.
 * - Boss: closed core heavily resists missiles; CORE OPEN is the damage window.
 */
export function getSkyDancerEnemyDecisionV45(
  enemy: CartEnemyState,
  playerSpeed: number,
): SkyDancerEnemyDecisionV45 {
  const vertical = getSkyDancerEnemyVerticalSnapshotV43(enemy);
  const altitudeMeters = vertical.altitudeOffsetMeters;
  const tacticalPhase = vertical.tacticalPhase;

  if (enemy.kind === "boss") {
    const vulnerable = enemy.weakPointExposed === true;
    return {
      className: "boss",
      label: "BOSS",
      action: vulnerable ? "CORE OPEN · FIRE" : "TRACK RUN · WAIT CORE",
      vulnerable,
      priority: 8,
      missileDamage: vulnerable ? 34 : 14,
      altitudeMeters,
      tacticalPhase,
    };
  }

  if (enemy.kind === "heavy" || enemy.archetype === "tank") {
    const vulnerable = Math.abs(playerSpeed) >= SKY_DANCER_V45_TURBO_ATTACK_SPEED;
    return {
      className: "heavy",
      label: enemy.archetype === "tank" ? "TANK" : "HEAVY",
      action: vulnerable ? "TURBO STRIKE · COMMIT" : "ARMORED · BUILD TURBO",
      vulnerable,
      priority: 4,
      missileDamage: vulnerable ? 64 : 20,
      altitudeMeters,
      tacticalPhase,
    };
  }

  if (enemy.archetype === "striker") {
    const vulnerable = tacticalPhase === 2;
    return {
      className: "striker",
      label: "STRIKER",
      action: vulnerable ? "COUNTER WINDOW · FIRE" : "DIVE PASS · HOLD FIRE",
      vulnerable,
      priority: 6,
      missileDamage: vulnerable ? oneShotDamage(enemy) : Math.min(46, Math.max(1, enemy.hp - 1)),
      altitudeMeters,
      tacticalPhase,
    };
  }

  if (enemy.archetype === "orbiter") {
    const vulnerable = Math.abs(altitudeMeters) >= SKY_DANCER_V45_ORBITER_ARC_ALTITUDE;
    return {
      className: "orbiter",
      label: "ORBITER",
      action: vulnerable ? "HIGH ARC · FIRE" : "ORBITING · WAIT SEPARATION",
      vulnerable,
      priority: 5,
      missileDamage: vulnerable ? oneShotDamage(enemy) : Math.min(52, Math.max(1, enemy.hp - 1)),
      altitudeMeters,
      tacticalPhase,
    };
  }

  if (enemy.archetype === "bomber") {
    return {
      className: "bomber",
      label: "BOMBER",
      action: "PRIORITY · FIRE EARLY",
      vulnerable: true,
      priority: 7,
      missileDamage: oneShotDamage(enemy),
      altitudeMeters,
      tacticalPhase,
    };
  }

  if (enemy.archetype === "drifter") {
    return {
      className: "drifter",
      label: "DRIFTER",
      action: "JINKING · LEAD SHOT",
      vulnerable: true,
      priority: 3,
      missileDamage: oneShotDamage(enemy),
      altitudeMeters,
      tacticalPhase,
    };
  }

  return {
    className: "standard",
    label: enemy.kind === "blocker" ? "INTERCEPTOR" : "FIGHTER",
    action: "LOCK · FIRE",
    vulnerable: true,
    priority: 2,
    missileDamage: oneShotDamage(enemy),
    altitudeMeters,
    tacticalPhase,
  };
}

export function getSkyDancerMissileDamageV45(enemy: CartEnemyState, playerSpeed: number): number {
  return Math.max(1, Math.round(getSkyDancerEnemyDecisionV45(enemy, playerSpeed).missileDamage));
}
