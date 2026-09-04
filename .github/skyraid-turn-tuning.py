from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"missing marker: {label}")
    return source.replace(old, new, 1)


path = Path("src/sky/SkyDancerSkyRaid.ts")
source = path.read_text()
source = replace_once(
    source,
    'export const SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT = "sky-dancer-sky-raid-snapshot";\n',
    'export const SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT = "sky-dancer-sky-raid-snapshot";\n'
    'export const SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0.46;\n\n'
    'export function skyDancerSkyRaidSteerInput(value: number): number {\n'
    '  // The inherited Cart controller aggressively quickens steering after this\n'
    '  // point. Keep fine stick movement unchanged, but cap large deflections so\n'
    '  // the aircraft cannot snap-turn on a phone-sized virtual stick.\n'
    '  return clamp(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT);\n'
    '}\n',
    "SKY RAID steering cap",
)
source = replace_once(
    source,
    '''  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {\n    previousStep.call(this, input, fixedDelta);\n    if (!isSkyRaidMode()) return;\n''',
    '''  sessionPrototype.step = function skyRaidStep(this: RaidSession, input: RallyInputState, fixedDelta = 1 / 60): void {\n    const skyRaidActive = isSkyRaidMode();\n    const flightInput = skyRaidActive\n      ? { ...input, steer: skyDancerSkyRaidSteerInput(input.steer) }\n      : input;\n    previousStep.call(this, flightInput, fixedDelta);\n    if (!skyRaidActive) return;\n''',
    "SKY RAID steering application",
)
path.write_text(source)

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
addition = '''\n\ntest("SKY RAID caps only large steering deflections before inherited quickening", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0\\.46/);\n  assert.match(raidSource, /return clamp\\(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT\\)/);\n  assert.match(raidSource, /steer: skyDancerSkyRaidSteerInput\\(input\\.steer\\)/);\n  assert.match(raidSource, /const skyRaidActive = isSkyRaidMode\\(\\)/);\n});\n'''
if 'SKY RAID caps only large steering deflections before inherited quickening' not in source:
    source += addition
path.write_text(source)
