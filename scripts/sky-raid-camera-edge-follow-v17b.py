from pathlib import Path

path = Path("src/sky/SkyDancerSkyRaid.ts")
source = path.read_text()
old = """  const frameAssist = clamp(0.58 + Math.abs(verticalSpeed) / 16 * 0.20 + altitudeEdgeBlend * 0.34, 0.58, 1.0);\n  const frameCorrection = clamp(verticalFrameError * 3.4 * frameAssist, -1.85, 1.85);"""
new = """  const frameAssist = clamp(0.58 + Math.abs(verticalSpeed) / 16 * 0.20 + altitudeEdgeBlend * 0.34, 0.58, 1.0);\n  // The normal-flight correction stays subtle, but at either hard altitude stop\n  // the camera must decisively follow the aircraft instead of letting it sit at\n  // the top/bottom edge. Edge gain ramps independently so mid-flight framing is\n  // unchanged while the limit case gets enough authority to recenter the craft.\n  const edgeFrameGain = 3.4 + altitudeEdgeBlend * 6.6;\n  const frameCorrection = clamp(verticalFrameError * edgeFrameGain * frameAssist, -6.0, 6.0);"""
if old not in source:
    raise SystemExit("V17 frame correction marker missing")
path.write_text(source.replace(old, new, 1))

test = Path("tests/sky-sky-raid-reference-world.test.ts")
test_source = test.read_text()
marker = "  assert.match(raid, /frameCorrection/);"
replacement = "  assert.match(raid, /edgeFrameGain/);\n  assert.match(raid, /frameCorrection/);"
if marker not in test_source:
    raise SystemExit("V17 regression marker missing")
test.write_text(test_source.replace(marker, replacement, 1))
