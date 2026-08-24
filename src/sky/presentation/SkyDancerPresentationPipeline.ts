import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { SkyDancerV30PresentationPass } from "./SkyDancerV30PresentationPass";
import { SkyDancerV31PresentationPass } from "./SkyDancerV31PresentationPass";
import { SkyDancerV32PresentationPass } from "./SkyDancerV32PresentationPass";
import { SkyDancerV34QualityPass } from "./SkyDancerV34QualityPass";
import { SkyDancerV35ReferencePass } from "./SkyDancerV35ReferencePass";
import { installSkyDancerV35VisualAuditBridge } from "./SkyDancerV35VisualAuditBridge";

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
  private readonly v34: SkyDancerV34QualityPass;
  private readonly v35: SkyDancerV35ReferencePass;

  constructor(runtime: SkyDancerFxRuntime) {
    this.v30 = new SkyDancerV30PresentationPass(runtime);
    this.v31 = new SkyDancerV31PresentationPass(runtime);
    this.v32 = new SkyDancerV32PresentationPass(runtime);
    this.v34 = new SkyDancerV34QualityPass(runtime);
    this.v35 = new SkyDancerV35ReferencePass(runtime);
    installSkyDancerV35VisualAuditBridge(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.v30.update(snapshot);
    this.v31.update(snapshot);
    this.v32.update(snapshot);
    this.v34.update(snapshot);
    this.v35.update(snapshot);
  }
}
