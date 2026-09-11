import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";

export interface SkyDancerArcadeV28ReadableAttitudeInput {
  kind: SkyDancerArcadeEnemyKind | "boss";
  maneuver: string;
  depth: number;
  relativeX: number;
  relativeY: number;
  lateralVelocity: number;
  verticalVelocity: number;
  lateralAcceleration: number;
  verticalAcceleration: number;
  id: number;
  runTimeSeconds: number;
}

export interface SkyDancerArcadeV28ReadableAttitude {
  pitchOffset: number;
  yawOffset: number;
  rollOffset: number;
  reveal: number;
  response: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function kindReadabilityScale(kind: SkyDancerArcadeEnemyKind | "boss"): number {
  switch (kind) {
    case "drone": return 1.1;
    case "interceptor": return 1.07;
    case "raider": return 1.08;
    case "ace": return 1.12;
    case "fighter": return 1;
    case "striker": return .92;
    case "missile-boat": return .78;
    case "bomber": return .68;
    case "gunship": return .62;
    default: return 0;
  }
}

function maneuverReadabilityScale(maneuver: string): number {
  switch (maneuver) {
    case "cross-pass": return 1.18;
    case "close-bank": return 1.15;
    case "rear-to-front": return 1.05;
    case "overtake": return 1;
    case "parallel": return .82;
    case "approach": return .74;
    default: return .62;
  }
}

/**
 * V28 presentation-only dogfight attitude.
 *
 * V19 guarantees that every normal aircraft has a small fixed top/underside bias. V24-V26 then
 * made the outer enemy transform physically coherent, but at phone scale a fast aircraft can still
 * collapse into a red horizontal bar when that outer transform briefly projects almost front-on.
 *
 * V28 deliberately solves that at the nested visual-body rig, never at the authoritative enemy
 * transform. As aircraft enter the phone foreground or execute a crossing maneuver, the body gets
 * a bounded extra yaw/pitch/roll reveal. Lock UI, hitboxes, course heading and collision all remain
 * on the outer group. Heavy aircraft receive a smaller offset than agile fighters.
 */
export function skyDancerArcadeV28ReadableAttitude(
  input: SkyDancerArcadeV28ReadableAttitudeInput,
): SkyDancerArcadeV28ReadableAttitude {
  if (input.kind === "boss") return { pitchOffset: 0, yawOffset: 0, rollOffset: 0, reveal: 0, response: 4 };

  const kindScale = kindReadabilityScale(input.kind);
  const maneuverScale = maneuverReadabilityScale(input.maneuver);
  const foregroundReveal = clamp((74 - input.depth) / 64, 0, 1);
  const closeReveal = clamp((38 - input.depth) / 28, 0, 1);
  const reveal = clamp((foregroundReveal * .78 + closeReveal * .22) * maneuverScale, 0, 1);
  const sideSign = Math.abs(input.relativeX) > .08
    ? -Math.sign(input.relativeX)
    : ((input.id + (input.kind.length % 3)) % 2 === 0 ? 1 : -1);
  const verticalSign = Math.abs(input.relativeY) > .07
    ? Math.sign(input.relativeY)
    : ((input.id + input.kind.length) % 3 === 0 ? 1 : -1);
  const motionAuthority = .22 + foregroundReveal * .78;

  const velocityYaw = clamp(
    (input.lateralVelocity * .018 + input.lateralAcceleration * .0045) * motionAuthority,
    -.07,
    .07,
  );
  const velocityPitch = clamp(
    (input.verticalVelocity * .018 + input.verticalAcceleration * .004) * motionAuthority,
    -.055,
    .055,
  );
  const accelerationRoll = clamp(-input.lateralAcceleration * .006 * motionAuthority, -.05, .05);
  const livingSway = Math.sin(input.runTimeSeconds * 1.8 + input.id * 1.73) * .012 * foregroundReveal * kindScale;

  const yawMagnitude = (.032 + foregroundReveal * .135 + closeReveal * .065) * maneuverScale * kindScale;
  const pitchMagnitude = (.018 + foregroundReveal * .095 + closeReveal * .05) * maneuverScale * kindScale;
  const rollMagnitude = (.016 + foregroundReveal * .055) * maneuverScale * kindScale;

  const yawOffset = clamp(sideSign * yawMagnitude + velocityYaw + livingSway, -.32, .32);
  const pitchOffset = clamp(verticalSign * pitchMagnitude + velocityPitch - livingSway * .55, -.24, .24);
  const rollOffset = clamp(sideSign * rollMagnitude + accelerationRoll, -.18, .18);
  const heavy = input.kind === "bomber" || input.kind === "gunship" || input.kind === "missile-boat";

  return {
    pitchOffset,
    yawOffset,
    rollOffset,
    reveal,
    response: heavy ? 4.6 : input.kind === "striker" ? 5.5 : 6.4,
  };
}
