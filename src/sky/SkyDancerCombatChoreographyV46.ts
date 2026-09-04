import type { RallyInputState } from "../rally/RallyTypes";
import { CartArenaSession, type CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { CartEnemyArchetype, CartEnemyState } from "../cart/CartCombat";
import { getSkyDancerMissileState } from "./SkyDancerFlightCombat";
import { getSkyDancerPlayerLockSnapshotV45, getSkyDancerPlayerWeaponState } from "./SkyDancerPlayerWeapons";
import {
  getLatestSkyDancerStageCycleSnapshot,
  getSkyDancerStageCycleSnapshot,
  installSkyDancerStageCycle,
  type SkyDancerStageCycleSnapshot,
} from "./SkyDancerStageCycle";
import {
  SKY_DANCER_CAMPAIGN_MISSIONS_V49,
  getSkyDancerMissionBeatV49,
  getSkyDancerMissionV49,
  gradeSkyDancerMissionV49,
  type SkyDancerMissionBeatV49,
  type SkyDancerMissionGradeV49,
  type SkyDancerMissionWorldStyleV49,
} from "./SkyDancerCampaignV49";

interface ChoreographySession {
  enemies: CartEnemyState[];
  rewardTimer: number;
  lastReward: string | null;
  car: {
    position: { x: number; z: number };
    heading: number;
  };
  step(input: RallyInputState, fixedDelta?: number): void;
  snapshot(): CartArenaSessionSnapshot;
}

export interface SkyDancerMissionResultV49 {
  mission: number;
  title: string;
  grade: SkyDancerMissionGradeV49;
  elapsedSeconds: number;
  accuracy: number;
  perfectEvades: number;
  peakFlow: number;
}

export interface SkyDancerCampaignSnapshotV49 {
  mission: number;
  missionTotal: number;
  missionId: string;
  title: string;
  subtitle: string;
  worldStyle: SkyDancerMissionWorldStyleV49;
  beatIndex: number;
  beatLabel: string;
  directive: string;
  kills: number;
  killTarget: number;
  phase: SkyDancerStageCycleSnapshot["phase"] | "complete";
  bossTitle: string;
  flow: number;
  peakFlow: number;
  accuracy: number;
  perfectEvades: number;
  grade: SkyDancerMissionGradeV49;
  elapsedSeconds: number;
  campaignComplete: boolean;
  results: readonly SkyDancerMissionResultV49[];
}

interface ChoreographyState {
  stage: number;
  missionElapsed: number;
  shots: number;
  hits: number;
  perfectEvades: number;
  flow: number;
  peakFlow: number;
  previousShotSerial: number;
  previousHitSerial: number;
  previousEnemyMissileHitSerial: number;
  missileClosest: Map<number, number>;
  scaledEnemyIds: Set<string>;
  retirementStage: number;
  results: SkyDancerMissionResultV49[];
  campaignComplete: boolean;
  publishClock: number;
}

const PATCHED_KEY = "__skyDancerCombatChoreographyV46Installed__";
const stateBySession = new WeakMap<object, ChoreographyState>();
let latestCampaignSnapshot: SkyDancerCampaignSnapshotV49 | null = null;

export const SKY_DANCER_CAMPAIGN_EVENT_V49 = "sky-dancer-campaign-v49";
export const SKY_DANCER_FLOW_MAX_V46 = 100;
export const SKY_DANCER_CHOREOGRAPHY_MAX_ACTIVE_THREATS_V46 = 5;

function skyDancerCampaignOwnsEnemyShapeV23(): boolean {
  return typeof document === "undefined" || document.documentElement.dataset.skyDancerMode !== "sky-raid";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stateFor(session: ChoreographySession): ChoreographyState {
  const key = session as unknown as object;
  const existing = stateBySession.get(key);
  if (existing) return existing;
  const created: ChoreographyState = {
    stage: 0,
    missionElapsed: 0,
    shots: 0,
    hits: 0,
    perfectEvades: 0,
    flow: 0,
    peakFlow: 0,
    previousShotSerial: 0,
    previousHitSerial: 0,
    previousEnemyMissileHitSerial: 0,
    missileClosest: new Map(),
    scaledEnemyIds: new Set(),
    retirementStage: 0,
    results: [],
    campaignComplete: false,
    publishClock: 0,
  };
  stateBySession.set(key, created);
  return created;
}

function missionAccuracy(state: ChoreographyState): number {
  return state.shots > 0 ? clamp(state.hits / state.shots, 0, 1) : 0;
}

function finalizeMission(state: ChoreographyState, stage: number): void {
  const mission = getSkyDancerMissionV49(stage);
  if (!mission || state.results.some((result) => result.mission === stage)) return;
  const accuracy = missionAccuracy(state);
  state.results.push({
    mission: stage,
    title: mission.title,
    grade: gradeSkyDancerMissionV49({
      elapsedSeconds: state.missionElapsed,
      accuracy,
      perfectEvades: state.perfectEvades,
      peakFlow: state.peakFlow,
    }, mission.parSeconds),
    elapsedSeconds: state.missionElapsed,
    accuracy,
    perfectEvades: state.perfectEvades,
    peakFlow: state.peakFlow,
  });
}

function resetMissionState(state: ChoreographyState, stage: number): void {
  state.stage = stage;
  state.missionElapsed = 0;
  state.shots = 0;
  state.hits = 0;
  state.perfectEvades = 0;
  state.flow = Math.min(state.flow, 24);
  state.peakFlow = state.flow;
  state.missileClosest.clear();
  state.scaledEnemyIds.clear();
  state.retirementStage = 0;
}

function desiredKind(archetype: CartEnemyArchetype): CartEnemyState["kind"] {
  return archetype === "tank" ? "heavy" : "chaser";
}

function configureThreat(
  enemy: CartEnemyState,
  archetype: CartEnemyArchetype,
  stage: number,
  state: ChoreographyState,
): void {
  enemy.archetype = archetype;
  enemy.kind = desiredKind(archetype);
  enemy.moveSpeed = archetype === "tank"
    ? clamp(enemy.moveSpeed, 1.9, 2.6)
    : archetype === "bomber"
      ? clamp(enemy.moveSpeed, 4.2, 5.3)
      : archetype === "striker"
        ? clamp(enemy.moveSpeed, 4.8, 6.0)
        : clamp(enemy.moveSpeed, 3.6, 5.5);
  if (archetype === "striker") {
    enemy.chargeCooldown = Math.min(enemy.chargeCooldown ?? 0.9, 0.92);
    enemy.chargeTime = enemy.chargeTime ?? 0;
  }

  const scaleKey = `${stage}:${enemy.id}`;
  if (state.scaledEnemyIds.has(scaleKey)) return;
  state.scaledEnemyIds.add(scaleKey);
  const targetHp = archetype === "tank" ? 104 + stage * 7 : 48 + stage * 4;
  enemy.maxHp = Math.max(1, Math.min(enemy.maxHp, targetHp));
  enemy.hp = Math.min(enemy.hp, enemy.maxHp);
  if (archetype === "tank") {
    enemy.radius = Math.max(enemy.radius, 2.28);
    enemy.armorSegments = Math.min(enemy.armorSegments ?? 2, 2);
    enemy.maxArmorSegments = Math.min(enemy.maxArmorSegments ?? 2, 2);
  } else {
    enemy.radius = Math.min(enemy.radius, 1.82);
  }
}

function shapeFormation(
  session: ChoreographySession,
  stage: SkyDancerStageCycleSnapshot,
  beat: SkyDancerMissionBeatV49,
  activeThreatTarget: number,
  state: ChoreographyState,
): void {
  if (stage.phase === "boss" || stage.phase === "stage-clear") return;
  const px = session.car.position.x;
  const pz = session.car.position.z;
  const live = session.enemies
    .filter((enemy) => enemy.kind !== "boss" && enemy.alive)
    .sort((a, b) => ((a.x - px) ** 2 + (a.z - pz) ** 2) - ((b.x - px) ** 2 + (b.z - pz) ** 2));
  const threatCount = Math.min(SKY_DANCER_CHOREOGRAPHY_MAX_ACTIVE_THREATS_V46, activeThreatTarget);
  for (let index = 0; index < live.length; index += 1) {
    const enemy = live[index];
    if (index < threatCount) {
      const archetype = beat.focusArchetypes[index % beat.focusArchetypes.length];
      configureThreat(enemy, archetype, stage.stage, state);
      continue;
    }

    // Keep background formation aircraft alive for StageCycle compatibility,
    // but pull them out of the immediate dogfight so each encounter reads as a
    // small duel instead of six enemies attacking at once.
    enemy.moveSpeed = Math.min(enemy.moveSpeed, 1.45);
    const dx = enemy.x - px;
    const dz = enemy.z - pz;
    const distance = Math.hypot(dx, dz);
    if (distance < 44) {
      const side = index % 2 === 0 ? -1 : 1;
      const angle = session.car.heading + Math.PI * 0.78 * side;
      const holdDistance = 48 + (index - threatCount) * 4;
      enemy.x = px + Math.sin(angle) * holdDistance;
      enemy.z = pz + Math.cos(angle) * holdDistance;
      enemy.heading = session.car.heading;
    }
  }
}

function retireLegacyReinforcements(
  session: ChoreographySession,
  stage: SkyDancerStageCycleSnapshot,
  missionKillTarget: number,
  state: ChoreographyState,
): void {
  if (stage.phase !== "reinforcements" || stage.stageKills < missionKillTarget) return;
  const live = session.enemies.filter((enemy) => enemy.kind !== "boss" && enemy.alive);
  if (live.length === 0) return;
  for (const enemy of live) {
    enemy.hp = 0;
    enemy.alive = false;
  }
  if (state.retirementStage !== stage.stage) {
    state.retirementStage = stage.stage;
    session.lastReward = "FORMATION BROKEN · BOSS AIRSPACE OPEN";
    session.rewardTimer = Math.max(session.rewardTimer, 1.8);
  }
}

function updateFlowAndAccuracy(
  session: CartArenaSession,
  state: ChoreographyState,
  delta: number,
  snapshot: CartArenaSessionSnapshot,
): void {
  const weapon = getSkyDancerPlayerWeaponState(session);
  const shotDelta = Math.max(0, weapon.shotSerial - state.previousShotSerial);
  const hitDelta = Math.max(0, weapon.hitSerial - state.previousHitSerial);
  state.previousShotSerial = weapon.shotSerial;
  state.previousHitSerial = weapon.hitSerial;
  state.shots += shotDelta;
  state.hits += hitDelta;

  if (hitDelta > 0) {
    const lock = getSkyDancerPlayerLockSnapshotV45(session);
    const timingBonus = lock.vulnerable ? 5 : 0;
    const turboBonus = snapshot.boostActive ? 6 : 0;
    state.flow = Math.min(SKY_DANCER_FLOW_MAX_V46, state.flow + hitDelta * (8 + timingBonus + turboBonus));
  }

  const enemyMissiles = getSkyDancerMissileState(session);
  const activeIds = new Set<number>();
  for (const missile of enemyMissiles.missiles) {
    activeIds.add(missile.id);
    const previousClosest = state.missileClosest.get(missile.id) ?? Number.POSITIVE_INFINITY;
    state.missileClosest.set(missile.id, Math.min(previousClosest, missile.distanceToPlayer));
  }
  for (const [id, closest] of state.missileClosest) {
    if (activeIds.has(id)) continue;
    if (closest <= 5.4 && enemyMissiles.hitSerial === state.previousEnemyMissileHitSerial) {
      state.perfectEvades += 1;
      state.flow = Math.min(SKY_DANCER_FLOW_MAX_V46, state.flow + 18);
    }
    state.missileClosest.delete(id);
  }
  state.previousEnemyMissileHitSerial = enemyMissiles.hitSerial;

  state.flow = Math.max(0, state.flow - delta * (snapshot.boostActive ? 0.7 : 1.7));
  state.peakFlow = Math.max(state.peakFlow, state.flow);
}

function publishCampaign(
  session: CartArenaSession,
  state: ChoreographyState,
  stage: SkyDancerStageCycleSnapshot,
  delta: number,
): void {
  state.publishClock -= delta;
  if (state.publishClock > 0) return;
  state.publishClock = 0.08;

  const mission = getSkyDancerMissionV49(stage.stage);
  if (!mission) {
    state.campaignComplete = stage.stage > SKY_DANCER_CAMPAIGN_MISSIONS_V49.length;
    const lastMission = SKY_DANCER_CAMPAIGN_MISSIONS_V49[SKY_DANCER_CAMPAIGN_MISSIONS_V49.length - 1];
    latestCampaignSnapshot = {
      mission: SKY_DANCER_CAMPAIGN_MISSIONS_V49.length,
      missionTotal: SKY_DANCER_CAMPAIGN_MISSIONS_V49.length,
      missionId: lastMission.id,
      title: "CAMPAIGN COMPLETE",
      subtitle: "The sky is yours.",
      worldStyle: "citadel",
      beatIndex: lastMission.beats.length - 1,
      beatLabel: "LAST LIGHT",
      directive: "FLIGHT RECORD COMPLETE",
      kills: lastMission.killTarget,
      killTarget: lastMission.killTarget,
      phase: "complete",
      bossTitle: lastMission.bossTitle,
      flow: state.flow,
      peakFlow: state.peakFlow,
      accuracy: missionAccuracy(state),
      perfectEvades: state.perfectEvades,
      grade: state.results[state.results.length - 1]?.grade ?? "C",
      elapsedSeconds: state.missionElapsed,
      campaignComplete: true,
      results: [...state.results],
    };
  } else {
    const { beat, index } = getSkyDancerMissionBeatV49(mission, Math.min(stage.stageKills, mission.killTarget));
    const accuracy = missionAccuracy(state);
    latestCampaignSnapshot = {
      mission: mission.number,
      missionTotal: SKY_DANCER_CAMPAIGN_MISSIONS_V49.length,
      missionId: mission.id,
      title: mission.title,
      subtitle: mission.subtitle,
      worldStyle: mission.worldStyle,
      beatIndex: index,
      beatLabel: stage.phase === "boss" ? "BOSS SETPIECE" : beat.label,
      directive: stage.phase === "boss" ? `${mission.bossTitle} · READ THE ATTACK RUN` : beat.directive,
      kills: Math.min(stage.stageKills, mission.killTarget),
      killTarget: mission.killTarget,
      phase: stage.phase,
      bossTitle: mission.bossTitle,
      flow: state.flow,
      peakFlow: state.peakFlow,
      accuracy,
      perfectEvades: state.perfectEvades,
      grade: gradeSkyDancerMissionV49({
        elapsedSeconds: state.missionElapsed,
        accuracy,
        perfectEvades: state.perfectEvades,
        peakFlow: state.peakFlow,
      }, mission.parSeconds),
      elapsedSeconds: state.missionElapsed,
      campaignComplete: false,
      results: [...state.results],
    };
  }

  if (typeof window !== "undefined" && latestCampaignSnapshot) {
    window.dispatchEvent(new CustomEvent<SkyDancerCampaignSnapshotV49>(
      SKY_DANCER_CAMPAIGN_EVENT_V49,
      { detail: latestCampaignSnapshot },
    ));
    if (navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyDancerGetV49Campaign = () => ({ ...latestCampaignSnapshot });
    }
  }
}

export function getLatestSkyDancerCampaignSnapshotV49(): SkyDancerCampaignSnapshotV49 | null {
  return latestCampaignSnapshot ? { ...latestCampaignSnapshot, results: [...latestCampaignSnapshot.results] } : null;
}

export function installSkyDancerCombatChoreographyV46(): void {
  // The StageCycle patch is idempotent. Installing it here guarantees that V46
  // wraps the complete legacy stage loop instead of depending on component order.
  installSkyDancerStageCycle();
  const prototype = CartArenaSession.prototype as unknown as ChoreographySession & Record<string, unknown>;
  if (prototype[PATCHED_KEY]) return;
  prototype[PATCHED_KEY] = true;
  const previous = prototype.step;

  prototype.step = function skyDancerCombatChoreographyStep(
    this: ChoreographySession,
    input: RallyInputState,
    fixedDelta?: number,
  ): void {
    previous.call(this, input, fixedDelta);
    const concrete = this as unknown as CartArenaSession;
    const stage = getSkyDancerStageCycleSnapshot(concrete) ?? getLatestSkyDancerStageCycleSnapshot();
    if (!stage) return;
    const state = stateFor(this);
    const delta = clamp(fixedDelta ?? 1 / 60, 0.001, 0.05);

    if (state.stage !== stage.stage) {
      if (state.stage > 0) finalizeMission(state, state.stage);
      resetMissionState(state, stage.stage);
      state.campaignComplete = stage.stage > SKY_DANCER_CAMPAIGN_MISSIONS_V49.length;
    }
    state.missionElapsed += delta;

    const snapshot = this.snapshot();
    updateFlowAndAccuracy(concrete, state, delta, snapshot);
    const mission = getSkyDancerMissionV49(stage.stage);
    // Campaign choreography owns enemy archetype conversion in campaign mode.
    // SKY RAID has its own V23 Act doctrine and must remain the final roster owner.
    if (mission && skyDancerCampaignOwnsEnemyShapeV23()) {
      const { beat } = getSkyDancerMissionBeatV49(mission, Math.min(stage.stageKills, mission.killTarget));
      shapeFormation(this, stage, beat, mission.activeThreatTarget, state);
      retireLegacyReinforcements(this, stage, mission.killTarget, state);
    }
    publishCampaign(concrete, state, stage, delta);
  };
}
