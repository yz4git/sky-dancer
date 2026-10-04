import {
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeStageId,
} from "../arcade/SkyDancerArcadeData";
import { skyDancerArcadeV11Timeline } from "../arcade/SkyDancerArcadeV11Timeline";
import { SKY_DANCER_SKY_RAID_ACTS, type SkyDancerSkyRaidActId } from "../SkyDancerSkyRaidRules";
import {
  createSkyDancerMissionGraph,
  skyDancerMissionPatch,
  skyDancerMissionRuntimeFor,
  type SkyDancerMissionGraph,
  type SkyDancerMissionMode,
  type SkyDancerMissionRuntime,
} from "./SkyDancerMissionIR";

export type SkyDancerTurboHuntMissionPhase =
  | "drop-in"
  | "hunt"
  | "heat-up"
  | "elite-invasion"
  | "overdrive"
  | "boss-arrival"
  | "clear";

export interface SkyDancerArcadeMissionSignals {
  hpRatio: number;
  chain: number;
  recentDamage: number;
}

export interface SkyDancerArcadeMissionTuning {
  pressureScale: number;
  waveCadenceScale: number;
  hazardCadenceScale: number;
  cameraFovOffset: number;
  cameraPullbackOffset: number;
  revisionHash: string;
}

export interface SkyDancerTurboHuntMissionSignals {
  heat: number;
  ordersCompleted: number;
  elapsedSeconds: number;
}

export interface SkyDancerTurboHuntMissionTuning {
  targetCountScale: number;
  targetCountOffset: number;
  spawnAggression: number;
  revisionHash: string;
}

export interface SkyDancerSkyRaidMissionSignals {
  chain: number;
  actKills: number;
  perfectRushes: number;
  actBreaks: number;
}

export interface SkyDancerSkyRaidMissionTuning {
  pressureScale: number;
  killTargetScale: number;
  rushTargetOffset: number;
  speedScale: number;
  handlingScale: number;
  revisionHash: string;
}

const TURBO_PHASE_DEFAULT_TARGETS: Readonly<Record<SkyDancerTurboHuntMissionPhase, number>> = {
  "drop-in": 6,
  "hunt": 8,
  "heat-up": 10,
  "elite-invasion": 11,
  "overdrive": 13,
  "boss-arrival": 9,
  "clear": 0,
};

const TURBO_PHASE_ORDER: readonly SkyDancerTurboHuntMissionPhase[] = [
  "drop-in",
  "hunt",
  "heat-up",
  "elite-invasion",
  "overdrive",
  "boss-arrival",
  "clear",
];

const graphCache = new Map<SkyDancerMissionMode, SkyDancerMissionGraph>();

export function skyDancerMissionGraph(mode: SkyDancerMissionMode): SkyDancerMissionGraph {
  const cached = graphCache.get(mode);
  if (cached) return cached;
  const graph = mode === "arcade"
    ? createArcadeMissionGraph()
    : mode === "turbo-hunt"
      ? createTurboHuntMissionGraph()
      : createSkyRaidMissionGraph();
  graphCache.set(mode, graph);
  return graph;
}

export function getSkyDancerMissionRuntime(
  owner: object,
  mode: SkyDancerMissionMode,
): SkyDancerMissionRuntime {
  return skyDancerMissionRuntimeFor(owner, skyDancerMissionGraph(mode));
}

export function getSkyDancerMissionSnapshot(
  owner: object,
  mode: SkyDancerMissionMode,
): ReturnType<SkyDancerMissionRuntime["snapshot"]> {
  return getSkyDancerMissionRuntime(owner, mode).snapshot();
}

export function skyDancerArcadeDirectorNodeId(
  stageId: SkyDancerArcadeStageId,
  beatId: string,
): string {
  return `arcade:director:${stageId}:${beatId}`;
}

function applyDirectorValuesIfChanged(
  runtime: SkyDancerMissionRuntime,
  nodeId: string,
  patchId: string,
  reason: string,
  values: Record<string, string | number | boolean | null>,
): void {
  const current = runtime.getNode(nodeId);
  if (
    current
    && Object.entries(values).every(([key, value]) => current.values[key] === value)
  ) {
    return;
  }
  runtime.applyPatch(skyDancerMissionPatch(
    patchId,
    reason,
    [{ nodeId, set: values }],
  ));
}

export function skyDancerArcadeMissionTuning(
  owner: object,
  stageId: SkyDancerArcadeStageId,
  beatId: string,
  signals: SkyDancerArcadeMissionSignals,
): SkyDancerArcadeMissionTuning {
  const runtime = getSkyDancerMissionRuntime(owner, "arcade");
  const nodeId = skyDancerArcadeDirectorNodeId(stageId, beatId);

  const pressureScale = 1;
  const waveCadenceScale = 1;
  const hazardCadenceScale = 1;
  let cameraFovOffset = 0;
  let cameraPullbackOffset = 0;
  let reason = "neutral combat state";
  const carryCameraFovOffset = runtime.number(nodeId, "carryCameraFovOffset", 0);
  const carryCameraPullbackOffset = runtime.number(nodeId, "carryCameraPullbackOffset", 0);

  // Arcade Run has a heavily authored two-minute timeline. Keep its proven
  // encounter cadence deterministic and use Mission Patch first for presentation.
  // Turbo Hunt and SKY RAID below are free to patch gameplay pressure directly.
  if (signals.hpRatio <= 0.3 || signals.recentDamage >= 1.15) {
    cameraFovOffset = -0.4;
    cameraPullbackOffset = 0.35;
    reason = "recovery framing";
  } else if (signals.chain >= 8 && signals.hpRatio >= 0.55) {
    cameraFovOffset = 0.55;
    cameraPullbackOffset = 0.25;
    reason = "ace framing";
  }

  patchNextArcadeBeatCarry(runtime, stageId, beatId, signals);

  const effectiveCameraFovOffset = clampMissionValue(
    cameraFovOffset + carryCameraFovOffset,
    -0.8,
    0.8,
  );
  const effectiveCameraPullbackOffset = clampMissionValue(
    cameraPullbackOffset + carryCameraPullbackOffset,
    0,
    0.7,
  );

  applyDirectorValuesIfChanged(
    runtime,
    nodeId,
    `arcade-adaptive:${stageId}:${beatId}`,
    reason,
    {
      pressureScale,
      waveCadenceScale,
      hazardCadenceScale,
      cameraFovOffset: effectiveCameraFovOffset,
      cameraPullbackOffset: effectiveCameraPullbackOffset,
    },
  );

  return {
    pressureScale: runtime.number(nodeId, "pressureScale", 1),
    waveCadenceScale: runtime.number(nodeId, "waveCadenceScale", 1),
    hazardCadenceScale: runtime.number(nodeId, "hazardCadenceScale", 1),
    cameraFovOffset: runtime.number(nodeId, "cameraFovOffset", 0),
    cameraPullbackOffset: runtime.number(nodeId, "cameraPullbackOffset", 0),
    revisionHash: runtime.snapshot().revisionHash,
  };
}

function patchNextArcadeBeatCarry(
  runtime: SkyDancerMissionRuntime,
  stageId: SkyDancerArcadeStageId,
  beatId: string,
  signals: SkyDancerArcadeMissionSignals,
): void {
  const stageIndex = SKY_DANCER_ARCADE_STAGES.findIndex((stage) => stage.id === stageId);
  if (stageIndex < 0) return;
  const timeline = skyDancerArcadeV11Timeline(stageId);
  const beatIndex = timeline.findIndex((beat) => beat.id === beatId);
  if (beatIndex < 0) return;

  let nextStageId = stageId;
  let nextBeat = timeline[beatIndex + 1];
  if (!nextBeat) {
    const nextStage = SKY_DANCER_ARCADE_STAGES[stageIndex + 1];
    if (!nextStage) return;
    nextStageId = nextStage.id;
    nextBeat = skyDancerArcadeV11Timeline(nextStage.id)[0];
  }
  if (!nextBeat) return;

  let carryCameraFovOffset = 0;
  let carryCameraPullbackOffset = 0;
  let reason = "neutral route carry";

  if (signals.hpRatio <= 0.3 || signals.recentDamage >= 1.15) {
    carryCameraFovOffset = -0.2;
    carryCameraPullbackOffset = 0.2;
    reason = "recovery route carry";
  } else if (signals.chain >= 8 && signals.hpRatio >= 0.55) {
    carryCameraFovOffset = 0.25;
    carryCameraPullbackOffset = 0.15;
    reason = "ace route carry";
  }

  applyDirectorValuesIfChanged(
    runtime,
    skyDancerArcadeDirectorNodeId(nextStageId, nextBeat.id),
    `arcade-carry:${stageId}:${beatId}->${nextStageId}:${nextBeat.id}`,
    reason,
    { carryCameraFovOffset, carryCameraPullbackOffset },
  );
}

export function skyDancerTurboHuntDirectorNodeId(
  phase: SkyDancerTurboHuntMissionPhase,
): string {
  return `turbo-hunt:director:${phase}`;
}

export function skyDancerTurboHuntMissionTuning(
  owner: object,
  phase: SkyDancerTurboHuntMissionPhase,
  signals: SkyDancerTurboHuntMissionSignals,
): SkyDancerTurboHuntMissionTuning {
  const runtime = getSkyDancerMissionRuntime(owner, "turbo-hunt");
  const nodeId = skyDancerTurboHuntDirectorNodeId(phase);

  const targetCountScale = 1;
  let targetCountOffset = 0;
  let spawnAggression = 1;
  let reason = "baseline hunt pressure";
  const carryTargetCountOffset = runtime.number(nodeId, "carryTargetCountOffset", 0);
  const carrySpawnAggressionOffset = runtime.number(nodeId, "carrySpawnAggressionOffset", 0);

  if (phase !== "clear" && phase !== "boss-arrival") {
    if (signals.heat >= 88 && signals.ordersCompleted >= 4) {
      targetCountOffset = 1;
      spawnAggression = 1.08;
      reason = "maximum heat reinforcement";
    } else if (signals.elapsedSeconds >= 55 && signals.heat <= 22) {
      targetCountOffset = -1;
      spawnAggression = 0.94;
      reason = "reacquisition breathing room";
    }
  }

  patchNextTurboHuntCarry(runtime, phase, signals);

  targetCountOffset = Math.round(clampMissionValue(
    targetCountOffset + carryTargetCountOffset,
    -2,
    2,
  ));
  spawnAggression = clampMissionValue(
    spawnAggression + carrySpawnAggressionOffset,
    0.9,
    1.12,
  );

  applyDirectorValuesIfChanged(
    runtime,
    nodeId,
    `turbo-hunt-adaptive:${phase}`,
    reason,
    { targetCountScale, targetCountOffset, spawnAggression },
  );

  return {
    targetCountScale: runtime.number(nodeId, "targetCountScale", 1),
    targetCountOffset: runtime.number(nodeId, "targetCountOffset", 0),
    spawnAggression: runtime.number(nodeId, "spawnAggression", 1),
    revisionHash: runtime.snapshot().revisionHash,
  };
}

function patchNextTurboHuntCarry(
  runtime: SkyDancerMissionRuntime,
  phase: SkyDancerTurboHuntMissionPhase,
  signals: SkyDancerTurboHuntMissionSignals,
): void {
  const phaseIndex = TURBO_PHASE_ORDER.indexOf(phase);
  const nextPhase = phaseIndex >= 0 ? TURBO_PHASE_ORDER[phaseIndex + 1] : undefined;
  if (!nextPhase) return;

  let carryTargetCountOffset = 0;
  let carrySpawnAggressionOffset = 0;
  let reason = "neutral hunt carry";

  if (signals.heat >= 88 && signals.ordersCompleted >= 4) {
    carryTargetCountOffset = 1;
    carrySpawnAggressionOffset = 0.04;
    reason = "hot-streak reinforcement carry";
  } else if (signals.elapsedSeconds >= 55 && signals.heat <= 22) {
    carryTargetCountOffset = -1;
    carrySpawnAggressionOffset = -0.04;
    reason = "reacquisition relief carry";
  }

  applyDirectorValuesIfChanged(
    runtime,
    skyDancerTurboHuntDirectorNodeId(nextPhase),
    `turbo-hunt-carry:${phase}->${nextPhase}`,
    reason,
    { carryTargetCountOffset, carrySpawnAggressionOffset },
  );
}

export function skyDancerSkyRaidDirectorNodeId(actId: SkyDancerSkyRaidActId): string {
  return `sky-raid:director:${actId}`;
}

export function skyDancerSkyRaidMissionTuning(
  owner: object,
  actId: SkyDancerSkyRaidActId,
  signals: SkyDancerSkyRaidMissionSignals,
): SkyDancerSkyRaidMissionTuning {
  const runtime = getSkyDancerMissionRuntime(owner, "sky-raid");
  const nodeId = skyDancerSkyRaidDirectorNodeId(actId);

  let pressureScale = 1;
  let killTargetScale = 1;
  let rushTargetOffset = 0;
  let speedScale = 1;
  let handlingScale = 1;
  let reason = "baseline raid doctrine";
  const carryPressureDelta = runtime.number(nodeId, "carryPressureDelta", 0);
  const carryKillTargetDelta = runtime.number(nodeId, "carryKillTargetDelta", 0);
  const carryRushTargetOffset = runtime.number(nodeId, "carryRushTargetOffset", 0);
  const carrySpeedDelta = runtime.number(nodeId, "carrySpeedDelta", 0);
  const carryHandlingDelta = runtime.number(nodeId, "carryHandlingDelta", 0);

  if (signals.chain >= 8) {
    pressureScale = 1.06;
    speedScale = 1.025;
    reason = "high-chain counterattack";
  }
  if (signals.perfectRushes >= 3) {
    rushTargetOffset = 1;
    pressureScale = Math.max(pressureScale, 1.08);
    reason = "perfect-rush escalation";
  }
  if (signals.actBreaks === 0 && signals.actKills <= 2) {
    killTargetScale = 0.96;
    handlingScale = 1.025;
    reason = "opening raid assist";
  }

  patchNextSkyRaidActCarry(runtime, actId, signals);

  pressureScale = clampMissionValue(pressureScale + carryPressureDelta, 0.94, 1.12);
  killTargetScale = clampMissionValue(killTargetScale + carryKillTargetDelta, 0.9, 1.08);
  rushTargetOffset = Math.round(clampMissionValue(
    rushTargetOffset + carryRushTargetOffset,
    -1,
    2,
  ));
  speedScale = clampMissionValue(speedScale + carrySpeedDelta, 0.97, 1.06);
  handlingScale = clampMissionValue(handlingScale + carryHandlingDelta, 0.98, 1.06);

  applyDirectorValuesIfChanged(
    runtime,
    nodeId,
    `sky-raid-adaptive:${actId}`,
    reason,
    {
      pressureScale,
      killTargetScale,
      rushTargetOffset,
      speedScale,
      handlingScale,
    },
  );

  return {
    pressureScale: runtime.number(nodeId, "pressureScale", 1),
    killTargetScale: runtime.number(nodeId, "killTargetScale", 1),
    rushTargetOffset: runtime.number(nodeId, "rushTargetOffset", 0),
    speedScale: runtime.number(nodeId, "speedScale", 1),
    handlingScale: runtime.number(nodeId, "handlingScale", 1),
    revisionHash: runtime.snapshot().revisionHash,
  };
}

function patchNextSkyRaidActCarry(
  runtime: SkyDancerMissionRuntime,
  actId: SkyDancerSkyRaidActId,
  signals: SkyDancerSkyRaidMissionSignals,
): void {
  const actIndex = SKY_DANCER_SKY_RAID_ACTS.findIndex((act) => act.id === actId);
  const nextAct = actIndex >= 0 ? SKY_DANCER_SKY_RAID_ACTS[actIndex + 1] : undefined;
  if (!nextAct) return;

  let carryPressureDelta = 0;
  let carryKillTargetDelta = 0;
  let carryRushTargetOffset = 0;
  let carrySpeedDelta = 0;
  let carryHandlingDelta = 0;
  let reason = "neutral raid carry";

  if (signals.perfectRushes >= 3 || (signals.chain >= 8 && signals.actKills >= 8)) {
    carryPressureDelta = 0.03;
    carryRushTargetOffset = 1;
    carrySpeedDelta = 0.01;
    reason = "dominant-act counteroffensive carry";
  } else if (signals.actBreaks === 0 && signals.actKills <= 2) {
    carryPressureDelta = -0.02;
    carryKillTargetDelta = -0.03;
    carryHandlingDelta = 0.015;
    reason = "struggling-act support carry";
  }

  applyDirectorValuesIfChanged(
    runtime,
    skyDancerSkyRaidDirectorNodeId(nextAct.id),
    `sky-raid-carry:${actId}->${nextAct.id}`,
    reason,
    {
      carryPressureDelta,
      carryKillTargetDelta,
      carryRushTargetOffset,
      carrySpeedDelta,
      carryHandlingDelta,
    },
  );
}

function clampMissionValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createArcadeMissionGraph(): SkyDancerMissionGraph {
  const nodes: Parameters<typeof createSkyDancerMissionGraph>[1][number][] = [{
    id: "arcade:mission",
    kind: "mission",
    label: "ARCADE RUN",
    dependsOn: [],
    values: { enabled: true },
  }];

  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const stageId = `arcade:stage:${stage.id}`;
    nodes.push({
      id: stageId,
      kind: "segment",
      label: stage.name,
      dependsOn: ["arcade:mission"],
      values: {
        durationSeconds: stage.durationSeconds,
        courseSpeed: stage.courseSpeed,
        waveIntervalSeconds: stage.waveIntervalSeconds,
        turbulence: stage.turbulence,
        bossName: stage.bossName,
      },
    });

    for (const beat of skyDancerArcadeV11Timeline(stage.id)) {
      const beatId = `arcade:beat:${stage.id}:${beat.id}`;
      const directorId = skyDancerArcadeDirectorNodeId(stage.id, beat.id);
      nodes.push({
        id: beatId,
        kind: beat.kind === "boss" ? "boss" : "encounter",
        label: beat.label,
        dependsOn: [stageId],
        values: {
          start: beat.start,
          end: beat.end,
          intensity: beat.intensity,
          waveIntervalScale: beat.waveIntervalScale,
          hazardIntervalScale: beat.hazardIntervalScale,
          cameraFov: beat.cameraFov,
          cameraPullback: beat.cameraPullback,
          scoreBonus: beat.scoreBonus,
          setpiece: beat.setpiece,
        },
      });
      nodes.push({
        id: directorId,
        kind: "director",
        label: `${stage.shortName} · ${beat.label}`,
        dependsOn: [beatId],
        values: {
          pressureScale: 1,
          waveCadenceScale: 1,
          hazardCadenceScale: 1,
          cameraFovOffset: 0,
          cameraPullbackOffset: 0,
          carryCameraFovOffset: 0,
          carryCameraPullbackOffset: 0,
        },
      });
      nodes.push({
        id: `arcade:artifact:camera:${stage.id}:${beat.id}`,
        kind: "camera",
        label: `${beat.label} CAMERA`,
        dependsOn: [directorId],
        values: { enabled: true },
      });
      nodes.push({
        id: `arcade:artifact:encounter:${stage.id}:${beat.id}`,
        kind: "artifact",
        label: `${beat.label} ENCOUNTER`,
        dependsOn: [directorId],
        values: { enabled: true },
      });
    }
  }

  return createSkyDancerMissionGraph("arcade", nodes);
}

function createTurboHuntMissionGraph(): SkyDancerMissionGraph {
  const nodes: Parameters<typeof createSkyDancerMissionGraph>[1][number][] = [{
    id: "turbo-hunt:mission",
    kind: "mission",
    label: "TURBO HUNT",
    dependsOn: [],
    values: { enabled: true },
  }];

  for (const [phase, targetCount] of Object.entries(TURBO_PHASE_DEFAULT_TARGETS) as Array<
    [SkyDancerTurboHuntMissionPhase, number]
  >) {
    const phaseId = `turbo-hunt:phase:${phase}`;
    const directorId = skyDancerTurboHuntDirectorNodeId(phase);
    nodes.push({
      id: phaseId,
      kind: phase === "boss-arrival" ? "boss" : "segment",
      label: phase.toUpperCase().replaceAll("-", " "),
      dependsOn: ["turbo-hunt:mission"],
      values: { targetCount },
    });
    nodes.push({
      id: directorId,
      kind: "director",
      label: `${phase.toUpperCase()} DIRECTOR`,
      dependsOn: [phaseId],
      values: {
        targetCountScale: 1,
        targetCountOffset: 0,
        spawnAggression: 1,
        carryTargetCountOffset: 0,
        carrySpawnAggressionOffset: 0,
      },
    });
    nodes.push({
      id: `turbo-hunt:artifact:targets:${phase}`,
      kind: "artifact",
      label: `${phase.toUpperCase()} TARGET POPULATION`,
      dependsOn: [directorId],
      values: { enabled: true },
    });
  }

  return createSkyDancerMissionGraph("turbo-hunt", nodes);
}

function createSkyRaidMissionGraph(): SkyDancerMissionGraph {
  const nodes: Parameters<typeof createSkyDancerMissionGraph>[1][number][] = [{
    id: "sky-raid:mission",
    kind: "mission",
    label: "SKY RAID",
    dependsOn: [],
    values: { enabled: true },
  }];

  for (const act of SKY_DANCER_SKY_RAID_ACTS) {
    const actId = `sky-raid:act:${act.id}`;
    const directorId = skyDancerSkyRaidDirectorNodeId(act.id);
    nodes.push({
      id: actId,
      kind: act.id === "prism-citadel" ? "boss" : "segment",
      label: act.label,
      dependsOn: ["sky-raid:mission"],
      values: {
        startSeconds: act.startSeconds,
        endSeconds: act.endSeconds,
        killTarget: act.killTarget,
        setpiece: act.setpiece,
      },
    });
    nodes.push({
      id: directorId,
      kind: "director",
      label: `${act.label} DIRECTOR`,
      dependsOn: [actId],
      values: {
        pressureScale: 1,
        killTargetScale: 1,
        rushTargetOffset: 0,
        speedScale: 1,
        handlingScale: 1,
        carryPressureDelta: 0,
        carryKillTargetDelta: 0,
        carryRushTargetOffset: 0,
        carrySpeedDelta: 0,
        carryHandlingDelta: 0,
      },
    });
    nodes.push({
      id: `sky-raid:artifact:combat:${act.id}`,
      kind: "artifact",
      label: `${act.label} COMBAT`,
      dependsOn: [directorId],
      values: { enabled: true },
    });
    nodes.push({
      id: `sky-raid:artifact:flight:${act.id}`,
      kind: "artifact",
      label: `${act.label} FLIGHT`,
      dependsOn: [directorId],
      values: { enabled: true },
    });
  }

  return createSkyDancerMissionGraph("sky-raid", nodes);
}
