import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import type {
  SkyDancerArcadeV402CelebrationCue,
  SkyDancerArcadeV402CelebrationTone,
} from "./SkyDancerArcadeV402WorldBreakCelebration";

export type SkyDancerArcadeV403RecoveryPhase = "recoverable" | "terminal" | "comeback";

export interface SkyDancerArcadeV403RecoveryCue {
  headline: string;
  action: string;
  detail: string;
  tone: SkyDancerArcadeV402CelebrationTone;
  phase: SkyDancerArcadeV403RecoveryPhase;
  retryable: boolean;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  audioLowHz: number;
  audioHighHz: number;
}

interface RecoveryProfile {
  headline: string;
  action: string;
  tone: SkyDancerArcadeV402CelebrationTone;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  audioLowHz: number;
  audioHighHz: number;
}

const PROFILES: Record<SkyDancerArcadeStageId, RecoveryProfile> = {
  "dawn-city": {
    headline: "VECTOR LOST", action: "RECENTER · TAKE NEXT GATE", tone: "precision",
    durationSeconds: .72, strength: .72, cameraPullback: -.22, cameraFovKick: -1.1, cameraShake: .05,
    audioLowHz: 180, audioHighHz: 540,
  },
  "red-canyon": {
    headline: "KNIFE LINE LOST", action: "CLIMB OUT · REBUILD TURBO", tone: "precision",
    durationSeconds: .82, strength: .84, cameraPullback: -.28, cameraFovKick: -1.35, cameraShake: .065,
    audioLowHz: 164, audioHighHz: 410,
  },
  "cloud-fleet": {
    headline: "SUBSYSTEM PASSED", action: "RELOCK · TAKE NEXT ARRAY", tone: "assault",
    durationSeconds: .76, strength: .8, cameraPullback: -.3, cameraFovKick: -1.2, cameraShake: .08,
    audioLowHz: 132, audioHighHz: 396,
  },
  "storm-carrier": {
    headline: "LIGHTNING CONTACT", action: "SLIDE INTO SAFE LANE", tone: "survival",
    durationSeconds: .74, strength: .82, cameraPullback: -.26, cameraFovKick: -1.25, cameraShake: .09,
    audioLowHz: 150, audioHighHz: 620,
  },
  "desert-fortress": {
    headline: "BREACH DENIED", action: "CLEAR WALL · HOLD FLIGHT LINE", tone: "assault",
    durationSeconds: .86, strength: .94, cameraPullback: -.36, cameraFovKick: -1.55, cameraShake: .12,
    audioLowHz: 110, audioHighHz: 330,
  },
  "ice-cavern": {
    headline: "COLLAPSE CONTACT", action: "TRACK NEXT APERTURE", tone: "precision",
    durationSeconds: .74, strength: .8, cameraPullback: -.24, cameraFovKick: -1.15, cameraShake: .075,
    audioLowHz: 142, audioHighHz: 710,
  },
  "floating-ruins": {
    headline: "ROUTE UNSTABLE", action: "COMMIT TO ONE PORTAL", tone: "choice",
    durationSeconds: .74, strength: .7, cameraPullback: -.18, cameraFovKick: -.9, cameraShake: .04,
    audioLowHz: 220, audioHighHz: 660,
  },
  "night-metro": {
    headline: "PHANTOM LOST", action: "KEEP SPEED · SAVE THE RUN", tone: "speed",
    durationSeconds: .9, strength: .92, cameraPullback: -.34, cameraFovKick: -1.5, cameraShake: .08,
    audioLowHz: 126, audioHighHz: 378,
  },
  "volcano-core": {
    headline: "ERUPTION CONTACT", action: "TURBO · CENTERLINE · REBUILD LEAD", tone: "speed",
    durationSeconds: .8, strength: .96, cameraPullback: -.38, cameraFovKick: -1.7, cameraShake: .14,
    audioLowHz: 92, audioHighHz: 276,
  },
  "orbital-ascent": {
    headline: "AXIS LOST", action: "FIND SHAFT · CLIMB", tone: "speed",
    durationSeconds: .8, strength: .92, cameraPullback: -.32, cameraFovKick: -1.55, cameraShake: .1,
    audioLowHz: 118, audioHighHz: 472,
  },
  "prism-citadel": {
    headline: "SKY FRACTURED", action: "RESET LINE · BREAK NEXT SKY", tone: "final",
    durationSeconds: .86, strength: 1.02, cameraPullback: -.4, cameraFovKick: -1.8, cameraShake: .14,
    audioLowHz: 104, audioHighHz: 520,
  },
};

function failureCue(
  stageId: SkyDancerArcadeStageId,
  detail: string,
  retryable: boolean,
  headline?: string,
  action?: string,
): SkyDancerArcadeV403RecoveryCue {
  const profile = PROFILES[stageId];
  return {
    ...profile,
    headline: headline ?? profile.headline,
    action: action ?? profile.action,
    detail,
    phase: retryable ? "recoverable" : "terminal",
    retryable,
  };
}

function comebackCue(
  stageId: SkyDancerArcadeStageId,
  headline: string,
  detail: string,
  source?: SkyDancerArcadeV402CelebrationCue,
): SkyDancerArcadeV403RecoveryCue {
  const profile = PROFILES[stageId];
  const strength = Math.max(1.02, (source?.strength ?? profile.strength) * 1.16);
  return {
    headline,
    action: "FLOW RESTORED · KEEP PRESSURE",
    detail,
    tone: source?.tone ?? profile.tone,
    phase: "comeback",
    retryable: false,
    durationSeconds: Math.max(.82, (source?.durationSeconds ?? profile.durationSeconds) + .16),
    strength,
    cameraPullback: Math.max(.62, Math.abs(source?.cameraPullback ?? profile.cameraPullback) * 1.24),
    cameraFovKick: Math.max(2.1, Math.abs(source?.cameraFovKick ?? profile.cameraFovKick) * 1.2),
    cameraShake: Math.max(.085, (source?.cameraShake ?? profile.cameraShake) * 1.14),
    audioLowHz: Math.max(132, Math.round((source?.audioLowHz ?? profile.audioLowHz) * .72)),
    audioHighHz: Math.max(720, Math.round((source?.audioHighHz ?? profile.audioHighHz) * 1.06)),
  };
}

export function skyDancerArcadeV403RecoveryProfile(stageId: SkyDancerArcadeStageId): RecoveryProfile {
  return PROFILES[stageId];
}

/**
 * V40.3 recognizes authored WORLD BREAK failure messages and turns them into actionable recovery cues.
 * It never changes authoritative runtime state, scoring, collision, time-scale or inputs.
 */
export function skyDancerArcadeV403RecoveryFromMessage(
  stageId: SkyDancerArcadeStageId,
  message: string | null,
): SkyDancerArcadeV403RecoveryCue | null {
  if (!message) return null;
  switch (stageId) {
    case "dawn-city": {
      const match = message.match(/GATE\s+(\d+)\s+MISSED/);
      return match ? failureCue(stageId, `GATE ${match[1]} LOST · NEXT VECTOR IS LIVE`, true) : null;
    }
    case "red-canyon":
      return message.includes("KNIFE RUN LOST")
        ? failureCue(stageId, "LOW-ALTITUDE OBJECTIVE CLOSED · RUN CONTINUES", false)
        : null;
    case "cloud-fleet": {
      const match = message.match(/DECK STRIKE\s+·\s+(.+?)\s+ESCAPED/);
      return match ? failureCue(stageId, `${match[1]} PASSED · NEXT SUBSYSTEM STILL LIVE`, true) : null;
    }
    case "storm-carrier": {
      const match = message.match(/LIGHTNING GRID\s+·\s+STRIKE\s+(\d+)/);
      return match ? failureCue(stageId, `STRIKE ${match[1]} · SAFE CORRIDOR STILL MOVING`, true) : null;
    }
    case "desert-fortress":
      if (message.includes("BREACH MISSED")) return failureCue(stageId, "OPENING PASSED · HOLD THE EXIT LINE", false, "BREACH MISSED");
      if (message.includes("BREACH DENIED")) return failureCue(stageId, "BATTERIES ACTIVE · WALL CANNOT OPEN", false);
      if (message.includes("FORTRESS BATTERY") && message.includes("ESCAPED")) return failureCue(stageId, "BATTERY PASSED · FULL BREACH NO LONGER AVAILABLE", false, "BATTERY ESCAPED");
      return null;
    case "ice-cavern": {
      const match = message.match(/COLLAPSE HIT\s+(\d+)/);
      return match ? failureCue(stageId, `APERTURE ${match[1]} LOST · NEXT GAP STILL OPEN`, true) : null;
    }
    case "floating-ruins":
      return message.includes("ROUTE UNSTABLE") ? failureCue(stageId, "PORTALS STILL OPEN · PICK ONE VECTOR", true) : null;
    case "night-metro":
      return message.includes("PHANTOM ESCAPED")
        ? failureCue(stageId, "PURSUIT OBJECTIVE CLOSED · KEEP THE SECTION ALIVE", false)
        : null;
    case "volcano-core": {
      const match = message.match(/ERUPTION HIT\s+(\d+)/);
      return match ? failureCue(stageId, `CONTACT ${match[1]} · ESCAPE LEAD RESTORED`, true) : null;
    }
    case "orbital-ascent": {
      const strike = message.match(/DEBRIS STRIKE\s+(\d+)/);
      if (strike) return failureCue(stageId, `STRIKE ${strike[1]} · SAFE AXIS CAN BE REACQUIRED`, true);
      if (message.includes("SHAFT LOST")) return failureCue(stageId, "ASCENT WINDOW CLOSED · SECTION CONTINUES", false, "SHAFT LOST");
      return null;
    }
    case "prism-citadel": {
      const match = message.match(/SKY\s+(\d+)\s+FRACTURED/);
      return match ? failureCue(stageId, `REPRISE ${match[1]} LOST · NEXT SKY STILL LIVE`, true) : null;
    }
  }
}

/** Terminal objectives that can still be recovered into a satisfying non-perfect clear. */
export function skyDancerArcadeV403ResolvedRecoveryFromMessage(
  stageId: SkyDancerArcadeStageId,
  message: string | null,
): SkyDancerArcadeV403RecoveryCue | null {
  if (!message) return null;
  if (stageId === "volcano-core" && message.includes("ESCAPE SURVIVED")) {
    return comebackCue(stageId, "PRESSURE SURVIVED", "ERUPTION CONTACT RECOVERED · RUN STAYS ALIVE");
  }
  if (stageId === "prism-citadel" && message.includes("SEVEN SKIES CLEARED") && message.includes("MISS")) {
    return comebackCue(stageId, "SEVEN SKIES HELD", "ROUTE REPRISE RECOVERED AFTER FRACTURE");
  }
  return null;
}

/** Converts the next real success after a recoverable failure into one stronger, one-shot comeback beat. */
export function skyDancerArcadeV403ComebackFromCelebration(
  stageId: SkyDancerArcadeStageId,
  celebration: SkyDancerArcadeV402CelebrationCue,
): SkyDancerArcadeV403RecoveryCue {
  return comebackCue(stageId, celebration.headline, `RECOVERY CONFIRMED · ${celebration.detail}`, celebration);
}
