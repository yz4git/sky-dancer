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

export interface SkyDancerArcadeV40IceApertureDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  driftAmplitude: number;
  phase: number;
  radiusX: number;
  radiusY: number;
  score: number;
}

export type SkyDancerArcadeV40PortalDoctrine = "FLOW" | "SCORE" | "DANGER";

export interface SkyDancerArcadeV40PortalDefinition {
  index: number;
  x: number;
  y: number;
  radius: number;
  doctrine: SkyDancerArcadeV40PortalDoctrine;
  label: string;
  score: number;
  scoreMultiplier: number;
  pressureScale: number;
  hpRecovery: number;
  turboRecovery: number;
}

export interface SkyDancerArcadeV40PrismTrialDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  radius: number;
  score: number;
}

const PROFILES: Record<SkyDancerArcadeStageId, SkyDancerArcadeV40WorldProfile> = {
  "dawn-city": { stageId: "dawn-city", objective: "THREAD SKYLINE GATES", signature: "TOWER SLALOM", live: true },
  "red-canyon": { stageId: "red-canyon", objective: "HOLD LOW ALTITUDE", signature: "KNIFE RUN", live: true },
  "cloud-fleet": { stageId: "cloud-fleet", objective: "DISMANTLE THE FLAGSHIP", signature: "DECK STRIKE", live: true },
  "storm-carrier": { stageId: "storm-carrier", objective: "READ THE SAFE LANE", signature: "LIGHTNING GRID", live: true },
  "desert-fortress": { stageId: "desert-fortress", objective: "BREACH THE WALL", signature: "FORTRESS GATE", live: true },
  "ice-cavern": { stageId: "ice-cavern", objective: "ESCAPE THE COLLAPSE", signature: "CRYSTAL TUNNEL", live: true },
  "floating-ruins": { stageId: "floating-ruins", objective: "CHOOSE THE PORTAL", signature: "SKY LABYRINTH", live: true },
  "night-metro": { stageId: "night-metro", objective: "CATCH THE PHANTOM", signature: "NEON PURSUIT", live: true },
  "volcano-core": { stageId: "volcano-core", objective: "OUTRUN THE ERUPTION", signature: "MAGMA PRESSURE", live: true },
  "orbital-ascent": { stageId: "orbital-ascent", objective: "CLIMB THE DEBRIS SHAFT", signature: "ZERO-G ASCENT", live: true },
  "prism-citadel": { stageId: "prism-citadel", objective: "BREAK THE SEVEN SKIES", signature: "ROUTE REPRISE", live: true },
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

export const SKY_DANCER_ARCADE_V40_ICE_APERTURES: readonly SkyDancerArcadeV40IceApertureDefinition[] = [
  { index: 0, progress: .14, x: -.82, y: .18, driftAmplitude: .16, phase: .2, radiusX: .88, radiusY: .82, score: 1100 },
  { index: 1, progress: .185, x: .74, y: -.14, driftAmplitude: .22, phase: 1.35, radiusX: .8, radiusY: .75, score: 1350 },
  { index: 2, progress: .23, x: -.12, y: .34, driftAmplitude: .28, phase: 2.45, radiusX: .73, radiusY: .69, score: 1650 },
  { index: 3, progress: .275, x: .92, y: .04, driftAmplitude: .2, phase: 3.65, radiusX: .66, radiusY: .63, score: 2000 },
  { index: 4, progress: .325, x: -.66, y: -.24, driftAmplitude: .25, phase: 4.85, radiusX: .61, radiusY: .58, score: 2450 },
];
export const SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS = 4800;

export const SKY_DANCER_ARCADE_V40_FLOATING_PORTAL_PROGRESS = .235;
export const SKY_DANCER_ARCADE_V40_FLOATING_PORTALS: readonly SkyDancerArcadeV40PortalDefinition[] = [
  { index: 0, x: -1.32, y: .12, radius: .76, doctrine: "FLOW", label: "FLOW PORTAL", score: 1200, scoreMultiplier: 1, pressureScale: 1.18, hpRecovery: 14, turboRecovery: 24 },
  { index: 1, x: 0, y: -.05, radius: .72, doctrine: "SCORE", label: "SCORE PORTAL", score: 2600, scoreMultiplier: 1.22, pressureScale: .96, hpRecovery: 4, turboRecovery: 10 },
  { index: 2, x: 1.32, y: .14, radius: .68, doctrine: "DANGER", label: "DANGER PORTAL", score: 4200, scoreMultiplier: 1.38, pressureScale: .8, hpRecovery: 0, turboRecovery: 8 },
];

export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START = .11;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END = .37;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP = 72;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP = 11;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS = .65;
export const SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_SCORE = 5600;

export const SKY_DANCER_ARCADE_V40_MAGMA_START = .12;
export const SKY_DANCER_ARCADE_V40_MAGMA_END = .43;
export const SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD = 58;
export const SKY_DANCER_ARCADE_V40_MAGMA_SAFE_LEAD = 26;
export const SKY_DANCER_ARCADE_V40_MAGMA_ESCAPE_SCORE = 5400;

export const SKY_DANCER_ARCADE_V40_ORBIT_START = .1;
export const SKY_DANCER_ARCADE_V40_ORBIT_END = .42;
export const SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE = 100;
export const SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH = .86;
export const SKY_DANCER_ARCADE_V40_ORBIT_COMPLETE_SCORE = 6200;
export const SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS = 1.35;

export const SKY_DANCER_ARCADE_V40_PRISM_TRIALS: readonly SkyDancerArcadeV40PrismTrialDefinition[] = [
  { index: 0, progress: .105, x: -1.04, y: .18, radius: .82, score: 1250 },
  { index: 1, progress: .15, x: .86, y: -.2, radius: .77, score: 1450 },
  { index: 2, progress: .195, x: -.28, y: .38, radius: .73, score: 1700 },
  { index: 3, progress: .24, x: 1.02, y: .08, radius: .69, score: 2050 },
  { index: 4, progress: .285, x: -.92, y: -.27, radius: .65, score: 2400 },
  { index: 5, progress: .33, x: .36, y: .3, radius: .62, score: 2850 },
  { index: 6, progress: .375, x: 0, y: 0, radius: .58, score: 3600 },
];
export const SKY_DANCER_ARCADE_V40_PRISM_PERFECT_BONUS = 7800;
export const SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE: readonly SkyDancerArcadeStageId[] = [
  "dawn-city", "red-canyon", "storm-carrier", "ice-cavern", "night-metro", "orbital-ascent", "prism-citadel",
];

export function skyDancerArcadeV40OrbitalSafeX(stageTimeSeconds: number): number {
  const time = Math.max(0, stageTimeSeconds);
  return Math.sin(time * 1.55) * .86 + Math.sin(time * 3.8 + .7) * .18;
}

export function skyDancerArcadeV40PrismTrialAnchorDistance(
  trial: SkyDancerArcadeV40PrismTrialDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * trial.progress;
}

export function skyDancerArcadeV40PrismTrialStageId(route: readonly SkyDancerArcadeStageId[], index: number): SkyDancerArcadeStageId {
  if (index >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length - 1) return "prism-citadel";
  const flown = route.filter((stageId) => stageId !== "prism-citadel");
  return flown[index] ?? SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE[index] ?? "dawn-city";
}

function skyDancerArcadeV40StagePhase(stageId: SkyDancerArcadeStageId): number {
  let value = 0;
  for (let index = 0; index < stageId.length; index += 1) value += stageId.charCodeAt(index) * (index + 3);
  return value * .013;
}

export function skyDancerArcadeV40PrismTrialX(
  trial: SkyDancerArcadeV40PrismTrialDefinition,
  stageId: SkyDancerArcadeStageId,
  stageTimeSeconds: number,
): number {
  return trial.x + Math.sin(Math.max(0, stageTimeSeconds) * 1.72 + skyDancerArcadeV40StagePhase(stageId) + trial.index) * .18;
}

export function skyDancerArcadeV40PrismTrialY(
  trial: SkyDancerArcadeV40PrismTrialDefinition,
  stageId: SkyDancerArcadeStageId,
  stageTimeSeconds: number,
): number {
  return trial.y + Math.cos(Math.max(0, stageTimeSeconds) * 1.33 + skyDancerArcadeV40StagePhase(stageId) * .7 + trial.index) * .12;
}

export function skyDancerArcadeV40NeonPhantomX(stageTimeSeconds: number): number {
  const time = Math.max(0, stageTimeSeconds);
  return Math.sin(time * 2.45) * 1.22 + Math.sin(time * 5.1 + .8) * .24;
}

export function skyDancerArcadeV40NeonPhantomY(stageTimeSeconds: number): number {
  const time = Math.max(0, stageTimeSeconds);
  return Math.sin(time * 1.8 + 1.2) * .48 + Math.cos(time * 4.05 + .35) * .12;
}

export function skyDancerArcadeV40MagmaPressure(lead: number): number {
  return Math.max(0, Math.min(1, 1 - Math.max(0, lead) / SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD));
}

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

export function skyDancerArcadeV40IceApertureAnchorDistance(
  aperture: SkyDancerArcadeV40IceApertureDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * aperture.progress;
}

export function skyDancerArcadeV40IceApertureX(aperture: SkyDancerArcadeV40IceApertureDefinition, stageTimeSeconds: number): number {
  return aperture.x + Math.sin(Math.max(0, stageTimeSeconds) * 1.72 + aperture.phase) * aperture.driftAmplitude;
}

export function skyDancerArcadeV40IceApertureScale(depth: number): number {
  const approach = Math.max(0, Math.min(1, Math.max(0, depth) / 42));
  return .52 + approach * .48;
}

export function skyDancerArcadeV40FloatingPortalAnchorDistance(stageDurationSeconds: number, courseSpeed: number): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * SKY_DANCER_ARCADE_V40_FLOATING_PORTAL_PROGRESS;
}
