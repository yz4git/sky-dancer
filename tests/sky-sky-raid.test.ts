import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SKY_DANCER_SKY_RAID_ACTS,
  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidKillScore,
  skyDancerSkyRaidPressure,
  skyDancerSkyRaidRushActive,
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
  assert.equal(skyDancerSkyRaidActFor(24).id, "red-canyon");
  assert.equal(skyDancerSkyRaidActFor(48).id, "cloud-fleet");
  assert.equal(skyDancerSkyRaidActFor(72).id, "storm-carrier");
  assert.equal(skyDancerSkyRaidActFor(96).id, "prism-citadel");
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 96);
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS < 120);
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


test("SKY RAID maps every act to a visibly distinct surface world", () => {
  assert.deepEqual(
    SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidWorldStyle(act.id)),
    ["city", "mountains", "clouds", "storm", "citadel"],
  );
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


test("SKY RAID valid missile locks keep enough pursuit authority for phone play", () => {
  const weaponSource = readFileSync(new URL("../src/sky/SkyDancerPlayerWeapons.ts", import.meta.url), "utf8");
  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");
  assert.match(weaponSource, /life: 5\.2/);
  assert.match(weaponSource, /turnRate: target \? 2\.72 : 0/);
  assert.match(weaponSource, /maxSpeed: 46/);
  assert.match(weaponSource, /ageSeconds \/ 0\.26, 0\.46, 1/);
  assert.match(weaponSource, /enemy\.id === missile\.targetEnemyId \? 0\.72 : 0\.52/);
  assert.match(hudSource, /width: 50px/);
  assert.match(hudSource, /max-width: min\(38vw, 300px\)/);
  assert.match(hudSource, /lockTopVh = clamp\(43 \+ reticleY - 12, 27, 52\)/);
});


test("SKY RAID kill confirmation is carried by authoritative snapshot state", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  assert.match(raidSource, /killCueSerial: number/);
  assert.match(raidSource, /killCueSecondsRemaining: number/);
  assert.match(raidSource, /state\.killCueSerial \+= killDelta/);
  assert.match(raidSource, /state\.killCueSecondsRemaining = 1\.18/);
  assert.match(overlaySource, /snapshot\.killCueSecondsRemaining > 0/);
  assert.match(overlaySource, /key=\{snapshot\.killCueSerial\}/);
  assert.doesNotMatch(overlaySource, /previousSnapshotRef/);
});


test("SKY RAID phone feedback stays visible without blocking the combat lane", () => {
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");
  assert.match(overlaySource, /opacity: 1 !important/);
  assert.match(overlaySource, /max-width: min\(42vw, 340px\)/);
  assert.match(overlaySource, /font-size: clamp\(8px, \.95vw, 10px\)/);
  assert.match(auditSource, /cueOpacity < 0\.85/);
});


test("SKY RAID keeps live enemies inside the visible flight band", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const verticalSource = readFileSync(new URL("../src/sky/SkyDancerVerticalFlightV43.ts", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");
  assert.match(raidSource, /applySkyRaidEnemyFlightBand/);
  assert.match(raidSource, /previousApplyCameraPresentation[\s\S]{0,520}applySkyRaidEnemyFlightBand\(this\)/);
  assert.match(raidSource, /enemyCombatLane/);
  assert.match(raidSource, /maintainSkyRaidEnemyPresence/);
  assert.match(raidSource, /SKY_RAID_ENGAGEMENT_SLOTS/);
  assert.match(verticalSource, /setSkyDancerEnemyAltitudeReferenceV56/);
  assert.match(verticalSource, /offset \* 0\.45/);
  assert.match(auditSource, /baseline\.enemyVisible[\s\S]{0,40}< 2/);
  assert.match(auditSource, /high\.enemyVisible/);
});
