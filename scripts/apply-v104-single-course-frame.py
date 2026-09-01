from pathlib import Path

course_path = Path('src/sky/arcade/SkyDancerArcadeCoursePath.ts')
world_path = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
webgl_path = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
test_path = Path('tests/sky-arcade-reference.test.ts')

course = course_path.read_text()
world = world_path.read_text()
webgl = webgl_path.read_text()
tests = test_path.read_text()

# --- CoursePath: add a mathematically correct player-local visual frame. ---
marker = '''export function arcadeCourseRelativePose(\n  stage: SkyDancerArcadeStageDefinition,\n  distance: number,\n  depth: number,\n): SkyDancerArcadeCoursePose {\n'''
assert marker in course
if 'arcadeCourseRelativeVisualPose' not in course:
    course += '''\n\nexport interface SkyDancerArcadeVisualCoursePose extends SkyDancerArcadeCoursePose {\n  z: number;\n}\n\n/**\n * V10.4: one visual course frame for scenery and combat presentation.\n * The older relative pose subtracts course centres but leaves that delta in world axes.\n * When the current tangent turns, rotating each child while leaving its centre in world axes\n * makes neighbouring layers appear to slide independently.  This helper rotates the complete\n * relative position into the player's current yaw/pitch frame before any renderer uses it.\n */\nexport function arcadeCourseRelativeVisualPose(\n  stage: SkyDancerArcadeStageDefinition,\n  distance: number,\n  depth: number,\n): SkyDancerArcadeVisualCoursePose {\n  const here = arcadeCoursePose(stage, distance);\n  const there = arcadeCoursePose(stage, distance + depth);\n  const dx = there.x - here.x;\n  const dy = there.y - here.y;\n  const dz = -depth;\n\n  // Heading is measured against forward -Z, so +here.yaw aligns the current tangent to -Z.\n  const cy = Math.cos(here.yaw), sy = Math.sin(here.yaw);\n  const x1 = dx * cy + dz * sy;\n  const z1 = -dx * sy + dz * cy;\n\n  // Remove the current climb/dive as one frame as well.  Bank is a visual roll, not path position.\n  const cp = Math.cos(here.pitch), sp = Math.sin(here.pitch);\n  const y1 = dy * cp + z1 * sp;\n  const z2 = -dy * sp + z1 * cp;\n\n  return {\n    x: x1,\n    y: y1,\n    z: z2,\n    yaw: there.yaw - here.yaw,\n    pitch: there.pitch - here.pitch,\n    bank: there.bank - here.bank,\n  };\n}\n'''

# --- ReferenceWorld: all course-bound visual layers use the same frame and same stage bank scale. ---
world = world.replace('import { arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";',
                      'import { arcadeCoursePose, arcadeCourseRelativeVisualPose } from "./SkyDancerArcadeCoursePath";')

anchor = 'const random = (seed: number) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);\n'
assert anchor in world
if 'arcadeCourseVisualBankScaleV104' not in world:
    world = world.replace(anchor, anchor + '''\nexport function arcadeCourseVisualBankScaleV104(stage: SkyDancerArcadeStageDefinition): number {\n  switch (stage.biome) {\n    case "city": case "night": return .22;\n    case "ice": return .26;\n    case "volcano": return .28;\n    case "desert": return .18;\n    case "canyon": return .24;\n    default: return .28;\n  }\n}\n''')

world = world.replace('arcadeCourseRelativePose(', 'arcadeCourseRelativeVisualPose(')

old_chunk = '''      chunk.group.position.z=-depth;\n      chunk.group.position.x=course.x-playerX*.35;\n      chunk.group.position.y=course.y-playerY*.16;\n      const skylineStage=this.stage.biome==="city"||this.stage.biome==="night";\n      const bankScale=skylineStage?.22:this.stage.biome==="ice"?.26:this.stage.biome==="volcano"?.28:.38;\n'''
new_chunk = '''      chunk.group.position.set(course.x-playerX*.35,course.y-playerY*.16,course.z);\n      const bankScale=arcadeCourseVisualBankScaleV104(this.stage);\n'''
assert old_chunk in world
world = world.replace(old_chunk, new_chunk)

# Whole horizon group follows the current player-local frame; no child gets an independent horizon transform.
needle = '''    if(this.terrainRibbon)this.updateContinuousTerrain(distance,playerX,playerY);\n'''
assert needle in world
world = world.replace(needle, '''    if(this.backdrop){\n      const here=arcadeCoursePose(this.stage,distance);\n      const bankScale=arcadeCourseVisualBankScaleV104(this.stage);\n      this.backdrop.position.set(-here.x*.16,-here.y*.10,0);\n      this.backdrop.rotation.set(-here.pitch,here.yaw,-here.bank*bankScale);\n      this.backdrop.userData.arcadeUnifiedHorizonFrameV104=true;\n    }\n    if(this.terrainRibbon)this.updateContinuousTerrain(distance,playerX,playerY);\n''')

world = world.replace('      const bankScale=this.stage.biome==="desert"?.1:this.stage.biome==="ice"?.12:.16;\n',
                      '      const bankScale=arcadeCourseVisualBankScaleV104(this.stage);\n')
world = world.replace('        p[i+2]=-depth-sinYaw*lateral;\n', '        p[i+2]=course.z-sinYaw*lateral;\n')
world = world.replace('        const cz=-depth;\n', '        const cz=course.z;\n')
world = world.replace('      cue.group.position.set(course.x-playerX*.35,course.y-playerY*.16,-cue.depth);\n',
                      '      cue.group.position.set(course.x-playerX*.35,course.y-playerY*.16,course.z);\n')
world = world.replace('      const cueBankScale=cue.kind==="ice"?.26:cue.kind==="volcano"?.28:.38;\n',
                      '      const cueBankScale=arcadeCourseVisualBankScaleV104(this.stage);\n')
world = world.replace('        const bankY=course.bank*localHalf*.08;\n',
                      '        const bankY=course.bank*localHalf*arcadeCourseVisualBankScaleV104(stage);\n')
world = world.replace('        const bankY=course.bank*half*.28;\n',
                      '        const bankY=course.bank*half*arcadeCourseVisualBankScaleV104(stage);\n')
# City bank/river are city-only, but reference the same named scale to prevent future drift.
world = world.replace('        const bankY=course.bank*half*.22;\n',
                      '        const bankY=course.bank*half*arcadeCourseVisualBankScaleV104(this.stage!);\n')
world = world.replace('          array[base+1]=cy+course.bank*offset*.22;\n',
                      '          array[base+1]=cy+course.bank*offset*arcadeCourseVisualBankScaleV104(this.stage!);\n')

# Update legacy marker wording; V10.4 supersedes the stable-horizon assumption.
world = world.replace('    this.backdrop.userData.arcadeBackdropStableHorizonV1036=true;\n',
                      '    this.backdrop.userData.arcadeBackdropStableHorizonV1036=false;\n    this.backdrop.userData.arcadeUnifiedHorizonFrameV104=true;\n')
world = world.replace('      chunk.group.userData.arcadeUnifiedCourseFrameV1036=true;\n',
                      '      chunk.group.userData.arcadeUnifiedCourseFrameV1036=true;\n      chunk.group.userData.arcadeSingleCourseFrameV104=true;\n')

# --- WebGL presentation: the environment owns course motion.  Camera must not apply the path a second time. ---
webgl = webgl.replace('import { arcadeCoursePose, arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";',
                      'import { arcadeCoursePose, arcadeCourseRelativeVisualPose } from "./SkyDancerArcadeCoursePath";')
webgl = webgl.replace('arcadeCourseRelativePose(', 'arcadeCourseRelativeVisualPose(')
webgl = webgl.replace('group.position.set(enemy.x * 8.4 + course.x, 1.2 + enemy.y * 4.9 + course.y, -enemy.depth);',
                      'group.position.set(enemy.x * 8.4 + course.x, 1.2 + enemy.y * 4.9 + course.y, course.z);')
webgl = webgl.replace('const targetZ = -enemy.depth + (reaction?.z ?? 0);',
                      'const targetZ = course.z + (reaction?.z ?? 0);')
webgl = webgl.replace('mesh.position.set(projectile.x * 8.4 + course.x, 1.2 + projectile.y * 4.9 + course.y, -projectile.depth);',
                      'mesh.position.set(projectile.x * 8.4 + course.x, 1.2 + projectile.y * 4.9 + course.y, course.z);')
webgl = webgl.replace('group.position.set(hazard.x * 8.4 + course.x, 1.2 + hazard.y * 4.9 + course.y, -hazard.depth);',
                      'group.position.set(hazard.x * 8.4 + course.x, 1.2 + hazard.y * 4.9 + course.y, course.z);')
webgl = webgl.replace('child.position.set(baseX + course.x, 1.2 + course.y, -gateDepth);',
                      'child.position.set(baseX + course.x, 1.2 + course.y, course.z);')

old_camera = '''    const course = arcadeCoursePose(snapshot.stage, snapshot.distance);\n    // V7.1: use two look-ahead samples but deliberately lag the spline. The near sample keeps\n    // the player aimed into the corridor while the far sample is weak enough that the next bend\n    // remains visibly off-centre instead of being camera-corrected into a straight tunnel.\n    const nearCourse = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, 42);\n    const farCourse = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, 132);\n'''
assert old_camera in webgl
webgl = webgl.replace(old_camera, '''    // V10.4: one owner for course motion.  Scenery/combat are already converted into the\n    // player-local course frame, so the chase camera must not yaw/pitch/translate by the path again.\n''')
webgl = webgl.replace('    const iceCourse = snapshot.stage.biome === "ice";\n    const denseSkyline = snapshot.stage.biome === "city" || snapshot.stage.biome === "night";\n', '')
webgl = webgl.replace('    const targetX = pose.x + shakeX - nearCourse.x * .052 - course.yaw * 1.65;\n    const targetY = pose.y + shakeY - nearCourse.y * (iceCourse ? .008 : .028) + course.pitch * .9;\n',
                      '    const targetX = pose.x + shakeX;\n    const targetY = pose.y + shakeY;\n')
webgl = webgl.replace('    const desiredLookX = pose.lookX + nearCourse.x * .14 + farCourse.x * .06 + course.yaw * 3.6;\n    const desiredLookY = pose.lookY + nearCourse.y * (iceCourse ? .018 : .105) + farCourse.y * (iceCourse ? .006 : .032) + course.pitch * 2.2;\n',
                      '    const desiredLookX = pose.lookX;\n    const desiredLookY = pose.lookY;\n')
webgl = webgl.replace('    // Dense city silhouettes still use the calmer bank authored in V10.3.5, but the roll itself no longer snaps.\n    const desiredRoll = pose.roll + course.bank * (denseSkyline ? .34 : .56) + nearCourse.bank * (denseSkyline ? .07 : .14);\n',
                      '    // Course roll is already expressed by the single local scenery frame and by aircraft attitude.\n    const desiredRoll = pose.roll;\n')

# --- Regression tests: replace the old stable-horizon contract and verify one frame owner. ---
tests = tests.replace('import { arcadeCoursePose, arcadeCourseRelativePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";',
                      'import { arcadeCoursePose, arcadeCourseRelativePose, arcadeCourseRelativeVisualPose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";')
tests = tests.replace('import { ARCADE_NEAR_PASS_CLEARANCE_V1039, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";',
                      'import { ARCADE_NEAR_PASS_CLEARANCE_V1039, arcadeCourseVisualBankScaleV104, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";')
start = tests.index('test("V10.3.6 keeps the horizon stable while every course-bound layer shares one spline frame"')
end = tests.index('\ntest("missile trails and explosions keep a bounded mesh and buffer count under load"', start)
replacement = '''test("V10.4 uses one player-local course frame for horizon, streamed scenery and ribbons", () => {\n  const city=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="city")!;\n  const volcano=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="volcano")!;\n  const scene=new THREE.Scene();\n  const world=new SkyDancerArcadeReferenceWorld(scene);\n  world.setStage(city);\n  const backdrop=scene.getObjectByName("arcade-product-backdrop") as THREE.Group;\n  assert.ok(backdrop instanceof THREE.Group);\n  const length=city.durationSeconds*city.courseSpeed;\n  for(const progress of [.06,.12,.18,.25,.32,.4]){\n    const distance=length*progress;\n    world.update(distance,.8,-.6);\n    assert.equal(backdrop.userData.arcadeUnifiedHorizonFrameV104,true);\n    assert.ok(Number.isFinite(backdrop.rotation.x+backdrop.rotation.y+backdrop.rotation.z));\n    for(let i=0;i<8;i++){\n      const chunk=scene.getObjectByName(`arcade-course-chunk-${i}`) as THREE.Group;\n      assert.ok(chunk && chunk.userData.arcadeSingleCourseFrameV104===true);\n      const local=((i*112-distance)%(112*8)+(112*8))%(112*8);\n      const depth=local-140;\n      const authored=arcadeCourseRelativeVisualPose(city,distance,depth);\n      assert.ok(Math.abs(chunk.position.x-(authored.x-.8*.35))<1e-8);\n      assert.ok(Math.abs(chunk.position.y-(authored.y-(-.6)*.16))<1e-8);\n      assert.ok(Math.abs(chunk.position.z-authored.z)<1e-8);\n      assert.ok(Math.abs(chunk.rotation.z-authored.bank*arcadeCourseVisualBankScaleV104(city))<1e-9);\n    }\n  }\n  world.setStage(volcano);\n  const volcanoDistance=volcano.durationSeconds*volcano.courseSpeed*.29;\n  world.update(volcanoDistance,-.7,.5);\n  const terrain=scene.getObjectByName("arcade-continuous-terrain-ribbon") as THREE.Mesh;\n  assert.ok(terrain instanceof THREE.Mesh);\n  const cues=scene.getObjectsByProperty("name","arcade-volcano-route-cue") as THREE.Group[];\n  for(const cue of cues){\n    const depth=Number(cue.userData.arcadeRouteDepth);\n    const authored=arcadeCourseRelativeVisualPose(volcano,volcanoDistance,depth);\n    assert.ok(Math.abs(cue.position.z-authored.z)<1e-8);\n    assert.ok(Math.abs(cue.rotation.z-authored.bank*arcadeCourseVisualBankScaleV104(volcano))<1e-9);\n  }\n  world.dispose();\n});\n\ntest("V10.4 visual relative pose rotates the complete centreline delta into the current tangent frame", () => {\n  for(const stage of SKY_DANCER_ARCADE_STAGES){\n    const distance=stage.durationSeconds*stage.courseSpeed*.31;\n    const zero=arcadeCourseRelativeVisualPose(stage,distance,0);\n    assert.ok(Math.abs(zero.x)+Math.abs(zero.y)+Math.abs(zero.z)+Math.abs(zero.yaw)+Math.abs(zero.pitch)+Math.abs(zero.bank)<1e-10);\n    for(const depth of [24,72,160]){\n      const visual=arcadeCourseRelativeVisualPose(stage,distance,depth);\n      assert.ok([visual.x,visual.y,visual.z,visual.yaw,visual.pitch,visual.bank].every(Number.isFinite));\n      assert.ok(visual.z<0,`${stage.id} depth ${depth} remains ahead of the camera`);\n    }\n  }\n});\n'''
tests = tests[:start] + replacement + tests[end:]

# Source-level camera guard: no course path contribution in updateCamera after V10.4.
if 'V10.4 camera has one owner' not in tests:
    tests += '''\n\ntest("V10.4 camera has one owner for course motion instead of double-transforming the background", async () => {\n  const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",import.meta.url),"utf8"));\n  const camera=source.slice(source.indexOf("private updateCamera"),source.indexOf("private resize"));\n  assert.doesNotMatch(camera,/course\\.yaw|course\\.pitch|course\\.bank|nearCourse|farCourse/);\n  assert.match(camera,/const targetX = pose\\.x \\+ shakeX/);\n  assert.match(camera,/const desiredRoll = pose\\.roll/);\n});\n'''

course_path.write_text(course)
world_path.write_text(world)
webgl_path.write_text(webgl)
test_path.write_text(tests)
