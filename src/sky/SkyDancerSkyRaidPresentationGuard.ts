import * as THREE from "three";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { skyDancerArcadeStageById, type SkyDancerArcadeStageId } from "./arcade/SkyDancerArcadeData";
import { ARCADE_FOG_FAR, ARCADE_FOG_NEAR, referenceAtmosphere } from "./arcade/SkyDancerArcadeReferenceMaterials";

const LEGACY_ENV_PREFIXES = [
  "sky-dancer-v23-", "sky-dancer-v25-", "sky-dancer-v28-", "sky-dancer-v30-", "sky-dancer-v32-",
  "sky-dancer-v35-", "sky-dancer-v36-", "sky-dancer-v38-", "sky-dancer-v40-",
  "sky-dancer-v41-", "sky-dancer-v42-", "sky-dancer-v47-", "sky-dancer-v50-", "sky-dancer-v53-",
] as const;

function active(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
}

function insideArcadeEnvironment(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.name === "arcade-course-environment") return true;
    current = current.parent;
  }
  return false;
}

export function finalizeSkyRaidReferencePresentation(runtime: SkyDancerFxRuntime): void {
  if (!active()) return;
  const scene = runtime.scene;
  const arcadeRoot = scene.getObjectByName("arcade-course-environment");
  if (!arcadeRoot) return;
  scene.traverse((object) => {
    if (object === arcadeRoot || insideArcadeEnvironment(object)) return;
    const legacyNamed = object.name === "phase67-turbo-hunt-world"
      || object.name === "sky-dancer-legacy-environment"
      || LEGACY_ENV_PREFIXES.some((prefix) => object.name.startsWith(prefix));
    const legacyTheme = object.userData.skyDancerLegacyEnvironment === true;
    const legacyLargeSky = object instanceof THREE.Mesh && object.geometry instanceof THREE.SphereGeometry && object.geometry.parameters.radius >= 250;
    if (legacyNamed || legacyTheme || legacyLargeSky) object.visible = false;
    if (object.parent === scene && object instanceof THREE.Light) object.visible = false;
  });
  arcadeRoot.visible = true;
  arcadeRoot.traverse((object) => { if (object instanceof THREE.Light) object.visible = true; });
  const actId = document.documentElement.dataset.skyRaidAct as SkyDancerArcadeStageId | undefined;
  if (!actId) return;
  const atmosphere = referenceAtmosphere(skyDancerArcadeStageById(actId));
  scene.background = atmosphere.zenith;
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.copy(atmosphere.fog);
    scene.fog.near = ARCADE_FOG_NEAR;
    scene.fog.far = ARCADE_FOG_FAR;
  } else {
    scene.fog = new THREE.Fog(atmosphere.fog, ARCADE_FOG_NEAR, ARCADE_FOG_FAR);
  }
  scene.userData.skyRaidReferencePresentationFinalized = true;
}
