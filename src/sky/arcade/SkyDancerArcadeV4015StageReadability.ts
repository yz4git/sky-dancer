import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV4010FxClarity } from "./SkyDancerArcadeV4010DynamicOcclusion";
import type { SkyDancerArcadeV4012RhythmPhase } from "./SkyDancerArcadeV4012RunRhythm";

export interface SkyDancerArcadeV4015Input {
  compactLandscape: boolean;
  stageId: SkyDancerArcadeStageId;
  rhythmPhase: SkyDancerArcadeV4012RhythmPhase;
  screenStress: number;
  bossActive: boolean;
  turboActive: boolean;
  baseFxClarity: SkyDancerArcadeV4010FxClarity;
  baseSpeedLineAlpha: number;
}

export interface SkyDancerArcadeV4015Profile {
  focusPressure: number;
  stageNoise: number;
  fxClarity: SkyDancerArcadeV4010FxClarity;
  speedLineAlpha: number;
}

const STAGE_NOISE: Record<SkyDancerArcadeStageId, number> = {
  "dawn-city": .08,
  "red-canyon": .16,
  "cloud-fleet": .27,
  "storm-carrier": .34,
  "desert-fortress": .17,
  "ice-cavern": .29,
  "floating-ruins": .21,
  "night-metro": .22,
  "volcano-core": .32,
  "orbital-ascent": .07,
  "prism-citadel": .3,
};

const PHASE_FOCUS: Record<SkyDancerArcadeV4012RhythmPhase, number> = {
  opening: 0,
  build: .04,
  signature: .15,
  release: 0,
  rival: .19,
  "boss-rise": .28,
  boss: .32,
  handoff: 0,
  finale: 0,
};

const KEY_PHASES = new Set<SkyDancerArcadeV4012RhythmPhase>(["signature", "rival", "boss-rise", "boss"]);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(value, 0, 1);

/**
 * V40.15 keeps each stage's authored identity while creating a cleaner hero corridor when the
 * player must read a signature target, rival or boss on a phone-sized landscape viewport.
 * It is presentation-only: simulation, spawns, hit rules, difficulty and timing are untouched.
 */
export function skyDancerArcadeV4015StageReadability(input: SkyDancerArcadeV4015Input): SkyDancerArcadeV4015Profile {
  const stageNoise = STAGE_NOISE[input.stageId];
  const preserveExitShot = input.rhythmPhase === "handoff" || input.rhythmPhase === "finale";
  if (!input.compactLandscape || preserveExitShot) {
    return {
      focusPressure: 0,
      stageNoise,
      fxClarity: { ...input.baseFxClarity },
      speedLineAlpha: clamp01(input.baseSpeedLineAlpha),
    };
  }

  const keyPhase = KEY_PHASES.has(input.rhythmPhase);
  const stageContribution = stageNoise * (keyPhase ? .72 : .2);
  const phaseContribution = PHASE_FOCUS[input.rhythmPhase];
  const stressContribution = clamp01(input.screenStress) * .28;
  const bossContribution = input.bossActive ? .08 : 0;
  const focusPressure = clamp01(stageContribution + phaseContribution + stressContribution + bossContribution);

  // Smoke, missile exhaust and loose debris yield first. Hot sparks and detonation cores stay bold
  // so hits still feel powerful while the target silhouette remains readable.
  const fxClarity: SkyDancerArcadeV4010FxClarity = {
    smokeAlpha: clamp(input.baseFxClarity.smokeAlpha * (1 - focusPressure * .26), .42, 1),
    sparkAlpha: clamp(input.baseFxClarity.sparkAlpha * (1 - focusPressure * .055), .76, 1),
    missileSmokeAlpha: clamp(input.baseFxClarity.missileSmokeAlpha * (1 - focusPressure * .18), .48, 1),
    detonationAlpha: clamp(input.baseFxClarity.detonationAlpha * (1 - focusPressure * .045), .78, 1),
    debrisScale: clamp(input.baseFxClarity.debrisScale * (1 - focusPressure * .14), .7, 1),
  };

  // Turbo must still feel fast. During non-turbo focus beats the speed lines can recede further.
  const speedFloor = input.turboActive ? .5 : .4;
  const speedLineAlpha = clamp(input.baseSpeedLineAlpha * (1 - focusPressure * .36), speedFloor, 1);

  return { focusPressure, stageNoise, fxClarity, speedLineAlpha };
}
