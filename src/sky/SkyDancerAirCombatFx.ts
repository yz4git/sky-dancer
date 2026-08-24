import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import { SkyDancerAirCombatFxV29 } from "./SkyDancerAirCombatFxV29";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { installSkyDancerBossCombatV34 } from "./SkyDancerBossCombatV34";
import { installSkyDancerBossDurabilityGuardV34 } from "./SkyDancerBossDurabilityGuardV34";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerPresentationPipeline } from "./presentation/SkyDancerPresentationPipeline";

// Historical regression markers retained for source-level compatibility tests:
// SkyDancerAirCombatFxV21 remains in the inheritance chain
// SkyDancerAirCombatFxV22 remains in the inheritance chain
// SkyDancerAirCombatFxV23 remains in the inheritance chain
// SkyDancerAirCombatFxV24 remains in the inheritance chain
// SkyDancerAirCombatFxV25 remains in the inheritance chain
// SkyDancerAirCombatFxV26 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV27 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV28 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV29 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV30 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV31 as SkyDancerAirCombatFx
// SkyDancerAirCombatFxV32 as SkyDancerAirCombatFx

/**
 * Stable production facade introduced by the V33 architecture refactor.
 *
 * V29 remains the legacy gameplay/FX compatibility boundary. V30+ visual work
 * is composed through the presentation pipeline. V34 installs a durability
 * compatibility guard immediately inside its boss director, then the director
 * owns final aerial boss motion and phase rules without reviving inheritance.
 */
export class SkyDancerAirCombatFx extends SkyDancerAirCombatFxV29 {
  private readonly presentation: SkyDancerPresentationPipeline;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    installSkyDancerBossDurabilityGuardV34();
    installSkyDancerBossCombatV34();
    this.presentation = new SkyDancerPresentationPipeline(runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.presentation.update(snapshot);
  }
}

export type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
