from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


# Static medal goal definitions for pre-flight mastery UI.
replace_once(
    "src/sky/arcade/SkyDancerArcadeV11Scoring.ts",
    '''export interface SkyDancerArcadeV11MedalResult {\n  id: SkyDancerArcadeV11MedalId;\n  label: string;\n  description: string;\n  earned: boolean;\n  reward: number;\n}\n''',
    '''export interface SkyDancerArcadeV11MedalGoal {\n  id: SkyDancerArcadeV11MedalId;\n  label: string;\n  description: string;\n}\n\nexport interface SkyDancerArcadeV11MedalResult extends SkyDancerArcadeV11MedalGoal {\n  earned: boolean;\n  reward: number;\n}\n''',
)
replace_once(
    "src/sky/arcade/SkyDancerArcadeV11Scoring.ts",
    '''export function skyDancerArcadeV11StageMedals(stageId: SkyDancerArcadeStageId, performance: SkyDancerArcadeV11StagePerformance): readonly SkyDancerArcadeV11MedalResult[] {\n''',
    '''export function skyDancerArcadeV11StageMedalGoals(stageId: SkyDancerArcadeStageId): readonly SkyDancerArcadeV11MedalGoal[] {\n  const definition = DEFINITIONS[stageId];\n  return [\n    { id: "score", label: definition.scoreLabel, description: `COMBAT SCORE ${definition.scoreTarget.toLocaleString()}+` },\n    { id: "signature", label: definition.signatureLabel, description: definition.signatureDescription },\n    { id: "no-damage", label: "PERFECT SKY", description: "NO DAMAGE" },\n  ];\n}\n\nexport function skyDancerArcadeV11StageMedals(stageId: SkyDancerArcadeStageId, performance: SkyDancerArcadeV11StagePerformance): readonly SkyDancerArcadeV11MedalResult[] {\n''',
)

# Title / Stage Practice mastery loop.
replace_once(
    "app/CartGameMenu.tsx",
    '''import { loadSkyDancerArcadeProgress } from "../src/sky/arcade/SkyDancerArcadeProgress";\n''',
    '''import { loadSkyDancerArcadeProgress } from "../src/sky/arcade/SkyDancerArcadeProgress";\nimport { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\n''',
)
replace_once(
    "app/CartGameMenu.tsx",
    '''    const selectedStage = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === practiceStageId);\n    const modeSummary = selectedMode === "arcade-run"\n''',
    '''    const selectedStage = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === practiceStageId);\n    const selectedStageRecord = selectedStage ? arcadeMeta.records[selectedStage.id] : undefined;\n    const selectedStageGoals = selectedStage ? skyDancerArcadeV11StageMedalGoals(selectedStage.id) : [];\n    const selectedMasteryCount = selectedStageGoals.filter((goal) => selectedStageRecord?.medals.includes(goal.id)).length;\n    const selectedNextGoal = selectedStageGoals.find((goal) => !selectedStageRecord?.medals.includes(goal.id));\n    const modeSummary = selectedMode === "arcade-run"\n''',
)
replace_once(
    "app/CartGameMenu.tsx",
    '''        : selectedStage\n          ? `${selectedStage.name} · SCORE ATTACK PRACTICE`\n''',
    '''        : selectedStage\n          ? `${selectedStage.name} · SCORE ATTACK · MASTERY ${selectedMasteryCount}/3`\n''',
)
replace_once(
    "app/CartGameMenu.tsx",
    '''                    <small>{String(stage.order).padStart(2, "0")}</small>\n                    <strong>{stage.shortName}</strong>\n                  </button>\n''',
    '''                    <small>{String(stage.order).padStart(2, "0")}</small>\n                    <strong>{stage.shortName}</strong>\n                    <span className={modeStyles.practiceMedals} aria-label={`${arcadeMeta.records[stage.id]?.medals.length ?? 0} of 3 medals`}>\n                      {"◆".repeat(arcadeMeta.records[stage.id]?.medals.length ?? 0)}{"◇".repeat(3 - (arcadeMeta.records[stage.id]?.medals.length ?? 0))}\n                    </span>\n                  </button>\n''',
)
replace_once(
    "app/CartGameMenu.tsx",
    '''              </div>\n            </div>\n          )}\n          <div className={`${styles.difficultySelect} ${modeStyles.compactDifficulty}`} aria-label="Select difficulty">\n''',
    '''              </div>\n              <div className={modeStyles.practiceMastery} aria-label="Selected stage mastery">\n                <div className={modeStyles.practiceRecord}>\n                  <span>STAGE MASTERY</span>\n                  <strong>{selectedMasteryCount}/3 · BEST {selectedStageRecord?.bestRank ?? "-"}</strong>\n                  <small>{selectedStageRecord ? `SCORE ${selectedStageRecord.bestScore.toLocaleString()} · CLEAR ×${selectedStageRecord.clears}` : "NO RECORD"}</small>\n                </div>\n                <div className={modeStyles.practiceGoals}>\n                  {selectedStageGoals.map((goal) => {\n                    const earned = selectedStageRecord?.medals.includes(goal.id) ?? false;\n                    return <span key={goal.id} data-earned={earned}><b>{earned ? "◆" : "◇"} {goal.label}</b><small>{goal.description}</small></span>;\n                  })}\n                </div>\n                <div className={modeStyles.practiceNextTarget} data-complete={!selectedNextGoal}>\n                  <span>{selectedNextGoal ? "NEXT TARGET" : "STAGE MASTERED"}</span>\n                  <strong>{selectedNextGoal?.label ?? "ALL 3 MEDALS COMPLETE"}</strong>\n                  <small>{selectedNextGoal?.description ?? "PUSH THE BEST SCORE HIGHER"}</small>\n                </div>\n              </div>\n            </div>\n          )}\n          <div className={`${styles.difficultySelect} ${modeStyles.compactDifficulty}`} aria-label="Select difficulty">\n''',
)
replace_once(
    "app/CartGameMenu.tsx",
    ''': `SINGLE STAGE · RECORD ATTACK${hard ? " · ACE DIFFICULTY" : ""}`}\n''',
    ''': `SINGLE STAGE · BEST ${selectedStageRecord?.bestScore ?? 0} ${selectedStageRecord?.bestRank ?? "D"} · MASTERY ${selectedMasteryCount}/3${selectedNextGoal ? ` · NEXT ${selectedNextGoal.label}` : " · MASTERED"}${hard ? " · ACE DIFFICULTY" : ""}`}\n''',
)

menu_css = Path("app/CartGameMenuModes.module.css")
menu_css.write_text(menu_css.read_text() + r'''

/* V11.4 — Stage Mastery Loop */
.practiceMedals {
  display: block;
  margin-top: 2px;
  color: #ffd76a;
  font-size: 7px;
  letter-spacing: .08em;
  white-space: nowrap;
}

.practiceMastery {
  display: grid;
  grid-template-columns: 1fr 2.25fr 1.15fr;
  gap: 7px;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid rgba(116, 225, 255, .14);
  text-align: left;
}

.practiceRecord,
.practiceNextTarget {
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 9px;
  background: rgba(255,255,255,.035);
}

.practiceRecord span,
.practiceNextTarget span {
  display: block;
  color: #7fe5ff;
  font-size: 6px;
  font-weight: 1000;
  letter-spacing: .15em;
}

.practiceRecord strong,
.practiceNextTarget strong {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: #fff;
  font-size: 8px;
  letter-spacing: .05em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.practiceRecord small,
.practiceNextTarget small {
  display: block;
  margin-top: 2px;
  color: rgba(255,255,255,.52);
  font-size: 6px;
  line-height: 1.25;
}

.practiceGoals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 5px;
}

.practiceGoals > span {
  min-width: 0;
  padding: 6px 7px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  background: rgba(3,14,24,.42);
  opacity: .56;
}

.practiceGoals > span[data-earned="true"] {
  border-color: rgba(255,215,106,.42);
  background: rgba(157,105,22,.2);
  opacity: 1;
}

.practiceGoals b,
.practiceGoals small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.practiceGoals b {
  color: #fff1b0;
  font-size: 7px;
  letter-spacing: .04em;
}

.practiceGoals small {
  margin-top: 3px;
  color: rgba(255,255,255,.54);
  font-size: 6px;
}

.practiceNextTarget {
  border-color: rgba(255,215,106,.25);
  background: linear-gradient(145deg, rgba(116,80,13,.18), rgba(3,14,24,.36));
}

.practiceNextTarget[data-complete="true"] {
  border-color: rgba(111,255,200,.28);
  background: rgba(24,105,78,.18);
}

@media (max-height: 560px) {
  .practiceMastery { gap: 5px; margin-top: 5px; padding-top: 5px; }
  .practiceRecord, .practiceNextTarget { padding: 4px 6px; }
  .practiceGoals > span { padding: 4px 5px; }
  .practiceRecord small, .practiceNextTarget small, .practiceGoals small { display: none; }
}

@media (orientation: portrait) {
  .practiceMastery { grid-template-columns: 1fr; }
}
''')

# Practice completion remembers previous medals and points directly at the next target.
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''import {\n  recordSkyDancerArcadeRunClear,\n  recordSkyDancerArcadeStageClear,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";\n''',
    '''import {\n  loadSkyDancerArcadeProgress,\n  recordSkyDancerArcadeRunClear,\n  recordSkyDancerArcadeStageClear,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";\nimport type { SkyDancerArcadeV11MedalId } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\n''',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);\n  const [stick, setStick] = useState({ x: 0, y: 0 });\n''',
    '''  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);\n  const [stick, setStick] = useState({ x: 0, y: 0 });\n  const [masteredMedals, setMasteredMedals] = useState<SkyDancerArcadeV11MedalId[]>([]);\n''',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''    setRendererName("WEBGL");\n    setRuntimeMessage(null);\n    mount.replaceChildren();\n''',
    '''    setRendererName("WEBGL");\n    setRuntimeMessage(null);\n    if (runtimeOptions.mode === "stage-practice" && runtimeOptions.startStageId) {\n      setMasteredMedals(loadSkyDancerArcadeProgress().records[runtimeOptions.startStageId]?.medals ?? []);\n    } else {\n      setMasteredMedals([]);\n    }\n    mount.replaceChildren();\n''',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''    recordSkyDancerArcadeStageClear(\n      snapshot.lastClearedStageId,\n      snapshot.lastStageScore,\n      snapshot.lastStageRank,\n      snapshot.lastStageNoDamage,\n      snapshot.lastStageMedals.filter(medal => medal.earned).map(medal => medal.id),\n    );\n''',
    '''    const progress = recordSkyDancerArcadeStageClear(\n      snapshot.lastClearedStageId,\n      snapshot.lastStageScore,\n      snapshot.lastStageRank,\n      snapshot.lastStageNoDamage,\n      snapshot.lastStageMedals.filter(medal => medal.earned).map(medal => medal.id),\n    );\n    setMasteredMedals(progress.records[snapshot.lastClearedStageId]?.medals ?? []);\n''',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''  const controlsVisible = snapshot.status === "running";\n  const finalOverlay = snapshot.status === "run-clear" || snapshot.status === "practice-clear" || snapshot.status === "game-over";\n\n  return (\n''',
    '''  const controlsVisible = snapshot.status === "running";\n  const finalOverlay = snapshot.status === "run-clear" || snapshot.status === "practice-clear" || snapshot.status === "game-over";\n  const practiceMasteryCount = snapshot.lastStageMedals.filter((medal) => masteredMedals.includes(medal.id) || medal.earned).length;\n  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !masteredMedals.includes(medal.id) && !medal.earned);\n\n  return (\n''',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? "3D FLIGHT · V11 ARCADE EVOLUTION" : "COMPATIBILITY · CANVAS · V11"}</span>\n''',
    '''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? "3D FLIGHT · V11.4 MASTERY LOOP" : "COMPATIBILITY · CANVAS · V11.4"}</span>\n''',
)
replace_once(
    "app/SkyDancerArcadeMode.tsx",
    '''              {snapshot.route.length > 1 && <div className={productStyles.v11RouteHistory}><small>FLIGHT ROUTE</small><strong>{snapshot.route.map(id => skyDancerArcadeStageById(id).shortName).join(" → ")}</strong></div>}\n              <button onClick={restart}><strong>{snapshot.mode === "stage-practice" ? "RETRY STAGE" : "NEW ARCADE RUN"}</strong><span>FLY AGAIN</span></button>\n''',
    '''              {snapshot.route.length > 1 && <div className={productStyles.v11RouteHistory}><small>FLIGHT ROUTE</small><strong>{snapshot.route.map(id => skyDancerArcadeStageById(id).shortName).join(" → ")}</strong></div>}\n              {snapshot.mode === "stage-practice" && snapshot.status === "practice-clear" && snapshot.lastStageMedals.length > 0 && (\n                <div className={productStyles.v114PracticeMastery} aria-label="Stage mastery result">\n                  <div><small>STAGE MASTERY</small><strong>{practiceMasteryCount}/3</strong><span>{practiceMasteryCount === 3 ? "MASTERED" : "KEEP FLYING"}</span></div>\n                  <div className={productStyles.v114PracticeGoals}>\n                    {snapshot.lastStageMedals.map((medal) => {\n                      const mastered = masteredMedals.includes(medal.id) || medal.earned;\n                      return <span key={medal.id} data-earned={mastered}><b>{mastered ? "◆" : "◇"} {medal.label}</b><small>{medal.description}</small></span>;\n                    })}\n                  </div>\n                  <div className={productStyles.v114NextTarget} data-complete={!practiceNextTarget}><small>{practiceNextTarget ? "NEXT TARGET" : "STAGE MASTERED"}</small><strong>{practiceNextTarget?.label ?? "ALL MEDALS COMPLETE"}</strong><span>{practiceNextTarget?.description ?? "CHASE A NEW HIGH SCORE"}</span></div>\n                </div>\n              )}\n              <button onClick={restart}><strong>{snapshot.mode === "stage-practice" ? "RETRY STAGE" : "NEW ARCADE RUN"}</strong><span>{snapshot.mode === "stage-practice" && practiceNextTarget ? `CHASE ${practiceNextTarget.label}` : "FLY AGAIN"}</span></button>\n''',
)

product_css = Path("app/SkyDancerArcadeProduct.module.css")
product_css.write_text(product_css.read_text() + r'''

/* V11.4 — Practice Mastery Result */
.v114PracticeMastery {
  width: min(620px, 82vw);
  display: grid;
  grid-template-columns: .8fr 2.2fr 1fr;
  gap: 7px;
  margin: 7px auto 9px;
}

.v114PracticeMastery > div {
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 9px;
  background: rgba(4,17,29,.72);
  text-align: left;
}

.v114PracticeMastery > div:first-child small,
.v114NextTarget small {
  display: block;
  color: #7fe6ff;
  font-size: 6px;
  font-weight: 1000;
  letter-spacing: .16em;
}

.v114PracticeMastery > div:first-child strong,
.v114NextTarget strong {
  display: block;
  margin-top: 2px;
  color: white;
  font-size: 15px;
  line-height: 1;
}

.v114PracticeMastery > div:first-child span,
.v114NextTarget span {
  display: block;
  margin-top: 3px;
  color: rgba(255,255,255,.52);
  font-size: 6px;
  letter-spacing: .06em;
}

.v114PracticeGoals {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 4px;
}

.v114PracticeGoals > span {
  min-width: 0;
  padding: 5px 6px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 7px;
  opacity: .5;
}

.v114PracticeGoals > span[data-earned="true"] {
  border-color: rgba(255,215,106,.4);
  background: rgba(155,103,18,.2);
  opacity: 1;
}

.v114PracticeGoals b,
.v114PracticeGoals small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v114PracticeGoals b { color: #fff0ac; font-size: 7px; }
.v114PracticeGoals small { margin-top: 2px; color: rgba(255,255,255,.5); font-size: 6px; }
.v114NextTarget { border-color: rgba(255,215,106,.26) !important; background: rgba(112,77,13,.2) !important; }
.v114NextTarget[data-complete="true"] { border-color: rgba(111,255,200,.28) !important; background: rgba(23,102,76,.2) !important; }

@media (max-height: 430px) {
  .v114PracticeMastery { margin: 4px auto 5px; gap: 4px; }
  .v114PracticeMastery > div { padding: 4px 5px; }
  .v114PracticeGoals > span { padding: 3px 4px; }
  .v114PracticeGoals small,
  .v114PracticeMastery > div:first-child span,
  .v114NextTarget span { display: none; }
}
''')

# Regression contract.
replace_once(
    "tests/sky-arcade-run.test.ts",
    '''import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";\n''',
    '''import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";\nimport { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\n''',
)
tests = Path("tests/sky-arcade-run.test.ts")
tests.write_text(tests.read_text() + '''\n\ntest("V11.4 exposes three persistent mastery goals for every practice stage", () => {\n  for (const stage of SKY_DANCER_ARCADE_STAGES) {\n    const goals = skyDancerArcadeV11StageMedalGoals(stage.id);\n    assert.equal(goals.length, 3, stage.id);\n    assert.deepEqual(goals.map((goal) => goal.id), ["score", "signature", "no-damage"]);\n    assert.equal(new Set(goals.map((goal) => goal.label)).size, 3, stage.id);\n    assert.ok(goals.every((goal) => goal.description.length > 0), stage.id);\n  }\n});\n\ntest("V11.4 stage practice UI closes the mastery retry loop", async () => {\n  const [menu, mode, menuCss, productCss] = await Promise.all([\n    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/CartGameMenuModes.module.css", import.meta.url), "utf8"),\n    readFile(new URL("../app/SkyDancerArcadeProduct.module.css", import.meta.url), "utf8"),\n  ]);\n  assert.match(menu, /STAGE MASTERY/);\n  assert.match(menu, /NEXT TARGET/);\n  assert.match(menu, /practiceMedals/);\n  assert.match(mode, /v114PracticeMastery/);\n  assert.match(mode, /CHASE \\${practiceNextTarget\\.label}/);\n  assert.match(menuCss, /practiceMastery/);\n  assert.match(productCss, /v114PracticeGoals/);\n});\n''')
