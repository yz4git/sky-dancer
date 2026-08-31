from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

# Keep the test target strong by increasing the actual Cloud Fleet crest instead of relaxing the assertion.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCoursePath.ts",
    '    y += Math.sin(authoredU * Math.PI) * 11;\n    y += (Math.sin(u * TAU * 1.55 - 0.25) - Math.sin(-0.25)) * 4.5;',
    '    y += Math.sin(authoredU * Math.PI) * 17;\n    y += (Math.sin(u * TAU * 1.55 - 0.25) - Math.sin(-0.25)) * 6;',
    "cloud crest strength",
)

# Replace the obsolete requirement for an ordinary decorative carrier with the current visual contract.
replace_once(
    "tests/sky-arcade-reference.test.ts",
    'test("city renderer contains a river, instanced windows, cloud layers and horizon carrier", () => {',
    'test("city renderer contains a river, instanced windows and cloud layers without a decorative horizon carrier", () => {',
    "city reference test title",
)
replace_once(
    "tests/sky-arcade-reference.test.ts",
    '  assert.ok(scene.getObjectByName("arcade-horizon-fleet-carrier"));',
    '  assert.equal(scene.getObjectByName("arcade-horizon-fleet-carrier"), undefined);',
    "decorative carrier assertion",
)

Path("scripts/apply-arcade-stage-personality-v82-fix.py").unlink(missing_ok=True)
Path(".github/workflows/arcade-stage-personality-v82-retry-once.yml").unlink(missing_ok=True)
