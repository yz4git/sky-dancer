import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";

export const SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT = 1.9;
export const SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT = 1.52;

export interface SkyDancerArcadeV27DensityCaps {
  enemyCap: number;
  closeEnemyCap: number;
  closeDepth: number;
}

export type SkyDancerArcadeV27CueKind = "lock" | "aim" | "counterplay";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Keep close fly-bys cinematic without letting one airframe consume the phone screen. */
export function skyDancerArcadeV27EnemyPresenceScale(depth: number): number {
  if (depth >= 24) return 1;
  const closeness = clamp((24 - depth) / 22, 0, 1);
  return 1 - closeness * .32;
}

/** Fixed-pixel targeting cues are intentionally smaller than the old 76px marker and shrink again up close. */
export function skyDancerArcadeV27CuePointSize(
  kind: SkyDancerArcadeEnemyKind | "boss",
  boss: boolean,
  depth: number,
  cue: SkyDancerArcadeV27CueKind,
): number {
  const base = boss
    ? cue === "lock" ? 66 : cue === "counterplay" ? 72 : 58
    : kind === "gunship"
      ? cue === "lock" ? 54 : cue === "counterplay" ? 58 : 42
      : kind === "bomber"
        ? cue === "lock" ? 50 : cue === "counterplay" ? 54 : 40
        : cue === "lock"
          ? 44
          : cue === "counterplay"
            ? 48
            : 34;
  const closeScale = depth >= 28 ? 1 : 1 - clamp((28 - depth) / 24, 0, 1) * .18;
  return Math.round(base * closeScale);
}

export function skyDancerArcadeV27DensityCaps(hard: boolean): SkyDancerArcadeV27DensityCaps {
  return hard
    ? { enemyCap: 12, closeEnemyCap: 7, closeDepth: 36 }
    : { enemyCap: 9, closeEnemyCap: 5, closeDepth: 36 };
}

export function skyDancerArcadeV27CloseCombatCrowded(
  depths: readonly number[],
  hard: boolean,
): boolean {
  const caps = skyDancerArcadeV27DensityCaps(hard);
  return depths.filter((depth) => depth > -2 && depth <= caps.closeDepth).length >= caps.closeEnemyCap;
}
