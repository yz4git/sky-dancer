from pathlib import Path


def replace(path: str, before: str, after: str, label: str) -> None:
    p = Path(path)
    source = p.read_text()
    if before not in source:
        raise SystemExit(f'V33 marker missing: {label}')
    p.write_text(source.replace(before, after, 1))

# Stage 1/2 need more authored time than the later acts. Keep the mature 90 s
# cadence for Acts 3-5, while the opening pair becomes a full two-minute fight.
rules = Path('src/sky/SkyDancerSkyRaidRules.ts')
source = rules.read_text()
source = source.replace(
    'export const SKY_DANCER_SKY_RAID_ACT_SECONDS = 90;\n',
    'export const SKY_DANCER_SKY_RAID_ACT_SECONDS = 90;\nexport const SKY_DANCER_SKY_RAID_OPENING_ACT_SECONDS = 120;\nexport const SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS = 90;\n',
    1,
)
source = source.replace(
    'id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 90, killTarget: 14, setpiece: "CITY GATES",',
    'id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 120, killTarget: 20, setpiece: "CITY GATES",',
    1,
)
source = source.replace(
    'id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 90, endSeconds: 180, killTarget: 16, setpiece: "CANYON KNIFE RUN",',
    'id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 120, endSeconds: 240, killTarget: 22, setpiece: "CANYON KNIFE RUN",',
    1,
)
source = source.replace(
    'id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 180, endSeconds: 270, killTarget: 18, setpiece: "FLEET BREAK",',
    'id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 240, endSeconds: 330, killTarget: 18, setpiece: "FLEET BREAK",',
    1,
)
source = source.replace(
    'id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 270, endSeconds: 360, killTarget: 20, setpiece: "THUNDER RAID",',
    'id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 330, endSeconds: 420, killTarget: 20, setpiece: "THUNDER RAID",',
    1,
)
source = source.replace(
    'id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 360, endSeconds: 450, killTarget: 20, setpiece: "PRISM SIEGE",',
    'id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 420, endSeconds: 510, killTarget: 20, setpiece: "PRISM SIEGE",',
    1,
)
source = source.replace('export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 423;\nexport const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 450;', 'export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 483;\nexport const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 510;', 1)
source = source.replace(
'''export function skyDancerSkyRaidRushActive(elapsedSeconds: number, act: SkyDancerSkyRaidAct): boolean {
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) {
    return (local >= 8 && local < 18) || (local >= 30 && local < 40) || (local >= 52 && local < 62) || (local >= 74 && local < 84);
  }
  return (local >= 8 && local < 16) || (local >= 30 && local < 38) || (local >= 52 && local < 60) || (local >= 74 && local < 82);
}
''',
'''export function skyDancerSkyRaidRushActive(elapsedSeconds: number, act: SkyDancerSkyRaidAct): boolean {
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) {
    return (local >= 8 && local < 18) || (local >= 30 && local < 40) || (local >= 52 && local < 62) || (local >= 74 && local < 84);
  }
  const openingTail = act.index < 2 && local >= 96 && local < 106;
  return openingTail || (local >= 8 && local < 16) || (local >= 30 && local < 38) || (local >= 52 && local < 60) || (local >= 74 && local < 82);
}

export function skyDancerSkyRaidActBreakEligible(
  elapsedSeconds: number,
  act: SkyDancerSkyRaidAct,
  actKills: number,
): boolean {
  if (actKills < act.killTarget) return false;
  if (act.index >= 2) return true;
  return skyDancerSkyRaidActSeconds(elapsedSeconds, act) >= SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS;
}
''',
    1,
)
rules.write_text(source)

raid_path = Path('src/sky/SkyDancerSkyRaid.ts')
raid = raid_path.read_text()
raid = raid.replace('  reseedCartTurboHuntActiveTargets,\n', '', 1)
raid = raid.replace('  SKY_DANCER_SKY_RAID_ACT_SECONDS,\n', '', 1)
raid = raid.replace('  skyDancerSkyRaidActFor,\n', '  skyDancerSkyRaidActBreakEligible,\n  skyDancerSkyRaidActFor,\n', 1)
raid = raid.replace(
'''interface RaidScreenEngagementState {
  nextAllowedAt: number;
  cursor: number;
  recycles: number;
  projection: THREE.Vector3;
  candidates: [RaidScreenCandidate, RaidScreenCandidate, RaidScreenCandidate];
}
''',
'''interface RaidScreenEngagementState {
  nextAllowedAt: number;
  lastAssistAt: number;
  cursor: number;
  recycles: number;
  projection: THREE.Vector3;
  candidates: [RaidScreenCandidate, RaidScreenCandidate, RaidScreenCandidate];
}

interface RaidEnemyEntryState {
  previousAlive: Map<string, boolean>;
  serial: number;
  staged: number;
}
''',
    1,
)
raid = raid.replace('const raidScreenEngagementByDemo = new WeakMap<object, RaidScreenEngagementState>();\n', 'const raidScreenEngagementByDemo = new WeakMap<object, RaidScreenEngagementState>();\nconst raidEnemyEntryBySession = new WeakMap<object, RaidEnemyEntryState>();\n', 1)
raid = raid.replace(
'''  // Ten 9-second beats fill a 90-second Act. The authored five-beat sentence
  // runs twice, with the second pass mirrored so long Acts do not settle into
  // one permanent breakaway formation after the old 24-second grammar ended.
  const beatSeconds = SKY_DANCER_SKY_RAID_ACT_SECONDS / 10;
''',
'''  // Ten beats fill the authored Act duration. Opening Acts are 120 s while
  // the mature later acts remain 90 s, so formation grammar stretches with the
  // stage instead of silently finishing its sentence early.
  const beatSeconds = Math.max(1, (act.endSeconds - act.startSeconds) / 10);
''',
    1,
)

# Replace simulation-space teleport with bounded continuous approach.
old_presence = '''  const needed = Math.min(targetCount - engaged.length, candidates.length, 2);
  for (let index = 0; index < needed; index += 1) {
    const target = candidates[index].enemy;
    const slot = pattern.slots[(state.cursor + engaged.length + index) % pattern.slots.length];
    target.x = playerX + forwardX * slot.forward + rightX * slot.lateral;
    target.z = playerZ + forwardZ * slot.forward + rightZ * slot.lateral;
    target.heading = Math.atan2(playerX - target.x, playerZ - target.z);
    target.aiClock = 0;
    target.chargeTime = 0;
  }
  state.cursor = (state.cursor + needed) % pattern.slots.length;
  state.cooldown = needed > 0 ? 0.44 : 0.18;
'''
new_presence = '''  const needed = Math.min(targetCount - engaged.length, candidates.length, 2);
  const approachSpeed = pattern.correctionSpeed * 1.65;
  for (let index = 0; index < needed; index += 1) {
    const target = candidates[index].enemy;
    const slot = pattern.slots[(state.cursor + engaged.length + index) % pattern.slots.length];
    const desiredX = playerX + forwardX * slot.forward + rightX * slot.lateral;
    const desiredZ = playerZ + forwardZ * slot.forward + rightZ * slot.lateral;
    const dx = desiredX - target.x;
    const dz = desiredZ - target.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      const step = Math.min(distance, approachSpeed * delta);
      target.x += dx / distance * step;
      target.z += dz / distance * step;
    }
    const desiredHeading = Math.atan2(playerX - target.x, playerZ - target.z);
    const turnError = Math.atan2(Math.sin(desiredHeading - target.heading), Math.cos(desiredHeading - target.heading));
    target.heading += clamp(turnError, -delta * 1.05, delta * 1.05);
  }
  state.cursor = (state.cursor + needed) % pattern.slots.length;
  state.cooldown = needed > 0 ? 0.12 : 0.18;
'''
if old_presence not in raid:
    raise SystemExit('V33 marker missing: simulation teleport block')
raid = raid.replace(old_presence, new_presence, 1)

raid = raid.replace(
'''    state = {
      nextAllowedAt: 0,
      cursor: 0,
      recycles: 0,
''',
'''    state = {
      nextAllowedAt: 0,
      lastAssistAt: 0,
      cursor: 0,
      recycles: 0,
''',
    1,
)
old_screen = '''  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  if (now < state.nextAllowedAt) return;

  const screenSlots = skyRaidScreenSlotsFor(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);
  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const needed = Math.min(3 - visibleCount, candidateCount, state.candidates.length);
  for (let index = 0; index < needed; index += 1) {
    const sample = state.candidates[index];
    if (!sample.enemy || !sample.group) continue;
    const authoredSlot = screenSlots[(state.cursor + index) % screenSlots.length];
    const lateral = clamp(authoredSlot.lateral * 0.86, -12.5, 12.5);
    const forward = clamp(authoredSlot.forward, 22, 42);
    const x = snapshot.x + forwardX * forward + rightX * lateral;
    const z = snapshot.z + forwardZ * forward + rightZ * lateral;
    sample.enemy.x = x;
    sample.enemy.z = z;
    sample.enemy.heading = Math.atan2(snapshot.x - x, snapshot.z - z);
    sample.enemy.aiClock = 0;
    sample.enemy.chargeTime = 0;
    sample.group.position.x = x;
    sample.group.position.z = z;
    sample.group.position.y = 0.62 + getSkyDancerEnemyAltitudeMetersV43(sample.enemy);
    sample.group.userData.lastX = x;
    sample.group.userData.lastZ = z;
    sample.group.updateMatrixWorld(true);
    state.recycles += 1;
  }
  state.cursor = (state.cursor + needed) % screenSlots.length;
  state.nextAllowedAt = now + (needed > 0 ? 0.28 : 0.12);
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
'''
new_screen = '''  const now = typeof performance !== "undefined" ? performance.now() * 0.001 : Date.now() * 0.001;
  const assistDelta = state.lastAssistAt > 0 ? clamp(now - state.lastAssistAt, 0, 0.05) : 1 / 60;
  state.lastAssistAt = now;
  if (now < state.nextAllowedAt) return;

  const screenSlots = skyRaidScreenSlotsFor(latestSkyRaidSnapshot?.elapsedSeconds ?? 0);
  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const needed = Math.min(3 - visibleCount, candidateCount, state.candidates.length);
  for (let index = 0; index < needed; index += 1) {
    const sample = state.candidates[index];
    if (!sample.enemy || !sample.group) continue;
    const authoredSlot = screenSlots[(state.cursor + index) % screenSlots.length];
    const lateral = clamp(authoredSlot.lateral * 0.92, -15, 15);
    const forward = clamp(authoredSlot.forward, 30, 48);
    const desiredX = snapshot.x + forwardX * forward + rightX * lateral;
    const desiredZ = snapshot.z + forwardZ * forward + rightZ * lateral;
    const dx = desiredX - sample.enemy.x;
    const dz = desiredZ - sample.enemy.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      const step = Math.min(distance, 10 * assistDelta);
      sample.enemy.x += dx / distance * step;
      sample.enemy.z += dz / distance * step;
    }
    const desiredHeading = Math.atan2(snapshot.x - sample.enemy.x, snapshot.z - sample.enemy.z);
    const turnError = Math.atan2(
      Math.sin(desiredHeading - sample.enemy.heading),
      Math.cos(desiredHeading - sample.enemy.heading),
    );
    sample.enemy.heading += clamp(turnError, -assistDelta * 0.85, assistDelta * 0.85);
    state.recycles += 1;
  }
  state.cursor = (state.cursor + needed) % screenSlots.length;
  state.nextAllowedAt = now + (needed > 0 ? 0.05 : 0.12);
  demo.scene.userData.skyRaidScreenPresenceRecycles = state.recycles;
'''
if old_screen not in raid:
    raise SystemExit('V33 marker missing: screen teleport block')
raid = raid.replace(old_screen, new_screen, 1)

# Newly alive pooled aircraft are hidden at the moment of respawn. Move that
# hidden spawn to a far entry corridor once, then let bounded directors/AI fly it
# into view. No already-visible aircraft receives an instantaneous position set.
entry_fn = '''
function stageSkyRaidNaturalEnemyEntries(session: CartArenaSession): void {
  const runtime = session as unknown as RaidSession;
  const key = session as unknown as object;
  let state = raidEnemyEntryBySession.get(key);
  if (!state) {
    state = { previousAlive: new Map(), serial: 0, staged: 0 };
    raidEnemyEntryBySession.set(key, state);
  }
  const playerX = runtime.car.position.x;
  const playerZ = runtime.car.position.z;
  const heading = runtime.car.heading;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  for (const enemy of session.enemies) {
    const wasAlive = state.previousAlive.get(enemy.id) ?? false;
    if (enemy.alive && !wasAlive && enemy.kind !== "boss") {
      const ordinal = state.serial++;
      const side = ordinal % 2 === 0 ? -1 : 1;
      const band = Math.floor(ordinal / 2) % 3;
      const forward = 62 + band * 7;
      const lateral = side * (22 + band * 4);
      enemy.x = playerX + forwardX * forward + rightX * lateral;
      enemy.z = playerZ + forwardZ * forward + rightZ * lateral;
      enemy.heading = Math.atan2(playerX - enemy.x, playerZ - enemy.z);
      enemy.aiClock = 0;
      enemy.chargeTime = 0;
      state.staged += 1;
    }
    state.previousAlive.set(enemy.id, enemy.alive);
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.skyRaidNaturalEntries = String(state.staged);
  }
}

'''
marker = 'function publishSkyRaidWorldStyle(snapshot: SkyDancerSkyRaidSnapshot): void {'
if marker not in raid:
    raise SystemExit('V33 marker missing: entry insertion')
raid = raid.replace(marker, entry_fn + marker, 1)

raid = raid.replace('  if (state.actKills >= act.killTarget) rewardActBreak(session, state, act);', '  if (skyDancerSkyRaidActBreakEligible(hunt.huntElapsedSeconds, act, state.actKills)) rewardActBreak(session, state, act);', 1)
raid = raid.replace(
'''    if (state.enemyRosterActIndex !== activeAct.index && hunt.huntPhase !== "boss-arrival" && hunt.huntPhase !== "clear") {
      reseedCartTurboHuntActiveTargets(typedSession);
      state.enemyRosterActIndex = activeAct.index;
    }
    maintainSkyRaidEnemyPresence(typedSession, delta, hunt.huntElapsedSeconds);
''',
'''    if (state.enemyRosterActIndex !== activeAct.index && hunt.huntPhase !== "boss-arrival" && hunt.huntPhase !== "clear") {
      // Preserve surviving aircraft across Act boundaries. New doctrine enters
      // naturally through later pooled respawns instead of deleting/reseeding the
      // whole formation on one frame.
      state.enemyRosterActIndex = activeAct.index;
    }
    stageSkyRaidNaturalEnemyEntries(typedSession);
    maintainSkyRaidEnemyPresence(typedSession, delta, hunt.huntElapsedSeconds);
''',
    1,
)
raid_path.write_text(raid)

# Update the contract tests and add explicit no-warp + opening pacing coverage.
test_path = Path('tests/sky-sky-raid.test.ts')
test = test_path.read_text()
test = test.replace('  SKY_DANCER_SKY_RAID_ACT_SECONDS,\n', '  SKY_DANCER_SKY_RAID_ACT_SECONDS,\n  SKY_DANCER_SKY_RAID_OPENING_ACT_SECONDS,\n  SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS,\n', 1)
test = test.replace('  skyDancerSkyRaidActFor,\n', '  skyDancerSkyRaidActBreakEligible,\n  skyDancerSkyRaidActFor,\n', 1)
test = test.replace('  assert.equal(skyDancerSkyRaidActFor(90).id, "red-canyon");\n  assert.equal(skyDancerSkyRaidActFor(180).id, "cloud-fleet");\n  assert.equal(skyDancerSkyRaidActFor(270).id, "storm-carrier");\n  assert.equal(skyDancerSkyRaidActFor(360).id, "prism-citadel");\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 360);', '  assert.equal(skyDancerSkyRaidActFor(120).id, "red-canyon");\n  assert.equal(skyDancerSkyRaidActFor(240).id, "cloud-fleet");\n  assert.equal(skyDancerSkyRaidActFor(330).id, "storm-carrier");\n  assert.equal(skyDancerSkyRaidActFor(420).id, "prism-citadel");\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 420);', 1)
old_v29 = '''test("SKY RAID V29 doubles every Act while keeping the full 90 seconds combat-authored", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 90);
  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 450);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [90, 90, 90, 90, 90]);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [14, 16, 18, 20, 20]);
  assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 423);
  for (const second of [8, 31, 53, 75]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), true);
  for (const second of [20, 44, 66, 88]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), false);
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  assert.match(raidSource, /beatSeconds = SKY_DANCER_SKY_RAID_ACT_SECONDS \/ 10/);
  assert.match(raidSource, /beatOrdinal % profile\.beats\.length/);
  assert.match(raidSource, /cycleIndex/);
  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\(true\)/);
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt\.huntElapsedSeconds/);
  assert.match(overlaySource, /BONUS \+\$\{bonusKills\}/);
  assert.match(overlaySource, /BREAK SECURED/);
  assert.match(overlaySource, /FREE HUNT/);
  assert.match(raidSource, /if \(visibleCount >= 3\)/);
  assert.match(raidSource, /Math\.min\(3 - visibleCount, candidateCount, state\.candidates\.length\)/);
});
'''
new_v29 = '''test("SKY RAID V33 gives the first two stages a full two-minute combat arc", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 90);
  assert.equal(SKY_DANCER_SKY_RAID_OPENING_ACT_SECONDS, 120);
  assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 90);
  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 510);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [120, 120, 90, 90, 90]);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [20, 22, 18, 20, 20]);
  assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 483);
  for (const second of [8, 31, 53, 75, 97]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), true);
  for (const second of [20, 44, 66, 88, 108]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(89.99, SKY_DANCER_SKY_RAID_ACTS[0], 99), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(90, SKY_DANCER_SKY_RAID_ACTS[0], 20), true);
  assert.equal(skyDancerSkyRaidActBreakEligible(209.99, SKY_DANCER_SKY_RAID_ACTS[1], 99), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(210, SKY_DANCER_SKY_RAID_ACTS[1], 22), true);
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  assert.match(raidSource, /beatSeconds = Math\.max\(1, \(act\.endSeconds - act\.startSeconds\) \/ 10\)/);
  assert.match(raidSource, /skyDancerSkyRaidActBreakEligible\(hunt\.huntElapsedSeconds, act, state\.actKills\)/);
  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\(true\)/);
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt\.huntElapsedSeconds/);
  assert.match(overlaySource, /BREAK SECURED/);
  assert.match(overlaySource, /FREE HUNT/);
});
'''
if old_v29 not in test:
    raise SystemExit('V33 marker missing: old V29 test')
test = test.replace(old_v29, new_v29, 1)
addition = r'''

test("SKY RAID V33 stages hidden respawns offscreen and never teleports a live aircraft into view", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const formationStart = raidSource.indexOf("function maintainSkyRaidEnemyPresence(");
  const formationEnd = raidSource.indexOf("function skyRaidScreenSlotsFor(", formationStart);
  const formationBlock = raidSource.slice(formationStart, formationEnd);
  const screenStart = raidSource.indexOf("function maintainSkyRaidScreenPresence(");
  const screenEnd = raidSource.indexOf("function stageSkyRaidNaturalEnemyEntries(", screenStart);
  const screenBlock = raidSource.slice(screenStart, screenEnd);
  const installStart = raidSource.indexOf("export function installSkyDancerSkyRaid()");
  const installBlock = raidSource.slice(installStart);
  assert.match(raidSource, /function stageSkyRaidNaturalEnemyEntries\(/);
  assert.match(raidSource, /const forward = 62 \+ band \* 7/);
  assert.match(raidSource, /const lateral = side \* \(22 \+ band \* 4\)/);
  assert.match(raidSource, /approachSpeed = pattern\.correctionSpeed \* 1\.65/);
  assert.match(screenBlock, /const step = Math\.min\(distance, 10 \* assistDelta\)/);
  assert.doesNotMatch(formationBlock, /target\.x = playerX \+/);
  assert.doesNotMatch(screenBlock, /sample\.enemy\.x = x/);
  assert.doesNotMatch(screenBlock, /sample\.group\.position\.x = x/);
  assert.doesNotMatch(installBlock, /reseedCartTurboHuntActiveTargets/);
  assert.match(installBlock, /stageSkyRaidNaturalEnemyEntries\(typedSession\)/);
});
'''
if 'SKY RAID V33 stages hidden respawns offscreen' not in test:
    test = test.rstrip() + addition + '\n'
test_path.write_text(test)

print('SKY RAID V33 pacing + natural entry staged')
