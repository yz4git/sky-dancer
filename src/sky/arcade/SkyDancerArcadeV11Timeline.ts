import type {
  SkyDancerArcadeEnemyKind,
  SkyDancerArcadeFormation,
  SkyDancerArcadeHazardKind,
  SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type { SkyDancerArcadeEnemyManeuver } from "./SkyDancerArcadeRuntime";

export type SkyDancerArcadeV11BeatKind = "entry" | "combat" | "setpiece" | "chase" | "boss";
export type SkyDancerArcadeV11RouteRisk = "SAFE" | "SCORE" | "DANGER" | "LOCKED";

export interface SkyDancerArcadeV11Beat {
  id: string;
  label: string;
  start: number;
  end: number;
  kind: SkyDancerArcadeV11BeatKind;
  setpiece: string;
  intensity: number;
  waveIntervalScale: number;
  hazardIntervalScale: number;
  cameraFov: number;
  cameraPullback: number;
  scoreBonus: number;
  preferredFormations: readonly SkyDancerArcadeFormation[];
  preferredEnemies: readonly SkyDancerArcadeEnemyKind[];
  maneuvers: readonly SkyDancerArcadeEnemyManeuver[];
  forcedHazard?: SkyDancerArcadeHazardKind;
}

const b = (
  id: string, label: string, start: number, end: number, kind: SkyDancerArcadeV11BeatKind,
  setpiece: string, intensity: number, waveIntervalScale: number, hazardIntervalScale: number,
  cameraFov: number, cameraPullback: number, scoreBonus: number,
  preferredFormations: readonly SkyDancerArcadeFormation[], preferredEnemies: readonly SkyDancerArcadeEnemyKind[],
  maneuvers: readonly SkyDancerArcadeEnemyManeuver[], forcedHazard?: SkyDancerArcadeHazardKind,
): SkyDancerArcadeV11Beat => ({
  id, label, start, end, kind, setpiece, intensity, waveIntervalScale, hazardIntervalScale,
  cameraFov, cameraPullback, scoreBonus, preferredFormations, preferredEnemies, maneuvers, forcedHazard,
});

const TIMELINES: Record<SkyDancerArcadeStageId, readonly SkyDancerArcadeV11Beat[]> = {
  "dawn-city": [
    b("city-entry", "CITY ENTRY", 0, .12, "entry", "SKYLINE APPROACH", .30, 1.18, 1.10, -.6, .2, 300, ["line","vee"], ["fighter","interceptor"], ["approach","parallel"]),
    b("tower-slalom", "SKYLINE SLALOM", .12, .30, "setpiece", "TOWER SLALOM", .62, .90, .76, 1.0, .7, 700, ["line","cross"], ["fighter","interceptor"], ["cross-pass","parallel","close-bank"], "tower"),
    b("city-gantry", "GANTRY RUN", .30, .46, "setpiece", "CITY GANTRY CORRIDOR", .78, .80, .66, 1.8, 1.1, 950, ["cross","pincer"], ["interceptor","missile-boat"], ["overtake","cross-pass"], "arch"),
    b("ace-pursuit", "ACE PURSUIT", .46, .58, "chase", "ROOFTOP PURSUIT", .92, .68, .90, 2.7, 1.7, 1300, ["pincer","vee"], ["ace","interceptor"], ["overtake","parallel","cross-pass"]),
    b("aurora-duel", "AURORA DUEL", .58, 1, "boss", "SUNRISE CHASE ARENA", 1, 1, 1, 3.2, 2.1, 1700, ["line"], ["ace"], ["close-bank"]),
  ],
  "red-canyon": [
    b("mesa-entry", "MESA ENTRY", 0, .12, "entry", "RED MESA DESCENT", .34, 1.14, 1.08, -.4, .1, 320, ["line"], ["fighter","interceptor"], ["approach"]),
    b("knife-floor", "KNIFE FLOOR", .12, .30, "setpiece", "LOW ALTITUDE KNIFE RUN", .76, .82, .72, 1.6, .8, 780, ["pincer","cross"], ["interceptor","fighter"], ["close-bank","cross-pass"], "rock"),
    b("collapse-arch", "CANYON COLLAPSE", .30, .46, "setpiece", "FALLING STONE ARCH", .9, .72, .60, 2.3, 1.4, 1050, ["cross","wall"], ["interceptor","bomber"], ["overtake","parallel"], "arch"),
    b("drill-chase", "DRILL CHASE", .46, .58, "chase", "BASALT WAKE", .96, .68, .82, 2.8, 1.8, 1350, ["pincer"], ["interceptor","bomber"], ["overtake","cross-pass"]),
    b("basalt-driller", "BASALT DRILLER", .58, 1, "boss", "CANYON CORE", 1, 1, 1, 3.0, 2.0, 1750, ["line"], ["bomber"], ["close-bank"]),
  ],
  "cloud-fleet": [
    b("cloud-break", "CLOUD BREAK", 0, .12, "entry", "WHITE SEA ENTRY", .3, 1.16, 1.12, -.8, .2, 300, ["vee"], ["fighter"], ["approach"]),
    b("fleet-screen", "FLEET SCREEN", .12, .30, "combat", "WARSHIP FORMATION", .68, .84, .88, 1.1, .8, 760, ["vee","wall"], ["fighter","missile-boat"], ["parallel","cross-pass"]),
    b("deck-run", "DECK RUN", .30, .46, "setpiece", "CAPITAL SHIP DECK PASS", .88, .72, .70, 2.0, 1.4, 1100, ["wall","spiral"], ["missile-boat","bomber"], ["overtake","parallel"], "debris"),
    b("cruiser-approach", "CRUISER APPROACH", .46, .58, "chase", "ENGINE WAKE", .94, .68, .84, 2.5, 1.8, 1350, ["vee","pincer"], ["fighter","bomber"], ["cross-pass","close-bank"]),
    b("cumulus-cruiser", "CUMULUS CRUISER", .58, 1, "boss", "FLEET FLAGSHIP", 1, 1, 1, 3.0, 2.3, 1800, ["wall"], ["bomber"], ["parallel"]),
  ],
  "storm-carrier": [
    b("thunderhead", "THUNDERHEAD", 0, .12, "entry", "STORM FRONT", .42, 1.08, .95, .2, .4, 350, ["cross"], ["fighter","interceptor"], ["approach"]),
    b("safe-lanes", "LIGHTNING SAFE LANES", .12, .30, "setpiece", "THUNDER WALL", .84, .82, .54, 1.8, 1.1, 950, ["cross","pincer"], ["interceptor","fighter"], ["cross-pass","close-bank"], "lightning"),
    b("carrier-screen", "CARRIER SCREEN", .30, .46, "combat", "ESCORT BARRAGE", .9, .70, .78, 2.3, 1.5, 1150, ["wall","spiral"], ["missile-boat","bomber","interceptor"], ["parallel","overtake"]),
    b("storm-eye", "STORM EYE", .46, .58, "chase", "TEMPEST APPROACH", .96, .68, .76, 2.8, 1.9, 1450, ["pincer","wall"], ["missile-boat","ace"], ["cross-pass","close-bank"]),
    b("tempest-carrier", "TEMPEST CARRIER", .58, 1, "boss", "STORM EYE ARENA", 1, 1, 1, 3.3, 2.4, 1900, ["wall"], ["bomber"], ["parallel"]),
  ],
  "desert-fortress": [
    b("dune-entry", "DUNE APPROACH", 0, .12, "entry", "HEAT HAZE RUN", .34, 1.14, 1.08, -.4, .2, 320, ["line"], ["fighter"], ["approach"]),
    b("wall-barrage", "WALL BARRAGE", .12, .30, "combat", "FORTRESS ARTILLERY", .72, .82, .82, 1.3, .8, 820, ["wall","line"], ["missile-boat","bomber"], ["parallel","cross-pass"], "tower"),
    b("breach-run", "SANDWALL BREACH", .30, .46, "setpiece", "FORTRESS GATE", .9, .72, .62, 2.1, 1.4, 1150, ["pincer","wall"], ["fighter","missile-boat"], ["overtake","close-bank"], "rock"),
    b("fortress-core", "FORTRESS CORE", .46, .58, "chase", "INNER DEFENSE LINE", .94, .70, .78, 2.6, 1.8, 1400, ["wall"], ["bomber","missile-boat"], ["parallel","cross-pass"]),
    b("golden-wall", "GOLDEN WALL", .58, 1, "boss", "FORTRESS HEART", 1, 1, 1, 3.0, 2.2, 1850, ["wall"], ["bomber"], ["parallel"]),
  ],
  "ice-cavern": [
    b("glacier-entry", "GLACIER ENTRY", 0, .12, "entry", "ICE MOUTH", .36, 1.12, 1.05, -.6, .2, 320, ["line"], ["interceptor"], ["approach"]),
    b("crystal-tunnel", "CRYSTAL TUNNEL", .12, .30, "setpiece", "CRYSTAL RIBS", .78, .82, .64, 1.7, 1.0, 900, ["spiral","cross"], ["interceptor","fighter"], ["cross-pass","close-bank"], "arch"),
    b("ice-collapse", "ICE COLLAPSE", .30, .46, "setpiece", "FALLING GLACIER", .92, .72, .58, 2.4, 1.5, 1200, ["pincer","spiral"], ["interceptor","ace"], ["overtake","cross-pass"], "rock"),
    b("wyrm-trace", "WYRM TRACE", .46, .58, "chase", "FROZEN WAKE", .96, .66, .84, 2.9, 1.9, 1450, ["spiral"], ["ace","interceptor"], ["parallel","close-bank"]),
    b("glacier-wyrm", "GLACIER WYRM", .58, 1, "boss", "ICE CHAMBER", 1, 1, 1, 3.2, 2.2, 1900, ["spiral"], ["ace"], ["close-bank"]),
  ],
  "floating-ruins": [
    b("ruin-entry", "SKY LABYRINTH", 0, .12, "entry", "FLOATING STONE FIELD", .38, 1.10, 1.02, -.4, .3, 340, ["vee"], ["fighter","interceptor"], ["approach"]),
    b("portal-run", "PORTAL RUN", .12, .30, "setpiece", "ANCIENT ARCHWAYS", .76, .82, .66, 1.6, 1.1, 900, ["spiral","vee"], ["fighter","ace"], ["cross-pass","parallel"], "arch"),
    b("shifting-ruins", "RUIN GATE SHIFT", .30, .46, "setpiece", "MOVING LABYRINTH", .9, .72, .64, 2.2, 1.5, 1180, ["cross","pincer"], ["interceptor","bomber","ace"], ["overtake","close-bank"], "rock"),
    b("guardian-wake", "GUARDIAN WAKE", .46, .58, "chase", "AEON APPROACH", .96, .68, .80, 2.8, 1.9, 1450, ["spiral","pincer"], ["ace","bomber"], ["parallel","cross-pass"]),
    b("aeon-guardian", "AEON GUARDIAN", .58, 1, "boss", "ANCIENT CORE", 1, 1, 1, 3.1, 2.2, 1900, ["spiral"], ["ace"], ["parallel"]),
  ],
  "night-metro": [
    b("neon-entry", "NEON ENTRY", 0, .12, "entry", "MIDNIGHT SKYLINE", .38, 1.10, 1.04, -.3, .3, 350, ["line"], ["fighter","interceptor"], ["approach"]),
    b("metro-chase", "METRO CHASE", .12, .30, "chase", "ELEVATED LINE PURSUIT", .82, .76, .88, 1.8, 1.2, 980, ["pincer","cross"], ["interceptor","ace"], ["overtake","parallel"]),
    b("neon-gantry", "NEON GANTRY", .30, .46, "setpiece", "TRANSIT GATE RUN", .92, .70, .62, 2.4, 1.6, 1250, ["cross","wall"], ["missile-boat","interceptor"], ["cross-pass","close-bank"], "arch"),
    b("phantom-pursuit", "PHANTOM PURSUIT", .46, .58, "chase", "TUNNEL EXIT DUEL", .98, .64, .84, 3.0, 2.0, 1550, ["spiral","pincer"], ["ace","interceptor"], ["overtake","parallel","cross-pass"]),
    b("neon-phantom", "NEON PHANTOM", .58, 1, "boss", "MIDNIGHT EXPRESSWAY", 1, 1, 1, 3.4, 2.4, 2000, ["spiral"], ["ace"], ["close-bank"]),
  ],
  "volcano-core": [
    b("caldera-drop", "CALDERA DROP", 0, .12, "entry", "VOLCANIC DESCENT", .44, 1.06, .96, .4, .5, 380, ["line"], ["interceptor"], ["approach"]),
    b("magma-rift", "MAGMA RIFT", .12, .30, "setpiece", "LAVA TRENCH", .82, .78, .62, 1.9, 1.2, 1000, ["wall","pincer"], ["interceptor","bomber"], ["cross-pass","close-bank"], "rock"),
    b("eruption-run", "ERUPTION RUN", .30, .46, "setpiece", "CORE SURGE", .96, .68, .54, 2.7, 1.7, 1350, ["spiral","wall"], ["bomber","missile-boat","ace"], ["overtake","parallel"], "lightning"),
    b("core-dive", "CORE DIVE", .46, .58, "chase", "MAGMA HEART APPROACH", 1, .64, .72, 3.2, 2.1, 1650, ["pincer"], ["ace","bomber"], ["cross-pass","close-bank"]),
    b("magma-heart", "MAGMA HEART", .58, 1, "boss", "ERUPTION CHAMBER", 1, 1, 1, 3.6, 2.5, 2100, ["wall"], ["bomber"], ["parallel"]),
  ],
  "orbital-ascent": [
    b("atmosphere-break", "ATMOSPHERE BREAK", 0, .12, "entry", "UPPER SKY", .40, 1.08, 1.00, .2, .5, 380, ["vee"], ["fighter","interceptor"], ["approach"]),
    b("ascent-spine", "ASCENT SPINE", .12, .30, "setpiece", "VERTICAL TRUSS RUN", .78, .78, .78, 1.9, 1.3, 1000, ["line","spiral"], ["fighter","missile-boat"], ["parallel","cross-pass"], "arch"),
    b("debris-lattice", "DEBRIS LATTICE", .30, .46, "setpiece", "ORBITAL DEBRIS FIELD", .92, .68, .56, 2.5, 1.8, 1350, ["wall","spiral"], ["interceptor","bomber","ace"], ["overtake","cross-pass"], "debris"),
    b("lance-run", "LANCE RUN", .46, .58, "chase", "WEAPON SPINE", .98, .62, .80, 3.0, 2.2, 1650, ["pincer","wall"], ["ace","missile-boat"], ["parallel","close-bank"]),
    b("orbital-lance", "ORBITAL LANCE", .58, 1, "boss", "ZERO-G WEAPON CORE", 1, 1, 1, 3.5, 2.7, 2150, ["spiral"], ["ace"], ["parallel"]),
  ],
  "prism-citadel": [
    b("prism-entry", "PRISM ENTRY", 0, .10, "entry", "CITADEL APPROACH", .48, 1.02, .96, .5, .7, 450, ["line","vee"], ["fighter","interceptor"], ["approach"]),
    b("mirror-corridor", "MIRROR CORRIDOR", .10, .22, "setpiece", "PRISM GATE ARRAY", .84, .72, .62, 2.0, 1.4, 1150, ["cross","spiral"], ["interceptor","missile-boat"], ["cross-pass","parallel"], "arch"),
    b("history-remix", "SEVEN SKY REMIX", .22, .34, "combat", "ROUTE MEMORY ASSAULT", .94, .62, .68, 2.7, 1.9, 1500, ["line","vee","cross","spiral","pincer","wall"], ["fighter","interceptor","missile-boat","bomber","ace"], ["overtake","parallel","cross-pass","close-bank"], "mine"),
    b("titan-approach", "TITAN APPROACH", .34, .44, "chase", "SOVEREIGN THRONE", 1, .58, .72, 3.4, 2.5, 1900, ["pincer","wall"], ["ace","bomber"], ["overtake","cross-pass","close-bank"], "tower"),
    b("sovereign-final", "PRISM SOVEREIGN", .44, 1, "boss", "FINAL TITAN ASSAULT", 1, 1, 1, 4.0, 3.0, 2600, ["spiral"], ["ace"], ["close-bank"]),
  ],
};

export function skyDancerArcadeV11Timeline(stageId: SkyDancerArcadeStageId): readonly SkyDancerArcadeV11Beat[] {
  return TIMELINES[stageId];
}

export function skyDancerArcadeV11BeatIndex(stageId: SkyDancerArcadeStageId, progress: number): number {
  const beats = TIMELINES[stageId];
  const p = Math.max(0, Math.min(.999999, progress));
  const index = beats.findIndex((beat) => p >= beat.start && p < beat.end);
  return index >= 0 ? index : beats.length - 1;
}

export function skyDancerArcadeV11Beat(stageId: SkyDancerArcadeStageId, progress: number): SkyDancerArcadeV11Beat {
  const beats = TIMELINES[stageId];
  return beats[skyDancerArcadeV11BeatIndex(stageId, progress)] ?? beats[beats.length - 1]!;
}

export function skyDancerArcadeV11RouteRisk(index: number, count: number): SkyDancerArcadeV11RouteRisk {
  if (count <= 1) return "LOCKED";
  if (count === 2) return index === 0 ? "SAFE" : "DANGER";
  if (index === 0) return "SAFE";
  if (index === count - 1) return "DANGER";
  return "SCORE";
}
