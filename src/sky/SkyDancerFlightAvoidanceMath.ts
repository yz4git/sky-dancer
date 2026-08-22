export const SKY_DANCER_ENEMY_PREFERRED_STANDOFF = 13;
export const SKY_DANCER_ENEMY_HARD_CLEARANCE = 2.8;
export const SKY_DANCER_PLAYER_BODY_RADIUS = 1.45;

export function skyDancerClamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function skyDancerNormalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function skyDancerRotateToward(current: number, target: number, maxTurn: number): number {
  const delta = skyDancerNormalizeAngle(target - current);
  return skyDancerNormalizeAngle(current + skyDancerClamp(delta, -maxTurn, maxTurn));
}

export function skyDancerEnemySafetyRadius(enemyRadius: number): number {
  return SKY_DANCER_PLAYER_BODY_RADIUS + Math.max(0.5, enemyRadius) + SKY_DANCER_ENEMY_HARD_CLEARANCE;
}

export function skyDancerAvoidanceHeading(
  enemyX: number,
  enemyZ: number,
  playerX: number,
  playerZ: number,
  playerHeading: number,
  distance: number,
  side: number,
): number {
  const direct = Math.atan2(playerX - enemyX, playerZ - enemyZ);

  if (distance < 10.5) return skyDancerNormalizeAngle(direct + Math.PI + side * 0.42);
  if (distance < 17.5) return skyDancerNormalizeAngle(direct + side * 0.42);

  const lead = skyDancerClamp(distance * 0.20, 3.2, 9.0);
  const targetX = playerX + Math.sin(playerHeading) * lead;
  const targetZ = playerZ + Math.cos(playerHeading) * lead;
  const intercept = Math.atan2(targetX - enemyX, targetZ - enemyZ);
  return skyDancerNormalizeAngle(intercept + side * (distance < 28 ? 0.16 : 0.08));
}
