from pathlib import Path

path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
source = path.read_text()
old = '''        rivalAce: enemy.rivalAce,
        rivalAceAppearance: enemy.rivalAceAppearance,
        rivalAceResolved: enemy.rivalAceResolved,
      })),'''
new = '''        rivalAce: enemy.rivalAce,
        rivalAceAppearance: enemy.rivalAceAppearance,
        rivalAceResolved: enemy.rivalAceResolved,
        finalBossForm: enemy.finalBossForm,
        finalBossAccent: enemy.finalBossAccent,
        finalBossReactive: enemy.finalBossReactive,
      })),'''
if old not in source:
    raise SystemExit("V40.5 final boss snapshot metadata anchor not found")
path.write_text(source.replace(old, new, 1))
print("V40.5 final boss snapshot metadata fixed")
