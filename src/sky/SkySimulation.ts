import type { SkyBulletState, SkyEnemyState, SkyPhase, SkyPlatformState, SkySnapshot, SkyStats } from "./SkyTypes";

const FIXED_STEP = 1 / 60;
const WORLD_SPEED = 18;
const BULLET_SPEED = 58;
const PLAYER_MIN_X = -10;
const PLAYER_MAX_X = 10;
const PLAYER_MIN_Y = 3.2;
const PLAYER_MAX_Y = 11.5;
const PLAYER_START_Y = 6.5;
const PLATFORM_COUNT = 9;
const PLATFORM_DEPTH = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function approach(current: number, target: number, amount: number): number {
  if (current < target) return Math.min(target, current + amount);
  return Math.max(target, current - amount);
}

function distanceSquared(aX: number, aY: number, aZ: number, bX: number, bY: number, bZ: number): number {
  return (aX - bX) ** 2 + (aY - bY) ** 2 + (aZ - bZ) ** 2;
}

export class SkySimulation {
  readonly plane = { x: 0, y: PLAYER_START_Y, z: 0, speed: WORLD_SPEED };
  readonly enemies: SkyEnemyState[] = [];
  readonly bullets: SkyBulletState[] = [];
  readonly platforms: SkyPlatformState[] = [];
  phase: SkyPhase = "ready";
  score = 0;
  hull = 5;
  readonly maxHull = 5;
  wave = 1;
  shots = 0;
  hits = 0;
  message = "STARTで飛行開始";

  private moveX = 0;
  private moveY = 0;
  private fireHeld = false;
  private fireCooldown = 0;
  private spawnCooldown = 0.45;
  private elapsed = 0;
  private nextEnemyId = 1;
  private nextBulletId = 1;
  private randomState = 0x51da7ce;

  constructor() {
    this.resetPlatforms();
  }

  reset(): void {
    this.phase = "ready";
    this.score = 0;
    this.hull = this.maxHull;
    this.wave = 1;
    this.shots = 0;
    this.hits = 0;
    this.message = "STARTで飛行開始";
    this.moveX = 0;
    this.moveY = 0;
    this.fireHeld = false;
    this.fireCooldown = 0;
    this.spawnCooldown = 0.45;
    this.elapsed = 0;
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.plane.x = 0;
    this.plane.y = PLAYER_START_Y;
    this.plane.z = 0;
    this.plane.speed = WORLD_SPEED;
    this.resetPlatforms();
  }

  start(): void {
    if (this.phase === "gameover") this.reset();
    if (this.phase === "ready") {
      this.phase = "running";
      this.message = "WAVE 01 // FIRE";
    }
  }

  setMove(x: number, y: number): void {
    this.moveX = clamp(Number.isFinite(x) ? x : 0, -1, 1);
    this.moveY = clamp(Number.isFinite(y) ? y : 0, -1, 1);
  }

  setFire(active: boolean): void {
    this.fireHeld = active;
  }

  step(deltaSeconds: number): void {
    if (this.phase !== "running") return;
    const delta = Math.min(0.05, Math.max(0, deltaSeconds));
    this.elapsed += delta;
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.spawnCooldown -= delta;

    const movementRate = 13.5;
    this.plane.x = approach(this.plane.x, clamp(this.moveX * 9.3, PLAYER_MIN_X, PLAYER_MAX_X), movementRate * delta);
    this.plane.y = approach(this.plane.y, clamp(PLAYER_START_Y + this.moveY * 4.4, PLAYER_MIN_Y, PLAYER_MAX_Y), movementRate * delta);

    if (this.fireHeld && this.fireCooldown <= 0) this.fire();
    if (this.spawnCooldown <= 0) {
      this.spawnEnemy();
      const pressure = Math.min(0.46, (this.wave - 1) * 0.035);
      this.spawnCooldown = Math.max(0.33, 0.96 - pressure) * (0.82 + this.nextRandom() * 0.38);
    }

    for (const platform of this.platforms) {
      platform.z += this.plane.speed * delta;
      if (platform.z > 44) {
        const furthest = Math.min(...this.platforms.map((item) => item.z));
        platform.z = furthest - PLATFORM_DEPTH;
        platform.x = (this.nextRandom() - 0.5) * 3;
        platform.rotation = (this.nextRandom() - 0.5) * 0.035;
      }
    }

    for (const bullet of this.bullets) bullet.z -= BULLET_SPEED * delta;
    for (const enemy of this.enemies) {
      enemy.z += this.plane.speed * delta;
      enemy.x += Math.sin(this.elapsed * 2.1 + enemy.phase) * delta * 1.5;
      enemy.y += Math.cos(this.elapsed * 1.7 + enemy.phase * 1.4) * delta * 0.85;
    }

    this.resolveCollisions();
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      if (this.bullets[index].z < -112) this.bullets.splice(index, 1);
    }
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (enemy.z > 4.5) {
        this.enemies.splice(index, 1);
        this.hull -= 1;
        this.message = this.hull > 0 ? "WARNING // IMPACT" : "AIRFRAME LOST";
        if (this.hull <= 0) this.phase = "gameover";
      }
    }

    this.wave = 1 + Math.floor(this.score / 100);
    this.plane.speed = WORLD_SPEED + Math.min(8, (this.wave - 1) * 0.7);
  }

  getSnapshot(): SkySnapshot {
    return {
      plane: { ...this.plane },
      enemies: this.enemies,
      bullets: this.bullets,
      platforms: this.platforms,
    };
  }

  getStats(renderer: SkyStats["renderer"]): SkyStats {
    return {
      phase: this.phase,
      score: this.score,
      hull: this.hull,
      maxHull: this.maxHull,
      wave: this.wave,
      enemies: this.enemies.length,
      shots: this.shots,
      hits: this.hits,
      speed: this.plane.speed,
      message: this.message,
      plane: { ...this.plane },
      renderer,
    };
  }

  private fire(): void {
    this.fireCooldown = 0.15;
    this.shots += 1;
    this.bullets.push({ id: this.nextBulletId++, x: this.plane.x, y: this.plane.y, z: -1.8 });
  }

  private spawnEnemy(): void {
    const lane = this.nextRandom() * 2 - 1;
    const enemy: SkyEnemyState = {
      id: this.nextEnemyId++,
      x: lane * 8.2,
      y: 4.1 + this.nextRandom() * 5.8,
      z: -70 - this.nextRandom() * 46,
      phase: this.nextRandom() * Math.PI * 2,
    };
    this.enemies.push(enemy);
  }

  private resolveCollisions(): void {
    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = this.bullets[bulletIndex];
      let hitIndex = -1;
      for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = this.enemies[enemyIndex];
        if (distanceSquared(bullet.x, bullet.y, bullet.z, enemy.x, enemy.y, enemy.z) < 2.1) {
          hitIndex = enemyIndex;
          break;
        }
      }
      if (hitIndex < 0) continue;
      this.bullets.splice(bulletIndex, 1);
      this.enemies.splice(hitIndex, 1);
      this.hits += 1;
      this.score += 25;
      this.message = "TARGET DOWN";
    }
  }

  private resetPlatforms(): void {
    this.platforms.length = 0;
    for (let index = 0; index < PLATFORM_COUNT; index += 1) {
      this.platforms.push({
        id: index,
        x: (index % 3 - 1) * 1.2,
        y: 0.15,
        z: 34 - index * PLATFORM_DEPTH,
        width: 31 + (index % 2) * 5,
        depth: PLATFORM_DEPTH,
        rotation: (index % 2 === 0 ? 1 : -1) * 0.025,
      });
    }
  }

  private nextRandom(): number {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return this.randomState / 0x100000000;
  }
}

export { FIXED_STEP };
