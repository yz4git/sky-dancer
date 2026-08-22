import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { installSkyDancerFlightAvoidance } from "./SkyDancerFlightAvoidance";
import { SkyDancerAirCombatFxV6 } from "./SkyDancerAirCombatFxV6";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";

interface FlightVisualRuntime extends SkyDancerFxRuntime {
  steer?: number;
}

export const SKY_DANCER_PRESENTATION_ALTITUDE_METERS = 105;
const LOW_ALTITUDE_GROUND_SHIFT = 12;

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Flight-feel pass:
 * - installs missile-fighter standoff / collision-avoidance behavior,
 * - makes bank angle visibly communicate turn rate for player and enemies,
 * - adds a small camera-follow roll so the whole shot reads as aircraft flight,
 * - removes the player-underfoot torus marker,
 * - lowers the visual flight altitude so ground detail reads more strongly.
 */
export class SkyDancerAirCombatFxV7 extends SkyDancerAirCombatFxV6 {
  private readonly runtimeV7: FlightVisualRuntime;
  private lowAltitudeApplied = false;
  private cameraFlightRoll = 0;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    this.runtimeV7 = runtime as FlightVisualRuntime;
    installSkyDancerFlightAvoidance();
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    this.updateFlightAttitude(snapshot, delta);
    super.update(snapshot, missiles, delta);

    if (!this.lowAltitudeApplied) {
      this.lowAltitudeApplied = true;
      this.applyLowAltitudePresentation();
    }
    this.removePlayerUnderRing();
  }

  override getCameraRollImpulse(): number {
    return super.getCameraRollImpulse() + this.cameraFlightRoll;
  }

  private updateFlightAttitude(snapshot: CartArenaSessionSnapshot, delta: number): void {
    const steer = THREE.MathUtils.clamp(this.runtimeV7.steer ?? 0, -1, 1);
    const speedFactor = THREE.MathUtils.clamp(Math.abs(snapshot.speed) / 20, 0, 1);
    const playerBankLimit = 0.58 + speedFactor * 0.24;
    const targetPlayerBank = THREE.MathUtils.clamp(-steer * playerBankLimit, -0.82, 0.82);
    const bankResponse = Math.min(1, delta * (6.4 + speedFactor * 2.4));
    this.runtimeV7.playerVisual.rotation.z += (targetPlayerBank - this.runtimeV7.playerVisual.rotation.z) * bankResponse;

    // A banked aircraft needs a slight pitch-up attitude to visually hold the turn.
    // Turbo flattens it a little, reading as acceleration rather than a car lean.
    const targetPlayerPitch = Math.abs(targetPlayerBank) * 0.075 - (snapshot.boostActive ? 0.032 : 0);
    this.runtimeV7.playerVisual.rotation.x += (targetPlayerPitch - this.runtimeV7.playerVisual.rotation.x) * Math.min(1, delta * 5.6);
    this.cameraFlightRoll += (this.runtimeV7.playerVisual.rotation.z * 0.105 - this.cameraFlightRoll) * Math.min(1, delta * 4.8);

    for (const enemy of snapshot.enemies) {
      if (!enemy.alive || enemy.nodeId !== snapshot.nodeId) continue;
      const group = this.runtimeV7.enemyGroups.get(enemy.id);
      if (!group || !group.visible) continue;

      const previousHeading = Number(group.userData.skyDancerQ7Heading ?? enemy.heading);
      const headingDelta = normalizeAngle(enemy.heading - previousHeading);
      const angularRate = headingDelta / Math.max(0.001, delta);
      const targetBank = THREE.MathUtils.clamp(-angularRate * 0.52, -0.86, 0.86);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 6.8);

      const targetPitch = Math.abs(targetBank) * 0.085 - 0.015;
      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 5.0);
      group.position.y += Math.abs(group.rotation.z) * 0.18;
      group.userData.skyDancerQ7Heading = enemy.heading;
    }
  }

  private applyLowAltitudePresentation(): void {
    const scene = this.runtimeV7.scene;

    // V5 built the high-altitude landscape around y=-46. Lift only the terrain
    // picture, not clouds or aircraft, to bring the flight level down without
    // changing horizontal gameplay coordinates or collision logic.
    for (const object of scene.children) {
      if (!object.name.startsWith("sky-dancer-q5-")) continue;
      if (object.name === "sky-dancer-q5-cloud-banks") continue;
      object.position.y += LOW_ALTITUDE_GROUND_SHIFT;
    }

    scene.userData.skyDancerAltitudeMeters = SKY_DANCER_PRESENTATION_ALTITUDE_METERS;
    scene.userData.verticalRenderScaleMetersPerUnit = SKY_DANCER_PRESENTATION_ALTITUDE_METERS / 34;
    scene.fog = new THREE.Fog(0xd3e4e8, 104, 420);
  }

  private removePlayerUnderRing(): void {
    this.runtimeV7.playerVisual.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.geometry.type === "TorusGeometry") object.visible = false;
    });
  }
}

export { SkyDancerAirCombatFxV7 as SkyDancerAirCombatFx };
