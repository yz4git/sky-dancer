import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV30 } from "./SkyDancerAirCombatFxV30";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { SkyDancerCloudQualityV31 } from "./SkyDancerCloudQualityV31";
import { SkyDancerGroundDensityV31 } from "./SkyDancerGroundDensityV31";

/**
 * V31 keeps V30's ground-integrity ownership and adds only product-facing world
 * density and cloud volume. Both controllers use instancing so the iPhone path
 * gets a much richer frame without restoring the old low-altitude scenery pile.
 */
export class SkyDancerAirCombatFxV31 extends SkyDancerAirCombatFxV30 {
  private readonly groundDensity: SkyDancerGroundDensityV31;
  private readonly cloudQuality: SkyDancerCloudQualityV31;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    this.groundDensity = new SkyDancerGroundDensityV31(runtime);
    this.cloudQuality = new SkyDancerCloudQualityV31(runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.groundDensity.update(snapshot);
    this.cloudQuality.update(snapshot);
  }
}

export { SkyDancerAirCombatFxV31 as SkyDancerAirCombatFx };
