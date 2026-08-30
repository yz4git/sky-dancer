import {
  SKY_DANCER_ARCADE_FIRST_STAGE,
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";

export type SkyDancerArcadeRank = "D" | "C" | "B" | "A" | "S" | "SS";

export interface SkyDancerArcadeStageRecord {
  clears: number;
  bestScore: number;
  bestRank: SkyDancerArcadeRank;
  noDamage: boolean;
}

export interface SkyDancerArcadeProgress {
  version: 1;
  clearedStageIds: SkyDancerArcadeStageId[];
  unlockedStageIds: SkyDancerArcadeStageId[];
  records: Partial<Record<SkyDancerArcadeStageId, SkyDancerArcadeStageRecord>>;
  bestRunScore: number;
  bestRunRank: SkyDancerArcadeRank;
  completedRuns: number;
  oneCreditClears: number;
}

const STORAGE_KEY = "sky-dancer-arcade-progress-v1";
const RANK_VALUE: Record<SkyDancerArcadeRank, number> = { D: 0, C: 1, B: 2, A: 3, S: 4, SS: 5 };

export function createDefaultSkyDancerArcadeProgress(): SkyDancerArcadeProgress {
  return {
    version: 1,
    clearedStageIds: [],
    unlockedStageIds: [SKY_DANCER_ARCADE_FIRST_STAGE],
    records: {},
    bestRunScore: 0,
    bestRunRank: "D",
    completedRuns: 0,
    oneCreditClears: 0,
  };
}

function validStageId(value: unknown): value is SkyDancerArcadeStageId {
  return typeof value === "string" && SKY_DANCER_ARCADE_STAGES.some((stage) => stage.id === value);
}

function validRank(value: unknown): value is SkyDancerArcadeRank {
  return value === "D" || value === "C" || value === "B" || value === "A" || value === "S" || value === "SS";
}

export function loadSkyDancerArcadeProgress(): SkyDancerArcadeProgress {
  if (typeof localStorage === "undefined") return createDefaultSkyDancerArcadeProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSkyDancerArcadeProgress();
    const parsed = JSON.parse(raw) as Partial<SkyDancerArcadeProgress>;
    const base = createDefaultSkyDancerArcadeProgress();
    const clearedStageIds = Array.isArray(parsed.clearedStageIds) ? parsed.clearedStageIds.filter(validStageId) : [];
    const unlocked = Array.isArray(parsed.unlockedStageIds) ? parsed.unlockedStageIds.filter(validStageId) : [];
    const records: SkyDancerArcadeProgress["records"] = {};
    if (parsed.records && typeof parsed.records === "object") {
      for (const stage of SKY_DANCER_ARCADE_STAGES) {
        const candidate = parsed.records[stage.id];
        if (!candidate || typeof candidate !== "object") continue;
        records[stage.id] = {
          clears: Math.max(0, Math.floor(Number(candidate.clears) || 0)),
          bestScore: Math.max(0, Math.floor(Number(candidate.bestScore) || 0)),
          bestRank: validRank(candidate.bestRank) ? candidate.bestRank : "D",
          noDamage: candidate.noDamage === true,
        };
      }
    }
    return {
      version: 1,
      clearedStageIds: [...new Set(clearedStageIds)],
      unlockedStageIds: [...new Set([base.unlockedStageIds[0], ...unlocked])],
      records,
      bestRunScore: Math.max(0, Math.floor(Number(parsed.bestRunScore) || 0)),
      bestRunRank: validRank(parsed.bestRunRank) ? parsed.bestRunRank : "D",
      completedRuns: Math.max(0, Math.floor(Number(parsed.completedRuns) || 0)),
      oneCreditClears: Math.max(0, Math.floor(Number(parsed.oneCreditClears) || 0)),
    };
  } catch {
    return createDefaultSkyDancerArcadeProgress();
  }
}

export function saveSkyDancerArcadeProgress(progress: SkyDancerArcadeProgress): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage denial must never interrupt a run.
  }
}

export function recordSkyDancerArcadeStageClear(
  stageId: SkyDancerArcadeStageId,
  score: number,
  rank: SkyDancerArcadeRank,
  noDamage: boolean,
): SkyDancerArcadeProgress {
  const progress = loadSkyDancerArcadeProgress();
  const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === stageId);
  const previous = progress.records[stageId];
  progress.records[stageId] = {
    clears: (previous?.clears ?? 0) + 1,
    bestScore: Math.max(previous?.bestScore ?? 0, Math.floor(score)),
    bestRank: !previous || RANK_VALUE[rank] > RANK_VALUE[previous.bestRank] ? rank : previous.bestRank,
    noDamage: Boolean(previous?.noDamage || noDamage),
  };
  if (!progress.clearedStageIds.includes(stageId)) progress.clearedStageIds.push(stageId);
  for (const next of stage?.next ?? []) {
    if (!progress.unlockedStageIds.includes(next)) progress.unlockedStageIds.push(next);
  }
  saveSkyDancerArcadeProgress(progress);
  return progress;
}

export function recordSkyDancerArcadeRunClear(
  score: number,
  rank: SkyDancerArcadeRank,
  continuesUsed: number,
): SkyDancerArcadeProgress {
  const progress = loadSkyDancerArcadeProgress();
  progress.completedRuns += 1;
  if (continuesUsed === 0) progress.oneCreditClears += 1;
  if (score > progress.bestRunScore) progress.bestRunScore = Math.floor(score);
  if (RANK_VALUE[rank] > RANK_VALUE[progress.bestRunRank]) progress.bestRunRank = rank;
  saveSkyDancerArcadeProgress(progress);
  return progress;
}
