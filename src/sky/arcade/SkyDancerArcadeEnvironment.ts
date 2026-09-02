import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { SkyDancerArcadeReferenceWorld } from "./SkyDancerArcadeReferenceWorld";

const REFERENCE_CARRIER_NAME = "arcade-horizon-fleet-carrier";

/**
 * Compatibility entry: one owner for arcades, no accumulated presentation wrappers.
 * Owns arcade-product-gradient-sky, arcade-product-sun and streamed course layers.
 *
 * The carrier in the product reference is an illustrative set-piece, not permanent
 * scenery. Keep the model available for a later scripted encounter, but start every
 * stage with it hidden so it only appears when gameplay explicitly asks for it.
 */
export class SkyDancerArcadeEnvironment extends SkyDancerArcadeReferenceWorld {
  constructor(private readonly liveScene: THREE.Scene) {
    super(liveScene);
  }

  setWorldFrame(x: number, y: number, z: number, yaw: number): void {
    super.setWorldFrame(x, y, z, yaw);
  }

  override setStage(stage: SkyDancerArcadeStageDefinition): void {
    super.setStage(stage);
    const carrier = this.liveScene.getObjectByName(REFERENCE_CARRIER_NAME);
    if (!carrier) return;
    carrier.visible = false;
    carrier.userData.skyDancerReferenceOnly = true;
  }
}
