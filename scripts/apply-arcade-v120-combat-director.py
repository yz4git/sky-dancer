from pathlib import Path


def patch(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    p.write_text(s.replace(old, new, count))

# New pure V12 planner: translates recent player behavior into bounded encounter plans.
Path("src/sky/arcade/SkyDancerArcadeV12Director.ts").write_text(r'''import type { SkyDancerArcadeEnemyKind, SkyDancerArcadeFormation } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV12DirectorMode =
  | "adaptive-mix"
  | "armor-screen"
  | "hunter-sweep"
  | "jammer-net"
  | "relief-window";

export type SkyDancerArcadeV12PlayerStyle = "balanced" | "gun" | "missile" | "turbo" | "recover";
export type SkyDancerArcadeV12Maneuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";

export interface SkyDancerArcadeV12DirectorSignals {
  gunHeat: number;
  missileHeat: number;
  turboHeat: number;
  recentDamage: number;
  hpRatio: number;
  chain: number;
  beatIntensity: number;
  hard: boolean;
}

export interface SkyDancerArcadeV12EncounterPlan {
  mode: SkyDancerArcadeV12DirectorMode;
  playerStyle: SkyDancerArcadeV12PlayerStyle;
  label: string;
  intent: string;
  intensity: number;
  pressure: number;
  cadenceScale: number;
  waveCountDelta: number;
  counterplayDelay: number;
  formationBias: readonly SkyDancerArcadeFormation[];
  enemyBias: readonly SkyDancerArcadeEnemyKind[];
  maneuverBias: readonly SkyDancerArcadeV12Maneuver[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function skyDancerArcadeV12CombatPlan(signals: SkyDancerArcadeV12DirectorSignals): SkyDancerArcadeV12EncounterPlan {
  const gun = clamp(signals.gunHeat, 0, 3);
  const missile = clamp(signals.missileHeat, 0, 3);
  const turbo = clamp(signals.turboHeat, 0, 3);
  const hp = clamp(signals.hpRatio, 0, 1);
  const recentDamage = clamp(signals.recentDamage, 0, 2);
  const dominant = Math.max(gun, missile, turbo);
  const basePressure = signals.beatIntensity * .55
    + clamp(signals.chain, 0, 12) * .026
    + dominant * .13
    + (signals.hard ? .12 : 0)
    - (1 - hp) * .2
    - Math.min(1.25, recentDamage) * .15;
  const pressure = clamp(basePressure, .28, 1.22);
  const intensity = clamp(.42 + pressure * .48, .45, 1);

  // The director never snowballs a player who is already losing control.
  if (hp < .36 || recentDamage > 1.02) {
    return {
      mode: "relief-window",
      playerStyle: "recover",
      label: "RELIEF WINDOW",
      intent: "LIGHT SCREEN · REBUILD TURBO",
      intensity: clamp(.42 + signals.beatIntensity * .2, .42, .68),
      pressure: Math.min(.62, pressure),
      cadenceScale: 1.28,
      waveCountDelta: -2,
      counterplayDelay: 4.6,
      formationBias: ["line", "vee"],
      enemyBias: ["fighter", "interceptor"],
      maneuverBias: ["approach", "cross-pass"],
    };
  }

  if (gun >= missile + .24 && gun >= turbo + .18 && gun > .58) {
    return {
      mode: "armor-screen",
      playerStyle: "gun",
      label: "ARMOR SCREEN",
      intent: "HEAVIES BRACE · BREAK THE LINE",
      intensity,
      pressure,
      cadenceScale: pressure > .86 ? .88 : .96,
      waveCountDelta: pressure > .92 ? 1 : 0,
      counterplayDelay: .72,
      formationBias: ["wall", "pincer", "line"],
      enemyBias: ["bomber", "missile-boat", "ace", "interceptor"],
      maneuverBias: ["parallel", "close-bank", "cross-pass"],
    };
  }

  if (missile >= gun + .2 && missile >= turbo + .14 && missile > .52) {
    return {
      mode: "hunter-sweep",
      playerStyle: "missile",
      label: "HUNTER SWEEP",
      intent: "FAST CROSSING · HOLD TRACK",
      intensity,
      pressure,
      cadenceScale: pressure > .84 ? .86 : .94,
      waveCountDelta: pressure > .96 ? 1 : 0,
      counterplayDelay: .62,
      formationBias: ["spiral", "cross", "pincer"],
      enemyBias: ["interceptor", "ace", "fighter"],
      maneuverBias: ["cross-pass", "overtake", "close-bank"],
    };
  }

  if (turbo >= gun + .18 && turbo >= missile + .12 && turbo > .54) {
    return {
      mode: "jammer-net",
      playerStyle: "turbo",
      label: "JAMMER NET",
      intent: "CUT THE JAMMER · KEEP MOMENTUM",
      intensity,
      pressure,
      cadenceScale: pressure > .86 ? .89 : .97,
      waveCountDelta: pressure > .9 ? 1 : 0,
      counterplayDelay: .66,
      formationBias: ["pincer", "wall", "vee"],
      enemyBias: ["missile-boat", "bomber", "ace"],
      maneuverBias: ["parallel", "cross-pass", "close-bank"],
    };
  }

  return {
    mode: "adaptive-mix",
    playerStyle: "balanced",
    label: "MIXED ASSAULT",
    intent: "READ FORMATION · CHOOSE TOOL",
    intensity,
    pressure,
    cadenceScale: pressure > .9 ? .92 : 1,
    waveCountDelta: pressure > 1.04 ? 1 : 0,
    counterplayDelay: 1.08,
    formationBias: ["vee", "cross", "spiral"],
    enemyBias: [],
    maneuverBias: ["close-bank", "cross-pass", "parallel", "overtake"],
  };
}
''')

# Runtime integration.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    'import {\n  skyDancerArcadeV11ScoreBreakdown,\n  skyDancerArcadeV11StageMedals,\n  type SkyDancerArcadeV11MedalResult,\n  type SkyDancerArcadeV11ScoreBreakdown,\n} from "./SkyDancerArcadeV11Scoring";\n',
    'import {\n  skyDancerArcadeV11ScoreBreakdown,\n  skyDancerArcadeV11StageMedals,\n  type SkyDancerArcadeV11MedalResult,\n  type SkyDancerArcadeV11ScoreBreakdown,\n} from "./SkyDancerArcadeV11Scoring";\nimport {\n  skyDancerArcadeV12CombatPlan,\n  type SkyDancerArcadeV12DirectorMode,\n  type SkyDancerArcadeV12EncounterPlan,\n  type SkyDancerArcadeV12PlayerStyle,\n} from "./SkyDancerArcadeV12Director";\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  turboJammed: boolean;\n  bossKills: number;\n',
    '  turboJammed: boolean;\n  combatDirectorMode: SkyDancerArcadeV12DirectorMode;\n  combatDirectorPlayerStyle: SkyDancerArcadeV12PlayerStyle;\n  combatDirectorLabel: string;\n  combatDirectorIntent: string;\n  combatDirectorIntensity: number;\n  combatDirectorPressure: number;\n  combatDirectorSerial: number;\n  combatDirectorWaveSerial: number;\n  bossKills: number;\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private enemyCounterplayLabelTimer = 0;\n  private stageSerial = 1;\n',
    '  private enemyCounterplayLabelTimer = 0;\n  private directorGunHeat = 0;\n  private directorMissileHeat = 0;\n  private directorTurboHeat = 0;\n  private directorRecentDamage = 0;\n  private combatDirectorMode: SkyDancerArcadeV12DirectorMode = "adaptive-mix";\n  private combatDirectorPlayerStyle: SkyDancerArcadeV12PlayerStyle = "balanced";\n  private combatDirectorLabel = "MIXED ASSAULT";\n  private combatDirectorIntent = "READ FORMATION · CHOOSE TOOL";\n  private combatDirectorIntensity = .5;\n  private combatDirectorPressure = .5;\n  private combatDirectorCadenceScale = 1;\n  private combatDirectorCounterplayDelay = 1.08;\n  private combatDirectorSerial = 0;\n  private combatDirectorWaveSerial = 0;\n  private stageSerial = 1;\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.enemyCounterplayLabel = null;\n    this.enemyCounterplayLabelTimer = 0;\n    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n',
    '    this.enemyCounterplayLabel = null;\n    this.enemyCounterplayLabelTimer = 0;\n    this.directorGunHeat = 0;\n    this.directorMissileHeat = 0;\n    this.directorTurboHeat = 0;\n    this.directorRecentDamage = 0;\n    this.combatDirectorMode = "adaptive-mix";\n    this.combatDirectorPlayerStyle = "balanced";\n    this.combatDirectorLabel = "MIXED ASSAULT";\n    this.combatDirectorIntent = "READ FORMATION · CHOOSE TOOL";\n    this.combatDirectorIntensity = .5;\n    this.combatDirectorPressure = .5;\n    this.combatDirectorCadenceScale = 1;\n    this.combatDirectorCounterplayDelay = 1.08;\n    this.combatDirectorWaveSerial = 0;\n    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    if (this.messageTimer <= 0) this.message = null;\n    this.updatePlayer(delta, turboActive);\n',
    '    if (this.messageTimer <= 0) this.message = null;\n    this.updateV12CombatSignals(delta, turboActive);\n    this.updatePlayer(delta, turboActive);\n',
)
# Add V12 signal/planning methods before the existing director.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private updateDirector(): void {\n',
    r'''  private updateV12CombatSignals(delta: number, turboActive: boolean): void {
    const decay = Math.exp(-delta * .43);
    this.directorGunHeat *= decay;
    this.directorMissileHeat *= decay;
    this.directorTurboHeat *= decay;
    this.directorRecentDamage = Math.max(0, this.directorRecentDamage - delta * .24);
    if (this.input.fire) this.directorGunHeat = clamp(this.directorGunHeat + delta * .82, 0, 3);
    if (this.input.lock) this.directorMissileHeat = clamp(this.directorMissileHeat + delta * .32, 0, 3);
    if (turboActive) this.directorTurboHeat = clamp(this.directorTurboHeat + delta * .72, 0, 3);
  }

  private currentV12CombatPlan(): SkyDancerArcadeV12EncounterPlan {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    return skyDancerArcadeV12CombatPlan({
      gunHeat: this.directorGunHeat,
      missileHeat: this.directorMissileHeat,
      turboHeat: this.directorTurboHeat,
      recentDamage: this.directorRecentDamage,
      hpRatio: this.playerHp / PLAYER_MAX_HP,
      chain: this.chain,
      beatIntensity: beat.intensity,
      hard: this.options.difficulty === "hard",
    });
  }

  private applyV12CombatPlan(plan: SkyDancerArcadeV12EncounterPlan): void {
    const shifted = plan.mode !== this.combatDirectorMode;
    this.combatDirectorMode = plan.mode;
    this.combatDirectorPlayerStyle = plan.playerStyle;
    this.combatDirectorLabel = plan.label;
    this.combatDirectorIntent = plan.intent;
    this.combatDirectorIntensity = plan.intensity;
    this.combatDirectorPressure = plan.pressure;
    this.combatDirectorCadenceScale = plan.cadenceScale;
    this.combatDirectorCounterplayDelay = plan.counterplayDelay;
    this.combatDirectorWaveSerial += 1;
    if (!shifted) return;
    this.combatDirectorSerial += 1;
    // Director messaging is intentionally short and only occurs on a doctrine shift.
    if (this.combatDirectorWaveSerial > 1) {
      this.message = `DIRECTOR SHIFT · ${plan.label}`;
      this.messageTimer = Math.max(this.messageTimer, .82);
    }
  }

  private updateDirector(): void {
''',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * (0.84 + this.random() * 0.34);\n',
    '      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * this.combatDirectorCadenceScale * (0.84 + this.random() * 0.34);\n',
)
# Rewrite top of spawnWave to select the current adaptive plan and bias authored pools without replacing stage identity.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    const formations = beat.preferredFormations.length > 0 ? beat.preferredFormations : this.stage.formations;\n    const enemyPool = beat.preferredEnemies.length > 0 ? beat.preferredEnemies : this.stage.enemies;\n    const formation = formations[Math.floor(this.random() * formations.length)] ?? "line";\n    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;\n    const count = Math.min(6, 3 + Math.floor(this.random() * 2) + hardBonus + (beat.intensity > .9 ? 1 : 0));\n    const choreography = beat.maneuvers.length > 0 ? beat.maneuvers : (["close-bank", "overtake", "parallel", "cross-pass"] as const);\n',
    '    const plan = this.currentV12CombatPlan();\n    this.applyV12CombatPlan(plan);\n    const authoredFormations = beat.preferredFormations.length > 0 ? beat.preferredFormations : this.stage.formations;\n    const preferredFormations = plan.formationBias.filter((formation) => authoredFormations.includes(formation));\n    const formations = preferredFormations.length > 0 ? [...preferredFormations, ...preferredFormations, ...authoredFormations] : authoredFormations;\n    const authoredEnemyPool = beat.preferredEnemies.length > 0 ? beat.preferredEnemies : this.stage.enemies;\n    const preferredEnemies = plan.enemyBias.filter((kind) => authoredEnemyPool.includes(kind));\n    const enemyPool = preferredEnemies.length > 0 ? [...preferredEnemies, ...preferredEnemies, ...authoredEnemyPool] : authoredEnemyPool;\n    const formation = formations[Math.floor(this.random() * formations.length)] ?? "line";\n    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;\n    const baseCount = 3 + Math.floor(this.random() * 2) + hardBonus + (beat.intensity > .9 ? 1 : 0);\n    const count = clamp(baseCount + plan.waveCountDelta, 2, 6);\n    const authoredChoreography = beat.maneuvers.length > 0 ? beat.maneuvers : (["close-bank", "overtake", "parallel", "cross-pass"] as const);\n    const choreography = [...plan.maneuverBias, ...plan.maneuverBias, ...authoredChoreography];\n',
)
# Counterplay cadence now follows encounter plan, keeping V11.9 mechanics but coordinating them at wave level.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      counterplayCooldown: .38 + (this.nextEntityId % 3) * .31,\n',
    '      counterplayCooldown: Math.max(.38 + (this.nextEntityId % 3) * .31, this.combatDirectorCounterplayDelay + (this.nextEntityId % 3) * .16),\n',
    1,
)
# Boss uses same bounded delay but remains more deliberate.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      counterplayCooldown: .38 + (this.nextEntityId % 3) * .31,\n',
    '      counterplayCooldown: Math.max(.9 + (this.nextEntityId % 3) * .31, this.combatDirectorCounterplayDelay),\n',
    1,
)
# Actual missile launches and damage feed the behavior model.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    if (targets.length > 0) {\n      this.missileSerial += 1;\n',
    '    if (targets.length > 0) {\n      this.directorMissileHeat = clamp(this.directorMissileHeat + Math.min(1.25, targets.length * .28), 0, 3);\n      this.missileSerial += 1;\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.damageTaken += effective;\n    this.chain = 0;\n',
    '    this.damageTaken += effective;\n    this.directorRecentDamage = clamp(this.directorRecentDamage + effective / PLAYER_MAX_HP * 2.15, 0, 2);\n    this.chain = 0;\n',
)
# Snapshot exports V12 director state.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      turboJammed: activeCounterplays.some((enemy) => enemy.counterplay === "turbo-jammer"),\n      bossKills: this.bossKills,\n',
    '      turboJammed: activeCounterplays.some((enemy) => enemy.counterplay === "turbo-jammer"),\n      combatDirectorMode: this.combatDirectorMode,\n      combatDirectorPlayerStyle: this.combatDirectorPlayerStyle,\n      combatDirectorLabel: this.combatDirectorLabel,\n      combatDirectorIntent: this.combatDirectorIntent,\n      combatDirectorIntensity: this.combatDirectorIntensity,\n      combatDirectorPressure: this.combatDirectorPressure,\n      combatDirectorSerial: this.combatDirectorSerial,\n      combatDirectorWaveSerial: this.combatDirectorWaveSerial,\n      bossKills: this.bossKills,\n',
)
# Deterministic V12 test hook.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  /** Deterministic V11.8 hooks for loadout combat regression tests. */\n',
    r'''  /** Deterministic V12 hook for adaptive encounter regression tests. */
  setV12DirectorSignalsForTests(gunHeat: number, missileHeat: number, turboHeat: number, recentDamage = 0, hpRatio = 1): void {
    this.directorGunHeat = clamp(gunHeat, 0, 3);
    this.directorMissileHeat = clamp(missileHeat, 0, 3);
    this.directorTurboHeat = clamp(turboHeat, 0, 3);
    this.directorRecentDamage = clamp(recentDamage, 0, 2);
    this.playerHp = PLAYER_MAX_HP * clamp(hpRatio, .01, 1);
    this.applyV12CombatPlan(this.currentV12CombatPlan());
  }

  spawnV12EncounterForTests(): void {
    this.spawnWave();
  }

  /** Deterministic V11.8 hooks for loadout combat regression tests. */
''',
)

# HUD: embed director inside existing course-beat plate to avoid adding another floating panel.
patch(
    "app/SkyDancerArcadeMode.tsx",
    '          <span>{snapshot.timelineSetpiece}</span>\n        </div>\n',
    '          <span>{snapshot.timelineSetpiece}</span>\n          <em className={productStyles.v12DirectorLine}>COMBAT DIRECTOR · {snapshot.combatDirectorLabel} · {snapshot.combatDirectorIntent}</em>\n        </div>\n',
)
patch("app/SkyDancerArcadeMode.tsx", '3D FLIGHT · V11.9 ·', '3D FLIGHT · V12.0 ·')
patch("app/SkyDancerArcadeMode.tsx", 'COMPATIBILITY · CANVAS · V11.9 ·', 'COMPATIBILITY · CANVAS · V12.0 ·')
patch(
    "app/SkyDancerArcadeMode.tsx",
    '<div className={productStyles.timelineBeat} data-kind={snapshot.timelineBeatKind} aria-label="Current course beat">',
    '<div className={productStyles.timelineBeat} data-kind={snapshot.timelineBeatKind} data-director={snapshot.combatDirectorMode} aria-label="Current course beat">',
)

p = Path("app/SkyDancerArcadeProduct.module.css")
s = p.read_text()
if ".v12DirectorLine" in s:
    raise SystemExit("V12 CSS already present")
s += r'''

/* V12.0 Combat Director lives inside the course-beat plate so adaptation is readable without HUD sprawl. */
.v12DirectorLine {
  display: block;
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid rgba(255,255,255,.12);
  color: rgba(216,236,255,.9);
  font-size: 7px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: .055em;
  line-height: 1.12;
  white-space: nowrap;
}
.timelineBeat[data-director="armor-screen"] .v12DirectorLine { color: #ffd28f; }
.timelineBeat[data-director="hunter-sweep"] .v12DirectorLine { color: #8ff3ff; }
.timelineBeat[data-director="jammer-net"] .v12DirectorLine { color: #e9b0ff; }
.timelineBeat[data-director="relief-window"] .v12DirectorLine { color: #a9ffd2; }
@media (max-width: 720px) {
  .v12DirectorLine { font-size: 6px; letter-spacing: .035em; }
}
'''
p.write_text(s)

# Tests import planner and append focused V12 contracts.
patch(
    "tests/sky-arcade-run.test.ts",
    'import { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\n',
    'import { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\nimport { skyDancerArcadeV12CombatPlan } from "../src/sky/arcade/SkyDancerArcadeV12Director";\n',
)
p = Path("tests/sky-arcade-run.test.ts")
s = p.read_text()
s = s.replace('assert.match(modeSource, /V11\\.(?:8|9)/);', 'assert.match(modeSource, /V(?:11\\.(?:8|9)|12\\.0)/);')
if 'V12.0 director reacts to actual combat behavior' in s:
    raise SystemExit("V12 tests already present")
s += r'''


test("V12.0 director reacts to actual combat behavior instead of only equipped loadout", () => {
  const common = { recentDamage: 0, hpRatio: 1, chain: 5, beatIntensity: .82, hard: false };
  assert.equal(skyDancerArcadeV12CombatPlan({ ...common, gunHeat: 2.4, missileHeat: .2, turboHeat: .2 }).mode, "armor-screen");
  assert.equal(skyDancerArcadeV12CombatPlan({ ...common, gunHeat: .2, missileHeat: 2.4, turboHeat: .2 }).mode, "hunter-sweep");
  assert.equal(skyDancerArcadeV12CombatPlan({ ...common, gunHeat: .2, missileHeat: .2, turboHeat: 2.4 }).mode, "jammer-net");
  const relief = skyDancerArcadeV12CombatPlan({ ...common, gunHeat: 2.4, missileHeat: .2, turboHeat: .2, recentDamage: 1.3, hpRatio: .28 });
  assert.equal(relief.mode, "relief-window");
  assert.ok(relief.waveCountDelta < 0);
  assert.ok(relief.cadenceScale > 1);
});

test("V12.0 runtime turns sustained gun pressure into an armor-screen encounter", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1201 });
  runtime.setFire(true);
  for (let frame = 0; frame < 155; frame += 1) runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.ok(snapshot.combatDirectorWaveSerial >= 1);
  assert.equal(snapshot.combatDirectorPlayerStyle, "gun");
  assert.equal(snapshot.combatDirectorMode, "armor-screen");
  assert.match(snapshot.combatDirectorIntent, /BREAK THE LINE/);
});

test("V12.0 relief window reduces encounter density and delays enemy counters after heavy damage", () => {
  const pressure = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1202 });
  const relief = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", seed: 0x1202 });
  pressure.setV12DirectorSignalsForTests(2.2, .1, .1, 0, 1);
  relief.setV12DirectorSignalsForTests(2.2, .1, .1, 1.4, .25);
  pressure.spawnV12EncounterForTests();
  relief.spawnV12EncounterForTests();
  const aggressiveEnemies = pressure.getSnapshot().enemies;
  const reliefEnemies = relief.getSnapshot().enemies;
  assert.equal(relief.getSnapshot().combatDirectorMode, "relief-window");
  assert.ok(reliefEnemies.length < aggressiveEnemies.length, `${reliefEnemies.length} < ${aggressiveEnemies.length}`);
  assert.ok(reliefEnemies.every((enemy) => enemy.counterplay === "none"));
});

test("V12.0 adaptive encounter state is surfaced in the compact HUD and version contract", async () => {
  const [modeSource, cssSource, runtimeSource, directorSource] = await Promise.all([
    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeProduct.module.css", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeV12Director.ts", import.meta.url), "utf8"),
  ]);
  assert.match(modeSource, /V12\.0/);
  assert.match(modeSource, /COMBAT DIRECTOR/);
  assert.match(modeSource, /combatDirectorIntent/);
  assert.match(cssSource, /v12DirectorLine/);
  assert.match(runtimeSource, /combatDirectorWaveSerial/);
  assert.match(directorSource, /ARMOR SCREEN/);
  assert.match(directorSource, /HUNTER SWEEP/);
  assert.match(directorSource, /JAMMER NET/);
  assert.match(directorSource, /RELIEF WINDOW/);
});
'''
p.write_text(s)
print("V12.0 Combat Director patch applied")
