export const SKY_DANCER_ARCADE_V4057_DAWN_ORBIT = {
  dawnNearPassClearance: 38,
  dawnCityInnerLaneX: 42,
  orbitNearPassClearance: 52,
  orbitFrameRadius: 22,
  orbitFrameTube: .38,
  orbitFrameArc: Math.PI * .44,
  orbitFrameOffsetX: 28,
  orbitSidePylonX: 60,
  orbitEdgeBeaconX: 68,
  orbitCueCount: 10,
  orbitCueRadius: 22,
  orbitCueArcA: Math.PI * .52,
  orbitCueArcB: Math.PI * .36,
  orbitCueNodeX: 25,
  orbitCueDarkX: -37,
} as const;

export function skyDancerArcadeV4057DawnCityLaneX(lane: number, randomOffset: number): number {
  return SKY_DANCER_ARCADE_V4057_DAWN_ORBIT.dawnCityInnerLaneX
    + Math.max(0, lane) * 15
    + Math.max(0, randomOffset);
}

export function skyDancerArcadeV4057OrbitFrameOffset(index: number): number {
  return (index % 2 === 0 ? 1 : -1) * SKY_DANCER_ARCADE_V4057_DAWN_ORBIT.orbitFrameOffsetX;
}
