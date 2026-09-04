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

const raid = "src/sky/SkyDancerSkyRaid.ts";
replaceExact(raid,
  "  actBreak: boolean;\n  score: number;\n  chain: number;",
  "  actBreak: boolean;\n  killCueSerial: number;\n  killCueSecondsRemaining: number;\n  score: number;\n  chain: number;",
);
replaceExact(raid,
  "  previousOrders: number;\n  score: number;\n  chain: number;",
  "  previousOrders: number;\n  killCueSerial: number;\n  killCueSecondsRemaining: number;\n  score: number;\n  chain: number;",
);
replaceExact(raid,
  "    previousOrders: hunt.huntOrdersCompleted,\n    score: 0,",
  "    previousOrders: hunt.huntOrdersCompleted,\n    killCueSerial: 0,\n    killCueSecondsRemaining: 0,\n    score: 0,",
);
replaceExact(raid,
  "    state.actKills = 0;\n    state.actBreak = false;",
  "    state.actKills = 0;\n    state.actBreak = false;\n    state.killCueSecondsRemaining = 0;",
);
replaceExact(raid,
  "  }\n  state.previousKills = hunt.huntKills;\n\n  const orderDelta",
  "  }\n  if (killDelta > 0) {\n    state.killCueSerial += killDelta;\n    state.killCueSecondsRemaining = 1.18;\n  }\n  state.previousKills = hunt.huntKills;\n\n  const orderDelta",
);
replaceExact(raid,
  "  state.chainTimer = Math.max(0, state.chainTimer - delta);\n  if (state.chainTimer <= 0) state.chain = 0;",
  "  state.chainTimer = Math.max(0, state.chainTimer - delta);\n  state.killCueSecondsRemaining = Math.max(0, state.killCueSecondsRemaining - delta);\n  if (state.chainTimer <= 0) state.chain = 0;",
);
replaceExact(raid,
  "    actKillTarget: act.killTarget,\n    actBreak: state.actBreak,\n    score: state.score,",
  "    actKillTarget: act.killTarget,\n    actBreak: state.actBreak,\n    killCueSerial: state.killCueSerial,\n    killCueSecondsRemaining: state.killCueSecondsRemaining,\n    score: state.score,",
);

const overlay = "app/SkyDancerSkyRaidOverlay.tsx";
replaceExact(overlay,
  'import { useEffect, useRef, useState, type CSSProperties } from "react";',
  'import { useEffect, useState, type CSSProperties } from "react";',
);
replaceExact(overlay,
  "  const [snapshot, setSnapshot] = useState<SkyDancerSkyRaidSnapshot | null>(() => initialSnapshot);\n  const [killCue, setKillCue] = useState<{ serial: number; chain: number } | null>(null);\n  // Start transition tracking from an explicit zero baseline. During fast\n  // startup the first snapshot the overlay sees can already contain kill #1;\n  // treating that as the baseline used to silently drop the first TARGET DOWN.\n  const previousSnapshotRef = useRef<SkyDancerSkyRaidSnapshot | null>(null);\n  const killCueTimerRef = useRef<number | null>(null);",
  "  const [snapshot, setSnapshot] = useState<SkyDancerSkyRaidSnapshot | null>(() => initialSnapshot);",
);
replaceExact(overlay,
  "      const previous = previousSnapshotRef.current;\n      const previousKills = previous && detail.actIndex === previous.actIndex ? previous.actKills : 0;\n      if (detail.actKills > previousKills) {\n        setKillCue({ serial: Date.now(), chain: detail.chain });\n        if (killCueTimerRef.current !== null) window.clearTimeout(killCueTimerRef.current);\n        killCueTimerRef.current = window.setTimeout(() => {\n          killCueTimerRef.current = null;\n          setKillCue(null);\n        }, 1180);\n      }\n      previousSnapshotRef.current = detail;\n      setSnapshot(detail);",
  "      setSnapshot(detail);",
);
replaceExact(overlay,
  "    return () => {\n      window.removeEventListener(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, handler);\n      if (killCueTimerRef.current !== null) window.clearTimeout(killCueTimerRef.current);\n    };",
  "    return () => {\n      window.removeEventListener(SKY_DANCER_SKY_RAID_SNAPSHOT_EVENT, handler);\n    };",
);
replaceExact(overlay,
  "  const progress = Math.round(Math.min(1, snapshot.actKills / Math.max(1, snapshot.actKillTarget)) * 100);",
  "  const progress = Math.round(Math.min(1, snapshot.actKills / Math.max(1, snapshot.actKillTarget)) * 100);\n  const killCueVisible = snapshot.killCueSecondsRemaining > 0;",
);
replaceExact(overlay,
  '      <div className={styles.scoreCard} data-kill={killCue ? "true" : "false"}>',
  '      <div className={styles.scoreCard} data-kill={killCueVisible ? "true" : "false"}>',
);
replaceExact(overlay,
  "      {killCue && (\n        <div key={killCue.serial} data-sd-kill-confirm=\"true\" aria-live=\"polite\">\n          <strong>TARGET DOWN</strong>\n          <small>{killCue.chain > 1 ? `CHAIN ×${killCue.chain}` : \"CONFIRMED\"}</small>\n        </div>\n      )}",
  "      {killCueVisible && (\n        <div key={snapshot.killCueSerial} data-sd-kill-confirm=\"true\" aria-live=\"polite\">\n          <strong>TARGET DOWN</strong>\n          <small>{snapshot.chain > 1 ? `CHAIN ×${snapshot.chain}` : \"CONFIRMED\"}</small>\n        </div>\n      )}",
);

const testPath = "tests/sky-sky-raid.test.ts";
let testSource = fs.readFileSync(testPath, "utf8");
if (!testSource.includes('import { readFileSync } from "node:fs";')) {
  testSource = testSource.replace('import assert from "node:assert/strict";\n', 'import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\n');
}
const marker = 'test("SKY RAID valid missile locks keep enough pursuit authority for phone play"';
if (!testSource.includes(marker)) {
  testSource += `\n\ntest("SKY RAID valid missile locks keep enough pursuit authority for phone play", () => {\n  const weaponSource = readFileSync(new URL("../src/sky/SkyDancerPlayerWeapons.ts", import.meta.url), "utf8");\n  const hudSource = readFileSync(new URL("../app/SkyDancerHudV45.tsx", import.meta.url), "utf8");\n  assert.match(weaponSource, /life: 5\\.2/);\n  assert.match(weaponSource, /turnRate: target \\? 2\\.72 : 0/);\n  assert.match(weaponSource, /maxSpeed: 46/);\n  assert.match(weaponSource, /ageSeconds \\/ 0\\.26, 0\\.46, 1/);\n  assert.match(weaponSource, /enemy\\.id === missile\\.targetEnemyId \\? 0\\.72 : 0\\.52/);\n  assert.match(hudSource, /width: 50px/);\n  assert.match(hudSource, /max-width: min\\(38vw, 300px\\)/);\n  assert.match(hudSource, /lockTopVh = clamp\\(43 \\+ reticleY - 12, 27, 52\\)/);\n});\n`;
}
const cueMarker = 'test("SKY RAID kill confirmation is carried by authoritative snapshot state"';
if (!testSource.includes(cueMarker)) {
  testSource += `\n\ntest("SKY RAID kill confirmation is carried by authoritative snapshot state", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");\n  assert.match(raidSource, /killCueSerial: number/);\n  assert.match(raidSource, /killCueSecondsRemaining: number/);\n  assert.match(raidSource, /state\\.killCueSerial \\+= killDelta/);\n  assert.match(raidSource, /state\\.killCueSecondsRemaining = 1\\.18/);\n  assert.match(overlaySource, /snapshot\\.killCueSecondsRemaining > 0/);\n  assert.match(overlaySource, /key=\\{snapshot\\.killCueSerial\\}/);\n  assert.doesNotMatch(overlaySource, /previousSnapshotRef/);\n});\n`;
}
fs.writeFileSync(testPath, testSource);

console.log("Applied SKY RAID authoritative kill cue + phone combat readability pass");
