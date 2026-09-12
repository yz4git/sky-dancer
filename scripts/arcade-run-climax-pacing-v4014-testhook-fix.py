from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
source = runtime_path.read_text()

old = '''  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {\n    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;\n    this.setBossHpRatioForTests(ratio);\n    if (this.pendingBossPhaseMechanic === null) return;\n    this.bossPhaseTransitionTimer = 0;\n    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating);\n    if (boss) this.updateEnemies(1 / 60, false);\n  }'''

new = '''  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {\n    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;\n    // Deterministic phase tests intentionally bypass the presentation-only V40.14 ingress hold.\n    if (!this.bossSpawned) this.spawnBoss();\n    this.bossIngressTimer = 0;\n    this.bossOpeningStrikePending = false;\n    this.setBossHpRatioForTests(ratio);\n    if (this.pendingBossPhaseMechanic === null) return;\n    this.bossPhaseTransitionTimer = 0;\n    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating);\n    if (boss) this.updateEnemies(1 / 60, false);\n  }'''

count = source.count(old)
if count != 1:
    raise SystemExit(f"boss phase test hook: expected exactly one match, found {count}")
source = source.replace(old, new, 1)

old = '''  setBossHpRatioForTests(ratio: number): void {\n    if (!this.bossSpawned) this.spawnBoss();\n    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss);\n    if (!boss) return;\n    boss.hp = boss.maxHp * clamp(ratio, .01, 1);\n    this.updateEnemies(1 / 60, false);\n  }'''

new = '''  setBossHpRatioForTests(ratio: number): void {\n    const bossAlreadyPresent = this.bossSpawned;\n    if (!this.bossSpawned) this.spawnBoss();\n    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss);\n    if (!boss) return;\n    // First call can exercise the real ingress. Subsequent deterministic HP changes target phase logic directly.\n    if (bossAlreadyPresent) {\n      this.bossIngressTimer = 0;\n      this.bossOpeningStrikePending = false;\n    }\n    boss.hp = boss.maxHp * clamp(ratio, .01, 1);\n    this.updateEnemies(1 / 60, false);\n  }'''

count = source.count(old)
if count != 1:
    raise SystemExit(f"boss HP test hook: expected exactly one match, found {count}")
source = source.replace(old, new, 1)

runtime_path.write_text(source)
print("Adjusted V40.14 deterministic boss phase test hooks")
