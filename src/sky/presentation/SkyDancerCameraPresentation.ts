import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

interface CameraPresentationRuntime extends SkyDancerFxRuntime {
  applyCameraPresentation?(snapshot: CartArenaSessionSnapshot): void;
}

function scheduleInstall(install: () => void): void {
  if (typeof queueMicrotask === "function") queueMicrotask(install);
  else install();
}

function isSkyRaidMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
}

/**
 * SKY RAID owns a much wider vertical flight envelope than the historical
 * fixed-altitude Sky Dancer camera. This is intentionally applied by the last
 * camera decorator (V35), after the generic Sky Dancer camera has finished its
 * legacy y=-9.5 look target and after the V31/V32 decorators have run.
 *
 * The SKY RAID base camera already owns heading chase, turbo FOV, recoil,
 * hit shake and screen-space edge framing. Rebuilding its full orientation here
 * would create two competing camera owners and can make the world appear to
 * rotate or slide independently of the aircraft. Preserve that authored pose
 * whenever it is already safe, and use the player-relative camera below only as
 * a final emergency fallback if a later decorator ever pushes the aircraft out
 * of the safe frame.
 */
function finalizeSkyRaidCamera(
  runtime: CameraPresentationRuntime,
  snapshot: CartArenaSessionSnapshot,
): void {
  const playerPosition = runtime.playerVisual.getWorldPosition(new THREE.Vector3());
  runtime.camera.updateMatrixWorld(true);
  const inheritedProjection = playerPosition.clone().project(runtime.camera);
  const inheritedVisible = Math.abs(inheritedProjection.x) <= 1
    && Math.abs(inheritedProjection.y) <= 1
    && inheritedProjection.z >= -1
    && inheritedProjection.z <= 1;
  const inheritedSafe = inheritedVisible && Math.abs(inheritedProjection.y) <= 0.52;

  if (inheritedSafe) {
    runtime.scene.userData.skyRaidFinalCameraOwner = "v35-final-player-relative";
    runtime.scene.userData.skyRaidFinalCameraFallback = false;
    runtime.scene.userData.skyRaidFinalCameraPlayerNdcY = inheritedProjection.y;
    runtime.scene.userData.skyRaidFinalCameraPlayerVisible = true;
    return;
  }

  const altitude = Number(runtime.scene.userData.skyRaidPlayerAltitude ?? 0);
  const verticalSpeed = Number(runtime.scene.userData.skyRaidPlayerVerticalSpeed ?? 0);
  const pitch = Number(runtime.scene.userData.skyRaidPlayerPitch ?? 0);
  const bank = Number(runtime.scene.userData.skyRaidPlayerBank ?? 0);
  const normalizedAltitude = THREE.MathUtils.clamp((altitude + 18) / 82, 0, 1);
  const edgeDistance = Math.min(normalizedAltitude, 1 - normalizedAltitude);
  const altitudeEdgeBlend = 1 - THREE.MathUtils.smoothstep(edgeDistance, 0, 0.18);
  const leadScale = 1 - altitudeEdgeBlend * 0.92;
  const verticalLead = THREE.MathUtils.clamp(verticalSpeed * 0.06 * leadScale, -0.42, 0.42);
  const lookAhead = 6.2 + Math.min(4.8, Math.abs(snapshot.speed) * 0.13);
  const cameraHeight = 4.75 + altitudeEdgeBlend * 0.72;

  // Absolute player-relative Y is the safety fallback. Do not add an altitude
  // delta to a legacy camera whose own target may already have been overwritten.
  runtime.camera.position.y = playerPosition.y + cameraHeight;
  runtime.camera.lookAt(
    playerPosition.x + Math.sin(snapshot.heading) * lookAhead,
    playerPosition.y - 0.52 + verticalLead + pitch * 0.12,
    playerPosition.z + Math.cos(snapshot.heading) * lookAhead,
  );
  runtime.camera.rotateZ(bank * 0.055);
  runtime.camera.updateMatrixWorld(true);

  const playerProjection = playerPosition.clone().project(runtime.camera);
  runtime.scene.userData.skyRaidFinalCameraOwner = "v35-final-player-relative";
  runtime.scene.userData.skyRaidFinalCameraFallback = true;
  runtime.scene.userData.skyRaidFinalCameraPlayerNdcY = playerProjection.y;
  runtime.scene.userData.skyRaidFinalCameraPlayerVisible = Math.abs(playerProjection.x) <= 1 && Math.abs(playerProjection.y) <= 1 && playerProjection.z >= -1 && playerProjection.z <= 1;
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
      if (isSkyRaidMode()) return;
      cameraRuntime.camera.rotateX(-0.08);
    };
    cameraRuntime.camera.userData.skyDancerV31PitchInstalled = true;
  });
}

/** Preserve V32's final horizon balance as the last historical camera decorator. */
export function scheduleSkyDancerV32CameraBalance(runtime: SkyDancerFxRuntime): void {
  scheduleInstall(() => {
    const cameraRuntime = runtime as CameraPresentationRuntime;
    if (cameraRuntime.camera.userData.skyDancerV32ReferenceCamera === true) return;
    const inherited = cameraRuntime.applyCameraPresentation;
    if (typeof inherited !== "function") return;
    const base = inherited.bind(cameraRuntime);
    cameraRuntime.applyCameraPresentation = (snapshot: CartArenaSessionSnapshot) => {
      base(snapshot);
      if (isSkyRaidMode()) return;
      cameraRuntime.camera.rotateX(0.095);
    };
    cameraRuntime.camera.userData.skyDancerV32ReferenceCamera = true;
  });
}

/**
 * V35 keeps the aircraft in the lower-middle frame while preserving a broad sky
 * band above the city. Pass 7 eases the pass-6 pitch slightly so the aircraft
 * and skyline sit closer to the supplied reference instead of hugging the
 * bottom edge. Gameplay altitude and collision coordinates are untouched.
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
      if (isSkyRaidMode()) {
        finalizeSkyRaidCamera(cameraRuntime, snapshot);
        return;
      }
      cameraRuntime.camera.rotateX(0.205);
    };
    cameraRuntime.camera.userData.skyDancerV35ReferenceFraming = true;
  });
}
