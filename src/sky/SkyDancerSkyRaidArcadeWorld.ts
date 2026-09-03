import * as THREE from "three";
import { SkyDancerArcadeEnvironment } from "./arcade/SkyDancerArcadeEnvironment";
import { skyDancerArcadeStageById, type SkyDancerArcadeStageDefinition, type SkyDancerArcadeStageId } from "./arcade/SkyDancerArcadeData";
import type { SkyDancerSkyRaidAct } from "./SkyDancerSkyRaidRules";

const LEGACY_ENV_PREFIXES = [
  "sky-dancer-v23-",
  "sky-dancer-v25-",
  "sky-dancer-v28-",
  "sky-dancer-v30-",
  "sky-dancer-v32-",
  "sky-dancer-v35-",
  "sky-dancer-v36-",
  "sky-dancer-v38-",
  "sky-dancer-v40-",
  "sky-dancer-v41-",
  "sky-dancer-v42-",
  "sky-dancer-v47-",
  "sky-dancer-v50-",
  "sky-dancer-v53-",
] as const;

function insideArcadeEnvironment(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.name === "arcade-course-environment") return true;
    current = current.parent;
  }
  return false;
}

function suppressLegacyEnvironment(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (insideArcadeEnvironment(object)) return;
    const legacyNamed = object.name === "phase67-turbo-hunt-world"
      || object.name === "sky-dancer-legacy-environment"
      || LEGACY_ENV_PREFIXES.some((prefix) => object.name.startsWith(prefix));
    const legacyTheme = object.userData.skyDancerLegacyEnvironment === true;
    const legacyLargeSky = object instanceof THREE.Mesh
      && object.geometry instanceof THREE.SphereGeometry
      && object.geometry.parameters.radius >= 250;
    if (legacyNamed || legacyTheme || legacyLargeSky) object.visible = false;
  });
}

/**
 * SKY RAID reuses Arcade Run's authored scenery as a stationary world, not as a
 * rail-scrolling renderer. The frame is captured once when each ACT begins.
 * Player x/z/heading changes never move or rotate the environment afterward;
 * therefore the Turbo Hunt 360-degree movement remains the actual world motion.
 */
export class SkyDancerSkyRaidArcadeWorld {
  private readonly environment: SkyDancerArcadeEnvironment;
  private stage: SkyDancerArcadeStageDefinition | null = null;
  private anchorX = 0;
  private anchorZ = 0;
  private anchorYaw = Math.PI;

  constructor(private readonly scene: THREE.Scene) {
    this.environment = new SkyDancerArcadeEnvironment(scene);
    suppressLegacyEnvironment(scene);
    scene.userData.skyRaidUsesArcadeReferenceWorld = true;
    scene.userData.skyRaidLegacyEnvironmentSuppressed = true;
    scene.userData.skyRaidFreeFlightWorld = true;
  }

  update(
    actId: SkyDancerSkyRaidAct["id"],
    x: number,
    z: number,
    heading: number,
    _altitude: number,
    _elapsed: number,
    _delta: number,
  ): void {
    suppressLegacyEnvironment(this.scene);

    if (!this.stage || this.stage.id !== actId) {
      this.stage = skyDancerArcadeStageById(actId as SkyDancerArcadeStageId);
      this.environment.setStage(this.stage);

      // Arcade Run's local forward is -Z, while Sky Dancer heading 0 travels +Z.
      // Capture that conversion once per ACT. Never chase the aircraft afterward.
      this.anchorX = x;
      this.anchorZ = z;
      this.anchorYaw = heading + Math.PI;
      this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);

      // setStage() already initializes distance 0, but reassert the stationary
      // frame so an ACT transition cannot inherit any previous rail-scroll state.
      this.environment.update(0, 0, 0);
      suppressLegacyEnvironment(this.scene);
    }

    if (!this.stage) return;

    // Reassert only the captured ACT frame. There is deliberately no elapsed-time
    // course progression and no heading-follow yaw here: the player flies through
    // the world instead of the world scrolling/rotating around the player.
    this.environment.setWorldFrame(this.anchorX, 0, this.anchorZ, this.anchorYaw);

    this.scene.userData.skyRaidArcadeReferenceStage = this.stage.id;
    this.scene.userData.skyRaidArcadeReferenceDistance = 0;
    this.scene.userData.skyRaidArcadeWorldYaw = this.anchorYaw;
    this.scene.userData.skyRaidArcadeWorldAnchorX = this.anchorX;
    this.scene.userData.skyRaidArcadeWorldAnchorZ = this.anchorZ;
    this.scene.userData.skyRaidArcadeWorldLocked = true;
  }

  dispose(): void { this.environment.dispose(); }
}
