import {
  skyDancerArcadeV4050BreakCandidates,
  type SkyDancerArcadeV4050BreakDirection,
} from "./SkyDancerArcadeV4050SafeBreak";

export interface SkyDancerArcadeV4051ProjectileProbe {
  id: number;
  owner: string;
  x: number;
  y: number;
  depth: number;
  warningSeconds?: number;
  warningDuration?: number;
  sourceEnemyId?: number;
  projectileClass?: string;
}

export interface SkyDancerArcadeV4051EnemyProbe {
  id: number;
  x: number;
  y: number;
  boss?: boolean;
}

export interface SkyDancerArcadeV4051BreakCueInput {
  playerX: number;
  playerY: number;
  projectiles: readonly SkyDancerArcadeV4051ProjectileProbe[];
  enemies: readonly SkyDancerArcadeV4051EnemyProbe[];
  previousDirection?: SkyDancerArcadeV4050BreakDirection | null;
}

export interface SkyDancerArcadeV4051BreakCue {
  direction: SkyDancerArcadeV4050BreakDirection;
  arrow: "←" | "→" | "↑" | "↓";
  threatCount: number;
  urgency: number;
  danger: boolean;
  boss: boolean;
}

const directions: readonly SkyDancerArcadeV4050BreakDirection[] = ["UP", "DOWN", "LEFT", "RIGHT"];
const arrows: Record<SkyDancerArcadeV4050BreakDirection, SkyDancerArcadeV4051BreakCue["arrow"]> = {
  LEFT: "←",
  RIGHT: "→",
  UP: "↑",
  DOWN: "↓",
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function threatUrgency(projectile: SkyDancerArcadeV4051ProjectileProbe): {
  active: boolean;
  urgency: number;
  danger: boolean;
} {
  if (projectile.owner !== "enemy") return { active: false, urgency: 0, danger: false };
  const warning = Math.max(0, projectile.warningSeconds ?? 0);
  const warningDuration = Math.max(.001, projectile.warningDuration ?? warning);
  if (warning > 0) {
    const progress = clamp01(1 - warning / warningDuration);
    const breakWindow = Math.min(.42, Math.max(.24, warningDuration * .46));
    return {
      active: true,
      urgency: .34 + progress * .66,
      danger: warning <= breakWindow,
    };
  }
  if (projectile.depth <= 2.2 || projectile.depth >= 30) return { active: false, urgency: 0, danger: false };
  return {
    active: true,
    urgency: .35 + clamp01(1 - (projectile.depth - 2.2) / 16) * .65,
    danger: projectile.depth < 14,
  };
}

/**
 * V40.51: presentation-only multi-threat break guidance.
 *
 * Every active hostile firing line contributes to all four cardinal candidates.
 * A small previous-direction bonus prevents left/right or up/down chatter when
 * two shots have nearly equal urgency. The bonus is disabled near an edge.
 */
export function skyDancerArcadeV4051BreakCue(
  input: SkyDancerArcadeV4051BreakCueInput,
): SkyDancerArcadeV4051BreakCue | null {
  const enemyById = new Map(input.enemies.map((enemy) => [enemy.id, enemy] as const));
  const scores = new Map<SkyDancerArcadeV4050BreakDirection, number>(directions.map((direction) => [direction, 0]));
  const edgeClearance = new Map<SkyDancerArcadeV4050BreakDirection, number>(directions.map((direction) => [direction, 1]));

  let threatCount = 0;
  let totalUrgency = 0;
  let peakUrgency = 0;
  let danger = false;
  let boss = false;

  for (const projectile of input.projectiles) {
    const threat = threatUrgency(projectile);
    if (!threat.active) continue;
    threatCount += 1;
    totalUrgency += threat.urgency;
    peakUrgency = Math.max(peakUrgency, threat.urgency);
    danger ||= threat.danger;

    const sourceEnemy = projectile.sourceEnemyId === undefined
      ? undefined
      : enemyById.get(projectile.sourceEnemyId);
    const warning = Math.max(0, projectile.warningSeconds ?? 0);
    const sourceX = warning > 0 && sourceEnemy ? sourceEnemy.x : projectile.x;
    const sourceY = warning > 0 && sourceEnemy ? sourceEnemy.y : projectile.y;
    boss ||= projectile.projectileClass === "boss" || Boolean(sourceEnemy?.boss);

    for (const decision of skyDancerArcadeV4050BreakCandidates({
      playerX: input.playerX,
      playerY: input.playerY,
      sourceX,
      sourceY,
    })) {
      scores.set(decision.direction, (scores.get(decision.direction) ?? 0) + decision.score * threat.urgency);
      edgeClearance.set(
        decision.direction,
        Math.min(edgeClearance.get(decision.direction) ?? 1, decision.edgeClearance),
      );
    }
  }

  if (threatCount === 0) return null;

  const previousDirection = input.previousDirection ?? null;
  if (
    previousDirection
    && (edgeClearance.get(previousDirection) ?? 0) > .16
  ) {
    scores.set(
      previousDirection,
      (scores.get(previousDirection) ?? 0) + Math.max(.18, totalUrgency * .24),
    );
  }

  let direction: SkyDancerArcadeV4050BreakDirection = "UP";
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of directions) {
    const score = scores.get(candidate) ?? Number.NEGATIVE_INFINITY;
    if (score > bestScore + 1e-6) {
      direction = candidate;
      bestScore = score;
    }
  }

  return {
    direction,
    arrow: arrows[direction],
    threatCount,
    urgency: peakUrgency,
    danger,
    boss,
  };
}
