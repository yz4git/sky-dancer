from pathlib import Path

path = Path("tests/sky-arcade-run.test.ts")
text = path.read_text()
old = '''test("forced input release clears touch state without launching a lock salvo", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 51 });
  runtime.setMove(0.8, -1);
  runtime.setFire(true);
  runtime.setTurbo(true);
  runtime.setLock(true);
  for (let frame = 0; frame < 230; frame += 1) runtime.step(1 / 60);
  assert.ok(runtime.getSnapshot().lockedCount > 0);'''
new = '''test("forced input release clears touch state without launching a lock salvo", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 51 });
  runtime.setMove(0.8, -1);
  runtime.setFire(true);
  runtime.setTurbo(true);
  runtime.setLock(true);
  // V6.2 deliberately gives the opening course a longer establishing beat before the first wave.
  for (let frame = 0; frame < 300; frame += 1) runtime.step(1 / 60);
  assert.ok(runtime.getSnapshot().lockedCount > 0);'''
if old not in text:
    raise SystemExit("forced-input timing contract not found")
path.write_text(text.replace(old, new, 1))
print("V6.2 stale lock timing test updated")
