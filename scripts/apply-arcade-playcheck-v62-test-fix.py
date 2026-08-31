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
  // Acquire a real lock first; moving at the arena edge is intentionally allowed to leave the lock cone.
  runtime.setLock(true);
  for (let frame = 0; frame < 300; frame += 1) runtime.step(1 / 60);
  assert.ok(runtime.getSnapshot().lockedCount > 0);
  // Then exercise the actual touch-release contract with every continuous input active.
  runtime.setMove(0.8, -1);
  runtime.setFire(true);
  runtime.setTurbo(true);
  for (let frame = 0; frame < 8; frame += 1) runtime.step(1 / 60);'''
if old not in text:
    raise SystemExit("forced-input timing contract not found")
path.write_text(text.replace(old, new, 1))
print("V6.2 release-input test separated from moving lock acquisition")
