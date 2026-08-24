import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV31 } from "./SkyDancerAirCombatFxV31";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
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

  constructor(private readonly v32Runtime: SkyDancerFxRuntime) {
    super(v32Runtime);
    this.referencePresentation = new SkyDancerReferenceWorldV32(v32Runtime);
    if (typeof queueMicrotask === "function") queueMicrotask(() => this.installReferenceCameraComposition());
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.referencePresentation.update(snapshot);
  }

  private installReferenceCameraComposition(): void {
    const runtime = this.v32Runtime as V32CameraRuntime;
    if (runtime.camera.userData.skyDancerV32ReferenceCamera === true) return;
    const inherited = runtime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(runtime);
    runtime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      // V31 contributes -0.08 rad. Add +0.055 so V32 keeps only a subtle
      // -0.025 rad look-down: more sky/horizon and a lower, larger hero aircraft.
      runtime.camera.rotateX(0.055);
    };
    runtime.camera.userData.skyDancerV32ReferenceCamera = true;
  }
}

export { SkyDancerAirCombatFxV32 as SkyDancerAirCombatFx };
