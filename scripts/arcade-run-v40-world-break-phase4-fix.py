from pathlib import Path

path = Path('tests/sky-arcade-v40-world-break-phase3.test.ts')
text = path.read_text()
old = r'''  assert.match(webgl, /worldBreakRoot\.add\(this\.worldBreakKnifeRoot, this\.worldBreakStormRoot, this\.worldBreakFortressRoot\)/);'''
new = r'''  assert.match(webgl, /worldBreakRoot\.add\(this\.worldBreakKnifeRoot, this\.worldBreakStormRoot, this\.worldBreakFortressRoot, this\.worldBreakIceRoot, this\.worldBreakPortalRoot\)/);'''
if old not in text:
    raise SystemExit('phase3 root attachment assertion not found')
path.write_text(text.replace(old, new, 1))
