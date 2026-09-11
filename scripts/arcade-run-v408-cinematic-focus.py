from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, content: str) -> None:
    p = Path(path)
    text = p.read_text()
    if marker in text:
        return
    p.write_text(text.rstrip() + "\n\n" + content.strip() + "\n")


module = r'''import type { SkyDancerArcadeStatus } from "./SkyDancerArcadeRuntime";

export type SkyDancerArcadeV408SceneMode = "flight" | "signature" | "rival" | "boss" | "handoff" | "finale";

export interface SkyDancerArcadeV408FocusInput {
  status: SkyDancerArcadeStatus;
  stageProgress: number;
  worldBreakLive: boolean;
  rivalAceActive: boolean;
  bossActive: boolean;
  finalBossReactive: boolean;
}

export interface SkyDancerArcadeV408SceneFocus {
  mode: SkyDancerArcadeV408SceneMode;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  targetLookWeight: number;
  bloomBoost: number;
  bossBoost: number;
  transitionBoost: number;
  vignette: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const smoothstep = (a: number, b: number, value: number) => {
  if (a === b) return value >= b ? 1 : 0;
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const FLIGHT: SkyDancerArcadeV408SceneFocus = {
  mode: "flight",
  strength: 0,
  cameraPullback: 0,
  cameraFovKick: 0,
  targetLookWeight: 0,
  bloomBoost: 0,
  bossBoost: 0,
  transitionBoost: 0,
  vignette: 0,
};

/** V40.8 keeps the authored World Break contact readable without turning the whole section into a zoom effect. */
export function skyDancerArcadeV408SignatureEnvelope(stageProgress: number): number {
  const progress = clamp01(stageProgress);
  const entrance = smoothstep(.095, .17, progress);
  const exit = 1 - smoothstep(.405, .505, progress);
  return clamp01(Math.min(entrance, exit));
}

export function skyDancerArcadeV408SceneFocus(input: SkyDancerArcadeV408FocusInput): SkyDancerArcadeV408SceneFocus {
  if (input.status === "run-clear" || input.status === "practice-clear" || input.status === "game-over") {
    return {
      mode: "finale", strength: 1, cameraPullback: 1.55, cameraFovKick: -.9, targetLookWeight: .05,
      bloomBoost: .035, bossBoost: .04, transitionBoost: .16, vignette: .3,
    };
  }
  if (input.status === "stage-clear" || input.status === "continue") {
    return {
      mode: "handoff", strength: 1, cameraPullback: 1.05, cameraFovKick: -.55, targetLookWeight: 0,
      bloomBoost: .018, bossBoost: 0, transitionBoost: .1, vignette: .24,
    };
  }
  if (input.status !== "running") return FLIGHT;
  if (input.bossActive) {
    const finalScale = input.finalBossReactive ? 1.18 : 1;
    return {
      mode: "boss", strength: 1, cameraPullback: .72 * finalScale, cameraFovKick: 1.15 * finalScale,
      targetLookWeight: .22, bloomBoost: .035 * finalScale, bossBoost: .12 * finalScale,
      transitionBoost: .02, vignette: .18 * finalScale,
    };
  }
  if (input.rivalAceActive) {
    return {
      mode: "rival", strength: 1, cameraPullback: .54, cameraFovKick: .82, targetLookWeight: .32,
      bloomBoost: .028, bossBoost: .025, transitionBoost: .055, vignette: .14,
    };
  }
  const signature = input.worldBreakLive ? skyDancerArcadeV408SignatureEnvelope(input.stageProgress) : 0;
  if (signature > 0) {
    return {
      mode: "signature", strength: signature, cameraPullback: .3 * signature, cameraFovKick: .48 * signature,
      targetLookWeight: 0, bloomBoost: .012 * signature, bossBoost: 0,
      transitionBoost: .018 * signature, vignette: .07 * signature,
    };
  }
  return FLIGHT;
}

/** Presentation-only camera bias. Logical target coordinates stay untouched. */
export function skyDancerArcadeV408TargetLookBias(
  focus: SkyDancerArcadeV408SceneFocus,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const weight = focus.targetLookWeight * focus.strength;
  return {
    x: clamp(targetX * weight * 1.4, -1.05, 1.05),
    y: clamp(targetY * weight * 1.1, -.55, .55),
  };
}
'''
Path("src/sky/arcade/SkyDancerArcadeV408CinematicFocus.ts").write_text(module)


test = r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  skyDancerArcadeV408SceneFocus,
  skyDancerArcadeV408SignatureEnvelope,
  skyDancerArcadeV408TargetLookBias,
} from "../src/sky/arcade/SkyDancerArcadeV408CinematicFocus";

const base = {
  status: "running" as const,
  stageProgress: .24,
  worldBreakLive: true,
  rivalAceActive: false,
  bossActive: false,
  finalBossReactive: false,
};

test("V40.8 signature focus fades in and out instead of owning the whole section", () => {
  assert.equal(skyDancerArcadeV408SignatureEnvelope(.04), 0);
  assert.ok(skyDancerArcadeV408SignatureEnvelope(.24) > .95);
  assert.equal(skyDancerArcadeV408SignatureEnvelope(.56), 0);
  const focus = skyDancerArcadeV408SceneFocus(base);
  assert.equal(focus.mode, "signature");
  assert.ok(focus.cameraPullback > 0 && focus.cameraPullback < .5);
  assert.ok(focus.vignette < .1);
});

test("V40.8 rival and boss focus keep a stronger but bounded target composition", () => {
  const rival = skyDancerArcadeV408SceneFocus({ ...base, rivalAceActive: true });
  const boss = skyDancerArcadeV408SceneFocus({ ...base, bossActive: true });
  const finalBoss = skyDancerArcadeV408SceneFocus({ ...base, bossActive: true, finalBossReactive: true });
  assert.equal(rival.mode, "rival");
  assert.equal(boss.mode, "boss");
  assert.ok(rival.targetLookWeight > boss.targetLookWeight);
  assert.ok(finalBoss.cameraPullback > boss.cameraPullback);
  assert.ok(finalBoss.cameraFovKick > boss.cameraFovKick);
  for (const focus of [rival, boss, finalBoss]) {
    assert.ok(focus.cameraPullback <= 1.1);
    assert.ok(focus.cameraFovKick <= 1.5);
    assert.ok(focus.bloomBoost <= .05);
  }
});

test("V40.8 debrief focus settles the camera instead of adding another speed kick", () => {
  const handoff = skyDancerArcadeV408SceneFocus({ ...base, status: "stage-clear" });
  const finale = skyDancerArcadeV408SceneFocus({ ...base, status: "run-clear" });
  assert.equal(handoff.mode, "handoff");
  assert.equal(finale.mode, "finale");
  assert.ok(handoff.cameraFovKick < 0);
  assert.ok(finale.cameraFovKick < handoff.cameraFovKick);
  assert.ok(finale.vignette > handoff.vignette);
});

test("V40.8 target look bias stays subtle even for edge-case target coordinates", () => {
  const rival = skyDancerArcadeV408SceneFocus({ ...base, rivalAceActive: true });
  const bias = skyDancerArcadeV408TargetLookBias(rival, 20, -20);
  assert.deepEqual(bias, { x: 1.05, y: -.55 });
  const neutral = skyDancerArcadeV408TargetLookBias(skyDancerArcadeV408SceneFocus({ ...base, worldBreakLive: false }), 2, 2);
  assert.deepEqual(neutral, { x: 0, y: 0 });
});

test("V40.8 is presentation-only and wires WebGL, Canvas and product HUD to one scene-focus contract", () => {
  const runtime = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  const webgl = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  const canvas = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  const mode = readFileSync(resolve("app/SkyDancerArcadeMode.tsx"), "utf8");
  const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");
  assert.doesNotMatch(runtime, /V408CinematicFocus/);
  assert.match(webgl, /skyDancerArcadeV408SceneFocus/);
  assert.match(webgl, /skyDancerArcadeV408TargetLookBias/);
  assert.match(webgl, /v408Focus\.cameraPullback/);
  assert.match(canvas, /drawCinematicFocusV408/);
  assert.match(mode, /data-v408-scene=\{v408Focus\.mode\}/);
  assert.match(mode, /cinematicFocusV408/);
  assert.match(css, /V40\.8 Cinematic Focus Pass/);
  assert.match(css, /max-height:430px/);
});
'''
Path("tests/sky-arcade-v408-cinematic-focus.test.ts").write_text(test)


# Product HUD: expose the shared scene mode and place one non-interactive edge-focus layer above the renderer.
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '} from "../src/sky/arcade/SkyDancerArcadeV407FullRunPolish";\n',
    '} from "../src/sky/arcade/SkyDancerArcadeV407FullRunPolish";\nimport { skyDancerArcadeV408SceneFocus } from "../src/sky/arcade/SkyDancerArcadeV408CinematicFocus";\n',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '  const rendererBadgeVisible = skyDancerArcadeV407RendererBadgeVisible(rendererName, snapshot.stageNumber, snapshot.stageTimeSeconds, snapshot.status);\n',
    '  const rendererBadgeVisible = skyDancerArcadeV407RendererBadgeVisible(rendererName, snapshot.stageNumber, snapshot.stageTimeSeconds, snapshot.status);\n'
    '  const v408Focus = skyDancerArcadeV408SceneFocus({\n'
    '    status: snapshot.status,\n'
    '    stageProgress: snapshot.stageProgress,\n'
    '    worldBreakLive: snapshot.worldBreakLive,\n'
    '    rivalAceActive: snapshot.rivalAceActive,\n'
    '    bossActive: snapshot.bossActive,\n'
    '    finalBossReactive: snapshot.finalBossReactive,\n'
    '  });\n',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '      <section className={styles.stage} data-v407-focus={v407Focus} aria-label="Sky Dancer Arcade Run">\n        <div ref={mountRef} className={styles.viewport} />\n',
    '      <section className={styles.stage} data-v407-focus={v407Focus} data-v408-scene={v408Focus.mode} aria-label="Sky Dancer Arcade Run">\n'
    '        <div ref={mountRef} className={styles.viewport} />\n'
    '        <div className={styles.cinematicFocusV408} data-scene={v408Focus.mode} aria-hidden="true" />\n',
)

# WebGL: keep a steady framing language between one-shot cues without touching simulation state.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '} from "./SkyDancerArcadeV406FinalBossPresentation";\n',
    '} from "./SkyDancerArcadeV406FinalBossPresentation";\n'
    'import { skyDancerArcadeV408SceneFocus, skyDancerArcadeV408TargetLookBias } from "./SkyDancerArcadeV408CinematicFocus";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.presentationFx = this.presentationDirector.update(snapshot, this.previousSnapshot, delta);\n',
    '    this.presentationFx = this.presentationDirector.update(snapshot, this.previousSnapshot, delta);\n'
    '    const v408Focus = skyDancerArcadeV408SceneFocus({\n'
    '      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,\n'
    '      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,\n'
    '    });\n'
    '    this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, v408Focus.bloomBoost);\n'
    '    this.presentationFx.boss = Math.max(this.presentationFx.boss, v408Focus.bossBoost);\n'
    '    this.presentationFx.transition = Math.max(this.presentationFx.transition, v408Focus.transitionBoost);\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    const finalBossEnvelope = this.finalBossPresentationTimer > 0 && this.finalBossPresentationCue\n      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)\n      : 0;\n',
    '    const finalBossEnvelope = this.finalBossPresentationTimer > 0 && this.finalBossPresentationCue\n'
    '      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)\n'
    '      : 0;\n'
    '    const v408Focus = skyDancerArcadeV408SceneFocus({\n'
    '      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,\n'
    '      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,\n'
    '    });\n'
    '    const v408Target = snapshot.bossActive\n'
    '      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null\n'
    '      : snapshot.rivalAceActive ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null : null;\n'
    '    const v408Look = skyDancerArcadeV408TargetLookBias(v408Focus, v408Target?.x ?? 0, v408Target?.y ?? 0);\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback + worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback + finalBossEnvelope * (this.finalBossPresentationCue?.cameraPullback ?? 0) - this.camera.position.z) * zAlpha;\n',
    '    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback + worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback + finalBossEnvelope * (this.finalBossPresentationCue?.cameraPullback ?? 0) + v408Focus.cameraPullback - this.camera.position.z) * zAlpha;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick + worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick + finalBossEnvelope * (this.finalBossPresentationCue?.cameraFovKick ?? 0) - this.camera.fov) * fovAlpha;\n',
    '    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick + worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick + finalBossEnvelope * (this.finalBossPresentationCue?.cameraFovKick ?? 0) + v408Focus.cameraFovKick - this.camera.fov) * fovAlpha;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    const desiredLookX = pose.lookX;\n    const desiredLookY = pose.lookY + finalBossEnvelope * (this.finalBossPresentationCue?.lookLift ?? 0);\n',
    '    const desiredLookX = pose.lookX + v408Look.x;\n'
    '    const desiredLookY = pose.lookY + v408Look.y + finalBossEnvelope * (this.finalBossPresentationCue?.lookLift ?? 0);\n',
)

# Canvas fallback: the shared HUD vignette applies to both renderers; add a tracked target frame so rival/boss focus still reads without WebGL camera motion.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    'import { skyDancerArcadeV406FinalBossCue, skyDancerArcadeV406FormMotion, skyDancerArcadeV406FormLabel } from "./SkyDancerArcadeV406FinalBossPresentation";\n',
    'import { skyDancerArcadeV406FinalBossCue, skyDancerArcadeV406FormMotion, skyDancerArcadeV406FormLabel } from "./SkyDancerArcadeV406FinalBossPresentation";\n'
    'import { skyDancerArcadeV408SceneFocus } from "./SkyDancerArcadeV408CinematicFocus";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '    this.drawPlayer(context, snapshot, cssWidth, cssHeight);\n    context.restore();\n',
    '    this.drawPlayer(context, snapshot, cssWidth, cssHeight);\n'
    '    this.drawCinematicFocusV408(context, snapshot, cssWidth, cssHeight);\n'
    '    context.restore();\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '  private drawFinalBossPresentation(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {\n',
    r'''  private drawCinematicFocusV408(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    const focus = skyDancerArcadeV408SceneFocus({
      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,
      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,
    });
    const target = focus.mode === "boss"
      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null
      : focus.mode === "rival" ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null : null;
    if (!target) return;
    const projected = this.project(target.x, target.y, target.depth, width, height);
    const radius = Math.max(24, Math.min(68, projected.scale * (focus.mode === "boss" ? 58 : 46)));
    const corner = radius * .34;
    const accent = focus.mode === "rival"
      ? "#ff65d5"
      : `#${snapshot.stage.palette.accent.toString(16).padStart(6, "0")}`;
    context.save();
    context.strokeStyle = accent;
    context.globalAlpha = .18 + focus.strength * .2;
    context.lineWidth = focus.mode === "boss" ? 1.6 : 1.35;
    const x0 = projected.x - radius;
    const x1 = projected.x + radius;
    const y0 = projected.y - radius;
    const y1 = projected.y + radius;
    context.beginPath();
    context.moveTo(x0 + corner, y0); context.lineTo(x0, y0); context.lineTo(x0, y0 + corner);
    context.moveTo(x1 - corner, y0); context.lineTo(x1, y0); context.lineTo(x1, y0 + corner);
    context.moveTo(x0, y1 - corner); context.lineTo(x0, y1); context.lineTo(x0 + corner, y1);
    context.moveTo(x1 - corner, y1); context.lineTo(x1, y1); context.lineTo(x1, y1 - corner);
    context.stroke();
    context.restore();
  }

  private drawFinalBossPresentation(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
''',
)

css = r'''/* V40.8 Cinematic Focus Pass: steady scene hierarchy between one-shot camera cues. */
.cinematicFocusV408{position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .28s ease,background .34s ease,box-shadow .34s ease;background:linear-gradient(90deg,rgba(2,6,15,.12),transparent 18%,transparent 82%,rgba(2,6,15,.12)),linear-gradient(180deg,rgba(2,6,15,.1),transparent 22%,transparent 78%,rgba(2,6,15,.14));box-shadow:inset 0 0 70px rgba(2,6,15,.08)}
.cinematicFocusV408[data-scene="signature"]{opacity:.4;box-shadow:inset 0 0 72px rgba(3,12,24,.16)}
.cinematicFocusV408[data-scene="rival"]{opacity:.62;background:linear-gradient(90deg,rgba(45,4,42,.12),transparent 19%,transparent 81%,rgba(2,36,44,.12)),linear-gradient(180deg,rgba(2,6,15,.08),transparent 20%,transparent 78%,rgba(2,6,15,.18));box-shadow:inset 0 0 82px rgba(13,5,30,.2)}
.cinematicFocusV408[data-scene="boss"]{opacity:.7;background:linear-gradient(90deg,rgba(40,5,13,.13),transparent 18%,transparent 82%,rgba(40,21,3,.1)),linear-gradient(180deg,rgba(2,6,15,.1),transparent 18%,transparent 76%,rgba(2,6,15,.22));box-shadow:inset 0 0 96px rgba(9,3,14,.24)}
.cinematicFocusV408[data-scene="handoff"]{opacity:.68;background:linear-gradient(180deg,rgba(2,7,17,.08),transparent 35%,rgba(2,7,17,.24));box-shadow:inset 0 0 108px rgba(2,7,17,.3)}
.cinematicFocusV408[data-scene="finale"]{opacity:.82;background:radial-gradient(circle at 50% 43%,transparent 0 34%,rgba(2,5,14,.08) 58%,rgba(2,5,14,.31) 100%);box-shadow:inset 0 0 130px rgba(2,5,14,.34)}
.stage[data-v407-focus="critical"] .cinematicFocusV408{opacity:.76;box-shadow:inset 0 0 100px rgba(24,3,7,.26)}
.stage[data-v408-scene="rival"] .chain,.stage[data-v408-scene="boss"] .chain{opacity:.62}
.stage[data-v408-scene="boss"] .routeOverlay{opacity:.2}
@media (max-height:430px){.cinematicFocusV408[data-scene="signature"]{opacity:.3}.cinematicFocusV408[data-scene="rival"]{opacity:.5}.cinematicFocusV408[data-scene="boss"]{opacity:.58}.cinematicFocusV408[data-scene="handoff"],.cinematicFocusV408[data-scene="finale"]{opacity:.62}}
@media (prefers-reduced-motion:reduce){.cinematicFocusV408{transition:none}}
'''
append_once("app/SkyDancerArcadeMode.module.css", "V40.8 Cinematic Focus Pass", css)

print("Arcade Run V40.8 cinematic focus patch applied")
