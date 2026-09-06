import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SKY_DANCER_SKY_RAID_ACTS,
  SKY_DANCER_SKY_RAID_ACT_SECONDS,
  SKY_DANCER_SKY_RAID_OPENING_ACT_SECONDS,
  SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS,
  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,
  SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS,
  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,
  SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS,
  SKY_DANCER_SKY_RAID_TARGET_SECONDS,
  skyDancerSkyRaidActBreakEligible,
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidEnemySpawnPriority,
  skyDancerSkyRaidFlightProfile,
  skyDancerSkyRaidBossSupportTargetCount,
  skyDancerSkyRaidKillScore,
  skyDancerSkyRaidPressure,
  skyDancerSkyRaidRank,
  skyDancerSkyRaidRushActive,
  skyDancerSkyRaidBossCueActive,
  skyDancerSkyRaidWorldStyle,
} from "../src/sky/SkyDancerSkyRaidRules";
import { CartArenaSession } from "../src/cart/CartArenaSession";
import {
  enableCartTurboHunt,
  getCartTurboHuntSnapshot,
  reportCartTurboHuntEnemyDefeat,
} from "../src/cart/CartRoguePhase67TurboHunt";

test("SKY RAID spans five arcade acts across the free-flight run", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACTS.length, 5);
  assert.equal(skyDancerSkyRaidActFor(0).id, "dawn-city");
  assert.equal(skyDancerSkyRaidActFor(120).id, "red-canyon");
  assert.equal(skyDancerSkyRaidActFor(240).id, "cloud-fleet");
  assert.equal(skyDancerSkyRaidActFor(330).id, "storm-carrier");
  assert.equal(skyDancerSkyRaidActFor(420).id, "prism-citadel");
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 420);
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS < SKY_DANCER_SKY_RAID_TARGET_SECONDS);
});

test("SKY RAID gives every act a distinct combat doctrine instead of one repeated formation loop", () => {
  const profiles = SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidCombatProfile(act.id));
  assert.deepEqual(profiles.map((profile) => profile.doctrine), [
    "GATE SPEAR",
    "CANYON SCISSOR",
    "ESCORT WALL",
    "THUNDER PINCER",
    "SIEGE ORBIT",
  ]);
  assert.equal(new Set(profiles.map((profile) => profile.beats.join(">"))).size, 5);
  assert.ok(profiles[1].forwardBias < profiles[0].forwardBias);
  assert.ok(profiles[2].lateralScale > profiles[0].lateralScale);
  assert.ok(profiles[3].baseTargetCount > profiles[0].baseTargetCount);
  assert.ok(profiles.every((profile) => profile.rushCorrectionSpeed >= profile.correctionSpeed));
});

test("SKY RAID gives every act its own enemy package and attack geometry", () => {
  const doctrines = SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidEnemyDoctrine(act.id));
  assert.deepEqual(doctrines.map((doctrine) => doctrine.package), [
    "CITY INTERCEPTORS",
    "CANYON KNIVES",
    "FLEET ESCORT",
    "THUNDER HUNTERS",
    "PRISM SIEGE WING",
  ]);
  assert.equal(new Set(doctrines.map((doctrine) => doctrine.roster.join(">"))).size, 5);
  assert.equal(new Set(doctrines.map((doctrine) => doctrine.attackStyle)).size, 5);
  assert.ok(doctrines[1].turnScale > doctrines[0].turnScale);
  assert.ok(doctrines[2].missileMinRange > doctrines[0].missileMinRange);
  assert.ok(doctrines[3].missileCooldownScale < doctrines[0].missileCooldownScale);
  assert.ok(doctrines[4].missileMaxRange > doctrines[0].missileMaxRange);
});

test("SKY RAID spawn priority rotates pooled aircraft classes by act", () => {
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("red-canyon", "drifter", 0) > skyDancerSkyRaidEnemySpawnPriority("red-canyon", "bomber", 0));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "bomber", 1) > skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "striker", 1));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "heavy", 2) > skyDancerSkyRaidEnemySpawnPriority("cloud-fleet", "drifter", 2));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("storm-carrier", "striker", 0) > skyDancerSkyRaidEnemySpawnPriority("storm-carrier", "heavy", 0));
  assert.ok(skyDancerSkyRaidEnemySpawnPriority("prism-citadel", "heavy", 0) > skyDancerSkyRaidEnemySpawnPriority("prism-citadel", "standard", 0));
});


test("SKY RAID publishes mode ownership before the first inherited population step", () => {
  const shellSource = readFileSync(new URL("../app/CartRogueGamePhase13.tsx", import.meta.url), "utf8");
  const populationSource = readFileSync(new URL("../src/sky/SkyDancerEnemyPopulation.ts", import.meta.url), "utf8");
  assert.match(shellSource, /const startRun[\s\S]*dataset\.skyDancerMode = request\.mode[\s\S]*setActiveRequest\(request\)/);
  assert.match(shellSource, /useEffect\(\(\) => \{\s*document\.documentElement\.dataset\.skyDancerMode = activeRequest\?\.mode \?\? "title";\s*\}, \[activeRequest\?\.mode\]\)/);
  assert.match(shellSource, /useEffect\(\(\) => \(\) => \{\s*delete document\.documentElement\.dataset\.skyDancerMode;\s*\}, \[\]\)/);
  assert.match(shellSource, /const returnToTitle[\s\S]*dataset\.skyDancerMode = "title"[\s\S]*setActiveRequest\(null\)/);
  assert.doesNotMatch(shellSource, /dataset\.skyDancerMode = activeRequest\?\.mode \?\? "title";\s*return \(\) =>/);
  assert.match(populationSource, /const target = isSkyRaidMode\(\)\s*\? regular\.length/);
});

test("SKY RAID bootstraps Hunt gameplay without rebuilding the legacy Hunt world", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /enableCartTurboHunt,/);
  assert.match(raidSource, /if \(isSkyRaidMode\(\)\) \{[\s\S]*enableCartTurboHunt\(this\.session\);[\s\S]*\} else \{[\s\S]*previousBuildWorld\.call\(this\)/);
  assert.doesNotMatch(raidSource, /if \(!isSkyRaidMode\(\)\) previousBuildWorld\.call\(this\)/);
});


test("SKY RAID scoring rewards chain, Turbo and formation rush", () => {
  const base = skyDancerSkyRaidKillScore(1, false, false);
  const chained = skyDancerSkyRaidKillScore(6, false, false);
  const turbo = skyDancerSkyRaidKillScore(6, true, false);
  const rush = skyDancerSkyRaidKillScore(6, true, true);
  assert.equal(base, 100);
  assert.ok(chained > base);
  assert.ok(turbo > chained);
  assert.equal(rush, turbo * 2);
});

test("SKY RAID pressure rises and every normal act contains a rush window", () => {
  assert.ok(skyDancerSkyRaidPressure(100) > skyDancerSkyRaidPressure(5));
  for (const act of SKY_DANCER_SKY_RAID_ACTS.slice(0, 4)) {
    assert.equal(skyDancerSkyRaidRushActive(act.startSeconds + 8, act), true);
    assert.equal(skyDancerSkyRaidRushActive(act.startSeconds + 2, act), false);
  }
});


test("SKY RAID routes every act into a distinct mature background owner", () => {
  assert.equal(skyDancerSkyRaidWorldStyle("dawn-city"), "city");
  assert.equal(skyDancerSkyRaidWorldStyle("red-canyon"), "mountains");
  assert.equal(skyDancerSkyRaidWorldStyle("cloud-fleet"), "clouds");
  assert.equal(skyDancerSkyRaidWorldStyle("storm-carrier"), "storm");
  assert.equal(skyDancerSkyRaidWorldStyle("prism-citadel"), "citadel");
  assert.equal(new Set(SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidWorldStyle(act.id))).size, 5);
});


test("SKY RAID missile defeats are counted once even between Hunt fixed steps", () => {
  const session = new CartArenaSession();
  enableCartTurboHunt(session);
  const enemy = session.enemies.find((candidate) => candidate.alive && candidate.kind !== "boss");
  assert.ok(enemy);
  const before = getCartTurboHuntSnapshot(session)?.huntKills ?? 0;
  enemy.hp = 0;
  enemy.alive = false;
  assert.equal(reportCartTurboHuntEnemyDefeat(session, enemy.id), true);
  assert.equal(getCartTurboHuntSnapshot(session)?.huntKills, before + 1);
  assert.equal(reportCartTurboHuntEnemyDefeat(session, enemy.id), false);
  session.step({ throttle: 0, brake: 0, steer: 0, boost: false }, 1 / 60);
  assert.equal(getCartTurboHuntSnapshot(session)?.huntKills, before + 1);
});


test("SKY RAID iPhone stick input has one direct owner with redundant neutral release paths", () => {
  const padSource = readFileSync(new URL("../app/SkyDancerArcadeVirtualPad.tsx", import.meta.url), "utf8");
  const gameSource = readFileSync(new URL("../app/CartRogueGame.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(padSource, /new KeyboardEvent/);
  assert.match(padSource, /sky-dancer-virtual-stick/);
  assert.match(padSource, /onTouchStart=\{onTouchStart\}/);
  assert.doesNotMatch(padSource, /event\.pointerType === "touch"\) return/);
  assert.match(padSource, /Pointer Events are the primary motion path on modern Safari/);
  assert.match(padSource, /document\.addEventListener\("touchend", onGlobalTouchEnd, true\)/);
  assert.match(padSource, /document\.addEventListener\("touchcancel", onGlobalTouchEnd, true\)/);
  assert.match(padSource, /publishStick\(\{ x: 0, y: 0, active: false, source: "reset" \}\)/);
  assert.match(gameSource, /window\.addEventListener\("sky-dancer-virtual-stick", onVirtualStick\)/);
  assert.match(gameSource, /keys\.clear\(\)/);
  assert.match(gameSource, /window\.addEventListener\("pagehide", hardResetInput\)/);
  assert.match(gameSource, /window\.addEventListener\("blur", hardResetInput\)/);
  assert.match(gameSource, /document\.addEventListener\("visibilitychange", onVisibility\)/);
  assert.match(gameSource, /usesExternalVirtualPad/);
  assert.match(gameSource, /!usesExternalVirtualPad &&/);
});


test("SKY RAID gives each act a distinct flight identity instead of only recoloring the world", () => {
  const profiles = SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidFlightProfile(act.id));
  assert.deepEqual(profiles.map((profile) => profile.label), [
    "OPEN SKY",
    "CANYON KNIFE",
    "VERTICAL HUNT",
    "STORM WEAVE",
    "SIEGE WEIGHT",
  ]);
  assert.ok(profiles[1].bankScale > profiles[0].bankScale);
  assert.ok(profiles[1].handlingScale > profiles[0].handlingScale);
  assert.ok(profiles[2].verticalSpeedScale > profiles[0].verticalSpeedScale);
  assert.ok(profiles[3].speedScale > profiles[0].speedScale);
  assert.ok(profiles[4].handlingScale < profiles[0].handlingScale);
});

test("SKY RAID escalates Titan into a supported siege without flooding the phone screen", () => {
  assert.equal(skyDancerSkyRaidBossSupportTargetCount(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS - 0.01, 7), 7);
  assert.equal(skyDancerSkyRaidBossSupportTargetCount(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 7), 8);
  assert.equal(skyDancerSkyRaidBossSupportTargetCount(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS + 20, 8), 8);
});


test("SKY RAID caps live phone density by act", () => {
  assert.deepEqual(
    SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidEnemyDoctrine(act.id).activeTargetCount),
    [6, 6, 7, 7, 7],
  );
});

test("SKY RAID free-flight chain window supports bank, reacquire and relock", () => {
  assert.ok(SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS >= 5);
  assert.ok(SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS < 7);
});

test("SKY RAID flagship cue remains a bounded entrance window", () => {
  const trigger = SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS;
  assert.equal(skyDancerSkyRaidBossCueActive(trigger - 0.01, true), false);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger, true), true);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger + SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS - 0.01, true), true);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger + SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS, true), false);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger, false), false);
});

test("SKY RAID opening acts and immediate BREAK pacing stay deterministic", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 90);
  assert.equal(SKY_DANCER_SKY_RAID_OPENING_ACT_SECONDS, 120);
  assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 0);
  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 510);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [120, 120, 90, 90, 90]);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [20, 22, 18, 20, 20]);
  assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 450);
  for (const second of [8, 31, 53, 75, 97]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), true);
  for (const second of [20, 44, 66, 88, 108]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 19), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 20), true);
  assert.equal(skyDancerSkyRaidActBreakEligible(132, SKY_DANCER_SKY_RAID_ACTS[1], 21), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(132, SKY_DANCER_SKY_RAID_ACTS[1], 22), true);
});

test("SKY RAID grades runs and scores Formation Rush mastery", () => {
  assert.equal(SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS, 4);
  assert.equal(skyDancerSkyRaidRank(19_999, 5, 12, 12), "C");
  assert.equal(skyDancerSkyRaidRank(20_000, 0, 0, 0), "B");
  assert.equal(skyDancerSkyRaidRank(30_000, 3, 3, 0), "A");
  assert.equal(skyDancerSkyRaidRank(40_000, 4, 8, 4), "S");
  assert.equal(skyDancerSkyRaidRank(50_000, 5, 10, 8), "S+");
  assert.equal(skyDancerSkyRaidRushActive(450, SKY_DANCER_SKY_RAID_ACTS[4]), false);
});
