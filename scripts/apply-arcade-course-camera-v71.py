from pathlib import Path

DEMO = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
TEST = Path("tests/sky-arcade-run.test.ts")
SELF = Path("scripts/apply-arcade-course-camera-v71.py")
WORKFLOW = Path(".github/workflows/arcade-course-camera-v71-once.yml")

old = '''  private updateCamera(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);\n    const pose = arcadeCameraPose(snapshot.playerX, snapshot.playerY, this.camera.aspect, snapshot.turboActive);\n    const course = arcadeCoursePose(snapshot.stage, snapshot.distance);\n    const courseAim = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, 72);\n    const shakeX = Math.sin(snapshot.runTimeSeconds * 79) * this.cameraShake * .25;\n    const shakeY = Math.cos(snapshot.runTimeSeconds * 91) * this.cameraShake * .18;\n    const targetX = pose.x + shakeX;\n    const targetY = pose.y + shakeY;\n    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 4.25);\n    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 4.25);\n    this.camera.position.z += (pose.z - this.camera.position.z) * Math.min(1, delta * 4.5);\n    this.camera.fov += (pose.fov - this.camera.fov) * Math.min(1, delta * 4.5);\n    this.camera.updateProjectionMatrix();\n    this.camera.lookAt(pose.lookX + courseAim.x * .16, pose.lookY + courseAim.y * .17, pose.lookZ);\n    // Let the aircraft bank dramatically while keeping the horizon readable on a phone.\n    this.camera.rotateZ(pose.roll + course.bank * .28 + courseAim.bank * .08);\n  }\n'''

new = '''  private updateCamera(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);\n    const pose = arcadeCameraPose(snapshot.playerX, snapshot.playerY, this.camera.aspect, snapshot.turboActive);\n    const course = arcadeCoursePose(snapshot.stage, snapshot.distance);\n    // V7.1: use two look-ahead samples but deliberately lag the spline. The near sample keeps\n    // the player aimed into the corridor while the far sample is weak enough that the next bend\n    // remains visibly off-centre instead of being camera-corrected into a straight tunnel.\n    const nearCourse = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, 42);\n    const farCourse = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, 132);\n    const shakeX = Math.sin(snapshot.runTimeSeconds * 79) * this.cameraShake * .25;\n    const shakeY = Math.cos(snapshot.runTimeSeconds * 91) * this.cameraShake * .18;\n    const targetX = pose.x + shakeX - nearCourse.x * .018;\n    const targetY = pose.y + shakeY - nearCourse.y * .012;\n    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 4.0);\n    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 4.0);\n    this.camera.position.z += (pose.z - this.camera.position.z) * Math.min(1, delta * 4.5);\n    this.camera.fov += (pose.fov - this.camera.fov) * Math.min(1, delta * 4.5);\n    this.camera.updateProjectionMatrix();\n    this.camera.lookAt(\n      pose.lookX + nearCourse.x * .055 + farCourse.x * .028,\n      pose.lookY + nearCourse.y * .07 + farCourse.y * .018,\n      pose.lookZ,\n    );\n    // Bank enough to sell the turn, but do not rotate the horizon so far that the bend disappears.\n    this.camera.rotateZ(pose.roll + course.bank * .32 + nearCourse.bank * .05);\n  }\n'''

demo = DEMO.read_text()
if old not in demo:
    raise SystemExit("expected updateCamera block not found")
DEMO.write_text(demo.replace(old, new, 1))

test = TEST.read_text()
legacy = '  assert.match(webglSource, /course\\.bank \\* \\.28 \\+ courseAim\\.bank \\* \\.08/);'
replacement = '''  assert.match(webglSource, /course\\.bank \\* \\.32 \\+ nearCourse\\.bank \\* \\.05/);\n  assert.match(webglSource, /farCourse = arcadeCourseRelativePose\\(snapshot\\.stage, snapshot\\.distance, 132\\)/);'''
if legacy not in test:
    raise SystemExit("expected V6.2 camera readability assertion not found")
test = test.replace(legacy, replacement, 1)

marker = 'test("V7.1 chase camera deliberately lags the shared course so bends remain visible"'
if marker not in test:
    test += '''\n\ntest("V7.1 chase camera deliberately lags the shared course so bends remain visible", async () => {\n  const webgl = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");\n  assert.match(webgl, /nearCourse = arcadeCourseRelativePose\\(snapshot\\.stage, snapshot\\.distance, 42\\)/);\n  assert.match(webgl, /farCourse = arcadeCourseRelativePose\\(snapshot\\.stage, snapshot\\.distance, 132\\)/);\n  assert.match(webgl, /nearCourse\\.x \\* \\.055 \\+ farCourse\\.x \\* \\.028/);\n  assert.doesNotMatch(webgl, /courseAim\\.x \\* \\.16/);\n});\n'''
TEST.write_text(test)

SELF.unlink(missing_ok=True)
WORKFLOW.unlink(missing_ok=True)
