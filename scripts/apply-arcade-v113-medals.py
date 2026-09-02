from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch needle in {path}: {old[:160]!r}")
    p.write_text(s.replace(old, new, 1))

scoring = r'''import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
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

export interface SkyDancerArcadeV11MedalResult {
  id: SkyDancerArcadeV11MedalId;
  label: string;
  description: string;
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
'''
Path("src/sky/arcade/SkyDancerArcadeV11Scoring.ts").write_text(scoring)

runtime="src/sky/arcade/SkyDancerArcadeRuntime.ts"
replace_once(runtime,
'''} from "./SkyDancerArcadeV11Bosses";\n\nexport type SkyDancerArcadeStatus =\n''',
'''} from "./SkyDancerArcadeV11Bosses";\nimport {\n  skyDancerArcadeV11ScoreBreakdown,\n  skyDancerArcadeV11StageMedals,\n  type SkyDancerArcadeV11MedalResult,\n  type SkyDancerArcadeV11ScoreBreakdown,\n} from "./SkyDancerArcadeV11Scoring";\n\nexport type SkyDancerArcadeStatus =\n''')
replace_once(runtime,
'''  lastStageScore: number;\n  lastStageRank: SkyDancerArcadeRank;\n  lastStageNoDamage: boolean;\n  message: string | null;\n''',
'''  lastStageScore: number;\n  lastStageRank: SkyDancerArcadeRank;\n  lastStageNoDamage: boolean;\n  lastStageMedals: readonly SkyDancerArcadeV11MedalResult[];\n  lastStageScoreBreakdown: SkyDancerArcadeV11ScoreBreakdown;\n  runMedalsEarned: number;\n  message: string | null;\n''')
replace_once(runtime,
'''interface StageStats {\n  scoreAtStart: number;\n  damageAtStart: number;\n  killsAtStart: number;\n}\n''',
'''interface StageStats {\n  scoreAtStart: number;\n  damageAtStart: number;\n  killsAtStart: number;\n  nearMissesAtStart: number;\n  multiLockKillsAtStart: number;\n  turboSmashesAtStart: number;\n  armorBreaksAtStart: number;\n  formationBreaksAtStart: number;\n}\n''')
replace_once(runtime,'const ARCADE_SECTION_RESULT_SECONDS = 0.55;','const ARCADE_SECTION_RESULT_SECONDS = 1.35;')
replace_once(runtime,
'''  private lastStageRank: SkyDancerArcadeRank = "D";\n  private lastStageNoDamage = false;\n  private message: string | null = "DROP IN · ARCADE RUN";\n''',
'''  private lastStageRank: SkyDancerArcadeRank = "D";\n  private lastStageNoDamage = false;\n  private lastStageMedals: readonly SkyDancerArcadeV11MedalResult[] = [];\n  private lastStageScoreBreakdown: SkyDancerArcadeV11ScoreBreakdown = { combat:0, medal:0, perfect:0, boss:0, route:0, total:0 };\n  private runMedalsEarned = 0;\n  private stageBestChain = 0;\n  private message: string | null = "DROP IN · ARCADE RUN";\n''')
replace_once(runtime,
'''  private readonly stageStats: StageStats = { scoreAtStart: 0, damageAtStart: 0, killsAtStart: 0 };\n''',
'''  private readonly stageStats: StageStats = {\n    scoreAtStart:0, damageAtStart:0, killsAtStart:0, nearMissesAtStart:0, multiLockKillsAtStart:0,\n    turboSmashesAtStart:0, armorBreaksAtStart:0, formationBreaksAtStart:0,\n  };\n''')
replace_once(runtime,
'''    this.stageStats.scoreAtStart = this.score;\n    this.stageStats.damageAtStart = this.damageTaken;\n    this.stageStats.killsAtStart = this.enemiesDefeated;\n''',
'''    this.stageStats.scoreAtStart = this.score;\n    this.stageStats.damageAtStart = this.damageTaken;\n    this.stageStats.killsAtStart = this.enemiesDefeated;\n    this.stageStats.nearMissesAtStart = this.nearMisses;\n    this.stageStats.multiLockKillsAtStart = this.multiLockKills;\n    this.stageStats.turboSmashesAtStart = this.turboSmashes;\n    this.stageStats.armorBreaksAtStart = this.armorBreaks;\n    this.stageStats.formationBreaksAtStart = this.formationBreaks;\n    this.stageBestChain = 0;\n''')
replace_once(runtime,
'''    this.bestChain = Math.max(this.bestChain, this.chain);\n    this.chainTimer = 4.6;\n''',
'''    this.bestChain = Math.max(this.bestChain, this.chain);\n    this.stageBestChain = Math.max(this.stageBestChain, this.chain);\n    this.chainTimer = 4.6;\n''')

old_complete='''  private completeStage(): void {\n    if (this.status !== "running") return;\n    const stageScore = this.score - this.stageStats.scoreAtStart;\n    const stageDamage = this.damageTaken - this.stageStats.damageAtStart;\n    const rank = skyDancerArcadeRankForScore(stageScore, 1, stageDamage, 0);\n    this.stagesCleared += 1;\n    this.lastClearedStageId = this.stage.id;\n    this.lastStageScore = stageScore;\n    this.lastStageRank = rank;\n    this.lastStageNoDamage = stageDamage <= 0.001;\n    this.status = "stage-clear";\n    this.resultTimer = this.options.mode === "stage-practice" ? PRACTICE_RESULT_SECONDS : ARCADE_SECTION_RESULT_SECONDS;\n    this.resultSerial += 1;\n    this.releaseInputs();\n  }\n'''
new_complete='''  private completeStage(): void {\n    if (this.status !== "running") return;\n    const combatScore = this.score - this.stageStats.scoreAtStart;\n    const stageDamage = this.damageTaken - this.stageStats.damageAtStart;\n    const performance = {\n      score: combatScore,\n      destroyed: this.enemiesDefeated - this.stageStats.killsAtStart,\n      nearMisses: this.nearMisses - this.stageStats.nearMissesAtStart,\n      multiLockKills: this.multiLockKills - this.stageStats.multiLockKillsAtStart,\n      turboSmashes: this.turboSmashes - this.stageStats.turboSmashesAtStart,\n      bestChain: this.stageBestChain,\n      armorBreaks: this.armorBreaks - this.stageStats.armorBreaksAtStart,\n      formationBreaks: this.formationBreaks - this.stageStats.formationBreaksAtStart,\n      noDamage: stageDamage <= .001,\n    };\n    const medals = skyDancerArcadeV11StageMedals(this.stage.id, performance);\n    const selectedRouteIndex = this.branchSelection ? this.stage.next.indexOf(this.branchSelection) : -1;\n    const routeRisk = selectedRouteIndex >= 0\n      ? skyDancerArcadeV11RouteRisk(selectedRouteIndex, this.stage.next.length)\n      : "LOCKED";\n    const bossBonus = 1200 + this.stage.act * 260 + (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE ? 1400 : 0);\n    const breakdown = skyDancerArcadeV11ScoreBreakdown(combatScore, medals, bossBonus, routeRisk);\n    const bonus = breakdown.total - breakdown.combat;\n    this.score += bonus;\n    const stageScore = breakdown.total;\n    const rank = skyDancerArcadeRankForScore(stageScore, 1, stageDamage, 0);\n    this.stagesCleared += 1;\n    this.lastClearedStageId = this.stage.id;\n    this.lastStageScore = stageScore;\n    this.lastStageRank = rank;\n    this.lastStageNoDamage = performance.noDamage;\n    this.lastStageMedals = medals;\n    this.lastStageScoreBreakdown = breakdown;\n    this.runMedalsEarned += medals.filter(medal => medal.earned).length;\n    this.status = "stage-clear";\n    this.resultTimer = this.options.mode === "stage-practice" ? PRACTICE_RESULT_SECONDS : ARCADE_SECTION_RESULT_SECONDS;\n    this.resultSerial += 1;\n    this.releaseInputs();\n  }\n'''
replace_once(runtime,old_complete,new_complete)
replace_once(runtime,
'''      lastStageScore: this.lastStageScore,\n      lastStageRank: this.lastStageRank,\n      lastStageNoDamage: this.lastStageNoDamage,\n      message: this.message,\n''',
'''      lastStageScore: this.lastStageScore,\n      lastStageRank: this.lastStageRank,\n      lastStageNoDamage: this.lastStageNoDamage,\n      lastStageMedals: this.lastStageMedals.map(medal => ({ ...medal })),\n      lastStageScoreBreakdown: { ...this.lastStageScoreBreakdown },\n      runMedalsEarned: this.runMedalsEarned,\n      message: this.message,\n''')

# Progress persistence: backward-compatible extension of v2 storage.
progress="src/sky/arcade/SkyDancerArcadeProgress.ts"
replace_once(progress,
'''  type SkyDancerArcadeStageId,\n} from "./SkyDancerArcadeData";\n''',
'''  type SkyDancerArcadeStageId,\n} from "./SkyDancerArcadeData";\nimport type { SkyDancerArcadeV11MedalId } from "./SkyDancerArcadeV11Scoring";\n''')
replace_once(progress,
'''  noDamage: boolean;\n}\n''',
'''  noDamage: boolean;\n  medals: SkyDancerArcadeV11MedalId[];\n}\n''')
replace_once(progress,
'''  bestChain: number;\n}\n\nexport interface SkyDancerArcadeProgress {\n''',
'''  bestChain: number;\n  medalsEarned?: number;\n}\n\nexport interface SkyDancerArcadeProgress {\n''')
replace_once(progress,
'''  bestRouteScore: number;\n  unlockedPaintSchemes: SkyDancerArcadePaintScheme[];\n''',
'''  bestRouteScore: number;\n  totalMedals: number;\n  recentRoutes: SkyDancerArcadeStageId[][];\n  unlockedPaintSchemes: SkyDancerArcadePaintScheme[];\n''')
replace_once(progress,
'''    bestRouteScore: 0,\n    unlockedPaintSchemes: ["default"],\n''',
'''    bestRouteScore: 0,\n    totalMedals: 0,\n    recentRoutes: [],\n    unlockedPaintSchemes: ["default"],\n''')
# helpers
replace_once(progress,
'''function finiteCount(value: unknown): number {\n  return Math.max(0, Math.floor(Number(value) || 0));\n}\n''',
'''function finiteCount(value: unknown): number {\n  return Math.max(0, Math.floor(Number(value) || 0));\n}\n\nfunction validMedal(value: unknown): value is SkyDancerArcadeV11MedalId {\n  return value === "score" || value === "signature" || value === "no-damage";\n}\n\nfunction uniqueMedals(value: unknown): SkyDancerArcadeV11MedalId[] {\n  return Array.isArray(value) ? [...new Set(value.filter(validMedal))] : [];\n}\n\nfunction validRecentRoutes(value: unknown): SkyDancerArcadeStageId[][] {\n  if (!Array.isArray(value)) return [];\n  return value.map(uniqueValidStages).filter(route => route.length > 0).slice(0, 8);\n}\n''')
replace_once(progress,
'''          noDamage: candidate.noDamage === true,\n        };\n''',
'''          noDamage: candidate.noDamage === true,\n          medals: uniqueMedals(candidate.medals),\n        };\n''')
replace_once(progress,
'''      bestRouteScore: finiteCount(parsed.bestRouteScore),\n      unlockedPaintSchemes: Array.isArray(parsed.unlockedPaintSchemes)\n''',
'''      bestRouteScore: finiteCount(parsed.bestRouteScore),\n      totalMedals: finiteCount(parsed.totalMedals),\n      recentRoutes: validRecentRoutes(parsed.recentRoutes),\n      unlockedPaintSchemes: Array.isArray(parsed.unlockedPaintSchemes)\n''')
replace_once(progress,
'''  noDamage: boolean,\n): SkyDancerArcadeProgress {\n''',
'''  noDamage: boolean,\n  medals: readonly SkyDancerArcadeV11MedalId[] = [],\n): SkyDancerArcadeProgress {\n''')
replace_once(progress,
'''    noDamage: Boolean(previous?.noDamage || noDamage),\n  };\n''',
'''    noDamage: Boolean(previous?.noDamage || noDamage),\n    medals: [...new Set([...(previous?.medals ?? []), ...medals.filter(validMedal)])],\n  };\n''')
# Recompute total unique stage medals after each stage clear.
replace_once(progress,
'''  for (const next of stage?.next ?? []) {\n    if (!progress.unlockedStageIds.includes(next)) progress.unlockedStageIds.push(next);\n  }\n  saveSkyDancerArcadeProgress(progress);\n''',
'''  for (const next of stage?.next ?? []) {\n    if (!progress.unlockedStageIds.includes(next)) progress.unlockedStageIds.push(next);\n  }\n  progress.totalMedals = Object.values(progress.records).reduce((sum, record) => sum + (record?.medals.length ?? 0), 0);\n  saveSkyDancerArcadeProgress(progress);\n''')
replace_once(progress,
'''    progress.bestChain = Math.max(progress.bestChain, finiteCount(summary.bestChain));\n    if (score > progress.bestRouteScore && summary.route.length > 0) {\n''',
'''    progress.bestChain = Math.max(progress.bestChain, finiteCount(summary.bestChain));\n    progress.totalMedals = Math.max(progress.totalMedals, finiteCount(summary.medalsEarned));\n    if (summary.route.length > 0) {\n      const route = uniqueValidStages(summary.route);\n      progress.recentRoutes = [route, ...progress.recentRoutes.filter(previous => previous.join(">") !== route.join(">"))].slice(0, 8);\n    }\n    if (score > progress.bestRouteScore && summary.route.length > 0) {\n''')

# UI persistence and result presentation.
ui="app/SkyDancerArcadeMode.tsx"
replace_once(ui,
'''      snapshot.lastStageNoDamage,\n    );\n  }, [snapshot.lastClearedStageId, snapshot.lastStageNoDamage, snapshot.lastStageRank, snapshot.lastStageScore, snapshot.resultSerial]);\n''',
'''      snapshot.lastStageNoDamage,\n      snapshot.lastStageMedals.filter(medal => medal.earned).map(medal => medal.id),\n    );\n  }, [snapshot.lastClearedStageId, snapshot.lastStageMedals, snapshot.lastStageNoDamage, snapshot.lastStageRank, snapshot.lastStageScore, snapshot.resultSerial]);\n''')
replace_once(ui,
'''      bestChain: snapshot.bestChain,\n    });\n''',
'''      bestChain: snapshot.bestChain,\n      medalsEarned: snapshot.runMedalsEarned,\n    });\n''')
replace_once(ui,
'''              <div><span>SECTION SCORE</span><b>{snapshot.lastStageScore}</b></div>\n              <p>NEXT SORTIE IN {snapshot.resultTimer.toFixed(1)}s</p>\n''',
'''              <div className={productStyles.v11ScoreBreakdown}>\n                <span><small>COMBAT</small><b>{snapshot.lastStageScoreBreakdown.combat}</b></span>\n                <span><small>MEDAL</small><b>+{snapshot.lastStageScoreBreakdown.medal}</b></span>\n                <span><small>PERFECT</small><b>+{snapshot.lastStageScoreBreakdown.perfect}</b></span>\n                <span><small>ROUTE</small><b>+{snapshot.lastStageScoreBreakdown.route}</b></span>\n                <span><small>BOSS</small><b>+{snapshot.lastStageScoreBreakdown.boss}</b></span>\n              </div>\n              <div className={productStyles.v11Medals}>\n                {snapshot.lastStageMedals.map(medal => <span key={medal.id} data-earned={medal.earned}><b>{medal.earned ? "◆" : "◇"} {medal.label}</b><small>{medal.description}</small></span>)}\n              </div>\n              <div><span>SECTION SCORE</span><b>{snapshot.lastStageScore}</b></div>\n              <p>NEXT SORTIE IN {snapshot.resultTimer.toFixed(1)}s</p>\n''')
replace_once(ui,
'''                <span><small>BOSS</small><b>{snapshot.bossKills}</b></span>\n                <span><small>BEST CHAIN</small><b>×{snapshot.bestChain}</b></span>\n              </div>\n''',
'''                <span><small>MEDALS</small><b>{snapshot.runMedalsEarned}</b></span>\n                <span><small>BEST CHAIN</small><b>×{snapshot.bestChain}</b></span>\n              </div>\n              {snapshot.route.length > 1 && <div className={productStyles.v11RouteHistory}><small>FLIGHT ROUTE</small><strong>{snapshot.route.map(id => skyDancerArcadeStageById(id).shortName).join(" → ")}</strong></div>}\n''')

css=Path("app/SkyDancerArcadeProduct.module.css")
s=css.read_text()+r'''

.v11ScoreBreakdown{display:grid!important;grid-template-columns:repeat(5,1fr);gap:4px!important;margin:9px 0 6px!important}
.v11ScoreBreakdown span{padding:4px 3px;border:1px solid rgba(255,255,255,.1);border-radius:5px;background:rgba(255,255,255,.025)}
.v11ScoreBreakdown small,.v11ScoreBreakdown b{display:block}.v11ScoreBreakdown small{font-size:5px;letter-spacing:.11em;color:#7ee9ff}.v11ScoreBreakdown b{margin-top:2px;font-size:9px;color:#fff0a3}
.v11Medals{display:grid!important;grid-template-columns:repeat(3,1fr);gap:5px!important;margin:5px 0 8px!important}
.v11Medals span{padding:5px 4px;border:1px solid rgba(255,255,255,.11);border-radius:6px;background:rgba(255,255,255,.025);opacity:.36}.v11Medals span[data-earned="true"]{border-color:rgba(255,218,105,.5);background:rgba(255,202,70,.08);opacity:1;box-shadow:0 0 10px rgba(255,189,61,.09)}
.v11Medals b,.v11Medals small{display:block}.v11Medals b{font-size:6px;letter-spacing:.07em;color:#ffe47c}.v11Medals small{margin-top:2px;font-size:5px;letter-spacing:.07em;color:rgba(255,255,255,.55)}
.v11RouteHistory{margin:7px 0 10px;padding:7px;border:1px solid rgba(111,226,255,.18);border-radius:7px;background:rgba(5,17,34,.45)}.v11RouteHistory small,.v11RouteHistory strong{display:block}.v11RouteHistory small{font-size:5px;letter-spacing:.18em;color:#72e8ff}.v11RouteHistory strong{margin-top:3px;font-size:7px;letter-spacing:.08em;color:rgba(255,255,255,.82)}
@media(max-height:480px){.v11ScoreBreakdown{margin:4px 0!important}.v11Medals{margin:3px 0 4px!important}.v11Medals span{padding:3px}.v11Medals small{display:none}}
'''
css.write_text(s)

tests=r'''import test from "node:test";
import assert from "node:assert/strict";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  skyDancerArcadeV11ScoreBreakdown,
  skyDancerArcadeV11StageMedals,
} from "../src/sky/arcade/SkyDancerArcadeV11Scoring";
import {
  createDefaultSkyDancerArcadeProgress,
  loadSkyDancerArcadeProgress,
  recordSkyDancerArcadeRunClear,
  recordSkyDancerArcadeStageClear,
} from "../src/sky/arcade/SkyDancerArcadeProgress";

test("V11.3 stage missions reward score, signature play and no-damage separately",()=>{
  const medals=skyDancerArcadeV11StageMedals("dawn-city",{score:13000,destroyed:7,nearMisses:2,multiLockKills:0,turboSmashes:0,bestChain:4,armorBreaks:0,formationBreaks:0,noDamage:true});
  assert.deepEqual(medals.map(m=>[m.id,m.earned]),[["score",true],["signature",true],["no-damage",true]]);
  const orbit=skyDancerArcadeV11StageMedals("orbital-ascent",{score:20000,destroyed:8,nearMisses:0,multiLockKills:1,turboSmashes:0,bestChain:6,armorBreaks:0,formationBreaks:1,noDamage:false});
  assert.equal(orbit.find(m=>m.id==="signature")?.earned,false);
});

test("V11.3 score breakdown is exact and rewards dangerous routes",()=>{
  const medals=skyDancerArcadeV11StageMedals("dawn-city",{score:13000,destroyed:7,nearMisses:2,multiLockKills:0,turboSmashes:0,bestChain:4,armorBreaks:0,formationBreaks:0,noDamage:true});
  const safe=skyDancerArcadeV11ScoreBreakdown(13000,medals,1460,"SAFE");
  const danger=skyDancerArcadeV11ScoreBreakdown(13000,medals,1460,"DANGER");
  assert.equal(safe.total,safe.combat+safe.medal+safe.perfect+safe.boss+safe.route);
  assert.equal(danger.total-safe.total,2200);
});

test("V11.3 runtime stage result carries medals and an exact score ledger",()=>{
  const runtime=new SkyDancerArcadeRuntime({mode:"arcade-run",difficulty:"normal",seed:913});
  runtime.completeCurrentStageForTests("cloud-fleet");
  const snapshot=runtime.getSnapshot();
  assert.equal(snapshot.status,"stage-clear");
  assert.equal(snapshot.lastStageMedals.length,3);
  assert.ok(snapshot.lastStageMedals.find(m=>m.id==="no-damage")?.earned);
  const b=snapshot.lastStageScoreBreakdown;
  assert.equal(snapshot.lastStageScore,b.total);
  assert.equal(b.total,b.combat+b.medal+b.perfect+b.boss+b.route);
  assert.equal(b.route,2200,"right-hand Dawn route is the V11 danger route");
});

test("V11.3 progress persists unique medals and recent route history without breaking v2 saves",()=>{
  const memory=new Map<string,string>();
  const storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)},removeItem:(k:string)=>{memory.delete(k)},clear:()=>memory.clear(),key:(i:number)=>[...memory.keys()][i]??null,get length(){return memory.size}};
  Object.defineProperty(globalThis,"localStorage",{value:storage,configurable:true});
  const base=createDefaultSkyDancerArcadeProgress();
  assert.equal(base.version,2);
  recordSkyDancerArcadeStageClear("dawn-city",18000,"A",true,["score","signature","no-damage"]);
  recordSkyDancerArcadeStageClear("dawn-city",19000,"S",false,["score"]);
  recordSkyDancerArcadeRunClear(80000,"A",0,{route:["dawn-city","cloud-fleet","storm-carrier","ice-cavern","night-metro","orbital-ascent","prism-citadel"],kills:20,nearMisses:5,bossKills:7,armorBreaks:3,formationBreaks:4,bestChain:9,medalsEarned:12});
  const loaded=loadSkyDancerArcadeProgress();
  assert.deepEqual(loaded.records["dawn-city"]?.medals.sort(),["no-damage","score","signature"]);
  assert.equal(loaded.totalMedals,12);
  assert.equal(loaded.recentRoutes.length,1);
  assert.equal(loaded.recentRoutes[0]?.at(-1),"prism-citadel");
});
'''
Path("tests/sky-arcade-v113-scoring.test.ts").write_text(tests)

p=Path("docs/ARCADE_V11_EVOLUTION.md")
p.write_text(p.read_text()+r'''

## V11.3 — Medals, Score Ledger & Route History
- Every stage now has three post-clear missions: score ace, a biome-specific signature challenge and PERFECT SKY no-damage.
- Section clear adds explicit medal/perfect/boss/route bonuses on top of combat score and shows the exact ledger.
- SCORE and DANGER route choices now have explicit score value; SAFE remains the recovery-minded route.
- Stage records persist unique earned medals without invalidating the existing v2 localStorage format.
- Completed runs retain recent route history (up to eight unique routes) and total medal achievement count.
- Section result readability is extended from 0.55s to 1.35s in Arcade Run; Stage Practice remains longer.
''')
print("V11.3 medals applied")
