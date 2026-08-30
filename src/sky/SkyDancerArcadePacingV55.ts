import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { isCartTurboHuntEnabled } from "../cart/CartRoguePhase67TurboHunt";
import type { RallyInputState } from "../rally/RallyTypes";
import { isSkyDancerCombatTargetableV42 } from "./SkyDancerCombatEligibilityV42";
import { getSkyDancerMissionV49 } from "./SkyDancerCampaignV49";
import { getSkyDancerStageCycleSnapshot } from "./SkyDancerStageCycle";

interface ArcadePacingSession {
  enemies: CartEnemyState[];
  car: { position: { x: number; z: number }; heading: number };
  location: { node: { id: string } };
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface ArcadePacingState {
  stage: number;
  phase: string;
  phaseElapsed: number;
  noLockElapsed: number;
}

export interface SkyDancerArcadePacingSnapshotV55 {
  stage: number;
  phase: string;
  phaseElapsed: number;
  noLockElapsed: number;
  liveTargets: number;
  lockCandidates: number;
  laneCorrections: number;
  durabilityCaps: number;
}

const PATCHED_KEY = "__skyDancerArcadePacingV55Installed__";
const stateBySession = new WeakMap<object, ArcadePacingState>();
let latestSnapshot: SkyDancerArcadePacingSnapshotV55 | null = null;

export const SKY_DANCER_V55_LOCK_RANGE = 56;
export const SKY_DANCER_V55_LOCK_HALF_ANGLE = 0.72;
export const SKY_DANCER_V55_NO_TARGET_GRACE = 0.72;
export const SKY_DANCER_V55_CLEANUP_FINISHER_START = 12;
export const SKY_DANCER_V55_CLEANUP_LAST_TARGET_START = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function stateFor(session: object): ArcadePacingState {
  const existing = stateBySession.get(session);
  if (existing) return existing;
  const created: ArcadePacingState = { stage: 0, phase: "unknown", phaseElapsed: 0, noLockElapsed: 0 };
  stateBySession.set(session, created);
  return created;
}

function liveTargets(session: ArcadePacingSession): CartEnemyState[] {
  const nodeId = session.location.node.id;
  return session.enemies
    .filter((enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === nodeId && isSkyDancerCombatTargetableV42(enemy))
    .sort((a, b) => {
      const ad = (a.x - session.car.position.x) ** 2 + (a.z - session.car.position.z) ** 2;
      const bd = (b.x - session.car.position.x) ** 2 + (b.z - session.car.position.z) ** 2;
      return ad - bd;
    });
}

function lockMetrics(session: ArcadePacingSession, enemies: readonly CartEnemyState[]): { count: number; nearest: number } {
  const px = session.car.position.x;
  const pz = session.car.position.z;
  let count = 0;
  let nearest = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    const dx = enemy.x - px;
    const dz = enemy.z - pz;
    const distance = Math.hypot(dx, dz);
    nearest = Math.min(nearest, distance);
    const angle = Math.abs(normalizeAngle(Math.atan2(dx, dz) - session.car.heading));
    if (distance <= SKY_DANCER_V55_LOCK_RANGE && angle <= SKY_DANCER_V55_LOCK_HALF_ANGLE) count += 1;
  }
  return { count, nearest: Number.isFinite(nearest) ? nearest : 0 };
}

function attackLane(
  session: ArcadePacingSession,
  order: number,
  forward: number,
  lateral: number,
): { x: number; z: number } {
  const side = order % 2 === 0 ? -1 : 1;
  const sin = Math.sin(session.car.heading);
  const cos = Math.cos(session.car.heading);
  return {
    x: session.car.position.x + sin * forward + cos * lateral * side,
    z: session.car.position.z + cos * forward - sin * lateral * side,
  };
}

function moveTowardLane(
  session: ArcadePacingSession,
  enemy: CartEnemyState,
  destination: { x: number; z: number },
  maxStep: number,
): boolean {
  const dx = destination.x - enemy.x;
  const dz = destination.z - enemy.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.01) return false;
  const step = Math.min(distance, maxStep);
  enemy.x += dx / distance * step;
  enemy.z += dz / distance * step;
  enemy.heading = normalizeAngle(Math.atan2(session.car.position.x - enemy.x, session.car.position.z - enemy.z));
  return true;
}

function capCleanupDurability(enemy: CartEnemyState): boolean {
  const tankLike = enemy.archetype === "tank" || enemy.kind === "heavy";
  const target = tankLike ? 42 : 28;
  if (enemy.maxHp <= target) return false;
  const ratio = clamp(enemy.hp / Math.max(1, enemy.maxHp), 0, 1);
  enemy.maxHp = target;
  enemy.hp = Math.max(1, target * ratio);
  return true;
}

export function installSkyDancerArcadePacingV55(): void {
  const prototype = CartArenaSession.prototype as unknown as ArcadePacingSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerArcadePacingV55Step(
    this: ArcadePacingSession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    previous.call(this, input, fixedDelta);
    const concrete = this as unknown as CartArenaSession;
    if (!isCartTurboHuntEnabled(concrete)) return;

    const stageCycle = getSkyDancerStageCycleSnapshot(concrete);
    if (!stageCycle) return;
    const mission = getSkyDancerMissionV49(stageCycle.stage);
    if (!mission) return;

    const delta = clamp(fixedDelta ?? 1 / 60, 0.001, 0.05);
    const state = stateFor(this as unknown as object);
    if (state.stage !== stageCycle.stage || state.phase !== stageCycle.phase) {
      state.stage = stageCycle.stage;
      state.phase = stageCycle.phase;
      state.phaseElapsed = 0;
      state.noLockElapsed = 0;
    } else {
      state.phaseElapsed += delta;
    }

    const targets = liveTargets(this);
    let metrics = lockMetrics(this, targets);
    if (metrics.count === 0) state.noLockElapsed += delta;
    else state.noLockElapsed = 0;

    let laneCorrections = 0;
    let durabilityCaps = 0;
    const cleanup = stageCycle.phase === "cleanup";

    // V55 deliberately owns CLEANUP only. Normal WAVE flight is left entirely
    // to the proven V40/V41/V44 choreography. Writing enemy positions here
    // after V41 had returned was able to bypass its natural-motion separation
    // envelope on the next fixed step and create near-camera passes.
    if (cleanup) {
      for (const enemy of targets) {
        if (capCleanupDurability(enemy)) durabilityCaps += 1;
      }

      // The old CLEANUP could leave one aircraft circling off-axis for a full
      // minute. Once the authored stagger has played out, convert the final
      // one or two survivors into explicit head-on finisher attack runs.
      if (state.phaseElapsed >= SKY_DANCER_V55_CLEANUP_FINISHER_START && targets.length <= 2) {
        for (let index = 0; index < targets.length; index += 1) {
          const destination = attackLane(this, index, 30 + index * 4, 4.2);
          if (moveTowardLane(this, targets[index], destination, 2.1)) laneCorrections += 1;
        }
      }
      if (state.phaseElapsed >= SKY_DANCER_V55_CLEANUP_LAST_TARGET_START && targets.length === 1) {
        const destination = attackLane(this, 0, 27, 0);
        if (moveTowardLane(this, targets[0], destination, 2.8)) laneCorrections += 1;
        targets[0].hp = Math.min(targets[0].hp, 22);
        targets[0].maxHp = Math.max(targets[0].hp, Math.min(targets[0].maxHp, 28));
      }
    }

    metrics = lockMetrics(this, targets);
    latestSnapshot = {
      stage: stageCycle.stage,
      phase: stageCycle.phase,
      phaseElapsed: state.phaseElapsed,
      noLockElapsed: state.noLockElapsed,
      liveTargets: targets.length,
      lockCandidates: metrics.count,
      laneCorrections,
      durabilityCaps,
    };

    if (typeof window !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV55ArcadePacing = () => ({ ...latestSnapshot });
    }
  };
}

export function getLatestSkyDancerArcadePacingV55(): SkyDancerArcadePacingSnapshotV55 | null {
  return latestSnapshot ? { ...latestSnapshot } : null;
}
