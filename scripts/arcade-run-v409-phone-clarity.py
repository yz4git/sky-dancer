from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, content: str) -> None:
    p = Path(path)
    text = p.read_text()
    if marker in text:
        return
    p.write_text(text.rstrip() + "\n\n" + content.strip() + "\n")


module = r'''import type { SkyDancerArcadeV408SceneMode } from "./SkyDancerArcadeV408CinematicFocus";

export interface SkyDancerArcadeV409PhoneClarityInput {
  compactLandscape: boolean;
  sceneMode: SkyDancerArcadeV408SceneMode;
  incomingThreats: number;
}

export interface SkyDancerArcadeV409PhoneClarity {
  primaryLocks: number;
  aimCues: number;
  counterplayCues: number;
  secondaryLockScale: number;
  cueOpacity: number;
  canvasLockLimit: number;
}

/**
 * V40.9 is presentation-only. Logical locks, missiles, hazards, collisions and enemy counts stay untouched;
 * this only chooses how many helper markers are allowed to compete for an iPhone landscape frame.
 */
export function skyDancerArcadeV409PhoneClarity(
  input: SkyDancerArcadeV409PhoneClarityInput,
): SkyDancerArcadeV409PhoneClarity {
  if (!input.compactLandscape) {
    return { primaryLocks: 6, aimCues: 3, counterplayCues: 3, secondaryLockScale: .68, cueOpacity: 1, canvasLockLimit: 8 };
  }

  let clarity: SkyDancerArcadeV409PhoneClarity;
  switch (input.sceneMode) {
    case "boss":
      clarity = { primaryLocks: 2, aimCues: 1, counterplayCues: 1, secondaryLockScale: .44, cueOpacity: .82, canvasLockLimit: 2 };
      break;
    case "rival":
      clarity = { primaryLocks: 3, aimCues: 1, counterplayCues: 1, secondaryLockScale: .46, cueOpacity: .86, canvasLockLimit: 3 };
      break;
    case "signature":
      clarity = { primaryLocks: 3, aimCues: 1, counterplayCues: 1, secondaryLockScale: .48, cueOpacity: .92, canvasLockLimit: 3 };
      break;
    case "handoff":
    case "finale":
      clarity = { primaryLocks: 1, aimCues: 0, counterplayCues: 0, secondaryLockScale: .4, cueOpacity: .72, canvasLockLimit: 1 };
      break;
    default:
      clarity = { primaryLocks: 4, aimCues: 2, counterplayCues: 2, secondaryLockScale: .52, cueOpacity: 1, canvasLockLimit: 4 };
      break;
  }

  const incoming = Math.max(0, Math.floor(input.incomingThreats));
  if (incoming < 2) return clarity;
  return {
    ...clarity,
    primaryLocks: Math.max(2, clarity.primaryLocks - (incoming >= 4 ? 1 : 0)),
    aimCues: incoming >= 3 ? 0 : Math.min(1, clarity.aimCues),
    counterplayCues: Math.min(1, clarity.counterplayCues),
    secondaryLockScale: clarity.secondaryLockScale * .9,
    cueOpacity: clarity.cueOpacity * .88,
    canvasLockLimit: Math.max(2, clarity.canvasLockLimit - (incoming >= 4 ? 1 : 0)),
  };
}
'''
Path("src/sky/arcade/SkyDancerArcadeV409PhoneClarity.ts").write_text(module)


test = r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { skyDancerArcadeV409PhoneClarity } from "../src/sky/arcade/SkyDancerArcadeV409PhoneClarity";

test("V40.9 leaves larger displays on the proven V27.1 cue budget", () => {
  const clarity = skyDancerArcadeV409PhoneClarity({ compactLandscape: false, sceneMode: "boss", incomingThreats: 6 });
  assert.deepEqual(clarity, { primaryLocks: 6, aimCues: 3, counterplayCues: 3, secondaryLockScale: .68, cueOpacity: 1, canvasLockLimit: 8 });
});

test("V40.9 progressively clears helper markers around signature, rival and boss play on phones", () => {
  const flight = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "flight", incomingThreats: 0 });
  const signature = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "signature", incomingThreats: 0 });
  const rival = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "rival", incomingThreats: 0 });
  const boss = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "boss", incomingThreats: 0 });
  assert.ok(flight.primaryLocks > signature.primaryLocks);
  assert.equal(signature.primaryLocks, rival.primaryLocks);
  assert.ok(boss.primaryLocks < rival.primaryLocks);
  assert.ok(boss.cueOpacity < signature.cueOpacity);
  assert.equal(boss.canvasLockLimit, 2);
});

test("V40.9 incoming missile pressure removes optional aim clutter before logical locks", () => {
  const calm = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "flight", incomingThreats: 0 });
  const pressure = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode: "flight", incomingThreats: 4 });
  assert.equal(pressure.aimCues, 0);
  assert.equal(pressure.counterplayCues, 1);
  assert.ok(pressure.primaryLocks >= 2);
  assert.ok(pressure.secondaryLockScale < calm.secondaryLockScale);
  assert.ok(pressure.cueOpacity < calm.cueOpacity);
});

test("V40.9 keeps handoff/finale quiet while preserving at least one primary cue contract", () => {
  for (const sceneMode of ["handoff", "finale"] as const) {
    const clarity = skyDancerArcadeV409PhoneClarity({ compactLandscape: true, sceneMode, incomingThreats: 0 });
    assert.equal(clarity.primaryLocks, 1);
    assert.equal(clarity.aimCues, 0);
    assert.equal(clarity.counterplayCues, 0);
    assert.equal(clarity.canvasLockLimit, 1);
  }
});

test("V40.9 is rendering-only and protects the phone control corridor in WebGL, Canvas and CSS", () => {
  const runtime = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  const webgl = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"), "utf8");
  const canvas = readFileSync(resolve("src/sky/arcade/SkyDancerArcadeCanvasDemo.ts"), "utf8");
  const css = readFileSync(resolve("app/SkyDancerArcadeMode.module.css"), "utf8");
  assert.doesNotMatch(runtime, /V409PhoneClarity/);
  assert.match(webgl, /skyDancerArcadeV409PhoneClarity/);
  assert.match(webgl, /v409Clarity\.primaryLocks/);
  assert.match(webgl, /v409Clarity\.secondaryLockScale/);
  assert.match(canvas, /v409PrimaryLockIds/);
  assert.match(canvas, /v409Clarity\.canvasLockLimit/);
  assert.match(css, /V40\.9 Phone Clarity Pass/);
  assert.match(css, /orientation:landscape/);
  assert.match(css, /\.bottomHud\{left:50%;right:auto/);
  assert.match(css, /\.combatReadout\{display:none/);
  assert.match(css, /\.stage\[data-v407-focus=\"critical\"\] \.chain/);
});
'''
Path("tests/sky-arcade-v409-phone-clarity.test.ts").write_text(test)


# WebGL: dynamically reduce only helper cue density on compact landscape screens.
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    'import { skyDancerArcadeV408SceneFocus, skyDancerArcadeV408TargetLookBias } from "./SkyDancerArcadeV408CinematicFocus";\n',
    'import { skyDancerArcadeV408SceneFocus, skyDancerArcadeV408TargetLookBias } from "./SkyDancerArcadeV408CinematicFocus";\n'
    'import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    const cueBudgetV271 = skyDancerArcadeV271CueBudget(compactLandscapeV271);\n'
    '    const cueScoreV271 = (enemy: SkyDancerArcadeSnapshot["enemies"][number]): number =>\n',
    '    const cueBudgetV271 = skyDancerArcadeV271CueBudget(compactLandscapeV271);\n'
    '    const v409Focus = skyDancerArcadeV408SceneFocus({\n'
    '      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,\n'
    '      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,\n'
    '    });\n'
    '    const v409IncomingThreats = snapshot.projectiles.filter((projectile) =>\n'
    '      projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30\n'
    '    ).length;\n'
    '    const v409Clarity = skyDancerArcadeV409PhoneClarity({\n'
    '      compactLandscape: compactLandscapeV271, sceneMode: v409Focus.mode, incomingThreats: v409IncomingThreats,\n'
    '    });\n'
    '    const cueScoreV271 = (enemy: SkyDancerArcadeSnapshot["enemies"][number]): number =>\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '.slice(0, cueBudgetV271.primaryLocks)\n',
    '.slice(0, Math.min(cueBudgetV271.primaryLocks, v409Clarity.primaryLocks))\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '.slice(0, cueBudgetV271.aimCues)\n',
    '.slice(0, Math.min(cueBudgetV271.aimCues, v409Clarity.aimCues))\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '.slice(0, cueBudgetV271.counterplayCues)\n',
    '.slice(0, Math.min(cueBudgetV271.counterplayCues, v409Clarity.counterplayCues))\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    'Math.max(18, Math.round(fullLockSizeV271 * cueBudgetV271.secondaryLockScale)),\n',
    'Math.max(18, Math.round(fullLockSizeV271 * Math.min(cueBudgetV271.secondaryLockScale, v409Clarity.secondaryLockScale))),\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      if (aimRing) {\n        aimRing.scale.setScalar(1);\n',
    '      if (aimRing) {\n'
    '        aimRing.traverse((object) => {\n'
    '          if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;\n'
    '          object.material.opacity = .34 * v409Clarity.cueOpacity;\n'
    '        });\n'
    '        aimRing.scale.setScalar(1);\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      if (counterplayRing) {\n        counterplayRing.scale.setScalar(1);\n',
    '      if (counterplayRing) {\n'
    '        counterplayRing.traverse((object) => {\n'
    '          if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;\n'
    '          object.material.opacity = .42 * v409Clarity.cueOpacity;\n'
    '        });\n'
    '        counterplayRing.scale.setScalar(1);\n',
)

# Canvas: preserve every logical lock but draw only the highest-priority lock boxes on compact landscape.
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    'import { skyDancerArcadeV408SceneFocus } from "./SkyDancerArcadeV408CinematicFocus";\n',
    'import { skyDancerArcadeV408SceneFocus } from "./SkyDancerArcadeV408CinematicFocus";\n'
    'import { skyDancerArcadeV409PhoneClarity } from "./SkyDancerArcadeV409PhoneClarity";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '    const cssWidth = width / ratio;\n    const cssHeight = height / ratio;\n    const gradient = context.createLinearGradient(0, 0, 0, cssHeight);\n',
    '    const cssWidth = width / ratio;\n'
    '    const cssHeight = height / ratio;\n'
    '    const v409Focus = skyDancerArcadeV408SceneFocus({\n'
    '      status: snapshot.status, stageProgress: snapshot.stageProgress, worldBreakLive: snapshot.worldBreakLive,\n'
    '      rivalAceActive: snapshot.rivalAceActive, bossActive: snapshot.bossActive, finalBossReactive: snapshot.finalBossReactive,\n'
    '    });\n'
    '    const v409Clarity = skyDancerArcadeV409PhoneClarity({\n'
    '      compactLandscape: cssWidth > cssHeight && cssHeight <= 560,\n'
    '      sceneMode: v409Focus.mode,\n'
    '      incomingThreats: snapshot.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30).length,\n'
    '    });\n'
    '    const v409PrimaryLockIds = new Set(snapshot.enemies\n'
    '      .filter((enemy) => enemy.locked)\n'
    '      .sort((a, b) => {\n'
    '        const priorityA = a.boss ? 3 : a.rivalAce ? 2 : a.worldBreakTarget ? 1 : 0;\n'
    '        const priorityB = b.boss ? 3 : b.rivalAce ? 2 : b.worldBreakTarget ? 1 : 0;\n'
    '        return priorityB - priorityA || a.depth - b.depth;\n'
    '      })\n'
    '      .slice(0, v409Clarity.canvasLockLimit)\n'
    '      .map((enemy) => enemy.id));\n'
    '    const gradient = context.createLinearGradient(0, 0, 0, cssHeight);\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeCanvasDemo.ts",
    '      if (enemy.locked) {\n',
    '      if (enemy.locked && v409PrimaryLockIds.has(enemy.id)) {\n',
)

css = r'''/* V40.9 Phone Clarity Pass: keep the iPhone control corridors visually empty while retaining core HP/TURBO data. */
@media (orientation:landscape) and (max-height:430px){
  .bottomHud{left:50%;right:auto;bottom:max(4px,env(safe-area-inset-bottom));width:clamp(190px,30vw,300px);transform:translateX(-50%);grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px}
  .combatReadout{display:none}.meterCard{min-width:0;max-width:none;padding:4px 6px;border-radius:6px}.meterCard:last-child{width:100%}.meterCard>div strong{font-size:10px}.meterCard>i{height:5px;margin-top:2px}.meterCard small{display:none}.meterCard span{font-size:5px;letter-spacing:.12em}
  .topHud{left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));top:max(4px,env(safe-area-inset-top));grid-template-columns:minmax(145px,1.2fr) minmax(90px,.58fr) minmax(78px,.48fr);gap:5px}.stageCard,.scoreCard,.timeCard{padding:4px 7px;border-radius:6px}.stageCard strong{font-size:13px}.stageCard span{display:none}.scoreCard strong,.timeCard strong{font-size:14px}.stageCard small,.scoreCard small,.timeCard small{font-size:5px}
  .message{top:18%;max-width:56vw;overflow:hidden;text-overflow:ellipsis;padding:4px 10px;font-size:11px}.chain{top:25%;font-size:24px}.stage[data-v407-focus="critical"] .chain{opacity:.12}.stage[data-v407-focus="critical"] .routeOverlay{opacity:.08}.stage[data-v407-focus="critical"] .timelineV407{opacity:.12}
  .stickZone{width:39%}.stickBase{left:max(18px,calc(env(safe-area-inset-left) + 13px))}.actions{right:max(12px,env(safe-area-inset-right));gap:6px}
  .bossHud{width:min(430px,50vw)}.rivalAceHud{width:min(380px,46vw)}
}
@media (orientation:landscape) and (max-width:700px) and (max-height:430px){
  .bottomHud{width:clamp(168px,28vw,205px)}.meterCard{padding:3px 5px}.meterCard>div strong{font-size:9px}
  .actions{right:max(8px,env(safe-area-inset-right));gap:4px}.fireButton{width:54px;height:54px}.lockButton{width:64px;height:64px}.turboButton{width:74px;height:74px}
  .topHud{grid-template-columns:minmax(128px,1.15fr) minmax(78px,.56fr) minmax(68px,.46fr)}.stageCard strong{font-size:12px}.scoreCard strong,.timeCard strong{font-size:13px}
}
'''
append_once("app/SkyDancerArcadeMode.module.css", "V40.9 Phone Clarity Pass", css)

print("Arcade Run V40.9 phone clarity patch applied")
