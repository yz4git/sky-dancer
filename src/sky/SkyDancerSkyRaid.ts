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
let latestSkyRaidSnapshot: SkyDancerSkyRaidSnapshot | null = null;

export const SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT = "sky-dancer-sky-raid-snapshot";

function isSkyRaidMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
  state.previousKills = hunt.huntKills;

  const orderDelta = Math.max(0, hunt.huntOrdersCompleted - state.previousOrders);
  if (orderDelta > 0) state.score += orderDelta * 450;
  state.previousOrders = hunt.huntOrdersCompleted;

  state.chainTimer = Math.max(0, state.chainTimer - delta);
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
  const geometry = new THREE.BoxGeometry(0.035, 0.035, 5.5);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xc9f7ff, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let index = 0; index < 24; index += 1) {
    const line = new THREE.Mesh(geometry, lineMaterial);
    const column = index % 8;
    const row = Math.floor(index / 8);
    line.position.set(-12 + column * 3.4, 1.5 + row * 2.4, 8 + (index % 6) * 7);
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
  visual.arcadeWorld.update(raid.actId, base.x, base.z, base.heading, resolvedFlight.altitude, raid.elapsedSeconds, delta);

  visual.speedFx.visible = base.boostActive || raid.rushActive;
  visual.speedFx.position.set(base.x, 1.8 + resolvedFlight.altitude, base.z);
  visual.speedFx.rotation.y = base.heading;
  visual.speedFx.children.forEach((line, index) => {
    line.position.z -= delta * (base.boostActive ? 68 : 42);
    if (line.position.z < -8) line.position.z = 30 + (index % 7) * 7;
  });
}

export function installSkyDancerSkyRaid(): void {
  const sessionPrototype = CartArenaSession.prototype as unknown as RaidSession;
  const previousStep = sessionPrototype.step;
  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {
    previousStep.call(this, input, fixedDelta);
    if (!isSkyRaidMode()) return;
    const hunt = getCartTurboHuntSnapshot(this as unknown as CartArenaSession);
    if (!hunt) return;
    const delta = clamp(fixedDelta, 0, 0.05);
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
    cameraFx.hitKick = 1;
  }
  cameraFx.shotKick *= 0.82;
  cameraFx.hitKick *= 0.84;
  const releaseKick = Number.isFinite(turbo.releaseAgeSeconds)
    ? Math.exp(-Math.max(0, turbo.releaseAgeSeconds) * 2.35)
    : 0;
  const turboCamera = snapshot.boostActive
    ? 0.44 + releaseKick * (0.72 + turbo.releaseCharge * 0.30)
    : 0;
  const chaseDistance = 9.6 + Math.min(4.0, speed * 0.085) + turboCamera * 3.9;
  const lookAhead = 6.8 + Math.min(5.2, speed * 0.105) + turboCamera * 5.5;
  const verticalLead = clamp(verticalSpeed * 0.14 + pitch * 4.6, -2.6, 3.0);
  const cameraLift = 4.45 - pitch * 1.25 + clamp(verticalSpeed * 0.045, -0.52, 0.70) + turboCamera * 0.24;
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
  this.camera.lookAt(
    playerPosition.x + forwardX * lookAhead,
    playerPosition.y + 0.92 + verticalLead - cameraFx.hitKick * 0.08,
    playerPosition.z + forwardZ * lookAhead,
  );
  this.camera.rotateZ(bank * (0.085 + turboCamera * 0.018) + hitShake * 0.035);
  const targetFov = clamp(
    cameraFx.baseFov + turboCamera * (6.6 + turbo.releaseCharge * 3.4) + cameraFx.shotKick * 0.35 - cameraFx.hitKick * 0.75,
    50,
    82,
  );
  if (Math.abs(this.camera.fov - targetFov) > 0.01) {
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();
  }
  this.scene.userData.skyRaidCameraVerticalLead = verticalLead;
  this.scene.userData.skyRaidCameraTurboBlend = turboCamera;
  this.scene.userData.skyRaidCameraHitKick = cameraFx.hitKick;
  this.scene.userData.skyRaidCameraShotKick = cameraFx.shotKick;
  this.scene.userData.skyRaidCameraFov = this.camera.fov;
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetCameraPolish = () => {
      this.scene.updateMatrixWorld(true);
      this.camera.updateMatrixWorld(true);
      const player = new THREE.Vector3();
      this.playerVisual.getWorldPosition(player);
      const projected = player.clone().project(this.camera);
      return {
        altitude, verticalSpeed, verticalLead,
        cameraY: this.camera.position.y,
        playerY: player.y,
        fov: this.camera.fov,
        turboBlend: turboCamera,
        releaseAgeSeconds: turbo.releaseAgeSeconds,
        releaseCharge: turbo.releaseCharge,
        shotKick: cameraFx.shotKick,
        hitKick: cameraFx.hitKick,
        shotSerial: weapon.shotSerial,
        hitSerial: weapon.hitSerial,
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
