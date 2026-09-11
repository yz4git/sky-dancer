import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  skyDancerArcadeV406BossDrone,
  skyDancerArcadeV406FinalBossCue,
  skyDancerArcadeV406FormMotion,
} from "../src/sky/arcade/SkyDancerArcadeV406FinalBossPresentation";

const forms = ["MIRROR_AEGIS", "PRISM_CROWN", "HELLSTAR", "SEVEN_SKY"] as const;

test("V40.6 gives every route-reactive final form a distinct audiovisual identity", () => {
  const arrivals = forms.map((form) => skyDancerArcadeV406FinalBossCue(form, 1, "arrival")!);
  assert.equal(new Set(arrivals.map((cue) => cue.audioLowHz)).size, 4);
  assert.equal(new Set(arrivals.map((cue) => cue.cameraRoll)).size, 4);
  assert.equal(new Set(forms.map((form) => skyDancerArcadeV406BossDrone(form, 1, true).frequencyHz)).size, 4);
});

test("V40.6 phase three escalates presentation without changing gameplay state", () => {
  for (const form of forms) {
    const phase2 = skyDancerArcadeV406FinalBossCue(form, 2, "phase")!;
    const phase3 = skyDancerArcadeV406FinalBossCue(form, 3, "phase")!;
    assert.ok(phase3.strength > phase2.strength);
    assert.ok(phase3.cameraFovKick > phase2.cameraFovKick);
    assert.ok(skyDancerArcadeV406BossDrone(form, 3, true).frequencyHz > skyDancerArcadeV406BossDrone(form, 1, true).frequencyHz);
  }
  assert.equal(skyDancerArcadeV406BossDrone("HELLSTAR", 3, false).gain, 0);
});

test("V40.6 defeat owns the longest final-boss presentation beat", () => {
  for (const form of forms) {
    const phase3 = skyDancerArcadeV406FinalBossCue(form, 3, "phase")!;
    const defeat = skyDancerArcadeV406FinalBossCue(form, 3, "defeat")!;
    assert.ok(defeat.durationSeconds > phase3.durationSeconds);
    assert.ok(defeat.bloomBoost > phase3.bloomBoost);
    assert.match(defeat.label, /SKY BREAK/);
  }
});

test("V40.6 form motion remains bounded and materially different", () => {
  const motions = forms.map((form) => skyDancerArcadeV406FormMotion(form, 3, 2.25));
  for (const motion of motions) {
    assert.ok(motion.scale > .9 && motion.scale < 1.1);
    assert.ok(Math.abs(motion.spinZ) < .4);
    assert.ok(Math.abs(motion.wobble) < .12);
  }
  assert.equal(new Set(motions.map((motion) => motion.spinZ)).size, 4);
});

test("V40.6 wiring stays presentation-only while WebGL and Canvas share the same contract", () => {
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  assert.doesNotMatch(runtime, /V406FinalBossPresentation/);
  assert.match(webgl, /skyDancerArcadeV406FinalBossCue/);
  assert.match(webgl, /bossDroneGain/);
  assert.match(webgl, /syncFinalBossPresentation/);
  assert.match(canvas, /drawFinalBossPresentation/);
  assert.match(canvas, /skyDancerArcadeV406FormMotion/);
});
