import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";

export interface SkyDancerArcadeV409PhoneClarityInput {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
  // V40.44: one imminent missile is enough to reserve the phone frame for threat reading.
  terminalThreats?: number;
}

export interface SkyDancerArcadeV4044ThreatProbe {
  owner: string;
  depth: number;
  warningSeconds?: number;
  warningDuration?: number;
}

export function skyDancerArcadeV4044IsTerminalThreat(projectile: SkyDancerArcadeV4044ThreatProbe): boolean {
  if (projectile.owner !== "enemy") return false;
  const warning = Math.max(0, projectile.warningSeconds ?? 0);
  const warningDuration = Math.max(0, projectile.warningDuration ?? 0);
  if (warning > 0) {
    const breakWindow = Math.min(.42, Math.max(.24, warningDuration * .46));
    return warning <= breakWindow;
  }
  return projectile.depth > 2.2 && projectile.depth < 14;
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
      clarity = { primaryLocks: 2, aimCues: 1, counterplayCues: 1, secondaryLockScale: .44, cueOpacity: .82, canvasLockLimit: 2 };
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
  const terminal = Math.max(0, Math.floor(input.terminalThreats ?? 0));
  if (incoming < 2 && terminal < 1) return clarity;

  const urgent = terminal > 0;
  return {
    ...clarity,
    primaryLocks: urgent
      ? Math.max(1, Math.min(2, clarity.primaryLocks))
      : Math.max(2, clarity.primaryLocks - (incoming >= 4 ? 1 : 0)),
    aimCues: urgent ? 0 : incoming >= 3 ? 0 : Math.min(1, clarity.aimCues),
    counterplayCues: urgent ? 0 : Math.min(1, clarity.counterplayCues),
    secondaryLockScale: clarity.secondaryLockScale * (urgent ? .76 : .9),
    cueOpacity: clarity.cueOpacity * (urgent ? .76 : .88),
    canvasLockLimit: urgent
      ? Math.max(1, Math.min(2, clarity.canvasLockLimit))
      : Math.max(2, clarity.canvasLockLimit - (incoming >= 4 ? 1 : 0)),
  };
}
