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
Path('tests/sky-arcade-run.test.ts').write_text(ts)
