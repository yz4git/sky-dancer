export type SkyDancerArcadeV122FlowSign = -1 | 0 | 1;

export interface SkyDancerArcadeV122ContinuityInput {
  playerX: number;
  playerVX: number;
  survivorXs: readonly number[];
  phaseIndex: number;
}

export interface SkyDancerArcadeV122Continuity {
  breakSign: SkyDancerArcadeV122FlowSign;
  entrySign: SkyDancerArcadeV122FlowSign;
  survivorCount: number;
  survivorCentroidX: number;
  lateralBias: number;
  label: string;
}

function flowSign(value: number, deadzone: number): SkyDancerArcadeV122FlowSign {
  if (value > deadzone) return 1;
  if (value < -deadzone) return -1;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * V12.2 keeps a multi-phase encounter spatially continuous. Player momentum owns
 * the primary read; when the player is centered, surviving enemies tell the next
 * reinforcement which empty side of the arena should be filled.
 */
export function skyDancerArcadeV122EncounterContinuity(
  input: SkyDancerArcadeV122ContinuityInput,
): SkyDancerArcadeV122Continuity {
  const survivorCount = input.survivorXs.length;
  const survivorCentroidX = survivorCount > 0
    ? input.survivorXs.reduce((sum, x) => sum + x, 0) / survivorCount
    : 0;
  const velocityBreak = flowSign(input.playerVX, .32);
  const positionBreak = flowSign(input.playerX, .84);
  const breakSign = velocityBreak !== 0 ? velocityBreak : positionBreak;
  const survivorSide = flowSign(survivorCentroidX, .28);
  let entrySign: SkyDancerArcadeV122FlowSign = 0;
  if (input.phaseIndex > 0) {
    if (breakSign !== 0) entrySign = breakSign;
    else if (survivorSide !== 0) entrySign = survivorSide === 1 ? -1 : 1;
    else entrySign = input.phaseIndex % 2 === 1 ? 1 : -1;
  }
  const lateralBias = entrySign === 0
    ? 0
    : entrySign * clamp(.74 + input.phaseIndex * .18 + Math.min(4, survivorCount) * .04, .74, 1.18);
  const side = entrySign > 0 ? 'R' : entrySign < 0 ? 'L' : 'HOLD';
  const action = breakSign !== 0 ? 'BLOCK' : survivorSide !== 0 ? 'FILL' : 'FLOW';
  return {
    breakSign,
    entrySign,
    survivorCount,
    survivorCentroidX,
    lateralBias,
    label: `${action} ${side} · CARRY ${survivorCount}`,
  };
}
