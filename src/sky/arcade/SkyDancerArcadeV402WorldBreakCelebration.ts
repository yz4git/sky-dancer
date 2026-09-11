import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV402CelebrationTone = "precision" | "assault" | "survival" | "choice" | "speed" | "final";
export type SkyDancerArcadeV402CelebrationTier = "beat" | "signature" | "perfect";

export interface SkyDancerArcadeV402CelebrationProfile {
  beatHeadline: string;
  signatureHeadline: string;
  tone: SkyDancerArcadeV402CelebrationTone;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  audioLowHz: number;
  audioHighHz: number;
}

export interface SkyDancerArcadeV402CelebrationCue extends SkyDancerArcadeV402CelebrationProfile {
  headline: string;
  detail: string;
  tier: SkyDancerArcadeV402CelebrationTier;
}

const PROFILES: Record<SkyDancerArcadeStageId, SkyDancerArcadeV402CelebrationProfile> = {
  "dawn-city": {
    beatHeadline: "SKYLINE CLEAN", signatureHeadline: "CITY FLOW LOCKED", tone: "precision",
    durationSeconds: .64, strength: .72, cameraPullback: .48, cameraFovKick: 1.55, cameraShake: .055,
    audioLowHz: 660, audioHighHz: 1320,
  },
  "red-canyon": {
    beatHeadline: "LOW LINE", signatureHeadline: "KNIFE RUN", tone: "precision",
    durationSeconds: .76, strength: .9, cameraPullback: .42, cameraFovKick: 2.05, cameraShake: .07,
    audioLowHz: 520, audioHighHz: 1040,
  },
  "cloud-fleet": {
    beatHeadline: "DECK BREAK", signatureHeadline: "FLAGSHIP STRIPPED", tone: "assault",
    durationSeconds: .72, strength: .84, cameraPullback: .64, cameraFovKick: 1.85, cameraShake: .12,
    audioLowHz: 196, audioHighHz: 784,
  },
  "storm-carrier": {
    beatHeadline: "THUNDER CUT", signatureHeadline: "STORM LINE", tone: "survival",
    durationSeconds: .68, strength: .78, cameraPullback: .5, cameraFovKick: 1.7, cameraShake: .085,
    audioLowHz: 440, audioHighHz: 1320,
  },
  "desert-fortress": {
    beatHeadline: "BATTERY DOWN", signatureHeadline: "WALL BREACH", tone: "assault",
    durationSeconds: .8, strength: .98, cameraPullback: .78, cameraFovKick: 2.2, cameraShake: .15,
    audioLowHz: 147, audioHighHz: 880,
  },
  "ice-cavern": {
    beatHeadline: "APERTURE CLEAR", signatureHeadline: "CRYSTAL PERFECT", tone: "precision",
    durationSeconds: .7, strength: .82, cameraPullback: .54, cameraFovKick: 1.8, cameraShake: .06,
    audioLowHz: 740, audioHighHz: 1480,
  },
  "floating-ruins": {
    beatHeadline: "PORTAL VECTOR", signatureHeadline: "PORTAL COMMIT", tone: "choice",
    durationSeconds: .82, strength: .92, cameraPullback: .72, cameraFovKick: 2.1, cameraShake: .075,
    audioLowHz: 392, audioHighHz: 1176,
  },
  "night-metro": {
    beatHeadline: "CHASE LOCK", signatureHeadline: "PHANTOM CAUGHT", tone: "speed",
    durationSeconds: .84, strength: 1.02, cameraPullback: .92, cameraFovKick: 2.8, cameraShake: .11,
    audioLowHz: 330, audioHighHz: 1320,
  },
  "volcano-core": {
    beatHeadline: "PRESSURE BREAK", signatureHeadline: "ERUPTION OUTRUN", tone: "speed",
    durationSeconds: .88, strength: 1.04, cameraPullback: .96, cameraFovKick: 3.0, cameraShake: .13,
    audioLowHz: 220, audioHighHz: 1100,
  },
  "orbital-ascent": {
    beatHeadline: "AXIS LOCK", signatureHeadline: "ASCENT CLEAR", tone: "speed",
    durationSeconds: .9, strength: 1.08, cameraPullback: 1.02, cameraFovKick: 3.15, cameraShake: .1,
    audioLowHz: 494, audioHighHz: 1482,
  },
  "prism-citadel": {
    beatHeadline: "SKY BROKEN", signatureHeadline: "SEVEN SKIES", tone: "final",
    durationSeconds: .96, strength: 1.18, cameraPullback: 1.16, cameraFovKick: 3.5, cameraShake: .16,
    audioLowHz: 262, audioHighHz: 1572,
  },
};

function cue(
  stageId: SkyDancerArcadeStageId,
  tier: SkyDancerArcadeV402CelebrationTier,
  detail: string,
  headline?: string,
): SkyDancerArcadeV402CelebrationCue {
  const profile = PROFILES[stageId];
  const tierScale = tier === "perfect" ? 1.18 : tier === "signature" ? 1.08 : 1;
  return {
    ...profile,
    headline: headline ?? (tier === "beat" ? profile.beatHeadline : profile.signatureHeadline),
    detail,
    tier,
    durationSeconds: profile.durationSeconds + (tier === "perfect" ? .18 : tier === "signature" ? .08 : 0),
    strength: profile.strength * tierScale,
    cameraPullback: profile.cameraPullback * tierScale,
    cameraFovKick: profile.cameraFovKick * tierScale,
    cameraShake: profile.cameraShake * tierScale,
  };
}

export function skyDancerArcadeV402CelebrationProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV402CelebrationProfile {
  return PROFILES[stageId];
}

/**
 * V40.2 is deliberately presentation-only: it recognizes already-authored success messages and
 * converts them into a synchronized HUD/camera/audio cue. Failure, damage and warning messages return null.
 */
export function skyDancerArcadeV402CelebrationFromMessage(
  stageId: SkyDancerArcadeStageId,
  message: string | null,
): SkyDancerArcadeV402CelebrationCue | null {
  if (!message) return null;
  switch (stageId) {
    case "dawn-city": {
      const match = message.match(/GATE\s+(\d+)\s+CLEAN/);
      return match ? cue(stageId, "beat", `GATE ${match[1]} · CLEAN VECTOR`) : null;
    }
    case "red-canyon":
      return message.includes("KNIFE RUN COMPLETE") ? cue(stageId, "signature", "LOW ALTITUDE LINE MASTERED") : null;
    case "cloud-fleet": {
      const match = message.match(/DECK STRIKE\s+·\s+(.+?)\s+DOWN/);
      return match ? cue(stageId, "beat", `${match[1]} · SUBSYSTEM DOWN`) : null;
    }
    case "storm-carrier": {
      const match = message.match(/SAFE LANE\s+(\d+)/);
      return match ? cue(stageId, "beat", `LANE ${match[1]} · LIGHTNING CLEARED`) : null;
    }
    case "desert-fortress":
      if (message.includes("FORTRESS BREACHED")) return cue(stageId, "perfect", "BATTERIES DOWN · BREACH CLEARED");
      if (message.includes("FORTRESS BATTERIES DOWN")) return cue(stageId, "signature", "ALL BATTERIES DOWN · BREACH OPEN");
      if (message.includes("FORTRESS BATTERY") && message.includes(" DOWN")) return cue(stageId, "beat", "FORTRESS BATTERY DESTROYED");
      return null;
    case "ice-cavern": {
      if (message.includes("CRYSTAL ESCAPE PERFECT")) return cue(stageId, "perfect", "ALL APERTURES CLEAN");
      const match = message.match(/APERTURE\s+(\d+)\s+CLEAR/);
      return match ? cue(stageId, "beat", `APERTURE ${match[1]} · CLEAN`) : null;
    }
    case "floating-ruins": {
      if (!message.startsWith("SKY LABYRINTH ·") || !message.includes("+")) return null;
      const doctrine = message.includes("DANGER") ? "DANGER" : message.includes("SCORE") ? "SCORE" : message.includes("FLOW") ? "FLOW" : "ROUTE";
      return cue(stageId, "signature", `${doctrine} VECTOR COMMITTED`);
    }
    case "night-metro":
      return message.includes("PHANTOM CAUGHT") ? cue(stageId, "perfect", "PURSUIT CLOSED · TARGET OVERTAKEN") : null;
    case "volcano-core":
      return message.includes("ERUPTION OUTRUN") ? cue(stageId, "perfect", "PRESSURE WAVE LEFT BEHIND") : null;
    case "orbital-ascent":
      return message.includes("ZERO-G ASCENT CLEAR") ? cue(stageId, "perfect", "TARGET ALTITUDE REACHED") : null;
    case "prism-citadel": {
      if (message.includes("SEVEN SKIES BREAK")) return cue(stageId, "perfect", "FULL ROUTE REPRISE PERFECT");
      const match = message.match(/SKY\s+(\d+)\s+BROKEN/);
      return match ? cue(stageId, "beat", `REPRISE ${match[1]} · SKY BROKEN`) : null;
    }
  }
}
