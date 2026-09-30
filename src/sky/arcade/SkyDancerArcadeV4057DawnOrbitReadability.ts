export const SKY_DANCER_ARCADE_V4057_DAWN_ORBIT = {
  dawnNearPassClearance: 38,
  dawnCityInnerLaneX: 42,
  orbitNearPassClearance: 52,
  orbitFrameRadius: 27,
  orbitFrameTube: .52,
  orbitFrameArc: Math.PI * .58,
  orbitFrameOffsetX: 18,
  orbitSidePylonX: 54,
  orbitSidePanelX: 66,
  orbitSidePanelWidth: 6,
  orbitSidePanelDepth: 12,
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
