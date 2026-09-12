from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
source = runtime_path.read_text()

old = '''  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {\n    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;\n    this.setBossHpRatioForTests(ratio);\n    if (this.pendingBossPhaseMechanic === null) return;\n    this.bossPhaseTransitionTimer = 0;\n    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating);\n    if (boss) this.updateEnemies(1 / 60, false);\n  }'''

new = '''  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {\n    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;\n    // Deterministic phase tests intentionally bypass the presentation-only V40.14 ingress hold.\n    if (!this.bossSpawned) this.spawnBoss();\n    this.bossIngressTimer = 0;\n    this.bossOpeningStrikePending = false;\n    this.setBossHpRatioForTests(ratio);\n    if (this.pendingBossPhaseMechanic === null) return;\n    this.bossPhaseTransitionTimer = 0;\n    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating);\n    if (boss) this.updateEnemies(1 / 60, false);\n  }'''

count = source.count(old)
if count != 1:
    raise SystemExit(f"boss phase test hook: expected exactly one match, found {count}")

runtime_path.write_text(source.replace(old, new, 1))
print("Adjusted V40.14 deterministic boss phase test hook")
