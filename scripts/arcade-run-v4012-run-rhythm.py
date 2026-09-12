from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    p.write_text(text.replace(old, new, 1))


module = r'''import { SKY_DANCER_ARCADE_FINAL_STAGE, type SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import { skyDancerArcadeV35BossApproach } from "./SkyDancerArcadeV35HudContinuity";
import { skyDancerArcadeV404RivalEncounterForSection } from "./SkyDancerArcadeV404RivalAce";
import { skyDancerArcadeV408SignatureEnvelope } from "./SkyDancerArcadeV408CinematicFocus";

export type SkyDancerArcadeV4012RhythmPhase =
  | "opening"
  | "build"
  | "signature"
  | "release"
  | "rival"
  | "boss-rise"
  | "boss"
  | "handoff"
  | "finale";

type SkyDancerArcadeV4012Status =
  | "running"
  | "paused"
  | "stage-clear"
  | "continue"
  | "game-over"
  | "run-clear"
  | "practice-clear";

export interface SkyDancerArcadeV4012RunRhythmInput {
  status: SkyDancerArcadeV4012Status;
  stageId: SkyDancerArcadeStageId;
  stageNumber: number;
  stageProgress: number;
  stageTimeSeconds: number;
  stageDurationSeconds: number;
  worldBreakLive: boolean;
  rivalAceActive: boolean;
  bossActive: boolean;
}

export interface SkyDancerArcadeV4012RunRhythm {
  phase: SkyDancerArcadeV4012RhythmPhase;
  intensity: number;
  cameraGain: number;
  ambientFxGain: number;
  speedLineGain: number;
  secondaryHudAlpha: number;
  bossApproachVisible: boolean;
  bossApproachDeferred: boolean;
  bossApproachRemainingSeconds: number;
}

export const SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS = .95;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const profile = (
  phase: SkyDancerArcadeV4012RhythmPhase,
  intensity: number,
  cameraGain: number,
  ambientFxGain: number,
  speedLineGain: number,
  secondaryHudAlpha: number,
  bossApproachVisible: boolean,
  bossApproachDeferred: boolean,
  bossApproachRemainingSeconds: number,
): SkyDancerArcadeV4012RunRhythm => ({
  phase,
  intensity: clamp01(intensity),
  cameraGain: clamp01(cameraGain),
  ambientFxGain: clamp01(ambientFxGain),
  speedLineGain: clamp01(speedLineGain),
  secondaryHudAlpha: clamp01(secondaryHudAlpha),
  bossApproachVisible,
  bossApproachDeferred,
  bossApproachRemainingSeconds: Math.max(0, bossApproachRemainingSeconds),
});

/**
 * V40.12 is a presentation-only full-run rhythm contract. It leaves the authored encounter
 * clock untouched and decides which existing peak gets visual priority on each frame.
 */
export function skyDancerArcadeV4012RunRhythm(input: SkyDancerArcadeV4012RunRhythmInput): SkyDancerArcadeV4012RunRhythm {
  const progress = clamp01(input.stageProgress);
  const runArc = clamp01((Math.max(1, input.stageNumber) - 1) / 6);
  const bossApproach = skyDancerArcadeV35BossApproach(
    input.stageId,
    input.stageTimeSeconds,
    input.stageDurationSeconds,
    input.bossActive,
  );
  const finalStage = input.stageId === SKY_DANCER_ARCADE_FINAL_STAGE;
  const rivalOwnsLead = input.rivalAceActive && !finalStage
    && bossApproach.active
    && bossApproach.remainingSeconds > SKY_DANCER_ARCADE_V4012_RIVAL_BOSS_WARNING_FLOOR_SECONDS;
  const bossApproachVisible = bossApproach.active && !rivalOwnsLead;
  const bossApproachDeferred = bossApproach.active && rivalOwnsLead;

  if (input.status === "run-clear" || input.status === "practice-clear" || input.status === "game-over") {
    return profile("finale", 1, 1, 1, .7, .82, false, false, bossApproach.remainingSeconds);
  }
  if (input.status === "stage-clear" || input.status === "continue") {
    return profile("handoff", .25, .66, .62, .56, .78, false, false, bossApproach.remainingSeconds);
  }
  if (input.status !== "running") {
    return profile("build", .2, .76, .72, .7, .86, false, false, bossApproach.remainingSeconds);
  }
  if (input.bossActive) {
    return profile("boss", .9 + runArc * .1, 1, .95, .82, .72, false, false, 0);
  }
  if (bossApproachVisible) {
    return profile("boss-rise", .72 + runArc * .12, .78, .7, .62, .64, true, false, bossApproach.remainingSeconds);
  }
  if (input.rivalAceActive) {
    return profile("rival", .78 + runArc * .1, .9, .82, .74, .7, false, bossApproachDeferred, bossApproach.remainingSeconds);
  }

  const signature = input.worldBreakLive ? skyDancerArcadeV408SignatureEnvelope(progress) : 0;
  if (signature > 0) {
    return profile("signature", .62 + signature * .18 + runArc * .06, .96, .94, .9, .94, false, false, bossApproach.remainingSeconds);
  }

  // The quiet shelf is intentionally after the signature and before the next authored confrontation.
  const rivalEncounter = skyDancerArcadeV404RivalEncounterForSection(input.stageNumber);
  const releaseEnd = rivalEncounter?.startProgress ?? (finalStage ? .36 : .48);
  if (!finalStage && progress >= .405 && progress < releaseEnd) {
    return profile("release", .28 + runArc * .05, .64, .62, .58, .72, false, false, bossApproach.remainingSeconds);
  }

  if (progress < .12) {
    return profile("opening", .28 + runArc * .08, .82, .84, .8, .9, false, false, bossApproach.remainingSeconds);
  }
  return profile("build", .46 + runArc * .14, .9, .88, .88, .92, false, false, bossApproach.remainingSeconds);
}
'''
Path("src/sky/arcade/SkyDancerArcadeV4012RunRhythm.ts").write_text(module)

# App wiring: V35 keeps its exact clock; V40.12 only arbitrates when that approach cue gets the stage.
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '  type MutableRefObject,\n',
    '  type CSSProperties,\n  type MutableRefObject,\n',
    "app CSSProperties import",
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    'import { skyDancerArcadeV408SceneFocus } from "../src/sky/arcade/SkyDancerArcadeV408CinematicFocus";\n',
    'import { skyDancerArcadeV408SceneFocus } from "../src/sky/arcade/SkyDancerArcadeV408CinematicFocus";\nimport { skyDancerArcadeV4012RunRhythm } from "../src/sky/arcade/SkyDancerArcadeV4012RunRhythm";\n',
    "app V40.12 import",
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '  const v35CuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproach.active, missileCueDanger === "1");\n',
    '''  const v4012Rhythm = skyDancerArcadeV4012RunRhythm({
    status: snapshot.status,
    stageId: snapshot.stage.id,
    stageNumber: snapshot.stageNumber,
    stageProgress: snapshot.stageProgress,
    stageTimeSeconds: snapshot.stageTimeSeconds,
    stageDurationSeconds: snapshot.stageDurationSeconds,
    worldBreakLive: snapshot.worldBreakLive,
    rivalAceActive: snapshot.rivalAceActive,
    bossActive: snapshot.bossActive,
  });
  const bossApproachPresentationActive = bossApproach.active && v4012Rhythm.bossApproachVisible;
  const v35CuePriority = skyDancerArcadeV35CuePriority(messageCue.value, bossApproachPresentationActive, missileCueDanger === "1");
''',
    "app rhythm calculation",
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '    bossApproachActive: bossApproach.active,\n',
    '    bossApproachActive: bossApproachPresentationActive,\n',
    "app V407 peak arbitration",
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '      <section className={styles.stage} data-v407-focus={v407Focus} data-v408-scene={v408Focus.mode} aria-label="Sky Dancer Arcade Run">\n',
    '''      <section
        className={styles.stage}
        data-v407-focus={v407Focus}
        data-v408-scene={v408Focus.mode}
        data-v4012-rhythm={v4012Rhythm.phase}
        style={{ "--v4012-secondary-alpha": v4012Rhythm.secondaryHudAlpha } as CSSProperties}
        aria-label="Sky Dancer Arcade Run"
      >
''',
    "app stage rhythm data",
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '        {bossApproach.active && (\n',
    '        {bossApproachPresentationActive && (\n',
    "app boss approach presentation gate",
)

# WebGL uses the same run-rhythm contract for camera/ambient/speed-line hierarchy only.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''import {
  skyDancerArcadeV4011ForegroundCraftCount,
  skyDancerArcadeV4011ScreenStress,
} from "./SkyDancerArcadeV4011ScreenStress";
''',
    '''import {
  skyDancerArcadeV4011ForegroundCraftCount,
  skyDancerArcadeV4011ScreenStress,
} from "./SkyDancerArcadeV4011ScreenStress";
import { skyDancerArcadeV4012RunRhythm } from "./SkyDancerArcadeV4012RunRhythm";
''',
    "webgl V40.12 import",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''    const v408Focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, v408Focus.bloomBoost);
    this.presentationFx.boss = Math.max(this.presentationFx.boss, v408Focus.bossBoost);
    this.presentationFx.transition = Math.max(this.presentationFx.transition, v408Focus.transitionBoost);
''',
    '''    const v408Focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, v408Focus.bloomBoost * v4012Rhythm.ambientFxGain);
    this.presentationFx.boss = Math.max(this.presentationFx.boss, v408Focus.bossBoost * v4012Rhythm.cameraGain);
    this.presentationFx.transition = Math.max(this.presentationFx.transition, v408Focus.transitionBoost * v4012Rhythm.ambientFxGain);
''',
    "webgl sync rhythm",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.v4011SpeedStreakAlpha = v4011Stress.speedStreakAlpha;\n',
    '''    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    this.v4011SpeedStreakAlpha = v4011Stress.speedStreakAlpha * v4012Rhythm.speedLineGain;
''',
    "webgl speed-line rhythm",
)
# The remaining v408Focus declaration is updateCamera after the sync declaration above was replaced.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''    const v408Focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const v408Target = snapshot.bossActive
''',
    '''    const v408Focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    const v408Target = snapshot.bossActive
''',
    "webgl camera rhythm",
)
webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
webgl = webgl_path.read_text()
for old, new, label in [
    ("worldBreakAnticipation * .72", "worldBreakAnticipation * .72 * v4012Rhythm.cameraGain", "anticipation pullback"),
    ("worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback", "worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback * v4012Rhythm.cameraGain", "celebration pullback"),
    ("worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback", "worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback * v4012Rhythm.cameraGain", "recovery pullback"),
    ("+ v408Focus.cameraPullback - this.camera.position.z", "+ v408Focus.cameraPullback * v4012Rhythm.cameraGain - this.camera.position.z", "V408 pullback"),
    ("worldBreakAnticipation * 1.5", "worldBreakAnticipation * 1.5 * v4012Rhythm.cameraGain", "anticipation FOV"),
    ("worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick", "worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick * v4012Rhythm.cameraGain", "celebration FOV"),
    ("worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick", "worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick * v4012Rhythm.cameraGain", "recovery FOV"),
    ("+ v408Focus.cameraFovKick - this.camera.fov", "+ v408Focus.cameraFovKick * v4012Rhythm.cameraGain - this.camera.fov", "V408 FOV"),
]:
    count = webgl.count(old)
    if count != 1:
        raise SystemExit(f"webgl {label}: expected one match, found {count}")
    webgl = webgl.replace(old, new, 1)
webgl_path.write_text(webgl)

# Canvas parity: same rhythm contract reduces only cinematic focus decoration during valleys/handoffs.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    'import { skyDancerArcadeV4011ForegroundCraftCount, skyDancerArcadeV4011ScreenStress } from "./SkyDancerArcadeV4011ScreenStress";\n',
    'import { skyDancerArcadeV4011ForegroundCraftCount, skyDancerArcadeV4011ScreenStress } from "./SkyDancerArcadeV4011ScreenStress";\nimport { skyDancerArcadeV4012RunRhythm } from "./SkyDancerArcadeV4012RunRhythm";\n',
    "canvas V40.12 import",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '''    const focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const target = focus.mode === "boss"
''',
    '''    const focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const rhythm = skyDancerArcadeV4012RunRhythm({
      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,
      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,
      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,
    });
    const target = focus.mode === "boss"
''',
    "canvas rhythm focus",
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '    context.globalAlpha = .18 + focus.strength * .2;\n',
    '    context.globalAlpha = (.18 + focus.strength * .2) * rhythm.secondaryHudAlpha;\n',
    "canvas rhythm alpha",
)

# Product HUD keeps warnings intact and only lowers secondary readouts/chain decoration around authored peaks.
css_path = Path("app/SkyDancerArcadeMode.module.css")
css = css_path.read_text()
marker = "/* Arcade Run V40.12 Full Run Rhythm Pass. */"
if marker in css:
    raise SystemExit("V40.12 CSS marker already present")
css += r'''

/* Arcade Run V40.12 Full Run Rhythm Pass. */
.stage[data-v4012-rhythm]{--v4012-secondary-alpha:1}
.stage[data-v4012-rhythm] .combatReadout{opacity:var(--v4012-secondary-alpha,1);transition:opacity .28s ease}
.stage[data-v4012-rhythm="release"] .chain{opacity:.46}
.stage[data-v4012-rhythm="rival"] .chain{opacity:.34}
.stage[data-v4012-rhythm="boss-rise"] .chain{opacity:.2}
.stage[data-v4012-rhythm="boss"] .chain{opacity:.3}
.stage[data-v4012-rhythm="handoff"] .chain,.stage[data-v4012-rhythm="finale"] .chain{opacity:0}
@media (prefers-reduced-motion:reduce){.stage[data-v4012-rhythm] .combatReadout{transition:none}}
'''
css_path.write_text(css)

# Focused contract tests.
test = r'''import test from "node:test";
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
'''
Path("tests/sky-arcade-v4012-run-rhythm.test.ts").write_text(test)

print("Arcade Run V40.12 full-run rhythm patch applied")
