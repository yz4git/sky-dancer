from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


runtime = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
webgl = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
canvas = Path("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts")

# Public combat telemetry: warning targets are authored in simulation so WebGL and Canvas share the same rules.
replace_once(runtime, '''export interface SkyDancerArcadeProjectileSnapshot {
  id: number;
  owner: "player-gun" | "player-missile" | "enemy";
  x: number;
  y: number;
  depth: number;
  targetEnemyId: number | null;
}''', '''export interface SkyDancerArcadeProjectileSnapshot {
  id: number;
  owner: "player-gun" | "player-missile" | "enemy";
  x: number;
  y: number;
  depth: number;
  targetEnemyId: number | null;
  // V40.34: hostile shots exist first as a readable locked firing solution, then become lethal.
  warningSeconds?: number;
  warningDuration?: number;
  warningTargetX?: number;
  warningTargetY?: number;
  dangerRadius?: number;
}''')

replace_once(runtime, '''  damageTaken: number;
  nearMisses: number;
  multiLockKills: number;''', '''  damageTaken: number;
  nearMisses: number;
  // V40.34: a committed dodge opens a short damage/stagger counter window.
  evasionCounterActive: boolean;
  evasionCounterSeconds: number;
  evasionChain: number;
  evasionSerial: number;
  incomingThreats: number;
  multiLockKills: number;''')

replace_once(runtime, '''interface ArcadeProjectile extends SkyDancerArcadeProjectileSnapshot {
  speed: number;
  damage: number;
  life: number;
  vx: number;
  vy: number;
  guidance: number;
  nearMissChecked: boolean;
  // V30: outgoing hostile fire coasts out harmlessly instead of popping out of existence.
  retiring?: boolean;
}''', '''interface ArcadeProjectile extends SkyDancerArcadeProjectileSnapshot {
  speed: number;
  damage: number;
  life: number;
  vx: number;
  vy: number;
  guidance: number;
  nearMissChecked: boolean;
  // V40.34: only a real steering/turbo response can convert a close pass into a counter opening.
  dodgeCommitted?: boolean;
  // V30: outgoing hostile fire coasts out harmlessly instead of popping out of existence.
  retiring?: boolean;
}''')

replace_once(runtime, '''const MAX_ENEMY_PROJECTILES_NORMAL = 5;
const MAX_ENEMY_PROJECTILES_HARD = 9;
''', '''const MAX_ENEMY_PROJECTILES_NORMAL = 5;
const MAX_ENEMY_PROJECTILES_HARD = 9;
const ENEMY_SHOT_HIT_RADIUS_V4034 = 0.3;
const ENEMY_SHOT_NEAR_MISS_RADIUS_V4034 = 0.9;
const EVASION_COUNTER_SECONDS_V4034 = 1.35;
''')

replace_once(runtime, '''export function skyDancerArcadeEnemyHitRadiusV20(kind: SkyDancerArcadeEnemyKind | "boss", boss = kind === "boss"): number {''', '''function skyDancerArcadeEnemyWarningV4034(kind: SkyDancerArcadeEnemyKind | "boss", boss: boolean): number {
  if (boss) return .92;
  switch (kind) {
    case "missile-boat": return 1.04;
    case "gunship": return .96;
    case "bomber": return .92;
    case "striker": return .78;
    case "raider": return .74;
    case "ace": return .7;
    default: return .82;
  }
}

function skyDancerArcadeEnemyDamageV4034(kind: SkyDancerArcadeEnemyKind | "boss", boss: boolean, hard: boolean): number {
  if (boss) return hard ? 40 : 34;
  const base = kind === "gunship" || kind === "bomber"
    ? 29
    : kind === "missile-boat" || kind === "striker"
      ? 27
      : kind === "ace" || kind === "raider"
        ? 25
        : 23;
  return hard ? base + 6 : base;
}

export function skyDancerArcadeEnemyHitRadiusV20(kind: SkyDancerArcadeEnemyKind | "boss", boss = kind === "boss"): number {''')

replace_once(runtime, '''  private damageTaken = 0;
  private nearMisses = 0;
  private multiLockKills = 0;''', '''  private damageTaken = 0;
  private nearMisses = 0;
  private evasionCounterTimer = 0;
  private evasionChain = 0;
  private evasionSerial = 0;
  private multiLockKills = 0;''')

replace_once(runtime, '''    this.damageCooldown = 0;
    this.loadoutReactionLabel = null;''', '''    this.damageCooldown = 0;
    this.evasionCounterTimer = 0;
    this.evasionChain = 0;
    this.loadoutReactionLabel = null;''')

# A deterministic hostile-shot hook keeps the new attack contract independently testable.
replace_once(runtime, '''  /** Deterministic V11.8 hooks for loadout combat regression tests. */
  spawnEnemyForTests(kind: SkyDancerArcadeEnemyKind, x = 0, y = 0, depth = 30): number {
    const id = this.nextEntityId;
    this.spawnEnemy(kind, x, y, depth);
    return id;
  }
''', '''  /** Deterministic V11.8 hooks for loadout combat regression tests. */
  spawnEnemyForTests(kind: SkyDancerArcadeEnemyKind, x = 0, y = 0, depth = 30): number {
    const id = this.nextEntityId;
    this.spawnEnemy(kind, x, y, depth);
    return id;
  }

  /** Deterministic V40.34 hook for warning/dodge/counter regression tests. */
  spawnEnemyProjectileForTests(x = 0, y = 0, depth = 16, warningSeconds = .8, damage = 24): number {
    const id = this.nextEntityId++;
    this.projectiles.push({
      id,
      owner: "enemy",
      x,
      y,
      depth,
      targetEnemyId: null,
      speed: 14.5,
      damage,
      life: 5.6 + warningSeconds,
      vx: (this.playerX - x) * .28,
      vy: (this.playerY - y) * .28,
      guidance: 0,
      nearMissChecked: false,
      warningSeconds,
      warningDuration: warningSeconds,
      warningTargetX: this.playerX,
      warningTargetY: this.playerY,
      dangerRadius: ENEMY_SHOT_HIT_RADIUS_V4034,
      dodgeCommitted: false,
    });
    return id;
  }
''')

replace_once(runtime, '''    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.loadoutReactionTimer = Math.max(0, this.loadoutReactionTimer - delta);''', '''    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    const hadEvasionCounter = this.evasionCounterTimer > 0;
    this.evasionCounterTimer = Math.max(0, this.evasionCounterTimer - delta);
    if (hadEvasionCounter && this.evasionCounterTimer <= 0) this.evasionChain = 0;
    this.loadoutReactionTimer = Math.max(0, this.loadoutReactionTimer - delta);''')

replace_once(runtime, '''    const spreadCount = Math.max(0, Math.min(desiredSpread, threatBudget - activeThreats));
    if (spreadCount <= 0) {
      enemy.fireCooldown = .38 + this.random() * .34;
      return;
    }
    for (let index = 0; index < spreadCount; index += 1) {''', '''    const spreadCount = Math.max(0, Math.min(desiredSpread, threatBudget - activeThreats));
    if (spreadCount <= 0) {
      enemy.fireCooldown = .38 + this.random() * .34;
      return;
    }
    const warningSeconds = skyDancerArcadeEnemyWarningV4034(enemy.kind, enemy.boss);
    if (activeThreats === 0) {
      this.message = enemy.boss ? "BOSS LOCK · BREAK VECTOR" : "INCOMING · BREAK VECTOR";
      this.messageTimer = Math.max(this.messageTimer, .72);
    }
    for (let index = 0; index < spreadCount; index += 1) {''')

replace_once(runtime, '''        speed: enemy.boss ? (15.8 + enemy.bossPhase * 1.7) * bossSpeedScale : skyDancerArcadeEnemyWeaponV20(enemy.kind).projectileSpeed,
        damage: enemy.boss ? (hard ? 18 : 11) : hard ? 13 : 8,
        life: 5.6,
        vx: (this.playerX - enemy.x) * 0.28 + centered * bossSpreadX,
        vy: (this.playerY - enemy.y) * 0.28 + centered * bossSpreadY,
        guidance,
        nearMissChecked: false,
      });''', '''        speed: enemy.boss ? (15.8 + enemy.bossPhase * 1.7) * bossSpeedScale : skyDancerArcadeEnemyWeaponV20(enemy.kind).projectileSpeed,
        damage: skyDancerArcadeEnemyDamageV4034(enemy.kind, enemy.boss, hard),
        life: 5.6 + warningSeconds,
        vx: (this.playerX - enemy.x) * 0.28 + centered * bossSpreadX,
        vy: (this.playerY - enemy.y) * 0.28 + centered * bossSpreadY,
        guidance,
        nearMissChecked: false,
        warningSeconds,
        warningDuration: warningSeconds,
        warningTargetX: this.playerX,
        warningTargetY: this.playerY,
        dangerRadius: ENEMY_SHOT_HIT_RADIUS_V4034,
        dodgeCommitted: false,
      });''')

replace_once(runtime, '''      } else {
        projectile.depth -= projectile.speed * delta;
        if (projectile.guidance > 0 && projectile.depth > 15) {''', '''      } else {
        if (Math.abs(this.input.x) + Math.abs(this.input.y) >= .32 || this.input.turbo) projectile.dodgeCommitted = true;
        const warningSeconds = projectile.warningSeconds ?? 0;
        if (!projectile.retiring && warningSeconds > 0) {
          projectile.warningSeconds = Math.max(0, warningSeconds - delta);
          if ((projectile.warningSeconds ?? 0) > 0) continue;
        }
        projectile.depth -= projectile.speed * delta;
        if (projectile.guidance > 0 && projectile.depth > 15) {''')

replace_once(runtime, '''        const distance = Math.hypot(projectile.x - this.playerX, projectile.y - this.playerY);
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
        }''', '''        const distance = Math.hypot(projectile.x - this.playerX, projectile.y - this.playerY);
        const hitRadius = projectile.dangerRadius ?? ENEMY_SHOT_HIT_RADIUS_V4034;
        if (distance < hitRadius) {
          projectile.life = 0;
          this.takeDamage(projectile.damage);
        } else if (!projectile.nearMissChecked && distance < ENEMY_SHOT_NEAR_MISS_RADIUS_V4034) {
          projectile.nearMissChecked = true;
          if (projectile.dodgeCommitted) {
            this.nearMisses += 1;
            this.evasionChain = Math.min(8, this.evasionChain + 1);
            this.evasionCounterTimer = EVASION_COUNTER_SECONDS_V4034;
            this.evasionSerial += 1;
            this.addScore(520 + this.evasionChain * 130, true);
            this.turbo = Math.min(100, this.turbo + 7 + Math.min(5, this.evasionChain));
            this.message = `DODGE BREAK · COUNTER ×${this.evasionChain}`;
            this.messageTimer = .82;
          }
        }''')

replace_once(runtime, '''    const counterplay = enemy.counterplay;
    let hullDamage = amount;''', '''    const counterplay = enemy.counterplay;
    const evasionCounter = this.evasionCounterTimer > 0;
    let hullDamage = amount * (evasionCounter ? 1.32 : 1);''')

replace_once(runtime, '''    let staggerScale = reaction === "ripple-shock" ? 7.4 : reaction === "twin-cannon" ? 4.7 : reaction === "fusion-link" ? 5.9 : missile ? 5.2 : 3.2;''', '''    let staggerScale = reaction === "ripple-shock" ? 7.4 : reaction === "twin-cannon" ? 4.7 : reaction === "fusion-link" ? 5.9 : missile ? 5.2 : 3.2;
    if (evasionCounter) staggerScale *= 1.28;''')

replace_once(runtime, '''    this.damageCooldown = this.options.difficulty === "hard" ? .28 : .5;
    const effective = this.input.turbo ? amount * 0.72 : amount;
    this.playerHp = Math.max(0, this.playerHp - effective);''', '''    this.damageCooldown = this.options.difficulty === "hard" ? .28 : .5;
    // V40.34: TURBO is primarily an evasion tool, not a button for face-tanking hostile fire.
    const effective = this.input.turbo ? amount * .9 : amount;
    this.playerHp = Math.max(0, this.playerHp - effective);''')

replace_once(runtime, '''    this.chain = 0;
    this.chainTimer = 0;
    this.damageSerial += 1;''', '''    this.chain = 0;
    this.chainTimer = 0;
    this.evasionCounterTimer = 0;
    this.evasionChain = 0;
    this.damageSerial += 1;''')

replace_once(runtime, '''      damageTaken: this.damageTaken,
      nearMisses: this.nearMisses,
      multiLockKills: this.multiLockKills,''', '''      damageTaken: this.damageTaken,
      nearMisses: this.nearMisses,
      evasionCounterActive: this.evasionCounterTimer > 0,
      evasionCounterSeconds: this.evasionCounterTimer,
      evasionChain: this.evasionChain,
      evasionSerial: this.evasionSerial,
      incomingThreats: this.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.life > 0 && !projectile.retiring).length,
      multiLockKills: this.multiLockKills,''')

replace_once(runtime, '''        depth: projectile.depth,
        targetEnemyId: projectile.targetEnemyId,
      })),''', '''        depth: projectile.depth,
        targetEnemyId: projectile.targetEnemyId,
        warningSeconds: projectile.warningSeconds ?? 0,
        warningDuration: projectile.warningDuration ?? 0,
        warningTargetX: projectile.warningTargetX,
        warningTargetY: projectile.warningTargetY,
        dangerRadius: projectile.dangerRadius,
      })),''')

# WebGL: warning shots render as a large pulsing target marker on the locked lane, then become solid missiles.
replace_once(webgl, '''            color,
            transparent: !enemyMissile,
            opacity: enemyMissile ? 1 : 0.94,
            blending: enemyMissile ? THREE.NormalBlending : THREE.AdditiveBlending,''', '''            color,
            transparent: true,
            opacity: enemyMissile ? 1 : 0.94,
            blending: enemyMissile ? THREE.NormalBlending : THREE.AdditiveBlending,''')

replace_once(webgl, '''      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, projectile.depth);
      mesh.position.set(projectile.x * 8.4 + course.x, 1.2 + projectile.y * 4.9 + course.y, course.z);
      mesh.rotation.y = course.yaw;
      mesh.rotation.x = course.pitch;
      const pulse = projectile.owner === "player-missile"
        ? (snapshot.loadout === "missile-focus" ? 1.55 : 1.35) + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : snapshot.loadout === "gun-focus" ? 1.16 : 1;
      mesh.scale.setScalar(pulse);''', '''      const warning = projectile.owner === "enemy" && (projectile.warningSeconds ?? 0) > 0;
      const visualDepth = warning ? 1.65 : projectile.depth;
      const visualX = warning ? (projectile.warningTargetX ?? snapshot.playerX) : projectile.x;
      const visualY = warning ? (projectile.warningTargetY ?? snapshot.playerY) : projectile.y;
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, visualDepth);
      mesh.position.set(visualX * 8.4 + course.x, 1.2 + visualY * 4.9 + course.y, course.z);
      mesh.rotation.y = course.yaw;
      mesh.rotation.x = course.pitch;
      if (projectile.owner === "enemy" && mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.color.setHex(warning ? 0xff315e : 0xff8a2b);
        mesh.material.opacity = warning ? .48 : 1;
        mesh.material.wireframe = warning;
      }
      const pulse = projectile.owner === "player-missile"
        ? (snapshot.loadout === "missile-focus" ? 1.55 : 1.35) + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? warning
            ? 2.1 + Math.sin(performance.now() * .032 + projectile.id) * .42
            : 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : snapshot.loadout === "gun-focus" ? 1.16 : 1;
      mesh.scale.setScalar(pulse);''')

replace_once(webgl, '''    if (snapshot.nearMisses > this.previousSnapshot.nearMisses) this.audio.tone(1180, .075, .018, "triangle");''', '''    if (snapshot.nearMisses > this.previousSnapshot.nearMisses) this.audio.tone(1180, .075, .018, "triangle");
    if (snapshot.evasionSerial !== this.previousSnapshot.evasionSerial) {
      this.audio.tone(720, .1, .025, "triangle");
      this.audio.tone(1440, .065, .018, "square");
      this.presentation.emitRushAccent();
    }''')

replace_once(webgl, '''    const incoming = snapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    const wasIncoming = this.previousSnapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);''', '''    const incoming = snapshot.projectiles.some((projectile) => projectile.owner === "enemy" && ((projectile.warningSeconds ?? 0) > 0 || (projectile.depth > 2.2 && projectile.depth < 30)));
    const wasIncoming = this.previousSnapshot.projectiles.some((projectile) => projectile.owner === "enemy" && ((projectile.warningSeconds ?? 0) > 0 || (projectile.depth > 2.2 && projectile.depth < 30)));''')

# Canvas fallback: draw the same locked lane as a dashed line + target ring during the warning window.
replace_once(canvas, '''    for (const projectile of snapshot.projectiles) {
      const projected = this.project(projectile.x, projectile.y, projectile.depth, cssWidth, cssHeight);
      if (projectile.owner === "player-missile") {''', '''    for (const projectile of snapshot.projectiles) {
      const warning = projectile.owner === "enemy" && (projectile.warningSeconds ?? 0) > 0;
      const warningX = projectile.warningTargetX ?? snapshot.playerX;
      const warningY = projectile.warningTargetY ?? snapshot.playerY;
      const projected = this.project(
        warning ? warningX : projectile.x,
        warning ? warningY : projectile.y,
        warning ? 1.65 : projectile.depth,
        cssWidth,
        cssHeight,
      );
      if (warning) {
        const source = this.project(projectile.x, projectile.y, projectile.depth, cssWidth, cssHeight);
        const pulse = .62 + Math.sin(snapshot.runTimeSeconds * 24 + projectile.id) * .2;
        context.save();
        context.strokeStyle = `rgba(255,49,94,${Math.max(.3, pulse)})`;
        context.lineWidth = 2.2;
        context.setLineDash([7, 6]);
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(projected.x, projected.y);
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = 3;
        context.beginPath();
        context.arc(projected.x, projected.y, 18 + pulse * 9, 0, Math.PI * 2);
        context.stroke();
        context.restore();
        continue;
      }
      if (projectile.owner === "player-missile") {''')

# Focused regression tests for the new readable-threat contract.
Path("tests/sky-arcade-v4034-dodge-counter.test.ts").write_text('''import test from "node:test";
import assert from "node:assert/strict";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.34 hostile fire telegraphs before it can damage the player", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4034 });
  const projectileId = runtime.spawnEnemyProjectileForTests(0, 0, 16, .8, 24);
  const before = runtime.getSnapshot();
  const threat = before.projectiles.find((projectile) => projectile.id === projectileId);
  assert.ok(threat);
  assert.ok((threat.warningSeconds ?? 0) >= .79);
  assert.equal(threat.warningTargetX, 0);
  assert.equal(before.playerHp, before.playerMaxHp);

  for (let frame = 0; frame < 30; frame += 1) runtime.step(1 / 60);
  const during = runtime.getSnapshot();
  assert.equal(during.playerHp, during.playerMaxHp);
  assert.ok((during.projectiles.find((projectile) => projectile.id === projectileId)?.warningSeconds ?? 0) > 0);
});

test("V40.34 a committed close dodge opens the counter window", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4035 });
  runtime.spawnEnemyProjectileForTests(0, 0, 16, .35, 24);

  for (let frame = 0; frame < 24; frame += 1) runtime.step(1 / 60);
  runtime.setMove(.72, 0);
  for (let frame = 0; frame < 18; frame += 1) runtime.step(1 / 60);
  runtime.setMove(0, 0);

  let snapshot = runtime.getSnapshot();
  for (let frame = 0; frame < 150 && snapshot.nearMisses === 0; frame += 1) {
    runtime.step(1 / 60);
    snapshot = runtime.getSnapshot();
  }
  assert.equal(snapshot.nearMisses, 1);
  assert.equal(snapshot.evasionCounterActive, true);
  assert.ok(snapshot.evasionCounterSeconds > 0);
  assert.equal(snapshot.evasionChain, 1);
  assert.equal(snapshot.evasionSerial, 1);
  assert.equal(snapshot.playerHp, snapshot.playerMaxHp);
});

test("V40.34 taking a hostile shot is a meaningful multi-hit failure threat", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 4036 });
  runtime.spawnEnemyProjectileForTests(0, 0, 3, 0, 24);
  for (let frame = 0; frame < 8; frame += 1) runtime.step(1 / 60);
  const snapshot = runtime.getSnapshot();
  assert.ok(snapshot.playerHp <= snapshot.playerMaxHp - 23.9);
  assert.equal(snapshot.evasionCounterActive, false);
});
''')

print("Applied Arcade Run V40.34 dodge/counter combat patch")
