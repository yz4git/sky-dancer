export const SKY_DANCER_ARCADE_V4056_CLOUD_CANYON = {
  cloudNearPassClearance: 45,
  cloudLeadShipX: 36,
  cloudFarShipX: 52,
  cloudLeadHullWidth: 13,
  cloudLeadDeckWidth: 21,
  cloudLeadDeckGlowWidth: 15,
  cloudLeadBowRadius: 6.2,
  canyonNearPassClearance: 48,
  canyonChunkWallClearance: 48,
  canyonInnerBaseRadiusMax: 8.6,
  canyonInnerTopRadiusMax: 6.2,
} as const;

export function skyDancerArcadeV4056CloudShipX(lead: boolean): number {
  return lead
    ? SKY_DANCER_ARCADE_V4056_CLOUD_CANYON.cloudLeadShipX
    : SKY_DANCER_ARCADE_V4056_CLOUD_CANYON.cloudFarShipX;
}

export function skyDancerArcadeV4056CanyonChunkX(side: number, alternateLane: boolean): number {
  const sign = side < 0 ? -1 : 1;
  return sign * (
    SKY_DANCER_ARCADE_V4056_CLOUD_CANYON.canyonChunkWallClearance
    + (alternateLane ? 30 : 0)
  );
}
