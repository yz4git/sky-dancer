import * as THREE from "three";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";

export interface SkyDancerV35VisualAuditSnapshot {
  cityLow: number;
  cityMid: number;
  cityHigh: number;
  cityTotal: number;
  roadCount: number;
  riverCount: number;
  cloudCount: number;
  fieldsVisible: boolean;
  settlementsVisible: boolean;
  towersVisible: boolean;
  v34MassesVisible: boolean;
  legacyRidgesVisible: boolean;
  cameraFramingInstalled: boolean;
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
  const cityLow = instanceCount(runtime, "sky-dancer-v35-city-low");
  const cityMid = instanceCount(runtime, "sky-dancer-v35-city-mid");
  const cityHigh = instanceCount(runtime, "sky-dancer-v35-city-high");
  const fog = runtime.scene.fog;
  return {
    cityLow,
    cityMid,
    cityHigh,
    cityTotal: cityLow + cityMid + cityHigh,
    roadCount: instanceCount(runtime, "sky-dancer-v35-metro-road-grid"),
    riverCount: instanceCount(runtime, "sky-dancer-v35-metro-river"),
    cloudCount: instanceCount(runtime, "sky-dancer-v35-cloud-main"),
    fieldsVisible: visible(runtime, "sky-dancer-v31-patchwork-fields"),
    settlementsVisible: visible(runtime, "sky-dancer-v31-settlement-buildings"),
    towersVisible: visible(runtime, "sky-dancer-v31-landmark-towers"),
    v34MassesVisible: visible(runtime, "sky-dancer-v34-irregular-terrain-masses"),
    legacyRidgesVisible: [
      "sky-dancer-v32-polish-ridge-near",
      "sky-dancer-v32-polish-ridge-far",
      "sky-dancer-v32-ridge-near",
      "sky-dancer-v32-ridge-far",
    ].some((name) => visible(runtime, name)),
    cameraFramingInstalled: runtime.camera.userData.skyDancerV35ReferenceFraming === true,
    fogNear: fog instanceof THREE.Fog ? fog.near : null,
    fogFar: fog instanceof THREE.Fog ? fog.far : null,
  };
}

export function installSkyDancerV35VisualAuditBridge(runtime: SkyDancerFxRuntime): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.webdriver) return;
  const globals = window as unknown as Record<string, unknown>;
  globals.__skyDancerGetReferenceVisualV35 = () => getSkyDancerV35VisualAuditSnapshot(runtime);
}
