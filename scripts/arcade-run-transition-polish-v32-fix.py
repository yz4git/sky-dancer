from pathlib import Path

runtime_path = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
source = runtime_path.read_text()

def replace_once(old: str, new: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly one match, found {count}: {old[:120]!r}')
    source = source.replace(old, new, 1)

# Route-entry copy can use stageSerial for its cinematic accent. Do not consume a Stage Evolution serial.
replace_once(
'''    this.stageEventLabel = rewindTime > 0 ? "REJOIN VECTOR" : "ROUTE ENTRY";
    this.stageEventTimer = rewindTime > 0 ? 1.4 : 1.15;
    this.stageEventSerial += 1;''',
'''    this.stageEventLabel = rewindTime > 0 ? "REJOIN VECTOR" : "ROUTE ENTRY";
    this.stageEventTimer = rewindTime > 0 ? 1.4 : 1.15;''')

# Legacy deterministic hook remains synchronous for old rule tests; production HP transitions keep the V32 delay.
replace_once(
'''  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {
    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;
    this.setBossHpRatioForTests(ratio);
  }''',
'''  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {
    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;
    this.setBossHpRatioForTests(ratio);
    if (this.pendingBossPhaseMechanic === null) return;
    this.bossPhaseTransitionTimer = 0;
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating);
    if (boss) this.updateEnemies(1 / 60, false);
  }''')

runtime_path.write_text(source)

test_path = Path('tests/sky-arcade-v32-transition-polish.test.ts')
test_source = test_path.read_text()
old = '''  runtime.triggerBossPhaseForTests(1);\n  const base = runtime.getSnapshot();\n  const serial = base.bossMechanicSerial;\n  runtime.triggerBossPhaseForTests(2);'''
new = '''  runtime.setBossHpRatioForTests(.9);\n  const base = runtime.getSnapshot();\n  const serial = base.bossMechanicSerial;\n  runtime.setBossHpRatioForTests(.6);'''
if test_source.count(old) != 1:
    raise SystemExit('V32 phase-delay test block not found exactly once')
test_path.write_text(test_source.replace(old, new, 1))

print('Applied V32 regression compatibility fix')
