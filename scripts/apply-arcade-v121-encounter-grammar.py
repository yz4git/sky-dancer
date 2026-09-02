from pathlib import Path


def patch(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch anchor in {path}: {old[:160]!r}")
    p.write_text(s.replace(old, new, count))


def replace_between(path: str, start: str, end: str, replacement: str) -> None:
    p = Path(path)
    s = p.read_text()
    a = s.find(start)
    if a < 0:
        raise SystemExit(f"missing start anchor in {path}: {start!r}")
    b = s.find(end, a)
    if b < 0:
        raise SystemExit(f"missing end anchor in {path}: {end!r}")
    p.write_text(s[:a] + replacement + s[b:])


Path("src/sky/arcade/SkyDancerArcadeV121EncounterGrammar.ts").write_text(r'''import type {
  SkyDancerArcadeEnemyKind,
  SkyDancerArcadeFormation,
  SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type {
  SkyDancerArcadeV12DirectorMode,
  SkyDancerArcadeV12Maneuver,
} from "./SkyDancerArcadeV12Director";

export interface SkyDancerArcadeV121EncounterPhase {
  id: string;
  label: string;
  delay: number;
  countScale: number;
  countDelta: number;
  formation: SkyDancerArcadeFormation;
  maneuver: SkyDancerArcadeV12Maneuver;
  secondaryManeuver: SkyDancerArcadeV12Maneuver;
  enemyBias: readonly SkyDancerArcadeEnemyKind[];
  depthOffset: number;
}

export interface SkyDancerArcadeV121EncounterGrammar {
  id: string;
  label: string;
  intent: string;
  signature: string;
  cadenceScale: number;
  phases: readonly SkyDancerArcadeV121EncounterPhase[];
}

interface StageGrammarProfile {
  labels: readonly [string, string];
  intents: readonly [string, string];
  formations: readonly [
    readonly [SkyDancerArcadeFormation, SkyDancerArcadeFormation, SkyDancerArcadeFormation],
    readonly [SkyDancerArcadeFormation, SkyDancerArcadeFormation, SkyDancerArcadeFormation],
  ];
  maneuvers: readonly [
    readonly [SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver],
    readonly [SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver],
  ];
  enemyBias: readonly SkyDancerArcadeEnemyKind[];
}

const STAGE_GRAMMARS: Record<SkyDancerArcadeStageId, StageGrammarProfile> = {
  "dawn-city": {
    labels: ["SKYLINE KNIFE", "GANTRY PINCER"],
    intents: ["PROBE · CROSSCUT · ACE FINISH", "BAIT · GATE CROSS · OVERTAKE"],
    formations: [["vee", "cross", "pincer"], ["line", "wall", "cross"]],
    maneuvers: [["approach", "cross-pass", "overtake"], ["close-bank", "parallel", "cross-pass"]],
    enemyBias: ["fighter", "interceptor", "ace"],
  },
  "red-canyon": {
    labels: ["RIDGE HOOK", "KNIFE PASS"],
    intents: ["LOW ENTRY · ROCK CROSS · CLIMB OUT", "BAIT · PINCER · CLOSE BANK"],
    formations: [["line", "pincer", "vee"], ["vee", "cross", "pincer"]],
    maneuvers: [["approach", "cross-pass", "close-bank"], ["parallel", "close-bank", "overtake"]],
    enemyBias: ["fighter", "interceptor", "bomber"],
  },
  "cloud-fleet": {
    labels: ["ESCORT BREAK", "DECK CROSS"],
    intents: ["SCREEN · BROADSIDE · HUNTER CUT", "BAIT · PARALLEL · CROSS DECK"],
    formations: [["wall", "line", "pincer"], ["vee", "wall", "cross"]],
    maneuvers: [["parallel", "cross-pass", "overtake"], ["approach", "parallel", "cross-pass"]],
    enemyBias: ["missile-boat", "fighter", "interceptor"],
  },
  "storm-carrier": {
    labels: ["THUNDER BOX", "LIGHTNING RUN"],
    intents: ["PROBE · WALL · ESCAPE LANE", "CROSS · JAM · CLOSE BANK"],
    formations: [["cross", "wall", "vee"], ["pincer", "cross", "line"]],
    maneuvers: [["approach", "parallel", "cross-pass"], ["cross-pass", "parallel", "close-bank"]],
    enemyBias: ["missile-boat", "interceptor", "bomber"],
  },
  "desert-fortress": {
    labels: ["WALL BREACH", "SAND PINCER"],
    intents: ["SCREEN · BREACH · HEAVY EXIT", "BAIT · PINCER · BREAK LINE"],
    formations: [["wall", "line", "pincer"], ["vee", "pincer", "wall"]],
    maneuvers: [["parallel", "approach", "close-bank"], ["approach", "cross-pass", "parallel"]],
    enemyBias: ["bomber", "missile-boat", "fighter"],
  },
  "ice-cavern": {
    labels: ["CRYSTAL SLALOM", "ICE CROSS"],
    intents: ["THREAD · CROSS · SNAP EXIT", "PROBE · SPIRAL · CLOSE BANK"],
    formations: [["vee", "cross", "line"], ["spiral", "cross", "pincer"]],
    maneuvers: [["approach", "cross-pass", "overtake"], ["close-bank", "cross-pass", "close-bank"]],
    enemyBias: ["fighter", "interceptor", "ace"],
  },
  "floating-ruins": {
    labels: ["RUIN WEAVE", "PORTAL TRAP"],
    intents: ["WEAVE · CROSS · GUARDIAN CUT", "BAIT · WALL · PORTAL EXIT"],
    formations: [["spiral", "cross", "vee"], ["line", "wall", "pincer"]],
    maneuvers: [["close-bank", "cross-pass", "overtake"], ["approach", "parallel", "cross-pass"]],
    enemyBias: ["ace", "interceptor", "missile-boat"],
  },
  "night-metro": {
    labels: ["NEON CROSS", "TUNNEL KNIFE"],
    intents: ["CHASE · CROSS · PHANTOM EXIT", "BAIT · WALL · OVERTAKE"],
    formations: [["cross", "pincer", "vee"], ["line", "wall", "cross"]],
    maneuvers: [["overtake", "cross-pass", "close-bank"], ["approach", "parallel", "overtake"]],
    enemyBias: ["interceptor", "ace", "fighter"],
  },
  "volcano-core": {
    labels: ["MAGMA SPIRAL", "CORE PRESS"],
    intents: ["SPIRAL · CROSS · BREAK OUT", "SCREEN · PRESS · CLOSE BANK"],
    formations: [["spiral", "cross", "pincer"], ["wall", "vee", "cross"]],
    maneuvers: [["approach", "cross-pass", "overtake"], ["parallel", "close-bank", "cross-pass"]],
    enemyBias: ["bomber", "interceptor", "ace"],
  },
  "orbital-ascent": {
    labels: ["ORBITAL CROSS", "DEBRIS LANCE"],
    intents: ["PARALLEL · CROSS · HIGH EXIT", "PROBE · LANCE · OVERTAKE"],
    formations: [["cross", "line", "vee"], ["vee", "pincer", "cross"]],
    maneuvers: [["parallel", "cross-pass", "overtake"], ["approach", "close-bank", "overtake"]],
    enemyBias: ["interceptor", "missile-boat", "ace"],
  },
  "prism-citadel": {
    labels: ["PRISM GAUNTLET", "SOVEREIGN KNIFE"],
    intents: ["WALL · CROSS · FINAL CUT", "BAIT · SPIRAL · ACE EXIT"],
    formations: [["wall", "cross", "pincer"], ["vee", "spiral", "cross"]],
    maneuvers: [["parallel", "cross-pass", "close-bank"], ["approach", "close-bank", "overtake"]],
    enemyBias: ["ace", "missile-boat", "bomber"],
  },
};

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 33 + text.charCodeAt(index)) >>> 0;
  return hash;
}

function phase(
  id: string,
  label: string,
  delay: number,
  countScale: number,
  formation: SkyDancerArcadeFormation,
  maneuver: SkyDancerArcadeV12Maneuver,
  secondaryManeuver: SkyDancerArcadeV12Maneuver,
  enemyBias: readonly SkyDancerArcadeEnemyKind[],
  depthOffset = 0,
  countDelta = 0,
): SkyDancerArcadeV121EncounterPhase {
  return { id, label, delay, countScale, countDelta, formation, maneuver, secondaryManeuver, enemyBias, depthOffset };
}

export function skyDancerArcadeV121EncounterGrammar(
  stageId: SkyDancerArcadeStageId,
  mode: SkyDancerArcadeV12DirectorMode,
  waveSerial: number,
  beatId: string,
  intensity: number,
  hard: boolean,
): SkyDancerArcadeV121EncounterGrammar {
  const profile = STAGE_GRAMMARS[stageId];
  const modeOffset = mode === "armor-screen" ? 1 : mode === "hunter-sweep" ? 3 : mode === "jammer-net" ? 5 : mode === "relief-window" ? 7 : 0;
  const variant = (Math.max(0, waveSerial) + hashText(beatId) + modeOffset) % 2 as 0 | 1;
  const formations = profile.formations[variant];
  const maneuvers = profile.maneuvers[variant];
  const label = profile.labels[variant];
  const intent = profile.intents[variant];
  const acePursuit = stageId === "dawn-city" && beatId === "ace-pursuit";
  const pressureBias = hard || intensity > .86 ? 1 : 0;

  if (mode === "relief-window") {
    return {
      id: `${stageId}-${variant}-relief`,
      label: "OPEN SKY",
      intent: "LIGHT PASS · EXIT LANE",
      signature: `${stageId}:relief:${variant}`,
      cadenceScale: 1.24,
      phases: [
        phase("light-pass", "LIGHT PASS", 0, .42, "line", "approach", "cross-pass", ["fighter", "interceptor"], 6),
        phase("exit-lane", "EXIT LANE", .72, .42, "vee", "cross-pass", "approach", ["fighter", "interceptor"], 10),
      ],
    };
  }

  if (mode === "armor-screen") {
    return {
      id: `${stageId}-${variant}-armor`,
      label,
      intent,
      signature: `${stageId}:armor:${variant}`,
      cadenceScale: .98,
      phases: [
        phase("screen-in", "SCREEN IN", 0, .7, formations[0], "parallel", maneuvers[0], ["bomber", "missile-boat", ...profile.enemyBias], 2),
        phase("brace-cross", "BRACE CROSS", .48, .56, formations[1], "cross-pass", maneuvers[1], ["bomber", "missile-boat", "ace"], -2, pressureBias),
        phase("breaker", acePursuit ? "ACE BREAKER" : "BREAKER", 1.02, .44, formations[2], maneuvers[2], "close-bank", acePursuit ? ["ace", "interceptor"] : ["ace", "bomber", ...profile.enemyBias], -5),
      ],
    };
  }

  if (mode === "hunter-sweep") {
    return {
      id: `${stageId}-${variant}-hunter`,
      label,
      intent,
      signature: `${stageId}:hunter:${variant}`,
      cadenceScale: .94,
      phases: [
        phase("feint", "FEINT", 0, .62, formations[0], "approach", "close-bank", ["interceptor", "fighter", ...profile.enemyBias], 5),
        phase("crosscut", "CROSSCUT", .4, .6, formations[1], "cross-pass", maneuvers[1], ["interceptor", "ace", "fighter"], -3, pressureBias),
        phase("overtake", acePursuit ? "ACE OVERTAKE" : "OVERTAKE", .86, .5, formations[2], "overtake", maneuvers[2], ["ace", "interceptor"], -8),
      ],
    };
  }

  if (mode === "jammer-net") {
    return {
      id: `${stageId}-${variant}-jammer`,
      label,
      intent,
      signature: `${stageId}:jammer:${variant}`,
      cadenceScale: .97,
      phases: [
        phase("bait", "BAIT", 0, .62, formations[0], maneuvers[0], "approach", ["fighter", "interceptor", ...profile.enemyBias], 4),
        phase("jammer-line", "JAMMER LINE", .46, .58, formations[1], "parallel", "cross-pass", ["missile-boat", "bomber", "ace"], 0, pressureBias),
        phase("close-net", "CLOSE NET", .96, .46, formations[2], "close-bank", maneuvers[2], ["missile-boat", "ace", ...profile.enemyBias], -5),
      ],
    };
  }

  return {
    id: `${stageId}-${variant}-mixed`,
    label,
    intent,
    signature: `${stageId}:mixed:${variant}`,
    cadenceScale: 1,
    phases: [
      phase("probe", "PROBE", 0, .62, formations[0], maneuvers[0], "approach", profile.enemyBias, 5),
      phase("crosscut", "CROSSCUT", .48, .56, formations[1], maneuvers[1], "cross-pass", profile.enemyBias, 0, pressureBias),
      phase("finish", acePursuit ? "ACE FINISH" : "FINISH", 1.02, .46, formations[2], maneuvers[2], "overtake", acePursuit ? ["ace", "interceptor"] : profile.enemyBias, -5),
    ],
  };
}
''')

# Runtime imports and public snapshot contract.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    'import {\n  skyDancerArcadeV12CombatPlan,\n  type SkyDancerArcadeV12DirectorMode,\n  type SkyDancerArcadeV12EncounterPlan,\n  type SkyDancerArcadeV12PlayerStyle,\n} from "./SkyDancerArcadeV12Director";\n',
    'import {\n  skyDancerArcadeV12CombatPlan,\n  type SkyDancerArcadeV12DirectorMode,\n  type SkyDancerArcadeV12EncounterPlan,\n  type SkyDancerArcadeV12PlayerStyle,\n} from "./SkyDancerArcadeV12Director";\nimport {\n  skyDancerArcadeV121EncounterGrammar,\n  type SkyDancerArcadeV121EncounterGrammar,\n  type SkyDancerArcadeV121EncounterPhase,\n} from "./SkyDancerArcadeV121EncounterGrammar";\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  combatDirectorSerial: number;\n  combatDirectorWaveSerial: number;\n  bossKills: number;\n',
    '  combatDirectorSerial: number;\n  combatDirectorWaveSerial: number;\n  encounterGrammarId: string;\n  encounterGrammarLabel: string;\n  encounterGrammarIntent: string;\n  encounterGrammarPhaseLabel: string;\n  encounterGrammarPhaseIndex: number;\n  encounterGrammarPhaseCount: number;\n  encounterGrammarSerial: number;\n  bossKills: number;\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    'interface ArcadeInput {\n  x: number;\n  y: number;\n  fire: boolean;\n  lock: boolean;\n  turbo: boolean;\n}\n',
    'interface ArcadeInput {\n  x: number;\n  y: number;\n  fire: boolean;\n  lock: boolean;\n  turbo: boolean;\n}\n\ninterface ArcadeV121QueuedPhase {\n  at: number;\n  grammar: SkyDancerArcadeV121EncounterGrammar;\n  phase: SkyDancerArcadeV121EncounterPhase;\n  phaseIndex: number;\n  plan: SkyDancerArcadeV12EncounterPlan;\n}\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private combatDirectorSerial = 0;\n  private combatDirectorWaveSerial = 0;\n  private stageSerial = 1;\n',
    '  private combatDirectorSerial = 0;\n  private combatDirectorWaveSerial = 0;\n  private encounterGrammarId = "opening-pass";\n  private encounterGrammarLabel = "OPENING PASS";\n  private encounterGrammarIntent = "READ SKY · BUILD RHYTHM";\n  private encounterGrammarPhaseLabel = "APPROACH";\n  private encounterGrammarPhaseIndex = 0;\n  private encounterGrammarPhaseCount = 1;\n  private encounterGrammarSerial = 0;\n  private encounterGrammarCadenceScale = 1;\n  private encounterPhaseQueue: ArcadeV121QueuedPhase[] = [];\n  private stageSerial = 1;\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.combatDirectorCounterplayDelay = 1.08;\n    this.combatDirectorWaveSerial = 0;\n    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n',
    '    this.combatDirectorCounterplayDelay = 1.08;\n    this.combatDirectorWaveSerial = 0;\n    this.encounterGrammarId = "opening-pass";\n    this.encounterGrammarLabel = "OPENING PASS";\n    this.encounterGrammarIntent = "READ SKY · BUILD RHYTHM";\n    this.encounterGrammarPhaseLabel = "APPROACH";\n    this.encounterGrammarPhaseIndex = 0;\n    this.encounterGrammarPhaseCount = 1;\n    this.encounterGrammarCadenceScale = 1;\n    this.encounterPhaseQueue = [];\n    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n',
)

# Director now executes queued mini-script phases and only starts a new grammar when the current one is complete.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private updateDirector(): void {\n    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);\n',
    '  private updateDirector(): void {\n    this.updateV121EncounterQueue();\n    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    if (!this.bossSpawned && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {\n      this.spawnWave();\n      const pressure = this.options.difficulty === "hard" ? 0.84 : 1;\n      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * this.combatDirectorCadenceScale * (0.84 + this.random() * 0.34);\n    }\n',
    '    if (!this.bossSpawned && this.encounterPhaseQueue.length === 0 && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {\n      this.spawnWave();\n      const pressure = this.options.difficulty === "hard" ? 0.84 : 1;\n      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * this.combatDirectorCadenceScale * this.encounterGrammarCadenceScale * (0.84 + this.random() * 0.34);\n    }\n',
)

new_spawn = r'''  private spawnWave(): void {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const plan = this.currentV12CombatPlan();
    this.applyV12CombatPlan(plan);
    const grammar = skyDancerArcadeV121EncounterGrammar(
      this.stage.id,
      plan.mode,
      this.waveSerial,
      beat.id,
      plan.intensity,
      this.options.difficulty === "hard",
    );
    this.waveSerial += 1;
    this.encounterGrammarId = grammar.id;
    this.encounterGrammarLabel = grammar.label;
    this.encounterGrammarIntent = grammar.intent;
    this.encounterGrammarPhaseCount = grammar.phases.length;
    this.encounterGrammarCadenceScale = grammar.cadenceScale;
    this.encounterGrammarSerial += 1;
    this.encounterPhaseQueue = grammar.phases.slice(1).map((phase, index) => ({
      at: this.stageTime + phase.delay,
      grammar,
      phase,
      phaseIndex: index + 1,
      plan,
    }));
    const first = grammar.phases[0];
    if (first) this.spawnV121EncounterPhase(grammar, first, 0, plan);
  }

  private updateV121EncounterQueue(): void {
    if (this.bossSpawned) {
      this.encounterPhaseQueue = [];
      return;
    }
    while (this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {
      const queued = this.encounterPhaseQueue.shift();
      if (!queued) break;
      this.spawnV121EncounterPhase(queued.grammar, queued.phase, queued.phaseIndex, queued.plan);
    }
  }

  private spawnV121EncounterPhase(
    grammar: SkyDancerArcadeV121EncounterGrammar,
    phase: SkyDancerArcadeV121EncounterPhase,
    phaseIndex: number,
    plan: SkyDancerArcadeV12EncounterPlan,
  ): void {
    this.encounterGrammarId = grammar.id;
    this.encounterGrammarLabel = grammar.label;
    this.encounterGrammarIntent = grammar.intent;
    this.encounterGrammarPhaseLabel = phase.label;
    this.encounterGrammarPhaseIndex = phaseIndex + 1;
    this.encounterGrammarPhaseCount = grammar.phases.length;

    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const authoredFormations = beat.preferredFormations.length > 0 ? beat.preferredFormations : this.stage.formations;
    const formationCandidates = [phase.formation, ...plan.formationBias, ...authoredFormations];
    const formation = formationCandidates.find((candidate) => authoredFormations.includes(candidate)) ?? authoredFormations[0] ?? "line";
    const authoredEnemyPool = beat.preferredEnemies.length > 0 ? beat.preferredEnemies : this.stage.enemies;
    const biasedEnemyPool = [...phase.enemyBias, ...plan.enemyBias, ...authoredEnemyPool].filter((kind) => authoredEnemyPool.includes(kind));
    const enemyPool = biasedEnemyPool.length > 0 ? biasedEnemyPool : authoredEnemyPool;
    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;
    const totalTarget = clamp(3 + Math.floor(this.random() * 2) + hardBonus + (beat.intensity > .9 ? 1 : 0) + plan.waveCountDelta, 2, 6);
    const plannedCount = clamp(Math.round(totalTarget * phase.countScale) + phase.countDelta, 1, 4);
    const enemyCap = this.options.difficulty === "hard" ? 15 : 11;
    const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
    const count = Math.max(0, Math.min(plannedCount, enemyCap - aliveNonBoss));
    if (count <= 0) return;

    let startIndex = 0;
    if (
      this.stage.id === "dawn-city"
      && beat.id === "ace-pursuit"
      && phaseIndex === grammar.phases.length - 1
      && authoredEnemyPool.includes("ace")
    ) {
      const sign = this.waveSerial % 2 === 0 ? 1 : -1;
      this.spawnEnemy("ace", sign * 1.86, .12, -6.4, "overtake", sign);
      startIndex = 1;
    }

    for (let index = startIndex; index < count; index += 1) {
      const kind = enemyPool[Math.floor(this.random() * enemyPool.length)] ?? "fighter";
      const [formationX, formationY] = this.formationPosition(formation, index, count);
      const maneuver: SkyDancerArcadeEnemyManeuver = index === 0 || (index + phaseIndex) % 3 !== 0
        ? phase.maneuver
        : phase.secondaryManeuver;
      const sign = Math.abs(formationX) > 0.18 ? Math.sign(formationX) : (index + phaseIndex) % 2 === 0 ? 1 : -1;
      const x = maneuver === "overtake"
        ? sign * 1.9
        : maneuver === "cross-pass"
          ? clamp(formationX + sign * .18, -ENEMY_X_LIMIT, ENEMY_X_LIMIT)
          : formationX;
      const y = maneuver === "overtake" ? clamp(formationY * .34, -.62, .62) : formationY;
      const depthBase = maneuver === "overtake" ? -6.4 : maneuver === "cross-pass" ? 44 : maneuver === "parallel" ? 48 : maneuver === "close-bank" ? 50 : 56;
      const depth = maneuver === "overtake" ? depthBase : depthBase + phase.depthOffset + index * 3.1 + this.random() * 6;
      this.spawnEnemy(kind, x, y, depth, maneuver, sign);
    }
  }

'''
replace_between(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private spawnWave(): void {\n',
    '  private formationPosition(',
    new_spawn,
)

# Boss owns the arena; queued encounter phases must not leak into the climax.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private spawnBoss(): void {\n    if (this.bossSpawned) return;\n    this.bossSpawned = true;\n',
    '  private spawnBoss(): void {\n    if (this.bossSpawned) return;\n    this.bossSpawned = true;\n    this.encounterPhaseQueue = [];\n    this.encounterGrammarPhaseLabel = "CLIMAX";\n',
)

# Snapshot and deterministic test hook.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      combatDirectorSerial: this.combatDirectorSerial,\n      combatDirectorWaveSerial: this.combatDirectorWaveSerial,\n      bossKills: this.bossKills,\n',
    '      combatDirectorSerial: this.combatDirectorSerial,\n      combatDirectorWaveSerial: this.combatDirectorWaveSerial,\n      encounterGrammarId: this.encounterGrammarId,\n      encounterGrammarLabel: this.encounterGrammarLabel,\n      encounterGrammarIntent: this.encounterGrammarIntent,\n      encounterGrammarPhaseLabel: this.encounterGrammarPhaseLabel,\n      encounterGrammarPhaseIndex: this.encounterGrammarPhaseIndex,\n      encounterGrammarPhaseCount: this.encounterGrammarPhaseCount,\n      encounterGrammarSerial: this.encounterGrammarSerial,\n      bossKills: this.bossKills,\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  spawnV12EncounterForTests(): void {\n    this.spawnWave();\n  }\n\n  /** Deterministic V11.8 hooks for loadout combat regression tests. */\n',
    '  spawnV12EncounterForTests(): void {\n    this.spawnWave();\n  }\n\n  advanceV121EncounterForTests(): boolean {\n    const next = this.encounterPhaseQueue[0];\n    if (!next) return false;\n    this.stageTime = Math.max(this.stageTime, next.at);\n    this.distance = this.stageTime * this.stage.courseSpeed;\n    this.updateV121EncounterQueue();\n    return true;\n  }\n\n  /** Deterministic V11.8 hooks for loadout combat regression tests. */\n',
)

# Compact HUD: expose both doctrine and current mini-script phase in the existing course-beat plate.
patch(
    "app/SkyDancerArcadeMode.tsx",
    '          <em className={productStyles.v12DirectorLine}>COMBAT DIRECTOR · {snapshot.combatDirectorLabel} · {snapshot.combatDirectorIntent}</em>\n',
    '          <em className={productStyles.v12DirectorLine}>COMBAT DIRECTOR · {snapshot.combatDirectorLabel} · {snapshot.combatDirectorIntent}</em>\n          <em className={productStyles.v121GrammarLine}>ENCOUNTER · {snapshot.encounterGrammarLabel} · {snapshot.encounterGrammarPhaseLabel} {snapshot.encounterGrammarPhaseIndex}/{snapshot.encounterGrammarPhaseCount}</em>\n',
)
mode = Path("app/SkyDancerArcadeMode.tsx")
mode.write_text(mode.read_text().replace("V12.0", "V12.1"))

css = Path("app/SkyDancerArcadeProduct.module.css")
css.write_text(css.read_text() + r'''

/* V12.1 Encounter Grammar: second telemetry row exposes the active mini-script without adding a panel. */
.v121GrammarLine {
  display: block;
  margin-top: 2px;
  color: rgba(244,250,255,.78);
  font-size: 6px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: .05em;
  line-height: 1.08;
  white-space: nowrap;
}
.timelineBeat[data-director="relief-window"] .v121GrammarLine { color: #baffdc; }
@media (max-width: 720px) {
  .v121GrammarLine { font-size: 5.5px; letter-spacing: .03em; }
}
''')

# Tests: import grammar, update legacy version regexes, and add four V12.1 contracts.
tests = Path("tests/sky-arcade-run.test.ts")
t = tests.read_text()
t = t.replace(
    'import { skyDancerArcadeV12CombatPlan } from "../src/sky/arcade/SkyDancerArcadeV12Director";\n',
    'import { skyDancerArcadeV12CombatPlan } from "../src/sky/arcade/SkyDancerArcadeV12Director";\nimport { skyDancerArcadeV121EncounterGrammar } from "../src/sky/arcade/SkyDancerArcadeV121EncounterGrammar";\n',
)
t = t.replace(r'V(?:11\.(?:8|9)|12\.0)', r'V(?:11\.(?:8|9)|12\.[01])')
t = t.replace(r'V(?:11\.9|12\.0)', r'V(?:11\.9|12\.[01])')
t = t.replace('assert.match(modeSource, /V12\\.0/);', 'assert.match(modeSource, /V12\\.1/);')
t += r'''


test("V12.1 Dawn City encounter grammar authors a real three-step combat sentence", () => {
  const first = skyDancerArcadeV121EncounterGrammar("dawn-city", "adaptive-mix", 0, "city-entry", .72, false);
  const second = skyDancerArcadeV121EncounterGrammar("dawn-city", "adaptive-mix", 1, "city-entry", .72, false);
  assert.equal(first.phases.length, 3);
  assert.ok(first.phases[0].delay < first.phases[1].delay && first.phases[1].delay < first.phases[2].delay);
  assert.notEqual(first.signature, second.signature, "successive encounters alternate authored grammar variants");
  assert.notEqual(first.label, second.label, "Dawn City alternates skyline and gantry attack sentences");
  assert.notEqual(first.phases[0].maneuver, first.phases[1].maneuver, "a grammar changes maneuver between phases");
});

test("V12.1 runtime advances encounter phases over time instead of spawning one undifferentiated wave", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1211 });
  runtime.setV12DirectorSignalsForTests(.2, 2.4, .2, 0, 1);
  runtime.spawnV12EncounterForTests();
  const first = runtime.getSnapshot();
  assert.equal(first.encounterGrammarPhaseIndex, 1);
  assert.equal(first.encounterGrammarPhaseCount, 3);
  assert.ok(first.enemies.length > 0);
  const firstPhase = first.encounterGrammarPhaseLabel;
  const firstManeuvers = new Set(first.enemies.map((enemy) => enemy.maneuver));
  assert.equal(runtime.advanceV121EncounterForTests(), true);
  const second = runtime.getSnapshot();
  assert.equal(second.encounterGrammarPhaseIndex, 2);
  assert.notEqual(second.encounterGrammarPhaseLabel, firstPhase);
  assert.ok(second.enemies.length > first.enemies.length, `${second.enemies.length} > ${first.enemies.length}`);
  assert.ok(second.enemies.some((enemy) => !firstManeuvers.has(enemy.maneuver)), "second phase introduces a different attack maneuver");
});

test("V12.1 relief grammar is intentionally shorter and lighter than pressure grammar", () => {
  const pressure = skyDancerArcadeV121EncounterGrammar("dawn-city", "armor-screen", 0, "city-entry", .8, false);
  const relief = skyDancerArcadeV121EncounterGrammar("dawn-city", "relief-window", 0, "city-entry", .8, false);
  const pressureMass = pressure.phases.reduce((sum, phase) => sum + phase.countScale + phase.countDelta * .2, 0);
  const reliefMass = relief.phases.reduce((sum, phase) => sum + phase.countScale + phase.countDelta * .2, 0);
  assert.equal(relief.phases.length, 2);
  assert.ok(reliefMass < pressureMass, `${reliefMass} < ${pressureMass}`);
  assert.ok(relief.cadenceScale > pressure.cadenceScale);
});

test("V12.1 encounter identity is stage-specific and surfaced in the compact HUD", async () => {
  const dawn = skyDancerArcadeV121EncounterGrammar("dawn-city", "adaptive-mix", 0, "entry", .7, false);
  const fleet = skyDancerArcadeV121EncounterGrammar("cloud-fleet", "adaptive-mix", 0, "entry", .7, false);
  assert.notEqual(dawn.label, fleet.label);
  const [modeSource, cssSource, runtimeSource, grammarSource] = await Promise.all([
    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeProduct.module.css", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeV121EncounterGrammar.ts", import.meta.url), "utf8"),
  ]);
  assert.match(modeSource, /V12\.1/);
  assert.match(modeSource, /ENCOUNTER · \{snapshot\.encounterGrammarLabel\}/);
  assert.match(cssSource, /v121GrammarLine/);
  assert.match(runtimeSource, /encounterPhaseQueue/);
  assert.match(grammarSource, /SKYLINE KNIFE/);
  assert.match(grammarSource, /DECK CROSS/);
  assert.match(grammarSource, /NEON CROSS/);
  assert.match(grammarSource, /PRISM GAUNTLET/);
});
'''
tests.write_text(t)
