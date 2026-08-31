from pathlib import Path

ROOT = Path('.')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'missing pattern in {path}: {old!r}')
    p.write_text(text.replace(old, new, 1))

replace_once(
    'src/sky/arcade/SkyDancerArcadeCoursePath.ts',
    '  city: { turns: 1.35, lateral: 1.0, vertical: 4.2, phase: 0.15 },',
    '  city: { turns: 1.62, lateral: 1.18, vertical: 4.8, phase: 0.15 },',
)

replace_once(
    'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts',
    '    const targetRoll = THREE.MathUtils.clamp(-vx * .3, -.48, .48) - snapshot.playerX * .06 + course.bank * .62;',
    '    const targetRoll = THREE.MathUtils.clamp(-vx * .3, -.48, .48) - snapshot.playerX * .06 + course.bank * .82;',
)
replace_once(
    'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts',
    '    this.camera.lookAt(pose.lookX + courseAim.x * .28, pose.lookY + courseAim.y * .24, pose.lookZ);',
    '    this.camera.lookAt(pose.lookX + courseAim.x * .16, pose.lookY + courseAim.y * .17, pose.lookZ);',
)
replace_once(
    'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts',
    '    this.camera.rotateZ(pose.roll + course.bank * .32 + courseAim.bank * .22);',
    '    this.camera.rotateZ(pose.roll + course.bank * .44 + courseAim.bank * .16);',
)

# Add a source-level regression contract for the visual tuning found during the V6 screenshot review.
test_path = ROOT / 'tests/sky-arcade-course-path.test.ts'
test_text = test_path.read_text()
needle = '''test("V6 near and far objects resolve onto the same curved corridor", () => {'''
insert = '''test("V6.1 Dawn City opens with a clearly readable S-turn", () => {\n  const stage = SKY_DANCER_ARCADE_STAGES[0];\n  const first = arcadeCoursePose(stage, stage.courseSpeed * 3.5);\n  const second = arcadeCoursePose(stage, stage.courseSpeed * 9.5);\n  assert.ok(Math.abs(first.yaw) > 0.06, `early yaw ${first.yaw}`);\n  assert.ok(Math.abs(second.x - first.x) > 7.5, `early S travel ${second.x - first.x}`);\n});\n\n'''
if insert not in test_text:
    if needle not in test_text:
        raise SystemExit('missing course test insertion point')
    test_text = test_text.replace(needle, insert + needle, 1)
    test_path.write_text(test_text)

# V6 screenshot coverage already captures three centered course positions. Mark the audit generation.
replace_once(
    'scripts/webgl-arcade-run-reference-audit.mjs',
    '// 2026-08-31 V6 visual playcheck: verify a visibly bending 3D course, readable fly-bys, four-minute pacing and combat.',
    '// 2026-08-31 V6.1 visual playcheck: verify the stronger opening S-turn, readable banking, fly-bys and combat.',
)

print('Arcade Run V6.1 curve readability patch applied')
