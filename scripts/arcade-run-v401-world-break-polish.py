from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


helper = Path("src/sky/arcade/SkyDancerArcadeV401WorldBreakPolish.ts")
helper.write_text('''import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import { skyDancerArcadeV40WorldProfile } from "./SkyDancerArcadeV40WorldBreak";

export type SkyDancerArcadeV401BriefingTone = "precision" | "assault" | "survival" | "choice" | "speed" | "final";
export type SkyDancerArcadeV401CuePriority = "normal" | "alert" | "critical";

export interface SkyDancerArcadeV401BriefingProfile {
  startProgress: number;
  leadSeconds: number;
  hint: string;
  tone: SkyDancerArcadeV401BriefingTone;
}

export interface SkyDancerArcadeV401WorldBreakBriefing {
  active: boolean;
  signature: string;
  hint: string;
  tone: SkyDancerArcadeV401BriefingTone;
  progress: number;
  remainingSeconds: number;
}

const BRIEFINGS: Record<SkyDancerArcadeStageId, SkyDancerArcadeV401BriefingProfile> = {
  "dawn-city": { startProgress: .155, leadSeconds: 1.7, hint: "ALIGN WITH THE SKYLINE RINGS", tone: "precision" },
  "red-canyon": { startProgress: .12, leadSeconds: 1.45, hint: "DESCEND · HOLD THE CANYON FLOOR", tone: "precision" },
  "cloud-fleet": { startProgress: .17, leadSeconds: 1.75, hint: "LOCK DECK TARGETS · BREAK THE FLAGSHIP", tone: "assault" },
  "storm-carrier": { startProgress: .145, leadSeconds: 1.55, hint: "READ THE SAFE LANE · MOVE EARLY", tone: "survival" },
  "desert-fortress": { startProgress: .145, leadSeconds: 1.55, hint: "BREAK BATTERIES · THEN TAKE THE BREACH", tone: "assault" },
  "ice-cavern": { startProgress: .14, leadSeconds: 1.5, hint: "FOLLOW THE APERTURES · DO NOT CHASE LATE", tone: "precision" },
  "floating-ruins": { startProgress: .235, leadSeconds: 1.8, hint: "CHOOSE FLOW · SCORE · OR DANGER", tone: "choice" },
  "night-metro": { startProgress: .11, leadSeconds: 1.35, hint: "TURBO TO CLOSE · TRACK THE PHANTOM", tone: "speed" },
  "volcano-core": { startProgress: .12, leadSeconds: 1.5, hint: "BUILD LEAD · TURBO THROUGH THE ERUPTION", tone: "speed" },
  "orbital-ascent": { startProgress: .1, leadSeconds: 1.3, hint: "FIND THE AXIS · CLIMB + TURBO", tone: "speed" },
  "prism-citadel": { startProgress: .105, leadSeconds: 1.6, hint: "READ YOUR ROUTE · BREAK ALL SEVEN SKIES", tone: "final" },
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function skyDancerArcadeV401WorldBreakBriefingProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV401BriefingProfile {
  return BRIEFINGS[stageId];
}

export function skyDancerArcadeV401WorldBreakBriefing(
  stageId: SkyDancerArcadeStageId,
  stageProgress: number,
  stageDurationSeconds: number,
  enabled: boolean,
): SkyDancerArcadeV401WorldBreakBriefing {
  const profile = BRIEFINGS[stageId];
  const duration = Math.max(.001, stageDurationSeconds);
  const elapsed = clamp01(stageProgress) * duration;
  const contactSeconds = profile.startProgress * duration;
  const leadStartSeconds = Math.max(0, contactSeconds - profile.leadSeconds);
  const leadDuration = Math.max(.001, contactSeconds - leadStartSeconds);
  const remainingSeconds = Math.max(0, contactSeconds - elapsed);
  const active = enabled && elapsed >= leadStartSeconds && elapsed < contactSeconds;
  return {
    active,
    signature: skyDancerArcadeV40WorldProfile(stageId).signature,
    hint: profile.hint,
    tone: profile.tone,
    progress: active ? clamp01((elapsed - leadStartSeconds) / leadDuration) : elapsed >= contactSeconds ? 1 : 0,
    remainingSeconds,
  };
}

export function skyDancerArcadeV401CuePriority(
  basePriority: SkyDancerArcadeV401CuePriority,
  worldBreakBriefingActive: boolean,
): SkyDancerArcadeV401CuePriority {
  if (basePriority === "critical") return "critical";
  if (basePriority === "alert") return "alert";
  return worldBreakBriefingActive ? "alert" : "normal";
}
''')


test = Path("tests/sky-arcade-v401-world-break-polish.test.ts")
test.write_text('''import assert from "node:assert/strict";
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
''')

# UI: import helper, derive the briefing, feed it into cue arbitration, and render a compact pre-contact card.
ui = "app/SkyDancerArcadeMode.tsx"
patch(ui,
'''import { skyDancerArcadeV40RouteDoctrine, skyDancerArcadeV40RouteEffect } from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import styles from "./SkyDancerArcadeMode.module.css";''',
'''import { skyDancerArcadeV40RouteDoctrine, skyDancerArcadeV40RouteEffect } from "../src/sky/arcade/SkyDancerArcadeV40WorldBreak";
import {
  skyDancerArcadeV401CuePriority,
  skyDancerArcadeV401WorldBreakBriefing,
} from "../src/sky/arcade/SkyDancerArcadeV401WorldBreakPolish";
import styles from "./SkyDancerArcadeMode.module.css";''')
patch(ui,
'''  const messageIsBossWarning = Boolean(messageCue.value?.startsWith("WARNING ·") && snapshot.bossActive);
  const cuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproach.active, missileCueDanger === "1");
  const controlsVisible = snapshot.status === "running";''',
'''  const messageIsBossWarning = Boolean(messageCue.value?.startsWith("WARNING ·") && snapshot.bossActive);
  const worldBreakBriefing = skyDancerArcadeV401WorldBreakBriefing(
    snapshot.stage.id,
    snapshot.stageProgress,
    snapshot.stageDurationSeconds,
    snapshot.status === "running" && !snapshot.bossActive,
  );
  const v35CuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproach.active, missileCueDanger === "1");
  const cuePriority = skyDancerArcadeV401CuePriority(v35CuePriority, worldBreakBriefing.active);
  const controlsVisible = snapshot.status === "running";''')
patch(ui,
'''        {messageCue.value && !messageIsBossWarning && (
          <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting} data-priority={cuePriority}>{messageCue.value}</div>
        )}''',
'''        {worldBreakBriefing.active && (
          <div
            className={styles.worldBreakBriefing}
            data-tone={worldBreakBriefing.tone}
            data-suppressed={cuePriority === "critical"}
            aria-live="polite"
            aria-label="World Break signature briefing"
          >
            <small>WORLD BREAK · SIGNATURE IN {worldBreakBriefing.remainingSeconds.toFixed(1)}s</small>
            <strong>{worldBreakBriefing.signature}</strong>
            <span>{worldBreakBriefing.hint}</span>
            <i aria-hidden="true"><b style={{ width: `${Math.round(worldBreakBriefing.progress * 100)}%` }} /></i>
          </div>
        )}

        {messageCue.value && !messageIsBossWarning && (
          <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting} data-priority={cuePriority}>{messageCue.value}</div>
        )}''')

# HUD styling: transparent, compact, safe for iPhone landscape; critical alerts visually suppress it.
css = Path("app/SkyDancerArcadeMode.module.css")
css_text = css.read_text()
marker = "/* Arcade Run V40.1 WORLD BREAK briefing polish. */"
if marker not in css_text:
    css.write_text(css_text + '''\n\n/* Arcade Run V40.1 WORLD BREAK briefing polish. */
.worldBreakBriefing{position:absolute;z-index:9;left:50%;top:31%;transform:translate(-50%,-50%);width:min(380px,44vw);text-align:center;pointer-events:none;color:#effcff;text-shadow:0 2px 8px rgba(3,14,26,.88);animation:v401WorldBreakBriefingIn .22s ease-out both;transition:opacity .15s ease,filter .15s ease}
.worldBreakBriefing small,.worldBreakBriefing strong,.worldBreakBriefing span{display:block}.worldBreakBriefing small{font-size:6px;font-weight:1000;letter-spacing:.22em;color:rgba(202,243,255,.72)}.worldBreakBriefing strong{margin-top:3px;font-size:clamp(14px,2vw,20px);font-weight:850;letter-spacing:.16em}.worldBreakBriefing span{margin-top:4px;font-size:7px;font-weight:900;letter-spacing:.13em;color:rgba(242,251,255,.82)}.worldBreakBriefing>i{display:block;width:min(260px,72%);height:2px;margin:7px auto 0;background:rgba(185,232,245,.16);overflow:hidden}.worldBreakBriefing>i b{display:block;height:100%;background:#91eaff;box-shadow:0 0 8px rgba(95,226,255,.68);transition:width .075s linear}.worldBreakBriefing[data-tone="assault"] strong,.worldBreakBriefing[data-tone="final"] strong{color:#ffe1bd}.worldBreakBriefing[data-tone="survival"] strong{color:#d9f7ff}.worldBreakBriefing[data-tone="choice"] strong{color:#e7d8ff}.worldBreakBriefing[data-tone="speed"] strong{color:#bdf4ff}.worldBreakBriefing[data-tone="final"]>i b{background:#fff0bd;box-shadow:0 0 10px rgba(255,224,148,.72)}.worldBreakBriefing[data-suppressed="true"]{opacity:.16!important;filter:blur(.35px)}
@keyframes v401WorldBreakBriefingIn{from{opacity:0;transform:translate(-50%,-44%) scale(.98)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@media(max-height:520px){.worldBreakBriefing{top:31.5%;width:min(330px,42vw)}.worldBreakBriefing small{font-size:5px}.worldBreakBriefing strong{font-size:13px}.worldBreakBriefing span{font-size:6px;margin-top:3px}.worldBreakBriefing>i{margin-top:5px}}
@media(orientation:portrait){.worldBreakBriefing{top:38%;width:72vw}.worldBreakBriefing strong{font-size:17px}.worldBreakBriefing span{font-size:7px}}
@media(prefers-reduced-motion: reduce){.worldBreakBriefing{animation:none}.worldBreakBriefing>i b{transition:none}}
''')

# WebGL framing: a very small pre-contact pullback/FOV open, never touching runtime/input state.
webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
patch(webgl,
'''import { skyDancerArcadeV28ReadableAttitude } from "./SkyDancerArcadeV28DogfightReadability";
import {''',
'''import { skyDancerArcadeV28ReadableAttitude } from "./SkyDancerArcadeV28DogfightReadability";
import { skyDancerArcadeV401WorldBreakBriefing } from "./SkyDancerArcadeV401WorldBreakPolish";
import {''')
patch(webgl,
'''    const targetY = pose.y + shakeY;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;
    this.camera.position.y += (targetY - this.camera.position.y) * yAlpha;
    // V11 course beats may widen or pull back the shot, but never own world rotation/translation.
    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov - this.camera.fov) * fovAlpha;''',
'''    const targetY = pose.y + shakeY;
    const worldBreakBriefing = skyDancerArcadeV401WorldBreakBriefing(
      snapshot.stage.id,
      snapshot.stageProgress,
      snapshot.stageDurationSeconds,
      snapshot.status === "running" && !snapshot.bossActive,
    );
    const worldBreakAnticipation = worldBreakBriefing.active
      ? Math.sin(worldBreakBriefing.progress * Math.PI * .5)
      : 0;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;
    this.camera.position.y += (targetY - this.camera.position.y) * yAlpha;
    // V40.1 opens the frame slightly before a signature challenge; gameplay/world transforms remain untouched.
    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 - this.camera.fov) * fovAlpha;''')

print("Arcade Run V40.1 World Break polish patch applied")
