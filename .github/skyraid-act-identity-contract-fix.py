from pathlib import Path
import re

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
stale_title = 'SKY RAID keeps opening BREAK late and preserves explicit setpiece pressure beats'

# The product contract is already covered by the current immediate-BREAK test.
# Remove any stale duplicate test that a historical patch path may reintroduce.
if stale_title in source:
    stale_test = re.compile(
        r'\n*test\("SKY RAID keeps opening BREAK late and preserves explicit setpiece pressure beats", \(\) => \{[\s\S]*?\n\}\);\n*',
        re.MULTILINE,
    )
    source, removed = stale_test.subn("\n\n", source)
    if removed == 0:
        raise SystemExit("stale delayed BREAK test title found but its test block could not be removed")

immediate_contract = '''  assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 19), false);\n  assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 20), true);\n'''
if immediate_contract not in source:
    raise SystemExit("current immediate BREAK contract is missing")
if stale_title in source:
    raise SystemExit("stale delayed BREAK contract survived cleanup")

# Titan support pressure wraps the legacy rush/base doctrine choice in a late-run branch.
# Keep the existing regression tests focused on doctrine consumption rather than one-line formatting.
old_target = r'''  assert.match(raidSource, /targetCount: rush \? profile\.rushTargetCount : profile\.baseTargetCount/);'''
new_target = '''  assert.match(raidSource, /profile\\.rushTargetCount/);\n  assert.match(raidSource, /profile\\.baseTargetCount/);'''
if old_target not in source:
    raise SystemExit("legacy targetCount doctrine assertion is missing")
source = source.replace(old_target, new_target, 1)

old_correction = r'''  assert.match(raidSource, /correctionSpeed: rush \? profile\.rushCorrectionSpeed : profile\.correctionSpeed/);'''
new_correction = '''  assert.match(raidSource, /profile\\.rushCorrectionSpeed/);\n  assert.match(raidSource, /profile\\.correctionSpeed/);'''
correction_count = source.count(old_correction)
if correction_count != 2:
    raise SystemExit(f"expected 2 legacy correctionSpeed assertions, found {correction_count}")
source = source.replace(old_correction, new_correction)

path.write_text(source)
