import type { CartEnemyArchetype } from "../cart/CartCombat";

export type SkyDancerMissionWorldStyleV49 = "city" | "clouds" | "mountains" | "facility" | "storm" | "citadel";
export type SkyDancerMissionGradeV49 = "S" | "A" | "B" | "C";
export type SkyDancerMissionBeatKindV49 = "cross" | "intercept" | "break" | "vertical";

export interface SkyDancerMissionBeatV49 {
  kind: SkyDancerMissionBeatKindV49;
  label: string;
  directive: string;
  focusArchetypes: readonly CartEnemyArchetype[];
}

export interface SkyDancerMissionDefinitionV49 {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  worldStyle: SkyDancerMissionWorldStyleV49;
  killTarget: number;
  activeThreatTarget: number;
  parSeconds: number;
  bossTitle: string;
  beats: readonly SkyDancerMissionBeatV49[];
}

export interface SkyDancerMissionGradeMetricsV49 {
  elapsedSeconds: number;
  accuracy: number;
  perfectEvades: number;
  peakFlow: number;
}

const STANDARD_BEATS: readonly SkyDancerMissionBeatV49[] = [
  {
    kind: "cross",
    label: "HEAD-ON CROSS",
    directive: "READ THE DIVE · EVADE · COUNTER",
    focusArchetypes: ["striker", "drifter"],
  },
  {
    kind: "intercept",
    label: "INTERCEPT",
    directive: "CUT THE LANE · FIRE EARLY",
    focusArchetypes: ["bomber", "standard"],
  },
  {
    kind: "break",
    label: "TURBO BREAK",
    directive: "BUILD SPEED · COMMIT THROUGH ARMOR",
    focusArchetypes: ["tank", "striker"],
  },
  {
    kind: "vertical",
    label: "ALTITUDE DUEL",
    directive: "OPEN SEPARATION · TAKE THE HIGH ARC",
    focusArchetypes: ["orbiter", "drifter"],
  },
];

export const SKY_DANCER_CAMPAIGN_MISSIONS_V49: readonly SkyDancerMissionDefinitionV49[] = [
  {
    id: "skyline-intercept",
    number: 1,
    title: "SKYLINE INTERCEPT",
    subtitle: "Learn the cross. Own the counter window.",
    worldStyle: "city",
    killTarget: 8,
    activeThreatTarget: 4,
    parSeconds: 205,
    bossTitle: "WARDEN ACE",
    beats: STANDARD_BEATS,
  },
  {
    id: "cloud-knife",
    number: 2,
    title: "CLOUD KNIFE",
    subtitle: "Targets vanish in the cloud lanes. Read altitude first.",
    worldStyle: "clouds",
    killTarget: 8,
    activeThreatTarget: 4,
    parSeconds: 210,
    bossTitle: "MIST REAVER",
    beats: [STANDARD_BEATS[1], STANDARD_BEATS[3], STANDARD_BEATS[0], STANDARD_BEATS[2]],
  },
  {
    id: "iron-valley",
    number: 3,
    title: "IRON VALLEY",
    subtitle: "Use speed as a weapon between the ridgelines.",
    worldStyle: "mountains",
    killTarget: 9,
    activeThreatTarget: 4,
    parSeconds: 220,
    bossTitle: "IRON TALON",
    beats: [STANDARD_BEATS[2], STANDARD_BEATS[0], STANDARD_BEATS[3], STANDARD_BEATS[1]],
  },
  {
    id: "halo-foundry",
    number: 4,
    title: "HALO FOUNDRY",
    subtitle: "Break the defense ring before it closes around you.",
    worldStyle: "facility",
    killTarget: 9,
    activeThreatTarget: 4,
    parSeconds: 225,
    bossTitle: "FOUNDRY CORE",
    beats: [STANDARD_BEATS[1], STANDARD_BEATS[2], STANDARD_BEATS[0], STANDARD_BEATS[3]],
  },
  {
    id: "storm-crown",
    number: 5,
    title: "STORM CROWN",
    subtitle: "Keep FLOW alive while visibility and altitude collapse.",
    worldStyle: "storm",
    killTarget: 10,
    activeThreatTarget: 5,
    parSeconds: 235,
    bossTitle: "TEMPEST KING",
    beats: [STANDARD_BEATS[3], STANDARD_BEATS[0], STANDARD_BEATS[1], STANDARD_BEATS[2]],
  },
  {
    id: "last-light",
    number: 6,
    title: "LAST LIGHT",
    subtitle: "Dance through the final airspace and open the core.",
    worldStyle: "citadel",
    killTarget: 10,
    activeThreatTarget: 5,
    parSeconds: 245,
    bossTitle: "PRISM ARCHON",
    beats: [STANDARD_BEATS[0], STANDARD_BEATS[3], STANDARD_BEATS[2], STANDARD_BEATS[1]],
  },
] as const;

export function getSkyDancerMissionV49(stage: number): SkyDancerMissionDefinitionV49 | null {
  return SKY_DANCER_CAMPAIGN_MISSIONS_V49[stage - 1] ?? null;
}

export function getSkyDancerMissionBeatV49(
  mission: SkyDancerMissionDefinitionV49,
  kills: number,
): { beat: SkyDancerMissionBeatV49; index: number; progress: number } {
  const progress = Math.max(0, Math.min(0.9999, kills / Math.max(1, mission.killTarget)));
  const index = Math.min(mission.beats.length - 1, Math.floor(progress * mission.beats.length));
  return { beat: mission.beats[index], index, progress };
}

export function gradeSkyDancerMissionV49(metrics: SkyDancerMissionGradeMetricsV49, parSeconds: number): SkyDancerMissionGradeV49 {
  const timeRatio = metrics.elapsedSeconds / Math.max(1, parSeconds);
  let score = 0;
  if (timeRatio <= 0.88) score += 34;
  else if (timeRatio <= 1) score += 28;
  else if (timeRatio <= 1.18) score += 19;
  else score += 10;

  if (metrics.accuracy >= 0.72) score += 28;
  else if (metrics.accuracy >= 0.56) score += 22;
  else if (metrics.accuracy >= 0.40) score += 15;
  else score += 7;

  score += Math.min(20, metrics.perfectEvades * 4);
  score += Math.min(18, Math.floor(metrics.peakFlow / 18) * 3);

  if (score >= 82) return "S";
  if (score >= 65) return "A";
  if (score >= 47) return "B";
  return "C";
}
