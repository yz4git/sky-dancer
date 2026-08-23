import type { CartEnemyState } from "../cart/CartCombat";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { RallyInputState } from "../rally/RallyTypes";

export interface SkyDancerPlayerMissileSnapshot {
  id: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  life: number;
  maxLife: number;
  targetEnemyId: string | null;
  distanceToTarget: number;
}

export interface SkyDancerPlayerWeaponState {
  missiles: SkyDancerPlayerMissileSnapshot[];
  cooldownSeconds: number;
  shotSerial: number;
  hitSerial: number;
  lastHitEnemyId: string | null;
  lastHitX: number;
  lastHitZ: number;
}

interface PlayerMissileInternal extends SkyDancerPlayerMissileSnapshot {
  turnRate: number;
  damage: number;
  active: boolean;
}

interface WeaponState {
  missiles: PlayerMissileInternal[];
  nextMissileId: number;
  cooldownSeconds: number;
  requestedShots: number;
  shotSerial: number;
  hitSerial: number;
  lastHitEnemyId: string | null;
  lastHitX: number;
  lastHitZ: number;
}

interface WeaponSessionView {
  enemies: CartEnemyState[];
  rewardTimer: number;
  lastReward: string | null;
  location: { node: { id: string } };
  car: {
    position: { x: number; z: number };
    heading: number;
    forwardVelocity: number;
    collisionImpact: number;
    ramCount: number;
  };
  step(input: RallyInputState, fixedDelta?: number): void;
}

const PATCHED_KEY = "__skyDancerPlayerWeaponsInstalled__";
const stateBySession = new WeakMap<object, WeaponState>();
export const SKY_DANCER_PLAYER_MISSILE_COOLDOWN = 0.34;
export const SKY_DANCER_PLAYER_MISSILE_MAX_ACTIVE = 5;
export const SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE = 58;

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

function stateFor(session: WeaponSessionView): WeaponState {
  const key = session as unknown as object;
  const current = stateBySession.get(key);
  if (current) return current;
  const created: WeaponState = {
    missiles: [],
    nextMissileId: 10001,
    cooldownSeconds: 0,
    requestedShots: 0,
    shotSerial: 0,
    hitSerial: 0,
    lastHitEnemyId: null,
    lastHitX: 0,
    lastHitZ: 0,
  };
  stateBySession.set(key, created);
  return created;
}

function currentEnemies(session: WeaponSessionView): CartEnemyState[] {
  const nodeId = session.location.node.id;
  return session.enemies.filter((enemy) => enemy.alive && enemy.nodeId === nodeId);
}

function chooseTarget(session: WeaponSessionView): CartEnemyState | null {
  const px = session.car.position.x;
  const pz = session.car.position.z;
  const heading = session.car.heading;
  let best: CartEnemyState | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const enemy of currentEnemies(session)) {
    const dx = enemy.x - px;
    const dz = enemy.z - pz;
    const distance = Math.hypot(dx, dz);
    if (distance > SKY_DANCER_PLAYER_MISSILE_LOCK_DISTANCE) continue;
    const targetHeading = Math.atan2(dx, dz);
    const angle = Math.abs(normalizeAngle(targetHeading - heading));
    if (angle > 0.78) continue;
    const score = distance + angle * 18 - (enemy.kind === "boss" ? 3.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}

function launchRequestedShot(session: WeaponSessionView, state: WeaponState): boolean {
  if (state.requestedShots <= 0 || state.cooldownSeconds > 0) return false;
  if (state.missiles.filter((missile) => missile.active).length >= SKY_DANCER_PLAYER_MISSILE_MAX_ACTIVE) return false;
  state.requestedShots -= 1;
  state.cooldownSeconds = SKY_DANCER_PLAYER_MISSILE_COOLDOWN;
  const target = chooseTarget(session);
  const heading = session.car.heading;
  const muzzle = 2.6;
  const speed = 31.5 + Math.min(5.5, Math.abs(session.car.forwardVelocity) * 0.18);
  const missile: PlayerMissileInternal = {
    id: state.nextMissileId++,
    x: session.car.position.x + Math.sin(heading) * muzzle,
    z: session.car.position.z + Math.cos(heading) * muzzle,
    heading,
    speed,
    life: 4.2,
    maxLife: 4.2,
    targetEnemyId: target?.id ?? null,
    distanceToTarget: target ? Math.hypot(target.x - session.car.position.x, target.z - session.car.position.z) : Number.POSITIVE_INFINITY,
    turnRate: target ? 2.35 : 0,
    damage: target?.kind === "boss" ? 24 : target?.kind === "heavy" ? 30 : 38,
    active: true,
  };
  state.missiles.push(missile);
  state.shotSerial += 1;
  session.lastReward = target ? "FOX TWO · LOCK" : "FOX TWO";
  session.rewardTimer = Math.max(session.rewardTimer, 0.7);
  return true;
}

function pointSegmentDistanceSquared(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const lengthSq = abx * abx + abz * abz;
  if (lengthSq < 0.000001) return (px - ax) ** 2 + (pz - az) ** 2;
  const t = clamp(((px - ax) * abx + (pz - az) * abz) / lengthSq, 0, 1);
  const x = ax + abx * t;
  const z = az + abz * t;
  return (px - x) ** 2 + (pz - z) ** 2;
}

function updateMissiles(session: WeaponSessionView, state: WeaponState, delta: number): void {
  const enemies = currentEnemies(session);
  for (const missile of state.missiles) {
    if (!missile.active) continue;
    missile.life -= delta;
    if (missile.life <= 0) {
      missile.active = false;
      continue;
    }

    let target = missile.targetEnemyId ? enemies.find((enemy) => enemy.id === missile.targetEnemyId) ?? null : null;
    if (!target) {
      target = chooseTargetFromMissile(missile, enemies);
      missile.targetEnemyId = target?.id ?? null;
      missile.turnRate = target ? 2.15 : 0;
      if (target) missile.damage = target.kind === "boss" ? 24 : target.kind === "heavy" ? 30 : 38;
    }

    if (target) {
      const dx = target.x - missile.x;
      const dz = target.z - missile.z;
      missile.distanceToTarget = Math.hypot(dx, dz);
      missile.heading = rotateToward(missile.heading, Math.atan2(dx, dz), missile.turnRate * delta);
    } else {
      missile.distanceToTarget = Number.POSITIVE_INFINITY;
    }

    const oldX = missile.x;
    const oldZ = missile.z;
    missile.x += Math.sin(missile.heading) * missile.speed * delta;
    missile.z += Math.cos(missile.heading) * missile.speed * delta;

    let hit: CartEnemyState | null = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
      const radius = enemy.radius + 0.42;
      const distanceSq = pointSegmentDistanceSquared(enemy.x, enemy.z, oldX, oldZ, missile.x, missile.z);
      if (distanceSq <= radius * radius && distanceSq < bestDistanceSq) {
        hit = enemy;
        bestDistanceSq = distanceSq;
      }
    }
    if (!hit) continue;

    missile.active = false;
    const damage = hit.kind === "boss" ? 24 : hit.kind === "heavy" ? 30 : 38;
    hit.hp = Math.max(0, hit.hp - damage);
    const destroyed = hit.hp <= 0;
    hit.alive = !destroyed;
    if (destroyed) session.car.ramCount += 1;
    session.car.collisionImpact = Math.max(session.car.collisionImpact, destroyed ? 0.84 : 0.54);
    session.lastReward = destroyed ? "MISSILE SPLASH · TARGET DOWN" : `MISSILE HIT · ${Math.ceil(hit.hp)} HP`;
    session.rewardTimer = Math.max(session.rewardTimer, destroyed ? 1.25 : 0.85);
    state.hitSerial += 1;
    state.lastHitEnemyId = hit.id;
    state.lastHitX = missile.x;
    state.lastHitZ = missile.z;
  }

  if (state.missiles.length > 20) state.missiles = state.missiles.filter((missile) => missile.active);
}

function chooseTargetFromMissile(missile: PlayerMissileInternal, enemies: readonly CartEnemyState[]): CartEnemyState | null {
  let best: CartEnemyState | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    const dx = enemy.x - missile.x;
    const dz = enemy.z - missile.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 42) continue;
    const angle = Math.abs(normalizeAngle(Math.atan2(dx, dz) - missile.heading));
    if (angle > 0.9) continue;
    const score = distance + angle * 11;
    if (score < bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

export function requestSkyDancerPlayerMissile(session: CartArenaSession): boolean {
  installSkyDancerPlayerWeapons();
  const view = session as unknown as WeaponSessionView;
  const state = stateFor(view);
  if (state.cooldownSeconds > 0 || state.missiles.filter((missile) => missile.active).length >= SKY_DANCER_PLAYER_MISSILE_MAX_ACTIVE) return false;

  // Fire synchronously from the UI event. The previous implementation only
  // queued a request and waited for a later simulation step, which made iOS
  // taps appear dead when pointer capture or frame scheduling was interrupted.
  state.requestedShots = 1;
  return launchRequestedShot(view, state);
}

export function getSkyDancerPlayerWeaponState(session: CartArenaSession): SkyDancerPlayerWeaponState {
  const view = session as unknown as WeaponSessionView;
  const state = stateFor(view);
  return {
    missiles: state.missiles.filter((missile) => missile.active).map((missile) => ({
      id: missile.id,
      x: missile.x,
      z: missile.z,
      heading: missile.heading,
      speed: missile.speed,
      life: missile.life,
      maxLife: missile.maxLife,
      targetEnemyId: missile.targetEnemyId,
      distanceToTarget: missile.distanceToTarget,
    })),
    cooldownSeconds: state.cooldownSeconds,
    shotSerial: state.shotSerial,
    hitSerial: state.hitSerial,
    lastHitEnemyId: state.lastHitEnemyId,
    lastHitX: state.lastHitX,
    lastHitZ: state.lastHitZ,
  };
}

export function installSkyDancerPlayerWeapons(): void {
  const prototype = CartArenaSession.prototype as unknown as WeaponSessionView & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;
  prototype.step = function skyDancerPlayerWeaponsStep(input: RallyInputState, fixedDelta?: number): void {
    previous.call(this, input, fixedDelta);
    const delta = Math.max(0.001, Math.min(0.05, fixedDelta ?? 1 / 60));
    const state = stateFor(this as unknown as WeaponSessionView);
    state.cooldownSeconds = Math.max(0, state.cooldownSeconds - delta);
    if (state.requestedShots > 0) launchRequestedShot(this as unknown as WeaponSessionView, state);
    updateMissiles(this as unknown as WeaponSessionView, state, delta);
  };
}

installSkyDancerPlayerWeapons();
