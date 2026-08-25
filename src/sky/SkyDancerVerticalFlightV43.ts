import type { CartEnemyState } from "../cart/CartCombat";

export const SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS = 10;
export const SKY_DANCER_VERTICAL_COLLISION_CLEARANCE_METERS = 3.2;
export const SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT = 150 / 38;
export const SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS = 0.30;

interface VerticalState {
  altitudeOffsetMeters: number;
  verticalSpeedMetersPerSecond: number;
  pitchRadians: number;
  targetAltitudeMeters: number;
  wanderClock: number;
  avoidClock: number;
  avoidTargetMeters: number;
}

export interface SkyDancerEnemyVerticalSnapshotV43 {
  altitudeOffsetMeters: number;
  verticalSpeedMetersPerSecond: number;
  pitchRadians: number;
  targetAltitudeMeters: number;
  avoiding: boolean;
}

export interface SkyDancerVerticalFlightContextV43 {
  nodeId: string;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  playerSpeed: number;
  delta: number;
}

const stateByEnemy = new WeakMap<CartEnemyState, VerticalState>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return current;
}

function stableHash(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableSide(id: string): number {
  return stableHash(id) % 2 === 0 ? -1 : 1;
}

function stateFor(enemy: CartEnemyState): VerticalState {
  const current = stateByEnemy.get(enemy);
  if (current) return current;
  const hash = stableHash(enemy.id);
  const initialTarget = ((hash % 1801) / 100 - 9) * 0.92;
  const created: VerticalState = {
    altitudeOffsetMeters: 0,
    verticalSpeedMetersPerSecond: 0,
    pitchRadians: 0,
    targetAltitudeMeters: clamp(initialTarget, -8.7, 8.7),
    wanderClock: 1.2 + (hash % 170) / 100,
    avoidClock: 0,
    avoidTargetMeters: 0,
  };
  stateByEnemy.set(enemy, created);
  return created;
}

function maxClimbSpeed(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 3.0;
  if (enemy.kind === "heavy") return 3.45;
  if (enemy.archetype === "striker") return 4.65;
  return 4.15;
}

function verticalAcceleration(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 4.8;
  if (enemy.kind === "heavy") return 5.5;
  return 7.2;
}

function horizontalReferenceSpeed(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 10.4;
  if (enemy.kind === "heavy") return 8.8;
  if (enemy.archetype === "striker") return 13.2;
  if (enemy.archetype === "drifter") return 12.4;
  if (enemy.archetype === "orbiter") return 11.6;
  return 11.2;
}

function chooseWanderTarget(enemy: CartEnemyState, state: VerticalState): void {
  const hash = stableHash(`${enemy.id}:${Math.floor(state.wanderClock * 1000)}:${Math.floor(state.altitudeOffsetMeters * 10)}`);
  const normalized = (hash % 2001) / 1000 - 1;
  state.targetAltitudeMeters = clamp(normalized * 8.9, -8.9, 8.9);
  state.wanderClock = 1.75 + ((hash >>> 8) % 1700) / 1000;
}

function requestAvoidance(state: VerticalState, targetMeters: number, holdSeconds: number): void {
  const clamped = clamp(targetMeters, -9.2, 9.2);
  if (state.avoidClock <= 0 || Math.abs(clamped - state.altitudeOffsetMeters) > Math.abs(state.avoidTargetMeters - state.altitudeOffsetMeters)) {
    state.avoidTargetMeters = clamped;
  }
  state.avoidClock = Math.max(state.avoidClock, holdSeconds);
}

function requestPlayerAvoidance(
  enemy: CartEnemyState,
  state: VerticalState,
  context: SkyDancerVerticalFlightContextV43,
): void {
  const lookAhead = 0.88;
  const enemySpeed = horizontalReferenceSpeed(enemy);
  const predictedEnemyX = enemy.x + Math.sin(enemy.heading) * enemySpeed * lookAhead;
  const predictedEnemyZ = enemy.z + Math.cos(enemy.heading) * enemySpeed * lookAhead;
  const playerTravel = Math.min(16, Math.abs(context.playerSpeed) * lookAhead);
  const predictedPlayerX = context.playerX + Math.sin(context.playerHeading) * playerTravel;
  const predictedPlayerZ = context.playerZ + Math.cos(context.playerHeading) * playerTravel;
  const predictedHorizontal = Math.hypot(predictedEnemyX - predictedPlayerX, predictedEnemyZ - predictedPlayerZ);
  const currentHorizontal = Math.hypot(enemy.x - context.playerX, enemy.z - context.playerZ);
  if (Math.min(predictedHorizontal, currentHorizontal) > 9.0) return;
  if (Math.abs(state.altitudeOffsetMeters) >= SKY_DANCER_VERTICAL_COLLISION_CLEARANCE_METERS + 0.8) return;

  const side = stableSide(enemy.id);
  const target = side > 0 ? 8.6 : -8.6;
  requestAvoidance(state, target, 1.35);
}

function requestEnemyPairAvoidance(enemies: readonly CartEnemyState[], nodeId: string): void {
  const live = enemies.filter((enemy) => enemy.alive && enemy.nodeId === nodeId);
  for (let leftIndex = 0; leftIndex < live.length; leftIndex += 1) {
    const left = live[leftIndex];
    const leftState = stateFor(left);
    for (let rightIndex = leftIndex + 1; rightIndex < live.length; rightIndex += 1) {
      const right = live[rightIndex];
      const rightState = stateFor(right);
      const horizontal = Math.hypot(left.x - right.x, left.z - right.z);
      if (horizontal > Math.max(6.8, left.radius + right.radius + 3.0)) continue;
      if (Math.abs(leftState.altitudeOffsetMeters - rightState.altitudeOffsetMeters) >= SKY_DANCER_VERTICAL_COLLISION_CLEARANCE_METERS) continue;

      const leftGoesUp = left.id.localeCompare(right.id) < 0;
      requestAvoidance(leftState, leftGoesUp ? 8.4 : -8.4, 1.1);
      requestAvoidance(rightState, leftGoesUp ? -8.4 : 8.4, 1.1);
    }
  }
}

function integrateEnemyVertical(enemy: CartEnemyState, state: VerticalState, delta: number): void {
  state.wanderClock -= delta;
  state.avoidClock = Math.max(0, state.avoidClock - delta);
  if (state.wanderClock <= 0 && state.avoidClock <= 0) chooseWanderTarget(enemy, state);

  const desiredAltitude = state.avoidClock > 0 ? state.avoidTargetMeters : state.targetAltitudeMeters;
  const maxClimb = maxClimbSpeed(enemy);
  const desiredVerticalSpeed = clamp((desiredAltitude - state.altitudeOffsetMeters) * 0.95, -maxClimb, maxClimb);
  state.verticalSpeedMetersPerSecond = moveToward(
    state.verticalSpeedMetersPerSecond,
    desiredVerticalSpeed,
    verticalAcceleration(enemy) * delta,
  );

  state.altitudeOffsetMeters += state.verticalSpeedMetersPerSecond * delta;
  if (state.altitudeOffsetMeters >= SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS) {
    state.altitudeOffsetMeters = SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS;
    state.verticalSpeedMetersPerSecond = Math.min(0, state.verticalSpeedMetersPerSecond);
    state.targetAltitudeMeters = Math.min(state.targetAltitudeMeters, 7.5);
  } else if (state.altitudeOffsetMeters <= -SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS) {
    state.altitudeOffsetMeters = -SKY_DANCER_ENEMY_ALTITUDE_LIMIT_METERS;
    state.verticalSpeedMetersPerSecond = Math.max(0, state.verticalSpeedMetersPerSecond);
    state.targetAltitudeMeters = Math.max(state.targetAltitudeMeters, -7.5);
  }

  const desiredPitch = clamp(
    Math.atan2(state.verticalSpeedMetersPerSecond, Math.max(7.5, horizontalReferenceSpeed(enemy))),
    -SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS,
    SKY_DANCER_VERTICAL_MAX_PITCH_RADIANS,
  );
  state.pitchRadians = moveToward(state.pitchRadians, desiredPitch, 0.72 * delta);
}

export function stepSkyDancerEnemyVerticalFlightV43(
  enemies: readonly CartEnemyState[],
  context: SkyDancerVerticalFlightContextV43,
): void {
  const delta = clamp(context.delta, 0.001, 0.05);
  requestEnemyPairAvoidance(enemies, context.nodeId);
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.nodeId !== context.nodeId) continue;
    const state = stateFor(enemy);
    requestPlayerAvoidance(enemy, state, context);
    integrateEnemyVertical(enemy, state, delta);
  }
}

export function getSkyDancerEnemyVerticalSnapshotV43(enemy: CartEnemyState): SkyDancerEnemyVerticalSnapshotV43 {
  const state = stateFor(enemy);
  return {
    altitudeOffsetMeters: state.altitudeOffsetMeters,
    verticalSpeedMetersPerSecond: state.verticalSpeedMetersPerSecond,
    pitchRadians: state.pitchRadians,
    targetAltitudeMeters: state.avoidClock > 0 ? state.avoidTargetMeters : state.targetAltitudeMeters,
    avoiding: state.avoidClock > 0,
  };
}

export function getSkyDancerEnemyAltitudeMetersV43(enemy: CartEnemyState): number {
  return stateFor(enemy).altitudeOffsetMeters;
}

export function skyDancerDistance3DV43(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  return Math.hypot(ax - bx, ay - by, az - bz);
}
