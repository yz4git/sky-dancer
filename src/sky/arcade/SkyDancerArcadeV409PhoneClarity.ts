import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";

export interface SkyDancerArcadeV409PhoneClarityInput {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
}

export interface SkyDancerArcadeV409PhoneClarity {
  primaryLocks: number;
  aimCues: number;
  counterplayCues: number;
  secondaryLockScale: number;
  cueOpacity: number;
  canvasLockLimit: number;
}

/**
 * V40.9 is presentation-only. Logical locks, missiles, hazards, collisions and enemy counts stay untouched;
 * this only chooses how many helper markers are allowed to compete for an iPhone landscape frame.
 * V40.19 keeps the single boss attack cue strong even when projectile pressure is high.
 */
export function skyDancerArcadeV409PhoneClarity(
  input: SkyDancerArcadeV409PhoneClarityInput,
): SkyDancerArcadeV409PhoneClarity {
  if (!input.compactLandscape) {
    return { primaryLocks: 6, aimCues: 3, counterplayCues: 3, secondaryLockScale: .68, cueOpacity: 1, canvasLockLimit: 8 };
  }

  let clarity: SkyDancerArcadeV409PhoneClarity;
  switch (input.sceneMode) {
    case "boss":
      clarity = { primaryLocks: 2, aimCues: 1, counterplayCues: 1, secondaryLockScale: .44, cueOpacity: 1.12, canvasLockLimit: 2 };
      break;
    case "rival":
      clarity = { primaryLocks: 3, aimCues: 1, counterplayCues: 1, secondaryLockScale: .46, cueOpacity: .86, canvasLockLimit: 3 };
      break;
    case "signature":
      clarity = { primaryLocks: 3, aimCues: 1, counterplayCues: 1, secondaryLockScale: .48, cueOpacity: .92, canvasLockLimit: 3 };
      break;
    case "handoff":
    case "finale":
      clarity = { primaryLocks: 1, aimCues: 0, counterplayCues: 0, secondaryLockScale: .4, cueOpacity: .72, canvasLockLimit: 1 };
      break;
    default:
      clarity = { primaryLocks: 4, aimCues: 2, counterplayCues: 2, secondaryLockScale: .52, cueOpacity: 1, canvasLockLimit: 4 };
      break;
  }

  const incoming = Math.max(0, Math.floor(input.incomingThreats));
  if (incoming < 2) return clarity;
  const bossCueProtection = input.sceneMode === "boss";
  return {
    ...clarity,
    primaryLocks: Math.max(2, clarity.primaryLocks - (incoming >= 4 ? 1 : 0)),
    aimCues: incoming >= 3 ? 0 : Math.min(1, clarity.aimCues),
    counterplayCues: Math.min(1, clarity.counterplayCues),
    secondaryLockScale: clarity.secondaryLockScale * .9,
    cueOpacity: clarity.cueOpacity * (bossCueProtection ? (incoming >= 4 ? .96 : 1) : .88),
    canvasLockLimit: Math.max(2, clarity.canvasLockLimit - (incoming >= 4 ? 1 : 0)),
  };
}
