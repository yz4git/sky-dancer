import type { CartEnemyState } from "../cart/CartCombat";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { RallyInputState } from "../rally/RallyTypes";
import { SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE } from "./SkyDancerPlayerWeapons";
import { getSkyDancerStageCycleSnapshot } from "./SkyDancerStageCycle";

interface ReengagementSession {
  enemies: CartEnemyState[];
  location: { node: { id: string } };
  car: { position: { x: number; z: number } };
  step(input: RallyInputState, fixedDelta?: number): void;
}

export interface SkyDancerReengagementSnapshotV40 {
  phase: "reinforcements" | "cleanup" | "boss" | "stage-clear" | "unknown";
  correctedEnemies: number;
  maxEnemyDistance: number;
  cleanupActive: boolean;
}

const PATCHED_KEY = "__skyDancerReengagementV40Installed__";
const GLOBAL_DEBUG_KEY = "__skyDancerGetReengagementV40";
const latestBySession = new WeakMap<object, SkyDancerReengagementSnapshotV40>();

export const SKY_DANCER_V40_LOCK_RANGE = SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE;
export const SKY_DANCER_V40_REENGAGE_TRIGGER = 53;
export const SKY_DANCER_V40_REENGAGE_TARGET = 43;
export const SKY_DANCER_V40_CLEANUP_TRIGGER = 49;
export const SKY_DANCER_V40_CLEANUP_TARGET = 39;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function rotateToward(current: number, target: number, maxTurn: number): number {
  const delta = normalizeAngle(target - current);
  return normalizeAngle(current + clamp(delta, -maxTurn, maxTurn));
}

/**
 * Closing speed applied after the inherited flight AI has stepped.
 * Cleanup deliberately closes faster than the player's sustained cruise so a
 * survivor cannot sit outside the 58 m missile lock range for tens of seconds.
 */
export function skyDancerReengagementClosingSpeedV40(distance: number, cleanup: boolean): number {
  const target = cleanup ? SKY_DANCER_V40_CLEANUP_TARGET : SKY_DANCER_V40_REENGAGE_TARGET;
  const excess = Math.max(0, distance - target);
  return cleanup
    ? clamp(34 + excess * 0.92, 34, 54)
    : clamp(20 + excess * 0.56, 20, 36);
}

export function installSkyDancerReengagementV40(): void {
  const prototype = CartArenaSession.prototype as unknown as ReengagementSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerReengagementV40Step(
    this: ReengagementSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    previous.call(this, input, fixedDelta);
    const concrete = this as unknown as CartArenaSession;
    const stage = getSkyDancerStageCycleSnapshot(concrete);
    const phase = stage?.phase ?? "unknown";
    const cleanup = phase === "cleanup";
    const delta = clamp(fixedDelta ?? 1 / 60, 0.001, 0.05);
    const px = this.car.position.x;
    const pz = this.car.position.z;
    const nodeId = this.location.node.id;
    const trigger = cleanup ? SKY_DANCER_V40_CLEANUP_TRIGGER : SKY_DANCER_V40_REENGAGE_TRIGGER;
    const target = cleanup ? SKY_DANCER_V40_CLEANUP_TARGET : SKY_DANCER_V40_REENGAGE_TARGET;
    let correctedEnemies = 0;
    let maxEnemyDistance = 0;

    if (phase !== "boss" && phase !== "stage-clear") {
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.kind === "boss" || enemy.nodeId !== nodeId) continue;
        const dx = px - enemy.x;
        const dz = pz - enemy.z;
        const distance = Math.hypot(dx, dz);
        maxEnemyDistance = Math.max(maxEnemyDistance, distance);
        if (distance <= trigger || distance < 0.001) continue;

        const inv = 1 / distance;
        const closingSpeed = skyDancerReengagementClosingSpeedV40(distance, cleanup);
        const correction = Math.min(Math.max(0, distance - target), closingSpeed * delta);
        enemy.x += dx * inv * correction;
        enemy.z += dz * inv * correction;
        const desiredHeading = Math.atan2(dx, dz);
        enemy.heading = rotateToward(enemy.heading, desiredHeading, (cleanup ? 3.2 : 2.15) * delta);
        correctedEnemies += 1;
      }
    }

    const snapshot: SkyDancerReengagementSnapshotV40 = {
      phase,
      correctedEnemies,
      maxEnemyDistance,
      cleanupActive: cleanup,
    };
    latestBySession.set(this as unknown as object, snapshot);
    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>)[GLOBAL_DEBUG_KEY] = () => ({ ...snapshot });
    }
  };
}

export function getSkyDancerReengagementSnapshotV40(session: CartArenaSession): SkyDancerReengagementSnapshotV40 | null {
  const current = latestBySession.get(session as unknown as object);
  return current ? { ...current } : null;
}
