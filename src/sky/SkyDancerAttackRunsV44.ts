import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import type { RallyInputState } from "../rally/RallyTypes";
import {
  setSkyDancerCleanupHeldV42,
  setSkyDancerCombatOutOfSeekerRangeV44,
} from "./SkyDancerCombatEligibilityV42";
import { SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE } from "./SkyDancerPlayerWeapons";
import { getSkyDancerStageCycleSnapshot } from "./SkyDancerStageCycle";
import { requestSkyDancerVerticalManeuverV44 } from "./SkyDancerVerticalFlightV43";

export const SKY_DANCER_V44_CLEANUP_ORBIT_MIN_DISTANCE = 74;
export const SKY_DANCER_V44_CLEANUP_ORBIT_MAX_DISTANCE = 84;
export const SKY_DANCER_V44_ATTACK_RUN_RELEASE_INTERVAL = 5.25;
export const SKY_DANCER_V44_ATTACK_RUN_TARGET_DISTANCE = 48;
export const SKY_DANCER_V44_ATTACK_RUN_SPEED = 18.5;
export const SKY_DANCER_V44_ORBIT_FOLLOW_SPEED = 38;

interface AttackRunSession {
  enemies: CartEnemyState[];
  location: { node: { id: string } };
  car: { position: { x: number; z: number }; heading: number };
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface SlotState {
  id: string;
  slot: number;
  angle: number;
  radius: number;
  x: number;
  z: number;
  released: boolean;
  completed: boolean;
}

interface DirectorState {
  previousCleanup: boolean;
  elapsed: number;
  slots: Map<string, SlotState>;
  releasedRuns: number;
  completedRuns: number;
}

export interface SkyDancerAttackRunSnapshotV44 {
  cleanup: boolean;
  elapsed: number;
  orbitingEnemies: number;
  attackingEnemies: number;
  releasedRuns: number;
  completedRuns: number;
  minOrbitDistance: number;
  maxOrbitDistance: number;
}

const PATCH_KEY = "__skyDancerAttackRunsV44Installed__";
const DEBUG_KEY = "__skyDancerGetV44AttackRuns";
const stateBySession = new WeakMap<object, DirectorState>();
const latestBySession = new WeakMap<object, SkyDancerAttackRunSnapshotV44>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stableHash(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stateFor(session: object): DirectorState {
  const current = stateBySession.get(session);
  if (current) return current;
  const created: DirectorState = {
    previousCleanup: false,
    elapsed: 0,
    slots: new Map(),
    releasedRuns: 0,
    completedRuns: 0,
  };
  stateBySession.set(session, created);
  return created;
}

function liveCleanupEnemies(session: AttackRunSession): CartEnemyState[] {
  const nodeId = session.location.node.id;
  return session.enemies.filter((enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === nodeId);
}

function setPhysicalSeekerEligibility(
  session: AttackRunSession,
  enemy: CartEnemyState,
  distanceOverride?: number,
): void {
  const distance = distanceOverride ?? Math.hypot(
    enemy.x - session.car.position.x,
    enemy.z - session.car.position.z,
  );
  setSkyDancerCombatOutOfSeekerRangeV44(enemy, distance > SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE);
}

function buildSlots(session: AttackRunSession, state: DirectorState): void {
  state.slots.clear();
  state.releasedRuns = 0;
  state.completedRuns = 0;
  const px = session.car.position.x;
  const pz = session.car.position.z;
  const ordered = liveCleanupEnemies(session)
    .sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz) || a.id.localeCompare(b.id));

  ordered.forEach((enemy, slot) => {
    const hash = stableHash(enemy.id);
    const side = slot % 2 === 0 ? 1 : -1;
    const angle = session.car.heading + side * (1.18 + (slot % 3) * 0.24) + ((hash % 31) - 15) * 0.006;
    const radius = SKY_DANCER_V44_CLEANUP_ORBIT_MIN_DISTANCE
      + (hash % Math.max(1, SKY_DANCER_V44_CLEANUP_ORBIT_MAX_DISTANCE - SKY_DANCER_V44_CLEANUP_ORBIT_MIN_DISTANCE + 1));
    // V40's compatibility layer stages waiting aircraft close to the player.
    // V44 is outermost and replaces that hidden timed gate before rendering:
    // waiting slots begin on a real out-of-range orbit immediately, while slot
    // zero preserves the naturally closest survivor as the first live fight.
    const x = slot === 0 ? enemy.x : px + Math.sin(angle) * radius;
    const z = slot === 0 ? enemy.z : pz + Math.cos(angle) * radius;
    if (slot > 0) {
      enemy.x = x;
      enemy.z = z;
      enemy.heading = angle + (slot % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
      setSkyDancerCleanupHeldV42(enemy, false);
      setPhysicalSeekerEligibility(session, enemy, radius);
    } else {
      setSkyDancerCleanupHeldV42(enemy, false);
      setPhysicalSeekerEligibility(session, enemy);
    }
    state.slots.set(enemy.id, {
      id: enemy.id,
      slot,
      angle,
      radius,
      x,
      z,
      released: slot === 0,
      completed: slot === 0,
    });
  });
}

function movePointToward(
  x: number,
  z: number,
  targetX: number,
  targetZ: number,
  maxDistance: number,
): { x: number; z: number } {
  const dx = targetX - x;
  const dz = targetZ - z;
  const distance = Math.hypot(dx, dz);
  if (distance <= maxDistance || distance < 0.001) return { x: targetX, z: targetZ };
  const scale = maxDistance / distance;
  return { x: x + dx * scale, z: z + dz * scale };
}

function applyOrbit(
  session: AttackRunSession,
  enemy: CartEnemyState,
  slot: SlotState,
  delta: number,
): void {
  const px = session.car.position.x;
  const pz = session.car.position.z;
  // The lane stays world-oriented; the centre follows the player. Enemies thus
  // drift across the camera naturally instead of sticking to a screen edge.
  const targetX = px + Math.sin(slot.angle) * slot.radius;
  const targetZ = pz + Math.cos(slot.angle) * slot.radius;
  const next = movePointToward(slot.x, slot.z, targetX, targetZ, SKY_DANCER_V44_ORBIT_FOLLOW_SPEED * delta);
  slot.x = next.x;
  slot.z = next.z;
  enemy.x = next.x;
  enemy.z = next.z;
  const tangent = slot.angle + (slot.slot % 2 === 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
  enemy.heading += Math.atan2(Math.sin(tangent - enemy.heading), Math.cos(tangent - enemy.heading)) * Math.min(1, 1.3 * delta);
  requestSkyDancerVerticalManeuverV44(enemy, (slot.slot % 2 === 0 ? 1 : -1) * (6.4 + (slot.slot % 3)), 0.38);
  // Waiting aircraft are not protected by a timer. Their actual player range
  // is sampled every fixed step; the missile collision list opens on the same
  // step that the aircraft physically crosses the 58 m seeker boundary.
  setSkyDancerCleanupHeldV42(enemy, false);
  setPhysicalSeekerEligibility(session, enemy);
}

function applyAttackRun(
  session: AttackRunSession,
  enemy: CartEnemyState,
  slot: SlotState,
  delta: number,
  state: DirectorState,
): void {
  if (!slot.released) {
    slot.released = true;
    state.releasedRuns += 1;
  }
  const px = session.car.position.x;
  const pz = session.car.position.z;
  const dx = slot.x - px;
  const dz = slot.z - pz;
  const distance = Math.hypot(dx, dz);
  if (distance <= SKY_DANCER_V44_ATTACK_RUN_TARGET_DISTANCE) {
    slot.completed = true;
    state.completedRuns += 1;
    setSkyDancerCleanupHeldV42(enemy, false);
    setSkyDancerCombatOutOfSeekerRangeV44(enemy, false);
    return;
  }

  const targetDistance = Math.max(SKY_DANCER_V44_ATTACK_RUN_TARGET_DISTANCE, distance - SKY_DANCER_V44_ATTACK_RUN_SPEED * delta);
  const inv = distance > 0.001 ? 1 / distance : 0;
  slot.x = px + dx * inv * targetDistance;
  slot.z = pz + dz * inv * targetDistance;
  enemy.x = slot.x;
  enemy.z = slot.z;
  const attackHeading = Math.atan2(px - slot.x, pz - slot.z);
  enemy.heading += Math.atan2(Math.sin(attackHeading - enemy.heading), Math.cos(attackHeading - enemy.heading)) * Math.min(1, 2.1 * delta);
  // The run starts from a high/low lane and crosses the player's altitude plane
  // as it enters seeker range, making the approach visually legible in 3D.
  const side = slot.slot % 2 === 0 ? 1 : -1;
  requestSkyDancerVerticalManeuverV44(enemy, distance > 62 ? side * 8.4 : -side * 8.4, 0.36);
  setSkyDancerCleanupHeldV42(enemy, false);
  setPhysicalSeekerEligibility(session, enemy, targetDistance);
}

export function installSkyDancerAttackRunsV44(): void {
  const prototype = CartArenaSession.prototype as unknown as AttackRunSession & Record<string, unknown>;
  if (prototype[PATCH_KEY]) return;
  prototype[PATCH_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerAttackRunsV44Step(input: RallyInputState, fixedDelta?: number): void {
    previous.call(this, input, fixedDelta);
    const session = this as unknown as AttackRunSession;
    const state = stateFor(this as unknown as object);
    const stage = getSkyDancerStageCycleSnapshot(this as unknown as CartArenaSession);
    const cleanup = stage?.phase === "cleanup";
    const delta = clamp(fixedDelta ?? 1 / 60, 0.001, 0.05);

    if (cleanup && !state.previousCleanup) {
      state.elapsed = 0;
      buildSlots(session, state);
    } else if (cleanup) {
      state.elapsed += delta;
    } else if (state.previousCleanup) {
      for (const enemy of session.enemies) {
        setSkyDancerCleanupHeldV42(enemy, false);
        setSkyDancerCombatOutOfSeekerRangeV44(enemy, false);
      }
      state.slots.clear();
      state.elapsed = 0;
    }
    state.previousCleanup = cleanup;

    let orbitingEnemies = 0;
    let attackingEnemies = 0;
    let minOrbitDistance = Number.POSITIVE_INFINITY;
    let maxOrbitDistance = 0;

    if (cleanup) {
      for (const enemy of liveCleanupEnemies(session)) {
        const slot = state.slots.get(enemy.id);
        if (!slot || slot.completed || slot.slot === 0) {
          setSkyDancerCleanupHeldV42(enemy, false);
          setPhysicalSeekerEligibility(session, enemy);
          continue;
        }
        const releaseTime = slot.slot * SKY_DANCER_V44_ATTACK_RUN_RELEASE_INTERVAL;
        if (state.elapsed < releaseTime) {
          applyOrbit(session, enemy, slot, delta);
          orbitingEnemies += 1;
          const distance = Math.hypot(enemy.x - session.car.position.x, enemy.z - session.car.position.z);
          minOrbitDistance = Math.min(minOrbitDistance, distance);
          maxOrbitDistance = Math.max(maxOrbitDistance, distance);
        } else {
          applyAttackRun(session, enemy, slot, delta, state);
          if (!slot.completed) attackingEnemies += 1;
        }
      }
    }

    const snapshot: SkyDancerAttackRunSnapshotV44 = {
      cleanup,
      elapsed: state.elapsed,
      orbitingEnemies,
      attackingEnemies,
      releasedRuns: state.releasedRuns,
      completedRuns: state.completedRuns,
      minOrbitDistance: Number.isFinite(minOrbitDistance) ? minOrbitDistance : 0,
      maxOrbitDistance,
    };
    latestBySession.set(this as unknown as object, snapshot);
    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>)[DEBUG_KEY] = () => ({ ...snapshot });
    }
  };
}

export function getSkyDancerAttackRunSnapshotV44(session: CartArenaSession): SkyDancerAttackRunSnapshotV44 | null {
  const snapshot = latestBySession.get(session as unknown as object);
  return snapshot ? { ...snapshot } : null;
}
