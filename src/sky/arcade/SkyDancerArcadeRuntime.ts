import {
  SKY_DANCER_ARCADE_FINAL_STAGE,
  SKY_DANCER_ARCADE_FIRST_STAGE,
  SKY_DANCER_ARCADE_MAX_CONTINUES,
  SKY_DANCER_ARCADE_MAX_LOCKS,
  SKY_DANCER_ARCADE_RUN_DURATION_SECONDS,
  skyDancerArcadeStageById,
  type SkyDancerArcadeEnemyKind,
  type SkyDancerArcadeFormation,
  type SkyDancerArcadeHazardKind,
  type SkyDancerArcadeStageDefinition,
  type SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type { SkyDancerArcadeRank } from "./SkyDancerArcadeProgress";

export type SkyDancerArcadeStatus =
  | "running"
  | "paused"
  | "stage-clear"
  | "continue"
  | "game-over"
  | "run-clear"
  | "practice-clear";

export type SkyDancerArcadeEnemyManeuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";

export interface SkyDancerArcadeRuntimeOptions {
  difficulty: "normal" | "hard";
  mode: "arcade-run" | "stage-practice";
  startStageId?: SkyDancerArcadeStageId;
  seed?: number;
}

export interface SkyDancerArcadeEnemySnapshot {
  id: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  x: number;
  y: number;
  depth: number;
  hp: number;
  maxHp: number;
  locked: boolean;
  boss: boolean;
  phase: number;
  maneuver: SkyDancerArcadeEnemyManeuver;
}

export interface SkyDancerArcadeProjectileSnapshot {
  id: number;
  owner: "player-gun" | "player-missile" | "enemy";
  x: number;
  y: number;
  depth: number;
  targetEnemyId: number | null;
}

export interface SkyDancerArcadeHazardSnapshot {
  id: number;
  kind: SkyDancerArcadeHazardKind;
  x: number;
  y: number;
  depth: number;
  scale: number;
}

export interface SkyDancerArcadeSnapshot {
  status: SkyDancerArcadeStatus;
  difficulty: "normal" | "hard";
  mode: "arcade-run" | "stage-practice";
  stage: SkyDancerArcadeStageDefinition;
  stageNumber: number;
  stagesCleared: number;
  route: SkyDancerArcadeStageId[];
  stageTimeSeconds: number;
  stageDurationSeconds: number;
  stageProgress: number;
  runTimeSeconds: number;
  runDurationSeconds: number;
  distance: number;
  playerX: number;
  playerY: number;
  playerHp: number;
  playerMaxHp: number;
  turbo: number;
  turboActive: boolean;
  fireActive: boolean;
  lockActive: boolean;
  lockedCount: number;
  score: number;
  stageScore: number;
  rank: SkyDancerArcadeRank;
  chain: number;
  chainTimer: number;
  enemiesDefeated: number;
  damageTaken: number;
  nearMisses: number;
  multiLockKills: number;
  turboSmashes: number;
  continuesRemaining: number;
  continuesUsed: number;
  branchActive: boolean;
  branchOptions: readonly SkyDancerArcadeStageId[];
  branchSelection: SkyDancerArcadeStageId | null;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  enemies: SkyDancerArcadeEnemySnapshot[];
  projectiles: SkyDancerArcadeProjectileSnapshot[];
  hazards: SkyDancerArcadeHazardSnapshot[];
  resultTimer: number;
  lastClearedStageId: SkyDancerArcadeStageId | null;
  lastStageScore: number;
  lastStageRank: SkyDancerArcadeRank;
  lastStageNoDamage: boolean;
  message: string | null;
  shotSerial: number;
  missileSerial: number;
  hitSerial: number;
  damageSerial: number;
  stageSerial: number;
  resultSerial: number;
}

interface ArcadeEnemy extends SkyDancerArcadeEnemySnapshot {
  age: number;
  speed: number;
  baseX: number;
  baseY: number;
  amplitude: number;
  fireCooldown: number;
  scoreValue: number;
  alive: boolean;
  maneuverClock: number;
  maneuverSign: number;
}

interface ArcadeProjectile extends SkyDancerArcadeProjectileSnapshot {
  speed: number;
  damage: number;
  life: number;
  vx: number;
  vy: number;
  guidance: number;
  nearMissChecked: boolean;
}

interface ArcadeHazard extends SkyDancerArcadeHazardSnapshot {
  speed: number;
  nearMissChecked: boolean;
}

interface ArcadeInput {
  x: number;
  y: number;
  fire: boolean;
  lock: boolean;
  turbo: boolean;
}

interface StageStats {
  scoreAtStart: number;
  damageAtStart: number;
  killsAtStart: number;
}

const PLAYER_MAX_HP = 100;
const PLAYER_X_LIMIT = 2.2;
const PLAYER_Y_LIMIT = 1.75;
const ENEMY_X_LIMIT = 2.62;
const ENEMY_Y_LIMIT = 2.05;
const GUN_COOLDOWN = 0.105;
const LOCK_INTERVAL = 0.13;
const ARCADE_SECTION_RESULT_SECONDS = 0.55;
const PRACTICE_RESULT_SECONDS = 2.8;
const PLAYER_MOVE_SPEED_X = 3.7;
const PLAYER_MOVE_SPEED_Y = 3.18;
const PLAYER_TURBO_SPEED_X = 5.05;
const PLAYER_TURBO_SPEED_Y = 4.28;
const PLAYER_MOVE_RESPONSE = 19.5;
const ENEMY_FLYBY_CULL_DEPTH = -11.5;
const MAX_ENEMY_PROJECTILES_NORMAL = 5;
const MAX_ENEMY_PROJECTILES_HARD = 9;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return current;
}

function enemyStats(kind: SkyDancerArcadeEnemyKind, hard: boolean): { hp: number; speed: number; score: number } {
  const healthScale = hard ? 1.24 : 1;
  switch (kind) {
    case "interceptor": return { hp: 24 * healthScale, speed: hard ? 18 : 16, score: 520 };
    case "missile-boat": return { hp: 42 * healthScale, speed: hard ? 12.4 : 11, score: 760 };
    case "bomber": return { hp: 88 * healthScale, speed: hard ? 9.5 : 8.4, score: 1380 };
    case "ace": return { hp: 68 * healthScale, speed: hard ? 16 : 14, score: 1680 };
    default: return { hp: 30 * healthScale, speed: hard ? 14.5 : 12.8, score: 440 };
  }
}

function rankIndex(rank: SkyDancerArcadeRank): number {
  return ["D", "C", "B", "A", "S", "SS"].indexOf(rank);
}

export function skyDancerArcadeRankForScore(
  score: number,
  stagesCleared: number,
  damageTaken: number,
  continuesUsed: number,
): SkyDancerArcadeRank {
  const stageCount = Math.max(1, stagesCleared);
  const scorePerStage = score / stageCount;
  let rank: SkyDancerArcadeRank = scorePerStage >= 66000
    ? "SS"
    : scorePerStage >= 50000
      ? "S"
      : scorePerStage >= 35000
        ? "A"
        : scorePerStage >= 23000
          ? "B"
          : scorePerStage >= 12000
            ? "C"
            : "D";
  let penalty = continuesUsed + Math.floor(damageTaken / (stageCount * 85));
  while (penalty > 0 && rankIndex(rank) > 0) {
    rank = (["D", "C", "B", "A", "S", "SS"] as SkyDancerArcadeRank[])[rankIndex(rank) - 1];
    penalty -= 1;
  }
  return rank;
}

export class SkyDancerArcadeRuntime {
  private readonly options: SkyDancerArcadeRuntimeOptions;
  private stage: SkyDancerArcadeStageDefinition;
  private status: SkyDancerArcadeStatus = "running";
  private statusBeforePause: SkyDancerArcadeStatus = "running";
  private readonly input: ArcadeInput = { x: 0, y: 0, fire: false, lock: false, turbo: false };
  private rngState: number;
  private route: SkyDancerArcadeStageId[] = [];
  private stageNumber = 1;
  private stagesCleared = 0;
  private stageTime = 0;
  private runTime = 0;
  private distance = 0;
  private playerX = 0;
  private playerY = 0;
  private playerVX = 0;
  private playerVY = 0;
  private playerHp = PLAYER_MAX_HP;
  private turbo = 100;
  private score = 0;
  private chain = 0;
  private chainTimer = 0;
  private enemiesDefeated = 0;
  private damageTaken = 0;
  private nearMisses = 0;
  private multiLockKills = 0;
  private turboSmashes = 0;
  private continuesRemaining = SKY_DANCER_ARCADE_MAX_CONTINUES;
  private continuesUsed = 0;
  private enemies: ArcadeEnemy[] = [];
  private projectiles: ArcadeProjectile[] = [];
  private hazards: ArcadeHazard[] = [];
  private nextEntityId = 1;
  private waveSerial = 0;
  private nextWaveAt = 2.8;
  private nextHazardAt = 11;
  private gunCooldown = 0;
  private lockCooldown = 0;
  private branchSelection: SkyDancerArcadeStageId | null = null;
  private branchWasResolved = false;
  private bossSpawned = false;
  private bossDefeated = false;
  private resultTimer = 0;
  private lastClearedStageId: SkyDancerArcadeStageId | null = null;
  private lastStageScore = 0;
  private lastStageRank: SkyDancerArcadeRank = "D";
  private lastStageNoDamage = false;
  private message: string | null = "DROP IN · ARCADE RUN";
  private messageTimer = 2.5;
  private shotSerial = 0;
  private missileSerial = 0;
  private hitSerial = 0;
  private damageSerial = 0;
  private damageCooldown = 0;
  private stageSerial = 1;
  private resultSerial = 0;
  private readonly stageStats: StageStats = { scoreAtStart: 0, damageAtStart: 0, killsAtStart: 0 };

  constructor(options: SkyDancerArcadeRuntimeOptions) {
    this.options = options;
    this.rngState = (options.seed ?? 0x5f3759df) | 0;
    const startId = options.mode === "stage-practice"
      ? options.startStageId ?? SKY_DANCER_ARCADE_FIRST_STAGE
      : SKY_DANCER_ARCADE_FIRST_STAGE;
    this.stage = skyDancerArcadeStageById(startId);
    this.route = [startId];
    this.resetStageState(0);
  }

  private random(): number {
    let x = this.rngState | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.rngState = x | 0;
    return (x >>> 0) / 0x100000000;
  }

  private resetStageState(rewindTime: number): void {
    this.stageTime = Math.max(0, rewindTime);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];
    this.waveSerial = 0;
    // Give each section a readable establishing beat before the first pressure wave.
    this.nextWaveAt = this.stageTime + (rewindTime > 0 ? 1.35 : 2.35);
    this.nextHazardAt = this.stageTime + (rewindTime > 0 ? 2.0 : 4.1);
    this.damageCooldown = 0;
    this.branchSelection = null;
    this.branchWasResolved = this.stageTime >= this.stage.durationSeconds * 0.45;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.stageStats.scoreAtStart = this.score;
    this.stageStats.damageAtStart = this.damageTaken;
    this.stageStats.killsAtStart = this.enemiesDefeated;
    if (this.stageTime >= this.stage.durationSeconds * 0.52) this.spawnBoss();
  }

  setMove(x: number, y: number): void {
    this.input.x = clamp(x, -1, 1);
    this.input.y = clamp(y, -1, 1);
  }

  setFire(active: boolean): void {
    this.input.fire = active;
  }

  setLock(active: boolean): void {
    if (this.input.lock && !active) this.launchLockedMissiles();
    this.input.lock = active;
  }

  setTurbo(active: boolean): void {
    this.input.turbo = active;
  }

  pause(): void {
    if (this.status === "paused" || this.status === "game-over" || this.status === "run-clear" || this.status === "practice-clear") return;
    this.statusBeforePause = this.status;
    this.status = "paused";
    this.releaseInputs();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = this.statusBeforePause;
  }

  releaseInputs(): void {
    this.input.x = 0;
    this.input.y = 0;
    this.input.fire = false;
    this.input.lock = false;
    this.input.turbo = false;
    this.playerVX = 0;
    this.playerVY = 0;
  }

  continueRun(): boolean {
    if (this.status !== "continue" || this.continuesRemaining <= 0) return false;
    this.continuesRemaining -= 1;
    this.continuesUsed += 1;
    this.playerHp = PLAYER_MAX_HP;
    this.turbo = 72;
    this.chain = 0;
    this.chainTimer = 0;
    this.status = "running";
    this.message = "CONTINUE · FORMATION RESTORED";
    this.messageTimer = 2.2;
    const rewindSeconds = Math.min(4, this.stageTime);
    this.runTime = Math.max(0, this.runTime - rewindSeconds);
    this.resetStageState(this.stageTime - rewindSeconds);
    return true;
  }

  step(deltaSeconds: number): void {
    const delta = clamp(deltaSeconds, 0, 0.05);
    if (this.status === "paused" || this.status === "continue" || this.status === "game-over" || this.status === "run-clear" || this.status === "practice-clear") return;
    if (this.status === "stage-clear") {
      this.resultTimer = Math.max(0, this.resultTimer - delta);
      if (this.resultTimer <= 0) this.advanceAfterStageClear();
      return;
    }

    const turboActive = this.input.turbo && this.turbo > 0.5;
    this.stageTime += delta;
    this.runTime += delta;
    this.distance += this.stage.courseSpeed * (turboActive ? 1.44 : 1) * delta;
    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    if (this.messageTimer <= 0) this.message = null;
    this.updatePlayer(delta, turboActive);
    this.updateBranch();
    this.updateDirector();
    this.updateLocking(delta);
    this.updateWeapons(delta);
    this.updateEnemies(delta, turboActive);
    this.updateProjectiles(delta);
    this.updateHazards(delta, turboActive);
    this.cleanupEntities();

    this.chainTimer = Math.max(0, this.chainTimer - delta);
    if (this.chainTimer <= 0) this.chain = 0;
    if (this.playerHp <= 0) {
      this.enterContinue();
      return;
    }
    if (this.stageTime >= this.stage.durationSeconds) {
      if (!this.bossDefeated) this.breakClimaxTargetAtCourseEnd();
      this.completeStage();
    }
  }

  private updatePlayer(delta: number, turboActive: boolean): void {
    const targetVX = this.input.x * (turboActive ? PLAYER_TURBO_SPEED_X : PLAYER_MOVE_SPEED_X);
    const targetVY = this.input.y * (turboActive ? PLAYER_TURBO_SPEED_Y : PLAYER_MOVE_SPEED_Y);
    this.playerVX = moveToward(this.playerVX, targetVX, PLAYER_MOVE_RESPONSE * delta);
    this.playerVY = moveToward(this.playerVY, targetVY, PLAYER_MOVE_RESPONSE * delta);
    this.playerX = clamp(this.playerX + this.playerVX * delta, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerY = clamp(this.playerY + this.playerVY * delta, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    if (turboActive) this.turbo = Math.max(0, this.turbo - 29 * delta);
    else this.turbo = Math.min(100, this.turbo + 13.5 * delta);
  }

  private get branchActive(): boolean {
    if (this.stage.next.length <= 1 || this.branchWasResolved) return false;
    const start = this.stage.durationSeconds * 0.27;
    const end = this.stage.durationSeconds * 0.43;
    return this.stageTime >= start && this.stageTime <= end;
  }

  private updateBranch(): void {
    if (this.stage.next.length <= 1 || this.branchWasResolved) return;
    const start = this.stage.durationSeconds * 0.27;
    const end = this.stage.durationSeconds * 0.43;
    if (this.stageTime < start) return;
    if (this.stageTime <= end) {
      const count = this.stage.next.length;
      const normalized = clamp((this.playerX + PLAYER_X_LIMIT) / (PLAYER_X_LIMIT * 2), 0, 0.9999);
      const index = Math.min(count - 1, Math.floor(normalized * count));
      this.branchSelection = this.stage.next[index] ?? this.stage.next[0] ?? null;
      if (this.message !== "SELECT ROUTE") {
        this.message = "SELECT ROUTE";
        this.messageTimer = Math.min(1.05, end - this.stageTime);
      }
      return;
    }
    this.branchWasResolved = true;
    if (!this.branchSelection) {
      const index = Math.floor(this.random() * this.stage.next.length);
      this.branchSelection = this.stage.next[index] ?? this.stage.next[0] ?? null;
    }
    if (this.branchSelection) {
      this.message = `ROUTE LOCKED · ${skyDancerArcadeStageById(this.branchSelection).name}`;
      this.messageTimer = 2.4;
      this.addScore(2500, false);
    }
  }

  private updateDirector(): void {
    const bossTime = this.stage.durationSeconds * (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE ? 0.42 : 0.52);
    if (!this.bossSpawned && this.stageTime >= bossTime) this.spawnBoss();
    const enemyCap = this.options.difficulty === "hard" ? 15 : 11;
    if (!this.bossSpawned && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {
      this.spawnWave();
      const pressure = this.options.difficulty === "hard" ? 0.84 : 1;
      this.nextWaveAt += this.stage.waveIntervalSeconds * pressure * (0.84 + this.random() * 0.34);
    }
    if (this.stageTime >= this.nextHazardAt && this.hazards.length < 8) {
      this.spawnHazardPattern();
      this.nextHazardAt += (3.8 - this.stage.turbulence * 2.6) * (0.82 + this.random() * 0.42);
    }
  }

  private spawnWave(): void {
    const formation = this.stage.formations[Math.floor(this.random() * this.stage.formations.length)] ?? "line";
    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;
    const count = 3 + Math.floor(this.random() * 2) + hardBonus;
    const choreography: readonly SkyDancerArcadeEnemyManeuver[] = ["close-bank", "overtake", "parallel", "cross-pass"];
    const featured = choreography[this.waveSerial % choreography.length] ?? "close-bank";
    this.waveSerial += 1;
    for (let index = 0; index < count; index += 1) {
      const kind = this.stage.enemies[Math.floor(this.random() * this.stage.enemies.length)] ?? "fighter";
      const [formationX, formationY] = this.formationPosition(formation, index, count);
      const maneuver: SkyDancerArcadeEnemyManeuver = index === 0
        ? featured
        : index === 1 && count >= 4
          ? "close-bank"
          : "approach";
      const sign = Math.abs(formationX) > 0.18 ? Math.sign(formationX) : index % 2 === 0 ? 1 : -1;
      const x = maneuver === "overtake" ? sign * 1.9 : formationX;
      const y = maneuver === "overtake" ? clamp(formationY * 0.34, -0.62, 0.62) : formationY;
      // V8 keeps ordinary enemies in the readable mid-field and lets an overtaker enter from behind.
      const depth = maneuver === "overtake" ? -6.4 : 51 + index * 3.8 + this.random() * 10;
      this.spawnEnemy(kind, x, y, depth, maneuver, sign);
    }
  }

  private formationPosition(formation: SkyDancerArcadeFormation, index: number, count: number): [number, number] {
    const centered = count <= 1 ? 0 : (index / (count - 1)) * 2 - 1;
    switch (formation) {
      case "vee": return [centered * 1.92, Math.abs(centered) * 0.86 - 0.42];
      case "cross": return [index % 2 === 0 ? centered * 1.68 : 0, index % 2 === 0 ? 0 : centered * 1.42];
      case "spiral": {
        const angle = (index / Math.max(1, count)) * Math.PI * 2;
        return [Math.cos(angle) * 1.72, Math.sin(angle) * 1.38];
      }
      case "pincer": return [index < count / 2 ? -2.08 + index * 0.24 : 2.08 - (count - index - 1) * 0.24, centered * 0.72];
      case "wall": return [centered * 2.18, Math.sin(index * 1.7) * 0.62];
      default: return [centered * 1.88, Math.sin(index * 0.9) * 0.48];
    }
  }

  private spawnEnemy(
    kind: SkyDancerArcadeEnemyKind,
    x: number,
    y: number,
    depth: number,
    maneuver: SkyDancerArcadeEnemyManeuver = "approach",
    maneuverSign = 1,
  ): void {
    const stats = enemyStats(kind, this.options.difficulty === "hard");
    this.enemies.push({
      id: this.nextEntityId++,
      kind,
      x,
      y,
      depth,
      hp: stats.hp,
      maxHp: stats.hp,
      locked: false,
      boss: false,
      phase: this.random() * Math.PI * 2,
      maneuver,
      age: 0,
      speed: stats.speed,
      baseX: x,
      baseY: y,
      amplitude: 0.28 + this.random() * 0.72,
      fireCooldown: 1.1 + this.random() * 2.4,
      scoreValue: stats.score,
      alive: true,
      maneuverClock: 0,
      maneuverSign: maneuverSign < 0 ? -1 : 1,
    });
  }

  private spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const final = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;
    // Climax targets must survive a full attack run instead of evaporating under one gun burst.
    const baseHp = final ? 1280 : 440 + this.stage.act * 110;
    const hp = Math.round(baseHp * (this.options.difficulty === "hard" ? 1.25 : 1));
    this.enemies.push({
      id: this.nextEntityId++,
      kind: "boss",
      x: 0,
      y: 0.1,
      depth: 88,
      hp,
      maxHp: hp,
      locked: false,
      boss: true,
      phase: 0,
      maneuver: "approach",
      age: 0,
      speed: 7.2,
      baseX: 0,
      baseY: 0.1,
      amplitude: 1.42,
      fireCooldown: 1.4,
      scoreValue: final ? 24000 : 12000,
      alive: true,
      maneuverClock: 0,
      maneuverSign: 1,
    });
    this.message = `WARNING · ${this.stage.bossName}`;
    this.messageTimer = 3.2;
    this.stageSerial += 1;
  }

  private spawnHazardPattern(): void {
    const kind = this.stage.hazards[Math.floor(this.random() * this.stage.hazards.length)] ?? "debris";
    const count = kind === "mine" || kind === "debris" ? 5 + Math.floor(this.random() * 3) : 4;
    const safeLane = Math.floor(this.random() * count);
    const center = clamp(this.playerX * 0.28, -0.55, 0.55);
    for (let index = 0; index < count; index += 1) {
      if ((kind === "tower" || kind === "rock" || kind === "arch") && index === safeLane) continue;
      const x = count <= 1 ? center : center + (index / (count - 1)) * 4.2 - 2.1;
      this.hazards.push({
        id: this.nextEntityId++,
        kind,
        x: clamp(x + (this.random() - 0.5) * 0.2, -ENEMY_X_LIMIT, ENEMY_X_LIMIT),
        y: kind === "lightning" ? (this.random() - 0.5) * 2.8 : (this.random() - 0.5) * 1.8,
        depth: 90 + this.random() * 18,
        scale: kind === "mine" || kind === "debris" ? 0.62 : 0.88,
        speed: 11.5 + this.stage.courseSpeed * 0.035,
        nearMissChecked: false,
      });
    }
  }

  private updateLocking(delta: number): void {
    this.lockCooldown = Math.max(0, this.lockCooldown - delta);
    if (!this.input.lock || this.lockCooldown > 0) return;
    const locked = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;
    if (locked >= SKY_DANCER_ARCADE_MAX_LOCKS) return;
    let candidate: ArcadeEnemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.locked || enemy.depth < 4 || enemy.depth > 92) continue;
      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const reticleDistance = Math.hypot(dx, dy);
      const threshold = enemy.boss ? 1.85 : 1.45;
      if (reticleDistance > threshold) continue;
      const score = reticleDistance * 20 + enemy.depth * 0.05;
      if (score < best) {
        best = score;
        candidate = enemy;
      }
    }
    if (candidate) {
      candidate.locked = true;
      this.lockCooldown = LOCK_INTERVAL;
      this.message = `LOCK ${locked + 1}`;
      this.messageTimer = 0.35;
    }
  }

  private updateWeapons(delta: number): void {
    this.gunCooldown = Math.max(0, this.gunCooldown - delta);
    if (!this.input.fire || this.gunCooldown > 0) return;
    this.gunCooldown = GUN_COOLDOWN;
    const target = this.chooseGunTarget();
    this.projectiles.push({
      id: this.nextEntityId++,
      owner: "player-gun",
      x: this.playerX,
      y: this.playerY,
      depth: 1.2,
      targetEnemyId: target?.id ?? null,
      speed: 118,
      damage: this.options.difficulty === "hard" ? 8 : 9.5,
      life: 1.05,
      vx: target ? (target.x - this.playerX) * 0.48 : 0,
      vy: target ? (target.y - this.playerY) * 0.48 : 0,
      guidance: 0,
      nearMissChecked: false,
    });
    this.shotSerial += 1;
  }

  private chooseGunTarget(): ArcadeEnemy | null {
    let target: ArcadeEnemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.depth < 2 || enemy.depth > 72) continue;
      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const cone = Math.hypot(dx, dy);
      if (cone > (enemy.boss ? 1.45 : 0.72)) continue;
      const score = cone * 28 + enemy.depth * 0.04;
      if (score < best) {
        best = score;
        target = enemy;
      }
    }
    return target;
  }

  private launchLockedMissiles(): void {
    if (this.status !== "running") return;
    let targets = this.enemies.filter((enemy) => enemy.alive && enemy.locked).slice(0, SKY_DANCER_ARCADE_MAX_LOCKS);
    if (targets.length === 0) {
      const fallback = this.chooseGunTarget();
      if (fallback) targets = [fallback];
    }
    targets.forEach((target, index) => {
      target.locked = false;
      this.projectiles.push({
        id: this.nextEntityId++,
        owner: "player-missile",
        x: this.playerX + (index % 2 === 0 ? -0.08 : 0.08),
        y: this.playerY - 0.05,
        depth: 0.8,
        targetEnemyId: target.id,
        speed: 62,
        damage: target.boss ? 34 : 46,
        life: 2.8,
        vx: 0,
        vy: 0,
        guidance: 0,
        nearMissChecked: false,
      });
    });
    if (targets.length > 0) {
      this.missileSerial += 1;
      this.message = targets.length >= 4 ? `MULTI LOCK ×${targets.length}` : "FOX TWO";
      this.messageTimer = 0.9;
    }
  }

  private updateEnemies(delta: number, turboActive: boolean): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.age += delta;
      if (enemy.boss) {
        enemy.depth = moveToward(enemy.depth, 33, delta * 18);
        const frequency = this.options.difficulty === "hard" ? 0.82 : 0.68;
        enemy.x = clamp(this.playerX * 0.58 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.82, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
      } else {
        const frequency = enemy.kind === "interceptor" ? 2.35 : enemy.kind === "ace" ? 1.75 : 1.02;
        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, enemy.kind === "ace" ? 0.84 : enemy.kind === "interceptor" ? 0.74 : 0.54);
        const close = clamp((68 - enemy.depth) / 54, 0, 1);
        const weaveX = Math.sin(enemy.age * frequency + enemy.phase) * enemy.amplitude;
        const weaveY = Math.cos(enemy.age * frequency * 0.72 + enemy.phase) * enemy.amplitude * 0.82;
        const flankX = Math.sin(enemy.phase * 1.91) * close * 0.42;
        const flankY = Math.cos(enemy.phase * 1.37) * close * 0.28;
        const genericX = () => clamp(enemy.baseX + weaveX + this.playerX * pursuit + flankX, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        const genericY = () => clamp(enemy.baseY + weaveY + this.playerY * pursuit * 0.82 + flankY, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);

        if (enemy.maneuver === "overtake") {
          if (enemy.depth < 24) {
            // Enter from behind and visibly run past the player's shoulder into the forward field.
            enemy.depth += Math.max(32, enemy.speed * 2.25) * delta;
            const pass = clamp((enemy.depth + 6.4) / 30.4, 0, 1);
            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.94 - pass * 0.66) + Math.sin(enemy.age * 5.2) * 0.1, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            enemy.y = clamp(this.playerY * 0.56 + enemy.baseY * 0.28 + Math.sin(enemy.age * 3.6 + enemy.phase) * 0.24, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          } else {
            enemy.maneuverClock += delta;
            enemy.depth = moveToward(enemy.depth, 20 + Math.sin(enemy.maneuverClock * 2.7) * 1.3, delta * 8.5);
            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.22 + Math.sin(enemy.maneuverClock * 3.2) * 0.18), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            enemy.y = clamp(this.playerY * 0.65 + Math.sin(enemy.maneuverClock * 2.5 + enemy.phase) * 0.44, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.15) {
              enemy.maneuver = "close-bank";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "parallel") {
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.5 * delta;
            enemy.x = clamp(genericX() + enemy.maneuverSign * 0.34, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            enemy.y = genericY();
          } else {
            // Hold a large readable silhouette beside the player for almost two seconds.
            enemy.maneuverClock += delta;
            enemy.depth = moveToward(enemy.depth, 15.8 + Math.sin(enemy.maneuverClock * 2.1) * 1.6, delta * 7.5);
            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.18 + Math.sin(enemy.maneuverClock * 2.8) * 0.16), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            enemy.y = clamp(this.playerY * 0.72 + Math.sin(enemy.maneuverClock * 2.2 + enemy.phase) * 0.48, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.9) {
              enemy.maneuver = "cross-pass";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "cross-pass") {
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * delta;
            enemy.x = genericX();
            enemy.y = genericY();
          } else {
            enemy.maneuverClock += delta;
            const t = clamp(enemy.maneuverClock / 1.25, 0, 1);
            const eased = t * t * (3 - 2 * t);
            enemy.depth = moveToward(enemy.depth, 12.6, delta * 8);
            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.86 - eased * 3.72), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            enemy.y = clamp(this.playerY * 0.62 + Math.sin(t * Math.PI + enemy.phase) * 0.62, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.25) {
              enemy.maneuver = "approach";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x - enemy.maneuverSign * 0.42;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "close-bank") {
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * delta;
            enemy.x = genericX();
            enemy.y = genericY();
          } else {
            // A close turning fight: slow relative depth while the raider visibly banks across the canopy.
            enemy.maneuverClock += delta;
            const arc = Math.sin(clamp(enemy.maneuverClock / 1.65, 0, 1) * Math.PI);
            enemy.depth = moveToward(enemy.depth, 11.8 + Math.sin(enemy.maneuverClock * 3) * 1.5, delta * 7.6);
            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.36 - arc * 0.48) + Math.sin(enemy.maneuverClock * 3.15 + enemy.phase) * 0.28, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            enemy.y = clamp(this.playerY * 0.7 + enemy.baseY * 0.22 + Math.sin(enemy.maneuverClock * 2.45 + enemy.phase) * 0.62, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.65) {
              enemy.maneuver = "approach";
              enemy.maneuverClock = 0;
              enemy.baseX = clamp(enemy.x + enemy.maneuverSign * 0.7, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
              enemy.baseY = enemy.y;
              enemy.amplitude = Math.min(1.25, enemy.amplitude * 1.15);
            }
          }
        } else {
          enemy.depth -= enemy.speed * delta;
          enemy.x = genericX();
          enemy.y = genericY();
        }
      }
      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {
        // Route selection should stay tense without becoming an unreadable missile wall.
        if (this.branchActive && !enemy.boss) enemy.fireCooldown = .48 + this.random() * .36;
        else this.enemyFire(enemy);
      }
      if (enemy.depth > 3.3) continue;
      const proximity = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
      if (proximity < (enemy.boss ? 0.76 : 0.36)) {
        if (turboActive) {
          this.turboSmashes += 1;
          this.damageEnemy(enemy, enemy.boss ? 92 : enemy.maxHp + 1, true);
          this.addScore(enemy.boss ? 2400 : 1150, true);
          this.message = "TURBO SMASH";
          this.messageTimer = 0.8;
        } else {
          const hard = this.options.difficulty === "hard";
          this.takeDamage(enemy.boss ? (hard ? 34 : 26) : (hard ? 22 : 16));
          enemy.alive = false;
        }
      }
      if (!enemy.boss && enemy.depth < ENEMY_FLYBY_CULL_DEPTH) {
        enemy.alive = false;
        this.chain = 0;
      }
    }
  }

  private enemyFire(enemy: ArcadeEnemy): void {
    const hard = this.options.difficulty === "hard";
    const threatBudget = hard ? MAX_ENEMY_PROJECTILES_HARD : MAX_ENEMY_PROJECTILES_NORMAL;
    const activeThreats = this.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.life > 0).length;
    const desiredSpread = enemy.boss ? (hard ? 4 : 3) : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;
    const spreadCount = Math.max(0, Math.min(desiredSpread, threatBudget - activeThreats));
    if (spreadCount <= 0) {
      enemy.fireCooldown = .38 + this.random() * .34;
      return;
    }
    for (let index = 0; index < spreadCount; index += 1) {
      const centered = index - (spreadCount - 1) * 0.5;
      const guidance = enemy.boss ? 1.34 : enemy.kind === "missile-boat" ? 1.52 : enemy.kind === "bomber" ? 1.26 : enemy.kind === "ace" ? 1.12 : 0.88;
      this.projectiles.push({
        id: this.nextEntityId++,
        owner: "enemy",
        x: enemy.x,
        y: enemy.y,
        depth: enemy.depth,
        targetEnemyId: null,
        speed: enemy.boss ? 17.5 : enemy.kind === "missile-boat" ? 15.5 : enemy.kind === "bomber" ? 14.5 : 13.2,
        damage: enemy.boss ? (hard ? 18 : 11) : hard ? 13 : 8,
        life: 5.6,
        vx: (this.playerX - enemy.x) * 0.28 + centered * 0.2,
        vy: (this.playerY - enemy.y) * 0.28 + centered * 0.11,
        guidance,
        nearMissChecked: false,
      });
    }
    const base = enemy.boss ? 1.38 : enemy.kind === "missile-boat" ? 1.68 : enemy.kind === "bomber" ? 1.9 : enemy.kind === "ace" ? 1.78 : 2.18;
    enemy.fireCooldown = base * (hard ? 0.8 : 1) * (0.84 + this.random() * 0.38);
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      projectile.life -= delta;
      if (projectile.life <= 0) continue;
      if (projectile.owner === "player-missile") {
        const target = this.enemies.find((enemy) => enemy.id === projectile.targetEnemyId && enemy.alive) ?? null;
        if (target) {
          projectile.x = moveToward(projectile.x, target.x, delta * 2.8);
          projectile.y = moveToward(projectile.y, target.y, delta * 2.8);
        }
        projectile.depth += projectile.speed * delta;
      } else if (projectile.owner === "player-gun") {
        const target = this.enemies.find((enemy) => enemy.id === projectile.targetEnemyId && enemy.alive) ?? null;
        if (target) {
          projectile.x = moveToward(projectile.x, target.x, delta * 2.2);
          projectile.y = moveToward(projectile.y, target.y, delta * 2.2);
        } else {
          projectile.x += projectile.vx * delta;
          projectile.y += projectile.vy * delta;
        }
        projectile.depth += projectile.speed * delta;
      } else {
        projectile.depth -= projectile.speed * delta;
        if (projectile.guidance > 0 && projectile.depth > 15) {
          const curvePhase = projectile.id * 1.731 + projectile.life * 4.6;
          const desiredVX = clamp((this.playerX - projectile.x) * 0.76 + Math.sin(curvePhase) * 0.46, -2.05, 2.05);
          const desiredVY = clamp((this.playerY - projectile.y) * 0.76 + Math.cos(curvePhase * 0.83) * 0.3, -1.78, 1.78);
          projectile.vx = moveToward(projectile.vx, desiredVX, delta * 2.15);
          projectile.vy = moveToward(projectile.vy, desiredVY, delta * 1.95);
          projectile.guidance = Math.max(0, projectile.guidance - delta);
        } else if (projectile.depth <= 15) {
          projectile.guidance = 0;
        }
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
      }

      if (projectile.owner === "enemy") {
        if (projectile.depth > 2.2) continue;
        const distance = Math.hypot(projectile.x - this.playerX, projectile.y - this.playerY);
        if (distance < 0.26) {
          projectile.life = 0;
          this.takeDamage(projectile.damage);
        } else if (!projectile.nearMissChecked && distance < 0.82) {
          projectile.nearMissChecked = true;
          this.nearMisses += 1;
          this.addScore(420, true);
          this.turbo = Math.min(100, this.turbo + 5);
          this.message = "NEAR MISS";
          this.messageTimer = 0.55;
        }
        if (projectile.depth < -3) projectile.life = 0;
        continue;
      }

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const depthDistance = Math.abs(projectile.depth - enemy.depth);
        if (depthDistance > (enemy.boss ? 3.2 : 1.9)) continue;
        const radius = enemy.boss ? 0.72 : enemy.kind === "bomber" ? 0.38 : 0.25;
        if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) > radius) continue;
        projectile.life = 0;
        this.damageEnemy(enemy, projectile.damage, projectile.owner === "player-missile");
        break;
      }
    }
  }

  private updateHazards(delta: number, turboActive: boolean): void {
    for (const hazard of this.hazards) {
      hazard.depth -= hazard.speed * (turboActive ? 1.24 : 1) * delta;
      if (hazard.depth > 2.4) continue;
      const radius = hazard.scale * (hazard.kind === "lightning" ? 0.55 : 0.42);
      const distance = Math.hypot(hazard.x - this.playerX, hazard.y - this.playerY);
      if (distance < radius) {
        hazard.depth = -10;
        if (turboActive && (hazard.kind === "mine" || hazard.kind === "debris")) {
          this.addScore(700, true);
          this.turboSmashes += 1;
          this.message = "HAZARD BREAK";
          this.messageTimer = 0.6;
        } else {
          const hard = this.options.difficulty === "hard";
          this.takeDamage(hazard.kind === "lightning" ? (hard ? 18 : 13) : (hard ? 24 : 18));
        }
      } else if (!hazard.nearMissChecked && distance < radius + 0.28) {
        hazard.nearMissChecked = true;
        this.nearMisses += 1;
        this.addScore(620, true);
        this.turbo = Math.min(100, this.turbo + 7);
      }
      if (hazard.depth < -5) hazard.depth = -10;
    }
  }

  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive) return;
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.hitSerial += 1;
    if (enemy.hp > 0) return;
    enemy.alive = false;
    enemy.locked = false;
    this.enemiesDefeated += 1;
    this.chain = Math.min(99, this.chain + 1);
    this.chainTimer = 4.6;
    this.addScore(enemy.scoreValue, this.input.turbo);
    if (missile && this.projectiles.filter((projectile) => projectile.owner === "player-missile" && projectile.life > 0).length >= 2) {
      this.multiLockKills += 1;
      this.addScore(350, true);
    }
    if (!enemy.boss) return;
    this.bossDefeated = true;
    this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · EXIT COURSE";
    this.messageTimer = 2.4;
    if (this.stageTime >= this.stage.durationSeconds) this.completeStage();
  }

  private addScore(base: number, risk: boolean): void {
    const chainMultiplier = 1 + Math.min(12, this.chain) * 0.1;
    const riskMultiplier = risk ? 1.25 : 1;
    this.score += Math.round(base * chainMultiplier * riskMultiplier);
  }

  private takeDamage(amount: number): void {
    // Prevent overlapping missiles/fly-bys from deleting the airframe in a single unreadable burst.
    if (this.damageCooldown > 0) return;
    this.damageCooldown = this.options.difficulty === "hard" ? .28 : .5;
    const effective = this.input.turbo ? amount * 0.72 : amount;
    this.playerHp = Math.max(0, this.playerHp - effective);
    this.damageTaken += effective;
    this.chain = 0;
    this.chainTimer = 0;
    this.damageSerial += 1;
    this.message = "DAMAGE";
    this.messageTimer = 0.55;
  }

  private enterContinue(): void {
    this.releaseInputs();
    this.status = this.continuesRemaining > 0 ? "continue" : "game-over";
    this.message = this.continuesRemaining > 0 ? "AIRFRAME LOST" : "MISSION FAILED";
    this.messageTimer = 999;
  }

  private breakClimaxTargetAtCourseEnd(): void {
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss);
    if (boss) {
      boss.alive = false;
      boss.locked = false;
    }
    this.bossDefeated = true;
    this.message = "COURSE BREAK · ROUTE CONTINUES";
    this.messageTimer = 0.8;
  }

  private completeStage(): void {
    if (this.status !== "running") return;
    const stageScore = this.score - this.stageStats.scoreAtStart;
    const stageDamage = this.damageTaken - this.stageStats.damageAtStart;
    const rank = skyDancerArcadeRankForScore(stageScore, 1, stageDamage, 0);
    this.stagesCleared += 1;
    this.lastClearedStageId = this.stage.id;
    this.lastStageScore = stageScore;
    this.lastStageRank = rank;
    this.lastStageNoDamage = stageDamage <= 0.001;
    this.status = "stage-clear";
    this.resultTimer = this.options.mode === "stage-practice" ? PRACTICE_RESULT_SECONDS : ARCADE_SECTION_RESULT_SECONDS;
    this.resultSerial += 1;
    this.releaseInputs();
  }

  private advanceAfterStageClear(): void {
    if (this.options.mode === "stage-practice") {
      this.status = "practice-clear";
      this.message = "PRACTICE COMPLETE";
      return;
    }
    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE || this.stage.next.length === 0) {
      this.status = "run-clear";
      this.message = "ARCADE RUN CLEAR";
      return;
    }
    const nextId = this.branchSelection ?? this.stage.next[0];
    if (!nextId) {
      this.status = "run-clear";
      return;
    }
    this.stage = skyDancerArcadeStageById(nextId);
    this.route.push(nextId);
    this.stageNumber += 1;
    this.status = "running";
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + 28);
    this.turbo = Math.min(100, this.turbo + 38);
    this.message = `${this.stage.name} · DROP IN`;
    this.messageTimer = 2.8;
    this.stageSerial += 1;
    this.resetStageState(0);
  }

  private cleanupEntities(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.alive && enemy.depth > -13);
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && projectile.depth > -5 && projectile.depth < 145);
    this.hazards = this.hazards.filter((hazard) => hazard.depth > -6);
  }

  getSnapshot(): SkyDancerArcadeSnapshot {
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss) ?? null;
    const lockedCount = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;
    const stageScore = this.score - this.stageStats.scoreAtStart;
    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));
    const rank = skyDancerArcadeRankForScore(this.score, activeStageCount, this.damageTaken, this.continuesUsed);
    return {
      status: this.status,
      difficulty: this.options.difficulty,
      mode: this.options.mode,
      stage: this.stage,
      stageNumber: this.stageNumber,
      stagesCleared: this.stagesCleared,
      route: [...this.route],
      stageTimeSeconds: this.stageTime,
      stageDurationSeconds: this.stage.durationSeconds,
      stageProgress: clamp(this.stageTime / this.stage.durationSeconds, 0, 1),
      runTimeSeconds: this.runTime,
      runDurationSeconds: SKY_DANCER_ARCADE_RUN_DURATION_SECONDS,
      distance: this.distance,
      playerX: this.playerX,
      playerY: this.playerY,
      playerHp: this.playerHp,
      playerMaxHp: PLAYER_MAX_HP,
      turbo: this.turbo,
      turboActive: this.input.turbo && this.turbo > 0.5,
      fireActive: this.input.fire,
      lockActive: this.input.lock,
      lockedCount,
      score: this.score,
      stageScore,
      rank,
      chain: this.chain,
      chainTimer: this.chainTimer,
      enemiesDefeated: this.enemiesDefeated,
      damageTaken: this.damageTaken,
      nearMisses: this.nearMisses,
      multiLockKills: this.multiLockKills,
      turboSmashes: this.turboSmashes,
      continuesRemaining: this.continuesRemaining,
      continuesUsed: this.continuesUsed,
      branchActive: this.branchActive,
      branchOptions: this.stage.next,
      branchSelection: this.branchSelection,
      bossActive: Boolean(boss),
      bossName: this.stage.bossName,
      bossHp: boss?.hp ?? (this.bossDefeated ? 0 : 1),
      bossMaxHp: boss?.maxHp ?? (this.bossDefeated ? 1 : 1),
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.x,
        y: enemy.y,
        depth: enemy.depth,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        locked: enemy.locked,
        boss: enemy.boss,
        phase: enemy.phase,
        maneuver: enemy.maneuver,
      })),
      projectiles: this.projectiles.filter((projectile) => projectile.life > 0).map((projectile) => ({
        id: projectile.id,
        owner: projectile.owner,
        x: projectile.x,
        y: projectile.y,
        depth: projectile.depth,
        targetEnemyId: projectile.targetEnemyId,
      })),
      hazards: this.hazards.map((hazard) => ({
        id: hazard.id,
        kind: hazard.kind,
        x: hazard.x,
        y: hazard.y,
        depth: hazard.depth,
        scale: hazard.scale,
      })),
      resultTimer: this.resultTimer,
      lastClearedStageId: this.lastClearedStageId,
      lastStageScore: this.lastStageScore,
      lastStageRank: this.lastStageRank,
      lastStageNoDamage: this.lastStageNoDamage,
      message: this.message,
      shotSerial: this.shotSerial,
      missileSerial: this.missileSerial,
      hitSerial: this.hitSerial,
      damageSerial: this.damageSerial,
      stageSerial: this.stageSerial,
      resultSerial: this.resultSerial,
    };
  }

  /** Purely deterministic hook used by rule tests; production progression still requires defeating the boss. */
  completeCurrentStageForTests(routeChoice?: SkyDancerArcadeStageId): void {
    if (routeChoice && this.stage.next.includes(routeChoice)) this.branchSelection = routeChoice;
    this.bossSpawned = true;
    this.bossDefeated = true;
    this.runTime += Math.max(0, this.stage.durationSeconds - this.stageTime);
    this.stageTime = this.stage.durationSeconds;
    this.completeStage();
  }

  advanceResultForTests(): void {
    if (this.status !== "stage-clear") return;
    this.resultTimer = 0;
    this.advanceAfterStageClear();
  }

  /** Marks the climax target down without skipping course time. */
  defeatBossEarlyForTests(stageTimeSeconds: number): void {
    if (this.status !== "running") return;
    this.bossSpawned = true;
    this.bossDefeated = true;
    this.enemies = [];
    this.stageTime = clamp(stageTimeSeconds, 0, this.stage.durationSeconds);
    this.distance = this.stageTime * this.stage.courseSpeed;
  }
}
