import { readFile, writeFile, readdir } from "node:fs/promises";

const runPath = "tests/sky-arcade-run.test.ts";
let runSource = await readFile(runPath, "utf8");
const unusedImport = 'import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";\n';
if (!runSource.includes(unusedImport)) throw new Error("Expected unused Arcade presentation director import was not found");
runSource = runSource.replace(unusedImport, "");
await writeFile(runPath, runSource);

const skyTests = (await readdir("tests")).filter((name) => /^sky-.*\.test\.ts$/.test(name)).sort();
const sourceReaders = [];
for (const name of skyTests) {
  const source = await readFile(`tests/${name}`, "utf8");
  const readFileSyncCount = (source.match(/readFileSync\s*\(/g) ?? []).length;
  const asyncReadCount = (source.match(/\breadFile\s*\(/g) ?? []).length;
  if (readFileSyncCount || asyncReadCount) sourceReaders.push({ name, readFileSyncCount, asyncReadCount });
}

const expected = [
  { name: "sky-flight-runtime.test.ts", readFileSyncCount: 2, asyncReadCount: 0 },
  { name: "sky-sky-raid.test.ts", readFileSyncCount: 5, asyncReadCount: 0 },
];
if (JSON.stringify(sourceReaders) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected sky-* source readers: ${JSON.stringify(sourceReaders)}`);
}

const readmePath = "tests/README.md";
let readme = await readFile(readmePath, "utf8");
const paragraph = "\nCurrent `sky-*` source-text allowlist is intentionally closed: `sky-flight-runtime.test.ts` may read source only for legacy Turbo isolation and iPhone steering-release recovery; `sky-sky-raid.test.ts` may read source only for SKY RAID mode ownership/bootstrap and iPhone input-release ownership. Do not add another source reader unless a user-observable Node/runtime test cannot express the safety contract.\n";
if (!readme.includes("Current `sky-*` source-text allowlist is intentionally closed")) {
  readme = readme.trimEnd() + "\n" + paragraph;
  await writeFile(readmePath, readme);
}

console.log("Removed the final test-only lint warning import.");
console.log("Verified closed source-text allowlist:", sourceReaders);
