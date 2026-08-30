import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { getSkyDancerMissionV49 } from "./SkyDancerCampaignV49";
import { getSkyDancerStageCycleSnapshot, installSkyDancerStageCycle } from "./SkyDancerStageCycle";

interface CleanupGuardSession {
  enemies: CartEnemyState[];
  step(input: RallyInputState, fixedDelta?: number): void;
}

const PATCHED_KEY = "__skyDancerCleanupCadenceGuardV46Installed__";
const bridgedStagesBySession = new WeakMap<object, Set<number>>();
// Keep five cleanup aircraft for the authored sweep, but make each one a quick
// arcade target rather than a second full wave.
export const SKY_DANCER_V46_CLEANUP_SURVIVORS = 5;
export const SKY_DANCER_V46_CLEANUP_HP_RATIO = 0.46;

function bridgedStagesFor(session: CleanupGuardSession): Set<number> {
  const key = session as unknown as object;
  const existing = bridgedStagesBySession.get(key);
  if (existing) return existing;
  const created = new Set<number>();
  bridgedStagesBySession.set(key, created);
  return created;
}

function cleanupCloneId(sourceId: string, stage: number, index: number, present: Set<string>): string {
  const base = `${sourceId}-v46-cleanup-${stage}-${index}`;
  let id = base;
  let serial = 1;
  while (present.has(id)) id = `${base}-${serial++}`;
  present.add(id);
  return id;
}

function cloneForCleanup(
  source: CartEnemyState,
  stage: number,
  index: number,
  present: Set<string>,
): CartEnemyState {
  const clone: CartEnemyState = {
    ...source,
    id: cleanupCloneId(source.id, stage, index, present),
    alive: true,
    hp: Math.max(1, Math.min(source.maxHp, Math.round(source.maxHp * SKY_DANCER_V46_CLEANUP_HP_RATIO))),
    aiClock: 0,
  };
  if (clone.archetype === "striker") {
    clone.chargeTime = 0;
    clone.chargeCooldown = Math.max(clone.chargeCooldown ?? 0.7, 0.7);
  }
  return clone;
}

/**
 * V46 shortens only the reinforcement grind. V44's cleanup attack-run phase is
 * still a distinct combat beat, but the survivors now use compact HP so it
 * reads as a fast sweep rather than a second reinforcement wave.
 *
 * StageCycle intentionally retains its original 12+ kill contract for legacy
 * regression coverage. When V46 reaches the compact mission target, the inner
 * choreography retires the current formation. This outer bridge leaves those
 * old ids dead so StageCycle can count the synthetic retirements on its next
 * tick, while cloning five of those aircraft under fresh ids for V42 CLEANUP.
 */
export function installSkyDancerCleanupCadenceGuardV46(): void {
  installSkyDancerStageCycle();
  const prototype = CartArenaSession.prototype as unknown as CleanupGuardSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerCleanupCadenceGuardStep(
    this: CleanupGuardSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    previous.call(this, input, fixedDelta);
    const concrete = this as unknown as CartArenaSession;
    const stage = getSkyDancerStageCycleSnapshot(concrete);
    if (!stage || stage.phase !== "reinforcements") return;
    const mission = getSkyDancerMissionV49(stage.stage);
    if (!mission || stage.stageKills < mission.killTarget) return;

    const bridged = bridgedStagesFor(this);
    if (bridged.has(stage.stage)) return;

    const retired = this.enemies
      .filter((enemy) => enemy.kind !== "boss" && !enemy.alive)
      .sort((a, b) => b.maxHp - a.maxHp);
    if (retired.length < SKY_DANCER_V46_CLEANUP_SURVIVORS) return;

    const present = new Set(this.enemies.map((enemy) => enemy.id));
    const cleanup = retired
      .slice(0, SKY_DANCER_V46_CLEANUP_SURVIVORS)
      .map((enemy, index) => cloneForCleanup(enemy, stage.stage, index, present));
    this.enemies.push(...cleanup);
    bridged.add(stage.stage);

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV46CleanupGuard = () => ({
        mission: stage.stage,
        stageKills: stage.stageKills,
        aliveAfterGuard: cleanup.length,
        restored: cleanup.length,
        target: SKY_DANCER_V46_CLEANUP_SURVIVORS,
        hpRatio: SKY_DANCER_V46_CLEANUP_HP_RATIO,
        bridgeMode: "fresh-cleanup-ids",
        cleanupIds: cleanup.map((enemy) => enemy.id),
      });
    }
  };
}
