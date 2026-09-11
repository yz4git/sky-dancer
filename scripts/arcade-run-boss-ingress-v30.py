from pathlib import Path

runtime_path = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
runtime = runtime_path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global runtime
    count = runtime.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    runtime = runtime.replace(old, new, 1)


def replace_count(old: str, new: str, expected: int, label: str) -> None:
    global runtime
    count = runtime.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {count}')
    runtime = runtime.replace(old, new)

replace_once(
'''  counterplayTimer: number;\n  counterplayCooldown: number;\n  counterplayRewarded: boolean;\n}\n\ninterface ArcadeProjectile extends SkyDancerArcadeProjectileSnapshot {''',
'''  counterplayTimer: number;\n  counterplayCooldown: number;\n  counterplayRewarded: boolean;\n  // V30: standard enemies stay alive briefly during boss ingress so they can visibly peel away.\n  retreating?: boolean;\n  retreatTimer?: number;\n  retreatSign?: -1 | 1;\n  retreatDepthDirection?: -1 | 1;\n}\n\ninterface ArcadeProjectile extends SkyDancerArcadeProjectileSnapshot {''',
'ArcadeEnemy retreat fields',
)

replace_once(
'''  guidance: number;\n  nearMissChecked: boolean;\n}\n\ninterface ArcadeHazard extends SkyDancerArcadeHazardSnapshot {''',
'''  guidance: number;\n  nearMissChecked: boolean;\n  // V30: outgoing hostile fire coasts out harmlessly instead of popping out of existence.\n  retiring?: boolean;\n}\n\ninterface ArcadeHazard extends SkyDancerArcadeHazardSnapshot {''',
'ArcadeProjectile retiring field',
)

replace_once(
'''  courseAnchorDistance: number | null;\n}\n\ninterface ArcadeInput {''',
'''  courseAnchorDistance: number | null;\n  // V30: boss ingress releases old hazards from the course and lets them sweep off-screen.\n  retiring?: boolean;\n}\n\ninterface ArcadeInput {''',
'ArcadeHazard retiring field',
)

replace_once(
'''    // V10.1: boss ingress owns the arena. Retire leftover wave pressure instead of stacking it under the climax target.\n    for (const enemy of this.enemies) {\n      if (enemy.boss) continue;\n      enemy.alive = false;\n      enemy.locked = false;\n    }\n    this.projectiles = this.projectiles.filter((projectile) => projectile.owner !== "enemy");\n    this.hazards = [];''',
'''    // V30: boss ingress owns the arena without teleporting the previous fight away.\n    // Standard aircraft break lock, stop attacking and visibly peel out of the lane before they are culled.\n    for (const enemy of this.enemies) {\n      if (enemy.boss || !enemy.alive) continue;\n      enemy.locked = false;\n      enemy.retreating = true;\n      enemy.retreatTimer = 0;\n      enemy.retreatSign = enemy.x < -0.05 ? -1 : enemy.x > 0.05 ? 1 : enemy.id % 2 === 0 ? -1 : 1;\n      // Aircraft already close to the player complete their fly-by; distant aircraft bank away into the background.\n      enemy.retreatDepthDirection = enemy.depth <= 30 ? -1 : 1;\n      enemy.counterplay = "none";\n      enemy.counterplayTimer = 0;\n      enemy.counterplayIntensity = 0;\n      enemy.fireCooldown = 999;\n    }\n    // Do not make bullets and hazards blink out either. They become harmless and clear the frame under motion.\n    for (const projectile of this.projectiles) {\n      if (projectile.owner !== "enemy" || projectile.life <= 0) continue;\n      projectile.retiring = true;\n      projectile.damage = 0;\n      projectile.guidance = 0;\n      projectile.life = Math.min(projectile.life, 0.9);\n    }\n    for (const hazard of this.hazards) {\n      hazard.retiring = true;\n      hazard.courseAnchorDistance = null;\n      hazard.speed = Math.max(hazard.speed, 68);\n    }''',
'boss ingress abrupt clear',
)

replace_once(
'''      enemy.age += delta;\n      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));\n      this.updateEnemyCounterplay(enemy, delta, turboActive);''',
'''      enemy.age += delta;\n      if (enemy.retreating && !enemy.boss) {\n        enemy.retreatTimer = (enemy.retreatTimer ?? 0) + delta;\n        enemy.locked = false;\n        enemy.counterplay = "none";\n        enemy.counterplayTimer = 0;\n        enemy.counterplayIntensity = 0;\n        enemy.fireCooldown = 999;\n        const retreatSign = enemy.retreatSign ?? (enemy.x < 0 ? -1 : 1);\n        const depthDirection = enemy.retreatDepthDirection ?? 1;\n        const verticalSign = enemy.id % 3 === 0 ? -1 : 1;\n        const targetX = clamp(retreatSign * (2.34 + Math.min(.22, enemy.retreatTimer * .14)), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);\n        const targetY = clamp(verticalSign * (1.3 + Math.min(.48, enemy.retreatTimer * .3)), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);\n        // Reuse the coordinated-flight solver so the exit is a banked aircraft maneuver rather than a tween.\n        const flightState = skyDancerArcadeV25Step(\n          {\n            x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY,\n            bank: enemy.flightBank, pitch: enemy.flightPitch, energy: enemy.flightEnergy,\n          },\n          targetX,\n          targetY,\n          enemy.kind,\n          delta,\n          1.35,\n          ENEMY_X_LIMIT,\n          ENEMY_Y_LIMIT,\n        );\n        enemy.x = flightState.x;\n        enemy.y = flightState.y;\n        enemy.flightVX = flightState.vx;\n        enemy.flightVY = flightState.vy;\n        enemy.flightBank = flightState.bank;\n        enemy.flightPitch = flightState.pitch;\n        enemy.flightEnergy = flightState.energy;\n        const retreatSpeed = Math.max(26, enemy.speed * (depthDirection < 0 ? 2.9 : 2.35))\n          * (1 + Math.min(.55, enemy.retreatTimer * .3));\n        enemy.depth += depthDirection * retreatSpeed * delta;\n        if (\n          (depthDirection < 0 && enemy.depth < -12.5)\n          || (depthDirection > 0 && enemy.depth > 126)\n          || enemy.retreatTimer > 2.6\n        ) enemy.alive = false;\n        continue;\n      }\n      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));\n      this.updateEnemyCounterplay(enemy, delta, turboActive);''',
'retreat update branch',
)

replace_once(
'''    for (const enemy of this.enemies) {\n      if (!enemy.alive || enemy.depth < 2 || enemy.depth > 72) continue;''',
'''    for (const enemy of this.enemies) {\n      if (!enemy.alive || enemy.retreating || enemy.depth < 2 || enemy.depth > 72) continue;''',
'gun target ignores retreat',
)

replace_once(
'''    const locked = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;\n    if (locked >= SKY_DANCER_ARCADE_MAX_LOCKS) return;''',
'''    const locked = this.enemies.filter((enemy) => enemy.alive && !enemy.retreating && enemy.locked).length;\n    if (locked >= SKY_DANCER_ARCADE_MAX_LOCKS) return;''',
'lock count ignores retreat',
)

replace_once(
'''    for (const enemy of this.enemies) {\n      if (!enemy.alive || enemy.locked || enemy.depth < 4 || enemy.depth > 92) continue;''',
'''    for (const enemy of this.enemies) {\n      if (!enemy.alive || enemy.retreating || enemy.locked || enemy.depth < 4 || enemy.depth > 92) continue;''',
'lock candidate ignores retreat',
)

replace_once(
'''    return this.enemies.filter((enemy) => enemy.alive && enemy.counterplay === "turbo-jammer" && enemy.counterplayTimer > 0).length;''',
'''    return this.enemies.filter((enemy) => enemy.alive && !enemy.retreating && enemy.counterplay === "turbo-jammer" && enemy.counterplayTimer > 0).length;''',
'jammer count ignores retreat',
)

replace_once(
'''          .filter((other) => other.alive && !other.boss && other.id !== enemy.id && Math.abs(other.depth - enemy.depth) <= 18)''',
'''          .filter((other) => other.alive && !other.boss && !other.retreating && other.id !== enemy.id && Math.abs(other.depth - enemy.depth) <= 18)''',
'formation neighbors ignore retreat',
)

replace_count(
'''const target = this.enemies.find((enemy) => enemy.id === projectile.targetEnemyId && enemy.alive) ?? null;''',
'''const target = this.enemies.find((enemy) => enemy.id === projectile.targetEnemyId && enemy.alive && !enemy.retreating) ?? null;''',
2,
'projectile homing ignores retreat',
)

replace_once(
'''      for (const enemy of this.enemies) {\n        if (!enemy.alive) continue;\n        const depthDistance = Math.abs(projectile.depth - enemy.depth);''',
'''      for (const enemy of this.enemies) {\n        if (!enemy.alive || enemy.retreating) continue;\n        const depthDistance = Math.abs(projectile.depth - enemy.depth);''',
'projectile hits ignore retreat',
)

replace_once(
'''      if (projectile.owner === "enemy") {\n        if (projectile.depth > 2.2) continue;''',
'''      if (projectile.owner === "enemy") {\n        if (projectile.retiring) {\n          if (projectile.depth < -3) projectile.life = 0;\n          continue;\n        }\n        if (projectile.depth > 2.2) continue;''',
'retiring projectile harmless branch',
)

replace_once(
'''  private updateHazards(delta: number, turboActive: boolean): void {\n    for (const hazard of this.hazards) {\n      if (hazard.courseAnchorDistance !== null) {''',
'''  private updateHazards(delta: number, turboActive: boolean): void {\n    for (const hazard of this.hazards) {\n      if (hazard.retiring) {\n        hazard.courseAnchorDistance = null;\n        hazard.depth -= Math.max(68, hazard.speed * 3.2) * delta;\n        if (hazard.depth < -5.8) hazard.depth = -10;\n        continue;\n      }\n      if (hazard.courseAnchorDistance !== null) {''',
'retiring hazard branch',
)

runtime_path.write_text(runtime)

test_path = Path('tests/sky-arcade-v30-boss-ingress.test.ts')
test_path.write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\nimport { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";\n\ntest("V30 boss ingress keeps surviving wave aircraft visible while they peel away", () => {\n  const runtime = new SkyDancerArcadeRuntime({\n    mode: "stage-practice",\n    startStageId: "dawn-city",\n    difficulty: "normal",\n    seed: 3001,\n  });\n  const nearId = runtime.spawnEnemyForTests("fighter", -1.15, -0.1, 18);\n  const farId = runtime.spawnEnemyForTests("bomber", 1.1, 0.22, 52);\n  const before = runtime.getSnapshot();\n  assert.ok(before.enemies.some((enemy) => enemy.id === nearId));\n  assert.ok(before.enemies.some((enemy) => enemy.id === farId));\n\n  runtime.setBossHpRatioForTests(0.9);\n  const ingress = runtime.getSnapshot();\n  assert.equal(ingress.bossActive, true);\n  const leaving = ingress.enemies.filter((enemy) => enemy.id === nearId || enemy.id === farId);\n  assert.equal(leaving.length, 2, "wave aircraft must not pop out on the boss-spawn frame");\n  assert.ok(leaving.every((enemy) => !enemy.locked));\n\n  const ingressDepth = new Map(leaving.map((enemy) => [enemy.id, enemy.depth]));\n  for (let index = 0; index < 4; index += 1) runtime.step(0.05);\n  const moving = runtime.getSnapshot().enemies.filter((enemy) => enemy.id === nearId || enemy.id === farId);\n  assert.ok(moving.length >= 1, "at least one aircraft remains visible during the short handoff");\n  assert.ok(moving.some((enemy) => Math.abs(enemy.depth - (ingressDepth.get(enemy.id) ?? enemy.depth)) > 0.5), "retreat uses visible flight motion");\n\n  for (let index = 0; index < 60; index += 1) runtime.step(0.05);\n  const settled = runtime.getSnapshot();\n  assert.equal(settled.enemies.some((enemy) => enemy.id === nearId || enemy.id === farId), false, "retreaters eventually leave the arena");\n  assert.equal(settled.bossActive, true, "boss remains after the handoff");\n});\n\ntest("V30 retires boss-ingress threats instead of deleting the arrays instantly", () => {\n  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");\n  const start = source.indexOf("private spawnBoss(): void");\n  const end = source.indexOf("private spawnBossPhaseEscorts", start);\n  const spawnBoss = source.slice(start, end);\n  assert.doesNotMatch(spawnBoss, /enemy\\.alive = false/);\n  assert.doesNotMatch(spawnBoss, /this\\.hazards = \\[\\]/);\n  assert.doesNotMatch(spawnBoss, /this\\.projectiles = this\\.projectiles\\.filter/);\n  assert.match(spawnBoss, /enemy\\.retreating = true/);\n  assert.match(spawnBoss, /projectile\\.retiring = true/);\n  assert.match(spawnBoss, /hazard\\.retiring = true/);\n});\n''')

print('Applied Arcade Run V30 boss ingress continuity patch')
