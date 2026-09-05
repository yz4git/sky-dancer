import fs from "node:fs";

const path = "src/sky/SkyDancerSkyRaidRules.ts";
const source = fs.readFileSync(path, "utf8");
const marker = `export function skyDancerSkyRaidBossCueActive(elapsedSeconds: number, bossForced: boolean): boolean {\n  if (!bossForced) return false;\n  const local = elapsedSeconds - SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS;\n  return local >= 0 && local < SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS;\n}`;
const replacement = `export function skyDancerSkyRaidBossCueActive(elapsedSeconds: number, bossForced: boolean): boolean {\n  if (!bossForced) return false;\n  const local = elapsedSeconds - SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS;\n  // Decimal timeline boundaries such as 423 + 2.4 can subtract to\n  // 2.399999999... in binary floating point. Treat the exact cue end as\n  // closed with a tiny epsilon so the entrance card never survives one frame.\n  return local >= 0 && local + 1e-6 < SKY_DANCER_SKY_RAID_BOSS_CUE_SECONDS;\n}`;
if (!source.includes(marker)) throw new Error("V29 boss cue boundary marker missing");
fs.writeFileSync(path, source.replace(marker, replacement));
console.log("SKY RAID V29 boss cue boundary fixed");
