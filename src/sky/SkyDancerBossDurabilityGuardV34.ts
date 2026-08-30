import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { isCartTurboHuntEnabled } from "../cart/CartRoguePhase67TurboHunt";
import type { RallyInputState } from "../rally/RallyTypes";
import { getSkyDancerMissionV49 } from "./SkyDancerCampaignV49";
import { skyDancerBossDurabilityV34 } from "./SkyDancerBossCombatV34";
import { getSkyDancerStageCycleSnapshot } from "./SkyDancerStageCycle";

interface GuardSession {
  enemies: CartEnemyState[];
  step(input: RallyInputState, fixedDelta?: number): void;
}

const PATCHED_KEY = "__skyDancerBossDurabilityGuardV34Installed__";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeBossDurability(session: GuardSession): void {
  const boss = session.enemies.find((enemy) => enemy.kind === "boss" && enemy.alive) ?? null;
  if (!boss) return;

  const concrete = session as unknown as CartArenaSession;
  const stageCycle = getSkyDancerStageCycleSnapshot(concrete);
  // V49 owns durability for real campaign bosses. The V34 guard remains the
  // standalone/legacy owner only, so the two layers never fight over maxHp.
  if (stageCycle?.phase === "boss" && getSkyDancerMissionV49(stageCycle.stage)) return;

  const stage = stageCycle?.stage ?? 1;
  const targetMaxHp = skyDancerBossDurabilityV34(stage);
  if (Math.abs(boss.maxHp - targetMaxHp) < 0.001) return;

  // V28/V29 each own a historical one-time 1/10 spawn reduction. They sit
  // inside the V34 director, so standalone encounters still normalize that
  // legacy ratio back into V34's durability domain before boss combat runs.
  const legacyMaxHp = Math.max(1, boss.maxHp);
  const healthRatio = clamp(boss.hp / legacyMaxHp, 0, 1);
  boss.maxHp = targetMaxHp;
  boss.hp = Math.max(1, Math.min(targetMaxHp, targetMaxHp * healthRatio));
}

/**
 * Installs immediately inside the V34 boss director. Historical V28/V29
 * normalization remains intact for standalone encounters, while real campaign
 * bosses are deliberately left to the later V49 pacing owner.
 */
export function installSkyDancerBossDurabilityGuardV34(): void {
  const prototype = CartArenaSession.prototype as unknown as GuardSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerBossDurabilityGuardV34Step(
    this: GuardSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    previous.call(this, input, fixedDelta);
    const concrete = this as unknown as CartArenaSession;
    if (!isCartTurboHuntEnabled(concrete)) return;
    normalizeBossDurability(this);
  };
}
