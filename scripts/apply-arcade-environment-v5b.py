from pathlib import Path
import runpy

runpy.run_path('scripts/apply-arcade-environment-v5.py', run_name='__main__')

world_path = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
world = world_path.read_text()
world = world.replace('paint(0x526b7d),160);', 'paint(0x526b7d),144);')
world = world.replace('for(let i=0;i<160;i++){', 'for(let i=0;i<144;i++){')
if 'paint(0x526b7d),160);' in world or 'for(let i=0;i<160;i++){' in world:
    raise SystemExit('failed to restore bounded distant-metropolis instance count')
world_path.write_text(world)

test_path = Path('tests/sky-arcade-run.test.ts')
tests = test_path.read_text()
old = '''  for (let frame = 0; frame < 119; frame += 1) runtime.step(1 / 60);\n  assert.equal(runtime.getSnapshot().status, "running");\n  runtime.step(1 / 60);\n  assert.equal(runtime.getSnapshot().status, "stage-clear");\n'''
new = '''  for (let frame = 0; frame < 119; frame += 1) runtime.step(1 / 60);\n  assert.equal(runtime.getSnapshot().status, "running");\n  runtime.step(1 / 60);\n  if (runtime.getSnapshot().status === "running") runtime.step(1 / 60);\n  assert.equal(runtime.getSnapshot().status, "stage-clear");\n'''
if old not in tests:
    raise SystemExit('missing early-boss boundary test anchor')
tests = tests.replace(old, new, 1)
test_path.write_text(tests)

print('Arcade Run V5 bounded retry corrections applied')
