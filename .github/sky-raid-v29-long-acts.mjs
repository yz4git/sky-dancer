import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`V29 marker missing: ${label}`);
  return source.replace(marker, replacement);
}

// 1) Double every Act from 45 s to 90 s and scale objectives with the longer engagement.
{
  const path = "src/sky/SkyDancerSkyRaidRules.ts";
  let source = read(path);
  source = replaceOnce(source, "export const SKY_DANCER_SKY_RAID_ACT_SECONDS = 45;", "export const SKY_DANCER_SKY_RAID_ACT_SECONDS = 90;", "act seconds");
  source = replaceOnce(source,
    '    id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 45, killTarget: 7, setpiece: "CITY GATES",',
    '    id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 90, killTarget: 14, setpiece: "CITY GATES",',
    "dawn pacing");
  source = replaceOnce(source,
    '    id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 45, endSeconds: 90, killTarget: 8, setpiece: "CANYON KNIFE RUN",',
    '    id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 90, endSeconds: 180, killTarget: 16, setpiece: "CANYON KNIFE RUN",',
    "canyon pacing");
  source = replaceOnce(source,
    '    id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 90, endSeconds: 135, killTarget: 9, setpiece: "FLEET BREAK",',
    '    id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 180, endSeconds: 270, killTarget: 18, setpiece: "FLEET BREAK",',
    "fleet pacing");
  source = replaceOnce(source,
    '    id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 135, endSeconds: 180, killTarget: 10, setpiece: "THUNDER RAID",',
    '    id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 270, endSeconds: 360, killTarget: 20, setpiece: "THUNDER RAID",',
    "storm pacing");
  source = replaceOnce(source,
    '    id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 180, endSeconds: 225, killTarget: 10, setpiece: "PRISM SIEGE",',
    '    id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 360, endSeconds: 450, killTarget: 20, setpiece: "PRISM SIEGE",',
    "prism pacing");
  // Keep the boss climax compact instead of doubling its duration. The extra time belongs to the Act buildup.
  source = replaceOnce(source,
    "export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 198;\nexport const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 225;",
    "export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 423;\nexport const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 450;",
    "run target");
  source = replaceOnce(source,
    '  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) return (local >= 8 && local < 18) || (local >= 28 && local < 38);\n  return (local >= 8 && local < 16) || (local >= 28 && local < 36);',
    '  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) {\n    return (local >= 8 && local < 18) || (local >= 30 && local < 40) || (local >= 52 && local < 62) || (local >= 74 && local < 84);\n  }\n  return (local >= 8 && local < 16) || (local >= 30 && local < 38) || (local >= 52 && local < 60) || (local >= 74 && local < 82);',
    "long-form rush windows");
  write(path, source);
}

// 2) The old formation grammar only had ~24 s of motion. Cycle all five authored beats twice across each 90 s Act.
{
  const path = "src/sky/SkyDancerSkyRaid.ts";
  let source = read(path);
  source = replaceOnce(source,
    '  SKY_DANCER_SKY_RAID_ACTS,\n  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,',
    '  SKY_DANCER_SKY_RAID_ACTS,\n  SKY_DANCER_SKY_RAID_ACT_SECONDS,\n  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,',
    "act seconds import");
  const oldBeat = `  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);\n  const rush = skyDancerSkyRaidRushActive(elapsedSeconds, act);\n  const mirror = act.index % 2 === 0 ? 1 : -1;\n  let phaseIndex: 0 | 1 | 2 | 3 | 4;\n  let progress: number;\n  if (local < 7) {\n    phaseIndex = 0;\n    progress = clamp(local / 7, 0, 1);\n  } else if (local < 13) {\n    phaseIndex = 1;\n    progress = clamp((local - 7) / 6, 0, 1);\n  } else if (local < 17) {\n    phaseIndex = 2;\n    progress = clamp((local - 13) / 4, 0, 1);\n  } else if (local < 21) {\n    phaseIndex = 3;\n    progress = clamp((local - 17) / 4, 0, 1);\n  } else {\n    phaseIndex = 4;\n    progress = clamp((local - 21) / 3, 0, 1);\n  }`;
  const newBeat = `  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);\n  const rush = skyDancerSkyRaidRushActive(elapsedSeconds, act);\n  // Ten 9-second beats fill a 90-second Act. The authored five-beat sentence\n  // runs twice, with the second pass mirrored so long Acts do not settle into\n  // one permanent breakaway formation after the old 24-second grammar ended.\n  const beatSeconds = SKY_DANCER_SKY_RAID_ACT_SECONDS / 10;\n  const beatOrdinal = Math.max(0, Math.floor(local / beatSeconds));\n  const phaseIndex = (beatOrdinal % profile.beats.length) as 0 | 1 | 2 | 3 | 4;\n  const beatLocal = local - beatOrdinal * beatSeconds;\n  const progress = clamp(beatLocal / beatSeconds, 0, 1);\n  const cycleIndex = Math.floor(beatOrdinal / profile.beats.length);\n  const mirror = (act.index + cycleIndex) % 2 === 0 ? 1 : -1;`;
  source = replaceOnce(source, oldBeat, newBeat, "formation grammar");
  source = source.replace("// SKY RAID now owns the complete 225 s act/boss timeline.", "// SKY RAID now owns the complete 450 s act/boss timeline.");
  write(path, source);
}

// 3) Keep a visible reason to fight after the Act target is secured.
{
  const path = "app/SkyDancerSkyRaidOverlay.tsx";
  let source = read(path);
  source = replaceOnce(source,
    "  const progress = Math.round(Math.min(1, snapshot.actKills / Math.max(1, snapshot.actKillTarget)) * 100);\n  const killCueVisible = snapshot.killCueSecondsRemaining > 0;",
    "  const progress = Math.round(Math.min(1, snapshot.actKills / Math.max(1, snapshot.actKillTarget)) * 100);\n  const bonusKills = Math.max(0, snapshot.actKills - snapshot.actKillTarget);\n  const killCueVisible = snapshot.killCueSecondsRemaining > 0;",
    "bonus kill counter");
  source = replaceOnce(source,
    '          <span>{snapshot.actBreak ? "ACT BREAK" : snapshot.setpiece}</span>\n          <strong>{snapshot.actBreak ? "COMPLETE" : `${snapshot.actKills}/${snapshot.actKillTarget}`}</strong>',
    '          <span>{snapshot.actBreak ? "BREAK SECURED" : snapshot.setpiece}</span>\n          <strong>{snapshot.actBreak ? `BONUS +${bonusKills}` : `${snapshot.actKills}/${snapshot.actKillTarget}`}</strong>',
    "post-break objective");
  source = replaceOnce(source,
    '        <small>{snapshot.actSubtitle} · {snapshot.actSecondsRemaining.toFixed(1)}s</small>',
    '        <small>{snapshot.actBreak ? "FREE HUNT" : snapshot.actSubtitle} · {snapshot.actSecondsRemaining.toFixed(1)}s</small>',
    "post-break subtitle");
  write(path, source);
}

// 4) Update regression contracts for 90-second long-form Acts.
{
  const path = "tests/sky-sky-raid.test.ts";
  let source = read(path);
  source = replaceOnce(source,
    '  assert.equal(skyDancerSkyRaidActFor(45).id, "red-canyon");\n  assert.equal(skyDancerSkyRaidActFor(90).id, "cloud-fleet");\n  assert.equal(skyDancerSkyRaidActFor(135).id, "storm-carrier");\n  assert.equal(skyDancerSkyRaidActFor(180).id, "prism-citadel");\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 180);',
    '  assert.equal(skyDancerSkyRaidActFor(90).id, "red-canyon");\n  assert.equal(skyDancerSkyRaidActFor(180).id, "cloud-fleet");\n  assert.equal(skyDancerSkyRaidActFor(270).id, "storm-carrier");\n  assert.equal(skyDancerSkyRaidActFor(360).id, "prism-citadel");\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 360);',
    "act boundaries test");
  const oldV28 = `test("SKY RAID V28 keeps each act long enough for a complete combat exchange", () => {\n  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 45);\n  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 225);\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [45, 45, 45, 45, 45]);\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [7, 8, 9, 10, 10]);\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\\(true\\)/);\n  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\\(false\\)/);\n  assert.match(raidSource, /SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt\\.huntElapsedSeconds/);\n});`;
  const newV29 = `test("SKY RAID V29 doubles every Act while keeping the full 90 seconds combat-authored", () => {\n  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 90);\n  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 450);\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [90, 90, 90, 90, 90]);\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [14, 16, 18, 20, 20]);\n  assert.equal(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS, 423);\n  for (const second of [8, 31, 53, 75]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), true);\n  for (const second of [20, 44, 66, 88]) assert.equal(skyDancerSkyRaidRushActive(second, SKY_DANCER_SKY_RAID_ACTS[0]), false);\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const overlaySource = readFileSync(new URL("../app/SkyDancerSkyRaidOverlay.tsx", import.meta.url), "utf8");\n  assert.match(raidSource, /beatSeconds = SKY_DANCER_SKY_RAID_ACT_SECONDS \\/ 10/);\n  assert.match(raidSource, /beatOrdinal % profile\\.beats\\.length/);\n  assert.match(raidSource, /cycleIndex/);\n  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\\(true\\)/);\n  assert.match(raidSource, /SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt\\.huntElapsedSeconds/);\n  assert.match(overlaySource, /BONUS \\+\\$\\{bonusKills\\}/);\n  assert.match(overlaySource, /BREAK SECURED/);\n  assert.match(overlaySource, /FREE HUNT/);\n});`;
  source = replaceOnce(source, oldV28, newV29, "V29 contract");
  write(path, source);
}

console.log("SKY RAID V29 long Acts patch applied");
