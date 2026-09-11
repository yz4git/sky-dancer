import { SKY_DANCER_ARCADE_FINAL_STAGE, type SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import { skyDancerArcadeBossStartProgress } from "./SkyDancerArcadeV10Systems";

export const SKY_DANCER_ARCADE_V35_SECTION_INTRO_SECONDS = 2.35;
export const SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS = 2.6;

export interface SkyDancerArcadeV35BossApproach {
  active: boolean;
  remainingSeconds: number;
  progress: number;
}

export type SkyDancerArcadeV35CuePriority = "normal" | "alert" | "critical";

export function skyDancerArcadeV35SectionIntroVisible(status: string, stageTimeSeconds: number): boolean {
  return status === "running" && stageTimeSeconds >= 0 && stageTimeSeconds < SKY_DANCER_ARCADE_V35_SECTION_INTRO_SECONDS;
}

export function skyDancerArcadeV35BossApproach(
  stageId: SkyDancerArcadeStageId,
  stageTimeSeconds: number,
  stageDurationSeconds: number,
  bossActive: boolean,
): SkyDancerArcadeV35BossApproach {
  const bossStart = Math.max(0, stageDurationSeconds) * skyDancerArcadeBossStartProgress(stageId === SKY_DANCER_ARCADE_FINAL_STAGE);
  const remainingSeconds = Math.max(0, bossStart - Math.max(0, stageTimeSeconds));
  const active = !bossActive && remainingSeconds > 0 && remainingSeconds <= SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS;
  const progress = active
    ? Math.max(0, Math.min(1, 1 - remainingSeconds / SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS))
    : bossActive ? 1 : 0;
  return { active, remainingSeconds, progress };
}

export function skyDancerArcadeV35CuePriority(
  message: string | null,
  bossApproachActive: boolean,
  missileDanger: boolean,
): SkyDancerArcadeV35CuePriority {
  if (bossApproachActive || missileDanger) return "critical";
  if (message && /(WARNING|ARMOR BREAK|FORMATION BREAK|CORE OPEN|PHASE|COUNTER)/i.test(message)) return "alert";
  return "normal";
}
