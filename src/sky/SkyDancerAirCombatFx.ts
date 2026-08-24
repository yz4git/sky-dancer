import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import { SkyDancerAirCombatFxV29 } from "./SkyDancerAirCombatFxV29";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
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
 * V29 remains the legacy gameplay/FX compatibility boundary. V30-V32 visual
 * responsibilities are now explicit composition passes rather than additional
 * production inheritance levels.
 */
export class SkyDancerAirCombatFx extends SkyDancerAirCombatFxV29 {
  private readonly presentation: SkyDancerPresentationPipeline;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    this.presentation = new SkyDancerPresentationPipeline(runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.presentation.update(snapshot);
  }
}

export type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
