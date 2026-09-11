from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# -----------------------------------------------------------------------------
# V40.4 pure Rival Ace contract
# -----------------------------------------------------------------------------
Path("src/sky/arcade/SkyDancerArcadeV404RivalAce.ts").write_text(r'''import type { SkyDancerArcadeEnemyManeuver } from "./SkyDancerArcadeRuntime";
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
''')

# -----------------------------------------------------------------------------
# Runtime wiring
# -----------------------------------------------------------------------------
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    'import { skyDancerArcadeV271CombatCorridorCrowded } from "./SkyDancerArcadeV271ScreenPolish";\nimport {\n  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,',
    'import { skyDancerArcadeV271CombatCorridorCrowded } from "./SkyDancerArcadeV271ScreenPolish";\nimport {\n  SKY_DANCER_ARCADE_V404_RIVAL_NAME,\n  skyDancerArcadeV404RivalAdaptation,\n  skyDancerArcadeV404RivalAdvantageTarget,\n  skyDancerArcadeV404RivalEncounterForSection,\n  skyDancerArcadeV404RivalHp,\n  skyDancerArcadeV404RivalManeuver,\n  skyDancerArcadeV404RivalManeuverSign,\n  skyDancerArcadeV404RivalPressureGain,\n  type SkyDancerArcadeV404RivalOutcome,\n} from "./SkyDancerArcadeV404RivalAce";\nimport {\n  SKY_DANCER_ARCADE_V40_DAWN_CITY_GATES,',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  worldBreakTarget?: boolean;\n  worldBreakTargetIndex?: number;\n  worldBreakLabel?: string;\n}',
    '  worldBreakTarget?: boolean;\n  worldBreakTargetIndex?: number;\n  worldBreakLabel?: string;\n  // V40.4: NOVA-7 is a persistent named opponent, still rendered through the proven ace airframe.\n  rivalAce?: boolean;\n  rivalAceAppearance?: number;\n  rivalAceResolved?: boolean;\n}',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  routeRiskLabels: readonly SkyDancerArcadeV11RouteRisk[];\n  worldBreakObjective: string;',
    '  routeRiskLabels: readonly SkyDancerArcadeV11RouteRisk[];\n  rivalAceActive: boolean;\n  rivalAceName: string;\n  rivalAceAppearance: number;\n  rivalAceAdaptation: string;\n  rivalAceHp: number;\n  rivalAceMaxHp: number;\n  rivalAceAdvantage: number;\n  rivalAceAdvantageTarget: number;\n  rivalAceEncounters: number;\n  rivalAcePlayerWins: number;\n  rivalAceEscapes: number;\n  rivalAceOutcome: SkyDancerArcadeV404RivalOutcome;\n  rivalAceSerial: number;\n  worldBreakObjective: string;',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private readonly worldBreakResolvedPrismTrialIndices = new Set<number>();\n  private nextEntityId = 1;',
    '  private readonly worldBreakResolvedPrismTrialIndices = new Set<number>();\n  // V40.4 RIVAL ACE: the rivalry persists across route handoffs while the active aircraft does not.\n  private rivalAceActiveId: number | null = null;\n  private rivalAceAppearance = 0;\n  private rivalAceAdaptation = "NO CONTACT";\n  private rivalAceAdvantage = 0;\n  private rivalAceAdvantageTarget = 1;\n  private rivalAceOutcome: SkyDancerArcadeV404RivalOutcome = "NONE";\n  private rivalAceEncounters = 0;\n  private rivalAcePlayerWins = 0;\n  private rivalAceEscapes = 0;\n  private rivalAceSerial = 0;\n  private readonly rivalAceSeenAppearances = new Set<number>();\n  private readonly rivalAceResolvedAppearances = new Set<number>();\n  private nextEntityId = 1;',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.hazards = [];\n    if (rewindTime <= 0) {',
    '    this.hazards = [];\n    this.rivalAceActiveId = null;\n    this.rivalAceAdvantage = 0;\n    this.rivalAceAdvantageTarget = 1;\n    this.rivalAceOutcome = "NONE";\n    this.rivalAceAppearance = 0;\n    this.rivalAceAdaptation = "NO CONTACT";\n    if (rewindTime <= 0) {',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.updateWorldBreakOrbitalAscent(delta, turboActive);\n    this.updateWorldBreakPrismReprise();\n    this.updateBranch();',
    '    this.updateWorldBreakOrbitalAscent(delta, turboActive);\n    this.updateWorldBreakPrismReprise();\n    this.updateV404RivalAce(delta, turboActive);\n    this.updateBranch();',
)

rival_methods = r'''

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
'''

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '\n  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {',
    rival_methods + '\n\n  private resolveV40FleetTarget(enemy: ArcadeEnemy, destroyed: boolean): void {',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));\n      this.updateEnemyCounterplay(enemy, delta, turboActive);',
    '      if (enemy.rivalAce) {\n        const appearance = enemy.rivalAceAppearance ?? this.rivalAceAppearance || 1;\n        enemy.maneuver = skyDancerArcadeV404RivalManeuver(appearance, enemy.age);\n        enemy.maneuverSign = skyDancerArcadeV404RivalManeuverSign(appearance, enemy.age);\n      }\n      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));\n      this.updateEnemyCounterplay(enemy, delta, turboActive);',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    if (this.impactEvents.length > 16) {\n      const retired = this.impactEvents.splice(0, this.impactEvents.length - 16);\n      for (const impact of retired) this.impactEventAges.delete(impact.serial);\n    }\n    if (!destroyed) {',
    '    if (this.impactEvents.length > 16) {\n      const retired = this.impactEvents.splice(0, this.impactEvents.length - 16);\n      for (const impact of retired) this.impactEventAges.delete(impact.serial);\n    }\n    if (destroyed && enemy.rivalAce) {\n      // NOVA-7 loses the pass but never becomes a disposable kill; the same pilot returns later in the run.\n      this.resolveV404RivalAce(enemy, "BROKEN");\n      return;\n    }\n    if (!destroyed) {',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));\n    const rank = skyDancerArcadeRankForScore(this.score, activeStageCount, this.damageTaken, this.continuesUsed);',
    '    const rivalAce = this.activeV404Rival();\n    const activeStageCount = Math.max(1, this.stagesCleared + (this.status === "running" ? 1 : 0));\n    const rank = skyDancerArcadeRankForScore(this.score, activeStageCount, this.damageTaken, this.continuesUsed);',
)

patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      routeRiskLabels: this.stage.next.map((_, index) => skyDancerArcadeV11RouteRisk(index, this.stage.next.length)),\n      worldBreakObjective:',
    '      routeRiskLabels: this.stage.next.map((_, index) => skyDancerArcadeV11RouteRisk(index, this.stage.next.length)),\n      rivalAceActive: Boolean(rivalAce),\n      rivalAceName: SKY_DANCER_ARCADE_V404_RIVAL_NAME,\n      rivalAceAppearance: rivalAce?.rivalAceAppearance ?? this.rivalAceAppearance,\n      rivalAceAdaptation: this.rivalAceAdaptation,\n      rivalAceHp: rivalAce?.hp ?? 0,\n      rivalAceMaxHp: rivalAce?.maxHp ?? 1,\n      rivalAceAdvantage: this.rivalAceAdvantage,\n      rivalAceAdvantageTarget: this.rivalAceAdvantageTarget,\n      rivalAceEncounters: this.rivalAceEncounters,\n      rivalAcePlayerWins: this.rivalAcePlayerWins,\n      rivalAceEscapes: this.rivalAceEscapes,\n      rivalAceOutcome: this.rivalAceOutcome,\n      rivalAceSerial: this.rivalAceSerial,\n      worldBreakObjective:',
)

test_hooks = r'''

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
'''
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '\n  /** Deterministic V40 hook for skyline-gate gameplay regression tests. */',
    test_hooks + '\n\n  /** Deterministic V40 hook for skyline-gate gameplay regression tests. */',
)

# -----------------------------------------------------------------------------
# HUD: direct snapshot rendering, no render-time refs/effects required.
# -----------------------------------------------------------------------------
patch(
    "app/SkyDancerArcadeMode.tsx",
    '  const counterplayHudLabel = activeCounterplay === "armor-brace" ? "ARMOR BRACE · STAGGER IT" : activeCounterplay === "evasive-roll" ? "EVASIVE ROLL · TRACK IT" : activeCounterplay === "turbo-jammer" ? "TURBO JAMMER · BREAK IT" : "";\n\n  return (',
    '  const counterplayHudLabel = activeCounterplay === "armor-brace" ? "ARMOR BRACE · STAGGER IT" : activeCounterplay === "evasive-roll" ? "EVASIVE ROLL · TRACK IT" : activeCounterplay === "turbo-jammer" ? "TURBO JAMMER · BREAK IT" : "";\n  const rivalAceHpPercent = snapshot.rivalAceActive ? Math.round(snapshot.rivalAceHp / Math.max(1, snapshot.rivalAceMaxHp) * 100) : 0;\n  const rivalAceAdvantagePercent = snapshot.rivalAceActive ? Math.round(snapshot.rivalAceAdvantage / Math.max(.001, snapshot.rivalAceAdvantageTarget) * 100) : 0;\n\n  return (',
)

rival_hud = r'''

        {snapshot.rivalAceActive && (
          <div className={styles.rivalAceHud} data-contact={snapshot.rivalAceAppearance} aria-live="polite" aria-label="Rival Ace contact">
            <small>RIVAL ACE · CONTACT {snapshot.rivalAceAppearance}/3</small>
            <div><strong>{snapshot.rivalAceName}</strong><b>{snapshot.rivalAceAdaptation}</b></div>
            <span><i style={{ width: `${rivalAceHpPercent}%` }} /></span>
            <span className={styles.rivalAceAdvantage}><i style={{ width: `${rivalAceAdvantagePercent}%` }} /></span>
            <em>HULL {rivalAceHpPercent}% · ADVANTAGE {rivalAceAdvantagePercent}% · BREAK OR OUTFIGHT</em>
          </div>
        )}
'''
patch(
    "app/SkyDancerArcadeMode.tsx",
    '\n        {worldBreakBriefing.active && (',
    rival_hud + '\n\n        {worldBreakBriefing.active && (',
)

with Path("app/SkyDancerArcadeMode.module.css").open("a") as f:
    f.write(r'''

/* Arcade Run V40.4 RIVAL ACE — compact persistent duel telemetry. */
.rivalAceHud{position:absolute;z-index:10;left:50%;top:max(67px,calc(env(safe-area-inset-top) + 65px));transform:translateX(-50%);width:min(440px,52vw);padding:5px 12px 6px;border:1px solid rgba(255,98,203,.5);border-radius:7px;background:linear-gradient(180deg,rgba(32,7,35,.82),rgba(5,17,34,.68));box-shadow:0 0 24px rgba(255,56,184,.13),inset 0 1px 0 rgba(119,241,255,.14);pointer-events:none;text-align:center;animation:rivalAceContactIn .36s ease-out both}.rivalAceHud small{display:block;font-size:5px;font-weight:1000;letter-spacing:.24em;color:#ff83d8}.rivalAceHud>div{display:flex;align-items:baseline;justify-content:center;gap:9px;margin:1px 0 3px}.rivalAceHud strong{font-size:15px;letter-spacing:.13em;color:#fff}.rivalAceHud b{font-size:5px;letter-spacing:.1em;color:#77efff}.rivalAceHud>span{display:block;height:4px;margin-top:2px;overflow:hidden;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08)}.rivalAceHud>span i{display:block;height:100%;background:linear-gradient(90deg,#ff3c8e,#ff9bdc);box-shadow:0 0 9px rgba(255,66,170,.48);transition:width .1s linear}.rivalAceHud>.rivalAceAdvantage i{background:linear-gradient(90deg,#43d6ff,#fff195);box-shadow:0 0 10px rgba(95,235,255,.5)}.rivalAceHud em{display:block;margin-top:4px;font-size:5px;font-style:normal;font-weight:1000;letter-spacing:.12em;color:rgba(255,255,255,.7)}.rivalAceHud[data-contact="3"]{border-color:rgba(255,223,102,.62);box-shadow:0 0 28px rgba(255,83,168,.18),0 0 18px rgba(255,221,95,.08)}.rivalAceHud[data-contact="3"] strong{color:#fff0a3}@keyframes rivalAceContactIn{from{opacity:0;transform:translateX(-50%) translateY(-7px) scale(.97)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}@media(max-height:520px){.rivalAceHud{top:max(61px,calc(env(safe-area-inset-top) + 59px));width:min(405px,48vw);padding:4px 10px}.rivalAceHud strong{font-size:13px}.rivalAceHud b,.rivalAceHud em{font-size:4px}}@media(orientation:portrait){.rivalAceHud{top:max(93px,calc(env(safe-area-inset-top) + 88px));width:76vw}}@media(prefers-reduced-motion:reduce){.rivalAceHud{animation:none}}
''')

# -----------------------------------------------------------------------------
# WebGL identity + Rival-specific arrival/outcome feedback.
# -----------------------------------------------------------------------------
patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '        group.userData.arcadeCombatBaseScale = group.scale.x;\n        group.rotation.y = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;',
    '        group.userData.arcadeCombatBaseScale = group.scale.x;\n        if (enemy.rivalAce) {\n          // V40.4: NOVA-7 keeps one unmistakable magenta/cyan signature across every biome.\n          const identity = new THREE.Group();\n          identity.name = "arcade-rival-ace-identity";\n          const magenta = new THREE.MeshBasicMaterial({ color: 0xff4fc8, transparent: true, opacity: .88, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });\n          const cyan = new THREE.MeshBasicMaterial({ color: 0x67edff, transparent: true, opacity: .78, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });\n          const left = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 5), magenta);\n          const right = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 5), cyan);\n          left.position.set(-.68, .08, .26); right.position.set(.68, .08, .26);\n          const halo = new THREE.Mesh(new THREE.TorusGeometry(.82, .035, 5, 24), magenta.clone());\n          halo.rotation.x = Math.PI / 2; halo.position.z = .42;\n          identity.add(left, right, halo);\n          group.add(identity);\n        }\n        group.rotation.y = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      if (!enemy.boss) {\n        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;',
    '      const rivalIdentity = group.getObjectByName("arcade-rival-ace-identity");\n      if (rivalIdentity) {\n        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 8.5 + enemy.id) * .08;\n        rivalIdentity.scale.setScalar(pulse);\n        rivalIdentity.rotation.z = -group.rotation.z * .35;\n      }\n      if (!enemy.boss) {\n        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }',
    '    if (snapshot.rivalAceSerial !== this.previousSnapshot.rivalAceSerial) {\n      const playerWon = snapshot.rivalAceOutcome === "BROKEN" || snapshot.rivalAceOutcome === "OUTFLOWN";\n      this.presentation.emitRushAccent();\n      this.cameraImpactKick = Math.max(this.cameraImpactKick, playerWon ? .42 : .28);\n      this.cameraShake = Math.min(.82, this.cameraShake + (playerWon ? .24 : .14));\n      if (snapshot.rivalAceOutcome === "NONE") { this.audio.tone(126, .3, .032, "sawtooth"); this.audio.tone(504, .14, .018, "triangle"); }\n      else if (playerWon) { this.audio.tone(220, .22, .03, "triangle"); this.audio.tone(880, .13, .02, "triangle"); }\n      else { this.audio.tone(92, .26, .028, "sawtooth"); this.audio.tone(184, .13, .012, "square"); }\n    }\n    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }',
)

# -----------------------------------------------------------------------------
# Regression tests
# -----------------------------------------------------------------------------
Path("tests/sky-arcade-v404-rival-ace.test.ts").write_text(r'''import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import {
  SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS,
  SKY_DANCER_ARCADE_V404_RIVAL_NAME,
  skyDancerArcadeV404RivalAdaptation,
  skyDancerArcadeV404RivalManeuver,
} from "../src/sky/arcade/SkyDancerArcadeV404RivalAce";

function advanceSection(runtime: SkyDancerArcadeRuntime): void {
  const snapshot = runtime.getSnapshot();
  const choice = snapshot.branchOptions[0];
  runtime.completeCurrentStageForTests(choice);
  runtime.advanceResultForTests();
}

function runtimeAtSection(section: number, loadout: "standard" | "gun-focus" | "missile-focus" = "standard"): SkyDancerArcadeRuntime {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "arcade-run", loadout, seed: 0x404ace });
  while (runtime.getSnapshot().stageNumber < section) advanceSection(runtime);
  return runtime;
}

test("V40.4 authors three escalating NOVA-7 contacts after World Break route decisions", () => {
  assert.equal(SKY_DANCER_ARCADE_V404_RIVAL_NAME, "NOVA-7");
  assert.deepEqual(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS.map((entry) => entry.section), [2, 4, 6]);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[0].startProgress > .43);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[0].baseHp < SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[1].baseHp);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[1].baseHp < SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[2].baseHp);
  assert.ok(SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[0].advantageTarget < SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[2].advantageTarget);
});

test("V40.4 Rival adaptation reads the player's real loadout and route doctrine", () => {
  assert.match(skyDancerArcadeV404RivalAdaptation("gun-focus", "SAFE", 1), /CANNON READER · ARMOR BRACE/);
  assert.match(skyDancerArcadeV404RivalAdaptation("missile-focus", "SCORE", 2), /MISSILE BREAKER · EVASIVE ROLL/);
  assert.match(skyDancerArcadeV404RivalAdaptation("standard", "DANGER", 3), /TURBO HUNTER · JAMMER · DANGER CUT · NO RESERVE/);
});

test("V40.4 Rival flies a changing real dogfight sentence instead of one sinusoid", () => {
  const first = new Set(Array.from({ length: 9 }, (_, i) => skyDancerArcadeV404RivalManeuver(1, i * 1.45)));
  const final = new Set(Array.from({ length: 10 }, (_, i) => skyDancerArcadeV404RivalManeuver(3, i * 1.08)));
  for (const required of ["cross-pass", "parallel", "overtake", "close-bank"] as const) assert.ok(first.has(required));
  assert.ok(final.has("overtake"));
  assert.ok(final.has("cross-pass"));
  assert.ok(final.size >= 4);
});

test("V40.4 section two spawns one targetable persistent ace with dedicated telemetry", () => {
  const runtime = runtimeAtSection(2, "missile-focus");
  const id = runtime.triggerV404RivalSpawnForTests();
  const snapshot = runtime.getSnapshot();
  assert.ok(id !== null);
  assert.equal(snapshot.rivalAceActive, true);
  assert.equal(snapshot.rivalAceName, "NOVA-7");
  assert.equal(snapshot.rivalAceAppearance, 1);
  assert.match(snapshot.rivalAceAdaptation, /MISSILE BREAKER/);
  const rival = snapshot.enemies.find((enemy) => enemy.id === id);
  assert.equal(rival?.kind, "ace");
  assert.equal(rival?.rivalAce, true);
  assert.ok((rival?.hp ?? 0) > 100);
});

test("V40.4 breaking NOVA-7 wins the pass without turning the recurring pilot into a normal kill", () => {
  const runtime = runtimeAtSection(2);
  runtime.triggerV404RivalSpawnForTests();
  const beforeKills = runtime.getSnapshot().enemiesDefeated;
  runtime.triggerV404RivalOutcomeForTests("BROKEN");
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.rivalAceActive, false);
  assert.equal(snapshot.rivalAceOutcome, "BROKEN");
  assert.equal(snapshot.rivalAcePlayerWins, 1);
  assert.equal(snapshot.enemiesDefeated, beforeKills);
  assert.match(snapshot.message ?? "", /BROKEN · DISENGAGING/);
  assert.ok(snapshot.enemies.some((enemy) => enemy.rivalAce));
});

test("V40.4 pressure advantage can outfly the Rival without requiring an HP kill", () => {
  const runtime = runtimeAtSection(4, "gun-focus");
  runtime.triggerV404RivalSpawnForTests();
  runtime.triggerV404RivalOutcomeForTests("OUTFLOWN");
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.rivalAceOutcome, "OUTFLOWN");
  assert.equal(snapshot.rivalAcePlayerWins, 1);
  assert.equal(snapshot.rivalAceEscapes, 0);
  assert.match(snapshot.message ?? "", /OUTFLOWN/);
});

test("V40.4 an escape preserves the rivalry and later sections escalate to the same callsign", () => {
  const runtime = runtimeAtSection(2);
  runtime.triggerV404RivalSpawnForTests();
  runtime.triggerV404RivalOutcomeForTests("ESCAPED");
  assert.equal(runtime.getSnapshot().rivalAceEscapes, 1);
  advanceSection(runtime);
  advanceSection(runtime);
  assert.equal(runtime.getSnapshot().stageNumber, 4);
  runtime.triggerV404RivalSpawnForTests();
  const rematch = runtime.getSnapshot();
  assert.equal(rematch.rivalAceName, "NOVA-7");
  assert.equal(rematch.rivalAceAppearance, 2);
  assert.equal(rematch.rivalAceEncounters, 2);
  assert.equal(rematch.rivalAceEscapes, 1);
});

test("V40.4 final section-six duel resolves before Prism and has the strongest contract", () => {
  const runtime = runtimeAtSection(6);
  runtime.triggerV404RivalSpawnForTests();
  const contact = runtime.getSnapshot();
  assert.equal(contact.rivalAceAppearance, 3);
  assert.ok(contact.rivalAceMaxHp >= SKY_DANCER_ARCADE_V404_RIVAL_ENCOUNTERS[2].baseHp);
  runtime.triggerV404RivalOutcomeForTests("BROKEN");
  const result = runtime.getSnapshot();
  assert.equal(result.rivalAcePlayerWins, 1);
  assert.match(result.message ?? "", /DEFEATED · SKY IS YOURS/);
});

test("V40.4 HUD and WebGL expose the named Rival without creating a second flight solver", () => {
  const ui = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(ui, /RIVAL ACE · CONTACT/);
  assert.match(ui, /BREAK OR OUTFIGHT/);
  assert.match(css, /\.rivalAceHud/);
  assert.match(webgl, /arcade-rival-ace-identity/);
  assert.match(webgl, /snapshot\.rivalAceSerial/);
  assert.match(runtime, /skyDancerArcadeV404RivalManeuver\(encounter\.appearance, rival\.age\)/);
  assert.match(runtime, /skyDancerArcadeV25Step\(/);
  assert.doesNotMatch(runtime, /class Rival.*FlightSolver/);
});
''')

print("Arcade Run V40.4 Rival Ace patch applied")
