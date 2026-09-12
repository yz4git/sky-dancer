import { SKY_DANCER_ARCADE_FINAL_STAGE, type SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import { skyDancerArcadeV35BossApproach } from "./SkyDancerArcadeV35HudContinuity";
import { skyDancerArcadeV404RivalEncounterForSection } from "./SkyDancerArcadeV404RivalAce";
import { skyDancerArcadeV408SignatureEnvelope } from "./SkyDancerArcadeV408CinematicFocus";

export type SkyDancerArcadeV4012RhythmPhase =
  | "opening"
  | "build"
  | "signature"
  | "release"
  | "rival"
  | "boss-rise"
  | "boss"
  | "handoff"
  | "finale";

type SkyDancerArcadeV4012Status =
  | "running"
  | "paused"
  | "stage-clear"
  | "continue"
  | "game-over"
  | "run-clear"
  | "practice-clear";

export interface SkyDancerArcadeV4012RunRhythmInput {
  status: SkyDancerArcadeV4012Status;
  stageId: SkyDancerArcadeStageId;
  stageNumber: number;
  stageProgress: number;
  stageTimeSeconds: number;
  stageDurationSeconds: number;
  worldBreakLive: boolean;
  rivalAceActive: boolean;
  bossActive: boolean;
}

export interface SkyDancerArcadeV4012RunRhythm {
  phase: SkyDancerArcadeV4012RhythmPhase;
  intensity: number;
  cameraGain: number;
  ambientFxGain: number;
  speedLineGain: number;
  secondaryHudAlpha: number;
  bossApproachVisible: boolean;
  bossApproachDeferred: boolean;
  bossApproachRemainingSeconds: number;
}

export const SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS = .95;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const profile = (
  phase: SkyDancerArcadeV4012RhythmPhase,
  intensity: number,
  cameraGain: number,
  ambientFxGain: number,
  speedLineGain: number,
  secondaryHudAlpha: number,
  bossApproachVisible: boolean,
  bossApproachDeferred: boolean,
  bossApproachRemainingSeconds: number,
): SkyDancerArcadeV4012RunRhythm => ({
  phase,
  intensity: clamp01(intensity),
  cameraGain: clamp01(cameraGain),
  ambientFxGain: clamp01(ambientFxGain),
  speedLineGain: clamp01(speedLineGain),
  secondaryHudAlpha: clamp01(secondaryHudAlpha),
  bossApproachVisible,
  bossApproachDeferred,
  bossApproachRemainingSeconds: Math.max(0, bossApproachRemainingSeconds),
});

/**
 * V40.12 is a presentation-only full-run rhythm contract. It leaves the authored encounter
 * clock untouched and decides which existing peak gets visual priority on each frame.
 */
export function skyDancerArcadeV4012RunRhythm(input: SkyDancerArcadeV4012RunRhythmInput): SkyDancerArcadeV4012RunRhythm {
  const progress = clamp01(input.stageProgress);
  const runArc = clamp01((Math.max(1, input.stageNumber) - 1) / 6);
  const bossApproach = skyDancerArcadeV35BossApproach(
    input.stageId,
    input.stageTimeSeconds,
    input.stageDurationSeconds,
    input.bossActive,
  );
  const finalStage = input.stageId === SKY_DANCER_ARCADE_FINAL_STAGE;
  const rivalOwnsLead = input.rivalAceActive && !finalStage
    && bossApproach.active
    && bossApproach.remainingSeconds > SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS;
  const bossApproachVisible = bossApproach.active && !rivalOwnsLead;
  const bossApproachDeferred = bossApproach.active && rivalOwnsLead;

  if (input.status === "run-clear" || input.status === "practice-clear" || input.status === "game-over") {
    return profile("finale", 1, 1, 1, .7, .82, false, false, bossApproach.remainingSeconds);
  }
  if (input.status === "stage-clear" || input.status === "continue") {
    return profile("handoff", .25, .66, .62, .56, .78, false, false, bossApproach.remainingSeconds);
  }
  if (input.status !== "running") {
    return profile("build", .2, .76, .72, .7, .86, false, false, bossApproach.remainingSeconds);
  }
  if (input.bossActive) {
    return profile("boss", .9 + runArc * .1, 1, .95, .82, .72, false, false, 0);
  }
  if (bossApproachVisible) {
    return profile("boss-rise", .72 + runArc * .12, .78, .7, .62, .64, true, false, bossApproach.remainingSeconds);
  }
  if (input.rivalAceActive) {
    return profile("rival", .78 + runArc * .1, .9, .82, .74, .7, false, bossApproachDeferred, bossApproach.remainingSeconds);
  }

  const signature = input.worldBreakLive ? skyDancerArcadeV408SignatureEnvelope(progress) : 0;
  if (signature > 0) {
    return profile("signature", .62 + signature * .18 + runArc * .06, .96, .94, .9, .94, false, false, bossApproach.remainingSeconds);
  }

  // The quiet shelf is intentionally after the signature and before the next authored confrontation.
  const rivalEncounter = skyDancerArcadeV404RivalEncounterForSection(input.stageNumber);
  const releaseEnd = rivalEncounter?.startProgress ?? (finalStage ? .36 : .48);
  if (!finalStage && progress >= .405 && progress < releaseEnd) {
    return profile("release", .28 + runArc * .05, .64, .62, .58, .72, false, false, bossApproach.remainingSeconds);
  }

  if (progress < .12) {
    return profile("opening", .28 + runArc * .08, .82, .84, .8, .9, false, false, bossApproach.remainingSeconds);
  }
  return profile("build", .46 + runArc * .14, .9, .88, .88, .92, false, false, bossApproach.remainingSeconds);
}
