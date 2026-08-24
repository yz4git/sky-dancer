import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV29 } from "./SkyDancerAirCombatFxV29";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { SkyDancerGroundDetailV30 } from "./SkyDancerGroundDetailV30";
import { SkyDancerLegacySceneryCleanupV30 } from "./SkyDancerLegacySceneryCleanupV30";
import { installSkyDancerOpeningSpacingV30 } from "./SkyDancerOpeningSpacingV30";
import { SkyDancerWorldPresentationV30 } from "./SkyDancerWorldPresentationV30";

/**
 * V30 is intentionally thin: final world-composition ownership lives in
 * dedicated controllers instead of adding another pile of scenery mutations
 * to the long FX inheritance chain.
 */
export class SkyDancerAirCombatFxV30 extends SkyDancerAirCombatFxV29 {
  private readonly legacyCleanup: SkyDancerLegacySceneryCleanupV30;
  private readonly groundDetail: SkyDancerGroundDetailV30;
  private readonly worldPresentation: SkyDancerWorldPresentationV30;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    // Install after the inherited population/dynamics wrappers so this is the
    // final one-time authority over the unbounded flight opening formation.
    installSkyDancerOpeningSpacingV30();
    this.legacyCleanup = new SkyDancerLegacySceneryCleanupV30(runtime);
    this.groundDetail = new SkyDancerGroundDetailV30(runtime);
    this.worldPresentation = new SkyDancerWorldPresentationV30(runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    // super.update() may lazily create inherited scenery on the first frame;
    // suppress those roots before the V30-owned ground and world are presented.
    this.legacyCleanup.update();
    this.groundDetail.update(snapshot);
    this.worldPresentation.update(snapshot);
  }
}

export { SkyDancerAirCombatFxV30 as SkyDancerAirCombatFx };
