import fs from "node:fs";

function replaceExact(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) {
    if (source.includes(to)) return false;
    throw new Error(`Missing expected source in ${path}: ${from}`);
  }
  fs.writeFileSync(path, source.replace(from, to));
  return true;
}

const weapon = "src/sky/SkyDancerPlayerWeapons.ts";
replaceExact(weapon, "    life: 4.6,\n    maxLife: 4.6,", "    life: 5.2,\n    maxLife: 5.2,");
replaceExact(weapon, "    turnRate: target ? 2.25 : 0,\n    pitchRate: target ? 1.72 : 0,\n    maxSpeed: 42.5,\n    acceleration: 27,", "    turnRate: target ? 2.72 : 0,\n    pitchRate: target ? 1.98 : 0,\n    maxSpeed: 46,\n    acceleration: 31,");
replaceExact(weapon, "      missile.turnRate = target ? 2.15 : 0;\n      missile.pitchRate = target ? 1.65 : 0;", "      missile.turnRate = target ? 2.58 : 0;\n      missile.pitchRate = target ? 1.9 : 0;");
replaceExact(weapon, "      const authority = clamp(missile.ageSeconds / 0.34, 0.36, 1);", "      const authority = clamp(missile.ageSeconds / 0.26, 0.46, 1);");
replaceExact(weapon, "      const radius = enemy.radius + 0.52;", "      const radius = enemy.radius + (enemy.id === missile.targetEnemyId ? 0.72 : 0.52);");

const hud = "app/SkyDancerHudV45.tsx";
replaceExact(hud, "  const lockTopVh = clamp(43 + reticleY - 9, 29, 55);", "  const lockTopVh = clamp(43 + reticleY - 12, 27, 52);");
replaceExact(hud, "        width: 58px;\n        height: 58px;", "        width: 50px;\n        height: 50px;");
replaceExact(hud, "        font: 950 24px/1 ui-monospace, SFMono-Regular, Menlo, monospace;", "        font: 950 18px/1 ui-monospace, SFMono-Regular, Menlo, monospace;");
replaceExact(hud, "        transform: translate(-50%, -50%) scale(1.12);", "        transform: translate(-50%, -50%) scale(1.06);");
replaceExact(hud, "        min-width: 142px;\n        max-width: min(46vw, 360px);\n        padding: 4px 10px 5px;", "        min-width: 118px;\n        max-width: min(38vw, 300px);\n        padding: 3px 8px 4px;");
replaceExact(hud, "        font: 900 clamp(8px,.94vw,10px)/1.05 system-ui,sans-serif;", "        font: 900 clamp(7px,.82vw,9px)/1.05 system-ui,sans-serif;");
replaceExact(hud, "        gap: 7px;", "        gap: 5px;");
replaceExact(hud, "        font-size: 1.08em;", "        font-size: 1em;");
replaceExact(hud, "        max-width: 46vw;", "        max-width: 34vw;");
replaceExact(hud, "        font-size: .98em;", "        font-size: .88em;");
replaceExact(hud, "      0%,100% { opacity: .72; filter: drop-shadow(0 0 5px rgba(255,191,72,.48)); }", "      0%,100% { opacity: .58; filter: drop-shadow(0 0 4px rgba(255,191,72,.42)); }");

const testPath = "tests/sky-sky-raid.test.ts";
let testSource = fs.readFileSync(testPath, "utf8");
if (!testSource.includes('import { readFileSync } from "node:fs";')) {
  testSource = testSource.replace('import assert from "node:assert/strict";\n', 'import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\n');
}
const marker = 'test("SKY RAID valid missile locks keep enough pursuit authority for phone play"';
if (!testSource.includes(marker)) {
  testSource += `\n\ntest("SKY RAID valid missile locks keep enough pursuit authority for phone play", () => {\n  const weaponSource = readFileSync(new URL("../src/sky/SkyDancerPlayerWeapons.ts", import.meta.url), "utf8");\n  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");\n  assert.match(weaponSource, /life: 5\\.2/);\n  assert.match(weaponSource, /turnRate: target \\? 2\\.72 : 0/);\n  assert.match(weaponSource, /maxSpeed: 46/);\n  assert.match(weaponSource, /ageSeconds \\/ 0\\.26, 0\\.46, 1/);\n  assert.match(weaponSource, /enemy\\.id === missile\\.targetEnemyId \\? 0\\.72 : 0\\.52/);\n  assert.match(hudSource, /width: 50px/);\n  assert.match(hudSource, /max-width: min\\(38vw, 300px\\)/);\n  assert.match(hudSource, /lockTopVh = clamp\\(43 \\+ reticleY - 12, 27, 52\\)/);\n});\n`;
}
fs.writeFileSync(testPath, testSource);

console.log("Applied SKY RAID phone combat readability + missile pursuit pass");
