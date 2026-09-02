import {
  SKY_DANCER_ARCADE_FIRST_STAGE,
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV11MedalId } from "./SkyDancerArcadeV11Scoring";

export type SkyDancerArcadeRank = "D" | "C" | "B" | "A" | "S" | "SS";
export type SkyDancerArcadePaintScheme = "default" | "sunset" | "storm" | "prism";
export type SkyDancerArcadeLoadout = "standard" | "missile-focus" | "gun-focus";

export type SkyDancerArcadeMasteryRewardKind = "paint" | "loadout" | "badge";

export interface SkyDancerArcadeMasteryReward {
  threshold: number;
  label: string;
  shortLabel: string;
  kind: SkyDancerArcadeMasteryRewardKind;
  paintScheme?: SkyDancerArcadePaintScheme;
  loadout?: SkyDancerArcadeLoadout;
}

export const SKY_DANCER_ARCADE_MAX_MEDALS = SKY_DANCER_ARCADE_STAGES.length * 3;

export const SKY_DANCER_ARCADE_MASTERY_REWARDS: readonly SkyDancerArcadeMasteryReward[] = [
  { threshold: 6, label: "SUNSET PAINT", shortLabel: "SUNSET", kind: "paint", paintScheme: "sunset" },
  { threshold: 12, label: "MISSILE FOCUS", shortLabel: "MISSILE", kind: "loadout", loadout: "missile-focus" },
  { threshold: 18, label: "STORM PAINT", shortLabel: "STORM", kind: "paint", paintScheme: "storm" },
  { threshold: 24, label: "GUN FOCUS", shortLabel: "GUN", kind: "loadout", loadout: "gun-focus" },
  { threshold: 30, label: "PRISM PAINT", shortLabel: "PRISM", kind: "paint", paintScheme: "prism" },
  { threshold: SKY_DANCER_ARCADE_MAX_MEDALS, label: "SKY MASTER", shortLabel: "SKY MASTER", kind: "badge" },
];

export function skyDancerArcadeNextMasteryReward(totalMedals: number): SkyDancerArcadeMasteryReward | null {
  const medals = Math.max(0, Math.floor(Number(totalMedals) || 0));
  return SKY_DANCER_ARCADE_MASTERY_REWARDS.find((reward) => medals < reward.threshold) ?? null;
}

export function skyDancerArcadeMasteryUnlocks(totalMedals: number): {
  paintSchemes: SkyDancerArcadePaintScheme[];
  loadouts: SkyDancerArcadeLoadout[];
} {
  const medals = Math.max(0, Math.floor(Number(totalMedals) || 0));
  const paintSchemes: SkyDancerArcadePaintScheme[] = [];
  const loadouts: SkyDancerArcadeLoadout[] = [];
  for (const reward of SKY_DANCER_ARCADE_MASTERY_REWARDS) {
    if (medals < reward.threshold) break;
    if (reward.paintScheme) paintSchemes.push(reward.paintScheme);
    if (reward.loadout) loadouts.push(reward.loadout);
  }
  return { paintSchemes, loadouts };
}

export interface SkyDancerArcadeStageRecord {
  clears: number;
  bestScore: number;
  bestRank: SkyDancerArcadeRank;
  noDamage: boolean;
  medals: SkyDancerArcadeV11MedalId[];
}

export interface SkyDancerArcadeRunSummary {
  route: SkyDancerArcadeStageId[];
  kills: number;
  nearMisses: number;
  bossKills: number;
  armorBreaks: number;
  formationBreaks: number;
  bestChain: number;
  medalsEarned?: number;
}

export interface SkyDancerArcadeProgress {
  version: 2;
  clearedStageIds: SkyDancerArcadeStageId[];
  unlockedStageIds: SkyDancerArcadeStageId[];
  records: Partial<Record<SkyDancerArcadeStageId, SkyDancerArcadeStageRecord>>;
  bestRunScore: number;
  bestRunRank: SkyDancerArcadeRank;
  completedRuns: number;
  oneCreditClears: number;
  totalKills: number;
  totalNearMisses: number;
  totalBossKills: number;
  totalArmorBreaks: number;
  totalFormationBreaks: number;
  bestChain: number;
  bestRoute: SkyDancerArcadeStageId[];
  bestRouteScore: number;
  totalMedals: number;
  recentRoutes: SkyDancerArcadeStageId[][];
  unlockedPaintSchemes: SkyDancerArcadePaintScheme[];
  unlockedLoadouts: SkyDancerArcadeLoadout[];
}

const STORAGE_KEY = "sky-dancer-arcade-progress-v2";
const LEGACY_STORAGE_KEY = "sky-dancer-arcade-progress-v1";
const RANK_VALUE: Record<SkyDancerArcadeRank, number> = { D: 0, C: 1, B: 2, A: 3, S: 4, SS: 5 };

export function createDefaultSkyDancerArcadeProgress(): SkyDancerArcadeProgress {
  return {
    version: 2,
    clearedStageIds: [],
    unlockedStageIds: [SKY_DANCER_ARCADE_FIRST_STAGE],
    records: {},
    bestRunScore: 0,
    bestRunRank: "D",
    completedRuns: 0,
    oneCreditClears: 0,
    totalKills: 0,
    totalNearMisses: 0,
    totalBossKills: 0,
    totalArmorBreaks: 0,
    totalFormationBreaks: 0,
    bestChain: 0,
    bestRoute: [],
    bestRouteScore: 0,
    totalMedals: 0,
    recentRoutes: [],
    unlockedPaintSchemes: ["default"],
    unlockedLoadouts: ["standard"],
  };
}

function validStageId(value: unknown): value is SkyDancerArcadeStageId {
  return typeof value === "string" && SKY_DANCER_ARCADE_STAGES.some((stage) => stage.id === value);
}

function validRank(value: unknown): value is SkyDancerArcadeRank {
  return value === "D" || value === "C" || value === "B" || value === "A" || value === "S" || value === "SS";
}

function uniqueValidStages(value: unknown): SkyDancerArcadeStageId[] {
  return Array.isArray(value) ? [...new Set(value.filter(validStageId))] : [];
}

function finiteCount(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function validMedal(value: unknown): value is SkyDancerArcadeV11MedalId {
  return value === "score" || value === "signature" || value === "no-damage";
}

function uniqueMedals(value: unknown): SkyDancerArcadeV11MedalId[] {
  return Array.isArray(value) ? [...new Set(value.filter(validMedal))] : [];
}

function validRecentRoutes(value: unknown): SkyDancerArcadeStageId[][] {
  if (!Array.isArray(value)) return [];
  return value.map(uniqueValidStages).filter(route => route.length > 0).slice(0, 8);
}

function applyUnlocks(progress: SkyDancerArcadeProgress): void {
  const paint = new Set(progress.unlockedPaintSchemes);
  const loadouts = new Set(progress.unlockedLoadouts);
  if (progress.totalKills >= 50) paint.add("sunset");
  if (progress.totalBossKills >= 5) paint.add("storm");
  if (progress.completedRuns >= 1) paint.add("prism");
  if (progress.totalArmorBreaks >= 10) loadouts.add("missile-focus");
  if (progress.bestChain >= 8) loadouts.add("gun-focus");
  const masteryUnlocks = skyDancerArcadeMasteryUnlocks(progress.totalMedals);
  for (const scheme of masteryUnlocks.paintSchemes) paint.add(scheme);
  for (const loadout of masteryUnlocks.loadouts) loadouts.add(loadout);
  progress.unlockedPaintSchemes = [...paint];
  progress.unlockedLoadouts = [...loadouts];
}

export function loadSkyDancerArcadeProgress(): SkyDancerArcadeProgress {
  if (typeof localStorage === "undefined") return createDefaultSkyDancerArcadeProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return createDefaultSkyDancerArcadeProgress();
    const parsed = JSON.parse(raw) as Partial<SkyDancerArcadeProgress> & { version?: number };
    const base = createDefaultSkyDancerArcadeProgress();
    const clearedStageIds = uniqueValidStages(parsed.clearedStageIds);
    const unlocked = uniqueValidStages(parsed.unlockedStageIds);
    const records: SkyDancerArcadeProgress["records"] = {};
    if (parsed.records && typeof parsed.records === "object") {
      for (const stage of SKY_DANCER_ARCADE_STAGES) {
        const candidate = parsed.records[stage.id];
        if (!candidate || typeof candidate !== "object") continue;
        records[stage.id] = {
          clears: finiteCount(candidate.clears),
          bestScore: finiteCount(candidate.bestScore),
          bestRank: validRank(candidate.bestRank) ? candidate.bestRank : "D",
          noDamage: candidate.noDamage === true,
          medals: uniqueMedals(candidate.medals),
        };
      }
    }
    const progress: SkyDancerArcadeProgress = {
      version: 2,
      clearedStageIds,
      unlockedStageIds: [...new Set([base.unlockedStageIds[0], ...unlocked])],
      records,
      bestRunScore: finiteCount(parsed.bestRunScore),
      bestRunRank: validRank(parsed.bestRunRank) ? parsed.bestRunRank : "D",
      completedRuns: finiteCount(parsed.completedRuns),
      oneCreditClears: finiteCount(parsed.oneCreditClears),
      totalKills: finiteCount(parsed.totalKills),
      totalNearMisses: finiteCount(parsed.totalNearMisses),
      totalBossKills: finiteCount(parsed.totalBossKills),
      totalArmorBreaks: finiteCount(parsed.totalArmorBreaks),
      totalFormationBreaks: finiteCount(parsed.totalFormationBreaks),
      bestChain: finiteCount(parsed.bestChain),
      bestRoute: uniqueValidStages(parsed.bestRoute),
      bestRouteScore: finiteCount(parsed.bestRouteScore),
      totalMedals: Math.max(
        finiteCount(parsed.totalMedals),
        Object.values(records).reduce((sum, record) => sum + (record?.medals.length ?? 0), 0),
      ),
      recentRoutes: validRecentRoutes(parsed.recentRoutes),
      unlockedPaintSchemes: Array.isArray(parsed.unlockedPaintSchemes)
        ? parsed.unlockedPaintSchemes.filter((value): value is SkyDancerArcadePaintScheme => value === "default" || value === "sunset" || value === "storm" || value === "prism")
        : ["default"],
      unlockedLoadouts: Array.isArray(parsed.unlockedLoadouts)
        ? parsed.unlockedLoadouts.filter((value): value is SkyDancerArcadeLoadout => value === "standard" || value === "missile-focus" || value === "gun-focus")
        : ["standard"],
    };
    if (!progress.unlockedPaintSchemes.includes("default")) progress.unlockedPaintSchemes.unshift("default");
    if (!progress.unlockedLoadouts.includes("standard")) progress.unlockedLoadouts.unshift("standard");
    applyUnlocks(progress);
    return progress;
  } catch {
    return createDefaultSkyDancerArcadeProgress();
  }
}

export function saveSkyDancerArcadeProgress(progress: SkyDancerArcadeProgress): void {
  if (typeof localStorage === "undefined") return;
  try {
    applyUnlocks(progress);
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
  medals: readonly SkyDancerArcadeV11MedalId[] = [],
): SkyDancerArcadeProgress {
  const progress = loadSkyDancerArcadeProgress();
  const stage = SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === stageId);
  const previous = progress.records[stageId];
  progress.records[stageId] = {
    clears: (previous?.clears ?? 0) + 1,
    bestScore: Math.max(previous?.bestScore ?? 0, Math.floor(score)),
    bestRank: !previous || RANK_VALUE[rank] > RANK_VALUE[previous.bestRank] ? rank : previous.bestRank,
    noDamage: Boolean(previous?.noDamage || noDamage),
    medals: [...new Set([...(previous?.medals ?? []), ...medals.filter(validMedal)])],
  };
  if (!progress.clearedStageIds.includes(stageId)) progress.clearedStageIds.push(stageId);
  for (const next of stage?.next ?? []) {
    if (!progress.unlockedStageIds.includes(next)) progress.unlockedStageIds.push(next);
  }
  progress.totalMedals = Object.values(progress.records).reduce((sum, record) => sum + (record?.medals.length ?? 0), 0);
  saveSkyDancerArcadeProgress(progress);
  return progress;
}

export function recordSkyDancerArcadeRunClear(
  score: number,
  rank: SkyDancerArcadeRank,
  continuesUsed: number,
  summary?: SkyDancerArcadeRunSummary,
): SkyDancerArcadeProgress {
  const progress = loadSkyDancerArcadeProgress();
  progress.completedRuns += 1;
  if (continuesUsed === 0) progress.oneCreditClears += 1;
  if (score > progress.bestRunScore) progress.bestRunScore = Math.floor(score);
  if (RANK_VALUE[rank] > RANK_VALUE[progress.bestRunRank]) progress.bestRunRank = rank;
  if (summary) {
    progress.totalKills += finiteCount(summary.kills);
    progress.totalNearMisses += finiteCount(summary.nearMisses);
    progress.totalBossKills += finiteCount(summary.bossKills);
    progress.totalArmorBreaks += finiteCount(summary.armorBreaks);
    progress.totalFormationBreaks += finiteCount(summary.formationBreaks);
    progress.bestChain = Math.max(progress.bestChain, finiteCount(summary.bestChain));
    progress.totalMedals = Math.max(progress.totalMedals, finiteCount(summary.medalsEarned));
    if (summary.route.length > 0) {
      const route = uniqueValidStages(summary.route);
      progress.recentRoutes = [route, ...progress.recentRoutes.filter(previous => previous.join(">") !== route.join(">"))].slice(0, 8);
    }
    if (score > progress.bestRouteScore && summary.route.length > 0) {
      progress.bestRouteScore = Math.floor(score);
      progress.bestRoute = uniqueValidStages(summary.route);
    }
  }
  applyUnlocks(progress);
  saveSkyDancerArcadeProgress(progress);
  return progress;
}
