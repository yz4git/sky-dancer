import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { SkyDancerV30PresentationPass } from "./SkyDancerV30PresentationPass";
import { SkyDancerV31PresentationPass } from "./SkyDancerV31PresentationPass";
import { SkyDancerV32PresentationPass } from "./SkyDancerV32PresentationPass";

/**
 * Stable modern presentation pipeline.
 *
 * V29 remains the compatibility boundary for the historical gameplay/FX chain.
 * V30+ presentation work is composed here in explicit order, so future visual
 * work no longer needs another SkyDancerAirCombatFxVxx inheritance layer.
 */
export class SkyDancerPresentationPipeline {
  private readonly v30: SkyDancerV30PresentationPass;
  private readonly v31: SkyDancerV31PresentationPass;
  private readonly v32: SkyDancerV32PresentationPass;

  constructor(runtime: SkyDancerFxRuntime) {
    this.v30 = new SkyDancerV30PresentationPass(runtime);
    this.v31 = new SkyDancerV31PresentationPass(runtime);
    this.v32 = new SkyDancerV32PresentationPass(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.v30.update(snapshot);
    this.v31.update(snapshot);
    this.v32.update(snapshot);
  }
}
