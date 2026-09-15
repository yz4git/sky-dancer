from pathlib import Path

path = Path("tests/sky-arcade-run.test.ts")
text = path.read_text()
old = '''  for (let frame = 0; frame < 1200 && !final.getSnapshot().bossActive; frame += 1) final.step(1 / 60);
  assert.ok(final.getSnapshot().bossMaxHp >= 1200, `final boss HP ${final.getSnapshot().bossMaxHp}`);'''
new = '''  // V40.34 intentionally makes an idle approach lethal. This assertion is about authored
  // climax durability, so spawn the target through the deterministic boss test hook instead.
  final.setBossHpRatioForTests(.9);
  assert.ok(final.getSnapshot().bossMaxHp >= 1200, `final boss HP ${final.getSnapshot().bossMaxHp}`);'''
if old not in text:
    raise SystemExit("legacy boss durability test anchor not found")
path.write_text(text.replace(old, new, 1))
print("Separated boss durability regression from V40.34 idle-survival behavior")
