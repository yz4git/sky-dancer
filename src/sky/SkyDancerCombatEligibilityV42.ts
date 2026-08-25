import type { CartEnemyState } from "../cart/CartCombat";

const CLEANUP_HELD_KEY = "__skyDancerCleanupHeldV42";

type CleanupGatedEnemy = CartEnemyState & {
  __skyDancerCleanupHeldV42?: boolean;
};

/**
 * CLEANUP formation aircraft remain visible and keep flying, but they are not
 * live combat targets until their scheduled slot is released. Keeping this as
 * enemy state (rather than camera-relative positioning) lets V42 preserve
 * natural screen motion without allowing the cleanup cadence to collapse when
 * the player turns through a holding aircraft.
 */
export function setSkyDancerCleanupHeldV42(enemy: CartEnemyState, held: boolean): void {
  const gated = enemy as CleanupGatedEnemy;
  if (held) gated[CLEANUP_HELD_KEY] = true;
  else delete gated[CLEANUP_HELD_KEY];
}

export function isSkyDancerCombatTargetableV42(enemy: CartEnemyState): boolean {
  return (enemy as CleanupGatedEnemy)[CLEANUP_HELD_KEY] !== true;
}
