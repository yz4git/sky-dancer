import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import type { RallyInputState } from "../rally/RallyTypes";
import { getLatestSkyDancerBossQualityV34 } from "./SkyDancerBossCombatV34";
import { requestSkyDancerVerticalManeuverV44 } from "./SkyDancerVerticalFlightV43";

interface BossAttackRunSessionV45 {
  enemies: CartEnemyState[];
  step(input: RallyInputState, fixedDelta?: number): void;
}

const PATCH_KEY = "__skyDancerBossAttackRunV45Installed__";

/**
 * V45 synchronizes the existing +/-10 m vertical flight model with the boss
 * combat state. ORBIT visibly prepares high, STRIKE dives through the player
 * plane, and BREAK exits low while the core is vulnerable.
 */
export function installSkyDancerBossAttackRunV45(): void {
  const prototype = CartArenaSession.prototype as unknown as BossAttackRunSessionV45 & Record<string, unknown>;
  if (prototype[PATCH_KEY]) return;
  prototype[PATCH_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerBossAttackRunV45Step(input: RallyInputState, fixedDelta?: number): void {
    previous.call(this, input, fixedDelta);
    const boss = this.enemies.find((enemy) => enemy.kind === "boss" && enemy.alive) ?? null;
    const state = getLatestSkyDancerBossQualityV34();
    if (!boss || !state?.active) return;

    if (state.mode === "orbit") {
      requestSkyDancerVerticalManeuverV44(boss, state.phase === 3 ? 7.2 : 8.7, 0.24);
    } else if (state.mode === "strike") {
      requestSkyDancerVerticalManeuverV44(boss, state.phase === 3 ? -9.4 : -8.8, 0.24);
    } else {
      requestSkyDancerVerticalManeuverV44(boss, state.phase === 3 ? -5.8 : -4.2, 0.24);
    }
  };
}
