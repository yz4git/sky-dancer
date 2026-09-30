export const SKY_DANCER_ARCADE_V4055_RUINS_DESERT = {
  ruinsNearPassClearance: 48,
  ruinsHeroIslandX: 35,
  ruinsHeroIslandRadius: 16.5,
  ruinsFarIslandX: 47,
  ruinsFarIslandRadius: 13.5,
  ruinsHeroBridgeX: 27,
  ruinsHeroBridgeWidth: 16.5,
  ruinsFarBridgeX: 35,
  ruinsFarBridgeWidth: 12,
  ruinsFragmentX: 24,
  desertNearPassClearance: 43,
  desertBreachWallX: 34,
  desertBreachWallWidth: 22,
  desertBreachRampX: 26,
  desertBreachRampWidth: 14,
  desertKeepHalfX: 13,
  desertKeepHalfWidth: 17,
} as const;

export function skyDancerArcadeV4055RuinsIslandProfile(hero: boolean) {
  return hero
    ? {
        x: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsHeroIslandX,
        radius: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsHeroIslandRadius,
        bridgeX: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsHeroBridgeX,
        bridgeWidth: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsHeroBridgeWidth,
      }
    : {
        x: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsFarIslandX,
        radius: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsFarIslandRadius,
        bridgeX: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsFarBridgeX,
        bridgeWidth: SKY_DANCER_ARCADE_V4055_RUINS_DESERT.ruinsFarBridgeWidth,
      };
}
