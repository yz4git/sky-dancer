import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV11RouteRisk } from "./SkyDancerArcadeV11Timeline";

export type SkyDancerArcadeV11MedalId = "score" | "signature" | "no-damage";

export interface SkyDancerArcadeV11StagePerformance {
  score: number;
  destroyed: number;
  nearMisses: number;
  multiLockKills: number;
  turboSmashes: number;
  bestChain: number;
  armorBreaks: number;
  formationBreaks: number;
  noDamage: boolean;
}

export interface SkyDancerArcadeV11MedalGoal {
  id: SkyDancerArcadeV11MedalId;
  label: string;
  description: string;
}

export interface SkyDancerArcadeV11MedalResult extends SkyDancerArcadeV11MedalGoal {
  earned: boolean;
  reward: number;
}

export interface SkyDancerArcadeV11ScoreBreakdown {
  combat: number;
  medal: number;
  perfect: number;
  boss: number;
  route: number;
  total: number;
}

interface MedalDefinition {
  scoreTarget: number;
  scoreLabel: string;
  signatureLabel: string;
  signatureDescription: string;
  signature: (performance: SkyDancerArcadeV11StagePerformance) => boolean;
}

const DEFINITIONS: Record<SkyDancerArcadeStageId, MedalDefinition> = {
  "dawn-city": { scoreTarget:12000, scoreLabel:"CITY ACE", signatureLabel:"THREAD THE CITY", signatureDescription:"2 NEAR MISSES", signature:p=>p.nearMisses>=2 },
  "red-canyon": { scoreTarget:13500, scoreLabel:"CANYON ACE", signatureLabel:"KNIFE EDGE", signatureDescription:"3 NEAR MISSES", signature:p=>p.nearMisses>=3 },
  "cloud-fleet": { scoreTarget:14500, scoreLabel:"FLEET ACE", signatureLabel:"FORMATION BREAKER", signatureDescription:"BREAK 1 FORMATION", signature:p=>p.formationBreaks>=1 },
  "storm-carrier": { scoreTarget:15000, scoreLabel:"STORM ACE", signatureLabel:"THUNDER DANCER", signatureDescription:"2 NEAR MISSES", signature:p=>p.nearMisses>=2 },
  "desert-fortress": { scoreTarget:15500, scoreLabel:"FORTRESS ACE", signatureLabel:"WALL BREAKER", signatureDescription:"BREAK 1 ARMOR", signature:p=>p.armorBreaks>=1 },
  "ice-cavern": { scoreTarget:16000, scoreLabel:"ICE ACE", signatureLabel:"CRYSTAL COMBO", signatureDescription:"CHAIN ×5", signature:p=>p.bestChain>=5 },
  "floating-ruins": { scoreTarget:16500, scoreLabel:"RUINS ACE", signatureLabel:"LABYRINTH BREAKER", signatureDescription:"BREAK 2 FORMATIONS", signature:p=>p.formationBreaks>=2 },
  "night-metro": { scoreTarget:17500, scoreLabel:"METRO ACE", signatureLabel:"NEON NEEDLE", signatureDescription:"3 NEAR MISSES", signature:p=>p.nearMisses>=3 },
  "volcano-core": { scoreTarget:18500, scoreLabel:"VOLCANO ACE", signatureLabel:"MAGMA SMASH", signatureDescription:"1 TURBO SMASH", signature:p=>p.turboSmashes>=1 },
  "orbital-ascent": { scoreTarget:19500, scoreLabel:"ORBIT ACE", signatureLabel:"SALVO MASTER", signatureDescription:"2 MULTI-LOCK KILLS", signature:p=>p.multiLockKills>=2 },
  "prism-citadel": { scoreTarget:24000, scoreLabel:"PRISM ACE", signatureLabel:"SOVEREIGN BREAKER", signatureDescription:"ARMOR BREAK + CHAIN ×4", signature:p=>p.armorBreaks>=1&&p.bestChain>=4 },
};

export function skyDancerArcadeV11StageMedalGoals(stageId: SkyDancerArcadeStageId): readonly SkyDancerArcadeV11MedalGoal[] {
  const definition = DEFINITIONS[stageId];
  return [
    { id: "score", label: definition.scoreLabel, description: `COMBAT SCORE ${definition.scoreTarget.toLocaleString()}+` },
    { id: "signature", label: definition.signatureLabel, description: definition.signatureDescription },
    { id: "no-damage", label: "PERFECT SKY", description: "NO DAMAGE" },
  ];
}

export function skyDancerArcadeV11StageMedals(stageId: SkyDancerArcadeStageId, performance: SkyDancerArcadeV11StagePerformance): readonly SkyDancerArcadeV11MedalResult[] {
  const definition = DEFINITIONS[stageId];
  return [
    { id:"score", label:definition.scoreLabel, description:`COMBAT SCORE ${definition.scoreTarget.toLocaleString()}+`, earned:performance.score>=definition.scoreTarget, reward:1500 },
    { id:"signature", label:definition.signatureLabel, description:definition.signatureDescription, earned:definition.signature(performance), reward:1800 },
    { id:"no-damage", label:"PERFECT SKY", description:"NO DAMAGE", earned:performance.noDamage, reward:2500 },
  ];
}

export function skyDancerArcadeV11RouteBonus(risk: SkyDancerArcadeV11RouteRisk): number {
  if (risk === "DANGER") return 2200;
  if (risk === "SCORE") return 1100;
  return 0;
}

export function skyDancerArcadeV11ScoreBreakdown(
  combat: number,
  medals: readonly SkyDancerArcadeV11MedalResult[],
  bossBonus: number,
  routeRisk: SkyDancerArcadeV11RouteRisk,
): SkyDancerArcadeV11ScoreBreakdown {
  const medal = medals.filter(result=>result.earned && result.id!=="no-damage").reduce((sum,result)=>sum+result.reward,0);
  const perfect = medals.find(result=>result.id==="no-damage"&&result.earned)?.reward ?? 0;
  const boss = Math.max(0, Math.floor(bossBonus));
  const route = skyDancerArcadeV11RouteBonus(routeRisk);
  const safeCombat = Math.max(0, Math.floor(combat));
  return { combat:safeCombat, medal, perfect, boss, route, total:safeCombat+medal+perfect+boss+route };
}
