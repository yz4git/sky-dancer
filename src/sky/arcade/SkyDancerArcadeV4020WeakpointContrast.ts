import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";

export interface SkyDancerArcadeV4020WeakpointInput {
  stageId: SkyDancerArcadeStageId;
  compactLandscape: boolean;
  weakpointOpen: boolean;
  bossPhase: number;
  hpRatio: number;
}

export interface SkyDancerArcadeV4020WeakpointProfile {
  coreColor: number;
  closedColor: number;
  outlineColor: number;
  coreOpacity: number;
  outlineOpacity: number;
  outlineScale: number;
  pulseAmplitude: number;
  pulseSpeed: number;
  canvasRadius: number;
}

interface StageContrast {
  openCore: number;
  closedCore: number;
  outline: number;
}

const STAGE_CONTRAST: Record<SkyDancerArcadeStageId, StageContrast> = {
  "dawn-city": { openCore: 0xffdf64, closedCore: 0x3a2c12, outline: 0xffffff },
  "red-canyon": { openCore: 0x68efff, closedCore: 0x12363d, outline: 0xeaffff },
  "cloud-fleet": { openCore: 0xff6bbd, closedCore: 0x3d1730, outline: 0xffe8f6 },
  "storm-carrier": { openCore: 0xffe970, closedCore: 0x3c3214, outline: 0xffffff },
  "desert-fortress": { openCore: 0x72efff, closedCore: 0x16373c, outline: 0xf0ffff },
  "ice-cavern": { openCore: 0xff739f, closedCore: 0x3c1826, outline: 0xffeef3 },
  "floating-ruins": { openCore: 0xffdc68, closedCore: 0x3a3016, outline: 0xffffff },
  "night-metro": { openCore: 0xffef72, closedCore: 0x3b3317, outline: 0xffffff },
  "volcano-core": { openCore: 0x78f6ff, closedCore: 0x153b40, outline: 0xf3ffff },
  "orbital-ascent": { openCore: 0xff69d4, closedCore: 0x3d1833, outline: 0xffeffb },
  "prism-citadel": { openCore: 0xcaff61, closedCore: 0x293b16, outline: 0xffffff },
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * V40.20 is presentation-only. It chooses a stage-complementary core/outline palette and bounded
 * phone readability lift. Boss HP, hit windows, collision, damage and weakpoint timing remain runtime-owned.
 */
export function skyDancerArcadeV4020WeakpointContrast(
  input: SkyDancerArcadeV4020WeakpointInput,
): SkyDancerArcadeV4020WeakpointProfile {
  const contrast = STAGE_CONTRAST[input.stageId];
  const phaseBoost = Math.max(0, Math.min(.16, (Math.max(1, input.bossPhase) - 1) * .08));
  const damageBoost = (1 - clamp01(input.hpRatio)) * .08;

  if (!input.weakpointOpen) {
    return {
      coreColor: contrast.closedCore,
      closedColor: contrast.closedCore,
      outlineColor: contrast.outline,
      coreOpacity: input.compactLandscape ? .72 : .62,
      outlineOpacity: input.compactLandscape ? .16 : .1,
      outlineScale: 1.12,
      pulseAmplitude: .035,
      pulseSpeed: 8,
      canvasRadius: .92 + damageBoost,
    };
  }

  return {
    coreColor: contrast.openCore,
    closedColor: contrast.closedCore,
    outlineColor: contrast.outline,
    coreOpacity: 1,
    outlineOpacity: Math.min(.9, (input.compactLandscape ? .82 : .68) + phaseBoost * .25),
    outlineScale: (input.compactLandscape ? 1.3 : 1.24) + phaseBoost * .12,
    pulseAmplitude: .13,
    pulseSpeed: 16 + phaseBoost * 10,
    canvasRadius: (input.compactLandscape ? 1.38 : 1.28) + damageBoost,
  };
}
