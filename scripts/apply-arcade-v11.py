from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch needle in {path}: {old[:120]!r}")
    p.write_text(s.replace(old, new, 1))


timeline = r'''import type {
  SkyDancerArcadeEnemyKind,
  SkyDancerArcadeFormation,
  SkyDancerArcadeHazardKind,
  SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type { SkyDancerArcadeEnemyManeuver } from "./SkyDancerArcadeRuntime";

export type SkyDancerArcadeV11BeatKind = "entry" | "combat" | "setpiece" | "chase" | "boss";
export type SkyDancerArcadeV11RouteRisk = "SAFE" | "SCORE" | "DANGER" | "LOCKED";

export interface SkyDancerArcadeV11Beat {
  id: string;
  label: string;
  start: number;
  end: number;
  kind: SkyDancerArcadeV11BeatKind;
  setpiece: string;
  intensity: number;
  waveIntervalScale: number;
  hazardIntervalScale: number;
  cameraFov: number;
  cameraPullback: number;
  scoreBonus: number;
  preferredFormations: readonly SkyDancerArcadeFormation[];
  preferredEnemies: readonly SkyDancerArcadeEnemyKind[];
  maneuvers: readonly SkyDancerArcadeEnemyManeuver[];
  forcedHazard?: SkyDancerArcadeHazardKind;
}

const b = (
  id: string, label: string, start: number, end: number, kind: SkyDancerArcadeV11BeatKind,
  setpiece: string, intensity: number, waveIntervalScale: number, hazardIntervalScale: number,
  cameraFov: number, cameraPullback: number, scoreBonus: number,
  preferredFormations: readonly SkyDancerArcadeFormation[], preferredEnemies: readonly SkyDancerArcadeEnemyKind[],
  maneuvers: readonly SkyDancerArcadeEnemyManeuver[], forcedHazard?: SkyDancerArcadeHazardKind,
): SkyDancerArcadeV11Beat => ({
  id, label, start, end, kind, setpiece, intensity, waveIntervalScale, hazardIntervalScale,
  cameraFov, cameraPullback, scoreBonus, preferredFormations, preferredEnemies, maneuvers, forcedHazard,
});

const TIMELINES: Record<SkyDancerArcadeStageId, readonly SkyDancerArcadeV11Beat[]> = {
  "dawn-city": [
    b("city-entry", "CITY ENTRY", 0, .12, "entry", "SKYLINE APPROACH", .30, 1.18, 1.10, -.6, .2, 300, ["line","vee"], ["fighter","interceptor"], ["approach","parallel"]),
    b("tower-slalom", "SKYLINE SLALOM", .12, .30, "setpiece", "TOWER SLALOM", .62, .90, .76, 1.0, .7, 700, ["line","cross"], ["fighter","interceptor"], ["cross-pass","close-bank"], "tower"),
    b("city-gantry", "GANTRY RUN", .30, .46, "setpiece", "CITY GANTRY CORRIDOR", .78, .80, .66, 1.8, 1.1, 950, ["cross","pincer"], ["interceptor","missile-boat"], ["overtake","cross-pass"], "arch"),
    b("ace-pursuit", "ACE PURSUIT", .46, .58, "chase", "ROOFTOP PURSUIT", .92, .68, .90, 2.7, 1.7, 1300, ["pincer","vee"], ["ace","interceptor"], ["overtake","parallel","cross-pass"]),
    b("aurora-duel", "AURORA DUEL", .58, 1, "boss", "SUNRISE CHASE ARENA", 1, 1, 1, 3.2, 2.1, 1700, ["line"], ["ace"], ["close-bank"]),
  ],
  "red-canyon": [
    b("mesa-entry", "MESA ENTRY", 0, .12, "entry", "RED MESA DESCENT", .34, 1.14, 1.08, -.4, .1, 320, ["line"], ["fighter","interceptor"], ["approach"]),
    b("knife-floor", "KNIFE FLOOR", .12, .30, "setpiece", "LOW ALTITUDE KNIFE RUN", .76, .82, .72, 1.6, .8, 780, ["pincer","cross"], ["interceptor","fighter"], ["close-bank","cross-pass"], "rock"),
    b("collapse-arch", "CANYON COLLAPSE", .30, .46, "setpiece", "FALLING STONE ARCH", .9, .72, .60, 2.3, 1.4, 1050, ["cross","wall"], ["interceptor","bomber"], ["overtake","parallel"], "arch"),
    b("drill-chase", "DRILL CHASE", .46, .58, "chase", "BASALT WAKE", .96, .68, .82, 2.8, 1.8, 1350, ["pincer"], ["interceptor","bomber"], ["overtake","cross-pass"]),
    b("basalt-driller", "BASALT DRILLER", .58, 1, "boss", "CANYON CORE", 1, 1, 1, 3.0, 2.0, 1750, ["line"], ["bomber"], ["close-bank"]),
  ],
  "cloud-fleet": [
    b("cloud-break", "CLOUD BREAK", 0, .12, "entry", "WHITE SEA ENTRY", .3, 1.16, 1.12, -.8, .2, 300, ["vee"], ["fighter"], ["approach"]),
    b("fleet-screen", "FLEET SCREEN", .12, .30, "combat", "WARSHIP FORMATION", .68, .84, .88, 1.1, .8, 760, ["vee","wall"], ["fighter","missile-boat"], ["parallel","cross-pass"]),
    b("deck-run", "DECK RUN", .30, .46, "setpiece", "CAPITAL SHIP DECK PASS", .88, .72, .70, 2.0, 1.4, 1100, ["wall","spiral"], ["missile-boat","bomber"], ["overtake","parallel"], "debris"),
    b("cruiser-approach", "CRUISER APPROACH", .46, .58, "chase", "ENGINE WAKE", .94, .68, .84, 2.5, 1.8, 1350, ["vee","pincer"], ["fighter","bomber"], ["cross-pass","close-bank"]),
    b("cumulus-cruiser", "CUMULUS CRUISER", .58, 1, "boss", "FLEET FLAGSHIP", 1, 1, 1, 3.0, 2.3, 1800, ["wall"], ["bomber"], ["parallel"]),
  ],
  "storm-carrier": [
    b("thunderhead", "THUNDERHEAD", 0, .12, "entry", "STORM FRONT", .42, 1.08, .95, .2, .4, 350, ["cross"], ["fighter","interceptor"], ["approach"]),
    b("safe-lanes", "LIGHTNING SAFE LANES", .12, .30, "setpiece", "THUNDER WALL", .84, .82, .54, 1.8, 1.1, 950, ["cross","pincer"], ["interceptor","fighter"], ["cross-pass","close-bank"], "lightning"),
    b("carrier-screen", "CARRIER SCREEN", .30, .46, "combat", "ESCORT BARRAGE", .9, .70, .78, 2.3, 1.5, 1150, ["wall","spiral"], ["missile-boat","bomber","interceptor"], ["parallel","overtake"]),
    b("storm-eye", "STORM EYE", .46, .58, "chase", "TEMPEST APPROACH", .96, .68, .76, 2.8, 1.9, 1450, ["pincer","wall"], ["missile-boat","ace"], ["cross-pass","close-bank"]),
    b("tempest-carrier", "TEMPEST CARRIER", .58, 1, "boss", "STORM EYE ARENA", 1, 1, 1, 3.3, 2.4, 1900, ["wall"], ["bomber"], ["parallel"]),
  ],
  "desert-fortress": [
    b("dune-entry", "DUNE APPROACH", 0, .12, "entry", "HEAT HAZE RUN", .34, 1.14, 1.08, -.4, .2, 320, ["line"], ["fighter"], ["approach"]),
    b("wall-barrage", "WALL BARRAGE", .12, .30, "combat", "FORTRESS ARTILLERY", .72, .82, .82, 1.3, .8, 820, ["wall","line"], ["missile-boat","bomber"], ["parallel","cross-pass"], "tower"),
    b("breach-run", "SANDWALL BREACH", .30, .46, "setpiece", "FORTRESS GATE", .9, .72, .62, 2.1, 1.4, 1150, ["pincer","wall"], ["fighter","missile-boat"], ["overtake","close-bank"], "rock"),
    b("fortress-core", "FORTRESS CORE", .46, .58, "chase", "INNER DEFENSE LINE", .94, .70, .78, 2.6, 1.8, 1400, ["wall"], ["bomber","missile-boat"], ["parallel","cross-pass"]),
    b("golden-wall", "GOLDEN WALL", .58, 1, "boss", "FORTRESS HEART", 1, 1, 1, 3.0, 2.2, 1850, ["wall"], ["bomber"], ["parallel"]),
  ],
  "ice-cavern": [
    b("glacier-entry", "GLACIER ENTRY", 0, .12, "entry", "ICE MOUTH", .36, 1.12, 1.05, -.6, .2, 320, ["line"], ["interceptor"], ["approach"]),
    b("crystal-tunnel", "CRYSTAL TUNNEL", .12, .30, "setpiece", "CRYSTAL RIBS", .78, .82, .64, 1.7, 1.0, 900, ["spiral","cross"], ["interceptor","fighter"], ["cross-pass","close-bank"], "arch"),
    b("ice-collapse", "ICE COLLAPSE", .30, .46, "setpiece", "FALLING GLACIER", .92, .72, .58, 2.4, 1.5, 1200, ["pincer","spiral"], ["interceptor","ace"], ["overtake","cross-pass"], "rock"),
    b("wyrm-trace", "WYRM TRACE", .46, .58, "chase", "FROZEN WAKE", .96, .66, .84, 2.9, 1.9, 1450, ["spiral"], ["ace","interceptor"], ["parallel","close-bank"]),
    b("glacier-wyrm", "GLACIER WYRM", .58, 1, "boss", "ICE CHAMBER", 1, 1, 1, 3.2, 2.2, 1900, ["spiral"], ["ace"], ["close-bank"]),
  ],
  "floating-ruins": [
    b("ruin-entry", "SKY LABYRINTH", 0, .12, "entry", "FLOATING STONE FIELD", .38, 1.10, 1.02, -.4, .3, 340, ["vee"], ["fighter","interceptor"], ["approach"]),
    b("portal-run", "PORTAL RUN", .12, .30, "setpiece", "ANCIENT ARCHWAYS", .76, .82, .66, 1.6, 1.1, 900, ["spiral","vee"], ["fighter","ace"], ["cross-pass","parallel"], "arch"),
    b("shifting-ruins", "RUIN GATE SHIFT", .30, .46, "setpiece", "MOVING LABYRINTH", .9, .72, .64, 2.2, 1.5, 1180, ["cross","pincer"], ["interceptor","bomber","ace"], ["overtake","close-bank"], "rock"),
    b("guardian-wake", "GUARDIAN WAKE", .46, .58, "chase", "AEON APPROACH", .96, .68, .80, 2.8, 1.9, 1450, ["spiral","pincer"], ["ace","bomber"], ["parallel","cross-pass"]),
    b("aeon-guardian", "AEON GUARDIAN", .58, 1, "boss", "ANCIENT CORE", 1, 1, 1, 3.1, 2.2, 1900, ["spiral"], ["ace"], ["parallel"]),
  ],
  "night-metro": [
    b("neon-entry", "NEON ENTRY", 0, .12, "entry", "MIDNIGHT SKYLINE", .38, 1.10, 1.04, -.3, .3, 350, ["line"], ["fighter","interceptor"], ["approach"]),
    b("metro-chase", "METRO CHASE", .12, .30, "chase", "ELEVATED LINE PURSUIT", .82, .76, .88, 1.8, 1.2, 980, ["pincer","cross"], ["interceptor","ace"], ["overtake","parallel"]),
    b("neon-gantry", "NEON GANTRY", .30, .46, "setpiece", "TRANSIT GATE RUN", .92, .70, .62, 2.4, 1.6, 1250, ["cross","wall"], ["missile-boat","interceptor"], ["cross-pass","close-bank"], "arch"),
    b("phantom-pursuit", "PHANTOM PURSUIT", .46, .58, "chase", "TUNNEL EXIT DUEL", .98, .64, .84, 3.0, 2.0, 1550, ["spiral","pincer"], ["ace","interceptor"], ["overtake","parallel","cross-pass"]),
    b("neon-phantom", "NEON PHANTOM", .58, 1, "boss", "MIDNIGHT EXPRESSWAY", 1, 1, 1, 3.4, 2.4, 2000, ["spiral"], ["ace"], ["close-bank"]),
  ],
  "volcano-core": [
    b("caldera-drop", "CALDERA DROP", 0, .12, "entry", "VOLCANIC DESCENT", .44, 1.06, .96, .4, .5, 380, ["line"], ["interceptor"], ["approach"]),
    b("magma-rift", "MAGMA RIFT", .12, .30, "setpiece", "LAVA TRENCH", .82, .78, .62, 1.9, 1.2, 1000, ["wall","pincer"], ["interceptor","bomber"], ["cross-pass","close-bank"], "rock"),
    b("eruption-run", "ERUPTION RUN", .30, .46, "setpiece", "CORE SURGE", .96, .68, .54, 2.7, 1.7, 1350, ["spiral","wall"], ["bomber","missile-boat","ace"], ["overtake","parallel"], "lightning"),
    b("core-dive", "CORE DIVE", .46, .58, "chase", "MAGMA HEART APPROACH", 1, .64, .72, 3.2, 2.1, 1650, ["pincer"], ["ace","bomber"], ["cross-pass","close-bank"]),
    b("magma-heart", "MAGMA HEART", .58, 1, "boss", "ERUPTION CHAMBER", 1, 1, 1, 3.6, 2.5, 2100, ["wall"], ["bomber"], ["parallel"]),
  ],
  "orbital-ascent": [
    b("atmosphere-break", "ATMOSPHERE BREAK", 0, .12, "entry", "UPPER SKY", .40, 1.08, 1.00, .2, .5, 380, ["vee"], ["fighter","interceptor"], ["approach"]),
    b("ascent-spine", "ASCENT SPINE", .12, .30, "setpiece", "VERTICAL TRUSS RUN", .78, .78, .78, 1.9, 1.3, 1000, ["line","spiral"], ["fighter","missile-boat"], ["parallel","cross-pass"], "arch"),
    b("debris-lattice", "DEBRIS LATTICE", .30, .46, "setpiece", "ORBITAL DEBRIS FIELD", .92, .68, .56, 2.5, 1.8, 1350, ["wall","spiral"], ["interceptor","bomber","ace"], ["overtake","cross-pass"], "debris"),
    b("lance-run", "LANCE RUN", .46, .58, "chase", "WEAPON SPINE", .98, .62, .80, 3.0, 2.2, 1650, ["pincer","wall"], ["ace","missile-boat"], ["parallel","close-bank"]),
    b("orbital-lance", "ORBITAL LANCE", .58, 1, "boss", "ZERO-G WEAPON CORE", 1, 1, 1, 3.5, 2.7, 2150, ["spiral"], ["ace"], ["parallel"]),
  ],
  "prism-citadel": [
    b("prism-entry", "PRISM ENTRY", 0, .10, "entry", "CITADEL APPROACH", .48, 1.02, .96, .5, .7, 450, ["line","vee"], ["fighter","interceptor"], ["approach"]),
    b("mirror-corridor", "MIRROR CORRIDOR", .10, .22, "setpiece", "PRISM GATE ARRAY", .84, .72, .62, 2.0, 1.4, 1150, ["cross","spiral"], ["interceptor","missile-boat"], ["cross-pass","parallel"], "arch"),
    b("history-remix", "SEVEN SKY REMIX", .22, .34, "combat", "ROUTE MEMORY ASSAULT", .94, .62, .68, 2.7, 1.9, 1500, ["line","vee","cross","spiral","pincer","wall"], ["fighter","interceptor","missile-boat","bomber","ace"], ["overtake","parallel","cross-pass","close-bank"], "mine"),
    b("titan-approach", "TITAN APPROACH", .34, .44, "chase", "SOVEREIGN THRONE", 1, .58, .72, 3.4, 2.5, 1900, ["pincer","wall"], ["ace","bomber"], ["overtake","cross-pass","close-bank"], "tower"),
    b("sovereign-final", "PRISM SOVEREIGN", .44, 1, "boss", "FINAL TITAN ASSAULT", 1, 1, 1, 4.0, 3.0, 2600, ["spiral"], ["ace"], ["close-bank"]),
  ],
};

export function skyDancerArcadeV11Timeline(stageId: SkyDancerArcadeStageId): readonly SkyDancerArcadeV11Beat[] {
  return TIMELINES[stageId];
}

export function skyDancerArcadeV11BeatIndex(stageId: SkyDancerArcadeStageId, progress: number): number {
  const beats = TIMELINES[stageId];
  const p = Math.max(0, Math.min(.999999, progress));
  const index = beats.findIndex((beat) => p >= beat.start && p < beat.end);
  return index >= 0 ? index : beats.length - 1;
}

export function skyDancerArcadeV11Beat(stageId: SkyDancerArcadeStageId, progress: number): SkyDancerArcadeV11Beat {
  const beats = TIMELINES[stageId];
  return beats[skyDancerArcadeV11BeatIndex(stageId, progress)] ?? beats[beats.length - 1]!;
}

export function skyDancerArcadeV11RouteRisk(index: number, count: number): SkyDancerArcadeV11RouteRisk {
  if (count <= 1) return "LOCKED";
  if (count === 2) return index === 0 ? "SAFE" : "DANGER";
  if (index === 0) return "SAFE";
  if (index === count - 1) return "DANGER";
  return "SCORE";
}
'''
Path("src/sky/arcade/SkyDancerArcadeV11Timeline.ts").write_text(timeline)

runtime_path = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
replace_once(runtime_path,
'''  type SkyDancerArcadeEnemyRole,\n} from "./SkyDancerArcadeV10Systems";\n''',
'''  type SkyDancerArcadeEnemyRole,\n} from "./SkyDancerArcadeV10Systems";\nimport {\n  skyDancerArcadeV11Beat,\n  skyDancerArcadeV11BeatIndex,\n  skyDancerArcadeV11RouteRisk,\n  type SkyDancerArcadeV11BeatKind,\n  type SkyDancerArcadeV11RouteRisk,\n} from "./SkyDancerArcadeV11Timeline";\n''')

replace_once(runtime_path,
'''  stageEventIntensity: number;\n  enemies: SkyDancerArcadeEnemySnapshot[];\n''',
'''  stageEventIntensity: number;\n  timelineBeatId: string;\n  timelineBeatLabel: string;\n  timelineBeatKind: SkyDancerArcadeV11BeatKind;\n  timelineSetpiece: string;\n  timelineIntensity: number;\n  timelineCameraFov: number;\n  timelineCameraPullback: number;\n  timelineSerial: number;\n  routeRiskLabels: readonly SkyDancerArcadeV11RouteRisk[];\n  enemies: SkyDancerArcadeEnemySnapshot[];\n''')

replace_once(runtime_path,
'''  private stageEventTimer = 0;\n  private resultTimer = 0;\n''',
'''  private stageEventTimer = 0;\n  private timelineBeatIndex = 0;\n  private timelineSerial = 0;\n  private resultTimer = 0;\n''')

replace_once(runtime_path,
'''    this.stageEventLabel = null;\n    this.stageEventTimer = 0;\n    this.branchSelection = null;\n''',
'''    this.stageEventLabel = null;\n    this.stageEventTimer = 0;\n    this.timelineBeatIndex = skyDancerArcadeV11BeatIndex(this.stage.id, this.stageTime / this.stage.durationSeconds);\n    this.branchSelection = null;\n''')

replace_once(runtime_path, "    this.updateStageEvolution();\n    this.updateDirector();\n", "    this.updateV11Timeline();\n    this.updateDirector();\n")

needle = '''  private updateStageEvolution(): void {\n'''
method = '''  private updateV11Timeline(): void {\n    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);\n    const nextIndex = skyDancerArcadeV11BeatIndex(this.stage.id, progress);\n    if (nextIndex === this.timelineBeatIndex) return;\n    this.timelineBeatIndex = nextIndex;\n    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);\n    this.timelineSerial += 1;\n    // Reuse the proven presentation event channel while V11 owns the actual gameplay timeline.\n    this.stageEventSerial += 1;\n    this.stageEventLabel = beat.label;\n    this.stageEventTimer = 1.72;\n    this.message = `COURSE BEAT · ${beat.label}`;\n    this.messageTimer = beat.kind === "boss" ? 1.15 : 1.4;\n    this.addScore(beat.scoreBonus, true);\n    this.turbo = Math.min(100, this.turbo + 4 + Math.round(beat.intensity * 5));\n    if (!this.bossSpawned && beat.forcedHazard && this.hazards.length < 8) this.spawnHazardPattern(beat.forcedHazard);\n  }\n\n'''
replace_once(runtime_path, needle, method + needle)

old_director = '''  private updateDirector(): void {\n    const bossTime = this.stage.durationSeconds * skyDancerArcadeBossStartProgress(this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE);\n    if (!this.bossSpawned && this.stageTime >= bossTime) this.spawnBoss();\n    const enemyCap = this.options.difficulty === "hard" ? 15 : 11;\n    if (!this.bossSpawned && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {\n      this.spawnWave();\n      const pressure = this.options.difficulty === "hard" ? 0.84 : 1;\n      this.nextWaveAt += this.stage.waveIntervalSeconds * pressure * (0.84 + this.random() * 0.34);\n    }\n    if (!this.bossSpawned && this.stageTime >= this.nextHazardAt && this.hazards.length < 8) {\n      this.spawnHazardPattern();\n      this.nextHazardAt += (3.8 - this.stage.turbulence * 2.6) * (0.82 + this.random() * 0.42);\n    }\n  }\n'''
new_director = '''  private updateDirector(): void {\n    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);\n    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);\n    const bossTime = this.stage.durationSeconds * skyDancerArcadeBossStartProgress(this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE);\n    if (!this.bossSpawned && this.stageTime >= bossTime) this.spawnBoss();\n    const baseCap = this.options.difficulty === "hard" ? 15 : 11;\n    const enemyCap = Math.min(17, baseCap + Math.round(beat.intensity * 2));\n    if (!this.bossSpawned && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {\n      this.spawnWave();\n      const pressure = this.options.difficulty === "hard" ? 0.84 : 1;\n      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * (0.84 + this.random() * 0.34);\n    }\n    if (!this.bossSpawned && this.stageTime >= this.nextHazardAt && this.hazards.length < 8) {\n      this.spawnHazardPattern();\n      this.nextHazardAt += (3.8 - this.stage.turbulence * 2.6) * beat.hazardIntervalScale * (0.82 + this.random() * 0.42);\n    }\n  }\n'''
replace_once(runtime_path, old_director, new_director)

old_wave = '''  private spawnWave(): void {\n    const formation = this.stage.formations[Math.floor(this.random() * this.stage.formations.length)] ?? "line";\n    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;\n    const count = 3 + Math.floor(this.random() * 2) + hardBonus;\n    const choreography: readonly SkyDancerArcadeEnemyManeuver[] = ["close-bank", "overtake", "parallel", "cross-pass"];\n    const featured = choreography[this.waveSerial % choreography.length] ?? "close-bank";\n    this.waveSerial += 1;\n    for (let index = 0; index < count; index += 1) {\n      const kind = this.stage.enemies[Math.floor(this.random() * this.stage.enemies.length)] ?? "fighter";\n      const [formationX, formationY] = this.formationPosition(formation, index, count);\n      const maneuver: SkyDancerArcadeEnemyManeuver = index === 0\n        ? featured\n        : index === 1 && count >= 4\n          ? "close-bank"\n          : "approach";\n      const sign = Math.abs(formationX) > 0.18 ? Math.sign(formationX) : index % 2 === 0 ? 1 : -1;\n      const x = maneuver === "overtake" ? sign * 1.9 : formationX;\n      const y = maneuver === "overtake" ? clamp(formationY * 0.34, -0.62, 0.62) : formationY;\n      // V8 keeps ordinary enemies in the readable mid-field and lets an overtaker enter from behind.\n      const depth = maneuver === "overtake" ? -6.4 : 51 + index * 3.8 + this.random() * 10;\n      this.spawnEnemy(kind, x, y, depth, maneuver, sign);\n    }\n  }\n'''
new_wave = '''  private spawnWave(): void {\n    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);\n    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);\n    const formations = beat.preferredFormations.length > 0 ? beat.preferredFormations : this.stage.formations;\n    const enemyPool = beat.preferredEnemies.length > 0 ? beat.preferredEnemies : this.stage.enemies;\n    const formation = formations[Math.floor(this.random() * formations.length)] ?? "line";\n    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;\n    const count = Math.min(6, 3 + Math.floor(this.random() * 2) + hardBonus + (beat.intensity > .9 ? 1 : 0));\n    const choreography = beat.maneuvers.length > 0 ? beat.maneuvers : (["close-bank", "overtake", "parallel", "cross-pass"] as const);\n    const featured = choreography[this.waveSerial % choreography.length] ?? "close-bank";\n    this.waveSerial += 1;\n\n    // V11 showcase: Dawn City's pre-boss beat is a deliberate pursuit formation, not a random wave.\n    if (this.stage.id === "dawn-city" && beat.id === "ace-pursuit") {\n      const sign = this.waveSerial % 2 === 0 ? 1 : -1;\n      this.spawnEnemy("ace", sign * 1.86, .12, -6.4, "overtake", sign);\n      this.spawnEnemy("interceptor", -sign * 1.52, -.46, 48, "cross-pass", -sign);\n      this.spawnEnemy("interceptor", sign * .72, .58, 55, "parallel", sign);\n      return;\n    }\n\n    for (let index = 0; index < count; index += 1) {\n      const kind = enemyPool[Math.floor(this.random() * enemyPool.length)] ?? "fighter";\n      const [formationX, formationY] = this.formationPosition(formation, index, count);\n      const maneuver: SkyDancerArcadeEnemyManeuver = index === 0\n        ? featured\n        : index === 1 && count >= 4\n          ? (choreography[(this.waveSerial + 1) % choreography.length] ?? "close-bank")\n          : "approach";\n      const sign = Math.abs(formationX) > 0.18 ? Math.sign(formationX) : index % 2 === 0 ? 1 : -1;\n      const x = maneuver === "overtake" ? sign * 1.9 : formationX;\n      const y = maneuver === "overtake" ? clamp(formationY * 0.34, -0.62, 0.62) : formationY;\n      const depth = maneuver === "overtake" ? -6.4 : 51 + index * 3.8 + this.random() * 10;\n      this.spawnEnemy(kind, x, y, depth, maneuver, sign);\n    }\n  }\n'''
replace_once(runtime_path, old_wave, new_wave)

old_boss_motion = '''        enemy.weakpointOpen = skyDancerArcadeBossWeakpointOpen(enemy.bossPhase, enemy.age);\n        const phaseDepth = enemy.bossPhase === 1 ? 33 : enemy.bossPhase === 2 ? 29 : 25.5;\n        const phaseSpeed = enemy.bossPhase === 1 ? 18 : enemy.bossPhase === 2 ? 21 : 24;\n        enemy.depth = moveToward(enemy.depth, phaseDepth, delta * phaseSpeed);\n        const baseFrequency = this.options.difficulty === "hard" ? 0.82 : 0.68;\n        const frequency = baseFrequency * (1 + (enemy.bossPhase - 1) * .24);\n        const phaseAmplitude = enemy.amplitude * (1 + (enemy.bossPhase - 1) * .13);\n        const staggerSuppression = 1 - enemy.stagger * .16;\n        enemy.x = clamp((this.playerX * 0.58 + Math.sin(enemy.age * frequency) * phaseAmplitude) * staggerSuppression, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n        enemy.y = clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * (0.92 + enemy.bossPhase * .08) + 1.3) * (0.72 + enemy.bossPhase * .1), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n'''
new_boss_motion = '''        enemy.weakpointOpen = skyDancerArcadeBossWeakpointOpen(enemy.bossPhase, enemy.age);\n        const dawnAceChase = this.stage.id === "dawn-city";\n        const phaseDepth = dawnAceChase\n          ? (enemy.bossPhase === 1 ? 30 : enemy.bossPhase === 2 ? 23.5 : 18.5)\n          : (enemy.bossPhase === 1 ? 33 : enemy.bossPhase === 2 ? 29 : 25.5);\n        const phaseSpeed = dawnAceChase\n          ? (enemy.bossPhase === 1 ? 22 : enemy.bossPhase === 2 ? 26 : 30)\n          : (enemy.bossPhase === 1 ? 18 : enemy.bossPhase === 2 ? 21 : 24);\n        enemy.depth = moveToward(enemy.depth, phaseDepth, delta * phaseSpeed);\n        const baseFrequency = this.options.difficulty === "hard" ? 0.82 : 0.68;\n        const frequency = baseFrequency * (1 + (enemy.bossPhase - 1) * .24) * (dawnAceChase ? 1.34 : 1);\n        const phaseAmplitude = enemy.amplitude * (1 + (enemy.bossPhase - 1) * .13) * (dawnAceChase ? 1.12 : 1);\n        const staggerSuppression = 1 - enemy.stagger * .16;\n        enemy.x = dawnAceChase\n          ? clamp((this.playerX * .78 + Math.sin(enemy.age * frequency) * phaseAmplitude) * staggerSuppression, -ENEMY_X_LIMIT, ENEMY_X_LIMIT)\n          : clamp((this.playerX * 0.58 + Math.sin(enemy.age * frequency) * phaseAmplitude) * staggerSuppression, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n        enemy.y = dawnAceChase\n          ? clamp(this.playerY * .68 + Math.sin(enemy.age * (1.18 + enemy.bossPhase * .12) + 1.3) * (.78 + enemy.bossPhase * .12), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT)\n          : clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * (0.92 + enemy.bossPhase * .08) + 1.3) * (0.72 + enemy.bossPhase * .1), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n'''
replace_once(runtime_path, old_boss_motion, new_boss_motion)

replace_once(runtime_path,
'''      stageEventIntensity: this.stageEventTimer > 0 ? clamp(this.stageEventTimer / 1.65, 0, 1) : 0,\n      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({\n''',
'''      stageEventIntensity: this.stageEventTimer > 0 ? clamp(this.stageEventTimer / 1.72, 0, 1) : 0,\n      timelineBeatId: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).id,\n      timelineBeatLabel: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).label,\n      timelineBeatKind: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).kind,\n      timelineSetpiece: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).setpiece,\n      timelineIntensity: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).intensity,\n      timelineCameraFov: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).cameraFov,\n      timelineCameraPullback: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).cameraPullback,\n      timelineSerial: this.timelineSerial,\n      routeRiskLabels: this.stage.next.map((_, index) => skyDancerArcadeV11RouteRisk(index, this.stage.next.length)),\n      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({\n''')

replace_once(runtime_path,
'''  /** Deterministic V10 hooks used by rule tests without adding alternate production gameplay paths. */\n  triggerStageEvolutionForTests(progress: number): void {\n''',
'''  /** Deterministic V11 hook for timeline/director regression tests. */\n  triggerV11TimelineForTests(progress: number): void {\n    this.stageTime = this.stage.durationSeconds * clamp(progress, 0, 1);\n    this.distance = this.stageTime * this.stage.courseSpeed;\n    this.updateV11Timeline();\n  }\n\n  /** Deterministic V10 hooks retained for legacy rule coverage. */\n  triggerStageEvolutionForTests(progress: number): void {\n''')

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl,
'''    if (snapshot.stageSerial !== this.previousSnapshot.stageSerial) this.audio.tone(330, .18, .025, "triangle");\n    const incoming = snapshot.projectiles.some''',
'''    if (snapshot.stageSerial !== this.previousSnapshot.stageSerial) this.audio.tone(330, .18, .025, "triangle");\n    if (snapshot.timelineSerial !== this.previousSnapshot.timelineSerial) { this.audio.tone(520, .12, .018, "triangle"); this.audio.tone(780, .08, .012, "square"); }\n    const incoming = snapshot.projectiles.some''')
replace_once(webgl,
'''    this.camera.position.z += (pose.z + this.presentationFx.pullback + this.cameraImpactKick - this.camera.position.z) * zAlpha;\n    this.camera.fov += (pose.fov + this.presentationFx.fovKick - this.camera.fov) * fovAlpha;\n''',
'''    // V11 course beats may widen or pull back the shot, but never own world rotation/translation.\n    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick - this.camera.position.z) * zAlpha;\n    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov - this.camera.fov) * fovAlpha;\n''')

ui = "app/SkyDancerArcadeMode.tsx"
replace_once(ui,
'''        </header>\n\n        {snapshot.message && <div className={`${styles.message} ${productStyles.flightMessage}`}>{snapshot.message}</div>}\n''',
'''        </header>\n\n        <div className={productStyles.timelineBeat} data-kind={snapshot.timelineBeatKind} aria-label="Current course beat">\n          <small>COURSE BEAT · {String(snapshot.timelineBeatId).toUpperCase().replaceAll("-", " ")}</small>\n          <strong>{snapshot.timelineBeatLabel}</strong>\n          <span>{snapshot.timelineSetpiece}</span>\n        </div>\n\n        {snapshot.message && <div className={`${styles.message} ${productStyles.flightMessage}`}>{snapshot.message}</div>}\n''')
replace_once(ui,
'''                    <span>{index === 0 ? "LEFT" : index === snapshot.branchOptions.length - 1 ? "RIGHT" : "CENTER"}</span>\n                    <strong>{stage.name}</strong>\n''',
'''                    <span>{index === 0 ? "LEFT" : index === snapshot.branchOptions.length - 1 ? "RIGHT" : "CENTER"} · {snapshot.routeRiskLabels[index] ?? "ROUTE"}</span>\n                    <strong>{stage.name}</strong>\n''')
replace_once(ui,
'''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? "3D FLIGHT" : "COMPATIBILITY · CANVAS"}</span>\n''',
'''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? "3D FLIGHT · V11 ARCADE EVOLUTION" : "COMPATIBILITY · CANVAS · V11"}</span>\n''')

css = Path("app/SkyDancerArcadeProduct.module.css")
css.write_text(css.read_text() + r'''

/* V11: stage-specific timeline readout. It stays informational and never covers the reticle. */
.timelineBeat {
  position: absolute; z-index: 7; pointer-events: none;
  left: 50%; top: max(78px, calc(env(safe-area-inset-top) + 58px)); transform: translateX(-50%);
  width: min(290px, 34vw); text-align: center; color: #eefbff;
  text-shadow: 0 2px 7px #071b2ae8;
  opacity: .82;
}
.timelineBeat small { display: block; font-size: 6px; letter-spacing: .22em; color: #bfe9f2a8; }
.timelineBeat strong { display: block; margin-top: 3px; font-size: 10px; font-weight: 650; letter-spacing: .16em; }
.timelineBeat span { display: block; margin-top: 3px; font-size: 6px; letter-spacing: .14em; color: #dceef0a6; }
.timelineBeat[data-kind="setpiece"] strong, .timelineBeat[data-kind="chase"] strong { color: #fff0c6; }
.timelineBeat[data-kind="boss"] strong { color: #ffc4ca; }
@media (max-height: 520px) {
  .timelineBeat { top: max(58px, calc(env(safe-area-inset-top) + 43px)); width: 30vw; opacity: .72; }
  .timelineBeat span { display: none; }
}
@media (orientation: portrait) { .timelineBeat { top: 148px; width: 54vw; } }
''')

test_file = r'''import test from "node:test";
import assert from "node:assert/strict";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { skyDancerArcadeV11Beat, skyDancerArcadeV11RouteRisk, skyDancerArcadeV11Timeline } from "../src/sky/arcade/SkyDancerArcadeV11Timeline";

test("V11 gives every arcade stage a continuous five-beat authored timeline", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const beats = skyDancerArcadeV11Timeline(stage.id);
    assert.equal(beats.length, 5, `${stage.id} has five authored beats`);
    assert.equal(beats[0]?.start, 0);
    assert.equal(beats[beats.length - 1]?.end, 1);
    assert.equal(beats[beats.length - 1]?.kind, "boss");
    for (let i = 0; i < beats.length; i += 1) {
      const beat = beats[i]!;
      assert.ok(beat.end > beat.start, `${stage.id}/${beat.id} has positive duration`);
      assert.ok(beat.intensity >= 0 && beat.intensity <= 1);
      assert.ok(Math.abs(beat.cameraFov) <= 5 && beat.cameraPullback >= 0 && beat.cameraPullback <= 4);
      assert.ok(beat.preferredEnemies.length > 0 && beat.preferredFormations.length > 0 && beat.maneuvers.length > 0);
      if (i > 0) assert.ok(Math.abs(beats[i - 1]!.end - beat.start) < 1e-9, `${stage.id} has no timeline gap`);
    }
  }
});

test("V11 stage identities expose distinct signature setpieces", () => {
  const signatures = new Set(SKY_DANCER_ARCADE_STAGES.map((stage) => skyDancerArcadeV11Beat(stage.id, .35).setpiece));
  assert.equal(signatures.size, SKY_DANCER_ARCADE_STAGES.length);
  const city = skyDancerArcadeV11Beat("dawn-city", .5);
  assert.equal(city.id, "ace-pursuit");
  assert.ok(city.preferredEnemies.includes("ace"));
  assert.ok(city.maneuvers.includes("overtake") && city.maneuvers.includes("cross-pass"));
  assert.equal(skyDancerArcadeV11Beat("prism-citadel", .5).kind, "boss");
});

test("V11 route risk communicates safe, score and danger choices", () => {
  assert.deepEqual([0,1].map((i) => skyDancerArcadeV11RouteRisk(i,2)), ["SAFE","DANGER"]);
  assert.deepEqual([0,1,2].map((i) => skyDancerArcadeV11RouteRisk(i,3)), ["SAFE","SCORE","DANGER"]);
  assert.equal(skyDancerArcadeV11RouteRisk(0,1), "LOCKED");
});

test("V11 runtime advances course beats and exposes camera/setpiece telemetry", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", startStageId: "dawn-city", difficulty: "normal", seed: 111 });
  const initial = runtime.getSnapshot();
  assert.equal(initial.timelineBeatId, "city-entry");
  runtime.triggerV11TimelineForTests(.14);
  const slalom = runtime.getSnapshot();
  assert.equal(slalom.timelineBeatId, "tower-slalom");
  assert.ok(slalom.timelineSerial > initial.timelineSerial);
  assert.equal(slalom.stageEventLabel, "SKYLINE SLALOM");
  runtime.triggerV11TimelineForTests(.5);
  const pursuit = runtime.getSnapshot();
  assert.equal(pursuit.timelineBeatId, "ace-pursuit");
  assert.ok(pursuit.timelineCameraFov > slalom.timelineCameraFov);
  assert.equal(pursuit.routeRiskLabels.length, 2);
});
'''
Path("tests/sky-arcade-v11.test.ts").write_text(test_file)

Path("docs/ARCADE_V11_EVOLUTION.md").write_text(r'''# Sky Dancer Arcade V11 — ARCADE EVOLUTION

V11 converts ARCADE RUN from shared event checkpoints into stage-authored playable timelines.

## Shipped in V11.0
- Five authored COURSE BEATs for all 11 stages.
- Beat-driven enemy pool, formation, maneuver choreography, wave pressure, hazard pressure and camera framing.
- Stage-specific setpiece telemetry surfaced in the HUD.
- SAFE / SCORE / DANGER route language.
- Dawn City showcase reconstruction with GANTRY RUN, ACE PURSUIT and a more aggressive AURORA ACE WING chase profile.
- V10.4/V10.5 world-frame and grounding ownership remain authoritative; V11 camera beats only change FOV/pullback.

## Next reconstruction passes
1. Cloud Fleet capital-ship traversal setpiece.
2. Night Metro train/tunnel pursuit setpiece.
3. Boss-specific mechanics for all 11 climax targets.
4. Medal/secret mission scoring and route history result card.
5. Remaining stage setpiece geometry and full-run iPhone balance audit.
''')

print("V11 patch applied")
