import fs from "node:fs";
import ts from "typescript";

const path = "tests/sky-sky-raid.test.ts";
let source = fs.readFileSync(path, "utf8");
const beforeBytes = Buffer.byteLength(source);
const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const keepSourceContracts = new Set([
  "SKY RAID publishes mode ownership before the first inherited population step",
  "SKY RAID bootstraps Hunt gameplay without rebuilding the legacy Hunt world",
  "SKY RAID V34 gives iPhone stick input one direct owner with redundant neutral release paths",
]);
const removeEvenWithoutSourceRead = new Set([
  "SKY RAID maps every act to a visibly distinct surface world",
]);

const removals = [];
const removedTitles = [];
for (const statement of parsed.statements) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
  const call = statement.expression;
  if (!ts.isIdentifier(call.expression) || call.expression.text !== "test") continue;
  const first = call.arguments[0];
  if (!first || !ts.isStringLiteral(first)) continue;
  const title = first.text;
  const block = statement.getText(parsed);
  const sourceSnapshot = block.includes("readFileSync(");
  if (!removeEvenWithoutSourceRead.has(title) && (!sourceSnapshot || keepSourceContracts.has(title))) continue;
  removals.push([statement.getFullStart(), statement.getEnd()]);
  removedTitles.push(title);
}

for (const [start, end] of removals.reverse()) {
  source = source.slice(0, start) + "\n" + source.slice(end);
}

source = source.replace(
  'test("SKY RAID V34 gives iPhone stick input one direct owner with redundant neutral release paths"',
  'test("SKY RAID iPhone stick input has one direct owner with redundant neutral release paths"',
);

const behaviorRescues = `

test("SKY RAID caps live phone density by act", () => {
  assert.deepEqual(
    SKY_DANCER_SKY_RAID_ACTS.map((act) => skyDancerSkyRaidEnemyDoctrine(act.id).activeTargetCount),
    [6, 6, 7, 7, 7],
  );
});

test("SKY RAID free-flight chain window supports bank, reacquire and relock", () => {
  assert.ok(SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS >= 5);
  assert.ok(SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS < 7);
});

test("SKY RAID flagship cue remains a bounded entrance window", () => {
  const trigger = SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS;
  assert.equal(skyDancerSkyRaidBossCueActive(trigger - 0.01, true), false);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger, true), true);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger + SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS - 0.01, true), true);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger + SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS, true), false);
  assert.equal(skyDancerSkyRaidBossCueActive(trigger, false), false);
});

test("SKY RAID opening acts and immediate BREAK pacing stay deterministic", () => {
  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 90);
  assert.equal(SKY_DANCER_SKY_RAID_OPENING_ACT_SECONDS, 120);
  assert.equal(SKY_DANCER_SKY_RAID_OPENING_BREAK_MIN_SECONDS, 0);
  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 510);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [120, 120, 90, 90, 90]);
  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [20, 22, 18, 20, 20]);
  assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 450);
  for (const second of [8, 31, 53, 75, 97]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), true);
  for (const second of [20, 44, 66, 88, 108]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 19), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(12, SKY_DANCER_SKY_RAID_ACTS[0], 20), true);
  assert.equal(skyDancerSkyRaidActBreakEligible(132, SKY_DANCER_SKY_RAID_ACTS[1], 21), false);
  assert.equal(skyDancerSkyRaidActBreakEligible(132, SKY_DANCER_SKY_RAID_ACTS[1], 22), true);
});

test("SKY RAID grades runs and scores Formation Rush mastery", () => {
  assert.equal(SKY_DANCER_SKY_RAID_PERFECT_RUSH_KILLS, 4);
  assert.equal(skyDancerSkyRaidRank(19_999, 5, 12, 12), "C");
  assert.equal(skyDancerSkyRaidRank(20_000, 0, 0, 0), "B");
  assert.equal(skyDancerSkyRaidRank(30_000, 3, 3, 0), "A");
  assert.equal(skyDancerSkyRaidRank(40_000, 4, 8, 4), "S");
  assert.equal(skyDancerSkyRaidRank(50_000, 5, 10, 8), "S+");
  assert.equal(skyDancerSkyRaidRushActive(450, SKY_DANCER_SKY_RAID_ACTS[4]), false);
});
`;

if (!source.includes('test("SKY RAID caps live phone density by act"')) source += behaviorRescues;
source = source.replace(/\n{4,}/g, "\n\n\n");
source = source.trimEnd() + "\n";

const finalParsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const sourceContractTitles = [];
const versionedTitles = [];
for (const statement of finalParsed.statements) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
  const call = statement.expression;
  if (!ts.isIdentifier(call.expression) || call.expression.text !== "test") continue;
  const first = call.arguments[0];
  if (!first || !ts.isStringLiteral(first)) continue;
  const title = first.text;
  const block = statement.getText(finalParsed);
  if (block.includes("readFileSync(")) sourceContractTitles.push(title);
  if (/^SKY RAID V\d+/.test(title)) versionedTitles.push(title);
}

const expectedSourceContracts = [
  "SKY RAID publishes mode ownership before the first inherited population step",
  "SKY RAID bootstraps Hunt gameplay without rebuilding the legacy Hunt world",
  "SKY RAID iPhone stick input has one direct owner with redundant neutral release paths",
].sort();
if (JSON.stringify(sourceContractTitles.sort()) !== JSON.stringify(expectedSourceContracts)) {
  throw new Error(`Unexpected source-text contracts: ${sourceContractTitles.join(" | ")}`);
}
if (versionedTitles.length > 0) throw new Error(`Historical SKY RAID test labels remain: ${versionedTitles.join(" | ")}`);

fs.writeFileSync(path, source);

const readmePath = "tests/README.md";
let readme = fs.readFileSync(readmePath, "utf8");
const policy = "SKY RAID source-text coverage is limited to mode ownership/bootstrap and iPhone input-release safety. Combat tuning, pacing, scoring, flight identity, density and presentation must be covered through exported rules/runtime behavior or browser/WebGL audits.";
if (!readme.includes(policy)) {
  readme = readme.trimEnd() + `\n\n${policy}\n`;
  fs.writeFileSync(readmePath, readme);
}

console.log(`Removed ${removedTitles.length} SKY RAID source-snapshot/duplicate tests.`);
for (const title of removedTitles) console.log(`- ${title}`);
console.log(`SKY RAID test bytes: ${beforeBytes} -> ${Buffer.byteLength(source)}`);
console.log(`Retained source contracts: ${sourceContractTitles.length}`);
