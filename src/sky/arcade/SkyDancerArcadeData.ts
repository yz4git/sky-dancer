export type SkyDancerArcadeStageId =
  | "dawn-city"
  | "red-canyon"
  | "cloud-fleet"
  | "storm-carrier"
  | "desert-fortress"
  | "ice-cavern"
  | "floating-ruins"
  | "night-metro"
  | "volcano-core"
  | "orbital-ascent"
  | "prism-citadel";

export type SkyDancerArcadeBiome =
  | "city"
  | "canyon"
  | "cloud"
  | "storm"
  | "desert"
  | "ice"
  | "ruins"
  | "night"
  | "volcano"
  | "orbit"
  | "citadel";

export type SkyDancerArcadeBossKind =
  | "ace-wing"
  | "canyon-drill"
  | "fleet-cruiser"
  | "storm-carrier"
  | "wall-fortress"
  | "ice-wyrm"
  | "ruin-guardian"
  | "metro-phantom"
  | "magma-core"
  | "orbital-lance"
  | "prism-titan";

export type SkyDancerArcadeEnemyKind = "fighter" | "interceptor" | "missile-boat" | "bomber" | "ace";
export type SkyDancerArcadeHazardKind = "tower" | "rock" | "lightning" | "mine" | "arch" | "debris";
export type SkyDancerArcadeFormation = "line" | "vee" | "cross" | "spiral" | "pincer" | "wall";

export interface SkyDancerArcadePalette {
  sky: number;
  fog: number;
  ground: number;
  primary: number;
  secondary: number;
  accent: number;
  enemy: number;
}

export interface SkyDancerArcadeStageDefinition {
  id: SkyDancerArcadeStageId;
  order: number;
  act: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  name: string;
  shortName: string;
  subtitle: string;
  biome: SkyDancerArcadeBiome;
  durationSeconds: number;
  courseSpeed: number;
  curveStrength: number;
  turbulence: number;
  waveIntervalSeconds: number;
  enemies: readonly SkyDancerArcadeEnemyKind[];
  formations: readonly SkyDancerArcadeFormation[];
  hazards: readonly SkyDancerArcadeHazardKind[];
  boss: SkyDancerArcadeBossKind;
  bossName: string;
  next: readonly SkyDancerArcadeStageId[];
  palette: SkyDancerArcadePalette;
}

export type SkyDancerGameMode = "turbo-hunt" | "sky-raid" | "arcade-run" | "stage-practice";

export interface SkyDancerStartRequest {
  mode: SkyDancerGameMode;
  difficulty: "normal" | "hard";
  practiceStageId?: SkyDancerArcadeStageId;
  paintScheme?: "default" | "sunset" | "storm" | "prism";
  loadout?: "standard" | "missile-focus" | "gun-focus";
  seed?: number;
}

export const SKY_DANCER_ARCADE_FIRST_STAGE: SkyDancerArcadeStageId = "dawn-city";
export const SKY_DANCER_ARCADE_FINAL_STAGE: SkyDancerArcadeStageId = "prism-citadel";
export const SKY_DANCER_ARCADE_STAGES_PER_RUN = 7;
export const SKY_DANCER_ARCADE_RUN_DURATION_SECONDS = 240;
export const SKY_DANCER_ARCADE_MAX_LOCKS = 8;
export const SKY_DANCER_ARCADE_MAX_CONTINUES = 2;

export const SKY_DANCER_ARCADE_STAGES: readonly SkyDancerArcadeStageDefinition[] = [
  {
    id: "dawn-city",
    order: 1,
    act: 1,
    name: "DAWN CITY",
    shortName: "CITY",
    subtitle: "SKYSCRAPER IGNITION",
    biome: "city",
    durationSeconds: 28,
    courseSpeed: 96,
    curveStrength: 0.34,
    turbulence: 0.08,
    waveIntervalSeconds: 2.25,
    enemies: ["fighter", "interceptor", "missile-boat"],
    formations: ["line", "vee", "cross"],
    hazards: ["tower", "arch"],
    boss: "ace-wing",
    bossName: "AURORA ACE WING",
    next: ["red-canyon", "cloud-fleet"],
    palette: { sky: 0x8ed3f1, fog: 0xcfe8ef, ground: 0x28485b, primary: 0x385d72, secondary: 0xf2b77a, accent: 0x57e3ff, enemy: 0xf16f62 },
  },
  {
    id: "red-canyon",
    order: 2,
    act: 2,
    name: "RED CANYON",
    shortName: "CANYON",
    subtitle: "LOW ALTITUDE KNIFE RUN",
    biome: "canyon",
    durationSeconds: 30,
    courseSpeed: 89,
    curveStrength: 0.62,
    turbulence: 0.17,
    waveIntervalSeconds: 2.45,
    enemies: ["interceptor", "fighter", "bomber"],
    formations: ["pincer", "cross", "line"],
    hazards: ["rock", "arch", "debris"],
    boss: "canyon-drill",
    bossName: "BASALT DRILLER",
    next: ["storm-carrier"],
    palette: { sky: 0xf0a56f, fog: 0xd89065, ground: 0x6f2f2b, primary: 0x9d4935, secondary: 0xd98245, accent: 0xffd172, enemy: 0x57c9e8 },
  },
  {
    id: "cloud-fleet",
    order: 3,
    act: 2,
    name: "CLOUD FLEET",
    shortName: "FLEET",
    subtitle: "SEA OF WHITE WARSHIPS",
    biome: "cloud",
    durationSeconds: 30,
    courseSpeed: 98,
    curveStrength: 0.4,
    turbulence: 0.12,
    waveIntervalSeconds: 2.35,
    enemies: ["fighter", "missile-boat", "bomber"],
    formations: ["vee", "wall", "spiral"],
    hazards: ["debris", "mine"],
    boss: "fleet-cruiser",
    bossName: "CUMULUS CRUISER",
    next: ["storm-carrier"],
    palette: { sky: 0x79c7ef, fog: 0xe6f4fb, ground: 0x6fafd0, primary: 0xe8f4f8, secondary: 0x5d8299, accent: 0xffcb63, enemy: 0xd75268 },
  },
  {
    id: "storm-carrier",
    order: 4,
    act: 3,
    name: "STORM CARRIER",
    shortName: "STORM",
    subtitle: "THUNDERHEAD INTERCEPT",
    biome: "storm",
    durationSeconds: 32,
    courseSpeed: 86,
    curveStrength: 0.48,
    turbulence: 0.28,
    waveIntervalSeconds: 2.2,
    enemies: ["fighter", "interceptor", "missile-boat", "bomber"],
    formations: ["cross", "pincer", "wall", "spiral"],
    hazards: ["lightning", "debris", "mine"],
    boss: "storm-carrier",
    bossName: "TEMPEST CARRIER",
    next: ["desert-fortress", "ice-cavern", "floating-ruins"],
    palette: { sky: 0x22384e, fog: 0x70879a, ground: 0x14364c, primary: 0x394d63, secondary: 0x778da2, accent: 0x8df3ff, enemy: 0xff5c7e },
  },
  {
    id: "desert-fortress",
    order: 5,
    act: 4,
    name: "DESERT FORTRESS",
    shortName: "DESERT",
    subtitle: "SANDWALL BREACH",
    biome: "desert",
    durationSeconds: 34,
    courseSpeed: 91,
    curveStrength: 0.3,
    turbulence: 0.2,
    waveIntervalSeconds: 2.45,
    enemies: ["fighter", "missile-boat", "bomber"],
    formations: ["line", "wall", "pincer"],
    hazards: ["tower", "rock", "mine"],
    boss: "wall-fortress",
    bossName: "GOLDEN WALL",
    next: ["night-metro", "volcano-core"],
    palette: { sky: 0xe2ad68, fog: 0xd9a25e, ground: 0x8f612d, primary: 0xc28b4a, secondary: 0x5d4832, accent: 0xffe08a, enemy: 0x3c8eb8 },
  },
  {
    id: "ice-cavern",
    order: 6,
    act: 4,
    name: "ICE CAVERN",
    shortName: "ICE",
    subtitle: "CRYSTAL TUNNEL BREAK",
    biome: "ice",
    durationSeconds: 34,
    courseSpeed: 80,
    curveStrength: 0.7,
    turbulence: 0.1,
    waveIntervalSeconds: 2.5,
    enemies: ["interceptor", "fighter", "ace"],
    formations: ["spiral", "cross", "pincer"],
    hazards: ["arch", "rock", "debris"],
    boss: "ice-wyrm",
    bossName: "GLACIER WYRM",
    next: ["night-metro", "volcano-core"],
    palette: { sky: 0x8ccbea, fog: 0xd9f5ff, ground: 0x4f7995, primary: 0x9ce7f6, secondary: 0x55789e, accent: 0xf4ffff, enemy: 0xd75d8d },
  },
  {
    id: "floating-ruins",
    order: 7,
    act: 4,
    name: "FLOATING RUINS",
    shortName: "RUINS",
    subtitle: "ANCIENT SKY LABYRINTH",
    biome: "ruins",
    durationSeconds: 34,
    courseSpeed: 96,
    curveStrength: 0.56,
    turbulence: 0.15,
    waveIntervalSeconds: 2.35,
    enemies: ["fighter", "interceptor", "ace", "bomber"],
    formations: ["spiral", "vee", "cross"],
    hazards: ["rock", "arch", "mine"],
    boss: "ruin-guardian",
    bossName: "AEON GUARDIAN",
    next: ["night-metro", "volcano-core"],
    palette: { sky: 0x82b8b0, fog: 0xbcd4c4, ground: 0x50684f, primary: 0x797d61, secondary: 0xc2ad77, accent: 0x77f3cf, enemy: 0xa9536e },
  },
  {
    id: "night-metro",
    order: 8,
    act: 5,
    name: "NIGHT METRO",
    shortName: "METRO",
    subtitle: "NEON PURSUIT",
    biome: "night",
    durationSeconds: 36,
    courseSpeed: 96,
    curveStrength: 0.58,
    turbulence: 0.11,
    waveIntervalSeconds: 2.15,
    enemies: ["fighter", "interceptor", "missile-boat", "ace"],
    formations: ["cross", "pincer", "spiral", "wall"],
    hazards: ["tower", "arch", "debris"],
    boss: "metro-phantom",
    bossName: "NEON PHANTOM",
    next: ["orbital-ascent"],
    palette: { sky: 0x10172d, fog: 0x273554, ground: 0x10182a, primary: 0x1c3155, secondary: 0x7748a8, accent: 0x41f2ff, enemy: 0xff4f91 },
  },
  {
    id: "volcano-core",
    order: 9,
    act: 5,
    name: "VOLCANO CORE",
    shortName: "VOLCANO",
    subtitle: "MAGMA PRESSURE DIVE",
    biome: "volcano",
    durationSeconds: 36,
    courseSpeed: 103,
    curveStrength: 0.68,
    turbulence: 0.32,
    waveIntervalSeconds: 2.25,
    enemies: ["interceptor", "bomber", "missile-boat", "ace"],
    formations: ["wall", "pincer", "spiral"],
    hazards: ["rock", "lightning", "debris"],
    boss: "magma-core",
    bossName: "MAGMA HEART",
    next: ["orbital-ascent"],
    palette: { sky: 0x351a26, fog: 0x6f3534, ground: 0x2a171a, primary: 0x5e2c29, secondary: 0xa9472d, accent: 0xffa62f, enemy: 0x5dbed0 },
  },
  {
    id: "orbital-ascent",
    order: 10,
    act: 6,
    name: "ORBITAL ASCENT",
    shortName: "ORBIT",
    subtitle: "VERTICAL LANCE RUN",
    biome: "orbit",
    durationSeconds: 38,
    courseSpeed: 98,
    curveStrength: 0.26,
    turbulence: 0.18,
    waveIntervalSeconds: 2.1,
    enemies: ["fighter", "interceptor", "missile-boat", "ace", "bomber"],
    formations: ["line", "spiral", "wall", "vee"],
    hazards: ["debris", "arch", "mine"],
    boss: "orbital-lance",
    bossName: "ORBITAL LANCE",
    next: ["prism-citadel"],
    palette: { sky: 0x071023, fog: 0x1f3550, ground: 0x142a47, primary: 0xdfe9f2, secondary: 0x546d88, accent: 0x59ddff, enemy: 0xff6576 },
  },
  {
    id: "prism-citadel",
    order: 11,
    act: 7,
    name: "PRISM CITADEL",
    shortName: "CITADEL",
    subtitle: "FINAL TITAN ASSAULT",
    biome: "citadel",
    durationSeconds: 42,
    courseSpeed: 103,
    curveStrength: 0.44,
    turbulence: 0.24,
    waveIntervalSeconds: 1.95,
    enemies: ["fighter", "interceptor", "missile-boat", "bomber", "ace"],
    formations: ["line", "vee", "cross", "spiral", "pincer", "wall"],
    hazards: ["tower", "debris", "mine", "arch"],
    boss: "prism-titan",
    bossName: "PRISM SOVEREIGN",
    next: [],
    palette: { sky: 0x110d2c, fog: 0x33295d, ground: 0x17122f, primary: 0x4b3c78, secondary: 0xb69cf4, accent: 0x77f7ff, enemy: 0xff557d },
  },
] as const;

export const SKY_DANCER_ARCADE_STAGE_BY_ID = new Map<SkyDancerArcadeStageId, SkyDancerArcadeStageDefinition>(
  SKY_DANCER_ARCADE_STAGES.map((stage) => [stage.id, stage]),
);

export function skyDancerArcadeStageById(id: SkyDancerArcadeStageId): SkyDancerArcadeStageDefinition {
  const stage = SKY_DANCER_ARCADE_STAGE_BY_ID.get(id);
  if (!stage) throw new Error(`Unknown Sky Dancer arcade stage: ${id}`);
  return stage;
}

export function enumerateSkyDancerArcadeRoutes(): SkyDancerArcadeStageId[][] {
  const routes: SkyDancerArcadeStageId[][] = [];
  const visit = (id: SkyDancerArcadeStageId, path: SkyDancerArcadeStageId[]) => {
    const nextPath = [...path, id];
    const stage = skyDancerArcadeStageById(id);
    if (stage.next.length === 0) {
      routes.push(nextPath);
      return;
    }
    for (const next of stage.next) visit(next, nextPath);
  };
  visit(SKY_DANCER_ARCADE_FIRST_STAGE, []);
  return routes;
}

export function skyDancerArcadeRunMinutes(route: readonly SkyDancerArcadeStageId[]): number {
  return route.reduce((total, id) => total + skyDancerArcadeStageById(id).durationSeconds, 0) / 60;
}
