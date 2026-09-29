export const SKY_DANCER_ARCADE_V4053_STAGE_READABILITY = {
  stormNearPassClearance: 46,
  stormPressureShipX: 35,
  stormPressureDeckWidth: 27,
  volcanoPlumeClearance: 24,
  volcanoRibbonOuterWidth: 15,
  volcanoRibbonCoreWidth: 6.5,
  volcanoRibbonOuterOpacity: .44,
  volcanoRibbonCoreOpacity: .8,
  volcanoContactColor: 0x72e8ff,
} as const;

export interface SkyDancerArcadeV4053VolcanoContactInput {
  depth: number;
  priority: boolean;
  incomingThreat: boolean;
}

export interface SkyDancerArcadeV4053VolcanoContactProfile {
  visible: boolean;
  opacity: number;
  pointSize: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * A tiny cool navigation-light cue separates Volcano Core contacts from magma,
 * vents and warm haze without becoming another lock ring.
 */
export function skyDancerArcadeV4053VolcanoContact(
  input: SkyDancerArcadeV4053VolcanoContactInput,
): SkyDancerArcadeV4053VolcanoContactProfile {
  if (input.depth <= 4 || input.depth >= 76) return { visible: false, opacity: 0, pointSize: 0 };
  const closeness = clamp01((46 - input.depth) / 38);
  const priority = input.priority ? 1 : 0;
  const incoming = input.incomingThreat ? 1 : 0;
  return {
    visible: true,
    opacity: Math.min(.94, .5 + closeness * .18 + priority * .15 + incoming * .1),
    pointSize: 4.3 + closeness * 1.05 + priority * .5 + incoming * .3,
  };
}
