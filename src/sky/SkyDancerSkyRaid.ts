import * as THREE from "three";
import { CartArenaSession } from "../cart/CartArenaSession";
import type { CartEnemyState } from "../cart/CartCombat";
import { CartRogueCanvasPreview } from "../cart/CartRogueCanvasPreview";
import { CartRogueWebGLDemo } from "../cart/CartRogueWebGLDemo";
import {
  enableCartTurboHunt,
  forceCartTurboHuntBoss,
  getCartTurboHuntSnapshot,
  setCartTurboHuntActiveTargetCountResolver,
  setCartTurboHuntExternalProgressionEnabled,
  setCartTurboHuntSpawnPreference,
  type CartTurboHuntSnapshot,
} from "../cart/CartRoguePhase67TurboHunt";
import {
  SKY_DANCER_SKY_RAID_ACTS,
  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,
  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,
  SKY_DANCER_SKY_RAID_TARGET_SECONDS,
  skyDancerSkyRaidActBreakEligible,
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidActSeconds,
  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidKillScore,
  skyDancerSkyRaidMultiplier,
  skyDancerSkyRaidPressure,
  skyDancerSkyRaidRushActive,
  skyDancerSkyRaidWorldStyle,
  type SkyDancerSkyRaidAct,
  type SkyDancerSkyRaidCombatBeat,
  type SkyDancerSkyRaidPalette,
} from "./SkyDancerSkyRaidRules";
import type { RallyInputState } from "../rally/RallyTypes";
import { SkyDancerSkyRaidFlightController, type SkyDancerSkyRaidFlightSnapshot } from "./SkyDancerSkyRaidFlight";
import { SkyDancerSkyRaidArcadeWorld } from "./SkyDancerSkyRaidArcadeWorld";
import {
  setSkyDancerSkyRaidEnemyDoctrineElapsed,
  skyDancerSkyRaidEnemyClassFor,
  skyDancerSkyRaidSpawnPreference,
} from "./SkyDancerSkyRaidEnemyDoctrine";
import { getSkyDancerTurboState } from "./SkyDancerTurboModel";
import { getSkyDancerEnemyAttackTelegraphs, type SkyDancerEnemyAttackTelegraphSnapshot } from "./SkyDancerFlightCombat";
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
  location: { node: { id: string } };
  car: {
    position: { x: number; z: number };
    heading: number;
    speed: number;
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
  enemyRosterActIndex: number;
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
  speedMaterial: THREE.MeshBasicMaterial;
  speedColor: THREE.Color;
  attackTelegraphs: Map<string, SkyDancerEnemyAttackTelegraphSnapshot>;
  turboBackdrop: THREE.Object3D | null;
  arcadeWorld: SkyDancerSkyRaidArcadeWorld;
  legacyLayers: THREE.Object3D[];
  lastActIndex: number;
  anchorX: number;
  anchorZ: number;
  anchorHeading: number;
  lastTurboReleaseSerial: number;
  turboReleaseVisual: number;
}

interface RaidCameraFxState {
  baseFov: number;
  lastShotSerial: number;
  lastHitSerial: number;
  shotKick: number;
  hitKick: number;
}

interface RaidScreenCandidate {
  enemy: CartEnemyState | null;
  group: THREE.Group | null;
  penalty: number;
}

interface RaidScreenEngagementState {
  nextAllowedAt: number;
  lastAssistAt: number;
  cursor: number;
  recycles: number;
  projection: THREE.Vector3;
  candidates: [RaidScreenCandidate, RaidScreenCandidate, RaidScreenCandidate];
}

interface RaidEnemyEntryState {
  previousAlive: Map<string, boolean>;
  serial: number;
  staged: number;
}

const raidStateBySession = new WeakMap<object, RaidState>();
const raidVisualByDemo = new WeakMap<object, RaidVisualState>();
const raidFlightByDemo = new WeakMap<object, SkyDancerSkyRaidFlightController>();
const raidCameraFxByDemo = new WeakMap<object, RaidCameraFxState>();
const raidEngagementBySession = new WeakMap<object, { cooldown: number; cursor: number; lastBeat: SkyRaidFormationBeat; beatAge: number }>();
const raidScreenEngagementByDemo = new WeakMap<object, RaidScreenEngagementState>();
const raidEnemyEntryBySession = new WeakMap<object, RaidEnemyEntryState>();
const raidInputBySession = new WeakMap<object, RallyInputState>();
const raidRoleKitByEnemyGroup = new WeakMap<THREE.Group, THREE.Group>();
const raidAttackTelegraphObjectsByKit = new WeakMap<THREE.Group, readonly THREE.Object3D[]>();
const skyRaidCameraPlayerPosition = new THREE.Vector3();
const skyRaidCameraProjection = new THREE.Vector3();
let latestSkyRaidSnapshot: SkyDancerSkyRaidSnapshot | null = null;

export const SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT = "sky-dancer-sky-raid-snapshot";
export const SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0.46;

export function skyDancerSkyRaidSteerInput(value: number): number {
  // The inherited Cart controller aggressively quickens steering after this
  // point. Keep fine stick movement unchanged, but cap large deflections so
  // the aircraft cannot snap-turn on a phone-sized virtual stick.
  return clamp(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT);
}

function skyRaidInputFor(session: RaidSession, input: RallyInputState): RallyInputState {
  const key = session as unknown as object;
  let scratch = raidInputBySession.get(key);
  if (!scratch) {
    scratch = { throttle: 0, brake: 0, steer: skyDancerSkyRaidSteerInput(input.steer), strafe: 0, boost: false };
    raidInputBySession.set(key, scratch);
  }
  scratch.throttle = input.throttle;
  scratch.brake = input.brake;
  scratch.steer = skyDancerSkyRaidSteerInput(input.steer);
  scratch.strafe = input.strafe;
  scratch.boost = input.boost;
  return scratch;
}

function isSkyRaidMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const SKY_RAID_ENEMY_VISUAL_ASSIST_MIN = 1.03;
const SKY_RAID_ENEMY_VISUAL_ASSIST_MAX = 1.20;

/**
 * Phone screens make a physically-sized fighter at 40-58m read smaller than the
 * targeting UI. SKY RAID applies a restrained presentation-only silhouette assist
 * to normal enemies. Simulation positions, radii, hitboxes and missile math stay
 * untouched; close aircraft remain almost exactly authored size.
 */
function applySkyRaidEnemySilhouetteAssist(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  const playerAltitude = Number(demo.scene.userData.skyRaidPlayerAltitude ?? 20);
  for (const enemy of snapshot.enemies) {
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    if (!Number.isFinite(Number(group.userData.skyRaidBaseScaleX))) {
      group.userData.skyRaidBaseScaleX = group.scale.x;
      group.userData.skyRaidBaseScaleY = group.scale.y;
      group.userData.skyRaidBaseScaleZ = group.scale.z;
    }
    const baseX = Number(group.userData.skyRaidBaseScaleX ?? 1);
    const baseY = Number(group.userData.skyRaidBaseScaleY ?? 1);
    const baseZ = Number(group.userData.skyRaidBaseScaleZ ?? 1);
    if (!enemy.alive || enemy.kind === "boss") {
      group.scale.set(baseX, baseY, baseZ);
      group.userData.skyRaidVisualAssistScale = 1;
      continue;
    }
    const dx = enemy.x - snapshot.x;
    const dz = enemy.z - snapshot.z;
    const dy = getSkyDancerEnemyAltitudeMetersV43(enemy) - playerAltitude;
    const distance = Math.hypot(dx, dy, dz);
    const distanceBlend = clamp((distance - 18) / 40, 0, 1);
    const assist = SKY_RAID_ENEMY_VISUAL_ASSIST_MIN
      + distanceBlend * (SKY_RAID_ENEMY_VISUAL_ASSIST_MAX - SKY_RAID_ENEMY_VISUAL_ASSIST_MIN);
    group.scale.set(baseX * assist, baseY * assist, baseZ * assist);
    group.userData.skyRaidVisualAssistScale = assist;
  }
}

function restoreSkyRaidEnemySilhouetteAssist(demo: RaidWebGLDemo): void {
  for (const group of demo.enemyGroups.values()) {
    if (!Number.isFinite(Number(group.userData.skyRaidBaseScaleX))) continue;
    group.scale.set(
      Number(group.userData.skyRaidBaseScaleX ?? 1),
      Number(group.userData.skyRaidBaseScaleY ?? 1),
      Number(group.userData.skyRaidBaseScaleZ ?? 1),
    );
    group.userData.skyRaidVisualAssistScale = 1;
  }
}

const SKY_RAID_ROLE_KIT_NAME = "sky-raid-enemy-role-kit";
const SKY_RAID_ROLE_TRAIL_NAME = "sky-raid-enemy-role-trail";
const SKY_RAID_ATTACK_TELEGRAPH_NAME = "sky-raid-enemy-attack-telegraph";

function skyRaidRoleKitColor(className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>): number {
  switch (className) {
    case "striker": return 0xffa24a;
    case "orbiter": return 0x61e7ff;
    case "drifter": return 0xc59cff;
    case "bomber": return 0xffd15e;
    case "heavy": return 0xff6f75;
    case "standard": return 0x9deaff;
  }
}

function skyRaidRoleTrailProfile(
  className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>,
): { signature: string; offsets: readonly number[]; length: number; radius: number; opacity: number } {
  switch (className) {
    case "striker": return { signature: "orange-lance", offsets: [-0.34, 0.34], length: 1.05, radius: 0.09, opacity: 0.45 };
    case "orbiter": return { signature: "cyan-twin", offsets: [-0.58, 0.58], length: 0.72, radius: 0.075, opacity: 0.34 };
    case "drifter": return { signature: "violet-wide", offsets: [-0.52, 0.52], length: 0.64, radius: 0.07, opacity: 0.30 };
    case "bomber": return { signature: "gold-twin", offsets: [-0.72, 0.72], length: 0.92, radius: 0.11, opacity: 0.42 };
    case "heavy": return { signature: "red-thrust", offsets: [-0.46, 0.46], length: 0.58, radius: 0.13, opacity: 0.48 };
    case "standard": return { signature: "cyan-short", offsets: [0], length: 0.52, radius: 0.07, opacity: 0.30 };
  }
}

function buildSkyRaidEnemyRoleKit(
  className: ReturnType<typeof skyDancerSkyRaidEnemyClassFor>,
): THREE.Group {
  const root = new THREE.Group();
  root.name = SKY_RAID_ROLE_KIT_NAME;
  root.userData.skyRaidRoleClass = className;
  const color = skyRaidRoleKitColor(className);
  const armorMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.16,
    roughness: 0.42,
    metalness: 0.22,
    flatShading: true,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    toneMapped: false,
  });
  const addBox = (
    size: [number, number, number],
    position: [number, number, number],
    rotationY = 0,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), armorMaterial.clone());
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    root.add(mesh);
    return mesh;
  };
  const addBeacon = (position: [number, number, number], scale = 0.11): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(scale, 0), glowMaterial.clone());
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  };

  switch (className) {
    case "standard":
      root.userData.skyRaidRoleSignature = "dorsal-spine";
      addBox([0.16, 0.24, 0.88], [0, 0.48, 0.08]);
      break;
    case "striker":
      root.userData.skyRaidRoleSignature = "swept-fangs";
      addBox([0.15, 0.10, 1.02], [-0.82, 0.28, 0.02], 0.52);
      addBox([0.15, 0.10, 1.02], [0.82, 0.28, 0.02], -0.52);
      addBeacon([0, 0.54, 0.72], 0.13);
      break;
    case "orbiter":
      root.userData.skyRaidRoleSignature = "twin-tail";
      addBox([0.11, 0.62, 0.72], [-0.56, 0.52, -0.08], 0.12);
      addBox([0.11, 0.62, 0.72], [0.56, 0.52, -0.08], -0.12);
      addBeacon([-1.05, 0.26, 0.08], 0.10);
      addBeacon([1.05, 0.26, 0.08], 0.10);
      break;
    case "drifter":
      root.userData.skyRaidRoleSignature = "wide-canards";
      addBox([2.34, 0.07, 0.24], [0, 0.18, 0.62]);
      addBox([0.74, 0.08, 0.48], [-0.74, 0.24, -0.46], -0.26);
      addBox([0.74, 0.08, 0.48], [0.74, 0.24, -0.46], 0.26);
      break;
    case "bomber": {
      root.userData.skyRaidRoleSignature = "twin-pods";
      for (const side of [-1, 1] as const) {
        const pod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 1.08, 7),
          armorMaterial.clone(),
        );
        pod.rotation.x = Math.PI / 2;
        pod.position.set(side * 0.74, 0.18, -0.12);
        root.add(pod);
      }
      addBox([1.92, 0.12, 0.34], [0, 0.38, -0.24]);
      addBeacon([0, 0.60, -0.36], 0.12);
      break;
    }
    case "heavy":
      root.userData.skyRaidRoleSignature = "armor-shoulders";
      addBox([0.72, 0.38, 1.48], [0, 0.42, -0.02]);
      addBox([0.82, 0.20, 0.68], [-0.94, 0.28, -0.08], -0.08);
      addBox([0.82, 0.20, 0.68], [0.94, 0.28, -0.08], 0.08);
      addBeacon([0, 0.72, 0.36], 0.14);
      break;
  }

  if (className === "striker") {
    const diveMarker = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.82, 3, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    diveMarker.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;
    diveMarker.userData.skyRaidAttackTelegraphCue = "striker-dive";
    diveMarker.rotation.x = Math.PI / 2;
    diveMarker.position.set(0, 0.30, 1.30);
    diveMarker.visible = false;
    root.add(diveMarker);
  } else if (className === "bomber") {
    for (const side of [-1, 1] as const) {
      const podGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      podGlow.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;
      podGlow.userData.skyRaidAttackTelegraphCue = "bomber-salvo";
      podGlow.position.set(side * 0.74, 0.18, 0.44);
      podGlow.visible = false;
      root.add(podGlow);
    }
  } else if (className === "heavy") {
    const coreGlow = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    coreGlow.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;
    coreGlow.userData.skyRaidAttackTelegraphCue = "heavy-charge";
    coreGlow.position.set(0, 0.48, 0.92);
    coreGlow.visible = false;
    root.add(coreGlow);
    const chargeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.035, 5, 18),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    chargeRing.name = SKY_RAID_ATTACK_TELEGRAPH_NAME;
    chargeRing.userData.skyRaidAttackTelegraphCue = "heavy-charge";
    chargeRing.position.set(0, 0.48, 0.95);
    chargeRing.visible = false;
    root.add(chargeRing);
  }

  const trailProfile = skyRaidRoleTrailProfile(className);
  root.userData.skyRaidRoleTrailSignature = trailProfile.signature;
  for (const offset of trailProfile.offsets) {
    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(trailProfile.radius, trailProfile.length, 7, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: trailProfile.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    trail.name = SKY_RAID_ROLE_TRAIL_NAME;
    trail.rotation.x = -Math.PI / 2;
    trail.position.set(offset, 0.20, -0.72 - trailProfile.length * 0.46);
    trail.renderOrder = 1010;
    root.add(trail);
  }

  const attackTelegraphObjects = root.children.filter((child) => child.name === SKY_RAID_ATTACK_TELEGRAPH_NAME);
  root.userData.skyRaidAttackTelegraphCount = attackTelegraphObjects.length;
  raidAttackTelegraphObjectsByKit.set(root, attackTelegraphObjects);
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false;
      object.receiveShadow = false;
      object.renderOrder = 1012;
    }
  });
  return root;
}

function applySkyRaidAttackTelegraphVisual(
  kit: THREE.Group,
  telegraph: SkyDancerEnemyAttackTelegraphSnapshot | null,
  pulseClock: number,
): void {
  const objects = raidAttackTelegraphObjectsByKit.get(kit) ?? [];
  const active = Boolean(telegraph) && objects.length > 0;
  const intensity = telegraph?.intensity ?? 0;
  const pulse = active ? 0.72 + Math.sin(pulseClock * 19 + intensity * 3.4) * 0.28 : 0;
  for (const object of objects) {
    object.visible = active;
    const scale = active ? 0.82 + intensity * 0.46 + pulse * 0.12 : 1;
    object.scale.setScalar(scale);
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
      object.material.opacity = active ? clamp(0.18 + intensity * 0.62 + pulse * 0.12, 0, 0.96) : 0;
    }
  }
  kit.userData.skyRaidAttackTelegraphCue = telegraph?.cue ?? "";
  kit.userData.skyRaidAttackTelegraphIntensity = intensity;
  kit.userData.skyRaidAttackTelegraphVisible = active;
  kit.userData.skyRaidAttackTelegraphSeconds = telegraph?.secondsToReady ?? 0;
}

function applySkyRaidEnemyRoleReadability(
  demo: RaidWebGLDemo,
  snapshot: ReturnType<CartArenaSession["snapshot"]>,
): void {
  // Preserve the V25 presentation contract while the production hot path reads
  // authoritative enemy objects directly. Snapshot is retained for webdriver
  // diagnostics/source compatibility and carries no extra lookup work here.
  void snapshot;
  const visual = raidVisualByDemo.get(demo as unknown as object);
  if (!visual) return;
  const attackTelegraphs = visual.attackTelegraphs;
  attackTelegraphs.clear();
  for (const telegraph of getSkyDancerEnemyAttackTelegraphs(demo.session)) {
    attackTelegraphs.set(telegraph.enemyId, telegraph);
  }
  const pulseClock = typeof performance !== "undefined" ? performance.now() * 0.001 : 0;
  for (const enemyState of demo.session.enemies) {
    const group = demo.enemyGroups.get(enemyState.id);
    if (!group || enemyState.kind === "boss") continue;
    const roleClass = skyDancerSkyRaidEnemyClassFor(enemyState);
    let kit = raidRoleKitByEnemyGroup.get(group);
    if (!kit || kit.userData.skyRaidRoleClass !== roleClass) {
      if (kit) group.remove(kit);
      kit = buildSkyRaidEnemyRoleKit(roleClass);
      group.add(kit);
      raidRoleKitByEnemyGroup.set(group, kit);
    }
    kit.visible = enemyState.alive;
    group.userData.skyRaidRoleClass = roleClass;
    group.userData.skyRaidRoleSignature = kit.userData.skyRaidRoleSignature;
    const attackTelegraph = attackTelegraphs.get(enemyState.id) ?? null;
    applySkyRaidAttackTelegraphVisual(kit, attackTelegraph, pulseClock);
    group.userData.skyRaidAttackTelegraphCue = attackTelegraph?.cue ?? "";
  }

  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetRoleReadability = () => {
      const roles = demo.session.enemies
        .filter((enemy) => enemy.alive && enemy.kind !== "boss")
        .map((enemy) => {
          const group = demo.enemyGroups.get(enemy.id);
          const kit = group ? raidRoleKitByEnemyGroup.get(group) : undefined;
          return {
            id: enemy.id,
            roleClass: skyDancerSkyRaidEnemyClassFor(enemy),
            roleSignature: String(kit?.userData.skyRaidRoleSignature ?? ""),
            trailSignature: String(kit?.userData.skyRaidRoleTrailSignature ?? ""),
            trailCount: kit?.children.filter((child) => child.name === SKY_RAID_ROLE_TRAIL_NAME).length ?? 0,
            trailVisible: kit?.children.filter((child) => child.name === SKY_RAID_ROLE_TRAIL_NAME).every((child) => child.visible) ?? false,
            kitVisible: kit?.visible === true,
            kitChildren: kit?.children.length ?? 0,
            attackCue: String(kit?.userData.skyRaidAttackTelegraphCue ?? ""),
            attackIntensity: Number(kit?.userData.skyRaidAttackTelegraphIntensity ?? 0),
            attackVisible: kit?.userData.skyRaidAttackTelegraphVisible === true,
            attackSeconds: Number(kit?.userData.skyRaidAttackTelegraphSeconds ?? 0),
          };
        });
      return {
        activeCount: roles.length,
        roles,
      };
    };
  }
}

type SkyRaidFormationBeat = SkyDancerSkyRaidCombatBeat;

type SkyRaidFormationSlot = { lateral: number; forward: number };

function skyRaidFormationPattern(elapsedSeconds: number): {
  beat: SkyRaidFormationBeat;
  progress: number;
  slots: readonly SkyRaidFormationSlot[];
  doctrine: string;
  actId: SkyDancerSkyRaidAct["id"];
  targetCount: number;
  correctionSpeed: number;
} {
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  const profile = skyDancerSkyRaidCombatProfile(act.id);
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  const rush = skyDancerSkyRaidRushActive(elapsedSeconds, act);
  // Ten beats fill the authored Act duration. Opening Acts are 120 s while
  // the mature later acts remain 90 s, so formation grammar stretches with the
  // stage instead of silently finishing its sentence early.
  const beatSeconds = Math.max(1, (act.endSeconds - act.startSeconds) / 10);
  const beatOrdinal = Math.max(0, Math.floor(local / beatSeconds));
  const phaseIndex = (beatOrdinal % profile.beats.length) as 0 | 1 | 2 | 3 | 4;
  const beatLocal = local - beatOrdinal * beatSeconds;
  const progress = clamp(beatLocal / beatSeconds, 0, 1);
  const cycleIndex = Math.floor(beatOrdinal / profile.beats.length);
  const mirror = (act.index + cycleIndex) % 2 === 0 ? 1 : -1;

  const beat = profile.beats[phaseIndex];
  const slot = (lateral: number, forward: number): SkyRaidFormationSlot => ({
    lateral: lateral * profile.lateralScale,
    forward: forward + profile.forwardBias,
  });
  let slots: readonly SkyRaidFormationSlot[];
  switch (beat) {
    case "spearhead": {
      const wing = 5.5 + progress * 2.5;
      slots = [
        slot(0, 23),
        slot(-wing * mirror, 29),
        slot(wing * mirror, 29),
        slot(-13 * mirror, 38),
        slot(13 * mirror, 38),
      ];
      break;
    }
    case "pincer": {
      const flank = 15 - progress * 7;
      slots = [
        slot(-flank * mirror, 23),
        slot(flank * mirror, 25),
        slot(-(9 - progress * 4) * mirror, 32),
        slot((9 - progress * 4) * mirror, 34),
        slot(0, 41),
      ];
      break;
    }
    case "regroup":
      slots = [
        slot(-10 * mirror, 29),
        slot(10 * mirror, 29),
        slot(0, 34),
        slot(-15 * mirror, 42),
        slot(15 * mirror, 42),
      ];
      break;
    case "crossfire": {
      const sweep = 13 - progress * 24;
      slots = [
        slot(sweep * mirror, 23),
        slot(-sweep * mirror, 28),
        slot(sweep * 0.58 * mirror, 35),
        slot(-sweep * 0.58 * mirror, 39),
        slot(0, 45),
      ];
      break;
    }
    case "breakaway":
      slots = [
        slot(-16 * mirror, 33),
        slot(16 * mirror, 33),
        slot(-8 * mirror, 40),
        slot(8 * mirror, 40),
        slot(0, 48),
      ];
      break;
  }

  return {
    beat,
    progress,
    slots,
    doctrine: profile.doctrine,
    actId: act.id,
    targetCount: rush ? profile.rushTargetCount : profile.baseTargetCount,
    correctionSpeed: rush ? profile.rushCorrectionSpeed : profile.correctionSpeed,
  };
}

/**
 * V19 authored attack rhythm. Existing AI keeps speed, weapons and avoidance.
 * Already-visible enemies receive only bounded continuous corrections; only
 * old offscreen candidates may still be recycled by the established safety net.
 */
function maintainSkyRaidEnemyPresence(session: CartArenaSession, delta: number, elapsedSeconds: number): void {
  const runtime = session as unknown as RaidSession;
  const nodeId = runtime.location.node.id;
  const playerX = runtime.car.position.x;
  const playerZ = runtime.car.position.z;
  const playerHeading = runtime.car.heading;
  const live = session.enemies.filter(
    (enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === nodeId,
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
    document.documentElement.dataset.skyRaidCombatDoctrine = pattern.doctrine;
    document.documentElement.dataset.skyRaidFormationAct = pattern.actId;
  }

  const forwardX = Math.sin(playerHeading);
  const forwardZ = Math.cos(playerHeading);
  const rightX = Math.cos(playerHeading);
  const rightZ = -Math.sin(playerHeading);
  const local = (enemy: (typeof live)[number]) => {
    const dx = enemy.x - playerX;
    const dz = enemy.z - playerZ;
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
    const aimX = playerX + forwardX * 7 + rightX * slot.lateral * 0.14;
    const aimZ = playerZ + forwardZ * 7 + rightZ * slot.lateral * 0.14;
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
  const approachSpeed = pattern.correctionSpeed * 1.65;
  for (let index = 0; index < needed; index += 1) {
    const target = candidates[index].enemy;
    const slot = pattern.slots[(state.cursor + engaged.length + index) % pattern.slots.length];
    const desiredX = playerX + forwardX * slot.forward + rightX * slot.lateral;
    const desiredZ = playerZ + forwardZ * slot.forward + rightZ * slot.lateral;
    const dx = desiredX - target.x;
    const dz = desiredZ - target.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      const step = Math.min(distance, approachSpeed * delta);
      target.x += dx / distance * step;
      target.z += dz / distance * step;
    }
    const desiredHeading = Math.atan2(playerX - target.x, playerZ - target.z);
    const turnError = Math.atan2(Math.sin(desiredHeading - target.heading), Math.cos(desiredHeading - target.heading));
    target.heading += clamp(turnError, -delta * 1.05, delta * 1.05);
  }
  state.cursor = (state.cursor + needed) % pattern.slots.length;
  state.cooldown = needed > 0 ? 0.12 : 0.18;
}


function skyRaidScreenSlotsFor(elapsedSeconds: number): readonly SkyRaidFormationSlot[] {
  // Preserve the doctrine ownership boundary without allocating a mapped slot
  // array every render frame. Phone-safe clamping happens only for slots that
  // are actually recycled onto screen.
  return skyRaidFormationPattern(elapsedSeconds).slots;
}

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
  const key = demo as unknown as object;
  let state = raidScreenEngagementByDemo.get(key);
  if (!state) {
    state = {
      nextAllowedAt: 0,
      lastAssistAt: 0,
      cursor: 0,
      recycles: 0,
      projection: new THREE.Vector3(),
      candidates: [
        { enemy: null, group: null, penalty: -Infinity },
        { enemy: null, group: null, penalty: -Infinity },
        { enemy: null, group: null, penalty: -Infinity },
      ],
    };
    raidScreenEngagementByDemo.set(key, state);
  }

  for (const candidate of state.candidates) {
    candidate.enemy = null;
    candidate.group = null;
    candidate.penalty = -Infinity;
  }

  demo.camera.updateMatrixWorld(true);
  let liveCount = 0;
  let visibleCount = 0;
  let candidateCount = 0;
  for (const enemy of demo.session.enemies) {
    if (!enemy.alive || enemy.kind === "boss" || enemy.nodeId !== snapshot.nodeId) continue;
    liveCount += 1;
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    group.getWorldPosition(state.projection);
    state.projection.project(demo.camera);
    const visible = state.projection.z > -1 && state.projection.z < 1
      && Math.abs(state.projection.x) < 0.96 && Math.abs(state.projection.y) < 0.94;
    if (visible) {
      visibleCount += 1;
      continue;
    }
    candidateCount += 1;
    const penalty = Math.abs(state.projection.x) + Math.abs(state.projection.y) + Math.abs(state.projection.z) * 0.12;
    let insertAt = 0;
    while (insertAt < state.candidates.length && state.candidates[insertAt].enemy && penalty <= state.candidates[insertAt].penalty) {
      insertAt += 1;
    }
    if (insertAt >= state.candidates.length) continue;
    for (let index = state.candidates.length - 1; index > insertAt; index -= 1) {
      const target = state.candidates[index];
      const previous = state.candidates[index - 1];
      target.enemy = previous.enemy;
      target.group = previous.group;
      target.penalty = previous.penalty;
    }
    const target = state.candidates[insertAt];
    target.enemy = enemy;
    target.group = group;
    target.penalty = penalty;
  }
  if (liveCount < 2) return;

  demo.scene.userData.skyRaidScreenPresenceVisible = visibleCount;
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
  if (visibleCount >= 3) {
    state.nextAllowedAt = 0;
    return;
  }

  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  const assistDelta = state.lastAssistAt > 0 ? clamp(now - state.lastAssistAt, 0, 0.05) : 1 / 60;
  state.lastAssistAt = now;
  if (now < state.nextAllowedAt) return;

  const screenSlots = skyRaidScreenSlotsFor(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);
  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const needed = Math.min(3 - visibleCount, candidateCount, state.candidates.length);
  for (let index = 0; index < needed; index += 1) {
    const sample = state.candidates[index];
    if (!sample.enemy || !sample.group) continue;
    const authoredSlot = screenSlots[(state.cursor + index) % screenSlots.length];
    const lateral = clamp(authoredSlot.lateral * 0.92, -15, 15);
    const forward = clamp(authoredSlot.forward, 30, 48);
    const desiredX = snapshot.x + forwardX * forward + rightX * lateral;
    const desiredZ = snapshot.z + forwardZ * forward + rightZ * lateral;
    const dx = desiredX - sample.enemy.x;
    const dz = desiredZ - sample.enemy.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      const step = Math.min(distance, 10 * assistDelta);
      sample.enemy.x += dx / distance * step;
      sample.enemy.z += dz / distance * step;
    }
    const desiredHeading = Math.atan2(snapshot.x - sample.enemy.x, snapshot.z - sample.enemy.z);
    const turnError = Math.atan2(
      Math.sin(desiredHeading - sample.enemy.heading),
      Math.cos(desiredHeading - sample.enemy.heading),
    );
    sample.enemy.heading += clamp(turnError, -assistDelta * 0.85, assistDelta * 0.85);
    state.recycles += 1;
  }
  state.cursor = (state.cursor + needed) % screenSlots.length;
  state.nextAllowedAt = now + (needed > 0 ? 0.05 : 0.12);
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
}


function stageSkyRaidNaturalEnemyEntries(session: CartArenaSession): void {
  const runtime = session as unknown as RaidSession;
  const key = session as unknown as object;
  let state = raidEnemyEntryBySession.get(key);
  if (!state) {
    state = { previousAlive: new Map(), serial: 0, staged: 0 };
    raidEnemyEntryBySession.set(key, state);
  }
  const playerX = runtime.car.position.x;
  const playerZ = runtime.car.position.z;
  const heading = runtime.car.heading;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  for (const enemy of session.enemies) {
    const wasAlive = state.previousAlive.get(enemy.id) ?? false;
    if (enemy.alive && !wasAlive && enemy.kind !== "boss") {
      const ordinal = state.serial++;
      const side = ordinal % 2 === 0 ? -1 : 1;
      const band = Math.floor(ordinal / 2) % 3;
      const forward = 62 + band * 7;
      const lateral = side * (22 + band * 4);
      enemy.x = playerX + forwardX * forward + rightX * lateral;
      enemy.z = playerZ + forwardZ * forward + rightZ * lateral;
      enemy.heading = Math.atan2(playerX - enemy.x, playerZ - enemy.z);
      enemy.aiClock = 0;
      enemy.chargeTime = 0;
      state.staged += 1;
    }
    state.previousAlive.set(enemy.id, enemy.alive);
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.skyRaidNaturalEntries = String(state.staged);
  }
}

function publishSkyRaidWorldStyle(snapshot: SkyDancerSkyRaidSnapshot): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const worldStyle = skyDancerSkyRaidWorldStyle(snapshot.actId);
  if (root.dataset.skyRaidAct !== snapshot.actId) root.dataset.skyRaidAct = snapshot.actId;
  if (root.dataset.skyRaidWorldStyle !== worldStyle) root.dataset.skyRaidWorldStyle = worldStyle;
}

function publishSkyRaidEnemyDoctrineDiagnostics(
  session: CartArenaSession,
  elapsedSeconds: number,
): void {
  if (typeof document === "undefined") return;
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  const doctrine = skyDancerSkyRaidEnemyDoctrine(act.id);
  const liveClasses = session.enemies
    .filter((enemy) => enemy.alive && enemy.kind !== "boss")
    .map((enemy) => skyDancerSkyRaidEnemyClassFor(enemy))
    .sort();
  document.documentElement.dataset.skyRaidEnemyPackage = doctrine.package;
  document.documentElement.dataset.skyRaidEnemyAttackStyle = doctrine.attackStyle;
  document.documentElement.dataset.skyRaidEnemyClasses = liveClasses.join(",");
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
  const car = demo.session.car;
  const flight = flightControllerFor(demo).step(delta, car.heading, demo.steer, car.boostActive);
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
  // The authoritative session already owns the same enemy state. Iterating it
  // directly avoids allocating another full snapshot plus an O(n²) id search on
  // every presentation pass while preserving the exact altitude result.
  for (const enemy of demo.session.enemies) {
    if (!enemy.alive) continue;
    const group = demo.enemyGroups.get(enemy.id);
    if (!group) continue;
    group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(enemy);
  }
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
    enemyRosterActIndex: -1,
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
    state.chainTimer = SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS;
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
  if (skyDancerSkyRaidActBreakEligible(hunt.huntElapsedSeconds, act, state.actKills)) rewardActBreak(session, state, act);

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
    state.score += 5000 + Math.round(Math.max(0, SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt.huntElapsedSeconds) * 80);
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
  const speedMaterial = (speedFx.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  demo.scene.add(root, speedFx);
  const arcadeWorld = new SkyDancerSkyRaidArcadeWorld(demo.scene);
  const legacyLayers = collectLegacyRaidLayers(demo.scene);
  const turboBackdrop = demo.scene.getObjectByName("phase67-turbo-hunt-world");
  root.visible = false;
  raidVisualByDemo.set(demo as unknown as object, {
    root,
    actGroups,
    speedFx,
    speedMaterial,
    speedColor: new THREE.Color(SKY_DANCER_SKY_RAID_ACTS[0].palette.accent),
    attackTelegraphs: new Map(),
    turboBackdrop,
    arcadeWorld,
    legacyLayers,
    lastActIndex: -1,
    anchorX: Number.NaN,
    anchorZ: Number.NaN,
    anchorHeading: 0,
    lastTurboReleaseSerial: 0,
    turboReleaseVisual: 0,
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
    restoreSkyRaidEnemySilhouetteAssist(demo);
    return;
  }
  const hunt = getCartTurboHuntSnapshot(demo.session);
  if (!hunt) return;
  const raid = updateRaid(demo.session as unknown as RaidSession, hunt, 0);
  publishSkyRaidWorldStyle(raid);
  if (visual.turboBackdrop) visual.turboBackdrop.visible = false;
  const car = demo.session.car;
  const playerX = car.position.x;
  const playerZ = car.position.z;
  const playerHeading = car.heading;
  const playerSpeed = car.speed;
  const playerBoostActive = car.boostActive;
  const movedFar = !Number.isFinite(visual.anchorX) || Math.hypot(playerX - visual.anchorX, playerZ - visual.anchorZ) > 105;
  if (raid.actIndex !== visual.lastActIndex || movedFar) {
    visual.anchorX = playerX;
    visual.anchorZ = playerZ;
    visual.anchorHeading = playerHeading;
    visual.root.position.set(playerX, 0, playerZ);
    visual.root.rotation.y = playerHeading;
    visual.lastActIndex = raid.actIndex;
  }
  for (const group of visual.actGroups) group.visible = false;
  visual.root.visible = false;
  for (const layer of visual.legacyLayers) layer.visible = false;
  const resolvedFlight = flight ?? stepSkyRaidFlight(demo, delta);
  applySkyRaidFlightVisuals(demo, resolvedFlight);
  applySkyRaidEnemyFlightBand(demo);
  visual.arcadeWorld.update(raid.actId, playerX, playerZ, playerHeading, resolvedFlight.altitude, raid.elapsedSeconds, delta);

  const flightSpeed = Math.abs(playerSpeed);
  const cruiseFx = clamp((flightSpeed - 17) / 12, 0, 1);
  const turboState = getSkyDancerTurboState(demo.session);
  // A Turbo release can happen between two expensive WebGL frames. Latch the
  // release serial into presentation time so the speed tail is guaranteed to
  // appear for rendered frames instead of expiring entirely on the wall clock.
  if (turboState.releaseSerial > visual.lastTurboReleaseSerial) {
    visual.lastTurboReleaseSerial = turboState.releaseSerial;
    visual.turboReleaseVisual = 1;
  }
  const wallReleaseFx = Number.isFinite(turboState.releaseAgeSeconds)
    ? clamp(1 - turboState.releaseAgeSeconds / 1.45, 0, 1)
    : 0;
  const turboReleaseFx = Math.max(wallReleaseFx, visual.turboReleaseVisual);
  visual.turboReleaseVisual = Math.max(0, visual.turboReleaseVisual - Math.min(delta, 0.05) / 1.45);
  const turboFx = turboState.held ? 1 : turboReleaseFx * (0.72 + turboState.releaseCharge * 0.18);
  const rushFx = raid.rushActive ? 1 : 0;
  const speedFxIntensity = clamp(cruiseFx * 0.22 + rushFx * 0.32 + turboFx * 0.72, 0, 1);
  visual.speedFx.visible = speedFxIntensity > 0.055;
  visual.speedFx.position.set(playerX, 1.8 + resolvedFlight.altitude, playerZ);
  visual.speedFx.rotation.y = playerHeading;
  // All 24 speed streaks share one material. The previous loop lerped and wrote
  // that same material 24 times per frame. One mathematically equivalent combined
  // lerp preserves the exact converged appearance with a fraction of the work.
  visual.speedColor.setHex(raid.palette.accent);
  const sharedLerp = 1 - Math.exp(-delta * 5.5 * Math.max(1, visual.speedFx.children.length));
  visual.speedMaterial.color.lerp(visual.speedColor, sharedLerp);
  visual.speedMaterial.opacity = 0.045 + speedFxIntensity * 0.32;
  for (let index = 0; index < visual.speedFx.children.length; index += 1) {
    const line = visual.speedFx.children[index];
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);
    if (line.position.z < -12) line.position.z = 34 + (index % 6) * 8;
    const thickness = 0.72 + speedFxIntensity * 0.32;
    line.scale.x = thickness;
    line.scale.y = thickness;
    line.scale.z = 0.82 + speedFxIntensity * (1.10 + (index % 3) * 0.12);
  }
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
      legacyBoostActive: playerBoostActive,
      rushActive: raid.rushActive,
      flightSpeed,
    });
  }
}

export function installSkyDancerSkyRaid(): void {
  setCartTurboHuntActiveTargetCountResolver((context) => {
    if (!isSkyRaidMode()) return context.defaultCount;
    return skyDancerSkyRaidEnemyDoctrine(skyDancerSkyRaidActFor(context.elapsedSeconds).id).activeTargetCount;
  });
  setCartTurboHuntSpawnPreference((enemy, context) => {
    if (!isSkyRaidMode()) return 0;
    return skyDancerSkyRaidSpawnPreference(enemy, context.elapsedSeconds, context.spawnSerial);
  });
  const sessionPrototype = CartArenaSession.prototype as unknown as RaidSession;
  const previousStep = sessionPrototype.step;
  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {
    const skyRaidActive = isSkyRaidMode();
    const typedSession = this as unknown as CartArenaSession;
    const preHunt = skyRaidActive ? getCartTurboHuntSnapshot(typedSession) : null;
    setSkyDancerSkyRaidEnemyDoctrineElapsed(skyRaidActive ? preHunt?.huntElapsedSeconds ?? 0 : null);
    const flightInput = skyRaidActive ? skyRaidInputFor(this, input) : input;
    previousStep.call(this, flightInput, fixedDelta);
    if (!skyRaidActive) {
      setSkyDancerSkyRaidEnemyDoctrineElapsed(null);
      return;
    }
    const delta = clamp(fixedDelta, 0, 0.05);
    const hunt = getCartTurboHuntSnapshot(typedSession);
    if (!hunt) return;
    setSkyDancerSkyRaidEnemyDoctrineElapsed(hunt.huntElapsedSeconds);
    const state = stateFor(this, hunt);
    const activeAct = skyDancerSkyRaidActFor(hunt.huntElapsedSeconds);
    if (state.enemyRosterActIndex !== activeAct.index && hunt.huntPhase !== "boss-arrival" && hunt.huntPhase !== "clear") {
      // Preserve surviving aircraft across Act boundaries. New doctrine enters
      // naturally through later pooled respawns instead of deleting/reseeding the
      // whole formation on one frame.
      state.enemyRosterActIndex = activeAct.index;
    }
    stageSkyRaidNaturalEnemyEntries(typedSession);
    maintainSkyRaidEnemyPresence(typedSession, delta, hunt.huntElapsedSeconds);
    const snapshot = updateRaid(this, hunt, delta);
    publishSkyRaidWorldStyle(snapshot);
    state.broadcastClock += delta;
    if (state.broadcastClock >= 0.1 || snapshot.actElapsedSeconds < 0.12 || snapshot.clear) {
      state.broadcastClock %= 0.1;
      publishSkyRaidEnemyDoctrineDiagnostics(typedSession, hunt.huntElapsedSeconds);
      broadcast(snapshot);
    }
  };

  const webglPrototype = CartRogueWebGLDemo.prototype as unknown as RaidWebGLDemo;
  webglPrototype.setVertical = function skyRaidSetVertical(this: RaidWebGLDemo, value: number): void {
    flightControllerFor(this).setVerticalInput(value);
  };
  const previousBuildWorld = webglPrototype.buildWorld;
  webglPrototype.buildWorld = function skyRaidBuildWorld(this: RaidWebGLDemo): void {
    if (isSkyRaidMode()) {
      // SKY RAID now owns the complete 450 s act/boss timeline. Disable the inherited
      // Hunt objective/boss director before bootstrapping its reusable combat systems.
      setCartTurboHuntExternalProgressionEnabled(true);
      enableCartTurboHunt(this.session);
    } else {
      setCartTurboHuntExternalProgressionEnabled(false);
      previousBuildWorld.call(this);
    }
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
  applySkyRaidEnemyRoleReadability(this, snapshot);
  applySkyRaidEnemySilhouetteAssist(this, snapshot);
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
  const playerPosition = skyRaidCameraPlayerPosition;
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
  const preFrameProjection = skyRaidCameraProjection.copy(playerPosition).project(this.camera);
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
      const enemyScreenSamples: Array<{ id: string; x: number; y: number; z: number; visible: boolean; worldY: number; localY: number; boundsY: number; relativeY: number; forward: number; lateral: number; visualScale: number }> = [];
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
    visualScale: Number(group.userData.skyRaidVisualAssistScale ?? 1),
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
        formationDoctrine: document.documentElement.dataset.skyRaidCombatDoctrine ?? "",
        formationAct: document.documentElement.dataset.skyRaidFormationAct ?? "",
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
