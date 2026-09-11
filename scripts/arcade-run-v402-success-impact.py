from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


helper = Path("src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration.ts")
helper.write_text(r'''import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";

export type SkyDancerArcadeV402CelebrationTone = "precision" | "assault" | "survival" | "choice" | "speed" | "final";
export type SkyDancerArcadeV402CelebrationTier = "beat" | "signature" | "perfect";

export interface SkyDancerArcadeV402CelebrationProfile {
  beatHeadline: string;
  signatureHeadline: string;
  tone: SkyDancerArcadeV402CelebrationTone;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  audioLowHz: number;
  audioHighHz: number;
}

export interface SkyDancerArcadeV402CelebrationCue extends SkyDancerArcadeV402CelebrationProfile {
  headline: string;
  detail: string;
  tier: SkyDancerArcadeV402CelebrationTier;
}

const PROFILES: Record<SkyDancerArcadeStageId, SkyDancerArcadeV402CelebrationProfile> = {
  "dawn-city": {
    beatHeadline: "SKYLINE CLEAN", signatureHeadline: "CITY FLOW LOCKED", tone: "precision",
    durationSeconds: .64, strength: .72, cameraPullback: .48, cameraFovKick: 1.55, cameraShake: .055,
    audioLowHz: 660, audioHighHz: 1320,
  },
  "red-canyon": {
    beatHeadline: "LOW LINE", signatureHeadline: "KNIFE RUN", tone: "precision",
    durationSeconds: .76, strength: .9, cameraPullback: .42, cameraFovKick: 2.05, cameraShake: .07,
    audioLowHz: 520, audioHighHz: 1040,
  },
  "cloud-fleet": {
    beatHeadline: "DECK BREAK", signatureHeadline: "FLAGSHIP STRIPPED", tone: "assault",
    durationSeconds: .72, strength: .84, cameraPullback: .64, cameraFovKick: 1.85, cameraShake: .12,
    audioLowHz: 196, audioHighHz: 784,
  },
  "storm-carrier": {
    beatHeadline: "THUNDER CUT", signatureHeadline: "STORM LINE", tone: "survival",
    durationSeconds: .68, strength: .78, cameraPullback: .5, cameraFovKick: 1.7, cameraShake: .085,
    audioLowHz: 440, audioHighHz: 1320,
  },
  "desert-fortress": {
    beatHeadline: "BATTERY DOWN", signatureHeadline: "WALL BREACH", tone: "assault",
    durationSeconds: .8, strength: .98, cameraPullback: .78, cameraFovKick: 2.2, cameraShake: .15,
    audioLowHz: 147, audioHighHz: 880,
  },
  "ice-cavern": {
    beatHeadline: "APERTURE CLEAR", signatureHeadline: "CRYSTAL PERFECT", tone: "precision",
    durationSeconds: .7, strength: .82, cameraPullback: .54, cameraFovKick: 1.8, cameraShake: .06,
    audioLowHz: 740, audioHighHz: 1480,
  },
  "floating-ruins": {
    beatHeadline: "PORTAL VECTOR", signatureHeadline: "PORTAL COMMIT", tone: "choice",
    durationSeconds: .82, strength: .92, cameraPullback: .72, cameraFovKick: 2.1, cameraShake: .075,
    audioLowHz: 392, audioHighHz: 1176,
  },
  "night-metro": {
    beatHeadline: "CHASE LOCK", signatureHeadline: "PHANTOM CAUGHT", tone: "speed",
    durationSeconds: .84, strength: 1.02, cameraPullback: .92, cameraFovKick: 2.8, cameraShake: .11,
    audioLowHz: 330, audioHighHz: 1320,
  },
  "volcano-core": {
    beatHeadline: "PRESSURE BREAK", signatureHeadline: "ERUPTION OUTRUN", tone: "speed",
    durationSeconds: .88, strength: 1.04, cameraPullback: .96, cameraFovKick: 3.0, cameraShake: .13,
    audioLowHz: 220, audioHighHz: 1100,
  },
  "orbital-ascent": {
    beatHeadline: "AXIS LOCK", signatureHeadline: "ASCENT CLEAR", tone: "speed",
    durationSeconds: .9, strength: 1.08, cameraPullback: 1.02, cameraFovKick: 3.15, cameraShake: .1,
    audioLowHz: 494, audioHighHz: 1482,
  },
  "prism-citadel": {
    beatHeadline: "SKY BROKEN", signatureHeadline: "SEVEN SKIES", tone: "final",
    durationSeconds: .96, strength: 1.18, cameraPullback: 1.16, cameraFovKick: 3.5, cameraShake: .16,
    audioLowHz: 262, audioHighHz: 1572,
  },
};

function cue(
  stageId: SkyDancerArcadeStageId,
  tier: SkyDancerArcadeV402CelebrationTier,
  detail: string,
  headline?: string,
): SkyDancerArcadeV402CelebrationCue {
  const profile = PROFILES[stageId];
  const tierScale = tier === "perfect" ? 1.18 : tier === "signature" ? 1.08 : 1;
  return {
    ...profile,
    headline: headline ?? (tier === "beat" ? profile.beatHeadline : profile.signatureHeadline),
    detail,
    tier,
    durationSeconds: profile.durationSeconds + (tier === "perfect" ? .18 : tier === "signature" ? .08 : 0),
    strength: profile.strength * tierScale,
    cameraPullback: profile.cameraPullback * tierScale,
    cameraFovKick: profile.cameraFovKick * tierScale,
    cameraShake: profile.cameraShake * tierScale,
  };
}

export function skyDancerArcadeV402CelebrationProfile(stageId: SkyDancerArcadeStageId): SkyDancerArcadeV402CelebrationProfile {
  return PROFILES[stageId];
}

/**
 * V40.2 is deliberately presentation-only: it recognizes already-authored success messages and
 * converts them into a synchronized HUD/camera/audio cue. Failure, damage and warning messages return null.
 */
export function skyDancerArcadeV402CelebrationFromMessage(
  stageId: SkyDancerArcadeStageId,
  message: string | null,
): SkyDancerArcadeV402CelebrationCue | null {
  if (!message) return null;
  switch (stageId) {
    case "dawn-city": {
      const match = message.match(/GATE\s+(\d+)\s+CLEAN/);
      return match ? cue(stageId, "beat", `GATE ${match[1]} · CLEAN VECTOR`) : null;
    }
    case "red-canyon":
      return message.includes("KNIFE RUN COMPLETE") ? cue(stageId, "signature", "LOW ALTITUDE LINE MASTERED") : null;
    case "cloud-fleet": {
      const match = message.match(/DECK STRIKE\s+·\s+(.+?)\s+DOWN/);
      return match ? cue(stageId, "beat", `${match[1]} · SUBSYSTEM DOWN`) : null;
    }
    case "storm-carrier": {
      const match = message.match(/SAFE LANE\s+(\d+)/);
      return match ? cue(stageId, "beat", `LANE ${match[1]} · LIGHTNING CLEARED`) : null;
    }
    case "desert-fortress":
      if (message.includes("FORTRESS BREACHED")) return cue(stageId, "perfect", "BATTERIES DOWN · BREACH CLEARED");
      if (message.includes("FORTRESS BATTERIES DOWN")) return cue(stageId, "signature", "ALL BATTERIES DOWN · BREACH OPEN");
      if (message.includes("FORTRESS BATTERY") && message.includes(" DOWN")) return cue(stageId, "beat", "FORTRESS BATTERY DESTROYED");
      return null;
    case "ice-cavern": {
      if (message.includes("CRYSTAL ESCAPE PERFECT")) return cue(stageId, "perfect", "ALL APERTURES CLEAN");
      const match = message.match(/APERTURE\s+(\d+)\s+CLEAR/);
      return match ? cue(stageId, "beat", `APERTURE ${match[1]} · CLEAN`) : null;
    }
    case "floating-ruins": {
      if (!message.startsWith("SKY LABYRINTH ·") || !message.includes("+")) return null;
      const doctrine = message.includes("DANGER") ? "DANGER" : message.includes("SCORE") ? "SCORE" : message.includes("FLOW") ? "FLOW" : "ROUTE";
      return cue(stageId, "signature", `${doctrine} VECTOR COMMITTED`);
    }
    case "night-metro":
      return message.includes("PHANTOM CAUGHT") ? cue(stageId, "perfect", "PURSUIT CLOSED · TARGET OVERTAKEN") : null;
    case "volcano-core":
      return message.includes("ERUPTION OUTRUN") ? cue(stageId, "perfect", "PRESSURE WAVE LEFT BEHIND") : null;
    case "orbital-ascent":
      return message.includes("ZERO-G ASCENT CLEAR") ? cue(stageId, "perfect", "TARGET ALTITUDE REACHED") : null;
    case "prism-citadel": {
      if (message.includes("SEVEN SKIES BREAK")) return cue(stageId, "perfect", "FULL ROUTE REPRISE PERFECT");
      const match = message.match(/SKY\s+(\d+)\s+BROKEN/);
      return match ? cue(stageId, "beat", `REPRISE ${match[1]} · SKY BROKEN`) : null;
    }
  }
}
''')


test = Path("tests/sky-arcade-v402-world-break-celebration.test.ts")
test.write_text(r'''import assert from "node:assert/strict";
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
''')

# UI: classify the existing authored message and replace duplicate text with a compact success stamp.
ui = "app/SkyDancerArcadeMode.tsx"
patch(ui,
'''import {
  skyDancerArcadeV401CuePriority,
  skyDancerArcadeV401WorldBreakBriefing,
} from "../src/sky/arcade/SkyDancerArcadeV401WorldBreakPolish";
import styles from "./SkyDancerArcadeMode.module.css";''',
'''import {
  skyDancerArcadeV401CuePriority,
  skyDancerArcadeV401WorldBreakBriefing,
} from "../src/sky/arcade/SkyDancerArcadeV401WorldBreakPolish";
import { skyDancerArcadeV402CelebrationFromMessage } from "../src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration";
import styles from "./SkyDancerArcadeMode.module.css";''')
patch(ui,
'''  const v35CuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproach.active, missileCueDanger === "1");
  const cuePriority = skyDancerArcadeV401CuePriority(v35CuePriority, worldBreakBriefing.active);
  const controlsVisible = snapshot.status === "running";''',
'''  const v35CuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproach.active, missileCueDanger === "1");
  const cuePriority = skyDancerArcadeV401CuePriority(v35CuePriority, worldBreakBriefing.active);
  const worldBreakCelebration = skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, messageCue.value);
  const controlsVisible = snapshot.status === "running";''')
patch(ui,
'''        {messageCue.value && !messageIsBossWarning && (
          <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting} data-priority={cuePriority}>{messageCue.value}</div>
        )}''',
'''        {worldBreakCelebration && (
          <div
            key={`${snapshot.stage.id}-${messageCue.value}`}
            className={styles.worldBreakCelebration}
            data-tone={worldBreakCelebration.tone}
            data-tier={worldBreakCelebration.tier}
            data-suppressed={cuePriority === "critical"}
            aria-live="polite"
            aria-label="World Break success"
          >
            <small>WORLD BREAK · SUCCESS</small>
            <strong>{worldBreakCelebration.headline}</strong>
            <span>{worldBreakCelebration.detail}</span>
            <i aria-hidden="true" />
          </div>
        )}

        {messageCue.value && !messageIsBossWarning && !worldBreakCelebration && (
          <div key={messageCue.value} className={`${styles.message} ${productStyles.flightMessage}`} data-exiting={messageCue.exiting} data-priority={cuePriority}>{messageCue.value}</div>
        )}''')

# HUD: a transparent success stamp with a fast sweep; never blocks touch or the reticle for long.
css = Path("app/SkyDancerArcadeMode.module.css")
css_text = css.read_text()
marker = "/* Arcade Run V40.2 WORLD BREAK success-impact polish. */"
if marker not in css_text:
    css.write_text(css_text + r'''

/* Arcade Run V40.2 WORLD BREAK success-impact polish. */
.worldBreakCelebration{position:absolute;z-index:10;left:50%;top:42%;transform:translate(-50%,-50%);width:min(430px,52vw);text-align:center;pointer-events:none;color:#effcff;text-shadow:0 2px 10px rgba(3,13,24,.88);animation:v402WorldBreakSuccess .78s cubic-bezier(.16,.75,.2,1) both;isolation:isolate;transition:opacity .12s ease,filter .12s ease}
.worldBreakCelebration small,.worldBreakCelebration strong,.worldBreakCelebration span{display:block}.worldBreakCelebration small{font-size:6px;font-weight:1000;letter-spacing:.28em;color:rgba(218,247,255,.74)}.worldBreakCelebration strong{margin-top:2px;font-size:clamp(24px,4.5vw,46px);line-height:.92;font-weight:900;letter-spacing:.12em;color:#eaffff}.worldBreakCelebration span{margin-top:5px;font-size:7px;font-weight:900;letter-spacing:.16em;color:rgba(242,252,255,.76)}.worldBreakCelebration>i{position:absolute;z-index:-1;left:50%;top:52%;width:118%;height:1px;transform:translate(-50%,-50%);background:linear-gradient(90deg,transparent,rgba(163,239,255,.88),transparent);box-shadow:0 0 16px rgba(102,223,255,.54);animation:v402WorldBreakSweep .62s ease-out both}.worldBreakCelebration[data-tone="assault"] strong{color:#ffe6c4}.worldBreakCelebration[data-tone="survival"] strong{color:#d8fbff}.worldBreakCelebration[data-tone="choice"] strong{color:#eadcff}.worldBreakCelebration[data-tone="speed"] strong{color:#c7f8ff}.worldBreakCelebration[data-tone="final"] strong{color:#fff1bd;text-shadow:0 2px 10px rgba(3,13,24,.9),0 0 22px rgba(255,226,154,.38)}.worldBreakCelebration[data-tier="perfect"] strong{font-size:clamp(28px,5vw,52px)}.worldBreakCelebration[data-tier="perfect"]>i{height:2px}.worldBreakCelebration[data-suppressed="true"]{opacity:.12!important;filter:blur(.45px)}
@keyframes v402WorldBreakSuccess{0%{opacity:0;transform:translate(-50%,-45%) scale(.86);filter:blur(1.5px)}24%{opacity:1;transform:translate(-50%,-50%) scale(1.055);filter:blur(0)}58%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:.92;transform:translate(-50%,-53%) scale(.99)}}
@keyframes v402WorldBreakSweep{0%{opacity:0;transform:translate(-50%,-50%) scaleX(.15)}28%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scaleX(1)}}
@media(max-height:520px){.worldBreakCelebration{top:43%;width:min(390px,48vw)}.worldBreakCelebration strong{font-size:24px}.worldBreakCelebration[data-tier="perfect"] strong{font-size:29px}.worldBreakCelebration span{font-size:6px;margin-top:4px}}
@media(orientation:portrait){.worldBreakCelebration{top:46%;width:78vw}.worldBreakCelebration strong{font-size:28px}.worldBreakCelebration[data-tier="perfect"] strong{font-size:34px}}
@media(prefers-reduced-motion: reduce){.worldBreakCelebration,.worldBreakCelebration>i{animation:none}.worldBreakCelebration{opacity:1;transform:translate(-50%,-50%)}}
''')

# WebGL: trigger the same success cue once when the authored message changes, then run a presentation-only camera/audio envelope.
webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
patch(webgl,
'''import { skyDancerArcadeV401WorldBreakBriefing } from "./SkyDancerArcadeV401WorldBreakPolish";
import {''',
'''import { skyDancerArcadeV401WorldBreakBriefing } from "./SkyDancerArcadeV401WorldBreakPolish";
import { skyDancerArcadeV402CelebrationFromMessage } from "./SkyDancerArcadeV402WorldBreakCelebration";
import {''')
patch(webgl,
'''  private cameraShake = 0;
  private cameraImpactKick = 0;
  // V10.3.8: sightline and roll persist across stage handoffs so the camera has one coherent damped frame.''',
'''  private cameraShake = 0;
  private cameraImpactKick = 0;
  // V40.2: presentation-only success accent. No runtime time-scale, collision, score or input changes.
  private worldBreakCelebrationTimer = 0;
  private worldBreakCelebrationDuration = 1;
  private worldBreakCelebrationStrength = 0;
  private worldBreakCelebrationPullback = 0;
  private worldBreakCelebrationFovKick = 0;
  // V10.3.8: sightline and roll persist across stage handoffs so the camera has one coherent damped frame.''')
patch(webgl,
'''    this.syncBranchGates(snapshot, delta);
    this.syncEffects(snapshot);
    this.syncAudio(snapshot);
    this.updateCamera(snapshot, delta);''',
'''    this.syncBranchGates(snapshot, delta);
    this.syncEffects(snapshot);
    this.syncWorldBreakCelebration(snapshot, delta);
    this.syncAudio(snapshot);
    this.updateCamera(snapshot, delta);''')
patch(webgl,
'''  private syncAudio(snapshot: SkyDancerArcadeSnapshot): void {
    this.audio.update(snapshot);''',
'''  private syncWorldBreakCelebration(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.worldBreakCelebrationTimer = Math.max(0, this.worldBreakCelebrationTimer - delta);
    const celebration = skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, snapshot.message);
    if (celebration && snapshot.message !== this.previousSnapshot.message) {
      this.worldBreakCelebrationTimer = celebration.durationSeconds;
      this.worldBreakCelebrationDuration = celebration.durationSeconds;
      this.worldBreakCelebrationStrength = celebration.strength;
      this.worldBreakCelebrationPullback = celebration.cameraPullback;
      this.worldBreakCelebrationFovKick = celebration.cameraFovKick;
      this.cameraShake = Math.min(.86, this.cameraShake + celebration.cameraShake);
      this.presentation.emitRushAccent();
      this.audio.tone(celebration.audioLowHz, .18 + celebration.strength * .035, .014 + celebration.strength * .006, celebration.tone === "assault" ? "sawtooth" : "triangle");
      this.audio.tone(celebration.audioHighHz, .11 + celebration.strength * .025, .01 + celebration.strength * .004, celebration.tone === "final" ? "square" : "triangle");
    }
    const worldBreakCelebrationEnvelope = this.worldBreakCelebrationTimer > 0
      ? Math.sin((1 - this.worldBreakCelebrationTimer / Math.max(.001, this.worldBreakCelebrationDuration)) * Math.PI)
      : 0;
    if (worldBreakCelebrationEnvelope > 0) {
      this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, worldBreakCelebrationEnvelope * .13 * this.worldBreakCelebrationStrength);
      this.presentationFx.exposureBoost = Math.max(this.presentationFx.exposureBoost, worldBreakCelebrationEnvelope * .045 * this.worldBreakCelebrationStrength);
    }
  }

  private syncAudio(snapshot: SkyDancerArcadeSnapshot): void {
    this.audio.update(snapshot);''')
patch(webgl,
'''    const worldBreakAnticipation = worldBreakBriefing.active
      ? Math.sin(worldBreakBriefing.progress * Math.PI * .5)
      : 0;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;''',
'''    const worldBreakAnticipation = worldBreakBriefing.active
      ? Math.sin(worldBreakBriefing.progress * Math.PI * .5)
      : 0;
    const worldBreakCelebrationEnvelope = this.worldBreakCelebrationTimer > 0
      ? Math.sin((1 - this.worldBreakCelebrationTimer / Math.max(.001, this.worldBreakCelebrationDuration)) * Math.PI)
      : 0;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;''')
patch(webgl,
'''    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 - this.camera.fov) * fovAlpha;''',
'''    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick - this.camera.fov) * fovAlpha;''')

print("Arcade Run V40.2 World Break success-impact patch applied")
