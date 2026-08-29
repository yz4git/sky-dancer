import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { getSkyDancerMissionV49 } from "./SkyDancerCampaignV49";
import { getSkyDancerStageCycleSnapshot, installSkyDancerStageCycle } from "./SkyDancerStageCycle";

interface CampaignPacingSession {
  enemies: CartEnemyState[];
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface CampaignPacingState {
  scaledBossStage: number;
}

const PATCHED_KEY = "__skyDancerCampaignPacingV49Installed__";
const stateBySession = new WeakMap<object, CampaignPacingState>();

export const SKY_DANCER_V49_BOSS_BASE_HP = 120;
export const SKY_DANCER_V49_BOSS_STAGE_HP_STEP = 12;
export const SKY_DANCER_V49_BOSS_MAX_HP = 180;

export function skyDancerCampaignBossHpV49(stage: number): number {
  return Math.min(
    SKY_DANCER_V49_BOSS_MAX_HP,
    SKY_DANCER_V49_BOSS_BASE_HP + Math.max(0, stage - 1) * SKY_DANCER_V49_BOSS_STAGE_HP_STEP,
  );
}

function stateFor(session: object): CampaignPacingState {
  const existing = stateBySession.get(session);
  if (existing) return existing;
  const created: CampaignPacingState = { scaledBossStage: 0 };
  stateBySession.set(session, created);
  return created;
}

/**
 * V34 remains the boss-rule authority and keeps its standalone 192+ durability
 * contract for regression/audit encounters. V49 only trims bosses that arrive
 * through the real six-mission StageCycle, preserving all three HP phases and
 * ORBIT/STRIKE/BREAK core windows while removing the late-fight sponge tail.
 */
export function installSkyDancerCampaignPacingV49(): void {
  installSkyDancerStageCycle();
  const prototype = CartArenaSession.prototype as unknown as CampaignPacingSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerCampaignPacingV49Step(
    this: CampaignPacingSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    previous.call(this, input, fixedDelta);
    const concrete = this as unknown as CartArenaSession;
    const stage = getSkyDancerStageCycleSnapshot(concrete);
    if (!stage || stage.phase !== "boss" || !getSkyDancerMissionV49(stage.stage)) return;

    const state = stateFor(this as unknown as object);
    if (state.scaledBossStage === stage.stage) return;
    const boss = this.enemies.find((enemy) => enemy.kind === "boss" && enemy.alive) ?? null;
    if (!boss) return;

    const targetMaxHp = skyDancerCampaignBossHpV49(stage.stage);
    if (boss.maxHp > targetMaxHp) {
      const ratio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
      boss.maxHp = targetMaxHp;
      boss.hp = Math.max(1, Math.round(targetMaxHp * ratio));
    }
    state.scaledBossStage = stage.stage;

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV49CampaignPacing = () => ({
        stage: stage.stage,
        bossHp: boss.hp,
        bossMaxHp: boss.maxHp,
        targetMaxHp,
      });
    }
  };
}
