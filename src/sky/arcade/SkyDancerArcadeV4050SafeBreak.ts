import {
  SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
  SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
} from "./SkyDancerArcadeV27CombatReadability";

export type SkyDancerArcadeV4050BreakDirection = "LEFT" | "RIGHT" | "UP" | "DOWN";

export interface SkyDancerArcadeV4050SafeBreakInput {
  playerX: number;
  playerY: number;
  sourceX: number;
  sourceY: number;
}

export interface SkyDancerArcadeV4050SafeBreakDecision {
  direction: SkyDancerArcadeV4050BreakDirection;
  score: number;
  lateralClearance: number;
  edgeClearance: number;
}

const candidates: readonly {
  direction: SkyDancerArcadeV4050BreakDirection;
  x: number;
  y: number;
}[] = [
  { direction: "UP", x: 0, y: 1 },
  { direction: "DOWN", x: 0, y: -1 },
  { direction: "LEFT", x: -1, y: 0 },
  { direction: "RIGHT", x: 1, y: 0 },
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * V40.50: choose a readable cardinal break direction.
 *
 * The primary score rewards motion perpendicular to the incoming firing line.
 * A second term preserves room at the phone-screen flight bounds, so the cue
 * does not tell the player to dodge into an edge. A small centre-recovery term
 * resolves otherwise-equal choices without changing projectile physics.
 */
export function skyDancerArcadeV4050BreakCandidates(
  input: SkyDancerArcadeV4050SafeBreakInput,
): SkyDancerArcadeV4050SafeBreakDecision[] {
  const incomingX = input.playerX - input.sourceX;
  const incomingY = input.playerY - input.sourceY;
  const incomingLength = Math.hypot(incomingX, incomingY);
  const nx = incomingLength > 1e-5 ? incomingX / incomingLength : 0;
  const ny = incomingLength > 1e-5 ? incomingY / incomingLength : 0;

  let best: SkyDancerArcadeV4050SafeBreakDecision | null = null;
  const decisions: SkyDancerArcadeV4050SafeBreakDecision[] = [];
  for (const candidate of candidates) {
    const stepX = candidate.x * .74;
    const stepY = candidate.y * .62;
    const nextX = Math.max(
      -SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
      Math.min(SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT, input.playerX + stepX),
    );
    const nextY = Math.max(
      -SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
      Math.min(SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT, input.playerY + stepY),
    );

    const lateralClearance = incomingLength > 1e-5
      ? Math.abs(nx * candidate.y - ny * candidate.x)
      : 0;
    const xMargin = 1 - Math.abs(nextX) / SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT;
    const yMargin = 1 - Math.abs(nextY) / SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT;
    const edgeClearance = clamp01(Math.min(xMargin, yMargin));

    const currentCentreDistance =
      Math.abs(input.playerX) / SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT +
      Math.abs(input.playerY) / SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT;
    const nextCentreDistance =
      Math.abs(nextX) / SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT +
      Math.abs(nextY) / SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT;
    const centreRecovery = currentCentreDistance - nextCentreDistance;

    const score = lateralClearance * 2.3 + edgeClearance * 1.25 + centreRecovery * .55;
    const decision: SkyDancerArcadeV4050SafeBreakDecision = {
      direction: candidate.direction,
      score,
      lateralClearance,
      edgeClearance,
    };
    if (!best || decision.score > best.score + 1e-6) best = decision;
    decisions.push(decision);
  }

  return decisions.sort((a, b) => b.score - a.score);
}

export function skyDancerArcadeV4050SafeBreak(
  input: SkyDancerArcadeV4050SafeBreakInput,
): SkyDancerArcadeV4050SafeBreakDecision {
  return skyDancerArcadeV4050BreakCandidates(input)[0]
    ?? { direction: "UP", score: 0, lateralClearance: 0, edgeClearance: 0 };
}
