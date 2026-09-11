from pathlib import Path

path = Path("scripts/arcade-run-v405-route-reactive-final-boss.py")
source = path.read_text()
old = '''replace_once(models,
"  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage) : createStandardEnemy(stage, enemy);",
"  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage, enemy) : createStandardEnemy(stage, enemy);")'''
new = '''replace_once(models,
'  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage) : createStandardEnemy(stage, enemy);',
'  const group = enemy.boss || enemy.kind === "boss" ? createBoss(stage, enemy) : createStandardEnemy(stage, enemy);')'''
if old not in source:
    raise SystemExit("V40.5 model call quoting anchor not found")
path.write_text(source.replace(old, new, 1))
print("V40.5 patch runner quoting fixed")
