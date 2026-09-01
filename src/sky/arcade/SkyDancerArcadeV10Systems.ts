import type {
  SkyDancerArcadeBiome,
  SkyDancerArcadeEnemyKind,
  SkyDancerArcadeHazardKind,
} from "./SkyDancerArcadeData";

export type SkyDancerArcadeEnemyRole = "skirmisher" | "hunter" | "artillery" | "heavy" | "ace" | "climax";
export type SkyDancerArcadeBossPhase = 1 | 2 | 3;

export interface SkyDancerArcadeStageEvolutionProfile {
  labels: readonly [string, string];
  eventHazards: readonly [SkyDancerArcadeHazardKind, SkyDancerArcadeHazardKind];
  hazardBursts: readonly [number, number];
  cameraStrength: number;
  scoreBonus: number;
}

const STAGE_EVOLUTION: Record<SkyDancerArcadeBiome, SkyDancerArcadeStageEvolutionProfile> = {
  city: { labels: ["SKYLINE SLALOM", "TOWER CROSSING"], eventHazards: ["tower", "arch"], hazardBursts: [1, 2], cameraStrength: .72, scoreBonus: 900 },
  canyon: { labels: ["CANYON COLLAPSE", "KNIFE PASS"], eventHazards: ["rock", "arch"], hazardBursts: [1, 2], cameraStrength: .82, scoreBonus: 1050 },
  cloud: { labels: ["FLEET CROSSING", "DECK BREAK"], eventHazards: ["debris", "mine"], hazardBursts: [1, 2], cameraStrength: .76, scoreBonus: 1000 },
  storm: { labels: ["THUNDER WALL", "LIGHTNING CORRIDOR"], eventHazards: ["lightning", "debris"], hazardBursts: [1, 2], cameraStrength: 1, scoreBonus: 1200 },
  desert: { labels: ["FORTRESS BARRAGE", "SANDWALL BREACH"], eventHazards: ["tower", "mine"], hazardBursts: [1, 2], cameraStrength: .9, scoreBonus: 1150 },
  ice: { labels: ["ICE COLLAPSE", "CRYSTAL BREAK"], eventHazards: ["rock", "arch"], hazardBursts: [1, 2], cameraStrength: .82, scoreBonus: 1100 },
  ruins: { labels: ["RUIN GATE SHIFT", "ANCIENT CROSSWIND"], eventHazards: ["arch", "mine"], hazardBursts: [1, 2], cameraStrength: .84, scoreBonus: 1150 },
  night: { labels: ["NEON TUNNEL", "METRO PURSUIT"], eventHazards: ["tower", "debris"], hazardBursts: [1, 2], cameraStrength: .9, scoreBonus: 1250 },
  volcano: { labels: ["MAGMA ERUPTION", "CORE SURGE"], eventHazards: ["rock", "lightning"], hazardBursts: [1, 2], cameraStrength: 1, scoreBonus: 1350 },
  orbit: { labels: ["DEBRIS FIELD", "LANCE ASCENT"], eventHazards: ["debris", "mine"], hazardBursts: [1, 2], cameraStrength: .94, scoreBonus: 1400 },
  citadel: { labels: ["PRISM DISTORTION", "TITAN APPROACH"], eventHazards: ["arch", "mine"], hazardBursts: [2, 2], cameraStrength: 1, scoreBonus: 1600 },
};

export function skyDancerArcadeEnemyRole(kind: SkyDancerArcadeEnemyKind | "boss", boss = kind === "boss"): SkyDancerArcadeEnemyRole {
  if (boss) return "climax";
  if (kind === "interceptor") return "hunter";
  if (kind === "missile-boat") return "artillery";
  if (kind === "bomber") return "heavy";
  if (kind === "ace") return "ace";
  return "skirmisher";
}

export function skyDancerArcadeTargetPriority(role: SkyDancerArcadeEnemyRole): number {
  switch (role) {
    case "climax": return 12;
    case "artillery": return 9;
    case "ace": return 8;
    case "hunter": return 5;
    case "heavy": return 4;
    default: return 2;
  }
}

export function skyDancerArcadeArmorRatio(kind: SkyDancerArcadeEnemyKind | "boss", boss = kind === "boss"): number {
  if (boss) return .22;
  if (kind === "missile-boat") return .18;
  if (kind === "bomber") return .3;
  if (kind === "ace") return .14;
  return 0;
}

export function skyDancerArcadeBossPhase(hp: number, maxHp: number): SkyDancerArcadeBossPhase {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  return ratio > .66 ? 1 : ratio > .33 ? 2 : 3;
}

export function skyDancerArcadeBossPhaseLabel(phase: SkyDancerArcadeBossPhase): string {
  return phase === 1 ? "OUTER ARMOR" : phase === 2 ? "CORE WINDOW" : "FINAL ASSAULT";
}

export function skyDancerArcadeBossWeakpointOpen(phase: SkyDancerArcadeBossPhase, ageSeconds: number): boolean {
  if (phase === 1) return false;
  const period = phase === 2 ? 2.8 : 2.05;
  const openWindow = phase === 2 ? 1.05 : 1.28;
  const cycle = ((ageSeconds % period) + period) % period;
  return cycle >= period - openWindow;
}

export function skyDancerArcadeStageEvolutionProfile(biome: SkyDancerArcadeBiome): SkyDancerArcadeStageEvolutionProfile {
  return STAGE_EVOLUTION[biome];
}

export function skyDancerArcadeStageEventCheckpoint(progress: number, finalStage = false): 0 | 1 | 2 {
  // V10.1: keep the second authored course beat out of route selection and out of the boss arena.
  const secondBeat = finalStage ? .34 : .46;
  if (progress >= secondBeat) return 2;
  if (progress >= .18) return 1;
  return 0;
}

export function skyDancerArcadeBossStartProgress(finalStage: boolean): number {
  // Non-final sections get a clean recovery beat after event #2. The finale still reserves most of its back half for the boss.
  return finalStage ? .44 : .58;
}
