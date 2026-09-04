import * as THREE from "three";
import { CartArenaSession } from "../cart/CartArenaSession";
import { CartRogueCanvasPreview } from "../cart/CartRogueCanvasPreview";
import { CartRogueWebGLDemo } from "../cart/CartRogueWebGLDemo";
import {
  forceCartTurboHuntBoss,
  getCartTurboHuntSnapshot,
  type CartTurboHuntSnapshot,
} from "../cart/CartRoguePhase67TurboHunt";
import {
  SKY_DANCER_SKY_RAID_ACTS,
  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidActSeconds,
  skyDancerSkyRaidKillScore,
  skyDancerSkyRaidMultiplier,
  skyDancerSkyRaidPressure,
  skyDancerSkyRaidRushActive,
  skyDancerSkyRaidWorldStyle,
  type SkyDancerSkyRaidAct,
  type SkyDancerSkyRaidPalette,
} from "./SkyDancerSkyRaidRules";
import type { RallyInputState } from "../rally/RallyTypes";
import { SkyDancerSkyRaidFlightController, type SkyDancerSkyRaidFlightSnapshot } from "./SkyDancerSkyRaidFlight";
import { SkyDancerSkyRaidArcadeWorld } from "./SkyDancerSkyRaidArcadeWorld";
import { getSkyDancerTurboState } from "./SkyDancerTurboModel";
import { getSkyDancerPlayerWeaponState } from "./SkyDancerPlayerWeapons";
import {
  getSkyDancerEnemyAltitudeMetersV43,
  setSkyDancerEnemyAltitudeReferenceV56,
} from "./SkyDancerVerticalFlightV43";

export interface SkyDancerSkyRaidSnapshot {
  gameMode: "sky-raid";
  actIndex: number;
  actId: SkyDancerSkyRaidAct["id"];
  actLabel: string;
  actSubtitle: string;
  setpiece: SkyDancerSkyRaidAct["setpiece"];
  elapsedSeconds: number;
  actElapsedSeconds: number;
  actSecondsRemaining: number;
  actKills: number;
  actKillTarget: number;
  actBreak: boolean;
  killCueSerial: number;
  killCueSecondsRemaining: number;
  score: number;
  chain: number;
  multiplier: number;
  rushActive: boolean;
  pressure: number;
  bossForced: boolean;
  clear: boolean;
  palette: SkyDancerSkyRaidPalette;
}

interface RaidSession {
  gas: number;
  rewardTimer: number;
  lastReward: string | null;
  car: {
    boostActive: boolean;
    boostCharges: number;
    addBoostCharge(amount: number): void;
    definition: { maxSpeed: number; handling: number };
  };
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface RaidState {
  active: boolean;
  actIndex: number;
  actKills: number;
  actBreak: boolean;
  previousKills: number;
  previousOrders: number;
  killCueSerial: number;
  killCueSecondsRemaining: number;
  score: number;
  chain: number;
  chainTimer: number;
  bossForced: boolean;
  clearBonus: boolean;
  baseMaxSpeed: number;
  baseHandling: number;
  broadcastClock: number;
}

interface RaidWebGLDemo {
  session: CartArenaSession;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  playerVisual: THREE.Group;
  enemyGroups: Map<string, THREE.Group>;
  steer: number;
  buildWorld(): void;
  updateVisuals(delta: number): void;
  applyCameraPresentation(snapshot: ReturnType<CartArenaSession["snapshot"]>): void;
  setVertical?(value: number): void;
}

interface RaidCanvasDemo {
  session: CartArenaSession;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  draw(): void;
}

interface RaidVisualState {
  root: THREE.Group;
  actGroups: THREE.Group[];
  speedFx: THREE.Group;
  arcadeWorld: SkyDancerSkyRaidArcadeWorld;
  legacyLayers: THREE.Object3D[];
  lastActIndex: number;
  anchorX: number;
  anchorZ: number;
  anchorHeading: number;
}

interface RaidCameraFxState {
  baseFov: number;
  lastShotSerial: number;
  lastHitSerial: number;
  shotKick: number;
  hitKick: number;
}

const raidStateBySession = new WeakMap<object, RaidState>();
const raidVisualByDemo = new WeakMap<object, RaidVisualState>();
const raidFlightByDemo = new WeakMap<object, SkyDancerSkyRaidFlightController>();
const raidCameraFxByDemo = new WeakMap<object, RaidCameraFxState>();
const raidEngagementBySession = new WeakMap<object, { cooldown: number; cursor: number; lastBeat: SkyRaidFormationBeat; beatAge: number }>();
const raidScreenEngagementByDemo = new WeakMap<object, { nextAllowedAt: number; cursor: number; recycles: number }>();
let latestSkyRaidSnapshot: SkyDancerSkyRaidSnapshot | null = null;

export const SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT = "sky-dancer-sky-raid-snapshot";
export const SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0.46;

export function skyDancerSkyRaidSteerInput(value: number): number {
  // The inherited Cart controller aggressively quickens steering after this
  // point. Keep fine stick movement unchanged, but cap large deflections so
  // the aircraft cannot snap-turn on a phone-sized virtual stick.
  return clamp(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT);
}

function isSkyRaidMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type SkyRaidFormationBeat = "spearhead" | "pincer" | "regroup" | "crossfire" | "breakaway";

type SkyRaidFormationSlot = { lateral: number; forward: number };

function skyRaidFormationPattern(elapsedSeconds: number): {
  beat: SkyRaidFormationBeat;
  progress: number;
  slots: readonly SkyRaidFormationSlot[];
  targetCount: number;
  correctionSpeed: number;
} {
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  const rush = skyDancerSkyRaidRushActive(elapsedSeconds, act);
  const mirror = act.index % 2 === 0 ? 1 : -1;
  let beat: SkyRaidFormationBeat;
  let progress: number;
  if (local < 7) {
    beat = "spearhead";
    progress = clamp(local / 7, 0, 1);
  } else if (local < 13) {
    beat = "pincer";
    progress = clamp((local - 7) / 6, 0, 1);
  } else if (local < 17) {
    beat = "regroup";
    progress = clamp((local - 13) / 4, 0, 1);
  } else if (local < 21) {
    beat = "crossfire";
    progress = clamp((local - 17) / 4, 0, 1);
  } else {
    beat = "breakaway";
    progress = clamp((local - 21) / 3, 0, 1);
  }

  let slots: readonly SkyRaidFormationSlot[];
  switch (beat) {
    case "spearhead": {
      const wing = 5.5 + progress * 2.5;
      slots = [
        { lateral: 0, forward: 23 },
        { lateral: -wing * mirror, forward: 29 },
        { lateral: wing * mirror, forward: 29 },
        { lateral: -13 * mirror, forward: 38 },
        { lateral: 13 * mirror, forward: 38 },
      ];
      break;
    }
    case "pincer": {
      const flank = 15 - progress * 7;
      slots = [
        { lateral: -flank * mirror, forward: 23 },
        { lateral: flank * mirror, forward: 25 },
        { lateral: -(9 - progress * 4) * mirror, forward: 32 },
        { lateral: (9 - progress * 4) * mirror, forward: 34 },
        { lateral: 0, forward: 41 },
      ];
      break;
    }
    case "regroup":
      slots = [
        { lateral: -10 * mirror, forward: 29 },
        { lateral: 10 * mirror, forward: 29 },
        { lateral: 0, forward: 34 },
        { lateral: -15 * mirror, forward: 42 },
        { lateral: 15 * mirror, forward: 42 },
      ];
      break;
    case "crossfire": {
      const sweep = 13 - progress * 24;
      slots = [
        { lateral: sweep * mirror, forward: 23 },
        { lateral: -sweep * mirror, forward: 28 },
        { lateral: sweep * 0.58 * mirror, forward: 35 },
        { lateral: -sweep * 0.58 * mirror, forward: 39 },
        { lateral: 0, forward: 45 },
      ];
      break;
    }
    case "breakaway":
      slots = [
        { lateral: -16 * mirror, forward: 33 },
        { lateral: 16 * mirror, forward: 33 },
        { lateral: -8 * mirror, forward: 40 },
        { lateral: 8 * mirror, forward: 40 },
        { lateral: 0, forward: 48 },
      ];
      break;
  }

  return {
    beat,
    progress,
    slots,
    targetCount: rush ? 4 : 3,
    correctionSpeed: rush ? 7.4 : 4.6,
  };
}

/**
 * V19 authored attack rhythm. Existing AI keeps speed, weapons and avoidance.
 * Already-visible enemies receive only bounded continuous corrections; only
 * old offscreen candidates may still be recycled by the established safety net.
 */
function maintainSkyRaidEnemyPresence(session: CartArenaSession, delta: number, elapsedSeconds: number): void {
  const snapshot = session.snapshot();
  const live = session.enemies.filter(
    (enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === snapshot.nodeId,
  );
  if (live.length < 2) return;

  const pattern = skyRaidFormationPattern(elapsedSeconds);
  const key = session as unknown as object;
  let state = raidEngagementBySession.get(key);
  if (!state) {
    state = { cooldown: 0, cursor: 0, lastBeat: pattern.beat, beatAge: 0 };
    raidEngagementBySession.set(key, state);
  }
  if (state.lastBeat !== pattern.beat) {
    state.lastBeat = pattern.beat;
    state.beatAge = 0;
    state.cooldown = 0;
  } else {
    state.beatAge += delta;
  }
  state.cooldown = Math.max(0, state.cooldown - delta);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.skyRaidFormationBeat = pattern.beat;
    document.documentElement.dataset.skyRaidFormationPhase = pattern.progress.toFixed(2);
  }

  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const local = (enemy: (typeof live)[number]) => {
    const dx = enemy.x - snapshot.x;
    const dz = enemy.z - snapshot.z;
    return {
      enemy,
      forward: dx * forwardX + dz * forwardZ,
      lateral: dx * rightX + dz * rightZ,
    };
  };

  const choreographed = live.map(local)
    .filter(({ forward, lateral }) => forward >= 7 && forward <= 58 && Math.abs(lateral) <= 27)
    .sort((left, right) => left.forward - right.forward)
    .slice(0, Math.min(pattern.targetCount, live.length));
  for (let index = 0; index < choreographed.length; index += 1) {
    const sample = choreographed[index];
    const slot = pattern.slots[index % pattern.slots.length];
    const lateralError = slot.lateral - sample.lateral;
    const forwardError = slot.forward - sample.forward;
    const sideStep = clamp(lateralError, -pattern.correctionSpeed * delta, pattern.correctionSpeed * delta);
    const forwardStep = clamp(forwardError, -pattern.correctionSpeed * 0.72 * delta, pattern.correctionSpeed * 0.72 * delta);
    sample.enemy.x += rightX * sideStep + forwardX * forwardStep;
    sample.enemy.z += rightZ * sideStep + forwardZ * forwardStep;
    const aimX = snapshot.x + forwardX * 7 + rightX * slot.lateral * 0.14;
    const aimZ = snapshot.z + forwardZ * 7 + rightZ * slot.lateral * 0.14;
    const desiredHeading = Math.atan2(aimX - sample.enemy.x, aimZ - sample.enemy.z);
    const turnError = Math.atan2(
      Math.sin(desiredHeading - sample.enemy.heading),
      Math.cos(desiredHeading - sample.enemy.heading),
    );
    sample.enemy.heading += clamp(turnError, -delta * 0.72, delta * 0.72);
  }

  const measured = live.map(local);
  const targetCount = Math.min(pattern.targetCount, live.length);
  const engaged = measured.filter(
    ({ forward, lateral }) => forward >= 10 && forward <= 53 && Math.abs(lateral) <= 22,
  );
  if (engaged.length >= targetCount) return;
  if (state.cooldown > 0) return;

  const engagedIds = new Set(engaged.map(({ enemy }) => enemy.id));
  const candidates = measured
    .filter(({ enemy }) => !engagedIds.has(enemy.id))
    .sort((left, right) => {
      const penalty = ({ forward, lateral }: typeof left) =>
        Math.abs(lateral)
        + Math.max(0, 10 - forward) * 2.2
        + Math.max(0, forward - 53) * 1.6;
      return penalty(right) - penalty(left);
    });
  const needed = Math.min(targetCount - engaged.length, candidates.length, 2);
  for (let index = 0; index < needed; index += 1) {
    const target = candidates[index].enemy;
    const slot = pattern.slots[(state.cursor + engaged.length + index) % pattern.slots.length];
    target.x = snapshot.x + forwardX * slot.forward + rightX * slot.lateral;
    target.z = snapshot.z + forwardZ * slot.forward + rightZ * slot.lateral;
    target.heading = Math.atan2(snapshot.x - target.x, snapshot.z - target.z);
    target.aiClock = 0;
    target.chargeTime = 0;
  }
  state.cursor = (state.cursor + needed) % pattern.slots.length;
  state.cooldown = needed > 0 ? 0.44 : 0.18;
}


const SKY_RAID_SCREEN_SLOTS = [
  { lateral: -7, forward: 24 },
  { lateral: 7, forward: 29 },
  { lateral: 0, forward: 34 },
  { lateral: -11, forward: 31 },
  { lateral: 11, forward: 36 },
] as const;

/**
 * Simulation-space engagement cannot guarantee phone-screen visibility
 * after pitch, bank, camera framing, and altitude transitions. Use the
 * final camera projection as a second-stage arcade engagement director.
 * Only already-offscreen aircraft are recycled, so visible targets never pop.
 */
function maintainSkyRaidScreenPresence(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  const live = demo.session.enemies.filter(
    (enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === snapshot.nodeId,
  );
  if (live.length < 2) return;

  const key = demo as unknown as object;
  let state = raidScreenEngagementByDemo.get(key);
  if (!state) {
    state = { nextAllowedAt: 0, cursor: 0, recycles: 0 };
    raidScreenEngagementByDemo.set(key, state);
  }

  demo.scene.updateMatrixWorld(true);
  demo.camera.updateMatrixWorld(true);
  const measured = live.flatMap((enemy) => {
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) return [];
    const world = new THREE.Vector3();
    group.getWorldPosition(world);
    const ndc = world.clone().project(demo.camera);
    const visible = ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) < 0.96 && Math.abs(ndc.y) < 0.94;
    return [{ enemy, group, ndc, visible }];
  });
  const visible = measured.filter((sample) => sample.visible);
  demo.scene.userData.skyRaidScreenPresenceVisible = visible.length;
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
  if (visible.length >= 2) {
    state.nextAllowedAt = 0;
    return;
  }

  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  if (now < state.nextAllowedAt) return;

  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const candidates = measured
    .filter((sample) => !sample.visible)
    .sort((left, right) => {
      const leftPenalty = Math.abs(left.ndc.x) + Math.abs(left.ndc.y) + Math.abs(left.ndc.z) * 0.12;
      const rightPenalty = Math.abs(right.ndc.x) + Math.abs(right.ndc.y) + Math.abs(right.ndc.z) * 0.12;
      return rightPenalty - leftPenalty;
    });
  const needed = Math.min(2 - visible.length, candidates.length);
  for (let index = 0; index < needed; index += 1) {
    const sample = candidates[index];
    const slot = SKY_RAID_SCREEN_SLOTS[(state.cursor + index) % SKY_RAID_SCREEN_SLOTS.length];
    const x = snapshot.x + forwardX * slot.forward + rightX * slot.lateral;
    const z = snapshot.z + forwardZ * slot.forward + rightZ * slot.lateral;
    sample.enemy.x = x;
    sample.enemy.z = z;
    sample.enemy.heading = Math.atan2(snapshot.x - x, snapshot.z - z);
    sample.enemy.aiClock = 0;
    sample.enemy.chargeTime = 0;
    sample.group.position.x = x;
    sample.group.position.z = z;
    sample.group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(sample.enemy);
    sample.group.userData.lastX = x;
    sample.group.userData.lastZ = z;
    sample.group.updateMatrixWorld(true);
    state.recycles += 1;
  }
  state.cursor = (state.cursor + needed) % SKY_RAID_SCREEN_SLOTS.length;
  state.nextAllowedAt = now + (needed > 0 ? 0.28 : 0.12);
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
}

function publishSkyRaidWorldStyle(snapshot: SkyDancerSkyRaidSnapshot): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.skyRaidAct = snapshot.actId;
  document.documentElement.dataset.skyRaidWorldStyle = skyDancerSkyRaidWorldStyle(snapshot.actId);
}

function flightControllerFor(demo: RaidWebGLDemo): SkyDancerSkyRaidFlightController {
  const key = demo as unknown as object;
  const current = raidFlightByDemo.get(key);
  if (current) return current;
  const controller = new SkyDancerSkyRaidFlightController();
  raidFlightByDemo.set(key, controller);
  return controller;
}

function cameraFxFor(demo: RaidWebGLDemo): RaidCameraFxState {
  const key = demo as unknown as object;
  const current = raidCameraFxByDemo.get(key);
  if (current) return current;
  const created: RaidCameraFxState = {
    baseFov: clamp(demo.camera.fov, 50, 70),
    lastShotSerial: 0,
    lastHitSerial: 0,
    shotKick: 0,
    hitKick: 0,
  };
  raidCameraFxByDemo.set(key, created);
  return created;
}

const LEGACY_SKY_RAID_GRAPHIC_PREFIXES = [
  "sky-dancer-v35-",
  "sky-dancer-v38-",
  "sky-dancer-v47-",
  "sky-dancer-v53-",
] as const;

function collectLegacyRaidLayers(scene: THREE.Scene): THREE.Object3D[] {
  const layers: THREE.Object3D[] = [];
  scene.traverse((object) => {
    const sphereRadius = object instanceof THREE.Mesh && object.geometry instanceof THREE.SphereGeometry
      ? object.geometry.parameters.radius
      : 0;
    const legacySkySphere = sphereRadius >= 250 && sphereRadius < 900 && object.name !== "sky-raid-arcade-product-sky";
    if (legacySkySphere || object.name === "sky-dancer-v50-color-script-sky" || LEGACY_SKY_RAID_GRAPHIC_PREFIXES.some((prefix) => object.name.startsWith(prefix))) layers.push(object);
  });
  return layers;
}

function stepSkyRaidFlight(demo: RaidWebGLDemo, delta: number): SkyDancerSkyRaidFlightSnapshot {
  const base = demo.session.snapshot();
  const flight = flightControllerFor(demo).step(delta, base.heading, demo.steer, base.boostActive);
  (demo.session as unknown as { skyDancerPlayerAltitudeMeters?: number }).skyDancerPlayerAltitudeMeters = flight.altitude;
  // Keep enemy attack runs in the same broad camera band as the player while
  // preserving meaningful vertical separation at the upper altitude limit.
  const enemyAltitudeReference = flight.altitude;
  setSkyDancerEnemyAltitudeReferenceV56(enemyAltitudeReference);
  demo.scene.userData.skyRaidEnemyAltitudeReference = enemyAltitudeReference;
  demo.scene.userData.skyRaidPlayerAltitude = flight.altitude;
  demo.scene.userData.skyRaidPlayerVerticalSpeed = flight.verticalSpeed;
  demo.scene.userData.skyRaidPlayerPitch = flight.pitch;
  demo.scene.userData.skyRaidPlayerBank = flight.bank;
  return flight;
}

function applySkyRaidFlightVisuals(demo: RaidWebGLDemo, flight: SkyDancerSkyRaidFlightSnapshot): void {
  demo.playerVisual.position.y = 0.62 + flight.altitude;
  demo.playerVisual.rotation.x = flight.pitch;
  demo.playerVisual.rotation.z = flight.bank;
}

function applySkyRaidEnemyFlightBand(demo: RaidWebGLDemo): void {
  const snapshot = demo.session.snapshot();
  for (const enemy of snapshot.enemies) {
    if (!enemy.alive) continue;
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    // V18's inherited aircraft presentation still writes enemy Y around the
    // old y=1 flight plane. SKY RAID is the final visual owner, so lift every
    // live aircraft to the shared engagement altitude after inherited FX run.
    group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(
      demo.session.enemies.find((candidate) => candidate.id === enemy.id) ?? enemy as never,
    );
  }
}

function suppressTurboHuntBackdrop(scene: THREE.Scene): void {
  // Phase67 owns a 360m fixed blue sky sphere plus a pastel test field. Because
  // that sphere sits inside the later V38/V50 sky domes, it completely masks
  // their color-script changes. SKY RAID has its own world owners, so remove
  // only this legacy decorative root while keeping enemies/pickups/combat.
  const turboBackdrop = scene.getObjectByName("phase67-turbo-hunt-world");
  if (turboBackdrop) turboBackdrop.visible = false;
}

function stateFor(session: RaidSession, hunt: CartTurboHuntSnapshot): RaidState {
  const key = session as unknown as object;
  const current = raidStateBySession.get(key);
  if (current) return current;
  const created: RaidState = {
    active: true,
    actIndex: 0,
    actKills: 0,
    actBreak: false,
    previousKills: hunt.huntKills,
    previousOrders: hunt.huntOrdersCompleted,
    killCueSerial: 0,
    killCueSecondsRemaining: 0,
    score: 0,
    chain: 0,
    chainTimer: 0,
    bossForced: false,
    clearBonus: false,
    baseMaxSpeed: session.car.definition.maxSpeed,
    baseHandling: session.car.definition.handling,
    broadcastClock: 0,
  };
  raidStateBySession.set(key, created);
  return created;
}

function rewardActBreak(session: RaidSession, state: RaidState, act: SkyDancerSkyRaidAct): void {
  if (state.actBreak) return;
  state.actBreak = true;
  state.score += 1200 + act.index * 350;
  session.gas = Math.min(1, session.gas + 0.08);
  const before = session.car.boostCharges;
  session.car.addBoostCharge(1);
  const turboReward = session.car.boostCharges > before ? " · TURBO +1" : "";
  session.lastReward = `ACT BREAK · ${act.label}${turboReward}`;
  session.rewardTimer = Math.max(session.rewardTimer, 2.2);
}

function updateRaid(session: RaidSession, hunt: CartTurboHuntSnapshot, delta: number): SkyDancerSkyRaidSnapshot {
  const state = stateFor(session, hunt);
  const act = skyDancerSkyRaidActFor(hunt.huntElapsedSeconds);
  if (act.index !== state.actIndex) {
    state.actIndex = act.index;
    state.actKills = 0;
    state.actBreak = false;
    state.killCueSecondsRemaining = 0;
    session.gas = Math.min(1, session.gas + 0.035);
    session.lastReward = `ACT ${act.index + 1} · ${act.label} · ${act.setpiece}`;
    session.rewardTimer = Math.max(session.rewardTimer, 2.4);
  }

  const rushActive = skyDancerSkyRaidRushActive(hunt.huntElapsedSeconds, act);
  const killDelta = Math.max(0, hunt.huntKills - state.previousKills);
  for (let index = 0; index < killDelta; index += 1) {
    state.chain = Math.min(12, state.chain + 1);
    state.chainTimer = 4.2;
    state.actKills += 1;
    state.score += skyDancerSkyRaidKillScore(state.chain, session.car.boostActive, rushActive);
  }
  if (killDelta > 0) {
    state.killCueSerial += killDelta;
    state.killCueSecondsRemaining = 1.18;
  }
  state.previousKills = hunt.huntKills;

  const orderDelta = Math.max(0, hunt.huntOrdersCompleted - state.previousOrders);
  if (orderDelta > 0) state.score += orderDelta * 450;
  state.previousOrders = hunt.huntOrdersCompleted;

  state.chainTimer = Math.max(0, state.chainTimer - delta);
  state.killCueSecondsRemaining = Math.max(0, state.killCueSecondsRemaining - delta);
  if (state.chainTimer <= 0) state.chain = 0;
  if (state.actKills >= act.killTarget) rewardActBreak(session, state, act);

  const pressure = skyDancerSkyRaidPressure(hunt.huntElapsedSeconds);
  session.car.definition.maxSpeed = Math.max(state.baseMaxSpeed, 23.5 + pressure * 3.1);
  session.car.definition.handling = state.baseHandling * (1 + pressure * 0.08);

  if (!state.bossForced && hunt.huntElapsedSeconds >= SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS) {
    state.bossForced = true;
    state.score += 1000;
    session.lastReward = "FINAL ACT · PRISM TITAN INBOUND";
    session.rewardTimer = Math.max(session.rewardTimer, 3.2);
    forceCartTurboHuntBoss(session as unknown as CartArenaSession);
  }
  const clear = hunt.huntPhase === "clear";
  if (clear && !state.clearBonus) {
    state.clearBonus = true;
    state.score += 5000 + Math.round(Math.max(0, 120 - hunt.huntElapsedSeconds) * 80);
  }

  const actElapsed = skyDancerSkyRaidActSeconds(hunt.huntElapsedSeconds, act);
  return {
    gameMode: "sky-raid",
    actIndex: act.index,
    actId: act.id,
    actLabel: act.label,
    actSubtitle: act.subtitle,
    setpiece: act.setpiece,
    elapsedSeconds: hunt.huntElapsedSeconds,
    actElapsedSeconds: actElapsed,
    actSecondsRemaining: Math.max(0, act.endSeconds - hunt.huntElapsedSeconds),
    actKills: state.actKills,
    actKillTarget: act.killTarget,
    actBreak: state.actBreak,
    killCueSerial: state.killCueSerial,
    killCueSecondsRemaining: state.killCueSecondsRemaining,
    score: state.score,
    chain: state.chain,
    multiplier: skyDancerSkyRaidMultiplier(state.chain, rushActive),
    rushActive,
    pressure,
    bossForced: state.bossForced,
    clear,
    palette: act.palette,
  };
}

function broadcast(snapshot: SkyDancerSkyRaidSnapshot): void {
  latestSkyRaidSnapshot = { ...snapshot, palette: { ...snapshot.palette } };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SkyDancerSkyRaidSnapshot>(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, { detail: latestSkyRaidSnapshot }));
  }
}

export function getLatestSkyDancerSkyRaidSnapshot(): SkyDancerSkyRaidSnapshot | null {
  return latestSkyRaidSnapshot ? { ...latestSkyRaidSnapshot, palette: { ...latestSkyRaidSnapshot.palette } } : null;
}

function material(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.08,
    flatShading: true,
    emissive: emissive || 0x000000,
    emissiveIntensity: emissive ? 0.52 : 0,
  });
}

function box(root: THREE.Group, size: [number, number, number], position: [number, number, number], color: number, emissive = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, emissive));
  mesh.position.set(...position);
  root.add(mesh);
  return mesh;
}

function ring(root: THREE.Group, radius: number, z: number, color: number, y = 5): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.18, 6, 30),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  mesh.position.set(0, y, z);
  root.add(mesh);
  return mesh;
}

function buildCity(act: SkyDancerSkyRaidAct): THREE.Group {
  const root = new THREE.Group();
  for (let index = 0; index < 18; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2);
    const height = 10 + (lane % 4) * 5;
    box(root, [4 + lane % 3, height, 4 + (lane + 1) % 3], [side * (18 + (lane % 3) * 7), height * 0.5, -28 + lane * 13], act.palette.primary, lane % 3 === 0 ? act.palette.accent : 0);
  }
  ring(root, 8, 28, act.palette.accent, 7);
  ring(root, 10, 60, act.palette.secondary, 8);
  return root;
}

function buildCanyon(act: SkyDancerSkyRaidAct): THREE.Group {
  const root = new THREE.Group();
  for (let index = 0; index < 12; index += 1) {
    const z = -42 + index * 14;
    const height = 7 + (index % 4) * 4;
    box(root, [10 + index % 3 * 3, height, 8], [-28 - (index % 2) * 5, height * 0.5, z], act.palette.primary);
    box(root, [10 + (index + 1) % 3 * 3, height + 2, 8], [28 + (index % 2) * 5, (height + 2) * 0.5, z + 4], act.palette.secondary);
  }
  ring(root, 9, 34, act.palette.accent, 6);
  return root;
}

function buildFleet(act: SkyDancerSkyRaidAct): THREE.Group {
  const root = new THREE.Group();
  const carrier = new THREE.Group();
  box(carrier, [9, 3.2, 44], [0, 7, 54], act.palette.primary);
  box(carrier, [31, 0.9, 13], [0, 7.2, 48], act.palette.secondary);
  box(carrier, [4, 7, 8], [3, 10, 62], act.palette.secondary, act.palette.accent);
  box(carrier, [2.5, 1.2, 15], [-8, 8, 44], act.palette.accent, act.palette.accent);
  root.add(carrier);
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      box(root, [4, 1.1, 9], [side * (22 + index * 7), 6 + index, 24 + index * 20], act.palette.secondary, index === 2 ? act.palette.accent : 0);
    }
  }
  ring(root, 8, 30, act.palette.accent, 6);
  return root;
}

function buildStorm(act: SkyDancerSkyRaidAct): THREE.Group {
  const root = new THREE.Group();
  for (let index = 0; index < 8; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const z = -30 + Math.floor(index / 2) * 28;
    box(root, [2.4, 16 + (index % 3) * 5, 2.4], [side * 25, 8 + (index % 3) * 2.5, z], act.palette.primary, act.palette.accent);
  }
  for (let index = 0; index < 5; index += 1) {
    const points = [
      new THREE.Vector3(-12 + index * 4, 18, 12 + index * 13),
      new THREE.Vector3(-4 + index * 2, 10, 18 + index * 13),
      new THREE.Vector3(8 - index * 2, 3, 24 + index * 13),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    root.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: act.palette.accent, transparent: true, opacity: 0.76 })));
  }
  ring(root, 8.5, 42, act.palette.accent, 6.5);
  return root;
}

function buildPrism(act: SkyDancerSkyRaidAct): THREE.Group {
  const root = new THREE.Group();
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    const radius = 26 + (index % 2) * 8;
    const spire = new THREE.Mesh(new THREE.OctahedronGeometry(3 + (index % 3), 0), material(index % 2 ? act.palette.primary : act.palette.secondary, act.palette.accent));
    spire.scale.y = 2.8 + (index % 3) * 0.6;
    spire.position.set(Math.sin(angle) * radius, 8 + (index % 3) * 3, 46 + Math.cos(angle) * radius);
    root.add(spire);
  }
  ring(root, 8, 26, act.palette.accent, 7);
  ring(root, 12, 54, act.palette.secondary, 9);
  ring(root, 16, 84, act.palette.accent, 11);
  return root;
}

function buildActGroup(act: SkyDancerSkyRaidAct): THREE.Group {
  if (act.id === "dawn-city") return buildCity(act);
  if (act.id === "red-canyon") return buildCanyon(act);
  if (act.id === "cloud-fleet") return buildFleet(act);
  if (act.id === "storm-carrier") return buildStorm(act);
  return buildPrism(act);
}

function buildSpeedFx(): THREE.Group {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.028, 0.028, 4.2);
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xc9f7ff,
    transparent: true,
    opacity: 0.08,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  // V20 speed language stays at the phone periphery. The +/-6.8m center gap
  // keeps aircraft, locks, and missile trails readable while airflow streaks
  // sell speed against dense scenery without moving the world itself.
  const laneX = [-13.2, -10.8, -8.6, -6.8, 6.8, 8.6, 10.8, 13.2] as const;
  for (let index = 0; index < 24; index += 1) {
    const line = new THREE.Mesh(geometry, lineMaterial);
    const column = index % laneX.length;
    const row = Math.floor(index / laneX.length);
    line.position.set(laneX[column], -1.2 + row * 2.7, 10 + (index % 6) * 7.2);
    line.scale.z = 0.82 + (index % 4) * 0.08;
    line.renderOrder = 1080;
    root.add(line);
  }
  root.visible = false;
  return root;
}

function buildRaidVisuals(demo: RaidWebGLDemo): void {
  if (!isSkyRaidMode()) return;
  if (raidVisualByDemo.has(demo as unknown as object)) return;
  const root = new THREE.Group();
  root.name = "sky-raid-arcade-setpieces";
  const actGroups = SKY_DANCER_SKY_RAID_ACTS.map((act, index) => {
    const group = buildActGroup(act);
    group.visible = index === 0;
    root.add(group);
    return group;
  });
  const speedFx = buildSpeedFx();
  speedFx.name = "sky-raid-speed-fx";
  demo.scene.add(root, speedFx);
  const arcadeWorld = new SkyDancerSkyRaidArcadeWorld(demo.scene);
  const legacyLayers = collectLegacyRaidLayers(demo.scene);
  root.visible = false;
  raidVisualByDemo.set(demo as unknown as object, {
    root,
    actGroups,
    speedFx,
    arcadeWorld,
    legacyLayers,
    lastActIndex: -1,
    anchorX: Number.NaN,
    anchorZ: Number.NaN,
    anchorHeading: 0,
  });
}

function updateRaidVisuals(demo: RaidWebGLDemo, delta: number, flight: SkyDancerSkyRaidFlightSnapshot | null = null): void {
  let visual = raidVisualByDemo.get(demo as unknown as object);
  if (!visual && isSkyRaidMode()) {
    buildRaidVisuals(demo);
    visual = raidVisualByDemo.get(demo as unknown as object);
  }
  if (!visual) return;
  if (!isSkyRaidMode()) {
    visual.root.visible = false;
    visual.speedFx.visible = false;
    return;
  }
  const hunt = getCartTurboHuntSnapshot(demo.session);
  if (!hunt) return;
  const raid = updateRaid(demo.session as unknown as RaidSession, hunt, 0);
  publishSkyRaidWorldStyle(raid);
  suppressTurboHuntBackdrop(demo.scene);
  const base = demo.session.snapshot();
  const movedFar = !Number.isFinite(visual.anchorX) || Math.hypot(base.x - visual.anchorX, base.z - visual.anchorZ) > 105;
  if (raid.actIndex !== visual.lastActIndex || movedFar) {
    visual.anchorX = base.x;
    visual.anchorZ = base.z;
    visual.anchorHeading = base.heading;
    visual.root.position.set(base.x, 0, base.z);
    visual.root.rotation.y = base.heading;
    visual.lastActIndex = raid.actIndex;
  }
  visual.actGroups.forEach((group) => { group.visible = false; });
  visual.root.visible = false;
  visual.legacyLayers.forEach((layer) => { layer.visible = false; });
  const resolvedFlight = flight ?? stepSkyRaidFlight(demo, delta);
  applySkyRaidFlightVisuals(demo, resolvedFlight);
  applySkyRaidEnemyFlightBand(demo);
  visual.arcadeWorld.update(raid.actId, base.x, base.z, base.heading, resolvedFlight.altitude, raid.elapsedSeconds, delta);

  const flightSpeed = Math.abs(base.speed);
  const cruiseFx = clamp((flightSpeed - 17) / 12, 0, 1);
  const turboState = getSkyDancerTurboState(demo.session);
  const turboReleaseFx = Number.isFinite(turboState.releaseAgeSeconds)
    ? clamp(1 - turboState.releaseAgeSeconds / 1.45, 0, 1)
    : 0;
  const turboFx = turboState.held ? 1 : turboReleaseFx * (0.72 + turboState.releaseCharge * 0.18);
  const rushFx = raid.rushActive ? 1 : 0;
  const speedFxIntensity = clamp(cruiseFx * 0.22 + rushFx * 0.32 + turboFx * 0.72, 0, 1);
  visual.speedFx.visible = speedFxIntensity > 0.055;
  visual.speedFx.position.set(base.x, 1.8 + resolvedFlight.altitude, base.z);
  visual.speedFx.rotation.y = base.heading;
  const speedColor = new THREE.Color(raid.palette.accent);
  visual.speedFx.children.forEach((line, index) => {
    if (line instanceof THREE.Mesh && line.material instanceof THREE.MeshBasicMaterial) {
      line.material.color.lerp(speedColor, 1 - Math.exp(-delta * 5.5));
      line.material.opacity = 0.045 + speedFxIntensity * 0.32;
    }
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);
    if (line.position.z < -12) line.position.z = 34 + (index % 6) * 8;
    const thickness = 0.72 + speedFxIntensity * 0.32;
    line.scale.x = thickness;
    line.scale.y = thickness;
    line.scale.z = 0.82 + speedFxIntensity * (1.10 + (index % 3) * 0.12);
  });
  demo.scene.userData.skyRaidSpeedFxIntensity = speedFxIntensity;
  demo.scene.userData.skyRaidSpeedFxPeripheralGap = 13.6;
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetSpeedPolish = () => ({
      visible: visual?.speedFx.visible === true,
      intensity: Number(demo.scene.userData.skyRaidSpeedFxIntensity ?? 0),
      peripheralGap: Number(demo.scene.userData.skyRaidSpeedFxPeripheralGap ?? 0),
      lineCount: visual?.speedFx.children.length ?? 0,
      turboHeld: turboState.held,
      turboCharge: turboState.charge,
      turboReleaseFx,
      legacyBoostActive: base.boostActive,
      rushActive: raid.rushActive,
      flightSpeed,
    });
  }
}

export function installSkyDancerSkyRaid(): void {
  const sessionPrototype = CartArenaSession.prototype as unknown as RaidSession;
  const previousStep = sessionPrototype.step;
  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {
    const skyRaidActive = isSkyRaidMode();
    const flightInput = skyRaidActive
      ? { ...input, steer: skyDancerSkyRaidSteerInput(input.steer) }
      : input;
    previousStep.call(this, flightInput, fixedDelta);
    if (!skyRaidActive) return;
    const delta = clamp(fixedDelta, 0, 0.05);
    const hunt = getCartTurboHuntSnapshot(this as unknown as CartArenaSession);
    if (!hunt) return;
    maintainSkyRaidEnemyPresence(this as unknown as CartArenaSession, delta, hunt.huntElapsedSeconds);
    const snapshot = updateRaid(this, hunt, delta);
    publishSkyRaidWorldStyle(snapshot);
    const state = stateFor(this, hunt);
    state.broadcastClock += delta;
    if (state.broadcastClock >= 0.1 || snapshot.actElapsedSeconds < 0.12 || snapshot.clear) {
      state.broadcastClock %= 0.1;
      broadcast(snapshot);
    }
  };

  const webglPrototype = CartRogueWebGLDemo.prototype as unknown as RaidWebGLDemo;
  webglPrototype.setVertical = function skyRaidSetVertical(this: RaidWebGLDemo, value: number): void {
    flightControllerFor(this).setVerticalInput(value);
  };
  const previousBuildWorld = webglPrototype.buildWorld;
  webglPrototype.buildWorld = function skyRaidBuildWorld(this: RaidWebGLDemo): void {
    if (!isSkyRaidMode()) previousBuildWorld.call(this);
    buildRaidVisuals(this);
  };
  const previousUpdateVisuals = webglPrototype.updateVisuals;
  webglPrototype.updateVisuals = function skyRaidUpdateVisuals(this: RaidWebGLDemo, delta: number): void {
    const flight = isSkyRaidMode() ? stepSkyRaidFlight(this, delta) : null;
    previousUpdateVisuals.call(this, delta);
    updateRaidVisuals(this, delta, flight);
  };

  // Base animate() copies the chase-camera position after updateVisuals(). Apply
  // SKY RAID altitude here, at the final presentation stage, so the camera follows
  // the aircraft throughout the much wider vertical flight envelope.
  const previousApplyCameraPresentation = webglPrototype.applyCameraPresentation;
webglPrototype.applyCameraPresentation = function skyRaidCameraPresentation(
  this: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  previousApplyCameraPresentation.call(this, snapshot);
  if (!isSkyRaidMode()) return;
  // Older aircraft FX still writes the historical ~1m enemy flight plane during
  // its late presentation update. SKY RAID owns the final render altitude, so
  // restore the shared 20-64m combat band here, immediately before camera/render.
  applySkyRaidEnemyFlightBand(this);
  const altitude = Number(this.scene.userData.skyRaidPlayerAltitude ?? 0);
  const verticalSpeed = Number(this.scene.userData.skyRaidPlayerVerticalSpeed ?? 0);
  const pitch = Number(this.scene.userData.skyRaidPlayerPitch ?? 0);
  const bank = Number(this.scene.userData.skyRaidPlayerBank ?? 0);
  const speed = Math.abs(snapshot.speed);
  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const turbo = getSkyDancerTurboState(this.session);
  const weapon = getSkyDancerPlayerWeaponState(this.session);
  const cameraFx = cameraFxFor(this);
  if (!snapshot.boostActive && cameraFx.shotKick < 0.03 && cameraFx.hitKick < 0.03) {
    cameraFx.baseFov += (clamp(this.camera.fov, 50, 70) - cameraFx.baseFov) * 0.12;
  }
  if (weapon.shotSerial > cameraFx.lastShotSerial) {
    cameraFx.lastShotSerial = weapon.shotSerial;
    cameraFx.shotKick = 1;
  }
  if (weapon.hitSerial > cameraFx.lastHitSerial) {
    cameraFx.lastHitSerial = weapon.hitSerial;
    const impactEnemy = weapon.lastHitEnemyId
      ? this.session.enemies.find((enemy) => enemy.id === weapon.lastHitEnemyId) ?? null
      : null;
    cameraFx.hitKick = impactEnemy && !impactEnemy.alive ? 1.42 : 1.05;
  }
  cameraFx.shotKick *= 0.82;
  cameraFx.hitKick *= 0.86;
  const releaseKick = Number.isFinite(turbo.releaseAgeSeconds)
    ? Math.exp(-Math.max(0, turbo.releaseAgeSeconds) * 2.35)
    : 0;
  const turboCamera = snapshot.boostActive
    ? 0.44 + releaseKick * (0.72 + turbo.releaseCharge * 0.30)
    : 0;
  const chaseDistance = 9.6 + Math.min(4.0, speed * 0.085) + turboCamera * 3.9;
  const lookAhead = 6.8 + Math.min(5.2, speed * 0.105) + turboCamera * 5.5;
  const rawVerticalLead = clamp(verticalSpeed * 0.14 + pitch * 4.6, -2.6, 3.0);
  // Near either altitude stop, keep the aircraft as the visual anchor instead
  // of continuing to look farther up/down after the craft can no longer move.
  const altitudeEdgeBlend = clamp(Math.max((altitude - 48) / 16, (-10 - altitude) / 8, 0), 0, 1);
  const verticalLead = rawVerticalLead * (1 - altitudeEdgeBlend * 0.88);
  // Camera Y follows the actual aircraft Y almost one-to-one; pitch and vertical
  // velocity only add a small cinematic offset.
  const cameraLift = 4.70 - pitch * 0.55 + clamp(verticalSpeed * 0.018, -0.22, 0.28) + turboCamera * 0.24;
  const clock = typeof performance !== "undefined" ? performance.now() : Date.now();
  const hitShake = Math.sin(clock * 0.055) * cameraFx.hitKick * 0.24;
  const shotRecoil = cameraFx.shotKick * 0.18;

  this.playerVisual.position.y = 0.62 + altitude;
  this.playerVisual.rotation.x = pitch;
  this.playerVisual.rotation.z = bank;
  this.playerVisual.updateWorldMatrix(true, false);
  const playerPosition = new THREE.Vector3();
  this.playerVisual.getWorldPosition(playerPosition);
  this.camera.position.set(
    playerPosition.x - forwardX * (chaseDistance + shotRecoil) + rightX * hitShake,
    playerPosition.y + cameraLift + cameraFx.hitKick * 0.10,
    playerPosition.z - forwardZ * (chaseDistance + shotRecoil) + rightZ * hitShake,
  );
  this.camera.up.set(0, 1, 0);
  let lookTargetY = playerPosition.y + 0.96 + verticalLead - cameraFx.hitKick * 0.08;
  this.camera.lookAt(
    playerPosition.x + forwardX * lookAhead,
    lookTargetY,
    playerPosition.z + forwardZ * lookAhead,
  );

  // Screen-space framing assist. Keep the aircraft in a safe lower-center band
  // even while climb/dive input is held against the altitude limit.
  this.camera.updateMatrixWorld(true);
  const preFrameProjection = playerPosition.clone().project(this.camera);
  const desiredPlayerNdcY = -0.22;
  const verticalFrameError = clamp(preFrameProjection.y - desiredPlayerNdcY, -0.70, 0.70);
  const frameAssist = clamp(0.58 + Math.abs(verticalSpeed) / 16 * 0.20 + altitudeEdgeBlend * 0.34, 0.58, 1.0);
  // The normal-flight correction stays subtle, but at either hard altitude stop
  // the camera must decisively follow the aircraft instead of letting it sit at
  // the top/bottom edge. Edge gain ramps independently so mid-flight framing is
  // unchanged while the limit case gets enough authority to recenter the craft.
  const edgeFrameGain = 3.4 + altitudeEdgeBlend * 6.6;
  const frameCorrection = clamp(verticalFrameError * edgeFrameGain * frameAssist, -6.0, 6.0);
  if (Math.abs(frameCorrection) > 0.01) {
    lookTargetY += frameCorrection;
    this.camera.lookAt(
      playerPosition.x + forwardX * lookAhead,
      lookTargetY,
      playerPosition.z + forwardZ * lookAhead,
    );
  }
  this.camera.rotateZ(bank * (0.085 + turboCamera * 0.018) + hitShake * 0.035);
  // V20 adds a restrained cruise-speed lens response. It is presentation-only:
  // scenery coordinates and flight physics remain untouched, while Turbo keeps
  // the dominant FOV kick already authored by the release camera language.
  const cruiseFov = clamp((speed - 18) * 0.10, 0, 2.2);
  const targetFov = clamp(
    cameraFx.baseFov + cruiseFov + turboCamera * (6.6 + turbo.releaseCharge * 3.4) + cameraFx.shotKick * 0.35 - cameraFx.hitKick * 0.75,
    50,
    82,
  );
  if (Math.abs(this.camera.fov - targetFov) > 0.01) {
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
  }
  this.scene.userData.skyRaidCameraVerticalLead = verticalLead;
  this.scene.userData.skyRaidCameraAltitudeEdgeBlend = altitudeEdgeBlend;
  this.scene.userData.skyRaidCameraFrameCorrection = frameCorrection;
  this.scene.userData.skyRaidCameraTurboBlend = turboCamera;
  this.scene.userData.skyRaidCameraCruiseFov = cruiseFov;
  this.scene.userData.skyRaidCameraHitKick = cameraFx.hitKick;
  this.scene.userData.skyRaidCameraShotKick = cameraFx.shotKick;
  this.scene.userData.skyRaidCameraFov = this.camera.fov;
  maintainSkyRaidScreenPresence(this, snapshot);
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetCameraPolish = () => {
      this.scene.updateMatrixWorld(true);
      this.camera.updateMatrixWorld(true);
      const player = new THREE.Vector3();
      this.playerVisual.getWorldPosition(player);
      const projected = player.clone().project(this.camera);
      let enemyVisible = 0;
      let enemyCombatLane = 0;
      const enemyScreenSamples: Array<{ id: string; x: number; y: number; z: number; visible: boolean; worldY: number; localY: number; boundsY: number; relativeY: number; forward: number; lateral: number }> = [];
      for (const enemy of snapshot.enemies) {
        if (!enemy.alive || enemy.kind === "boss") continue;
        const group = this.enemyGroups.get(enemy.id);
        if (!group) continue;
        const world = new THREE.Vector3();
        group.getWorldPosition(world);
        const ndc = world.clone().project(this.camera);
        const visible = ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) < 0.96 && Math.abs(ndc.y) < 0.94;
        if (visible) enemyVisible += 1;
        if (visible && Math.abs(ndc.x) < 0.70 && ndc.y > -0.72 && ndc.y < 0.70) enemyCombatLane += 1;
        if (enemyScreenSamples.length < 8) {
  const boundsCenter = new THREE.Vector3();
  new THREE.Box3().setFromObject(group).getCenter(boundsCenter);
  const dx = world.x - player.x;
  const dz = world.z - player.z;
  enemyScreenSamples.push({
    id: enemy.id,
    x: ndc.x,
    y: ndc.y,
    z: ndc.z,
    visible,
    worldY: world.y,
    localY: group.position.y,
    boundsY: boundsCenter.y,
    relativeY: world.y - player.y,
    forward: dx * forwardX + dz * forwardZ,
    lateral: dx * rightX + dz * rightZ,
  });
}
      }
      return {
        altitude, verticalSpeed, verticalLead,
        altitudeEdgeBlend,
        frameCorrection,
        cameraY: this.camera.position.y,
        playerY: player.y,
        playerNdcY: projected.y,
        fov: this.camera.fov,
        turboBlend: turboCamera,
        releaseAgeSeconds: turbo.releaseAgeSeconds,
        releaseCharge: turbo.releaseCharge,
        shotKick: cameraFx.shotKick,
        hitKick: cameraFx.hitKick,
        shotSerial: weapon.shotSerial,
        hitSerial: weapon.hitSerial,
        enemyVisible,
        enemyCombatLane,
        formationBeat: document.documentElement.dataset.skyRaidFormationBeat ?? "",
        formationPhase: Number(document.documentElement.dataset.skyRaidFormationPhase ?? 0),
        enemyScreenSamples,
        playerVisible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
      };
    };
  }
};

  const canvasPrototype = CartRogueCanvasPreview.prototype as unknown as RaidCanvasDemo;
  const previousDraw = canvasPrototype.draw;
  canvasPrototype.draw = function skyRaidCanvasDraw(this: RaidCanvasDemo): void {
    previousDraw.call(this);
    if (!isSkyRaidMode()) return;
    const hunt = getCartTurboHuntSnapshot(this.session);
    if (!hunt) return;
    const raid = updateRaid(this.session as unknown as RaidSession, hunt, 0);
    const width = this.canvas.clientWidth || this.canvas.width;
    const height = this.canvas.clientHeight || this.canvas.height;
    const color = `#${raid.palette.accent.toString(16).padStart(6, "0")}`;
    this.context.save();
    this.context.strokeStyle = color;
    this.context.globalAlpha = raid.rushActive ? 0.72 : 0.34;
    this.context.lineWidth = Math.max(1.5, width * 0.002);
    for (let index = 0; index < 4; index += 1) {
      const radius = Math.min(width, height) * (0.12 + index * 0.085);
      this.context.beginPath();
      this.context.arc(width * 0.5, height * 0.54, radius, 0, Math.PI * 2);
      this.context.stroke();
    }
    this.context.restore();
  };
}

installSkyDancerSkyRaid();
