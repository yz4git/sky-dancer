from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)


def update(path: str, transform) -> None:
    target = Path(path)
    before = target.read_text()
    after = transform(before)
    if before == after:
        raise SystemExit(f"no changes made: {path}")
    target.write_text(after)


def patch_rules(source: str) -> str:
    source = replace_once(
        source,
        "export const SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS = 90;",
        "export const SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS = 0;",
        "opening break gate",
    )
    source = replace_once(
        source,
        "export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 483;",
        "export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 450;",
        "boss trigger",
    )
    source = replace_once(
        source,
        "export const SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS = 5.6;\n",
        '''export const SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS = 5.6;
export const SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS = 4;

export type SkyDancerSkyRaidRank = "C" | "B" | "A" | "S" | "S+";

export function skyDancerSkyRaidRank(
  score: number,
  actBreaks: number,
  maxChain: number,
  perfectRushes: number,
): SkyDancerSkyRaidRank {
  if (score >= 50_000 && actBreaks >= 5 && maxChain >= 10 && perfectRushes >= 8) return "S+";
  if (score >= 40_000 && actBreaks >= 4 && maxChain >= 8 && perfectRushes >= 4) return "S";
  if (score >= 30_000 && actBreaks >= 3) return "A";
  if (score >= 20_000) return "B";
  return "C";
}
''',
        "rank rules",
    )
    source = replace_once(
        source,
        '''  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) {
    return (local >= 8 && local < 18) || (local >= 30 && local < 40) || (local >= 52 && local < 62) || (local >= 74 && local < 84);
  }''',
        '''  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) {
    // Two final siege waves lead directly into the 7:30 Titan entrance.
    // No Rush banner competes with the boss cue during the climax.
    return (local >= 8 && local < 18) || (local >= 20 && local < 28);
  }''',
        "final act rush windows",
    )
    source = replace_once(
        source,
        '''export function skyDancerSkyRaidActBreakEligible(
  elapsedSeconds: number,
  act: SkyDancerSkyRaidAct,
  actKills: number,
): boolean {
  if (actKills < act.killTarget) return false;
  if (act.index >= 2) return true;
  return skyDancerSkyRaidActSeconds(elapsedSeconds, act) >= SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS;
}''',
        '''export function skyDancerSkyRaidActBreakEligible(
  _elapsedSeconds: number,
  act: SkyDancerSkyRaidAct,
  actKills: number,
): boolean {
  // BREAK is earned by combat performance. The remainder becomes FREE HUNT.
  return actKills >= act.killTarget;
}''',
        "break eligibility",
    )
    return source


def patch_runtime(source: str) -> str:
    source = replace_once(source,
        "  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n  SKY_DANCER_SKY_RAID_TARGET_SECONDS,",
        "  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n  SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS,\n  SKY_DANCER_SKY_RAID_TARGET_SECONDS,",
        "runtime constant import")
    source = replace_once(source,
        "  skyDancerSkyRaidPressure,\n  skyDancerSkyRaidRushActive,",
        "  skyDancerSkyRaidPressure,\n  skyDancerSkyRaidRank,\n  skyDancerSkyRaidRushActive,",
        "rank function import")
    source = replace_once(source,
        "  type SkyDancerSkyRaidCombatBeat,\n  type SkyDancerSkyRaidPalette,",
        "  type SkyDancerSkyRaidCombatBeat,\n  type SkyDancerSkyRaidPalette,\n  type SkyDancerSkyRaidRank,",
        "rank type import")
    source = replace_once(source,
        '''  score: number;
  chain: number;
  multiplier: number;
  rushActive: boolean;
  pressure: number;''',
        '''  score: number;
  chain: number;
  maxChain: number;
  multiplier: number;
  actBreaks: number;
  rushActive: boolean;
  rushKills: number;
  rushPerfectTarget: number;
  perfectRushes: number;
  rushResult: "perfect" | "cleared" | null;
  rushResultSecondsRemaining: number;
  rank: SkyDancerSkyRaidRank;
  pressure: number;''',
        "snapshot fields")
    source = replace_once(source,
        '''  score: number;
  chain: number;
  chainTimer: number;
  bossForced: boolean;''',
        '''  score: number;
  chain: number;
  maxChain: number;
  chainTimer: number;
  actBreaks: number;
  rushActive: boolean;
  rushKills: number;
  perfectRushes: number;
  rushResult: "perfect" | "cleared" | null;
  rushResultSecondsRemaining: number;
  bossForced: boolean;''',
        "runtime state fields")
    source = replace_once(source,
        '''export const SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0.46;

export function skyDancerSkyRaidSteerInput(value: number): number {
  // The inherited Cart controller aggressively quickens steering after this
  // point. Keep fine stick movement unchanged, but cap large deflections so
  // the aircraft cannot snap-turn on a phone-sized virtual stick.
  return clamp(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT);
}''',
        '''export const SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0.46;
export const SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE = 0.30;

export function skyDancerSkyRaidSteerInput(value: number): number {
  // Keep fine aim direct, then softly compress the phone-stick outer range.
  // Medium and full deflection remain distinct without entering snap-turn input.
  const safe = clamp(value, -1, 1);
  const magnitude = Math.abs(safe);
  if (magnitude <= SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE) return safe;
  const normalized = (magnitude - SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE)
    / (1 - SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE);
  const eased = 1 - Math.pow(1 - normalized, 2.2);
  const compressed = SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE
    + eased * (SKY_DANCER_SKY_RAID_MAX_STEER_INPUT - SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE);
  return Math.sign(safe) * compressed;
}''',
        "soft steering curve")
    source = replace_once(source,
        '''    score: 0,
    chain: 0,
    chainTimer: 0,
    bossForced: false,''',
        '''    score: 0,
    chain: 0,
    maxChain: 0,
    chainTimer: 0,
    actBreaks: 0,
    rushActive: false,
    rushKills: 0,
    perfectRushes: 0,
    rushResult: null,
    rushResultSecondsRemaining: 0,
    bossForced: false,''',
        "runtime state init")
    source = replace_once(source,
        "  state.actBreak = true;\n  state.score += 1200 + act.index * 350;",
        "  state.actBreak = true;\n  state.actBreaks += 1;\n  state.score += 1200 + act.index * 350;",
        "break counter")
    source = replace_once(source,
        '''  const rushActive = skyDancerSkyRaidRushActive(hunt.huntElapsedSeconds, act);
  const killDelta = Math.max(0, hunt.huntKills - state.previousKills);''',
        '''  const rushActive = skyDancerSkyRaidRushActive(hunt.huntElapsedSeconds, act);
  if (rushActive && !state.rushActive) {
    state.rushKills = 0;
    state.rushResult = null;
    state.rushResultSecondsRemaining = 0;
  }
  const killDelta = Math.max(0, hunt.huntKills - state.previousKills);''',
        "rush start")
    source = replace_once(source,
        '''    state.chain = Math.min(12, state.chain + 1);
    state.chainTimer = SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS;
    state.actKills += 1;
    state.score += skyDancerSkyRaidKillScore(state.chain, session.car.boostActive, rushActive);''',
        '''    state.chain = Math.min(12, state.chain + 1);
    state.maxChain = Math.max(state.maxChain, state.chain);
    state.chainTimer = SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS;
    state.actKills += 1;
    if (rushActive) state.rushKills += 1;
    state.score += skyDancerSkyRaidKillScore(state.chain, session.car.boostActive, rushActive);''',
        "kill metrics")
    source = replace_once(source,
        '''  state.previousKills = hunt.huntKills;

  const orderDelta = Math.max(0, hunt.huntOrdersCompleted - state.previousOrders);''',
        '''  state.previousKills = hunt.huntKills;

  if (!rushActive && state.rushActive) {
    if (state.rushKills >= SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS) {
      state.perfectRushes += 1;
      const perfectBonus = 1250 + act.index * 150;
      state.score += perfectBonus;
      state.rushResult = "perfect";
      session.lastReward = `PERFECT RUSH · ${state.rushKills} DOWN · +${perfectBonus}`;
      session.rewardTimer = Math.max(session.rewardTimer, 1.8);
    } else if (state.rushKills > 0) {
      state.rushResult = "cleared";
    }
    state.rushResultSecondsRemaining = state.rushResult ? 1.45 : 0;
  }
  state.rushActive = rushActive;

  const orderDelta = Math.max(0, hunt.huntOrdersCompleted - state.previousOrders);''',
        "rush result")
    source = replace_once(source,
        '''  state.chainTimer = Math.max(0, state.chainTimer - delta);
  state.killCueSecondsRemaining = Math.max(0, state.killCueSecondsRemaining - delta);
  if (state.chainTimer <= 0) state.chain = 0;''',
        '''  const hasCombatTarget = (session as unknown as CartArenaSession).enemies.some(
    (enemy) => enemy.alive && enemy.nodeId === session.location.node.id,
  );
  if (hasCombatTarget) state.chainTimer = Math.max(0, state.chainTimer - delta);
  state.killCueSecondsRemaining = Math.max(0, state.killCueSecondsRemaining - delta);
  state.rushResultSecondsRemaining = Math.max(0, state.rushResultSecondsRemaining - delta);
  if (state.chainTimer <= 0) state.chain = 0;''',
        "chain fairness")
    source = replace_once(source,
        '''    score: state.score,
    chain: state.chain,
    multiplier: skyDancerSkyRaidMultiplier(state.chain, rushActive),
    rushActive,
    pressure,''',
        '''    score: state.score,
    chain: state.chain,
    maxChain: state.maxChain,
    multiplier: skyDancerSkyRaidMultiplier(state.chain, rushActive),
    actBreaks: state.actBreaks,
    rushActive,
    rushKills: state.rushKills,
    rushPerfectTarget: SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS,
    perfectRushes: state.perfectRushes,
    rushResult: state.rushResult,
    rushResultSecondsRemaining: state.rushResultSecondsRemaining,
    rank: skyDancerSkyRaidRank(state.score, state.actBreaks, state.maxChain, state.perfectRushes),
    pressure,''',
        "snapshot metrics")
    return source


def patch_overlay(source: str) -> str:
    source = replace_once(source,
        "  const [snapshot, setSnapshot] = useState<SkyDancerSkyRaidSnapshot | null>(() => initialSnapshot);",
        '''  const [snapshot, setSnapshot] = useState<SkyDancerSkyRaidSnapshot | null>(() => initialSnapshot);
  const [personalBest, setPersonalBest] = useState(0);
  const [bestLoaded, setBestLoaded] = useState(false);
  const [newRecord, setNewRecord] = useState(false);''',
        "PB state")
    source = replace_once(source,
        "  if (!snapshot) return null;",
        '''  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem("sky-dancer-sky-raid-best-score-v1") ?? 0);
      setPersonalBest(Number.isFinite(stored) ? Math.max(0, stored) : 0);
    } catch {
      setPersonalBest(0);
    } finally {
      setBestLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!bestLoaded || !snapshot?.clear || snapshot.score <= personalBest) return;
    setNewRecord(true);
    setPersonalBest(snapshot.score);
    try {
      window.localStorage.setItem("sky-dancer-sky-raid-best-score-v1", String(snapshot.score));
    } catch {
      // Storage is optional; the result screen must still work in private mode.
    }
  }, [bestLoaded, personalBest, snapshot]);

  if (!snapshot) return null;''',
        "PB effects")
    source = replace_once(source,
        '''      {snapshot.rushActive && !snapshot.clear && (
        <div className={styles.rushBanner} data-sd-noncritical-alert="rush">
          <small>FORMATION RUSH</small>
          <strong>SCORE ×2</strong>
          <span>BREAK THE WAVE · KEEP MOVING</span>
        </div>
      )}''',
        '''      {snapshot.rushActive && !snapshot.clear && (
        <div className={styles.rushBanner} data-sd-noncritical-alert="rush">
          <small>FORMATION RUSH · {snapshot.rushKills}/{snapshot.rushPerfectTarget}</small>
          <strong>SCORE ×2</strong>
          <span>{snapshot.rushKills >= snapshot.rushPerfectTarget ? "PERFECT ARMED" : "BREAK THE WAVE · KEEP MOVING"}</span>
        </div>
      )}

      {snapshot.rushResultSecondsRemaining > 0 && !snapshot.rushActive && !snapshot.clear && (
        <div className={`${styles.rushBanner} ${styles.rushResult}`} data-perfect={snapshot.rushResult === "perfect"} data-sd-noncritical-alert="rush-result">
          <small>FORMATION RESULT</small>
          <strong>{snapshot.rushResult === "perfect" ? "PERFECT RUSH" : "WAVE CLEAR"}</strong>
          <span>{snapshot.rushKills} TARGETS · {snapshot.rushResult === "perfect" ? "+BONUS" : "CHAIN FORWARD"}</span>
        </div>
      )}''',
        "rush UI")
    source = replace_once(source,
        '''      {snapshot.clear && (
        <div className={styles.clearBanner}>
          <small>FREE RAID COMPLETE · {formatTime(snapshot.elapsedSeconds)}</small>
          <strong>SKY RAID CLEAR</strong>
          <span>SCORE {snapshot.score.toLocaleString()} · FINAL CHAIN ×{Math.max(1, snapshot.chain)}</span>
        </div>
      )}''',
        '''      {snapshot.clear && (
        <div className={styles.clearBanner}>
          <small>SKY RAID CLEAR · {formatTime(snapshot.elapsedSeconds)}</small>
          <strong>RANK {snapshot.rank}</strong>
          <span>SCORE {snapshot.score.toLocaleString()} · {newRecord ? "NEW RECORD" : `PB ${personalBest.toLocaleString()}`}</span>
          <div className={styles.resultStats}>
            <b>BREAK {snapshot.actBreaks}/5</b>
            <b>PERFECT {snapshot.perfectRushes}</b>
            <b>MAX CHAIN ×{Math.max(1, snapshot.maxChain)}</b>
          </div>
        </div>
      )}''',
        "result UI")
    return source


def patch_css(source: str) -> str:
    return replace_once(source,
        ".rushBanner strong { color: var(--raid-enemy); }\n",
        '''.rushBanner strong { color: var(--raid-enemy); }
.rushResult { top: 31%; }
.rushResult[data-perfect="true"] { border-color: var(--raid-accent); }
.rushResult[data-perfect="true"] strong { color: var(--raid-accent); }
.resultStats {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 7px;
  font-size: 7px;
  font-weight: 1000;
  letter-spacing: .12em;
  color: var(--raid-accent);
}
.resultStats b { font: inherit; white-space: nowrap; }
''',
        "result CSS")


def patch_tests(source: str) -> str:
    source = replace_once(source,
        "  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n  SKY_DANCER_SKY_RAID_TARGET_SECONDS,",
        "  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n  SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS,\n  SKY_DANCER_SKY_RAID_TARGET_SECONDS,",
        "test constant import")
    source = replace_once(source,
        "  skyDancerSkyRaidPressure,\n  skyDancerSkyRaidRushActive,",
        "  skyDancerSkyRaidPressure,\n  skyDancerSkyRaidRank,\n  skyDancerSkyRaidRushActive,",
        "test function import")
    source = source.replace("assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 90);", "assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 0);")
    source = source.replace("assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 483);", "assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 450);")
    source = source.replace("assert.equal(skyDancerSkyRaidActBreakEligible(89.99, SKY_DANCER_SKY_RAID_ACTS[0], 99), false);", "assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 19), false);")
    source = source.replace("assert.equal(skyDancerSkyRaidActBreakEligible(90, SKY_DANCER_SKY_RAID_ACTS[0], 20), true);", "assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 20), true);")
    source = source.replace("assert.equal(skyDancerSkyRaidActBreakEligible(209.99, SKY_DANCER_SKY_RAID_ACTS[1], 99), false);", "assert.equal(skyDancerSkyRaidActBreakEligible(132, SKY_DANCER_SKY_RAID_ACTS[1], 21), false);")
    source = source.replace("assert.equal(skyDancerSkyRaidActBreakEligible(210, SKY_DANCER_SKY_RAID_ACTS[1], 22), true);", "assert.equal(skyDancerSkyRaidActBreakEligible(132, SKY_DANCER_SKY_RAID_ACTS[1], 22), true);")
    old = '''test("SKY RAID caps only large steering deflections before inherited quickening", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0\\.46/);
  assert.match(raidSource, /return clamp\\(value, -SKY_DANCER_SKY_RAID_MAX_STEER_INPUT, SKY_DANCER_SKY_RAID_MAX_STEER_INPUT\\)/);
  assert.match(raidSource, /steer: skyDancerSkyRaidSteerInput\\(input\\.steer\\)/);
  assert.match(raidSource, /const skyRaidActive = isSkyRaidMode\\(\\)/);
});'''
    new = '''test("SKY RAID keeps fine aim direct and softly compresses large phone-stick steering", () => {
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_MAX_STEER_INPUT = 0\\.46/);
  assert.match(raidSource, /SKY_DANCER_SKY_RAID_STEER_SOFT_ZONE = 0\\.30/);
  assert.match(raidSource, /Math\\.pow\\(1 - normalized, 2\\.2\\)/);
  assert.match(raidSource, /return Math\\.sign\\(safe\\) \\* compressed/);
  assert.match(raidSource, /steer: skyDancerSkyRaidSteerInput\\(input\\.steer\\)/);
});'''
    source = replace_once(source, old, new, "steering test")
    source += '''\n\ntest("SKY RAID grades runs and scores Formation Rush mastery", () => {
  assert.equal(SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS, 4);
  assert.equal(skyDancerSkyRaidRank(19_999, 5, 12, 12), "C");
  assert.equal(skyDancerSkyRaidRank(20_000, 0, 0, 0), "B");
  assert.equal(skyDancerSkyRaidRank(30_000, 3, 3, 0), "A");
  assert.equal(skyDancerSkyRaidRank(40_000, 4, 8, 4), "S");
  assert.equal(skyDancerSkyRaidRank(50_000, 5, 10, 8), "S+");
  assert.equal(skyDancerSkyRaidRushActive(450, SKY_DANCER_SKY_RAID_ACTS[4]), false);
  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");
  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");
  assert.match(raidSource, /hasCombatTarget/);
  assert.match(raidSource, /state\\.perfectRushes \\+= 1/);
  assert.match(overlaySource, /FORMATION RESULT/);
  assert.match(overlaySource, /NEW RECORD/);
  assert.match(overlaySource, /MAX CHAIN/);
});\n'''
    return source


update("src/sky/SkyDancerSkyRaidRules.ts", patch_rules)
update("src/sky/SkyDancerSkyRaid.ts", patch_runtime)
update("app/SkyDancerSkyRaidOverlay.tsx", patch_overlay)
update("app/SkyDancerSkyRaidOverlay.module.css", patch_css)
update("tests/sky-sky-raid.test.ts", patch_tests)

Path("docs/SKY_RAID.md").write_text('''# SKY RAID

SKY RAID is the 8:30 score-driven free-flight arcade run: authored Arcade Run scenery, 360-degree control, escalating enemy doctrines, Formation Rush micro-objectives and a flagship finish.

## Run structure

| Act | Timeline | Break target | Setpiece |
| --- | --- | ---: | --- |
| DAWN CITY | 0:00–2:00 | 20 | CITY GATES |
| RED CANYON | 2:00–4:00 | 22 | CANYON KNIFE RUN |
| CLOUD FLEET | 4:00–5:30 | 18 | FLEET BREAK |
| STORM CARRIER | 5:30–7:00 | 20 | THUNDER RAID |
| PRISM CITADEL | 7:00–8:30 | 20 | PRISM SIEGE |

The PRISM TITAN enters at **7:30**, reserving the final minute for the climax.

## Arcade scoring contract

- ACT BREAK is awarded immediately when the kill target is reached; the remaining Act becomes FREE HUNT.
- Formation Rush scores at x2. Four kills in one Rush earns PERFECT RUSH and an additional score bonus.
- Final-act Rush waves finish before 7:30 so the boss cue and Titan fight own the climax.
- The 5.6-second chain grace only burns while a live combat target exists in the current arena.
- Steering is direct around center and softly compressed toward full phone-stick deflection instead of hard-clipped.
- Results show C/B/A/S/S+, BREAK count, PERFECT RUSH count, maximum chain, score and a locally persisted personal best.
- S and S+ require both score and execution consistency; raw farming alone is not enough.
''')
