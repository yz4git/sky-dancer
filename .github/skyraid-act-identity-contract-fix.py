from pathlib import Path

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
old = '''test("SKY RAID keeps opening BREAK late and preserves explicit setpiece pressure beats", () => {\n  const dawn = SKY_DANCER_SKY_RAID_ACTS[0];\n  assert.equal(dawn.endSeconds - dawn.startSeconds, 120);\n  assert.equal(dawn.killTarget, 20);\n  assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 0);\n  assert.equal(skyDancerSkyRaidActBreakEligible(94, dawn, dawn.killTarget), false);\n  assert.equal(skyDancerSkyRaidActBreakEligible(10, dawn, dawn.killTarget), false);\n  assert.equal(skyDancerSkyRaidActBreakEligible(96, dawn, dawn.killTarget), true);\n'''
new = '''test("SKY RAID awards BREAK immediately at target and preserves explicit setpiece pressure beats", () => {\n  const dawn = SKY_DANCER_SKY_RAID_ACTS[0];\n  assert.equal(dawn.endSeconds - dawn.startSeconds, 120);\n  assert.equal(dawn.killTarget, 20);\n  assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 0);\n  assert.equal(skyDancerSkyRaidActBreakEligible(10, dawn, dawn.killTarget - 1), false);\n  assert.equal(skyDancerSkyRaidActBreakEligible(10, dawn, dawn.killTarget), true);\n  assert.equal(skyDancerSkyRaidActBreakEligible(96, dawn, dawn.killTarget), true);\n'''
if old not in source:
    raise SystemExit("missing stale opening BREAK contract")
path.write_text(source.replace(old, new, 1))
