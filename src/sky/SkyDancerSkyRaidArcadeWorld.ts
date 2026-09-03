import * as THREE from "three";
import { SkyDancerArcadeEnvironment } from "./arcade/SkyDancerArcadeEnvironment";
import { skyDancerArcadeStageById, type SkyDancerArcadeStageDefinition, type SkyDancerArcadeStageId } from "./arcade/SkyDancerArcadeData";
import type { SkyDancerSkyRaidAct } from "./SkyDancerSkyRaidRules";

const LEGACY_ENV_PREFIXES = [
  "sky-dancer-v23-",
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

function wrapAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function dampAngle(current: number, target: number, response: number, delta: number): number {
  return current + wrapAngle(target - current) * (1 - Math.exp(-Math.max(0, response) * Math.max(0, delta)));
}

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

export class SkyDancerSkyRaidArcadeWorld {
  private readonly environment: SkyDancerArcadeEnvironment;
  private stage: SkyDancerArcadeStageDefinition | null = null;
  private stageStartElapsed = 0;
  private worldYaw = Math.PI;

  constructor(private readonly scene: THREE.Scene) {
    this.environment = new SkyDancerArcadeEnvironment(scene);
    suppressLegacyEnvironment(scene);
    scene.userData.skyRaidUsesArcadeReferenceWorld = true;
    scene.userData.skyRaidLegacyEnvironmentSuppressed = true;
  }

  update(actId: SkyDancerSkyRaidAct["id"], x: number, z: number, heading: number, altitude: number, elapsed: number, delta: number): void {
    suppressLegacyEnvironment(this.scene);
    if (!this.stage || this.stage.id !== actId) {
      this.stage = skyDancerArcadeStageById(actId as SkyDancerArcadeStageId);
      this.environment.setStage(this.stage);
      this.stageStartElapsed = elapsed;
      this.worldYaw = heading + Math.PI;
      suppressLegacyEnvironment(this.scene);
    }
    if (!this.stage) return;
    const desiredYaw = heading + Math.PI;
    const error = Math.abs(wrapAngle(desiredYaw - this.worldYaw));
    const response = error > 0.72 ? 0.95 : error > 0.38 ? 0.42 : 0.06;
    this.worldYaw = dampAngle(this.worldYaw, desiredYaw, response, delta);
    const localSeconds = Math.max(0, elapsed - this.stageStartElapsed);
    const authoredDistance = localSeconds * this.stage.courseSpeed * (this.stage.durationSeconds / 24);
    this.environment.setWorldFrame(x, 0, z, this.worldYaw);
    this.environment.update(authoredDistance, 0, altitude);
    this.scene.userData.skyRaidArcadeReferenceStage = this.stage.id;
    this.scene.userData.skyRaidArcadeReferenceDistance = authoredDistance;
    this.scene.userData.skyRaidArcadeWorldYaw = this.worldYaw;
  }

  dispose(): void { this.environment.dispose(); }
}
