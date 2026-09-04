import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, text) {
  fs.writeFileSync(path, text);
}

function replaceOnce(path, oldText, newText, unique = "") {
  let text = read(path);
  if (unique && text.includes(unique)) return;
  if (!text.includes(oldText)) {
    if (text.includes(newText)) return;
    throw new Error(`replacement marker missing: ${path}`);
  }
  write(path, text.replace(oldText, newText));
}

function insertAfter(path, marker, addition, unique) {
  let text = read(path);
  if (text.includes(unique)) return;
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`insertion marker missing: ${path}`);
  const end = index + marker.length;
  write(path, text.slice(0, end) + addition + text.slice(end));
}

// V46 is the campaign-mode enemy shaper. It rewrites live archetype/kind every
// frame, which correctly owns campaign missions but must not overwrite SKY RAID's
// five Act-specific doctrine packages.
insertAfter(
  "src/sky/SkyDancerCombatChoreographyV46.ts",
  `export const SKY_DANCER_CHOREOGRAPHY_MAX_ACTIVE_THREATS_V46 = 5;\n`,
  `\nfunction skyDancerCampaignOwnsEnemyShapeV23(): boolean {\n  return typeof document === "undefined" || document.documentElement.dataset.skyDancerMode !== "sky-raid";\n}\n`,
  "skyDancerCampaignOwnsEnemyShapeV23",
);

replaceOnce(
  "src/sky/SkyDancerCombatChoreographyV46.ts",
  `    const mission = getSkyDancerMissionV49(stage.stage);\n    if (mission) {\n      const { beat } = getSkyDancerMissionBeatV49(mission, Math.min(stage.stageKills, mission.killTarget));\n      shapeFormation(this, stage, beat, mission.activeThreatTarget, state);\n      retireLegacyReinforcements(this, stage, mission.killTarget, state);\n    }\n    publishCampaign(concrete, state, stage, delta);`,
  `    const mission = getSkyDancerMissionV49(stage.stage);\n    // Campaign choreography owns enemy archetype conversion in campaign mode.\n    // SKY RAID has its own V23 Act doctrine and must remain the final roster owner.\n    if (mission && skyDancerCampaignOwnsEnemyShapeV23()) {\n      const { beat } = getSkyDancerMissionBeatV49(mission, Math.min(stage.stageKills, mission.killTarget));\n      shapeFormation(this, stage, beat, mission.activeThreatTarget, state);\n      retireLegacyReinforcements(this, stage, mission.killTarget, state);\n    }\n    publishCampaign(concrete, state, stage, delta);`,
  "if (mission && skyDancerCampaignOwnsEnemyShapeV23())",
);

const testPath = "tests/sky-sky-raid.test.ts";
let tests = read(testPath);
const unique = "SKY RAID owns enemy archetypes instead of campaign choreography";
if (!tests.includes(unique)) {
  const marker = `test("SKY RAID re-seeds the inherited live Hunt population at each Act boundary without phantom defeats", () => {`;
  const at = tests.indexOf(marker);
  if (at < 0) throw new Error("test insertion marker missing");
  const addition = `test("SKY RAID owns enemy archetypes instead of campaign choreography", () => {\n  const source = readFileSync(new URL("../src/sky/SkyDancerCombatChoreographyV46.ts", import.meta.url), "utf8");\n  assert.match(source, /skyDancerCampaignOwnsEnemyShapeV23/);\n  assert.match(source, /dataset\\.skyDancerMode !== "sky-raid"/);\n  assert.match(source, /if \\(mission && skyDancerCampaignOwnsEnemyShapeV23\\(\\)\\)/);\n});\n\n`;
  tests = tests.slice(0, at) + addition + tests.slice(at);
  write(testPath, tests);
}

for (const path of ["src/sky/SkyDancerCombatChoreographyV46.ts", testPath]) {
  if (read(path).includes("\0")) throw new Error(`NUL byte leaked into ${path}`);
}
