from pathlib import Path

world = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
s = world.read_text()
old = '''    terrain.userData.arcadeContinuousTerrainV1037=true;\n    terrain.userData.arcadeTerrainDepthSamples=depthSamples;'''
new = '''    terrain.userData.arcadeContinuousTerrainV1037=true;\n    terrain.userData.arcadeTerrainBiome=stage.biome;\n    terrain.userData.arcadeTerrainDepthSamples=depthSamples;'''
assert old in s
world.write_text(s.replace(old, new, 1))

reference = Path('tests/sky-arcade-reference.test.ts')
s = reference.read_text()
old = '''  const length=canyon.durationSeconds*canyon.courseSpeed;\n  for(const progress of [.12,.25,.39,.51]){\n    world.update(length*progress,.8,-.6);'''
new = '''  const canyonLength=canyon.durationSeconds*canyon.courseSpeed;\n  for(const progress of [.12,.25,.39,.51]){\n    world.update(canyonLength*progress,.8,-.6);'''
assert old in s
reference.write_text(s.replace(old, new, 1))

run_test = Path('tests/sky-arcade-run.test.ts')
s = run_test.read_text()
old = '''  assert.match(world, /SURFACE_CHUNK_DEPTH = CHUNK_LENGTH \\+ 32/);\n  assert.match(world, /PlaneGeometry\\(260,SURFACE_CHUNK_DEPTH,48,36\\)/);'''
new = '''  assert.match(world, /arcade-continuous-terrain-ribbon/);\n  assert.match(world, /arcadeContinuousTerrainV1037=true/);\n  assert.match(world, /const depthSamples=42,lateralSamples=25,width=260/);\n  assert.doesNotMatch(world, /PlaneGeometry\\(260,SURFACE_CHUNK_DEPTH,48,36\\)/);'''
assert old in s
run_test.write_text(s.replace(old, new, 1))
