import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV29 } from "./SkyDancerAirCombatFxV29";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { SkyDancerWorldPresentationV30 } from "./SkyDancerWorldPresentationV30";

/**
 * V30 is intentionally thin: all world-composition ownership lives in
 * SkyDancerWorldPresentationV30 instead of adding another pile of scenery
 * mutations to the long FX inheritance chain.
 */
export class SkyDancerAirCombatFxV30 extends SkyDancerAirCombatFxV29 {
  private readonly worldPresentation: SkyDancerWorldPresentationV30;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    this.worldPresentation = new SkyDancerWorldPresentationV30(runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.worldPresentation.update(snapshot);
  }
}

export { SkyDancerAirCombatFxV30 as SkyDancerAirCombatFx };
