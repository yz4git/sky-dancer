import * as THREE from "three";
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

  constructor(private readonly v31Runtime: SkyDancerFxRuntime) {
    super(v31Runtime);
    this.groundDensity = new SkyDancerGroundDensityV31(v31Runtime);
    this.cloudQuality = new SkyDancerCloudQualityV31(v31Runtime);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.groundDensity.update(snapshot);
    this.cloudQuality.update(snapshot);
    this.hideBossWorldGauge(snapshot);
  }

  private hideBossWorldGauge(snapshot: CartArenaSessionSnapshot): void {
    for (const enemy of snapshot.enemies) {
      if (enemy.kind !== "boss") continue;
      const group = this.v31Runtime.enemyGroups.get(enemy.id);
      if (!group) continue;
      const fill = group.getObjectByName("hp-fill");
      if (!(fill instanceof THREE.Mesh)) continue;
      fill.visible = false;
      for (const child of group.children) {
        if (!(child instanceof THREE.Mesh) || child === fill) continue;
        if (Math.abs(child.position.y - fill.position.y) < 0.08) child.visible = false;
      }
      group.userData.skyDancerV31BossWorldGaugeHidden = true;
    }
  }
}

export { SkyDancerAirCombatFxV31 as SkyDancerAirCombatFx };
