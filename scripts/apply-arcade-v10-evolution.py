from pathlib import Path

root = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (root / path).read_text()

def write(path: str, text: str) -> None:
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# V10 shared systems: one source of truth for combat roles, boss phases and
# stage-specific gameplay beats.
# ---------------------------------------------------------------------------
write("src/sky/arcade/SkyDancerArcadeV10Systems.ts", '''import type {
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

export function skyDancerArcadeStageEventCheckpoint(progress: number): 0 | 1 | 2 {
  if (progress >= .62) return 2;
  if (progress >= .18) return 1;
  return 0;
}
''')

# ---------------------------------------------------------------------------
# Runtime: Combat 2.0 + Boss Battle 2.0 + Stage Evolution.
# ---------------------------------------------------------------------------
runtime_path = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
runtime = read(runtime_path)
runtime = replace_once(runtime,
'''import type { SkyDancerArcadeRank } from "./SkyDancerArcadeProgress";''',
'''import type { SkyDancerArcadeRank } from "./SkyDancerArcadeProgress";
import {
  skyDancerArcadeArmorRatio,
  skyDancerArcadeBossPhase,
  skyDancerArcadeBossPhaseLabel,
  skyDancerArcadeBossWeakpointOpen,
  skyDancerArcadeEnemyRole,
  skyDancerArcadeStageEventCheckpoint,
  skyDancerArcadeStageEvolutionProfile,
  skyDancerArcadeTargetPriority,
  type SkyDancerArcadeBossPhase,
  type SkyDancerArcadeEnemyRole,
} from "./SkyDancerArcadeV10Systems";''', "runtime v10 imports")

runtime = replace_once(runtime,
'''  maneuver: SkyDancerArcadeEnemyManeuver;
}''',
'''  maneuver: SkyDancerArcadeEnemyManeuver;
  role: SkyDancerArcadeEnemyRole;
  armor: number;
  maxArmor: number;
  bossPhase: SkyDancerArcadeBossPhase;
  weakpointOpen: boolean;
  stagger: number;
}''', "enemy snapshot v10 fields")

runtime = replace_once(runtime,
'''  turboSmashes: number;
  continuesRemaining: number;''',
'''  turboSmashes: number;
  bestChain: number;
  armorBreaks: number;
  formationBreaks: number;
  bossKills: number;
  continuesRemaining: number;''', "snapshot combat counters")

runtime = replace_once(runtime,
'''  bossMaxHp: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  bossMaxHp: number;
  bossPhase: SkyDancerArcadeBossPhase;
  bossWeakpointOpen: boolean;
  bossPhaseSerial: number;
  stageEventSerial: number;
  stageEventLabel: string | null;
  stageEventIntensity: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''', "snapshot cinematic fields")

runtime = replace_once(runtime,
'''  private turboSmashes = 0;
  private continuesRemaining = SKY_DANCER_ARCADE_MAX_CONTINUES;''',
'''  private turboSmashes = 0;
  private bestChain = 0;
  private armorBreaks = 0;
  private formationBreaks = 0;
  private bossKills = 0;
  private continuesRemaining = SKY_DANCER_ARCADE_MAX_CONTINUES;''', "runtime combat counters")

runtime = replace_once(runtime,
'''  private bossSpawned = false;
  private bossDefeated = false;
  private resultTimer = 0;''',
'''  private bossSpawned = false;
  private bossDefeated = false;
  private bossPhaseSerial = 0;
  private stageEventSerial = 0;
  private stageEventCheckpoint: 0 | 1 | 2 = 0;
  private stageEventLabel: string | null = null;
  private stageEventTimer = 0;
  private resultTimer = 0;''', "runtime v10 event state")

runtime = replace_once(runtime,
'''    this.damageCooldown = 0;
    this.branchSelection = null;''',
'''    this.damageCooldown = 0;
    const rewindCheckpoint = skyDancerArcadeStageEventCheckpoint(this.stageTime / this.stage.durationSeconds);
    this.stageEventCheckpoint = rewindTime > 0 ? Math.max(this.stageEventCheckpoint, rewindCheckpoint) as 0 | 1 | 2 : 0;
    this.stageEventLabel = null;
    this.stageEventTimer = 0;
    this.branchSelection = null;''', "reset v10 stage events")

runtime = replace_once(runtime,
'''    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    if (this.messageTimer <= 0) this.message = null;
    this.updatePlayer(delta, turboActive);
    this.updateBranch();
    this.updateDirector();''',
'''    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.stageEventTimer = Math.max(0, this.stageEventTimer - delta);
    if (this.stageEventTimer <= 0) this.stageEventLabel = null;
    if (this.messageTimer <= 0) this.message = null;
    this.updatePlayer(delta, turboActive);
    this.updateBranch();
    this.updateStageEvolution();
    this.updateDirector();''', "stage evolution step")

runtime = replace_once(runtime,
'''  private updateDirector(): void {''',
'''  private updateStageEvolution(): void {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const checkpoint = skyDancerArcadeStageEventCheckpoint(progress);
    if (checkpoint <= this.stageEventCheckpoint) return;
    this.stageEventCheckpoint = checkpoint;
    const profile = skyDancerArcadeStageEvolutionProfile(this.stage.biome);
    const eventIndex = checkpoint - 1;
    const label = profile.labels[eventIndex];
    this.stageEventLabel = label;
    this.stageEventTimer = 1.65;
    this.stageEventSerial += 1;
    this.message = `STAGE EVENT · ${label}`;
    this.messageTimer = 1.45;
    this.addScore(profile.scoreBonus, true);
    this.turbo = Math.min(100, this.turbo + 5 + this.stage.act);
    const bursts = profile.hazardBursts[eventIndex] + (this.options.difficulty === "hard" && checkpoint === 2 ? 1 : 0);
    for (let index = 0; index < bursts && this.hazards.length < 10; index += 1) {
      this.spawnHazardPattern(profile.eventHazards[eventIndex]);
    }
  }

  private updateDirector(): void {''', "insert stage evolution")

runtime = replace_once(runtime,
'''  private spawnEnemy(
    kind: SkyDancerArcadeEnemyKind,
    x: number,
    y: number,
    depth: number,
    maneuver: SkyDancerArcadeEnemyManeuver = "approach",
    maneuverSign = 1,
  ): void {
    const stats = enemyStats(kind, this.options.difficulty === "hard");
    this.enemies.push({''',
'''  private spawnEnemy(
    kind: SkyDancerArcadeEnemyKind,
    x: number,
    y: number,
    depth: number,
    maneuver: SkyDancerArcadeEnemyManeuver = "approach",
    maneuverSign = 1,
  ): void {
    const stats = enemyStats(kind, this.options.difficulty === "hard");
    const maxArmor = Math.round(stats.hp * skyDancerArcadeArmorRatio(kind));
    this.enemies.push({''', "normal enemy armor setup")

runtime = replace_once(runtime,
'''      phase: this.random() * Math.PI * 2,
      maneuver,
      age: 0,''',
'''      phase: this.random() * Math.PI * 2,
      maneuver,
      role: skyDancerArcadeEnemyRole(kind),
      armor: maxArmor,
      maxArmor,
      bossPhase: 1,
      weakpointOpen: false,
      stagger: 0,
      age: 0,''', "normal enemy v10 fields")

runtime = replace_once(runtime,
'''    const hp = Math.round(baseHp * (this.options.difficulty === "hard" ? 1.25 : 1));
    this.enemies.push({''',
'''    const hp = Math.round(baseHp * (this.options.difficulty === "hard" ? 1.25 : 1));
    const maxArmor = Math.round(hp * skyDancerArcadeArmorRatio("boss", true));
    this.enemies.push({''', "boss armor setup")

runtime = replace_once(runtime,
'''      phase: 0,
      maneuver: "approach",
      age: 0,''',
'''      phase: 0,
      maneuver: "approach",
      role: "climax",
      armor: maxArmor,
      maxArmor,
      bossPhase: 1,
      weakpointOpen: false,
      stagger: 0,
      age: 0,''', "boss v10 fields")

runtime = replace_once(runtime,
'''  private spawnHazardPattern(): void {
    const kind = this.stage.hazards[Math.floor(this.random() * this.stage.hazards.length)] ?? "debris";
    const count = kind === "mine" || kind === "debris" ? 5 + Math.floor(this.random() * 3) : 4;''',
'''  private spawnHazardPattern(forcedKind?: SkyDancerArcadeHazardKind): void {
    const kind = forcedKind ?? this.stage.hazards[Math.floor(this.random() * this.stage.hazards.length)] ?? "debris";
    const requestedCount = kind === "mine" || kind === "debris" ? 5 + Math.floor(this.random() * 3) : 4;
    const count = Math.min(requestedCount, Math.max(0, 10 - this.hazards.length));
    if (count <= 0) return;''', "bounded themed hazards")

runtime = replace_once(runtime,
'''      const score = reticleDistance * 20 + enemy.depth * 0.05;''',
'''      const score = reticleDistance * 20 + enemy.depth * 0.05 - skyDancerArcadeTargetPriority(enemy.role);''', "lock threat priority")

runtime = replace_once(runtime,
'''      const score = cone * 28 + enemy.depth * 0.04;''',
'''      const score = cone * 28 + enemy.depth * 0.04 - skyDancerArcadeTargetPriority(enemy.role) * .45;''', "gun threat priority")

runtime = replace_once(runtime,
'''      enemy.age += delta;
      if (enemy.boss) {
        enemy.depth = moveToward(enemy.depth, 33, delta * 18);
        const frequency = this.options.difficulty === "hard" ? 0.82 : 0.68;
        enemy.x = clamp(this.playerX * 0.58 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.82, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
      } else {''',
'''      enemy.age += delta;
      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));
      if (enemy.boss) {
        const nextPhase = skyDancerArcadeBossPhase(enemy.hp, enemy.maxHp);
        if (nextPhase !== enemy.bossPhase) {
          enemy.bossPhase = nextPhase;
          this.bossPhaseSerial += 1;
          this.message = `PHASE ${nextPhase} · ${skyDancerArcadeBossPhaseLabel(nextPhase)}`;
          this.messageTimer = 1.5;
          this.addScore(1000 + nextPhase * 650, true);
          this.turbo = Math.min(100, this.turbo + 9);
          const profile = skyDancerArcadeStageEvolutionProfile(this.stage.biome);
          this.spawnHazardPattern(profile.eventHazards[nextPhase === 2 ? 0 : 1]);
        }
        enemy.weakpointOpen = skyDancerArcadeBossWeakpointOpen(enemy.bossPhase, enemy.age);
        const phaseDepth = enemy.bossPhase === 1 ? 33 : enemy.bossPhase === 2 ? 29 : 25.5;
        const phaseSpeed = enemy.bossPhase === 1 ? 18 : enemy.bossPhase === 2 ? 21 : 24;
        enemy.depth = moveToward(enemy.depth, phaseDepth, delta * phaseSpeed);
        const baseFrequency = this.options.difficulty === "hard" ? 0.82 : 0.68;
        const frequency = baseFrequency * (1 + (enemy.bossPhase - 1) * .24);
        const phaseAmplitude = enemy.amplitude * (1 + (enemy.bossPhase - 1) * .13);
        const staggerSuppression = 1 - enemy.stagger * .16;
        enemy.x = clamp((this.playerX * 0.58 + Math.sin(enemy.age * frequency) * phaseAmplitude) * staggerSuppression, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * (0.92 + enemy.bossPhase * .08) + 1.3) * (0.72 + enemy.bossPhase * .1), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
      } else {''', "three phase boss movement")

runtime = replace_once(runtime,
'''      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {
        // Route selection should stay tense without becoming an unreadable missile wall.
        if (this.branchActive && !enemy.boss) enemy.fireCooldown = .48 + this.random() * .36;
        else this.enemyFire(enemy);
      }''',
'''      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {
        // Stagger turns accurate pressure into a short offensive opening without hard-stopping the simulation.
        if (enemy.stagger > .52) enemy.fireCooldown = .22 + enemy.stagger * .38;
        // Route selection should stay tense without becoming an unreadable missile wall.
        else if (this.branchActive && !enemy.boss) enemy.fireCooldown = .48 + this.random() * .36;
        else this.enemyFire(enemy);
      }''', "stagger delays enemy fire")

runtime = replace_once(runtime,
'''    const desiredSpread = enemy.boss ? (hard ? 4 : 3) : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;''',
'''    const desiredSpread = enemy.boss
      ? Math.min(5, (hard ? 2 : 1) + enemy.bossPhase)
      : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;''', "phase boss spread")

runtime = replace_once(runtime,
'''      const guidance = enemy.boss ? 1.34 : enemy.kind === "missile-boat" ? 1.52 : enemy.kind === "bomber" ? 1.26 : enemy.kind === "ace" ? 1.12 : 0.88;''',
'''      const guidance = enemy.boss ? 1.02 + enemy.bossPhase * .2 : enemy.kind === "missile-boat" ? 1.52 : enemy.kind === "bomber" ? 1.26 : enemy.kind === "ace" ? 1.12 : 0.88;''', "phase boss guidance")

runtime = replace_once(runtime,
'''        speed: enemy.boss ? 17.5 : enemy.kind === "missile-boat" ? 15.5 : enemy.kind === "bomber" ? 14.5 : 13.2,''',
'''        speed: enemy.boss ? 15.8 + enemy.bossPhase * 1.7 : enemy.kind === "missile-boat" ? 15.5 : enemy.kind === "bomber" ? 14.5 : 13.2,''', "phase boss projectile speed")

runtime = replace_once(runtime,
'''    const base = enemy.boss ? 1.38 : enemy.kind === "missile-boat" ? 1.68 : enemy.kind === "bomber" ? 1.9 : enemy.kind === "ace" ? 1.78 : 2.18;''',
'''    const base = enemy.boss ? 1.68 - enemy.bossPhase * .18 : enemy.kind === "missile-boat" ? 1.68 : enemy.kind === "bomber" ? 1.9 : enemy.kind === "ace" ? 1.78 : 2.18;''', "phase boss cooldown")

old_damage = '''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive) return;
    const hpBefore = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.hitSerial += 1;
    const destroyed = enemy.hp <= 0;'''
new_damage = '''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive) return;
    const hpBefore = enemy.hp;
    const armorBefore = enemy.armor;
    let hullDamage = amount;
    if (enemy.armor > 0) {
      const armorDamage = amount * (missile ? 1.35 : .7);
      enemy.armor = Math.max(0, enemy.armor - armorDamage);
      hullDamage *= missile ? .9 : .72;
    }
    if (enemy.boss && enemy.weakpointOpen) hullDamage *= missile ? 1.65 : 1.35;
    enemy.hp = Math.max(0, enemy.hp - hullDamage);
    enemy.stagger = clamp(enemy.stagger + hullDamage / Math.max(1, enemy.maxHp) * (missile ? 5.2 : 3.2), 0, 1);
    if (armorBefore > 0 && enemy.armor <= 0) {
      this.armorBreaks += 1;
      this.addScore(enemy.boss ? 1800 : enemy.kind === "bomber" ? 900 : 650, true);
      this.turbo = Math.min(100, this.turbo + (enemy.boss ? 11 : 6));
      this.message = enemy.boss ? "BOSS ARMOR BREAK · CORE EXPOSED" : "ARMOR BREAK";
      this.messageTimer = 1.05;
    }
    this.hitSerial += 1;
    const destroyed = enemy.hp <= 0;'''
runtime = replace_once(runtime, old_damage, new_damage, "armor and weakpoint damage")

runtime = replace_once(runtime,
'''    this.chain = Math.min(99, this.chain + 1);
    this.chainTimer = 4.6;
    this.addScore(enemy.scoreValue, this.input.turbo);''',
'''    this.chain = Math.min(99, this.chain + 1);
    this.bestChain = Math.max(this.bestChain, this.chain);
    this.chainTimer = 4.6;
    this.addScore(enemy.scoreValue, this.input.turbo);
    if (!enemy.boss && this.chain > 0 && this.chain % 3 === 0) {
      this.formationBreaks += 1;
      this.addScore(850 + this.chain * 75, true);
      this.turbo = Math.min(100, this.turbo + 8);
      this.message = `FORMATION BREAK ×${this.chain}`;
      this.messageTimer = .9;
    }''', "formation break")

runtime = replace_once(runtime,
'''    if (!enemy.boss) return;
    this.bossDefeated = true;''',
'''    if (!enemy.boss) return;
    this.bossKills += 1;
    this.bossDefeated = true;''', "boss kill counter")

runtime = replace_once(runtime,
'''      turboSmashes: this.turboSmashes,
      continuesRemaining: this.continuesRemaining,''',
'''      turboSmashes: this.turboSmashes,
      bestChain: this.bestChain,
      armorBreaks: this.armorBreaks,
      formationBreaks: this.formationBreaks,
      bossKills: this.bossKills,
      continuesRemaining: this.continuesRemaining,''', "snapshot v10 counters output")

runtime = replace_once(runtime,
'''      bossHp: boss?.hp ?? (this.bossDefeated ? 0 : 1),
      bossMaxHp: boss?.maxHp ?? (this.bossDefeated ? 1 : 1),
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''',
'''      bossHp: boss?.hp ?? (this.bossDefeated ? 0 : 1),
      bossMaxHp: boss?.maxHp ?? (this.bossDefeated ? 1 : 1),
      bossPhase: boss?.bossPhase ?? (this.bossDefeated ? 3 : 1),
      bossWeakpointOpen: boss?.weakpointOpen ?? false,
      bossPhaseSerial: this.bossPhaseSerial,
      stageEventSerial: this.stageEventSerial,
      stageEventLabel: this.stageEventLabel,
      stageEventIntensity: this.stageEventTimer > 0 ? clamp(this.stageEventTimer / 1.65, 0, 1) : 0,
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({''', "snapshot v10 cinematic output")

runtime = replace_once(runtime,
'''        phase: enemy.phase,
        maneuver: enemy.maneuver,
      })),''',
'''        phase: enemy.phase,
        maneuver: enemy.maneuver,
        role: enemy.role,
        armor: enemy.armor,
        maxArmor: enemy.maxArmor,
        bossPhase: enemy.bossPhase,
        weakpointOpen: enemy.weakpointOpen,
        stagger: enemy.stagger,
      })),''', "snapshot enemy v10 output")

runtime = replace_once(runtime,
'''  /** Purely deterministic hook used by rule tests; production progression still requires defeating the boss. */''',
'''  /** Deterministic V10 hooks used by rule tests without adding alternate production gameplay paths. */
  triggerStageEvolutionForTests(progress: number): void {
    this.stageTime = this.stage.durationSeconds * clamp(progress, 0, 1);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.updateStageEvolution();
  }

  setBossHpRatioForTests(ratio: number): void {
    if (!this.bossSpawned) this.spawnBoss();
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss);
    if (!boss) return;
    boss.hp = boss.maxHp * clamp(ratio, .01, 1);
    this.updateEnemies(1 / 60, false);
  }

  /** Purely deterministic hook used by rule tests; production progression still requires defeating the boss. */''', "v10 test hooks")

write(runtime_path, runtime)

# ---------------------------------------------------------------------------
# Presentation Director: cinematic gameplay envelopes, but no control lock.
# New signal fields are optional so older callers/tests remain source compatible.
# ---------------------------------------------------------------------------
director_path = "src/sky/arcade/SkyDancerArcadePresentationDirector.ts"
director = read(director_path)
director = replace_once(director,
'''  resultSerial: number;
}''',
'''  resultSerial: number;
  bossPhaseSerial?: number;
  stageEventSerial?: number;
  armorBreaks?: number;
  formationBreaks?: number;
}''', "presentation v10 signals")
director = replace_once(director,
'''  private transition = 0;
  private rush = 0;''',
'''  private transition = 0;
  private rush = 0;
  private bossPhase = 0;
  private stageBeat = 0;
  private armorBreak = 0;
  private formationBreak = 0;''', "director v10 envelopes")
director = replace_once(director,
'''    this.transition = 0;
    this.rush = 0;''',
'''    this.transition = 0;
    this.rush = 0;
    this.bossPhase = 0;
    this.stageBeat = 0;
    this.armorBreak = 0;
    this.formationBreak = 0;''', "director reset v10")
director = replace_once(director,
'''    if (current.resultSerial !== previous.resultSerial) this.transition = Math.max(this.transition, .72);

    const rushTarget = current.turboActive ? 1 : 0;''',
'''    if (current.resultSerial !== previous.resultSerial) this.transition = Math.max(this.transition, .72);
    if ((current.bossPhaseSerial ?? 0) !== (previous.bossPhaseSerial ?? 0)) this.bossPhase = 1;
    if ((current.stageEventSerial ?? 0) !== (previous.stageEventSerial ?? 0)) this.stageBeat = 1;
    if ((current.armorBreaks ?? 0) > (previous.armorBreaks ?? 0)) this.armorBreak = 1;
    if ((current.formationBreaks ?? 0) > (previous.formationBreaks ?? 0)) this.formationBreak = 1;

    const rushTarget = current.turboActive ? 1 : 0;''', "director v10 triggers")
director = replace_once(director,
'''    const transition = this.transition;
    const rush = clamp01(this.rush + turboKick * .24 + nearMiss * .12 + kill * .08);''',
'''    const transition = this.transition;
    const bossPhase = this.bossPhase;
    const stageBeat = this.stageBeat;
    const armorBreak = this.armorBreak;
    const formationBreak = this.formationBreak;
    const rush = clamp01(this.rush + turboKick * .24 + nearMiss * .12 + kill * .08 + stageBeat * .08 + formationBreak * .07);''', "director v10 samples")
director = replace_once(director,
'''      fovKick: turboKick * 5.2 + nearMiss * 2.1 + kill * 1.25 + boss * 1.5,
      cameraShake: nearMiss * .12 + impact * .045 + damage * .22 + kill * .07 + boss * .085,
      pullback: turboKick * .7 + boss * .5 + transition * .35,
      bloomBoost: rush * .09 + impact * .07 + kill * .11 + boss * .08 + transition * .07,
      exposureBoost: turboKick * .04 + impact * .035 + kill * .055 + transition * .045,''',
'''      fovKick: turboKick * 5.2 + nearMiss * 2.1 + kill * 1.25 + boss * 1.5 + bossPhase * 3.4 + stageBeat * 2.7 + armorBreak * 1.6 + formationBreak * 1.9,
      cameraShake: nearMiss * .12 + impact * .045 + damage * .22 + kill * .07 + boss * .085 + bossPhase * .13 + stageBeat * .1 + armorBreak * .08 + formationBreak * .06,
      pullback: turboKick * .7 + boss * .5 + transition * .35 + bossPhase * .82 + stageBeat * .42,
      bloomBoost: rush * .09 + impact * .07 + kill * .11 + boss * .08 + transition * .07 + bossPhase * .11 + stageBeat * .08 + armorBreak * .13 + formationBreak * .08,
      exposureBoost: turboKick * .04 + impact * .035 + kill * .055 + transition * .045 + bossPhase * .05 + stageBeat * .04 + armorBreak * .055,''', "director cinematic v10 output")
director = replace_once(director,
'''    this.transition = decay(this.transition, dt, 2.25);
    return frame;''',
'''    this.transition = decay(this.transition, dt, 2.25);
    this.bossPhase = decay(this.bossPhase, dt, 1.8);
    this.stageBeat = decay(this.stageBeat, dt, 2.3);
    this.armorBreak = decay(this.armorBreak, dt, 4.4);
    this.formationBreak = decay(this.formationBreak, dt, 3.5);
    return frame;''', "director v10 decay")
write(director_path, director)

# ---------------------------------------------------------------------------
# WebGL: make CORE OPEN legible and punctuate gameplay events with existing
# pooled FX/audio instead of cutscenes.
# ---------------------------------------------------------------------------
webgl_path = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
webgl = read(webgl_path)
webgl = replace_once(webgl,
'''        for (const weakPoint of group.getObjectsByProperty("name", "arcade-boss-weakpoint")) {
          weakPoint.scale.setScalar(.86 + Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .12 + (1 - hpRatio) * .1);
          weakPoint.rotation.y += delta * 1.8;
        }''',
'''        for (const weakPoint of group.getObjectsByProperty("name", "arcade-boss-weakpoint")) {
          const openPulse = enemy.weakpointOpen ? .42 : 0;
          weakPoint.scale.setScalar(.86 + Math.sin(snapshot.runTimeSeconds * (enemy.weakpointOpen ? 18 : 12) + enemy.id) * .12 + (1 - hpRatio) * .1 + openPulse);
          weakPoint.rotation.y += delta * (enemy.weakpointOpen ? 4.2 : 1.8);
          if (weakPoint instanceof THREE.Mesh && weakPoint.material instanceof THREE.MeshStandardMaterial) {
            weakPoint.material.emissive.setHex(enemy.weakpointOpen ? 0xff315e : 0x34121d);
            weakPoint.material.emissiveIntensity = enemy.weakpointOpen ? 2.8 : .75;
          }
        }''', "boss core-open visual")
webgl = replace_once(webgl,
'''    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {
      this.playerDamageKick = 1;''',
'''    if (snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .5);
      this.cameraShake = Math.min(.9, this.cameraShake + .28);
      this.audio.tone(74, .32, .05, "sawtooth");
      this.audio.tone(296, .2, .018, "triangle");
    }
    if (snapshot.stageEventSerial !== this.previousSnapshot.stageEventSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .28);
      this.cameraShake = Math.min(.65, this.cameraShake + .16);
      this.audio.tone(196, .16, .022, "triangle");
      this.audio.tone(392, .11, .012, "square");
    }
    if (snapshot.armorBreaks > this.previousSnapshot.armorBreaks) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .22);
      this.audio.tone(98, .12, .032, "sawtooth");
      this.audio.tone(740, .07, .014, "square");
    }
    if (snapshot.formationBreaks > this.previousSnapshot.formationBreaks) {
      this.presentation.emitRushAccent();
      this.audio.tone(520, .1, .018, "triangle");
      this.audio.tone(780, .08, .012, "triangle");
    }
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {
      this.playerDamageKick = 1;''', "v10 event effects")
write(webgl_path, webgl)

# ---------------------------------------------------------------------------
# Meta Layer v2: migrate v1, keep stage records, add career totals, best route
# and milestone unlocks. No storage failure can interrupt play.
# ---------------------------------------------------------------------------
write("src/sky/arcade/SkyDancerArcadeProgress.ts", '''import {
  SKY_DANCER_ARCADE_FIRST_STAGE,
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";

export type SkyDancerArcadeRank = "D" | "C" | "B" | "A" | "S" | "SS";
export type SkyDancerArcadePaintScheme = "default" | "sunset" | "storm" | "prism";
export type SkyDancerArcadeLoadout = "standard" | "missile-focus" | "gun-focus";

export interface SkyDancerArcadeStageRecord {
  clears: number;
  bestScore: number;
  bestRank: SkyDancerArcadeRank;
  noDamage: boolean;
}

export interface SkyDancerArcadeRunSummary {
  route: SkyDancerArcadeStageId[];
  kills: number;
  nearMisses: number;
  bossKills: number;
  armorBreaks: number;
  formationBreaks: number;
  bestChain: number;
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

function applyUnlocks(progress: SkyDancerArcadeProgress): void {
  const paint = new Set(progress.unlockedPaintSchemes);
  const loadouts = new Set(progress.unlockedLoadouts);
  if (progress.totalKills >= 50) paint.add("sunset");
  if (progress.totalBossKills >= 5) paint.add("storm");
  if (progress.completedRuns >= 1) paint.add("prism");
  if (progress.totalArmorBreaks >= 10) loadouts.add("missile-focus");
  if (progress.bestChain >= 8) loadouts.add("gun-focus");
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
    if (score > progress.bestRouteScore && summary.route.length > 0) {
      progress.bestRouteScore = Math.floor(score);
      progress.bestRoute = uniqueValidStages(summary.route);
    }
  }
  applyUnlocks(progress);
  saveSkyDancerArcadeProgress(progress);
  return progress;
}
''')

# ---------------------------------------------------------------------------
# UI: expose boss phases/armor and career combat stats without adding panels
# over the flight view.
# ---------------------------------------------------------------------------
mode_path = "app/SkyDancerArcadeMode.tsx"
mode = read(mode_path)
mode = replace_once(mode,
'''    recordSkyDancerArcadeRunClear(snapshot.score, snapshot.rank, snapshot.continuesUsed);''',
'''    recordSkyDancerArcadeRunClear(snapshot.score, snapshot.rank, snapshot.continuesUsed, {
      route: snapshot.route,
      kills: snapshot.enemiesDefeated,
      nearMisses: snapshot.nearMisses,
      bossKills: snapshot.bossKills,
      armorBreaks: snapshot.armorBreaks,
      formationBreaks: snapshot.formationBreaks,
      bestChain: snapshot.bestChain,
    });''', "record v10 run summary")
mode = replace_once(mode,
'''  const bossPercent = snapshot.bossMaxHp > 0 ? Math.round(snapshot.bossHp / snapshot.bossMaxHp * 100) : 0;
  const incomingMissiles''',
'''  const bossPercent = snapshot.bossMaxHp > 0 ? Math.round(snapshot.bossHp / snapshot.bossMaxHp * 100) : 0;
  const bossEnemy = snapshot.enemies.find((enemy) => enemy.boss) ?? null;
  const bossArmorPercent = bossEnemy && bossEnemy.maxArmor > 0 ? Math.round(bossEnemy.armor / bossEnemy.maxArmor * 100) : 0;
  const incomingMissiles''', "boss armor ui calculation")
mode = replace_once(mode,
'''            <div><small>CLIMAX TARGET</small><strong>{snapshot.bossName}</strong><span>{bossPercent}%</span></div>''',
'''            <div><small>CLIMAX TARGET · PHASE {snapshot.bossPhase}{snapshot.bossWeakpointOpen ? " · CORE OPEN" : bossArmorPercent > 0 ? ` · ARMOR ${bossArmorPercent}%` : ""}</small><strong>{snapshot.bossName}</strong><span>{bossPercent}%</span></div>''', "boss phase hud")
mode = replace_once(mode,
'''                <span><small>KILLS</small><b>{snapshot.enemiesDefeated}</b></span>
                <span><small>SMASH</small><b>{snapshot.turboSmashes}</b></span>
                <span><small>CONTINUE</small><b>{snapshot.continuesUsed}</b></span>''',
'''                <span><small>KILLS</small><b>{snapshot.enemiesDefeated}</b></span>
                <span><small>BOSS</small><b>{snapshot.bossKills}</b></span>
                <span><small>BEST CHAIN</small><b>×{snapshot.bestChain}</b></span>''', "final v10 combat stats")
write(mode_path, mode)

menu_path = "app/CartGameMenu.tsx"
menu = read(menu_path)
menu = replace_once(menu,
'''  const [practiceStageIds, setPracticeStageIds] = useState<SkyDancerArcadeStageId[]>([]);
  const [hardSnapshot,''',
'''  const [practiceStageIds, setPracticeStageIds] = useState<SkyDancerArcadeStageId[]>([]);
  const [arcadeMeta, setArcadeMeta] = useState(() => loadSkyDancerArcadeProgress());
  const [hardSnapshot,''', "title arcade meta state")
menu = replace_once(menu,
'''      const progress = loadSkyDancerArcadeProgress();
      const cleared = SKY_DANCER_ARCADE_STAGES''',
'''      const progress = loadSkyDancerArcadeProgress();
      setArcadeMeta(progress);
      const cleared = SKY_DANCER_ARCADE_STAGES''', "refresh title meta")
menu = replace_once(menu,
'''                ? `2 CONTINUES · ROUTE GATES CHANGE THE RUN${hard ? " · ACE ENEMIES FIRE FASTER AND HIT HARDER" : ""}`''',
'''                ? `2 CONTINUES · ROUTE GATES CHANGE THE RUN · BEST ${arcadeMeta.bestRunScore} ${arcadeMeta.bestRunRank} · BOSS ${arcadeMeta.totalBossKills} · CHAIN ×${arcadeMeta.bestChain} · UNLOCKS ${arcadeMeta.unlockedPaintSchemes.length + arcadeMeta.unlockedLoadouts.length}${hard ? " · ACE ENEMIES FIRE FASTER AND HIT HARDER" : ""}`''', "title meta readout")
write(menu_path, menu)

# ---------------------------------------------------------------------------
# Rule tests for the five selected V10 pillars.
# ---------------------------------------------------------------------------
test_path = "tests/sky-arcade-reference.test.ts"
tests = read(test_path)
tests = replace_once(tests,
'''import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";''',
'''import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { createDefaultSkyDancerArcadeProgress } from "../src/sky/arcade/SkyDancerArcadeProgress";
import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";
import {
  skyDancerArcadeArmorRatio,
  skyDancerArcadeBossPhase,
  skyDancerArcadeBossWeakpointOpen,
  skyDancerArcadeEnemyRole,
  skyDancerArcadeStageEvolutionProfile,
  skyDancerArcadeStageEventCheckpoint,
} from "../src/sky/arcade/SkyDancerArcadeV10Systems";''', "v10 test imports")

tests += r'''

test("V10 Combat 2.0 assigns readable roles, meaningful armor and threat priorities", () => {
  assert.equal(skyDancerArcadeEnemyRole("fighter"), "skirmisher");
  assert.equal(skyDancerArcadeEnemyRole("interceptor"), "hunter");
  assert.equal(skyDancerArcadeEnemyRole("missile-boat"), "artillery");
  assert.equal(skyDancerArcadeEnemyRole("bomber"), "heavy");
  assert.equal(skyDancerArcadeEnemyRole("ace"), "ace");
  assert.equal(skyDancerArcadeEnemyRole("boss", true), "climax");
  assert.equal(skyDancerArcadeArmorRatio("fighter"), 0, "ordinary fighters stay quick kills");
  assert.ok(skyDancerArcadeArmorRatio("bomber") > skyDancerArcadeArmorRatio("missile-boat"));
  assert.ok(skyDancerArcadeArmorRatio("boss", true) > 0);
});

test("V10 Boss Battle 2.0 has three HP phases and recurring core-open attack windows", () => {
  assert.equal(skyDancerArcadeBossPhase(100, 100), 1);
  assert.equal(skyDancerArcadeBossPhase(60, 100), 2);
  assert.equal(skyDancerArcadeBossPhase(25, 100), 3);
  assert.equal(skyDancerArcadeBossWeakpointOpen(1, 100), false);
  assert.ok(Array.from({ length: 80 }, (_, i) => skyDancerArcadeBossWeakpointOpen(2, i / 20)).some(Boolean));
  assert.ok(Array.from({ length: 80 }, (_, i) => skyDancerArcadeBossWeakpointOpen(3, i / 20)).some(Boolean));
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", difficulty: "normal", seed: 1002 });
  runtime.setBossHpRatioForTests(.6);
  const phase2 = runtime.getSnapshot();
  assert.equal(phase2.bossPhase, 2);
  assert.ok(phase2.bossPhaseSerial >= 1);
  runtime.setBossHpRatioForTests(.24);
  const phase3 = runtime.getSnapshot();
  assert.equal(phase3.bossPhase, 3);
  assert.ok(phase3.bossPhaseSerial > phase2.bossPhaseSerial);
});

test("V10 Stage Evolution gives every biome two authored gameplay beats and bounded checkpoints", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const profile = skyDancerArcadeStageEvolutionProfile(stage.biome);
    assert.equal(profile.labels.length, 2);
    assert.equal(profile.eventHazards.length, 2);
    assert.ok(profile.labels.every((label) => label.length >= 8));
    assert.ok(profile.scoreBonus >= 900);
  }
  assert.equal(skyDancerArcadeStageEventCheckpoint(.1), 0);
  assert.equal(skyDancerArcadeStageEventCheckpoint(.2), 1);
  assert.equal(skyDancerArcadeStageEventCheckpoint(.7), 2);
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", difficulty: "normal", seed: 1003 });
  runtime.triggerStageEvolutionForTests(.2);
  const first = runtime.getSnapshot();
  assert.equal(first.stageEventSerial, 1);
  assert.ok(first.stageEventLabel);
  runtime.triggerStageEvolutionForTests(.7);
  const second = runtime.getSnapshot();
  assert.equal(second.stageEventSerial, 2);
  assert.notEqual(second.stageEventLabel, first.stageEventLabel);
  assert.ok(second.hazards.length <= 10, "authored hazard beats remain bounded");
});

test("V10 Cinematic Gameplay boosts camera language for stage, armor, formation and boss beats without gameplay pause", () => {
  const director = new SkyDancerArcadePresentationDirector();
  const base = { turboActive: false, nearMisses: 0, enemiesDefeated: 0, bossActive: true, hitSerial: 0, damageSerial: 0, stageSerial: 1, resultSerial: 0, bossPhaseSerial: 0, stageEventSerial: 0, armorBreaks: 0, formationBreaks: 0 };
  const boss = director.update({ ...base, bossPhaseSerial: 1 }, base, 1 / 60);
  assert.ok(boss.fovKick >= 3.3 && boss.pullback >= .8);
  director.reset();
  const stage = director.update({ ...base, stageEventSerial: 1 }, base, 1 / 60);
  assert.ok(stage.fovKick >= 2.6 && stage.cameraShake >= .09);
  director.reset();
  const armor = director.update({ ...base, armorBreaks: 1 }, base, 1 / 60);
  assert.ok(armor.bloomBoost >= .12);
  director.reset();
  const formation = director.update({ ...base, formationBreaks: 1 }, base, 1 / 60);
  assert.ok(formation.fovKick >= 1.8);
});

test("V10 Arcade Meta Layer defaults to migrated v2 career records and milestone slots", () => {
  const progress = createDefaultSkyDancerArcadeProgress();
  assert.equal(progress.version, 2);
  assert.deepEqual(progress.unlockedPaintSchemes, ["default"]);
  assert.deepEqual(progress.unlockedLoadouts, ["standard"]);
  assert.deepEqual(progress.bestRoute, []);
  assert.equal(progress.totalBossKills, 0);
  assert.equal(progress.totalArmorBreaks, 0);
  assert.equal(progress.bestChain, 0);
});
'''
write(test_path, tests)

write("docs/ARCADE_V10_EVOLUTION.md", '''# Sky Dancer Arcade V10 Evolution

V10 integrates five selected pillars directly into the existing two-to-four minute Arcade Run instead of creating a separate mode.

## 1. Combat 2.0
- Every enemy exposes a combat role used by lock/gun threat prioritization.
- Missile boats, bombers, aces and bosses gain an armor layer while basic fighters remain fast kills.
- Missiles strip armor efficiently; gun pressure can stagger enemy fire.
- Every third chained kill becomes a FORMATION BREAK with score and Turbo reward.
- Runtime tracks best chain, armor breaks and formation breaks as first-class run metrics.

## 2. Boss Battle 2.0
- Bosses move through three real HP phases: OUTER ARMOR, CORE WINDOW and FINAL ASSAULT.
- Phase changes move the boss closer, increase maneuver pressure and alter projectile spread/guidance/cadence.
- Phase 2/3 create recurring CORE OPEN windows with amplified gun/missile damage.
- Phase transitions inject the current stage's hazard identity instead of becoming a disconnected arena battle.

## 5. Stage Evolution
- Every biome owns two authored gameplay events at roughly 18% and 62% course progress.
- Events use stage-native hazards: towers in the city, lightning in storms, rock collapse in volcano/ice, debris in orbit, etc.
- Events award risk score/Turbo and remain capped to the existing bounded entity budgets.

## 7. Cinematic Gameplay
- Stage beats, armor breaks, formation breaks and boss phase transitions feed PresentationDirector envelopes.
- FOV, pullback, shake, bloom and exposure respond while the player retains full flight and weapon control.
- WebGL boss weak points visibly brighten/pulse during CORE OPEN.
- Existing pooled V9.8/V9.9 explosion, debris and rush effects are reused rather than adding unbounded FX.

## 9. Arcade Meta Layer
- Local progress migrates from v1 to v2 automatically.
- Career totals: kills, near misses, boss kills, armor breaks, formation breaks and best chain.
- Best scoring route is stored alongside existing stage records and best run rank.
- Milestone rewards unlock paint/loadout slots: SUNSET, STORM, PRISM, MISSILE FOCUS and GUN FOCUS.
- Title screen exposes best score/rank, boss total, best chain and total unlock count.

## Quality gates
V10 must pass the existing rules suite, arcade typecheck, lint and Pages production build before product code reaches main. A final 844x390 mobile WebGL audit must then visually verify normal combat, stage event, boss phase/core-open and HUD readability before release is considered complete.
''')

print("Applied Sky Dancer Arcade V10 Evolution")
