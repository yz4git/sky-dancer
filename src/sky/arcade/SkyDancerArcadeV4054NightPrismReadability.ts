export const SKY_DANCER_ARCADE_V4054_NIGHT_PRISM = {
  nightNearPassClearance: 46,
  nightCityInnerLaneX: 44,
  nightLeadRailX: 29,
  nightFarRailX: 38,
  nightLeadCanopyX: 35,
  nightGantryPostX: 40,
  nightGantryArmX: 34,
  prismNearPassClearance: 44,
  prismBastionBaseX: 45,
  prismTerraceX: 43,
  prismBladeBaseX: 34,
  prismCrownX: 28,
  prismTerraceGlowWidth: 13,
} as const;

/**
 * V40.54 is presentation-only. These clearances move decorative mass away from the
 * phone combat corridor; collision/hazard coordinates and World Break targets remain unchanged.
 */
export function skyDancerArcadeV4054NightCityLaneX(lane: number, randomOffset: number): number {
  return SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.nightCityInnerLaneX
    + Math.max(0, lane) * 15
    + Math.max(0, randomOffset);
}

export function skyDancerArcadeV4054PrismBastionX(index: number): number {
  return SKY_DANCER_ARCADE_V4054_NIGHT_PRISM.prismBastionBaseX + (Math.max(0, index) % 3) * 3.5;
}
