import type {
  SkyDancerArcadeEnemyKind,
  SkyDancerArcadeHazardKind,
  SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type { SkyDancerArcadeBossPhase } from "./SkyDancerArcadeV10Systems";

export type SkyDancerArcadeV11BossMotionStyle =
  | "duel"
  | "drill"
  | "broadside"
  | "carrier"
  | "wall"
  | "serpent"
  | "guardian"
  | "phantom"
  | "eruption"
  | "lance"
  | "sovereign";

export interface SkyDancerArcadeV11BossProfile {
  stageId: SkyDancerArcadeStageId;
  motionStyle: SkyDancerArcadeV11BossMotionStyle;
  mechanicLabels: readonly [string, string, string];
  depthTargets: readonly [number, number, number];
  depthSpeeds: readonly [number, number, number];
  xFollow: readonly [number, number, number];
  yFollow: readonly [number, number, number];
  frequencyScale: readonly [number, number, number];
  amplitudeScale: readonly [number, number, number];
  verticalAmplitude: readonly [number, number, number];
  fireCadenceScale: readonly [number, number, number];
  spreadBonus: readonly [number, number, number];
  guidanceScale: readonly [number, number, number];
  projectileSpeedScale: readonly [number, number, number];
  spreadX: readonly [number, number, number];
  spreadY: readonly [number, number, number];
  weakpointPeriod: readonly [number, number, number];
  weakpointWindow: readonly [number, number, number];
  phaseHazards: readonly [SkyDancerArcadeHazardKind | null, SkyDancerArcadeHazardKind | null, SkyDancerArcadeHazardKind | null];
  phaseHazardBursts: readonly [number, number, number];
  escortKinds: readonly [SkyDancerArcadeEnemyKind | null, SkyDancerArcadeEnemyKind | null, SkyDancerArcadeEnemyKind | null];
  escortCounts: readonly [number, number, number];
  intensity: readonly [number, number, number];
}

const p = (
  stageId: SkyDancerArcadeStageId,
  motionStyle: SkyDancerArcadeV11BossMotionStyle,
  mechanicLabels: readonly [string, string, string],
  depthTargets: readonly [number, number, number],
  depthSpeeds: readonly [number, number, number],
  xFollow: readonly [number, number, number],
  yFollow: readonly [number, number, number],
  frequencyScale: readonly [number, number, number],
  amplitudeScale: readonly [number, number, number],
  verticalAmplitude: readonly [number, number, number],
  fireCadenceScale: readonly [number, number, number],
  spreadBonus: readonly [number, number, number],
  guidanceScale: readonly [number, number, number],
  projectileSpeedScale: readonly [number, number, number],
  spreadX: readonly [number, number, number],
  spreadY: readonly [number, number, number],
  weakpointPeriod: readonly [number, number, number],
  weakpointWindow: readonly [number, number, number],
  phaseHazards: SkyDancerArcadeV11BossProfile["phaseHazards"],
  phaseHazardBursts: readonly [number, number, number],
  escortKinds: SkyDancerArcadeV11BossProfile["escortKinds"],
  escortCounts: readonly [number, number, number],
  intensity: readonly [number, number, number],
): SkyDancerArcadeV11BossProfile => ({
  stageId, motionStyle, mechanicLabels, depthTargets, depthSpeeds, xFollow, yFollow,
  frequencyScale, amplitudeScale, verticalAmplitude, fireCadenceScale, spreadBonus,
  guidanceScale, projectileSpeedScale, spreadX, spreadY, weakpointPeriod, weakpointWindow,
  phaseHazards, phaseHazardBursts, escortKinds, escortCounts, intensity,
});

const PROFILES: Record<SkyDancerArcadeStageId, SkyDancerArcadeV11BossProfile> = {
  "dawn-city": p("dawn-city", "duel", ["MATCH SPEED", "CROSSING FIRE", "FINAL MERGE"],
    [30,23.5,18.5],[22,26,30],[.78,.84,.9],[.68,.72,.78],[1.34,1.52,1.72],[1.12,1.22,1.34],[.82,.92,1.02],
    [.92,.80,.68],[0,0,1],[1.02,1.10,1.16],[1.02,1.08,1.14],[.18,.25,.3],[.09,.14,.18],[99,2.5,1.85],[0,1.08,1.02],
    [null,"debris","mine"],[0,1,1],[null,"interceptor","ace"],[0,1,1],[.62,.82,1]),
  "red-canyon": p("red-canyon", "drill", ["DRILL SURGE", "ROCKFALL WAKE", "CORE RAM"],
    [35,28,20.5],[16,22,29],[.28,.34,.42],[.28,.34,.42],[.78,.94,1.12],[.72,.88,1.04],[.42,.54,.66],
    [1.04,.88,.72],[0,0,1],[.92,1.00,1.08],[.96,1.06,1.16],[.22,.3,.38],[.08,.13,.18],[99,3.15,2.25],[0,.88,1.02],
    [null,"rock","debris"],[0,1,2],[null,null,"bomber"],[0,0,1],[.58,.8,1]),
  "cloud-fleet": p("cloud-fleet", "broadside", ["PORT BROADSIDE", "ESCORT SCREEN", "ENGINE CORE"],
    [37,31,26],[15,18,22],[.18,.24,.32],[.22,.28,.34],[.62,.76,.92],[1.08,1.18,1.28],[.34,.42,.52],
    [1.02,.88,.76],[1,1,2],[.88,.96,1.04],[.94,1.02,1.10],[.34,.42,.5],[.05,.08,.12],[99,3.0,2.25],[0,1.0,1.12],
    [null,"debris","mine"],[0,1,1],[null,"fighter","interceptor"],[0,2,2],[.56,.78,1]),
  "storm-carrier": p("storm-carrier", "carrier", ["THUNDER SHIELD", "LIGHTNING GRID", "EYE OF STORM"],
    [36,29,24],[16,21,25],[.34,.42,.5],[.3,.38,.48],[.9,1.08,1.28],[.92,1.05,1.18],[.56,.72,.9],
    [.96,.76,.62],[0,1,2],[1.08,1.18,1.3],[1.02,1.12,1.24],[.22,.28,.34],[.18,.24,.32],[99,2.8,2.0],[0,.94,1.12],
    [null,"lightning","lightning"],[0,1,2],[null,"missile-boat","interceptor"],[0,1,1],[.64,.84,1]),
  "desert-fortress": p("desert-fortress", "wall", ["FORTRESS WALL", "MISSILE BASTION", "GOLDEN CORE"],
    [39,33,27],[14,17,21],[.16,.2,.26],[.2,.24,.3],[.58,.7,.84],[.58,.72,.86],[.28,.36,.44],
    [1.08,.82,.66],[0,1,2],[1.04,1.16,1.28],[.9,1.0,1.12],[.38,.48,.56],[.04,.07,.1],[99,3.25,2.4],[0,.82,1.0],
    [null,"mine","tower"],[0,1,1],[null,"missile-boat","bomber"],[0,1,1],[.54,.78,1]),
  "ice-cavern": p("ice-cavern", "serpent", ["SERPENT TRACE", "CRYSTAL SHED", "WHITEOUT COIL"],
    [33,27,22],[18,23,28],[.42,.5,.58],[.4,.5,.62],[1.08,1.28,1.5],[1.02,1.16,1.3],[.92,1.08,1.24],
    [.96,.78,.64],[0,0,1],[1.02,1.12,1.22],[.98,1.08,1.18],[.2,.28,.34],[.16,.22,.28],[99,2.7,1.95],[0,1.02,1.08],
    [null,"rock","arch"],[0,1,1],[null,"interceptor","ace"],[0,1,1],[.6,.82,1]),
  "floating-ruins": p("floating-ruins", "guardian", ["AEON SHIFT", "PORTAL CROSS", "GUARDIAN CORE"],
    [35,28,23],[16,22,26],[.32,.38,.46],[.3,.38,.46],[.92,1.16,1.42],[.94,1.08,1.22],[.5,.66,.82],
    [1.0,.78,.64],[0,1,1],[1.08,1.18,1.3],[.96,1.08,1.18],[.24,.32,.4],[.11,.17,.23],[99,2.95,2.05],[0,.9,1.08],
    [null,"arch","mine"],[0,1,1],[null,"fighter","ace"],[0,1,1],[.58,.8,1]),
  "night-metro": p("night-metro", "phantom", ["GHOST LOCK", "PHANTOM CROSS", "MIDNIGHT MERGE"],
    [31,24,18],[20,26,32],[.66,.78,.9],[.58,.68,.8],[1.28,1.55,1.86],[1.08,1.24,1.38],[.7,.86,1.02],
    [.88,.68,.56],[0,1,1],[1.16,1.28,1.38],[1.06,1.16,1.28],[.2,.3,.38],[.12,.18,.24],[99,2.45,1.7],[0,1.04,.98],
    [null,"debris","mine"],[0,1,1],[null,"interceptor","ace"],[0,1,1],[.66,.86,1]),
  "volcano-core": p("volcano-core", "eruption", ["MAGMA SHELL", "ERUPTION PULSE", "CORE OVERHEAT"],
    [36,29,22],[16,21,28],[.24,.3,.38],[.34,.42,.52],[.82,1.0,1.24],[.7,.84,1.02],[.82,1.02,1.24],
    [1.0,.72,.56],[0,1,2],[1.1,1.24,1.38],[1.0,1.12,1.24],[.2,.28,.36],[.2,.3,.42],[99,2.85,1.9],[0,.94,1.1],
    [null,"rock","lightning"],[0,1,2],[null,"bomber","ace"],[0,1,1],[.62,.84,1]),
  "orbital-ascent": p("orbital-ascent", "lance", ["LANCE SWEEP", "DEBRIS CAGE", "ZERO-G SPEAR"],
    [34,27,20],[18,24,30],[.28,.34,.42],[.18,.22,.28],[.96,1.18,1.44],[.76,.92,1.08],[1.0,1.18,1.36],
    [.94,.72,.58],[0,1,2],[1.16,1.3,1.42],[1.1,1.22,1.34],[.12,.18,.24],[.32,.42,.52],[99,2.65,1.8],[0,.94,1.0],
    [null,"debris","mine"],[0,1,2],[null,"missile-boat","ace"],[0,1,1],[.64,.86,1]),
  "prism-citadel": p("prism-citadel", "sovereign", ["PRISM ARMOR", "SEVEN SKY ECHO", "SOVEREIGN OVERDRIVE"],
    [34,25,17.5],[19,27,34],[.48,.62,.76],[.42,.56,.7],[1.05,1.36,1.72],[1.02,1.24,1.46],[.72,.94,1.18],
    [.9,.64,.48],[1,2,2],[1.18,1.34,1.5],[1.08,1.24,1.42],[.26,.38,.5],[.18,.3,.44],[99,2.55,1.65],[0,.9,.94],
    [null,"arch","mine"],[0,1,2],[null,"ace","missile-boat"],[0,2,2],[.7,.9,1]),
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function skyDancerArcadeV11BossProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV11BossProfile {
  return PROFILES[stageId];
}

export function skyDancerArcadeV11BossMechanicLabel(stageId: SkyDancerArcadeStageId, phase: SkyDancerArcadeBossPhase): string {
  return PROFILES[stageId].mechanicLabels[phase - 1];
}

export function skyDancerArcadeV11BossWeakpointOpen(stageId: SkyDancerArcadeStageId, phase: SkyDancerArcadeBossPhase, age: number): boolean {
  if (phase === 1) return false;
  const profile = PROFILES[stageId];
  const period = profile.weakpointPeriod[phase - 1];
  const window = profile.weakpointWindow[phase - 1];
  const cycle = ((age % period) + period) % period;
  return cycle >= period - window;
}

export function skyDancerArcadeV11BossMotion(
  stageId: SkyDancerArcadeStageId,
  phase: SkyDancerArcadeBossPhase,
  age: number,
  playerX: number,
  playerY: number,
  authoredAmplitude: number,
  stagger: number,
): { x: number; y: number; depthTarget: number; depthSpeed: number } {
  const profile = PROFILES[stageId];
  const index = phase - 1;
  const f = (.68 + index * .12) * profile.frequencyScale[index];
  const amp = authoredAmplitude * profile.amplitudeScale[index] * (1 - clamp(stagger, 0, 1) * .16);
  const vertical = profile.verticalAmplitude[index];
  let xWave = Math.sin(age * f + .35) * amp;
  let yWave = Math.sin(age * f * 1.16 + 1.3) * vertical;
  let depthPulse = 0;

  switch (profile.motionStyle) {
    case "duel":
      xWave += Math.sin(age * f * 2.25) * .22;
      yWave += Math.cos(age * f * 1.65) * .18;
      break;
    case "drill":
      xWave *= .48;
      yWave *= .52;
      depthPulse = Math.sin(age * f * .76) * (1.3 + index * .8);
      break;
    case "broadside":
      xWave = Math.sin(age * f) * amp * 1.22;
      yWave *= .44;
      depthPulse = Math.cos(age * f * .55) * .9;
      break;
    case "carrier":
      xWave = Math.sin(age * f) * amp * .86 + Math.sin(age * f * .43) * .34;
      yWave = Math.cos(age * f * .82 + .5) * vertical * .78;
      break;
    case "wall":
      xWave *= .38;
      yWave *= .38;
      depthPulse = Math.max(0, Math.sin(age * f * .62)) * -1.6 * (1 + index * .35);
      break;
    case "serpent":
      xWave = Math.sin(age * f) * amp * 1.08;
      yWave = Math.sin(age * f * 1.42 + Math.PI * .5) * vertical;
      break;
    case "guardian":
      xWave = Math.tanh(Math.sin(age * f) * 2.2) * amp * .92;
      yWave = Math.cos(age * f * .77 + 1.1) * vertical * .78;
      break;
    case "phantom":
      xWave = Math.sin(age * f) * amp + Math.sin(age * f * 2.8 + .8) * (.28 + index * .08);
      yWave = Math.sin(age * f * 1.9 + 1.6) * vertical;
      break;
    case "eruption":
      xWave *= .56;
      yWave = Math.sin(age * f * 1.32) * vertical * 1.12;
      depthPulse = Math.sin(age * f * .58) * (1 + index * .65);
      break;
    case "lance":
      xWave *= .58;
      yWave = Math.sin(age * f) * vertical * 1.3 + Math.sin(age * f * 2.2) * .22;
      break;
    case "sovereign":
      xWave = Math.sin(age * f) * amp + Math.sin(age * f * 2.17 + .9) * (.34 + index * .1);
      yWave = Math.cos(age * f * 1.31) * vertical + Math.sin(age * f * 2.6) * (.18 + index * .08);
      depthPulse = Math.sin(age * f * .72) * (1.1 + index * .55);
      break;
  }

  return {
    x: clamp(playerX * profile.xFollow[index] + xWave, -2.58, 2.58),
    y: clamp(playerY * profile.yFollow[index] + yWave, -2.02, 2.02),
    depthTarget: profile.depthTargets[index] + depthPulse,
    depthSpeed: profile.depthSpeeds[index],
  };
}
