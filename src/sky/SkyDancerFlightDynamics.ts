import type { CartEnemyState } from "../cart/CartCombat";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { RallyInputState } from "../rally/RallyTypes";

interface DynamicsSession {
  enemies: CartEnemyState[];
  location: {
    node: {
      id: string;
      rect: { centerX: number; centerZ: number; halfWidth: number; halfDepth: number };
    };
  };
  car: CartArenaSession["car"];
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface EnemyDynamicsState {
  vx: number;
  vz: number;
}

const PATCHED_KEY = "__skyDancerFlightDynamicsInstalled__";
const stateBySession = new WeakMap<object, Map<string, EnemyDynamicsState>>();

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

function enemyMaxSpeed(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 12.5;
  if (enemy.kind === "heavy") return 13.5;
  if (enemy.archetype === "striker") return 18;
  if (enemy.archetype === "drifter") return 17;
  if (enemy.archetype === "orbiter") return 16;
  if (enemy.archetype === "bomber") return 14.5;
  return 15.5;
}

function enemyTurnRate(enemy: CartEnemyState): number {
  if (enemy.kind === "boss") return 0.82;
  if (enemy.kind === "heavy") return 0.96;
  if (enemy.archetype === "drifter") return 1.65;
  if (enemy.archetype === "striker") return 1.5;
  return 1.35;
}

function syncPlayerVelocity(session: DynamicsSession): void {
  const car = session.car;
  const forwardX = Math.sin(car.heading);
  const forwardZ = Math.cos(car.heading);
  const rightX = Math.cos(car.heading);
  const rightZ = -Math.sin(car.heading);
  car.velocity.x = forwardX * car.forwardVelocity + rightX * car.lateralVelocity;
  car.velocity.z = forwardZ * car.forwardVelocity + rightZ * car.lateralVelocity;
  car.speed = Math.hypot(car.velocity.x, car.velocity.z);
}

function preserveTurboForwardSpeed(session: DynamicsSession, beforeForward: number, input: RallyInputState): void {
  if (!input.boost) return;
  const beforeMagnitude = Math.abs(beforeForward);
  if (beforeMagnitude < 0.35) return;
  const afterMagnitude = Math.abs(session.car.forwardVelocity);
  if (afterMagnitude >= beforeMagnitude * 0.997) return;
  session.car.forwardVelocity = Math.sign(beforeForward || 1) * beforeMagnitude;
  syncPlayerVelocity(session);
}

function smoothEnemyFlight(
  session: DynamicsSession,
  before: Map<string, { x: number; z: number; heading: number }>,
  delta: number,
): void {
  const sessionKey = session as unknown as object;
  let dynamics = stateBySession.get(sessionKey);
  if (!dynamics) {
    dynamics = new Map();
    stateBySession.set(sessionKey, dynamics);
  }

  const node = session.location.node;
  const px = session.car.position.x;
  const pz = session.car.position.z;

  for (const enemy of session.enemies) {
    if (!enemy.alive || enemy.nodeId !== node.id) continue;
    const previous = before.get(enemy.id);
    if (!previous) continue;

    const postX = enemy.x;
    const postZ = enemy.z;
    const rawDx = postX - previous.x;
    const rawDz = postZ - previous.z;
    const rawDistance = Math.hypot(rawDx, rawDz);
    const maxSpeed = enemyMaxSpeed(enemy);
    const desiredSpeed = clamp(rawDistance / Math.max(delta, 0.001), 5.2, maxSpeed);
    const desiredHeading = rawDistance > 0.0001 ? Math.atan2(rawDx, rawDz) : enemy.heading;

    let state = dynamics.get(enemy.id);
    if (!state) {
      state = {
        vx: Math.sin(previous.heading) * desiredSpeed,
        vz: Math.cos(previous.heading) * desiredSpeed,
      };
      dynamics.set(enemy.id, state);
    }

    const desiredVx = Math.sin(desiredHeading) * desiredSpeed;
    const desiredVz = Math.cos(desiredHeading) * desiredSpeed;
    const response = 1 - Math.exp(-delta * 3.0);
    state.vx += (desiredVx - state.vx) * response;
    state.vz += (desiredVz - state.vz) * response;

    const velocityHeading = Math.atan2(state.vx, state.vz);
    enemy.heading = rotateToward(previous.heading, velocityHeading, enemyTurnRate(enemy) * delta);

    const forwardX = Math.sin(enemy.heading);
    const forwardZ = Math.cos(enemy.heading);
    const rightX = Math.cos(enemy.heading);
    const rightZ = -Math.sin(enemy.heading);
    let forward = state.vx * forwardX + state.vz * forwardZ;
    let lateral = state.vx * rightX + state.vz * rightZ;
    forward = Math.max(4.6, forward);
    lateral = clamp(lateral, -Math.abs(forward) * 0.2, Math.abs(forward) * 0.2);
    state.vx = forwardX * forward + rightX * lateral;
    state.vz = forwardZ * forward + rightZ * lateral;

    enemy.x = previous.x + state.vx * delta;
    enemy.z = previous.z + state.vz * delta;

    // Safety remains hard only inside the actual collision bubble. Outside it,
    // all separation is achieved through heading and velocity instead of slide.
    const awayX = enemy.x - px;
    const awayZ = enemy.z - pz;
    const distance = Math.hypot(awayX, awayZ);
    const hardClearance = enemy.radius + 4.25;
    if (distance > 0.001 && distance < hardClearance) {
      enemy.x = px + awayX / distance * hardClearance;
      enemy.z = pz + awayZ / distance * hardClearance;
      const tangent = Math.atan2(awayX, awayZ) + (enemy.id.length % 2 === 0 ? Math.PI * 0.42 : -Math.PI * 0.42);
      enemy.heading = rotateToward(enemy.heading, tangent, enemyTurnRate(enemy) * 2.2 * delta);
    }

    const margin = 1.6;
    enemy.x = clamp(enemy.x, node.rect.centerX - node.rect.halfWidth + margin, node.rect.centerX + node.rect.halfWidth - margin);
    enemy.z = clamp(enemy.z, node.rect.centerZ - node.rect.halfDepth + margin, node.rect.centerZ + node.rect.halfDepth - margin);
  }

  for (const id of dynamics.keys()) {
    if (!session.enemies.some((enemy) => enemy.id === id && enemy.alive)) dynamics.delete(id);
  }
}

export function installSkyDancerFlightDynamics(): void {
  const prototype = CartArenaSession.prototype as unknown as DynamicsSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerFlightDynamicsStep(input: RallyInputState, fixedDelta?: number): void {
    const beforeForward = this.car.forwardVelocity;
    const before = new Map<string, { x: number; z: number; heading: number }>();
    for (const enemy of this.enemies) {
      if (enemy.alive) before.set(enemy.id, { x: enemy.x, z: enemy.z, heading: enemy.heading });
    }

    previous.call(this, input, fixedDelta);
    const delta = Math.max(0.001, Math.min(0.05, fixedDelta ?? 1 / 60));
    preserveTurboForwardSpeed(this, beforeForward, input);
    smoothEnemyFlight(this, before, delta);
  };
}
