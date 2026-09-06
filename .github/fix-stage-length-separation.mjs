import fs from 'node:fs';

function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  return source.replace(from, to);
}

const stagePath = 'src/sky/SkyDancerStageCycle.ts';
let stage = fs.readFileSync(stagePath, 'utf8');
stage = replaceOnce(stage,
  'export const SKY_DANCER_STAGE_BASE_KILLS = 18;',
  'export const SKY_DANCER_STAGE_BASE_KILLS = 36;',
  'double base kill target');
stage = replaceOnce(stage,
  'export const SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS = 42;',
  'export const SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS = 84;',
  'double minimum combat time');
stage = replaceOnce(stage,
  'return Math.min(34, SKY_DANCER_STAGE_BASE_KILLS + Math.max(0, stage - 1) * 4);',
  'return Math.min(68, SKY_DANCER_STAGE_BASE_KILLS + Math.max(0, stage - 1) * 8);',
  'double kill progression curve');
stage = replaceOnce(stage,
  'return Math.min(58, SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS + Math.max(0, stage - 1) * 4);',
  'return Math.min(116, SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS + Math.max(0, stage - 1) * 8);',
  'double combat-time progression curve');

const oldSpawn = `  const serial = state.spawnSerial++;\n  const slotOffsets = [-0.92, -0.58, -0.26, 0.22, 0.56, 0.9, 1.28, -1.28] as const;\n  const angle = session.car.heading + slotOffsets[serial % slotOffsets.length] + ((state.stage + serial) % 3 - 1) * 0.07;\n  const distance = 25 + (serial % 4) * 5.5;`;
const newSpawn = `  const serial = state.spawnSerial++;\n  const slot = skyDancerStageSpawnSlot(serial);\n  const angle = session.car.heading + slot.angleOffset + ((state.stage + serial) % 3 - 1) * 0.05;\n  const distance = slot.distance;`;
stage = replaceOnce(stage, oldSpawn, newSpawn, 'replace overlapping stage spawn slots');

const spawnHelperAnchor = `export function skyDancerStageActiveEnemyTarget(stage: number): number {\n  return Math.min(10, 6 + Math.floor(Math.max(0, stage - 1) / 2));\n}\n`;
const spawnHelper = `${spawnHelperAnchor}\nexport function skyDancerStageSpawnSlot(serial: number): { angleOffset: number; distance: number } {\n  const slot = ((Math.floor(serial) % 12) + 12) % 12;\n  const side = slot % 2 === 0 ? -1 : 1;\n  const rank = Math.floor(slot / 2);\n  return {\n    angleOffset: side * (0.34 + rank * 0.22),\n    distance: 28 + (slot % 3) * 7 + Math.floor(slot / 6) * 4,\n  };\n}\n`;
stage = replaceOnce(stage, spawnHelperAnchor, spawnHelper, 'add twelve-slot spawn fan');
fs.writeFileSync(stagePath, stage);

const mathPath = 'src/sky/SkyDancerFlightAvoidanceMath.ts';
let math = fs.readFileSync(mathPath, 'utf8');
math = replaceOnce(math,
  'export const SKY_DANCER_PLAYER_BODY_RADIUS = 1.45;\n',
  'export const SKY_DANCER_PLAYER_BODY_RADIUS = 1.45;\nexport const SKY_DANCER_ENEMY_PAIR_MIN_SPACING = 6.4;\nexport const SKY_DANCER_ENEMY_PAIR_BODY_CLEARANCE = 3.6;\n',
  'add enemy pair spacing constants');
const mathAnchor = `export function skyDancerEnemySafetyRadius(enemyRadius: number): number {\n  return SKY_DANCER_PLAYER_BODY_RADIUS + Math.max(0.5, enemyRadius) + SKY_DANCER_ENEMY_HARD_CLEARANCE;\n}\n`;
const mathInsert = `${mathAnchor}\nexport function skyDancerEnemyPairMinimumSeparation(radiusA: number, radiusB: number): number {\n  return Math.max(\n    SKY_DANCER_ENEMY_PAIR_MIN_SPACING,\n    Math.max(0.5, radiusA) + Math.max(0.5, radiusB) + SKY_DANCER_ENEMY_PAIR_BODY_CLEARANCE,\n  );\n}\n\nexport function skyDancerEnemyPairHorizontalClearance(\n  radiusA: number,\n  radiusB: number,\n  verticalSeparation: number,\n): number {\n  const desired = skyDancerEnemyPairMinimumSeparation(radiusA, radiusB);\n  const vertical = Math.abs(verticalSeparation);\n  if (vertical >= desired) return 0;\n  return Math.sqrt(Math.max(0, desired * desired - vertical * vertical));\n}\n`;
math = replaceOnce(math, mathAnchor, mathInsert, 'add enemy pair clearance math');
fs.writeFileSync(mathPath, math);

const avoidancePath = 'src/sky/SkyDancerFlightAvoidance.ts';
let avoidance = fs.readFileSync(avoidancePath, 'utf8');
avoidance = replaceOnce(avoidance,
  '  skyDancerEnemySafetyRadius,\n  skyDancerNormalizeAngle,',
  '  skyDancerEnemySafetyRadius,\n  skyDancerEnemyPairHorizontalClearance,\n  skyDancerNormalizeAngle,',
  'import pair spacing math');
const pairFunctionAnchor = `function turnRate(enemy: CartEnemyState): number {\n  if (enemy.kind === "boss") return 0.9;\n  if (enemy.kind === "heavy") return 1.0;\n  if (enemy.archetype === "drifter") return 1.5;\n  if (enemy.archetype === "striker") return 1.34;\n  return 1.2;\n}\n`;
const pairFunction = `${pairFunctionAnchor}\nfunction stablePairDirection(a: string, b: string): { x: number; z: number } {\n  const key = a < b ? a + '|' + b : b + '|' + a;\n  let hash = 2166136261;\n  for (let index = 0; index < key.length; index += 1) {\n    hash ^= key.charCodeAt(index);\n    hash = Math.imul(hash, 16777619);\n  }\n  const angle = ((hash >>> 0) / 0xffffffff) * Math.PI * 2;\n  return { x: Math.sin(angle), z: Math.cos(angle) };\n}\n\nfunction applyEnemyPairSeparation(session: AvoidanceSessionView, delta: number): void {\n  const nodeId = session.location.node.id;\n  const bounds = session.location.node.rect;\n  const active = session.enemies.filter((enemy) => enemy.alive && enemy.nodeId === nodeId);\n\n  for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {\n    const left = active[leftIndex];\n    for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {\n      const right = active[rightIndex];\n      const verticalSeparation = getSkyDancerEnemyAltitudeMetersV43(left) - getSkyDancerEnemyAltitudeMetersV43(right);\n      const minimumHorizontal = skyDancerEnemyPairHorizontalClearance(left.radius, right.radius, verticalSeparation);\n      if (minimumHorizontal <= 0) continue;\n\n      let dx = right.x - left.x;\n      let dz = right.z - left.z;\n      let distance = Math.hypot(dx, dz);\n      if (distance >= minimumHorizontal) continue;\n      if (distance < 0.001) {\n        const stable = stablePairDirection(left.id, right.id);\n        dx = stable.x;\n        dz = stable.z;\n        distance = 1;\n      }\n\n      const nx = dx / distance;\n      const nz = dz / distance;\n      const overlap = minimumHorizontal - distance;\n      const leftBoss = left.kind === 'boss';\n      const rightBoss = right.kind === 'boss';\n      const correctionBudget = Math.min(overlap, 14 * delta);\n      const leftMove = leftBoss ? 0 : rightBoss ? correctionBudget : correctionBudget * 0.5;\n      const rightMove = rightBoss ? 0 : leftBoss ? correctionBudget : correctionBudget * 0.5;\n\n      left.x -= nx * leftMove;\n      left.z -= nz * leftMove;\n      right.x += nx * rightMove;\n      right.z += nz * rightMove;\n\n      if (!leftBoss) {\n        const away = Math.atan2(-nx, -nz);\n        left.heading = skyDancerRotateToward(left.heading, away, turnRate(left) * 1.25 * delta);\n      }\n      if (!rightBoss) {\n        const away = Math.atan2(nx, nz);\n        right.heading = skyDancerRotateToward(right.heading, away, turnRate(right) * 1.25 * delta);\n      }\n    }\n  }\n\n  const margin = 2.4;\n  for (const enemy of active) {\n    enemy.x = skyDancerClamp(enemy.x, bounds.centerX - bounds.halfWidth + margin, bounds.centerX + bounds.halfWidth - margin);\n    enemy.z = skyDancerClamp(enemy.z, bounds.centerZ - bounds.halfDepth + margin, bounds.centerZ + bounds.halfDepth - margin);\n  }\n}\n`;
avoidance = replaceOnce(avoidance, pairFunctionAnchor, pairFunction, 'add runtime pair separation');
avoidance = replaceOnce(avoidance,
  '    applyCollisionAvoidance(this as unknown as AvoidanceSessionView, delta);\n',
  '    applyCollisionAvoidance(this as unknown as AvoidanceSessionView, delta);\n    applyEnemyPairSeparation(this as unknown as AvoidanceSessionView, delta);\n',
  'run pair separation after player avoidance');
fs.writeFileSync(avoidancePath, avoidance);

const runtimeTestPath = 'tests/sky-flight-runtime.test.ts';
let runtimeTest = fs.readFileSync(runtimeTestPath, 'utf8');
runtimeTest = replaceOnce(runtimeTest,
  '  skyDancerStageReinforcementsComplete,\n} from "../src/sky/SkyDancerStageCycle";',
  '  skyDancerStageReinforcementsComplete,\n  skyDancerStageSpawnSlot,\n} from "../src/sky/SkyDancerStageCycle";',
  'import spawn slot helper');
runtimeTest = replaceOnce(runtimeTest,
  '  assert.equal(skyDancerStageKillTarget(1), SKY_DANCER_STAGE_BASE_KILLS);\n  assert.ok(skyDancerStageKillTarget(2) > skyDancerStageKillTarget(1));\n  assert.ok(skyDancerStageKillTarget(5) >= skyDancerStageKillTarget(2));\n  assert.equal(skyDancerStageKillTarget(99), skyDancerStageKillTarget(5));',
  '  assert.equal(SKY_DANCER_STAGE_BASE_KILLS, 36);\n  assert.equal(skyDancerStageKillTarget(1), 36);\n  assert.equal(skyDancerStageKillTarget(2), 44);\n  assert.equal(skyDancerStageKillTarget(5), 68);\n  assert.equal(skyDancerStageKillTarget(99), 68);',
  'lock doubled kill targets');
runtimeTest = replaceOnce(runtimeTest,
  '  assert.equal(minimum, SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS);',
  '  assert.equal(SKY_DANCER_STAGE_MIN_REINFORCEMENT_SECONDS, 84);\n  assert.equal(minimum, 84);\n  assert.equal(skyDancerStageMinimumReinforcementSeconds(2), 92);\n  assert.equal(skyDancerStageMinimumReinforcementSeconds(5), 116);',
  'lock doubled combat floor');
runtimeTest = replaceOnce(runtimeTest,
  '  assert.equal(skyDancerStageMinimumReinforcementSeconds(99), 58);',
  '  assert.equal(skyDancerStageMinimumReinforcementSeconds(99), 116);',
  'update combat-time cap');
const spawnTestAnchor = `test("re-engagement geometry remains inside the missile lock envelope", () => {`;
const spawnTest = `test("stage reinforcement spawn fan keeps simultaneous aircraft from sharing a slot", () => {\n  const points = Array.from({ length: 10 }, (_, serial) => {\n    const slot = skyDancerStageSpawnSlot(serial);\n    return { x: Math.sin(slot.angleOffset) * slot.distance, z: Math.cos(slot.angleOffset) * slot.distance };\n  });\n  let minimum = Number.POSITIVE_INFINITY;\n  for (let left = 0; left < points.length; left += 1) {\n    for (let right = left + 1; right < points.length; right += 1) {\n      minimum = Math.min(minimum, Math.hypot(points[left].x - points[right].x, points[left].z - points[right].z));\n    }\n  }\n  assert.ok(minimum > 7.5, \`spawn fan minimum spacing was \${minimum.toFixed(2)}m\`);\n});\n\n${spawnTestAnchor}`;
runtimeTest = replaceOnce(runtimeTest, spawnTestAnchor, spawnTest, 'add stage spawn-spacing regression');
fs.writeFileSync(runtimeTestPath, runtimeTest);

const rulesTestPath = 'tests/sky-rules.test.ts';
let rulesTest = fs.readFileSync(rulesTestPath, 'utf8');
rulesTest = replaceOnce(rulesTest,
  '  skyDancerEnemySafetyRadius,\n  skyDancerNormalizeAngle,',
  '  skyDancerEnemySafetyRadius,\n  skyDancerEnemyPairHorizontalClearance,\n  skyDancerEnemyPairMinimumSeparation,\n  skyDancerNormalizeAngle,',
  'import pair spacing rules');
rulesTest += `\n\ntest("enemy pair spacing keeps same-altitude aircraft visually separated", () => {\n  const standard = skyDancerEnemyPairMinimumSeparation(1.4, 1.4);\n  assert.ok(standard >= 6.4);\n  assert.equal(skyDancerEnemyPairHorizontalClearance(1.4, 1.4, 0), standard);\n  assert.ok(skyDancerEnemyPairHorizontalClearance(1.4, 1.4, 4) < standard);\n  assert.equal(skyDancerEnemyPairHorizontalClearance(1.4, 1.4, standard), 0);\n  assert.ok(skyDancerEnemyPairMinimumSeparation(2.4, 2.4) > standard);\n});\n`;
fs.writeFileSync(rulesTestPath, rulesTest);

console.log('Applied doubled stage pacing and enemy separation fixes.');
