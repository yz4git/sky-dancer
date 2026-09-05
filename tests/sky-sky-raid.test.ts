import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SKY_DANCER_SKY_RAID_ACTS,
  SKY_DANCER_SKY_RAID_ACT_SECONDS,
  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,
  SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS,
  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,
  SKY_DANCER_SKY_RAID_TARGET_SECONDS,
  skyDancerSkyRaidActFor,
  skyDancerSkyRaidCombatProfile,
  skyDancerSkyRaidEnemyDoctrine,
  skyDancerSkyRaidEnemySpawnPriority,
  skyDancerSkyRaidKillScore,
  skyDancerSkyRaidPressure,
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
  assert.equal(skyDancerSkyRaidActFor(45).id, "red-canyon");
  assert.equal(skyDancerSkyRaidActFor(90).id, "cloud-fleet");
  assert.equal(skyDancerSkyRaidActFor(135).id, "storm-carrier");
  assert.equal(skyDancerSkyRaidActFor(180).id, "prism-citadel");
  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 180);
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

test("SKY RAID wires enemy packages into Hunt spawning, flight AI and missile envelopes", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");
  const flightSource = readFileSync(new URL("../src/sky/SkyDancerFlightCombat.ts", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");
  assert.match(raidSource, /setCartTurboHuntSpawnPreference/);
  assert.match(raidSource, /setSkyDancerSkyRaidEnemyDoctrineElapsed/);
  assert.match(raidSource, /skyRaidEnemyPackage/);
  assert.match(huntSource, /externalSpawnPreference/);
  assert.match(huntSource, /elapsedSeconds: state\.elapsed/);
  assert.match(flightSource, /skyRaidAttackHeading/);
  assert.match(flightSource, /doctrine\?\.missileMinRange/);
  assert.match(flightSource, /doctrine\?\.missileMaxRange/);
  assert.match(flightSource, /baseSpec\.turnRate \* doctrine\.missileTurnScale/);
  assert.match(auditSource, /CITY INTERCEPTORS/);
  assert.match(auditSource, /enemyClasses/);
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

test("SKY RAID keeps the full roster pool while capping live phone density by act", () => {
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidEnemyDoctrine(act.id).activeTargetCount), [6, 6, 7, 7, 7]);
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");
  assert.match(raidSource, /setCartTurboHuntActiveTargetCountResolver/);
  assert.match(raidSource, /activeTargetCount/);
  assert.match(huntSource, /function resolvedActiveTargetCount\(state: TurboHuntState\)/);
  assert.match(huntSource, /const desired = resolvedActiveTargetCount\(state\)/);
});

test("SKY RAID bypasses campaign StageCycle population truncation", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerStageCycle.ts", import.meta.url), "utf8");
  assert.match(source, /dataset\.skyDancerMode === "sky-raid"/);
  assert.match(source, /previous\.call\(this, input, fixedDelta\);\n      return;/);
  assert.match(source, /session\.enemies\.splice\(0, session\.enemies\.length, \.\.\.initialActive, \.\.\.dormantBoss\)/);
});

test("SKY RAID owns enemy archetypes instead of campaign choreography", () => {
  const source = readFileSync(new URL("../src/sky/SkyDancerCombatChoreographyV46.ts", import.meta.url), "utf8");
  assert.match(source, /skyDancerCampaignOwnsEnemyShapeV23/);
  assert.match(source, /dataset\.skyDancerMode !== "sky-raid"/);
  assert.match(source, /if \(mission && skyDancerCampaignOwnsEnemyShapeV23\(\)\)/);
});

test("SKY RAID re-seeds the inherited live Hunt population at each Act boundary without phantom defeats", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const huntSource = readFileSync(new URL("../src/cart/CartRoguePhase67TurboHunt.ts", import.meta.url), "utf8");
  assert.match(raidSource, /enemyRosterActIndex: -1/);
  assert.match(raidSource, /state\.enemyRosterActIndex !== activeAct\.index/);
  assert.match(raidSource, /reseedCartTurboHuntActiveTargets\(typedSession\)/);
  assert.match(huntSource, /export function reseedCartTurboHuntActiveTargets/);
  assert.match(huntSource, /state\.previousAlive\.set\(enemy\.id, false\)/);
  assert.match(huntSource, /state\.spawnSerial = 0/);
  assert.match(huntSource, /spawnSupportEnemy\(raw, state, spawned\)/);
});

test("SKY RAID formation and phone recycler both consume the active act doctrine", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /skyDancerSkyRaidCombatProfile\(act\.id\)/);
  assert.match(raidSource, /const beat = profile\.beats\[phaseIndex\]/);
  assert.match(raidSource, /targetCount: rush \? profile\.rushTargetCount : profile\.baseTargetCount/);
  assert.match(raidSource, /correctionSpeed: rush \? profile\.rushCorrectionSpeed : profile\.correctionSpeed/);
  assert.match(raidSource, /skyRaidScreenSlotsFor\(latestSkyRaidSnapshot\?\.elapsedSeconds \?\? 0\)/);
  assert.match(raidSource, /skyRaidCombatDoctrine = pattern\.doctrine/);
  assert.match(raidSource, /skyRaidFormationAct = pattern\.actId/);
});

test("SKY RAID free-flight chain window supports a bank, reacquire and relock handoff", () => {
  assert.ok(SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS >= 5);
  assert.ok(SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS < 7);
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /state\.chainTimer = SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS/);
});

test("SKY RAID flagship cue is a short entrance card instead of a persistent combat banner", () => {
  const trigger = SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS;
  assert.equal(skyDancerSkyRaidBossCueActive(trigger - 0.01, true), false);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger, true), true);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger + SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS - 0.01, true), true);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger + SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS, true), false);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger, false), false);
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  assert.match(overlaySource, /bossCueVisible = skyDancerSkyRaidBossCueActive/);
  assert.match(overlaySource, /\{bossCueVisible && !snapshot\.clear && \(/);
  assert.doesNotMatch(overlaySource, /\{snapshot\.bossForced && !snapshot\.clear && \(/);
});

test("SKY RAID phone target reticle keeps distant emphasis below the combat-lane clutter limit", () => {
  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");
  assert.match(hudSource, /const reticleScale = clamp\(\(decision\?\.vulnerable \? 1\.04 : 1\) \+ rangeEmphasis, 1, 1\.12\)/);
});

test("SKY RAID Turbo release tail is frame-latched so a slow render cannot skip the cue", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /turboState\.releaseSerial > visual\.lastTurboReleaseSerial/);
  assert.match(raidSource, /visual\.turboReleaseVisual = 1/);
  assert.match(raidSource, /Math\.min\(delta, 0\.05\) \/ 1\.45/);
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
  assert.match(hudSource, /width: 42px/);
  assert.match(hudSource, /max-width: min\(31vw, 238px\)/);
  assert.match(hudSource, /lockTopVh = clamp\(43 \+ reticleY \+ 8\.5, 37, 60\)/);
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
  const fxSource = readFileSync(new URL("../src/sky/SkyDancerAirCombatFxV18.ts", import.meta.url), "utf8");
  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");
  assert.match(overlaySource, /opacity: 1 !important/);
  assert.match(overlaySource, /max-width: min\(34vw, 250px\)/);
  assert.match(overlaySource, /font-size: clamp\(7px, \.82vw, 9px\)/);
  assert.match(auditSource, /cueOpacity < 0\.85/);
  assert.match(auditSource, /target doctrine still crowds the reticle/);
  assert.match(auditSource, /TARGET DOWN has no strong world-space impact burst/);
  assert.match(fxSource, /sky-raid-target-down-burst-v18/);
  assert.match(fxSource, /weapon\.lastHitDestroyed \|\| Boolean\(enemy && !enemy\.alive\)/);
  assert.match(fxSource, /progress < 0\.08/);
  assert.match(fxSource, /missileWarningSegments/);
  assert.match(fxSource, /segmentArc = Math\.PI \* 0\.34/);
  assert.match(fxSource, /new THREE\.ConeGeometry\(0\.0072, 0\.019, 3\)/);
  assert.doesNotMatch(fxSource, /new THREE\.TorusGeometry\(0\.078, 0\.0055/);
  assert.match(hudSource, /width: 42px/);
  assert.match(hudSource, /lockSide \* 9\.5/);
});


test("SKY RAID keeps live enemies inside the visible flight band", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const verticalSource = readFileSync(new URL("../src/sky/SkyDancerVerticalFlightV43.ts", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");
  assert.match(raidSource, /applySkyRaidEnemyFlightBand/);
  assert.match(raidSource, /previousApplyCameraPresentation[\s\S]{0,520}applySkyRaidEnemyFlightBand\(this\)/);
  assert.match(raidSource, /enemyCombatLane/);
  assert.match(raidSource, /maintainSkyRaidEnemyPresence/);
  assert.match(raidSource, /maintainSkyRaidScreenPresence/);
  assert.match(raidSource, /skyRaidScreenSlotsFor/);
  assert.match(raidSource, /type SkyRaidFormationBeat = SkyDancerSkyRaidCombatBeat/);
  assert.match(raidSource, /skyRaidFormationPattern/);
  assert.match(raidSource, /correctionSpeed: rush \? profile\.rushCorrectionSpeed : profile\.correctionSpeed/);
  assert.match(raidSource, /dataset\.skyRaidFormationBeat/);
  assert.match(raidSource, /SKY_RAID_ENEMY_VISUAL_ASSIST_MAX = 1\.20/);
  assert.match(raidSource, /applySkyRaidEnemySilhouetteAssist\(this, snapshot\)/);
  assert.match(raidSource, /skyRaidVisualAssistScale = assist/);
  assert.match(verticalSource, /setSkyDancerEnemyAltitudeReferenceV56/);
  assert.match(verticalSource, /offset \* 0\.45/);
  assert.match(auditSource, /baseline\.enemyVisible[\s\S]{0,40}< 2/);
  assert.match(auditSource, /high\.enemyVisible/);
  assert.match(auditSource, /low\.enemyVisible/);
});


test("SKY RAID V20 speed language stays peripheral and presentation-only", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");
  assert.match(raidSource, /const laneX = \[-13\.2, -10\.8, -8\.6, -6\.8, 6\.8, 8\.6, 10\.8, 13\.2\]/);
  assert.match(raidSource, /speedFxIntensity = clamp\(cruiseFx \* 0\.22 \+ rushFx \* 0\.32 \+ turboFx \* 0\.72/);
  assert.match(raidSource, /skyRaidSpeedFxPeripheralGap = 13\.6/);
  assert.match(raidSource, /const turboState = getSkyDancerTurboState\(demo\.session\)/);
  assert.match(raidSource, /const turboFx = turboState\.held \? 1 : turboReleaseFx/);
  assert.doesNotMatch(raidSource, /const turboFx = base\.boostActive \? 1 : 0/);
  assert.match(auditSource, /page\.keyboard\.down\("Space"\)/);
  assert.match(auditSource, /turboHeld === true/);
  assert.match(auditSource, /06-turbo-release-polish\.png/);
  assert.match(auditSource, /Turbo release speed tail is missing/);
  assert.match(raidSource, /const cruiseFov = clamp\(\(speed - 18\) \* 0\.10, 0, 2\.2\)/);
  assert.match(raidSource, /skyRaidCameraCruiseFov = cruiseFov/);
  assert.match(auditSource, /05-turbo-speed-polish\.png/);
  assert.match(auditSource, /Turbo speed streaks invaded the central combat lane/);
});


test("SKY RAID caps only large steering deflections before inherited quickening", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0\.46/);
  assert.match(raidSource, /return clamp\(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT\)/);
  assert.match(raidSource, /steer: skyDancerSkyRaidSteerInput\(input\.steer\)/);
  assert.match(raidSource, /const skyRaidActive = isSkyRaidMode\(\)/);
});

test("SKY RAID V25 gives each enemy class a render-only role silhouette and telegraphs the incoming package", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  const cssSource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.module.css", import.meta.url), "utf8");
  assert.match(raidSource, /SKY_RAID_ROLE_KIT_NAME/);
  assert.match(raidSource, /applySkyRaidEnemyRoleReadability\(this, snapshot\)/);
  assert.match(raidSource, /__skyRaidGetRoleReadability/);
  for (const signature of ["dorsal-spine", "swept-fangs", "twin-tail", "wide-canards", "twin-pods", "armor-shoulders"]) {
    assert.match(raidSource, new RegExp(signature));
  }
  assert.match(overlaySource, /skyDancerSkyRaidEnemyDoctrine\(snapshot\.actId\)/);
  assert.match(overlaySource, /data-sd-enemy-package-cue="true"/);
  assert.match(overlaySource, /ENEMY PACKAGE/);
  assert.match(cssSource, /\.packageLine/);
});


test("SKY RAID V26 carries threat identity from airframe trail through lock HUD and missile warning", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");
  const flightSource = readFileSync(new URL("../src/sky/SkyDancerFlightCombat.ts", import.meta.url), "utf8");
  const polishSource = readFileSync(new URL("../app/SkyDancerCombatPolish.tsx", import.meta.url), "utf8");
  assert.match(raidSource, /SKY_RAID_ROLE_TRAIL_NAME/);
  for (const signature of ["orange-lance", "cyan-twin", "violet-wide", "gold-twin", "red-thrust", "cyan-short"]) {
    assert.match(raidSource, new RegExp(signature));
  }
  assert.match(raidSource, /trailSignature/);
  assert.match(hudSource, /FAST DIVE/);
  assert.match(hudSource, /LONG RANGE/);
  assert.match(hudSource, /ARMORED/);
  assert.match(hudSource, /data-role-cue=/);
  assert.match(flightSource, /SkyDancerMissileSourceClass/);
  assert.match(flightSource, /sourceClass: missileSourceClass/);
  assert.match(polishSource, /BOMBER SALVO/);
  assert.match(polishSource, /HEAVY MISSILE/);
  assert.match(polishSource, /data-source-class=/);
});


test("SKY RAID V27 exposes real pre-attack timing without changing launch rules", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const flightSource = readFileSync(new URL("../src/sky/SkyDancerFlightCombat.ts", import.meta.url), "utf8");
  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");
  assert.match(flightSource, /SKY_DANCER_ATTACK_TELEGRAPH_EVENT/);
  assert.match(flightSource, /striker-dive/);
  assert.match(flightSource, /bomber-salvo/);
  assert.match(flightSource, /heavy-charge/);
  assert.match(flightSource, /memory\.cooldown > chargeWindow/);
  assert.doesNotMatch(flightSource, /memory\.cooldown <= 0\.04/);
  assert.doesNotMatch(flightSource, /doctrine\.missileAimTolerance \+ 0\.34/);
  assert.match(flightSource, /tryLaunchMissiles\(session, state\)/);
  assert.match(flightSource, /tryLaunchMissiles\(session, state\)/);
  assert.match(raidSource, /SKY_RAID_ATTACK_TELEGRAPH_NAME/);
  assert.match(raidSource, /applySkyRaidAttackTelegraphVisual/);
  assert.match(raidSource, /attackCue/);
  assert.match(hudSource, /DIVE BREAK/);
  assert.match(hudSource, /SALVO CHARGE/);
  assert.match(hudSource, /HEAVY CHARGE/);
  assert.match(hudSource, /data-threat-cue=/);
});


test("SKY RAID V28 keeps each act long enough for a complete combat exchange", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 45);
  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 225);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [45, 45, 45, 45, 45]);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [7, 8, 9, 10, 10]);
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\(true\)/);
  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\(false\)/);
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt\.huntElapsedSeconds/);
});
