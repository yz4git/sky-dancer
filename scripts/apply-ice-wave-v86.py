from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

course = "src/sky/arcade/SkyDancerArcadeCoursePath.ts"
world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
reference_test = "tests/sky-arcade-reference.test.ts"
run_test = "tests/sky-arcade-run.test.ts"

replace_once(course,
    '  ice: { turns: 2.72, lateral: 1.14, vertical: 10.6, phase: 2.98 },\n',
    '  ice: { turns: 2.72, lateral: 1.14, vertical: 14.2, phase: 2.98 },\n',
    "ice profile vertical span")
replace_once(course,
    '    y += (Math.sin(u * TAU * 2.35 - 0.4) - Math.sin(-0.4)) * 8.5;\n',
    '    y += (Math.sin(u * TAU * 2.35 - 0.4) - Math.sin(-0.4)) * 13.5;\n',
    "ice primary vertical wave")
replace_once(course,
    '    y += (Math.sin(u * TAU * 4.7 + 0.8) - Math.sin(0.8)) * 3.2;\n',
    '    y += (Math.sin(u * TAU * 4.7 + 0.8) - Math.sin(0.8)) * 5.0;\n',
    "ice secondary vertical wave")
replace_once(course,
    '    case "ice": return { yaw: 0.43, pitch: 0.30, bank: 1.38 };\n',
    '    case "ice": return { yaw: 0.43, pitch: 0.33, bank: 1.38 };\n',
    "ice pitch limit")

replace_once(world,
    '      const yScale=cue.kind==="ice"?1.18:1;\n',
    '      const yScale=cue.kind==="ice"?1.55:1;\n',
    "ice route cue vertical scale")
replace_once(world,
    '      cue.group.rotation.x=course.pitch*(cue.kind==="ice"?1.6:.78);\n',
    '      cue.group.rotation.x=course.pitch*(cue.kind==="ice"?1.95:.78);\n',
    "ice route cue pitch")
replace_once(world,
    '    const count=kind==="ice"?11:10;\n',
    '    const count=kind==="ice"?9:10;\n',
    "ice route cue count")
replace_once(world,
    '      const depth=kind==="ice"?22+i*31:26+i*43;\n',
    '      const depth=kind==="ice"?24+i*40:26+i*43;\n',
    "ice route cue spacing")

replace_once(webgl,
    '    const targetX = pose.x + shakeX - nearCourse.x * .018;\n    const targetY = pose.y + shakeY - nearCourse.y * .012;\n',
    '    const iceCourse = snapshot.stage.biome === "ice";\n    const targetX = pose.x + shakeX - nearCourse.x * .018;\n    const targetY = pose.y + shakeY - nearCourse.y * (iceCourse ? .004 : .012);\n',
    "ice vertical camera lag")
replace_once(webgl,
    '      pose.lookY + nearCourse.y * .07 + farCourse.y * .018,\n',
    '      pose.lookY + nearCourse.y * (iceCourse ? .025 : .07) + farCourse.y * (iceCourse ? .004 : .018),\n',
    "ice vertical look lag")

replace_once(reference_test,
    'test("V8.5 ice cavern visual ribs follow the real vertical course wave", () => {\n',
    'test("V8.6 ice cavern visual ribs expose the stronger real vertical course wave", () => {\n',
    "ice visual test name")
replace_once(reference_test,
    '  assert.equal(cues.length, 11);\n  assert.equal(scene.getObjectsByProperty("name", "arcade-ice-wave-arch").length, 11);\n',
    '  assert.equal(cues.length, 9);\n  assert.equal(scene.getObjectsByProperty("name", "arcade-ice-wave-arch").length, 9);\n',
    "ice cue test count")
replace_once(reference_test,
    '  assert.ok(Math.max(...ys)-Math.min(...ys)>12,\n',
    '  assert.ok(Math.max(...ys)-Math.min(...ys)>22,\n',
    "ice cue y threshold")
replace_once(reference_test,
    '  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.18,\n',
    '  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.24,\n',
    "ice cue pitch threshold")

replace_once(run_test,
    '  assert.ok(span(ice.map((pose) => pose.y)) > 30, "ice tunnel vertical span");\n',
    '  assert.ok(span(ice.map((pose) => pose.y)) > 42, "ice tunnel vertical span");\n',
    "ice course vertical threshold")
replace_once(run_test,
    '  assert.doesNotMatch(webgl, /courseAim\\.x \\* \\.16/);\n});\n',
    '  assert.doesNotMatch(webgl, /courseAim\\.x \\* \\.16/);\n  assert.match(webgl, /const iceCourse = snapshot\\.stage\\.biome === "ice"/);\n  assert.match(webgl, /nearCourse\\.y \\* \\(iceCourse \\? \\.025 : \\.07\\)/);\n  assert.match(webgl, /farCourse\\.y \\* \\(iceCourse \\? \\.004 : \\.018\\)/);\n});\n',
    "ice camera regression")

print("Applied Ice Cavern V8.6 vertical signature pass")
