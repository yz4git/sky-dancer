import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeFormation } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV12DirectorMode =
  | "adaptive-mix"
  | "armor-screen"
  | "hunter-sweep"
  | "jammer-net"
  | "relief-window";

export type SkyDancerArcadeV12PlayerStyle = "balanced" | "gun" | "missile" | "turbo" | "recover";
export type SkyDancerArcadeV12Maneuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";

export interface SkyDancerArcadeV12DirectorSignals {
  gunHeat: number;
  missileHeat: number;
  turboHeat: number;
  recentDamage: number;
  hpRatio: number;
  chain: number;
  beatIntensity: number;
  hard: boolean;
}

export interface SkyDancerArcadeV12EncounterPlan {
  mode: SkyDancerArcadeV12DirectorMode;
  playerStyle: SkyDancerArcadeV12PlayerStyle;
  label: string;
  intent: string;
  intensity: number;
  pressure: number;
  cadenceScale: number;
  waveCountDelta: number;
  counterplayDelay: number;
  formationBias: readonly SkyDancerArcadeFormation[];
  enemyBias: readonly SkyDancerArcadeEnemyKind[];
  maneuverBias: readonly SkyDancerArcadeV12Maneuver[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function skyDancerArcadeV12CombatPlan(signals: SkyDancerArcadeV12DirectorSignals): SkyDancerArcadeV12EncounterPlan {
  const gun = clamp(signals.gunHeat, 0, 3);
  const missile = clamp(signals.missileHeat, 0, 3);
  const turbo = clamp(signals.turboHeat, 0, 3);
  const hp = clamp(signals.hpRatio, 0, 1);
  const recentDamage = clamp(signals.recentDamage, 0, 2);
  const dominant = Math.max(gun, missile, turbo);
  const basePressure = signals.beatIntensity * .55
    + clamp(signals.chain, 0, 12) * .026
    + dominant * .13
    + (signals.hard ? .12 : 0)
    - (1 - hp) * .2
    - Math.min(1.25, recentDamage) * .15;
  const pressure = clamp(basePressure, .28, 1.22);
  const intensity = clamp(.42 + pressure * .48, .45, 1);

  // The director never snowballs a player who is already losing control.
  if (hp < .36 || recentDamage > 1.02) {
    return {
      mode: "relief-window",
      playerStyle: "recover",
      label: "RELIEF WINDOW",
      intent: "LIGHT SCREEN · REBUILD TURBO",
      intensity: clamp(.42 + signals.beatIntensity * .2, .42, .68),
      pressure: Math.min(.62, pressure),
      cadenceScale: 1.28,
      waveCountDelta: -2,
      counterplayDelay: 4.6,
      formationBias: ["line", "vee"],
      enemyBias: ["fighter", "interceptor"],
      maneuverBias: ["approach", "cross-pass"],
    };
  }

  if (gun >= missile + .24 && gun >= turbo + .18 && gun > .58) {
    return {
      mode: "armor-screen",
      playerStyle: "gun",
      label: "ARMOR SCREEN",
      intent: "HEAVIES BRACE · BREAK THE LINE",
      intensity,
      pressure,
      cadenceScale: pressure > .86 ? .88 : .96,
      waveCountDelta: pressure > .92 ? 1 : 0,
      counterplayDelay: .72,
      formationBias: ["wall", "pincer", "line"],
      enemyBias: ["bomber", "missile-boat", "ace", "interceptor"],
      maneuverBias: ["parallel", "close-bank", "cross-pass"],
    };
  }

  if (missile >= gun + .2 && missile >= turbo + .14 && missile > .52) {
    return {
      mode: "hunter-sweep",
      playerStyle: "missile",
      label: "HUNTER SWEEP",
      intent: "FAST CROSSING · HOLD TRACK",
      intensity,
      pressure,
      cadenceScale: pressure > .84 ? .86 : .94,
      waveCountDelta: pressure > .96 ? 1 : 0,
      counterplayDelay: .62,
      formationBias: ["spiral", "cross", "pincer"],
      enemyBias: ["interceptor", "ace", "fighter"],
      maneuverBias: ["cross-pass", "overtake", "close-bank"],
    };
  }

  if (turbo >= gun + .18 && turbo >= missile + .12 && turbo > .54) {
    return {
      mode: "jammer-net",
      playerStyle: "turbo",
      label: "JAMMER NET",
      intent: "CUT THE JAMMER · KEEP MOMENTUM",
      intensity,
      pressure,
      cadenceScale: pressure > .86 ? .89 : .97,
      waveCountDelta: pressure > .9 ? 1 : 0,
      counterplayDelay: .66,
      formationBias: ["pincer", "wall", "vee"],
      enemyBias: ["missile-boat", "bomber", "ace"],
      maneuverBias: ["parallel", "cross-pass", "close-bank"],
    };
  }

  return {
    mode: "adaptive-mix",
    playerStyle: "balanced",
    label: "MIXED ASSAULT",
    intent: "READ FORMATION · CHOOSE TOOL",
    intensity,
    pressure,
    cadenceScale: pressure > .9 ? .92 : 1,
    waveCountDelta: pressure > 1.04 ? 1 : 0,
    counterplayDelay: 1.08,
    formationBias: ["vee", "cross", "spiral"],
    enemyBias: [],
    maneuverBias: ["close-bank", "cross-pass", "parallel", "overtake"],
  };
}
