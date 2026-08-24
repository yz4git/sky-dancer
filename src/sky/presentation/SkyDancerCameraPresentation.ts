import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

interface CameraPresentationRuntime extends SkyDancerFxRuntime {
  applyCameraPresentation?(snapshot: CartArenaSessionSnapshot): void;
}

function scheduleInstall(install: () => void): void {
  if (typeof queueMicrotask === "function") queueMicrotask(install);
  else install();
}

/** Preserve V31's camera decorator while keeping it out of the FX inheritance chain. */
export function scheduleSkyDancerV31CameraPitch(runtime: SkyDancerFxRuntime): void {
  scheduleInstall(() => {
    const cameraRuntime = runtime as CameraPresentationRuntime;
    if (cameraRuntime.camera.userData.skyDancerV31PitchInstalled === true) return;
    const inherited = cameraRuntime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(cameraRuntime);
    cameraRuntime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      cameraRuntime.camera.rotateX(-0.08);
    };
    cameraRuntime.camera.userData.skyDancerV31PitchInstalled = true;
  });
}

/** Preserve V32's final horizon balance as the last camera presentation decorator. */
export function scheduleSkyDancerV32CameraBalance(runtime: SkyDancerFxRuntime): void {
  scheduleInstall(() => {
    const cameraRuntime = runtime as CameraPresentationRuntime;
    if (cameraRuntime.camera.userData.skyDancerV32ReferenceCamera === true) return;
    const inherited = cameraRuntime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(cameraRuntime);
    cameraRuntime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      cameraRuntime.camera.rotateX(0.095);
    };
    cameraRuntime.camera.userData.skyDancerV32ReferenceCamera = true;
  });
}

/**
 * V35 lowers the visual horizon so the frame carries more blue sky and less
 * featureless foreground, matching the supplied reference composition without
 * changing gameplay altitude or collision coordinates.
 */
export function scheduleSkyDancerV35ReferenceFraming(runtime: SkyDancerFxRuntime): void {
  scheduleInstall(() => {
    const cameraRuntime = runtime as CameraPresentationRuntime;
    if (cameraRuntime.camera.userData.skyDancerV35ReferenceFraming === true) return;
    const inherited = cameraRuntime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(cameraRuntime);
    cameraRuntime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      cameraRuntime.camera.rotateX(0.085);
    };
    cameraRuntime.camera.userData.skyDancerV35ReferenceFraming = true;
  });
}
