from pathlib import Path


def patch(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


helper = Path("src/sky/arcade/SkyDancerArcadeV403WorldBreakRecovery.ts")
helper.write_text(r'''import type { SkyDancerArcadeStageId } from "./SkyDancerArcadeData";
import type {
  SkyDancerArcadeV402CelebrationCue,
  SkyDancerArcadeV402CelebrationTone,
} from "./SkyDancerArcadeV402WorldBreakCelebration";

export type SkyDancerArcadeV403RecoveryPhase = "recoverable" | "terminal" | "comeback";

export interface SkyDancerArcadeV403RecoveryCue {
  headline: string;
  action: string;
  detail: string;
  tone: SkyDancerArcadeV402CelebrationTone;
  phase: SkyDancerArcadeV403RecoveryPhase;
  retryable: boolean;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  audioLowHz: number;
  audioHighHz: number;
}

interface RecoveryProfile {
  headline: string;
  action: string;
  tone: SkyDancerArcadeV402CelebrationTone;
  durationSeconds: number;
  strength: number;
  cameraPullback: number;
  cameraFovKick: number;
  cameraShake: number;
  audioLowHz: number;
  audioHighHz: number;
}

const PROFILES: Record<SkyDancerArcadeStageId, RecoveryProfile> = {
  "dawn-city": {
    headline: "VECTOR LOST", action: "RECENTER · TAKE NEXT GATE", tone: "precision",
    durationSeconds: .72, strength: .72, cameraPullback: -.22, cameraFovKick: -1.1, cameraShake: .05,
    audioLowHz: 180, audioHighHz: 540,
  },
  "red-canyon": {
    headline: "KNIFE LINE LOST", action: "CLIMB OUT · REBUILD TURBO", tone: "precision",
    durationSeconds: .82, strength: .84, cameraPullback: -.28, cameraFovKick: -1.35, cameraShake: .065,
    audioLowHz: 164, audioHighHz: 410,
  },
  "cloud-fleet": {
    headline: "SUBSYSTEM PASSED", action: "RELOCK · TAKE NEXT ARRAY", tone: "assault",
    durationSeconds: .76, strength: .8, cameraPullback: -.3, cameraFovKick: -1.2, cameraShake: .08,
    audioLowHz: 132, audioHighHz: 396,
  },
  "storm-carrier": {
    headline: "LIGHTNING CONTACT", action: "SLIDE INTO SAFE LANE", tone: "survival",
    durationSeconds: .74, strength: .82, cameraPullback: -.26, cameraFovKick: -1.25, cameraShake: .09,
    audioLowHz: 150, audioHighHz: 620,
  },
  "desert-fortress": {
    headline: "BREACH DENIED", action: "CLEAR WALL · HOLD FLIGHT LINE", tone: "assault",
    durationSeconds: .86, strength: .94, cameraPullback: -.36, cameraFovKick: -1.55, cameraShake: .12,
    audioLowHz: 110, audioHighHz: 330,
  },
  "ice-cavern": {
    headline: "COLLAPSE CONTACT", action: "TRACK NEXT APERTURE", tone: "precision",
    durationSeconds: .74, strength: .8, cameraPullback: -.24, cameraFovKick: -1.15, cameraShake: .075,
    audioLowHz: 142, audioHighHz: 710,
  },
  "floating-ruins": {
    headline: "ROUTE UNSTABLE", action: "COMMIT TO ONE PORTAL", tone: "choice",
    durationSeconds: .74, strength: .7, cameraPullback: -.18, cameraFovKick: -.9, cameraShake: .04,
    audioLowHz: 220, audioHighHz: 660,
  },
  "night-metro": {
    headline: "PHANTOM LOST", action: "KEEP SPEED · SAVE THE RUN", tone: "speed",
    durationSeconds: .9, strength: .92, cameraPullback: -.34, cameraFovKick: -1.5, cameraShake: .08,
    audioLowHz: 126, audioHighHz: 378,
  },
  "volcano-core": {
    headline: "ERUPTION CONTACT", action: "TURBO · CENTERLINE · REBUILD LEAD", tone: "speed",
    durationSeconds: .8, strength: .96, cameraPullback: -.38, cameraFovKick: -1.7, cameraShake: .14,
    audioLowHz: 92, audioHighHz: 276,
  },
  "orbital-ascent": {
    headline: "AXIS LOST", action: "FIND SHAFT · CLIMB", tone: "speed",
    durationSeconds: .8, strength: .92, cameraPullback: -.32, cameraFovKick: -1.55, cameraShake: .1,
    audioLowHz: 118, audioHighHz: 472,
  },
  "prism-citadel": {
    headline: "SKY FRACTURED", action: "RESET LINE · BREAK NEXT SKY", tone: "final",
    durationSeconds: .86, strength: 1.02, cameraPullback: -.4, cameraFovKick: -1.8, cameraShake: .14,
    audioLowHz: 104, audioHighHz: 520,
  },
};

function failureCue(
  stageId: SkyDancerArcadeStageId,
  detail: string,
  retryable: boolean,
  headline?: string,
  action?: string,
): SkyDancerArcadeV403RecoveryCue {
  const profile = PROFILES[stageId];
  return {
    ...profile,
    headline: headline ?? profile.headline,
    action: action ?? profile.action,
    detail,
    phase: retryable ? "recoverable" : "terminal",
    retryable,
  };
}

function comebackCue(
  stageId: SkyDancerArcadeStageId,
  headline: string,
  detail: string,
  source?: SkyDancerArcadeV402CelebrationCue,
): SkyDancerArcadeV403RecoveryCue {
  const profile = PROFILES[stageId];
  const strength = Math.max(1.02, (source?.strength ?? profile.strength) * 1.16);
  return {
    headline,
    action: "FLOW RESTORED · KEEP PRESSURE",
    detail,
    tone: source?.tone ?? profile.tone,
    phase: "comeback",
    retryable: false,
    durationSeconds: Math.max(.82, (source?.durationSeconds ?? profile.durationSeconds) + .16),
    strength,
    cameraPullback: Math.max(.62, Math.abs(source?.cameraPullback ?? profile.cameraPullback) * 1.24),
    cameraFovKick: Math.max(2.1, Math.abs(source?.cameraFovKick ?? profile.cameraFovKick) * 1.2),
    cameraShake: Math.max(.085, (source?.cameraShake ?? profile.cameraShake) * 1.14),
    audioLowHz: Math.max(132, Math.round((source?.audioLowHz ?? profile.audioLowHz) * .72)),
    audioHighHz: Math.max(720, Math.round((source?.audioHighHz ?? profile.audioHighHz) * 1.06)),
  };
}

export function skyDancerArcadeV403RecoveryProfile(stageId: SkyDancerArcadeStageId): RecoveryProfile {
  return PROFILES[stageId];
}

/**
 * V40.3 recognizes authored WORLD BREAK failure messages and turns them into actionable recovery cues.
 * It never changes authoritative runtime state, scoring, collision, time-scale or inputs.
 */
export function skyDancerArcadeV403RecoveryFromMessage(
  stageId: SkyDancerArcadeStageId,
  message: string | null,
): SkyDancerArcadeV403RecoveryCue | null {
  if (!message) return null;
  switch (stageId) {
    case "dawn-city": {
      const match = message.match(/GATE\s+(\d+)\s+MISSED/);
      return match ? failureCue(stageId, `GATE ${match[1]} LOST · NEXT VECTOR IS LIVE`, true) : null;
    }
    case "red-canyon":
      return message.includes("KNIFE RUN LOST")
        ? failureCue(stageId, "LOW-ALTITUDE OBJECTIVE CLOSED · RUN CONTINUES", false)
        : null;
    case "cloud-fleet": {
      const match = message.match(/DECK STRIKE\s+·\s+(.+?)\s+ESCAPED/);
      return match ? failureCue(stageId, `${match[1]} PASSED · NEXT SUBSYSTEM STILL LIVE`, true) : null;
    }
    case "storm-carrier": {
      const match = message.match(/LIGHTNING GRID\s+·\s+STRIKE\s+(\d+)/);
      return match ? failureCue(stageId, `STRIKE ${match[1]} · SAFE CORRIDOR STILL MOVING`, true) : null;
    }
    case "desert-fortress":
      if (message.includes("BREACH MISSED")) return failureCue(stageId, "OPENING PASSED · HOLD THE EXIT LINE", false, "BREACH MISSED");
      if (message.includes("BREACH DENIED")) return failureCue(stageId, "BATTERIES ACTIVE · WALL CANNOT OPEN", false);
      if (message.includes("FORTRESS BATTERY") && message.includes("ESCAPED")) return failureCue(stageId, "BATTERY PASSED · FULL BREACH NO LONGER AVAILABLE", false, "BATTERY ESCAPED");
      return null;
    case "ice-cavern": {
      const match = message.match(/COLLAPSE HIT\s+(\d+)/);
      return match ? failureCue(stageId, `APERTURE ${match[1]} LOST · NEXT GAP STILL OPEN`, true) : null;
    }
    case "floating-ruins":
      return message.includes("ROUTE UNSTABLE") ? failureCue(stageId, "PORTALS STILL OPEN · PICK ONE VECTOR", true) : null;
    case "night-metro":
      return message.includes("PHANTOM ESCAPED")
        ? failureCue(stageId, "PURSUIT OBJECTIVE CLOSED · KEEP THE SECTION ALIVE", false)
        : null;
    case "volcano-core": {
      const match = message.match(/ERUPTION HIT\s+(\d+)/);
      return match ? failureCue(stageId, `CONTACT ${match[1]} · ESCAPE LEAD RESTORED`, true) : null;
    }
    case "orbital-ascent": {
      const strike = message.match(/DEBRIS STRIKE\s+(\d+)/);
      if (strike) return failureCue(stageId, `STRIKE ${strike[1]} · SAFE AXIS CAN BE REACQUIRED`, true);
      if (message.includes("SHAFT LOST")) return failureCue(stageId, "ASCENT WINDOW CLOSED · SECTION CONTINUES", false, "SHAFT LOST");
      return null;
    }
    case "prism-citadel": {
      const match = message.match(/SKY\s+(\d+)\s+FRACTURED/);
      return match ? failureCue(stageId, `REPRISE ${match[1]} LOST · NEXT SKY STILL LIVE`, true) : null;
    }
  }
}

/** Terminal objectives that can still be recovered into a satisfying non-perfect clear. */
export function skyDancerArcadeV403ResolvedRecoveryFromMessage(
  stageId: SkyDancerArcadeStageId,
  message: string | null,
): SkyDancerArcadeV403RecoveryCue | null {
  if (!message) return null;
  if (stageId === "volcano-core" && message.includes("ESCAPE SURVIVED")) {
    return comebackCue(stageId, "PRESSURE SURVIVED", "ERUPTION CONTACT RECOVERED · RUN STAYS ALIVE");
  }
  if (stageId === "prism-citadel" && message.includes("SEVEN SKIES CLEARED") && message.includes("MISS")) {
    return comebackCue(stageId, "SEVEN SKIES HELD", "ROUTE REPRISE RECOVERED AFTER FRACTURE");
  }
  return null;
}

/** Converts the next real success after a recoverable failure into one stronger, one-shot comeback beat. */
export function skyDancerArcadeV403ComebackFromCelebration(
  stageId: SkyDancerArcadeStageId,
  celebration: SkyDancerArcadeV402CelebrationCue,
): SkyDancerArcadeV403RecoveryCue {
  return comebackCue(stageId, celebration.headline, `RECOVERY CONFIRMED · ${celebration.detail}`, celebration);
}
''')


test = Path("tests/sky-arcade-v403-world-break-recovery.test.ts")
test.write_text(r'''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { skyDancerArcadeV402CelebrationFromMessage } from "../src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration";
import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403RecoveryProfile,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
} from "../src/sky/arcade/SkyDancerArcadeV403WorldBreakRecovery";

const failures = [
  ["dawn-city", "WORLD BREAK · GATE 2 MISSED", true],
  ["red-canyon", "WORLD BREAK · KNIFE RUN LOST · 2.1s", false],
  ["cloud-fleet", "DECK STRIKE · BRIDGE CORE ESCAPED", true],
  ["storm-carrier", "LIGHTNING GRID · STRIKE 2 · MOVE TO LANE", true],
  ["desert-fortress", "FORTRESS GATE · BREACH MISSED", false],
  ["ice-cavern", "CRYSTAL TUNNEL · COLLAPSE HIT 2", true],
  ["floating-ruins", "WARNING · ROUTE UNSTABLE", true],
  ["night-metro", "NEON PURSUIT · PHANTOM ESCAPED · GAP 42m", false],
  ["volcano-core", "MAGMA PRESSURE · ERUPTION HIT 1 · TURBO NOW", true],
  ["orbital-ascent", "ZERO-G ASCENT · DEBRIS STRIKE 1 · FIND AXIS", true],
  ["prism-citadel", "TOWER SLALOM REPRISE · SKY 4 FRACTURED", true],
] as const;

const successes = [
  ["dawn-city", "WORLD BREAK · GATE 2 CLEAN · +1200"],
  ["red-canyon", "WORLD BREAK · KNIFE RUN COMPLETE · +3400"],
  ["cloud-fleet", "DECK STRIKE · BRIDGE CORE DOWN · +1800"],
  ["storm-carrier", "LIGHTNING GRID · SAFE LANE 3 · +1400"],
  ["desert-fortress", "WORLD BREAK · FORTRESS BREACHED · +5200"],
  ["ice-cavern", "WORLD BREAK · CRYSTAL ESCAPE PERFECT · +4200"],
  ["floating-ruins", "SKY LABYRINTH · DANGER VECTOR · +2400"],
  ["night-metro", "WORLD BREAK · PHANTOM CAUGHT · +6200"],
  ["volcano-core", "WORLD BREAK · ERUPTION OUTRUN · +6400"],
  ["orbital-ascent", "WORLD BREAK · ZERO-G ASCENT CLEAR · +7200"],
  ["prism-citadel", "WORLD BREAK · SEVEN SKIES BREAK · +9000"],
] as const;

test("V40.3 gives all eleven World Break worlds distinct actionable failure language", () => {
  assert.equal(SKY_DANCER_ARCADE_STAGES.length, 11);
  for (const [stageId, message, retryable] of failures) {
    const cue = skyDancerArcadeV403RecoveryFromMessage(stageId, message);
    assert.ok(cue, `${stageId} should produce a recovery cue`);
    assert.equal(cue.retryable, retryable, `${stageId} retryability`);
    assert.ok(cue.headline.length >= 7);
    assert.ok(cue.action.includes("·"));
    assert.ok(cue.detail.length >= 12);
    assert.ok(cue.cameraFovKick < 0);
    assert.ok(cue.cameraPullback < 0);
  }
  const identities = SKY_DANCER_ARCADE_STAGES.map((stage) => {
    const profile = skyDancerArcadeV403RecoveryProfile(stage.id);
    return `${profile.headline}:${profile.action}`;
  });
  assert.equal(new Set(identities).size, 11);
});

test("V40.3 never mislabels normal World Break success as failure", () => {
  for (const [stageId, message] of successes) {
    assert.equal(skyDancerArcadeV403RecoveryFromMessage(stageId, message), null, stageId);
  }
});

test("V40.3 turns only the next real success into a stronger comeback profile", () => {
  const base = skyDancerArcadeV402CelebrationFromMessage("storm-carrier", "LIGHTNING GRID · SAFE LANE 3 · +1400");
  assert.ok(base);
  const comeback = skyDancerArcadeV403ComebackFromCelebration("storm-carrier", base);
  assert.equal(comeback.phase, "comeback");
  assert.equal(comeback.retryable, false);
  assert.ok(comeback.strength > base.strength);
  assert.ok(comeback.cameraFovKick > base.cameraFovKick);
  assert.ok(comeback.cameraPullback > base.cameraPullback);
  assert.match(comeback.detail, /RECOVERY CONFIRMED/);
});

test("V40.3 recognizes recovered non-perfect terminal outcomes without faking a perfect clear", () => {
  const volcano = skyDancerArcadeV403ResolvedRecoveryFromMessage("volcano-core", "MAGMA PRESSURE · ESCAPE SURVIVED · LEAD 24m");
  const prism = skyDancerArcadeV403ResolvedRecoveryFromMessage("prism-citadel", "ROUTE REPRISE · SEVEN SKIES CLEARED · MISS 2");
  assert.equal(volcano?.phase, "comeback");
  assert.equal(prism?.phase, "comeback");
  assert.match(volcano?.headline ?? "", /SURVIVED/);
  assert.match(prism?.headline ?? "", /HELD/);
  assert.equal(skyDancerArcadeV403ResolvedRecoveryFromMessage("night-metro", "NEON PURSUIT · PHANTOM ESCAPED · GAP 42m"), null);
});

test("V40.3 source wiring remains presentation-only while HUD, camera and audio share one recovery grammar", () => {
  const ui = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const webgl = readFileSync("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(ui, /useWorldBreakDrama/);
  assert.match(ui, /worldBreakRecovery/);
  assert.match(ui, /worldBreakComeback/);
  assert.match(css, /\.worldBreakRecovery/);
  assert.match(css, /\.worldBreakComeback/);
  assert.match(webgl, /syncWorldBreakRecovery/);
  assert.match(webgl, /worldBreakRecoveryDebt/);
  assert.match(webgl, /worldBreakRecoveryEnvelope/);
  assert.doesNotMatch(runtime, /V403WorldBreakRecovery|worldBreakRecoveryDebt|worldBreakComeback/);
});
''')


patch(
    "app/SkyDancerArcadeMode.tsx",
    'import { skyDancerArcadeV402CelebrationFromMessage } from "../src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration";\n',
    'import { skyDancerArcadeV402CelebrationFromMessage, type SkyDancerArcadeV402CelebrationCue } from "../src/sky/arcade/SkyDancerArcadeV402WorldBreakCelebration";\n'
    'import {\n'
    '  skyDancerArcadeV403ComebackFromCelebration,\n'
    '  skyDancerArcadeV403RecoveryFromMessage,\n'
    '  skyDancerArcadeV403ResolvedRecoveryFromMessage,\n'
    '  type SkyDancerArcadeV403RecoveryCue,\n'
    '} from "../src/sky/arcade/SkyDancerArcadeV403WorldBreakRecovery";\n',
)

patch(
    "app/SkyDancerArcadeMode.tsx",
    '\nfunction CombatIcon({ kind }: { kind: "fire" | "lock" | "turbo" }) {',
    r'''

interface WorldBreakDramaOutput {
  recovery: SkyDancerArcadeV403RecoveryCue | null;
  comeback: SkyDancerArcadeV403RecoveryCue | null;
  celebration: SkyDancerArcadeV402CelebrationCue | null;
}

/** V40.3 remembers only presentation debt: one recoverable miss can amplify exactly the next authored success. */
function useWorldBreakDrama(stageId: SkyDancerArcadeSnapshot["stage"]["id"], message: string | null): WorldBreakDramaOutput {
  const state = useRef<{
    stageId: SkyDancerArcadeSnapshot["stage"]["id"];
    lastMessage: string | null;
    recoveryDebt: boolean;
    output: WorldBreakDramaOutput;
  }>({
    stageId,
    lastMessage: null,
    recoveryDebt: false,
    output: { recovery: null, comeback: null, celebration: null },
  });

  if (state.current.stageId !== stageId) {
    state.current = {
      stageId,
      lastMessage: null,
      recoveryDebt: false,
      output: { recovery: null, comeback: null, celebration: null },
    };
  }
  if (state.current.lastMessage !== message) {
    const recovery = skyDancerArcadeV403RecoveryFromMessage(stageId, message);
    const baseCelebration = skyDancerArcadeV402CelebrationFromMessage(stageId, message);
    const resolvedRecovery = skyDancerArcadeV403ResolvedRecoveryFromMessage(stageId, message);
    const comeback = resolvedRecovery
      ?? (baseCelebration && state.current.recoveryDebt
        ? skyDancerArcadeV403ComebackFromCelebration(stageId, baseCelebration)
        : null);
    state.current.output = {
      recovery,
      comeback,
      celebration: comeback ? null : baseCelebration,
    };
    if (recovery) state.current.recoveryDebt = recovery.retryable;
    else if (comeback || baseCelebration) state.current.recoveryDebt = false;
    state.current.lastMessage = message;
  }
  return state.current.output;
}

function CombatIcon({ kind }: { kind: "fire" | "lock" | "turbo" }) {''',
)

patch(
    "app/SkyDancerArcadeMode.tsx",
    '  const worldBreakCelebration = skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, messageCue.value);\n',
    '  const worldBreakDrama = useWorldBreakDrama(snapshot.stage.id, messageCue.value);\n'
    '  const { recovery: worldBreakRecovery, comeback: worldBreakComeback, celebration: worldBreakCelebration } = worldBreakDrama;\n',
)

patch(
    "app/SkyDancerArcadeMode.tsx",
    '''        {worldBreakCelebration && (\n          <div\n            key={`${snapshot.stage.id}-${messageCue.value}`}\n            className={styles.worldBreakCelebration}\n            data-tone={worldBreakCelebration.tone}\n            data-tier={worldBreakCelebration.tier}\n            data-suppressed={cuePriority === "critical"}\n            aria-live="polite"\n            aria-label="World Break success"\n          >\n            <small>WORLD BREAK · SUCCESS</small>\n            <strong>{worldBreakCelebration.headline}</strong>\n            <span>{worldBreakCelebration.detail}</span>\n            <i aria-hidden="true" />\n          </div>\n        )}\n\n        {messageCue.value && !messageIsBossWarning && !worldBreakCelebration && (\n''',
    '''        {worldBreakComeback && (\n          <div\n            key={`${snapshot.stage.id}-${messageCue.value}-comeback`}\n            className={styles.worldBreakComeback}\n            data-tone={worldBreakComeback.tone}\n            data-suppressed={cuePriority === "critical"}\n            aria-live="polite"\n            aria-label="World Break comeback"\n          >\n            <small>WORLD BREAK · COMEBACK</small>\n            <strong>{worldBreakComeback.headline}</strong>\n            <span>{worldBreakComeback.detail}</span>\n            <em>{worldBreakComeback.action}</em>\n            <i aria-hidden="true" />\n          </div>\n        )}\n\n        {worldBreakRecovery && !worldBreakComeback && (\n          <div\n            key={`${snapshot.stage.id}-${messageCue.value}-recovery`}\n            className={styles.worldBreakRecovery}\n            data-tone={worldBreakRecovery.tone}\n            data-retryable={worldBreakRecovery.retryable}\n            data-suppressed={cuePriority === "critical"}\n            aria-live="polite"\n            aria-label="World Break recovery guidance"\n          >\n            <small>{worldBreakRecovery.retryable ? "WORLD BREAK · RECOVER" : "WORLD BREAK · OBJECTIVE LOST"}</small>\n            <strong>{worldBreakRecovery.headline}</strong>\n            <span>{worldBreakRecovery.detail}</span>\n            <em>{worldBreakRecovery.action}</em>\n          </div>\n        )}\n\n        {worldBreakCelebration && (\n          <div\n            key={`${snapshot.stage.id}-${messageCue.value}`}\n            className={styles.worldBreakCelebration}\n            data-tone={worldBreakCelebration.tone}\n            data-tier={worldBreakCelebration.tier}\n            data-suppressed={cuePriority === "critical"}\n            aria-live="polite"\n            aria-label="World Break success"\n          >\n            <small>WORLD BREAK · SUCCESS</small>\n            <strong>{worldBreakCelebration.headline}</strong>\n            <span>{worldBreakCelebration.detail}</span>\n            <i aria-hidden="true" />\n          </div>\n        )}\n\n        {messageCue.value && !messageIsBossWarning && !worldBreakCelebration && !worldBreakRecovery && !worldBreakComeback && (\n''',
)


patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    'import { skyDancerArcadeV402CelebrationFromMessage } from "./SkyDancerArcadeV402WorldBreakCelebration";\n',
    'import { skyDancerArcadeV402CelebrationFromMessage } from "./SkyDancerArcadeV402WorldBreakCelebration";\n'
    'import {\n'
    '  skyDancerArcadeV403ComebackFromCelebration,\n'
    '  skyDancerArcadeV403RecoveryFromMessage,\n'
    '  skyDancerArcadeV403ResolvedRecoveryFromMessage,\n'
    '} from "./SkyDancerArcadeV403WorldBreakRecovery";\n',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''  private worldBreakCelebrationStrength = 0;\n  private worldBreakCelebrationPullback = 0;\n  private worldBreakCelebrationFovKick = 0;\n''',
    '''  private worldBreakCelebrationStrength = 0;\n  private worldBreakCelebrationPullback = 0;\n  private worldBreakCelebrationFovKick = 0;\n  // V40.3: presentation-only failure debt and one-shot comeback framing.\n  private worldBreakRecoveryTimer = 0;\n  private worldBreakRecoveryDuration = 1;\n  private worldBreakRecoveryStrength = 0;\n  private worldBreakRecoveryPullback = 0;\n  private worldBreakRecoveryFovKick = 0;\n  private worldBreakRecoveryMode: "failure" | "comeback" | null = null;\n  private worldBreakRecoveryDebt = false;\n  private worldBreakRecoveryResolvedMessage: string | null = null;\n''',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''      this.presentation.setStage();\n      this.clearEntityVisuals();\n      this.buildBranchGates(snapshot);\n''',
    '''      this.presentation.setStage();\n      this.worldBreakRecoveryDebt = false;\n      this.worldBreakRecoveryResolvedMessage = null;\n      this.worldBreakRecoveryTimer = 0;\n      this.worldBreakRecoveryMode = null;\n      this.clearEntityVisuals();\n      this.buildBranchGates(snapshot);\n''',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''    this.syncBranchGates(snapshot, delta);\n    this.syncEffects(snapshot);\n    this.syncWorldBreakCelebration(snapshot, delta);\n''',
    '''    this.syncBranchGates(snapshot, delta);\n    this.syncEffects(snapshot);\n    this.syncWorldBreakRecovery(snapshot, delta);\n    this.syncWorldBreakCelebration(snapshot, delta);\n''',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''  private syncWorldBreakCelebration(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n''',
    r'''  private syncWorldBreakRecovery(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.worldBreakRecoveryTimer = Math.max(0, this.worldBreakRecoveryTimer - delta);
    const newMessage = snapshot.message !== this.previousSnapshot.message;
    const recovery = skyDancerArcadeV403RecoveryFromMessage(snapshot.stage.id, snapshot.message);
    const baseCelebration = skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, snapshot.message);
    const resolvedRecovery = skyDancerArcadeV403ResolvedRecoveryFromMessage(snapshot.stage.id, snapshot.message);

    if (newMessage) {
      const comeback = resolvedRecovery
        ?? (baseCelebration && this.worldBreakRecoveryDebt
          ? skyDancerArcadeV403ComebackFromCelebration(snapshot.stage.id, baseCelebration)
          : null);
      if (recovery) {
        this.worldBreakRecoveryDebt = recovery.retryable;
        this.worldBreakRecoveryResolvedMessage = null;
        this.worldBreakRecoveryTimer = recovery.durationSeconds;
        this.worldBreakRecoveryDuration = recovery.durationSeconds;
        this.worldBreakRecoveryStrength = recovery.strength;
        this.worldBreakRecoveryPullback = recovery.cameraPullback;
        this.worldBreakRecoveryFovKick = recovery.cameraFovKick;
        this.worldBreakRecoveryMode = "failure";
        this.cameraShake = Math.min(.88, this.cameraShake + recovery.cameraShake);
        this.audio.tone(recovery.audioLowHz, .17, .02 + recovery.strength * .006, "sawtooth");
        this.audio.tone(recovery.audioHighHz, .09, .009 + recovery.strength * .004, "triangle");
      } else if (comeback) {
        this.worldBreakRecoveryDebt = false;
        this.worldBreakRecoveryResolvedMessage = snapshot.message;
        this.worldBreakRecoveryTimer = comeback.durationSeconds;
        this.worldBreakRecoveryDuration = comeback.durationSeconds;
        this.worldBreakRecoveryStrength = comeback.strength;
        this.worldBreakRecoveryPullback = comeback.cameraPullback;
        this.worldBreakRecoveryFovKick = comeback.cameraFovKick;
        this.worldBreakRecoveryMode = "comeback";
        this.cameraShake = Math.min(.9, this.cameraShake + comeback.cameraShake);
        this.presentation.emitRushAccent();
        this.audio.tone(comeback.audioLowHz, .2, .022, comeback.tone === "assault" ? "sawtooth" : "triangle");
        this.audio.tone(comeback.audioHighHz, .14, .018, "triangle");
        this.audio.tone(comeback.audioHighHz * 1.25, .08, .01, comeback.tone === "final" ? "square" : "triangle");
      } else if (baseCelebration) {
        this.worldBreakRecoveryDebt = false;
        this.worldBreakRecoveryResolvedMessage = null;
      } else {
        this.worldBreakRecoveryResolvedMessage = null;
      }
    }

    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
    if (worldBreakRecoveryEnvelope > 0 && this.worldBreakRecoveryMode === "comeback") {
      this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, worldBreakRecoveryEnvelope * .15 * this.worldBreakRecoveryStrength);
      this.presentationFx.exposureBoost = Math.max(this.presentationFx.exposureBoost, worldBreakRecoveryEnvelope * .052 * this.worldBreakRecoveryStrength);
    }
  }

  private syncWorldBreakCelebration(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
''',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''    const celebration = skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, snapshot.message);\n''',
    '''    const celebration = snapshot.message === this.worldBreakRecoveryResolvedMessage\n      ? null\n      : skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, snapshot.message);\n''',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''    const worldBreakCelebrationEnvelope = this.worldBreakCelebrationTimer > 0\n      ? Math.sin((1 - this.worldBreakCelebrationTimer / Math.max(.001, this.worldBreakCelebrationDuration)) * Math.PI)\n      : 0;\n    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;\n''',
    '''    const worldBreakCelebrationEnvelope = this.worldBreakCelebrationTimer > 0\n      ? Math.sin((1 - this.worldBreakCelebrationTimer / Math.max(.001, this.worldBreakCelebrationDuration)) * Math.PI)\n      : 0;\n    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0\n      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)\n      : 0;\n    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;\n''',
)

patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '''    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback - this.camera.position.z) * zAlpha;\n    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick - this.camera.fov) * fovAlpha;\n''',
    '''    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback + worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback - this.camera.position.z) * zAlpha;\n    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick + worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick - this.camera.fov) * fovAlpha;\n''',
)


css = Path("app/SkyDancerArcadeMode.module.css")
css_text = css.read_text()
if "/* Arcade Run V40.3 WORLD BREAK recovery drama. */" not in css_text:
    css.write_text(css_text + r'''

/* Arcade Run V40.3 WORLD BREAK recovery drama. */
.worldBreakRecovery{position:absolute;z-index:10;left:50%;top:43%;transform:translate(-50%,-50%);width:min(420px,50vw);padding:7px 15px 8px;text-align:center;pointer-events:none;border-top:1px solid rgba(255,111,94,.62);border-bottom:1px solid rgba(255,111,94,.24);background:linear-gradient(90deg,transparent,rgba(28,8,12,.66) 18%,rgba(28,8,12,.72) 82%,transparent);text-shadow:0 2px 9px rgba(4,8,18,.9);animation:v403RecoveryIn .58s cubic-bezier(.16,.74,.24,1) both;transition:opacity .12s ease,filter .12s ease}.worldBreakRecovery small,.worldBreakRecovery strong,.worldBreakRecovery span,.worldBreakRecovery em{display:block}.worldBreakRecovery small{font-size:5px;font-weight:1000;letter-spacing:.25em;color:#ff9d89}.worldBreakRecovery strong{margin-top:2px;font-size:clamp(18px,3.3vw,32px);line-height:.98;letter-spacing:.12em;color:#ffe5df}.worldBreakRecovery span{margin-top:4px;font-size:6px;font-weight:900;letter-spacing:.13em;color:rgba(255,237,233,.72)}.worldBreakRecovery em{margin-top:5px;font-size:7px;font-style:normal;font-weight:1000;letter-spacing:.17em;color:#ffd06f}.worldBreakRecovery[data-retryable="true"] em:before{content:"↻ ";color:#75f0ff}.worldBreakRecovery[data-retryable="false"]{border-color:rgba(255,126,96,.34);background:linear-gradient(90deg,transparent,rgba(21,11,15,.58) 18%,rgba(21,11,15,.64) 82%,transparent)}.worldBreakRecovery[data-retryable="false"] em{color:rgba(255,211,151,.76)}.worldBreakRecovery[data-suppressed="true"]{opacity:.12!important;filter:blur(.45px)}
.worldBreakComeback{position:absolute;z-index:11;left:50%;top:42%;transform:translate(-50%,-50%);width:min(455px,54vw);text-align:center;pointer-events:none;color:#efffff;text-shadow:0 2px 10px rgba(3,13,24,.9);animation:v403Comeback .92s cubic-bezier(.13,.82,.22,1) both;isolation:isolate;transition:opacity .12s ease,filter .12s ease}.worldBreakComeback small,.worldBreakComeback strong,.worldBreakComeback span,.worldBreakComeback em{display:block}.worldBreakComeback small{font-size:6px;font-weight:1000;letter-spacing:.31em;color:#78f5ff}.worldBreakComeback strong{margin-top:2px;font-size:clamp(27px,5vw,52px);line-height:.9;font-weight:1000;letter-spacing:.12em;color:#fff3b8;text-shadow:0 2px 10px rgba(3,13,24,.9),0 0 23px rgba(112,242,255,.34)}.worldBreakComeback span{margin-top:5px;font-size:7px;font-weight:950;letter-spacing:.15em;color:rgba(240,255,255,.78)}.worldBreakComeback em{margin-top:5px;font-size:6px;font-style:normal;font-weight:1000;letter-spacing:.19em;color:#82ffd0}.worldBreakComeback>i{position:absolute;z-index:-1;left:50%;top:49%;width:124%;height:2px;transform:translate(-50%,-50%);background:linear-gradient(90deg,transparent,#62efff 31%,#fff1a2 50%,#62efff 69%,transparent);box-shadow:0 0 18px rgba(95,232,255,.62);animation:v403ComebackSweep .72s ease-out both}.worldBreakComeback[data-tone="final"] strong{color:#fff0aa}.worldBreakComeback[data-suppressed="true"]{opacity:.12!important;filter:blur(.45px)}
@keyframes v403RecoveryIn{0%{opacity:0;transform:translate(-50%,-47%) scale(.97)}26%{opacity:1;transform:translate(-50%,-50%) scale(1.015)}100%{opacity:.94;transform:translate(-50%,-51%) scale(1)}}
@keyframes v403Comeback{0%{opacity:0;transform:translate(-50%,-44%) scale(.8);filter:blur(1.7px)}22%{opacity:1;transform:translate(-50%,-50%) scale(1.075);filter:blur(0)}56%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:.9;transform:translate(-50%,-54%) scale(.99)}}
@keyframes v403ComebackSweep{0%{opacity:0;transform:translate(-50%,-50%) scaleX(.08)}24%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scaleX(1)}}
@media(max-height:520px){.worldBreakRecovery{top:44%;width:min(390px,46vw);padding:5px 12px}.worldBreakRecovery strong{font-size:19px}.worldBreakRecovery span,.worldBreakRecovery em{font-size:5px}.worldBreakComeback{top:43%;width:min(410px,49vw)}.worldBreakComeback strong{font-size:28px}.worldBreakComeback span,.worldBreakComeback em{font-size:5px}}
@media(orientation:portrait){.worldBreakRecovery{top:47%;width:76vw}.worldBreakComeback{top:46%;width:80vw}.worldBreakComeback strong{font-size:34px}}
@media(prefers-reduced-motion: reduce){.worldBreakRecovery,.worldBreakComeback,.worldBreakComeback>i{animation:none}.worldBreakRecovery,.worldBreakComeback{opacity:1;transform:translate(-50%,-50%)}}
''')

print("Arcade Run V40.3 World Break recovery drama patch applied")
