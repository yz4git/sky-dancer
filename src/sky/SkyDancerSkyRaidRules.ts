export type SkyDancerSkyRaidActId =
  | "dawn-city"
  | "red-canyon"
  | "cloud-fleet"
  | "storm-carrier"
  | "prism-citadel";

export interface SkyDancerSkyRaidPalette {
  sky: number;
  fog: number;
  ground: number;
  primary: number;
  secondary: number;
  accent: number;
  enemy: number;
}

export interface SkyDancerSkyRaidAct {
  id: SkyDancerSkyRaidActId;
  index: number;
  label: string;
  subtitle: string;
  startSeconds: number;
  endSeconds: number;
  killTarget: number;
  setpiece: "CITY GATES" | "CANYON KNIFE RUN" | "FLEET BREAK" | "THUNDER RAID" | "PRISM SIEGE";
  palette: SkyDancerSkyRaidPalette;
}

export const SKY_DANCER_SKY_RAID_ACT_SECONDS = 45;

export const SKY_DANCER_SKY_RAID_ACTS: readonly SkyDancerSkyRaidAct[] = [
  {
    id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 45, killTarget: 7, setpiece: "CITY GATES",
    palette: { sky: 0x89d4f1, fog: 0xd6e9ef, ground: 0x294b5f, primary: 0x3f7188, secondary: 0xf2b775, accent: 0x64e8ff, enemy: 0xf16f62 },
  },
  {
    id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 45, endSeconds: 90, killTarget: 8, setpiece: "CANYON KNIFE RUN",
    palette: { sky: 0xeaa06e, fog: 0xca7959, ground: 0x6a302d, primary: 0x9e4934, secondary: 0xdf8d4b, accent: 0xffd36d, enemy: 0x56d3ec },
  },
  {
    id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 90, endSeconds: 135, killTarget: 9, setpiece: "FLEET BREAK",
    palette: { sky: 0x76c8ee, fog: 0xe5f4fb, ground: 0x6faed0, primary: 0xe5f2f7, secondary: 0x607f94, accent: 0xffcc65, enemy: 0xd9556c },
  },
  {
    id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 135, endSeconds: 180, killTarget: 10, setpiece: "THUNDER RAID",
    palette: { sky: 0x20364d, fog: 0x657d92, ground: 0x15384b, primary: 0x42566b, secondary: 0x7d93a8, accent: 0x91f5ff, enemy: 0xff5f7d },
  },
  {
    id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 180, endSeconds: 225, killTarget: 10, setpiece: "PRISM SIEGE",
    palette: { sky: 0x45396c, fog: 0x8c7bb6, ground: 0x272142, primary: 0x7564a5, secondary: 0x4db6bd, accent: 0xffd96f, enemy: 0xff6e94 },
  },
];

export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 198;
export const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 225;

// Free-flight kills need enough time for a real bank/reacquire/lock handoff on phone.
// Longer than the old 4.2 s timer, but still short enough to reward momentum.
export const SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS = 5.6;

// The flagship card is an entrance cue, not a persistent combat overlay.
export const SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS = 2.4;

export function skyDancerSkyRaidBossCueActive(elapsedSeconds: number, bossForced: boolean): boolean {
  if (!bossForced) return false;
  const local = elapsedSeconds - SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS;
  return local >= 0 && local < SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS;
}

export type SkyDancerSkyRaidCombatBeat = "spearhead" | "pincer" | "regroup" | "crossfire" | "breakaway";

export interface SkyDancerSkyRaidCombatProfile {
  doctrine: "GATE SPEAR" | "CANYON SCISSOR" | "ESCORT WALL" | "THUNDER PINCER" | "SIEGE ORBIT";
  beats: readonly [
    SkyDancerSkyRaidCombatBeat,
    SkyDancerSkyRaidCombatBeat,
    SkyDancerSkyRaidCombatBeat,
    SkyDancerSkyRaidCombatBeat,
    SkyDancerSkyRaidCombatBeat,
  ];
  lateralScale: number;
  forwardBias: number;
  baseTargetCount: number;
  rushTargetCount: number;
  correctionSpeed: number;
  rushCorrectionSpeed: number;
}

const SKY_DANCER_SKY_RAID_COMBAT_PROFILES: Readonly<Record<SkyDancerSkyRaidActId, SkyDancerSkyRaidCombatProfile>> = {
  "dawn-city": {
    doctrine: "GATE SPEAR",
    beats: ["spearhead", "pincer", "regroup", "crossfire", "breakaway"],
    lateralScale: 0.88,
    forwardBias: 0,
    baseTargetCount: 3,
    rushTargetCount: 4,
    correctionSpeed: 4.6,
    rushCorrectionSpeed: 7.4,
  },
  "red-canyon": {
    doctrine: "CANYON SCISSOR",
    beats: ["crossfire", "pincer", "breakaway", "crossfire", "spearhead"],
    lateralScale: 0.72,
    forwardBias: -2.5,
    baseTargetCount: 3,
    rushTargetCount: 4,
    correctionSpeed: 5.2,
    rushCorrectionSpeed: 7.6,
  },
  "cloud-fleet": {
    doctrine: "ESCORT WALL",
    beats: ["regroup", "spearhead", "pincer", "regroup", "breakaway"],
    lateralScale: 1.10,
    forwardBias: 2,
    baseTargetCount: 3,
    rushTargetCount: 4,
    correctionSpeed: 4.2,
    rushCorrectionSpeed: 6.6,
  },
  "storm-carrier": {
    doctrine: "THUNDER PINCER",
    beats: ["pincer", "crossfire", "breakaway", "pincer", "crossfire"],
    lateralScale: 1.18,
    forwardBias: -1.5,
    baseTargetCount: 4,
    rushTargetCount: 4,
    correctionSpeed: 5.8,
    rushCorrectionSpeed: 7.8,
  },
  "prism-citadel": {
    doctrine: "SIEGE ORBIT",
    beats: ["regroup", "crossfire", "spearhead", "pincer", "regroup"],
    lateralScale: 0.96,
    forwardBias: 1.5,
    baseTargetCount: 3,
    rushTargetCount: 4,
    correctionSpeed: 5.0,
    rushCorrectionSpeed: 7.0,
  },
};

export function skyDancerSkyRaidCombatProfile(actId: SkyDancerSkyRaidActId): SkyDancerSkyRaidCombatProfile {
  return SKY_DANCER_SKY_RAID_COMBAT_PROFILES[actId];
}

export type SkyDancerSkyRaidWorldStyle = "city" | "mountains" | "clouds" | "storm" | "citadel";

export function skyDancerSkyRaidWorldStyle(actId: SkyDancerSkyRaidActId): SkyDancerSkyRaidWorldStyle {
  switch (actId) {
    case "dawn-city": return "city";
    case "red-canyon": return "mountains";
    case "cloud-fleet": return "clouds";
    case "storm-carrier": return "storm";
    case "prism-citadel": return "citadel";
  }
}

export function skyDancerSkyRaidActFor(elapsedSeconds: number): SkyDancerSkyRaidAct {
  const elapsed = Math.max(0, elapsedSeconds);
  return SKY_DANCER_SKY_RAID_ACTS.find((act) => elapsed < act.endSeconds) ?? SKY_DANCER_SKY_RAID_ACTS[SKY_DANCER_SKY_RAID_ACTS.length - 1];
}

export function skyDancerSkyRaidActSeconds(elapsedSeconds: number, act: SkyDancerSkyRaidAct): number {
  return Math.max(0, elapsedSeconds - act.startSeconds);
}

export function skyDancerSkyRaidRushActive(elapsedSeconds: number, act: SkyDancerSkyRaidAct): boolean {
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) return (local >= 8 && local < 18) || (local >= 28 && local < 38);
  return (local >= 8 && local < 16) || (local >= 28 && local < 36);
}

export function skyDancerSkyRaidPressure(elapsedSeconds: number): number {
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  const actProgress = Math.min(1, local / Math.max(1, act.endSeconds - act.startSeconds));
  return Math.min(1, 0.18 + act.index * 0.16 + actProgress * 0.16);
}

export function skyDancerSkyRaidKillScore(chain: number, turbo: boolean, rush: boolean): number {
  const safeChain = Math.max(1, Math.floor(chain));
  const chainMultiplier = 1 + Math.min(9, safeChain - 1) * 0.15;
  const turboMultiplier = turbo ? 1.35 : 1;
  const resolvedKillScore = Math.round(100 * chainMultiplier * turboMultiplier);
  return rush ? resolvedKillScore * 2 : resolvedKillScore;
}

export function skyDancerSkyRaidMultiplier(chain: number, rush: boolean): number {
  const chainMultiplier = 1 + Math.min(9, Math.max(0, Math.floor(chain) - 1)) * 0.15;
  return Math.round(chainMultiplier * (rush ? 2 : 1) * 100) / 100;
}

export type SkyDancerSkyRaidEnemyClass = "standard" | "striker" | "orbiter" | "drifter" | "bomber" | "heavy";
export type SkyDancerSkyRaidAttackStyle = "intercept" | "knife" | "escort" | "pincer" | "siege";

export interface SkyDancerSkyRaidEnemyDoctrine {
  package: "CITY INTERCEPTORS" | "CANYON KNIVES" | "FLEET ESCORT" | "THUNDER HUNTERS" | "PRISM SIEGE WING";
  roster: readonly [
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
    SkyDancerSkyRaidEnemyClass,
  ];
  attackStyle: SkyDancerSkyRaidAttackStyle;
  activeTargetCount: number;
  speedScale: number;
  turnScale: number;
  missileMinRange: number;
  missileMaxRange: number;
  missileAimTolerance: number;
  missileCooldownScale: number;
  missileTurnScale: number;
  missileDamageScale: number;
}

const SKY_DANCER_SKY_RAID_ENEMY_DOCTRINES: Readonly<Record<SkyDancerSkyRaidActId, SkyDancerSkyRaidEnemyDoctrine>> = {
  "dawn-city": {
    package: "CITY INTERCEPTORS",
    roster: ["standard", "striker", "standard", "orbiter", "drifter", "standard"],
    attackStyle: "intercept",
    activeTargetCount: 6,
    speedScale: 1,
    turnScale: 1,
    missileMinRange: 8,
    missileMaxRange: 42,
    missileAimTolerance: 0.56,
    missileCooldownScale: 1.05,
    missileTurnScale: 1,
    missileDamageScale: 0.95,
  },
  "red-canyon": {
    package: "CANYON KNIVES",
    roster: ["drifter", "striker", "drifter", "striker", "standard", "drifter"],
    attackStyle: "knife",
    activeTargetCount: 6,
    speedScale: 1.09,
    turnScale: 1.18,
    missileMinRange: 7,
    missileMaxRange: 34,
    missileAimTolerance: 0.70,
    missileCooldownScale: 0.92,
    missileTurnScale: 1.12,
    missileDamageScale: 0.88,
  },
  "cloud-fleet": {
    package: "FLEET ESCORT",
    roster: ["orbiter", "bomber", "heavy", "orbiter", "bomber", "standard"],
    attackStyle: "escort",
    activeTargetCount: 7,
    speedScale: 0.94,
    turnScale: 0.90,
    missileMinRange: 13,
    missileMaxRange: 48,
    missileAimTolerance: 0.74,
    missileCooldownScale: 1.14,
    missileTurnScale: 0.90,
    missileDamageScale: 1.10,
  },
  "storm-carrier": {
    package: "THUNDER HUNTERS",
    roster: ["striker", "drifter", "bomber", "striker", "drifter", "standard"],
    attackStyle: "pincer",
    activeTargetCount: 7,
    speedScale: 1.12,
    turnScale: 1.15,
    missileMinRange: 8,
    missileMaxRange: 45,
    missileAimTolerance: 0.64,
    missileCooldownScale: 0.78,
    missileTurnScale: 1.08,
    missileDamageScale: 1,
  },
  "prism-citadel": {
    package: "PRISM SIEGE WING",
    roster: ["heavy", "orbiter", "bomber", "striker", "heavy", "orbiter"],
    attackStyle: "siege",
    activeTargetCount: 7,
    speedScale: 1.02,
    turnScale: 1.02,
    missileMinRange: 14,
    missileMaxRange: 51,
    missileAimTolerance: 0.78,
    missileCooldownScale: 0.86,
    missileTurnScale: 1.15,
    missileDamageScale: 1.08,
  },
};

export function skyDancerSkyRaidEnemyDoctrine(actId: SkyDancerSkyRaidActId): SkyDancerSkyRaidEnemyDoctrine {
  return SKY_DANCER_SKY_RAID_ENEMY_DOCTRINES[actId];
}

export function skyDancerSkyRaidEnemySpawnPriority(
  actId: SkyDancerSkyRaidActId,
  enemyClass: SkyDancerSkyRaidEnemyClass,
  spawnSerial: number,
): number {
  const doctrine = skyDancerSkyRaidEnemyDoctrine(actId);
  const preferred = doctrine.roster[Math.abs(Math.floor(spawnSerial)) % doctrine.roster.length];
  if (enemyClass === preferred) return 100;
  const supportingIndex = doctrine.roster.indexOf(enemyClass);
  if (supportingIndex >= 0) return 36 - supportingIndex * 2;
  return enemyClass === "heavy" ? -18 : 0;
}
