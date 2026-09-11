from pathlib import Path

world_path = Path('src/sky/arcade/SkyDancerArcadeV40WorldBreak.ts')
runtime_path = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
webgl_path = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
canvas_path = Path('src/sky/arcade/SkyDancerArcadeCanvasDemo.ts')
mode_path = Path('app/SkyDancerArcadeMode.tsx')
css_path = Path('app/SkyDancerArcadeMode.module.css')
foundation_test_path = Path('tests/sky-arcade-v40-world-break.test.ts')
phase3_test_path = Path('tests/sky-arcade-v40-world-break-phase3.test.ts')

world = world_path.read_text()
runtime = runtime_path.read_text()
webgl = webgl_path.read_text()
canvas = canvas_path.read_text()
mode = mode_path.read_text()
css = css_path.read_text()
foundation_test = foundation_test_path.read_text()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return source.replace(old, new, 1)


# -----------------------------------------------------------------------------
# V40 authored objective definitions: activate Storm Carrier + Desert Fortress.
# -----------------------------------------------------------------------------
world = replace_once(world,
'''export interface SkyDancerArcadeV40FleetTargetDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  kind: SkyDancerArcadeEnemyKind;
  label: string;
  hp: number;
  score: number;
}
''',
'''export interface SkyDancerArcadeV40FleetTargetDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  kind: SkyDancerArcadeEnemyKind;
  label: string;
  hp: number;
  score: number;
}

export interface SkyDancerArcadeV40StormLaneDefinition {
  index: number;
  progress: number;
  safeX: number;
  amplitude: number;
  phase: number;
  width: number;
  score: number;
}
''', 'phase3 storm interface')

world = replace_once(world,
'''  "storm-carrier": { stageId: "storm-carrier", objective: "READ THE SAFE LANE", signature: "LIGHTNING GRID", live: false },
  "desert-fortress": { stageId: "desert-fortress", objective: "BREACH THE WALL", signature: "FORTRESS GATE", live: false },''',
'''  "storm-carrier": { stageId: "storm-carrier", objective: "READ THE SAFE LANE", signature: "LIGHTNING GRID", live: true },
  "desert-fortress": { stageId: "desert-fortress", objective: "BREACH THE WALL", signature: "FORTRESS GATE", live: true },''', 'phase3 activate profiles')

world = replace_once(world,
'''export const SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS: readonly SkyDancerArcadeV40FleetTargetDefinition[] = [
  { index: 0, progress: .17, x: -1.28, y: .18, kind: "missile-boat", label: "PORT BATTERY", hp: 62, score: 1800 },
  { index: 1, progress: .245, x: 1.18, y: -.12, kind: "gunship", label: "ENGINE ARRAY", hp: 88, score: 2400 },
  { index: 2, progress: .335, x: .02, y: .28, kind: "bomber", label: "BRIDGE CORE", hp: 118, score: 3600 },
];
''',
'''export const SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS: readonly SkyDancerArcadeV40FleetTargetDefinition[] = [
  { index: 0, progress: .17, x: -1.28, y: .18, kind: "missile-boat", label: "PORT BATTERY", hp: 62, score: 1800 },
  { index: 1, progress: .245, x: 1.18, y: -.12, kind: "gunship", label: "ENGINE ARRAY", hp: 88, score: 2400 },
  { index: 2, progress: .335, x: .02, y: .28, kind: "bomber", label: "BRIDGE CORE", hp: 118, score: 3600 },
];

export const SKY_DANCER_ARCADE_V40_STORM_LANES: readonly SkyDancerArcadeV40StormLaneDefinition[] = [
  { index: 0, progress: .145, safeX: -1.12, amplitude: .26, phase: .2, width: .72, score: 1050 },
  { index: 1, progress: .195, safeX: .92, amplitude: .38, phase: 1.45, width: .68, score: 1250 },
  { index: 2, progress: .245, safeX: -.22, amplitude: .48, phase: 2.7, width: .65, score: 1450 },
  { index: 3, progress: .295, safeX: 1.08, amplitude: .34, phase: 4.05, width: .62, score: 1700 },
  { index: 4, progress: .345, safeX: -.72, amplitude: .44, phase: 5.2, width: .6, score: 2100 },
];

export const SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS: readonly SkyDancerArcadeV40FleetTargetDefinition[] = [
  { index: 0, progress: .145, x: -1.42, y: .12, kind: "missile-boat", label: "WEST WALL GUN", hp: 66, score: 1850 },
  { index: 1, progress: .215, x: 1.36, y: -.08, kind: "gunship", label: "EAST WALL GUN", hp: 82, score: 2350 },
  { index: 2, progress: .285, x: .02, y: .3, kind: "bomber", label: "GATE GENERATOR", hp: 104, score: 3200 },
];
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_PROGRESS = .365;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_X = 0;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y = -.02;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X = .72;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y = .78;
export const SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE = 5200;
''', 'phase3 authored definitions')

world = replace_once(world,
'''export function skyDancerArcadeV40FleetTargetAnchorDistance(
  target: SkyDancerArcadeV40FleetTargetDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * target.progress;
}
''',
'''export function skyDancerArcadeV40FleetTargetAnchorDistance(
  target: SkyDancerArcadeV40FleetTargetDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * target.progress;
}

export function skyDancerArcadeV40StormLaneAnchorDistance(
  lane: SkyDancerArcadeV40StormLaneDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * lane.progress;
}

export function skyDancerArcadeV40StormLaneX(lane: SkyDancerArcadeV40StormLaneDefinition, stageTimeSeconds: number): number {
  return lane.safeX + Math.sin(Math.max(0, stageTimeSeconds) * 2.35 + lane.phase) * lane.amplitude;
}

export function skyDancerArcadeV40FortressBreachAnchorDistance(stageDurationSeconds: number, courseSpeed: number): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * SKY_DANCER_ARCADE_V40_DESERT_BREACH_PROGRESS;
}
''', 'phase3 helper functions')


# -----------------------------------------------------------------------------
# Runtime state, simulation, snapshot and deterministic hooks.
# -----------------------------------------------------------------------------
runtime = replace_once(runtime,
'''  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,
  SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
  skyDancerArcadeV40DawnCityGateAnchorDistance,
  skyDancerArcadeV40FleetTargetAnchorDistance,
  skyDancerArcadeV40RouteDoctrine,''',
'''  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,
  SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_X,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y,
  SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
  SKY_DANCER_ARCADE_V40_STORM_LANES,
  skyDancerArcadeV40DawnCityGateAnchorDistance,
  skyDancerArcadeV40FleetTargetAnchorDistance,
  skyDancerArcadeV40FortressBreachAnchorDistance,
  skyDancerArcadeV40StormLaneAnchorDistance,
  skyDancerArcadeV40StormLaneX,
  skyDancerArcadeV40RouteDoctrine,''', 'phase3 runtime imports')

runtime = replace_once(runtime,
'''  worldBreakTargetCurrentLabel: string | null;
  worldBreakTargetCurrentHp: number;
  worldBreakTargetCurrentMaxHp: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  worldBreakTargetCurrentLabel: string | null;
  worldBreakTargetCurrentHp: number;
  worldBreakTargetCurrentMaxHp: number;
  worldBreakStormActive: boolean;
  worldBreakStormSafeX: number;
  worldBreakStormWidth: number;
  worldBreakStormDepth: number;
  worldBreakStormIndex: number;
  worldBreakStormHits: number;
  worldBreakStormMisses: number;
  worldBreakStormSerial: number;
  worldBreakStormTotal: number;
  worldBreakFortressBreachActive: boolean;
  worldBreakFortressBreachOpen: boolean;
  worldBreakFortressBreachResolved: boolean;
  worldBreakFortressBreachSuccess: boolean;
  worldBreakFortressBreachDepth: number;
  worldBreakFortressBreachX: number;
  worldBreakFortressBreachY: number;
  worldBreakFortressBreachRadiusX: number;
  worldBreakFortressBreachRadiusY: number;
  worldBreakFortressSerial: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''', 'phase3 snapshot interface')

runtime = replace_once(runtime,
'''  private worldBreakTargetHits = 0;
  private worldBreakTargetMisses = 0;
  private worldBreakTargetSerial = 0;
  private readonly worldBreakResolvedTargetIndices = new Set<number>();
  private nextEntityId = 1;''',
'''  private worldBreakTargetHits = 0;
  private worldBreakTargetMisses = 0;
  private worldBreakTargetSerial = 0;
  private readonly worldBreakResolvedTargetIndices = new Set<number>();
  private worldBreakStormHits = 0;
  private worldBreakStormMisses = 0;
  private worldBreakStormSerial = 0;
  private readonly worldBreakResolvedStormLaneIndices = new Set<number>();
  private worldBreakFortressBreachOpen = false;
  private worldBreakFortressBreachResolved = false;
  private worldBreakFortressBreachSuccess = false;
  private worldBreakFortressSerial = 0;
  private nextEntityId = 1;''', 'phase3 runtime fields')

runtime = replace_once(runtime,
'''      this.worldBreakTargetHits = 0;
      this.worldBreakTargetMisses = 0;
      this.worldBreakResolvedTargetIndices.clear();
    }
    this.worldBreakGates = this.stage.id === "dawn-city"''',
'''      this.worldBreakTargetHits = 0;
      this.worldBreakTargetMisses = 0;
      this.worldBreakResolvedTargetIndices.clear();
      this.worldBreakStormHits = 0;
      this.worldBreakStormMisses = 0;
      this.worldBreakResolvedStormLaneIndices.clear();
      this.worldBreakFortressBreachOpen = false;
      this.worldBreakFortressBreachResolved = false;
      this.worldBreakFortressBreachSuccess = false;
    }
    this.worldBreakGates = this.stage.id === "dawn-city"''', 'phase3 reset objective state')

runtime = replace_once(runtime,
'''    this.stageBestChain = 0;
    if (this.stage.id === "cloud-fleet") this.spawnV40CloudFleetTargets(rewindTime);
    if (this.stageEntryTimer <= 0 && this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();''',
'''    this.stageBestChain = 0;
    if (this.stage.id === "cloud-fleet") this.spawnV40CloudFleetTargets(rewindTime);
    if (this.stage.id === "desert-fortress") this.spawnV40DesertFortressTargets(rewindTime);
    if (this.stageEntryTimer <= 0 && this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();''', 'phase3 stage target spawn')

runtime = replace_once(runtime,
'''    this.updatePlayer(delta, turboActive);
    this.updateWorldBreakGates();
    this.updateWorldBreakKnifeRun(delta);
    this.updateBranch();''',
'''    this.updatePlayer(delta, turboActive);
    this.updateWorldBreakGates();
    this.updateWorldBreakKnifeRun(delta);
    this.updateWorldBreakStormGrid();
    this.updateWorldBreakFortressBreach();
    this.updateBranch();''', 'phase3 runtime step')

runtime = replace_once(runtime,
'''  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {
    if (!enemy.worldBreakTarget || enemy.worldBreakResolved || enemy.worldBreakTargetIndex === undefined) return;
    enemy.worldBreakResolved = true;
    this.worldBreakResolvedTargetIndices.add(enemy.worldBreakTargetIndex);
    this.worldBreakTargetSerial += 1;
    if (destroyed) {
      this.worldBreakTargetHits += 1;
      const awarded = this.addScore(enemy.worldBreakScoreBonus ?? 1400, true);
      this.turbo = Math.min(100, this.turbo + 8);
      this.message = `DECK STRIKE · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} DOWN · +${awarded}`;
      this.messageTimer = 1.2;
    } else {
      this.worldBreakTargetMisses += 1;
      this.message = `DECK STRIKE · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} ESCAPED`;
      this.messageTimer = .9;
    }
  }
''',
'''  private updateWorldBreakStormGrid(): void {
    if (this.stage.id !== "storm-carrier") return;
    for (const lane of SKY_DANCER_ARCADE_V40_STORM_LANES) {
      if (this.worldBreakResolvedStormLaneIndices.has(lane.index)) continue;
      const anchorDistance = skyDancerArcadeV40StormLaneAnchorDistance(lane, this.stage.durationSeconds, this.stage.courseSpeed);
      const depth = anchorDistance - this.distance;
      if (depth > 2.4) continue;
      const safeX = skyDancerArcadeV40StormLaneX(lane, this.stageTime);
      const clean = Math.abs(this.playerX - safeX) <= lane.width;
      this.worldBreakResolvedStormLaneIndices.add(lane.index);
      this.worldBreakStormSerial += 1;
      if (clean) {
        this.worldBreakStormHits += 1;
        const awarded = this.addScore(lane.score + this.worldBreakStormHits * 180, true);
        this.turbo = Math.min(100, this.turbo + 7);
        this.message = `LIGHTNING GRID · SAFE LANE ${lane.index + 1} · +${awarded}`;
        this.messageTimer = 1.05;
      } else {
        this.worldBreakStormMisses += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 16 : 12);
        this.message = `LIGHTNING GRID · STRIKE ${lane.index + 1} · MOVE TO LANE`;
        this.messageTimer = 1.05;
      }
    }
  }

  private updateWorldBreakFortressBreach(): void {
    if (this.stage.id !== "desert-fortress" || this.worldBreakFortressBreachResolved) return;
    const anchorDistance = skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    const depth = anchorDistance - this.distance;
    if (depth > 2.4) return;
    const dx = (this.playerX - SKY_DANCER_ARCADE_V40_DESERT_BREACH_X) / SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X;
    const dy = (this.playerY - SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y) / SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y;
    const inside = Math.hypot(dx, dy) <= 1;
    this.worldBreakFortressBreachResolved = true;
    this.worldBreakFortressBreachSuccess = this.worldBreakFortressBreachOpen && inside;
    this.worldBreakFortressSerial += 1;
    if (this.worldBreakFortressBreachSuccess) {
      const awarded = this.addScore(SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE, true);
      this.turbo = Math.min(100, this.turbo + 22);
      this.message = `WORLD BREAK · FORTRESS BREACHED · +${awarded}`;
      this.messageTimer = 1.55;
      return;
    }
    this.takeDamage(this.worldBreakFortressBreachOpen ? 15 : 24);
    this.message = this.worldBreakFortressBreachOpen
      ? "FORTRESS GATE · BREACH MISSED"
      : "FORTRESS GATE · BREACH DENIED · BATTERIES ACTIVE";
    this.messageTimer = 1.35;
  }

  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {
    if (!enemy.worldBreakTarget || enemy.worldBreakResolved || enemy.worldBreakTargetIndex === undefined) return;
    enemy.worldBreakResolved = true;
    this.worldBreakResolvedTargetIndices.add(enemy.worldBreakTargetIndex);
    this.worldBreakTargetSerial += 1;
    const fortress = this.stage.id === "desert-fortress";
    const prefix = fortress ? "FORTRESS BATTERY" : "DECK STRIKE";
    if (destroyed) {
      this.worldBreakTargetHits += 1;
      const awarded = this.addScore(enemy.worldBreakScoreBonus ?? 1400, true);
      this.turbo = Math.min(100, this.turbo + (fortress ? 10 : 8));
      const fortressComplete = fortress && this.worldBreakTargetHits >= SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length;
      if (fortressComplete && !this.worldBreakFortressBreachOpen) {
        this.worldBreakFortressBreachOpen = true;
        this.worldBreakFortressSerial += 1;
        this.turbo = Math.min(100, this.turbo + 10);
        this.message = `FORTRESS BATTERIES DOWN · BREACH OPEN · +${awarded}`;
        this.messageTimer = 1.5;
      } else {
        this.message = `${prefix} · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} DOWN · +${awarded}`;
        this.messageTimer = 1.2;
      }
    } else {
      this.worldBreakTargetMisses += 1;
      this.message = `${prefix} · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} ESCAPED`;
      this.messageTimer = .9;
    }
  }
''', 'phase3 storm/breach simulation and target generalization')

runtime = replace_once(runtime,
'''  private spawnV40CloudFleetTargets(rewindTime: number): void {''',
'''  private spawnV40DesertFortressTargets(rewindTime: number): void {
    for (const target of SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS) {
      if (this.worldBreakResolvedTargetIndices.has(target.index)) continue;
      const anchorDistance = skyDancerArcadeV40FleetTargetAnchorDistance(target, this.stage.durationSeconds, this.stage.courseSpeed);
      if (rewindTime > 0 && anchorDistance <= this.distance + 3) {
        this.worldBreakResolvedTargetIndices.add(target.index);
        this.worldBreakTargetMisses += 1;
        continue;
      }
      this.spawnEnemy(target.kind, target.x, target.y, anchorDistance - this.distance, "parallel", target.x < 0 ? -1 : 1);
      const enemy = this.enemies.at(-1);
      if (!enemy) continue;
      enemy.hp = target.hp * (this.options.difficulty === "hard" ? 1.15 : 1);
      enemy.maxHp = enemy.hp;
      enemy.armor = 0;
      enemy.maxArmor = 0;
      enemy.scoreValue = Math.round(target.score * .42);
      enemy.speed = 0;
      enemy.fireCooldown = 999;
      enemy.amplitude = 0;
      enemy.worldBreakTarget = true;
      enemy.worldBreakTargetIndex = target.index;
      enemy.worldBreakLabel = target.label;
      enemy.worldBreakAnchorDistance = anchorDistance;
      enemy.worldBreakScoreBonus = target.score;
      enemy.worldBreakResolved = false;
      enemy.counterplayCooldown = 999;
    }
  }

  private spawnV40CloudFleetTargets(rewindTime: number): void {''', 'phase3 fortress targets spawn')

runtime = replace_once(runtime,
'''    const activeCounterplays = this.enemies.filter((enemy) => enemy.alive && enemy.counterplay !== "none");
    const stageScore = this.score - this.stageStats.scoreAtStart;
    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));''',
'''    const activeCounterplays = this.enemies.filter((enemy) => enemy.alive && enemy.counterplay !== "none");
    const stageScore = this.score - this.stageStats.scoreAtStart;
    const stormLane = this.stage.id === "storm-carrier"
      ? SKY_DANCER_ARCADE_V40_STORM_LANES.find((lane) => !this.worldBreakResolvedStormLaneIndices.has(lane.index)) ?? null
      : null;
    const stormLaneDepth = stormLane
      ? skyDancerArcadeV40StormLaneAnchorDistance(stormLane, this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const stormLaneSafeX = stormLane ? skyDancerArcadeV40StormLaneX(stormLane, this.stageTime) : 0;
    const fortressBreachDepth = this.stage.id === "desert-fortress"
      ? skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));''', 'phase3 snapshot locals')

runtime = replace_once(runtime,
'''      worldBreakTargetHits: this.worldBreakTargetHits,
      worldBreakTargetMisses: this.worldBreakTargetMisses,
      worldBreakTargetSerial: this.worldBreakTargetSerial,
      worldBreakTargetTotal: this.stage.id === "cloud-fleet" ? SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS.length : 0,
      worldBreakTargetCurrentLabel: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.worldBreakLabel ?? null,
      worldBreakTargetCurrentHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.hp ?? 0,
      worldBreakTargetCurrentMaxHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.maxHp ?? 1,
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''',
'''      worldBreakTargetHits: this.worldBreakTargetHits,
      worldBreakTargetMisses: this.worldBreakTargetMisses,
      worldBreakTargetSerial: this.worldBreakTargetSerial,
      worldBreakTargetTotal: this.stage.id === "cloud-fleet"
        ? SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS.length
        : this.stage.id === "desert-fortress"
          ? SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length
          : 0,
      worldBreakTargetCurrentLabel: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.worldBreakLabel ?? null,
      worldBreakTargetCurrentHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.hp ?? 0,
      worldBreakTargetCurrentMaxHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.maxHp ?? 1,
      worldBreakStormActive: Boolean(stormLane && stormLaneDepth > -8 && stormLaneDepth < 132),
      worldBreakStormSafeX: stormLaneSafeX,
      worldBreakStormWidth: stormLane?.width ?? 0,
      worldBreakStormDepth: stormLaneDepth,
      worldBreakStormIndex: stormLane?.index ?? -1,
      worldBreakStormHits: this.worldBreakStormHits,
      worldBreakStormMisses: this.worldBreakStormMisses,
      worldBreakStormSerial: this.worldBreakStormSerial,
      worldBreakStormTotal: this.stage.id === "storm-carrier" ? SKY_DANCER_ARCADE_V40_STORM_LANES.length : 0,
      worldBreakFortressBreachActive: this.stage.id === "desert-fortress" && fortressBreachDepth > -14 && fortressBreachDepth < 145,
      worldBreakFortressBreachOpen: this.worldBreakFortressBreachOpen,
      worldBreakFortressBreachResolved: this.worldBreakFortressBreachResolved,
      worldBreakFortressBreachSuccess: this.worldBreakFortressBreachSuccess,
      worldBreakFortressBreachDepth: fortressBreachDepth,
      worldBreakFortressBreachX: SKY_DANCER_ARCADE_V40_DESERT_BREACH_X,
      worldBreakFortressBreachY: SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y,
      worldBreakFortressBreachRadiusX: SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X,
      worldBreakFortressBreachRadiusY: SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y,
      worldBreakFortressSerial: this.worldBreakFortressSerial,
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''', 'phase3 snapshot payload')

runtime = replace_once(runtime,
'''  missV40FleetTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (!enemy || enemy.worldBreakAnchorDistance === undefined) return;
    this.distance = enemy.worldBreakAnchorDistance + 5;
    this.updateEnemies(1 / 60, false);
  }
''',
'''  missV40FleetTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (!enemy || enemy.worldBreakAnchorDistance === undefined) return;
    this.distance = enemy.worldBreakAnchorDistance + 5;
    this.updateEnemies(1 / 60, false);
  }

  triggerV40StormLaneForTests(index: number, clean: boolean): void {
    const lane = SKY_DANCER_ARCADE_V40_STORM_LANES.find((candidate) => candidate.index === index);
    if (!lane) return;
    const anchorDistance = skyDancerArcadeV40StormLaneAnchorDistance(lane, this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    const safeX = skyDancerArcadeV40StormLaneX(lane, this.stageTime);
    this.playerX = clean
      ? clamp(safeX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT)
      : clamp(safeX + lane.width + 1.05, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.updateWorldBreakStormGrid();
  }

  destroyV40FortressTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (enemy) this.damageEnemy(enemy, enemy.maxHp * 4, false);
  }

  missV40FortressTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (!enemy || enemy.worldBreakAnchorDistance === undefined) return;
    this.distance = enemy.worldBreakAnchorDistance + 5;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.updateEnemies(1 / 60, false);
  }

  triggerV40FortressBreachForTests(clean: boolean): void {
    const anchorDistance = skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.playerX = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_X : PLAYER_X_LIMIT;
    this.playerY = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y : PLAYER_Y_LIMIT;
    this.updateWorldBreakFortressBreach();
  }
''', 'phase3 deterministic hooks')


# -----------------------------------------------------------------------------
# WebGL: moving storm corridor + physical fortress gate, plus stage-reset root fix.
# -----------------------------------------------------------------------------
webgl = replace_once(webgl,
'''  private readonly branchRoot = new THREE.Group();
  private readonly worldBreakRoot = new THREE.Group();
  private readonly worldBreakKnifeRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''',
'''  private readonly branchRoot = new THREE.Group();
  private readonly worldBreakRoot = new THREE.Group();
  private readonly worldBreakKnifeRoot = new THREE.Group();
  private readonly worldBreakStormRoot = new THREE.Group();
  private readonly worldBreakFortressRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();''', 'phase3 webgl roots')

webgl = replace_once(webgl,
'''    this.worldBreakRoot.name = "arcade-world-break-gates";
    this.worldBreakKnifeRoot.name = "arcade-world-break-knife-run";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot);
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);''',
'''    this.worldBreakRoot.name = "arcade-world-break-gates";
    this.worldBreakKnifeRoot.name = "arcade-world-break-knife-run";
    this.worldBreakStormRoot.name = "arcade-world-break-lightning-grid";
    this.worldBreakFortressRoot.name = "arcade-world-break-fortress-gate";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot);
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);''', 'phase3 webgl root wiring')

webgl = replace_once(webgl,
'''    this.syncHazards(snapshot, delta);
    this.syncWorldBreakGates(snapshot, delta);
    this.syncWorldBreakKnifeRun(snapshot);
    this.syncBranchGates(snapshot, delta);''',
'''    this.syncHazards(snapshot, delta);
    this.syncWorldBreakGates(snapshot, delta);
    this.syncWorldBreakKnifeRun(snapshot);
    this.syncWorldBreakStormLane(snapshot);
    this.syncWorldBreakFortressBreach(snapshot);
    this.syncBranchGates(snapshot, delta);''', 'phase3 webgl sync')

webgl = replace_once(webgl,
'''    for (const group of this.hazardGroups.values()) this.disposeObject(group);
    for (const group of this.worldBreakGateGroups.values()) this.disposeObject(group);
    this.entityRoot.clear();
    this.projectileRoot.clear();
    this.hazardRoot.clear();
    this.worldBreakRoot.clear();
    this.enemyGroups.clear();
    this.projectileMeshes.clear();
    this.hazardGroups.clear();
    this.worldBreakGateGroups.clear();
  }''',
'''    for (const group of this.hazardGroups.values()) this.disposeObject(group);
    for (const group of this.worldBreakGateGroups.values()) this.disposeObject(group);
    for (const child of this.worldBreakKnifeRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakStormRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakFortressRoot.children) this.disposeObject(child);
    this.entityRoot.clear();
    this.projectileRoot.clear();
    this.hazardRoot.clear();
    this.worldBreakKnifeRoot.clear();
    this.worldBreakStormRoot.clear();
    this.worldBreakFortressRoot.clear();
    this.worldBreakRoot.clear();
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot);
    this.enemyGroups.clear();
    this.projectileMeshes.clear();
    this.hazardGroups.clear();
    this.worldBreakGateGroups.clear();
  }''', 'phase3 preserve world break roots on stage change')

webgl = replace_once(webgl,
'''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''',
'''  private syncWorldBreakStormLane(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "storm-carrier"
      && snapshot.worldBreakStormActive
      && snapshot.worldBreakStormIndex >= 0;
    this.worldBreakStormRoot.visible = active;
    if (!active) return;
    if (this.worldBreakStormRoot.children.length === 0) {
      for (const side of [-1, 1]) {
        const barrier = new THREE.Group();
        barrier.name = side < 0 ? "arcade-world-break-storm-left" : "arcade-world-break-storm-right";
        const material = new THREE.MeshBasicMaterial({
          color: 0x8df3ff, transparent: true, opacity: .68, depthWrite: false,
          blending: THREE.AdditiveBlending, toneMapped: false,
        });
        for (let rod = 0; rod < 7; rod += 1) {
          const spark = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.55, .22), material.clone());
          spark.position.y = (rod - 3) * 1.72;
          spark.rotation.z = (rod % 2 === 0 ? 1 : -1) * .08;
          barrier.add(spark);
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(.24, 11.8, .32), material.clone());
        rail.material.opacity = .28;
        barrier.add(rail);
        this.worldBreakStormRoot.add(barrier);
      }
      const floorGuide = new THREE.Mesh(
        new THREE.BoxGeometry(1, .08, 1.25),
        new THREE.MeshBasicMaterial({ color: 0xffe46b, transparent: true, opacity: .55, depthWrite: false, toneMapped: false }),
      );
      floorGuide.name = "arcade-world-break-storm-guide";
      floorGuide.position.y = -5.7;
      this.worldBreakStormRoot.add(floorGuide);
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakStormDepth);
    this.worldBreakStormRoot.position.set(snapshot.worldBreakStormSafeX * 8.4 + course.x, 1.2 + course.y, course.z);
    this.worldBreakStormRoot.rotation.set(course.pitch, course.yaw, course.bank);
    const corridorHalfWidth = Math.max(3.8, snapshot.worldBreakStormWidth * 8.4);
    const left = this.worldBreakStormRoot.getObjectByName("arcade-world-break-storm-left");
    const right = this.worldBreakStormRoot.getObjectByName("arcade-world-break-storm-right");
    if (left) left.position.x = -corridorHalfWidth;
    if (right) right.position.x = corridorHalfWidth;
    const guide = this.worldBreakStormRoot.getObjectByName("arcade-world-break-storm-guide");
    if (guide) guide.scale.x = corridorHalfWidth * 1.7;
    const pulse = .54 + Math.sin(snapshot.runTimeSeconds * 18 + snapshot.worldBreakStormIndex) * .18;
    this.worldBreakStormRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      if (object.name === "arcade-world-break-storm-guide") object.material.opacity = .42 + pulse * .16;
      else object.material.opacity = Math.max(.2, Math.min(.88, pulse));
    });
  }

  private syncWorldBreakFortressBreach(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "desert-fortress" && snapshot.worldBreakFortressBreachActive;
    this.worldBreakFortressRoot.visible = active;
    if (!active) return;
    if (this.worldBreakFortressRoot.children.length === 0) {
      const stone = new THREE.MeshStandardMaterial({ color: 0x8d6940, roughness: .8, metalness: .08 });
      const glow = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .78, depthWrite: false, toneMapped: false });
      const shutterMaterial = new THREE.MeshBasicMaterial({ color: 0x4d3421, transparent: true, opacity: .88, depthWrite: true });
      const left = new THREE.Mesh(new THREE.BoxGeometry(12, 19, 3.2), stone.clone());
      const right = new THREE.Mesh(new THREE.BoxGeometry(12, 19, 3.2), stone.clone());
      const top = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 3.2), stone.clone());
      left.position.set(-11.5, 0, 0); right.position.set(11.5, 0, 0); top.position.set(0, 7.7, 0);
      this.worldBreakFortressRoot.add(left, right, top);
      for (const [x, y, sx, sy] of [[-6.2, 0, .22, 10], [6.2, 0, .22, 10], [0, 5.1, 12.6, .22], [0, -5.1, 12.6, .22]] as const) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, .4), glow.clone());
        edge.position.set(x, y, -1.9);
        edge.name = "arcade-world-break-fortress-edge";
        this.worldBreakFortressRoot.add(edge);
      }
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(11.8, 9.6, 2.2), shutterMaterial);
      shutter.name = "arcade-world-break-fortress-shutter";
      this.worldBreakFortressRoot.add(shutter);
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakFortressBreachDepth);
    this.worldBreakFortressRoot.position.set(
      snapshot.worldBreakFortressBreachX * 8.4 + course.x,
      1.2 + snapshot.worldBreakFortressBreachY * 4.9 + course.y,
      course.z,
    );
    this.worldBreakFortressRoot.rotation.set(course.pitch, course.yaw, course.bank);
    const shutter = this.worldBreakFortressRoot.getObjectByName("arcade-world-break-fortress-shutter");
    if (shutter instanceof THREE.Mesh && shutter.material instanceof THREE.MeshBasicMaterial) {
      shutter.visible = !snapshot.worldBreakFortressBreachOpen;
      shutter.material.opacity = snapshot.worldBreakFortressBreachResolved ? .25 : .88;
    }
    const edgeColor = snapshot.worldBreakFortressBreachOpen ? 0x75ffab : 0xffcf72;
    const edgeOpacity = snapshot.worldBreakFortressBreachResolved ? .34 : .72 + Math.sin(snapshot.runTimeSeconds * 12) * .12;
    for (const edge of this.worldBreakFortressRoot.getObjectsByProperty("name", "arcade-world-break-fortress-edge")) {
      if (!(edge instanceof THREE.Mesh) || !(edge.material instanceof THREE.MeshBasicMaterial)) continue;
      edge.material.color.setHex(edgeColor);
      edge.material.opacity = edgeOpacity;
    }
  }

  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''', 'phase3 webgl objective geometry')

webgl = replace_once(webgl,
'''    if (snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial) {''',
'''    if (snapshot.worldBreakStormSerial !== this.previousSnapshot.worldBreakStormSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .22);
      this.cameraShake = Math.min(.62, this.cameraShake + .18);
      this.audio.tone(snapshot.worldBreakStormMisses > this.previousSnapshot.worldBreakStormMisses ? 72 : 420, .16, .022, "square");
    }
    if (snapshot.worldBreakFortressSerial !== this.previousSnapshot.worldBreakFortressSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .34);
      this.cameraShake = Math.min(.72, this.cameraShake + .22);
      this.audio.tone(snapshot.worldBreakFortressBreachOpen ? 260 : 92, .22, .028, "sawtooth");
    }
    if (snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial) {''', 'phase3 webgl impact feedback')


# -----------------------------------------------------------------------------
# Canvas fallback mirrors the two new objective silhouettes.
# -----------------------------------------------------------------------------
canvas = replace_once(canvas,
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakKnifeRun(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''',
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakKnifeRun(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakStormLane(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakFortressBreach(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''', 'phase3 canvas draw order')

canvas = replace_once(canvas,
'''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''',
'''  private drawWorldBreakStormLane(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakStormActive || snapshot.worldBreakStormIndex < 0) return;
    const center = this.project(snapshot.worldBreakStormSafeX, 0, snapshot.worldBreakStormDepth, width, height);
    const half = Math.max(18, center.scale * snapshot.worldBreakStormWidth * 38);
    context.save();
    context.strokeStyle = "rgba(141,243,255,.88)";
    context.lineWidth = Math.max(2, center.scale * 2.5);
    context.setLineDash([8, 6]);
    for (const x of [center.x - half, center.x + half]) {
      context.beginPath();
      context.moveTo(x, center.y - Math.max(42, center.scale * 48));
      context.lineTo(x, center.y + Math.max(42, center.scale * 48));
      context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = "#ffe46b";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`LIGHTNING SAFE LANE ${snapshot.worldBreakStormIndex + 1}/${snapshot.worldBreakStormTotal}`, center.x, center.y - Math.max(48, center.scale * 55));
    context.restore();
  }

  private drawWorldBreakFortressBreach(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.worldBreakFortressBreachActive) return;
    const center = this.project(snapshot.worldBreakFortressBreachX, snapshot.worldBreakFortressBreachY, snapshot.worldBreakFortressBreachDepth, width, height);
    const gapX = Math.max(24, center.scale * snapshot.worldBreakFortressBreachRadiusX * 42);
    const gapY = Math.max(20, center.scale * snapshot.worldBreakFortressBreachRadiusY * 34);
    context.save();
    context.strokeStyle = snapshot.worldBreakFortressBreachOpen ? "#75ffab" : "#ffe08a";
    context.lineWidth = Math.max(2.5, center.scale * 3.2);
    context.strokeRect(center.x - gapX, center.y - gapY, gapX * 2, gapY * 2);
    if (!snapshot.worldBreakFortressBreachOpen) {
      context.fillStyle = "rgba(77,52,33,.72)";
      context.fillRect(center.x - gapX + 2, center.y - gapY + 2, gapX * 2 - 4, gapY * 2 - 4);
    }
    context.fillStyle = snapshot.worldBreakFortressBreachOpen ? "#75ffab" : "#ffe08a";
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(snapshot.worldBreakFortressBreachOpen ? "BREACH OPEN" : "DESTROY WALL BATTERIES", center.x, center.y - gapY - 8);
    context.restore();
  }

  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''', 'phase3 canvas objective methods')


# -----------------------------------------------------------------------------
# React HUD: readable mission telemetry without adding new touch controls.
# -----------------------------------------------------------------------------
mode = replace_once(mode,
'''              {snapshot.worldBreakGateTotal > 0 ? ` · GATE ${snapshot.worldBreakGateHits + snapshot.worldBreakGateMisses}/${snapshot.worldBreakGateTotal} · STREAK ${snapshot.worldBreakGateStreak}` : ""}
              {snapshot.stage.id === "red-canyon" ? ` · LOW ${snapshot.worldBreakKnifeSeconds.toFixed(1)}/${snapshot.worldBreakKnifeTargetSeconds.toFixed(1)}s${snapshot.worldBreakKnifeActive ? snapshot.worldBreakKnifeAltitudeOk ? " · HOLD" : " · DESCEND" : snapshot.worldBreakKnifeComplete ? " · CLEAR" : ""}` : ""}
              {snapshot.worldBreakTargetTotal > 0 ? ` · DECK ${snapshot.worldBreakTargetHits + snapshot.worldBreakTargetMisses}/${snapshot.worldBreakTargetTotal}${snapshot.worldBreakTargetCurrentLabel ? ` · ${snapshot.worldBreakTargetCurrentLabel} ${Math.round(snapshot.worldBreakTargetCurrentHp / Math.max(1, snapshot.worldBreakTargetCurrentMaxHp) * 100)}%` : ""}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''',
'''              {snapshot.worldBreakGateTotal > 0 ? ` · GATE ${snapshot.worldBreakGateHits + snapshot.worldBreakGateMisses}/${snapshot.worldBreakGateTotal} · STREAK ${snapshot.worldBreakGateStreak}` : ""}
              {snapshot.stage.id === "red-canyon" ? ` · LOW ${snapshot.worldBreakKnifeSeconds.toFixed(1)}/${snapshot.worldBreakKnifeTargetSeconds.toFixed(1)}s${snapshot.worldBreakKnifeActive ? snapshot.worldBreakKnifeAltitudeOk ? " · HOLD" : " · DESCEND" : snapshot.worldBreakKnifeComplete ? " · CLEAR" : ""}` : ""}
              {snapshot.stage.id === "storm-carrier" ? ` · GRID ${snapshot.worldBreakStormHits + snapshot.worldBreakStormMisses}/${snapshot.worldBreakStormTotal}${snapshot.worldBreakStormIndex >= 0 ? ` · LANE ${snapshot.worldBreakStormIndex + 1}` : ""}` : ""}
              {snapshot.worldBreakTargetTotal > 0 ? ` · ${snapshot.stage.id === "desert-fortress" ? "BATTERY" : "DECK"} ${snapshot.worldBreakTargetHits + snapshot.worldBreakTargetMisses}/${snapshot.worldBreakTargetTotal}${snapshot.worldBreakTargetCurrentLabel ? ` · ${snapshot.worldBreakTargetCurrentLabel} ${Math.round(snapshot.worldBreakTargetCurrentHp / Math.max(1, snapshot.worldBreakTargetCurrentMaxHp) * 100)}%` : ""}` : ""}
              {snapshot.stage.id === "desert-fortress" ? ` · BREACH ${snapshot.worldBreakFortressBreachResolved ? snapshot.worldBreakFortressBreachSuccess ? "CLEAR" : "FAILED" : snapshot.worldBreakFortressBreachOpen ? "OPEN" : "LOCKED"}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ? ` · ${snapshot.worldBreakRouteDoctrine} ×${snapshot.worldBreakScoreMultiplier.toFixed(2)}` : ""}''', 'phase3 HUD telemetry')

if 'Arcade Run V40 WORLD BREAK phase 3' not in css:
    css += '\n\n/* Arcade Run V40 WORLD BREAK phase 3: storm-grid and fortress-breach telemetry. */\n.worldBreakLine{max-width:min(660px,82vw)}\n'


# -----------------------------------------------------------------------------
# Persistent tests: advance live-stage expectation and add Phase 3 regression.
# -----------------------------------------------------------------------------
foundation_test = replace_once(foundation_test,
'''  assert.equal(skyDancerArcadeV40WorldProfile("cloud-fleet").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 3);''',
'''  assert.equal(skyDancerArcadeV40WorldProfile("cloud-fleet").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("storm-carrier").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 5);''', 'phase3 foundation live count')

phase3_test = '''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS,
  SKY_DANCER_ARCADE_V40_STORM_LANES,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 3 activates Storm Carrier and Desert Fortress as distinct World Break stages", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("storm-carrier").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("storm-carrier").signature, "LIGHTNING GRID");
  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("desert-fortress").signature, "FORTRESS GATE");
});

test("V40 Storm Carrier resolves a moving safe lane and punishes the lightning side", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "storm-carrier", seed: 4045 });
  let snapshot = runtime.getSnapshot();
  const beforeScore = snapshot.score;
  const beforeHp = snapshot.playerHp;
  assert.equal(snapshot.worldBreakStormTotal, SKY_DANCER_ARCADE_V40_STORM_LANES.length);
  runtime.triggerV40StormLaneForTests(0, true);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakStormHits, 1);
  assert.equal(snapshot.worldBreakStormMisses, 0);
  assert.ok(snapshot.score > beforeScore);
  runtime.triggerV40StormLaneForTests(1, false);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakStormHits, 1);
  assert.equal(snapshot.worldBreakStormMisses, 1);
  assert.ok(snapshot.playerHp < beforeHp);
});

test("V40 Desert Fortress requires all batteries before the physical breach can score", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "desert-fortress", seed: 4046 });
  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakTargetTotal, SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length);
  assert.equal(snapshot.worldBreakFortressBreachOpen, false);
  for (const target of SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS) runtime.destroyV40FortressTargetForTests(target.index);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakTargetHits, SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length);
  assert.equal(snapshot.worldBreakFortressBreachOpen, true);
  const scoreBeforeBreach = snapshot.score;
  runtime.triggerV40FortressBreachForTests(true);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakFortressBreachResolved, true);
  assert.equal(snapshot.worldBreakFortressBreachSuccess, true);
  assert.ok(snapshot.score > scoreBeforeBreach);
});

test("V40 Desert Fortress keeps the wall lethal when a required battery escapes", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "desert-fortress", seed: 4047 });
  runtime.missV40FortressTargetForTests(0);
  for (const target of SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.slice(1)) runtime.destroyV40FortressTargetForTests(target.index);
  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakFortressBreachOpen, false);
  const hp = snapshot.playerHp;
  runtime.triggerV40FortressBreachForTests(true);
  snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakFortressBreachResolved, true);
  assert.equal(snapshot.worldBreakFortressBreachSuccess, false);
  assert.ok(snapshot.playerHp < hp);
});

test("V40 WebGL keeps authored World Break roots attached across stage handoffs", () => {
  const source = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  assert.match(source, /worldBreakRoot\.add\(this\.worldBreakKnifeRoot, this\.worldBreakStormRoot, this\.worldBreakFortressRoot\)/);
  assert.match(source, /syncWorldBreakStormLane\(snapshot\)/);
  assert.match(source, /syncWorldBreakFortressBreach\(snapshot\)/);
});
'''

world_path.write_text(world)
runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
canvas_path.write_text(canvas)
mode_path.write_text(mode)
css_path.write_text(css)
foundation_test_path.write_text(foundation_test)
phase3_test_path.write_text(phase3_test)
print('Applied Arcade Run V40 WORLD BREAK phase 3')
