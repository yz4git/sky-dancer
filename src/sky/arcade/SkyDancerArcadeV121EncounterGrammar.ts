import type {
  SkyDancerArcadeEnemyKind,
  SkyDancerArcadeFormation,
  SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type {
  SkyDancerArcadeV12DirectorMode,
  SkyDancerArcadeV12Maneuver,
} from "./SkyDancerArcadeV12Director";

export interface SkyDancerArcadeV121EncounterPhase {
  id: string;
  label: string;
  delay: number;
  countScale: number;
  countDelta: number;
  formation: SkyDancerArcadeFormation;
  maneuver: SkyDancerArcadeV12Maneuver;
  secondaryManeuver: SkyDancerArcadeV12Maneuver;
  enemyBias: readonly SkyDancerArcadeEnemyKind[];
  depthOffset: number;
}

export interface SkyDancerArcadeV121EncounterGrammar {
  id: string;
  label: string;
  intent: string;
  signature: string;
  cadenceScale: number;
  phases: readonly SkyDancerArcadeV121EncounterPhase[];
}

interface StageGrammarProfile {
  labels: readonly [string, string];
  intents: readonly [string, string];
  formations: readonly [
    readonly [SkyDancerArcadeFormation, SkyDancerArcadeFormation, SkyDancerArcadeFormation],
    readonly [SkyDancerArcadeFormation, SkyDancerArcadeFormation, SkyDancerArcadeFormation],
  ];
  maneuvers: readonly [
    readonly [SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver],
    readonly [SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver, SkyDancerArcadeV12Maneuver],
  ];
  enemyBias: readonly SkyDancerArcadeEnemyKind[];
}

const STAGE_GRAMMARS: Record<SkyDancerArcadeStageId, StageGrammarProfile> = {
  "dawn-city": {
    labels: ["SKYLINE KNIFE", "GANTRY PINCER"],
    intents: ["PROBE · CROSSCUT · ACE FINISH", "BAIT · GATE CROSS · OVERTAKE"],
    formations: [["vee", "cross", "pincer"], ["line", "wall", "cross"]],
    maneuvers: [["approach", "cross-pass", "overtake"], ["close-bank", "parallel", "cross-pass"]],
    enemyBias: ["fighter", "interceptor", "ace"],
  },
  "red-canyon": {
    labels: ["RIDGE HOOK", "KNIFE PASS"],
    intents: ["LOW ENTRY · ROCK CROSS · CLIMB OUT", "BAIT · PINCER · CLOSE BANK"],
    formations: [["line", "pincer", "vee"], ["vee", "cross", "pincer"]],
    maneuvers: [["approach", "cross-pass", "close-bank"], ["parallel", "close-bank", "overtake"]],
    enemyBias: ["fighter", "interceptor", "bomber"],
  },
  "cloud-fleet": {
    labels: ["ESCORT BREAK", "DECK CROSS"],
    intents: ["SCREEN · BROADSIDE · HUNTER CUT", "BAIT · PARALLEL · CROSS DECK"],
    formations: [["wall", "line", "pincer"], ["vee", "wall", "cross"]],
    maneuvers: [["parallel", "cross-pass", "overtake"], ["approach", "parallel", "cross-pass"]],
    enemyBias: ["missile-boat", "fighter", "interceptor"],
  },
  "storm-carrier": {
    labels: ["THUNDER BOX", "LIGHTNING RUN"],
    intents: ["PROBE · WALL · ESCAPE LANE", "CROSS · JAM · CLOSE BANK"],
    formations: [["cross", "wall", "vee"], ["pincer", "cross", "line"]],
    maneuvers: [["approach", "parallel", "cross-pass"], ["cross-pass", "parallel", "close-bank"]],
    enemyBias: ["missile-boat", "interceptor", "bomber"],
  },
  "desert-fortress": {
    labels: ["WALL BREACH", "SAND PINCER"],
    intents: ["SCREEN · BREACH · HEAVY EXIT", "BAIT · PINCER · BREAK LINE"],
    formations: [["wall", "line", "pincer"], ["vee", "pincer", "wall"]],
    maneuvers: [["parallel", "approach", "close-bank"], ["approach", "cross-pass", "parallel"]],
    enemyBias: ["bomber", "missile-boat", "fighter"],
  },
  "ice-cavern": {
    labels: ["CRYSTAL SLALOM", "ICE CROSS"],
    intents: ["THREAD · CROSS · SNAP EXIT", "PROBE · SPIRAL · CLOSE BANK"],
    formations: [["vee", "cross", "line"], ["spiral", "cross", "pincer"]],
    maneuvers: [["approach", "cross-pass", "overtake"], ["close-bank", "cross-pass", "close-bank"]],
    enemyBias: ["fighter", "interceptor", "ace"],
  },
  "floating-ruins": {
    labels: ["RUIN WEAVE", "PORTAL TRAP"],
    intents: ["WEAVE · CROSS · GUARDIAN CUT", "BAIT · WALL · PORTAL EXIT"],
    formations: [["spiral", "cross", "vee"], ["line", "wall", "pincer"]],
    maneuvers: [["close-bank", "cross-pass", "overtake"], ["approach", "parallel", "cross-pass"]],
    enemyBias: ["ace", "interceptor", "missile-boat"],
  },
  "night-metro": {
    labels: ["NEON CROSS", "TUNNEL KNIFE"],
    intents: ["CHASE · CROSS · PHANTOM EXIT", "BAIT · WALL · OVERTAKE"],
    formations: [["cross", "pincer", "vee"], ["line", "wall", "cross"]],
    maneuvers: [["overtake", "cross-pass", "close-bank"], ["approach", "parallel", "overtake"]],
    enemyBias: ["interceptor", "ace", "fighter"],
  },
  "volcano-core": {
    labels: ["MAGMA SPIRAL", "CORE PRESS"],
    intents: ["SPIRAL · CROSS · BREAK OUT", "SCREEN · PRESS · CLOSE BANK"],
    formations: [["spiral", "cross", "pincer"], ["wall", "vee", "cross"]],
    maneuvers: [["approach", "cross-pass", "overtake"], ["parallel", "close-bank", "cross-pass"]],
    enemyBias: ["bomber", "interceptor", "ace"],
  },
  "orbital-ascent": {
    labels: ["ORBITAL CROSS", "DEBRIS LANCE"],
    intents: ["PARALLEL · CROSS · HIGH EXIT", "PROBE · LANCE · OVERTAKE"],
    formations: [["cross", "line", "vee"], ["vee", "pincer", "cross"]],
    maneuvers: [["parallel", "cross-pass", "overtake"], ["approach", "close-bank", "overtake"]],
    enemyBias: ["interceptor", "missile-boat", "ace"],
  },
  "prism-citadel": {
    labels: ["PRISM GAUNTLET", "SOVEREIGN KNIFE"],
    intents: ["WALL · CROSS · FINAL CUT", "BAIT · SPIRAL · ACE EXIT"],
    formations: [["wall", "cross", "pincer"], ["vee", "spiral", "cross"]],
    maneuvers: [["parallel", "cross-pass", "close-bank"], ["approach", "close-bank", "overtake"]],
    enemyBias: ["ace", "missile-boat", "bomber"],
  },
};

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 33 + text.charCodeAt(index)) >>> 0;
  return hash;
}

function phase(
  id: string,
  label: string,
  delay: number,
  countScale: number,
  formation: SkyDancerArcadeFormation,
  maneuver: SkyDancerArcadeV12Maneuver,
  secondaryManeuver: SkyDancerArcadeV12Maneuver,
  enemyBias: readonly SkyDancerArcadeEnemyKind[],
  depthOffset = 0,
  countDelta = 0,
): SkyDancerArcadeV121EncounterPhase {
  return { id, label, delay, countScale, countDelta, formation, maneuver, secondaryManeuver, enemyBias, depthOffset };
}

export function skyDancerArcadeV121EncounterGrammar(
  stageId: SkyDancerArcadeStageId,
  mode: SkyDancerArcadeV12DirectorMode,
  waveSerial: number,
  beatId: string,
  intensity: number,
  hard: boolean,
): SkyDancerArcadeV121EncounterGrammar {
  const profile = STAGE_GRAMMARS[stageId];
  const modeOffset = mode === "armor-screen" ? 1 : mode === "hunter-sweep" ? 3 : mode === "jammer-net" ? 5 : mode === "relief-window" ? 7 : 0;
  const variant = (Math.max(0, waveSerial) + hashText(beatId) + modeOffset) % 2 as 0 | 1;
  const formations = profile.formations[variant];
  const maneuvers = profile.maneuvers[variant];
  const label = profile.labels[variant];
  const intent = profile.intents[variant];
  const acePursuit = stageId === "dawn-city" && beatId === "ace-pursuit";
  const pressureBias = hard || intensity > .86 ? 1 : 0;

  if (mode === "relief-window") {
    return {
      id: `${stageId}-${variant}-relief`,
      label: "OPEN SKY",
      intent: "LIGHT PASS · EXIT LANE",
      signature: `${stageId}:relief:${variant}`,
      cadenceScale: 1.24,
      phases: [
        phase("light-pass", "LIGHT PASS", 0, .42, "line", "approach", "cross-pass", ["fighter", "interceptor"], 6),
        phase("exit-lane", "EXIT LANE", .72, .42, "vee", "cross-pass", "approach", ["fighter", "interceptor"], 10),
      ],
    };
  }

  if (mode === "armor-screen") {
    return {
      id: `${stageId}-${variant}-armor`,
      label,
      intent,
      signature: `${stageId}:armor:${variant}`,
      cadenceScale: .98,
      phases: [
        phase("screen-in", "SCREEN IN", 0, .7, formations[0], "parallel", maneuvers[0], ["bomber", "missile-boat", ...profile.enemyBias], 2),
        phase("brace-cross", "BRACE CROSS", .48, .56, formations[1], "cross-pass", maneuvers[1], ["bomber", "missile-boat", "ace"], -2, pressureBias),
        phase("breaker", acePursuit ? "ACE BREAKER" : "BREAKER", 1.02, .44, formations[2], maneuvers[2], "close-bank", acePursuit ? ["ace", "interceptor"] : ["ace", "bomber", ...profile.enemyBias], -5),
      ],
    };
  }

  if (mode === "hunter-sweep") {
    return {
      id: `${stageId}-${variant}-hunter`,
      label,
      intent,
      signature: `${stageId}:hunter:${variant}`,
      cadenceScale: .94,
      phases: [
        phase("feint", "FEINT", 0, .62, formations[0], "approach", "close-bank", ["interceptor", "fighter", ...profile.enemyBias], 5),
        phase("crosscut", "CROSSCUT", .4, .6, formations[1], "cross-pass", maneuvers[1], ["interceptor", "ace", "fighter"], -3, pressureBias),
        phase("overtake", acePursuit ? "ACE OVERTAKE" : "OVERTAKE", .86, .5, formations[2], "overtake", maneuvers[2], ["ace", "interceptor"], -8),
      ],
    };
  }

  if (mode === "jammer-net") {
    return {
      id: `${stageId}-${variant}-jammer`,
      label,
      intent,
      signature: `${stageId}:jammer:${variant}`,
      cadenceScale: .97,
      phases: [
        phase("bait", "BAIT", 0, .62, formations[0], maneuvers[0], "approach", ["fighter", "interceptor", ...profile.enemyBias], 4),
        phase("jammer-line", "JAMMER LINE", .46, .58, formations[1], "parallel", "cross-pass", ["missile-boat", "bomber", "ace"], 0, pressureBias),
        phase("close-net", "CLOSE NET", .96, .46, formations[2], "close-bank", maneuvers[2], ["missile-boat", "ace", ...profile.enemyBias], -5),
      ],
    };
  }

  return {
    id: `${stageId}-${variant}-mixed`,
    label,
    intent,
    signature: `${stageId}:mixed:${variant}`,
    cadenceScale: 1,
    phases: [
      phase("probe", "PROBE", 0, .62, formations[0], maneuvers[0], "approach", profile.enemyBias, 5),
      phase("crosscut", "CROSSCUT", .48, .56, formations[1], maneuvers[1], "cross-pass", profile.enemyBias, 0, pressureBias),
      phase("finish", acePursuit ? "ACE FINISH" : "FINISH", 1.02, .46, formations[2], maneuvers[2], "overtake", acePursuit ? ["ace", "interceptor"] : profile.enemyBias, -5),
    ],
  };
}
