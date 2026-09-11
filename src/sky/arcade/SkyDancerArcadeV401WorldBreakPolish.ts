import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import { skyDancerArcadeV40WorldProfile } from "./SkyDancerArcadeV40WorldBreak";

export type SkyDancerArcadeV401BriefingTone = "precision" | "assault" | "survival" | "choice" | "speed" | "final";
export type SkyDancerArcadeV401CuePriority = "normal" | "alert" | "critical";

export interface SkyDancerArcadeV401BriefingProfile {
  startProgress: number;
  leadSeconds: number;
  hint: string;
  tone: SkyDancerArcadeV401BriefingTone;
}

export interface SkyDancerArcadeV401WorldBreakBriefing {
  active: boolean;
  signature: string;
  hint: string;
  tone: SkyDancerArcadeV401BriefingTone;
  progress: number;
  remainingSeconds: number;
}

const BRIEFINGS: Record<SkyDancerArcadeStageId, SkyDancerArcadeV401BriefingProfile> = {
  "dawn-city": { startProgress: .155, leadSeconds: 1.7, hint: "ALIGN WITH THE SKYLINE RINGS", tone: "precision" },
  "red-canyon": { startProgress: .12, leadSeconds: 1.15, hint: "DESCEND · HOLD THE CANYON FLOOR", tone: "precision" },
  "cloud-fleet": { startProgress: .17, leadSeconds: 1.75, hint: "LOCK DECK TARGETS · BREAK THE FLAGSHIP", tone: "assault" },
  "storm-carrier": { startProgress: .145, leadSeconds: 1.55, hint: "READ THE SAFE LANE · MOVE EARLY", tone: "survival" },
  "desert-fortress": { startProgress: .145, leadSeconds: 1.55, hint: "BREAK BATTERIES · THEN TAKE THE BREACH", tone: "assault" },
  "ice-cavern": { startProgress: .14, leadSeconds: 1.5, hint: "FOLLOW THE APERTURES · DO NOT CHASE LATE", tone: "precision" },
  "floating-ruins": { startProgress: .235, leadSeconds: 1.8, hint: "CHOOSE FLOW · SCORE · OR DANGER", tone: "choice" },
  "night-metro": { startProgress: .11, leadSeconds: 1.35, hint: "TURBO TO CLOSE · TRACK THE PHANTOM", tone: "speed" },
  "volcano-core": { startProgress: .12, leadSeconds: 1.5, hint: "BUILD LEAD · TURBO THROUGH THE ERUPTION", tone: "speed" },
  "orbital-ascent": { startProgress: .1, leadSeconds: 1.3, hint: "FIND THE AXIS · CLIMB + TURBO", tone: "speed" },
  "prism-citadel": { startProgress: .105, leadSeconds: 1.6, hint: "READ YOUR ROUTE · BREAK ALL SEVEN SKIES", tone: "final" },
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function skyDancerArcadeV401WorldBreakBriefingProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV401BriefingProfile {
  return BRIEFINGS[stageId];
}

export function skyDancerArcadeV401WorldBreakBriefing(
  stageId: SkyDancerArcadeStageId,
  stageProgress: number,
  stageDurationSeconds: number,
  enabled: boolean,
): SkyDancerArcadeV401WorldBreakBriefing {
  const profile = BRIEFINGS[stageId];
  const duration = Math.max(.001, stageDurationSeconds);
  const elapsed = clamp01(stageProgress) * duration;
  const contactSeconds = profile.startProgress * duration;
  const leadStartSeconds = Math.max(0, contactSeconds - profile.leadSeconds);
  const leadDuration = Math.max(.001, contactSeconds - leadStartSeconds);
  const remainingSeconds = Math.max(0, contactSeconds - elapsed);
  const active = enabled && elapsed >= leadStartSeconds && elapsed < contactSeconds;
  return {
    active,
    signature: skyDancerArcadeV40WorldProfile(stageId).signature,
    hint: profile.hint,
    tone: profile.tone,
    progress: active ? clamp01((elapsed - leadStartSeconds) / leadDuration) : elapsed >= contactSeconds ? 1 : 0,
    remainingSeconds,
  };
}

export function skyDancerArcadeV401CuePriority(
  basePriority: SkyDancerArcadeV401CuePriority,
  worldBreakBriefingActive: boolean,
): SkyDancerArcadeV401CuePriority {
  if (basePriority === "critical") return "critical";
  if (basePriority === "alert") return "alert";
  return worldBreakBriefingActive ? "alert" : "normal";
}
