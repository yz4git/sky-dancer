import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";

export interface SkyDancerArcadeV4010FxClarity {
  smokeAlpha: number;
  sparkAlpha: number;
  missileSmokeAlpha: number;
  detonationAlpha: number;
  debrisScale: number;
}

export interface SkyDancerArcadeV4010Profile {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incidentalScaleFloor: number;
  incidentalAlphaFloor: number;
  fxClarity: SkyDancerArcadeV4010FxClarity;
}

export interface SkyDancerArcadeV4010Input {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
}

export interface SkyDancerArcadeV4010EntityInput {
  profile: SkyDancerArcadeV4010Profile;
  protectedTarget: boolean;
  entityX: number;
  entityY: number;
  entityDepth: number;
  centerX: number;
  centerY: number;
  focusX: number;
  focusY: number;
  focusDepth: number;
  hasFocusTarget: boolean;
}

export interface SkyDancerArcadeV4010EntityOcclusion {
  scale: number;
  alpha: number;
  pressure: number;
}

export const SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY: SkyDancerArcadeV4010FxClarity = {
  smokeAlpha: 1,
  sparkAlpha: 1,
  missileSmokeAlpha: 1,
  detonationAlpha: 1,
  debrisScale: 1,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * V40.10 is presentation-only. It keeps authored impact energy, but suppresses the visual layers
 * most likely to cover a phone-sized target corridor: smoke first, then incidental foreground craft.
 */
export function skyDancerArcadeV4010DynamicOcclusion(input: SkyDancerArcadeV4010Input): SkyDancerArcadeV4010Profile {
  if (!input.compactLandscape) {
    return {
      compactLandscape: false,
      sceneMode: input.sceneMode,
      incidentalScaleFloor: 1,
      incidentalAlphaFloor: 1,
      fxClarity: SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,
    };
  }

  let incidentalScaleFloor = .9;
  let incidentalAlphaFloor = .88;
  let fxClarity: SkyDancerArcadeV4010FxClarity = {
    smokeAlpha: .92,
    sparkAlpha: .97,
    missileSmokeAlpha: .93,
    detonationAlpha: .97,
    debrisScale: .95,
  };

  switch (input.sceneMode) {
    case "signature":
      incidentalScaleFloor = .82;
      incidentalAlphaFloor = .8;
      fxClarity = { smokeAlpha: .74, sparkAlpha: .91, missileSmokeAlpha: .83, detonationAlpha: .92, debrisScale: .9 };
      break;
    case "rival":
      incidentalScaleFloor = .76;
      incidentalAlphaFloor = .74;
      fxClarity = { smokeAlpha: .68, sparkAlpha: .89, missileSmokeAlpha: .79, detonationAlpha: .9, debrisScale: .87 };
      break;
    case "boss":
      incidentalScaleFloor = .7;
      incidentalAlphaFloor = .7;
      fxClarity = { smokeAlpha: .62, sparkAlpha: .87, missileSmokeAlpha: .75, detonationAlpha: .88, debrisScale: .84 };
      break;
    case "handoff":
    case "finale":
      incidentalScaleFloor = .92;
      incidentalAlphaFloor = .9;
      fxClarity = { ...SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY };
      break;
    default:
      break;
  }

  const threatPressure = clamp01((Math.max(0, Math.floor(input.incomingThreats)) - 1) / 3);
  if (threatPressure > 0) {
    incidentalScaleFloor = Math.max(.64, incidentalScaleFloor - .06 * threatPressure);
    incidentalAlphaFloor = Math.max(.66, incidentalAlphaFloor - .06 * threatPressure);
    fxClarity = {
      smokeAlpha: Math.max(.5, fxClarity.smokeAlpha * (1 - .18 * threatPressure)),
      sparkAlpha: Math.max(.8, fxClarity.sparkAlpha * (1 - .07 * threatPressure)),
      missileSmokeAlpha: Math.max(.62, fxClarity.missileSmokeAlpha * (1 - .12 * threatPressure)),
      detonationAlpha: Math.max(.82, fxClarity.detonationAlpha * (1 - .05 * threatPressure)),
      debrisScale: Math.max(.78, fxClarity.debrisScale * (1 - .08 * threatPressure)),
    };
  }

  return { compactLandscape: true, sceneMode: input.sceneMode, incidentalScaleFloor, incidentalAlphaFloor, fxClarity };
}

/**
 * Only an incidental craft that is both close and crossing the protected sightline is reduced.
 * Priority targets and primary lock cues always stay at full presence.
 */
export function skyDancerArcadeV4010EntityOcclusion(input: SkyDancerArcadeV4010EntityInput): SkyDancerArcadeV4010EntityOcclusion {
  if (!input.profile.compactLandscape || input.protectedTarget) return { scale: 1, alpha: 1, pressure: 0 };

  const playerLane = 1 - clamp01(Math.hypot(
    (input.entityX - input.centerX) / 1.55,
    (input.entityY - input.centerY) / 1.05,
  ));
  const foreground = clamp01((34 - input.entityDepth) / 30);
  let focusPressure = 0;

  if (input.hasFocusTarget) {
    const focusLane = 1 - clamp01(Math.hypot(
      (input.entityX - input.focusX) / 1.4,
      (input.entityY - input.focusY) / 1.0,
    ));
    const inFrontOfFocus = clamp01((input.focusDepth - input.entityDepth + 4) / 18);
    focusPressure = focusLane * inFrontOfFocus;
  }

  const pressure = clamp01(Math.max(playerLane * foreground * .78, focusPressure));
  return {
    scale: clamp(1 - (1 - input.profile.incidentalScaleFloor) * pressure, input.profile.incidentalScaleFloor, 1),
    alpha: clamp(1 - (1 - input.profile.incidentalAlphaFloor) * pressure, input.profile.incidentalAlphaFloor, 1),
    pressure,
  };
}
