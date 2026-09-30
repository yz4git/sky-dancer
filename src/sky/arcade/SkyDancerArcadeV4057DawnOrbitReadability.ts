export const SKY_DANCER_ARCADE_V4057_DAWN_ORBIT = {
  dawnNearPassClearance: 38,
  dawnCityInnerLaneX: 42,
  orbitNearPassClearance: 49,
  orbitFrameRadius: 33,
  orbitFrameTube: .72,
  orbitFrameArc: Math.PI * .74,
  orbitFrameOffsetX: 9,
  orbitSidePylonX: 47,
  orbitSidePanelX: 62,
  orbitSidePanelWidth: 10,
  orbitSidePanelDepth: 22,
  orbitCueCount: 8,
  orbitCueRadius: 24,
  orbitCueArcA: Math.PI * .58,
  orbitCueArcB: Math.PI * .42,
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
