import type { CartEnemyState } from "../cart/CartCombat";
import { CartArenaSession } from "../cart/CartArenaSession";
import {
  CART_TURBO_HUNT_WORLD_DEPTH,
  CART_TURBO_HUNT_WORLD_WIDTH,
  cartTurboHuntNearestCoordinate,
  cartTurboHuntWrappedDelta,
} from "../cart/CartTurboHuntTrack";
import type { RallyInputState } from "../rally/RallyTypes";

interface NaturalMotionSession {
  enemies: CartEnemyState[];
  location: { node: { id: string } };
  car: { position: { x: number; z: number }; heading: number };
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface EnemyBeforeFrame {
  x: number;
  z: number;
  heading: number;
}

interface NaturalMotionState {
  before: Map<string, EnemyBeforeFrame>;
  minEnemyDistance: number;
  maxStepSpeed: number;
  maxTurnRate: number;
  constrainedEnemies: number;
  emergencyBreakaways: number;
}

export interface SkyDancerNaturalMotionSnapshotV41 {
  minEnemyDistance: number;
  maxStepSpeed: number;
  maxTurnRate: number;
  constrainedEnemies: number;
  emergencyBreakaways: number;
}

const PATCHED_KEY = "__skyDancerFlightNaturalMotionV41Installed__";
const GLOBAL_DEBUG_KEY = "__skyDancerGetNaturalMotionV41";
const stateBySession = new WeakMap<object, NaturalMotionState>();
const latestBySession = new WeakMap<object, SkyDancerNaturalMotionSnapshotV41>();

export const SKY_DANCER_V41_MIN_PASS_DISTANCE = 14;
export const SKY_DANCER_V41_BREAKAWAY_DISTANCE = 24;
export const SKY_DANCER_V41_APPROACH_BUFFER = 38;
export const SKY_DANCER_V41_MAX_CRUISE_SPEED = 24;
export const SKY_DANCER_V41_MAX_CLEANUP_SPEED = 26;
export const SKY_DANCER_V41_MAX_TURN_RATE = 1.12;
export const SKY_DANCER_V41_EMERGENCY_TURN_RATE = 1.65;

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

function stableSide(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? -1 : 1;
}

function stateFor(session: object): NaturalMotionState {
  const existing = stateBySession.get(session);
  if (existing) return existing;
  const created: NaturalMotionState = {
    before: new Map(),
    minEnemyDistance: Number.POSITIVE_INFINITY,
    maxStepSpeed: 0,
    maxTurnRate: 0,
    constrainedEnemies: 0,
    emergencyBreakaways: 0,
  };
  stateBySession.set(session, created);
  return created;
}

/**
 * Final kinematic guard for non-boss aircraft.
 *
 * Older directors are still allowed to choose *where* an enemy wants to go,
 * but their post-step displacement is converted back into aircraft motion:
 * bounded turn rate, bounded forward speed, no sideways teleport correction,
 * and an early breakaway before the fighter reaches the player's camera.
 */
export function installSkyDancerFlightNaturalMotionV41(): void {
  const prototype = CartArenaSession.prototype as unknown as NaturalMotionSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerFlightNaturalMotionV41Step(
    this: NaturalMotionSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    const key = this as unknown as object;
    const state = stateFor(key);
    const delta = clamp(fixedDelta ?? 1 / 60, 0.001, 0.05);
    const nodeIdBefore = this.location.node.id;

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.kind === "boss" || enemy.nodeId !== nodeIdBefore) continue;
      const before = state.before.get(enemy.id);
      if (before) {
        before.x = enemy.x;
        before.z = enemy.z;
        before.heading = enemy.heading;
      } else {
        state.before.set(enemy.id, { x: enemy.x, z: enemy.z, heading: enemy.heading });
      }
    }

    previous.call(this, input, fixedDelta);

    const nodeId = this.location.node.id;
    const px = this.car.position.x;
    const pz = this.car.position.z;
    let minEnemyDistance = Number.POSITIVE_INFINITY;
    let maxStepSpeed = 0;
    let maxTurnRate = 0;
    let constrainedEnemies = 0;
    let emergencyBreakaways = 0;

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.kind === "boss" || enemy.nodeId !== nodeId) continue;
      const before = state.before.get(enemy.id);
      if (!before) continue;

      const proposedDx = cartTurboHuntWrappedDelta(enemy.x, before.x, CART_TURBO_HUNT_WORLD_WIDTH);
      const proposedDz = cartTurboHuntWrappedDelta(enemy.z, before.z, CART_TURBO_HUNT_WORLD_DEPTH);
      const proposedDistance = Math.hypot(proposedDx, proposedDz);
      const proposedSpeed = proposedDistance / delta;
      let desiredHeading = proposedDistance > 0.0001
        ? Math.atan2(proposedDx, proposedDz)
        : enemy.heading;

      const fromPlayerX = cartTurboHuntWrappedDelta(before.x, px, CART_TURBO_HUNT_WORLD_WIDTH);
      const fromPlayerZ = cartTurboHuntWrappedDelta(before.z, pz, CART_TURBO_HUNT_WORLD_DEPTH);
      const distanceBefore = Math.max(0.001, Math.hypot(fromPlayerX, fromPlayerZ));
      const outwardHeading = Math.atan2(fromPlayerX, fromPlayerZ);
      const side = stableSide(enemy.id);
      let turnRate = SKY_DANCER_V41_MAX_TURN_RATE;
      let minSpeed = 9.5;
      let maxSpeed = proposedSpeed > SKY_DANCER_V41_MAX_CRUISE_SPEED
        ? SKY_DANCER_V41_MAX_CLEANUP_SPEED
        : SKY_DANCER_V41_MAX_CRUISE_SPEED;

      if (distanceBefore < SKY_DANCER_V41_BREAKAWAY_DISTANCE) {
        // Point mostly away, with a small lateral component so the escape reads
        // as a banking fly-by instead of a radial retreat.
        desiredHeading = normalizeAngle(outwardHeading + side * 0.34);
        turnRate = SKY_DANCER_V41_EMERGENCY_TURN_RATE;
        minSpeed = 18;
        maxSpeed = SKY_DANCER_V41_MAX_CLEANUP_SPEED;
        emergencyBreakaways += 1;
      } else if (distanceBefore < SKY_DANCER_V41_APPROACH_BUFFER) {
        // Begin the pass early. This prevents the old 5-7 m nose-to-player orbit
        // while preserving a readable crossing target.
        desiredHeading = normalizeAngle(outwardHeading + side * 1.02);
        turnRate = 1.32;
        minSpeed = 14;
      }

      const nextHeading = rotateToward(before.heading, desiredHeading, turnRate * delta);
      const headingDelta = Math.abs(normalizeAngle(nextHeading - before.heading));
      const observedTurnRate = headingDelta / delta;
      let speed = clamp(Number.isFinite(proposedSpeed) ? proposedSpeed : minSpeed, minSpeed, maxSpeed);

      // When already inside the desired pass radius, never let a low proposed
      // displacement make the aircraft hover in front of the player.
      if (distanceBefore < SKY_DANCER_V41_MIN_PASS_DISTANCE) speed = Math.max(speed, 20);

      enemy.heading = nextHeading;
      enemy.x = before.x + Math.sin(nextHeading) * speed * delta;
      enemy.z = before.z + Math.cos(nextHeading) * speed * delta;
      enemy.x = cartTurboHuntNearestCoordinate(enemy.x, px, CART_TURBO_HUNT_WORLD_WIDTH);
      enemy.z = cartTurboHuntNearestCoordinate(enemy.z, pz, CART_TURBO_HUNT_WORLD_DEPTH);

      const afterX = cartTurboHuntWrappedDelta(enemy.x, px, CART_TURBO_HUNT_WORLD_WIDTH);
      const afterZ = cartTurboHuntWrappedDelta(enemy.z, pz, CART_TURBO_HUNT_WORLD_DEPTH);
      minEnemyDistance = Math.min(minEnemyDistance, Math.hypot(afterX, afterZ));
      maxStepSpeed = Math.max(maxStepSpeed, speed);
      maxTurnRate = Math.max(maxTurnRate, observedTurnRate);
      if (Math.abs(proposedSpeed - speed) > 0.2 || headingDelta > 0.0001) constrainedEnemies += 1;
    }

    state.minEnemyDistance = minEnemyDistance;
    state.maxStepSpeed = maxStepSpeed;
    state.maxTurnRate = maxTurnRate;
    state.constrainedEnemies = constrainedEnemies;
    state.emergencyBreakaways = emergencyBreakaways;
    const snapshot: SkyDancerNaturalMotionSnapshotV41 = {
      minEnemyDistance: Number.isFinite(minEnemyDistance) ? minEnemyDistance : 0,
      maxStepSpeed,
      maxTurnRate,
      constrainedEnemies,
      emergencyBreakaways,
    };
    latestBySession.set(key, snapshot);
    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>)[GLOBAL_DEBUG_KEY] = () => ({ ...snapshot });
    }
  };
}

export function getSkyDancerNaturalMotionSnapshotV41(session: CartArenaSession): SkyDancerNaturalMotionSnapshotV41 | null {
  const snapshot = latestBySession.get(session as unknown as object);
  return snapshot ? { ...snapshot } : null;
}
