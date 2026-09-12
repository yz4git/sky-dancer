import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS,
  skyDancerArcadeV4012RunRhythm,
} from "../src/sky/arcade/SkyDancerArcadeV4012RunRhythm";
import { SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS } from "../src/sky/arcade/SkyDancerArcadeV404RivalAce";
import { SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS } from "../src/sky/arcade/SkyDancerArcadeV35HudContinuity";

const rhythm = (overrides: Partial<Parameters<typeof skyDancerArcadeV4012RunRhythm>[0]> = {}) => skyDancerArcadeV4012RunRhythm({
  status: "running",
  stageId: "red-canyon",
  stageNumber: 2,
  stageProgress: .24,
  stageTimeSeconds: 7.2,
  stageDurationSeconds: 30,
  worldBreakLive: true,
  rivalAceActive: false,
  bossActive: false,
  ...overrides,
});

test("V40.12 authors a valley between the World Break peak and the next confrontation", () => {
  assert.equal(rhythm({ stageProgress: .24, stageTimeSeconds: 7.2 }).phase, "signature");
  const release = rhythm({ stageProgress: .43, stageTimeSeconds: 12.9, worldBreakLive: false });
  assert.equal(release.phase, "release");
  assert.ok(release.cameraGain < .8);
  assert.ok(release.speedLineGain < .7);
  assert.ok(release.ambientFxGain < .7);
});

test("V40.12 lets NOVA-7 own its lead before handing off to a guaranteed boss warning", () => {
  const earlyRival = rhythm({ stageProgress: .5, stageTimeSeconds: 15, worldBreakLive: false, rivalAceActive: true });
  assert.equal(earlyRival.phase, "rival");
  assert.equal(earlyRival.bossApproachDeferred, true);
  assert.equal(earlyRival.bossApproachVisible, false);

  const handoff = rhythm({ stageProgress: .5534, stageTimeSeconds: 16.6, worldBreakLive: false, rivalAceActive: true });
  assert.equal(handoff.phase, "boss-rise");
  assert.equal(handoff.bossApproachVisible, true);
  assert.ok(handoff.bossApproachRemainingSeconds <= SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS);
  assert.ok(handoff.bossApproachRemainingSeconds > 0);
});

test("V40.12 keeps the full V35 approach on non-Rival sections and never delays the final boss", () => {
  assert.equal(SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS, 2.6);
  const ordinary = rhythm({ stageId: "storm-carrier", stageNumber: 3, stageDurationSeconds: 32, stageProgress: .5, stageTimeSeconds: 16, worldBreakLive: false, rivalAceActive: false });
  assert.equal(ordinary.phase, "boss-rise");
  assert.equal(ordinary.bossApproachVisible, true);
  assert.ok(ordinary.bossApproachRemainingSeconds > SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS);

  const finale = rhythm({ stageId: "prism-citadel", stageNumber: 7, stageDurationSeconds: 42, stageProgress: 16 / 42, stageTimeSeconds: 16, worldBreakLive: true, rivalAceActive: true });
  assert.equal(finale.phase, "boss-rise");
  assert.equal(finale.bossApproachVisible, true);
  assert.equal(finale.bossApproachDeferred, false);
});

test("V40.12 preserves authored Rival encounter windows and only changes presentation arbitration", () => {
  assert.deepEqual(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS.map((entry) => [entry.section, entry.startProgress, entry.endProgress]), [
    [2, .48, .64], [4, .46, .65], [6, .43, .68],
  ]);
  const boss = rhythm({ bossActive: true, stageProgress: .7, stageTimeSeconds: 21, worldBreakLive: false, rivalAceActive: false });
  assert.equal(boss.phase, "boss");
  assert.ok(boss.intensity > .9);
  const finale = rhythm({ status: "run-clear", stageProgress: 1, stageTimeSeconds: 42, worldBreakLive: false });
  assert.equal(finale.phase, "finale");
  assert.equal(finale.intensity, 1);
});

test("V40.12 gains stay bounded across all authored presentation phases", () => {
  const samples = [
    rhythm({ stageProgress: .05, stageTimeSeconds: 1, worldBreakLive: false }),
    rhythm({ stageProgress: .34, stageTimeSeconds: 10.2, worldBreakLive: false }),
    rhythm({ stageProgress: .24, stageTimeSeconds: 7.2 }),
    rhythm({ stageProgress: .43, stageTimeSeconds: 12.9, worldBreakLive: false }),
    rhythm({ stageProgress: .5, stageTimeSeconds: 15, worldBreakLive: false, rivalAceActive: true }),
    rhythm({ stageProgress: .5534, stageTimeSeconds: 16.6, worldBreakLive: false, rivalAceActive: true }),
    rhythm({ bossActive: true, stageProgress: .7, stageTimeSeconds: 21, worldBreakLive: false }),
    rhythm({ status: "stage-clear", stageProgress: 1, stageTimeSeconds: 30, worldBreakLive: false }),
    rhythm({ status: "run-clear", stageProgress: 1, stageTimeSeconds: 30, worldBreakLive: false }),
  ];
  for (const sample of samples) {
    for (const value of [sample.intensity, sample.cameraGain, sample.ambientFxGain, sample.speedLineGain, sample.secondaryHudAlpha]) {
      assert.ok(value >= 0 && value <= 1);
    }
  }
});

test("V40.12 wiring stays presentation-only while WebGL Canvas and HUD share one rhythm contract", () => {
  const helper = readFileSync("src/sky/arcade/SkyDancerArcadeV4012RunRhythm.ts", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  const mode = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  assert.doesNotMatch(runtime, /V4012RunRhythm/);
  assert.doesNotMatch(helper, /\.step\(|setMove\(|setFire\(|setLock\(|setTurbo\(/);
  assert.match(webgl, /skyDancerArcadeV4012RunRhythm/);
  assert.match(webgl, /v4012Rhythm\.cameraGain/);
  assert.match(webgl, /v4012Rhythm\.speedLineGain/);
  assert.match(canvas, /skyDancerArcadeV4012RunRhythm/);
  assert.match(canvas, /rhythm\.secondaryHudAlpha/);
  assert.match(mode, /bossApproachPresentationActive/);
  assert.match(mode, /data-v4012-rhythm=\{v4012Rhythm\.phase\}/);
  assert.match(css, /V40\.12 Full Run Rhythm Pass/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
