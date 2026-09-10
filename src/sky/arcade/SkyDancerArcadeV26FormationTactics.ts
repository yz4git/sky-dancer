export type SkyDancerArcadeV26FormationTactic = "independent" | "wing-pair" | "pincer" | "break" | "rejoin";
export type SkyDancerArcadeV26Maneuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";

export interface SkyDancerArcadeV26FormationNeighbor {
  id: number;
  x: number;
  y: number;
  depth: number;
  maneuverSign: number;
}

export interface SkyDancerArcadeV26FormationInput {
  id: number;
  x: number;
  y: number;
  depth: number;
  maneuver: SkyDancerArcadeV26Maneuver;
  maneuverSign: number;
  targetX: number;
  targetY: number;
  playerX: number;
  playerY: number;
  steeringUrgency: number;
  neighbors: readonly SkyDancerArcadeV26FormationNeighbor[];
  xLimit?: number;
  yLimit?: number;
}

export interface SkyDancerArcadeV26FormationCommand {
  tactic: SkyDancerArcadeV26FormationTactic;
  slotSign: -1 | 1;
  targetX: number;
  targetY: number;
  steeringUrgency: number;
  cohesion: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function slotSign(id: number, sign: number): -1 | 1 {
  if (Math.abs(sign) > .01) return sign < 0 ? -1 : 1;
  return id % 2 === 0 ? 1 : -1;
}

/**
 * V26 formation tactics layer.
 *
 * V25 makes one enemy fly like an aircraft. V26 lets nearby aircraft reason as a flight: pairs
 * establish opposite pincer lanes on approach, split in both axes through a merge, then re-form
 * after an overtake/close-bank instead of independently converging on the same screen point.
 * The command only biases the V25 steering target; collision, hit, lock and encounter ownership
 * remain unchanged.
 */
export function skyDancerArcadeV26FormationCommand(
  input: SkyDancerArcadeV26FormationInput,
): SkyDancerArcadeV26FormationCommand {
  const xLimit = input.xLimit ?? 2.62;
  const yLimit = input.yLimit ?? 2.05;
  const ownSlot = slotSign(input.id, input.maneuverSign);
  const neighbors = input.neighbors
    .filter((other) => other.id !== input.id && Math.abs(other.depth - input.depth) <= 18)
    .slice(0, 4);

  if (neighbors.length === 0) {
    return {
      tactic: "independent",
      slotSign: ownSlot,
      targetX: clamp(input.targetX, -xLimit, xLimit),
      targetY: clamp(input.targetY, -yLimit, yLimit),
      steeringUrgency: input.steeringUrgency,
      cohesion: 0,
    };
  }

  const oppositeWing = neighbors.find((other) => slotSign(other.id, other.maneuverSign) !== ownSlot) ?? null;
  const nearestWing = neighbors.reduce((best, other) => {
    if (!best) return other;
    const bestDistance = Math.abs(best.depth - input.depth) + Math.hypot(best.x - input.x, best.y - input.y) * 2;
    const candidateDistance = Math.abs(other.depth - input.depth) + Math.hypot(other.x - input.x, other.y - input.y) * 2;
    return candidateDistance < bestDistance ? other : best;
  }, null as SkyDancerArcadeV26FormationNeighbor | null);

  let tactic: SkyDancerArcadeV26FormationTactic = "wing-pair";
  if (input.maneuver === "cross-pass") tactic = "break";
  else if (input.maneuver === "overtake" || input.maneuver === "close-bank") tactic = "rejoin";
  else if (input.maneuver === "approach" && oppositeWing && input.depth >= 24 && input.depth <= 68) tactic = "pincer";

  const cadence = ((input.id * 17) % 5 - 2) * .045;
  let targetX = input.targetX;
  let targetY = input.targetY;
  let urgency = input.steeringUrgency;

  if (tactic === "pincer") {
    const farBlend = clamp((input.depth - 24) / 44, 0, 1);
    const lane = 1.12 + farBlend * .24;
    targetX = mix(input.targetX, input.playerX + ownSlot * lane + cadence, .78);
    targetY = mix(input.targetY, input.playerY * .42 + ownSlot * (.32 + farBlend * .1) - cadence * .7, .62);
    urgency = Math.max(urgency, 1.08);
  } else if (tactic === "break") {
    // Split laterally and vertically before the merge. Opposite wingmen choose opposite altitude lanes.
    targetX = mix(input.targetX, input.playerX + ownSlot * (1.78 + Math.abs(cadence)), .72);
    targetY = mix(input.targetY, input.playerY * .2 - ownSlot * (1.02 - Math.abs(cadence) * .5), .78);
    urgency = Math.max(urgency, 1.34);
  } else if (tactic === "rejoin") {
    // Re-form as an offset echelon; do not send both aircraft back to the same player-relative point.
    const lane = .82 + Math.min(.14, Math.abs(cadence));
    targetX = mix(input.targetX, input.playerX + ownSlot * lane, .58);
    targetY = mix(input.targetY, input.playerY * .58 + ownSlot * .2 + cadence, .48);
    urgency = Math.max(urgency, 1.02);
  } else {
    // Parallel/near flight: hold a readable two-ship spacing while preserving the authored maneuver target.
    targetX = mix(input.targetX, input.playerX + ownSlot * (.94 + Math.abs(cadence)), .42);
    targetY = mix(input.targetY, input.playerY * .55 + cadence * 1.4, .32);
  }

  // Local separation is intentionally a target bias rather than a teleport. V25 inertia decides how
  // quickly the aircraft can answer it, so heavy aircraft still need more room than fighters.
  let separationPushX = 0;
  let separationPushY = 0;
  for (const other of neighbors) {
    const depthGap = Math.abs(other.depth - input.depth);
    if (depthGap > 7.5) continue;
    let dx = input.x - other.x;
    let dy = input.y - other.y;
    let distance = Math.hypot(dx, dy);
    if (distance >= .7) continue;
    if (distance < .04) {
      dx = ownSlot;
      dy = -ownSlot * .35;
      distance = Math.hypot(dx, dy);
    }
    const strength = (.7 - distance) / .7;
    separationPushX += (dx / distance) * strength * .72;
    separationPushY += (dy / distance) * strength * .5;
  }
  targetX += separationPushX;
  targetY += separationPushY;
  if (Math.abs(separationPushX) + Math.abs(separationPushY) > .04) urgency = Math.max(urgency, 1.18);

  const cohesion = nearestWing
    ? clamp(1 - (Math.abs(nearestWing.depth - input.depth) / 18 + Math.hypot(nearestWing.x - input.x, nearestWing.y - input.y) / 4) * .5, 0, 1)
    : 0;

  return {
    tactic,
    slotSign: ownSlot,
    targetX: clamp(targetX, -xLimit, xLimit),
    targetY: clamp(targetY, -yLimit, yLimit),
    steeringUrgency: clamp(urgency, .55, 1.35),
    cohesion,
  };
}
