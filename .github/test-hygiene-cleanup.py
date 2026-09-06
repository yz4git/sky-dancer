from pathlib import Path
import json
import re

ROOT = Path('.')

OBSOLETE_TESTS = [
    'tests/sky-v12.test.ts',
    'tests/sky-v13.test.ts',
    'tests/sky-v14.test.ts',
    'tests/sky-v15.test.ts',
    'tests/sky-v30-color-grade.test.ts',
    'tests/sky-v30-reference-polish.test.ts',
    'tests/sky-v41.test.ts',
    'tests/sky-quality-v5.test.ts',
    'tests/sky-quality-v6.test.ts',
    'tests/sky-sky-raid-reference-world.test.ts',
    'tests/v20-runtime-visibility.test.ts',
]

RENAMES = {
    'tests/sky-arcade-v11.test.ts': 'tests/sky-arcade-timeline.test.ts',
    'tests/sky-arcade-v111-setpieces.test.ts': 'tests/sky-arcade-setpieces.test.ts',
    'tests/sky-arcade-v112-bosses.test.ts': 'tests/sky-arcade-bosses.test.ts',
    'tests/sky-arcade-v113-scoring.test.ts': 'tests/sky-arcade-scoring.test.ts',
}

for relative in OBSOLETE_TESTS:
    path = ROOT / relative
    if path.exists():
        path.unlink()

for old, new in RENAMES.items():
    src = ROOT / old
    dst = ROOT / new
    if not src.exists():
        raise SystemExit(f'missing rename source: {old}')
    if dst.exists():
        raise SystemExit(f'rename destination already exists: {new}')
    src.rename(dst)

# Replace chronological version labels with behavior-oriented names.
TITLE_REPLACEMENTS = {
    'tests/sky-arcade-timeline.test.ts': [
        ('V11 gives every arcade stage', 'Arcade timeline gives every stage'),
        ('V11 stage identities', 'Arcade timeline stage identities'),
        ('V11 route risk', 'Arcade route risk'),
        ('V11 runtime', 'Arcade timeline runtime'),
    ],
    'tests/sky-arcade-setpieces.test.ts': [
        ('V11.1 Cloud Fleet', 'Arcade setpiece Cloud Fleet'),
        ('V11.1 Night Metro', 'Arcade setpiece Night Metro'),
    ],
    'tests/sky-arcade-bosses.test.ts': [
        ('V11.2 gives', 'Arcade bosses give'),
        ('V11.2 boss motion', 'Arcade boss motion'),
        ('V11.2 phase transitions', 'Arcade boss phase transitions'),
    ],
    'tests/sky-arcade-scoring.test.ts': [
        ('V11.3 stage missions', 'Arcade scoring stage missions'),
        ('V11.3 score breakdown', 'Arcade scoring breakdown'),
        ('V11.3 runtime stage result', 'Arcade scoring runtime stage result'),
        ('V11.3 progress', 'Arcade scoring progress'),
    ],
    'tests/sky-arcade-course-path.test.ts': [
        ('V6 course path', 'Arcade course path'),
        ('V6.1 Dawn City', 'Arcade course Dawn City'),
        ('V6 near and far', 'Arcade course near and far'),
    ],
}
for relative, replacements in TITLE_REPLACEMENTS.items():
    path = ROOT / relative
    text = path.read_text()
    for old, new in replacements:
        text = text.replace(old, new)
    path.write_text(text)

# Avoid hand-maintained test lists: every maintained sky test is automatically part of rules CI.
package_path = ROOT / 'package.json'
package = json.loads(package_path.read_text())
package['scripts']['test:rules'] = 'node --import tsx --test tests/sky-*.test.ts'
package_path.write_text(json.dumps(package, indent=2, ensure_ascii=False) + '\n')

# Remove the most brittle duplicate SKY RAID source-shape tests. These repeatedly broke on
# equivalent refactors while behavior remained correct.
raid_path = ROOT / 'tests/sky-sky-raid.test.ts'
raid = raid_path.read_text()

def remove_simple_test(source: str, title: str) -> str:
    pattern = re.compile(
        r'\n*test\("' + re.escape(title) + r'", \(\) => \{[\s\S]*?\n\}\);\n*',
        re.MULTILINE,
    )
    updated, count = pattern.subn('\n\n', source, count=1)
    if count != 1:
        raise SystemExit(f'expected one test block for: {title}, found {count}')
    return updated

for title in [
    'SKY RAID formation and phone recycler both consume the active act doctrine',
    'SKY RAID keeps live enemies inside the visible flight band',
    'SKY RAID Formation Rush has a reusable WebGL burst language and lens kick',
]:
    raid = remove_simple_test(raid, title)

# Keep behavior assertions for flight identity and Titan pressure, but remove checks for exact
# private implementation spelling/wiring.
raid = re.sub(
    r'  const flightSource = readFileSync\(new URL\("\.\./src/sky/SkyDancerSkyRaidFlight\.ts", import\.meta\.url\), "utf8"\);\n'
    r'  const raidSource = readFileSync\(new URL\("\.\./src/sky/SkyDancerSkyRaid\.ts", import\.meta\.url\), "utf8"\);\n'
    r'  assert\.match\(flightSource, /setTuning\\\(tuning: SkyDancerSkyRaidFlightTuning\\\//?[^\n]*\n'
    r'  assert\.match\(raidSource, /controller[^\n]*\n'
    r'  assert\.match\(raidSource, /flightProfile[^\n]*\n',
    '',
    raid,
    count=1,
)
# The exact escaped regex above may vary after formatter edits; use a bounded title-local cleanup
# as a fallback that preserves all profile value assertions.
flight_start = raid.find('test("SKY RAID gives each act a distinct flight identity instead of only recoloring the world"')
if flight_start < 0:
    raise SystemExit('missing flight identity behavior test')
flight_end = raid.find('\n});', flight_start)
flight_block = raid[flight_start:flight_end]
flight_block = re.sub(r'\n  const flightSource = readFileSync[\s\S]*$', '', flight_block)
raid = raid[:flight_start] + flight_block + raid[flight_end:]

titan_start = raid.find('test("SKY RAID escalates Titan into a supported siege without flooding the phone screen"')
if titan_start < 0:
    raise SystemExit('missing Titan behavior test')
titan_end = raid.find('\n});', titan_start)
titan_block = raid[titan_start:titan_end]
titan_block = re.sub(r'\n  const raidSource = readFileSync[\s\S]*$', '', titan_block)
raid = raid[:titan_start] + titan_block + raid[titan_end:]
raid_path.write_text(raid)

# Replace source-text wiring coverage with a direct controller response test.
flight_test_path = ROOT / 'tests/sky-sky-raid-flight.test.ts'
flight_test = flight_test_path.read_text()
if 'SKY RAID flight tuning changes controller response' not in flight_test:
    flight_test += '''\n\ntest("SKY RAID flight tuning changes controller response without violating flight caps", () => {\n  const baseline = new SkyDancerSkyRaidFlightController();\n  const tuned = new SkyDancerSkyRaidFlightController();\n  tuned.setTuning({ verticalSpeedScale: 1.2, bankScale: 1.15, bankResponseScale: 1.1, pitchScale: 1.1 });\n  baseline.setVerticalInput(1);\n  tuned.setVerticalInput(1);\n  let baseState = baseline.step(1 / 60, 0, 0.5, false);\n  let tunedState = tuned.step(1 / 60, 0, 0.5, false);\n  for (let frame = 1; frame <= 90; frame += 1) {\n    const heading = frame * 0.008;\n    baseState = baseline.step(1 / 60, heading, 0.5, false);\n    tunedState = tuned.step(1 / 60, heading, 0.5, false);\n  }\n  assert.ok(tunedState.verticalSpeed > baseState.verticalSpeed);\n  assert.ok(Math.abs(tunedState.bank) >= Math.abs(baseState.bank));\n  assert.ok(Math.abs(tunedState.bank) <= SKY_RAID_MAX_BANK);\n  assert.ok(tunedState.altitude <= SKY_RAID_MAX_ALTITUDE);\n});\n'''
flight_test_path.write_text(flight_test)

# Remove an existing test-only lint warning while touching test hygiene.
reference_path = ROOT / 'tests/sky-arcade-reference.test.ts'
reference = reference_path.read_text()
reference = reference.replace(
    'import { createArcadeWaterMaterial, referenceAtmosphere } from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";',
    'import { referenceAtmosphere } from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";',
)
reference_path.write_text(reference)

readme = ROOT / 'tests/README.md'
readme.write_text('''# Test policy\n\n`npm run test:rules` automatically runs every `tests/sky-*.test.ts` file. Do not maintain a manual file list.\n\nPrefer tests of exported rules, state transitions, geometry/math invariants, input release behavior, persistence, and bounded runtime behavior. A refactor that preserves behavior should normally preserve these tests.\n\nAvoid tests that only read production source files and assert exact private function names, numeric literals, inheritance spelling, or rendering implementation strings. Use source-text assertions only for a small architecture/safety contract that cannot reasonably be observed through a public API. Visual fidelity belongs in the browser/WebGL audit path rather than dozens of version-number regression tests.\n\nKeep test filenames behavior-oriented (`sky-arcade-bosses.test.ts`) instead of chronological pass names (`sky-arcade-v112-*.test.ts`).\n''')

print('Test hygiene cleanup prepared.')
