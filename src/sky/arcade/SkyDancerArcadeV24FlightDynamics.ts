import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";

export interface SkyDancerArcadeV24FlightState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SkyDancerArcadeV24FlightProfile {
  lateralAcceleration: number;
  verticalAcceleration: number;
  maxLateralSpeed: number;
  maxVerticalSpeed: number;
  positionGain: number;
  velocityDamping: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const moveToward = (current: number, target: number, maxDelta: number) => {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return target;
};

/**
 * V24: enemy aircraft no longer teleport laterally to their steering solution.
 * Light fighters can pull harder; bombers/gunships carry noticeably more inertia.
 */
export function skyDancerArcadeV24FlightProfile(
  kind: SkyDancerArcadeEnemyKind | "boss",
): SkyDancerArcadeV24FlightProfile {
  switch (kind) {
    case "drone": return { lateralAcceleration: 8.8, verticalAcceleration: 7.4, maxLateralSpeed: 2.35, maxVerticalSpeed: 1.9, positionGain: 2.15, velocityDamping: 1.7 };
    case "interceptor": return { lateralAcceleration: 8.1, verticalAcceleration: 6.8, maxLateralSpeed: 2.18, maxVerticalSpeed: 1.78, positionGain: 2.05, velocityDamping: 1.55 };
    case "raider": return { lateralAcceleration: 7.8, verticalAcceleration: 6.6, maxLateralSpeed: 2.12, maxVerticalSpeed: 1.74, positionGain: 1.98, velocityDamping: 1.5 };
    case "striker": return { lateralAcceleration: 7.2, verticalAcceleration: 6.1, maxLateralSpeed: 1.92, maxVerticalSpeed: 1.58, positionGain: 1.9, velocityDamping: 1.45 };
    case "ace": return { lateralAcceleration: 8.5, verticalAcceleration: 7.0, maxLateralSpeed: 2.28, maxVerticalSpeed: 1.84, positionGain: 2.08, velocityDamping: 1.45 };
    case "fighter": return { lateralAcceleration: 6.8, verticalAcceleration: 5.7, maxLateralSpeed: 1.78, maxVerticalSpeed: 1.46, positionGain: 1.78, velocityDamping: 1.4 };
    case "missile-boat": return { lateralAcceleration: 4.35, verticalAcceleration: 3.65, maxLateralSpeed: 1.18, maxVerticalSpeed: .96, positionGain: 1.42, velocityDamping: 1.32 };
    case "bomber": return { lateralAcceleration: 3.55, verticalAcceleration: 3.0, maxLateralSpeed: .98, maxVerticalSpeed: .82, positionGain: 1.28, velocityDamping: 1.25 };
    case "gunship": return { lateralAcceleration: 2.95, verticalAcceleration: 2.55, maxLateralSpeed: .82, maxVerticalSpeed: .72, positionGain: 1.18, velocityDamping: 1.18 };
    default: return { lateralAcceleration: 3.1, verticalAcceleration: 2.7, maxLateralSpeed: .86, maxVerticalSpeed: .74, positionGain: 1.2, velocityDamping: 1.2 };
  }
}

export function skyDancerArcadeV24Steer(
  state: SkyDancerArcadeV24FlightState,
  targetX: number,
  targetY: number,
  kind: SkyDancerArcadeEnemyKind | "boss",
  delta: number,
  urgency = 1,
  xLimit = 2.62,
  yLimit = 2.05,
): SkyDancerArcadeV24FlightState {
  const profile = skyDancerArcadeV24FlightProfile(kind);
  const dt = clamp(delta, 0, .05);
  const response = clamp(urgency, .55, 1.35);
  const errorX = clamp(targetX, -xLimit, xLimit) - state.x;
  const errorY = clamp(targetY, -yLimit, yLimit) - state.y;
  const desiredVX = clamp(errorX * profile.positionGain * response, -profile.maxLateralSpeed, profile.maxLateralSpeed);
  const desiredVY = clamp(errorY * profile.positionGain * response, -profile.maxVerticalSpeed, profile.maxVerticalSpeed);
  let vx = moveToward(state.vx, desiredVX, profile.lateralAcceleration * response * dt);
  let vy = moveToward(state.vy, desiredVY, profile.verticalAcceleration * response * dt);

  // Preserve momentum through the turn, but bleed tiny residual drift once the nose is nearly settled.
  if (Math.abs(errorX) < .08) vx *= Math.exp(-profile.velocityDamping * dt);
  if (Math.abs(errorY) < .07) vy *= Math.exp(-profile.velocityDamping * dt);

  let x = clamp(state.x + vx * dt, -xLimit, xLimit);
  let y = clamp(state.y + vy * dt, -yLimit, yLimit);
  if (Math.abs(x) >= xLimit - 1e-4 && Math.sign(vx) === Math.sign(x)) vx *= .35;
  if (Math.abs(y) >= yLimit - 1e-4 && Math.sign(vy) === Math.sign(y)) vy *= .35;
  x = clamp(x, -xLimit, xLimit);
  y = clamp(y, -yLimit, yLimit);
  return { x, y, vx, vy };
}

/** Camera-space heading offset used by the renderer so aircraft point into the turn instead of skidding sideways. */
export function skyDancerArcadeV24HeadingOffset(lateralVelocity: number, maneuver: string): number {
  const scale = maneuver === "cross-pass" || maneuver === "close-bank" ? .16 : maneuver === "overtake" ? .12 : .095;
  return clamp(lateralVelocity * scale, -.34, .34);
}

export function skyDancerArcadeV24BankTarget(lateralVelocity: number, maneuver: string): number {
  const scale = maneuver === "cross-pass" || maneuver === "close-bank" ? -.18 : -.135;
  return clamp(lateralVelocity * scale, -.78, .78);
}
