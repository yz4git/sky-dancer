export interface SkyDancerArcadeV4017Input {
  compactLandscape: boolean;
  focusPressure: number;
  protectedTarget: boolean;
  entityId: number;
  entityX: number;
  entityY: number;
  entityDepth: number;
  focusX: number;
  focusY: number;
  focusDepth: number;
  hasFocusTarget: boolean;
}

export interface SkyDancerArcadeV4017Clearance {
  pressure: number;
  offsetX: number;
  scale: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * V40.17 is a render-space clearance pass for phone landscape play.
 * Incidental foreground aircraft that cross the current hero sightline peel a few visual
 * units sideways instead of covering the boss / Rival / signature target. The runtime
 * coordinates, lock solution, collision geometry and enemy AI remain untouched.
 */
export function skyDancerArcadeV4017ForegroundClearance(input: SkyDancerArcadeV4017Input): SkyDancerArcadeV4017Clearance {
  if (!input.compactLandscape || input.protectedTarget || !input.hasFocusTarget || input.focusPressure <= .04) {
    return { pressure: 0, offsetX: 0, scale: 1 };
  }

  const dx = input.entityX - input.focusX;
  const dy = input.entityY - input.focusY;
  const focusLane = 1 - clamp01(Math.hypot(dx / 1.5, dy / 1.05));
  const inFrontOfFocus = clamp01((input.focusDepth - input.entityDepth + 4) / 18);
  const phoneForeground = clamp01((30 - input.entityDepth) / 26);
  const depthPressure = Math.max(inFrontOfFocus, phoneForeground * .65);
  const pressure = clamp01(input.focusPressure * focusLane * depthPressure * 2.05);
  if (pressure <= .02) return { pressure: 0, offsetX: 0, scale: 1 };

  // Keep the peel deterministic so an aircraft never jitters from side to side at x ~= focusX.
  const side = Math.abs(dx) > .06 ? Math.sign(dx) : (input.entityId % 2 === 0 ? 1 : -1);
  return {
    pressure,
    offsetX: side * pressure * .52,
    scale: clamp(1 - pressure * .08, .9, 1),
  };
}
