from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1))


helper = r'''import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";

export interface SkyDancerArcadeV4010FxClarity {
  smokeAlpha: number;
  sparkAlpha: number;
  missileSmokeAlpha: number;
  detonationAlpha: number;
  debrisScale: number;
}

export interface SkyDancerArcadeV4010Profile {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incidentalScaleFloor: number;
  incidentalAlphaFloor: number;
  fxClarity: SkyDancerArcadeV4010FxClarity;
}

export interface SkyDancerArcadeV4010Input {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
}

export interface SkyDancerArcadeV4010EntityInput {
  profile: SkyDancerArcadeV4010Profile;
  protectedTarget: boolean;
  entityX: number;
  entityY: number;
  entityDepth: number;
  centerX: number;
  centerY: number;
  focusX: number;
  focusY: number;
  focusDepth: number;
  hasFocusTarget: boolean;
}

export interface SkyDancerArcadeV4010EntityOcclusion {
  scale: number;
  alpha: number;
  pressure: number;
}

export const SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY: SkyDancerArcadeV4010FxClarity = {
  smokeAlpha: 1,
  sparkAlpha: 1,
  missileSmokeAlpha: 1,
  detonationAlpha: 1,
  debrisScale: 1,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * V40.10 is presentation-only. It keeps authored impact energy, but suppresses the visual layers
 * most likely to cover a phone-sized target corridor: smoke first, then incidental foreground craft.
 */
export function skyDancerArcadeV4010DynamicOcclusion(input: SkyDancerArcadeV4010Input): SkyDancerArcadeV4010Profile {
  if (!input.compactLandscape) {
    return {
      compactLandscape: false,
      sceneMode: input.sceneMode,
      incidentalScaleFloor: 1,
      incidentalAlphaFloor: 1,
      fxClarity: SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,
    };
  }

  let incidentalScaleFloor = .9;
  let incidentalAlphaFloor = .88;
  let fxClarity: SkyDancerArcadeV4010FxClarity = {
    smokeAlpha: .92,
    sparkAlpha: .97,
    missileSmokeAlpha: .93,
    detonationAlpha: .97,
    debrisScale: .95,
  };

  switch (input.sceneMode) {
    case "signature":
      incidentalScaleFloor = .82;
      incidentalAlphaFloor = .8;
      fxClarity = { smokeAlpha: .74, sparkAlpha: .91, missileSmokeAlpha: .83, detonationAlpha: .92, debrisScale: .9 };
      break;
    case "rival":
      incidentalScaleFloor = .76;
      incidentalAlphaFloor = .74;
      fxClarity = { smokeAlpha: .68, sparkAlpha: .89, missileSmokeAlpha: .79, detonationAlpha: .9, debrisScale: .87 };
      break;
    case "boss":
      incidentalScaleFloor = .7;
      incidentalAlphaFloor = .7;
      fxClarity = { smokeAlpha: .62, sparkAlpha: .87, missileSmokeAlpha: .75, detonationAlpha: .88, debrisScale: .84 };
      break;
    case "handoff":
    case "finale":
      incidentalScaleFloor = .92;
      incidentalAlphaFloor = .9;
      fxClarity = { ...SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY };
      break;
    default:
      break;
  }

  const threatPressure = clamp01((Math.max(0, Math.floor(input.incomingThreats)) - 1) / 3);
  if (threatPressure > 0) {
    incidentalScaleFloor = Math.max(.64, incidentalScaleFloor - .06 * threatPressure);
    incidentalAlphaFloor = Math.max(.66, incidentalAlphaFloor - .06 * threatPressure);
    fxClarity = {
      smokeAlpha: Math.max(.5, fxClarity.smokeAlpha * (1 - .18 * threatPressure)),
      sparkAlpha: Math.max(.8, fxClarity.sparkAlpha * (1 - .07 * threatPressure)),
      missileSmokeAlpha: Math.max(.62, fxClarity.missileSmokeAlpha * (1 - .12 * threatPressure)),
      detonationAlpha: Math.max(.82, fxClarity.detonationAlpha * (1 - .05 * threatPressure)),
      debrisScale: Math.max(.78, fxClarity.debrisScale * (1 - .08 * threatPressure)),
    };
  }

  return { compactLandscape: true, sceneMode: input.sceneMode, incidentalScaleFloor, incidentalAlphaFloor, fxClarity };
}

/**
 * Only an incidental craft that is both close and crossing the protected sightline is reduced.
 * Priority targets and primary lock cues always stay at full presence.
 */
export function skyDancerArcadeV4010EntityOcclusion(input: SkyDancerArcadeV4010EntityInput): SkyDancerArcadeV4010EntityOcclusion {
  if (!input.profile.compactLandscape || input.protectedTarget) return { scale: 1, alpha: 1, pressure: 0 };

  const playerLane = 1 - clamp01(Math.hypot(
    (input.entityX - input.centerX) / 1.55,
    (input.entityY - input.centerY) / 1.05,
  ));
  const foreground = clamp01((34 - input.entityDepth) / 30);
  let focusPressure = 0;

  if (input.hasFocusTarget) {
    const focusLane = 1 - clamp01(Math.hypot(
      (input.entityX - input.focusX) / 1.4,
      (input.entityY - input.focusY) / 1.0,
    ));
    const inFrontOfFocus = clamp01((input.focusDepth - input.entityDepth + 4) / 18);
    focusPressure = focusLane * inFrontOfFocus;
  }

  const pressure = clamp01(Math.max(playerLane * foreground * .78, focusPressure));
  return {
    scale: clamp(1 - (1 - input.profile.incidentalScaleFloor) * pressure, input.profile.incidentalScaleFloor, 1),
    alpha: clamp(1 - (1 - input.profile.incidentalAlphaFloor) * pressure, input.profile.incidentalAlphaFloor, 1),
    pressure,
  };
}
'''
Path("src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion.ts").write_text(helper)


test = r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,
  skyDancerArcadeV4010DynamicOcclusion,
  skyDancerArcadeV4010EntityOcclusion,
} from "../src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion";

test("V40.10 leaves large displays on the full-strength presentation path", () => {
  const profile = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: false, sceneMode: "boss", incomingThreats: 6 });
  assert.equal(profile.incidentalScaleFloor, 1);
  assert.deepEqual(profile.fxClarity, SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY);
});

test("V40.10 removes smoke before impact identity as phone scenes become more important", () => {
  const signature = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "signature", incomingThreats: 0 });
  const rival = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "rival", incomingThreats: 0 });
  const boss = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "boss", incomingThreats: 0 });
  assert.ok(signature.fxClarity.smokeAlpha > rival.fxClarity.smokeAlpha);
  assert.ok(rival.fxClarity.smokeAlpha > boss.fxClarity.smokeAlpha);
  assert.ok(boss.fxClarity.detonationAlpha >= .82, "impact ring/flash identity must survive");
  assert.ok(boss.fxClarity.sparkAlpha > boss.fxClarity.smokeAlpha, "smoke should yield before sparks");
});

test("V40.10 incoming missiles increase clarity pressure without deleting impact feedback", () => {
  const calm = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "flight", incomingThreats: 0 });
  const danger = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "flight", incomingThreats: 5 });
  assert.ok(danger.fxClarity.smokeAlpha < calm.fxClarity.smokeAlpha);
  assert.ok(danger.incidentalScaleFloor < calm.incidentalScaleFloor);
  assert.ok(danger.fxClarity.detonationAlpha >= .82);
});

test("V40.10 only thins incidental foreground craft that cross the protected sightline", () => {
  const profile = skyDancerArcadeV4010DynamicOcclusion({ compactLandscape: true, sceneMode: "boss", incomingThreats: 2 });
  const occluder = skyDancerArcadeV4010EntityOcclusion({
    profile, protectedTarget: false, entityX: .08, entityY: .04, entityDepth: 8,
    centerX: 0, centerY: 0, focusX: .05, focusY: .02, focusDepth: 24, hasFocusTarget: true,
  });
  const sideCraft = skyDancerArcadeV4010EntityOcclusion({
    profile, protectedTarget: false, entityX: 2.1, entityY: 1.2, entityDepth: 8,
    centerX: 0, centerY: 0, focusX: .05, focusY: .02, focusDepth: 24, hasFocusTarget: true,
  });
  const protectedCraft = skyDancerArcadeV4010EntityOcclusion({
    profile, protectedTarget: true, entityX: 0, entityY: 0, entityDepth: 5,
    centerX: 0, centerY: 0, focusX: 0, focusY: 0, focusDepth: 24, hasFocusTarget: true,
  });
  assert.ok(occluder.scale < .82);
  assert.ok(occluder.alpha < .82);
  assert.ok(sideCraft.scale > .96);
  assert.deepEqual(protectedCraft, { scale: 1, alpha: 1, pressure: 0 });
});

test("V40.10 wiring stays presentation-only across WebGL, Canvas and pooled FX", () => {
  const helper = readFileSync("src/sky/arcade/SkyDancerArcadeV4010DynamicOcclusion.ts", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const canvas = readFileSync("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts", "utf8");
  const presentation = readFileSync("src/sky/arcade/SkyDancerArcadeProductPresentation.ts", "utf8");
  assert.doesNotMatch(helper, /SkyDancerArcadeRuntime/);
  assert.match(webgl, /v4010Occlusion\.scale/);
  assert.match(webgl, /v4010Profile\.fxClarity/);
  assert.match(canvas, /v4010Occlusion\.alpha/);
  assert.match(presentation, /setClarityAlpha/);
  assert.match(presentation, /clarity\.smokeAlpha/);
  assert.match(presentation, /clarity\.detonationAlpha/);
});
'''
Path("tests/sky-arcade-v4010-dynamic-occlusion.test.ts").write_text(test)


# Product presentation: attenuate existing pooled pixels; never allocate extra geometry per frame.
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    'import type { SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";\n',
    'import type { SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";\nimport { SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY, type SkyDancerArcadeV4010FxClarity } from "./SkyDancerArcadeV4010DynamicOcclusion";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  private cursor = 0;\n  private serial = 0;\n\n  constructor(count: number, private readonly smoke: boolean) {',
    '  private cursor = 0;\n  private serial = 0;\n  private clarityAlpha = 1;\n\n  constructor(count: number, private readonly smoke: boolean) {',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  emit(position: THREE.Vector3, scale: number): void {\n',
    '  setClarityAlpha(value: number): void { this.clarityAlpha = THREE.MathUtils.clamp(value, .45, 1); }\n\n  emit(position: THREE.Vector3, scale: number): void {\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '        this.alpha.setX(i, (1 - t) * (this.smoke ? .46 : 1));',
    '        this.alpha.setX(i, (1 - t) * (this.smoke ? .46 : 1) * this.clarityAlpha);',
)

# Missile smoke pool has the same cursor/serial shape; patch the second occurrence by anchoring the class.
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    'class MissileSmokePool {\n  readonly mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;\n  private readonly particles: Particle[];\n  private readonly alpha: THREE.InstancedBufferAttribute;\n  private readonly dummy = new THREE.Object3D();\n  private cursor = 0;\n  private serial = 0;\n',
    'class MissileSmokePool {\n  readonly mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;\n  private readonly particles: Particle[];\n  private readonly alpha: THREE.InstancedBufferAttribute;\n  private readonly dummy = new THREE.Object3D();\n  private cursor = 0;\n  private serial = 0;\n  private clarityAlpha = 1;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  emit(position: THREE.Vector3, scale = 1): void {\n    // Two overlapping puffs make the exhaust read as dense white missile smoke even on a phone-sized viewport.\n',
    '  setClarityAlpha(value: number): void { this.clarityAlpha = THREE.MathUtils.clamp(value, .5, 1); }\n\n  emit(position: THREE.Vector3, scale = 1): void {\n    // Two overlapping puffs make the exhaust read as dense white missile smoke even on a phone-sized viewport.\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '        this.alpha.setX(i, Math.pow(1 - t, .82));',
    '        this.alpha.setX(i, Math.pow(1 - t, .82) * this.clarityAlpha);',
)

replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  private readonly dummy = new THREE.Object3D();\n  private cursor = 0;\n\n  constructor(count: number) {\n    const ringGeometry = new THREE.RingGeometry(.58, .78, 36);',
    '  private readonly dummy = new THREE.Object3D();\n  private cursor = 0;\n  private clarityAlpha = 1;\n\n  constructor(count: number) {\n    const ringGeometry = new THREE.RingGeometry(.58, .78, 36);',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  emit(position: THREE.Vector3, size: number, delay = 0, duration = .34, heat = .72): void {\n',
    '  setClarityAlpha(value: number): void { this.clarityAlpha = THREE.MathUtils.clamp(value, .55, 1); }\n\n  emit(position: THREE.Vector3, size: number, delay = 0, duration = .34, heat = .72): void {\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '      this.ringAlpha.setX(i, Math.pow(1 - t, .78) * .82);',
    '      this.ringAlpha.setX(i, Math.pow(1 - t, .78) * .82 * this.clarityAlpha);',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '      this.flashAlpha.setX(i, Math.pow(1 - t, 2.25) * .88);',
    '      this.flashAlpha.setX(i, Math.pow(1 - t, 2.25) * .88 * this.clarityAlpha);',
)

replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  private readonly color = new THREE.Color();\n  private cursor = 0;\n  private serial = 0;\n',
    '  private readonly color = new THREE.Color();\n  private cursor = 0;\n  private serial = 0;\n  private clarityScale = 1;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  emit(position: THREE.Vector3, scale: number, requestedCount: number, forwardKick = .7): void {\n',
    '  setClarityScale(value: number): void { this.clarityScale = THREE.MathUtils.clamp(value, .72, 1); }\n\n  emit(position: THREE.Vector3, scale: number, requestedCount: number, forwardKick = .7): void {\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '        const lifeScale = p.size * (.92 - t * .36);',
    '        const lifeScale = p.size * (.92 - t * .36) * this.clarityScale;',
)

replace_once(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  update(snapshot: SkyDancerArcadeSnapshot, delta: number, camera: THREE.Camera, fx?: SkyDancerArcadePresentationFrame): void {\n    this.rushAccent = Math.max(0, this.rushAccent - delta * 4.2);',
    '  update(\n    snapshot: SkyDancerArcadeSnapshot,\n    delta: number,\n    camera: THREE.Camera,\n    fx: SkyDancerArcadePresentationFrame | undefined = undefined,\n    clarity: SkyDancerArcadeV4010FxClarity = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,\n  ): void {\n    this.smoke.setClarityAlpha(clarity.smokeAlpha);\n    this.sparks.setClarityAlpha(clarity.sparkAlpha);\n    this.missileSmoke.setClarityAlpha(clarity.missileSmokeAlpha);\n    this.detonation.setClarityAlpha(clarity.detonationAlpha);\n    this.debris.setClarityScale(clarity.debrisScale);\n    this.rushAccent = Math.max(0, this.rushAccent - delta * 4.2);',
)

# WebGL: keep primary actors full-size, thin only incidental foreground craft, and feed the FX clarity profile.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    'import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";\n',
    'import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";\nimport {\n  SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY,\n  skyDancerArcadeV4010DynamicOcclusion,\n  skyDancerArcadeV4010EntityOcclusion,\n} from "./SkyDancerArcadeV4010DynamicOcclusion";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '  private presentationFx: SkyDancerArcadePresentationFrame = { rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0, fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0 };\n',
    '  private presentationFx: SkyDancerArcadePresentationFrame = { rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0, fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0 };\n  private v4010FxClarity = SKY_DANCER_ARCADE_V4010_DEFAULT_FX_CLARITY;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    const v409Clarity = skyDancerArcadeV409PhoneClarity({\n      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n    });\n',
    '    const v409Clarity = skyDancerArcadeV409PhoneClarity({\n      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n    });\n    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({\n      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n    });\n    this.v4010FxClarity = v4010Profile.fxClarity;\n    const v4010PriorityTarget = v409Focus.mode === "boss"\n      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null\n      : v409Focus.mode === "rival"\n        ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null\n        : v409Focus.mode === "signature"\n          ? snapshot.enemies.find((enemy) => enemy.worldBreakTarget) ?? null\n          : null;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '        const impactPulse = 1 + (reaction?.flash ?? 0) * .045;\n        group.scale.setScalar(baseScale * maneuverPresence * closePresenceV27 * impactPulse);',
    '        const impactPulse = 1 + (reaction?.flash ?? 0) * .045;\n        const v4010Occlusion = skyDancerArcadeV4010EntityOcclusion({\n          profile: v4010Profile,\n          protectedTarget: Boolean(enemy.rivalAce || enemy.worldBreakTarget || primaryLockIdsV271.has(enemy.id)),\n          entityX: enemy.x, entityY: enemy.y, entityDepth: enemy.depth,\n          centerX: snapshot.playerX, centerY: snapshot.playerY,\n          focusX: v4010PriorityTarget?.x ?? snapshot.playerX,\n          focusY: v4010PriorityTarget?.y ?? snapshot.playerY,\n          focusDepth: v4010PriorityTarget?.depth ?? 18,\n          hasFocusTarget: Boolean(v4010PriorityTarget),\n        });\n        group.scale.setScalar(baseScale * maneuverPresence * closePresenceV27 * impactPulse * v4010Occlusion.scale);',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.presentation.update(snapshot, delta, this.camera, this.presentationFx);',
    '    this.presentation.update(snapshot, delta, this.camera, this.presentationFx, this.v4010FxClarity);',
)

# Canvas parity: same protected actors, same sightline model, no gameplay changes.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    'import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";\n',
    'import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";\nimport { skyDancerArcadeV4010DynamicOcclusion, skyDancerArcadeV4010EntityOcclusion } from "./SkyDancerArcadeV4010DynamicOcclusion";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '    const v409Clarity = skyDancerArcadeV409PhoneClarity({\n      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,\n      sceneMode: v409Focus.mode,\n      incomingThreats: snapshot.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30).length,\n    });\n',
    '    const v409IncomingThreats = snapshot.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30).length;\n    const v409Clarity = skyDancerArcadeV409PhoneClarity({\n      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,\n      sceneMode: v409Focus.mode,\n      incomingThreats: v409IncomingThreats,\n    });\n    const v4010Profile = skyDancerArcadeV4010DynamicOcclusion({\n      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,\n      sceneMode: v409Focus.mode,\n      incomingThreats: v409IncomingThreats,\n    });\n    const v4010PriorityTarget = v409Focus.mode === "boss"\n      ? snapshot.enemies.find((enemy) => enemy.boss) ?? null\n      : v409Focus.mode === "rival"\n        ? snapshot.enemies.find((enemy) => enemy.rivalAce) ?? null\n        : v409Focus.mode === "signature"\n          ? snapshot.enemies.find((enemy) => enemy.worldBreakTarget) ?? null\n          : null;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '      const readabilityScale = skyDancerArcadeEnemyVisualScaleV17(enemy.kind);\n      const size = projected.scale * (enemy.boss ? 28 : enemy.kind === "gunship" ? 18 : enemy.kind === "bomber" ? 16 : enemy.kind === "drone" ? 9.5 : 11) * readabilityScale;\n      context.save();\n      context.translate(projected.x, projected.y);',
    '      const readabilityScale = skyDancerArcadeEnemyVisualScaleV17(enemy.kind);\n      const v4010Occlusion = skyDancerArcadeV4010EntityOcclusion({\n        profile: v4010Profile,\n        protectedTarget: Boolean(enemy.boss || enemy.rivalAce || enemy.worldBreakTarget || v409PrimaryLockIds.has(enemy.id)),\n        entityX: enemy.x, entityY: enemy.y, entityDepth: enemy.depth,\n        centerX: snapshot.playerX, centerY: snapshot.playerY,\n        focusX: v4010PriorityTarget?.x ?? snapshot.playerX,\n        focusY: v4010PriorityTarget?.y ?? snapshot.playerY,\n        focusDepth: v4010PriorityTarget?.depth ?? 18,\n        hasFocusTarget: Boolean(v4010PriorityTarget),\n      });\n      const size = projected.scale * (enemy.boss ? 28 : enemy.kind === "gunship" ? 18 : enemy.kind === "bomber" ? 16 : enemy.kind === "drone" ? 9.5 : 11) * readabilityScale * v4010Occlusion.scale;\n      context.save();\n      context.translate(projected.x, projected.y);\n      context.globalAlpha = v4010Occlusion.alpha;',
)

print("Arcade Run V40.10 dynamic occlusion patch applied")
