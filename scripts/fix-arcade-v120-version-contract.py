from pathlib import Path

p = Path("tests/sky-arcade-run.test.ts")
s = p.read_text()
old = '  assert.match(modeSource, /V11\\.9/);'
new = '  assert.match(modeSource, /V(?:11\\.9|12\\.0)/);'
if old not in s:
    raise SystemExit("V11.9 fixed version assertion not found")
p.write_text(s.replace(old, new, 1))
print("V12 legacy version contract updated")
