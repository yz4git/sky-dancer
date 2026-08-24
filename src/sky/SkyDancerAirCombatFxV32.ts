import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV31 } from "./SkyDancerAirCombatFxV31";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { SkyDancerReferencePolishV32 } from "./SkyDancerReferencePolishV32";
import { SkyDancerReferenceWorldV32 } from "./SkyDancerReferenceWorldV32";

interface V32CameraRuntime extends SkyDancerFxRuntime {
  applyCameraPresentation?(snapshot: CartArenaSessionSnapshot): void;
}

/**
 * V32 Reference Match Quality Pass.
 *
 * Keeps V31's stable 300 m flight/gameplay stack, then replaces only visual
 * composition that still diverged from the supplied reference: near pyramids,
 * evenly-scattered box cities, isolated clouds, small hero aircraft and a
 * ground-heavy chase angle.
 */
export class SkyDancerAirCombatFxV32 extends SkyDancerAirCombatFxV31 {
  // Do not call this `referenceWorld`: V25 already owns a THREE.Group under that
  // property name and its updateWorldAnchor() depends on `.position.set()`.
  private readonly referencePresentation: SkyDancerReferenceWorldV32;
  private readonly referencePolish: SkyDancerReferencePolishV32;

  constructor(private readonly v32Runtime: SkyDancerFxRuntime) {
    super(v32Runtime);
    this.referencePresentation = new SkyDancerReferenceWorldV32(v32Runtime);
    this.referencePolish = new SkyDancerReferencePolishV32(v32Runtime);
    if (typeof queueMicrotask === "function") queueMicrotask(() => this.installReferenceCameraComposition());
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.referencePresentation.update(snapshot);
    // Run last so this is the final visible composition authority.
    this.referencePolish.update(snapshot);
  }

  private installReferenceCameraComposition(): void {
    const runtime = this.v32Runtime as V32CameraRuntime;
    if (runtime.camera.userData.skyDancerV32ReferenceCamera === true) return;
    const inherited = runtime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(runtime);
    runtime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      // V31 contributes -0.08 rad. +0.095 leaves a slight upward net pitch,
      // lowering the horizon in frame and matching the reference's sky/ground
      // balance without moving the chase camera or changing its FOV.
      runtime.camera.rotateX(0.095);
    };
    runtime.camera.userData.skyDancerV32ReferenceCamera = true;
  }
}

export { SkyDancerAirCombatFxV32 as SkyDancerAirCombatFx };
