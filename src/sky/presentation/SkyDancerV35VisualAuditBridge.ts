import * as THREE from "three";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

export interface SkyDancerV35VisualAuditSnapshot {
  focusCityCount: number;
  focusStreetCount: number;
  riverCount: number;
  focusCloudCount: number;
  focusMountainCount: number;
  focusRootZ: number | null;
  focusCenterWorldZ: number | null;
  cameraZ: number;
  fieldsVisible: boolean;
  settlementsVisible: boolean;
  towersVisible: boolean;
  roadsVisible: boolean;
  v34MassesVisible: boolean;
  legacyRidgesVisible: boolean;
  focusCityVisible: boolean;
  cameraFramingInstalled: boolean;
  singleOwnerInstalled: boolean;
  fogNear: number | null;
  fogFar: number | null;
}

function instanceCount(runtime: SkyDancerFxRuntime, name: string): number {
  const object = runtime.scene.getObjectByName(name);
  return object instanceof THREE.InstancedMesh ? object.count : 0;
}

function visible(runtime: SkyDancerFxRuntime, name: string): boolean {
  return runtime.scene.getObjectByName(name)?.visible ?? false;
}

export function getSkyDancerV35VisualAuditSnapshot(runtime: SkyDancerFxRuntime): SkyDancerV35VisualAuditSnapshot {
  const fog = runtime.scene.fog;
  const focusRoot = runtime.scene.getObjectByName("sky-dancer-v35-reference-focus-city");
  const focusRootZ = focusRoot?.position.z ?? null;
  const localCenterZ = typeof focusRoot?.userData.skyDancerV35LocalCenterZ === "number"
    ? focusRoot.userData.skyDancerV35LocalCenterZ
    : null;
  const focusCenterWorldZ = focusRootZ !== null && localCenterZ !== null ? focusRootZ + localCenterZ : null;
  const focusMountainCount = instanceCount(runtime, "sky-dancer-v35-front-mountains-far")
    + instanceCount(runtime, "sky-dancer-v35-front-mountains-near");

  return {
    focusCityCount: instanceCount(runtime, "sky-dancer-v35-focus-buildings"),
    focusStreetCount: instanceCount(runtime, "sky-dancer-v35-focus-streets"),
    riverCount: instanceCount(runtime, "sky-dancer-v35-focus-river"),
    focusCloudCount: instanceCount(runtime, "sky-dancer-v35-front-cloud-patches"),
    focusMountainCount,
    focusRootZ,
    focusCenterWorldZ,
    cameraZ: runtime.camera.position.z,
    fieldsVisible: visible(runtime, "sky-dancer-v31-patchwork-fields"),
    settlementsVisible: visible(runtime, "sky-dancer-v31-settlement-buildings"),
    towersVisible: visible(runtime, "sky-dancer-v31-landmark-towers"),
    roadsVisible: visible(runtime, "sky-dancer-v31-road-network"),
    v34MassesVisible: visible(runtime, "sky-dancer-v34-irregular-terrain-masses"),
    legacyRidgesVisible: [
      "sky-dancer-v32-polish-ridge-near",
      "sky-dancer-v32-polish-ridge-far",
      "sky-dancer-v32-ridge-near",
      "sky-dancer-v32-ridge-far",
    ].some((name) => visible(runtime, name)),
    focusCityVisible: visible(runtime, "sky-dancer-v35-focus-buildings"),
    cameraFramingInstalled: runtime.camera.userData.skyDancerV35ReferenceFraming === true,
    singleOwnerInstalled: runtime.scene.userData.skyDancerV35ReferenceOwner === "single-pass",
    fogNear: fog instanceof THREE.Fog ? fog.near : null,
    fogFar: fog instanceof THREE.Fog ? fog.far : null,
  };
}

export function installSkyDancerV35VisualAuditBridge(runtime: SkyDancerFxRuntime): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.webdriver) return;
  const globals = window as unknown as Record<string, unknown>;
  globals.__skyDancerGetReferenceVisualV35 = () => getSkyDancerV35VisualAuditSnapshot(runtime);
}
