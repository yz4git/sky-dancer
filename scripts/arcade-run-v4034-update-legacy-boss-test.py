from pathlib import Path

path = Path("tests/sky-arcade-run.test.ts")
text = path.read_text()
old = '''  for (let frame = 0; frame < 1200 && !final.getSnapshot().bossActive; frame += 1) final.step(1 / 60);
  assert.ok(final.getSnapshot().bossMaxHp >= 1200, `final boss HP ${final.getSnapshot().bossMaxHp}`);'''
new = '''  // V40.34 makes hostile fire intentionally lethal to an idle player. Keep this boss-durability
  // regression about the climax target by flying an active evasive weave on the approach.
  for (let frame = 0; frame < 1200 && !final.getSnapshot().bossActive; frame += 1) {
    const weave = Math.floor(frame / 54) % 2 === 0 ? .92 : -.92;
    const climb = Math.floor(frame / 83) % 2 === 0 ? .48 : -.48;
    final.setMove(weave, climb);
    final.step(1 / 60);
  }
  final.setMove(0, 0);
  assert.ok(final.getSnapshot().bossMaxHp >= 1200, `final boss HP ${final.getSnapshot().bossMaxHp}`);'''
if old not in text:
    raise SystemExit("legacy boss durability test anchor not found")
path.write_text(text.replace(old, new, 1))
print("Updated boss durability regression for active V40.34 dodge play")
