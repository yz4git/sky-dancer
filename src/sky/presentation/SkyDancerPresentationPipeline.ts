import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { SkyDancerTerrainContinuityV41 } from "./SkyDancerTerrainContinuityV41";
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
import { SkyDancerV40CityExpansionPass } from "./SkyDancerV40CityExpansionPass";
import { SkyDancerV42ContinuityPass } from "./SkyDancerV42ContinuityPass";
import { SkyDancerV43VerticalCombatPass } from "./SkyDancerV43VerticalCombatPass";
import { SkyDancerV44ReadabilityPass } from "./SkyDancerV44ReadabilityPass";
import { SkyDancerV45DecisionHierarchyPass } from "./SkyDancerV45DecisionHierarchyPass";
import { SkyDancerV47WorldReconstructionPass } from "./SkyDancerV47WorldReconstructionPass";
import { SkyDancerV48BossSetpiecePass } from "./SkyDancerV48BossSetpiecePass";
import { SkyDancerV50ColorScriptAtmospherePass } from "./SkyDancerV50ColorScriptAtmospherePass";
import { SkyDancerV51AircraftSilhouettePass } from "./SkyDancerV51AircraftSilhouettePass";
import { SkyDancerV52CombatFxSpeedPass } from "./SkyDancerV52CombatFxSpeedPass";
import { SkyDancerV53SetpieceEnvironmentDensityPass } from "./SkyDancerV53SetpieceEnvironmentDensityPass";

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
  private readonly v40: SkyDancerV40CityExpansionPass;
  private readonly v41Terrain: SkyDancerTerrainContinuityV41;
  private readonly v42: SkyDancerV42ContinuityPass;
  private readonly v43: SkyDancerV43VerticalCombatPass;
  private readonly v44: SkyDancerV44ReadabilityPass;
  private readonly v45: SkyDancerV45DecisionHierarchyPass;
  private readonly v47: SkyDancerV47WorldReconstructionPass;
  private readonly v48: SkyDancerV48BossSetpiecePass;
  private readonly v50: SkyDancerV50ColorScriptAtmospherePass;
  private readonly v51: SkyDancerV51AircraftSilhouettePass;
  private readonly v52: SkyDancerV52CombatFxSpeedPass;
  private readonly v53: SkyDancerV53SetpieceEnvironmentDensityPass;

  constructor(runtime: SkyDancerFxRuntime) {
    this.v30 = new SkyDancerV30PresentationPass(runtime);
    this.v31 = new SkyDancerV31PresentationPass(runtime);
    this.v32 = new SkyDancerV32PresentationPass(runtime);
    this.v34 = new SkyDancerV34QualityPass(runtime);
    this.v35 = new SkyDancerV35ReferencePass(runtime);
    this.v36 = new SkyDancerV36WorldGeometryPass(runtime);
    this.v37 = new SkyDancerV37AircraftCombatPass(runtime);
    this.v38 = new SkyDancerV38AtmospherePass(runtime);
    this.v40 = new SkyDancerV40CityExpansionPass(runtime);
    this.v41Terrain = new SkyDancerTerrainContinuityV41(runtime);
    this.v42 = new SkyDancerV42ContinuityPass(runtime);
    this.v43 = new SkyDancerV43VerticalCombatPass(runtime);
    this.v44 = new SkyDancerV44ReadabilityPass(runtime);
    this.v45 = new SkyDancerV45DecisionHierarchyPass(runtime);
    this.v47 = new SkyDancerV47WorldReconstructionPass(runtime);
    this.v48 = new SkyDancerV48BossSetpiecePass(runtime);
    this.v50 = new SkyDancerV50ColorScriptAtmospherePass(runtime);
    this.v51 = new SkyDancerV51AircraftSilhouettePass(runtime);
    this.v52 = new SkyDancerV52CombatFxSpeedPass(runtime);
    this.v53 = new SkyDancerV53SetpieceEnvironmentDensityPass(runtime);
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
    this.v40.update(snapshot);
    this.v41Terrain.update(snapshot);
    this.v42.update(snapshot);
    this.v43.update(snapshot);
    this.v44.update(snapshot);
    this.v45.update(snapshot);
    this.v47.update(snapshot);
    this.v48.update(snapshot);
    this.v50.update(snapshot);
    this.v51.update(snapshot);
    this.v52.update(snapshot);
    this.v53.update(snapshot);
  }
}
