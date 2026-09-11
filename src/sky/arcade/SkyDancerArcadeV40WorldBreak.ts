import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeStageId } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV40RouteDoctrine = "LOCKED" | "SAFE" | "SCORE" | "DANGER";

export interface SkyDancerArcadeV40RouteEffect {
  doctrine: SkyDancerArcadeV40RouteDoctrine;
  scoreMultiplier: number;
  pressureScale: number;
  entryHpRecovery: number;
  entryTurboRecovery: number;
  label: string;
  detail: string;
}

export interface SkyDancerArcadeV40WorldProfile {
  stageId: SkyDancerArcadeStageId;
  objective: string;
  signature: string;
  live: boolean;
}

export interface SkyDancerArcadeV40GateDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  score: number;
}

export interface SkyDancerArcadeV40FleetTargetDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  kind: SkyDancerArcadeEnemyKind;
  label: string;
  hp: number;
  score: number;
}

export interface SkyDancerArcadeV40StormLaneDefinition {
  index: number;
  progress: number;
  safeX: number;
  amplitude: number;
  phase: number;
  width: number;
  score: number;
}

const PROFILES: Record<SkyDancerArcadeStageId, SkyDancerArcadeV40WorldProfile> = {
  "dawn-city": { stageId: "dawn-city", objective: "THREAD SKYLINE GATES", signature: "TOWER SLALOM", live: true },
  "red-canyon": { stageId: "red-canyon", objective: "HOLD LOW ALTITUDE", signature: "KNIFE RUN", live: true },
  "cloud-fleet": { stageId: "cloud-fleet", objective: "DISMANTLE THE FLAGSHIP", signature: "DECK STRIKE", live: true },
  "storm-carrier": { stageId: "storm-carrier", objective: "READ THE SAFE LANE", signature: "LIGHTNING GRID", live: true },
  "desert-fortress": { stageId: "desert-fortress", objective: "BREACH THE WALL", signature: "FORTRESS GATE", live: true },
  "ice-cavern": { stageId: "ice-cavern", objective: "ESCAPE THE COLLAPSE", signature: "CRYSTAL TUNNEL", live: false },
  "floating-ruins": { stageId: "floating-ruins", objective: "CHOOSE THE PORTAL", signature: "SKY LABYRINTH", live: false },
  "night-metro": { stageId: "night-metro", objective: "CATCH THE PHANTOM", signature: "NEON PURSUIT", live: false },
  "volcano-core": { stageId: "volcano-core", objective: "OUTRUN THE ERUPTION", signature: "MAGMA PRESSURE", live: false },
  "orbital-ascent": { stageId: "orbital-ascent", objective: "CLIMB THE DEBRIS SHAFT", signature: "ZERO-G ASCENT", live: false },
  "prism-citadel": { stageId: "prism-citadel", objective: "BREAK THE SEVEN SKIES", signature: "ROUTE REPRISE", live: false },
};

const ROUTE_EFFECTS: Record<SkyDancerArcadeV40RouteDoctrine, SkyDancerArcadeV40RouteEffect> = {
  LOCKED: {
    doctrine: "LOCKED",
    scoreMultiplier: 1,
    pressureScale: 1,
    entryHpRecovery: 28,
    entryTurboRecovery: 38,
    label: "LOCKED ROUTE",
    detail: "STANDARD PRESSURE",
  },
  SAFE: {
    doctrine: "SAFE",
    scoreMultiplier: 1,
    pressureScale: 1.12,
    entryHpRecovery: 42,
    entryTurboRecovery: 50,
    label: "SAFE ROUTE",
    detail: "EXTRA RECOVERY · LIGHTER PRESSURE",
  },
  SCORE: {
    doctrine: "SCORE",
    scoreMultiplier: 1.18,
    pressureScale: .96,
    entryHpRecovery: 28,
    entryTurboRecovery: 38,
    label: "SCORE ROUTE",
    detail: "×1.18 SCORE · STANDARD RECOVERY",
  },
  DANGER: {
    doctrine: "DANGER",
    scoreMultiplier: 1.35,
    pressureScale: .84,
    entryHpRecovery: 18,
    entryTurboRecovery: 24,
    label: "DANGER ROUTE",
    detail: "×1.35 SCORE · HIGHER PRESSURE",
  },
};

export const SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES: readonly SkyDancerArcadeV40GateDefinition[] = [
  { index: 0, progress: .155, x: -1.24, y: .12, radiusX: .72, radiusY: .72, score: 900 },
  { index: 1, progress: .205, x: 1.04, y: -.22, radiusX: .7, radiusY: .7, score: 1100 },
  { index: 2, progress: .255, x: -.18, y: .34, radiusX: .68, radiusY: .68, score: 1400 },
];

export const SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START = .12;
export const SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END = .31;
export const SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y = -.46;
export const SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS = 3.45;

export const SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS: readonly SkyDancerArcadeV40FleetTargetDefinition[] = [
  { index: 0, progress: .17, x: -1.28, y: .18, kind: "missile-boat", label: "PORT BATTERY", hp: 62, score: 1800 },
  { index: 1, progress: .245, x: 1.18, y: -.12, kind: "gunship", label: "ENGINE ARRAY", hp: 88, score: 2400 },
  { index: 2, progress: .335, x: .02, y: .28, kind: "bomber", label: "BRIDGE CORE", hp: 118, score: 3600 },
];

export const SKY_DANCER_ARCADE_V40_STORM_LANES: readonly SkyDancerArcadeV40StormLaneDefinition[] = [
  { index: 0, progress: .145, safeX: -1.12, amplitude: .26, phase: .2, width: .72, score: 1050 },
  { index: 1, progress: .195, safeX: .92, amplitude: .38, phase: 1.45, width: .68, score: 1250 },
  { index: 2, progress: .245, safeX: -.22, amplitude: .48, phase: 2.7, width: .65, score: 1450 },
  { index: 3, progress: .295, safeX: 1.08, amplitude: .34, phase: 4.05, width: .62, score: 1700 },
  { index: 4, progress: .345, safeX: -.72, amplitude: .44, phase: 5.2, width: .6, score: 2100 },
];

export const SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS: readonly SkyDancerArcadeV40FleetTargetDefinition[] = [
  { index: 0, progress: .145, x: -1.42, y: .12, kind: "missile-boat", label: "WEST WALL GUN", hp: 66, score: 1850 },
  { index: 1, progress: .215, x: 1.36, y: -.08, kind: "gunship", label: "EAST WALL GUN", hp: 82, score: 2350 },
  { index: 2, progress: .285, x: .02, y: .3, kind: "bomber", label: "GATE GENERATOR", hp: 104, score: 3200 },
];
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_PROGRESS = .365;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_X = 0;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y = -.02;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X = .72;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y = .78;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE = 5200;

export function skyDancerArcadeV40WorldProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV40WorldProfile {
  return PROFILES[stageId];
}

export function skyDancerArcadeV40RouteDoctrine(index: number, count: number): SkyDancerArcadeV40RouteDoctrine {
  if (count <= 1 || index < 0 || index >= count) return "LOCKED";
  if (index === 0) return "SAFE";
  if (index === count - 1) return "DANGER";
  return "SCORE";
}

export function skyDancerArcadeV40RouteEffect(doctrine: SkyDancerArcadeV40RouteDoctrine): SkyDancerArcadeV40RouteEffect {
  return ROUTE_EFFECTS[doctrine];
}

export function skyDancerArcadeV40DawnCityGateAnchorDistance(
  gate: SkyDancerArcadeV40GateDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * gate.progress;
}

export function skyDancerArcadeV40FleetTargetAnchorDistance(
  target: SkyDancerArcadeV40FleetTargetDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * target.progress;
}

export function skyDancerArcadeV40StormLaneAnchorDistance(
  lane: SkyDancerArcadeV40StormLaneDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * lane.progress;
}

export function skyDancerArcadeV40StormLaneX(lane: SkyDancerArcadeV40StormLaneDefinition, stageTimeSeconds: number): number {
  return lane.safeX + Math.sin(Math.max(0, stageTimeSeconds) * 2.35 + lane.phase) * lane.amplitude;
}

export function skyDancerArcadeV40FortressBreachAnchorDistance(stageDurationSeconds: number, courseSpeed: number): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * SKY_DANCER_ARCADE_V40_DESERT_BREACH_PROGRESS;
}
