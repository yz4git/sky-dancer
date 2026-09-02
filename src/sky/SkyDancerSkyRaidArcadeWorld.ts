import * as THREE from "three";
import { SkyDancerArcadeEnvironment } from "./arcade/SkyDancerArcadeEnvironment";
import { skyDancerArcadeStageById, type SkyDancerArcadeStageDefinition, type SkyDancerArcadeStageId } from "./arcade/SkyDancerArcadeData";
import type { SkyDancerSkyRaidAct } from "./SkyDancerSkyRaidRules";

function wrapAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function dampAngle(current: number, target: number, response: number, delta: number): number {
  return current + wrapAngle(target - current) * (1 - Math.exp(-Math.max(0, response) * Math.max(0, delta)));
}

export class SkyDancerSkyRaidArcadeWorld {
  private readonly environment: SkyDancerArcadeEnvironment;
  private stage: SkyDancerArcadeStageDefinition | null = null;
  private stageStartElapsed = 0;
  private worldYaw = Math.PI;

  constructor(private readonly scene: THREE.Scene) {
    this.environment = new SkyDancerArcadeEnvironment(scene);
    scene.userData.skyRaidUsesArcadeReferenceWorld = true;
  }

  update(actId: SkyDancerSkyRaidAct["id"], x: number, z: number, heading: number, altitude: number, elapsed: number, delta: number): void {
    if (!this.stage || this.stage.id !== actId) {
      this.stage = skyDancerArcadeStageById(actId as SkyDancerArcadeStageId);
      this.environment.setStage(this.stage);
      this.stageStartElapsed = elapsed;
      this.worldYaw = heading + Math.PI;
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
