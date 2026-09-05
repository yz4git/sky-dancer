from pathlib import Path

path = Path('tests/sky-sky-raid.test.ts')
source = path.read_text()
old = '''test("SKY RAID re-seeds the inherited live Hunt population at each Act boundary without phantom defeats", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");
  assert.match(raidSource, /enemyRosterActIndex: -1/);
  assert.match(raidSource, /state\\.enemyRosterActIndex !== activeAct\\.index/);
  assert.match(raidSource, /reseedCartTurboHuntActiveTargets\\(typedSession\\)/);
  assert.match(huntSource, /export function reseedCartTurboHuntActiveTargets/);
  assert.match(huntSource, /state\\.previousAlive\\.set\\(enemy\\.id, false\\)/);
  assert.match(huntSource, /state\\.spawnSerial = 0/);
  assert.match(huntSource, /spawnSupportEnemy\\(raw, state, spawned\\)/);
});
'''
new = '''test("SKY RAID V33 preserves surviving aircraft across Act boundaries instead of reseeding them", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /enemyRosterActIndex: -1/);
  assert.match(raidSource, /state\\.enemyRosterActIndex !== activeAct\\.index/);
  assert.match(raidSource, /Preserve surviving aircraft across Act boundaries/);
  assert.doesNotMatch(raidSource, /reseedCartTurboHuntActiveTargets\\(typedSession\\)/);
  assert.match(raidSource, /stageSkyRaidNaturalEnemyEntries\\(typedSession\\)/);
});
'''
if old not in source:
    raise SystemExit('V33 test migration marker missing')
path.write_text(source.replace(old, new, 1))
print('SKY RAID V33 legacy reseed test migrated')
