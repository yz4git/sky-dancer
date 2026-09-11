import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  skyDancerArcadeV401CuePriority,
  skyDancerArcadeV401WorldBreakBriefing,
  skyDancerArcadeV401WorldBreakBriefingProfile,
} from "../src/sky/arcade/SkyDancerArcadeV401WorldBreakPolish";

test("V40.1 gives every World Break a readable briefing after the section intro and before contact", () => {
  assert.equal(SKY_DANCER_ARCADE_STAGES.length, 11);
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const profile = skyDancerArcadeV401WorldBreakBriefingProfile(stage.id);
    const contactSeconds = profile.startProgress * stage.durationSeconds;
    const leadStartSeconds = contactSeconds - profile.leadSeconds;
    assert.ok(leadStartSeconds >= 2.35, `${stage.id} briefing must not cover the V35 section intro`);

    const midpointProgress = (leadStartSeconds + profile.leadSeconds * .5) / stage.durationSeconds;
    const cue = skyDancerArcadeV401WorldBreakBriefing(stage.id, midpointProgress, stage.durationSeconds, true);
    assert.equal(cue.active, true, `${stage.id} briefing should be active before contact`);
    assert.ok(cue.signature.length > 0);
    assert.ok(cue.hint.length > 0);
    assert.ok(cue.progress > .45 && cue.progress < .55);
    assert.ok(Math.abs(cue.remainingSeconds - profile.leadSeconds * .5) < .03);

    const early = skyDancerArcadeV401WorldBreakBriefing(
      stage.id,
      Math.max(0, leadStartSeconds - .1) / stage.durationSeconds,
      stage.durationSeconds,
      true,
    );
    assert.equal(early.active, false);
    const contact = skyDancerArcadeV401WorldBreakBriefing(stage.id, profile.startProgress, stage.durationSeconds, true);
    assert.equal(contact.active, false);
    assert.equal(contact.progress, 1);
  }
});

test("V40.1 briefing respects disabled gameplay states and never steals critical warning priority", () => {
  const disabled = skyDancerArcadeV401WorldBreakBriefing("night-metro", .085, 36, false);
  assert.equal(disabled.active, false);
  assert.equal(skyDancerArcadeV401CuePriority("critical", true), "critical");
  assert.equal(skyDancerArcadeV401CuePriority("alert", true), "alert");
  assert.equal(skyDancerArcadeV401CuePriority("normal", true), "alert");
  assert.equal(skyDancerArcadeV401CuePriority("normal", false), "normal");
});

test("V40.1 source wiring keeps briefing presentation-only while synchronizing HUD and WebGL framing", () => {
  const ui = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  assert.match(ui, /skyDancerArcadeV401WorldBreakBriefing/);
  assert.match(ui, /worldBreakBriefing\.remainingSeconds\.toFixed\(1\)/);
  assert.match(ui, /data-suppressed=\{cuePriority === "critical"\}/);
  assert.match(css, /\.worldBreakBriefing/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(webgl, /worldBreakAnticipation/);
  assert.match(webgl, /skyDancerArcadeV401WorldBreakBriefing/);
  assert.doesNotMatch(webgl, /runtime\.setMove.*worldBreakBriefing/s);
});
