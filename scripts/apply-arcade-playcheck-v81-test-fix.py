from pathlib import Path

p = Path("tests/sky-arcade-run.test.ts")
text = p.read_text()

replacements = [
    (
        r'''  assert.match(cameraSource, /playerX \* \(5\.15 \+ phone \* 2\.55\)/);''',
        r'''  assert.match(cameraSource, /playerX \* \(5\.15 \+ phone \* 2\.55 \+ turboFollow \* \.95\)/);''',
        "wide-field camera keeps its base coefficients plus Turbo safety follow",
    ),
    (
        r'''  assert.match(webglSource, /heavyClimax/);
  assert.match(webglSource, /emitBurst\(group\.position, \.72\)/);
  assert.match(presentationSource, /addScaledVector\(this\.forward, 3\.4\)/);''',
        r'''  assert.match(webglSource, /const heavyCraft = previous\.kind === "bomber" \|\| previous\.kind === "missile-boat"/);
  assert.match(webglSource, /if \(previous\.boss\)[\s\S]*emitClimax\(group\.position, 1\.5\)/);
  assert.match(webglSource, /else if \(heavyCraft\)[\s\S]*emitBurst\(group\.position, \.98\)/);
  assert.match(webglSource, /emitBurst\(group\.position, \.72\)/);
  assert.match(presentationSource, /addScaledVector\(this\.forward, 3\.8\)/);''',
        "V8.1 boss-only climax contract",
    ),
]

for old, new, label in replacements:
    if old not in text:
        raise SystemExit(f"missing {label}")
    text = text.replace(old, new, 1)

p.write_text(text)
Path("scripts/apply-arcade-playcheck-v81-test-fix.py").unlink(missing_ok=True)
