/** Center-relative circular stick, including a small physical dead zone. */
export function normalizeArcadeStick(dx: number, dy: number, radius: number, deadZone = .08) {
  if (![dx, dy, radius].every(Number.isFinite) || radius <= 0) return { x: 0, y: 0 };
  const length = Math.hypot(dx, dy);
  const distance = Math.min(1, length / radius);
  const dead = Math.max(0, Math.min(.9, deadZone));
  if (distance <= dead || length === 0) return { x: 0, y: 0 };
  const strength = (distance - dead) / (1 - dead);
  return { x: dx / length * strength, y: -dy / length * strength };
}
