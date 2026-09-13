from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"missing patch target in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


helper = '''import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeV4012RhythmPhase } from "./SkyDancerArcadeV4012RunRhythm";

export interface SkyDancerArcadeV4019BossContrastInput {
  compactLandscape: boolean;
  stageBiome: SkyDancerArcadeStageDefinition["biome"];
  rhythmPhase: SkyDancerArcadeV4012RhythmPhase;
  weakpointOpen: boolean;
}

export interface SkyDancerArcadeV4019BossContrastProfile {
  pressure: number;
  bodyRimColor: number;
  bodyEmissiveIntensity: number;
  weakpointOpenColor: number;
  weakpointClosedColor: number;
  weakpointEmissiveIntensity: number;
  weakpointScaleGain: number;
  counterplayOpacityGain: number;
  counterplaySizeGain: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function phaseWeight(phase: SkyDancerArcadeV4012RhythmPhase): number {
  if (phase === "boss-rise") return 1;
  if (phase === "boss") return .82;
  return 0;
}

function biomeWeight(biome: SkyDancerArcadeStageDefinition["biome"]): number {
  switch (biome) {
    case "storm": return 1;
    case "citadel": return .98;
    case "volcano": return .94;
    case "night": return .82;
    case "ruins": return .78;
    case "ice": return .74;
    case "cloud": return .72;
    case "desert": return .66;
    case "canyon": return .62;
    case "orbit": return .6;
    case "city": return .56;
    default: return .62;
  }
}

function bodyRimColor(biome: SkyDancerArcadeStageDefinition["biome"]): number {
  if (biome === "volcano") return 0x8feeff;
  if (biome === "citadel") return 0xa8eaff;
  if (biome === "storm" || biome === "night") return 0x94d9ff;
  return 0xb7dcff;
}

function weakpointColors(biome: SkyDancerArcadeStageDefinition["biome"]): { open: number; closed: number } {
  if (biome === "volcano") return { open: 0x78f7ff, closed: 0x123842 };
  if (biome === "storm") return { open: 0xffd66b, closed: 0x493815 };
  if (biome === "citadel") return { open: 0xfff16b, closed: 0x493d16 };
  if (biome === "night") return { open: 0x79f2ff, closed: 0x123642 };
  return { open: 0xff315e, closed: 0x34121d };
}

export function skyDancerArcadeV4019BossContrast(
  input: SkyDancerArcadeV4019BossContrastInput,
): SkyDancerArcadeV4019BossContrastProfile {
  const colors = weakpointColors(input.stageBiome);
  const pressure = input.compactLandscape
    ? clamp01(phaseWeight(input.rhythmPhase) * biomeWeight(input.stageBiome))
    : 0;

  return {
    pressure,
    bodyRimColor: bodyRimColor(input.stageBiome),
    bodyEmissiveIntensity: pressure > 0 ? .045 + pressure * .18 : 0,
    weakpointOpenColor: colors.open,
    weakpointClosedColor: colors.closed,
    weakpointEmissiveIntensity: input.weakpointOpen ? 2.8 + pressure * 1.65 : .75 + pressure * .42,
    weakpointScaleGain: pressure * (input.weakpointOpen ? .08 : .025),
    counterplayOpacityGain: 1 + pressure * .38,
    counterplaySizeGain: 1 + pressure * .2,
  };
}
'''
Path("src/sky/arcade/SkyDancerArcadeV4019BossContrast.ts").write_text(helper)

replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    'import { skyDancerArcadeV4018EnvironmentFraming } from "./SkyDancerArcadeV4018EnvironmentFraming";\n',
    'import { skyDancerArcadeV4018EnvironmentFraming } from "./SkyDancerArcadeV4018EnvironmentFraming";\nimport { skyDancerArcadeV4019BossContrast } from "./SkyDancerArcadeV4019BossContrast";\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      const reaction = this.enemyHitReactions.get(enemy.id);\n',
    '      const reaction = this.enemyHitReactions.get(enemy.id);\n      const v4019BossContrast = enemy.boss ? skyDancerArcadeV4019BossContrast({\n        compactLandscape: compactLandscapeV271, stageBiome: snapshot.stage.biome,\n        rhythmPhase: v4012Rhythm.phase, weakpointOpen: enemy.weakpointOpen,\n      }) : null;\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '          object.material.opacity = .42 * v409Clarity.cueOpacity;\n',
    '          object.material.opacity = Math.min(.86, .42 * v409Clarity.cueOpacity * (v4019BossContrast?.counterplayOpacityGain ?? 1));\n',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '          skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "counterplay") * pulse,\n',
    '          skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "counterplay") * pulse * (v4019BossContrast?.counterplaySizeGain ?? 1),\n',
)

old_boss = '''      if (enemy.boss) {\n        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;\n        const baseScale = typeof group.userData.arcadeBaseScale === "number" ? group.userData.arcadeBaseScale : 1;\n        group.scale.setScalar(baseScale * (1 + (reaction?.flash ?? 0) * .035));\n        for (const weakPoint of group.getObjectsByProperty("name", "arcade-boss-weakpoint")) {\n          const openPulse = enemy.weakpointOpen ? .42 : 0;\n          weakPoint.scale.setScalar(.86 + Math.sin(snapshot.runTimeSeconds * (enemy.weakpointOpen ? 18 : 12) + enemy.id) * .12 + (1 - hpRatio) * .1 + openPulse);\n          weakPoint.rotation.y += delta * (enemy.weakpointOpen ? 4.2 : 1.8);\n          if (weakPoint instanceof THREE.Mesh && weakPoint.material instanceof THREE.MeshStandardMaterial) {\n            weakPoint.material.emissive.setHex(enemy.weakpointOpen ? 0xff315e : 0x34121d);\n            weakPoint.material.emissiveIntensity = enemy.weakpointOpen ? 2.8 : .75;\n          }\n        }\n'''
new_boss = '''      if (enemy.boss) {\n        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;\n        const baseScale = typeof group.userData.arcadeBaseScale === "number" ? group.userData.arcadeBaseScale : 1;\n        group.scale.setScalar(baseScale * (1 + (reaction?.flash ?? 0) * .035));\n        const bossContrast = v4019BossContrast!;\n        group.traverse((object) => {\n          if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial) || object.name === "arcade-boss-weakpoint") return;\n          const material = object.material;\n          if (material.userData.arcadeV4019BaseEmissive === undefined) {\n            material.userData.arcadeV4019BaseEmissive = material.emissive.getHex();\n            material.userData.arcadeV4019BaseEmissiveIntensity = material.emissiveIntensity;\n          }\n          const baseEmissive = Number(material.userData.arcadeV4019BaseEmissive);\n          const baseIntensity = Number(material.userData.arcadeV4019BaseEmissiveIntensity);\n          if (baseIntensity > .08) return;\n          if (bossContrast.bodyEmissiveIntensity > 0) {\n            material.emissive.setHex(bossContrast.bodyRimColor);\n            material.emissiveIntensity = bossContrast.bodyEmissiveIntensity;\n          } else {\n            material.emissive.setHex(baseEmissive);\n            material.emissiveIntensity = baseIntensity;\n          }\n        });\n        for (const weakPoint of group.getObjectsByProperty("name", "arcade-boss-weakpoint")) {\n          const openPulse = enemy.weakpointOpen ? .42 : 0;\n          weakPoint.scale.setScalar(.86 + Math.sin(snapshot.runTimeSeconds * (enemy.weakpointOpen ? 18 : 12) + enemy.id) * .12 + (1 - hpRatio) * .1 + openPulse + bossContrast.weakpointScaleGain);\n          weakPoint.rotation.y += delta * (enemy.weakpointOpen ? 4.2 : 1.8);\n          if (weakPoint instanceof THREE.Mesh && weakPoint.material instanceof THREE.MeshStandardMaterial) {\n            weakPoint.material.emissive.setHex(enemy.weakpointOpen ? bossContrast.weakpointOpenColor : bossContrast.weakpointClosedColor);\n            weakPoint.material.emissiveIntensity = bossContrast.weakpointEmissiveIntensity;\n          }\n        }\n'''
replace_once("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", old_boss, new_boss)

replace_once(
    "src/sky/arcade/SkyDancerArcadeReferenceAirframes.ts",
    '      const core=part(group,new THREE.IcosahedronGeometry(.95,1),signal,side*4.9,.0,-8.4);\n',
    '      const core=part(group,new THREE.IcosahedronGeometry(.95,1),signal.clone(),side*4.9,.0,-8.4);\n',
)

test = '''import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport test from "node:test";\nimport { skyDancerArcadeV4019BossContrast } from "../src/sky/arcade/SkyDancerArcadeV4019BossContrast";\n\ntest("V40.19 leaves desktop boss presentation at the authored baseline", () => {\n  const profile = skyDancerArcadeV4019BossContrast({ compactLandscape: false, stageBiome: "storm", rhythmPhase: "boss-rise", weakpointOpen: true });\n  assert.equal(profile.pressure, 0);\n  assert.equal(profile.bodyEmissiveIntensity, 0);\n  assert.equal(profile.counterplayOpacityGain, 1);\n  assert.equal(profile.counterplaySizeGain, 1);\n  assert.equal(profile.weakpointEmissiveIntensity, 2.8);\n});\n\ntest("V40.19 gives storm boss-rise more separation than a city boss fight", () => {\n  const storm = skyDancerArcadeV4019BossContrast({ compactLandscape: true, stageBiome: "storm", rhythmPhase: "boss-rise", weakpointOpen: false });\n  const city = skyDancerArcadeV4019BossContrast({ compactLandscape: true, stageBiome: "city", rhythmPhase: "boss", weakpointOpen: false });\n  assert.ok(storm.pressure > city.pressure);\n  assert.ok(storm.bodyEmissiveIntensity > city.bodyEmissiveIntensity);\n  assert.ok(storm.counterplaySizeGain > city.counterplaySizeGain);\n});\n\ntest("V40.19 uses complementary weakpoint colors on visually hostile stages", () => {\n  const volcano = skyDancerArcadeV4019BossContrast({ compactLandscape: true, stageBiome: "volcano", rhythmPhase: "boss", weakpointOpen: true });\n  const citadel = skyDancerArcadeV4019BossContrast({ compactLandscape: true, stageBiome: "citadel", rhythmPhase: "boss", weakpointOpen: true });\n  assert.equal(volcano.weakpointOpenColor, 0x78f7ff);\n  assert.equal(citadel.weakpointOpenColor, 0xfff16b);\n  assert.ok(citadel.counterplayOpacityGain > 1.25);\n});\n\ntest("V40.19 restores identity framing outside climax phases", () => {\n  for (const phase of ["opening", "build", "release", "handoff", "finale"] as const) {\n    const profile = skyDancerArcadeV4019BossContrast({ compactLandscape: true, stageBiome: "storm", rhythmPhase: phase, weakpointOpen: false });\n    assert.equal(profile.pressure, 0);\n    assert.equal(profile.bodyEmissiveIntensity, 0);\n  }\n});\n\ntest("V40.19 is wired into boss materials, weakpoints and attack cues", () => {\n  const webgl = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");\n  const airframes = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeReferenceAirframes.ts", import.meta.url), "utf8");\n  assert.match(webgl, /skyDancerArcadeV4019BossContrast/);\n  assert.match(webgl, /arcadeV4019BaseEmissive/);\n  assert.match(webgl, /counterplayOpacityGain/);\n  assert.match(webgl, /weakpointEmissiveIntensity/);\n  assert.match(airframes, /signal\\.clone\\(\\).*arcade-boss-weakpoint/s);\n});\n'''
Path("tests/sky-arcade-v4019-boss-contrast.test.ts").write_text(test)

print("V40.19 boss contrast patch applied")
