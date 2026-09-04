import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, text) {
  fs.writeFileSync(path, text);
}

const stagePath = "src/sky/SkyDancerStageCycle.ts";
let stage = read(stagePath);
const guard = `    // SKY RAID owns its own two-minute Act progression and needs the complete\n    // Turbo Hunt aircraft pool so V23 can select real class-specific airframes.\n    // Campaign StageCycle remains unchanged for every other mode.\n    if (typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid") {\n      previous.call(this, input, fixedDelta);\n      return;\n    }\n`;
if (!stage.includes("SKY RAID owns its own two-minute Act progression")) {
  const pattern = /(prototype\.step = function skyDancerStageCycleStep\([\s\S]*?\): void \{\n)/;
  if (!pattern.test(stage)) throw new Error("StageCycle wrapper marker missing");
  stage = stage.replace(pattern, `$1${guard}`);
  write(stagePath, stage);
}

const testPath = "tests/sky-sky-raid.test.ts";
let tests = read(testPath);
const unique = "SKY RAID bypasses campaign StageCycle population truncation";
if (!tests.includes(unique)) {
  const marker = `test("SKY RAID owns enemy archetypes instead of campaign choreography", () => {`;
  const at = tests.indexOf(marker);
  if (at < 0) throw new Error("SKY RAID test insertion marker missing");
  const addition = `test("SKY RAID bypasses campaign StageCycle population truncation", () => {\n  const source = readFileSync(new URL("../src/sky/SkyDancerStageCycle.ts", import.meta.url), "utf8");\n  assert.match(source, /dataset\\.skyDancerMode === "sky-raid"/);\n  assert.match(source, /previous\\.call\\(this, input, fixedDelta\\);\\n      return;/);\n  assert.match(source, /session\\.enemies\\.splice\\(0, session\\.enemies\\.length, \\.\\.\\.initialActive, \\.\\.\\.dormantBoss\\)/);\n});\n\n`;
  tests = tests.slice(0, at) + addition + tests.slice(at);
  write(testPath, tests);
}

for (const path of [stagePath, testPath]) {
  if (read(path).includes("\0")) throw new Error(`NUL byte leaked into ${path}`);
}
