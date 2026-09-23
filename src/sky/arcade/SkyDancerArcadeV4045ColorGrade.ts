import * as THREE from "three";
import type { SkyDancerArcadePalette, SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function gradeHex(
  value: number,
  saturationScale: number,
  lightnessScale: number,
  lightnessOffset: number,
  tint: number,
  tintMix: number,
): number {
  const color = new THREE.Color(value);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(
    hsl.h,
    clamp01(hsl.s * saturationScale),
    clamp01(hsl.l * lightnessScale + lightnessOffset),
  );
  if (tintMix > 0) color.lerp(new THREE.Color(tint), tintMix);
  return color.getHex();
}

export function skyDancerArcadeV4045Palette(stage: SkyDancerArcadeStageDefinition): SkyDancerArcadePalette {
  const warmBiome = stage.biome === "canyon" || stage.biome === "desert" || stage.biome === "volcano";
  const nightBiome = stage.biome === "night" || stage.biome === "orbit" || stage.biome === "citadel" || stage.biome === "storm";
  const baseTint = warmBiome ? 0x4a403b : nightBiome ? 0x1d2e43 : 0x263d4d;
  const skyTint = warmBiome ? 0x5c4a42 : 0x20394f;
  return {
    sky: gradeHex(stage.palette.sky, warmBiome ? .68 : .62, nightBiome ? .86 : .9, .008, skyTint, warmBiome ? .055 : .11),
    fog: gradeHex(stage.palette.fog, .48, .92, -.008, baseTint, warmBiome ? .05 : .095),
    ground: gradeHex(stage.palette.ground, .58, .79, -.018, baseTint, .1),
    primary: gradeHex(stage.palette.primary, .62, .82, -.012, baseTint, .08),
    secondary: gradeHex(stage.palette.secondary, .72, .86, -.008, baseTint, .055),
    // Combat-significant accents keep most of their authored saturation.
    // Environment accent is intentionally calmer than combat emissives/locks, which use their own vivid colors.
    accent: gradeHex(stage.palette.accent, .72, .9, -.005, 0xbfdce2, .08),
    enemy: gradeHex(stage.palette.enemy, .92, .94, 0, 0xffd7c7, .018),
  };
}

export function skyDancerArcadeV4045Stage(stage: SkyDancerArcadeStageDefinition): SkyDancerArcadeStageDefinition {
  return { ...stage, palette: skyDancerArcadeV4045Palette(stage) };
}

export const SKY_DANCER_ARCADE_V4045_UI = {
  coolWhite: 0xeaf5f8,
  secondary: 0xabc0ca,
  cyan: 0x91deea,
  playerEnergy: 0xa7f2ff,
  warning: 0xe58a59,
  danger: 0xf25543,
  hotCore: 0xfff7e8,
  shadowBlue: 0x1b2b3b,
} as const;
