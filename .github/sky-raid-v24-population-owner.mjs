import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`${path}: patch marker missing`);
  fs.writeFileSync(path, source.replace(before, after));
}

replaceOnce(
  "src/sky/SkyDancerEnemyPopulation.ts",
  `interface PopulationSession {\n  enemies: CartEnemyState[];`,
  `interface PopulationSession {\n  enemies: CartEnemyState[];\n  skyDancerSkyRaidActive?: boolean;`,
);

replaceOnce(
  "src/sky/SkyDancerEnemyPopulation.ts",
  `function isSkyRaidMode(): boolean {\n  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";\n}\n`,
  `function isSkyRaidMode(): boolean {\n  return typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";\n}\n\nfunction isSkyRaidSession(session: PopulationSession): boolean {\n  // The SKY RAID session wrapper marks the session before entering the inherited\n  // step stack. This is authoritative on the very first simulation frame, while\n  // the DOM mode dataset can still be one render behind. Falling back to the DOM\n  // keeps presentation-only callers and older entry paths compatible.\n  return session.skyDancerSkyRaidActive === true || isSkyRaidMode();\n}\n`,
);

replaceOnce(
  "src/sky/SkyDancerEnemyPopulation.ts",
  `    const target = isSkyRaidMode()\n      ? regular.length`,
  `    const target = isSkyRaidSession(session)\n      ? regular.length`,
);

replaceOnce(
  "src/sky/SkyDancerEnemyPopulation.ts",
  `  const skyRaid = isSkyRaidMode();\n  for (let index = session.enemies.length - 1; index >= 0; index -= 1) {`,
  `  const skyRaid = isSkyRaidSession(session);\n  for (let index = session.enemies.length - 1; index >= 0; index -= 1) {`,
);

replaceOnce(
  "src/sky/SkyDancerEnemyPopulation.ts",
  `function publishPopulationDiagnostics(session: PopulationSession): void {\n  if (!isSkyRaidMode() || typeof document === "undefined") return;`,
  `function publishPopulationDiagnostics(session: PopulationSession): void {\n  if (!isSkyRaidSession(session) || typeof document === "undefined") return;`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `interface RaidSession {\n  gas: number;`,
  `interface RaidSession {\n  gas: number;\n  skyDancerSkyRaidActive?: boolean;`,
);

replaceOnce(
  "src/sky/SkyDancerSkyRaid.ts",
  `    const skyRaidActive = isSkyRaidMode();\n    const typedSession = this as unknown as CartArenaSession;`,
  `    const skyRaidActive = isSkyRaidMode();\n    // Mark mode ownership before the inherited wrapper stack runs. Population\n    // setup happens inside that stack and must not depend on a later DOM publish.\n    this.skyDancerSkyRaidActive = skyRaidActive;\n    const typedSession = this as unknown as CartArenaSession;`,
);

replaceOnce(
  "tests/sky-sky-raid.test.ts",
  `test("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
  `test("SKY RAID preserves the complete Hunt candidate pool from the first simulation frame", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const populationSource = readFileSync(new URL("../src/sky/SkyDancerEnemyPopulation.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /this\\.skyDancerSkyRaidActive = skyRaidActive/);\n  assert.match(populationSource, /skyDancerSkyRaidActive\\?: boolean/);\n  assert.match(populationSource, /function isSkyRaidSession\\(session: PopulationSession\\)/);\n  assert.match(populationSource, /const target = isSkyRaidSession\\(session\\)/);\n  assert.match(populationSource, /const skyRaid = isSkyRaidSession\\(session\\)/);\n  assert.doesNotMatch(populationSource, /const target = isSkyRaidMode\\(\\)/);\n});\n\ntest("SKY RAID bypasses campaign StageCycle population truncation", () => {`,
);

console.log("SKY RAID V24 population ownership patch applied");
