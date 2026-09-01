from pathlib import Path

webgl_path = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
reference_test_path = Path('tests/sky-arcade-reference.test.ts')
run_test_path = Path('tests/sky-arcade-run.test.ts')

webgl = webgl_path.read_text()
reference_tests = reference_test_path.read_text()
run_tests = run_test_path.read_text()

# The first V10.4 pass converted every live combat object to the player-local course frame,
# but impact FX still used legacy -depth on Z. Keep transient effects on exactly the same frame.
old_fx = 'const position = new THREE.Vector3(impact.x * 8.4 + course.x, 1.2 + impact.y * 4.9 + course.y, -impact.depth);'
new_fx = 'const position = new THREE.Vector3(impact.x * 8.4 + course.x, 1.2 + impact.y * 4.9 + course.y, course.z);'
assert old_fx in webgl
webgl = webgl.replace(old_fx, new_fx)

# Streaming continuity is no longer a literal +1 along raw scene Z because the whole relative
# vector is rotated into the current tangent frame. Test smooth finite motion instead.
old_stream = '''    world.update(10, 0, 0); const before = chunks[0].position.z;\n    world.update(11, 0, 0); assert.ok(Math.abs(chunks[0].position.z - before - 1) < 1e-6);\n'''
new_stream = '''    world.update(10, 0, 0); const before = chunks[0].position.clone();\n    world.update(11, 0, 0);\n    const streamedStep = chunks[0].position.distanceTo(before);\n    assert.ok(Number.isFinite(streamedStep) && streamedStep > .01 && streamedStep < 8, `${stage.id} streamed step ${streamedStep}`);\n'''
assert old_stream in reference_tests
reference_tests = reference_tests.replace(old_stream, new_stream)

# Ice guide ribs now use the player-local visual pose; verify complete centre tethering.
old_ice = '''    const authored=arcadeCourseRelativePose(ice,auditDistance,depth);\n    assert.ok(Math.abs(cue.position.y-authored.y)<1e-6,\n      "ice guide ribs must remain tethered to the actual course centre instead of floating independently");\n'''
new_ice = '''    const authored=arcadeCourseRelativeVisualPose(ice,auditDistance,depth);\n    assert.ok(Math.abs(cue.position.x-authored.x)<1e-6 && Math.abs(cue.position.y-authored.y)<1e-6 && Math.abs(cue.position.z-authored.z)<1e-6,\n      "ice guide ribs must remain tethered to the complete player-local course centre instead of floating independently");\n'''
assert old_ice in reference_tests
reference_tests = reference_tests.replace(old_ice, new_ice)

# V6.2 used to freeze a particular camera/course coupling as a source-level contract. V10.4
# deliberately removes that double ownership while preserving all opening-pressure rules.
old_v62 = '''  assert.match(webglSource, /denseSkyline = snapshot\\.stage\\.biome === "city" \\|\\| snapshot\\.stage\\.biome === "night"/);\n  assert.match(webglSource, /course\\.bank \\* \\(denseSkyline \\? \\.34 : \\.56\\)/);\n  assert.match(webglSource, /nearCourse\\.bank \\* \\(denseSkyline \\? \\.07 : \\.14\\)/);\n  assert.match(webglSource, /farCourse = arcadeCourseRelativePose\\(snapshot\\.stage, snapshot\\.distance, 132\\)/);\n'''
new_v62 = '''  const cameraSource = webglSource.slice(webglSource.indexOf("private updateCamera"), webglSource.indexOf("private resize"));\n  assert.doesNotMatch(cameraSource, /denseSkyline|nearCourse|farCourse|course\\.bank|course\\.yaw|course\\.pitch/);\n  assert.match(cameraSource, /const targetX = pose\\.x \\+ shakeX/);\n  assert.match(cameraSource, /const desiredRoll = pose\\.roll/);\n'''
assert old_v62 in run_tests
run_tests = run_tests.replace(old_v62, new_v62)

old_v71 = '''test("V7.1 chase camera deliberately lags the shared course so bends remain visible", async () => {\n  const webgl = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");\n  assert.match(webgl, /nearCourse = arcadeCourseRelativePose\\(snapshot\\.stage, snapshot\\.distance, 42\\)/);\n  assert.match(webgl, /farCourse = arcadeCourseRelativePose\\(snapshot\\.stage, snapshot\\.distance, 132\\)/);\n  assert.match(webgl, /nearCourse\\.x \\* \\.14 \\+ farCourse\\.x \\* \\.06 \\+ course\\.yaw \\* 3\\.6/);\n  assert.doesNotMatch(webgl, /courseAim\\.x \\* \\.16/);\n  assert.match(webgl, /const iceCourse = snapshot\\.stage\\.biome === "ice"/);\n  assert.match(webgl, /nearCourse\\.y \\* \\(iceCourse \\? \\.018 : \\.105\\)/);\n  assert.match(webgl, /farCourse\\.y \\* \\(iceCourse \\? \\.006 : \\.032\\) \\+ course\\.pitch \\* 2\\.2/);\n});\n'''
new_v71 = '''test("V10.4 chase camera stays player-relative while the shared visual course frame owns bends", async () => {\n  const webgl = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");\n  const camera = webgl.slice(webgl.indexOf("private updateCamera"), webgl.indexOf("private resize"));\n  assert.doesNotMatch(camera, /nearCourse|farCourse|course\\.yaw|course\\.pitch|course\\.bank/);\n  assert.match(webgl, /arcadeCourseRelativeVisualPose\\(snapshot\\.stage, snapshot\\.distance, enemy\\.depth\\)/);\n  assert.match(camera, /const desiredLookX = pose\\.lookX/);\n  assert.match(camera, /const desiredLookY = pose\\.lookY/);\n});\n'''
assert old_v71 in run_tests
run_tests = run_tests.replace(old_v71, new_v71)

webgl_path.write_text(webgl)
reference_test_path.write_text(reference_tests)
run_test_path.write_text(run_tests)
