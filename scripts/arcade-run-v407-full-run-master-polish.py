from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


Path("src/sky/arcade/SkyDancerArcadeV407FullRunPolish.ts").write_text(r'''export type SkyDancerArcadeV407HudFocus = "flight" | "rival" | "boss" | "critical" | "handoff" | "finale";

export interface SkyDancerArcadeV407HudFocusInput {
  status: "running" | "paused" | "stage-clear" | "continue" | "game-over" | "run-clear" | "practice-clear";
  bossActive: boolean;
  rivalAceActive: boolean;
  bossApproachActive: boolean;
  missileDanger: boolean;
}

export interface SkyDancerArcadeV407HandoffCue {
  phase: "score" | "commit" | "launch" | "finale";
  progress: number;
  eyebrow: string;
  title: string;
  detail: string;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function skyDancerArcadeV407HudFocus(input: SkyDancerArcadeV407HudFocusInput): SkyDancerArcadeV407HudFocus {
  if (input.status === "run-clear" || input.status === "practice-clear" || input.status === "game-over") return "finale";
  if (input.status === "stage-clear" || input.status === "continue") return "handoff";
  if (input.bossApproachActive || input.missileDanger) return "critical";
  if (input.bossActive) return "boss";
  if (input.rivalAceActive) return "rival";
  return "flight";
}

export function skyDancerArcadeV407HandoffCue(
  resultTimer: number,
  nextStageName: string | null,
  doctrine: string | null,
  doctrineDetail: string | null,
): SkyDancerArcadeV407HandoffCue {
  const progress = clamp01(1 - Math.max(0, resultTimer) / 1.35);
  if (!nextStageName) {
    return {
      phase: "finale",
      progress,
      eyebrow: "FINAL SORTIE COMPLETE",
      title: "ONE SKY · DEBRIEF",
      detail: "PRISM SOVEREIGN DOWN · FINAL RECORD LOCKED",
    };
  }
  const phase = resultTimer <= .42 ? "launch" : resultTimer <= .88 ? "commit" : "score";
  return {
    phase,
    progress,
    eyebrow: phase === "launch" ? "LAUNCHING NEXT SECTION" : "NEXT SORTIE",
    title: nextStageName,
    detail: doctrine && doctrine !== "LOCKED"
      ? `${doctrine} ROUTE · ${doctrineDetail ?? "ROUTE CONTRACT ACTIVE"}`
      : "DIRECT ROUTE · AIRFRAME MOVING",
  };
}

export function skyDancerArcadeV407RendererBadgeVisible(
  renderer: "WEBGL" | "CANVAS",
  stageNumber: number,
  stageTimeSeconds: number,
  status: SkyDancerArcadeV407HudFocusInput["status"],
): boolean {
  if (renderer === "CANVAS") return true;
  return status === "running" && stageNumber === 1 && stageTimeSeconds < 3.2;
}
''')

Path("tests/sky-arcade-v407-full-run-polish.test.ts").write_text(r'''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  skyDancerArcadeV407HandoffCue,
  skyDancerArcadeV407HudFocus,
  skyDancerArcadeV407RendererBadgeVisible,
} from "../src/sky/arcade/SkyDancerArcadeV407FullRunPolish";

test("V40.7 HUD focus has one clear priority during a full run", () => {
  assert.equal(skyDancerArcadeV407HudFocus({ status: "run-clear", bossActive: true, rivalAceActive: true, bossApproachActive: true, missileDanger: true }), "finale");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "stage-clear", bossActive: true, rivalAceActive: true, bossApproachActive: true, missileDanger: true }), "handoff");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: true, rivalAceActive: true, bossApproachActive: true, missileDanger: false }), "critical");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: true, rivalAceActive: true, bossApproachActive: false, missileDanger: false }), "boss");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: false, rivalAceActive: true, bossApproachActive: false, missileDanger: false }), "rival");
  assert.equal(skyDancerArcadeV407HudFocus({ status: "running", bossActive: false, rivalAceActive: false, bossApproachActive: false, missileDanger: false }), "flight");
});

test("V40.7 turns the short section result into a progressive next-sortie handoff", () => {
  const score = skyDancerArcadeV407HandoffCue(1.3, "RED CANYON", "SAFE", "RECOVER HP");
  const commit = skyDancerArcadeV407HandoffCue(.7, "RED CANYON", "SAFE", "RECOVER HP");
  const launch = skyDancerArcadeV407HandoffCue(.2, "RED CANYON", "SAFE", "RECOVER HP");
  assert.equal(score.phase, "score");
  assert.equal(commit.phase, "commit");
  assert.equal(launch.phase, "launch");
  assert.ok(score.progress < commit.progress && commit.progress < launch.progress);
  assert.match(commit.detail, /SAFE ROUTE/);
});

test("V40.7 final handoff resolves into a finale rather than promising another sortie", () => {
  const cue = skyDancerArcadeV407HandoffCue(.6, null, null, null);
  assert.equal(cue.phase, "finale");
  assert.match(cue.title, /DEBRIEF/);
  assert.match(cue.detail, /PRISM SOVEREIGN DOWN/);
});

test("V40.7 removes the renderer debug badge after the opening but preserves Canvas compatibility status", () => {
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("WEBGL", 1, 1.2, "running"), true);
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("WEBGL", 1, 4.2, "running"), false);
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("WEBGL", 2, .2, "running"), false);
  assert.equal(skyDancerArcadeV407RendererBadgeVisible("CANVAS", 6, 20, "running"), true);
});

test("V40.7 source keeps telemetry out of the product HUD and protects iPhone landscape results", () => {
  const mode = readFileSync("app/SkyDancerArcadeMode.tsx", "utf8");
  const css = readFileSync("app/SkyDancerArcadeMode.module.css", "utf8");
  const runtime = readFileSync("src/sky/arcade/SkyDancerArcadeRuntime.ts", "utf8");
  assert.match(mode, /data-v407-focus=\{v407Focus\}/);
  assert.match(mode, /className=\{styles\.timelineDiagnostics\}/);
  assert.match(mode, /className=\{styles\.stageHandoff\}/);
  assert.match(mode, /rendererBadgeVisible &&/);
  assert.match(css, /V40\.7 Full Run Master Polish/);
  assert.match(css, /\.timelineDiagnostics\{display:none/);
  assert.match(css, /max-height:430px/);
  assert.doesNotMatch(runtime, /V407FullRunPolish/);
});
''')

mode_path = "app/SkyDancerArcadeMode.tsx"
replace_once(mode_path,
'''import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
  type SkyDancerArcadeV403RecoveryCue,
} from "../src/sky/arcade/SkyDancerArcadeV403WorldBreakRecovery";
import styles from "./SkyDancerArcadeMode.module.css";''',
'''import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
  type SkyDancerArcadeV403RecoveryCue,
} from "../src/sky/arcade/SkyDancerArcadeV403WorldBreakRecovery";
import {
  skyDancerArcadeV407HandoffCue,
  skyDancerArcadeV407HudFocus,
  skyDancerArcadeV407RendererBadgeVisible,
} from "../src/sky/arcade/SkyDancerArcadeV407FullRunPolish";
import styles from "./SkyDancerArcadeMode.module.css";''')

replace_once(mode_path,
'''  const rivalAceHpPercent = snapshot.rivalAceActive ? Math.round(snapshot.rivalAceHp / Math.max(1, snapshot.rivalAceMaxHp) * 100) : 0;
  const rivalAceAdvantagePercent = snapshot.rivalAceActive ? Math.round(snapshot.rivalAceAdvantage / Math.max(.001, snapshot.rivalAceAdvantageTarget) * 100) : 0;

  return (''',
'''  const rivalAceHpPercent = snapshot.rivalAceActive ? Math.round(snapshot.rivalAceHp / Math.max(1, snapshot.rivalAceMaxHp) * 100) : 0;
  const rivalAceAdvantagePercent = snapshot.rivalAceActive ? Math.round(snapshot.rivalAceAdvantage / Math.max(.001, snapshot.rivalAceAdvantageTarget) * 100) : 0;
  const v407Focus = skyDancerArcadeV407HudFocus({
    status: snapshot.status,
    bossActive: snapshot.bossActive,
    rivalAceActive: snapshot.rivalAceActive,
    bossApproachActive: bossApproach.active,
    missileDanger: missileCueDanger === "1",
  });
  const nextStageId = snapshot.mode === "arcade-run" && snapshot.stage.next.length > 0
    ? snapshot.branchSelection ?? snapshot.stage.next[0] ?? null
    : null;
  const nextStage = nextStageId ? skyDancerArcadeStageById(nextStageId) : null;
  const nextStageIndex = nextStageId ? snapshot.stage.next.indexOf(nextStageId) : -1;
  const nextDoctrine = nextStage ? skyDancerArcadeV40RouteDoctrine(nextStageIndex, snapshot.stage.next.length) : null;
  const nextDoctrineEffect = nextDoctrine ? skyDancerArcadeV40RouteEffect(nextDoctrine) : null;
  const v407Handoff = skyDancerArcadeV407HandoffCue(
    snapshot.resultTimer,
    nextStage?.name ?? null,
    nextDoctrine,
    nextDoctrineEffect?.detail ?? null,
  );
  const rendererBadgeVisible = skyDancerArcadeV407RendererBadgeVisible(rendererName, snapshot.stageNumber, snapshot.stageTimeSeconds, snapshot.status);

  return (''')

replace_once(mode_path,
'''      <section className={styles.stage} aria-label="Sky Dancer Arcade Run">''',
'''      <section className={styles.stage} data-v407-focus={v407Focus} aria-label="Sky Dancer Arcade Run">''')

replace_once(mode_path,
'''        <div className={productStyles.timelineBeat} data-kind={snapshot.timelineBeatKind} data-director={snapshot.combatDirectorMode} aria-label="Current course beat">
          <small>COURSE BEAT · {String(snapshot.timelineBeatId).toUpperCase().replaceAll("-", " ")}</small>
          <strong>{snapshot.timelineBeatLabel}</strong>
          <span>{snapshot.timelineSetpiece}</span>
          <em className={productStyles.v12DirectorLine}>COMBAT DIRECTOR · {snapshot.combatDirectorLabel} · {snapshot.combatDirectorIntent}</em>
          <em className={productStyles.v121GrammarLine}>ENCOUNTER · {snapshot.encounterGrammarLabel} · {snapshot.encounterGrammarPhaseLabel} {snapshot.encounterGrammarPhaseIndex}/{snapshot.encounterGrammarPhaseCount} · {snapshot.encounterContinuityLabel}</em>''',
'''        <div className={`${productStyles.timelineBeat} ${styles.timelineV407}`} data-kind={snapshot.timelineBeatKind} data-director={snapshot.combatDirectorMode} aria-label="Current course beat">
          <small>COURSE BEAT · {String(snapshot.timelineBeatId).toUpperCase().replaceAll("-", " ")}</small>
          <strong>{snapshot.timelineBeatLabel}</strong>
          <span>{snapshot.timelineSetpiece}</span>
          <span className={styles.timelineDiagnostics} aria-hidden="true">
            <em className={productStyles.v12DirectorLine}>COMBAT DIRECTOR · {snapshot.combatDirectorLabel} · {snapshot.combatDirectorIntent}</em>
            <em className={productStyles.v121GrammarLine}>ENCOUNTER · {snapshot.encounterGrammarLabel} · {snapshot.encounterGrammarPhaseLabel} {snapshot.encounterGrammarPhaseIndex}/{snapshot.encounterGrammarPhaseCount} · {snapshot.encounterContinuityLabel}</em>
          </span>''')

replace_once(mode_path,
'''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? `3D FLIGHT · V12.2 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}` : `COMPATIBILITY · CANVAS · V12.2 · ${snapshot.loadout.toUpperCase()}`}</span>''',
'''        {rendererBadgeVisible && <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? `3D FLIGHT · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}` : `COMPATIBILITY · CANVAS · ${snapshot.loadout.toUpperCase()}`}</span>}''')

replace_once(mode_path,
'''              <div><span>SECTION SCORE</span><b>{snapshot.lastStageScore}</b></div>
              <p>NEXT SORTIE IN {snapshot.resultTimer.toFixed(1)}s</p>''',
'''              <div><span>SECTION SCORE</span><b>{snapshot.lastStageScore}</b></div>
              {snapshot.mode === "arcade-run" ? (
                <div className={styles.stageHandoff} data-phase={v407Handoff.phase}>
                  <small>{v407Handoff.eyebrow}</small>
                  <strong>{v407Handoff.title}</strong>
                  <span>{v407Handoff.detail}</span>
                  <i aria-hidden="true"><b style={{ width: `${Math.round(v407Handoff.progress * 100)}%` }} /></i>
                </div>
              ) : <p>PRACTICE DEBRIEF IN {snapshot.resultTimer.toFixed(1)}s</p>}''')

css_path = Path("app/SkyDancerArcadeMode.module.css")
css = css_path.read_text()
css += r'''

/* V40.7 Full Run Master Polish: product HUD focus, sortie handoff and phone-safe debriefs. */
.timelineDiagnostics{display:none!important}.timelineV407{transition:opacity .2s ease,transform .24s ease,filter .2s ease}.stage[data-v407-focus="rival"] .timelineV407{opacity:.42;transform:translateY(-2px);filter:saturate(.72)}.stage[data-v407-focus="boss"] .timelineV407,.stage[data-v407-focus="critical"] .timelineV407{opacity:.22;transform:translateY(-3px) scale(.985);filter:saturate(.55)}.stage[data-v407-focus="boss"] .stageCard,.stage[data-v407-focus="critical"] .stageCard{opacity:.5;transform:translateY(-1px)}.stage[data-v407-focus="critical"] .scoreCard{opacity:.62}.stageCard,.scoreCard{transition:opacity .2s ease,transform .2s ease}.stageHandoff{display:block!important;margin:10px auto 0!important;width:min(370px,92%);padding:8px 12px!important;border:1px solid rgba(111,232,255,.28);border-radius:10px;background:rgba(5,17,34,.58);text-align:left;box-shadow:inset 0 1px 0 rgba(255,255,255,.07);animation:v407HandoffIn .22s ease-out both}.stageHandoff small,.stageHandoff strong,.stageHandoff span{display:block}.stageHandoff small{font-size:6px!important;letter-spacing:.2em!important;color:#72e9ff!important}.stageHandoff strong{margin-top:2px;font-size:14px;letter-spacing:.1em;color:#fff}.stageHandoff span{margin-top:3px;font-size:6px;font-weight:900;letter-spacing:.08em;color:rgba(255,255,255,.63)}.stageHandoff>i{display:block;height:3px;margin-top:6px;background:rgba(255,255,255,.1);overflow:hidden}.stageHandoff>i b{display:block;height:100%;background:linear-gradient(90deg,#5de7ff,#ffe374);box-shadow:0 0 12px rgba(95,226,255,.45);transition:width .08s linear}.stageHandoff[data-phase="launch"]{border-color:rgba(255,226,108,.56);transform:scale(1.015);box-shadow:0 0 22px rgba(255,218,90,.12),inset 0 1px 0 rgba(255,255,255,.1)}.stageHandoff[data-phase="finale"]{text-align:center;border-color:rgba(255,226,108,.5);background:rgba(21,22,42,.66)}@keyframes v407HandoffIn{from{opacity:0;transform:translateY(5px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media (max-height:430px){.stageResultPanel,.finalPanel,.continuePanel{max-height:calc(100svh - 18px);padding:11px 18px;overflow:auto;overscroll-behavior:contain}.stageResultPanel h2,.finalPanel h2{font-size:48px}.stageResultPanel>div{margin-top:7px;gap:10px}.stageHandoff{margin-top:7px!important;padding:6px 10px!important}.stageHandoff strong{font-size:12px}.stageHandoff span{font-size:5px}.finalPanel button,.continuePanel button{margin-top:7px;padding:8px 16px}.stage[data-v407-focus="boss"] .stageCard,.stage[data-v407-focus="critical"] .stageCard{opacity:.28}}
'''
css_path.write_text(css)

print("Arcade Run V40.7 full-run master polish patch applied")
