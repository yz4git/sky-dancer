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
// V40/V42 authored this phase around five staggered survivors at 5.25 s slots.
// Keep that population while V46 shortens only the reinforcement phase before it.
export const SKY_DANCER_V46_CLEANUP_SURVIVORS = 5;

/**
 * V46 shortens only the reinforcement grind. V44's cleanup attack-run phase is
 * still an authored 20-30 second combat beat and must remain visible/readable.
 *
 * CombatChoreography can retire a whole background formation after the mission
 * kill target is met. This outer compatibility guard revives up to five of the
 * just-retired fighters before the next StageCycle tick counts the synthetic
 * retirements. The legacy quota can then close while the five-aircraft V42
 * cleanup formation remains intact for its staggered attack runs.
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

    const alive = this.enemies.filter((enemy) => enemy.kind !== "boss" && enemy.alive);
    if (alive.length >= SKY_DANCER_V46_CLEANUP_SURVIVORS) return;

    const dead = this.enemies
      .filter((enemy) => enemy.kind !== "boss" && !enemy.alive)
      .sort((a, b) => b.maxHp - a.maxHp);
    const needed = Math.min(
      dead.length,
      SKY_DANCER_V46_CLEANUP_SURVIVORS - alive.length,
    );
    for (let index = 0; index < needed; index += 1) {
      const enemy = dead[index];
      enemy.alive = true;
      enemy.hp = Math.max(1, Math.min(enemy.maxHp, Math.round(enemy.maxHp * 0.62)));
      enemy.aiClock = 0;
      if (enemy.archetype === "striker") {
        enemy.chargeTime = 0;
        enemy.chargeCooldown = Math.max(enemy.chargeCooldown ?? 0.7, 0.7);
      }
    }

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV46CleanupGuard = () => ({
        mission: stage.stage,
        stageKills: stage.stageKills,
        aliveAfterGuard: this.enemies.filter((enemy) => enemy.kind !== "boss" && enemy.alive).length,
        restored: needed,
        target: SKY_DANCER_V46_CLEANUP_SURVIVORS,
      });
    }
  };
}
