import {
  SKY_DANCER_ARCADE_FINAL_STAGE,
  SKY_DANCER_ARCADE_FIRST_STAGE,
  SKY_DANCER_ARCADE_MAX_CONTINUES,
  SKY_DANCER_ARCADE_MAX_LOCKS,
  SKY_DANCER_ARCADE_RUN_DURATION_SECONDS,
  skyDancerArcadeStageById,
  type SkyDancerArcadeEnemyKind,
  type SkyDancerArcadeFormation,
  type SkyDancerArcadeHazardKind,
  type SkyDancerArcadeStageDefinition,
  type SkyDancerArcadeStageId,
} from "./SkyDancerArcadeData";
import type { SkyDancerArcadeLoadout, SkyDancerArcadePaintScheme, SkyDancerArcadeRank } from "./SkyDancerArcadeProgress";
import {
  skyDancerArcadeArmorRatio,
  skyDancerArcadeBossPhase,
  skyDancerArcadeBossStartProgress,
  skyDancerArcadeEnemyRole,
  skyDancerArcadeStageEventCheckpoint,
  skyDancerArcadeStageEvolutionProfile,
  skyDancerArcadeTargetPriority,
  type SkyDancerArcadeBossPhase,
  type SkyDancerArcadeEnemyRole,
} from "./SkyDancerArcadeV10Systems";
import {
  skyDancerArcadeV11Beat,
  skyDancerArcadeV11BeatIndex,
  skyDancerArcadeV11RouteRisk,
  type SkyDancerArcadeV11BeatKind,
  type SkyDancerArcadeV11RouteRisk,
} from "./SkyDancerArcadeV11Timeline";
import {
  skyDancerArcadeV11BossMechanicLabel,
  skyDancerArcadeV11BossMotion,
  skyDancerArcadeV11BossProfile,
  skyDancerArcadeV11BossWeakpointOpen,
} from "./SkyDancerArcadeV11Bosses";
import {
  skyDancerArcadeV11ScoreBreakdown,
  skyDancerArcadeV11StageMedals,
  type SkyDancerArcadeV11MedalResult,
  type SkyDancerArcadeV11ScoreBreakdown,
} from "./SkyDancerArcadeV11Scoring";
import {
  skyDancerArcadeV12CombatPlan,
  type SkyDancerArcadeV12DirectorMode,
  type SkyDancerArcadeV12EncounterPlan,
  type SkyDancerArcadeV12PlayerStyle,
} from "./SkyDancerArcadeV12Director";
import {
  skyDancerArcadeV121EncounterGrammar,
  type SkyDancerArcadeV121EncounterGrammar,
  type SkyDancerArcadeV121EncounterPhase,
} from "./SkyDancerArcadeV121EncounterGrammar";
import {
  skyDancerArcadeV122EncounterContinuity,
  type SkyDancerArcadeV122FlowSign,
} from "./SkyDancerArcadeV122EncounterContinuity";
import { skyDancerArcadeV25ClosureScale, skyDancerArcadeV25Step } from "./SkyDancerArcadeV25CoordinatedFlight";
import { skyDancerArcadeV26FormationCommand } from "./SkyDancerArcadeV26FormationTactics";
import {
  SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
  SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
  skyDancerArcadeV27DensityCaps,
} from "./SkyDancerArcadeV27CombatReadability";
import { skyDancerArcadeV271CombatCorridorCrowded } from "./SkyDancerArcadeV271ScreenPolish";
import {
  SKY_DANCER_ARCADE_V404_RIVAL_NAME,
  skyDancerArcadeV404RivalAdaptation,
  skyDancerArcadeV404RivalAdvantageTarget,
  skyDancerArcadeV404RivalEncounterForSection,
  skyDancerArcadeV404RivalHp,
  skyDancerArcadeV404RivalManeuver,
  skyDancerArcadeV404RivalManeuverSign,
  skyDancerArcadeV404RivalPressureGain,
  type SkyDancerArcadeV404RivalOutcome,
} from "./SkyDancerArcadeV404RivalAce";
import {
  skyDancerArcadeV405FinalBossContract,
  skyDancerArcadeV405FinalBossPhase,
  type SkyDancerArcadeV405FinalBossContract,
  type SkyDancerArcadeV405FinalBossForm,
  type SkyDancerArcadeV405ResolvedRivalOutcome,
  type SkyDancerArcadeV405RivalMemory,
  type SkyDancerArcadeV405RouteMemory,
} from "./SkyDancerArcadeV405RouteReactiveFinalBoss";
import {
  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,
  SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_X,
  SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y,
  SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS,
  SKY_DANCER_ARCADE_V40_FLOATING_PORTALS,
  SKY_DANCER_ARCADE_V40_ICE_APERTURES,
  SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS,
  SKY_DANCER_ARCADE_V40_MAGMA_END,
  SKY_DANCER_ARCADE_V40_MAGMA_ESCAPE_SCORE,
  SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD,
  SKY_DANCER_ARCADE_V40_MAGMA_SAFE_LEAD,
  SKY_DANCER_ARCADE_V40_MAGMA_START,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_SCORE,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START,
  SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS,
  SKY_DANCER_ARCADE_V40_ORBIT_COMPLETE_SCORE,
  SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH,
  SKY_DANCER_ARCADE_V40_ORBIT_END,
  SKY_DANCER_ARCADE_V40_ORBIT_START,
  SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS,
  SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE,
  SKY_DANCER_ARCADE_V40_PRISM_PERFECT_BONUS,
  SKY_DANCER_ARCADE_V40_PRISM_TRIALS,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START,
  SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
  SKY_DANCER_ARCADE_V40_STORM_LANES,
  skyDancerArcadeV40DawnCityGateAnchorDistance,
  skyDancerArcadeV40FleetTargetAnchorDistance,
  skyDancerArcadeV40FortressBreachAnchorDistance,
  skyDancerArcadeV40FloatingPortalAnchorDistance,
  skyDancerArcadeV40IceApertureAnchorDistance,
  skyDancerArcadeV40IceApertureScale,
  skyDancerArcadeV40IceApertureX,
  skyDancerArcadeV40MagmaPressure,
  skyDancerArcadeV40NeonPhantomX,
  skyDancerArcadeV40NeonPhantomY,
  skyDancerArcadeV40OrbitalSafeX,
  skyDancerArcadeV40PrismTrialAnchorDistance,
  skyDancerArcadeV40PrismTrialStageId,
  skyDancerArcadeV40PrismTrialX,
  skyDancerArcadeV40PrismTrialY,
  skyDancerArcadeV40StormLaneAnchorDistance,
  skyDancerArcadeV40StormLaneX,
  skyDancerArcadeV40RouteDoctrine,
  skyDancerArcadeV40RouteEffect,
  skyDancerArcadeV40WorldProfile,
  type SkyDancerArcadeV40PortalDoctrine,
  type SkyDancerArcadeV40RouteDoctrine,
} from "./SkyDancerArcadeV40WorldBreak";

export type SkyDancerArcadeStatus =
  | "running"
  | "paused"
  | "stage-clear"
  | "continue"
  | "game-over"
  | "run-clear"
  | "practice-clear";

export type SkyDancerArcadeEnemyManeuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";
export type SkyDancerArcadeLoadoutReaction = "none" | "fusion-link" | "ripple-shock" | "twin-cannon";
export type SkyDancerArcadeEnemyCounterplay = "none" | "armor-brace" | "evasive-roll" | "turbo-jammer";

export interface SkyDancerArcadeRuntimeOptions {
  difficulty: "normal" | "hard";
  mode: "arcade-run" | "stage-practice";
  startStageId?: SkyDancerArcadeStageId;
  paintScheme?: SkyDancerArcadePaintScheme;
  loadout?: SkyDancerArcadeLoadout;
  seed?: number;
}

export interface SkyDancerArcadeEnemySnapshot {
  id: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  x: number;
  y: number;
  depth: number;
  hp: number;
  maxHp: number;
  locked: boolean;
  boss: boolean;
  phase: number;
  maneuver: SkyDancerArcadeEnemyManeuver;
  role: SkyDancerArcadeEnemyRole;
  armor: number;
  maxArmor: number;
  bossPhase: SkyDancerArcadeBossPhase;
  weakpointOpen: boolean;
  stagger: number;
  counterplay: SkyDancerArcadeEnemyCounterplay;
  counterplayIntensity: number;
  worldBreakTarget?: boolean;
  worldBreakTargetIndex?: number;
  worldBreakLabel?: string;
  // V40.4: NOVA-7 is a persistent named opponent, still rendered through the proven ace airframe.
  rivalAce?: boolean;
  rivalAceAppearance?: number;
  rivalAceResolved?: boolean;
  finalBossForm?: SkyDancerArcadeV405FinalBossForm;
  finalBossAccent?: number;
  finalBossReactive?: boolean;
}

export interface SkyDancerArcadeProjectileSnapshot {
  id: number;
  owner: "player-gun" | "player-missile" | "enemy";
  x: number;
  y: number;
  depth: number;
  targetEnemyId: number | null;
}

export interface SkyDancerArcadeImpactSnapshot {
  serial: number;
  enemyId: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  x: number;
  y: number;
  depth: number;
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  boss: boolean;
  missile: boolean;
  destroyed: boolean;
  reaction: SkyDancerArcadeLoadoutReaction;
  armorBreak: boolean;
  counterplay: SkyDancerArcadeEnemyCounterplay;
}

export interface SkyDancerArcadeHazardSnapshot {
  id: number;
  kind: SkyDancerArcadeHazardKind;
  x: number;
  y: number;
  depth: number;
  scale: number;
}

export interface SkyDancerArcadeWorldBreakGateSnapshot {
  id: number;
  index: number;
  x: number;
  y: number;
  depth: number;
  radiusX: number;
  radiusY: number;
  resolved: boolean;
  success: boolean | null;
}

export interface SkyDancerArcadeWorldBreakPortalSnapshot {
  index: number;
  x: number;
  y: number;
  depth: number;
  radius: number;
  doctrine: SkyDancerArcadeV40PortalDoctrine;
  label: string;
  selected: boolean;
}

export interface SkyDancerArcadeSnapshot {
  status: SkyDancerArcadeStatus;
  difficulty: "normal" | "hard";
  mode: "arcade-run" | "stage-practice";
  paintScheme: SkyDancerArcadePaintScheme;
  loadout: SkyDancerArcadeLoadout;
  stage: SkyDancerArcadeStageDefinition;
  stageNumber: number;
  stagesCleared: number;
  route: SkyDancerArcadeStageId[];
  stageTimeSeconds: number;
  stageDurationSeconds: number;
  stageProgress: number;
  runTimeSeconds: number;
  runDurationSeconds: number;
  distance: number;
  playerX: number;
  playerY: number;
  playerHp: number;
  playerMaxHp: number;
  turbo: number;
  turboActive: boolean;
  fireActive: boolean;
  lockActive: boolean;
  lockedCount: number;
  score: number;
  stageScore: number;
  rank: SkyDancerArcadeRank;
  chain: number;
  chainTimer: number;
  enemiesDefeated: number;
  damageTaken: number;
  nearMisses: number;
  multiLockKills: number;
  turboSmashes: number;
  bestChain: number;
  armorBreaks: number;
  formationBreaks: number;
  loadoutBonusScore: number;
  loadoutReactionSerial: number;
  loadoutReactionLabel: string | null;
  loadoutReactionIntensity: number;
  counterplayBreaks: number;
  enemyCounterplaySerial: number;
  enemyCounterplayLabel: string | null;
  enemyCounterplayCount: number;
  enemyCounterplayIntensity: number;
  turboJammed: boolean;
  combatDirectorMode: SkyDancerArcadeV12DirectorMode;
  combatDirectorPlayerStyle: SkyDancerArcadeV12PlayerStyle;
  combatDirectorLabel: string;
  combatDirectorIntent: string;
  combatDirectorIntensity: number;
  combatDirectorPressure: number;
  combatDirectorSerial: number;
  combatDirectorWaveSerial: number;
  encounterGrammarId: string;
  encounterGrammarLabel: string;
  encounterGrammarIntent: string;
  encounterGrammarPhaseLabel: string;
  encounterGrammarPhaseIndex: number;
  encounterGrammarPhaseCount: number;
  encounterGrammarSerial: number;
  encounterContinuityLabel: string;
  encounterContinuityBreakSign: SkyDancerArcadeV122FlowSign;
  encounterContinuityEntrySign: SkyDancerArcadeV122FlowSign;
  encounterContinuitySurvivors: number;
  encounterContinuityLateralBias: number;
  encounterContinuitySerial: number;
  bossKills: number;
  continuesRemaining: number;
  continuesUsed: number;
  branchActive: boolean;
  branchOptions: readonly SkyDancerArcadeStageId[];
  branchSelection: SkyDancerArcadeStageId | null;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: SkyDancerArcadeBossPhase;
  bossWeakpointOpen: boolean;
  bossPhaseSerial: number;
  bossMechanicLabel: string;
  bossMechanicIntensity: number;
  bossMechanicSerial: number;
  stageEventSerial: number;
  stageEventLabel: string | null;
  stageEventIntensity: number;
  timelineBeatId: string;
  timelineBeatLabel: string;
  timelineBeatKind: SkyDancerArcadeV11BeatKind;
  timelineSetpiece: string;
  timelineIntensity: number;
  timelineCameraFov: number;
  timelineCameraPullback: number;
  timelineSerial: number;
  routeRiskLabels: readonly SkyDancerArcadeV11RouteRisk[];
  rivalAceActive: boolean;
  rivalAceName: string;
  rivalAceAppearance: number;
  rivalAceAdaptation: string;
  rivalAceHp: number;
  rivalAceMaxHp: number;
  rivalAceAdvantage: number;
  rivalAceAdvantageTarget: number;
  rivalAceEncounters: number;
  rivalAcePlayerWins: number;
  rivalAceEscapes: number;
  rivalAceOutcome: SkyDancerArcadeV404RivalOutcome;
  rivalAceSerial: number;
  finalBossReactive: boolean;
  finalBossForm: SkyDancerArcadeV405FinalBossForm | null;
  finalBossFormLabel: string;
  finalBossRouteMemory: SkyDancerArcadeV405RouteMemory;
  finalBossRivalMemory: SkyDancerArcadeV405RivalMemory;
  finalBossAttackLabel: string;
  finalBossEndingLine: string;
  finalBossSerial: number;
  finalBossRouteHistory: readonly SkyDancerArcadeV40RouteDoctrine[];
  finalBossRivalHistory: readonly SkyDancerArcadeV405ResolvedRivalOutcome[];
  worldBreakObjective: string;
  worldBreakSignature: string;
  worldBreakLive: boolean;
  worldBreakRouteDoctrine: SkyDancerArcadeV40RouteDoctrine;
  worldBreakScoreMultiplier: number;
  worldBreakPressureScale: number;
  worldBreakGateHits: number;
  worldBreakGateMisses: number;
  worldBreakGateStreak: number;
  worldBreakGateSerial: number;
  worldBreakGateTotal: number;
  worldBreakGates: SkyDancerArcadeWorldBreakGateSnapshot[];
  worldBreakKnifeActive: boolean;
  worldBreakKnifeAltitudeOk: boolean;
  worldBreakKnifeSeconds: number;
  worldBreakKnifeTargetSeconds: number;
  worldBreakKnifeCeilingY: number;
  worldBreakKnifeComplete: boolean;
  worldBreakKnifeSerial: number;
  worldBreakTargetHits: number;
  worldBreakTargetMisses: number;
  worldBreakTargetSerial: number;
  worldBreakTargetTotal: number;
  worldBreakTargetCurrentLabel: string | null;
  worldBreakTargetCurrentHp: number;
  worldBreakTargetCurrentMaxHp: number;
  worldBreakStormActive: boolean;
  worldBreakStormSafeX: number;
  worldBreakStormWidth: number;
  worldBreakStormDepth: number;
  worldBreakStormIndex: number;
  worldBreakStormHits: number;
  worldBreakStormMisses: number;
  worldBreakStormSerial: number;
  worldBreakStormTotal: number;
  worldBreakFortressBreachActive: boolean;
  worldBreakFortressBreachOpen: boolean;
  worldBreakFortressBreachResolved: boolean;
  worldBreakFortressBreachSuccess: boolean;
  worldBreakFortressBreachDepth: number;
  worldBreakFortressBreachX: number;
  worldBreakFortressBreachY: number;
  worldBreakFortressBreachRadiusX: number;
  worldBreakFortressBreachRadiusY: number;
  worldBreakFortressSerial: number;
  worldBreakIceActive: boolean;
  worldBreakIceX: number;
  worldBreakIceY: number;
  worldBreakIceRadiusX: number;
  worldBreakIceRadiusY: number;
  worldBreakIceDepth: number;
  worldBreakIceIndex: number;
  worldBreakIceHits: number;
  worldBreakIceMisses: number;
  worldBreakIceSerial: number;
  worldBreakIceTotal: number;
  worldBreakIcePerfect: boolean;
  worldBreakPortalActive: boolean;
  worldBreakPortalChoiceIndex: number;
  worldBreakPortalDoctrine: SkyDancerArcadeV40PortalDoctrine | "NONE";
  worldBreakPortalSerial: number;
  worldBreakPortalDepth: number;
  worldBreakPortalScoreMultiplier: number;
  worldBreakPortalPressureScale: number;
  worldBreakPortals: SkyDancerArcadeWorldBreakPortalSnapshot[];
  worldBreakPursuitActive: boolean;
  worldBreakPursuitX: number;
  worldBreakPursuitY: number;
  worldBreakPursuitDepth: number;
  worldBreakPursuitGap: number;
  worldBreakPursuitTargetGap: number;
  worldBreakPursuitTrackedSeconds: number;
  worldBreakPursuitCaught: boolean;
  worldBreakPursuitResolved: boolean;
  worldBreakPursuitSerial: number;
  worldBreakMagmaActive: boolean;
  worldBreakMagmaLead: number;
  worldBreakMagmaPressure: number;
  worldBreakMagmaHits: number;
  worldBreakMagmaResolved: boolean;
  worldBreakMagmaEscaped: boolean;
  worldBreakMagmaSerial: number;
  worldBreakOrbitActive: boolean;
  worldBreakOrbitSafeX: number;
  worldBreakOrbitWidth: number;
  worldBreakOrbitAltitude: number;
  worldBreakOrbitTargetAltitude: number;
  worldBreakOrbitAligned: boolean;
  worldBreakOrbitStrikes: number;
  worldBreakOrbitResolved: boolean;
  worldBreakOrbitComplete: boolean;
  worldBreakOrbitSerial: number;
  worldBreakPrismActive: boolean;
  worldBreakPrismIndex: number;
  worldBreakPrismTotal: number;
  worldBreakPrismHits: number;
  worldBreakPrismMisses: number;
  worldBreakPrismSerial: number;
  worldBreakPrismLabel: string | null;
  worldBreakPrismX: number;
  worldBreakPrismY: number;
  worldBreakPrismDepth: number;
  worldBreakPrismRadius: number;
  worldBreakPrismComplete: boolean;
  worldBreakPrismPerfect: boolean;
  enemies: SkyDancerArcadeEnemySnapshot[];
  projectiles: SkyDancerArcadeProjectileSnapshot[];
  impacts: SkyDancerArcadeImpactSnapshot[];
  hazards: SkyDancerArcadeHazardSnapshot[];
  resultTimer: number;
  lastClearedStageId: SkyDancerArcadeStageId | null;
  lastStageScore: number;
  lastStageRank: SkyDancerArcadeRank;
  lastStageNoDamage: boolean;
  lastStageMedals: readonly SkyDancerArcadeV11MedalResult[];
  lastStageScoreBreakdown: SkyDancerArcadeV11ScoreBreakdown;
  runMedalsEarned: number;
  message: string | null;
  shotSerial: number;
  missileSerial: number;
  hitSerial: number;
  damageSerial: number;
  stageSerial: number;
  resultSerial: number;
}

interface ArcadeEnemy extends SkyDancerArcadeEnemySnapshot {
  age: number;
  speed: number;
  baseX: number;
  baseY: number;
  amplitude: number;
  fireCooldown: number;
  scoreValue: number;
  alive: boolean;
  maneuverClock: number;
  maneuverSign: number;
  // V24: actual lateral/vertical velocity carries through steering changes so enemies arc instead of strafing.
  flightVX: number;
  flightVY: number;
  // V25: coordinated-turn state. Bank/pitch generate acceleration; energy softly couples maneuver load to closure speed.
  flightBank: number;
  flightPitch: number;
  flightEnergy: number;
  loadoutStaggerRewarded: boolean;
  counterplayTimer: number;
  counterplayCooldown: number;
  counterplayRewarded: boolean;
  // V30: standard enemies stay alive briefly during boss ingress so they can visibly peel away.
  retreating?: boolean;
  retreatTimer?: number;
  retreatSign?: -1 | 1;
  retreatDepthDirection?: -1 | 1;
  // V40 phase 2: capital-ship subsystems are targetable combat actors anchored to the course.
  worldBreakAnchorDistance?: number;
  worldBreakScoreBonus?: number;
  worldBreakResolved?: boolean;
}

interface ArcadeProjectile extends SkyDancerArcadeProjectileSnapshot {
  speed: number;
  damage: number;
  life: number;
  vx: number;
  vy: number;
  guidance: number;
  nearMissChecked: boolean;
  // V30: outgoing hostile fire coasts out harmlessly instead of popping out of existence.
  retiring?: boolean;
}

interface ArcadeHazard extends SkyDancerArcadeHazardSnapshot {
  speed: number;
  nearMissChecked: boolean;
  // V10.5: terrain/architecture hazards live at one absolute point on the course.
  // Dynamic hazards leave this null and retain their independent closing speed.
  courseAnchorDistance: number | null;
  // V30: boss ingress releases old hazards from the course and lets them sweep off-screen.
  retiring?: boolean;
}

interface ArcadeWorldBreakGate extends SkyDancerArcadeWorldBreakGateSnapshot {
  anchorDistance: number;
  scoreValue: number;
}

interface ArcadeInput {
  x: number;
  y: number;
  fire: boolean;
  lock: boolean;
  turbo: boolean;
}

interface ArcadeV121QueuedPhase {
  at: number;
  grammar: SkyDancerArcadeV121EncounterGrammar;
  phase: SkyDancerArcadeV121EncounterPhase;
  phaseIndex: number;
  plan: SkyDancerArcadeV12EncounterPlan;
}

interface StageStats {
  scoreAtStart: number;
  damageAtStart: number;
  killsAtStart: number;
  nearMissesAtStart: number;
  multiLockKillsAtStart: number;
  turboSmashesAtStart: number;
  armorBreaksAtStart: number;
  formationBreaksAtStart: number;
}

const PLAYER_MAX_HP = 100;
const PLAYER_X_LIMIT = SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT;
const PLAYER_Y_LIMIT = SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT;
const ENEMY_X_LIMIT = 2.62;
const ENEMY_Y_LIMIT = 2.05;
const GUN_COOLDOWN = 0.105;
const LOCK_INTERVAL = 0.13;
const ARCADE_SECTION_RESULT_SECONDS = 1.35;
const PRACTICE_RESULT_SECONDS = 2.8;
// V40.14: the climax gets one readable breath on entry and exit.
const BOSS_INGRESS_HOLD_SECONDS = 1.2;
const BOSS_OUTRO_HOLD_SECONDS = 0.9;
const PLAYER_MOVE_SPEED_X = 3.7;
const PLAYER_MOVE_SPEED_Y = 3.18;
const PLAYER_TURBO_SPEED_X = 5.05;
const PLAYER_TURBO_SPEED_Y = 4.28;
const PLAYER_MOVE_RESPONSE = 19.5;
const ENEMY_FLYBY_CULL_DEPTH = -11.5;
const MAX_ENEMY_PROJECTILES_NORMAL = 5;
const MAX_ENEMY_PROJECTILES_HARD = 9;

function arcadeStandardFusionActive(loadout: SkyDancerArcadeLoadout | undefined, turboActive: boolean): boolean {
  return (loadout ?? "standard") === "standard" && turboActive;
}

function arcadeLoadoutGunCooldown(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "gun-focus") return GUN_COOLDOWN * 0.74;
  if (loadout === "missile-focus") return GUN_COOLDOWN * 1.08;
  return GUN_COOLDOWN * (arcadeStandardFusionActive(loadout, turboActive) ? 0.86 : 1);
}

/** V11.7 damage is per projectile: Gun Focus fires a matched twin pair. */
function arcadeLoadoutGunDamage(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "gun-focus") return 0.59;
  if (loadout === "missile-focus") return 0.92;
  return arcadeStandardFusionActive(loadout, turboActive) ? 1.12 : 1;
}

function arcadeLoadoutGunProjectiles(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "gun-focus" ? 2 : 1;
}

function arcadeLoadoutLockInterval(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "missile-focus") return LOCK_INTERVAL * 0.72;
  if (loadout === "gun-focus") return LOCK_INTERVAL * 1.1;
  return LOCK_INTERVAL * (arcadeStandardFusionActive(loadout, turboActive) ? 0.88 : 1);
}

function arcadeLoadoutLockThreshold(loadout: SkyDancerArcadeLoadout | undefined, boss: boolean, turboActive = false): number {
  const base = boss ? 1.85 : 1.45;
  if (loadout === "missile-focus") return base + (boss ? 0.42 : 0.4);
  if (loadout === "gun-focus") return base - (boss ? 0.12 : 0.16);
  return base + (arcadeStandardFusionActive(loadout, turboActive) ? (boss ? 0.2 : 0.18) : 0);
}

/** V11.7 damage is per missile: Missile Focus launches two missiles per locked target. */
function arcadeLoadoutMissileDamage(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "missile-focus") return 0.7;
  if (loadout === "gun-focus") return 0.92;
  return arcadeStandardFusionActive(loadout, turboActive) ? 1.12 : 1;
}

function arcadeLoadoutMissileCount(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "missile-focus" ? 2 : 1;
}

function arcadeLoadoutMissileSpeed(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "missile-focus" ? 1.12 : loadout === "gun-focus" ? 0.96 : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return current;
}

export function skyDancerArcadeEnemyStatsV20(kind: SkyDancerArcadeEnemyKind, hard: boolean): { hp: number; speed: number; score: number } {
  const healthScale = hard ? 1.24 : 1;
  switch (kind) {
    case "drone": return { hp: 15 * healthScale, speed: hard ? 19.5 : 17.5, score: 300 };
    case "interceptor": return { hp: 24 * healthScale, speed: hard ? 18 : 16, score: 520 };
    case "raider": return { hp: 36 * healthScale, speed: hard ? 17 : 15.2, score: 650 };
    case "striker": return { hp: 48 * healthScale, speed: hard ? 15.2 : 13.6, score: 820 };
    case "missile-boat": return { hp: 42 * healthScale, speed: hard ? 12.4 : 11, score: 760 };
    case "bomber": return { hp: 88 * healthScale, speed: hard ? 9.5 : 8.4, score: 1380 };
    case "gunship": return { hp: 112 * healthScale, speed: hard ? 8.7 : 7.6, score: 1760 };
    case "ace": return { hp: 68 * healthScale, speed: hard ? 16 : 14, score: 1680 };
    default: return { hp: 30 * healthScale, speed: hard ? 14.5 : 12.8, score: 440 };
  }
}

function skyDancerArcadeEnemyMotionV20(kind: SkyDancerArcadeEnemyKind | "boss"): { frequency: number; pursuitCap: number } {
  switch (kind) {
    case "drone": return { frequency: 2.72, pursuitCap: .78 };
    case "interceptor": return { frequency: 2.35, pursuitCap: .74 };
    case "raider": return { frequency: 2.08, pursuitCap: .8 };
    case "ace": return { frequency: 1.75, pursuitCap: .84 };
    case "striker": return { frequency: 1.46, pursuitCap: .64 };
    case "gunship": return { frequency: .76, pursuitCap: .4 };
    case "bomber": return { frequency: .82, pursuitCap: .42 };
    case "missile-boat": return { frequency: .92, pursuitCap: .48 };
    default: return { frequency: 1.02, pursuitCap: .54 };
  }
}

function skyDancerArcadeEnemyWeaponV20(kind: SkyDancerArcadeEnemyKind | "boss"): { spread: number; guidance: number; projectileSpeed: number; cadence: number } {
  switch (kind) {
    case "drone": return { spread: 1, guidance: .78, projectileSpeed: 14.2, cadence: 2.35 };
    case "raider": return { spread: 2, guidance: 1.04, projectileSpeed: 14.4, cadence: 1.86 };
    case "striker": return { spread: 2, guidance: 1.18, projectileSpeed: 14.8, cadence: 1.76 };
    case "gunship": return { spread: 3, guidance: 1.2, projectileSpeed: 14.2, cadence: 2.08 };
    case "missile-boat": return { spread: 2, guidance: 1.52, projectileSpeed: 15.5, cadence: 1.68 };
    case "bomber": return { spread: 2, guidance: 1.26, projectileSpeed: 14.5, cadence: 1.9 };
    case "ace": return { spread: 2, guidance: 1.12, projectileSpeed: 13.2, cadence: 1.78 };
    default: return { spread: 1, guidance: .88, projectileSpeed: 13.2, cadence: 2.18 };
  }
}

export function skyDancerArcadeEnemyHitRadiusV20(kind: SkyDancerArcadeEnemyKind | "boss", boss = kind === "boss"): number {
  if (boss) return .72;
  if (kind === "gunship") return .43;
  if (kind === "bomber") return .38;
  if (kind === "drone") return .21;
  if (kind === "striker") return .3;
  return .25;
}

function rankIndex(rank: SkyDancerArcadeRank): number {
  return ["D", "C", "B", "A", "S", "SS"].indexOf(rank);
}

export function skyDancerArcadeRankForScore(
  score: number,
  stagesCleared: number,
  damageTaken: number,
  continuesUsed: number,
): SkyDancerArcadeRank {
  const stageCount = Math.max(1, stagesCleared);
  const scorePerStage = score / stageCount;
  let rank: SkyDancerArcadeRank = scorePerStage >= 66000
    ? "SS"
    : scorePerStage >= 50000
      ? "S"
      : scorePerStage >= 35000
        ? "A"
        : scorePerStage >= 23000
          ? "B"
          : scorePerStage >= 12000
            ? "C"
            : "D";
  let penalty = continuesUsed + Math.floor(damageTaken / (stageCount * 85));
  while (penalty > 0 && rankIndex(rank) > 0) {
    rank = (["D", "C", "B", "A", "S", "SS"] as SkyDancerArcadeRank[])[rankIndex(rank) - 1];
    penalty -= 1;
  }
  return rank;
}

export class SkyDancerArcadeRuntime {
  private readonly options: SkyDancerArcadeRuntimeOptions;
  private stage: SkyDancerArcadeStageDefinition;
  private status: SkyDancerArcadeStatus = "running";
  private statusBeforePause: SkyDancerArcadeStatus = "running";
  private readonly input: ArcadeInput = { x: 0, y: 0, fire: false, lock: false, turbo: false };
  private rngState: number;
  private route: SkyDancerArcadeStageId[] = [];
  private stageNumber = 1;
  private stagesCleared = 0;
  private stageTime = 0;
  private runTime = 0;
  private distance = 0;
  private playerX = 0;
  private playerY = 0;
  private playerVX = 0;
  private playerVY = 0;
  private playerHp = PLAYER_MAX_HP;
  private turbo = 100;
  private score = 0;
  private chain = 0;
  private chainTimer = 0;
  private enemiesDefeated = 0;
  private damageTaken = 0;
  private nearMisses = 0;
  private multiLockKills = 0;
  private turboSmashes = 0;
  private bestChain = 0;
  private armorBreaks = 0;
  private formationBreaks = 0;
  private bossKills = 0;
  private continuesRemaining = SKY_DANCER_ARCADE_MAX_CONTINUES;
  private continuesUsed = 0;
  private enemies: ArcadeEnemy[] = [];
  private projectiles: ArcadeProjectile[] = [];
  private impactEvents: SkyDancerArcadeImpactSnapshot[] = [];
  private readonly impactEventAges = new Map<number, number>();
  private hazards: ArcadeHazard[] = [];
  // V40 WORLD BREAK: authored world-navigation objectives coexist with combat actors.
  private worldBreakGates: ArcadeWorldBreakGate[] = [];
  private worldBreakRouteDoctrine: SkyDancerArcadeV40RouteDoctrine = "LOCKED";
  private worldBreakGateHits = 0;
  private worldBreakGateMisses = 0;
  private worldBreakGateStreak = 0;
  private worldBreakGateSerial = 0;
  private worldBreakKnifeSeconds = 0;
  private worldBreakKnifeTick = 0;
  private worldBreakKnifeComplete = false;
  private worldBreakKnifeResolved = false;
  private worldBreakKnifeSerial = 0;
  private worldBreakTargetHits = 0;
  private worldBreakTargetMisses = 0;
  private worldBreakTargetSerial = 0;
  private readonly worldBreakResolvedTargetIndices = new Set<number>();
  private worldBreakStormHits = 0;
  private worldBreakStormMisses = 0;
  private worldBreakStormSerial = 0;
  private readonly worldBreakResolvedStormLaneIndices = new Set<number>();
  private worldBreakFortressBreachOpen = false;
  private worldBreakFortressBreachResolved = false;
  private worldBreakFortressBreachSuccess = false;
  private worldBreakFortressSerial = 0;
  private worldBreakIceHits = 0;
  private worldBreakIceMisses = 0;
  private worldBreakIceSerial = 0;
  private readonly worldBreakResolvedIceApertureIndices = new Set<number>();
  private worldBreakPortalChoiceIndex = -1;
  private worldBreakPortalDoctrine: SkyDancerArcadeV40PortalDoctrine | "NONE" = "NONE";
  private worldBreakPortalSerial = 0;
  private worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP;
  private worldBreakPursuitTrackedSeconds = 0;
  private worldBreakPursuitTick = 0;
  private worldBreakPursuitCaught = false;
  private worldBreakPursuitResolved = false;
  private worldBreakPursuitResolvedAt = -1;
  private worldBreakPursuitSerial = 0;
  private worldBreakMagmaLead = SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD;
  private worldBreakMagmaHits = 0;
  private worldBreakMagmaResolved = false;
  private worldBreakMagmaEscaped = false;
  private worldBreakMagmaSerial = 0;
  private worldBreakOrbitAltitude = 0;
  private worldBreakOrbitStrikeTimer = 0;
  private worldBreakOrbitStrikes = 0;
  private worldBreakOrbitTick = 0;
  private worldBreakOrbitResolved = false;
  private worldBreakOrbitComplete = false;
  private worldBreakOrbitResolvedAt = -1;
  private worldBreakOrbitSerial = 0;
  private worldBreakPrismHits = 0;
  private worldBreakPrismMisses = 0;
  private worldBreakPrismSerial = 0;
  private worldBreakPrismResolvedAt = -1;
  private readonly worldBreakResolvedPrismTrialIndices = new Set<number>();
  // V40.4 RIVAL ACE: the rivalry persists across route handoffs while the active aircraft does not.
  private rivalAceActiveId: number | null = null;
  private rivalAceAppearance = 0;
  private rivalAceAdaptation = "NO CONTACT";
  private rivalAceAdvantage = 0;
  private rivalAceAdvantageTarget = 1;
  private rivalAceOutcome: SkyDancerArcadeV404RivalOutcome = "NONE";
  private rivalAceEncounters = 0;
  private rivalAcePlayerWins = 0;
  private rivalAceEscapes = 0;
  private rivalAceSerial = 0;
  private readonly worldBreakRouteHistory: SkyDancerArcadeV40RouteDoctrine[] = [];
  private readonly rivalAceOutcomeHistory: SkyDancerArcadeV405ResolvedRivalOutcome[] = [];
  private finalBossContract: SkyDancerArcadeV405FinalBossContract | null = null;
  private finalBossSerial = 0;
  private readonly rivalAceSeenAppearances = new Set<number>();
  private readonly rivalAceResolvedAppearances = new Set<number>();
  private nextEntityId = 1;
  private waveSerial = 0;
  private nextWaveAt = 2.8;
  private nextHazardAt = 11;
  private gunCooldown = 0;
  private lockCooldown = 0;
  private branchSelection: SkyDancerArcadeStageId | null = null;
  private branchWasResolved = false;
  private bossSpawned = false;
  private bossDefeated = false;
  private bossPhaseSerial = 0;
  private bossMechanicSerial = 0;
  // V32: phase mechanics arm after a readable telegraph instead of appearing on the HP-threshold frame.
  private bossPhaseTransitionTimer = 0;
  private pendingBossPhaseMechanic: SkyDancerArcadeBossPhase | null = null;
  // V40.14: boss presentation owns a short entry/exit window without stopping player flight.
  private bossIngressTimer = 0;
  private bossOpeningStrikePending = false;
  private bossOutroTimer = 0;
  // V32: fresh routes and continues get a short establishing/rejoin beat before combat pressure resumes.
  private stageEntryTimer = 0;
  private stageEventSerial = 0;
  private stageEventCheckpoint: 0 | 1 | 2 = 0;
  private stageEventLabel: string | null = null;
  private stageEventTimer = 0;
  private timelineBeatIndex = 0;
  private timelineSerial = 0;
  private resultTimer = 0;
  private lastClearedStageId: SkyDancerArcadeStageId | null = null;
  private lastStageScore = 0;
  private lastStageRank: SkyDancerArcadeRank = "D";
  private lastStageNoDamage = false;
  private lastStageMedals: readonly SkyDancerArcadeV11MedalResult[] = [];
  private lastStageScoreBreakdown: SkyDancerArcadeV11ScoreBreakdown = { combat:0, medal:0, perfect:0, boss:0, route:0, total:0 };
  private runMedalsEarned = 0;
  private stageBestChain = 0;
  private message: string | null = "DROP IN · ARCADE RUN";
  private messageTimer = 2.5;
  private shotSerial = 0;
  private missileSerial = 0;
  private hitSerial = 0;
  private damageSerial = 0;
  private damageCooldown = 0;
  private loadoutBonusScore = 0;
  private loadoutReactionSerial = 0;
  private loadoutReactionLabel: string | null = null;
  private loadoutReactionTimer = 0;
  private counterplayBreaks = 0;
  private enemyCounterplaySerial = 0;
  private enemyCounterplayLabel: string | null = null;
  private enemyCounterplayLabelTimer = 0;
  private directorGunHeat = 0;
  private directorMissileHeat = 0;
  private directorTurboHeat = 0;
  private directorRecentDamage = 0;
  private combatDirectorMode: SkyDancerArcadeV12DirectorMode = "adaptive-mix";
  private combatDirectorPlayerStyle: SkyDancerArcadeV12PlayerStyle = "balanced";
  private combatDirectorLabel = "MIXED ASSAULT";
  private combatDirectorIntent = "READ FORMATION · CHOOSE TOOL";
  private combatDirectorIntensity = .5;
  private combatDirectorPressure = .5;
  private combatDirectorCadenceScale = 1;
  private combatDirectorCounterplayDelay = 1.08;
  private combatDirectorSerial = 0;
  private combatDirectorWaveSerial = 0;
  private encounterGrammarId = "opening-pass";
  private encounterGrammarLabel = "OPENING PASS";
  private encounterGrammarIntent = "READ SKY · BUILD RHYTHM";
  private encounterGrammarPhaseLabel = "APPROACH";
  private encounterGrammarPhaseIndex = 0;
  private encounterGrammarPhaseCount = 1;
  private encounterGrammarSerial = 0;
  private encounterGrammarCadenceScale = 1;
  private encounterContinuityLabel = "FLOW HOLD · CARRY 0";
  private encounterContinuityBreakSign: SkyDancerArcadeV122FlowSign = 0;
  private encounterContinuityEntrySign: SkyDancerArcadeV122FlowSign = 0;
  private encounterContinuitySurvivors = 0;
  private encounterContinuityLateralBias = 0;
  private encounterContinuitySerial = 0;
  private encounterPhaseQueue: ArcadeV121QueuedPhase[] = [];
  private stageSerial = 1;
  private resultSerial = 0;
  private readonly stageStats: StageStats = {
    scoreAtStart:0, damageAtStart:0, killsAtStart:0, nearMissesAtStart:0, multiLockKillsAtStart:0,
    turboSmashesAtStart:0, armorBreaksAtStart:0, formationBreaksAtStart:0,
  };

  constructor(options: SkyDancerArcadeRuntimeOptions) {
    this.options = options;
    this.rngState = (options.seed ?? 0x5f3759df) | 0;
    const startId = options.mode === "stage-practice"
      ? options.startStageId ?? SKY_DANCER_ARCADE_FIRST_STAGE
      : SKY_DANCER_ARCADE_FIRST_STAGE;
    this.stage = skyDancerArcadeStageById(startId);
    this.route = [startId];
    this.resetStageState(0);
  }

  private random(): number {
    let x = this.rngState | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.rngState = x | 0;
    return (x >>> 0) / 0x100000000;
  }

  private resetStageState(rewindTime: number): void {
    this.stageTime = Math.max(0, rewindTime);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.stageEntryTimer = rewindTime > 0 ? 1.2 : .82;
    this.bossPhaseTransitionTimer = 0;
    this.pendingBossPhaseMechanic = null;
    this.bossIngressTimer = 0;
    this.bossOpeningStrikePending = false;
    this.bossOutroTimer = 0;
    this.enemies = [];
    this.projectiles = [];
    this.impactEvents = [];
    this.impactEventAges.clear();
    this.hazards = [];
    this.rivalAceActiveId = null;
    this.rivalAceAdvantage = 0;
    this.rivalAceAdvantageTarget = 1;
    this.rivalAceOutcome = "NONE";
    this.rivalAceAppearance = 0;
    this.rivalAceAdaptation = "NO CONTACT";
    if (rewindTime <= 0) {
      this.worldBreakGateHits = 0;
      this.worldBreakGateMisses = 0;
      this.worldBreakGateStreak = 0;
      this.worldBreakKnifeSeconds = 0;
      this.worldBreakKnifeTick = 0;
      this.worldBreakKnifeComplete = false;
      this.worldBreakKnifeResolved = false;
      this.worldBreakTargetHits = 0;
      this.worldBreakTargetMisses = 0;
      this.worldBreakResolvedTargetIndices.clear();
      this.worldBreakStormHits = 0;
      this.worldBreakStormMisses = 0;
      this.worldBreakResolvedStormLaneIndices.clear();
      this.worldBreakFortressBreachOpen = false;
      this.worldBreakFortressBreachResolved = false;
      this.worldBreakFortressBreachSuccess = false;
      this.worldBreakIceHits = 0;
      this.worldBreakIceMisses = 0;
      this.worldBreakResolvedIceApertureIndices.clear();
      this.worldBreakPortalChoiceIndex = -1;
      this.worldBreakPortalDoctrine = "NONE";
      this.worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_INITIAL_GAP;
      this.worldBreakPursuitTrackedSeconds = 0;
      this.worldBreakPursuitTick = 0;
      this.worldBreakPursuitCaught = false;
      this.worldBreakPursuitResolved = false;
      this.worldBreakPursuitResolvedAt = -1;
      this.worldBreakMagmaLead = SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD;
      this.worldBreakMagmaHits = 0;
      this.worldBreakMagmaResolved = false;
      this.worldBreakMagmaEscaped = false;
      this.worldBreakOrbitAltitude = 0;
      this.worldBreakOrbitStrikeTimer = 0;
      this.worldBreakOrbitStrikes = 0;
      this.worldBreakOrbitTick = 0;
      this.worldBreakOrbitResolved = false;
      this.worldBreakOrbitComplete = false;
      this.worldBreakOrbitResolvedAt = -1;
      this.worldBreakPrismHits = 0;
      this.worldBreakPrismMisses = 0;
      this.worldBreakPrismResolvedAt = -1;
      this.worldBreakResolvedPrismTrialIndices.clear();
    }
    this.worldBreakGates = this.stage.id === "dawn-city"
      ? SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES.map((gate) => {
          const anchorDistance = skyDancerArcadeV40DawnCityGateAnchorDistance(gate, this.stage.durationSeconds, this.stage.courseSpeed);
          const alreadyPassed = rewindTime > 0 && anchorDistance <= this.distance + 2.4;
          return {
            id: this.nextEntityId++, index: gate.index, x: gate.x, y: gate.y,
            depth: anchorDistance - this.distance, radiusX: gate.radiusX, radiusY: gate.radiusY,
            resolved: alreadyPassed, success: null, anchorDistance, scoreValue: gate.score,
          };
        })
      : [];
    this.waveSerial = 0;
    // Give each section a readable establishing beat before the first pressure wave.
    this.nextWaveAt = this.stageTime + (rewindTime > 0 ? 1.35 : 2.35);
    this.nextHazardAt = this.stageTime + (rewindTime > 0 ? 2.0 : 4.1);
    this.damageCooldown = 0;
    this.loadoutReactionLabel = null;
    this.loadoutReactionTimer = 0;
    this.enemyCounterplayLabel = null;
    this.enemyCounterplayLabelTimer = 0;
    this.directorGunHeat = 0;
    this.directorMissileHeat = 0;
    this.directorTurboHeat = 0;
    this.directorRecentDamage = 0;
    this.combatDirectorMode = "adaptive-mix";
    this.combatDirectorPlayerStyle = "balanced";
    this.combatDirectorLabel = "MIXED ASSAULT";
    this.combatDirectorIntent = "READ FORMATION · CHOOSE TOOL";
    this.combatDirectorIntensity = .5;
    this.combatDirectorPressure = .5;
    this.combatDirectorCadenceScale = 1;
    this.combatDirectorCounterplayDelay = 1.08;
    this.combatDirectorWaveSerial = 0;
    this.encounterGrammarId = "opening-pass";
    this.encounterGrammarLabel = "OPENING PASS";
    this.encounterGrammarIntent = "READ SKY · BUILD RHYTHM";
    this.encounterGrammarPhaseLabel = "APPROACH";
    this.encounterGrammarPhaseIndex = 0;
    this.encounterGrammarPhaseCount = 1;
    this.encounterGrammarCadenceScale = 1;
    this.encounterContinuityLabel = "FLOW HOLD · CARRY 0";
    this.encounterContinuityBreakSign = 0;
    this.encounterContinuityEntrySign = 0;
    this.encounterContinuitySurvivors = 0;
    this.encounterContinuityLateralBias = 0;
    this.encounterContinuitySerial = 0;
    this.encounterPhaseQueue = [];
    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;
    const rewindCheckpoint = skyDancerArcadeStageEventCheckpoint(this.stageTime / this.stage.durationSeconds, finalStage);
    this.stageEventCheckpoint = rewindTime > 0 ? Math.max(this.stageEventCheckpoint, rewindCheckpoint) as 0 | 1 | 2 : 0;
    this.stageEventLabel = rewindTime > 0 ? "REJOIN VECTOR" : "ROUTE ENTRY";
    this.stageEventTimer = rewindTime > 0 ? 1.4 : 1.15;
    this.timelineBeatIndex = skyDancerArcadeV11BeatIndex(this.stage.id, this.stageTime / this.stage.durationSeconds);
    this.branchSelection = null;
    this.branchWasResolved = this.stageTime >= this.stage.durationSeconds * 0.45;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.stageStats.scoreAtStart = this.score;
    this.stageStats.damageAtStart = this.damageTaken;
    this.stageStats.killsAtStart = this.enemiesDefeated;
    this.stageStats.nearMissesAtStart = this.nearMisses;
    this.stageStats.multiLockKillsAtStart = this.multiLockKills;
    this.stageStats.turboSmashesAtStart = this.turboSmashes;
    this.stageStats.armorBreaksAtStart = this.armorBreaks;
    this.stageStats.formationBreaksAtStart = this.formationBreaks;
    this.stageBestChain = 0;
    if (this.stage.id === "cloud-fleet") this.spawnV40CloudFleetTargets(rewindTime);
    if (this.stage.id === "desert-fortress") this.spawnV40DesertFortressTargets(rewindTime);
    if (this.stageEntryTimer <= 0 && this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();
  }

  setMove(x: number, y: number): void {
    this.input.x = clamp(x, -1, 1);
    this.input.y = clamp(y, -1, 1);
  }

  setFire(active: boolean): void {
    this.input.fire = active;
  }

  setLock(active: boolean): void {
    if (this.input.lock && !active) this.launchLockedMissiles();
    this.input.lock = active;
  }

  setTurbo(active: boolean): void {
    this.input.turbo = active;
  }

  pause(): void {
    if (this.status === "paused" || this.status === "game-over" || this.status === "run-clear" || this.status === "practice-clear") return;
    this.statusBeforePause = this.status;
    this.status = "paused";
    this.releaseInputs();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = this.statusBeforePause;
  }

  releaseInputs(): void {
    this.input.x = 0;
    this.input.y = 0;
    this.input.fire = false;
    this.input.lock = false;
    this.input.turbo = false;
    this.playerVX = 0;
    this.playerVY = 0;
  }

  continueRun(): boolean {
    if (this.status !== "continue" || this.continuesRemaining <= 0) return false;
    this.continuesRemaining -= 1;
    this.continuesUsed += 1;
    this.playerHp = PLAYER_MAX_HP;
    this.turbo = 72;
    this.chain = 0;
    this.chainTimer = 0;
    this.status = "running";
    const rewindSeconds = Math.min(4, this.stageTime);
    this.runTime = Math.max(0, this.runTime - rewindSeconds);
    this.resetStageState(this.stageTime - rewindSeconds);
    this.stageEntryTimer = Math.max(this.stageEntryTimer, 1.25);
    this.damageCooldown = Math.max(this.damageCooldown, 1.25);
    this.stageEventLabel = "REJOIN VECTOR";
    this.stageEventTimer = 1.4;
    this.stageEventSerial += 1;
    this.message = "CONTINUE · REJOINING FORMATION";
    this.messageTimer = 2.2;
    return true;
  }

  step(deltaSeconds: number): void {
    const delta = clamp(deltaSeconds, 0, 0.05);
    // Impact telemetry is presentation mail, not gameplay state. Keep it long enough for a render frame,
    // then retire it even while stage-clear/paused so long sessions never retain combat history.
    if (this.impactEvents.length > 0) {
      const active: SkyDancerArcadeImpactSnapshot[] = [];
      for (const impact of this.impactEvents) {
        const age = (this.impactEventAges.get(impact.serial) ?? 0) + delta;
        if (age <= .6) {
          this.impactEventAges.set(impact.serial, age);
          active.push(impact);
        } else {
          this.impactEventAges.delete(impact.serial);
        }
      }
      this.impactEvents = active;
    }
    if (this.status === "paused" || this.status === "run-clear" || this.status === "practice-clear") return;
    if (this.status === "continue" || this.status === "game-over") {
      // V32: failure overlays sit over a harmless moving aftermath instead of freezing the combat frame.
      this.updateStageClearPresentation(delta);
      return;
    }
    if (this.status === "stage-clear") {
      // V31: keep the last course frame alive during the result card. Actors retire harmlessly
      // and the scenery continues drifting, so the next stage feels like a flight handoff rather than a frozen cut.
      this.updateStageClearPresentation(delta);
      this.resultTimer = Math.max(0, this.resultTimer - delta);
      if (this.resultTimer <= 0) this.advanceAfterStageClear();
      return;
    }

    const turboActive = this.input.turbo && this.turbo > 0.5;
    this.stageTime += delta;
    this.runTime += delta;
    this.distance += this.stage.courseSpeed * (turboActive ? 1.44 : 1) * delta;
    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.stageEntryTimer = Math.max(0, this.stageEntryTimer - delta);
    this.bossIngressTimer = Math.max(0, this.bossIngressTimer - delta);
    this.bossOutroTimer = Math.max(0, this.bossOutroTimer - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.loadoutReactionTimer = Math.max(0, this.loadoutReactionTimer - delta);
    if (this.loadoutReactionTimer <= 0) this.loadoutReactionLabel = null;
    this.enemyCounterplayLabelTimer = Math.max(0, this.enemyCounterplayLabelTimer - delta);
    if (this.enemyCounterplayLabelTimer <= 0) this.enemyCounterplayLabel = null;
    this.stageEventTimer = Math.max(0, this.stageEventTimer - delta);
    if (this.stageEventTimer <= 0) this.stageEventLabel = null;
    if (this.messageTimer <= 0) this.message = null;
    this.updateV12CombatSignals(delta, turboActive);
    this.updatePlayer(delta, turboActive);
    this.updateWorldBreakGates();
    this.updateWorldBreakKnifeRun(delta);
    this.updateWorldBreakStormGrid();
    this.updateWorldBreakFortressBreach();
    this.updateWorldBreakIceCollapse();
    this.updateWorldBreakFloatingPortal();
    this.updateWorldBreakNeonPursuit(delta, turboActive);
    this.updateWorldBreakMagmaPressure(delta, turboActive);
    this.updateWorldBreakOrbitalAscent(delta, turboActive);
    this.updateWorldBreakPrismReprise();
    this.updateV404RivalAce(delta, turboActive);
    this.updateBranch();
    this.updateV11Timeline();
    this.updateDirector();
    // Once the climax is resolved, preserve steering but stop spawning fresh player ordnance into the result shot.
    if (this.bossOutroTimer <= 0) {
      this.updateLocking(delta);
      this.updateWeapons(delta);
    }
    this.updateEnemies(delta, turboActive);
    this.updateProjectiles(delta);
    this.updateHazards(delta, turboActive);
    this.cleanupEntities();

    this.chainTimer = Math.max(0, this.chainTimer - delta);
    if (this.chainTimer <= 0) this.chain = 0;
    if (this.playerHp <= 0) {
      this.enterContinue();
      return;
    }
    if (this.stageTime >= this.stage.durationSeconds) {
      if (!this.bossDefeated) this.breakClimaxTargetAtCourseEnd();
      // V40.14: let the departing boss / wreck read before the SECTION CLEAR card takes over.
      if (this.bossOutroTimer <= 0) this.completeStage();
    }
  }

  private updatePlayer(delta: number, turboActive: boolean): void {
    const targetVX = this.input.x * (turboActive ? PLAYER_TURBO_SPEED_X : PLAYER_MOVE_SPEED_X);
    const targetVY = this.input.y * (turboActive ? PLAYER_TURBO_SPEED_Y : PLAYER_MOVE_SPEED_Y);
    this.playerVX = moveToward(this.playerVX, targetVX, PLAYER_MOVE_RESPONSE * delta);
    this.playerVY = moveToward(this.playerVY, targetVY, PLAYER_MOVE_RESPONSE * delta);
    this.playerX = clamp(this.playerX + this.playerVX * delta, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerY = clamp(this.playerY + this.playerVY * delta, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    const jammerCount = this.activeTurboJammerCount();
    const jammerDrain = Math.min(18, jammerCount * 9);
    if (turboActive) this.turbo = Math.max(0, this.turbo - (29 + jammerDrain) * delta);
    else this.turbo = Math.min(100, this.turbo + 13.5 * (jammerCount > 0 ? .58 : 1) * delta);
  }

  private updateWorldBreakGates(): void {
    if (this.worldBreakGates.length === 0) return;
    for (const gate of this.worldBreakGates) {
      gate.depth = gate.anchorDistance - this.distance;
      if (gate.resolved || gate.depth > 2.4) continue;
      const dx = (this.playerX - gate.x) / gate.radiusX;
      const dy = (this.playerY - gate.y) / gate.radiusY;
      const clean = Math.hypot(dx, dy) <= 1;
      gate.resolved = true;
      gate.success = clean;
      this.worldBreakGateSerial += 1;
      if (clean) {
        this.worldBreakGateHits += 1;
        this.worldBreakGateStreak += 1;
        const awarded = this.addScore(gate.scoreValue + Math.max(0, this.worldBreakGateStreak - 1) * 280, true);
        this.turbo = Math.min(100, this.turbo + 8 + this.worldBreakGateStreak * 2);
        this.message = `WORLD BREAK · GATE ${gate.index + 1} CLEAN · +${awarded}`;
        this.messageTimer = 1.05;
      } else {
        this.worldBreakGateMisses += 1;
        this.worldBreakGateStreak = 0;
        this.message = `WORLD BREAK · GATE ${gate.index + 1} MISSED`;
        this.messageTimer = .82;
      }
    }
  }

  private updateWorldBreakKnifeRun(delta: number): void {
    if (this.stage.id !== "red-canyon" || this.worldBreakKnifeResolved) return;
    const totalDistance = Math.max(1, this.stage.durationSeconds * this.stage.courseSpeed);
    const courseProgress = clamp(this.distance / totalDistance, 0, 1);
    if (courseProgress < SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START) return;
    if (courseProgress <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END) {
      if (this.playerY <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y) {
        this.worldBreakKnifeSeconds += delta;
        const nextTick = Math.floor(this.worldBreakKnifeSeconds / .75);
        while (this.worldBreakKnifeTick < nextTick) {
          this.worldBreakKnifeTick += 1;
          this.addScore(320 + this.worldBreakKnifeTick * 70, true);
          this.turbo = Math.min(100, this.turbo + 2.5);
          this.worldBreakKnifeSerial += 1;
        }
      }
      return;
    }
    this.worldBreakKnifeResolved = true;
    this.worldBreakKnifeComplete = this.worldBreakKnifeSeconds >= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS;
    this.worldBreakKnifeSerial += 1;
    if (this.worldBreakKnifeComplete) {
      const awarded = this.addScore(3400, true);
      this.turbo = Math.min(100, this.turbo + 18);
      this.message = `WORLD BREAK · KNIFE RUN COMPLETE · +${awarded}`;
      this.messageTimer = 1.35;
    } else {
      this.message = `WORLD BREAK · KNIFE RUN LOST · ${this.worldBreakKnifeSeconds.toFixed(1)}s`;
      this.messageTimer = 1.05;
    }
  }

  private updateWorldBreakStormGrid(): void {
    if (this.stage.id !== "storm-carrier") return;
    for (const lane of SKY_DANCER_ARCADE_V40_STORM_LANES) {
      if (this.worldBreakResolvedStormLaneIndices.has(lane.index)) continue;
      const anchorDistance = skyDancerArcadeV40StormLaneAnchorDistance(lane, this.stage.durationSeconds, this.stage.courseSpeed);
      const depth = anchorDistance - this.distance;
      if (depth > 2.4) continue;
      const safeX = skyDancerArcadeV40StormLaneX(lane, this.stageTime);
      const clean = Math.abs(this.playerX - safeX) <= lane.width;
      this.worldBreakResolvedStormLaneIndices.add(lane.index);
      this.worldBreakStormSerial += 1;
      if (clean) {
        this.worldBreakStormHits += 1;
        const awarded = this.addScore(lane.score + this.worldBreakStormHits * 180, true);
        this.turbo = Math.min(100, this.turbo + 7);
        this.message = `LIGHTNING GRID · SAFE LANE ${lane.index + 1} · +${awarded}`;
        this.messageTimer = 1.05;
      } else {
        this.worldBreakStormMisses += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 16 : 12);
        this.message = `LIGHTNING GRID · STRIKE ${lane.index + 1} · MOVE TO LANE`;
        this.messageTimer = 1.05;
      }
    }
  }

  private updateWorldBreakFortressBreach(): void {
    if (this.stage.id !== "desert-fortress" || this.worldBreakFortressBreachResolved) return;
    const anchorDistance = skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    const depth = anchorDistance - this.distance;
    if (depth > 2.4) return;
    const dx = (this.playerX - SKY_DANCER_ARCADE_V40_DESERT_BREACH_X) / SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X;
    const dy = (this.playerY - SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y) / SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y;
    const inside = Math.hypot(dx, dy) <= 1;
    this.worldBreakFortressBreachResolved = true;
    this.worldBreakFortressBreachSuccess = this.worldBreakFortressBreachOpen && inside;
    this.worldBreakFortressSerial += 1;
    if (this.worldBreakFortressBreachSuccess) {
      const awarded = this.addScore(SKY_DANCER_ARCADE_V40_DESERT_BREACH_SCORE, true);
      this.turbo = Math.min(100, this.turbo + 22);
      this.message = `WORLD BREAK · FORTRESS BREACHED · +${awarded}`;
      this.messageTimer = 1.55;
      return;
    }
    this.takeDamage(this.worldBreakFortressBreachOpen ? 15 : 24);
    this.message = this.worldBreakFortressBreachOpen
      ? "FORTRESS GATE · BREACH MISSED"
      : "FORTRESS GATE · BREACH DENIED · BATTERIES ACTIVE";
    this.messageTimer = 1.35;
  }


  private updateWorldBreakIceCollapse(): void {
    if (this.stage.id !== "ice-cavern") return;
    for (const aperture of SKY_DANCER_ARCADE_V40_ICE_APERTURES) {
      if (this.worldBreakResolvedIceApertureIndices.has(aperture.index)) continue;
      const anchorDistance = skyDancerArcadeV40IceApertureAnchorDistance(aperture, this.stage.durationSeconds, this.stage.courseSpeed);
      const depth = anchorDistance - this.distance;
      if (depth > 2.4) return;
      const safeX = skyDancerArcadeV40IceApertureX(aperture, this.stageTime);
      const scale = skyDancerArcadeV40IceApertureScale(depth);
      const dx = (this.playerX - safeX) / Math.max(.2, aperture.radiusX * scale);
      const dy = (this.playerY - aperture.y) / Math.max(.2, aperture.radiusY * scale);
      const clean = Math.hypot(dx, dy) <= 1;
      this.worldBreakResolvedIceApertureIndices.add(aperture.index);
      this.worldBreakIceSerial += 1;
      if (clean) {
        this.worldBreakIceHits += 1;
        const awarded = this.addScore(aperture.score + this.worldBreakIceHits * 170, true);
        this.turbo = Math.min(100, this.turbo + 6);
        this.message = `CRYSTAL TUNNEL · APERTURE ${aperture.index + 1} CLEAR · +${awarded}`;
        this.messageTimer = 1.05;
      } else {
        this.worldBreakIceMisses += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 14 : 10);
        this.message = `CRYSTAL TUNNEL · COLLAPSE HIT ${aperture.index + 1}`;
        this.messageTimer = 1.05;
      }
      if (this.worldBreakResolvedIceApertureIndices.size >= SKY_DANCER_ARCADE_V40_ICE_APERTURES.length && this.worldBreakIceMisses === 0) {
        const awarded = this.addScore(SKY_DANCER_ARCADE_V40_ICE_PERFECT_BONUS, true);
        this.turbo = Math.min(100, this.turbo + 18);
        this.worldBreakIceSerial += 1;
        this.message = `WORLD BREAK · CRYSTAL ESCAPE PERFECT · +${awarded}`;
        this.messageTimer = 1.5;
      }
      return;
    }
  }

  private worldBreakPortalDefinition() {
    return SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.find((portal) => portal.index === this.worldBreakPortalChoiceIndex) ?? null;
  }

  private updateWorldBreakFloatingPortal(): void {
    if (this.stage.id !== "floating-ruins" || this.worldBreakPortalChoiceIndex >= 0) return;
    const anchorDistance = skyDancerArcadeV40FloatingPortalAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    const depth = anchorDistance - this.distance;
    if (depth > 2.4) return;
    const portal = [...SKY_DANCER_ARCADE_V40_FLOATING_PORTALS]
      .sort((a, b) => Math.abs(this.playerX - a.x) - Math.abs(this.playerX - b.x))[0];
    if (!portal) return;
    this.worldBreakPortalChoiceIndex = portal.index;
    this.worldBreakPortalDoctrine = portal.doctrine;
    this.worldBreakPortalSerial += 1;
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + portal.hpRecovery);
    this.turbo = Math.min(100, this.turbo + portal.turboRecovery);
    const awarded = this.addScore(portal.score, portal.doctrine !== "FLOW");
    this.message = `SKY LABYRINTH · ${portal.label} · +${awarded}`;
    this.messageTimer = 1.55;
  }

  private updateWorldBreakNeonPursuit(delta: number, turboActive: boolean): void {
    if (this.stage.id !== "night-metro" || this.worldBreakPursuitResolved) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START) return;
    if (progress > SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END) {
      this.worldBreakPursuitResolved = true;
      this.worldBreakPursuitResolvedAt = this.stageTime;
      this.worldBreakPursuitSerial += 1;
      this.message = `NEON PURSUIT · PHANTOM ESCAPED · GAP ${Math.round(this.worldBreakPursuitGap)}m`;
      this.messageTimer = 1.35;
      return;
    }
    const targetX = skyDancerArcadeV40NeonPhantomX(this.stageTime);
    const targetY = skyDancerArcadeV40NeonPhantomY(this.stageTime);
    const normalizedDistance = Math.hypot((this.playerX - targetX) / 1.18, (this.playerY - targetY) / .92);
    const alignment = clamp(1 - normalizedDistance, 0, 1);
    const aligned = normalizedDistance <= 1;
    const closureRate = aligned ? 4.6 + alignment * 3.2 + (turboActive ? 7.8 : 0) : -3.2;
    this.worldBreakPursuitGap = clamp(this.worldBreakPursuitGap - closureRate * delta, 5, 92);
    this.worldBreakPursuitTrackedSeconds = Math.max(0, this.worldBreakPursuitTrackedSeconds + (aligned ? delta : -delta * .35));
    const targetTick = Math.floor(this.worldBreakPursuitTrackedSeconds / SKY_DANCER_ARCADE_V40_NEON_PURSUIT_TICK_SECONDS);
    while (this.worldBreakPursuitTick < targetTick) {
      this.worldBreakPursuitTick += 1;
      this.addScore(360 + this.worldBreakPursuitTick * 85, true);
      this.turbo = Math.min(100, this.turbo + 2.5);
      this.worldBreakPursuitSerial += 1;
    }
    if (this.worldBreakPursuitGap > SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP) return;
    this.worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP;
    this.worldBreakPursuitCaught = true;
    this.worldBreakPursuitResolved = true;
    this.worldBreakPursuitResolvedAt = this.stageTime;
    this.worldBreakPursuitSerial += 1;
    const awarded = this.addScore(SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_SCORE, true);
    this.turbo = Math.min(100, this.turbo + 20);
    this.message = `WORLD BREAK · PHANTOM CAUGHT · +${awarded}`;
    this.messageTimer = 1.65;
  }

  private updateWorldBreakMagmaPressure(delta: number, turboActive: boolean): void {
    if (this.stage.id !== "volcano-core" || this.worldBreakMagmaResolved) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < SKY_DANCER_ARCADE_V40_MAGMA_START) return;
    if (progress > SKY_DANCER_ARCADE_V40_MAGMA_END) {
      this.worldBreakMagmaResolved = true;
      this.worldBreakMagmaEscaped = this.worldBreakMagmaHits === 0 && this.worldBreakMagmaLead >= SKY_DANCER_ARCADE_V40_MAGMA_SAFE_LEAD;
      this.worldBreakMagmaSerial += 1;
      if (this.worldBreakMagmaEscaped) {
        const awarded = this.addScore(SKY_DANCER_ARCADE_V40_MAGMA_ESCAPE_SCORE, true);
        this.turbo = Math.min(100, this.turbo + 18);
        this.message = `WORLD BREAK · ERUPTION OUTRUN · +${awarded}`;
      } else {
        this.message = `MAGMA PRESSURE · ESCAPE SURVIVED · LEAD ${Math.round(this.worldBreakMagmaLead)}m`;
      }
      this.messageTimer = 1.55;
      return;
    }
    const eruptionRate = this.options.difficulty === "hard" ? 8.1 : 7.2;
    const escapeRate = turboActive ? 11.2 : 2.05;
    const lineBonus = Math.abs(this.playerX) < 1.12 ? .8 : 0;
    this.worldBreakMagmaLead = clamp(this.worldBreakMagmaLead + (escapeRate + lineBonus - eruptionRate) * delta, -2, 76);
    if (this.worldBreakMagmaLead > 0) return;
    this.worldBreakMagmaHits += 1;
    this.worldBreakMagmaSerial += 1;
    this.takeDamage(this.options.difficulty === "hard" ? 24 : 18);
    this.worldBreakMagmaLead = 22;
    this.message = `MAGMA PRESSURE · ERUPTION HIT ${this.worldBreakMagmaHits} · TURBO NOW`;
    this.messageTimer = 1.25;
  }

  private updateWorldBreakOrbitalAscent(delta: number, turboActive: boolean): void {
    if (this.stage.id !== "orbital-ascent" || this.worldBreakOrbitResolved) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < SKY_DANCER_ARCADE_V40_ORBIT_START) return;
    if (progress > SKY_DANCER_ARCADE_V40_ORBIT_END) {
      this.worldBreakOrbitResolved = true;
      this.worldBreakOrbitResolvedAt = this.stageTime;
      this.worldBreakOrbitComplete = this.worldBreakOrbitAltitude >= SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE;
      this.worldBreakOrbitSerial += 1;
      this.message = `ZERO-G ASCENT · SHAFT LOST · ALT ${Math.round(this.worldBreakOrbitAltitude)}`;
      this.messageTimer = 1.35;
      return;
    }
    const safeX = skyDancerArcadeV40OrbitalSafeX(this.stageTime);
    const aligned = Math.abs(this.playerX - safeX) <= SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH && this.playerY >= .18;
    if (aligned) {
      const climbRate = 4.8 + Math.max(0, this.playerY) * 1.35 + (turboActive ? 8.4 : 0);
      this.worldBreakOrbitAltitude = Math.min(SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE, this.worldBreakOrbitAltitude + climbRate * delta);
      this.worldBreakOrbitStrikeTimer = Math.max(0, this.worldBreakOrbitStrikeTimer - delta * .7);
      const nextTick = Math.floor(this.worldBreakOrbitAltitude / 20);
      while (this.worldBreakOrbitTick < nextTick) {
        this.worldBreakOrbitTick += 1;
        this.addScore(520 + this.worldBreakOrbitTick * 120, true);
        this.turbo = Math.min(100, this.turbo + 4);
        this.worldBreakOrbitSerial += 1;
      }
    } else {
      this.worldBreakOrbitAltitude = Math.max(0, this.worldBreakOrbitAltitude - delta * 1.05);
      this.worldBreakOrbitStrikeTimer += delta;
      if (this.worldBreakOrbitStrikeTimer >= SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS) {
        this.worldBreakOrbitStrikeTimer = 0;
        this.worldBreakOrbitStrikes += 1;
        this.worldBreakOrbitSerial += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 16 : 12);
        this.message = `ZERO-G ASCENT · DEBRIS STRIKE ${this.worldBreakOrbitStrikes} · FIND AXIS`;
        this.messageTimer = 1.05;
      }
    }
    if (this.worldBreakOrbitAltitude < SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE) return;
    this.worldBreakOrbitComplete = true;
    this.worldBreakOrbitResolved = true;
    this.worldBreakOrbitResolvedAt = this.stageTime;
    this.worldBreakOrbitSerial += 1;
    const awarded = this.addScore(SKY_DANCER_ARCADE_V40_ORBIT_COMPLETE_SCORE, true);
    this.turbo = Math.min(100, this.turbo + 22);
    this.message = `WORLD BREAK · ZERO-G ASCENT CLEAR · +${awarded}`;
    this.messageTimer = 1.65;
  }

  private updateWorldBreakPrismReprise(): void {
    if (this.stage.id !== "prism-citadel") return;
    for (const trial of SKY_DANCER_ARCADE_V40_PRISM_TRIALS) {
      if (this.worldBreakResolvedPrismTrialIndices.has(trial.index)) continue;
      const anchorDistance = skyDancerArcadeV40PrismTrialAnchorDistance(trial, this.stage.durationSeconds, this.stage.courseSpeed);
      const depth = anchorDistance - this.distance;
      if (depth > 2.4) return;
      const routeStageId = skyDancerArcadeV40PrismTrialStageId(this.route, trial.index);
      const x = skyDancerArcadeV40PrismTrialX(trial, routeStageId, this.stageTime);
      const y = skyDancerArcadeV40PrismTrialY(trial, routeStageId, this.stageTime);
      const clean = Math.hypot((this.playerX - x) / trial.radius, (this.playerY - y) / trial.radius) <= 1;
      this.worldBreakResolvedPrismTrialIndices.add(trial.index);
      this.worldBreakPrismSerial += 1;
      const label = `${skyDancerArcadeV40WorldProfile(routeStageId).signature} REPRISE`;
      if (clean) {
        this.worldBreakPrismHits += 1;
        const awarded = this.addScore(trial.score + this.worldBreakPrismHits * 190, true);
        this.turbo = Math.min(100, this.turbo + 7);
        this.message = `${label} · SKY ${trial.index + 1} BROKEN · +${awarded}`;
      } else {
        this.worldBreakPrismMisses += 1;
        this.takeDamage(this.options.difficulty === "hard" ? 15 : 11);
        this.message = `${label} · SKY ${trial.index + 1} FRACTURED`;
      }
      this.messageTimer = 1.12;
      if (this.worldBreakResolvedPrismTrialIndices.size >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length) {
        this.worldBreakPrismResolvedAt = this.stageTime;
        if (this.worldBreakPrismMisses === 0) {
          const awarded = this.addScore(SKY_DANCER_ARCADE_V40_PRISM_PERFECT_BONUS, true);
          this.turbo = Math.min(100, this.turbo + 24);
          this.worldBreakPrismSerial += 1;
          this.message = `WORLD BREAK · SEVEN SKIES BREAK · +${awarded}`;
          this.messageTimer = 1.8;
        } else {
          this.message = `ROUTE REPRISE · SEVEN SKIES CLEARED · MISS ${this.worldBreakPrismMisses}`;
          this.messageTimer = 1.55;
        }
      }
      return;
    }
  }


  private activeV404Rival(): ArcadeEnemy | null {
    if (this.rivalAceActiveId === null) return null;
    return this.enemies.find((enemy) => enemy.id === this.rivalAceActiveId && enemy.alive && enemy.rivalAce && !enemy.rivalAceResolved) ?? null;
  }

  private spawnV404RivalAce(): ArcadeEnemy | null {
    if (this.options.mode !== "arcade-run" || this.bossSpawned) return null;
    const encounter = skyDancerArcadeV404RivalEncounterForSection(this.stageNumber);
    if (!encounter || this.rivalAceResolvedAppearances.has(encounter.appearance)) return null;
    const active = this.activeV404Rival();
    if (active) return active;

    const hard = this.options.difficulty === "hard";
    const hp = skyDancerArcadeV404RivalHp(encounter, hard, this.worldBreakRouteDoctrine);
    const sign = encounter.appearance % 2 === 0 ? 1 : -1;
    this.spawnEnemy("ace", sign * 1.58, .42 - encounter.appearance * .12, 56 + encounter.appearance * 3, "cross-pass", sign);
    const rival = this.enemies.at(-1);
    if (!rival) return null;
    rival.rivalAce = true;
    rival.rivalAceAppearance = encounter.appearance;
    rival.rivalAceResolved = false;
    rival.hp = hp;
    rival.maxHp = hp;
    rival.armor = Math.round(hp * (encounter.appearance >= 3 ? .34 : .27));
    rival.maxArmor = rival.armor;
    rival.speed *= 1.08 + encounter.appearance * .035;
    rival.scoreValue = 0;
    rival.amplitude = 1.02 + encounter.appearance * .12;
    rival.fireCooldown = .72 + encounter.appearance * .08;
    rival.counterplayCooldown = .34;
    rival.flightEnergy = 1;

    this.rivalAceActiveId = rival.id;
    this.rivalAceAppearance = encounter.appearance;
    this.rivalAceAdaptation = skyDancerArcadeV404RivalAdaptation(
      this.options.loadout ?? "standard",
      this.worldBreakRouteDoctrine,
      encounter.appearance,
    );
    this.rivalAceAdvantage = 0;
    this.rivalAceAdvantageTarget = skyDancerArcadeV404RivalAdvantageTarget(encounter, hard, this.worldBreakRouteDoctrine);
    this.rivalAceOutcome = "NONE";
    if (!this.rivalAceSeenAppearances.has(encounter.appearance)) {
      this.rivalAceSeenAppearances.add(encounter.appearance);
      this.rivalAceEncounters += 1;
    }
    this.rivalAceSerial += 1;
    this.message = `RIVAL ACE · ${SKY_DANCER_ARCADE_V404_RIVAL_NAME} · ${encounter.label}`;
    this.messageTimer = 2.35;
    this.stageEventLabel = `RIVAL CONTACT ${encounter.appearance}/3`;
    this.stageEventTimer = 1.72;
    this.stageEventSerial += 1;
    return rival;
  }

  private resolveV404RivalAce(enemy: ArcadeEnemy, outcome: Exclude<SkyDancerArcadeV404RivalOutcome, "NONE">): void {
    if (!enemy.rivalAce || enemy.rivalAceResolved) return;
    const encounter = skyDancerArcadeV404RivalEncounterForSection(this.stageNumber);
    enemy.rivalAceResolved = true;
    enemy.locked = false;
    enemy.retreating = true;
    enemy.retreatTimer = 0;
    enemy.retreatSign = enemy.x < 0 ? -1 : 1;
    enemy.retreatDepthDirection = outcome === "ESCAPED" ? 1 : -1;
    enemy.counterplay = "none";
    enemy.counterplayTimer = 0;
    enemy.counterplayIntensity = 0;
    enemy.fireCooldown = 999;
    this.rivalAceActiveId = null;
    this.rivalAceOutcome = outcome;
    this.rivalAceOutcomeHistory.push(outcome);
    if (encounter) this.rivalAceResolvedAppearances.add(encounter.appearance);
    if (outcome === "ESCAPED") {
      this.rivalAceEscapes += 1;
      this.message = encounter?.appearance === 3
        ? `RIVAL ACE · ${SKY_DANCER_ARCADE_V404_RIVAL_NAME} SURVIVES · FINAL DEBT`
        : `RIVAL ACE · ${SKY_DANCER_ARCADE_V404_RIVAL_NAME} ESCAPED · REMATCH`;
      this.messageTimer = 1.75;
    } else {
      this.rivalAcePlayerWins += 1;
      const baseScore = encounter?.score ?? 3200;
      const awarded = this.addScore(Math.round(baseScore * (outcome === "OUTFLOWN" ? 1.12 : 1)), true);
      this.turbo = Math.min(100, this.turbo + (encounter?.appearance === 3 ? 24 : 16));
      this.message = encounter?.appearance === 3
        ? `RIVAL ACE · ${SKY_DANCER_ARCADE_V404_RIVAL_NAME} DEFEATED · SKY IS YOURS · +${awarded}`
        : outcome === "OUTFLOWN"
          ? `RIVAL ACE · ${SKY_DANCER_ARCADE_V404_RIVAL_NAME} OUTFLOWN · +${awarded}`
          : `RIVAL ACE · ${SKY_DANCER_ARCADE_V404_RIVAL_NAME} BROKEN · DISENGAGING · +${awarded}`;
      this.messageTimer = 2.0;
    }
    this.rivalAceSerial += 1;
  }

  private updateV404RivalAce(delta: number, turboActive: boolean): void {
    if (this.options.mode !== "arcade-run") return;
    const encounter = skyDancerArcadeV404RivalEncounterForSection(this.stageNumber);
    if (!encounter || this.rivalAceResolvedAppearances.has(encounter.appearance)) return;
    const progress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    if (progress < encounter.startProgress) return;
    let rival = this.activeV404Rival();
    if (!rival && progress <= encounter.endProgress) rival = this.spawnV404RivalAce();
    if (!rival) return;

    rival.maneuver = skyDancerArcadeV404RivalManeuver(encounter.appearance, rival.age);
    rival.maneuverSign = skyDancerArcadeV404RivalManeuverSign(encounter.appearance, rival.age);
    // Keep the named duel in the readable phone corridor while the standard V24/V25 solver owns actual inertia.
    rival.baseX = clamp(this.playerX * .18 + rival.maneuverSign * .32, -1.2, 1.2);
    rival.baseY = clamp(this.playerY * .12 + Math.sin(rival.age * .74 + encounter.appearance) * .18, -.82, .82);

    if (progress > encounter.endProgress) {
      this.resolveV404RivalAce(rival, "ESCAPED");
      return;
    }

    const reticleDistance = Math.hypot(rival.x - this.playerX, rival.y - this.playerY);
    const depthReadable = rival.depth >= 5 && rival.depth <= 66;
    const alignment = depthReadable ? clamp(1 - reticleDistance / 1.05, 0, 1) : 0;
    const gain = skyDancerArcadeV404RivalPressureGain(
      encounter.appearance,
      alignment,
      this.input.fire,
      this.input.lock,
      turboActive,
    );
    this.rivalAceAdvantage = clamp(this.rivalAceAdvantage + gain * delta, 0, this.rivalAceAdvantageTarget);
    if (this.rivalAceAdvantage >= this.rivalAceAdvantageTarget - .0001) {
      this.resolveV404RivalAce(rival, "OUTFLOWN");
    }
  }


  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {
    if (!enemy.worldBreakTarget || enemy.worldBreakResolved || enemy.worldBreakTargetIndex === undefined) return;
    enemy.worldBreakResolved = true;
    this.worldBreakResolvedTargetIndices.add(enemy.worldBreakTargetIndex);
    this.worldBreakTargetSerial += 1;
    const fortress = this.stage.id === "desert-fortress";
    const prefix = fortress ? "FORTRESS BATTERY" : "DECK STRIKE";
    if (destroyed) {
      this.worldBreakTargetHits += 1;
      const awarded = this.addScore(enemy.worldBreakScoreBonus ?? 1400, true);
      this.turbo = Math.min(100, this.turbo + (fortress ? 10 : 8));
      const fortressComplete = fortress && this.worldBreakTargetHits >= SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length;
      if (fortressComplete && !this.worldBreakFortressBreachOpen) {
        this.worldBreakFortressBreachOpen = true;
        this.worldBreakFortressSerial += 1;
        this.turbo = Math.min(100, this.turbo + 10);
        this.message = `FORTRESS BATTERIES DOWN · BREACH OPEN · +${awarded}`;
        this.messageTimer = 1.5;
      } else {
        this.message = `${prefix} · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} DOWN · +${awarded}`;
        this.messageTimer = 1.2;
      }
    } else {
      this.worldBreakTargetMisses += 1;
      this.message = `${prefix} · ${enemy.worldBreakLabel ?? "SUBSYSTEM"} ESCAPED`;
      this.messageTimer = .9;
    }
  }

  private get branchActive(): boolean {
    if (this.stage.next.length <= 1 || this.branchWasResolved) return false;
    const start = this.stage.durationSeconds * 0.27;
    const end = this.stage.durationSeconds * 0.43;
    return this.stageTime >= start && this.stageTime <= end;
  }

  private updateBranch(): void {
    if (this.stage.next.length <= 1 || this.branchWasResolved) return;
    const start = this.stage.durationSeconds * 0.27;
    const end = this.stage.durationSeconds * 0.43;
    if (this.stageTime < start) return;
    if (this.stageTime <= end) {
      const count = this.stage.next.length;
      const normalized = clamp((this.playerX + PLAYER_X_LIMIT) / (PLAYER_X_LIMIT * 2), 0, 0.9999);
      const index = Math.min(count - 1, Math.floor(normalized * count));
      this.branchSelection = this.stage.next[index] ?? this.stage.next[0] ?? null;
      if (this.message !== "SELECT ROUTE") {
        this.message = "SELECT ROUTE";
        this.messageTimer = Math.min(1.05, end - this.stageTime);
      }
      return;
    }
    this.branchWasResolved = true;
    if (!this.branchSelection) {
      const index = Math.floor(this.random() * this.stage.next.length);
      this.branchSelection = this.stage.next[index] ?? this.stage.next[0] ?? null;
    }
    if (this.branchSelection) {
      const selectedIndex = this.stage.next.indexOf(this.branchSelection);
      const doctrine = skyDancerArcadeV40RouteDoctrine(selectedIndex, this.stage.next.length);
      this.message = `ROUTE LOCKED · ${doctrine} · ${skyDancerArcadeStageById(this.branchSelection).name}`;
      this.messageTimer = 2.4;
      this.addScore(doctrine === "DANGER" ? 3600 : doctrine === "SCORE" ? 3000 : 2500, false);
    }
  }

  private updateV11Timeline(): void {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const nextIndex = skyDancerArcadeV11BeatIndex(this.stage.id, progress);
    if (nextIndex === this.timelineBeatIndex) return;
    this.timelineBeatIndex = nextIndex;
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    this.timelineSerial += 1;
    // Reuse the proven presentation event channel while V11 owns the actual gameplay timeline.
    this.stageEventSerial += 1;
    this.stageEventLabel = beat.label;
    this.stageEventTimer = 1.72;
    this.message = `COURSE BEAT · ${beat.label}`;
    this.messageTimer = beat.kind === "boss" ? 1.15 : 1.4;
    this.addScore(beat.scoreBonus, true);
    this.turbo = Math.min(100, this.turbo + 4 + Math.round(beat.intensity * 5));
    if (!this.bossSpawned && beat.forcedHazard && this.hazards.length < 8) this.spawnHazardPattern(beat.forcedHazard);
  }

  private updateStageEvolution(): void {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const checkpoint = skyDancerArcadeStageEventCheckpoint(progress, this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE);
    if (checkpoint <= this.stageEventCheckpoint) return;
    this.stageEventCheckpoint = checkpoint;
    const profile = skyDancerArcadeStageEvolutionProfile(this.stage.biome);
    const eventIndex = checkpoint - 1;
    const label = profile.labels[eventIndex];
    this.stageEventLabel = label;
    this.stageEventTimer = 1.65;
    this.stageEventSerial += 1;
    this.message = `STAGE EVENT · ${label}`;
    this.messageTimer = 1.45;
    this.addScore(profile.scoreBonus, true);
    this.turbo = Math.min(100, this.turbo + 5 + this.stage.act);
    const bursts = profile.hazardBursts[eventIndex] + (this.options.difficulty === "hard" && checkpoint === 2 ? 1 : 0);
    for (let index = 0; index < bursts && this.hazards.length < 10; index += 1) {
      this.spawnHazardPattern(profile.eventHazards[eventIndex]);
    }
  }

  private updateV12CombatSignals(delta: number, turboActive: boolean): void {
    const decay = Math.exp(-delta * .43);
    this.directorGunHeat *= decay;
    this.directorMissileHeat *= decay;
    this.directorTurboHeat *= decay;
    this.directorRecentDamage = Math.max(0, this.directorRecentDamage - delta * .24);
    if (this.input.fire) this.directorGunHeat = clamp(this.directorGunHeat + delta * .82, 0, 3);
    if (this.input.lock) this.directorMissileHeat = clamp(this.directorMissileHeat + delta * .32, 0, 3);
    if (turboActive) this.directorTurboHeat = clamp(this.directorTurboHeat + delta * .72, 0, 3);
  }

  private currentV12CombatPlan(): SkyDancerArcadeV12EncounterPlan {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    return skyDancerArcadeV12CombatPlan({
      gunHeat: this.directorGunHeat,
      missileHeat: this.directorMissileHeat,
      turboHeat: this.directorTurboHeat,
      recentDamage: this.directorRecentDamage,
      hpRatio: this.playerHp / PLAYER_MAX_HP,
      chain: this.chain,
      beatIntensity: beat.intensity,
      hard: this.options.difficulty === "hard",
    });
  }

  private applyV12CombatPlan(plan: SkyDancerArcadeV12EncounterPlan): void {
    const shifted = plan.mode !== this.combatDirectorMode;
    this.combatDirectorMode = plan.mode;
    this.combatDirectorPlayerStyle = plan.playerStyle;
    this.combatDirectorLabel = plan.label;
    this.combatDirectorIntent = plan.intent;
    this.combatDirectorIntensity = plan.intensity;
    this.combatDirectorPressure = plan.pressure;
    this.combatDirectorCadenceScale = plan.cadenceScale;
    this.combatDirectorCounterplayDelay = plan.counterplayDelay;
    this.combatDirectorWaveSerial += 1;
    if (!shifted) return;
    this.combatDirectorSerial += 1;
    // Director messaging is intentionally short and only occurs on a doctrine shift.
    if (this.combatDirectorWaveSerial > 1) {
      this.message = `DIRECTOR SHIFT · ${plan.label}`;
      this.messageTimer = Math.max(this.messageTimer, .82);
    }
  }

  private updateDirector(): void {
    // V32: route/continue establishing shots are presentation-only breathing room.
    if (this.stageEntryTimer > 0) return;
    this.updateV121EncounterQueue();
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const portalPressureScale = this.stage.id === "floating-ruins" ? (this.worldBreakPortalDefinition()?.pressureScale ?? 1) : 1;
    const worldBreakPressureScale = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).pressureScale * portalPressureScale;
    const bossTime = this.stage.durationSeconds * skyDancerArcadeBossStartProgress(this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE);
    if (!this.bossSpawned && this.stageTime >= bossTime) this.spawnBoss();
    // V27: total population and, more importantly, near-camera population have separate readability ceilings.
    const hardV27 = this.options.difficulty === "hard";
    const densityV27 = skyDancerArcadeV27DensityCaps(hardV27);
    const corridorCrowdedV271 = skyDancerArcadeV271CombatCorridorCrowded(
      this.enemies.filter((enemy) => enemy.alive && !enemy.boss).map((enemy) => enemy.depth),
      hardV27,
    );
    if (!this.bossSpawned && !corridorCrowdedV271 && this.encounterPhaseQueue.length === 0 && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < densityV27.enemyCap) {
      this.spawnWave();
      const pressure = this.options.difficulty === "hard" ? 0.84 : 1;
      this.nextWaveAt += this.stage.waveIntervalSeconds * beat.waveIntervalScale * pressure * worldBreakPressureScale * this.combatDirectorCadenceScale * this.encounterGrammarCadenceScale * (0.84 + this.random() * 0.34);
    }
    if (!this.bossSpawned && this.stageTime >= this.nextHazardAt && this.hazards.length < 8) {
      this.spawnHazardPattern();
      this.nextHazardAt += (3.8 - this.stage.turbulence * 2.6) * beat.hazardIntervalScale * worldBreakPressureScale * (0.82 + this.random() * 0.42);
    }
  }

  private spawnWave(): void {
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const plan = this.currentV12CombatPlan();
    this.applyV12CombatPlan(plan);
    const grammar = skyDancerArcadeV121EncounterGrammar(
      this.stage.id,
      plan.mode,
      this.waveSerial,
      beat.id,
      plan.intensity,
      this.options.difficulty === "hard",
    );
    this.waveSerial += 1;
    this.encounterGrammarId = grammar.id;
    this.encounterGrammarLabel = grammar.label;
    this.encounterGrammarIntent = grammar.intent;
    this.encounterGrammarPhaseCount = grammar.phases.length;
    this.encounterGrammarCadenceScale = grammar.cadenceScale;
    this.encounterGrammarSerial += 1;
    this.encounterPhaseQueue = grammar.phases.slice(1).map((phase, index) => ({
      at: this.stageTime + phase.delay,
      grammar,
      phase,
      phaseIndex: index + 1,
      plan,
    }));
    const first = grammar.phases[0];
    if (first) this.spawnV121EncounterPhase(grammar, first, 0, plan);
  }

  private updateV121EncounterQueue(): void {
    if (this.bossSpawned) {
      this.encounterPhaseQueue = [];
      return;
    }
    const hardV27 = this.options.difficulty === "hard";
    const crowdedV271 = skyDancerArcadeV271CombatCorridorCrowded(
      this.enemies.filter((enemy) => enemy.alive && !enemy.boss).map((enemy) => enemy.depth),
      hardV27,
    );
    // V27: authored follow-up phases wait briefly if the phone-sized combat corridor is already full.
    // The phase is delayed, not discarded, so encounter grammar survives while visual pile-ups do not.
    if (crowdedV271 && this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {
      this.encounterPhaseQueue[0].at = this.stageTime + .28;
      return;
    }
    while (this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {
      const queued = this.encounterPhaseQueue.shift();
      if (!queued) break;
      this.spawnV121EncounterPhase(queued.grammar, queued.phase, queued.phaseIndex, queued.plan);
    }
  }

  private spawnV121EncounterPhase(
    grammar: SkyDancerArcadeV121EncounterGrammar,
    phase: SkyDancerArcadeV121EncounterPhase,
    phaseIndex: number,
    plan: SkyDancerArcadeV12EncounterPlan,
  ): void {
    this.encounterGrammarId = grammar.id;
    this.encounterGrammarLabel = grammar.label;
    this.encounterGrammarIntent = grammar.intent;
    this.encounterGrammarPhaseLabel = phase.label;
    this.encounterGrammarPhaseIndex = phaseIndex + 1;
    this.encounterGrammarPhaseCount = grammar.phases.length;
    const carryoverEnemies = this.enemies.filter((enemy) => enemy.alive && !enemy.boss);
    const continuity = skyDancerArcadeV122EncounterContinuity({
      playerX: this.playerX,
      playerVX: this.playerVX,
      survivorXs: carryoverEnemies.map((enemy) => enemy.x),
      phaseIndex,
    });
    this.encounterContinuityLabel = continuity.label;
    this.encounterContinuityBreakSign = continuity.breakSign;
    this.encounterContinuityEntrySign = continuity.entrySign;
    this.encounterContinuitySurvivors = continuity.survivorCount;
    this.encounterContinuityLateralBias = continuity.lateralBias;
    this.encounterContinuitySerial += 1;

    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);
    const beat = skyDancerArcadeV11Beat(this.stage.id, progress);
    const authoredFormations = beat.preferredFormations.length > 0 ? beat.preferredFormations : this.stage.formations;
    const formationCandidates = [phase.formation, ...plan.formationBias, ...authoredFormations];
    const formation = formationCandidates.find((candidate) => authoredFormations.includes(candidate)) ?? authoredFormations[0] ?? "line";
    const authoredEnemyPool = beat.preferredEnemies.length > 0 ? beat.preferredEnemies : this.stage.enemies;
    const biasedEnemyPool = [...phase.enemyBias, ...plan.enemyBias, ...authoredEnemyPool].filter((kind) => authoredEnemyPool.includes(kind));
    const enemyPool = biasedEnemyPool.length > 0 ? biasedEnemyPool : authoredEnemyPool;
    const hardBonus = this.options.difficulty === "hard" ? 1 : 0;
    const totalTarget = clamp(3 + Math.floor(this.random() * 2) + hardBonus + (beat.intensity > .9 ? 1 : 0) + plan.waveCountDelta, 2, 6);
    const plannedCount = clamp(Math.round(totalTarget * phase.countScale) + phase.countDelta, 1, 4);
    const densityV27 = skyDancerArcadeV27DensityCaps(this.options.difficulty === "hard");
    const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
    const count = Math.max(0, Math.min(plannedCount, densityV27.enemyCap - aliveNonBoss));
    if (count <= 0) return;

    let startIndex = 0;
    if (
      this.stage.id === "dawn-city"
      && beat.id === "ace-pursuit"
      && phaseIndex === grammar.phases.length - 1
      && authoredEnemyPool.includes("ace")
    ) {
      const sign = this.waveSerial % 2 === 0 ? 1 : -1;
      this.spawnEnemy("ace", sign * 1.86, .12, -6.4, "overtake", sign);
      startIndex = 1;
    }

    for (let index = startIndex; index < count; index += 1) {
      const kind = enemyPool[Math.floor(this.random() * enemyPool.length)] ?? "fighter";
      const [formationX, formationY] = this.formationPosition(formation, index, count);
      const maneuver: SkyDancerArcadeEnemyManeuver = index === 0 || (index + phaseIndex) % 3 !== 0
        ? phase.maneuver
        : phase.secondaryManeuver;
      const formationSign = Math.abs(formationX) > 0.18 ? Math.sign(formationX) : (index + phaseIndex) % 2 === 0 ? 1 : -1;
      const sign = maneuver === "overtake" && phaseIndex > 0 && continuity.entrySign !== 0
        ? continuity.entrySign
        : formationSign;
      const flowActive = phaseIndex > 0 && maneuver !== "overtake" && continuity.entrySign !== 0;
      const flowBias = flowActive ? continuity.lateralBias : 0;
      // Continuity does not discard the authored formation: it compresses its width,
      // then recenters it into the lane the player is trying to escape through.
      // This also guarantees a one-ship reinforcement can actually occupy that lane.
      const flowFormationX = flowActive ? formationX * .45 : formationX;
      const x = maneuver === "overtake"
        ? sign * 1.9
        : maneuver === "cross-pass"
          ? clamp(flowFormationX + sign * .18 + flowBias, -ENEMY_X_LIMIT, ENEMY_X_LIMIT)
          : clamp(flowFormationX + flowBias, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
      const y = maneuver === "overtake" ? clamp(formationY * .34, -.62, .62) : formationY;
      const depthBase = maneuver === "overtake" ? -6.4 : maneuver === "cross-pass" ? 44 : maneuver === "parallel" ? 48 : maneuver === "close-bank" ? 50 : 56;
      const depth = maneuver === "overtake" ? depthBase : depthBase + phase.depthOffset + index * 3.1 + this.random() * 6;
      this.spawnEnemy(kind, x, y, depth, maneuver, sign);
    }
  }

  private formationPosition(formation: SkyDancerArcadeFormation, index: number, count: number): [number, number] {
    const centered = count <= 1 ? 0 : (index / (count - 1)) * 2 - 1;
    switch (formation) {
      case "vee": return [centered * 1.92, Math.abs(centered) * 0.86 - 0.42];
      case "cross": return [index % 2 === 0 ? centered * 1.68 : 0, index % 2 === 0 ? 0 : centered * 1.42];
      case "spiral": {
        const angle = (index / Math.max(1, count)) * Math.PI * 2;
        return [Math.cos(angle) * 1.72, Math.sin(angle) * 1.38];
      }
      case "pincer": return [index < count / 2 ? -2.08 + index * 0.24 : 2.08 - (count - index - 1) * 0.24, centered * 0.72];
      case "wall": return [centered * 2.18, Math.sin(index * 1.7) * 0.62];
      default: return [centered * 1.88, Math.sin(index * 0.9) * 0.48];
    }
  }

  private spawnV40DesertFortressTargets(rewindTime: number): void {
    for (const target of SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS) {
      if (this.worldBreakResolvedTargetIndices.has(target.index)) continue;
      const anchorDistance = skyDancerArcadeV40FleetTargetAnchorDistance(target, this.stage.durationSeconds, this.stage.courseSpeed);
      if (rewindTime > 0 && anchorDistance <= this.distance + 3) {
        this.worldBreakResolvedTargetIndices.add(target.index);
        this.worldBreakTargetMisses += 1;
        continue;
      }
      this.spawnEnemy(target.kind, target.x, target.y, anchorDistance - this.distance, "parallel", target.x < 0 ? -1 : 1);
      const enemy = this.enemies.at(-1);
      if (!enemy) continue;
      enemy.hp = target.hp * (this.options.difficulty === "hard" ? 1.15 : 1);
      enemy.maxHp = enemy.hp;
      enemy.armor = 0;
      enemy.maxArmor = 0;
      enemy.scoreValue = Math.round(target.score * .42);
      enemy.speed = 0;
      enemy.fireCooldown = 999;
      enemy.amplitude = 0;
      enemy.worldBreakTarget = true;
      enemy.worldBreakTargetIndex = target.index;
      enemy.worldBreakLabel = target.label;
      enemy.worldBreakAnchorDistance = anchorDistance;
      enemy.worldBreakScoreBonus = target.score;
      enemy.worldBreakResolved = false;
      enemy.counterplayCooldown = 999;
    }
  }

  private spawnV40CloudFleetTargets(rewindTime: number): void {
    for (const target of SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS) {
      if (this.worldBreakResolvedTargetIndices.has(target.index)) continue;
      const anchorDistance = skyDancerArcadeV40FleetTargetAnchorDistance(target, this.stage.durationSeconds, this.stage.courseSpeed);
      if (rewindTime > 0 && anchorDistance <= this.distance + 3) {
        this.worldBreakResolvedTargetIndices.add(target.index);
        this.worldBreakTargetMisses += 1;
        continue;
      }
      this.spawnEnemy(target.kind, target.x, target.y, anchorDistance - this.distance, "parallel", target.x < 0 ? -1 : 1);
      const enemy = this.enemies.at(-1);
      if (!enemy) continue;
      const hpScale = this.options.difficulty === "hard" ? 1.14 : 1;
      enemy.hp = Math.round(target.hp * hpScale);
      enemy.maxHp = enemy.hp;
      enemy.armor = 0;
      enemy.maxArmor = 0;
      enemy.scoreValue = Math.round(target.score * .42);
      enemy.speed = 0;
      enemy.fireCooldown = 999;
      enemy.amplitude = 0;
      enemy.worldBreakTarget = true;
      enemy.worldBreakTargetIndex = target.index;
      enemy.worldBreakLabel = target.label;
      enemy.worldBreakAnchorDistance = anchorDistance;
      enemy.worldBreakScoreBonus = target.score;
      enemy.worldBreakResolved = false;
      enemy.counterplayCooldown = 999;
    }
  }

  private spawnEnemy(
    kind: SkyDancerArcadeEnemyKind,
    x: number,
    y: number,
    depth: number,
    maneuver: SkyDancerArcadeEnemyManeuver = "approach",
    maneuverSign = 1,
  ): void {
    const stats = skyDancerArcadeEnemyStatsV20(kind, this.options.difficulty === "hard");
    const maxArmor = Math.round(stats.hp * skyDancerArcadeArmorRatio(kind));
    this.enemies.push({
      id: this.nextEntityId++,
      kind,
      x,
      y,
      depth,
      hp: stats.hp,
      maxHp: stats.hp,
      locked: false,
      boss: false,
      phase: this.random() * Math.PI * 2,
      maneuver,
      role: skyDancerArcadeEnemyRole(kind),
      armor: maxArmor,
      maxArmor,
      bossPhase: 1,
      weakpointOpen: false,
      stagger: 0,
      age: 0,
      speed: stats.speed,
      baseX: x,
      baseY: y,
      amplitude: 0.28 + this.random() * 0.72,
      fireCooldown: 1.1 + this.random() * 2.4,
      scoreValue: stats.score,
      alive: true,
      maneuverClock: 0,
      maneuverSign: maneuverSign < 0 ? -1 : 1,
      flightVX: 0,
      flightVY: 0,
      flightBank: 0,
      flightPitch: 0,
      flightEnergy: 1,
      loadoutStaggerRewarded: false,
      counterplay: "none",
      counterplayIntensity: 0,
      counterplayTimer: 0,
      counterplayCooldown: Math.max(.38 + (this.nextEntityId % 3) * .31, this.combatDirectorCounterplayDelay + (this.nextEntityId % 3) * .16),
      counterplayRewarded: false,
    });
  }

  private bossMechanicLabel(phase: SkyDancerArcadeBossPhase): string {
    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {
      return skyDancerArcadeV405FinalBossPhase(this.finalBossContract, phase).label;
    }
    return skyDancerArcadeV11BossMechanicLabel(this.stage.id, phase);
  }

  private spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    this.encounterPhaseQueue = [];
    this.encounterGrammarPhaseLabel = "CLIMAX";
    // V30: boss ingress owns the arena without teleporting the previous fight away.
    // Standard aircraft break lock, stop attacking and visibly peel out of the lane before they are culled.
    for (const enemy of this.enemies) {
      if (enemy.boss || !enemy.alive) continue;
      enemy.locked = false;
      enemy.retreating = true;
      enemy.retreatTimer = 0;
      enemy.retreatSign = enemy.x < -0.05 ? -1 : enemy.x > 0.05 ? 1 : enemy.id % 2 === 0 ? -1 : 1;
      // Aircraft already close to the player complete their fly-by; distant aircraft bank away into the background.
      enemy.retreatDepthDirection = enemy.depth <= 30 ? -1 : 1;
      enemy.counterplay = "none";
      enemy.counterplayTimer = 0;
      enemy.counterplayIntensity = 0;
      enemy.fireCooldown = 999;
    }
    // Do not make bullets and hazards blink out either. They become harmless and clear the frame under motion.
    for (const projectile of this.projectiles) {
      if (projectile.owner !== "enemy" || projectile.life <= 0) continue;
      projectile.retiring = true;
      projectile.damage = 0;
      projectile.guidance = 0;
      projectile.life = Math.min(projectile.life, 0.9);
    }
    for (const hazard of this.hazards) {
      hazard.retiring = true;
      hazard.courseAnchorDistance = null;
      hazard.speed = Math.max(hazard.speed, 68);
    }
    const final = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;
    this.bossIngressTimer = final ? BOSS_INGRESS_HOLD_SECONDS + .18 : BOSS_INGRESS_HOLD_SECONDS;
    this.bossOpeningStrikePending = true;
    this.bossOutroTimer = 0;
    const reactiveContract = final
      ? skyDancerArcadeV405FinalBossContract(this.worldBreakRouteHistory, this.rivalAceOutcomeHistory)
      : null;
    this.finalBossContract = reactiveContract;
    if (reactiveContract) this.finalBossSerial += 1;
    // Climax targets must survive a full attack run instead of evaporating under one gun burst.
    const baseHp = final ? 1280 * (reactiveContract?.hpScale ?? 1) : 440 + this.stage.act * 110;
    const hp = Math.round(baseHp * (this.options.difficulty === "hard" ? 1.25 : 1));
    const maxArmor = Math.round(hp * skyDancerArcadeArmorRatio("boss", true));
    this.enemies.push({
      id: this.nextEntityId++,
      kind: "boss",
      x: 0,
      y: 0.1,
      depth: 88,
      hp,
      maxHp: hp,
      locked: false,
      boss: true,
      phase: 0,
      maneuver: "approach",
      role: "climax",
      armor: maxArmor,
      maxArmor,
      bossPhase: 1,
      weakpointOpen: false,
      stagger: 0,
      age: 0,
      speed: 7.2,
      baseX: 0,
      baseY: 0.1,
      amplitude: 1.42,
      fireCooldown: this.bossIngressTimer + .42,
      scoreValue: final ? 24000 : 12000,
      alive: true,
      maneuverClock: 0,
      maneuverSign: 1,
      flightVX: 0,
      flightVY: 0,
      flightBank: 0,
      flightPitch: 0,
      flightEnergy: 1,
      loadoutStaggerRewarded: false,
      counterplay: "none",
      counterplayIntensity: 0,
      counterplayTimer: 0,
      counterplayCooldown: Math.max(.9 + (this.nextEntityId % 3) * .31, this.combatDirectorCounterplayDelay),
      counterplayRewarded: false,
      finalBossForm: reactiveContract?.form,
      finalBossAccent: reactiveContract?.accent,
      finalBossReactive: Boolean(reactiveContract),
    });
    const bossProfile = skyDancerArcadeV11BossProfile(this.stage.id);
    this.bossMechanicSerial += 1;
    this.message = `WARNING · ${this.stage.bossName} · ${this.bossMechanicLabel(1)}`;
    this.messageTimer = 3.2;
    this.stageSerial += 1;
  }

  private spawnBossPhaseEscorts(phase: SkyDancerArcadeBossPhase): void {
    const profile = skyDancerArcadeV11BossProfile(this.stage.id);
    const index = phase - 1;
    const kind = profile.escortKinds[index];
    const count = profile.escortCounts[index];
    if (!kind || count <= 0) return;
    const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
    const allowed = Math.max(0, Math.min(count, 4 - aliveNonBoss));
    for (let escort = 0; escort < allowed; escort += 1) {
      const sign = escort % 2 === 0 ? -1 : 1;
      const maneuver: SkyDancerArcadeEnemyManeuver = profile.motionStyle === "broadside" || profile.motionStyle === "carrier"
        ? "parallel"
        : profile.motionStyle === "phantom" || profile.motionStyle === "duel"
          ? "overtake"
          : "cross-pass";
      // V32: escorts enter from the far combat corridor after the phase telegraph instead of popping in near the boss.
      this.spawnEnemy(kind, sign * (1.35 + escort * .22), sign * .34, 68 + escort * 7, maneuver, sign);
    }
  }

  private triggerBossPhaseMechanic(phase: SkyDancerArcadeBossPhase): void {
    const profile = skyDancerArcadeV11BossProfile(this.stage.id);
    const index = phase - 1;
    const hazard = profile.phaseHazards[index];
    const bursts = profile.phaseHazardBursts[index];
    if (hazard) for (let burst = 0; burst < bursts; burst += 1) this.spawnHazardPattern(hazard);
    this.spawnBossPhaseEscorts(phase);

    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {
      const reactive = skyDancerArcadeV405FinalBossPhase(this.finalBossContract, phase);
      if (reactive.hazard) {
        for (let burst = 0; burst < reactive.hazardBursts; burst += 1) this.spawnHazardPattern(reactive.hazard);
      }
      if (reactive.escortKind && reactive.escortCount > 0) {
        const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
        const allowed = Math.max(0, Math.min(reactive.escortCount, 4 - aliveNonBoss));
        for (let escort = 0; escort < allowed; escort += 1) {
          const sign = escort % 2 === 0 ? -1 : 1;
          this.spawnEnemy(reactive.escortKind, sign * 1.62, sign * .42, 72 + escort * 6, "cross-pass", sign);
        }
      }
      this.finalBossSerial += 1;
    }
    this.bossMechanicSerial += 1;
  }

  private spawnHazardPattern(forcedKind?: SkyDancerArcadeHazardKind): void {
    const kind = forcedKind ?? this.stage.hazards[Math.floor(this.random() * this.stage.hazards.length)] ?? "debris";
    const requestedCount = kind === "mine" || kind === "debris" ? 5 + Math.floor(this.random() * 3) : 4;
    const count = Math.min(requestedCount, Math.max(0, 10 - this.hazards.length));
    if (count <= 0) return;
    const safeLane = Math.floor(this.random() * count);
    const center = clamp(this.playerX * 0.28, -0.55, 0.55);
    for (let index = 0; index < count; index += 1) {
      if ((kind === "tower" || kind === "rock" || kind === "arch") && index === safeLane) continue;
      const x = count <= 1 ? center : center + (index / (count - 1)) * 4.2 - 2.1;
      const spawnDepth = 90 + this.random() * 18;
      const courseAnchored = kind === "tower" || kind === "arch" || kind === "rock";
      this.hazards.push({
        id: this.nextEntityId++,
        kind,
        x: clamp(x + (this.random() - 0.5) * 0.2, -ENEMY_X_LIMIT, ENEMY_X_LIMIT),
        y: kind === "lightning" ? (this.random() - 0.5) * 2.8 : (this.random() - 0.5) * 1.8,
        depth: spawnDepth,
        scale: kind === "mine" || kind === "debris" ? 0.62 : 0.88,
        speed: 11.5 + this.stage.courseSpeed * 0.035,
        nearMissChecked: false,
        courseAnchorDistance: courseAnchored ? this.distance + spawnDepth : null,
      });
    }
  }

  private updateLocking(delta: number): void {
    this.lockCooldown = Math.max(0, this.lockCooldown - delta);
    if (!this.input.lock || this.lockCooldown > 0) return;
    const locked = this.enemies.filter((enemy) => enemy.alive && !enemy.retreating && enemy.locked).length;
    if (locked >= SKY_DANCER_ARCADE_MAX_LOCKS) return;
    const turboLink = this.input.turbo && this.turbo > 0.5;
    let candidate: ArcadeEnemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.retreating || enemy.locked || enemy.depth < 4 || enemy.depth > 92) continue;
      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const reticleDistance = Math.hypot(dx, dy);
      const counterplayScale = enemy.counterplay === "evasive-roll" ? (enemy.boss ? .82 : .72) : 1;
      const threshold = arcadeLoadoutLockThreshold(this.options.loadout, enemy.boss, turboLink) * counterplayScale;
      if (reticleDistance > threshold) continue;
      const score = reticleDistance * 20 + enemy.depth * 0.05 - skyDancerArcadeTargetPriority(enemy.role) - (enemy.worldBreakTarget ? 14 : 0);
      if (score < best) {
        best = score;
        candidate = enemy;
      }
    }
    if (candidate) {
      candidate.locked = true;
      this.lockCooldown = arcadeLoadoutLockInterval(this.options.loadout, turboLink);
      this.message = this.options.loadout === "missile-focus"
        ? `RAPID LOCK ${locked + 1}`
        : arcadeStandardFusionActive(this.options.loadout, turboLink)
          ? `FUSION LOCK ${locked + 1}`
          : `LOCK ${locked + 1}`;
      this.messageTimer = 0.35;
    }
  }

  private updateWeapons(delta: number): void {
    this.gunCooldown = Math.max(0, this.gunCooldown - delta);
    if (!this.input.fire || this.gunCooldown > 0) return;
    const turboLink = this.input.turbo && this.turbo > 0.5;
    this.gunCooldown = arcadeLoadoutGunCooldown(this.options.loadout, turboLink);
    const target = this.chooseGunTarget();
    const volleyCount = arcadeLoadoutGunProjectiles(this.options.loadout);
    for (let index = 0; index < volleyCount; index += 1) {
      const side = volleyCount === 1 ? 0 : (index === 0 ? -1 : 1);
      this.projectiles.push({
        id: this.nextEntityId++,
        owner: "player-gun",
        x: this.playerX + side * 0.055,
        y: this.playerY + side * 0.012,
        depth: 1.2,
        targetEnemyId: target?.id ?? null,
        speed: this.options.loadout === "gun-focus" ? 126 : 118,
        damage: (this.options.difficulty === "hard" ? 8 : 9.5) * arcadeLoadoutGunDamage(this.options.loadout, turboLink),
        life: 1.05,
        vx: target ? (target.x - this.playerX) * 0.48 + side * 0.028 : side * 0.024,
        vy: target ? (target.y - this.playerY) * 0.48 - side * 0.012 : -side * 0.01,
        guidance: 0,
        nearMissChecked: false,
      });
    }
    this.shotSerial += 1;
  }

  private chooseGunTarget(): ArcadeEnemy | null {
    let target: ArcadeEnemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.retreating || enemy.depth < 2 || enemy.depth > 72) continue;
      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const cone = Math.hypot(dx, dy);
      if (cone > (enemy.boss ? 1.45 : enemy.worldBreakTarget ? 1.08 : 0.72)) continue;
      const score = cone * 28 + enemy.depth * 0.04 - skyDancerArcadeTargetPriority(enemy.role) * .45 - (enemy.worldBreakTarget ? 16 : 0);
      if (score < best) {
        best = score;
        target = enemy;
      }
    }
    return target;
  }

  private launchLockedMissiles(): void {
    if (this.status !== "running" || this.bossOutroTimer > 0) return;
    let targets = this.enemies.filter((enemy) => enemy.alive && enemy.locked).slice(0, SKY_DANCER_ARCADE_MAX_LOCKS);
    if (targets.length === 0) {
      const fallback = this.chooseGunTarget();
      if (fallback) targets = [fallback];
    }
    const turboLink = this.input.turbo && this.turbo > 0.5;
    const rippleCount = arcadeLoadoutMissileCount(this.options.loadout);
    targets.forEach((target, targetIndex) => {
      target.locked = false;
      for (let ripple = 0; ripple < rippleCount; ripple += 1) {
        const side = (targetIndex + ripple) % 2 === 0 ? -1 : 1;
        this.projectiles.push({
          id: this.nextEntityId++,
          owner: "player-missile",
          x: this.playerX + side * (rippleCount === 2 ? 0.13 : 0.08),
          y: this.playerY - 0.05 + (rippleCount === 2 ? (ripple === 0 ? -0.025 : 0.035) : 0),
          depth: 0.8 + ripple * 0.08,
          targetEnemyId: target.id,
          speed: 62 * arcadeLoadoutMissileSpeed(this.options.loadout) * (1 + ripple * 0.025),
          damage: (target.boss ? 34 : 46) * arcadeLoadoutMissileDamage(this.options.loadout, turboLink),
          life: 2.8,
          vx: side * (rippleCount === 2 ? 0.035 : 0),
          vy: rippleCount === 2 ? (ripple === 0 ? -0.018 : 0.018) : 0,
          guidance: 0,
          nearMissChecked: false,
        });
      }
    });
    if (targets.length > 0) {
      this.directorMissileHeat = clamp(this.directorMissileHeat + Math.min(1.25, targets.length * .28), 0, 3);
      this.missileSerial += 1;
      const missileCount = targets.length * rippleCount;
      this.message = this.options.loadout === "missile-focus"
        ? `RAPID RIPPLE ×${missileCount}`
        : arcadeStandardFusionActive(this.options.loadout, turboLink)
          ? `FUSION SALVO ×${missileCount}`
          : targets.length >= 4 ? `MULTI LOCK ×${targets.length}` : "FOX TWO";
      this.messageTimer = 0.9;
    }
  }

  private counterplayTypeForEnemy(enemy: ArcadeEnemy): SkyDancerArcadeEnemyCounterplay {
    const loadout = this.options.loadout ?? "standard";
    if (loadout === "gun-focus") {
      if (enemy.boss || enemy.kind === "bomber" || enemy.kind === "gunship" || enemy.kind === "missile-boat" || enemy.kind === "striker" || enemy.kind === "ace" || enemy.kind === "interceptor") return "armor-brace";
      return "none";
    }
    if (loadout === "missile-focus") {
      if (enemy.boss || enemy.kind === "fighter" || enemy.kind === "drone" || enemy.kind === "interceptor" || enemy.kind === "raider" || enemy.kind === "striker" || enemy.kind === "ace") return "evasive-roll";
      return "none";
    }
    if (enemy.boss || enemy.kind === "missile-boat" || enemy.kind === "gunship" || enemy.kind === "bomber" || enemy.kind === "striker" || enemy.kind === "ace") return "turbo-jammer";
    return "none";
  }

  private counterplayLabel(type: SkyDancerArcadeEnemyCounterplay): string {
    if (type === "armor-brace") return "ARMOR BRACE";
    if (type === "evasive-roll") return "EVASIVE ROLL";
    if (type === "turbo-jammer") return "TURBO JAMMER";
    return "";
  }

  private activateEnemyCounterplay(enemy: ArcadeEnemy, type: SkyDancerArcadeEnemyCounterplay): void {
    if (type === "none") return;
    enemy.counterplay = type;
    enemy.counterplayTimer = (enemy.boss ? 1.62 : type === "turbo-jammer" ? 1.38 : type === "armor-brace" ? 1.24 : 1.12);
    enemy.counterplayIntensity = 1;
    enemy.counterplayRewarded = false;
    enemy.counterplayCooldown = (enemy.boss ? 2.15 : 2.7) + (enemy.id % 4) * .27;
    this.enemyCounterplaySerial += 1;
    this.enemyCounterplayLabel = this.counterplayLabel(type);
    this.enemyCounterplayLabelTimer = 1.05;
    this.message = `ENEMY COUNTER · ${this.enemyCounterplayLabel}`;
    this.messageTimer = Math.max(this.messageTimer, .72);
  }

  private updateEnemyCounterplay(enemy: ArcadeEnemy, delta: number, turboActive: boolean): void {
    if (enemy.boss && (this.bossPhaseTransitionTimer > 0 || this.bossIngressTimer > 0)) {
      enemy.counterplay = "none";
      enemy.counterplayTimer = 0;
      enemy.counterplayIntensity = 0;
      return;
    }
    if (enemy.counterplay !== "none") {
      enemy.counterplayTimer = Math.max(0, enemy.counterplayTimer - delta);
      const duration = enemy.boss ? 1.62 : enemy.counterplay === "turbo-jammer" ? 1.38 : enemy.counterplay === "armor-brace" ? 1.24 : 1.12;
      enemy.counterplayIntensity = clamp(enemy.counterplayTimer / duration, 0, 1);
      if (enemy.counterplayTimer <= 0) {
        enemy.counterplay = "none";
        enemy.counterplayIntensity = 0;
      }
      return;
    }
    enemy.counterplayCooldown = Math.max(0, enemy.counterplayCooldown - delta);
    enemy.counterplayIntensity = 0;
    if (enemy.counterplayCooldown > 0 || enemy.stagger > .68 || enemy.depth < 8 || enemy.depth > 62) return;
    const type = this.counterplayTypeForEnemy(enemy);
    if (type === "none") return;
    const missileThreat = this.input.lock || this.projectiles.some((projectile) => projectile.owner === "player-missile" && projectile.targetEnemyId === enemy.id && projectile.life > 0);
    const triggered = type === "armor-brace" ? this.input.fire : type === "evasive-roll" ? missileThreat : turboActive;
    if (triggered) this.activateEnemyCounterplay(enemy, type);
  }

  private activeTurboJammerCount(): number {
    return this.enemies.filter((enemy) => enemy.alive && !enemy.retreating && enemy.counterplay === "turbo-jammer" && enemy.counterplayTimer > 0).length;
  }

  private rewardEnemyCounterplayBreak(
    enemy: ArcadeEnemy,
    counterplay: SkyDancerArcadeEnemyCounterplay,
    missile: boolean,
    destroyed: boolean,
    armorBreak: boolean,
  ): void {
    if (counterplay === "none" || enemy.counterplayRewarded) return;
    const qualifies = counterplay === "armor-brace"
      ? destroyed || armorBreak || enemy.stagger >= .72
      : counterplay === "evasive-roll"
        ? missile && (destroyed || armorBreak || enemy.stagger >= .32)
        : destroyed || armorBreak || enemy.stagger >= .72;
    if (!qualifies) return;
    enemy.counterplayRewarded = true;
    enemy.counterplay = "none";
    enemy.counterplayTimer = 0;
    enemy.counterplayIntensity = 0;
    enemy.counterplayCooldown = Math.max(enemy.counterplayCooldown, enemy.boss ? 2.8 : 3.25);
    this.counterplayBreaks += 1;
    this.enemyCounterplaySerial += 1;
    const label = counterplay === "armor-brace" ? "BRACE BREAK" : counterplay === "evasive-roll" ? "EVADE PUNISH" : "JAMMER BREAK";
    this.enemyCounterplayLabel = label;
    this.enemyCounterplayLabelTimer = 1.18;
    const base = counterplay === "armor-brace" ? (enemy.boss ? 760 : 430) : counterplay === "evasive-roll" ? (enemy.boss ? 820 : 470) : (enemy.boss ? 920 : 540);
    const turboGain = counterplay === "turbo-jammer" ? (enemy.boss ? 12 : 8) : enemy.boss ? 8 : 5;
    this.rewardLoadoutReaction(label, base, turboGain, 1.12);
  }

  private updateEnemies(delta: number, turboActive: boolean): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.age += delta;
      if (enemy.retreating) {
        enemy.retreatTimer = (enemy.retreatTimer ?? 0) + delta;
        enemy.locked = false;
        enemy.counterplay = "none";
        enemy.counterplayTimer = 0;
        enemy.counterplayIntensity = 0;
        enemy.fireCooldown = 999;
        const retreatSign = enemy.retreatSign ?? (enemy.x < 0 ? -1 : 1);
        const depthDirection = enemy.retreatDepthDirection ?? 1;
        const verticalSign = enemy.id % 3 === 0 ? -1 : 1;
        if (enemy.boss) {
          // V32: the destroyed boss silhouette survives its explosion briefly, then falls out of the fight under motion.
          const lateralTarget = retreatSign * 1.65;
          const verticalTarget = -1.45 + verticalSign * .22;
          const lateralResponse = 1 - Math.exp(-delta * 1.85);
          const verticalResponse = 1 - Math.exp(-delta * 1.7);
          enemy.x += (lateralTarget - enemy.x) * lateralResponse;
          enemy.y += (verticalTarget - enemy.y) * verticalResponse;
          enemy.depth += depthDirection * (32 + Math.min(34, enemy.retreatTimer * 22)) * delta;
          if ((depthDirection > 0 && enemy.depth > 128) || (depthDirection < 0 && enemy.depth < -12.5) || enemy.retreatTimer > 1.55) enemy.alive = false;
          continue;
        }
        const targetX = clamp(retreatSign * (2.34 + Math.min(.22, enemy.retreatTimer * .14)), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        const targetY = clamp(verticalSign * (1.3 + Math.min(.48, enemy.retreatTimer * .3)), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
        // Reuse the coordinated-flight solver so the exit is a banked aircraft maneuver rather than a tween.
        const flightState = skyDancerArcadeV25Step(
          {
            x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY,
            bank: enemy.flightBank, pitch: enemy.flightPitch, energy: enemy.flightEnergy,
          },
          targetX,
          targetY,
          enemy.kind,
          delta,
          1.35,
          ENEMY_X_LIMIT,
          ENEMY_Y_LIMIT,
        );
        enemy.x = flightState.x;
        enemy.y = flightState.y;
        enemy.flightVX = flightState.vx;
        enemy.flightVY = flightState.vy;
        enemy.flightBank = flightState.bank;
        enemy.flightPitch = flightState.pitch;
        enemy.flightEnergy = flightState.energy;
        const retreatSpeed = Math.max(26, enemy.speed * (depthDirection < 0 ? 2.9 : 2.35))
          * (1 + Math.min(.55, enemy.retreatTimer * .3));
        enemy.depth += depthDirection * retreatSpeed * delta;
        if (
          (depthDirection < 0 && enemy.depth < -12.5)
          || (depthDirection > 0 && enemy.depth > 126)
          || enemy.retreatTimer > 2.6
        ) enemy.alive = false;
        continue;
      }
      if (enemy.worldBreakTarget && enemy.worldBreakAnchorDistance !== undefined) {
        enemy.depth = enemy.worldBreakAnchorDistance - this.distance;
        enemy.x = enemy.baseX;
        enemy.y = enemy.baseY;
        enemy.locked = enemy.locked && enemy.depth > 2;
        enemy.counterplay = "none";
        enemy.counterplayTimer = 0;
        enemy.counterplayIntensity = 0;
        enemy.fireCooldown = 999;
        enemy.flightVX = 0;
        enemy.flightVY = 0;
        enemy.flightBank = 0;
        enemy.flightPitch = 0;
        if (enemy.depth < -4.5) {
          this.resolveV40FleetTarget(enemy, false);
          enemy.alive = false;
          enemy.locked = false;
        }
        continue;
      }
      if (enemy.rivalAce) {
        const appearance = (enemy.rivalAceAppearance ?? this.rivalAceAppearance) || 1;
        enemy.maneuver = skyDancerArcadeV404RivalManeuver(appearance, enemy.age);
        enemy.maneuverSign = skyDancerArcadeV404RivalManeuverSign(appearance, enemy.age);
      }
      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));
      this.updateEnemyCounterplay(enemy, delta, turboActive);
      if (enemy.boss) {
        if (this.bossIngressTimer > 0) {
          // The boss can be tracked and approached, but does not attack or expose a weakpoint during the reveal.
          enemy.weakpointOpen = false;
          enemy.counterplay = "none";
          enemy.counterplayTimer = 0;
          enemy.counterplayIntensity = 0;
          enemy.fireCooldown = Math.max(enemy.fireCooldown, this.bossIngressTimer + .38);
        } else if (this.bossOpeningStrikePending) {
          // Release the first attack only after the V40.13 focus animation has opened back out.
          this.bossOpeningStrikePending = false;
          enemy.fireCooldown = clamp(enemy.fireCooldown, .28, .42);
          this.stageEventSerial += 1;
          this.stageEventLabel = "CLIMAX ENGAGED";
          this.stageEventTimer = 1.15;
          this.message = `ENGAGE · ${this.bossMechanicLabel(1)} · OPENING VOLLEY`;
          this.messageTimer = 1.4;
        }
        const nextPhase = skyDancerArcadeBossPhase(enemy.hp, enemy.maxHp);
        if (this.bossIngressTimer <= 0 && nextPhase !== enemy.bossPhase) {
          enemy.bossPhase = nextPhase;
          this.bossPhaseSerial += 1;
          this.pendingBossPhaseMechanic = nextPhase;
          this.bossPhaseTransitionTimer = .72;
          const mechanic = this.bossMechanicLabel(nextPhase);
          enemy.weakpointOpen = false;
          enemy.counterplay = "none";
          enemy.counterplayTimer = 0;
          enemy.counterplayIntensity = 0;
          enemy.fireCooldown = Math.max(enemy.fireCooldown, .9);
          this.message = `PHASE ${nextPhase} SHIFT · ${mechanic}`;
          this.messageTimer = 1.65;
          this.addScore(1000 + nextPhase * 650, true);
          this.turbo = Math.min(100, this.turbo + 9);
        }
        if (this.pendingBossPhaseMechanic !== null) {
          this.bossPhaseTransitionTimer = Math.max(0, this.bossPhaseTransitionTimer - delta);
          enemy.fireCooldown = Math.max(enemy.fireCooldown, this.bossPhaseTransitionTimer + .18);
          if (this.bossPhaseTransitionTimer <= 0) {
            const armedPhase = this.pendingBossPhaseMechanic;
            this.pendingBossPhaseMechanic = null;
            this.triggerBossPhaseMechanic(armedPhase);
            this.message = `PHASE ${armedPhase} ACTIVE · ${this.bossMechanicLabel(armedPhase)}`;
            this.messageTimer = 1.15;
          }
        }
        enemy.weakpointOpen = this.bossIngressTimer <= 0
          && this.pendingBossPhaseMechanic === null
          && skyDancerArcadeV11BossWeakpointOpen(this.stage.id, enemy.bossPhase, enemy.age);
        const motion = skyDancerArcadeV11BossMotion(
          this.stage.id, enemy.bossPhase, enemy.age, this.playerX, this.playerY, enemy.amplitude, enemy.stagger,
        );
        enemy.depth = moveToward(enemy.depth, motion.depthTarget, delta * motion.depthSpeed);
        enemy.x = clamp(motion.x, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(motion.y, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
      } else {
        const motionProfileV20 = skyDancerArcadeEnemyMotionV20(enemy.kind);
        const closureScaleV25 = skyDancerArcadeV25ClosureScale(
          enemy.kind, enemy.flightEnergy, enemy.flightBank, enemy.flightPitch, enemy.maneuver,
        );
        const frequency = motionProfileV20.frequency;
        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, motionProfileV20.pursuitCap);
        const close = clamp((68 - enemy.depth) / 54, 0, 1);
        const weaveX = Math.sin(enemy.age * frequency + enemy.phase) * enemy.amplitude;
        const weaveY = Math.cos(enemy.age * frequency * 0.72 + enemy.phase) * enemy.amplitude * 0.82;
        const flankX = Math.sin(enemy.phase * 1.91) * close * 0.42;
        const flankY = Math.cos(enemy.phase * 1.37) * close * 0.28;
        const genericX = () => clamp(enemy.baseX + weaveX + this.playerX * pursuit + flankX, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        const genericY = () => clamp(enemy.baseY + weaveY + this.playerY * pursuit * 0.82 + flankY, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
        let targetX = enemy.x;
        let targetY = enemy.y;
        let steeringUrgency = 1;

        if (enemy.maneuver === "overtake") {
          steeringUrgency = 1.12;
          if (enemy.depth < 24) {
            // V24: the pass still accelerates forward, but lateral placement is now a steering target.
            enemy.depth += Math.max(32, enemy.speed * 2.25) * closureScaleV25 * delta;
            const pass = clamp((enemy.depth + 6.4) / 30.4, 0, 1);
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.94 - pass * 0.66) + Math.sin(enemy.age * 3.4) * 0.08, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.56 + enemy.baseY * 0.28 + Math.sin(enemy.age * 2.8 + enemy.phase) * 0.22, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          } else {
            enemy.maneuverClock += delta;
            enemy.depth = moveToward(enemy.depth, 20 + Math.sin(enemy.maneuverClock * 2.7) * 1.3, delta * 8.5 * closureScaleV25);
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.22 + Math.sin(enemy.maneuverClock * 2.45) * 0.16), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.65 + Math.sin(enemy.maneuverClock * 2.2 + enemy.phase) * 0.4, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.15) {
              enemy.maneuver = "close-bank";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "parallel") {
          steeringUrgency = .88;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.5 * closureScaleV25 * delta;
            targetX = clamp(genericX() + enemy.maneuverSign * 0.34, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = genericY();
          } else {
            enemy.maneuverClock += delta;
            enemy.depth = moveToward(enemy.depth, 15.8 + Math.sin(enemy.maneuverClock * 2.1) * 1.6, delta * 7.5 * closureScaleV25);
            // Match the player with lag rather than gluing the aircraft to the canopy.
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.18 + Math.sin(enemy.maneuverClock * 2.15) * 0.14), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            const preCrossLane = Math.abs(this.playerY) > .12 ? -Math.sign(this.playerY) : enemy.maneuverSign;
            const preCross = clamp((enemy.maneuverClock - 1.35) / .55, 0, 1);
            // V24.2: establish vertical separation while still parallel. The maneuver label changes
            // only after the aircraft is physically clear, so the first cross-pass frame is never a near-overlap.
            targetY = clamp(
              this.playerY * 0.72 + Math.sin(enemy.maneuverClock * 1.9 + enemy.phase) * 0.32 + preCrossLane * preCross * .82,
              -ENEMY_Y_LIMIT,
              ENEMY_Y_LIMIT,
            );
            const preCrossSeparation = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
            if (enemy.maneuverClock >= 1.9 && preCrossSeparation >= .68) {
              enemy.maneuver = "cross-pass";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "cross-pass") {
          steeringUrgency = 1.35;
          const verticalLane = Math.abs(this.playerY) > .12 ? -Math.sign(this.playerY) : enemy.maneuverSign;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * closureScaleV25 * delta;
            targetX = genericX();
            // V24.1: begin the altitude split before the lateral crossing. Real aircraft establish
            // vertical separation before slicing through another flight path rather than dodging at the merge point.
            const separationLead = clamp((34 - enemy.depth) / 15, 0, 1);
            targetY = clamp(genericY() + verticalLane * separationLead * .88, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          } else {
            enemy.maneuverClock += delta;
            const t = clamp(enemy.maneuverClock / 1.45, 0, 1);
            // Lead with a destination on the opposite side; inertia turns this into a broad banked arc.
            targetX = clamp(this.playerX - enemy.maneuverSign * (1.82 + t * .24), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * .25 + verticalLane * (1.16 + Math.sin(t * Math.PI) * .24), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            enemy.depth = moveToward(enemy.depth, 13.8, delta * 8 * closureScaleV25);
            if (enemy.maneuverClock >= 1.45) {
              enemy.maneuver = "approach";
              enemy.maneuverClock = 0;
              enemy.baseX = enemy.x - enemy.maneuverSign * 0.42;
              enemy.baseY = enemy.y;
            }
          }
        } else if (enemy.maneuver === "close-bank") {
          steeringUrgency = 1.2;
          if (enemy.depth > 19) {
            enemy.depth -= enemy.speed * 1.42 * closureScaleV25 * delta;
            targetX = genericX();
            targetY = genericY();
          } else {
            enemy.maneuverClock += delta;
            const t = clamp(enemy.maneuverClock / 1.8, 0, 1);
            const arc = Math.sin(t * Math.PI);
            enemy.depth = moveToward(enemy.depth, 13.2 + Math.sin(enemy.maneuverClock * 2.45) * 1.15, delta * 7.6 * closureScaleV25);
            // The target sweeps inward and back out; velocity continuity supplies the visible turn radius.
            targetX = clamp(this.playerX + enemy.maneuverSign * (1.56 - arc * .74), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
            targetY = clamp(this.playerY * 0.7 + enemy.baseY * 0.22 + Math.sin(t * Math.PI * 1.35 + enemy.phase) * 0.58, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
            if (enemy.maneuverClock >= 1.8) {
              enemy.maneuver = "approach";
              enemy.maneuverClock = 0;
              enemy.baseX = clamp(enemy.x + enemy.maneuverSign * 0.7, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
              enemy.baseY = enemy.y;
              enemy.amplitude = Math.min(1.25, enemy.amplitude * 1.15);
            }
          }
        } else {
          enemy.depth -= enemy.speed * closureScaleV25 * delta;
          targetX = genericX();
          targetY = genericY();
        }

        if (enemy.counterplay === "evasive-roll") {
          const intensity = .35 + enemy.counterplayIntensity * .65;
          // Evasion requests a new flight path; it no longer teleports the hull sideways every frame.
          targetX = clamp(targetX + Math.sin(enemy.age * 7.1 + enemy.phase) * .52 * intensity + enemy.maneuverSign * .08, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
          targetY = clamp(targetY + Math.cos(enemy.age * 5.8 + enemy.phase * 1.3) * .34 * intensity, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
          steeringUrgency = Math.max(steeringUrgency, 1.25);
        }
        // V26: nearby aircraft now shape one another's steering target. This preserves the authored
        // maneuver state while making pairs establish pincer lanes, split through crossings and
        // re-form after a pass instead of independently converging on the same screen point.
        const formationNeighborsV26 = this.enemies
          .filter((other) => other.alive && !other.boss && !other.retreating && other.id !== enemy.id && Math.abs(other.depth - enemy.depth) <= 18)
          .slice(0, 4)
          .map((other) => ({
            id: other.id,
            x: other.x,
            y: other.y,
            depth: other.depth,
            maneuverSign: other.maneuverSign,
          }));
        const formationV26 = skyDancerArcadeV26FormationCommand({
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          depth: enemy.depth,
          maneuver: enemy.maneuver,
          maneuverSign: enemy.maneuverSign,
          targetX,
          targetY,
          playerX: this.playerX,
          playerY: this.playerY,
          steeringUrgency,
          neighbors: formationNeighborsV26,
          xLimit: ENEMY_X_LIMIT,
          yLimit: ENEMY_Y_LIMIT,
        });
        targetX = formationV26.targetX;
        targetY = formationV26.targetY;
        steeringUrgency = formationV26.steeringUrgency;

        const flightStateV25 = skyDancerArcadeV25Step(
          {
            x: enemy.x, y: enemy.y, vx: enemy.flightVX, vy: enemy.flightVY,
            bank: enemy.flightBank, pitch: enemy.flightPitch, energy: enemy.flightEnergy,
          },
          targetX,
          targetY,
          enemy.kind,
          delta,
          steeringUrgency,
          ENEMY_X_LIMIT,
          ENEMY_Y_LIMIT,
        );
        enemy.x = flightStateV25.x;
        enemy.y = flightStateV25.y;
        enemy.flightVX = flightStateV25.vx;
        enemy.flightVY = flightStateV25.vy;
        enemy.flightBank = flightStateV25.bank;
        enemy.flightPitch = flightStateV25.pitch;
        enemy.flightEnergy = flightStateV25.energy;
      }
      if (enemy.counterplay === "armor-brace") enemy.fireCooldown += delta * .42;
      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {
        // Stagger turns accurate pressure into a short offensive opening without hard-stopping the simulation.
        if (enemy.stagger > .52) enemy.fireCooldown = .22 + enemy.stagger * .38;
        // Route selection should stay tense without becoming an unreadable missile wall.
        else if (this.branchActive && !enemy.boss) enemy.fireCooldown = .48 + this.random() * .36;
        else this.enemyFire(enemy);
      }
      if (enemy.depth > 3.3) continue;
      const proximity = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
      if (proximity < (enemy.boss ? 0.76 : 0.36)) {
        if (turboActive) {
          this.turboSmashes += 1;
          this.damageEnemy(enemy, enemy.boss ? 92 : enemy.maxHp + 1, true);
          this.addScore(enemy.boss ? 2400 : 1150, true);
          this.message = "TURBO SMASH";
          this.messageTimer = 0.8;
        } else {
          const hard = this.options.difficulty === "hard";
          this.takeDamage(enemy.boss ? (hard ? 34 : 26) : (hard ? 22 : 16));
          enemy.alive = false;
        }
      }
      if (!enemy.boss && enemy.depth < ENEMY_FLYBY_CULL_DEPTH) {
        enemy.alive = false;
        this.chain = 0;
      }
    }
  }

  private enemyFire(enemy: ArcadeEnemy): void {
    const hard = this.options.difficulty === "hard";
    const threatBudget = hard ? MAX_ENEMY_PROJECTILES_HARD : MAX_ENEMY_PROJECTILES_NORMAL;
    const activeThreats = this.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.life > 0).length;
    const bossProfile = enemy.boss ? skyDancerArcadeV11BossProfile(this.stage.id) : null;
    const bossIndex = enemy.boss ? enemy.bossPhase - 1 : 0;
    const reactiveBossPhase = enemy.boss && this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract
      ? skyDancerArcadeV405FinalBossPhase(this.finalBossContract, enemy.bossPhase)
      : null;
    const desiredSpread = enemy.boss && bossProfile
      ? Math.min(5, (hard ? 1 : 0) + enemy.bossPhase + bossProfile.spreadBonus[bossIndex] + (reactiveBossPhase?.spreadBonus ?? 0))
      : skyDancerArcadeEnemyWeaponV20(enemy.kind).spread;
    const spreadCount = Math.max(0, Math.min(desiredSpread, threatBudget - activeThreats));
    if (spreadCount <= 0) {
      enemy.fireCooldown = .38 + this.random() * .34;
      return;
    }
    for (let index = 0; index < spreadCount; index += 1) {
      const centered = index - (spreadCount - 1) * 0.5;
      const guidance = enemy.boss && bossProfile
        ? (1.02 + enemy.bossPhase * .2) * bossProfile.guidanceScale[bossIndex] * (reactiveBossPhase?.guidanceScale ?? 1)
        : skyDancerArcadeEnemyWeaponV20(enemy.kind).guidance;
      const bossSpeedScale = enemy.boss && bossProfile
        ? bossProfile.projectileSpeedScale[bossIndex] * (reactiveBossPhase?.projectileSpeedScale ?? 1)
        : 1;
      const bossSpreadX = enemy.boss && bossProfile ? bossProfile.spreadX[bossIndex] : .2;
      const bossSpreadY = enemy.boss && bossProfile ? bossProfile.spreadY[bossIndex] : .11;
      this.projectiles.push({
        id: this.nextEntityId++,
        owner: "enemy",
        x: enemy.x,
        y: enemy.y,
        depth: enemy.depth,
        targetEnemyId: null,
        speed: enemy.boss ? (15.8 + enemy.bossPhase * 1.7) * bossSpeedScale : skyDancerArcadeEnemyWeaponV20(enemy.kind).projectileSpeed,
        damage: enemy.boss ? (hard ? 18 : 11) : hard ? 13 : 8,
        life: 5.6,
        vx: (this.playerX - enemy.x) * 0.28 + centered * bossSpreadX,
        vy: (this.playerY - enemy.y) * 0.28 + centered * bossSpreadY,
        guidance,
        nearMissChecked: false,
      });
    }
    const bossCadence = enemy.boss && bossProfile
      ? bossProfile.fireCadenceScale[bossIndex] * (reactiveBossPhase?.cadenceScale ?? 1)
      : 1;
    const base = enemy.boss ? (1.68 - enemy.bossPhase * .18) * bossCadence : skyDancerArcadeEnemyWeaponV20(enemy.kind).cadence;
    enemy.fireCooldown = base * (hard ? 0.8 : 1) * (0.84 + this.random() * 0.38);
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      projectile.life -= delta;
      if (projectile.life <= 0) continue;
      if (projectile.owner === "player-missile") {
        const target = this.enemies.find((enemy) => enemy.id === projectile.targetEnemyId && enemy.alive && !enemy.retreating) ?? null;
        if (target) {
          projectile.x = moveToward(projectile.x, target.x, delta * 2.8);
          projectile.y = moveToward(projectile.y, target.y, delta * 2.8);
        }
        projectile.depth += projectile.speed * delta;
      } else if (projectile.owner === "player-gun") {
        const target = this.enemies.find((enemy) => enemy.id === projectile.targetEnemyId && enemy.alive && !enemy.retreating) ?? null;
        if (target) {
          projectile.x = moveToward(projectile.x, target.x, delta * 2.2);
          projectile.y = moveToward(projectile.y, target.y, delta * 2.2);
        } else {
          projectile.x += projectile.vx * delta;
          projectile.y += projectile.vy * delta;
        }
        projectile.depth += projectile.speed * delta;
      } else {
        projectile.depth -= projectile.speed * delta;
        if (projectile.guidance > 0 && projectile.depth > 15) {
          const curvePhase = projectile.id * 1.731 + projectile.life * 4.6;
          const desiredVX = clamp((this.playerX - projectile.x) * 0.76 + Math.sin(curvePhase) * 0.46, -2.05, 2.05);
          const desiredVY = clamp((this.playerY - projectile.y) * 0.76 + Math.cos(curvePhase * 0.83) * 0.3, -1.78, 1.78);
          projectile.vx = moveToward(projectile.vx, desiredVX, delta * 2.15);
          projectile.vy = moveToward(projectile.vy, desiredVY, delta * 1.95);
          projectile.guidance = Math.max(0, projectile.guidance - delta);
        } else if (projectile.depth <= 15) {
          projectile.guidance = 0;
        }
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
      }

      if (projectile.owner === "enemy") {
        if (projectile.retiring) {
          if (projectile.depth < -3) projectile.life = 0;
          continue;
        }
        if (projectile.depth > 2.2) continue;
        const distance = Math.hypot(projectile.x - this.playerX, projectile.y - this.playerY);
        if (distance < 0.26) {
          projectile.life = 0;
          this.takeDamage(projectile.damage);
        } else if (!projectile.nearMissChecked && distance < 0.82) {
          projectile.nearMissChecked = true;
          this.nearMisses += 1;
          this.addScore(420, true);
          this.turbo = Math.min(100, this.turbo + 5);
          this.message = "NEAR MISS";
          this.messageTimer = 0.55;
        }
        if (projectile.depth < -3) projectile.life = 0;
        continue;
      }

      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.retreating) continue;
        const depthDistance = Math.abs(projectile.depth - enemy.depth);
        if (depthDistance > (enemy.boss ? 3.2 : 1.9)) continue;
        const radius = skyDancerArcadeEnemyHitRadiusV20(enemy.kind, enemy.boss);
        if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) > radius) continue;
        projectile.life = 0;
        this.damageEnemy(enemy, projectile.damage, projectile.owner === "player-missile");
        break;
      }
    }
  }

  private updateHazards(delta: number, turboActive: boolean): void {
    for (const hazard of this.hazards) {
      if (hazard.retiring) {
        hazard.courseAnchorDistance = null;
        hazard.depth -= Math.max(68, hazard.speed * 3.2) * delta;
        if (hazard.depth < -5.8) hazard.depth = -10;
        continue;
      }
      if (hazard.courseAnchorDistance !== null) {
        // V10.5: architecture/terrain advances only because the aircraft advances along the course.
        // This keeps its position phase-locked with scenery at normal speed and under turbo.
        hazard.depth = hazard.courseAnchorDistance - this.distance;
      } else {
        hazard.depth -= hazard.speed * (turboActive ? 1.24 : 1) * delta;
      }
      if (hazard.depth > 2.4) continue;
      const radius = hazard.scale * (hazard.kind === "lightning" ? 0.55 : 0.42);
      const distance = Math.hypot(hazard.x - this.playerX, hazard.y - this.playerY);
      if (distance < radius) {
        // A collided world anchor is retired instead of being recomputed on the next frame.
        hazard.courseAnchorDistance = null;
        hazard.depth = -10;
        if (turboActive && (hazard.kind === "mine" || hazard.kind === "debris")) {
          this.addScore(700, true);
          this.turboSmashes += 1;
          this.message = "HAZARD BREAK";
          this.messageTimer = 0.6;
        } else {
          const hard = this.options.difficulty === "hard";
          this.takeDamage(hazard.kind === "lightning" ? (hard ? 18 : 13) : (hard ? 24 : 18));
        }
      } else if (!hazard.nearMissChecked && distance < radius + 0.28) {
        hazard.nearMissChecked = true;
        this.nearMisses += 1;
        this.addScore(620, true);
        this.turbo = Math.min(100, this.turbo + 7);
      }
      if (hazard.depth < -5) hazard.depth = -10;
    }
  }

  private loadoutReactionForHit(missile: boolean): SkyDancerArcadeLoadoutReaction {
    const turboLink = this.input.turbo && this.turbo > 0.5;
    if (this.options.loadout === "missile-focus" && missile) return "ripple-shock";
    if (this.options.loadout === "gun-focus" && !missile) return "twin-cannon";
    if (arcadeStandardFusionActive(this.options.loadout, turboLink)) return "fusion-link";
    return "none";
  }

  private rewardLoadoutReaction(label: string, baseScore: number, turboGain: number, duration = .9): void {
    const awarded = this.addScore(baseScore, true);
    this.loadoutBonusScore += awarded;
    this.loadoutReactionSerial += 1;
    this.loadoutReactionLabel = label;
    this.loadoutReactionTimer = duration;
    this.turbo = Math.min(100, this.turbo + turboGain);
    this.message = label;
    this.messageTimer = Math.max(this.messageTimer, duration);
  }

  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive || enemy.retreating) return;
    const hpBefore = enemy.hp;
    const armorBefore = enemy.armor;
    const staggerBefore = enemy.stagger;
    const reaction = this.loadoutReactionForHit(missile);
    const counterplay = enemy.counterplay;
    let hullDamage = amount;
    if (enemy.armor > 0) {
      let armorScale = missile ? 1.35 : .7;
      if (reaction === "ripple-shock") armorScale = 1.72;
      else if (reaction === "twin-cannon") armorScale = 1.04;
      else if (reaction === "fusion-link") armorScale = missile ? 1.52 : .9;
      if (counterplay === "armor-brace" && !missile) armorScale *= .62;
      if (counterplay === "evasive-roll" && missile) armorScale *= .72;
      enemy.armor = Math.max(0, enemy.armor - amount * armorScale);
      hullDamage *= missile ? .9 : .72;
      if (counterplay === "armor-brace" && !missile) hullDamage *= .78;
      if (counterplay === "evasive-roll" && missile) hullDamage *= .7;
      if (reaction === "twin-cannon") hullDamage *= 1.08;
      if (reaction === "fusion-link") hullDamage *= 1.08;
    }
    if (enemy.boss && enemy.weakpointOpen) hullDamage *= missile ? 1.65 : 1.35;
    enemy.hp = Math.max(0, enemy.hp - hullDamage);
    let staggerScale = reaction === "ripple-shock" ? 7.4 : reaction === "twin-cannon" ? 4.7 : reaction === "fusion-link" ? 5.9 : missile ? 5.2 : 3.2;
    if (counterplay === "armor-brace" && !missile) staggerScale *= 1.24;
    if (counterplay === "evasive-roll" && missile) staggerScale *= 1.16;
    enemy.stagger = clamp(enemy.stagger + hullDamage / Math.max(1, enemy.maxHp) * staggerScale, 0, 1);
    const armorBreak = armorBefore > 0 && enemy.armor <= 0;
    if (armorBreak) {
      this.armorBreaks += 1;
      this.addScore(enemy.boss ? 1800 : enemy.kind === "gunship" ? 1050 : enemy.kind === "bomber" ? 900 : 650, true);
      this.turbo = Math.min(100, this.turbo + (enemy.boss ? 11 : 6));
      this.message = enemy.boss ? "BOSS ARMOR BREAK · CORE EXPOSED" : "ARMOR BREAK";
      this.messageTimer = 1.05;
      if (reaction === "twin-cannon") this.rewardLoadoutReaction("TWIN CANNON SHRED", enemy.boss ? 700 : 420, enemy.boss ? 6 : 4, 1.05);
      else if (reaction === "ripple-shock") this.rewardLoadoutReaction("RIPPLE ARMOR CRUSH", enemy.boss ? 820 : 520, enemy.boss ? 7 : 5, 1.05);
      else if (reaction === "fusion-link") this.rewardLoadoutReaction("FUSION BREACH", enemy.boss ? 760 : 480, enemy.boss ? 7 : 5, 1.05);
    }
    if (reaction !== "none" && !enemy.loadoutStaggerRewarded && staggerBefore < .72 && enemy.stagger >= .72) {
      enemy.loadoutStaggerRewarded = true;
      if (reaction === "twin-cannon") this.rewardLoadoutReaction("CANNON STAGGER", enemy.boss ? 460 : 260, 3);
      else if (reaction === "ripple-shock") this.rewardLoadoutReaction("RIPPLE SHOCK", enemy.boss ? 540 : 320, 4);
      else this.rewardLoadoutReaction("FUSION OVERDRIVE", enemy.boss ? 520 : 300, 4);
    }
    this.hitSerial += 1;
    const destroyed = enemy.hp <= 0;
    this.impactEvents.push({
      serial: this.hitSerial,
      enemyId: enemy.id,
      kind: enemy.kind,
      x: enemy.x,
      y: enemy.y,
      depth: enemy.depth,
      hpBefore,
      hpAfter: enemy.hp,
      maxHp: enemy.maxHp,
      boss: enemy.boss,
      missile,
      destroyed,
      reaction,
      armorBreak,
      counterplay,
    });
    this.impactEventAges.set(this.hitSerial, 0);
    if (this.impactEvents.length > 16) {
      const retired = this.impactEvents.splice(0, this.impactEvents.length - 16);
      for (const impact of retired) this.impactEventAges.delete(impact.serial);
    }
    if (destroyed && enemy.rivalAce) {
      // NOVA-7 loses the pass but never becomes a disposable kill; the same pilot returns later in the run.
      this.resolveV404RivalAce(enemy, "BROKEN");
      return;
    }
    if (!destroyed) {
      this.rewardEnemyCounterplayBreak(enemy, counterplay, missile, false, armorBreak);
      return;
    }
    if (enemy.boss) {
      // V32: keep the defeated hull in the render snapshot long enough for the explosion to read as destruction, not deletion.
      enemy.locked = false;
      enemy.retreating = true;
      enemy.retreatTimer = 0;
      enemy.retreatSign = enemy.x < -0.05 ? -1 : enemy.x > 0.05 ? 1 : enemy.id % 2 === 0 ? -1 : 1;
      enemy.retreatDepthDirection = 1;
      enemy.counterplay = "none";
      enemy.counterplayTimer = 0;
      enemy.counterplayIntensity = 0;
      enemy.fireCooldown = 999;
    } else {
      enemy.alive = false;
      enemy.locked = false;
    }
    this.enemiesDefeated += 1;
    this.chain = Math.min(99, this.chain + 1);
    this.bestChain = Math.max(this.bestChain, this.chain);
    this.stageBestChain = Math.max(this.stageBestChain, this.chain);
    this.chainTimer = 4.6;
    this.addScore(enemy.scoreValue, this.input.turbo);
    if (!enemy.boss && this.chain > 0 && this.chain % 3 === 0) {
      this.formationBreaks += 1;
      this.addScore(850 + this.chain * 75, true);
      this.turbo = Math.min(100, this.turbo + 8);
      this.message = `FORMATION BREAK ×${this.chain}`;
      this.messageTimer = .9;
    }
    if (missile && this.projectiles.filter((projectile) => projectile.owner === "player-missile" && projectile.life > 0).length >= 2) {
      this.multiLockKills += 1;
      this.addScore(350, true);
    }
    if (reaction === "twin-cannon") this.rewardLoadoutReaction("TWIN CANNON FINISH", enemy.boss ? 720 : 360, enemy.boss ? 5 : 2);
    else if (reaction === "ripple-shock") this.rewardLoadoutReaction("RIPPLE BREAK", enemy.boss ? 840 : 420, enemy.boss ? 6 : 3);
    else if (reaction === "fusion-link") this.rewardLoadoutReaction("FUSION LINK FINISH", enemy.boss ? 960 : 520, enemy.boss ? 8 : 5);
    this.rewardEnemyCounterplayBreak(enemy, counterplay, missile, destroyed, armorBreak);
    if (enemy.worldBreakTarget) this.resolveV40FleetTarget(enemy, true);
    if (!enemy.boss) return;
    this.bossKills += 1;
    this.bossDefeated = true;
    this.pendingBossPhaseMechanic = null;
    this.bossPhaseTransitionTimer = 0;
    this.bossIngressTimer = 0;
    this.bossOpeningStrikePending = false;
    this.bossOutroTimer = Math.max(this.bossOutroTimer, BOSS_OUTRO_HOLD_SECONDS);
    // Make the entire remaining frame harmless while the destroyed silhouette clears the camera.
    this.retireStagePresentationActors();
    this.stageEventSerial += 1;
    this.stageEventLabel = "CLIMAX BREAK";
    this.stageEventTimer = 1.35;
    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {
      this.finalBossSerial += 1;
      this.message = `SOVEREIGN DOWN · ${this.finalBossContract.endingLine}`;
    } else {
      this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · WRECK CLEARING";
    }
    this.messageTimer = 2.4;
  }

  private addScore(base: number, risk: boolean): number {
    const chainMultiplier = 1 + Math.min(12, this.chain) * 0.1;
    const riskMultiplier = risk ? 1.25 : 1;
    const routeMultiplier = skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).scoreMultiplier;
    const portalMultiplier = this.stage.id === "floating-ruins" ? (this.worldBreakPortalDefinition()?.scoreMultiplier ?? 1) : 1;
    const awarded = Math.round(base * chainMultiplier * riskMultiplier * routeMultiplier * portalMultiplier);
    this.score += awarded;
    return awarded;
  }

  private takeDamage(amount: number): void {
    // Prevent overlapping missiles/fly-bys from deleting the airframe in a single unreadable burst.
    if (this.damageCooldown > 0) return;
    this.damageCooldown = this.options.difficulty === "hard" ? .28 : .5;
    const effective = this.input.turbo ? amount * 0.72 : amount;
    this.playerHp = Math.max(0, this.playerHp - effective);
    this.damageTaken += effective;
    this.directorRecentDamage = clamp(this.directorRecentDamage + effective / PLAYER_MAX_HP * 2.15, 0, 2);
    this.chain = 0;
    this.chainTimer = 0;
    this.damageSerial += 1;
    this.message = "DAMAGE";
    this.messageTimer = 0.55;
  }

  private enterContinue(): void {
    this.releaseInputs();
    // V32: clear lethal pressure but preserve motion behind the failure/continue overlay.
    this.retireStagePresentationActors();
    this.status = this.continuesRemaining > 0 ? "continue" : "game-over";
    this.message = this.continuesRemaining > 0 ? "AIRFRAME LOST" : "MISSION FAILED";
    this.messageTimer = 999;
  }

  private breakClimaxTargetAtCourseEnd(): void {
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss);
    if (boss) {
      // V31: an undefeated climax target disengages into the distance instead of being deleted on the time-limit frame.
      boss.locked = false;
      boss.retreating = true;
      boss.retreatTimer = 0;
      boss.retreatSign = boss.x < -0.05 ? -1 : boss.x > 0.05 ? 1 : boss.id % 2 === 0 ? -1 : 1;
      boss.retreatDepthDirection = 1;
      boss.counterplay = "none";
      boss.counterplayTimer = 0;
      boss.counterplayIntensity = 0;
      boss.fireCooldown = 999;
    }
    this.bossDefeated = true;
    this.bossIngressTimer = 0;
    this.bossOpeningStrikePending = false;
    this.bossOutroTimer = Math.max(this.bossOutroTimer, BOSS_OUTRO_HOLD_SECONDS);
    this.retireStagePresentationActors();
    this.stageEventSerial += 1;
    this.stageEventLabel = "CLIMAX DISENGAGE";
    this.stageEventTimer = 1.15;
    this.message = "COURSE BREAK · TARGET DISENGAGING";
    this.messageTimer = 1.35;
  }

  private retireStagePresentationActors(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.locked = false;
      enemy.retreating = true;
      enemy.retreatTimer ??= 0;
      enemy.retreatSign ??= enemy.x < -0.05 ? -1 : enemy.x > 0.05 ? 1 : enemy.id % 2 === 0 ? -1 : 1;
      // Stage handoff always opens the forward corridor. Standard craft may finish a close fly-by;
      // bosses and distant actors recede into the route ahead.
      enemy.retreatDepthDirection ??= enemy.boss || enemy.depth > 30 ? 1 : -1;
      enemy.counterplay = "none";
      enemy.counterplayTimer = 0;
      enemy.counterplayIntensity = 0;
      enemy.fireCooldown = 999;
    }
    for (const projectile of this.projectiles) {
      if (projectile.life <= 0) continue;
      if (projectile.owner === "enemy") {
        projectile.retiring = true;
        projectile.damage = 0;
        projectile.guidance = 0;
      }
      projectile.life = Math.min(projectile.life, 1.15);
    }
    for (const hazard of this.hazards) {
      hazard.retiring = true;
      hazard.courseAnchorDistance = null;
      hazard.speed = Math.max(hazard.speed, 68);
    }
  }

  private updateStageClearPresentation(delta: number): void {
    // Presentation-only motion: no weapons, collision, scoring, HP or encounter director is advanced here.
    this.distance += this.stage.courseSpeed * .52 * delta;
    this.messageTimer = Math.max(0, this.messageTimer - delta);
    if (this.messageTimer <= 0) this.message = null;

    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.retreating) continue;
      enemy.retreatTimer = (enemy.retreatTimer ?? 0) + delta;
      const timer = enemy.retreatTimer;
      const sign = enemy.retreatSign ?? (enemy.x < 0 ? -1 : 1);
      const depthDirection = enemy.retreatDepthDirection ?? 1;
      const lateralTarget = sign * (enemy.boss ? 1.35 : 2.48);
      const verticalTarget = (enemy.id % 3 === 0 ? -1 : 1) * (enemy.boss ? .72 : 1.42);
      const lateralResponse = 1 - Math.exp(-delta * (enemy.boss ? 1.55 : 3.05));
      const verticalResponse = 1 - Math.exp(-delta * (enemy.boss ? 1.25 : 2.45));
      enemy.x += (lateralTarget - enemy.x) * lateralResponse;
      enemy.y += (verticalTarget - enemy.y) * verticalResponse;
      const exitSpeed = enemy.boss
        ? 34 + Math.min(28, timer * 18)
        : Math.max(30, enemy.speed * (depthDirection < 0 ? 2.75 : 2.2)) * (1 + Math.min(.48, timer * .34));
      enemy.depth += depthDirection * exitSpeed * delta;
      if ((depthDirection < 0 && enemy.depth < -12.5) || (depthDirection > 0 && enemy.depth > 132) || timer > 2.2) {
        enemy.alive = false;
      }
    }

    for (const projectile of this.projectiles) {
      if (projectile.life <= 0) continue;
      projectile.life = Math.max(0, projectile.life - delta);
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.depth += (projectile.owner === "enemy" ? -1 : 1) * projectile.speed * delta;
    }
    for (const hazard of this.hazards) {
      hazard.courseAnchorDistance = null;
      hazard.depth -= Math.max(68, hazard.speed * 3.2) * delta;
      if (hazard.depth < -5.8) hazard.depth = -10;
    }
    this.cleanupEntities();
  }

  private completeStage(): void {
    if (this.status !== "running") return;
    const combatScore = this.score - this.stageStats.scoreAtStart;
    const stageDamage = this.damageTaken - this.stageStats.damageAtStart;
    const performance = {
      score: combatScore,
      destroyed: this.enemiesDefeated - this.stageStats.killsAtStart,
      nearMisses: this.nearMisses - this.stageStats.nearMissesAtStart,
      multiLockKills: this.multiLockKills - this.stageStats.multiLockKillsAtStart,
      turboSmashes: this.turboSmashes - this.stageStats.turboSmashesAtStart,
      bestChain: this.stageBestChain,
      armorBreaks: this.armorBreaks - this.stageStats.armorBreaksAtStart,
      formationBreaks: this.formationBreaks - this.stageStats.formationBreaksAtStart,
      noDamage: stageDamage <= .001,
    };
    const medals = skyDancerArcadeV11StageMedals(this.stage.id, performance);
    const selectedRouteIndex = this.branchSelection ? this.stage.next.indexOf(this.branchSelection) : -1;
    const routeRisk = selectedRouteIndex >= 0
      ? skyDancerArcadeV11RouteRisk(selectedRouteIndex, this.stage.next.length)
      : "LOCKED";
    const bossBonus = 1200 + this.stage.act * 260 + (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE ? 1400 : 0);
    const breakdown = skyDancerArcadeV11ScoreBreakdown(combatScore, medals, bossBonus, routeRisk);
    const bonus = breakdown.total - breakdown.combat;
    this.score += bonus;
    const stageScore = breakdown.total;
    const rank = skyDancerArcadeRankForScore(stageScore, 1, stageDamage, 0);
    this.stagesCleared += 1;
    this.lastClearedStageId = this.stage.id;
    this.lastStageScore = stageScore;
    this.lastStageRank = rank;
    this.lastStageNoDamage = performance.noDamage;
    this.lastStageMedals = medals;
    this.lastStageScoreBreakdown = breakdown;
    this.runMedalsEarned += medals.filter(medal => medal.earned).length;
    this.retireStagePresentationActors();
    this.status = "stage-clear";
    this.resultTimer = this.options.mode === "stage-practice" ? PRACTICE_RESULT_SECONDS : ARCADE_SECTION_RESULT_SECONDS;
    this.resultSerial += 1;
    this.releaseInputs();
  }

  private advanceAfterStageClear(): void {
    if (this.options.mode === "stage-practice") {
      this.status = "practice-clear";
      this.message = "PRACTICE COMPLETE";
      return;
    }
    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE || this.stage.next.length === 0) {
      this.status = "run-clear";
      this.message = "ARCADE RUN CLEAR";
      return;
    }
    const nextId = this.branchSelection ?? this.stage.next[0];
    if (!nextId) {
      this.status = "run-clear";
      return;
    }
    const selectedIndex = this.branchSelection ? this.stage.next.indexOf(this.branchSelection) : -1;
    const nextDoctrine = skyDancerArcadeV40RouteDoctrine(selectedIndex, this.stage.next.length);
    if (nextDoctrine !== "LOCKED") this.worldBreakRouteHistory.push(nextDoctrine);
    this.stage = skyDancerArcadeStageById(nextId);
    this.worldBreakRouteDoctrine = nextDoctrine;
    const routeEffect = skyDancerArcadeV40RouteEffect(nextDoctrine);
    this.route.push(nextId);
    this.stageNumber += 1;
    this.status = "running";
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + routeEffect.entryHpRecovery);
    this.turbo = Math.min(100, this.turbo + routeEffect.entryTurboRecovery);
    this.message = `${this.stage.name} · ${nextDoctrine === "LOCKED" ? "DROP IN" : `${nextDoctrine} ROUTE`}`;
    this.messageTimer = 2.8;
    this.stageSerial += 1;
    this.resetStageState(0);
  }

  private cleanupEntities(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.alive && enemy.depth > -13);
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && projectile.depth > -5 && projectile.depth < 145);
    this.hazards = this.hazards.filter((hazard) => hazard.depth > -6);
    this.worldBreakGates = this.worldBreakGates.filter((gate) => gate.depth > -10);
  }

  getSnapshot(): SkyDancerArcadeSnapshot {
    // A retreating boss remains in the 3D snapshot for the exit shot but no longer owns combat HUD state.
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating) ?? null;
    const lockedCount = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;
    const activeCounterplays = this.enemies.filter((enemy) => enemy.alive && enemy.counterplay !== "none");
    const stageScore = this.score - this.stageStats.scoreAtStart;
    const stormLane = this.stage.id === "storm-carrier"
      ? SKY_DANCER_ARCADE_V40_STORM_LANES.find((lane) => !this.worldBreakResolvedStormLaneIndices.has(lane.index)) ?? null
      : null;
    const stormLaneDepth = stormLane
      ? skyDancerArcadeV40StormLaneAnchorDistance(stormLane, this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const stormLaneSafeX = stormLane ? skyDancerArcadeV40StormLaneX(stormLane, this.stageTime) : 0;
    const fortressBreachDepth = this.stage.id === "desert-fortress"
      ? skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const iceAperture = this.stage.id === "ice-cavern"
      ? SKY_DANCER_ARCADE_V40_ICE_APERTURES.find((aperture) => !this.worldBreakResolvedIceApertureIndices.has(aperture.index)) ?? null
      : null;
    const iceDepth = iceAperture
      ? skyDancerArcadeV40IceApertureAnchorDistance(iceAperture, this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const iceScale = iceAperture ? skyDancerArcadeV40IceApertureScale(iceDepth) : 1;
    const portalDepth = this.stage.id === "floating-ruins"
      ? skyDancerArcadeV40FloatingPortalAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const portalDefinition = this.worldBreakPortalDefinition();
    const worldBreakStageProgress = clamp(this.stageTime / Math.max(.001, this.stage.durationSeconds), 0, 1);
    const pursuitX = this.stage.id === "night-metro" ? skyDancerArcadeV40NeonPhantomX(this.stageTime) : 0;
    const pursuitY = this.stage.id === "night-metro" ? skyDancerArcadeV40NeonPhantomY(this.stageTime) : 0;
    const pursuitExitAge = this.worldBreakPursuitResolvedAt >= 0 ? this.stageTime - this.worldBreakPursuitResolvedAt : Infinity;
    const pursuitPresenting = this.stage.id === "night-metro"
      && ((!this.worldBreakPursuitResolved
        && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START
        && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END)
        || (this.worldBreakPursuitCaught && pursuitExitAge <= 1.15));
    const pursuitDepth = this.worldBreakPursuitCaught
      ? this.worldBreakPursuitGap - Math.max(0, pursuitExitAge) * 22
      : this.worldBreakPursuitGap;
    const magmaActive = this.stage.id === "volcano-core"
      && !this.worldBreakMagmaResolved
      && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_MAGMA_START
      && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_MAGMA_END;
    const orbitExitAge = this.worldBreakOrbitResolvedAt >= 0 ? this.stageTime - this.worldBreakOrbitResolvedAt : Infinity;
    const orbitSafeX = this.stage.id === "orbital-ascent" ? skyDancerArcadeV40OrbitalSafeX(this.stageTime) : 0;
    const orbitAligned = this.stage.id === "orbital-ascent"
      && Math.abs(this.playerX - orbitSafeX) <= SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH
      && this.playerY >= .18;
    const orbitActive = this.stage.id === "orbital-ascent"
      && ((!this.worldBreakOrbitResolved
        && worldBreakStageProgress >= SKY_DANCER_ARCADE_V40_ORBIT_START
        && worldBreakStageProgress <= SKY_DANCER_ARCADE_V40_ORBIT_END)
        || (this.worldBreakOrbitComplete && orbitExitAge <= 1.1));
    const unresolvedPrismTrial = this.stage.id === "prism-citadel"
      ? SKY_DANCER_ARCADE_V40_PRISM_TRIALS.find((trial) => !this.worldBreakResolvedPrismTrialIndices.has(trial.index)) ?? null
      : null;
    const prismExitAge = this.worldBreakPrismResolvedAt >= 0 ? this.stageTime - this.worldBreakPrismResolvedAt : Infinity;
    const prismTrial = unresolvedPrismTrial ?? (this.stage.id === "prism-citadel" && prismExitAge <= 1.05 ? SKY_DANCER_ARCADE_V40_PRISM_TRIALS.at(-1) ?? null : null);
    const prismRouteStageId = prismTrial ? skyDancerArcadeV40PrismTrialStageId(this.route, prismTrial.index) : null;
    const prismDepth = prismTrial
      ? skyDancerArcadeV40PrismTrialAnchorDistance(prismTrial, this.stage.durationSeconds, this.stage.courseSpeed) - this.distance
      : -999;
    const prismX = prismTrial && prismRouteStageId ? skyDancerArcadeV40PrismTrialX(prismTrial, prismRouteStageId, this.stageTime) : 0;
    const prismY = prismTrial && prismRouteStageId ? skyDancerArcadeV40PrismTrialY(prismTrial, prismRouteStageId, this.stageTime) : 0;
    const prismLabel = prismRouteStageId ? `${skyDancerArcadeV40WorldProfile(prismRouteStageId).signature} REPRISE` : null;
    const rivalAce = this.activeV404Rival();
    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));
    const rank = skyDancerArcadeRankForScore(this.score, activeStageCount, this.damageTaken, this.continuesUsed);
    return {
      status: this.status,
      difficulty: this.options.difficulty,
      mode: this.options.mode,
      paintScheme: this.options.paintScheme ?? "default",
      loadout: this.options.loadout ?? "standard",
      stage: this.stage,
      stageNumber: this.stageNumber,
      stagesCleared: this.stagesCleared,
      route: [...this.route],
      stageTimeSeconds: this.stageTime,
      stageDurationSeconds: this.stage.durationSeconds,
      stageProgress: clamp(this.stageTime / this.stage.durationSeconds, 0, 1),
      runTimeSeconds: this.runTime,
      runDurationSeconds: SKY_DANCER_ARCADE_RUN_DURATION_SECONDS,
      distance: this.distance,
      playerX: this.playerX,
      playerY: this.playerY,
      playerHp: this.playerHp,
      playerMaxHp: PLAYER_MAX_HP,
      turbo: this.turbo,
      turboActive: this.input.turbo && this.turbo > 0.5,
      fireActive: this.input.fire,
      lockActive: this.input.lock,
      lockedCount,
      score: this.score,
      stageScore,
      rank,
      chain: this.chain,
      chainTimer: this.chainTimer,
      enemiesDefeated: this.enemiesDefeated,
      damageTaken: this.damageTaken,
      nearMisses: this.nearMisses,
      multiLockKills: this.multiLockKills,
      turboSmashes: this.turboSmashes,
      bestChain: this.bestChain,
      armorBreaks: this.armorBreaks,
      formationBreaks: this.formationBreaks,
      loadoutBonusScore: this.loadoutBonusScore,
      loadoutReactionSerial: this.loadoutReactionSerial,
      loadoutReactionLabel: this.loadoutReactionLabel,
      loadoutReactionIntensity: this.loadoutReactionTimer > 0 ? clamp(this.loadoutReactionTimer / 1.05, 0, 1) : 0,
      counterplayBreaks: this.counterplayBreaks,
      enemyCounterplaySerial: this.enemyCounterplaySerial,
      enemyCounterplayLabel: this.enemyCounterplayLabel,
      enemyCounterplayCount: activeCounterplays.length,
      enemyCounterplayIntensity: activeCounterplays.reduce((peak, enemy) => Math.max(peak, enemy.counterplayIntensity), 0),
      turboJammed: activeCounterplays.some((enemy) => enemy.counterplay === "turbo-jammer"),
      combatDirectorMode: this.combatDirectorMode,
      combatDirectorPlayerStyle: this.combatDirectorPlayerStyle,
      combatDirectorLabel: this.combatDirectorLabel,
      combatDirectorIntent: this.combatDirectorIntent,
      combatDirectorIntensity: this.combatDirectorIntensity,
      combatDirectorPressure: this.combatDirectorPressure,
      combatDirectorSerial: this.combatDirectorSerial,
      combatDirectorWaveSerial: this.combatDirectorWaveSerial,
      encounterGrammarId: this.encounterGrammarId,
      encounterGrammarLabel: this.encounterGrammarLabel,
      encounterGrammarIntent: this.encounterGrammarIntent,
      encounterGrammarPhaseLabel: this.encounterGrammarPhaseLabel,
      encounterGrammarPhaseIndex: this.encounterGrammarPhaseIndex,
      encounterGrammarPhaseCount: this.encounterGrammarPhaseCount,
      encounterGrammarSerial: this.encounterGrammarSerial,
      encounterContinuityLabel: this.encounterContinuityLabel,
      encounterContinuityBreakSign: this.encounterContinuityBreakSign,
      encounterContinuityEntrySign: this.encounterContinuityEntrySign,
      encounterContinuitySurvivors: this.encounterContinuitySurvivors,
      encounterContinuityLateralBias: this.encounterContinuityLateralBias,
      encounterContinuitySerial: this.encounterContinuitySerial,
      bossKills: this.bossKills,
      continuesRemaining: this.continuesRemaining,
      continuesUsed: this.continuesUsed,
      branchActive: this.branchActive,
      branchOptions: this.stage.next,
      branchSelection: this.branchSelection,
      bossActive: Boolean(boss),
      bossName: this.stage.bossName,
      bossHp: boss?.hp ?? (this.bossDefeated ? 0 : 1),
      bossMaxHp: boss?.maxHp ?? (this.bossDefeated ? 1 : 1),
      bossPhase: boss?.bossPhase ?? (this.bossDefeated ? 3 : 1),
      bossWeakpointOpen: boss?.weakpointOpen ?? false,
      bossPhaseSerial: this.bossPhaseSerial,
      bossMechanicLabel: this.bossMechanicLabel(boss?.bossPhase ?? (this.bossDefeated ? 3 : 1)),
      bossMechanicIntensity: skyDancerArcadeV11BossProfile(this.stage.id).intensity[(boss?.bossPhase ?? (this.bossDefeated ? 3 : 1)) - 1],
      bossMechanicSerial: this.bossMechanicSerial,
      stageEventSerial: this.stageEventSerial,
      stageEventLabel: this.stageEventLabel,
      stageEventIntensity: this.stageEventTimer > 0 ? clamp(this.stageEventTimer / 1.72, 0, 1) : 0,
      timelineBeatId: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).id,
      timelineBeatLabel: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).label,
      timelineBeatKind: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).kind,
      timelineSetpiece: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).setpiece,
      timelineIntensity: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).intensity,
      timelineCameraFov: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).cameraFov,
      timelineCameraPullback: skyDancerArcadeV11Beat(this.stage.id, clamp(this.stageTime / this.stage.durationSeconds, 0, 1)).cameraPullback,
      timelineSerial: this.timelineSerial,
      routeRiskLabels: this.stage.next.map((_, index) => skyDancerArcadeV11RouteRisk(index, this.stage.next.length)),
      rivalAceActive: Boolean(rivalAce),
      rivalAceName: SKY_DANCER_ARCADE_V404_RIVAL_NAME,
      rivalAceAppearance: rivalAce?.rivalAceAppearance ?? this.rivalAceAppearance,
      rivalAceAdaptation: this.rivalAceAdaptation,
      rivalAceHp: rivalAce?.hp ?? 0,
      rivalAceMaxHp: rivalAce?.maxHp ?? 1,
      rivalAceAdvantage: this.rivalAceAdvantage,
      rivalAceAdvantageTarget: this.rivalAceAdvantageTarget,
      rivalAceEncounters: this.rivalAceEncounters,
      rivalAcePlayerWins: this.rivalAcePlayerWins,
      rivalAceEscapes: this.rivalAceEscapes,
      rivalAceOutcome: this.rivalAceOutcome,
      rivalAceSerial: this.rivalAceSerial,
      finalBossReactive: this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && Boolean(this.finalBossContract),
      finalBossForm: this.finalBossContract?.form ?? null,
      finalBossFormLabel: this.finalBossContract?.formLabel ?? "PRISM SOVEREIGN",
      finalBossRouteMemory: this.finalBossContract?.routeMemory ?? "MIXED",
      finalBossRivalMemory: this.finalBossContract?.rivalMemory ?? "CONTESTED",
      finalBossAttackLabel: this.finalBossContract
        ? skyDancerArcadeV405FinalBossPhase(this.finalBossContract, boss?.bossPhase ?? (this.bossDefeated ? 3 : 1)).label
        : "",
      finalBossEndingLine: this.finalBossContract?.endingLine ?? "",
      finalBossSerial: this.finalBossSerial,
      finalBossRouteHistory: [...this.worldBreakRouteHistory],
      finalBossRivalHistory: [...this.rivalAceOutcomeHistory],
      worldBreakObjective: skyDancerArcadeV40WorldProfile(this.stage.id).objective,
      worldBreakSignature: skyDancerArcadeV40WorldProfile(this.stage.id).signature,
      worldBreakLive: skyDancerArcadeV40WorldProfile(this.stage.id).live,
      worldBreakRouteDoctrine: this.worldBreakRouteDoctrine,
      worldBreakScoreMultiplier: skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).scoreMultiplier,
      worldBreakPressureScale: skyDancerArcadeV40RouteEffect(this.worldBreakRouteDoctrine).pressureScale,
      worldBreakGateHits: this.worldBreakGateHits,
      worldBreakGateMisses: this.worldBreakGateMisses,
      worldBreakGateStreak: this.worldBreakGateStreak,
      worldBreakGateSerial: this.worldBreakGateSerial,
      worldBreakGateTotal: this.stage.id === "dawn-city" ? SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES.length : 0,
      worldBreakGates: this.worldBreakGates.filter((gate) => gate.depth < 135).map((gate) => ({
        id: gate.id, index: gate.index, x: gate.x, y: gate.y, depth: gate.depth,
        radiusX: gate.radiusX, radiusY: gate.radiusY, resolved: gate.resolved, success: gate.success,
      })),
      worldBreakKnifeActive: this.stage.id === "red-canyon"
        && !this.worldBreakKnifeResolved
        && this.distance / Math.max(1, this.stage.durationSeconds * this.stage.courseSpeed) >= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START
        && this.distance / Math.max(1, this.stage.durationSeconds * this.stage.courseSpeed) <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END,
      worldBreakKnifeAltitudeOk: this.playerY <= SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
      worldBreakKnifeSeconds: this.worldBreakKnifeSeconds,
      worldBreakKnifeTargetSeconds: SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_TARGET_SECONDS,
      worldBreakKnifeCeilingY: SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_CEILING_Y,
      worldBreakKnifeComplete: this.worldBreakKnifeComplete,
      worldBreakKnifeSerial: this.worldBreakKnifeSerial,
      worldBreakTargetHits: this.worldBreakTargetHits,
      worldBreakTargetMisses: this.worldBreakTargetMisses,
      worldBreakTargetSerial: this.worldBreakTargetSerial,
      worldBreakTargetTotal: this.stage.id === "cloud-fleet"
        ? SKY_DANCER_ARCADE_V40_CLOUD_FLEET_TARGETS.length
        : this.stage.id === "desert-fortress"
          ? SKY_DANCER_ARCADE_V40_DESERT_FORTRESS_TURRETS.length
          : 0,
      worldBreakTargetCurrentLabel: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.worldBreakLabel ?? null,
      worldBreakTargetCurrentHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.hp ?? 0,
      worldBreakTargetCurrentMaxHp: this.enemies
        .filter((enemy) => enemy.alive && enemy.worldBreakTarget)
        .sort((a, b) => (a.worldBreakAnchorDistance ?? Infinity) - (b.worldBreakAnchorDistance ?? Infinity))[0]?.maxHp ?? 1,
      worldBreakStormActive: Boolean(stormLane && stormLaneDepth > -8 && stormLaneDepth < 132),
      worldBreakStormSafeX: stormLaneSafeX,
      worldBreakStormWidth: stormLane?.width ?? 0,
      worldBreakStormDepth: stormLaneDepth,
      worldBreakStormIndex: stormLane?.index ?? -1,
      worldBreakStormHits: this.worldBreakStormHits,
      worldBreakStormMisses: this.worldBreakStormMisses,
      worldBreakStormSerial: this.worldBreakStormSerial,
      worldBreakStormTotal: this.stage.id === "storm-carrier" ? SKY_DANCER_ARCADE_V40_STORM_LANES.length : 0,
      worldBreakFortressBreachActive: this.stage.id === "desert-fortress" && fortressBreachDepth > -14 && fortressBreachDepth < 145,
      worldBreakFortressBreachOpen: this.worldBreakFortressBreachOpen,
      worldBreakFortressBreachResolved: this.worldBreakFortressBreachResolved,
      worldBreakFortressBreachSuccess: this.worldBreakFortressBreachSuccess,
      worldBreakFortressBreachDepth: fortressBreachDepth,
      worldBreakFortressBreachX: SKY_DANCER_ARCADE_V40_DESERT_BREACH_X,
      worldBreakFortressBreachY: SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y,
      worldBreakFortressBreachRadiusX: SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_X,
      worldBreakFortressBreachRadiusY: SKY_DANCER_ARCADE_V40_DESERT_BREACH_RADIUS_Y,
      worldBreakFortressSerial: this.worldBreakFortressSerial,
      worldBreakIceActive: Boolean(iceAperture && iceDepth > -10 && iceDepth < 145),
      worldBreakIceX: iceAperture ? skyDancerArcadeV40IceApertureX(iceAperture, this.stageTime) : 0,
      worldBreakIceY: iceAperture?.y ?? 0,
      worldBreakIceRadiusX: (iceAperture?.radiusX ?? 0) * iceScale,
      worldBreakIceRadiusY: (iceAperture?.radiusY ?? 0) * iceScale,
      worldBreakIceDepth: iceDepth,
      worldBreakIceIndex: iceAperture?.index ?? -1,
      worldBreakIceHits: this.worldBreakIceHits,
      worldBreakIceMisses: this.worldBreakIceMisses,
      worldBreakIceSerial: this.worldBreakIceSerial,
      worldBreakIceTotal: this.stage.id === "ice-cavern" ? SKY_DANCER_ARCADE_V40_ICE_APERTURES.length : 0,
      worldBreakIcePerfect: this.stage.id === "ice-cavern"
        && this.worldBreakResolvedIceApertureIndices.size >= SKY_DANCER_ARCADE_V40_ICE_APERTURES.length
        && this.worldBreakIceMisses === 0,
      worldBreakPortalActive: this.stage.id === "floating-ruins" && this.worldBreakPortalChoiceIndex < 0 && portalDepth > -10 && portalDepth < 145,
      worldBreakPortalChoiceIndex: this.worldBreakPortalChoiceIndex,
      worldBreakPortalDoctrine: this.worldBreakPortalDoctrine,
      worldBreakPortalSerial: this.worldBreakPortalSerial,
      worldBreakPortalDepth: portalDepth,
      worldBreakPortalScoreMultiplier: portalDefinition?.scoreMultiplier ?? 1,
      worldBreakPortalPressureScale: portalDefinition?.pressureScale ?? 1,
      worldBreakPortals: this.stage.id === "floating-ruins"
        ? SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.map((portal) => ({
            index: portal.index, x: portal.x, y: portal.y, depth: portalDepth, radius: portal.radius,
            doctrine: portal.doctrine, label: portal.label, selected: portal.index === this.worldBreakPortalChoiceIndex,
          }))
        : [],
      worldBreakPursuitActive: pursuitPresenting,
      worldBreakPursuitX: pursuitX,
      worldBreakPursuitY: pursuitY,
      worldBreakPursuitDepth: pursuitDepth,
      worldBreakPursuitGap: this.worldBreakPursuitGap,
      worldBreakPursuitTargetGap: SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP,
      worldBreakPursuitTrackedSeconds: this.worldBreakPursuitTrackedSeconds,
      worldBreakPursuitCaught: this.worldBreakPursuitCaught,
      worldBreakPursuitResolved: this.worldBreakPursuitResolved,
      worldBreakPursuitSerial: this.worldBreakPursuitSerial,
      worldBreakMagmaActive: magmaActive,
      worldBreakMagmaLead: this.worldBreakMagmaLead,
      worldBreakMagmaPressure: skyDancerArcadeV40MagmaPressure(this.worldBreakMagmaLead),
      worldBreakMagmaHits: this.worldBreakMagmaHits,
      worldBreakMagmaResolved: this.worldBreakMagmaResolved,
      worldBreakMagmaEscaped: this.worldBreakMagmaEscaped,
      worldBreakMagmaSerial: this.worldBreakMagmaSerial,
      worldBreakOrbitActive: orbitActive,
      worldBreakOrbitSafeX: orbitSafeX,
      worldBreakOrbitWidth: SKY_DANCER_ARCADE_V40_ORBIT_CORRIDOR_WIDTH,
      worldBreakOrbitAltitude: this.worldBreakOrbitAltitude,
      worldBreakOrbitTargetAltitude: SKY_DANCER_ARCADE_V40_ORBIT_TARGET_ALTITUDE,
      worldBreakOrbitAligned: orbitAligned,
      worldBreakOrbitStrikes: this.worldBreakOrbitStrikes,
      worldBreakOrbitResolved: this.worldBreakOrbitResolved,
      worldBreakOrbitComplete: this.worldBreakOrbitComplete,
      worldBreakOrbitSerial: this.worldBreakOrbitSerial,
      worldBreakPrismActive: Boolean(prismTrial && prismDepth > -14 && prismDepth < 145),
      worldBreakPrismIndex: prismTrial?.index ?? -1,
      worldBreakPrismTotal: this.stage.id === "prism-citadel" ? SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length : 0,
      worldBreakPrismHits: this.worldBreakPrismHits,
      worldBreakPrismMisses: this.worldBreakPrismMisses,
      worldBreakPrismSerial: this.worldBreakPrismSerial,
      worldBreakPrismLabel: prismLabel,
      worldBreakPrismX: prismX,
      worldBreakPrismY: prismY,
      worldBreakPrismDepth: prismDepth,
      worldBreakPrismRadius: prismTrial?.radius ?? 0,
      worldBreakPrismComplete: this.stage.id === "prism-citadel" && this.worldBreakResolvedPrismTrialIndices.size >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length,
      worldBreakPrismPerfect: this.stage.id === "prism-citadel" && this.worldBreakResolvedPrismTrialIndices.size >= SKY_DANCER_ARCADE_V40_PRISM_TRIALS.length && this.worldBreakPrismMisses === 0,
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.x,
        y: enemy.y,
        depth: enemy.depth,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        locked: enemy.locked,
        boss: enemy.boss,
        phase: enemy.phase,
        maneuver: enemy.maneuver,
        role: enemy.role,
        armor: enemy.armor,
        maxArmor: enemy.maxArmor,
        bossPhase: enemy.bossPhase,
        weakpointOpen: enemy.weakpointOpen,
        stagger: enemy.stagger,
        counterplay: enemy.counterplay,
        counterplayIntensity: enemy.counterplayIntensity,
        worldBreakTarget: enemy.worldBreakTarget,
        worldBreakTargetIndex: enemy.worldBreakTargetIndex,
        worldBreakLabel: enemy.worldBreakLabel,
        rivalAce: enemy.rivalAce,
        rivalAceAppearance: enemy.rivalAceAppearance,
        rivalAceResolved: enemy.rivalAceResolved,
        finalBossForm: enemy.finalBossForm,
        finalBossAccent: enemy.finalBossAccent,
        finalBossReactive: enemy.finalBossReactive,
      })),
      projectiles: this.projectiles.filter((projectile) => projectile.life > 0).map((projectile) => ({
        id: projectile.id,
        owner: projectile.owner,
        x: projectile.x,
        y: projectile.y,
        depth: projectile.depth,
        targetEnemyId: projectile.targetEnemyId,
      })),
      impacts: this.impactEvents.map((impact) => ({ ...impact })),
      hazards: this.hazards.map((hazard) => ({
        id: hazard.id,
        kind: hazard.kind,
        x: hazard.x,
        y: hazard.y,
        depth: hazard.depth,
        scale: hazard.scale,
      })),
      resultTimer: this.resultTimer,
      lastClearedStageId: this.lastClearedStageId,
      lastStageScore: this.lastStageScore,
      lastStageRank: this.lastStageRank,
      lastStageNoDamage: this.lastStageNoDamage,
      lastStageMedals: this.lastStageMedals.map(medal => ({ ...medal })),
      lastStageScoreBreakdown: { ...this.lastStageScoreBreakdown },
      runMedalsEarned: this.runMedalsEarned,
      message: this.message,
      shotSerial: this.shotSerial,
      missileSerial: this.missileSerial,
      hitSerial: this.hitSerial,
      damageSerial: this.damageSerial,
      stageSerial: this.stageSerial,
      resultSerial: this.resultSerial,
    };
  }


  /** Deterministic V40.4 hooks for the persistent Rival Ace campaign contract. */
  triggerV404RivalSpawnForTests(): number | null {
    const encounter = skyDancerArcadeV404RivalEncounterForSection(this.stageNumber);
    if (!encounter) return null;
    this.stageTime = this.stage.durationSeconds * (encounter.startProgress + .01);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.updateV404RivalAce(0, false);
    return this.rivalAceActiveId;
  }

  triggerV404RivalOutcomeForTests(outcome: Exclude<SkyDancerArcadeV404RivalOutcome, "NONE">): void {
    const encounter = skyDancerArcadeV404RivalEncounterForSection(this.stageNumber);
    if (!encounter) return;
    if (this.rivalAceActiveId === null) this.triggerV404RivalSpawnForTests();
    const rival = this.activeV404Rival();
    if (!rival) return;
    if (outcome === "BROKEN") {
      this.damageEnemy(rival, rival.maxHp * 20, false);
      return;
    }
    if (outcome === "OUTFLOWN") {
      this.rivalAceAdvantage = this.rivalAceAdvantageTarget;
      this.updateV404RivalAce(0, false);
      return;
    }
    this.resolveV404RivalAce(rival, "ESCAPED");
  }


  /** Deterministic V40 hook for skyline-gate gameplay regression tests. */
  triggerV40WorldBreakGateForTests(index: number, playerX: number, playerY: number): void {
    const gate = this.worldBreakGates.find((candidate) => candidate.index === index);
    if (!gate) return;
    this.playerX = clamp(playerX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerY = clamp(playerY, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    this.distance = gate.anchorDistance - 2.2;
    this.updateWorldBreakGates();
  }

  /** Deterministic V40 phase 2 hooks for world-objective regression tests. */
  triggerV40KnifeRunForTests(seconds: number, playerY: number): void {
    if (this.stage.id !== "red-canyon") return;
    const totalDistance = this.stage.durationSeconds * this.stage.courseSpeed;
    this.distance = totalDistance * ((SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_START + SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END) * .5);
    this.playerY = clamp(playerY, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    this.updateWorldBreakKnifeRun(Math.max(0, seconds));
    this.distance = totalDistance * (SKY_DANCER_ARCADE_V40_RED_CANYON_KNIFE_END + .01);
    this.updateWorldBreakKnifeRun(0);
  }

  destroyV40FleetTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (enemy) this.damageEnemy(enemy, enemy.maxHp * 4, false);
  }

  missV40FleetTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (!enemy || enemy.worldBreakAnchorDistance === undefined) return;
    this.distance = enemy.worldBreakAnchorDistance + 5;
    this.updateEnemies(1 / 60, false);
  }

  triggerV40StormLaneForTests(index: number, clean: boolean): void {
    const lane = SKY_DANCER_ARCADE_V40_STORM_LANES.find((candidate) => candidate.index === index);
    if (!lane) return;
    const anchorDistance = skyDancerArcadeV40StormLaneAnchorDistance(lane, this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    const safeX = skyDancerArcadeV40StormLaneX(lane, this.stageTime);
    this.playerX = clean
      ? clamp(safeX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT)
      : clamp(safeX + lane.width + 1.05, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.updateWorldBreakStormGrid();
  }

  destroyV40FortressTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (enemy) this.damageEnemy(enemy, enemy.maxHp * 4, false);
  }

  missV40FortressTargetForTests(index: number): void {
    const enemy = this.enemies.find((candidate) => candidate.alive && candidate.worldBreakTargetIndex === index);
    if (!enemy || enemy.worldBreakAnchorDistance === undefined) return;
    this.distance = enemy.worldBreakAnchorDistance + 5;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.updateEnemies(1 / 60, false);
  }

  triggerV40FortressBreachForTests(clean: boolean): void {
    const anchorDistance = skyDancerArcadeV40FortressBreachAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.playerX = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_X : PLAYER_X_LIMIT;
    this.playerY = clean ? SKY_DANCER_ARCADE_V40_DESERT_BREACH_Y : PLAYER_Y_LIMIT;
    this.updateWorldBreakFortressBreach();
  }

  triggerV40IceApertureForTests(index: number, clean: boolean): void {
    const aperture = SKY_DANCER_ARCADE_V40_ICE_APERTURES.find((candidate) => candidate.index === index);
    if (!aperture) return;
    const anchorDistance = skyDancerArcadeV40IceApertureAnchorDistance(aperture, this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    const safeX = skyDancerArcadeV40IceApertureX(aperture, this.stageTime);
    this.playerX = clean ? clamp(safeX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = clean ? clamp(aperture.y, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT) : PLAYER_Y_LIMIT;
    this.updateWorldBreakIceCollapse();
  }

  triggerV40FloatingPortalForTests(index: number): void {
    const portal = SKY_DANCER_ARCADE_V40_FLOATING_PORTALS.find((candidate) => candidate.index === index);
    if (!portal) return;
    const anchorDistance = skyDancerArcadeV40FloatingPortalAnchorDistance(this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    this.playerX = clamp(portal.x, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerY = clamp(portal.y, -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT);
    this.updateWorldBreakFloatingPortal();
  }

  triggerV40NeonPursuitForTests(caught: boolean): void {
    if (this.stage.id !== "night-metro") return;
    this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_NEON_PURSUIT_START + .03);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.playerX = caught ? clamp(skyDancerArcadeV40NeonPhantomX(this.stageTime), -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = caught ? clamp(skyDancerArcadeV40NeonPhantomY(this.stageTime), -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT) : PLAYER_Y_LIMIT;
    if (caught) {
      this.worldBreakPursuitGap = SKY_DANCER_ARCADE_V40_NEON_PURSUIT_CATCH_GAP + .4;
      this.updateWorldBreakNeonPursuit(.12, true);
    } else {
      this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_NEON_PURSUIT_END + .01);
      this.distance = this.stageTime * this.stage.courseSpeed;
      this.updateWorldBreakNeonPursuit(0, false);
    }
  }

  triggerV40MagmaPressureForTests(hit: boolean): void {
    if (this.stage.id !== "volcano-core") return;
    this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_MAGMA_START + .03);
    this.distance = this.stageTime * this.stage.courseSpeed;
    if (hit) {
      this.worldBreakMagmaLead = .2;
      this.updateWorldBreakMagmaPressure(.08, false);
    } else {
      this.worldBreakMagmaLead = SKY_DANCER_ARCADE_V40_MAGMA_INITIAL_LEAD;
      this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_MAGMA_END + .01);
      this.distance = this.stageTime * this.stage.courseSpeed;
      this.updateWorldBreakMagmaPressure(0, true);
    }
  }

  triggerV40OrbitalAscentForTests(clean: boolean): void {
    if (this.stage.id !== "orbital-ascent") return;
    this.stageTime = this.stage.durationSeconds * (SKY_DANCER_ARCADE_V40_ORBIT_START + .03);
    this.distance = this.stageTime * this.stage.courseSpeed;
    const safeX = skyDancerArcadeV40OrbitalSafeX(this.stageTime);
    this.playerX = clean ? clamp(safeX, -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = clean ? .9 : -PLAYER_Y_LIMIT;
    if (clean) {
      this.worldBreakOrbitAltitude = 4;
      this.updateWorldBreakOrbitalAscent(8, true);
    } else {
      this.updateWorldBreakOrbitalAscent(SKY_DANCER_ARCADE_V40_ORBIT_STRIKE_SECONDS + .08, false);
    }
  }

  triggerV40PrismTrialForTests(index: number, clean: boolean): void {
    if (this.stage.id !== "prism-citadel") return;
    const trial = SKY_DANCER_ARCADE_V40_PRISM_TRIALS.find((candidate) => candidate.index === index);
    if (!trial) return;
    const anchorDistance = skyDancerArcadeV40PrismTrialAnchorDistance(trial, this.stage.durationSeconds, this.stage.courseSpeed);
    this.distance = anchorDistance - 2.2;
    this.stageTime = this.distance / Math.max(1, this.stage.courseSpeed);
    const routeStageId = skyDancerArcadeV40PrismTrialStageId(this.route, trial.index);
    this.playerX = clean ? clamp(skyDancerArcadeV40PrismTrialX(trial, routeStageId, this.stageTime), -PLAYER_X_LIMIT, PLAYER_X_LIMIT) : PLAYER_X_LIMIT;
    this.playerY = clean ? clamp(skyDancerArcadeV40PrismTrialY(trial, routeStageId, this.stageTime), -PLAYER_Y_LIMIT, PLAYER_Y_LIMIT) : PLAYER_Y_LIMIT;
    this.updateWorldBreakPrismReprise();
  }

  /** Deterministic V12 hook for adaptive encounter regression tests. */
  setV12DirectorSignalsForTests(gunHeat: number, missileHeat: number, turboHeat: number, recentDamage = 0, hpRatio = 1): void {
    this.directorGunHeat = clamp(gunHeat, 0, 3);
    this.directorMissileHeat = clamp(missileHeat, 0, 3);
    this.directorTurboHeat = clamp(turboHeat, 0, 3);
    this.directorRecentDamage = clamp(recentDamage, 0, 2);
    this.playerHp = PLAYER_MAX_HP * clamp(hpRatio, .01, 1);
    this.applyV12CombatPlan(this.currentV12CombatPlan());
  }

  spawnV12EncounterForTests(): void {
    this.spawnWave();
  }

  advanceV121EncounterForTests(): boolean {
    const next = this.encounterPhaseQueue[0];
    if (!next) return false;
    this.stageTime = Math.max(this.stageTime, next.at);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.updateV121EncounterQueue();
    return true;
  }

  setV122PlayerFlowForTests(x: number, vx: number): void {
    this.playerX = clamp(x, -PLAYER_X_LIMIT, PLAYER_X_LIMIT);
    this.playerVX = clamp(vx, -PLAYER_TURBO_SPEED_X, PLAYER_TURBO_SPEED_X);
  }

  /** Deterministic V11.8 hooks for loadout combat regression tests. */
  spawnEnemyForTests(kind: SkyDancerArcadeEnemyKind, x = 0, y = 0, depth = 30): number {
    const id = this.nextEntityId;
    this.spawnEnemy(kind, x, y, depth);
    return id;
  }

  damageEnemyForTests(enemyId: number, amount: number, missile: boolean): void {
    const enemy = this.enemies.find((candidate) => candidate.id === enemyId && candidate.alive);
    if (enemy) this.damageEnemy(enemy, amount, missile);
  }

  forceEnemyCounterplayForTests(enemyId: number): void {
    const enemy = this.enemies.find((candidate) => candidate.id === enemyId && candidate.alive);
    if (!enemy) return;
    const type = this.counterplayTypeForEnemy(enemy);
    if (type !== "none") this.activateEnemyCounterplay(enemy, type);
  }

  /** Deterministic V11 hook for timeline/director regression tests. */
  triggerV11TimelineForTests(progress: number): void {
    this.stageTime = this.stage.durationSeconds * clamp(progress, 0, 1);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.updateV11Timeline();
  }

  /** Deterministic V10 hooks retained for legacy rule coverage. */
  triggerStageEvolutionForTests(progress: number): void {
    this.stageTime = this.stage.durationSeconds * clamp(progress, 0, 1);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.updateStageEvolution();
  }

  configureV405FinalBossMemoryForTests(
    doctrines: readonly SkyDancerArcadeV40RouteDoctrine[],
    outcomes: readonly SkyDancerArcadeV405ResolvedRivalOutcome[],
  ): void {
    this.worldBreakRouteHistory.length = 0;
    this.worldBreakRouteHistory.push(...doctrines.filter((doctrine) => doctrine !== "LOCKED"));
    this.rivalAceOutcomeHistory.length = 0;
    this.rivalAceOutcomeHistory.push(...outcomes);
    this.finalBossContract = null;
  }

  spawnV405FinalBossForTests(): void {
    if (this.stage.id !== SKY_DANCER_ARCADE_FINAL_STAGE) throw new Error("V40.5 final boss test hook requires Prism Citadel");
    this.spawnBoss();
  }

  triggerBossPhaseForTests(phase: SkyDancerArcadeBossPhase): void {
    const ratio = phase === 1 ? .9 : phase === 2 ? .6 : .25;
    // Deterministic phase tests intentionally bypass the presentation-only V40.14 ingress hold.
    if (!this.bossSpawned) this.spawnBoss();
    this.bossIngressTimer = 0;
    this.bossOpeningStrikePending = false;
    this.setBossHpRatioForTests(ratio);
    if (this.pendingBossPhaseMechanic === null) return;
    this.bossPhaseTransitionTimer = 0;
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss && !enemy.retreating);
    if (boss) this.updateEnemies(1 / 60, false);
  }

  setBossHpRatioForTests(ratio: number): void {
    const bossAlreadyPresent = this.bossSpawned;
    if (!this.bossSpawned) this.spawnBoss();
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.boss);
    if (!boss) return;
    // First call can exercise the real ingress. Subsequent deterministic HP changes target phase logic directly.
    if (bossAlreadyPresent) {
      this.bossIngressTimer = 0;
      this.bossOpeningStrikePending = false;
    }
    boss.hp = boss.maxHp * clamp(ratio, .01, 1);
    this.updateEnemies(1 / 60, false);
  }

  /** Purely deterministic hook used by rule tests; production progression still requires defeating the boss. */
  completeCurrentStageForTests(routeChoice?: SkyDancerArcadeStageId): void {
    if (routeChoice && this.stage.next.includes(routeChoice)) this.branchSelection = routeChoice;
    this.bossSpawned = true;
    this.bossDefeated = true;
    this.runTime += Math.max(0, this.stage.durationSeconds - this.stageTime);
    this.stageTime = this.stage.durationSeconds;
    this.completeStage();
  }

  advanceResultForTests(): void {
    if (this.status !== "stage-clear") return;
    this.resultTimer = 0;
    this.advanceAfterStageClear();
  }

  /** Marks the climax target down without skipping course time. */
  defeatBossEarlyForTests(stageTimeSeconds: number): void {
    if (this.status !== "running") return;
    this.bossSpawned = true;
    this.bossDefeated = true;
    this.enemies = [];
    this.stageTime = clamp(stageTimeSeconds, 0, this.stage.durationSeconds);
    this.distance = this.stageTime * this.stage.courseSpeed;
  }
}
