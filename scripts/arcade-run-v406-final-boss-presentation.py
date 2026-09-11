from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


Path("src/sky/arcade/SkyDancerArcadeV406FinalBossPresentation.ts").write_text(r'''import type { SkyDancerArcadeV405FinalBossForm } from "./SkyDancerArcadeV405RouteReactiveFinalBoss";

export type SkyDancerArcadeV406FinalBossEvent = "arrival" | "phase" | "defeat";

export interface SkyDancerArcadeV406FinalBossCue {
  label: string;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  cameraRoll: number;
  lookLift: number;
  bloomBoost: number;
  exposureBoost: number;
  audioLowHz: number;
  audioHighHz: number;
}

export interface SkyDancerArcadeV406BossDrone {
  frequencyHz: number;
  gain: number;
}

export interface SkyDancerArcadeV406FormMotion {
  scale: number;
  spinZ: number;
  spinY: number;
  wobble: number;
}

interface Identity {
  label: string;
  low: number;
  high: number;
  drone: number;
  pullback: number;
  fov: number;
  roll: number;
  bloom: number;
  pulse: number;
  spin: number;
}

const IDENTITIES: Record<SkyDancerArcadeV405FinalBossForm, Identity> = {
  MIRROR_AEGIS: { label: "MIRROR AEGIS", low: 122, high: 488, drone: 61, pullback: 1.18, fov: 2.4, roll: -.022, bloom: .12, pulse: .026, spin: .055 },
  PRISM_CROWN: { label: "PRISM CROWN", low: 196, high: 784, drone: 98, pullback: 1.42, fov: 3.2, roll: .034, bloom: .16, pulse: .038, spin: .105 },
  HELLSTAR: { label: "HELLSTAR", low: 82, high: 328, drone: 41, pullback: .94, fov: 4.1, roll: -.052, bloom: .19, pulse: .052, spin: .15 },
  SEVEN_SKY: { label: "SEVEN SKY", low: 163, high: 652, drone: 81.5, pullback: 1.62, fov: 3.7, roll: .044, bloom: .18, pulse: .044, spin: .085 },
};

const phase = (value: number) => Math.max(1, Math.min(3, Math.round(value))) as 1 | 2 | 3;

export function skyDancerArcadeV406FinalBossCue(
  form: SkyDancerArcadeV405FinalBossForm | null | undefined,
  bossPhase: number,
  event: SkyDancerArcadeV406FinalBossEvent,
): SkyDancerArcadeV406FinalBossCue | null {
  if (!form) return null;
  const identity = IDENTITIES[form];
  const p = phase(bossPhase);
  const eventScale = event === "arrival" ? 1 : event === "phase" ? 1.08 + (p - 1) * .1 : 1.42;
  const durationSeconds = event === "arrival" ? 1.35 : event === "phase" ? 1.08 + p * .08 : 1.9;
  const phaseName = p === 1 ? "AWAKENING" : p === 2 ? "MEMORY SHIFT" : "FINAL OVERDRIVE";
  return {
    label: event === "arrival" ? `${identity.label} · DESCENT` : event === "defeat" ? `${identity.label} · SKY BREAK` : `${identity.label} · ${phaseName}`,
    durationSeconds,
    strength: eventScale,
    cameraPullback: identity.pullback * eventScale,
    cameraFovKick: identity.fov * eventScale,
    cameraShake: (event === "defeat" ? .54 : .2 + p * .055) * (form === "HELLSTAR" ? 1.14 : 1),
    cameraRoll: identity.roll * (event === "defeat" ? 1.4 : 1 + (p - 1) * .22),
    lookLift: (event === "defeat" ? .62 : .18 + p * .1) * (form === "SEVEN_SKY" ? 1.18 : 1),
    bloomBoost: identity.bloom * eventScale,
    exposureBoost: Math.min(.085, identity.bloom * .3 * eventScale),
    audioLowHz: identity.low * (event === "defeat" ? .75 : 1 + (p - 1) * .08),
    audioHighHz: identity.high * (event === "defeat" ? 1.25 : 1 + (p - 1) * .1),
  };
}

export function skyDancerArcadeV406BossDrone(
  form: SkyDancerArcadeV405FinalBossForm | null | undefined,
  bossPhase: number,
  active: boolean,
): SkyDancerArcadeV406BossDrone {
  if (!form || !active) return { frequencyHz: 54, gain: 0 };
  const identity = IDENTITIES[form];
  const p = phase(bossPhase);
  return {
    frequencyHz: identity.drone * (1 + (p - 1) * .125),
    gain: (.009 + p * .0035) * (form === "HELLSTAR" ? 1.14 : form === "SEVEN_SKY" ? 1.08 : 1),
  };
}

export function skyDancerArcadeV406FormMotion(
  form: SkyDancerArcadeV405FinalBossForm | null | undefined,
  bossPhase: number,
  timeSeconds: number,
): SkyDancerArcadeV406FormMotion {
  if (!form) return { scale: 1, spinZ: 0, spinY: 0, wobble: 0 };
  const identity = IDENTITIES[form];
  const p = phase(bossPhase);
  const tempo = form === "HELLSTAR" ? 5.4 : form === "PRISM_CROWN" ? 3.8 : form === "SEVEN_SKY" ? 3.15 : 2.45;
  const pulse = Math.sin(timeSeconds * tempo + p * .7) * identity.pulse * (1 + (p - 1) * .24);
  const wobble = Math.sin(timeSeconds * (tempo * .62) + p) * identity.roll * .75;
  return {
    scale: 1 + pulse,
    spinZ: identity.spin * (1 + (p - 1) * .34),
    spinY: identity.spin * .28 * (form === "MIRROR_AEGIS" ? -1 : 1),
    wobble,
  };
}

export function skyDancerArcadeV406FormLabel(form: SkyDancerArcadeV405FinalBossForm | null | undefined): string {
  return form ? IDENTITIES[form].label : "PRISM SOVEREIGN";
}
''')

Path("tests/sky-arcade-v406-final-boss-presentation.test.ts").write_text(r'''import assert from "node:assert/strict";
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
''')

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl,
'''import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
} from "./SkyDancerArcadeV403WorldBreakRecovery";
import {''',
'''import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
} from "./SkyDancerArcadeV403WorldBreakRecovery";
import {
  skyDancerArcadeV406BossDrone,
  skyDancerArcadeV406FinalBossCue,
  skyDancerArcadeV406FormMotion,
  type SkyDancerArcadeV406FinalBossCue,
} from "./SkyDancerArcadeV406FinalBossPresentation";
import {''')
replace_once(webgl,
'''  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
''',
'''  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private bossDrone: OscillatorNode | null = null;
  private bossDroneGain: GainNode | null = null;
''')
replace_once(webgl,
'''      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 62;
      this.engineGain.gain.value = 0.018;
      this.engine.connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
''',
'''      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.bossDrone = this.context.createOscillator();
      this.bossDroneGain = this.context.createGain();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 62;
      this.engineGain.gain.value = 0.018;
      this.engine.connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
      this.bossDrone.type = "triangle";
      this.bossDrone.frequency.value = 54;
      this.bossDroneGain.gain.value = 0;
      this.bossDrone.connect(this.bossDroneGain).connect(this.context.destination);
      this.bossDrone.start();
''')
replace_once(webgl,
'''    this.engine.frequency.setTargetAtTime(snapshot.turboActive ? 118 : 68 + snapshot.stage.courseSpeed * 0.12, now, 0.08);
    this.engineGain.gain.setTargetAtTime(snapshot.status === "running" ? (snapshot.turboActive ? 0.032 : 0.018) : 0.006, now, 0.12);
''',
'''    this.engine.frequency.setTargetAtTime(snapshot.turboActive ? 118 : 68 + snapshot.stage.courseSpeed * 0.12, now, 0.08);
    this.engineGain.gain.setTargetAtTime(snapshot.status === "running" ? (snapshot.turboActive ? 0.032 : 0.018) : 0.006, now, 0.12);
    const bossDrone = skyDancerArcadeV406BossDrone(snapshot.finalBossForm, snapshot.bossPhase, snapshot.finalBossReactive && snapshot.bossActive && snapshot.status === "running");
    this.bossDrone?.frequency.setTargetAtTime(bossDrone.frequencyHz, now, .18);
    this.bossDroneGain?.gain.setTargetAtTime(bossDrone.gain, now, .28);
''')
replace_once(webgl,
'''    try {
      this.engine?.stop();
    } catch {
      // The oscillator may already have been stopped during a renderer handoff.
    }
    void this.context?.close();
    this.context = null;
    this.engine = null;
    this.engineGain = null;
''',
'''    try {
      this.engine?.stop();
      this.bossDrone?.stop();
    } catch {
      // The oscillator may already have been stopped during a renderer handoff.
    }
    void this.context?.close();
    this.context = null;
    this.engine = null;
    this.engineGain = null;
    this.bossDrone = null;
    this.bossDroneGain = null;
''')
replace_once(webgl,
'''  private worldBreakRecoveryMode: "failure" | "comeback" | null = null;
  private worldBreakRecoveryDebt = false;
  private worldBreakRecoveryResolvedMessage: string | null = null;
''',
'''  private worldBreakRecoveryMode: "failure" | "comeback" | null = null;
  private worldBreakRecoveryDebt = false;
  private worldBreakRecoveryResolvedMessage: string | null = null;
  // V40.6: final-boss presentation consumes V40.5 telemetry only; simulation timing and hit rules remain untouched.
  private finalBossPresentationTimer = 0;
  private finalBossPresentationDuration = 1;
  private finalBossPresentationCue: SkyDancerArcadeV406FinalBossCue | null = null;
''')
replace_once(webgl,
'''    this.syncBranchGates(snapshot, delta);
    this.syncEffects(snapshot);
    this.syncWorldBreakRecovery(snapshot, delta);
''',
'''    this.syncBranchGates(snapshot, delta);
    this.syncEffects(snapshot);
    this.syncFinalBossPresentation(snapshot, delta);
    this.syncWorldBreakRecovery(snapshot, delta);
''')
replace_once(webgl,
'''        const finalBossRig = group.getObjectByName("arcade-v405-final-boss-form");
        if (finalBossRig) {
          const pulse = 1 + Math.sin(snapshot.runTimeSeconds * (2.8 + enemy.bossPhase * .7)) * (.025 + enemy.bossPhase * .008);
          finalBossRig.scale.setScalar(pulse);
          finalBossRig.rotation.z += delta * (.08 + enemy.bossPhase * .045);
          finalBossRig.rotation.y += delta * .025;
        }
''',
'''        const finalBossRig = group.getObjectByName("arcade-v405-final-boss-form");
        if (finalBossRig) {
          const formMotion = skyDancerArcadeV406FormMotion(enemy.finalBossForm, enemy.bossPhase, snapshot.runTimeSeconds);
          finalBossRig.scale.setScalar(formMotion.scale);
          finalBossRig.rotation.z += delta * formMotion.spinZ;
          finalBossRig.rotation.y += delta * formMotion.spinY;
          finalBossRig.rotation.x = formMotion.wobble;
        }
''')
replace_once(webgl,
'''    if (snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .5);
      this.cameraShake = Math.min(.9, this.cameraShake + .28);
      this.audio.tone(74, .32, .05, "sawtooth");
      this.audio.tone(296, .2, .018, "triangle");
    }
    if (snapshot.finalBossSerial !== this.previousSnapshot.finalBossSerial && snapshot.finalBossReactive) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .66);
      this.cameraShake = Math.min(1, this.cameraShake + .34);
      const formTone = snapshot.finalBossForm === "HELLSTAR" ? 92 : snapshot.finalBossForm === "PRISM_CROWN" ? 392 : snapshot.finalBossForm === "MIRROR_AEGIS" ? 244 : 326;
      this.audio.tone(formTone, .34, .052, "sawtooth");
      this.audio.tone(formTone * 1.5, .22, .022, "triangle");
    }
''',
'''    if (snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial && !snapshot.finalBossReactive) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .5);
      this.cameraShake = Math.min(.9, this.cameraShake + .28);
      this.audio.tone(74, .32, .05, "sawtooth");
      this.audio.tone(296, .2, .018, "triangle");
    }
''')
replace_once(webgl,
'''  /** Small deterministic outdoor reflection map for the ceramic skin and canopy. */
''',
'''  private syncFinalBossPresentation(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.finalBossPresentationTimer = Math.max(0, this.finalBossPresentationTimer - delta);
    if (!snapshot.finalBossReactive || !snapshot.finalBossForm) {
      this.finalBossPresentationCue = null;
      return;
    }
    const arrival = snapshot.bossActive && !this.previousSnapshot.bossActive;
    const phaseShift = snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial;
    const defeat = snapshot.message !== this.previousSnapshot.message && snapshot.message?.startsWith("SOVEREIGN DOWN");
    const event = defeat ? "defeat" : phaseShift ? "phase" : arrival ? "arrival" : null;
    if (event) {
      const cue = skyDancerArcadeV406FinalBossCue(snapshot.finalBossForm, snapshot.bossPhase, event);
      if (cue) {
        this.finalBossPresentationCue = cue;
        this.finalBossPresentationTimer = cue.durationSeconds;
        this.finalBossPresentationDuration = cue.durationSeconds;
        this.cameraShake = Math.min(1, this.cameraShake + cue.cameraShake);
        this.cameraImpactKick = Math.max(this.cameraImpactKick, event === "defeat" ? .78 : .46 * cue.strength);
        this.presentation.emitRushAccent();
        this.audio.tone(cue.audioLowHz, event === "defeat" ? .48 : .31, .035 + cue.strength * .012, event === "defeat" ? "sawtooth" : "triangle");
        this.audio.tone(cue.audioHighHz, event === "defeat" ? .34 : .2, .018 + cue.strength * .007, event === "phase" ? "square" : "triangle");
        if (event === "defeat") this.audio.tone(cue.audioHighHz * .5, .72, .024, "sine");
      }
    }
    const envelope = this.finalBossPresentationTimer > 0
      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)
      : 0;
    if (envelope > 0 && this.finalBossPresentationCue) {
      this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, envelope * this.finalBossPresentationCue.bloomBoost);
      this.presentationFx.exposureBoost = Math.max(this.presentationFx.exposureBoost, envelope * this.finalBossPresentationCue.exposureBoost);
    }
  }

  /** Small deterministic outdoor reflection map for the ceramic skin and canopy. */
''')
replace_once(webgl,
'''    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
''',
'''    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
    const finalBossEnvelope = this.finalBossPresentationTimer > 0 && this.finalBossPresentationCue
      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)
      : 0;
''')
replace_once(webgl,
'''    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback + worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick + worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick - this.camera.fov) * fovAlpha;
''',
'''    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback + worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback + finalBossEnvelope * (this.finalBossPresentationCue?.cameraPullback ?? 0) - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick + worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick + finalBossEnvelope * (this.finalBossPresentationCue?.cameraFovKick ?? 0) - this.camera.fov) * fovAlpha;
''')
replace_once(webgl,
'''    const desiredLookX = pose.lookX;
    const desiredLookY = pose.lookY;
    const desiredLookZ = pose.lookZ;
''',
'''    const desiredLookX = pose.lookX;
    const desiredLookY = pose.lookY + finalBossEnvelope * (this.finalBossPresentationCue?.lookLift ?? 0);
    const desiredLookZ = pose.lookZ - finalBossEnvelope * (this.finalBossPresentationCue?.strength ?? 0) * .72;
''')
replace_once(webgl,
'''    const desiredRoll = pose.roll;
''',
'''    const desiredRoll = pose.roll + finalBossEnvelope * (this.finalBossPresentationCue?.cameraRoll ?? 0);
''')

canvas = "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"
replace_once(canvas,
'''import { skyDancerArcadeEnemyVisualScaleV17 } from "./SkyDancerArcadeModels";
''',
'''import { skyDancerArcadeEnemyVisualScaleV17 } from "./SkyDancerArcadeModels";
import { skyDancerArcadeV406FinalBossCue, skyDancerArcadeV406FormMotion, skyDancerArcadeV406FormLabel } from "./SkyDancerArcadeV406FinalBossPresentation";
''')
replace_once(canvas,
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
''',
'''    this.drawCourse(context, snapshot, cssWidth, cssHeight);
    this.drawFinalBossPresentation(context, snapshot, cssWidth, cssHeight);
    this.drawWorldBreakGates(context, snapshot, cssWidth, cssHeight);
''')
replace_once(canvas,
'''  private traceEnemySilhouetteV20(
''',
'''  private drawFinalBossPresentation(context: CanvasRenderingContext2D, snapshot: SkyDancerArcadeSnapshot, width: number, height: number): void {
    if (!snapshot.finalBossReactive || !snapshot.finalBossForm) return;
    const boss = snapshot.enemies.find((enemy) => enemy.boss);
    const defeated = snapshot.message?.startsWith("SOVEREIGN DOWN") ?? false;
    if (!boss && !defeated) return;
    const accent = snapshot.finalBossAccent ?? snapshot.stage.palette.accent;
    const hex = `#${accent.toString(16).padStart(6, "0")}`;
    const motion = skyDancerArcadeV406FormMotion(snapshot.finalBossForm, snapshot.bossPhase, snapshot.runTimeSeconds);
    const cue = skyDancerArcadeV406FinalBossCue(snapshot.finalBossForm, snapshot.bossPhase, defeated ? "defeat" : "phase");
    const cx = width * .5;
    const cy = height * .38;
    context.save();
    const glow = context.createRadialGradient(cx, cy, 8, cx, cy, Math.max(width, height) * .48);
    glow.addColorStop(0, `${hex}38`);
    glow.addColorStop(.48, `${hex}14`);
    glow.addColorStop(1, `${hex}00`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.translate(cx, cy);
    context.rotate(motion.wobble + snapshot.runTimeSeconds * motion.spinZ * .08);
    context.strokeStyle = hex;
    context.globalAlpha = defeated ? .82 : .36 + snapshot.bossPhase * .11;
    context.lineWidth = defeated ? 4 : 2.2;
    const ringCount = snapshot.finalBossForm === "SEVEN_SKY" ? 7 : snapshot.finalBossForm === "MIRROR_AEGIS" ? 4 : snapshot.finalBossForm === "PRISM_CROWN" ? 5 : 3;
    for (let ring = 0; ring < ringCount; ring += 1) {
      const radius = (36 + ring * 18) * motion.scale;
      context.beginPath();
      const start = snapshot.runTimeSeconds * motion.spinZ * (ring % 2 === 0 ? 1 : -1);
      context.arc(0, 0, radius, start, start + Math.PI * (snapshot.finalBossForm === "HELLSTAR" ? 1.36 : 1.7));
      context.stroke();
    }
    context.restore();
    context.save();
    context.textAlign = "center";
    context.fillStyle = hex;
    context.globalAlpha = .92;
    context.font = "800 10px system-ui, sans-serif";
    context.fillText(`${skyDancerArcadeV406FormLabel(snapshot.finalBossForm)} · PHASE ${snapshot.bossPhase}`, cx, height * .105);
    if (cue) {
      context.globalAlpha = .68;
      context.font = "700 8px system-ui, sans-serif";
      context.fillText(cue.label, cx, height * .105 + 13);
    }
    context.restore();
  }

  private traceEnemySilhouetteV20(
''')

print("Arcade Run V40.6 final boss presentation patch applied")
