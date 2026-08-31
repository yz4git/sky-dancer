from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

# The previous 2.35x ruins wave counter-phased the generic course and accidentally compressed it.
# Use a deliberate 1.5-cycle labyrinth sweep, preserving the strong vertical stacking.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCoursePath.ts",
    '''    x += (Math.sin(u * TAU * 2.35 + 0.75) - Math.sin(0.75)) * 24;\n    x += Math.sin(u * TAU * 4.7 - 0.2) * 5.2;''',
    '''    x += (Math.sin(u * TAU * 1.5 + 0.75) - Math.sin(0.75)) * 24;\n    x += Math.sin(u * TAU * 4.7 - 0.2) * 5.2;''',
    "ruins phase-aligned weave",
)

# Make Night Metro a true neon chicane: repeated decisive reversals instead of a city-like broad bend.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCoursePath.ts",
    '''    x += (Math.sin(u * TAU * 3.18 + 0.28) - Math.sin(0.28)) * 13.5;\n    x += Math.sin(u * TAU * 6.36) * 2.8;''',
    '''    x += (Math.sin(u * TAU * 4.5 + 0.28) - Math.sin(0.28)) * 20;\n    x += Math.sin(u * TAU * 6.36) * 4;''',
    "night metro chicane",
)

Path("scripts/apply-arcade-stage-personality-v82-fix3.py").unlink(missing_ok=True)
Path(".github/workflows/arcade-stage-personality-v82-retry3-once.yml").unlink(missing_ok=True)
