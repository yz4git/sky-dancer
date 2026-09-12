from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:160]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"patch anchor is not unique in {path}: {old[:160]!r}")
    target.write_text(text.replace(old, new, 1))


helper = r'''import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";
import type { SkyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";
import type {
  SkyDancerArcadeV4010FxClarity,
  SkyDancerArcadeV4010Profile,
} from "./SkyDancerArcadeV4010DynamicOcclusion";

export type SkyDancerArcadeV4011StressBand = "clear" | "busy" | "critical";

export interface SkyDancerArcadeV4011ForegroundEntity {
  x: number;
  y: number;
  depth: number;
  boss?: boolean;
  rivalAce?: boolean;
  worldBreakTarget?: boolean;
}

export interface SkyDancerArcadeV4011Input {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
  foregroundCraft: number;
  impactCount: number;
  destroyedImpacts: number;
  worldBreakLive: boolean;
  baseOcclusion: SkyDancerArcadeV4010Profile;
  baseClarity: SkyDancerArcadeV409PhoneClarity;
}

export interface SkyDancerArcadeV4011Profile {
  band: SkyDancerArcadeV4011StressBand;
  pressure: number;
  signalCount: number;
  occlusion: SkyDancerArcadeV4010Profile;
  clarity: SkyDancerArcadeV409PhoneClarity;
  fxClarity: SkyDancerArcadeV4010FxClarity;
  speedStreakAlpha: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Shared WebGL/Canvas count for incidental aircraft physically crossing the phone hero corridor. */
export function skyDancerArcadeV4011ForegroundCraftCount(
  entities: readonly SkyDancerArcadeV4011ForegroundEntity[],
  centerX: number,
  centerY: number,
): number {
  return entities.reduce((count, entity) => {
    if (entity.boss || entity.rivalAce || entity.worldBreakTarget) return count;
    if (entity.depth <= 1.5 || entity.depth >= 22) return count;
    const laneDistance = Math.hypot((entity.x - centerX) / 1.72, (entity.y - centerY) / 1.12);
    return count + (laneDistance < 1 ? 1 : 0);
  }, 0);
}

/**
 * V40.11 is a presentation stress governor, not a difficulty governor.
 * V40.10 remains authoritative for single-source clutter. This layer only adds suppression when
 * two or more independent signals overlap (close craft, incoming missiles, impact burst, authored focus).
 */
export function skyDancerArcadeV4011ScreenStress(input: SkyDancerArcadeV4011Input): SkyDancerArcadeV4011Profile {
  const base = (): SkyDancerArcadeV4011Profile => ({
    band: "clear",
    pressure: 0,
    signalCount: 0,
    occlusion: input.baseOcclusion,
    clarity: input.baseClarity,
    fxClarity: input.baseOcclusion.fxClarity,
    speedStreakAlpha: 1,
  });

  if (!input.compactLandscape || input.sceneMode === "handoff" || input.sceneMode === "finale") return base();

  const incoming = Math.max(0, Math.floor(input.incomingThreats));
  const foreground = Math.max(0, Math.floor(input.foregroundCraft));
  const impacts = Math.max(0, Math.floor(input.impactCount));
  const destroyed = Math.max(0, Math.floor(input.destroyedImpacts));
  const importantScene = input.sceneMode === "signature" || input.sceneMode === "rival" || input.sceneMode === "boss";
  const signalCount = Number(incoming >= 2)
    + Number(foreground >= 2)
    + Number(impacts >= 2 || destroyed >= 1)
    + Number(importantScene)
    + Number(input.worldBreakLive);

  // A lone cause is already handled by V40.9/V40.10. Avoid flattening normal spectacle.
  if (signalCount < 2) return { ...base(), signalCount };

  const threatLoad = clamp01((incoming - 1) / 4);
  const foregroundLoad = clamp01(foreground / 4);
  const impactLoad = clamp01((impacts + destroyed * 1.5) / 5);
  const authoredLoad = input.sceneMode === "boss" ? .27 : input.sceneMode === "rival" ? .21 : input.sceneMode === "signature" ? .15 : 0;
  const worldBreakLoad = input.worldBreakLive ? .1 : 0;
  const overlap = clamp01((signalCount - 1) / 4);
  const pressure = clamp01(
    threatLoad * .28
      + foregroundLoad * .25
      + impactLoad * .23
      + authoredLoad
      + worldBreakLoad
      + overlap * .12,
  );
  const critical = pressure >= .68;
  const busy = pressure >= .34;

  const baseFx = input.baseOcclusion.fxClarity;
  const fxClarity: SkyDancerArcadeV4010FxClarity = {
    smokeAlpha: clamp(baseFx.smokeAlpha * (1 - pressure * .3), .45, 1),
    sparkAlpha: clamp(baseFx.sparkAlpha * (1 - pressure * .09), .78, 1),
    missileSmokeAlpha: clamp(baseFx.missileSmokeAlpha * (1 - pressure * .2), .5, 1),
    // The readable ring/flash core survives even at maximum stress.
    detonationAlpha: clamp(baseFx.detonationAlpha * (1 - pressure * .08), .78, 1),
    debrisScale: clamp(baseFx.debrisScale * (1 - pressure * .12), .72, 1),
  };

  const occlusion: SkyDancerArcadeV4010Profile = {
    ...input.baseOcclusion,
    incidentalScaleFloor: clamp(input.baseOcclusion.incidentalScaleFloor - pressure * .08, .56, 1),
    incidentalAlphaFloor: clamp(input.baseOcclusion.incidentalAlphaFloor - pressure * .1, .6, 1),
    fxClarity,
  };

  const primaryCap = critical ? 1 : busy ? 2 : input.baseClarity.primaryLocks;
  const canvasCap = critical ? 1 : busy ? 2 : input.baseClarity.canvasLockLimit;
  const clarity: SkyDancerArcadeV409PhoneClarity = {
    ...input.baseClarity,
    primaryLocks: Math.max(1, Math.min(input.baseClarity.primaryLocks, primaryCap)),
    // Optional aim decoration yields first. Threat projectiles and protected targets are not removed.
    aimCues: busy ? 0 : input.baseClarity.aimCues,
    counterplayCues: Math.min(input.baseClarity.counterplayCues, 1),
    secondaryLockScale: input.baseClarity.secondaryLockScale * (1 - pressure * .14),
    cueOpacity: input.baseClarity.cueOpacity * (1 - pressure * .1),
    canvasLockLimit: Math.max(1, Math.min(input.baseClarity.canvasLockLimit, canvasCap)),
  };

  return {
    band: critical ? "critical" : busy ? "busy" : "clear",
    pressure,
    signalCount,
    occlusion,
    clarity,
    fxClarity,
    speedStreakAlpha: clamp(1 - pressure * .4, .58, 1),
  };
}
'''
Path("src/sky/arcade/SkyDancerArcadeV4011ScreenStress.ts").write_text(helper)

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(
    webgl,
    '''import {\n  SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,\n  skyDancerArcadeV4010DynamicOcclusion,\n  skyDancerArcadeV4010EntityOcclusion,\n} from "./SkyDancerArcadeV4010DynamicOcclusion";\n''',
    '''import {\n  SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,\n  skyDancerArcadeV4010DynamicOcclusion,\n  skyDancerArcadeV4010EntityOcclusion,\n} from "./SkyDancerArcadeV4010DynamicOcclusion";\nimport {\n  skyDancerArcadeV4011ForegroundCraftCount,\n  skyDancerArcadeV4011ScreenStress,\n} from "./SkyDancerArcadeV4011ScreenStress";\n''',
)
replace_once(
    webgl,
    '''  private v4010FxClarity = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY;\n''',
    '''  private v4010FxClarity = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY;\n  private v4011SpeedStreakAlpha = 1;\n''',
)
replace_once(
    webgl,
    '''    this.presentation.update(snapshot, delta, this.camera, this.presentationFx, this.v4010FxClarity);\n''',
    '''    this.presentation.update(snapshot, delta, this.camera, this.presentationFx, this.v4010FxClarity, this.v4011SpeedStreakAlpha);\n''',
)
replace_once(
    webgl,
    '''    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({\n      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n    });\n    this.v4010FxClarity = v4010Profile.fxClarity;\n''',
    '''    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({\n      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n    });\n    const v4011ForegroundCraft = skyDancerArcadeV4011ForegroundCraftCount(snapshot.enemies, snapshot.playerX, snapshot.playerY);\n    const v4011Stress = skyDancerArcadeV4011ScreenStress({\n      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n      foregroundCraft: v4011ForegroundCraft, impactCount: snapshot.impacts.length,\n      destroyedImpacts: snapshot.impacts.filter((impact) => impact.destroyed).length,\n      worldBreakLive: snapshot.worldBreakLive, baseOcclusion: v4010Profile, baseClarity: v409Clarity,\n    });\n    const v4011Clarity = v4011Stress.clarity;\n    const v4011OcclusionProfile = v4011Stress.occlusion;\n    this.v4010FxClarity = v4011Stress.fxClarity;\n    this.v4011SpeedStreakAlpha = v4011Stress.speedStreakAlpha;\n''',
)
for old, new in [
    ("v409Clarity.primaryLocks", "v4011Clarity.primaryLocks"),
    ("v409Clarity.aimCues", "v4011Clarity.aimCues"),
    ("v409Clarity.counterplayCues", "v4011Clarity.counterplayCues"),
    ("v409Clarity.secondaryLockScale", "v4011Clarity.secondaryLockScale"),
    ("v409Clarity.cueOpacity", "v4011Clarity.cueOpacity"),
]:
    text = Path(webgl).read_text()
    if old not in text:
        raise SystemExit(f"missing V40.11 WebGL clarity anchor: {old}")
    Path(webgl).write_text(text.replace(old, new))
replace_once(webgl, "          profile: v4010Profile,\n", "          profile: v4011OcclusionProfile,\n")

canvas = "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"
replace_once(
    canvas,
    '''import { skyDancerArcadeV4010DynamicOcclusion, skyDancerArcadeV4010EntityOcclusion } from "./SkyDancerArcadeV4010DynamicOcclusion";\n''',
    '''import { skyDancerArcadeV4010DynamicOcclusion, skyDancerArcadeV4010EntityOcclusion } from "./SkyDancerArcadeV4010DynamicOcclusion";\nimport { skyDancerArcadeV4011ForegroundCraftCount, skyDancerArcadeV4011ScreenStress } from "./SkyDancerArcadeV4011ScreenStress";\n''',
)
replace_once(
    canvas,
    '''    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({\n      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,\n      sceneMode: v409Focus.mode,\n      incomingThreats: v409IncomingThreats,\n    });\n''',
    '''    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({\n      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,\n      sceneMode: v409Focus.mode,\n      incomingThreats: v409IncomingThreats,\n    });\n    const v4011ForegroundCraft = skyDancerArcadeV4011ForegroundCraftCount(snapshot.enemies, snapshot.playerX, snapshot.playerY);\n    const v4011Stress = skyDancerArcadeV4011ScreenStress({\n      compactLandscape: cssWidth > cssHeight && cssHeight <= 560, sceneMode: v409Focus.mode,\n      incomingThreats: v409IncomingThreats, foregroundCraft: v4011ForegroundCraft,\n      impactCount: snapshot.impacts.length, destroyedImpacts: snapshot.impacts.filter((impact) => impact.destroyed).length,\n      worldBreakLive: snapshot.worldBreakLive, baseOcclusion: v4010Profile, baseClarity: v409Clarity,\n    });\n    const v4011Clarity = v4011Stress.clarity;\n    const v4011OcclusionProfile = v4011Stress.occlusion;\n''',
)
replace_once(canvas, ".slice(0, v409Clarity.canvasLockLimit)\n", ".slice(0, v4011Clarity.canvasLockLimit)\n")
replace_once(canvas, "        profile: v4010Profile,\n", "        profile: v4011OcclusionProfile,\n")

presentation = "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"
replace_once(
    presentation,
    '''    clarity: SkyDancerArcadeV4010FxClarity = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,\n  ): void {\n''',
    '''    clarity: SkyDancerArcadeV4010FxClarity = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,\n    speedStreakAlpha = 1,\n  ): void {\n''',
)
replace_once(
    presentation,
    '''    this.updateSpeedStreaks(snapshot, delta, fx);\n''',
    '''    this.updateSpeedStreaks(snapshot, delta, fx, speedStreakAlpha);\n''',
)
replace_once(
    presentation,
    '''  private updateSpeedStreaks(snapshot: SkyDancerArcadeSnapshot, delta: number, fx?: SkyDancerArcadePresentationFrame): void {\n''',
    '''  private updateSpeedStreaks(snapshot: SkyDancerArcadeSnapshot, delta: number, fx?: SkyDancerArcadePresentationFrame, stressAlpha = 1): void {\n''',
)
replace_once(
    presentation,
    '''    const targetOpacity = Math.min(.76, (snapshot.turboActive ? .52 : .075) + impactBoost * .24 + rush * .16 + this.bossArrival * .09);\n''',
    '''    const targetOpacity = Math.min(.76, ((snapshot.turboActive ? .52 : .075) + impactBoost * .24 + rush * .16 + this.bossArrival * .09) * THREE.MathUtils.clamp(stressAlpha, .58, 1));\n''',
)

test_file = r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skyDancerArcadeV409PhoneClarity } from "../src/sky/arcade/SkyDancerArcadeV409PhoneClarity";
import {
  skyDancerArcadeV4010DynamicOcclusion,
  skyDancerArcadeV4010EntityOcclusion,
} from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";
import {
  skyDancerArcadeV4011ForegroundCraftCount,
  skyDancerArcadeV4011ScreenStress,
} from "../src/sky/arcade/SkyDancerArcadeV4011ScreenStress";

function profile(overrides: Partial<Parameters<typeof skyDancerArcadeV4011ScreenStress>[0]> = {}) {
  const compactLandscape = overrides.compactLandscape ?? true;
  const sceneMode = overrides.sceneMode ?? "flight";
  const incomingThreats = overrides.incomingThreats ?? 0;
  const baseOcclusion = overrides.baseOcclusion ?? skyDancerArcadeV4010DynamicOcclusion({ compactLandscape, sceneMode, incomingThreats });
  const baseClarity = overrides.baseClarity ?? skyDancerArcadeV409PhoneClarity({ compactLandscape, sceneMode, incomingThreats });
  return skyDancerArcadeV4011ScreenStress({
    compactLandscape, sceneMode, incomingThreats,
    foregroundCraft: 0, impactCount: 0, destroyedImpacts: 0, worldBreakLive: false,
    baseOcclusion, baseClarity, ...overrides,
  });
}

test("V40.11 leaves large displays and single-source spectacle on the V40.10 path", () => {
  const large = profile({ compactLandscape: false, sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  assert.equal(large.pressure, 0);
  assert.equal(large.speedStreakAlpha, 1);

  const single = profile({ sceneMode: "flight", incomingThreats: 5 });
  assert.equal(single.pressure, 0, "V40.10 already owns one isolated source of clutter");
  assert.equal(single.band, "clear");
});

test("V40.11 shared foreground counter ignores protected targets and side-lane craft", () => {
  const count = skyDancerArcadeV4011ForegroundCraftCount([
    { x: .1, y: .05, depth: 8 },
    { x: -.2, y: .1, depth: 12 },
    { x: 0, y: 0, depth: 7, boss: true },
    { x: .15, y: 0, depth: 9, rivalAce: true },
    { x: 2.3, y: 1.2, depth: 8 },
    { x: 0, y: 0, depth: 28 },
  ], 0, 0);
  assert.equal(count, 2);
});

test("V40.11 escalates only when independent clutter signals overlap", () => {
  const busy = profile({ sceneMode: "signature", incomingThreats: 3, foregroundCraft: 2, impactCount: 1, worldBreakLive: true });
  const critical = profile({ sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  assert.ok(busy.pressure >= .34 && busy.pressure < critical.pressure);
  assert.equal(busy.band, "busy");
  assert.equal(critical.band, "critical");
  assert.ok(critical.pressure >= .8);
});

test("V40.11 worst-case stress clears smoke and speed lines before impact identity", () => {
  const critical = profile({ sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  assert.ok(critical.fxClarity.smokeAlpha <= .46);
  assert.ok(critical.fxClarity.sparkAlpha >= .78);
  assert.ok(critical.fxClarity.detonationAlpha >= .78);
  assert.ok(critical.fxClarity.detonationAlpha > critical.fxClarity.smokeAlpha);
  assert.ok(critical.speedStreakAlpha >= .58 && critical.speedStreakAlpha < .7);
  assert.equal(critical.clarity.primaryLocks, 1);
  assert.equal(critical.clarity.aimCues, 0);
  assert.ok(critical.clarity.counterplayCues >= 0 && critical.clarity.counterplayCues <= 1);
});

test("V40.11 never thins the protected boss/rival/World Break target contract", () => {
  const critical = profile({ sceneMode: "boss", incomingThreats: 6, foregroundCraft: 5, impactCount: 6, destroyedImpacts: 3, worldBreakLive: true });
  const protectedTarget = skyDancerArcadeV4010EntityOcclusion({
    profile: critical.occlusion, protectedTarget: true,
    entityX: 0, entityY: 0, entityDepth: 4, centerX: 0, centerY: 0,
    focusX: 0, focusY: 0, focusDepth: 24, hasFocusTarget: true,
  });
  assert.deepEqual(protectedTarget, { scale: 1, alpha: 1, pressure: 0 });
});

test("V40.11 wiring is presentation-only and shared by WebGL, Canvas and pooled FX", () => {
  const helper = readFileSync("src/sky/arcade/SkyDancerArcadeV4011ScreenStress.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  const presentation = readFileSync("src/sky/arcade/SkyDancerArcadeProductPresentation.ts", "utf8");
  assert.doesNotMatch(helper, /SkyDancerArcadeRuntime/);
  assert.doesNotMatch(helper, /playerHp|damageTaken|addScore|courseSpeed/);
  assert.match(webgl, /skyDancerArcadeV4011ForegroundCraftCount/);
  assert.match(webgl, /snapshot\.impacts\.filter/);
  assert.match(webgl, /v4011Stress\.fxClarity/);
  assert.match(webgl, /v4011SpeedStreakAlpha/);
  assert.match(canvas, /skyDancerArcadeV4011ForegroundCraftCount/);
  assert.match(canvas, /v4011OcclusionProfile/);
  assert.match(presentation, /stressAlpha/);
  assert.match(presentation, /THREE\.MathUtils\.clamp\(stressAlpha, \.58, 1\)/);
});
'''
Path("tests/sky-arcade-v4011-screen-stress.test.ts").write_text(test_file)

print("Arcade Run V40.11 screen stress patch applied")
