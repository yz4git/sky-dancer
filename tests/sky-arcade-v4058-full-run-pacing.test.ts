import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  SKY_DANCER_ARCADE_V4058_PRACTICE_PACING,
  skyDancerArcadeV4058SectionPacing,
} from "../src/sky/arcade/SkyDancerArcadeV4058FullRunPacing";

test("V40.58 gives the seven-section run a rise, recovery valley, and late redline", () => {
  const sections = Array.from({ length: 7 }, (_, index) => skyDancerArcadeV4058SectionPacing(index + 1, true));
  assert.deepEqual(sections.map((section) => section.phase), [
    "ignition", "build", "first-peak", "recovery", "acceleration", "redline", "finale",
  ]);
  assert.ok(sections[0].waveCadenceScale > sections[2].waveCadenceScale, "opening pressure is softer than first peak");
  assert.ok(sections[3].waveCadenceScale > sections[2].waveCadenceScale, "section four is a recovery valley");
  assert.ok(sections[4].waveCadenceScale < sections[3].waveCadenceScale, "section five accelerates out of recovery");
  assert.ok(sections[5].waveCadenceScale < sections[4].waveCadenceScale, "section six reaches redline");
});

test("V40.58 delays early first contact but tightens the late-run launch", () => {
  const opening = skyDancerArcadeV4058SectionPacing(1, true);
  const recovery = skyDancerArcadeV4058SectionPacing(4, true);
  const redline = skyDancerArcadeV4058SectionPacing(6, true);
  assert.ok(opening.firstWaveSeconds >= 2.6);
  assert.ok(recovery.firstWaveSeconds >= 2.5);
  assert.ok(redline.firstWaveSeconds <= 1.85);
  assert.ok(redline.firstHazardSeconds < opening.firstHazardSeconds);
});

test("V40.58 gives the final boss a readable entrance without relaxing finale pressure", () => {
  const redline = skyDancerArcadeV4058SectionPacing(6, true);
  const finale = skyDancerArcadeV4058SectionPacing(7, true);
  assert.ok(finale.bossIngressScale > 1.1);
  assert.ok(finale.waveCadenceScale < 1);
  assert.ok(finale.hazardCadenceScale < 1);
  assert.ok(finale.firstWaveSeconds < 2);
  assert.ok(finale.bossIngressScale > redline.bossIngressScale);
});

test("V40.58 leaves Stage Practice on the existing neutral cadence", () => {
  for (const stageNumber of [1, 4, 7]) {
    assert.deepEqual(skyDancerArcadeV4058SectionPacing(stageNumber, false), SKY_DANCER_ARCADE_V4058_PRACTICE_PACING);
  }
  assert.equal(SKY_DANCER_ARCADE_V4058_PRACTICE_PACING.entrySeconds, .82);
  assert.equal(SKY_DANCER_ARCADE_V4058_PRACTICE_PACING.firstWaveSeconds, 2.35);
  assert.equal(SKY_DANCER_ARCADE_V4058_PRACTICE_PACING.firstHazardSeconds, 4.1);
});

const advanceToSection = (runtime: SkyDancerArcadeRuntime, section: number) => {
  while (runtime.getSnapshot().stageNumber < section) {
    runtime.completeCurrentStageForTests();
    runtime.advanceResultForTests();
  }
};

const firstWaveTime = (runtime: SkyDancerArcadeRuntime) => {
  for (let frame = 0; frame < 240; frame += 1) {
    runtime.step(.05);
    const snapshot = runtime.getSnapshot();
    if (snapshot.combatDirectorWaveSerial > 0) return snapshot.stageTimeSeconds;
  }
  return Infinity;
};

test("V40.58 runtime reaches its first late-run wave materially sooner than the opening wave", () => {
  const opening = new SkyDancerArcadeRuntime({ mode:"arcade-run", difficulty:"normal", seed:405801 });
  const late = new SkyDancerArcadeRuntime({ mode:"arcade-run", difficulty:"normal", seed:405801 });
  advanceToSection(late, 6);
  const openingWave = firstWaveTime(opening);
  const lateWave = firstWaveTime(late);
  assert.ok(Number.isFinite(openingWave) && Number.isFinite(lateWave));
  assert.ok(openingWave - lateWave >= .7, `opening ${openingWave.toFixed(2)} vs late ${lateWave.toFixed(2)}`);
});

test("V40.58 keeps the authored four-minute route contract intact", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode:"arcade-run", difficulty:"normal", seed:405802 });
  for (let section = 1; section <= 7; section += 1) {
    runtime.completeCurrentStageForTests();
    runtime.advanceResultForTests();
  }
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.status, "run-clear");
  assert.equal(snapshot.route.length, 7);
  assert.equal(snapshot.runTimeSeconds, snapshot.runDurationSeconds);
  assert.equal(snapshot.runDurationSeconds, 240);
});

test("V40.58 pacing helper changes cadence only, never combat damage or collision rules", () => {
  const helper = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeV4058FullRunPacing.ts"), "utf8");
  const runtime = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.doesNotMatch(helper, /damage|hitRadius|collision|playerHp|bossHp|projectile/i);
  assert.match(runtime, /pacingV4058\.waveCadenceScale/);
  assert.match(runtime, /pacingV4058\.hazardCadenceScale/);
  assert.match(runtime, /pacingV4058\.bossIngressScale/);
});
