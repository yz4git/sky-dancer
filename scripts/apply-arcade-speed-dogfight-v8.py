from pathlib import Path
import re

RUNTIME = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
DATA = Path("src/sky/arcade/SkyDancerArcadeData.ts")
DEMO = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
PRESENTATION = Path("src/sky/arcade/SkyDancerArcadeProductPresentation.ts")
CAMERA = Path("src/sky/arcade/SkyDancerArcadeCamera.ts")
TEST = Path("tests/sky-arcade-run.test.ts")
AUDIT = Path("scripts/webgl-arcade-run-reference-audit.mjs")
AUDIT_WORKFLOW = Path(".github/workflows/arcade-run-reference-audit.yml")
SELF = Path("scripts/apply-arcade-speed-dogfight-v8.py")
WORKFLOW = Path(".github/workflows/arcade-speed-dogfight-v8-once.yml")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing {label}")
    return text.replace(old, new, 1)

# 1) Faster authored course flow while preserving each section's normalized curve shape.
data = DATA.read_text()
for old, new in [(70, 82), (76, 89), (72, 84), (74, 86), (78, 91), (68, 80), (82, 96), (75, 88), (84, 98), (88, 103)]:
    data = data.replace(f"courseSpeed: {old},", f"courseSpeed: {new},")
DATA.write_text(data)

# 2) Runtime close-combat choreography.
runtime = RUNTIME.read_text()
runtime = replace_once(
    runtime,
    'export type SkyDancerArcadeStatus =\n  | "running"\n  | "paused"\n  | "stage-clear"\n  | "continue"\n  | "game-over"\n  | "run-clear"\n  | "practice-clear";\n',
    'export type SkyDancerArcadeStatus =\n  | "running"\n  | "paused"\n  | "stage-clear"\n  | "continue"\n  | "game-over"\n  | "run-clear"\n  | "practice-clear";\n\nexport type SkyDancerArcadeEnemyManeuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";\n',
    "maneuver type",
)
runtime = replace_once(
    runtime,
    '  boss: boolean;\n  phase: number;\n}',
    '  boss: boolean;\n  phase: number;\n  maneuver: SkyDancerArcadeEnemyManeuver;\n}',
    "snapshot maneuver",
)
runtime = replace_once(
    runtime,
    '  scoreValue: number;\n  alive: boolean;\n}',
    '  scoreValue: number;\n  alive: boolean;\n  maneuverClock: number;\n  maneuverSign: number;\n}',
    "enemy maneuver state",
)
runtime = runtime.replace('const PLAYER_MOVE_SPEED_X = 3.4;', 'const PLAYER_MOVE_SPEED_X = 3.7;')
runtime = runtime.replace('const PLAYER_MOVE_SPEED_Y = 2.95;', 'const PLAYER_MOVE_SPEED_Y = 3.18;')
runtime = runtime.replace('const PLAYER_TURBO_SPEED_X = 4.45;', 'const PLAYER_TURBO_SPEED_X = 5.05;')
runtime = runtime.replace('const PLAYER_TURBO_SPEED_Y = 3.75;', 'const PLAYER_TURBO_SPEED_Y = 4.28;')
runtime = replace_once(runtime, '  private nextEntityId = 1;\n  private nextWaveAt = 2.8;', '  private nextEntityId = 1;\n  private waveSerial = 0;\n  private nextWaveAt = 2.8;', "wave serial")
runtime = replace_once(runtime, '    this.hazards = [];\n    // Give each section', '    this.hazards = [];\n    this.waveSerial = 0;\n    // Give each section', "wave reset")
runtime = runtime.replace('this.stage.courseSpeed * (turboActive ? 1.34 : 1)', 'this.stage.courseSpeed * (turboActive ? 1.44 : 1)')
runtime = runtime.replace('hazard.speed * (turboActive ? 1.16 : 1)', 'hazard.speed * (turboActive ? 1.24 : 1)')

old_spawn_wave = '''  private spawnWave(): void {\n    const formation = this.stage.formations[Math.floor(this.random() * this.stage.formations.length)] ?? "line";\n    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;\n    const count = 3 + Math.floor(this.random() * 2) + hardBonus;\n    for (let index = 0; index < count; index += 1) {\n      const kind = this.stage.enemies[Math.floor(this.random() * this.stage.enemies.length)] ?? "fighter";\n      const [x, y] = this.formationPosition(formation, index, count);\n      this.spawnEnemy(kind, x, y, 72 + index * 4.8 + this.random() * 15);\n    }\n  }\n'''
new_spawn_wave = '''  private spawnWave(): void {\n    const formation = this.stage.formations[Math.floor(this.random() * this.stage.formations.length)] ?? "line";\n    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;\n    const count = 3 + Math.floor(this.random() * 2) + hardBonus;\n    const choreography: readonly SkyDancerArcadeEnemyManeuver[] = ["close-bank", "overtake", "parallel", "cross-pass"];\n    const featured = choreography[this.waveSerial % choreography.length] ?? "close-bank";\n    this.waveSerial += 1;\n    for (let index = 0; index < count; index += 1) {\n      const kind = this.stage.enemies[Math.floor(this.random() * this.stage.enemies.length)] ?? "fighter";\n      const [formationX, formationY] = this.formationPosition(formation, index, count);\n      const maneuver: SkyDancerArcadeEnemyManeuver = index === 0\n        ? featured\n        : index === 1 && count >= 4\n          ? "close-bank"\n          : "approach";\n      const sign = Math.abs(formationX) > 0.18 ? Math.sign(formationX) : index % 2 === 0 ? 1 : -1;\n      const x = maneuver === "overtake" ? sign * 1.9 : formationX;\n      const y = maneuver === "overtake" ? clamp(formationY * 0.34, -0.62, 0.62) : formationY;\n      // V8 keeps ordinary enemies in the readable mid-field and lets an overtaker enter from behind.\n      const depth = maneuver === "overtake" ? -6.4 : 51 + index * 3.8 + this.random() * 10;\n      this.spawnEnemy(kind, x, y, depth, maneuver, sign);\n    }\n  }\n'''
runtime = replace_once(runtime, old_spawn_wave, new_spawn_wave, "spawn wave")

old_spawn_enemy = '''  private spawnEnemy(kind: SkyDancerArcadeEnemyKind, x: number, y: number, depth: number): void {\n    const stats = enemyStats(kind, this.options.difficulty === "hard");\n    this.enemies.push({\n      id: this.nextEntityId++,\n      kind,\n      x,\n      y,\n      depth,\n      hp: stats.hp,\n      maxHp: stats.hp,\n      locked: false,\n      boss: false,\n      phase: this.random() * Math.PI * 2,\n      age: 0,\n      speed: stats.speed,\n      baseX: x,\n      baseY: y,\n      amplitude: 0.28 + this.random() * 0.72,\n      fireCooldown: 1.1 + this.random() * 2.4,\n      scoreValue: stats.score,\n      alive: true,\n    });\n  }\n'''
new_spawn_enemy = '''  private spawnEnemy(\n    kind: SkyDancerArcadeEnemyKind,\n    x: number,\n    y: number,\n    depth: number,\n    maneuver: SkyDancerArcadeEnemyManeuver = "approach",\n    maneuverSign = 1,\n  ): void {\n    const stats = enemyStats(kind, this.options.difficulty === "hard");\n    this.enemies.push({\n      id: this.nextEntityId++,\n      kind,\n      x,\n      y,\n      depth,\n      hp: stats.hp,\n      maxHp: stats.hp,\n      locked: false,\n      boss: false,\n      phase: this.random() * Math.PI * 2,\n      maneuver,\n      age: 0,\n      speed: stats.speed,\n      baseX: x,\n      baseY: y,\n      amplitude: 0.28 + this.random() * 0.72,\n      fireCooldown: 1.1 + this.random() * 2.4,\n      scoreValue: stats.score,\n      alive: true,\n      maneuverClock: 0,\n      maneuverSign: maneuverSign < 0 ? -1 : 1,\n    });\n  }\n'''
runtime = replace_once(runtime, old_spawn_enemy, new_spawn_enemy, "spawn enemy")

runtime = replace_once(
    runtime,
    '      phase: 0,\n      age: 0,',
    '      phase: 0,\n      maneuver: "approach",\n      age: 0,',
    "boss maneuver",
)
runtime = replace_once(
    runtime,
    '      scoreValue: final ? 24000 : 12000,\n      alive: true,\n    });',
    '      scoreValue: final ? 24000 : 12000,\n      alive: true,\n      maneuverClock: 0,\n      maneuverSign: 1,\n    });',
    "boss maneuver state",
)

new_update_enemies = '''  private updateEnemies(delta: number, turboActive: boolean): void {\n    for (const enemy of this.enemies) {\n      if (!enemy.alive) continue;\n      enemy.age += delta;\n      if (enemy.boss) {\n        enemy.depth = moveToward(enemy.depth, 33, delta * 18);\n        const frequency = this.options.difficulty === "hard" ? 0.82 : 0.68;\n        enemy.x = clamp(this.playerX * 0.58 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n        enemy.y = clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.82, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n      } else {\n        const frequency = enemy.kind === "interceptor" ? 2.35 : enemy.kind === "ace" ? 1.75 : 1.02;\n        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, enemy.kind === "ace" ? 0.84 : enemy.kind === "interceptor" ? 0.74 : 0.54);\n        const close = clamp((68 - enemy.depth) / 54, 0, 1);\n        const weaveX = Math.sin(enemy.age * frequency + enemy.phase) * enemy.amplitude;\n        const weaveY = Math.cos(enemy.age * frequency * 0.72 + enemy.phase) * enemy.amplitude * 0.82;\n        const flankX = Math.sin(enemy.phase * 1.91) * close * 0.42;\n        const flankY = Math.cos(enemy.phase * 1.37) * close * 0.28;\n        const genericX = () => clamp(enemy.baseX + weaveX + this.playerX * pursuit + flankX, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n        const genericY = () => clamp(enemy.baseY + weaveY + this.playerY * pursuit * 0.82 + flankY, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n\n        if (enemy.maneuver === "overtake") {\n          if (enemy.depth < 24) {\n            // Enter from behind and visibly run past the player's shoulder into the forward field.\n            enemy.depth += Math.max(32, enemy.speed * 2.25) * delta;\n            const pass = clamp((enemy.depth + 6.4) / 30.4, 0, 1);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.94 - pass * 0.66) + Math.sin(enemy.age * 5.2) * 0.1, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = clamp(this.playerY * 0.56 + enemy.baseY * 0.28 + Math.sin(enemy.age * 3.6 + enemy.phase) * 0.24, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n          } else {\n            enemy.maneuverClock += delta;\n            enemy.depth = moveToward(enemy.depth, 20 + Math.sin(enemy.maneuverClock * 2.7) * 1.3, delta * 8.5);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.22 + Math.sin(enemy.maneuverClock * 3.2) * 0.18), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = clamp(this.playerY * 0.65 + Math.sin(enemy.maneuverClock * 2.5 + enemy.phase) * 0.44, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n            if (enemy.maneuverClock >= 1.15) {\n              enemy.maneuver = "close-bank";\n              enemy.maneuverClock = 0;\n              enemy.baseX = enemy.x;\n              enemy.baseY = enemy.y;\n            }\n          }\n        } else if (enemy.maneuver === "parallel") {\n          if (enemy.depth > 19) {\n            enemy.depth -= enemy.speed * 1.5 * delta;\n            enemy.x = clamp(genericX() + enemy.maneuverSign * 0.34, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = genericY();\n          } else {\n            // Hold a large readable silhouette beside the player for almost two seconds.\n            enemy.maneuverClock += delta;\n            enemy.depth = moveToward(enemy.depth, 15.8 + Math.sin(enemy.maneuverClock * 2.1) * 1.6, delta * 7.5);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.18 + Math.sin(enemy.maneuverClock * 2.8) * 0.16), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = clamp(this.playerY * 0.72 + Math.sin(enemy.maneuverClock * 2.2 + enemy.phase) * 0.48, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n            if (enemy.maneuverClock >= 1.9) {\n              enemy.maneuver = "cross-pass";\n              enemy.maneuverClock = 0;\n              enemy.baseX = enemy.x;\n              enemy.baseY = enemy.y;\n            }\n          }\n        } else if (enemy.maneuver === "cross-pass") {\n          if (enemy.depth > 19) {\n            enemy.depth -= enemy.speed * 1.42 * delta;\n            enemy.x = genericX();\n            enemy.y = genericY();\n          } else {\n            enemy.maneuverClock += delta;\n            const t = clamp(enemy.maneuverClock / 1.25, 0, 1);\n            const eased = t * t * (3 - 2 * t);\n            enemy.depth = moveToward(enemy.depth, 12.6, delta * 8);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.86 - eased * 3.72), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = clamp(this.playerY * 0.62 + Math.sin(t * Math.PI + enemy.phase) * 0.62, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n            if (enemy.maneuverClock >= 1.25) {\n              enemy.maneuver = "approach";\n              enemy.maneuverClock = 0;\n              enemy.baseX = enemy.x - enemy.maneuverSign * 0.42;\n              enemy.baseY = enemy.y;\n            }\n          }\n        } else if (enemy.maneuver === "close-bank") {\n          if (enemy.depth > 19) {\n            enemy.depth -= enemy.speed * 1.42 * delta;\n            enemy.x = genericX();\n            enemy.y = genericY();\n          } else {\n            // A close turning fight: slow relative depth while the raider visibly banks across the canopy.\n            enemy.maneuverClock += delta;\n            const arc = Math.sin(clamp(enemy.maneuverClock / 1.65, 0, 1) * Math.PI);\n            enemy.depth = moveToward(enemy.depth, 11.8 + Math.sin(enemy.maneuverClock * 3) * 1.5, delta * 7.6);\n            enemy.x = clamp(this.playerX + enemy.maneuverSign * (1.36 - arc * 0.48) + Math.sin(enemy.maneuverClock * 3.15 + enemy.phase) * 0.28, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n            enemy.y = clamp(this.playerY * 0.7 + enemy.baseY * 0.22 + Math.sin(enemy.maneuverClock * 2.45 + enemy.phase) * 0.62, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n            if (enemy.maneuverClock >= 1.65) {\n              enemy.maneuver = "approach";\n              enemy.maneuverClock = 0;\n              enemy.baseX = clamp(enemy.x + enemy.maneuverSign * 0.7, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n              enemy.baseY = enemy.y;\n              enemy.amplitude = Math.min(1.25, enemy.amplitude * 1.15);\n            }\n          }\n        } else {\n          enemy.depth -= enemy.speed * delta;\n          enemy.x = genericX();\n          enemy.y = genericY();\n        }\n      }\n      enemy.fireCooldown -= delta;\n      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {\n        // Route selection should stay tense without becoming an unreadable missile wall.\n        if (this.branchActive && !enemy.boss) enemy.fireCooldown = .48 + this.random() * .36;\n        else this.enemyFire(enemy);\n      }\n      if (enemy.depth > 3.3) continue;\n      const proximity = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);\n      if (proximity < (enemy.boss ? 0.76 : 0.36)) {\n        if (turboActive) {\n          this.turboSmashes += 1;\n          this.damageEnemy(enemy, enemy.boss ? 92 : enemy.maxHp + 1, true);\n          this.addScore(enemy.boss ? 2400 : 1150, true);\n          this.message = "TURBO SMASH";\n          this.messageTimer = 0.8;\n        } else {\n          const hard = this.options.difficulty === "hard";\n          this.takeDamage(enemy.boss ? (hard ? 34 : 26) : (hard ? 22 : 16));\n          enemy.alive = false;\n        }\n      }\n      if (!enemy.boss && enemy.depth < ENEMY_FLYBY_CULL_DEPTH) {\n        enemy.alive = false;\n        this.chain = 0;\n      }\n    }\n  }\n'''
pattern = re.compile(r'  private updateEnemies\(delta: number, turboActive: boolean\): void \{.*?\n  \}\n\n  private enemyFire', re.S)
match = pattern.search(runtime)
if not match:
    raise SystemExit("missing updateEnemies method")
runtime = runtime[:match.start()] + new_update_enemies + '\n  private enemyFire' + runtime[match.end():]

runtime = replace_once(
    runtime,
    '        boss: enemy.boss,\n        phase: enemy.phase,\n      })),',
    '        boss: enemy.boss,\n        phase: enemy.phase,\n        maneuver: enemy.maneuver,\n      })),',
    "snapshot maneuver map",
)
RUNTIME.write_text(runtime)

# 3) Make close maneuvers physically readable: heading flips for rear overtakes, velocity-driven banking, slight close-range scale emphasis.
demo = DEMO.read_text()
demo = replace_once(
    demo,
    '        group = createSkyDancerArcadeEnemy(snapshot.stage, enemy);\n        const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, enemy.depth);\n        group.rotation.y = Math.PI + course.yaw;\n        group.position.set(enemy.x * 8.4 + course.x, 1.2 + enemy.y * 4.9 + course.y, -enemy.depth);',
    '        group = createSkyDancerArcadeEnemy(snapshot.stage, enemy);\n        const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, enemy.depth);\n        group.userData.arcadeCombatBaseScale = group.scale.x;\n        group.rotation.y = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;\n        group.position.set(enemy.x * 8.4 + course.x, 1.2 + enemy.y * 4.9 + course.y, -enemy.depth);',
    "enemy initial heading",
)
old_rotation = '''      group.rotation.y = Math.PI + course.yaw;\n      group.rotation.x = course.pitch * .72;\n      group.rotation.z = Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.8) * (enemy.boss ? .025 : .22) + course.bank * .5;\n'''
new_rotation = '''      const previousEnemy = this.previousSnapshot.enemies.find((previous) => previous.id === enemy.id);\n      const safeDelta = Math.max(delta, 1 / 120);\n      const lateralVelocity = previousEnemy ? (enemy.x - previousEnemy.x) / safeDelta : 0;\n      const verticalVelocity = previousEnemy ? (enemy.y - previousEnemy.y) / safeDelta : 0;\n      const targetHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;\n      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));\n      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 7.5 : 5.8));\n      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .035, -.2, .2);\n      const maneuverBank = THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);\n      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.8) * (enemy.boss ? .025 : .08);\n      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 8);\n      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 9);\n'''
demo = replace_once(demo, old_rotation, new_rotation, "enemy maneuver rotation")
demo = replace_once(
    demo,
    '      if (enemy.boss) {\n        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;',
    '      if (!enemy.boss) {\n        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;\n        const closeBoost = 1 + THREE.MathUtils.clamp((28 - enemy.depth) / 24, 0, 1) * .16;\n        group.scale.setScalar(baseScale * closeBoost);\n      }\n      if (enemy.boss) {\n        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;',
    "close enemy scale",
)
DEMO.write_text(demo)

# 4) Stronger speed presentation without making normal enemies smaller via a wider normal FOV.
presentation = PRESENTATION.read_text()
presentation = presentation.replace('const SPEED_STREAK_COUNT = 40;', 'const SPEED_STREAK_COUNT = 52;')
presentation = presentation.replace('const speed = (snapshot.turboActive ? 150 : 58) + impactBoost * 72;', 'const speed = (snapshot.turboActive ? 205 : 78) + impactBoost * 82;')
presentation = presentation.replace('z - (snapshot.turboActive ? 9 : 2.4)', 'z - (snapshot.turboActive ? 13 : 4.2)')
presentation = presentation.replace('const targetOpacity = (snapshot.turboActive ? .42 : .045) + impactBoost * .24;', 'const targetOpacity = (snapshot.turboActive ? .52 : .075) + impactBoost * .24;')
PRESENTATION.write_text(presentation)

camera = CAMERA.read_text().replace('fov: turbo ? 64 : 56,', 'fov: turbo ? 67 : 56,')
CAMERA.write_text(camera)

# 5) Regression tests: faster forward speed, recurring close maneuvers, rear-to-front overtake.
test = TEST.read_text()
marker = 'test("V8 speed pass keeps enemies close and choreographs dogfight fly-bys"'
if marker not in test:
    test += '''\n\ntest("V8 speed pass keeps enemies close and choreographs dogfight fly-bys", async () => {\n  assert.ok(Math.min(...SKY_DANCER_ARCADE_STAGES.map((stage) => stage.courseSpeed)) >= 80);\n  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });\n  const seen = new Set<string>();\n  const rearIds = new Set<number>();\n  let rearToFront = false;\n  let closeSamples = 0;\n  for (let frame = 0; frame < 780; frame += 1) {\n    const snapshot = runtime.getSnapshot();\n    for (const enemy of snapshot.enemies) {\n      if (enemy.boss) continue;\n      seen.add(enemy.maneuver);\n      if (enemy.depth > 4 && enemy.depth < 24) closeSamples += 1;\n      if (enemy.maneuver === "overtake" && enemy.depth < 0) rearIds.add(enemy.id);\n      if (rearIds.has(enemy.id) && enemy.depth > 12) rearToFront = true;\n    }\n    runtime.step(1 / 60);\n    if (runtime.getSnapshot().status !== "running") break;\n  }\n  assert.ok(seen.has("close-bank"), `maneuvers ${[...seen].join(",")}`);\n  assert.ok(seen.has("overtake"), `maneuvers ${[...seen].join(",")}`);\n  assert.ok(seen.has("parallel"), `maneuvers ${[...seen].join(",")}`);\n  assert.ok(rearToFront, "rear overtaker should pass into the forward field");\n  assert.ok(closeSamples >= 120, `close silhouette samples ${closeSamples}`);\n\n  const [runtimeSource, presentationSource, cameraSource] = await Promise.all([\n    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),\n    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),\n    readFile(new URL("../src/sky/arcade/SkyDancerArcadeCamera.ts", import.meta.url), "utf8"),\n  ]);\n  assert.match(runtimeSource, /turboActive \\? 1\\.44 : 1/);\n  assert.match(presentationSource, /turboActive \\? 205 : 78/);\n  assert.match(cameraSource, /fov: turbo \\? 67 : 56/);\n});\n'''
TEST.write_text(test)

# 6) Real-screen audit: add two close-combat frames and reuse system Chrome via isolated playwright-core.
audit = AUDIT.read_text()
audit = audit.replace('// 2026-08-31 V6.2 visual playcheck: verify course readability, fair NORMAL pressure and restrained kill feedback.', '// 2026-08-31 V8 visual playcheck: verify faster flight, close dogfight silhouettes, overtakes and course readability.')
audit = replace_once(
    audit,
    'import { mkdir, writeFile } from "node:fs/promises";\nimport { chromium } from "playwright";',
    'import { mkdir, writeFile } from "node:fs/promises";\nimport { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);\nconst { chromium } = require("../.audit-runtime/node_modules/playwright-core");',
    "audit playwright core",
)
audit = replace_once(
    audit,
    'const browser = await chromium.launch({\n  headless: true,\n  args:',
    'const browser = await chromium.launch({\n  headless: true,\n  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",\n  args:',
    "audit chrome path",
)
audit = replace_once(
    audit,
    'await page.waitForTimeout(1700);\nawait page.screenshot({ path: `${outputDir}/00c-course-bend-b.png`, fullPage: true });\nconst bendText = await bodyText();',
    'await page.waitForTimeout(1700);\nawait page.screenshot({ path: `${outputDir}/00c-course-bend-b.png`, fullPage: true });\nawait page.waitForTimeout(420);\nawait page.screenshot({ path: `${outputDir}/00d-close-dogfight-a.png`, fullPage: true });\nawait captureCanvas(`${outputDir}/00d-close-dogfight-a-canvas.png`);\nawait page.waitForTimeout(650);\nawait page.screenshot({ path: `${outputDir}/00e-close-dogfight-b.png`, fullPage: true });\nawait captureCanvas(`${outputDir}/00e-close-dogfight-b-canvas.png`);\nconst bendText = await bodyText();',
    "close dogfight captures",
)
AUDIT.write_text(audit)

workflow = AUDIT_WORKFLOW.read_text()
old_install = '''      - run: |\n          npm install --no-save --package-lock=false --legacy-peer-deps playwright@1.55.0\n          npx playwright install --with-deps chromium\n'''
new_install = '''      - name: Install isolated browser controller\n        run: |\n          rm -rf .audit-runtime\n          mkdir -p .audit-runtime\n          printf '{"private":true,"type":"commonjs"}\\n' > .audit-runtime/package.json\n          npm install --prefix .audit-runtime --no-package-lock --no-save --ignore-scripts --no-audit --no-fund playwright-core@1.55.0\n          google-chrome --version\n'''
workflow = replace_once(workflow, old_install, new_install, "reference audit install")
workflow = workflow.replace('    timeout-minutes: 10\n    steps:', '    timeout-minutes: 10\n    env:\n      SKY_DANCER_CHROME_PATH: /usr/bin/google-chrome\n    steps:')
AUDIT_WORKFLOW.write_text(workflow)

SELF.unlink(missing_ok=True)
WORKFLOW.unlink(missing_ok=True)
