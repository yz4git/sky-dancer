import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeFormation } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV12DirectorMode =
  | "adaptive-mix"
  | "armor-screen"
  | "hunter-sweep"
  | "jammer-net"
  | "relief-window"
  | "flow-run"
  | "showcase-break"
  | "climax-push";

export type SkyDancerArcadeV12PlayerStyle = "balanced" | "gun" | "missile" | "turbo" | "recover" | "flow" | "climax";
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

/**
 * V14 Hero Flow builds on the V13 flagship director.
 *
 * V13 proved that sustained mastery can turn the run into a showcase, but the jump from
 * ordinary adaptive combat to SHOWCASE BREAK was abrupt. V14 inserts FLOW RUN as a positive
 * mid-tier: once the player has a real chain, enemy choreography becomes cleaner and faster
 * before the full hero sequence is earned.
 *
 * RELIEF WINDOW remains the highest-priority rule. SHOWCASE BREAK and CLIMAX PUSH remain
 * rarer peak states; FLOW RUN never adds a health wall or extra wave count.
 */
export function skyDancerArcadeV12CombatPlan(signals: SkyDancerArcadeV12DirectorSignals): SkyDancerArcadeV12EncounterPlan {
  const gun = clamp(signals.gunHeat, 0, 3);
  const missile = clamp(signals.missileHeat, 0, 3);
  const turbo = clamp(signals.turboHeat, 0, 3);
  const hp = clamp(signals.hpRatio, 0, 1);
  const recentDamage = clamp(signals.recentDamage, 0, 2);
  const chain = clamp(signals.chain, 0, 20);
  const beatIntensity = clamp(signals.beatIntensity, 0, 1);
  const dominant = Math.max(gun, missile, turbo);
  const styleSpread = dominant - Math.min(gun, missile, turbo);
  const basePressure = beatIntensity * .55
    + chain * .026
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
      intensity: clamp(.42 + beatIntensity * .2, .42, .68),
      pressure: Math.min(.62, pressure),
      cadenceScale: 1.28,
      waveCountDelta: -2,
      counterplayDelay: 4.6,
      formationBias: ["line", "vee"],
      enemyBias: ["fighter", "interceptor"],
      maneuverBias: ["approach", "cross-pass"],
    };
  }

  // Reward mastery with a readable hero sequence instead of merely adding more health.
  // This state is deliberately driven by performance, not equipped loadout.
  if (chain >= 9 && beatIntensity >= .68 && hp >= .56 && recentDamage < .42) {
    return {
      mode: "showcase-break",
      playerStyle: "flow",
      label: "SHOWCASE BREAK",
      intent: "THREAD THE NEEDLE · KEEP FLOW",
      intensity: clamp(.76 + chain * .014 + beatIntensity * .12, .82, 1),
      pressure: clamp(Math.max(.84, pressure), .84, 1.16),
      cadenceScale: signals.hard ? .70 : .76,
      waveCountDelta: 1,
      counterplayDelay: .82,
      formationBias: ["cross", "spiral", "pincer", "vee"],
      enemyBias: ["interceptor", "ace", "fighter"],
      maneuverBias: ["overtake", "cross-pass", "close-bank", "parallel"],
    };
  }

  // The authored chase immediately before a climax target should feel like the trailer shot:
  // fast crossings, one heavy screen, then a clean lane into the boss reveal.
  if (beatIntensity >= .96 && chain >= 3 && hp >= .56 && recentDamage < .56) {
    return {
      mode: "climax-push",
      playerStyle: "climax",
      label: "CLIMAX PUSH",
      intent: "BREAK THE SCREEN · TAKE THE CENTER",
      intensity: 1,
      pressure: clamp(Math.max(1.02, pressure), 1.02, 1.22),
      cadenceScale: signals.hard ? .66 : .72,
      waveCountDelta: 1,
      counterplayDelay: .7,
      formationBias: ["wall", "pincer", "cross", "spiral"],
      enemyBias: ["ace", "missile-boat", "interceptor", "bomber"],
      maneuverBias: ["cross-pass", "close-bank", "overtake", "parallel"],
    };
  }

  // V14's missing middle gear. A five-plus chain should already change how the run feels,
  // but it should not steal the established gun/missile/turbo counter-game. FLOW RUN only
  // takes ownership when live weapon usage is reasonably balanced.
  if (chain >= 5 && beatIntensity >= .62 && hp >= .52 && recentDamage < .5 && styleSpread <= .62) {
    return {
      mode: "flow-run",
      playerStyle: "flow",
      label: "FLOW RUN",
      intent: "BANK THROUGH · BUILD SHOWCASE",
      intensity: clamp(.68 + chain * .018 + beatIntensity * .12, .72, .92),
      pressure: clamp(Math.max(.72, pressure), .72, 1.02),
      cadenceScale: signals.hard ? .77 : .84,
      waveCountDelta: 0,
      counterplayDelay: 1.18,
      formationBias: ["cross", "vee", "spiral", "pincer"],
      enemyBias: ["interceptor", "fighter", "ace"],
      maneuverBias: ["overtake", "parallel", "cross-pass", "close-bank"],
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
