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

export const SKY_DANCER_SKY_RAID_ACTS: readonly SkyDancerSkyRaidAct[] = [
  {
    id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 24, killTarget: 5, setpiece: "CITY GATES",
    palette: { sky: 0x89d4f1, fog: 0xd6e9ef, ground: 0x294b5f, primary: 0x3f7188, secondary: 0xf2b775, accent: 0x64e8ff, enemy: 0xf16f62 },
  },
  {
    id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 24, endSeconds: 48, killTarget: 6, setpiece: "CANYON KNIFE RUN",
    palette: { sky: 0xeaa06e, fog: 0xca7959, ground: 0x6a302d, primary: 0x9e4934, secondary: 0xdf8d4b, accent: 0xffd36d, enemy: 0x56d3ec },
  },
  {
    id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 48, endSeconds: 72, killTarget: 7, setpiece: "FLEET BREAK",
    palette: { sky: 0x76c8ee, fog: 0xe5f4fb, ground: 0x6faed0, primary: 0xe5f2f7, secondary: 0x607f94, accent: 0xffcc65, enemy: 0xd9556c },
  },
  {
    id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 72, endSeconds: 96, killTarget: 8, setpiece: "THUNDER RAID",
    palette: { sky: 0x20364d, fog: 0x657d92, ground: 0x15384b, primary: 0x42566b, secondary: 0x7d93a8, accent: 0x91f5ff, enemy: 0xff5f7d },
  },
  {
    id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 96, endSeconds: 120, killTarget: 8, setpiece: "PRISM SIEGE",
    palette: { sky: 0x45396c, fog: 0x8c7bb6, ground: 0x272142, primary: 0x7564a5, secondary: 0x4db6bd, accent: 0xffd96f, enemy: 0xff6e94 },
  },
];

export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 104;
export const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 120;

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
  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) return local >= 4 && local < 12;
  return (local >= 7 && local < 13) || (local >= 17 && local < 21);
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
