import fs from "node:fs";
import ts from "typescript";

const path = "tests/sky-arcade-run.test.ts";
let source = fs.readFileSync(path, "utf8");
const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const removals = [];
const removedTitles = [];
for (const statement of parsed.statements) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
  const call = statement.expression;
  if (!ts.isIdentifier(call.expression) || call.expression.text !== "test") continue;
  const block = statement.getText(parsed);
  if (!block.includes("readFile(")) continue;
  const first = call.arguments[0];
  const title = first && ts.isStringLiteral(first) ? first.text : "unnamed source snapshot";
  removals.push([statement.getFullStart(), statement.getEnd()]);
  removedTitles.push(title);
}

for (const [start, end] of removals.reverse()) {
  source = source.slice(0, start) + "\n" + source.slice(end);
}
source = source.replace('import { readFile } from "node:fs/promises";\n', "");

// Historical pass numbers are not part of the behavior contract.
source = source.replace(/test\("V\d+(?:\.\d+)*\s+/g, 'test("');

const replacements = `

test("dogfight choreography includes close-bank, overtake, parallel and rear-to-front passes", () => {
  assert.ok(Math.min(...SKY_DANCER_ARCADE_STAGES.map((stage) => stage.courseSpeed)) >= 80);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  const seen = new Set<string>();
  const rearIds = new Set<number>();
  let rearToFront = false;
  let closeSamples = 0;
  for (let frame = 0; frame < 780; frame += 1) {
    const snapshot = runtime.getSnapshot();
    for (const enemy of snapshot.enemies) {
      if (enemy.boss) continue;
      seen.add(enemy.maneuver);
      if (enemy.depth > 4 && enemy.depth < 24) closeSamples += 1;
      if (enemy.maneuver === "overtake" && enemy.depth < 0) rearIds.add(enemy.id);
      if (rearIds.has(enemy.id) && enemy.depth > 12) rearToFront = true;
    }
    runtime.step(1 / 60);
    if (runtime.getSnapshot().status !== "running") break;
  }
  assert.ok(seen.has("close-bank"));
  assert.ok(seen.has("overtake"));
  assert.ok(seen.has("parallel"));
  assert.ok(rearToFront);
  assert.ok(closeSamples >= 120);
});

test("close cross-pass choreography preserves a readable separation", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 0x5f3759df });
  let minCrossPassSeparation = Number.POSITIVE_INFINITY;
  for (let frame = 0; frame < 1500; frame += 1) {
    const snapshot = runtime.getSnapshot();
    for (const enemy of snapshot.enemies) {
      if (enemy.boss || enemy.maneuver !== "cross-pass" || enemy.depth >= 18) continue;
      minCrossPassSeparation = Math.min(
        minCrossPassSeparation,
        Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY),
      );
    }
    runtime.step(1 / 60);
    if (runtime.getSnapshot().status !== "running") break;
  }
  assert.ok(Number.isFinite(minCrossPassSeparation));
  assert.ok(minCrossPassSeparation >= 0.58, "cross-pass separation " + minCrossPassSeparation);
});

test("mastery rewards form a deterministic 33-medal unlock track", () => {
  assert.equal(SKY_DANCER_ARCADE_MAX_MEDALS, 33);
  assert.deepEqual(SKY_DANCER_ARCADE_MASTERY_REWARDS.map((reward) => reward.threshold), [6, 12, 18, 24, 30, 33]);
  assert.equal(skyDancerArcadeNextMasteryReward(0)?.label, "SUNSET PAINT");
  assert.equal(skyDancerArcadeNextMasteryReward(6)?.label, "MISSILE FOCUS");
  assert.equal(skyDancerArcadeNextMasteryReward(33), null);
  assert.deepEqual(skyDancerArcadeMasteryUnlocks(5), { paintSchemes: [], loadouts: [] });
  assert.deepEqual(skyDancerArcadeMasteryUnlocks(30), {
    paintSchemes: ["sunset", "storm", "prism"],
    loadouts: ["missile-focus", "gun-focus"],
  });
});

test("hangar loadout and paint selections change the actual sortie profile", () => {
  const standard = new SkyDancerArcadeRuntime({
    difficulty: "normal",
    mode: "stage-practice",
    startStageId: "dawn-city",
    loadout: "standard",
    paintScheme: "default",
    seed: 116,
  });
  const gun = new SkyDancerArcadeRuntime({
    difficulty: "normal",
    mode: "stage-practice",
    startStageId: "dawn-city",
    loadout: "gun-focus",
    paintScheme: "prism",
    seed: 116,
  });
  standard.setFire(true);
  gun.setFire(true);
  for (let frame = 0; frame < 60; frame += 1) {
    standard.step(1 / 60);
    gun.step(1 / 60);
  }
  assert.equal(gun.getSnapshot().paintScheme, "prism");
  assert.equal(gun.getSnapshot().loadout, "gun-focus");
  assert.ok(gun.getSnapshot().shotSerial > standard.getSnapshot().shotSerial);
});
`;

if (!source.includes('test("dogfight choreography includes close-bank')) source += replacements;
source = source.replace(/\n{4,}/g, "\n\n\n");
fs.writeFileSync(path, source.trimEnd() + "\n");

const readmePath = "tests/README.md";
let readme = fs.readFileSync(readmePath, "utf8");
if (!readme.includes("Arcade runtime rule")) {
  readme += "\nArcade runtime rule: do not inspect production TSX/CSS/source files with regex to prove visual implementation details. Test exported math/runtime behavior in Node and leave visual composition, object naming, CSS placement, and rendering ownership to the WebGL/browser audit workflows.\n";
  fs.writeFileSync(readmePath, readme);
}

console.log(`Removed ${removedTitles.length} source-snapshot Arcade tests:`);
for (const title of removedTitles) console.log(`- ${title}`);
