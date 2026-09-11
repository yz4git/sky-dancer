from pathlib import Path

def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))

def replace_all_checked(path: str, old: str, new: str, minimum: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"anchor count {count} < {minimum} in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new))

Path("src/sky/arcade/SkyDancerArcadeV405RouteReactiveFinalBoss.ts").write_text('import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeHazardKind } from "./SkyDancerArcadeData";\nimport type { SkyDancerArcadeV404RivalOutcome } from "./SkyDancerArcadeV404RivalAce";\nimport type { SkyDancerArcadeV40RouteDoctrine } from "./SkyDancerArcadeV40WorldBreak";\n\nexport type SkyDancerArcadeV405RouteMemory = "SAFE" | "SCORE" | "DANGER" | "MIXED";\nexport type SkyDancerArcadeV405RivalMemory = "NOVA_BROKEN" | "NOVA_DEBT" | "CONTESTED";\nexport type SkyDancerArcadeV405FinalBossForm = "MIRROR_AEGIS" | "PRISM_CROWN" | "HELLSTAR" | "SEVEN_SKY";\nexport type SkyDancerArcadeV405ResolvedRivalOutcome = Exclude<SkyDancerArcadeV404RivalOutcome, "NONE">;\n\nexport interface SkyDancerArcadeV405FinalBossContract {\n  routeMemory: SkyDancerArcadeV405RouteMemory;\n  rivalMemory: SkyDancerArcadeV405RivalMemory;\n  form: SkyDancerArcadeV405FinalBossForm;\n  formLabel: string;\n  accent: number;\n  hpScale: number;\n  cadenceScale: number;\n  guidanceScale: number;\n  projectileSpeedScale: number;\n  spreadBonus: number;\n  endingLine: string;\n}\n\nexport interface SkyDancerArcadeV405FinalBossPhaseContract {\n  label: string;\n  hazard: SkyDancerArcadeHazardKind | null;\n  hazardBursts: number;\n  escortKind: SkyDancerArcadeEnemyKind | null;\n  escortCount: number;\n  cadenceScale: number;\n  guidanceScale: number;\n  projectileSpeedScale: number;\n  spreadBonus: number;\n}\n\nconst clampPhase = (phase: number) => Math.max(1, Math.min(3, Math.round(phase))) as 1 | 2 | 3;\n\nexport function skyDancerArcadeV405RouteMemory(\n  history: readonly SkyDancerArcadeV40RouteDoctrine[],\n): SkyDancerArcadeV405RouteMemory {\n  const counts: Record<Exclude<SkyDancerArcadeV40RouteDoctrine, "LOCKED">, number> = {\n    SAFE: 0,\n    SCORE: 0,\n    DANGER: 0,\n  };\n  for (const doctrine of history) {\n    if (doctrine !== "LOCKED") counts[doctrine] += 1;\n  }\n  const max = Math.max(counts.SAFE, counts.SCORE, counts.DANGER);\n  if (max <= 0) return "MIXED";\n  const winners = (["SAFE", "SCORE", "DANGER"] as const).filter((doctrine) => counts[doctrine] === max);\n  return winners.length === 1 ? winners[0] : "MIXED";\n}\n\nexport function skyDancerArcadeV405RivalMemory(\n  outcomes: readonly SkyDancerArcadeV405ResolvedRivalOutcome[],\n): SkyDancerArcadeV405RivalMemory {\n  const wins = outcomes.filter((outcome) => outcome === "BROKEN" || outcome === "OUTFLOWN").length;\n  const escapes = outcomes.filter((outcome) => outcome === "ESCAPED").length;\n  if (wins >= 3) return "NOVA_BROKEN";\n  if (escapes >= 2) return "NOVA_DEBT";\n  return "CONTESTED";\n}\n\nexport function skyDancerArcadeV405FinalBossContract(\n  routeHistory: readonly SkyDancerArcadeV40RouteDoctrine[],\n  rivalOutcomes: readonly SkyDancerArcadeV405ResolvedRivalOutcome[],\n): SkyDancerArcadeV405FinalBossContract {\n  const routeMemory = skyDancerArcadeV405RouteMemory(routeHistory);\n  const rivalMemory = skyDancerArcadeV405RivalMemory(rivalOutcomes);\n  const route = routeMemory === "SAFE"\n    ? { form: "MIRROR_AEGIS" as const, formLabel: "MIRROR AEGIS", accent: 0x6ff4ff, hp: 1.08, cadence: 1.02, guidance: 1.07, speed: .98, spread: 0 }\n    : routeMemory === "SCORE"\n      ? { form: "PRISM_CROWN" as const, formLabel: "PRISM CROWN", accent: 0xffd96a, hp: .98, cadence: .88, guidance: 1.04, speed: 1.08, spread: 1 }\n      : routeMemory === "DANGER"\n        ? { form: "HELLSTAR" as const, formLabel: "HELLSTAR", accent: 0xff476f, hp: 1.12, cadence: .80, guidance: 1.14, speed: 1.12, spread: 1 }\n        : { form: "SEVEN_SKY" as const, formLabel: "SEVEN SKY", accent: 0xb993ff, hp: 1.04, cadence: .92, guidance: 1.06, speed: 1.04, spread: 0 };\n\n  const rival = rivalMemory === "NOVA_BROKEN"\n    ? { hp: .94, cadence: .97, guidance: .98, speed: .99, ending: "NOVA-7 ACKNOWLEDGES · SKY IS YOURS" }\n    : rivalMemory === "NOVA_DEBT"\n      ? { hp: 1.12, cadence: .90, guidance: 1.08, speed: 1.06, ending: "NOVA DEBT PAID · SIGNAL SILENCED" }\n      : { hp: 1, cadence: 1, guidance: 1.02, speed: 1.02, ending: "SEVEN SKY RESOLVED · RIVALRY CLOSED" };\n\n  return {\n    routeMemory,\n    rivalMemory,\n    form: route.form,\n    formLabel: route.formLabel,\n    accent: route.accent,\n    hpScale: route.hp * rival.hp,\n    cadenceScale: route.cadence * rival.cadence,\n    guidanceScale: route.guidance * rival.guidance,\n    projectileSpeedScale: route.speed * rival.speed,\n    spreadBonus: route.spread,\n    endingLine: rival.ending,\n  };\n}\n\nexport function skyDancerArcadeV405FinalBossPhase(\n  contract: SkyDancerArcadeV405FinalBossContract,\n  phase: number,\n): SkyDancerArcadeV405FinalBossPhaseContract {\n  const p = clampPhase(phase);\n  const route = contract.routeMemory;\n  const labels: Record<SkyDancerArcadeV405RouteMemory, readonly [string, string, string]> = {\n    SAFE: ["MIRROR AEGIS", "SAFE-LANE REFRACTION", "AEGIS COLLAPSE"],\n    SCORE: ["PRISM CROWN", "SCORE DENIAL LATTICE", "CROWN OVERCLOCK"],\n    DANGER: ["HELLSTAR ARMOR", "DANGER-LANE PUNISH", "HELLSTAR OVERDRIVE"],\n    MIXED: ["SEVEN SKY ARMOR", "ROUTE ECHO ARRAY", "SPECTRUM OVERDRIVE"],\n  };\n  const routeHazard: Record<SkyDancerArcadeV405RouteMemory, SkyDancerArcadeHazardKind> = {\n    SAFE: "arch",\n    SCORE: "mine",\n    DANGER: "lightning",\n    MIXED: "debris",\n  };\n  const phaseEscalation = p === 1 ? 1 : p === 2 ? .96 : .90;\n  const debt = contract.rivalMemory === "NOVA_DEBT";\n  const contested = contract.rivalMemory === "CONTESTED";\n  const escortKind: SkyDancerArcadeEnemyKind | null = p === 3\n    ? debt ? "ace" : contested ? "interceptor" : null\n    : null;\n  const rivalSuffix = p === 3\n    ? contract.rivalMemory === "NOVA_BROKEN"\n      ? " · ACELESS SKY"\n      : debt\n        ? " · NOVA DEBT"\n        : " · FINAL MEMORY"\n    : "";\n\n  return {\n    label: `${labels[route][p - 1]}${rivalSuffix}`,\n    hazard: p === 1 ? null : routeHazard[route],\n    hazardBursts: p === 1 ? 0 : route === "DANGER" && p === 3 ? 2 : 1,\n    escortKind,\n    escortCount: escortKind ? 1 : 0,\n    cadenceScale: contract.cadenceScale * phaseEscalation,\n    guidanceScale: contract.guidanceScale * (p === 3 ? 1.05 : 1),\n    projectileSpeedScale: contract.projectileSpeedScale * (p === 3 ? 1.04 : 1),\n    spreadBonus: contract.spreadBonus + (route === "SCORE" && p === 3 ? 1 : 0),\n  };\n}\n')
Path("tests/sky-arcade-v405-route-reactive-final-boss.test.ts").write_text('import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport test from "node:test";\nimport { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";\nimport {\n  skyDancerArcadeV405FinalBossContract,\n  skyDancerArcadeV405FinalBossPhase,\n  skyDancerArcadeV405RivalMemory,\n  skyDancerArcadeV405RouteMemory,\n} from "../src/sky/arcade/SkyDancerArcadeV405RouteReactiveFinalBoss";\n\ntest("V40.5 route memory selects four genuinely different Prism Sovereign forms", () => {\n  assert.equal(skyDancerArcadeV405RouteMemory(["SAFE", "SAFE", "SCORE"]), "SAFE");\n  assert.equal(skyDancerArcadeV405RouteMemory(["SCORE", "SCORE", "SAFE"]), "SCORE");\n  assert.equal(skyDancerArcadeV405RouteMemory(["DANGER", "DANGER", "SAFE"]), "DANGER");\n  assert.equal(skyDancerArcadeV405RouteMemory(["SAFE", "SCORE", "DANGER"]), "MIXED");\n\n  const safe = skyDancerArcadeV405FinalBossContract(["SAFE", "SAFE"], ["BROKEN", "OUTFLOWN", "BROKEN"]);\n  const score = skyDancerArcadeV405FinalBossContract(["SCORE", "SCORE"], ["BROKEN", "OUTFLOWN", "BROKEN"]);\n  const danger = skyDancerArcadeV405FinalBossContract(["DANGER", "DANGER"], ["ESCAPED", "ESCAPED", "BROKEN"]);\n  const mixed = skyDancerArcadeV405FinalBossContract(["SAFE", "SCORE"], ["BROKEN", "ESCAPED", "OUTFLOWN"]);\n\n  assert.equal(safe.form, "MIRROR_AEGIS");\n  assert.equal(score.form, "PRISM_CROWN");\n  assert.equal(danger.form, "HELLSTAR");\n  assert.equal(mixed.form, "SEVEN_SKY");\n  assert.notEqual(safe.cadenceScale, danger.cadenceScale);\n  assert.ok(danger.hpScale > safe.hpScale);\n});\n\ntest("V40.5 remembers whether NOVA-7 was conquered, escaped, or contested", () => {\n  assert.equal(skyDancerArcadeV405RivalMemory(["BROKEN", "OUTFLOWN", "BROKEN"]), "NOVA_BROKEN");\n  assert.equal(skyDancerArcadeV405RivalMemory(["ESCAPED", "ESCAPED", "BROKEN"]), "NOVA_DEBT");\n  assert.equal(skyDancerArcadeV405RivalMemory(["BROKEN", "ESCAPED", "OUTFLOWN"]), "CONTESTED");\n});\n\ntest("V40.5 final boss phase contract changes hazard, cadence and final memory", () => {\n  const contract = skyDancerArcadeV405FinalBossContract(\n    ["DANGER", "DANGER", "SCORE"],\n    ["ESCAPED", "ESCAPED", "BROKEN"],\n  );\n  const phase2 = skyDancerArcadeV405FinalBossPhase(contract, 2);\n  const phase3 = skyDancerArcadeV405FinalBossPhase(contract, 3);\n  assert.equal(phase2.hazard, "lightning");\n  assert.equal(phase3.escortKind, "ace");\n  assert.ok(phase3.cadenceScale < phase2.cadenceScale);\n  assert.match(phase3.label, /NOVA DEBT/);\n});\n\ntest("V40.5 runtime spawns a route-reactive Prism Sovereign and arms its remembered attack", () => {\n  const runtime = new SkyDancerArcadeRuntime({\n    difficulty: "normal",\n    mode: "stage-practice",\n    startStageId: "prism-citadel",\n    seed: 405,\n  });\n  runtime.configureV405FinalBossMemoryForTests(\n    ["DANGER", "DANGER", "SCORE"],\n    ["ESCAPED", "ESCAPED", "BROKEN"],\n  );\n  runtime.spawnV405FinalBossForTests();\n  let snapshot = runtime.getSnapshot();\n\n  assert.equal(snapshot.bossActive, true);\n  assert.equal(snapshot.finalBossReactive, true);\n  assert.equal(snapshot.finalBossForm, "HELLSTAR");\n  assert.equal(snapshot.finalBossRouteMemory, "DANGER");\n  assert.equal(snapshot.finalBossRivalMemory, "NOVA_DEBT");\n  assert.ok(snapshot.bossMaxHp > 1280);\n  assert.equal(snapshot.enemies.find((enemy) => enemy.boss)?.finalBossForm, "HELLSTAR");\n\n  runtime.triggerBossPhaseForTests(2);\n  snapshot = runtime.getSnapshot();\n  assert.match(snapshot.bossMechanicLabel, /DANGER-LANE PUNISH/);\n  assert.ok(snapshot.hazards.some((hazard) => hazard.kind === "lightning"));\n});\n\ntest("V40.5 keeps WebGL, Canvas and HUD on the same final-boss memory contract", () => {\n  const models = readFileSync("src/sky/arcade/SkyDancerArcadeModels.ts", "utf8");\n  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");\n  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");\n  const mode = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");\n  assert.match(models, /arcade-v405-final-boss-form/);\n  assert.match(webgl, /finalBossSerial/);\n  assert.match(canvas, /finalBossAccent/);\n  assert.match(mode, /ROUTE MEMORY/);\n  assert.match(mode, /RIVAL MEMORY/);\n});\n')

runtime = "src/sky/arcade/SkyDancerArcadeRuntime.ts"

replace_once(runtime,
"""} from "./SkyDancerArcadeV404RivalAce";
import {
  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,""",
"""} from "./SkyDancerArcadeV404RivalAce";
import {
  skyDancerArcadeV405FinalBossContract,
  skyDancerArcadeV405FinalBossPhase,
  type SkyDancerArcadeV405FinalBossContract,
  type SkyDancerArcadeV405FinalBossForm,
  type SkyDancerArcadeV405ResolvedRivalOutcome,
  type SkyDancerArcadeV405RivalMemory,
  type SkyDancerArcadeV405RouteMemory,
} from "./SkyDancerArcadeV405RouteReactiveFinalBoss";
import {
  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,""")

replace_once(runtime,
"""  rivalAce?: boolean;
  rivalAceAppearance?: number;
  rivalAceResolved?: boolean;
}""",
"""  rivalAce?: boolean;
  rivalAceAppearance?: number;
  rivalAceResolved?: boolean;
  finalBossForm?: SkyDancerArcadeV405FinalBossForm;
  finalBossAccent?: number;
  finalBossReactive?: boolean;
}""")

replace_once(runtime,
"""  rivalAceOutcome: SkyDancerArcadeV404RivalOutcome;
  rivalAceSerial: number;
  worldBreakObjective: string;""",
"""  rivalAceOutcome: SkyDancerArcadeV404RivalOutcome;
  rivalAceSerial: number;
  finalBossReactive: boolean;
  finalBossForm: SkyDancerArcadeV405FinalBossForm | null;
  finalBossFormLabel: string;
  finalBossRouteMemory: SkyDancerArcadeV405RouteMemory;
  finalBossRivalMemory: SkyDancerArcadeV405RivalMemory;
  finalBossAttackLabel: string;
  finalBossEndingLine: string;
  finalBossSerial: number;
  finalBossRouteHistory: readonly SkyDancerArcadeV40RouteDoctrine[];
  finalBossRivalHistory: readonly SkyDancerArcadeV405ResolvedRivalOutcome[];
  worldBreakObjective: string;""")

replace_once(runtime,
"""  private rivalAceEscapes = 0;
  private rivalAceSerial = 0;
  private readonly rivalAceSeenAppearances = new Set<number>();""",
"""  private rivalAceEscapes = 0;
  private rivalAceSerial = 0;
  private readonly worldBreakRouteHistory: SkyDancerArcadeV40RouteDoctrine[] = [];
  private readonly rivalAceOutcomeHistory: SkyDancerArcadeV405ResolvedRivalOutcome[] = [];
  private finalBossContract: SkyDancerArcadeV405FinalBossContract | null = null;
  private finalBossSerial = 0;
  private readonly rivalAceSeenAppearances = new Set<number>();""")

replace_once(runtime,
"""    this.rivalAceActiveId = null;
    this.rivalAceOutcome = outcome;
    if (encounter) this.rivalAceResolvedAppearances.add(encounter.appearance);""",
"""    this.rivalAceActiveId = null;
    this.rivalAceOutcome = outcome;
    this.rivalAceOutcomeHistory.push(outcome);
    if (encounter) this.rivalAceResolvedAppearances.add(encounter.appearance);""")

replace_once(runtime,
"""    const nextDoctrine = skyDancerArcadeV40RouteDoctrine(selectedIndex, this.stage.next.length);
    this.stage = skyDancerArcadeStageById(nextId);
    this.worldBreakRouteDoctrine = nextDoctrine;""",
"""    const nextDoctrine = skyDancerArcadeV40RouteDoctrine(selectedIndex, this.stage.next.length);
    if (nextDoctrine !== "LOCKED") this.worldBreakRouteHistory.push(nextDoctrine);
    this.stage = skyDancerArcadeStageById(nextId);
    this.worldBreakRouteDoctrine = nextDoctrine;""")

replace_once(runtime,
"""  private spawnBoss(): void {
    if (this.bossSpawned) return;""",
"""  private bossMechanicLabel(phase: SkyDancerArcadeBossPhase): string {
    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {
      return skyDancerArcadeV405FinalBossPhase(this.finalBossContract, phase).label;
    }
    return skyDancerArcadeV11BossMechanicLabel(this.stage.id, phase);
  }

  private spawnBoss(): void {
    if (this.bossSpawned) return;""")

replace_once(runtime,
"""    const final = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;
    // Climax targets must survive a full attack run instead of evaporating under one gun burst.
    const baseHp = final ? 1280 : 440 + this.stage.act * 110;
    const hp = Math.round(baseHp * (this.options.difficulty === "hard" ? 1.25 : 1));""",
"""    const final = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;
    const reactiveContract = final
      ? skyDancerArcadeV405FinalBossContract(this.worldBreakRouteHistory, this.rivalAceOutcomeHistory)
      : null;
    this.finalBossContract = reactiveContract;
    if (reactiveContract) this.finalBossSerial += 1;
    // Climax targets must survive a full attack run instead of evaporating under one gun burst.
    const baseHp = final ? 1280 * (reactiveContract?.hpScale ?? 1) : 440 + this.stage.act * 110;
    const hp = Math.round(baseHp * (this.options.difficulty === "hard" ? 1.25 : 1));""")

replace_once(runtime,
"""      counterplayCooldown: Math.max(.9 + (this.nextEntityId % 3) * .31, this.combatDirectorCounterplayDelay),
      counterplayRewarded: false,
    });
    const bossProfile = skyDancerArcadeV11BossProfile(this.stage.id);
    this.bossMechanicSerial += 1;
    this.message = `WARNING · ${this.stage.bossName} · ${bossProfile.mechanicLabels[0]}`;""",
"""      counterplayCooldown: Math.max(.9 + (this.nextEntityId % 3) * .31, this.combatDirectorCounterplayDelay),
      counterplayRewarded: false,
      finalBossForm: reactiveContract?.form,
      finalBossAccent: reactiveContract?.accent,
      finalBossReactive: Boolean(reactiveContract),
    });
    const bossProfile = skyDancerArcadeV11BossProfile(this.stage.id);
    this.bossMechanicSerial += 1;
    this.message = `WARNING · ${this.stage.bossName} · ${this.bossMechanicLabel(1)}`;""")

replace_once(runtime,
"""  private triggerBossPhaseMechanic(phase: SkyDancerArcadeBossPhase): void {
    const profile = skyDancerArcadeV11BossProfile(this.stage.id);
    const index = phase - 1;
    const hazard = profile.phaseHazards[index];
    const bursts = profile.phaseHazardBursts[index];
    if (hazard) for (let burst = 0; burst < bursts; burst += 1) this.spawnHazardPattern(hazard);
    this.spawnBossPhaseEscorts(phase);
    this.bossMechanicSerial += 1;
  }""",
"""  private triggerBossPhaseMechanic(phase: SkyDancerArcadeBossPhase): void {
    const profile = skyDancerArcadeV11BossProfile(this.stage.id);
    const index = phase - 1;
    const hazard = profile.phaseHazards[index];
    const bursts = profile.phaseHazardBursts[index];
    if (hazard) for (let burst = 0; burst < bursts; burst += 1) this.spawnHazardPattern(hazard);
    this.spawnBossPhaseEscorts(phase);

    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {
      const reactive = skyDancerArcadeV405FinalBossPhase(this.finalBossContract, phase);
      if (reactive.hazard) {
        for (let burst = 0; burst < reactive.hazardBursts; burst += 1) this.spawnHazardPattern(reactive.hazard);
      }
      if (reactive.escortKind && reactive.escortCount > 0) {
        const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
        const allowed = Math.max(0, Math.min(reactive.escortCount, 4 - aliveNonBoss));
        for (let escort = 0; escort < allowed; escort += 1) {
          const sign = escort % 2 === 0 ? -1 : 1;
          this.spawnEnemy(reactive.escortKind, sign * 1.62, sign * .42, 72 + escort * 6, "cross-pass", sign);
        }
      }
      this.finalBossSerial += 1;
    }
    this.bossMechanicSerial += 1;
  }""")

replace_all_checked(runtime,
"skyDancerArcadeV11BossMechanicLabel(this.stage.id, nextPhase)",
"this.bossMechanicLabel(nextPhase)", 1)
replace_all_checked(runtime,
"skyDancerArcadeV11BossMechanicLabel(this.stage.id, armedPhase)",
"this.bossMechanicLabel(armedPhase)", 1)

replace_once(runtime,
"""    const bossProfile = enemy.boss ? skyDancerArcadeV11BossProfile(this.stage.id) : null;
    const bossIndex = enemy.boss ? enemy.bossPhase - 1 : 0;
    const desiredSpread = enemy.boss && bossProfile
      ? Math.min(5, (hard ? 1 : 0) + enemy.bossPhase + bossProfile.spreadBonus[bossIndex])
      : skyDancerArcadeEnemyWeaponV20(enemy.kind).spread;""",
"""    const bossProfile = enemy.boss ? skyDancerArcadeV11BossProfile(this.stage.id) : null;
    const bossIndex = enemy.boss ? enemy.bossPhase - 1 : 0;
    const reactiveBossPhase = enemy.boss && this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract
      ? skyDancerArcadeV405FinalBossPhase(this.finalBossContract, enemy.bossPhase)
      : null;
    const desiredSpread = enemy.boss && bossProfile
      ? Math.min(5, (hard ? 1 : 0) + enemy.bossPhase + bossProfile.spreadBonus[bossIndex] + (reactiveBossPhase?.spreadBonus ?? 0))
      : skyDancerArcadeEnemyWeaponV20(enemy.kind).spread;""")

replace_once(runtime,
"""      const guidance = enemy.boss && bossProfile
        ? (1.02 + enemy.bossPhase * .2) * bossProfile.guidanceScale[bossIndex]
        : skyDancerArcadeEnemyWeaponV20(enemy.kind).guidance;
      const bossSpeedScale = enemy.boss && bossProfile ? bossProfile.projectileSpeedScale[bossIndex] : 1;""",
"""      const guidance = enemy.boss && bossProfile
        ? (1.02 + enemy.bossPhase * .2) * bossProfile.guidanceScale[bossIndex] * (reactiveBossPhase?.guidanceScale ?? 1)
        : skyDancerArcadeEnemyWeaponV20(enemy.kind).guidance;
      const bossSpeedScale = enemy.boss && bossProfile
        ? bossProfile.projectileSpeedScale[bossIndex] * (reactiveBossPhase?.projectileSpeedScale ?? 1)
        : 1;""")

replace_once(runtime,
"""    const bossCadence = enemy.boss && bossProfile ? bossProfile.fireCadenceScale[bossIndex] : 1;
    const base = enemy.boss ? (1.68 - enemy.bossPhase * .18) * bossCadence : skyDancerArcadeEnemyWeaponV20(enemy.kind).cadence;""",
"""    const bossCadence = enemy.boss && bossProfile
      ? bossProfile.fireCadenceScale[bossIndex] * (reactiveBossPhase?.cadenceScale ?? 1)
      : 1;
    const base = enemy.boss ? (1.68 - enemy.bossPhase * .18) * bossCadence : skyDancerArcadeEnemyWeaponV20(enemy.kind).cadence;""")

replace_once(runtime,
"""    this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · WRECK CLEARING";
    this.messageTimer = 2.4;""",
"""    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {
      this.finalBossSerial += 1;
      this.message = `SOVEREIGN DOWN · ${this.finalBossContract.endingLine}`;
    } else {
      this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · WRECK CLEARING";
    }
    this.messageTimer = 2.4;""")

replace_once(runtime,
"      bossMechanicLabel: skyDancerArcadeV11BossMechanicLabel(this.stage.id, boss?.bossPhase ?? (this.bossDefeated ? 3 : 1)),",
"      bossMechanicLabel: this.bossMechanicLabel(boss?.bossPhase ?? (this.bossDefeated ? 3 : 1)),")

replace_once(runtime,
"""      rivalAceOutcome: this.rivalAceOutcome,
      rivalAceSerial: this.rivalAceSerial,
      worldBreakObjective: skyDancerArcadeV40WorldProfile(this.stage.id).objective,""",
"""      rivalAceOutcome: this.rivalAceOutcome,
      rivalAceSerial: this.rivalAceSerial,
      finalBossReactive: this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && Boolean(this.finalBossContract),
      finalBossForm: this.finalBossContract?.form ?? null,
      finalBossFormLabel: this.finalBossContract?.formLabel ?? "PRISM SOVEREIGN",
      finalBossRouteMemory: this.finalBossContract?.routeMemory ?? "MIXED",
      finalBossRivalMemory: this.finalBossContract?.rivalMemory ?? "CONTESTED",
      finalBossAttackLabel: this.finalBossContract
        ? skyDancerArcadeV405FinalBossPhase(this.finalBossContract, boss?.bossPhase ?? (this.bossDefeated ? 3 : 1)).label
        : "",
      finalBossEndingLine: this.finalBossContract?.endingLine ?? "",
      finalBossSerial: this.finalBossSerial,
      finalBossRouteHistory: [...this.worldBreakRouteHistory],
      finalBossRivalHistory: [...this.rivalAceOutcomeHistory],
      worldBreakObjective: skyDancerArcadeV40WorldProfile(this.stage.id).objective,""")

replace_once(runtime,
"  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {",
"""  configureV405FinalBossMemoryForTests(
    doctrines: readonly SkyDancerArcadeV40RouteDoctrine[],
    outcomes: readonly SkyDancerArcadeV405ResolvedRivalOutcome[],
  ): void {
    this.worldBreakRouteHistory.length = 0;
    this.worldBreakRouteHistory.push(...doctrines.filter((doctrine) => doctrine !== "LOCKED"));
    this.rivalAceOutcomeHistory.length = 0;
    this.rivalAceOutcomeHistory.push(...outcomes);
    this.finalBossContract = null;
  }

  spawnV405FinalBossForTests(): void {
    if (this.stage.id !== SKY_DANCER_ARCADE_FINAL_STAGE) throw new Error("V40.5 final boss test hook requires Prism Citadel");
    this.spawnBoss();
  }

  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {""")

models = "src/sky/arcade/SkyDancerArcadeModels.ts"
replace_once(models,
"""function createBoss(stage: SkyDancerArcadeStageDefinition): THREE.Group {
  return createReferenceCarrier(stage);
}""",
"""function decorateV405FinalBoss(group: THREE.Group, enemy: SkyDancerArcadeEnemySnapshot): void {
  if (!enemy.finalBossForm) return;
  const accent = enemy.finalBossAccent ?? 0xb993ff;
  const glow = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 2.15,
    roughness: .24,
    metalness: .62,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151328, roughness: .4, metalness: .72 });
  const rig = new THREE.Group();
  rig.name = "arcade-v405-final-boss-form";

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    rig.add(mesh);
    return mesh;
  };

  if (enemy.finalBossForm === "MIRROR_AEGIS") {
    for (const side of [-1, 1]) {
      const ring = add(new THREE.TorusGeometry(2.05, .13, 6, 20), glow, side * 7.2, 1.45, .2);
      ring.rotation.y = side * .18;
      const shield = add(new THREE.BoxGeometry(.3, 3.8, 4.8), dark, side * 6.9, .2, 1.1);
      shield.rotation.z = side * .12;
    }
  } else if (enemy.finalBossForm === "PRISM_CROWN") {
    for (let index = 0; index < 5; index += 1) {
      const x = (index - 2) * 2.15;
      const shard = add(new THREE.OctahedronGeometry(.72 + Math.abs(index - 2) * .08, 0), glow, x, 3.25 + (2 - Math.abs(index - 2)) * .45, -.6);
      shard.rotation.z = index * .35;
    }
  } else if (enemy.finalBossForm === "HELLSTAR") {
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index += 1) {
        const spike = add(new THREE.ConeGeometry(.34, 2.6 + index * .45, 6), glow, side * (4.9 + index * 1.45), 2.25 - index * .38, .4 + index * .8);
        spike.rotation.z = side * (Math.PI * .42);
      }
    }
    add(new THREE.TorusGeometry(3.15, .16, 6, 24), glow, 0, 1.2, 2.2);
  } else {
    for (let index = 0; index < 3; index += 1) {
      const ring = add(new THREE.TorusGeometry(2.25 + index * .72, .1, 6, 24), glow, 0, 1.35, .3 + index * .45);
      ring.rotation.x = index * .38;
      ring.rotation.y = index * .52;
    }
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2;
      add(new THREE.TetrahedronGeometry(.48, 0), glow, Math.cos(angle) * 5.2, 1.2 + Math.sin(angle) * 2.1, 1.1);
    }
  }

  rig.userData.arcadeV405Form = enemy.finalBossForm;
  rig.userData.arcadeV405Accent = accent;
  group.add(rig);
}

function createBoss(stage: SkyDancerArcadeStageDefinition, enemy: SkyDancerArcadeEnemySnapshot): THREE.Group {
  const group = createReferenceCarrier(stage);
  if (stage.id === "prism-citadel") decorateV405FinalBoss(group, enemy);
  return group;
}""")
replace_once(models,
"  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage) : createStandardEnemy(stage, enemy);",
"  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage, enemy) : createStandardEnemy(stage, enemy);")

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl,
"    if (snapshot.stageEventSerial !== this.previousSnapshot.stageEventSerial) {",
"""    if (snapshot.finalBossSerial !== this.previousSnapshot.finalBossSerial && snapshot.finalBossReactive) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .66);
      this.cameraShake = Math.min(1, this.cameraShake + .34);
      const formTone = snapshot.finalBossForm === "HELLSTAR" ? 92 : snapshot.finalBossForm === "PRISM_CROWN" ? 392 : snapshot.finalBossForm === "MIRROR_AEGIS" ? 244 : 326;
      this.audio.tone(formTone, .34, .052, "sawtooth");
      this.audio.tone(formTone * 1.5, .22, .022, "triangle");
    }
    if (snapshot.stageEventSerial !== this.previousSnapshot.stageEventSerial) {""")
replace_once(webgl,
"""            weakPoint.material.emissiveIntensity = enemy.weakpointOpen ? 2.8 : .75;
          }
        }
      }
    }
    for (const [id, group] of this.enemyGroups) {""",
"""            weakPoint.material.emissiveIntensity = enemy.weakpointOpen ? 2.8 : .75;
          }
        }
        const finalBossRig = group.getObjectByName("arcade-v405-final-boss-form");
        if (finalBossRig) {
          const pulse = 1 + Math.sin(snapshot.runTimeSeconds * (2.8 + enemy.bossPhase * .7)) * (.025 + enemy.bossPhase * .008);
          finalBossRig.scale.setScalar(pulse);
          finalBossRig.rotation.z += delta * (.08 + enemy.bossPhase * .045);
          finalBossRig.rotation.y += delta * .025;
        }
      }
    }
    for (const [id, group] of this.enemyGroups) {""")

canvas = "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"
replace_once(canvas,
"""      context.fillStyle = `#${palette.enemy.toString(16).padStart(6, "0")}`;
      this.traceEnemySilhouetteV20(context, enemy.kind, size);
      context.fill();
      if (enemy.worldBreakTarget) {""",
"""      context.fillStyle = enemy.boss && enemy.finalBossAccent !== undefined
        ? `#${enemy.finalBossAccent.toString(16).padStart(6, "0")}`
        : `#${palette.enemy.toString(16).padStart(6, "0")}`;
      this.traceEnemySilhouetteV20(context, enemy.kind, size);
      context.fill();
      if (enemy.boss && enemy.finalBossForm) {
        context.strokeStyle = `#${(enemy.finalBossAccent ?? palette.accent).toString(16).padStart(6, "0")}`;
        context.globalAlpha = .82;
        context.lineWidth = Math.max(2, size * .1);
        const rings = enemy.finalBossForm === "SEVEN_SKY" ? 3 : enemy.finalBossForm === "MIRROR_AEGIS" ? 2 : 1;
        for (let ring = 0; ring < rings; ring += 1) {
          context.beginPath();
          context.arc(0, 0, size * (1.55 + ring * .36), 0, Math.PI * 2);
          context.stroke();
        }
        context.globalAlpha = 1;
      }
      if (enemy.worldBreakTarget) {""")

mode = "app/SkyDancerArcadeMode.tsx"
replace_once(mode,
"""            <i><b style={{ width: `${bossPercent}%` }} /></i>
          </div>
        )}""",
"""            <i><b style={{ width: `${bossPercent}%` }} /></i>
            {snapshot.finalBossReactive && (
              <em className={styles.finalBossMemory}>
                FORM {snapshot.finalBossFormLabel} · ROUTE MEMORY {snapshot.finalBossRouteMemory} · RIVAL MEMORY {snapshot.finalBossRivalMemory.replaceAll("_", " ")}
              </em>
            )}
          </div>
        )}""")
replace_once(mode,
"              <strong>{snapshot.status === \"run-clear\" ? \"PRISM SOVEREIGN DESTROYED\" : snapshot.stage.name}</strong>",
"""              <strong>{snapshot.status === "run-clear" ? "PRISM SOVEREIGN DESTROYED" : snapshot.stage.name}</strong>
              {snapshot.status === "run-clear" && snapshot.finalBossReactive && (
                <p className={styles.finalBossEnding}>{snapshot.finalBossEndingLine}</p>
              )}""")

css = "app/SkyDancerArcadeMode.module.css"
p = Path(css)
css_text = p.read_text()
css_append = r"""

/* Arcade Run V40.5 — route-reactive Prism Sovereign memory. */
.finalBossMemory{display:block;margin:4px 0 0;font-size:5px;font-style:normal;font-weight:1000;letter-spacing:.105em;color:#c9f6ff;text-shadow:0 0 10px rgba(107,233,255,.32)}
.finalBossEnding{margin:7px auto 1px;max-width:520px;font-size:8px;font-weight:1000;letter-spacing:.14em;color:#d9f9ff;text-align:center;text-transform:uppercase}
@media(max-height:520px){.finalBossMemory{font-size:4px;margin-top:2px}.finalBossEnding{font-size:6px;margin-top:4px}}
@media(prefers-reduced-motion:reduce){.finalBossMemory,.finalBossEnding{transition:none}}
"""
if "Arcade Run V40.5 — route-reactive Prism Sovereign memory." not in css_text:
    p.write_text(css_text.rstrip() + css_append)

print("Arcade Run V40.5 Route-Reactive Final Boss patch applied")
