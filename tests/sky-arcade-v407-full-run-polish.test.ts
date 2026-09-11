import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  skyDancerArcadeV407HandoffCue,
  skyDancerArcadeV407HudFocus,
  skyDancerArcadeV407RendererBadgeVisible,
} from "../src/sky/arcade/SkyDancerArcadeV407FullRunPolish";

test("V40.7 HUD focus has one clear priority during a full run", () => {
  assert.equal(skyDancerArcadeV407HudFocus({ status: "run-clear", bossActive: true, rivalAceActive: true, bossApproachActive: true, missileDanger: true }), "finale");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "stage-clear", bossActive: true, rivalAceActive: true, bossApproachActive: true, missileDanger: true }), "handoff");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: true, rivalAceActive: true, bossApproachActive: true, missileDanger: false }), "critical");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: true, rivalAceActive: true, bossApproachActive: false, missileDanger: false }), "boss");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: false, rivalAceActive: true, bossApproachActive: false, missileDanger: false }), "rival");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: false, rivalAceActive: false, bossApproachActive: false, missileDanger: false }), "flight");
});

test("V40.7 turns the short section result into a progressive next-sortie handoff", () => {
  const score = skyDancerArcadeV407HandoffCue(1.3, "RED CANYON", "SAFE", "RECOVER HP");
  const commit = skyDancerArcadeV407HandoffCue(.7, "RED CANYON", "SAFE", "RECOVER HP");
  const launch = skyDancerArcadeV407HandoffCue(.2, "RED CANYON", "SAFE", "RECOVER HP");
  assert.equal(score.phase, "score");
  assert.equal(commit.phase, "commit");
  assert.equal(launch.phase, "launch");
  assert.ok(score.progress < commit.progress && commit.progress < launch.progress);
  assert.match(commit.detail, /SAFE ROUTE/);
});

test("V40.7 final handoff resolves into a finale rather than promising another sortie", () => {
  const cue = skyDancerArcadeV407HandoffCue(.6, null, null, null);
  assert.equal(cue.phase, "finale");
  assert.match(cue.title, /DEBRIEF/);
  assert.match(cue.detail, /PRISM SOVEREIGN DOWN/);
});

test("V40.7 removes the renderer debug badge after the opening but preserves Canvas compatibility status", () => {
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("WEBGL", 1, 1.2, "running"), true);
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("WEBGL", 1, 4.2, "running"), false);
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("WEBGL", 2, .2, "running"), false);
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("CANVAS", 6, 20, "running"), true);
});

test("V40.7 source keeps telemetry out of the product HUD and protects iPhone landscape results", () => {
  const mode = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(mode, /data-v407-focus=\{v407Focus\}/);
  assert.match(mode, /className=\{styles\.timelineDiagnostics\}/);
  assert.match(mode, /className=\{styles\.stageHandoff\}/);
  assert.match(mode, /rendererBadgeVisible &&/);
  assert.match(css, /V40\.7 Full Run Master Polish/);
  assert.match(css, /\.timelineDiagnostics\{display:none/);
  assert.match(css, /max-height:430px/);
  assert.doesNotMatch(runtime, /V407FullRunPolish/);
});
