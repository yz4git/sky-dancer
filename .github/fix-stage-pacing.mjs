import fs from "node:fs";

const stagePath = "src/sky/SkyDancerStageCycle.ts";
let stage = fs.readFileSync(stagePath, "utf8");

stage = stage.replace(
  'export const SKY_DANCER_STAGE_BASE_KILLS = 12;\n',
  'export const SKY_DANCER_STAGE_BASE_KILLS = 18;\nexport const SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS = 42;\n',
);

stage = stage.replace(
  'export function skyDancerStageKillTarget(stage: number): number {\n  return Math.min(28, SKY_DANCER_STAGE_BASE_KILLS + Math.max(0, stage - 1) * 4);\n}\n\nexport function skyDancerStageActiveEnemyTarget(stage: number): number {',
  'export function skyDancerStageKillTarget(stage: number): number {\n  return Math.min(34, SKY_DANCER_STAGE_BASE_KILLS + Math.max(0, stage - 1) * 4);\n}\n\nexport function skyDancerStageMinimumReinforcementSeconds(stage: number): number {\n  return Math.min(58, SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS + Math.max(0, stage - 1) * 4);\n}\n\nexport function skyDancerStageReinforcementsComplete(\n  stage: number,\n  stageElapsedSeconds: number,\n  stageKills: number,\n): boolean {\n  return stageKills >= skyDancerStageKillTarget(stage)\n    && stageElapsedSeconds >= skyDancerStageMinimumReinforcementSeconds(stage);\n}\n\nexport function skyDancerStageActiveEnemyTarget(stage: number): number {',
);

stage = stage.replace(
  '  } else {\n    label = `STAGE ${stage.stage} · DESTROY ${stage.reinforcementTarget} FIGHTERS`;\n    progress = Math.min(stage.reinforcementTarget, stage.stageKills);\n    target = stage.reinforcementTarget;\n  }',
  '  } else {\n    const minimumCombatSeconds = skyDancerStageMinimumReinforcementSeconds(stage.stage);\n    const holdSeconds = Math.max(0, minimumCombatSeconds - state.stageElapsed);\n    if (stage.stageKills >= stage.reinforcementTarget && holdSeconds > 0) {\n      label = `STAGE ${stage.stage} · HOLD AIRSPACE ${Math.ceil(holdSeconds)}s`;\n      progress = Math.min(minimumCombatSeconds, state.stageElapsed);\n      target = minimumCombatSeconds;\n    } else {\n      label = `STAGE ${stage.stage} · DESTROY ${stage.reinforcementTarget} FIGHTERS`;\n      progress = Math.min(stage.reinforcementTarget, stage.stageKills);\n      target = stage.reinforcementTarget;\n    }\n  }',
);

stage = stage.replace(
  '      if (!state.reinforcementsComplete && state.stageKills >= state.reinforcementTarget) {\n        state.reinforcementsComplete = true;',
  '      if (!state.reinforcementsComplete && skyDancerStageReinforcementsComplete(\n        state.stage,\n        state.stageElapsed,\n        state.stageKills,\n      )) {\n        state.reinforcementsComplete = true;',
);

if (!stage.includes('SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS = 42')) throw new Error('minimum reinforcement constant patch failed');
if (!stage.includes('skyDancerStageReinforcementsComplete(')) throw new Error('completion gate patch failed');
if (!stage.includes('HOLD AIRSPACE')) throw new Error('HUD pacing patch failed');
fs.writeFileSync(stagePath, stage);

const testPath = "tests/sky-flight-runtime.test.ts";
let tests = fs.readFileSync(testPath, "utf8");
tests = tests.replace(
  '  SKY_DANCER_STAGE_BASE_KILLS,\n  skyDancerStageActiveEnemyTarget,\n  skyDancerStageKillTarget,\n',
  '  SKY_DANCER_STAGE_BASE_KILLS,\n  SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS,\n  skyDancerStageActiveEnemyTarget,\n  skyDancerStageKillTarget,\n  skyDancerStageMinimumReinforcementSeconds,\n  skyDancerStageReinforcementsComplete,\n',
);

const anchor = `test("stage reinforcement targets scale gradually and cap", () => {\n  assert.equal(skyDancerStageKillTarget(1), SKY_DANCER_STAGE_BASE_KILLS);\n  assert.ok(skyDancerStageKillTarget(2) > skyDancerStageKillTarget(1));\n  assert.ok(skyDancerStageKillTarget(5) >= skyDancerStageKillTarget(2));\n  assert.equal(skyDancerStageKillTarget(99), skyDancerStageKillTarget(5));\n  assert.ok(skyDancerStageActiveEnemyTarget(9) >= skyDancerStageActiveEnemyTarget(1));\n});\n`;
const addition = `${anchor}\ntest("stage progression cannot be rushed by missile kills before the combat floor", () => {\n  const target = skyDancerStageKillTarget(1);\n  const minimum = skyDancerStageMinimumReinforcementSeconds(1);\n  assert.equal(minimum, SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS);\n  assert.equal(skyDancerStageReinforcementsComplete(1, 6, target * 3), false);\n  assert.equal(skyDancerStageReinforcementsComplete(1, minimum - 0.01, target * 3), false);\n  assert.equal(skyDancerStageReinforcementsComplete(1, minimum, target - 1), false);\n  assert.equal(skyDancerStageReinforcementsComplete(1, minimum, target), true);\n  assert.ok(skyDancerStageMinimumReinforcementSeconds(5) > minimum);\n  assert.equal(skyDancerStageMinimumReinforcementSeconds(99), 58);\n});\n`;
if (!tests.includes(anchor)) throw new Error('stage target test anchor missing');
tests = tests.replace(anchor, addition);
fs.writeFileSync(testPath, tests);

console.log('Applied stage pacing gate: 18 kills + 42s minimum, scaling to 58s.');
