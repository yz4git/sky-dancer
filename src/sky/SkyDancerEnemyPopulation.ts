import * as THREE from "three";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { CartRogueWebGLDemo } from "../cart/CartRogueWebGLDemo";
import type { RallyInputState } from "../rally/RallyTypes";

interface PopulationSession {
  enemies: CartEnemyState[];
  location: {
    node: {
      id: string;
      rect: { centerX: number; centerZ: number; halfWidth: number; halfDepth: number };
    };
  };
  car: { position: { x: number; z: number } };
  step(input: RallyInputState, fixedDelta?: number): void;
}

interface PopulationState {
  initialized: boolean;
  seenIds: Set<string>;
}

interface PopulationWebGLDemo {
  scene: THREE.Scene;
  session: CartArenaSession;
  updateVisuals(delta: number): void;
}

interface CruiseSpeedState {
  root: THREE.Group;
  material: THREE.MeshBasicMaterial;
}

const PATCHED_KEY = "__skyDancerEnemyPopulationInstalled__";
const CRUISE_FX_PATCHED_KEY = "__skyDancerCruiseSpeedFxInstalled__";
const stateBySession = new WeakMap<object, PopulationState>();
const cruiseSpeedByDemo = new WeakMap<object, CruiseSpeedState>();
const OPENING_MIN_DISTANCE = 32;
const DEFAULT_INITIAL_KEEP_RATIO = 0.5;
const SKY_RAID_INITIAL_KEEP_RATIO = 1;

function isSkyRaidMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stateFor(session: PopulationSession): PopulationState {
  const key = session as unknown as object;
  const current = stateBySession.get(key);
  if (current) return current;
  const created: PopulationState = { initialized: false, seenIds: new Set<string>() };
  stateBySession.set(key, created);
  return created;
}

function openingPriority(enemy: CartEnemyState): number {
  if (enemy.kind === "heavy") return 4;
  if (enemy.archetype === "bomber") return 3;
  if (enemy.archetype === "striker") return 2;
  if (enemy.archetype === "orbiter") return 1;
  if (enemy.archetype === "drifter") return -1;
  if (enemy.kind === "chaser") return -2;
  return 0;
}

function spreadOpeningFormation(session: PopulationSession): void {
  const node = session.location.node;
  const px = session.car.position.x;
  const pz = session.car.position.z;
  const active = session.enemies.filter((enemy) => enemy.nodeId === node.id && enemy.kind !== "boss");
  active.forEach((enemy, index) => {
    const dx = enemy.x - px;
    const dz = enemy.z - pz;
    if (Math.hypot(dx, dz) >= OPENING_MIN_DISTANCE) return;
    const hash = stableHash(enemy.id);
    const angle = ((hash % 3600) / 3600) * Math.PI * 2 + index * 0.72;
    const radius = OPENING_MIN_DISTANCE + 2 + (hash % 7);
    const margin = 3;
    enemy.x = clamp(
      px + Math.sin(angle) * radius,
      node.rect.centerX - node.rect.halfWidth + margin,
      node.rect.centerX + node.rect.halfWidth - margin,
    );
    enemy.z = clamp(
      pz + Math.cos(angle) * radius,
      node.rect.centerZ - node.rect.halfDepth + margin,
      node.rect.centerZ + node.rect.halfDepth - margin,
    );
    enemy.heading = Math.atan2(enemy.x - px, enemy.z - pz) + (index % 2 === 0 ? 0.52 : -0.52);
  });
}

function reduceInitialPopulation(session: PopulationSession, state: PopulationState): void {
  const byNode = new Map<string, CartEnemyState[]>();
  for (const enemy of session.enemies) {
    const list = byNode.get(enemy.nodeId) ?? [];
    list.push(enemy);
    byNode.set(enemy.nodeId, list);
  }

  const keep = new Set<string>();
  const keepRatio = isSkyRaidMode() ? SKY_RAID_INITIAL_KEEP_RATIO : DEFAULT_INITIAL_KEEP_RATIO;
  for (const enemies of byNode.values()) {
    for (const enemy of enemies) state.seenIds.add(enemy.id);
    const bosses = enemies.filter((enemy) => enemy.kind === "boss");
    bosses.forEach((enemy) => keep.add(enemy.id));
    const regular = enemies.filter((enemy) => enemy.kind !== "boss");
    const target = Math.max(1, Math.ceil(regular.length * keepRatio));
    const ranked = [...regular].sort((a, b) => {
      const priorityDelta = openingPriority(a) - openingPriority(b);
      if (priorityDelta !== 0) return priorityDelta;
      return stableHash(a.id) - stableHash(b.id);
    });
    for (let index = 0; index < target; index += 1) keep.add(ranked[index].id);
  }

  for (let index = session.enemies.length - 1; index >= 0; index -= 1) {
    if (!keep.has(session.enemies[index].id)) session.enemies.splice(index, 1);
  }
  spreadOpeningFormation(session);
  state.initialized = true;
}

function reduceNewSpawns(session: PopulationSession, state: PopulationState): void {
  const skyRaid = isSkyRaidMode();
  for (let index = session.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = session.enemies[index];
    if (state.seenIds.has(enemy.id)) continue;
    state.seenIds.add(enemy.id);
    if (enemy.kind === "boss" || skyRaid) continue;
    if ((stableHash(enemy.id) & 1) !== 0) session.enemies.splice(index, 1);
  }
}

function publishPopulationDiagnostics(session: PopulationSession): void {
  if (!isSkyRaidMode() || typeof document === "undefined") return;
  const regular = session.enemies.filter((enemy) => enemy.kind !== "boss");
  const alive = regular.filter((enemy) => enemy.alive).length;
  document.documentElement.dataset.skyRaidPopulationProfile = "arcade-dense";
  document.documentElement.dataset.skyRaidEnemyPool = String(regular.length);
  document.documentElement.dataset.skyRaidEnemyActive = String(alive);
}

function createCruiseSpeedFx(scene: THREE.Scene): CruiseSpeedState {
  const root = new THREE.Group();
  root.name = "sky-raid-cruise-speed-fx";
  root.renderOrder = 4;
  const geometry = new THREE.BoxGeometry(0.022, 0.022, 3.8);
  const material = new THREE.MeshBasicMaterial({
    color: 0xd7f8ff,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (let index = 0; index < 16; index += 1) {
    const line = new THREE.Mesh(geometry, material);
    const xBand = ((index * 37) % 17) - 8;
    const yBand = ((index * 19) % 9) - 4;
    line.position.set(xBand * 1.08, yBand * 0.58, 12 + (index % 8) * 5.2);
    line.frustumCulled = false;
    root.add(line);
  }
  scene.add(root);
  scene.userData.skyRaidCruiseSpeedFx = true;
  return { root, material };
}

function cruiseSpeedStateFor(demo: PopulationWebGLDemo): CruiseSpeedState {
  const key = demo as unknown as object;
  const current = cruiseSpeedByDemo.get(key);
  if (current) return current;
  const created = createCruiseSpeedFx(demo.scene);
  cruiseSpeedByDemo.set(key, created);
  return created;
}

function updateCruiseSpeedFx(demo: PopulationWebGLDemo, delta: number): void {
  const current = cruiseSpeedByDemo.get(demo as unknown as object);
  if (!isSkyRaidMode()) {
    if (current) current.root.visible = false;
    return;
  }

  const state = current ?? cruiseSpeedStateFor(demo);
  const snapshot = demo.session.snapshot();
  const inheritedSpeedFx = demo.scene.getObjectByName("sky-raid-speed-fx");
  const inheritedSpeedFxActive = inheritedSpeedFx?.visible === true;
  state.root.visible = !snapshot.boostActive && !inheritedSpeedFxActive;
  const altitude = (demo.session as unknown as { skyDancerPlayerAltitudeMeters?: number }).skyDancerPlayerAltitudeMeters ?? 0;
  state.root.position.set(snapshot.x, 1.8 + altitude, snapshot.z);
  state.root.rotation.y = snapshot.heading;
  state.material.opacity = 0.14;
  if (!state.root.visible) return;

  state.root.children.forEach((line, index) => {
    line.position.z -= delta * 27;
    if (line.position.z < -7) line.position.z = 31 + (index % 8) * 5.2;
  });
}

export function installSkyDancerEnemyPopulation(): void {
  const prototype = CartArenaSession.prototype as unknown as PopulationSession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerEnemyPopulationStep(input: RallyInputState, fixedDelta?: number): void {
    const session = this as unknown as PopulationSession;
    const state = stateFor(session);
    if (!state.initialized) reduceInitialPopulation(session, state);
    else reduceNewSpawns(session, state);
    previous.call(this, input, fixedDelta);
    publishPopulationDiagnostics(session);
  };
}

export function installSkyDancerCruiseSpeedFx(): void {
  const prototype = CartRogueWebGLDemo.prototype as unknown as PopulationWebGLDemo & Record<string, unknown>;
  if (prototype[CRUISE_FX_PATCHED_KEY]) return;
  prototype[CRUISE_FX_PATCHED_KEY] = true;
  const previous = prototype.updateVisuals;

  prototype.updateVisuals = function skyDancerCruiseSpeedFxUpdate(delta: number): void {
    const demo = this as unknown as PopulationWebGLDemo;
    previous.call(this, delta);
    updateCruiseSpeedFx(demo, delta);
  };
}

installSkyDancerEnemyPopulation();
installSkyDancerCruiseSpeedFx();
