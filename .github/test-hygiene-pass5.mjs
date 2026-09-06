import fs from "node:fs";

const testPath = "tests/sky-arcade-reference.test.ts";
const readmePath = "tests/README.md";
let source = fs.readFileSync(testPath, "utf8");
const beforeBytes = Buffer.byteLength(source);

const sourceSnapshotTitles = [
  "V9.9 WebGL combat feedback gives missiles stronger target recoil plus player and camera hit kick",
  "V10.1 boss ingress clears prior crossfire and suppresses generic boss hazards",
  "V10.4 camera has one owner for course motion instead of double-transforming the background",
];

function removeSimpleTestByTitle(text, title) {
  const marker = `test("${title}"`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Missing expected test: ${title}`);
  const endMarker = "\n});";
  const end = text.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Could not find end of test: ${title}`);
  const after = end + endMarker.length;
  const leadingStart = start > 1 && text.slice(start - 2, start) === "\n\n" ? start - 1 : start;
  const trailingEnd = text.slice(after, after + 2) === "\n\n" ? after + 1 : after;
  return text.slice(0, leadingStart) + text.slice(trailingEnd);
}

for (const title of sourceSnapshotTitles) source = removeSimpleTestByTitle(source, title);

let renamed = 0;
source = source.replace(/test\("V\d+(?:\.\d+)*(?:\s+)([^"\n]+)"/g, (_match, title) => {
  renamed += 1;
  return `test("${title}"`;
});

if (/test\("V\d/.test(source)) throw new Error("Chronological V-number test title remains in Arcade reference suite.");
if (/readFile\(new URL\("\.\.\/src\/sky\/arcade\//.test(source)) throw new Error("Arcade reference suite still reads production source text.");

source = source.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
fs.writeFileSync(testPath, source);

let readme = fs.readFileSync(readmePath, "utf8");
const anchor = "Do not create chronological `sky-vXX.test.ts` regression files.";
const addition = " Do not put chronological `Vxx` pass labels in test titles either; name the enduring behavior instead. Keep version identifiers only when they are part of a production API symbol that the test must call.";
if (!readme.includes(addition.trim())) {
  if (!readme.includes(anchor)) throw new Error("README policy anchor missing.");
  readme = readme.replace(anchor, anchor + addition);
}
fs.writeFileSync(readmePath, readme.trimEnd() + "\n");

console.log(`Removed ${sourceSnapshotTitles.length} Arcade source-snapshot tests.`);
console.log(`Renamed ${renamed} historical V-number test titles.`);
console.log(`Arcade reference test bytes: ${beforeBytes} -> ${Buffer.byteLength(source)}`);
