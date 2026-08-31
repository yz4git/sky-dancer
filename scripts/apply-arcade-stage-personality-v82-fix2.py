from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

# Keep the V8.2 visual contract strong: amplify the actual floating-ruins weave and altitude stack.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCoursePath.ts",
    '''    x += (Math.sin(u * TAU * 2.35 + 0.75) - Math.sin(0.75)) * 17;\n    x += Math.sin(u * TAU * 4.7 - 0.2) * 3.5;\n    y += (Math.sin(u * TAU * 1.72 - 0.7) - Math.sin(-0.7)) * 14;''',
    '''    x += (Math.sin(u * TAU * 2.35 + 0.75) - Math.sin(0.75)) * 24;\n    x += Math.sin(u * TAU * 4.7 - 0.2) * 5.2;\n    y += (Math.sin(u * TAU * 1.72 - 0.7) - Math.sin(-0.7)) * 18;''',
    "floating ruins weave strength",
)

Path("scripts/apply-arcade-stage-personality-v82-fix2.py").unlink(missing_ok=True)
Path(".github/workflows/arcade-stage-personality-v82-retry2-once.yml").unlink(missing_ok=True)
