import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { installSkyDancerFlightCombat } from "./SkyDancerFlightCombat";

interface AvoidanceSessionView {
  enemies: CartEnemyState[];
  location: {
    node: {
      id: string;
      rect: { centerX: number; centerZ: number; halfWidth: number; halfDepth: number };
    };
  };
  car: {
    position: { x: number; z: number };
    heading: number;
    forwardVelocity: number;
  };
  step(input: RallyInputState, fixedDelta?: number): void;
}

const PATCHED_KEY = "__skyDancerFlightAvoidanceInstalled__";
const PLAYER_BODY_RADIUS = 1.45;

export const SKY_DANCER_ENEMY_PREFERRED_STANDOFF = 13;
export const SKY_DANCER_ENEMY_HARD_CLEARANCE = 2.8;

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

function cruiseSpeed(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 10.4;
  if (enemy.kind === "heavy") return 8.8;
  if (enemy.archetype === "striker") return 13.2;
  if (enemy.archetype === "drifter") return 12.4;
  if (enemy.archetype === "orbiter") return 11.6;
  if (enemy.archetype === "bomber") return 10.8;
  return enemy.kind === "blocker" ? 10.2 : 11.4;
}

function turnRate(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 0.82;
  if (enemy.kind === "heavy") return 0.92;
  if (enemy.archetype === "drifter") return 1.42;
  if (enemy.archetype === "striker") return 1.26;
  return 1.12;
}

export function skyDancerEnemySafetyRadius(enemyRadius: number): number {
  return PLAYER_BODY_RADIUS + Math.max(0.5, enemyRadius) + SKY_DANCER_ENEMY_HARD_CLEARANCE;
}

export function skyDancerAvoidanceHeading(
  enemyX: number,
  enemyZ: number,
  playerX: number,
  playerZ: number,
  playerHeading: number,
  distance: number,
  side: number,
): number {
  const direct = Math.atan2(playerX - enemyX, playerZ - enemyZ);

  // Inside the standoff bubble, stop flying the nose through the player.
  // Break outward while retaining a lateral component so it reads as a fighter
  // peel-off rather than an arcade car bouncing away.
  if (distance < 10.5) return normalizeAngle(direct + Math.PI + side * 0.42);

  // Missile attack zone: keep the nose close enough to the target for a shot,
  // but crank sideways so the pass naturally misses the player's airframe.
  if (distance < 17.5) return normalizeAngle(direct + side * 0.42);

  // At longer range, lead the player's flight path rather than homing directly
  // at the current position. A small lateral bias prevents repeated head-ons.
  const lead = clamp(distance * 0.20, 3.2, 9.0);
  const targetX = playerX + Math.sin(playerHeading) * lead;
  const targetZ = playerZ + Math.cos(playerHeading) * lead;
  const intercept = Math.atan2(targetX - enemyX, targetZ - enemyZ);
  return normalizeAngle(intercept + side * (distance < 28 ? 0.16 : 0.08));
}

function applyCollisionAvoidance(session: AvoidanceSessionView, delta: number): void {
  const nodeId = session.location.node.id;
  const bounds = session.location.node.rect;
  const px = session.car.position.x;
  const pz = session.car.position.z;
  const playerHeading = session.car.heading;
  const playerSpeed = Math.abs(session.car.forwardVelocity);

  for (const enemy of session.enemies) {
    if (!enemy.alive || enemy.nodeId !== nodeId) continue;

    let awayX = enemy.x - px;
    let awayZ = enemy.z - pz;
    let distance = Math.hypot(awayX, awayZ);
    const side = stableSide(enemy.id);
    const safetyRadius = skyDancerEnemySafetyRadius(enemy.radius);
    const preferred = enemy.kind === "boss" ? 15.5 : enemy.kind === "heavy" ? 14.5 : SKY_DANCER_ENEMY_PREFERRED_STANDOFF;

    const desired = skyDancerAvoidanceHeading(
      enemy.x,
      enemy.z,
      px,
      pz,
      playerHeading,
      distance,
      side,
    );
    const urgency = distance < safetyRadius + 2
      ? 2.25
      : distance < preferred
        ? 1.65
        : distance < 20
          ? 1.12
          : 0.72;
    enemy.heading = rotateToward(enemy.heading, desired, turnRate(enemy) * urgency * delta);

    // Predict roughly two thirds of a second ahead. If both aircraft are still
    // converging inside the safety bubble, start the break before the models touch.
    const lookAhead = 0.65;
    const playerTravel = Math.min(10, playerSpeed * lookAhead);
    const predictedPlayerX = px + Math.sin(playerHeading) * playerTravel;
    const predictedPlayerZ = pz + Math.cos(playerHeading) * playerTravel;
    const enemyTravel = cruiseSpeed(enemy) * lookAhead;
    const predictedEnemyX = enemy.x + Math.sin(enemy.heading) * enemyTravel;
    const predictedEnemyZ = enemy.z + Math.cos(enemy.heading) * enemyTravel;
    const predictedDistance = Math.hypot(predictedEnemyX - predictedPlayerX, predictedEnemyZ - predictedPlayerZ);
    if (predictedDistance < safetyRadius + 2.4 && distance < 22) {
      const awayHeading = normalizeAngle(Math.atan2(px - enemy.x, pz - enemy.z) + Math.PI + side * 0.62);
      enemy.heading = rotateToward(enemy.heading, awayHeading, turnRate(enemy) * 2.0 * delta);
    }

    // Last-resort separation. This happens after the inherited step, so the next
    // fixed step starts outside contact range while player-initiated rams remain
    // possible if the player deliberately closes the gap again.
    if (distance < safetyRadius) {
      if (distance < 0.001) {
        awayX = Math.cos(playerHeading) * side;
        awayZ = -Math.sin(playerHeading) * side;
        distance = 1;
      }
      const inv = 1 / distance;
      enemy.x = px + awayX * inv * safetyRadius;
      enemy.z = pz + awayZ * inv * safetyRadius;
      const awayHeading = Math.atan2(enemy.x - px, enemy.z - pz);
      enemy.heading = rotateToward(enemy.heading, awayHeading, turnRate(enemy) * 2.6 * delta);
    }

    const margin = 2.4;
    enemy.x = clamp(enemy.x, bounds.centerX - bounds.halfWidth + margin, bounds.centerX + bounds.halfWidth - margin);
    enemy.z = clamp(enemy.z, bounds.centerZ - bounds.halfDepth + margin, bounds.centerZ + bounds.halfDepth - margin);
  }
}

export function installSkyDancerFlightAvoidance(): void {
  installSkyDancerFlightCombat();
  const prototype = CartArenaSession.prototype as unknown as AvoidanceSessionView & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const baseStep = prototype.step;

  prototype.step = function skyDancerAvoidanceStep(input: RallyInputState, fixedDelta?: number): void {
    baseStep.call(this, input, fixedDelta);
    const delta = Math.max(0.001, Math.min(0.05, fixedDelta ?? 1 / 60));
    applyCollisionAvoidance(this as unknown as AvoidanceSessionView, delta);
  };
}
