import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  skyDancerArcadeV402CelebrationFromMessage,
  skyDancerArcadeV402CelebrationProfile,
} from "../src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration";

const successes = [
  ["dawn-city", "WORLD BREAK · GATE 2 CLEAN · +1200"],
  ["red-canyon", "WORLD BREAK · KNIFE RUN COMPLETE · +3400"],
  ["cloud-fleet", "DECK STRIKE · BRIDGE DOWN · +1800"],
  ["storm-carrier", "LIGHTNING GRID · SAFE LANE 3 · +1400"],
  ["desert-fortress", "WORLD BREAK · FORTRESS BREACHED · +5200"],
  ["ice-cavern", "WORLD BREAK · CRYSTAL ESCAPE PERFECT · +4200"],
  ["floating-ruins", "SKY LABYRINTH · DANGER VECTOR · +2400"],
  ["night-metro", "WORLD BREAK · PHANTOM CAUGHT · +6200"],
  ["volcano-core", "WORLD BREAK · ERUPTION OUTRUN · +6400"],
  ["orbital-ascent", "WORLD BREAK · ZERO-G ASCENT CLEAR · +7200"],
  ["prism-citadel", "WORLD BREAK · SEVEN SKIES BREAK · +9000"],
] as const;

test("V40.2 recognizes a success celebration in every World Break world", () => {
  assert.equal(SKY_DANCER_ARCADE_STAGES.length, 11);
  for (const [stageId, message] of successes) {
    const celebration = skyDancerArcadeV402CelebrationFromMessage(stageId, message);
    assert.ok(celebration, `${stageId} should produce a celebration`);
    assert.ok(celebration.headline.length >= 7);
    assert.ok(celebration.detail.length >= 7);
    assert.ok(celebration.durationSeconds >= .6 && celebration.durationSeconds <= 1.2);
    assert.ok(celebration.cameraFovKick > 1);
    assert.ok(celebration.audioHighHz > celebration.audioLowHz);
  }
});

test("V40.2 never turns failure or danger messages into success feedback", () => {
  const failures = [
    ["dawn-city", "WORLD BREAK · GATE 2 MISSED"],
    ["red-canyon", "WORLD BREAK · KNIFE RUN LOST · 2.1s"],
    ["cloud-fleet", "DECK STRIKE · BRIDGE ESCAPED"],
    ["storm-carrier", "LIGHTNING GRID · STRIKE 2 · MOVE TO LANE"],
    ["desert-fortress", "FORTRESS GATE · BREACH MISSED"],
    ["ice-cavern", "CRYSTAL TUNNEL · COLLAPSE HIT 2"],
    ["floating-ruins", "WARNING · ROUTE UNSTABLE"],
    ["night-metro", "NEON PURSUIT · PHANTOM ESCAPED · GAP 42m"],
    ["volcano-core", "MAGMA PRESSURE · ERUPTION HIT 1 · TURBO NOW"],
    ["orbital-ascent", "ZERO-G ASCENT · SHAFT LOST · ALT 43"],
    ["prism-citadel", "SKYLINE REPRISE · SKY 4 FRACTURED"],
  ] as const;
  for (const [stageId, message] of failures) {
    assert.equal(skyDancerArcadeV402CelebrationFromMessage(stageId, message), null, stageId);
  }
});

test("V40.2 gives the finale the strongest authored celebration profile", () => {
  const profiles = SKY_DANCER_ARCADE_STAGES.map((stage) => skyDancerArcadeV402CelebrationProfile(stage.id));
  const final = skyDancerArcadeV402CelebrationProfile("prism-citadel");
  assert.equal(new Set(profiles.map((profile) => `${profile.tone}:${profile.signatureHeadline}`)).size, 11);
  assert.equal(Math.max(...profiles.map((profile) => profile.strength)), final.strength);
  assert.equal(Math.max(...profiles.map((profile) => profile.cameraFovKick)), final.cameraFovKick);
});

test("V40.2 source wiring stays presentation-only while synchronizing HUD, camera and audio", () => {
  const ui = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(ui, /skyDancerArcadeV402CelebrationFromMessage/);
  assert.match(ui, /worldBreakCelebration/);
  assert.match(ui, /!worldBreakCelebration/);
  assert.match(css, /\.worldBreakCelebration/);
  assert.match(css, /v402WorldBreakSuccess/);
  assert.match(webgl, /syncWorldBreakCelebration/);
  assert.match(webgl, /worldBreakCelebrationEnvelope/);
  assert.match(webgl, /audioLowHz/);
  assert.doesNotMatch(runtime, /V402WorldBreakCelebration|worldBreakCelebration/);
});
