import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV30 } from "./SkyDancerAirCombatFxV30";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { SkyDancerCloudQualityV31 } from "./SkyDancerCloudQualityV31";
import { SkyDancerGroundDensityV31 } from "./SkyDancerGroundDensityV31";
import { SkyDancerGroundReadabilityV31 } from "./SkyDancerGroundReadabilityV31";

interface V31CameraRuntime extends SkyDancerFxRuntime {
  applyCameraPresentation?(snapshot: CartArenaSessionSnapshot): void;
}

const V31_OWNED_PRESENTATION_ROOTS = [
  "sky-dancer-v30-valley-detail",
  "sky-dancer-v30-world-presentation",
  "sky-dancer-v30-sky",
  "sky-dancer-v31-ground-density",
  "sky-dancer-v31-cloud-system",
] as const;

/**
 * V31 keeps V30's ground-integrity ownership and adds product-facing world
 * density, cumulus depth and a high-altitude look-down calibration. The chase
 * camera position and FOV remain inherited; only final view pitch changes.
 */
export class SkyDancerAirCombatFxV31 extends SkyDancerAirCombatFxV30 {
  private readonly groundDensity: SkyDancerGroundDensityV31;
  private readonly groundReadability: SkyDancerGroundReadabilityV31;
  private readonly cloudQuality: SkyDancerCloudQualityV31;

  constructor(private readonly v31Runtime: SkyDancerFxRuntime) {
    super(v31Runtime);
    this.groundDensity = new SkyDancerGroundDensityV31(v31Runtime);
    this.groundReadability = new SkyDancerGroundReadabilityV31(v31Runtime);
    this.cloudQuality = new SkyDancerCloudQualityV31(v31Runtime);
    if (typeof queueMicrotask === "function") queueMicrotask(() => this.installCameraPitch());
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.restoreOwnedPresentationRoots();
    this.groundDensity.update(snapshot);
    this.groundReadability.update();
    this.cloudQuality.update(snapshot);
    this.hideBossWorldGauge(snapshot);
  }

  private restoreOwnedPresentationRoots(): void {
    for (const name of V31_OWNED_PRESENTATION_ROOTS) {
      const object = this.v31Runtime.scene.getObjectByName(name);
      if (object) object.visible = true;
    }
  }

  private installCameraPitch(): void {
    const runtime = this.v31Runtime as V31CameraRuntime;
    if (runtime.camera.userData.skyDancerV31PitchInstalled === true) return;
    const inherited = runtime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(runtime);
    runtime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      // Keep a high-altitude ground-dominant view without eliminating the sky
      // and horizon. -0.18 rad preserves roughly a 30/70 sky-to-ground balance
      // in the 844x390 audit viewport while keeping position and FOV unchanged.
      runtime.camera.rotateX(-0.18);
    };
    runtime.camera.userData.skyDancerV31PitchInstalled = true;
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
