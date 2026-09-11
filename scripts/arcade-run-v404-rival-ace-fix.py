from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
source = path.read_text()

source = source.replace(
    "const appearance = enemy.rivalAceAppearance ?? this.rivalAceAppearance || 1;",
    "const appearance = (enemy.rivalAceAppearance ?? this.rivalAceAppearance) || 1;",
)

old = """        worldBreakTarget: enemy.worldBreakTarget,
        worldBreakTargetIndex: enemy.worldBreakTargetIndex,
        worldBreakLabel: enemy.worldBreakLabel,
"""
new = """        worldBreakTarget: enemy.worldBreakTarget,
        worldBreakTargetIndex: enemy.worldBreakTargetIndex,
        worldBreakLabel: enemy.worldBreakLabel,
        rivalAce: enemy.rivalAce,
        rivalAceAppearance: enemy.rivalAceAppearance,
        rivalAceResolved: enemy.rivalAceResolved,
"""
if old not in source:
    raise SystemExit("V40.4 snapshot metadata anchor not found")

path.write_text(source.replace(old, new, 1))
print("Arcade Run V40.4 Rival Ace snapshot fix applied")
