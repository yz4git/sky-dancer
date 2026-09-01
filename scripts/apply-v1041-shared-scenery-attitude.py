from pathlib import Path

world_path = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
test_path = Path('tests/sky-arcade-reference.test.ts')
run_test_path = Path('tests/sky-arcade-run.test.ts')

world = world_path.read_text()
tests = test_path.read_text()
run_tests = run_test_path.read_text()

# One shared orientation for world/decorative scenery. Route-following ribbons and cues still
# use the local tangent, but 112m rigid scenery groups must not each rotate like separate cards.
marker = '''export function arcadeCourseVisualBankScaleV104(stage: SkyDancerArcadeStageDefinition): number {\n  switch (stage.biome) {\n    case "city": case "night": return .22;\n    case "ice": return .26;\n    case "volcano": return .28;\n    case "desert": return .18;\n    case "canyon": return .24;\n    default: return .28;\n  }\n}\n'''
assert marker in world
if 'arcadeSharedSceneryAttitudeV1041' not in world:
    world = world.replace(marker, marker + '''\nexport function arcadeSharedSceneryAttitudeV1041(\n  stage: SkyDancerArcadeStageDefinition,\n  distance: number,\n): { pitch: number; yaw: number; roll: number } {\n  const here=arcadeCoursePose(stage,distance);\n  return {\n    // World-authored structures all receive the same inverse current flight attitude.\n    // Their centres can follow the curved route, but they never swivel independently by depth.\n    pitch:-here.pitch,\n    yaw:here.yaw,\n    roll:-here.bank*arcadeCourseVisualBankScaleV104(stage),\n  };\n}\n''')

old_loop = '''    for(const chunk of this.chunks) {\n      const local=((chunk.index*CHUNK_LENGTH-distance)%WORLD_SPAN+WORLD_SPAN)%WORLD_SPAN;\n'''
new_loop = '''    const sceneryAttitude=arcadeSharedSceneryAttitudeV1041(this.stage,distance);\n    for(const chunk of this.chunks) {\n      const local=((chunk.index*CHUNK_LENGTH-distance)%WORLD_SPAN+WORLD_SPAN)%WORLD_SPAN;\n'''
assert old_loop in world
world = world.replace(old_loop,new_loop,1)

old_rot = '''      const bankScale=arcadeCourseVisualBankScaleV104(this.stage);\n      // V10.3.6: every course-bound chunk now uses the exact same yaw/pitch frame as the spline ribbons.\n      // The former .82/.70 skyline factors made buildings rotate on a different frame than river/ground,\n      // which read as the background drifting or detaching during turns.\n      chunk.group.rotation.y=course.yaw;\n      chunk.group.rotation.x=course.pitch;\n      chunk.group.rotation.z=course.bank*bankScale;\n      chunk.group.userData.arcadeUnifiedCourseFrameV1036=true;\n      chunk.group.userData.arcadeSingleCourseFrameV104=true;\n'''
new_rot = '''      // V10.4.1: rigid decorative scenery shares ONE attitude for the whole visible world.\n      // Before this, each 112m chunk used its own tangent and visibly swivelled like a separate card.\n      // Centres still follow the route; only genuine route geometry (terrain/ribbons/cues) bends by depth.\n      chunk.group.rotation.set(sceneryAttitude.pitch,sceneryAttitude.yaw,sceneryAttitude.roll);\n      chunk.group.userData.arcadeUnifiedCourseFrameV1036=true;\n      chunk.group.userData.arcadeSingleCourseFrameV104=true;\n      chunk.group.userData.arcadeSharedSceneryAttitudeV1041=true;\n'''
assert old_rot in world
world = world.replace(old_rot,new_rot,1)

old_backdrop = '''    if(this.backdrop){\n      const here=arcadeCoursePose(this.stage,distance);\n      const bankScale=arcadeCourseVisualBankScaleV104(this.stage);\n      this.backdrop.position.set(-here.x*.16,-here.y*.10,0);\n      this.backdrop.rotation.set(-here.pitch,here.yaw,-here.bank*bankScale);\n      this.backdrop.userData.arcadeUnifiedHorizonFrameV104=true;\n    }\n'''
new_backdrop = '''    if(this.backdrop){\n      const here=arcadeCoursePose(this.stage,distance);\n      this.backdrop.position.set(-here.x*.16,-here.y*.10,0);\n      this.backdrop.rotation.set(sceneryAttitude.pitch,sceneryAttitude.yaw,sceneryAttitude.roll);\n      this.backdrop.userData.arcadeUnifiedHorizonFrameV104=true;\n      this.backdrop.userData.arcadeSharedSceneryAttitudeV1041=true;\n    }\n'''
assert old_backdrop in world
world = world.replace(old_backdrop,new_backdrop,1)

# Update V10.4 regression: centres remain exact local-course samples while every rigid chunk and
# the distant backdrop use the same attitude.
old_import = 'import { ARCADE_NEAR_PASS_CLEARANCE_V1039, arcadeCourseVisualBankScaleV104, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";'
new_import = 'import { ARCADE_NEAR_PASS_CLEARANCE_V1039, arcadeCourseVisualBankScaleV104, arcadeSharedSceneryAttitudeV1041, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";'
assert old_import in tests
tests = tests.replace(old_import,new_import,1)

old_assert = '''      assert.ok(Math.abs(chunk.position.z-authored.z)<1e-8);\n      assert.ok(Math.abs(chunk.rotation.z-authored.bank*arcadeCourseVisualBankScaleV104(city))<1e-9);\n'''
new_assert = '''      assert.ok(Math.abs(chunk.position.z-authored.z)<1e-8);\n      const attitude=arcadeSharedSceneryAttitudeV1041(city,distance);\n      assert.ok(Math.abs(chunk.rotation.x-attitude.pitch)<1e-9);\n      assert.ok(Math.abs(chunk.rotation.y-attitude.yaw)<1e-9);\n      assert.ok(Math.abs(chunk.rotation.z-attitude.roll)<1e-9);\n      assert.equal(chunk.userData.arcadeSharedSceneryAttitudeV1041,true);\n      assert.ok(Math.abs(chunk.rotation.x-backdrop.rotation.x)<1e-9 && Math.abs(chunk.rotation.y-backdrop.rotation.y)<1e-9 && Math.abs(chunk.rotation.z-backdrop.rotation.z)<1e-9);\n'''
assert old_assert in tests
tests = tests.replace(old_assert,new_assert,1)

# Add explicit structural contract preventing the independent-card regression.
anchor = '\ntest("V10.4 visual relative pose rotates the complete centreline delta into the current tangent frame", () => {'
assert anchor in tests
extra = '''\ntest("V10.4.1 rigid background chunks rotate together instead of swivelling independently", () => {\n  const scene=new THREE.Scene();\n  const world=new SkyDancerArcadeReferenceWorld(scene);\n  for(const stage of SKY_DANCER_ARCADE_STAGES){\n    world.setStage(stage);\n    const distance=stage.durationSeconds*stage.courseSpeed*.347;\n    world.update(distance,.35,-.2);\n    const backdrop=scene.getObjectByName("arcade-product-backdrop") as THREE.Group;\n    const chunks=Array.from({length:8},(_,i)=>scene.getObjectByName(`arcade-course-chunk-${i}`) as THREE.Group);\n    assert.ok(backdrop && chunks.every(Boolean));\n    const attitude=arcadeSharedSceneryAttitudeV1041(stage,distance);\n    for(const chunk of chunks){\n      assert.equal(chunk.userData.arcadeSharedSceneryAttitudeV1041,true);\n      assert.ok(Math.abs(chunk.rotation.x-attitude.pitch)<1e-9);\n      assert.ok(Math.abs(chunk.rotation.y-attitude.yaw)<1e-9);\n      assert.ok(Math.abs(chunk.rotation.z-attitude.roll)<1e-9);\n      assert.ok(Math.abs(chunk.rotation.x-backdrop.rotation.x)+Math.abs(chunk.rotation.y-backdrop.rotation.y)+Math.abs(chunk.rotation.z-backdrop.rotation.z)<1e-9);\n    }\n  }\n  world.dispose();\n});\n'''
tests = tests.replace(anchor,extra+anchor,1)

# Source-level guard so future visual tuning cannot silently restore per-chunk tangent rotation.
run_tests += '''\n\ntest("V10.4.1 background chunk attitude has one owner", async () => {\n  const source=await readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts",import.meta.url),"utf8");\n  const update=source.slice(source.indexOf("update(distance:number"),source.indexOf("private buildContinuousTerrain"));\n  assert.match(update,/const sceneryAttitude=arcadeSharedSceneryAttitudeV1041/);\n  assert.match(update,/chunk\\.group\\.rotation\\.set\\(sceneryAttitude\\.pitch,sceneryAttitude\\.yaw,sceneryAttitude\\.roll\\)/);\n  assert.match(update,/this\\.backdrop\\.rotation\\.set\\(sceneryAttitude\\.pitch,sceneryAttitude\\.yaw,sceneryAttitude\\.roll\\)/);\n  assert.doesNotMatch(update,/chunk\\.group\\.rotation\\.y=course\\.yaw|chunk\\.group\\.rotation\\.x=course\\.pitch|chunk\\.group\\.rotation\\.z=course\\.bank/);\n});\n'''

world_path.write_text(world)
test_path.write_text(tests)
run_test_path.write_text(run_tests)
