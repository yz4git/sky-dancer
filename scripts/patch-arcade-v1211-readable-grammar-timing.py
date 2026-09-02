from pathlib import Path

p = Path('src/sky/arcade/SkyDancerArcadeV121EncounterGrammar.ts')
s = p.read_text()
replacements = {
    'phase("exit-lane", "EXIT LANE", .72,': 'phase("exit-lane", "EXIT LANE", 1.08,',
    'phase("brace-cross", "BRACE CROSS", .48,': 'phase("brace-cross", "BRACE CROSS", .82,',
    'phase("breaker", acePursuit ? "ACE BREAKER" : "BREAKER", 1.02,': 'phase("breaker", acePursuit ? "ACE BREAKER" : "BREAKER", 1.64,',
    'phase("crosscut", "CROSSCUT", .4, .6,': 'phase("crosscut", "CROSSCUT", .78, .6,',
    'phase("overtake", acePursuit ? "ACE OVERTAKE" : "OVERTAKE", .86,': 'phase("overtake", acePursuit ? "ACE OVERTAKE" : "OVERTAKE", 1.56,',
    'phase("jammer-line", "JAMMER LINE", .46,': 'phase("jammer-line", "JAMMER LINE", .82,',
    'phase("close-net", "CLOSE NET", .96,': 'phase("close-net", "CLOSE NET", 1.62,',
    'phase("crosscut", "CROSSCUT", .48, .56,': 'phase("crosscut", "CROSSCUT", .82, .56,',
    'phase("finish", acePursuit ? "ACE FINISH" : "FINISH", 1.02,': 'phase("finish", acePursuit ? "ACE FINISH" : "FINISH", 1.64,',
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f'missing timing anchor: {old}')
    s = s.replace(old, new, 1)
p.write_text(s)

t = Path('tests/sky-arcade-run.test.ts')
ts = t.read_text()
anchor = '  assert.ok(first.phases[0].delay < first.phases[1].delay && first.phases[1].delay < first.phases[2].delay);\n'
if anchor not in ts:
    raise SystemExit('missing V12.1 timing test anchor')
ts = ts.replace(anchor, anchor + '  assert.ok(first.phases[1].delay >= .75, "second beat must be visually separable");\n  assert.ok(first.phases[2].delay - first.phases[1].delay >= .7, "final beat must not collapse into the crosscut");\n', 1)

old_lock = '''test("holding lock acquires targets and release launches a bounded salvo", () => {\n  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 42 });\n  runtime.setLock(true);\n  for (let frame = 0; frame < 270; frame += 1) runtime.step(1 / 60);\n  const acquired = runtime.getSnapshot();\n  assert.ok(acquired.lockedCount > 1);\n  assert.ok(acquired.lockedCount <= SKY_DANCER_ARCADE_MAX_LOCKS);\n  runtime.setLock(false);\n  const launched = runtime.getSnapshot();\n  assert.equal(launched.missileSerial, 1);\n  assert.equal(launched.lockedCount, 0);\n  assert.ok(launched.projectiles.filter((projectile) => projectile.owner === "player-missile").length > 1);\n  assert.ok(launched.projectiles.filter((projectile) => projectile.owner === "player-missile").length <= SKY_DANCER_ARCADE_MAX_LOCKS);\n});\n'''
new_lock = '''test("holding lock acquires targets and release launches a bounded salvo", () => {\n  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 42 });\n  // Keep this combat-control contract deterministic: Encounter Grammar is allowed to change\n  // automatic wave timing and attack lanes, so the lock test owns its target geometry.\n  runtime.spawnEnemyForTests("fighter", -0.16, 0.02, 46);\n  runtime.spawnEnemyForTests("fighter", 0, -0.03, 49);\n  runtime.spawnEnemyForTests("fighter", 0.16, 0.04, 52);\n  runtime.setLock(true);\n  for (let frame = 0; frame < 60; frame += 1) runtime.step(1 / 60);\n  const acquired = runtime.getSnapshot();\n  assert.ok(acquired.lockedCount > 1);\n  assert.ok(acquired.lockedCount <= SKY_DANCER_ARCADE_MAX_LOCKS);\n  runtime.setLock(false);\n  const launched = runtime.getSnapshot();\n  assert.equal(launched.missileSerial, 1);\n  assert.equal(launched.lockedCount, 0);\n  assert.ok(launched.projectiles.filter((projectile) => projectile.owner === "player-missile").length > 1);\n  assert.ok(launched.projectiles.filter((projectile) => projectile.owner === "player-missile").length <= SKY_DANCER_ARCADE_MAX_LOCKS);\n});\n'''
if old_lock not in ts:
    raise SystemExit('missing legacy lock regression anchor')
ts = ts.replace(old_lock, new_lock, 1)
Path('tests/sky-arcade-run.test.ts').write_text(ts)
