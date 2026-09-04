from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"missing marker: {label}")
    return source.replace(old, new, 1)


# V20.1: the Sky Dancer Turbo hold is intentionally isolated from legacy
# car.boostActive. Drive presentation from the authoritative Turbo model instead.
path = Path("src/sky/SkyDancerSkyRaid.ts")
source = path.read_text()
source = replace_once(
    source,
    '''  const cruiseFx = clamp((flightSpeed - 17) / 12, 0, 1);\n  const turboFx = base.boostActive ? 1 : 0;\n  const rushFx = raid.rushActive ? 1 : 0;''',
    '''  const cruiseFx = clamp((flightSpeed - 17) / 12, 0, 1);\n  const turboState = getSkyDancerTurboState(demo.session);\n  const turboReleaseFx = Number.isFinite(turboState.releaseAgeSeconds)\n    ? clamp(1 - turboState.releaseAgeSeconds / 1.45, 0, 1)\n    : 0;\n  const turboFx = turboState.held ? 1 : turboReleaseFx * (0.72 + turboState.releaseCharge * 0.18);\n  const rushFx = raid.rushActive ? 1 : 0;''',
    "authoritative Turbo presentation state",
)
source = replace_once(
    source,
    '''      lineCount: visual?.speedFx.children.length ?? 0,\n      boostActive: base.boostActive,\n      rushActive: raid.rushActive,''',
    '''      lineCount: visual?.speedFx.children.length ?? 0,\n      turboHeld: turboState.held,\n      turboCharge: turboState.charge,\n      turboReleaseFx,\n      legacyBoostActive: base.boostActive,\n      rushActive: raid.rushActive,''',
    "V20 Turbo telemetry",
)
path.write_text(source)

# The browser still uses the real Turbo control; it now waits on the authoritative
# held state rather than the deliberately-isolated legacy boost flag.
path = Path("scripts/webgl-sky-raid-camera-edge-v17.mjs")
source = path.read_text()
source = replace_once(
    source,
    '''  await page.waitForFunction(() => window.__skyRaidGetSpeedPolish?.()?.boostActive === true, null, { timeout: 3000 });''',
    '''  await page.waitForFunction(() => window.__skyRaidGetSpeedPolish?.()?.turboHeld === true, null, { timeout: 3000 });''',
    "V20 authoritative Turbo browser wait",
)
path.write_text(source)

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
marker = '''  assert.match(raidSource, /skyRaidSpeedFxPeripheralGap = 13\\.6/);\n  assert.match(raidSource, /const cruiseFov = clamp\\(\\(speed - 18\\) \\* 0\\.10, 0, 2\\.2\\)/);'''
replacement = '''  assert.match(raidSource, /skyRaidSpeedFxPeripheralGap = 13\\.6/);\n  assert.match(raidSource, /const turboState = getSkyDancerTurboState\\(demo\\.session\\)/);\n  assert.match(raidSource, /const turboFx = turboState\\.held \\? 1 : turboReleaseFx/);\n  assert.doesNotMatch(raidSource, /const turboFx = base\\.boostActive \\? 1 : 0/);\n  assert.match(auditSource, /turboHeld === true/);\n  assert.match(raidSource, /const cruiseFov = clamp\\(\\(speed - 18\\) \\* 0\\.10, 0, 2\\.2\\)/);'''
source = replace_once(source, marker, replacement, "V20 Turbo model regression assertions")
path.write_text(source)
