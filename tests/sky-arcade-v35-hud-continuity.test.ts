import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS,
  SKY_DANCER_ARCADE_V35_SECTION_INTRO_SECONDS,
  skyDancerArcadeV35BossApproach,
  skyDancerArcadeV35CuePriority,
  skyDancerArcadeV35SectionIntroVisible,
} from "../src/sky/arcade/SkyDancerArcadeV35HudContinuity";
import { skyDancerArcadeBossStartProgress } from "../src/sky/arcade/SkyDancerArcadeV10Systems";

test("V35 section intro owns a bounded opening presentation window", () => {
  assert.equal(skyDancerArcadeV35SectionIntroVisible("running", 0), true);
  assert.equal(skyDancerArcadeV35SectionIntroVisible("running", SKY_DANCER_ARCADE_V35_SECTION_INTRO_SECONDS - .01), true);
  assert.equal(skyDancerArcadeV35SectionIntroVisible("running", SKY_DANCER_ARCADE_V35_SECTION_INTRO_SECONDS), false);
  assert.equal(skyDancerArcadeV35SectionIntroVisible("stage-clear", .4), false);
});

test("V35 boss warning is keyed to the same authored boss start as gameplay", () => {
  const duration = 36;
  const start = duration * skyDancerArcadeBossStartProgress(false);
  const early = skyDancerArcadeV35BossApproach("dawn-city", start - SKY_DANCER_ARCADE_V35_BOSS_WARNING_SECONDS - .2, duration, false);
  const warning = skyDancerArcadeV35BossApproach("dawn-city", start - 1.2, duration, false);
  const spawned = skyDancerArcadeV35BossApproach("dawn-city", start, duration, true);
  assert.equal(early.active, false);
  assert.equal(warning.active, true);
  assert.ok(warning.progress > 0 && warning.progress < 1);
  assert.equal(spawned.active, false);
  assert.equal(spawned.progress, 1);
});

test("V35 HUD priority protects danger cues and demotes chain decoration", () => {
  assert.equal(skyDancerArcadeV35CuePriority(null, true, false), "critical");
  assert.equal(skyDancerArcadeV35CuePriority(null, false, true), "critical");
  assert.equal(skyDancerArcadeV35CuePriority("ARMOR BREAK", false, false), "alert");
  assert.equal(skyDancerArcadeV35CuePriority("NICE SHOT", false, false), "normal");
});

test("V35 mode and CSS wire the authored intro, boss approach and cue hierarchy", () => {
  const mode = readFileSync(resolve("app/SkyDancerArcadeMode.tsx"), "utf8");
  const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");
  assert.match(mode, /skyDancerArcadeV35BossApproach/);
  assert.match(mode, /className=\{styles\.sectionIntro\}/);
  assert.match(mode, /className=\{styles\.bossApproach\}/);
  assert.match(mode, /data-deemphasized=\{cuePriority !== "normal"\}/);
  assert.match(mode, /messageIsBossWarning/);
  assert.match(css, /v35SectionIntro/);
  assert.match(css, /v35BossApproach/);
  assert.match(css, /chain\[data-deemphasized="true"\]/);
});
