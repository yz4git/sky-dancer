export type SkyDancerArcadeV407HudFocus = "flight" | "rival" | "boss" | "critical" | "handoff" | "finale";

export interface SkyDancerArcadeV407HudFocusInput {
  status: "running" | "paused" | "stage-clear" | "continue" | "game-over" | "run-clear" | "practice-clear";
  bossActive: boolean;
  rivalAceActive: boolean;
  bossApproachActive: boolean;
  missileDanger: boolean;
}

export interface SkyDancerArcadeV407HandoffCue {
  phase: "score" | "commit" | "launch" | "finale";
  progress: number;
  eyebrow: string;
  title: string;
  detail: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function skyDancerArcadeV407HudFocus(input: SkyDancerArcadeV407HudFocusInput): SkyDancerArcadeV407HudFocus {
  if (input.status === "run-clear" || input.status === "practice-clear" || input.status === "game-over") return "finale";
  if (input.status === "stage-clear" || input.status === "continue") return "handoff";
  if (input.bossApproachActive || input.missileDanger) return "critical";
  if (input.bossActive) return "boss";
  if (input.rivalAceActive) return "rival";
  return "flight";
}

export function skyDancerArcadeV407HandoffCue(
  resultTimer: number,
  nextStageName: string | null,
  doctrine: string | null,
  doctrineDetail: string | null,
): SkyDancerArcadeV407HandoffCue {
  const progress = clamp01(1 - Math.max(0, resultTimer) / 1.35);
  if (!nextStageName) {
    return {
      phase: "finale",
      progress,
      eyebrow: "FINAL SORTIE COMPLETE",
      title: "ONE SKY · DEBRIEF",
      detail: "PRISM SOVEREIGN DOWN · FINAL RECORD LOCKED",
    };
  }
  const phase = resultTimer <= .42 ? "launch" : resultTimer <= .88 ? "commit" : "score";
  return {
    phase,
    progress,
    eyebrow: phase === "launch" ? "LAUNCHING NEXT SECTION" : "NEXT SORTIE",
    title: nextStageName,
    detail: doctrine && doctrine !== "LOCKED"
      ? `${doctrine} ROUTE · ${doctrineDetail ?? "ROUTE CONTRACT ACTIVE"}`
      : "DIRECT ROUTE · AIRFRAME MOVING",
  };
}

export function skyDancerArcadeV407RendererBadgeVisible(
  renderer: "WEBGL" | "CANVAS",
  stageNumber: number,
  stageTimeSeconds: number,
  status: SkyDancerArcadeV407HudFocusInput["status"],
): boolean {
  if (renderer === "CANVAS") return true;
  return status === "running" && stageNumber === 1 && stageTimeSeconds < 3.2;
}
