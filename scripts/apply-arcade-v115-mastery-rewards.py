from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

progress = "src/sky/arcade/SkyDancerArcadeProgress.ts"
replace_once(
    progress,
    'export type SkyDancerArcadeLoadout = "standard" | "missile-focus" | "gun-focus";\n',
    '''export type SkyDancerArcadeLoadout = "standard" | "missile-focus" | "gun-focus";\n\nexport type SkyDancerArcadeMasteryRewardKind = "paint" | "loadout" | "badge";\n\nexport interface SkyDancerArcadeMasteryReward {\n  threshold: number;\n  label: string;\n  shortLabel: string;\n  kind: SkyDancerArcadeMasteryRewardKind;\n  paintScheme?: SkyDancerArcadePaintScheme;\n  loadout?: SkyDancerArcadeLoadout;\n}\n\nexport const SKY_DANCER_ARCADE_MAX_MEDALS = SKY_DANCER_ARCADE_STAGES.length * 3;\n\nexport const SKY_DANCER_ARCADE_MASTERY_REWARDS: readonly SkyDancerArcadeMasteryReward[] = [\n  { threshold: 6, label: "SUNSET PAINT", shortLabel: "SUNSET", kind: "paint", paintScheme: "sunset" },\n  { threshold: 12, label: "MISSILE FOCUS", shortLabel: "MISSILE", kind: "loadout", loadout: "missile-focus" },\n  { threshold: 18, label: "STORM PAINT", shortLabel: "STORM", kind: "paint", paintScheme: "storm" },\n  { threshold: 24, label: "GUN FOCUS", shortLabel: "GUN", kind: "loadout", loadout: "gun-focus" },\n  { threshold: 30, label: "PRISM PAINT", shortLabel: "PRISM", kind: "paint", paintScheme: "prism" },\n  { threshold: SKY_DANCER_ARCADE_MAX_MEDALS, label: "SKY MASTER", shortLabel: "SKY MASTER", kind: "badge" },\n];\n\nexport function skyDancerArcadeNextMasteryReward(totalMedals: number): SkyDancerArcadeMasteryReward | null {\n  const medals = Math.max(0, Math.floor(Number(totalMedals) || 0));\n  return SKY_DANCER_ARCADE_MASTERY_REWARDS.find((reward) => medals < reward.threshold) ?? null;\n}\n\nexport function skyDancerArcadeMasteryUnlocks(totalMedals: number): {\n  paintSchemes: SkyDancerArcadePaintScheme[];\n  loadouts: SkyDancerArcadeLoadout[];\n} {\n  const medals = Math.max(0, Math.floor(Number(totalMedals) || 0));\n  const paintSchemes: SkyDancerArcadePaintScheme[] = [];\n  const loadouts: SkyDancerArcadeLoadout[] = [];\n  for (const reward of SKY_DANCER_ARCADE_MASTERY_REWARDS) {\n    if (medals < reward.threshold) break;\n    if (reward.paintScheme) paintSchemes.push(reward.paintScheme);\n    if (reward.loadout) loadouts.push(reward.loadout);\n  }\n  return { paintSchemes, loadouts };\n}\n''',
)
replace_once(
    progress,
    '''  if (progress.totalArmorBreaks >= 10) loadouts.add("missile-focus");\n  if (progress.bestChain >= 8) loadouts.add("gun-focus");\n  progress.unlockedPaintSchemes = [...paint];\n  progress.unlockedLoadouts = [...loadouts];\n''',
    '''  if (progress.totalArmorBreaks >= 10) loadouts.add("missile-focus");\n  if (progress.bestChain >= 8) loadouts.add("gun-focus");\n  const masteryUnlocks = skyDancerArcadeMasteryUnlocks(progress.totalMedals);\n  for (const scheme of masteryUnlocks.paintSchemes) paint.add(scheme);\n  for (const loadout of masteryUnlocks.loadouts) loadouts.add(loadout);\n  progress.unlockedPaintSchemes = [...paint];\n  progress.unlockedLoadouts = [...loadouts];\n''',
)
replace_once(
    progress,
    '''      totalMedals: finiteCount(parsed.totalMedals),\n      recentRoutes: validRecentRoutes(parsed.recentRoutes),\n''',
    '''      totalMedals: Math.max(\n        finiteCount(parsed.totalMedals),\n        Object.values(records).reduce((sum, record) => sum + (record?.medals.length ?? 0), 0),\n      ),\n      recentRoutes: validRecentRoutes(parsed.recentRoutes),\n''',
)

menu = "app/CartGameMenu.tsx"
replace_once(
    menu,
    'import { loadSkyDancerArcadeProgress } from "../src/sky/arcade/SkyDancerArcadeProgress";\n',
    '''import {\n  SKY_DANCER_ARCADE_MAX_MEDALS,\n  loadSkyDancerArcadeProgress,\n  skyDancerArcadeNextMasteryReward,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";\n''',
)
replace_once(
    menu,
    '''    const selectedNextGoal = selectedStageGoals.find((goal) => !selectedStageRecord?.medals.includes(goal.id));\n    const modeSummary = selectedMode === "arcade-run"\n''',
    '''    const selectedNextGoal = selectedStageGoals.find((goal) => !selectedStageRecord?.medals.includes(goal.id));\n    const nextMasteryReward = skyDancerArcadeNextMasteryReward(arcadeMeta.totalMedals);\n    const masteryRewardSummary = nextMasteryReward\n      ? `NEXT ${nextMasteryReward.shortLabel} @${nextMasteryReward.threshold}◆`\n      : "SKY MASTER COMPLETE";\n    const modeSummary = selectedMode === "arcade-run"\n''',
)
replace_once(
    menu,
    '''                ? `2 CONTINUES · ROUTE GATES CHANGE THE RUN · BEST ${arcadeMeta.bestRunScore} ${arcadeMeta.bestRunRank} · BOSS ${arcadeMeta.totalBossKills} · CHAIN ×${arcadeMeta.bestChain} · UNLOCKS ${arcadeMeta.unlockedPaintSchemes.length + arcadeMeta.unlockedLoadouts.length}${hard ? " · ACE ENEMIES FIRE FASTER AND HIT HARDER" : ""}`\n                : `SINGLE STAGE · BEST ${selectedStageRecord?.bestScore ?? 0} ${selectedStageRecord?.bestRank ?? "D"} · MASTERY ${selectedMasteryCount}/3${selectedNextGoal ? ` · NEXT ${selectedNextGoal.label}` : " · MASTERED"}${hard ? " · ACE DIFFICULTY" : ""}`}\n''',
    '''                ? `2 CONTINUES · BEST ${arcadeMeta.bestRunScore} ${arcadeMeta.bestRunRank} · MASTERY ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${masteryRewardSummary}${hard ? " · ACE PRESSURE" : ""}`\n                : `SINGLE STAGE · BEST ${selectedStageRecord?.bestScore ?? 0} ${selectedStageRecord?.bestRank ?? "D"} · MASTERY ${selectedMasteryCount}/3 · PILOT ${arcadeMeta.totalMedals}/${SKY_DANCER_ARCADE_MAX_MEDALS} · ${masteryRewardSummary}${hard ? " · ACE DIFFICULTY" : ""}`}\n''',
)
replace_once(
    menu,
    '''                  <small>{selectedNextGoal?.description ?? "PUSH THE BEST SCORE HIGHER"}</small>\n''',
    '''                  <small>{selectedNextGoal?.description ?? "PUSH THE BEST SCORE HIGHER"} · {nextMasteryReward ? `PILOT REWARD ${nextMasteryReward.label} AT ${nextMasteryReward.threshold} MEDALS` : "SKY MASTER COMPLETE"}</small>\n''',
)

mode = "app/SkyDancerArcadeMode.tsx"
replace_once(
    mode,
    '''import {\n  loadSkyDancerArcadeProgress,\n  recordSkyDancerArcadeRunClear,\n  recordSkyDancerArcadeStageClear,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";\n''',
    '''import {\n  SKY_DANCER_ARCADE_MAX_MEDALS,\n  loadSkyDancerArcadeProgress,\n  recordSkyDancerArcadeRunClear,\n  recordSkyDancerArcadeStageClear,\n  skyDancerArcadeNextMasteryReward,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";\n''',
)
replace_once(
    mode,
    '''  const persistedPracticeMedals = runtimeOptions.mode === "stage-practice" && runtimeOptions.startStageId\n    ? loadSkyDancerArcadeProgress().records[runtimeOptions.startStageId]?.medals ?? []\n    : [];\n  const practiceMasteryCount = snapshot.lastStageMedals.filter((medal) => persistedPracticeMedals.includes(medal.id) || medal.earned).length;\n  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !persistedPracticeMedals.includes(medal.id) && !medal.earned);\n''',
    '''  const persistedArcadeProgress = loadSkyDancerArcadeProgress();\n  const persistedPracticeMedals = runtimeOptions.mode === "stage-practice" && runtimeOptions.startStageId\n    ? persistedArcadeProgress.records[runtimeOptions.startStageId]?.medals ?? []\n    : [];\n  const currentEarnedMedals = snapshot.lastStageMedals.filter((medal) => medal.earned).map((medal) => medal.id);\n  const projectedStageMedals = new Set([...persistedPracticeMedals, ...currentEarnedMedals]);\n  const projectedNewMedals = Math.max(0, projectedStageMedals.size - persistedPracticeMedals.length);\n  const projectedTotalMedals = Math.min(SKY_DANCER_ARCADE_MAX_MEDALS, persistedArcadeProgress.totalMedals + projectedNewMedals);\n  const projectedNextMasteryReward = skyDancerArcadeNextMasteryReward(projectedTotalMedals);\n  const practiceMasteryCount = snapshot.lastStageMedals.filter((medal) => persistedPracticeMedals.includes(medal.id) || medal.earned).length;\n  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !persistedPracticeMedals.includes(medal.id) && !medal.earned);\n''',
)
replace_once(
    mode,
    '''                  <div><small>STAGE MASTERY</small><strong>{practiceMasteryCount}/3</strong><span>{practiceMasteryCount === 3 ? "MASTERED" : "KEEP FLYING"}</span></div>\n''',
    '''                  <div><small>STAGE MASTERY</small><strong>{practiceMasteryCount}/3 · {projectedTotalMedals}◆</strong><span>{practiceMasteryCount === 3 ? "MASTERED" : "KEEP FLYING"} · PILOT {projectedTotalMedals}/{SKY_DANCER_ARCADE_MAX_MEDALS}</span></div>\n''',
)
replace_once(
    mode,
    '''                  <div className={productStyles.v114NextTarget} data-complete={!practiceNextTarget}><small>{practiceNextTarget ? "NEXT TARGET" : "STAGE MASTERED"}</small><strong>{practiceNextTarget?.label ?? "ALL MEDALS COMPLETE"}</strong><span>{practiceNextTarget?.description ?? "CHASE A NEW HIGH SCORE"}</span></div>\n''',
    '''                  <div className={productStyles.v114NextTarget} data-complete={!practiceNextTarget}><small>{practiceNextTarget ? "NEXT TARGET" : "STAGE MASTERED"}</small><strong>{practiceNextTarget?.label ?? "ALL MEDALS COMPLETE"}</strong><span>{practiceNextTarget?.description ?? "CHASE A NEW HIGH SCORE"} · {projectedNextMasteryReward ? `NEXT REWARD ${projectedNextMasteryReward.label} @${projectedNextMasteryReward.threshold}◆` : "SKY MASTER COMPLETE"}</span></div>\n''',
)
replace_once(
    mode,
    '''              <button onClick={restart}><strong>{snapshot.mode === "stage-practice" ? "RETRY STAGE" : "NEW ARCADE RUN"}</strong><span>{snapshot.mode === "stage-practice" && practiceNextTarget ? `CHASE ${practiceNextTarget.label}` : "FLY AGAIN"}</span></button>\n''',
    '''              <button onClick={restart}><strong>{snapshot.mode === "stage-practice" ? "RETRY STAGE" : "NEW ARCADE RUN"}</strong><span>{snapshot.mode === "stage-practice" ? `${practiceNextTarget ? `CHASE ${practiceNextTarget.label}` : "FLY AGAIN"} · ${projectedNextMasteryReward ? `${projectedNextMasteryReward.shortLabel} @${projectedNextMasteryReward.threshold}◆` : "SKY MASTER"}` : "FLY AGAIN"}</span></button>\n''',
)

tests = "tests/sky-arcade-run.test.ts"
replace_once(
    tests,
    'import { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\n',
    '''import { skyDancerArcadeV11StageMedalGoals } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\nimport {\n  SKY_DANCER_ARCADE_MASTERY_REWARDS,\n  SKY_DANCER_ARCADE_MAX_MEDALS,\n  skyDancerArcadeMasteryUnlocks,\n  skyDancerArcadeNextMasteryReward,\n} from "../src/sky/arcade/SkyDancerArcadeProgress";\n''',
)
Path(tests).write_text(Path(tests).read_text() + '''\n\ntest("V11.5 mastery rewards turn the 33-medal chase into a deterministic unlock track", async () => {\n  assert.equal(SKY_DANCER_ARCADE_MAX_MEDALS, 33);\n  assert.deepEqual(SKY_DANCER_ARCADE_MASTERY_REWARDS.map((reward) => reward.threshold), [6, 12, 18, 24, 30, 33]);\n  assert.equal(skyDancerArcadeNextMasteryReward(0)?.label, "SUNSET PAINT");\n  assert.equal(skyDancerArcadeNextMasteryReward(6)?.label, "MISSILE FOCUS");\n  assert.equal(skyDancerArcadeNextMasteryReward(33), null);\n  assert.deepEqual(skyDancerArcadeMasteryUnlocks(5), { paintSchemes: [], loadouts: [] });\n  assert.deepEqual(skyDancerArcadeMasteryUnlocks(30), {\n    paintSchemes: ["sunset", "storm", "prism"],\n    loadouts: ["missile-focus", "gun-focus"],\n  });\n  const [menuSource, resultSource] = await Promise.all([\n    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),\n  ]);\n  assert.match(menuSource, /MASTERY \$\{arcadeMeta\.totalMedals\}\/\$\{SKY_DANCER_ARCADE_MAX_MEDALS\}/);\n  assert.match(menuSource, /PILOT REWARD/);\n  assert.match(resultSource, /projectedNextMasteryReward/);\n  assert.match(resultSource, /SKY MASTER COMPLETE/);\n});\n''')

print("V11.5 mastery rewards patch applied")
