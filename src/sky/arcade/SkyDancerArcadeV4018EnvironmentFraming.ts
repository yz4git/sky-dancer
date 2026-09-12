import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV4012RhythmPhase } from "./SkyDancerArcadeV4012RunRhythm";

export interface SkyDancerArcadeV4018EnvironmentFramingInput {
  compactLandscape: boolean;
  stageBiome: SkyDancerArcadeStageDefinition["biome"];
  stageOrder: number;
  rhythmPhase: SkyDancerArcadeV4012RhythmPhase;
}

export interface SkyDancerArcadeV4018EnvironmentFramingProfile {
  pressure: number;
  chunkSpreadX: number;
  backdropSpreadX: number;
  backdropShiftX: number;
}

export const SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING: SkyDancerArcadeV4018EnvironmentFramingProfile = {
  pressure: 0,
  chunkSpreadX: 1,
  backdropSpreadX: 1,
  backdropShiftX: 0,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function biomeWeight(biome: SkyDancerArcadeStageDefinition["biome"]): number {
  switch (biome) {
    case "storm": return 1;
    case "citadel": return .92;
    case "cloud": return .9;
    case "ruins": return .78;
    case "ice": return .74;
    case "volcano": return .68;
    case "night": return .65;
    case "desert": return .6;
    case "canyon": return .55;
    case "orbit": return .5;
    case "city": return .45;
    default: return .5;
  }
}

function phaseWeight(phase: SkyDancerArcadeV4012RhythmPhase): number {
  switch (phase) {
    case "signature": return .08;
    case "rival": return .12;
    case "boss-rise": return 1;
    case "boss": return .82;
    default: return 0;
  }
}

/**
 * V40.18 opens the phone hero corridor before and during climax beats by reframing decorative world layers.
 * Collision-bearing route geometry and hazards are deliberately outside this profile.
 */
export function skyDancerArcadeV4018EnvironmentFraming(
  input: SkyDancerArcadeV4018EnvironmentFramingInput,
): SkyDancerArcadeV4018EnvironmentFramingProfile {
  if (!input.compactLandscape) return SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING;
  const pressure = clamp01(phaseWeight(input.rhythmPhase) * biomeWeight(input.stageBiome));
  if (pressure <= .001) return SKY_DANCER_ARCADE_V4018_IDENTITY_FRAMING;

  const strongSideScenery = input.stageBiome === "cloud"
    || input.stageBiome === "storm"
    || input.stageBiome === "ruins"
    || input.stageBiome === "citadel";
  const chunkGain = strongSideScenery ? .18 : .12;
  const backdropShiftMagnitude = strongSideScenery ? 9 : 6;
  const backdropSide = input.stageOrder % 2 === 0 ? 1 : -1;

  return {
    pressure,
    chunkSpreadX: 1 + pressure * chunkGain,
    backdropSpreadX: 1 + pressure * .07,
    backdropShiftX: backdropSide * pressure * backdropShiftMagnitude,
  };
}
