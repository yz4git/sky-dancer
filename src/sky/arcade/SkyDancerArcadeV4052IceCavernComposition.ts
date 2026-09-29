export const SKY_DANCER_ARCADE_V4052_ICE = {
  nearPassClearance: 46,
  chunkInnerClearance: 44,
  chunkOuterClearance: 58,
  shoulderClearance: 50,
  routeRibRadius: 19.4,
  routeRibOffset: 7.6,
  routeFangClearance: 22,
  routeFloorShardClearance: 24,
  contactLightColor: 0xffa45f,
} as const;

export interface SkyDancerArcadeV4052IceEnemyContrastInput {
  depth: number;
  priority: boolean;
  incomingThreat: boolean;
}

export interface SkyDancerArcadeV4052IceEnemyContrast {
  visible: boolean;
  opacity: number;
  pointSize: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * V40.52 keeps hostile aircraft distinct against cyan/white ice without adding
 * a HUD ring. Three tiny warm navigation lamps stay screen-sized and become
 * slightly stronger only when the contact is close, selected, or firing.
 */
export function skyDancerArcadeV4052IceEnemyContrast(
  input: SkyDancerArcadeV4052IceEnemyContrastInput,
): SkyDancerArcadeV4052IceEnemyContrast {
  if (input.depth <= 4 || input.depth >= 78) {
    return { visible: false, opacity: 0, pointSize: 0 };
  }
  const closeness = clamp01((44 - input.depth) / 36);
  const priority = input.priority ? 1 : 0;
  const incoming = input.incomingThreat ? 1 : 0;
  return {
    visible: true,
    opacity: Math.min(.94, .5 + closeness * .2 + priority * .13 + incoming * .11),
    pointSize: 4.2 + closeness * 1.15 + priority * .45 + incoming * .35,
  };
}
