import type { SkyDancerArcadeEnemyManeuver } from "./SkyDancerArcadeRuntime";
import type { SkyDancerArcadeLoadout } from "./SkyDancerArcadeProgress";
import type { SkyDancerArcadeV40RouteDoctrine } from "./SkyDancerArcadeV40WorldBreak";

export type SkyDancerArcadeV404RivalOutcome = "NONE" | "BROKEN" | "OUTFLOWN" | "ESCAPED";

export interface SkyDancerArcadeV404RivalEncounter {
  appearance: 1 | 2 | 3;
  section: 2 | 4 | 6;
  startProgress: number;
  endProgress: number;
  baseHp: number;
  advantageTarget: number;
  score: number;
  label: string;
}

export const SKY_DANCER_ARCADE_V404_RIVAL_NAME = "NOVA-7";

/**
 * V40.4 uses post-signature/post-route windows so the Rival never steals the first-read
 * space from WORLD BREAK. Contact 3 resolves before the section-six climax, making the
 * final duel the emotional handoff into Prism Citadel rather than another boss overlay.
 */
export const SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS: readonly SkyDancerArcadeV404RivalEncounter[] = [
  { appearance: 1, section: 2, startProgress: .48, endProgress: .64, baseHp: 132, advantageTarget: 2.45, score: 3600, label: "TESTING PASS" },
  { appearance: 2, section: 4, startProgress: .46, endProgress: .65, baseHp: 178, advantageTarget: 3.05, score: 5400, label: "ADAPTIVE REMATCH" },
  { appearance: 3, section: 6, startProgress: .43, endProgress: .68, baseHp: 236, advantageTarget: 3.75, score: 8600, label: "FINAL DUEL" },
];

export function skyDancerArcadeV404RivalEncounterForSection(section: number): SkyDancerArcadeV404RivalEncounter | null {
  return SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS.find((encounter) => encounter.section === section) ?? null;
}

export function skyDancerArcadeV404RivalAdaptation(
  loadout: SkyDancerArcadeLoadout,
  doctrine: SkyDancerArcadeV40RouteDoctrine,
  appearance: number,
): string {
  const reader = loadout === "gun-focus"
    ? "CANNON READER · ARMOR BRACE"
    : loadout === "missile-focus"
      ? "MISSILE BREAKER · EVASIVE ROLL"
      : "TURBO HUNTER · JAMMER";
  const routeRead = doctrine === "DANGER"
    ? "DANGER CUT"
    : doctrine === "SCORE"
      ? "SCORE DENIAL"
      : doctrine === "SAFE"
        ? "SAFE-LANE PRESS"
        : "OPEN SKY";
  return `${reader} · ${routeRead}${appearance >= 3 ? " · NO RESERVE" : ""}`;
}

export function skyDancerArcadeV404RivalHp(
  encounter: SkyDancerArcadeV404RivalEncounter,
  hard: boolean,
  doctrine: SkyDancerArcadeV40RouteDoctrine,
): number {
  const routeScale = doctrine === "DANGER" ? 1.12 : doctrine === "SCORE" ? 1.06 : doctrine === "SAFE" ? .96 : 1;
  return Math.round(encounter.baseHp * (hard ? 1.18 : 1) * routeScale);
}

export function skyDancerArcadeV404RivalAdvantageTarget(
  encounter: SkyDancerArcadeV404RivalEncounter,
  hard: boolean,
  doctrine: SkyDancerArcadeV40RouteDoctrine,
): number {
  const routeScale = doctrine === "DANGER" ? 1.12 : doctrine === "SCORE" ? 1.05 : 1;
  return encounter.advantageTarget * (hard ? 1.12 : 1) * routeScale;
}

/**
 * Each contact loops through a real dogfight sentence. Runtime feeds these maneuvers into
 * the existing V24/V25 coordinated-flight solver, so the Rival banks and carries inertia
 * instead of following a decorative spline.
 */
export function skyDancerArcadeV404RivalManeuver(appearance: number, age: number): SkyDancerArcadeEnemyManeuver {
  const patterns: readonly (readonly SkyDancerArcadeEnemyManeuver[])[] = [
    ["cross-pass", "parallel", "overtake", "close-bank"],
    ["overtake", "cross-pass", "close-bank", "parallel", "approach"],
    ["close-bank", "overtake", "cross-pass", "parallel", "overtake", "close-bank"],
  ];
  const pattern = patterns[Math.max(0, Math.min(patterns.length - 1, appearance - 1))];
  const cadence = appearance >= 3 ? 1.05 : appearance === 2 ? 1.22 : 1.42;
  const index = Math.floor(Math.max(0, age) / cadence) % pattern.length;
  return pattern[index] ?? "cross-pass";
}

export function skyDancerArcadeV404RivalManeuverSign(appearance: number, age: number): -1 | 1 {
  const cadence = appearance >= 3 ? 1.05 : appearance === 2 ? 1.22 : 1.42;
  const beat = Math.floor(Math.max(0, age) / cadence);
  return (beat + appearance) % 2 === 0 ? 1 : -1;
}

export function skyDancerArcadeV404RivalPressureGain(
  appearance: number,
  alignment: number,
  fire: boolean,
  lock: boolean,
  turbo: boolean,
): number {
  if (alignment <= 0) return -.58;
  const intent = (lock ? .74 : 0) + (fire ? .58 : 0) + (turbo ? .4 : 0);
  if (intent <= 0) return -.18;
  return alignment * intent * (1 + Math.max(0, appearance - 1) * .08);
}
