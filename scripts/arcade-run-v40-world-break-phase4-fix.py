from pathlib import Path

path = Path('tests/sky-arcade-v40-world-break-phase3.test.ts')
text = path.read_text()
lines = text.splitlines()
replacement = r'''  assert.match(source, /worldBreakRoot\.add\(this\.worldBreakKnifeRoot, this\.worldBreakStormRoot, this\.worldBreakFortressRoot, this\.worldBreakIceRoot, this\.worldBreakPortalRoot\)/);'''
changed = False
for index, line in enumerate(lines):
    if 'assert.match(source' in line and 'worldBreakRoot' in line and 'worldBreakKnifeRoot' in line:
        lines[index] = replacement
        changed = True
        break
if not changed:
    raise SystemExit('phase3 root attachment assertion not found')
path.write_text('\n'.join(lines) + '\n')
