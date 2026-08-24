import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { SkyDancerV30PresentationPass } from "./SkyDancerV30PresentationPass";
import { SkyDancerV31PresentationPass } from "./SkyDancerV31PresentationPass";
import { SkyDancerV32PresentationPass } from "./SkyDancerV32PresentationPass";
import { SkyDancerV34QualityPass } from "./SkyDancerV34QualityPass";
import { SkyDancerV35ReferencePass } from "./SkyDancerV35ReferencePass";
import { installSkyDancerV35VisualAuditBridge } from "./SkyDancerV35VisualAuditBridge";
import { SkyDancerV36WorldGeometryPass } from "./SkyDancerV36WorldGeometryPass";
import { SkyDancerV37AircraftCombatPass } from "./SkyDancerV37AircraftCombatPass";
import { SkyDancerV38AtmospherePass } from "./SkyDancerV38AtmospherePass";
import { installSkyDancerV39VisualAuditBridge } from "./SkyDancerV39VisualAuditBridge";

/** Stable modern presentation pipeline. */
export class SkyDancerPresentationPipeline {
  private readonly v30: SkyDancerV30PresentationPass;
  private readonly v31: SkyDancerV31PresentationPass;
  private readonly v32: SkyDancerV32PresentationPass;
  private readonly v34: SkyDancerV34QualityPass;
  private readonly v35: SkyDancerV35ReferencePass;
  private readonly v36: SkyDancerV36WorldGeometryPass;
  private readonly v37: SkyDancerV37AircraftCombatPass;
  private readonly v38: SkyDancerV38AtmospherePass;

  constructor(runtime: SkyDancerFxRuntime) {
    this.v30 = new SkyDancerV30PresentationPass(runtime);
    this.v31 = new SkyDancerV31PresentationPass(runtime);
    this.v32 = new SkyDancerV32PresentationPass(runtime);
    this.v34 = new SkyDancerV34QualityPass(runtime);
    this.v35 = new SkyDancerV35ReferencePass(runtime);
    this.v36 = new SkyDancerV36WorldGeometryPass(runtime);
    this.v37 = new SkyDancerV37AircraftCombatPass(runtime);
    this.v38 = new SkyDancerV38AtmospherePass(runtime);
    installSkyDancerV35VisualAuditBridge(runtime);
    installSkyDancerV39VisualAuditBridge(runtime);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.v30.update(snapshot);
    this.v31.update(snapshot);
    this.v32.update(snapshot);
    this.v34.update(snapshot);
    this.v35.update(snapshot);
    this.v36.update(snapshot);
    this.v37.update(snapshot);
    this.v38.update(snapshot);
  }
}
