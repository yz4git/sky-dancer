import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { skyDancerArcadeV402CelebrationFromMessage } from "../src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration";
import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403RecoveryProfile,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
} from "../src/sky/arcade/SkyDancerArcadeV403WorldBreakRecovery";

const failures = [
  ["dawn-city", "WORLD BREAK · GATE 2 MISSED", true],
  ["red-canyon", "WORLD BREAK · KNIFE RUN LOST · 2.1s", false],
  ["cloud-fleet", "DECK STRIKE · BRIDGE CORE ESCAPED", true],
  ["storm-carrier", "LIGHTNING GRID · STRIKE 2 · MOVE TO LANE", true],
  ["desert-fortress", "FORTRESS GATE · BREACH MISSED", false],
  ["ice-cavern", "CRYSTAL TUNNEL · COLLAPSE HIT 2", true],
  ["floating-ruins", "WARNING · ROUTE UNSTABLE", true],
  ["night-metro", "NEON PURSUIT · PHANTOM ESCAPED · GAP 42m", false],
  ["volcano-core", "MAGMA PRESSURE · ERUPTION HIT 1 · TURBO NOW", true],
  ["orbital-ascent", "ZERO-G ASCENT · DEBRIS STRIKE 1 · FIND AXIS", true],
  ["prism-citadel", "TOWER SLALOM REPRISE · SKY 4 FRACTURED", true],
] as const;

const successes = [
  ["dawn-city", "WORLD BREAK · GATE 2 CLEAN · +1200"],
  ["red-canyon", "WORLD BREAK · KNIFE RUN COMPLETE · +3400"],
  ["cloud-fleet", "DECK STRIKE · BRIDGE CORE DOWN · +1800"],
  ["storm-carrier", "LIGHTNING GRID · SAFE LANE 3 · +1400"],
  ["desert-fortress", "WORLD BREAK · FORTRESS BREACHED · +5200"],
  ["ice-cavern", "WORLD BREAK · CRYSTAL ESCAPE PERFECT · +4200"],
  ["floating-ruins", "SKY LABYRINTH · DANGER VECTOR · +2400"],
  ["night-metro", "WORLD BREAK · PHANTOM CAUGHT · +6200"],
  ["volcano-core", "WORLD BREAK · ERUPTION OUTRUN · +6400"],
  ["orbital-ascent", "WORLD BREAK · ZERO-G ASCENT CLEAR · +7200"],
  ["prism-citadel", "WORLD BREAK · SEVEN SKIES BREAK · +9000"],
] as const;

test("V40.3 gives all eleven World Break worlds distinct actionable failure language", () => {
  assert.equal(SKY_DANCER_ARCADE_STAGES.length, 11);
  for (const [stageId, message, retryable] of failures) {
    const cue = skyDancerArcadeV403RecoveryFromMessage(stageId, message);
    assert.ok(cue, `${stageId} should produce a recovery cue`);
    assert.equal(cue.retryable, retryable, `${stageId} retryability`);
    assert.ok(cue.headline.length >= 7);
    assert.ok(cue.action.length >= 12, `${stageId} should expose an actionable recovery instruction`);
    assert.ok(cue.detail.length >= 12);
    assert.ok(cue.cameraFovKick < 0);
    assert.ok(cue.cameraPullback < 0);
  }
  const identities = SKY_DANCER_ARCADE_STAGES.map((stage) => {
    const profile = skyDancerArcadeV403RecoveryProfile(stage.id);
    return `${profile.headline}:${profile.action}`;
  });
  assert.equal(new Set(identities).size, 11);
});

test("V40.3 never mislabels normal World Break success as failure", () => {
  for (const [stageId, message] of successes) {
    assert.equal(skyDancerArcadeV403RecoveryFromMessage(stageId, message), null, stageId);
  }
});

test("V40.3 turns only the next real success into a stronger comeback profile", () => {
  const base = skyDancerArcadeV402CelebrationFromMessage("storm-carrier", "LIGHTNING GRID · SAFE LANE 3 · +1400");
  assert.ok(base);
  const comeback = skyDancerArcadeV403ComebackFromCelebration("storm-carrier", base);
  assert.equal(comeback.phase, "comeback");
  assert.equal(comeback.retryable, false);
  assert.ok(comeback.strength > base.strength);
  assert.ok(comeback.cameraFovKick > base.cameraFovKick);
  assert.ok(comeback.cameraPullback > base.cameraPullback);
  assert.match(comeback.detail, /RECOVERY CONFIRMED/);
});

test("V40.3 recognizes recovered non-perfect terminal outcomes without faking a perfect clear", () => {
  const volcano = skyDancerArcadeV403ResolvedRecoveryFromMessage("volcano-core", "MAGMA PRESSURE · ESCAPE SURVIVED · LEAD 24m");
  const prism = skyDancerArcadeV403ResolvedRecoveryFromMessage("prism-citadel", "ROUTE REPRISE · SEVEN SKIES CLEARED · MISS 2");
  assert.equal(volcano?.phase, "comeback");
  assert.equal(prism?.phase, "comeback");
  assert.match(volcano?.headline ?? "", /SURVIVED/);
  assert.match(prism?.headline ?? "", /HELD/);
  assert.equal(skyDancerArcadeV403ResolvedRecoveryFromMessage("night-metro", "NEON PURSUIT · PHANTOM ESCAPED · GAP 42m"), null);
});

test("V40.3 source wiring remains presentation-only while HUD, camera and audio share one recovery grammar", () => {
  const ui = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(ui, /useWorldBreakDrama/);
  assert.match(ui, /worldBreakRecovery/);
  assert.match(ui, /worldBreakComeback/);
  assert.match(css, /\.worldBreakRecovery/);
  assert.match(css, /\.worldBreakComeback/);
  assert.match(webgl, /syncWorldBreakRecovery/);
  assert.match(webgl, /worldBreakRecoveryDebt/);
  assert.match(webgl, /worldBreakRecoveryEnvelope/);
  assert.doesNotMatch(runtime, /V403WorldBreakRecovery|worldBreakRecoveryDebt|worldBreakComeback/);
});
