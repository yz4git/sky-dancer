import fs from 'node:fs';

const path = 'app/SkyDancerArcadeMode.tsx';
let text = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText) {
  if (!text.includes(oldText)) throw new Error(`Missing V11.4 lint-fix anchor: ${oldText.slice(0, 72)}`);
  text = text.replace(oldText, newText);
}

replaceOnce('import type { SkyDancerArcadeV11MedalId } from "../src/sky/arcade/SkyDancerArcadeV11Scoring";\n', '');
replaceOnce(
  '  const [stick, setStick] = useState({ x: 0, y: 0 });\n  const [masteredMedals, setMasteredMedals] = useState<SkyDancerArcadeV11MedalId[]>([]);\n',
  '  const [stick, setStick] = useState({ x: 0, y: 0 });\n',
);
replaceOnce(
  '    setRendererName("WEBGL");\n    setRuntimeMessage(null);\n    if (runtimeOptions.mode === "stage-practice" && runtimeOptions.startStageId) {\n      setMasteredMedals(loadSkyDancerArcadeProgress().records[runtimeOptions.startStageId]?.medals ?? []);\n    } else {\n      setMasteredMedals([]);\n    }\n    mount.replaceChildren();\n',
  '    setRendererName("WEBGL");\n    setRuntimeMessage(null);\n    mount.replaceChildren();\n',
);
replaceOnce(
  '    const progress = recordSkyDancerArcadeStageClear(\n      snapshot.lastClearedStageId,\n      snapshot.lastStageScore,\n      snapshot.lastStageRank,\n      snapshot.lastStageNoDamage,\n      snapshot.lastStageMedals.filter(medal => medal.earned).map(medal => medal.id),\n    );\n    setMasteredMedals(progress.records[snapshot.lastClearedStageId]?.medals ?? []);\n',
  '    recordSkyDancerArcadeStageClear(\n      snapshot.lastClearedStageId,\n      snapshot.lastStageScore,\n      snapshot.lastStageRank,\n      snapshot.lastStageNoDamage,\n      snapshot.lastStageMedals.filter(medal => medal.earned).map(medal => medal.id),\n    );\n',
);
replaceOnce(
  '  const controlsVisible = snapshot.status === "running";\n  const finalOverlay = snapshot.status === "run-clear" || snapshot.status === "practice-clear" || snapshot.status === "game-over";\n  const practiceMasteryCount = snapshot.lastStageMedals.filter((medal) => masteredMedals.includes(medal.id) || medal.earned).length;\n  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !masteredMedals.includes(medal.id) && !medal.earned);\n',
  '  const controlsVisible = snapshot.status === "running";\n  const finalOverlay = snapshot.status === "run-clear" || snapshot.status === "practice-clear" || snapshot.status === "game-over";\n  const persistedPracticeMedals = runtimeOptions.mode === "stage-practice" && runtimeOptions.startStageId\n    ? loadSkyDancerArcadeProgress().records[runtimeOptions.startStageId]?.medals ?? []\n    : [];\n  const practiceMasteryCount = snapshot.lastStageMedals.filter((medal) => persistedPracticeMedals.includes(medal.id) || medal.earned).length;\n  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !persistedPracticeMedals.includes(medal.id) && !medal.earned);\n',
);
text = text.replaceAll('masteredMedals.includes(medal.id) || medal.earned', 'persistedPracticeMedals.includes(medal.id) || medal.earned');

fs.writeFileSync(path, text);
