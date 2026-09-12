import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";
import type { SkyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";
import type {
  SkyDancerArcadeV4010FxClarity,
  SkyDancerArcadeV4010Profile,
} from "./SkyDancerArcadeV4010DynamicOcclusion";

export type SkyDancerArcadeV4011StressBand = "clear" | "busy" | "critical";

export interface SkyDancerArcadeV4011ForegroundEntity {
  x: number;
  y: number;
  depth: number;
  boss?: boolean;
  rivalAce?: boolean;
  worldBreakTarget?: boolean;
}

export interface SkyDancerArcadeV4011Input {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
  foregroundCraft: number;
  impactCount: number;
  destroyedImpacts: number;
  worldBreakLive: boolean;
  baseOcclusion: SkyDancerArcadeV4010Profile;
  baseClarity: SkyDancerArcadeV409PhoneClarity;
}

export interface SkyDancerArcadeV4011Profile {
  band: SkyDancerArcadeV4011StressBand;
  pressure: number;
  signalCount: number;
  occlusion: SkyDancerArcadeV4010Profile;
  clarity: SkyDancerArcadeV409PhoneClarity;
  fxClarity: SkyDancerArcadeV4010FxClarity;
  speedStreakAlpha: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Shared WebGL/Canvas count for incidental aircraft physically crossing the phone hero corridor. */
export function skyDancerArcadeV4011ForegroundCraftCount(
  entities: readonly SkyDancerArcadeV4011ForegroundEntity[],
  centerX: number,
  centerY: number,
): number {
  return entities.reduce((count, entity) => {
    if (entity.boss || entity.rivalAce || entity.worldBreakTarget) return count;
    if (entity.depth <= 1.5 || entity.depth >= 22) return count;
    const laneDistance = Math.hypot((entity.x - centerX) / 1.72, (entity.y - centerY) / 1.12);
    return count + (laneDistance < 1 ? 1 : 0);
  }, 0);
}

/**
 * V40.11 is a presentation stress governor, not a difficulty governor.
 * V40.10 remains authoritative for single-source clutter. This layer only adds suppression when
 * two or more independent signals overlap (close craft, incoming missiles, impact burst, authored focus).
 */
export function skyDancerArcadeV4011ScreenStress(input: SkyDancerArcadeV4011Input): SkyDancerArcadeV4011Profile {
  const base = (): SkyDancerArcadeV4011Profile => ({
    band: "clear",
    pressure: 0,
    signalCount: 0,
    occlusion: input.baseOcclusion,
    clarity: input.baseClarity,
    fxClarity: input.baseOcclusion.fxClarity,
    speedStreakAlpha: 1,
  });

  if (!input.compactLandscape || input.sceneMode === "handoff" || input.sceneMode === "finale") return base();

  const incoming = Math.max(0, Math.floor(input.incomingThreats));
  const foreground = Math.max(0, Math.floor(input.foregroundCraft));
  const impacts = Math.max(0, Math.floor(input.impactCount));
  const destroyed = Math.max(0, Math.floor(input.destroyedImpacts));
  const importantScene = input.sceneMode === "signature" || input.sceneMode === "rival" || input.sceneMode === "boss";
  const signalCount = Number(incoming >= 2)
    + Number(foreground >= 2)
    + Number(impacts >= 2 || destroyed >= 1)
    + Number(importantScene)
    + Number(input.worldBreakLive);

  // A lone cause is already handled by V40.9/V40.10. Avoid flattening normal spectacle.
  if (signalCount < 2) return { ...base(), signalCount };

  const threatLoad = clamp01((incoming - 1) / 4);
  const foregroundLoad = clamp01(foreground / 4);
  const impactLoad = clamp01((impacts + destroyed * 1.5) / 5);
  const authoredLoad = input.sceneMode === "boss" ? .27 : input.sceneMode === "rival" ? .21 : input.sceneMode === "signature" ? .15 : 0;
  const worldBreakLoad = input.worldBreakLive ? .1 : 0;
  const overlap = clamp01((signalCount - 1) / 4);
  const pressure = clamp01(
    threatLoad * .28
      + foregroundLoad * .25
      + impactLoad * .23
      + authoredLoad
      + worldBreakLoad
      + overlap * .12,
  );
  const critical = pressure >= .68;
  const busy = pressure >= .34;

  const baseFx = input.baseOcclusion.fxClarity;
  const fxClarity: SkyDancerArcadeV4010FxClarity = {
    smokeAlpha: clamp(baseFx.smokeAlpha * (1 - pressure * .3), .45, 1),
    sparkAlpha: clamp(baseFx.sparkAlpha * (1 - pressure * .09), .78, 1),
    missileSmokeAlpha: clamp(baseFx.missileSmokeAlpha * (1 - pressure * .2), .5, 1),
    // The readable ring/flash core survives even at maximum stress.
    detonationAlpha: clamp(baseFx.detonationAlpha * (1 - pressure * .08), .78, 1),
    debrisScale: clamp(baseFx.debrisScale * (1 - pressure * .12), .72, 1),
  };

  const occlusion: SkyDancerArcadeV4010Profile = {
    ...input.baseOcclusion,
    incidentalScaleFloor: clamp(input.baseOcclusion.incidentalScaleFloor - pressure * .08, .56, 1),
    incidentalAlphaFloor: clamp(input.baseOcclusion.incidentalAlphaFloor - pressure * .1, .6, 1),
    fxClarity,
  };

  const primaryCap = critical ? 1 : busy ? 2 : input.baseClarity.primaryLocks;
  const canvasCap = critical ? 1 : busy ? 2 : input.baseClarity.canvasLockLimit;
  const clarity: SkyDancerArcadeV409PhoneClarity = {
    ...input.baseClarity,
    primaryLocks: Math.max(1, Math.min(input.baseClarity.primaryLocks, primaryCap)),
    // Optional aim decoration yields first. Threat projectiles and protected targets are not removed.
    aimCues: busy ? 0 : input.baseClarity.aimCues,
    counterplayCues: Math.min(input.baseClarity.counterplayCues, 1),
    secondaryLockScale: input.baseClarity.secondaryLockScale * (1 - pressure * .14),
    cueOpacity: input.baseClarity.cueOpacity * (1 - pressure * .1),
    canvasLockLimit: Math.max(1, Math.min(input.baseClarity.canvasLockLimit, canvasCap)),
  };

  return {
    band: critical ? "critical" : busy ? "busy" : "clear",
    pressure,
    signalCount,
    occlusion,
    clarity,
    fxClarity,
    speedStreakAlpha: clamp(1 - pressure * .4, .58, 1),
  };
}
