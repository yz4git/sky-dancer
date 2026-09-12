from pathlib import Path

root = Path('.')
helper_path = root / 'src/sky/arcade/SkyDancerArcadeV4015StageReadability.ts'
test_path = root / 'tests/sky-arcade-v4015-stage-readability.test.ts'
demo_path = root / 'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts'

helper = '''import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV4010FxClarity } from "./SkyDancerArcadeV4010DynamicOcclusion";
import type { SkyDancerArcadeV4012RhythmPhase } from "./SkyDancerArcadeV4012RunRhythm";

export interface SkyDancerArcadeV4015Input {
  compactLandscape: boolean;
  stageId: SkyDancerArcadeStageId;
  rhythmPhase: SkyDancerArcadeV4012RhythmPhase;
  screenStress: number;
  bossActive: boolean;
  turboActive: boolean;
  baseFxClarity: SkyDancerArcadeV4010FxClarity;
  baseSpeedLineAlpha: number;
}

export interface SkyDancerArcadeV4015Profile {
  focusPressure: number;
  stageNoise: number;
  fxClarity: SkyDancerArcadeV4010FxClarity;
  speedLineAlpha: number;
}

const STAGE_NOISE: Record<SkyDancerArcadeStageId, number> = {
  "dawn-city": .08,
  "red-canyon": .16,
  "cloud-fleet": .27,
  "storm-carrier": .34,
  "desert-fortress": .17,
  "ice-cavern": .29,
  "floating-ruins": .21,
  "night-metro": .22,
  "volcano-core": .32,
  "orbital-ascent": .07,
  "prism-citadel": .3,
};

const PHASE_FOCUS: Record<SkyDancerArcadeV4012RhythmPhase, number> = {
  opening: 0,
  build: .04,
  signature: .15,
  release: 0,
  rival: .19,
  "boss-rise": .28,
  boss: .32,
  handoff: 0,
  finale: 0,
};

const KEY_PHASES = new Set<SkyDancerArcadeV4012RhythmPhase>(["signature", "rival", "boss-rise", "boss"]);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(value, 0, 1);

/**
 * V40.15 keeps each stage's authored identity while creating a cleaner hero corridor when the
 * player must read a signature target, rival or boss on a phone-sized landscape viewport.
 * It is presentation-only: simulation, spawns, hit rules, difficulty and timing are untouched.
 */
export function skyDancerArcadeV4015StageReadability(input: SkyDancerArcadeV4015Input): SkyDancerArcadeV4015Profile {
  const stageNoise = STAGE_NOISE[input.stageId];
  const preserveExitShot = input.rhythmPhase === "handoff" || input.rhythmPhase === "finale";
  if (!input.compactLandscape || preserveExitShot) {
    return {
      focusPressure: 0,
      stageNoise,
      fxClarity: { ...input.baseFxClarity },
      speedLineAlpha: clamp01(input.baseSpeedLineAlpha),
    };
  }

  const keyPhase = KEY_PHASES.has(input.rhythmPhase);
  const stageContribution = stageNoise * (keyPhase ? .72 : .2);
  const phaseContribution = PHASE_FOCUS[input.rhythmPhase];
  const stressContribution = clamp01(input.screenStress) * .28;
  const bossContribution = input.bossActive ? .08 : 0;
  const focusPressure = clamp01(stageContribution + phaseContribution + stressContribution + bossContribution);

  // Smoke, missile exhaust and loose debris yield first. Hot sparks and detonation cores stay bold
  // so hits still feel powerful while the target silhouette remains readable.
  const fxClarity: SkyDancerArcadeV4010FxClarity = {
    smokeAlpha: clamp(input.baseFxClarity.smokeAlpha * (1 - focusPressure * .26), .42, 1),
    sparkAlpha: clamp(input.baseFxClarity.sparkAlpha * (1 - focusPressure * .055), .76, 1),
    missileSmokeAlpha: clamp(input.baseFxClarity.missileSmokeAlpha * (1 - focusPressure * .18), .48, 1),
    detonationAlpha: clamp(input.baseFxClarity.detonationAlpha * (1 - focusPressure * .045), .78, 1),
    debrisScale: clamp(input.baseFxClarity.debrisScale * (1 - focusPressure * .14), .7, 1),
  };

  // Turbo must still feel fast. During non-turbo focus beats the speed lines can recede further.
  const speedFloor = input.turboActive ? .5 : .4;
  const speedLineAlpha = clamp(input.baseSpeedLineAlpha * (1 - focusPressure * .36), speedFloor, 1);

  return { focusPressure, stageNoise, fxClarity, speedLineAlpha };
}
'''

tests = '''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { skyDancerArcadeV4015StageReadability } from "../src/sky/arcade/SkyDancerArcadeV4015StageReadability";
import { SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY } from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";

const base = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY;
const profile = (overrides: Partial<Parameters<typeof skyDancerArcadeV4015StageReadability>[0]> = {}) =>
  skyDancerArcadeV4015StageReadability({
    compactLandscape: true,
    stageId: "dawn-city",
    rhythmPhase: "build",
    screenStress: 0,
    bossActive: false,
    turboActive: false,
    baseFxClarity: base,
    baseSpeedLineAlpha: .88,
    ...overrides,
  });

test("V40.15 is an identity pass on non-phone layouts and handoff shots", () => {
  const desktop = profile({ compactLandscape: false, stageId: "storm-carrier", rhythmPhase: "boss", bossActive: true });
  assert.deepEqual(desktop.fxClarity, base);
  assert.equal(desktop.speedLineAlpha, .88);
  const handoff = profile({ stageId: "volcano-core", rhythmPhase: "handoff", screenStress: 1 });
  assert.deepEqual(handoff.fxClarity, base);
  assert.equal(handoff.focusPressure, 0);
});

test("clutter-heavy stage boss beats clear more aggressively than ordinary Dawn City flight", () => {
  const dawn = profile();
  const stormBoss = profile({ stageId: "storm-carrier", rhythmPhase: "boss", bossActive: true, screenStress: .55 });
  assert.ok(stormBoss.focusPressure > dawn.focusPressure + .35);
  assert.ok(stormBoss.fxClarity.smokeAlpha < dawn.fxClarity.smokeAlpha);
  assert.ok(stormBoss.fxClarity.missileSmokeAlpha < dawn.fxClarity.missileSmokeAlpha);
  assert.ok(stormBoss.speedLineAlpha < dawn.speedLineAlpha);
  assert.ok(stormBoss.fxClarity.detonationAlpha >= .78);
});

test("boss-rise yields more corridor space than build on the same stage", () => {
  const build = profile({ stageId: "ice-cavern", rhythmPhase: "build" });
  const rise = profile({ stageId: "ice-cavern", rhythmPhase: "boss-rise" });
  assert.ok(rise.focusPressure > build.focusPressure);
  assert.ok(rise.fxClarity.smokeAlpha < build.fxClarity.smokeAlpha);
  assert.ok(rise.speedLineAlpha < build.speedLineAlpha);
});

test("Orbital Ascent preserves its deliberately sparse normal-flight presentation", () => {
  const orbit = profile({ stageId: "orbital-ascent", rhythmPhase: "build" });
  assert.ok(orbit.focusPressure < .07);
  assert.ok(orbit.fxClarity.smokeAlpha > .98);
  assert.ok(orbit.speedLineAlpha > .85);
});

test("turbo keeps a minimum speed-line presence even under maximum focus pressure", () => {
  const turbo = profile({
    stageId: "prism-citadel", rhythmPhase: "boss", screenStress: 1,
    bossActive: true, turboActive: true, baseSpeedLineAlpha: .5,
  });
  assert.ok(turbo.speedLineAlpha >= .5);
  assert.ok(turbo.fxClarity.sparkAlpha >= .76);
  assert.ok(turbo.fxClarity.detonationAlpha >= .78);
});

test("V40.15 is wired after stress and rhythm governors in WebGL presentation", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  assert.match(source, /skyDancerArcadeV4015StageReadability/);
  assert.match(source, /baseFxClarity: v4015BaseFxClarity/);
  assert.match(source, /baseSpeedLineAlpha: v4011Stress\.speedStreakAlpha \* v4012Rhythm\.speedLineGain/);
  assert.match(source, /this\.v4010FxClarity = v4015Readability\.fxClarity/);
  assert.match(source, /this\.v4011SpeedStreakAlpha = v4015Readability\.speedLineAlpha/);
});
'''

helper_path.write_text(helper)
test_path.write_text(tests)

source = demo_path.read_text()
import_old = 'import { skyDancerArcadeV4012RunRhythm } from "./SkyDancerArcadeV4012RunRhythm";'
import_new = import_old + '\nimport { skyDancerArcadeV4015StageReadability } from "./SkyDancerArcadeV4015StageReadability";'
if source.count(import_old) != 1:
    raise SystemExit(f'V40.15 import anchor expected once, found {source.count(import_old)}')
source = source.replace(import_old, import_new, 1)

old = '''    this.v4010FxClarity = v4011Stress.pressure > 0 ? v4011Stress.fxClarity : v4010Profile.fxClarity;\n    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({\n      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,\n      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,\n      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,\n      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,\n    });\n    this.v4011SpeedStreakAlpha = v4011Stress.speedStreakAlpha * v4012Rhythm.speedLineGain;'''
new = '''    const v4015BaseFxClarity = v4011Stress.pressure > 0 ? v4011Stress.fxClarity : v4010Profile.fxClarity;\n    const v4012Rhythm = skyDancerArcadeV4012RunRhythm({\n      status: snapshot.status, stageId: snapshot.stage.id, stageNumber: snapshot.stageNumber,\n      stageProgress: snapshot.stageProgress, stageTimeSeconds: snapshot.stageTimeSeconds,\n      stageDurationSeconds: snapshot.stageDurationSeconds, worldBreakLive: snapshot.worldBreakLive,\n      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive,\n    });\n    const v4015Readability = skyDancerArcadeV4015StageReadability({\n      compactLandscape: compactLandscapeV271, stageId: snapshot.stage.id, rhythmPhase: v4012Rhythm.phase,\n      screenStress: v4011Stress.pressure, bossActive: snapshot.bossActive, turboActive: snapshot.turboActive,\n      baseFxClarity: v4015BaseFxClarity,\n      baseSpeedLineAlpha: v4011Stress.speedStreakAlpha * v4012Rhythm.speedLineGain,\n    });\n    this.v4010FxClarity = v4015Readability.fxClarity;\n    this.v4011SpeedStreakAlpha = v4015Readability.speedLineAlpha;'''
if source.count(old) != 1:
    raise SystemExit(f'V40.15 governor anchor expected once, found {source.count(old)}')
source = source.replace(old, new, 1)
demo_path.write_text(source)
print('Applied Arcade Run V40.15 stage readability governor')
