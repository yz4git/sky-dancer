from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'anchor not found in {path}: {old[:160]!r}')
    p.write_text(text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# WORLD BREAK model: activate final worlds and author their physical contracts.
# ---------------------------------------------------------------------------
world = 'src/sky/arcade/SkyDancerArcadeV40WorldBreak.ts'
patch(world,
'''export interface SkyDancerArcadeV40PortalDefinition {
  index: number;
  x: number;
  y: number;
  radius: number;
  doctrine: SkyDancerArcadeV40PortalDoctrine;
  label: string;
  score: number;
  scoreMultiplier: number;
  pressureScale: number;
  hpRecovery: number;
  turboRecovery: number;
}

const PROFILES:''',
'''export interface SkyDancerArcadeV40PortalDefinition {
  index: number;
  x: number;
  y: number;
  radius: number;
  doctrine: SkyDancerArcadeV40PortalDoctrine;
  label: string;
  score: number;
  scoreMultiplier: number;
  pressureScale: number;
  hpRecovery: number;
  turboRecovery: number;
}

export interface SkyDancerArcadeV40PrismTrialDefinition {
  index: number;
  progress: number;
  x: number;
  y: number;
  radius: number;
  score: number;
}

const PROFILES:''')
patch(world,
'''  "orbital-ascent": { stageId: "orbital-ascent", objective: "CLIMB THE DEBRIS SHAFT", signature: "ZERO-G ASCENT", live: false },
  "prism-citadel": { stageId: "prism-citadel", objective: "BREAK THE SEVEN SKIES", signature: "ROUTE REPRISE", live: false },''',
'''  "orbital-ascent": { stageId: "orbital-ascent", objective: "CLIMB THE DEBRIS SHAFT", signature: "ZERO-G ASCENT", live: true },
  "prism-citadel": { stageId: "prism-citadel", objective: "BREAK THE SEVEN SKIES", signature: "ROUTE REPRISE", live: true },''')
patch(world,
'''export function skyDancerArcadeV40NeonPhantomX(stageTimeSeconds: number): number {''',
'''export const SKY_DANCER_ARCADE_V40_ORBIT_START = .1;
export const SKY_DANCER_ARCADE_V40_ORBIT_END = .42;
export const SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE = 100;
export const SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH = .86;
export const SKY_DANCER_ARCADE_V40_ORBIT_COMPLETE_SCORE = 6200;
export const SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS = 1.35;

export const SKY_DANCER_ARCADE_V40_PRISM_TRIALS: readonly SkyDancerArcadeV40PrismTrialDefinition[] = [
  { index: 0, progress: .105, x: -1.04, y: .18, radius: .82, score: 1250 },
  { index: 1, progress: .15, x: .86, y: -.2, radius: .77, score: 1450 },
  { index: 2, progress: .195, x: -.28, y: .38, radius: .73, score: 1700 },
  { index: 3, progress: .24, x: 1.02, y: .08, radius: .69, score: 2050 },
  { index: 4, progress: .285, x: -.92, y: -.27, radius: .65, score: 2400 },
  { index: 5, progress: .33, x: .36, y: .3, radius: .62, score: 2850 },
  { index: 6, progress: .375, x: 0, y: 0, radius: .58, score: 3600 },
];
export const SKY_DANCER_ARCADE_V40_PRISM_PERFECT_BONUS = 7800;
export const SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE: readonly SkyDancerArcadeStageId[] = [
  "dawn-city", "red-canyon", "storm-carrier", "ice-cavern", "night-metro", "orbital-ascent", "prism-citadel",
];

export function skyDancerArcadeV40OrbitalSafeX(stageTimeSeconds: number): number {
  const time = Math.max(0, stageTimeSeconds);
  return Math.sin(time * 1.55) * .86 + Math.sin(time * 3.8 + .7) * .18;
}

export function skyDancerArcadeV40PrismTrialAnchorDistance(
  trial: SkyDancerArcadeV40PrismTrialDefinition,
  stageDurationSeconds: number,
  courseSpeed: number,
): number {
  return Math.max(0, stageDurationSeconds) * Math.max(0, courseSpeed) * trial.progress;
}

export function skyDancerArcadeV40PrismTrialStageId(route: readonly SkyDancerArcadeStageId[], index: number): SkyDancerArcadeStageId {
  if (index >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length - 1) return "prism-citadel";
  const flown = route.filter((stageId) => stageId !== "prism-citadel");
  return flown[index] ?? SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE[index] ?? "dawn-city";
}

function skyDancerArcadeV40StagePhase(stageId: SkyDancerArcadeStageId): number {
  let value = 0;
  for (let index = 0; index < stageId.length; index += 1) value += stageId.charCodeAt(index) * (index + 3);
  return value * .013;
}

export function skyDancerArcadeV40PrismTrialX(
  trial: SkyDancerArcadeV40PrismTrialDefinition,
  stageId: SkyDancerArcadeStageId,
  stageTimeSeconds: number,
): number {
  return trial.x + Math.sin(Math.max(0, stageTimeSeconds) * 1.72 + skyDancerArcadeV40StagePhase(stageId) + trial.index) * .18;
}

export function skyDancerArcadeV40PrismTrialY(
  trial: SkyDancerArcadeV40PrismTrialDefinition,
  stageId: SkyDancerArcadeStageId,
  stageTimeSeconds: number,
): number {
  return trial.y + Math.cos(Math.max(0, stageTimeSeconds) * 1.33 + skyDancerArcadeV40StagePhase(stageId) * .7 + trial.index) * .12;
}

export function skyDancerArcadeV40NeonPhantomX(stageTimeSeconds: number): number {''')

# ---------------------------------------------------------------------------
# Runtime contract, state, simulation, snapshots and deterministic test hooks.
# ---------------------------------------------------------------------------
runtime = 'src/sky/arcade/SkyDancerArcadeRuntime.ts'
patch(runtime,
'''  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,''',
'''  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS,
  SKY_DANCER_ARCADE_V40_ORBIT_COMPLETE_SCORE,
  SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH,
  SKY_DANCER_ARCADE_V40_ORBIT_END,
  SKY_DANCER_ARCADE_V40_ORBIT_START,
  SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS,
  SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE,
  SKY_DANCER_ARCADE_V40_PRISM_PERFECT_BONUS,
  SKY_DANCER_ARCADE_V40_PRISM_TRIALS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,''')
patch(runtime,
'''  skyDancerArcadeV40NeonPhantomY,
  skyDancerArcadeV40StormLaneAnchorDistance,''',
'''  skyDancerArcadeV40NeonPhantomY,
  skyDancerArcadeV40OrbitalSafeX,
  skyDancerArcadeV40PrismTrialAnchorDistance,
  skyDancerArcadeV40PrismTrialStageId,
  skyDancerArcadeV40PrismTrialX,
  skyDancerArcadeV40PrismTrialY,
  skyDancerArcadeV40StormLaneAnchorDistance,''')
patch(runtime,
'''  worldBreakMagmaEscaped: boolean;
  worldBreakMagmaSerial: number;
  enemies: SkyDancerArcadeEnemySnapshot[];''',
'''  worldBreakMagmaEscaped: boolean;
  worldBreakMagmaSerial: number;
  worldBreakOrbitActive: boolean;
  worldBreakOrbitSafeX: number;
  worldBreakOrbitWidth: number;
  worldBreakOrbitAltitude: number;
  worldBreakOrbitTargetAltitude: number;
  worldBreakOrbitAligned: boolean;
  worldBreakOrbitStrikes: number;
  worldBreakOrbitResolved: boolean;
  worldBreakOrbitComplete: boolean;
  worldBreakOrbitSerial: number;
  worldBreakPrismActive: boolean;
  worldBreakPrismIndex: number;
  worldBreakPrismTotal: number;
  worldBreakPrismHits: number;
  worldBreakPrismMisses: number;
  worldBreakPrismSerial: number;
  worldBreakPrismLabel: string | null;
  worldBreakPrismX: number;
  worldBreakPrismY: number;
  worldBreakPrismDepth: number;
  worldBreakPrismRadius: number;
  worldBreakPrismComplete: boolean;
  worldBreakPrismPerfect: boolean;
  enemies: SkyDancerArcadeEnemySnapshot[];''')
patch(runtime,
'''  private worldBreakMagmaResolved = false;
  private worldBreakMagmaEscaped = false;
  private worldBreakMagmaSerial = 0;
  private nextEntityId = 1;''',
'''  private worldBreakMagmaResolved = false;
  private worldBreakMagmaEscaped = false;
  private worldBreakMagmaSerial = 0;
  private worldBreakOrbitAltitude = 0;
  private worldBreakOrbitStrikeTimer = 0;
  private worldBreakOrbitStrikes = 0;
  private worldBreakOrbitTick = 0;
  private worldBreakOrbitResolved = false;
  private worldBreakOrbitComplete = false;
  private worldBreakOrbitResolvedAt = -1;
  private worldBreakOrbitSerial = 0;
  private worldBreakPrismHits = 0;
  private worldBreakPrismMisses = 0;
  private worldBreakPrismSerial = 0;
  private worldBreakPrismResolvedAt = -1;
  private readonly worldBreakResolvedPrismTrialIndices = new Set<number>();
  private nextEntityId = 1;''')
patch(runtime,
'''      this.worldBreakMagmaHits = 0;
      this.worldBreakMagmaResolved = false;
      this.worldBreakMagmaEscaped = false;
    }
    this.worldBreakGates =''',
'''      this.worldBreakMagmaHits = 0;
      this.worldBreakMagmaResolved = false;
      this.worldBreakMagmaEscaped = false;
      this.worldBreakOrbitAltitude = 0;
      this.worldBreakOrbitStrikeTimer = 0;
      this.worldBreakOrbitStrikes = 0;
      this.worldBreakOrbitTick = 0;
      this.worldBreakOrbitResolved = false;
      this.worldBreakOrbitComplete = false;
      this.worldBreakOrbitResolvedAt = -1;
      this.worldBreakPrismHits = 0;
      this.worldBreakPrismMisses = 0;
      this.worldBreakPrismResolvedAt = -1;
      this.worldBreakResolvedPrismTrialIndices.clear();
    }
    this.worldBreakGates =''')
patch(runtime,
'''    this.updateWorldBreakNeonPursuit(delta, turboActive);
    this.updateWorldBreakMagmaPressure(delta, turboActive);
    this.updateBranch();''',
'''    this.updateWorldBreakNeonPursuit(delta, turboActive);
    this.updateWorldBreakMagmaPressure(delta, turboActive);
    this.updateWorldBreakOrbitalAscent(delta, turboActive);
    this.updateWorldBreakPrismReprise();
    this.updateBranch();''')
patch(runtime,
'''  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {''',
'''  private updateWorldBreakOrbitalAscent(delta: number, turboActive: boolean): void {
    if (this.stage.id !== "orbital-ascent" || this.worldBreakOrbitResolved) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < SKY_DANCER_ARCADE_V40_ORBIT_START) return;
    if (progress > SKY_DANCER_ARCADE_V40_ORBIT_END) {
      this.worldBreakOrbitResolved = true;
      this.worldBreakOrbitResolvedAt = this.stageTime;
      this.worldBreakOrbitComplete = this.worldBreakOrbitAltitude >= SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE;
      this.worldBreakOrbitSerial += 1;
      this.message = `ZERO-G ASCENT · SHAFT LOST · ALT ${Math.round(this.worldBreakOrbitAltitude)}`;
      this.messageTimer = 1.35;
      return;
    }
    const safeX = skyDancerArcadeV40OrbitalSafeX(this.stageTime);
    const aligned = Math.abs(this.playerX - safeX) <= SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH && this.playerY >= .18;
    if (aligned) {
      const climbRate = 4.8 + Math.max(0, this.playerY) * 1.35 + (turboActive ? 8.4 : 0);
      this.worldBreakOrbitAltitude = Math.min(SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE, this.worldBreakOrbitAltitude + climbRate * delta);
      this.worldBreakOrbitStrikeTimer = Math.max(0, this.worldBreakOrbitStrikeTimer - delta * .7);
      const nextTick = Math.floor(this.worldBreakOrbitAltitude / 20);
      while (this.worldBreakOrbitTick < nextTick) {
        this.worldBreakOrbitTick += 1;
        this.addScore(520 + this.worldBreakOrbitTick * 120, true);
        this.turbo = Math.min(100, this.turbo + 4);
        this.worldBreakOrbitSerial += 1;
      }
    } else {
      this.worldBreakOrbitAltitude = Math.max(0, this.worldBreakOrbitAltitude - delta * 1.05);
      this.worldBreakOrbitStrikeTimer += delta;
      if (this.worldBreakOrbitStrikeTimer >= SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS) {
        this.worldBreakOrbitStrikeTimer = 0;
        this.worldBreakOrbitStrikes += 1;
        this.worldBreakOrbitSerial += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 16 : 12);
        this.message = `ZERO-G ASCENT · DEBRIS STRIKE ${this.worldBreakOrbitStrikes} · FIND AXIS`;
        this.messageTimer = 1.05;
      }
    }
    if (this.worldBreakOrbitAltitude < SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE) return;
    this.worldBreakOrbitComplete = true;
    this.worldBreakOrbitResolved = true;
    this.worldBreakOrbitResolvedAt = this.stageTime;
    this.worldBreakOrbitSerial += 1;
    const awarded = this.addScore(SKY_DANCER_ARCADE_V40_ORBIT_COMPLETE_SCORE, true);
    this.turbo = Math.min(100, this.turbo + 22);
    this.message = `WORLD BREAK · ZERO-G ASCENT CLEAR · +${awarded}`;
    this.messageTimer = 1.65;
  }

  private updateWorldBreakPrismReprise(): void {
    if (this.stage.id !== "prism-citadel") return;
    for (const trial of SKY_DANCER_ARCADE_V40_PRISM_TRIALS) {
      if (this.worldBreakResolvedPrismTrialIndices.has(trial.index)) continue;
      const anchorDistance = skyDancerArcadeV40PrismTrialAnchorDistance(trial, this.stage.durationSeconds, this.stage.courseSpeed);
      const depth = anchorDistance - this.distance;
      if (depth > 2.4) return;
      const routeStageId = skyDancerArcadeV40PrismTrialStageId(this.route, trial.index);
      const x = skyDancerArcadeV40PrismTrialX(trial, routeStageId, this.stageTime);
      const y = skyDancerArcadeV40PrismTrialY(trial, routeStageId, this.stageTime);
      const clean = Math.hypot((this.playerX - x) / trial.radius, (this.playerY - y) / trial.radius) <= 1;
      this.worldBreakResolvedPrismTrialIndices.add(trial.index);
      this.worldBreakPrismSerial += 1;
      const label = `${skyDancerArcadeV40WorldProfile(routeStageId).signature} REPRISE`;
      if (clean) {
        this.worldBreakPrismHits += 1;
        const awarded = this.addScore(trial.score + this.worldBreakPrismHits * 190, true);
        this.turbo = Math.min(100, this.turbo + 7);
        this.message = `${label} · SKY ${trial.index + 1} BROKEN · +${awarded}`;
      } else {
        this.worldBreakPrismMisses += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 15 : 11);
        this.message = `${label} · SKY ${trial.index + 1} FRACTURED`;
      }
      this.messageTimer = 1.12;
      if (this.worldBreakResolvedPrismTrialIndices.size >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length) {
        this.worldBreakPrismResolvedAt = this.stageTime;
        if (this.worldBreakPrismMisses === 0) {
          const awarded = this.addScore(SKY_DANCER_ARCADE_V40_PRISM_PERFECT_BONUS, true);
          this.turbo = Math.min(100, this.turbo + 24);
          this.worldBreakPrismSerial += 1;
          this.message = `WORLD BREAK · SEVEN SKIES BREAK · +${awarded}`;
          this.messageTimer = 1.8;
        } else {
          this.message = `ROUTE REPRISE · SEVEN SKIES CLEARED · MISS ${this.worldBreakPrismMisses}`;
          this.messageTimer = 1.55;
        }
      }
      return;
    }
  }

  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {''')

# Snapshot locals for final two World Breaks.
patch(runtime,
'''    const magmaActive = this.stage.id === "volcano-core"
      && !this.worldBreakMagmaResolved
      && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_MAGMA_START
      && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_MAGMA_END;
    const activeStageCount =''',
'''    const magmaActive = this.stage.id === "volcano-core"
      && !this.worldBreakMagmaResolved
      && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_MAGMA_START
      && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_MAGMA_END;
    const orbitExitAge = this.worldBreakOrbitResolvedAt >= 0 ? this.stageTime - this.worldBreakOrbitResolvedAt : Infinity;
    const orbitSafeX = this.stage.id === "orbital-ascent" ? skyDancerArcadeV40OrbitalSafeX(this.stageTime) : 0;
    const orbitAligned = this.stage.id === "orbital-ascent"
      && Math.abs(this.playerX - orbitSafeX) <= SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH
      && this.playerY >= .18;
    const orbitActive = this.stage.id === "orbital-ascent"
      && ((!this.worldBreakOrbitResolved
        && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_ORBIT_START
        && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_ORBIT_END)
        || (this.worldBreakOrbitComplete && orbitExitAge <= 1.1));
    const unresolvedPrismTrial = this.stage.id === "prism-citadel"
      ? SKY_DANCER_ARCADE_V40_PRISM_TRIALS.find((trial) => !this.worldBreakResolvedPrismTrialIndices.has(trial.index)) ?? null
      : null;
    const prismExitAge = this.worldBreakPrismResolvedAt >= 0 ? this.stageTime - this.worldBreakPrismResolvedAt : Infinity;
    const prismTrial = unresolvedPrismTrial ?? (this.stage.id === "prism-citadel" && prismExitAge <= 1.05 ? SKY_DANCER_ARCADE_V40_PRISM_TRIALS.at(-1) ?? null : null);
    const prismRouteStageId = prismTrial ? skyDancerArcadeV40PrismTrialStageId(this.route, prismTrial.index) : null;
    const prismDepth = prismTrial
      ? skyDancerArcadeV40PrismTrialAnchorDistance(prismTrial, this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const prismX = prismTrial && prismRouteStageId ? skyDancerArcadeV40PrismTrialX(prismTrial, prismRouteStageId, this.stageTime) : 0;
    const prismY = prismTrial && prismRouteStageId ? skyDancerArcadeV40PrismTrialY(prismTrial, prismRouteStageId, this.stageTime) : 0;
    const prismLabel = prismRouteStageId ? `${skyDancerArcadeV40WorldProfile(prismRouteStageId).signature} REPRISE` : null;
    const activeStageCount =''')
patch(runtime,
'''      worldBreakMagmaEscaped: this.worldBreakMagmaEscaped,
      worldBreakMagmaSerial: this.worldBreakMagmaSerial,
      enemies:''',
'''      worldBreakMagmaEscaped: this.worldBreakMagmaEscaped,
      worldBreakMagmaSerial: this.worldBreakMagmaSerial,
      worldBreakOrbitActive: orbitActive,
      worldBreakOrbitSafeX: orbitSafeX,
      worldBreakOrbitWidth: SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH,
      worldBreakOrbitAltitude: this.worldBreakOrbitAltitude,
      worldBreakOrbitTargetAltitude: SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE,
      worldBreakOrbitAligned: orbitAligned,
      worldBreakOrbitStrikes: this.worldBreakOrbitStrikes,
      worldBreakOrbitResolved: this.worldBreakOrbitResolved,
      worldBreakOrbitComplete: this.worldBreakOrbitComplete,
      worldBreakOrbitSerial: this.worldBreakOrbitSerial,
      worldBreakPrismActive: Boolean(prismTrial && prismDepth > -14 && prismDepth < 145),
      worldBreakPrismIndex: prismTrial?.index ?? -1,
      worldBreakPrismTotal: this.stage.id === "prism-citadel" ? SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length : 0,
      worldBreakPrismHits: this.worldBreakPrismHits,
      worldBreakPrismMisses: this.worldBreakPrismMisses,
      worldBreakPrismSerial: this.worldBreakPrismSerial,
      worldBreakPrismLabel: prismLabel,
      worldBreakPrismX: prismX,
      worldBreakPrismY: prismY,
      worldBreakPrismDepth: prismDepth,
      worldBreakPrismRadius: prismTrial?.radius ?? 0,
      worldBreakPrismComplete: this.stage.id === "prism-citadel" && this.worldBreakResolvedPrismTrialIndices.size >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length,
      worldBreakPrismPerfect: this.stage.id === "prism-citadel" && this.worldBreakResolvedPrismTrialIndices.size >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length && this.worldBreakPrismMisses === 0,
      enemies:''')

# Deterministic Phase6 hooks.
patch(runtime,
'''  /** Deterministic V12 hook for adaptive encounter regression tests. */''',
'''  triggerV40OrbitalAscentForTests(clean: boolean): void {
    if (this.stage.id !== "orbital-ascent") return;
    this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_ORBIT_START + .03);
    this.distance = this.stageTime * this.stage.courseSpeed;
    const safeX = skyDancerArcadeV40OrbitalSafeX(this.stageTime);
    this.playerX = clean ? clamp(safeX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = clean ? .9 : -PLAYER_Y_LIMIT;
    if (clean) {
      this.worldBreakOrbitAltitude = 4;
      this.updateWorldBreakOrbitalAscent(8, true);
    } else {
      this.updateWorldBreakOrbitalAscent(SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS + .08, false);
    }
  }

  triggerV40PrismTrialForTests(index: number, clean: boolean): void {
    if (this.stage.id !== "prism-citadel") return;
    const trial = SKY_DANCER_ARCADE_V40_PRISM_TRIALS.find((candidate) => candidate.index === index);
    if (!trial) return;
    const anchorDistance = skyDancerArcadeV40PrismTrialAnchorDistance(trial, this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    const routeStageId = skyDancerArcadeV40PrismTrialStageId(this.route, trial.index);
    this.playerX = clean ? clamp(skyDancerArcadeV40PrismTrialX(trial, routeStageId, this.stageTime), -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = clean ? clamp(skyDancerArcadeV40PrismTrialY(trial, routeStageId, this.stageTime), -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT) : PLAYER_Y_LIMIT;
    this.updateWorldBreakPrismReprise();
  }

  /** Deterministic V12 hook for adaptive encounter regression tests. */''')

# ---------------------------------------------------------------------------
# WebGL: zero-G shaft + route reprise physical presentation.
# ---------------------------------------------------------------------------
webgl = 'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts'
patch(webgl,
'''  private readonly worldBreakPursuitRoot = new THREE.Group();
  private readonly worldBreakMagmaRoot = new THREE.Group();
  private readonly enemyGroups''',
'''  private readonly worldBreakPursuitRoot = new THREE.Group();
  private readonly worldBreakMagmaRoot = new THREE.Group();
  private readonly worldBreakOrbitRoot = new THREE.Group();
  private readonly worldBreakPrismRoot = new THREE.Group();
  private readonly enemyGroups''')
patch(webgl,
'''    this.worldBreakPursuitRoot.name = "arcade-world-break-neon-pursuit";
    this.worldBreakMagmaRoot.name = "arcade-world-break-magma-pressure";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);''',
'''    this.worldBreakPursuitRoot.name = "arcade-world-break-neon-pursuit";
    this.worldBreakMagmaRoot.name = "arcade-world-break-magma-pressure";
    this.worldBreakOrbitRoot.name = "arcade-world-break-zero-g-ascent";
    this.worldBreakPrismRoot.name = "arcade-world-break-route-reprise";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);
    this.worldBreakRoot.add(this.worldBreakOrbitRoot, this.worldBreakPrismRoot);''')
patch(webgl,
'''    this.syncWorldBreakNeonPursuit(snapshot);
    this.syncWorldBreakMagmaPressure(snapshot);
    this.syncBranchGates(snapshot, delta);''',
'''    this.syncWorldBreakNeonPursuit(snapshot);
    this.syncWorldBreakMagmaPressure(snapshot);
    this.syncWorldBreakOrbitalAscent(snapshot);
    this.syncWorldBreakPrismReprise(snapshot);
    this.syncBranchGates(snapshot, delta);''')
patch(webgl,
'''  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''',
'''  private syncWorldBreakOrbitalAscent(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "orbital-ascent" && snapshot.worldBreakOrbitActive;
    this.worldBreakOrbitRoot.visible = active;
    if (!active) return;
    if (this.worldBreakOrbitRoot.children.length === 0) {
      const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x59ddff, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      for (let index = 0; index < 6; index += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, .11, 6, 32), axisMaterial.clone());
        ring.name = "arcade-world-break-orbit-ring";
        ring.userData.depth = 14 + index * 14;
        this.worldBreakOrbitRoot.add(ring);
      }
      for (let index = 0; index < 10; index += 1) {
        const debris = new THREE.Mesh(new THREE.BoxGeometry(.55 + index % 3 * .22, .42, .7), axisMaterial.clone());
        debris.name = "arcade-world-break-orbit-debris";
        debris.userData.angle = index / 10 * Math.PI * 2;
        debris.userData.depth = 20 + (index % 5) * 15;
        this.worldBreakOrbitRoot.add(debris);
      }
    }
    const safeWorldX = snapshot.worldBreakOrbitSafeX * 8.4;
    for (const child of this.worldBreakOrbitRoot.children) {
      const depth = Number(child.userData.depth ?? 24);
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, depth);
      if (child.name === "arcade-world-break-orbit-ring") {
        child.position.set(safeWorldX + course.x, 2.3 + course.y, course.z);
        child.rotation.set(course.pitch, course.yaw, snapshot.runTimeSeconds * .35);
        const scale = .82 + snapshot.worldBreakOrbitAltitude / Math.max(1, snapshot.worldBreakOrbitTargetAltitude) * .24;
        child.scale.setScalar(scale);
      } else {
        const angle = Number(child.userData.angle ?? 0) + snapshot.runTimeSeconds * .42;
        child.position.set(safeWorldX + Math.cos(angle) * 7.2 + course.x, 2.3 + Math.sin(angle) * 5.4 + course.y, course.z);
        child.rotation.set(snapshot.runTimeSeconds * .7 + angle, snapshot.runTimeSeconds * .55, angle);
      }
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.color.setHex(snapshot.worldBreakOrbitAligned ? 0x75ffca : 0x59ddff);
        object.material.opacity = child.name === "arcade-world-break-orbit-ring" ? (snapshot.worldBreakOrbitAligned ? .68 : .42) : .28;
      });
    }
  }

  private syncWorldBreakPrismReprise(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "prism-citadel" && snapshot.worldBreakPrismActive && snapshot.worldBreakPrismIndex >= 0;
    this.worldBreakPrismRoot.visible = active;
    if (!active) return;
    if (this.worldBreakPrismRoot.children.length === 0) {
      const outerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .86, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const outer = new THREE.Mesh(new THREE.TorusGeometry(4.8, .2, 7, 42), outerMaterial.clone());
      outer.name = "arcade-world-break-prism-outer";
      const inner = new THREE.Mesh(new THREE.TorusGeometry(3.7, .07, 5, 36), outerMaterial.clone());
      inner.name = "arcade-world-break-prism-inner";
      inner.rotation.z = Math.PI / 4;
      this.worldBreakPrismRoot.add(outer, inner);
      for (let index = 0; index < 7; index += 1) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(.24, 1.35, 4), outerMaterial.clone());
        const angle = index / 7 * Math.PI * 2;
        shard.position.set(Math.cos(angle) * 5.7, Math.sin(angle) * 5.7, 0);
        shard.rotation.z = angle - Math.PI / 2;
        shard.name = "arcade-world-break-prism-shard";
        this.worldBreakPrismRoot.add(shard);
      }
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakPrismDepth);
    this.worldBreakPrismRoot.position.set(snapshot.worldBreakPrismX * 8.4 + course.x, 1.2 + snapshot.worldBreakPrismY * 4.9 + course.y, course.z);
    this.worldBreakPrismRoot.rotation.set(course.pitch, course.yaw, snapshot.runTimeSeconds * .42 + snapshot.worldBreakPrismIndex * .28);
    const palette = [0x72eeff, 0xffd86b, 0xff77a6, 0x9cff8d, 0xa58cff, 0xff9a62, 0xffffff];
    const color = palette[snapshot.worldBreakPrismIndex % palette.length] ?? 0xffffff;
    const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 10 + snapshot.worldBreakPrismIndex) * .055;
    this.worldBreakPrismRoot.scale.setScalar(Math.max(.55, snapshot.worldBreakPrismRadius / .7) * pulse);
    this.worldBreakPrismRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      object.material.color.setHex(color);
      object.material.opacity = object.name === "arcade-world-break-prism-outer" ? .88 : .58;
    });
  }

  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {''')
patch(webgl,
'''    for (const child of this.worldBreakPursuitRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakMagmaRoot.children) this.disposeObject(child);
    this.entityRoot.clear();''',
'''    for (const child of this.worldBreakPursuitRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakMagmaRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakOrbitRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPrismRoot.children) this.disposeObject(child);
    this.entityRoot.clear();''')
patch(webgl,
'''    this.worldBreakPursuitRoot.clear();
    this.worldBreakMagmaRoot.clear();
    this.worldBreakRoot.clear();''',
'''    this.worldBreakPursuitRoot.clear();
    this.worldBreakMagmaRoot.clear();
    this.worldBreakOrbitRoot.clear();
    this.worldBreakPrismRoot.clear();
    this.worldBreakRoot.clear();''')
patch(webgl,
'''    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);
    this.enemyGroups.clear();''',
'''    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);
    this.worldBreakRoot.add(this.worldBreakOrbitRoot, this.worldBreakPrismRoot);
    this.enemyGroups.clear();''')

# ---------------------------------------------------------------------------
# Canvas parity.
# ---------------------------------------------------------------------------
canvas = 'src/sky/arcade/SkyDancerArcadeCanvasDemo.ts'
patch(canvas,
'''    this.drawWorldBreakNeonPursuit(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakMagmaPressure(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''',
'''    this.drawWorldBreakNeonPursuit(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakMagmaPressure(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakOrbitalAscent(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakPrismReprise(context, snapshot, cssWidth, cssHeight);
    this.drawBranch(context, snapshot, cssWidth, cssHeight);''')
patch(canvas,
'''  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''',
'''  private drawWorldBreakOrbitalAscent(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "orbital-ascent" || !snapshot.worldBreakOrbitActive) return;
    const axis = this.project(snapshot.worldBreakOrbitSafeX, .38, 18, width, height);
    const corridor = Math.max(24, axis.scale * snapshot.worldBreakOrbitWidth * 42);
    context.save();
    context.strokeStyle = snapshot.worldBreakOrbitAligned ? "#75ffca" : "#59ddff";
    context.lineWidth = 2.4;
    context.setLineDash([9, 7]);
    context.beginPath();
    context.moveTo(axis.x - corridor, height * .25);
    context.lineTo(axis.x - corridor * .55, height * .82);
    context.moveTo(axis.x + corridor, height * .25);
    context.lineTo(axis.x + corridor * .55, height * .82);
    context.stroke();
    context.setLineDash([]);
    const ratio = Math.min(1, snapshot.worldBreakOrbitAltitude / Math.max(1, snapshot.worldBreakOrbitTargetAltitude));
    context.fillStyle = "rgba(89,221,255,.18)";
    context.fillRect(width * .48, height * .22, width * .04, height * .46);
    context.fillStyle = snapshot.worldBreakOrbitAligned ? "#75ffca" : "#59ddff";
    context.fillRect(width * .48, height * (.68 - .46 * ratio), width * .04, height * .46 * ratio);
    context.font = "800 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`ZERO-G ALT ${Math.round(snapshot.worldBreakOrbitAltitude)}/${Math.round(snapshot.worldBreakOrbitTargetAltitude)}${snapshot.worldBreakOrbitAligned ? " · CLIMB" : " · FIND AXIS"}`, width * .5, height * .19);
    context.restore();
  }

  private drawWorldBreakPrismReprise(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (snapshot.stage.id !== "prism-citadel" || !snapshot.worldBreakPrismActive || snapshot.worldBreakPrismIndex < 0) return;
    const p = this.project(snapshot.worldBreakPrismX, snapshot.worldBreakPrismY, snapshot.worldBreakPrismDepth, width, height);
    const radius = Math.max(20, p.scale * snapshot.worldBreakPrismRadius * 46);
    const colors = ["#72eeff", "#ffd86b", "#ff77a6", "#9cff8d", "#a58cff", "#ff9a62", "#ffffff"];
    context.save();
    context.translate(p.x, p.y);
    context.rotate(snapshot.runTimeSeconds * .35);
    context.strokeStyle = colors[snapshot.worldBreakPrismIndex % colors.length] ?? "#fff";
    context.lineWidth = 3;
    context.globalAlpha = .9;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = .55;
    context.beginPath();
    context.arc(0, 0, radius * .72, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    context.fillStyle = colors[snapshot.worldBreakPrismIndex % colors.length] ?? "#fff";
    context.font = "800 9px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`${snapshot.worldBreakPrismLabel ?? "ROUTE REPRISE"} · ${snapshot.worldBreakPrismIndex + 1}/${snapshot.worldBreakPrismTotal}`, p.x, p.y - radius - 7);
  }

  private drawBranch(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {''')

# ---------------------------------------------------------------------------
# HUD compact telemetry.
# ---------------------------------------------------------------------------
mode = 'app/SkyDancerArcadeMode.tsx'
patch(mode,
'''              {snapshot.stage.id === "volcano-core" ? ` · ${snapshot.worldBreakMagmaEscaped ? "OUTRUN" : "LEAD"} ${Math.max(0, Math.round(snapshot.worldBreakMagmaLead))}m · PRESSURE ${Math.round(snapshot.worldBreakMagmaPressure * 100)}%${snapshot.worldBreakMagmaHits > 0 ? ` · HIT ${snapshot.worldBreakMagmaHits}` : ""}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ?''',
'''              {snapshot.stage.id === "volcano-core" ? ` · ${snapshot.worldBreakMagmaEscaped ? "OUTRUN" : "LEAD"} ${Math.max(0, Math.round(snapshot.worldBreakMagmaLead))}m · PRESSURE ${Math.round(snapshot.worldBreakMagmaPressure * 100)}%${snapshot.worldBreakMagmaHits > 0 ? ` · HIT ${snapshot.worldBreakMagmaHits}` : ""}` : ""}
              {snapshot.stage.id === "orbital-ascent" ? ` · ${snapshot.worldBreakOrbitComplete ? "ASCENT CLEAR" : snapshot.worldBreakOrbitResolved ? "SHAFT LOST" : snapshot.worldBreakOrbitAligned ? "CLIMB" : "FIND AXIS"} · ALT ${Math.round(snapshot.worldBreakOrbitAltitude)}/${Math.round(snapshot.worldBreakOrbitTargetAltitude)}${snapshot.worldBreakOrbitStrikes > 0 ? ` · HIT ${snapshot.worldBreakOrbitStrikes}` : ""}` : ""}
              {snapshot.stage.id === "prism-citadel" ? ` · ${snapshot.worldBreakPrismPerfect ? "SEVEN SKIES" : snapshot.worldBreakPrismComplete ? "REPRISE CLEAR" : snapshot.worldBreakPrismLabel ?? "REPRISE"} · ${snapshot.worldBreakPrismHits + snapshot.worldBreakPrismMisses}/${snapshot.worldBreakPrismTotal}${snapshot.worldBreakPrismMisses > 0 ? ` · MISS ${snapshot.worldBreakPrismMisses}` : ""}` : ""}
              {snapshot.worldBreakRouteDoctrine !== "LOCKED" ?''')
css = 'app/SkyDancerArcadeMode.module.css'
p = Path(css)
p.write_text(p.read_text() + '\n\n/* Arcade Run V40 WORLD BREAK phase 6: final-world telemetry remains one compact landscape line. */\n.worldBreakLine{max-width:min(850px,90vw)}\n')

# ---------------------------------------------------------------------------
# Base live-count regression and dedicated Phase6 tests.
# ---------------------------------------------------------------------------
base_test = 'tests/sky-arcade-v40-world-break.test.ts'
patch(base_test,
'''  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 9);''',
'''  assert.equal(skyDancerArcadeV40WorldProfile("volcano-core").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("orbital-ascent").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("prism-citadel").live, true);
  assert.equal(profiles.filter((profile) => profile.live).length, 11);''')

Path('tests/sky-arcade-v40-world-break-phase6.test.ts').write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE,
  SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE,
  SKY_DANCER_ARCADE_V40_PRISM_TRIALS,
  skyDancerArcadeV40OrbitalSafeX,
  skyDancerArcadeV40PrismTrialStageId,
  skyDancerArcadeV40WorldProfile,
} from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40 phase 6 completes all eleven Arcade Run worlds", () => {
  assert.equal(skyDancerArcadeV40WorldProfile("orbital-ascent").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("orbital-ascent").signature, "ZERO-G ASCENT");
  assert.equal(skyDancerArcadeV40WorldProfile("prism-citadel").live, true);
  assert.equal(skyDancerArcadeV40WorldProfile("prism-citadel").signature, "ROUTE REPRISE");
});

test("V40 Orbital Ascent uses a moving axis and turbo climb can clear the shaft", () => {
  assert.notEqual(skyDancerArcadeV40OrbitalSafeX(3), skyDancerArcadeV40OrbitalSafeX(3.6));
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "orbital-ascent", seed: 4060 });
  const before = runtime.getSnapshot().score;
  runtime.triggerV40OrbitalAscentForTests(true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakOrbitResolved, true);
  assert.equal(snapshot.worldBreakOrbitComplete, true);
  assert.equal(snapshot.worldBreakOrbitAltitude, SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE);
  assert.ok(snapshot.score > before);
});

test("V40 Orbital Ascent debris punishes losing the safe axis without soft-locking the section", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "orbital-ascent", seed: 4061 });
  const hp = runtime.getSnapshot().playerHp;
  runtime.triggerV40OrbitalAscentForTests(false);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakOrbitStrikes, 1);
  assert.ok(snapshot.playerHp < hp);
  assert.equal(snapshot.worldBreakOrbitResolved, false);
});

test("V40 Prism Citadel derives its seven reprise identities from the flown route with a deterministic practice fallback", () => {
  assert.equal(SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length, 7);
  assert.equal(skyDancerArcadeV40PrismTrialStageId(["cloud-fleet", "storm-carrier", "floating-ruins", "volcano-core", "orbital-ascent", "prism-citadel"], 0), "cloud-fleet");
  assert.equal(skyDancerArcadeV40PrismTrialStageId(["prism-citadel"], 0), SKY_DANCER_ARCADE_V40_PRISM_FALLBACK_ROUTE[0]);
  assert.equal(skyDancerArcadeV40PrismTrialStageId(["prism-citadel"], 6), "prism-citadel");
});

test("V40 Prism Citadel can perfect all seven physical reprise gates", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "prism-citadel", seed: 4062 });
  const before = runtime.getSnapshot().score;
  for (const trial of SKY_DANCER_ARCADE_V40_PRISM_TRIALS) runtime.triggerV40PrismTrialForTests(trial.index, true);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPrismComplete, true);
  assert.equal(snapshot.worldBreakPrismPerfect, true);
  assert.equal(snapshot.worldBreakPrismHits, 7);
  assert.equal(snapshot.worldBreakPrismMisses, 0);
  assert.ok(snapshot.score > before);
});

test("V40 Prism Citadel survives a reprise miss and still completes the final sequence", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "prism-citadel", seed: 4063 });
  const hp = runtime.getSnapshot().playerHp;
  for (const trial of SKY_DANCER_ARCADE_V40_PRISM_TRIALS) runtime.triggerV40PrismTrialForTests(trial.index, trial.index !== 2);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.worldBreakPrismComplete, true);
  assert.equal(snapshot.worldBreakPrismPerfect, false);
  assert.equal(snapshot.worldBreakPrismMisses, 1);
  assert.ok(snapshot.playerHp < hp);
});

test("V40 phase 6 keeps WebGL and Canvas parity and reattaches final-world roots", () => {
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.match(webgl, /syncWorldBreakOrbitalAscent\(snapshot\)/);
  assert.match(webgl, /syncWorldBreakPrismReprise\(snapshot\)/);
  assert.match(webgl, /worldBreakRoot\.add\(this\.worldBreakOrbitRoot, this\.worldBreakPrismRoot\)/);
  assert.match(canvas, /drawWorldBreakOrbitalAscent\(context, snapshot/);
  assert.match(canvas, /drawWorldBreakPrismReprise\(context, snapshot/);
});
''')
