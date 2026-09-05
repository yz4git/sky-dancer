import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`V28 marker missing: ${label}`);
  return source.replace(marker, replacement);
}

// 1) Stretch each SKY RAID act into a real combat beat instead of a 24 second scene swap.
{
  const path = "src/sky/SkyDancerSkyRaidRules.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    'export const SKY_DANCER_SKY_RAID_ACTS: readonly SkyDancerSkyRaidAct[] = [\n',
    'export const SKY_DANCER_SKY_RAID_ACT_SECONDS = 45;\n\nexport const SKY_DANCER_SKY_RAID_ACTS: readonly SkyDancerSkyRaidAct[] = [\n',
    "act duration constant",
  );
  source = replaceOnce(
    source,
    '    id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 24, killTarget: 5, setpiece: "CITY GATES",',
    '    id: "dawn-city", index: 0, label: "DAWN CITY", subtitle: "FREE APPROACH", startSeconds: 0, endSeconds: 45, killTarget: 7, setpiece: "CITY GATES",',
    "dawn pacing",
  );
  source = replaceOnce(
    source,
    '    id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 24, endSeconds: 48, killTarget: 6, setpiece: "CANYON KNIFE RUN",',
    '    id: "red-canyon", index: 1, label: "RED CANYON", subtitle: "LOW ALTITUDE KNIFE RUN", startSeconds: 45, endSeconds: 90, killTarget: 8, setpiece: "CANYON KNIFE RUN",',
    "canyon pacing",
  );
  source = replaceOnce(
    source,
    '    id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 48, endSeconds: 72, killTarget: 7, setpiece: "FLEET BREAK",',
    '    id: "cloud-fleet", index: 2, label: "CLOUD FLEET", subtitle: "WARSHIP BREAKTHROUGH", startSeconds: 90, endSeconds: 135, killTarget: 9, setpiece: "FLEET BREAK",',
    "fleet pacing",
  );
  source = replaceOnce(
    source,
    '    id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 72, endSeconds: 96, killTarget: 8, setpiece: "THUNDER RAID",',
    '    id: "storm-carrier", index: 3, label: "STORM CARRIER", subtitle: "THUNDERHEAD INTERCEPT", startSeconds: 135, endSeconds: 180, killTarget: 10, setpiece: "THUNDER RAID",',
    "storm pacing",
  );
  source = replaceOnce(
    source,
    '    id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 96, endSeconds: 120, killTarget: 8, setpiece: "PRISM SIEGE",',
    '    id: "prism-citadel", index: 4, label: "PRISM CITADEL", subtitle: "TITAN SIEGE", startSeconds: 180, endSeconds: 225, killTarget: 10, setpiece: "PRISM SIEGE",',
    "prism pacing",
  );
  source = replaceOnce(
    source,
    'export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 104;\nexport const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 120;',
    'export const SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS = 198;\nexport const SKY_DANCER_SKY_RAID_TARGET_SECONDS = 225;',
    "run target",
  );
  source = replaceOnce(
    source,
    '  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) return local >= 4 && local < 12;\n  return (local >= 7 && local < 13) || (local >= 17 && local < 21);',
    '  if (act.index === SKY_DANCER_SKY_RAID_ACTS.length - 1) return (local >= 8 && local < 18) || (local >= 28 && local < 38);\n  return (local >= 8 && local < 16) || (local >= 28 && local < 36);',
    "rush windows",
  );
  write(path, source);
}

// 2) SKY RAID owns long-form progression so inherited Turbo Hunt cannot spawn its boss at 105 s.
{
  const path = "src/sky/SkyDancerSkyRaid.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    '  setCartTurboHuntActiveTargetCountResolver,\n  setCartTurboHuntSpawnPreference,',
    '  setCartTurboHuntActiveTargetCountResolver,\n  setCartTurboHuntExternalProgressionEnabled,\n  setCartTurboHuntSpawnPreference,',
    "external progression import",
  );
  source = replaceOnce(
    source,
    '  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,\n  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,',
    '  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,\n  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n  SKY_DANCER_SKY_RAID_TARGET_SECONDS,',
    "target seconds import",
  );
  source = replaceOnce(
    source,
    '    if (isSkyRaidMode()) {\n      // Turbo Hunt\'s buildWorld wrapper owns the gameplay bootstrap as well as\n      // its legacy ground visuals. SKY RAID needs the former but intentionally\n      // replaces the latter, so initialize the Hunt session explicitly instead\n      // of depending on a mode-detection race to enter previousBuildWorld().\n      enableCartTurboHunt(this.session);\n    } else {\n      previousBuildWorld.call(this);\n    }',
    '    if (isSkyRaidMode()) {\n      // SKY RAID now owns the complete 225 s act/boss timeline. Disable the inherited\n      // Hunt objective/boss director before bootstrapping its reusable combat systems.\n      setCartTurboHuntExternalProgressionEnabled(true);\n      enableCartTurboHunt(this.session);\n    } else {\n      setCartTurboHuntExternalProgressionEnabled(false);\n      previousBuildWorld.call(this);\n    }',
    "world progression ownership",
  );
  source = replaceOnce(
    source,
    '    state.score += 5000 + Math.round(Math.max(0, 120 - hunt.huntElapsedSeconds) * 80);',
    '    state.score += 5000 + Math.round(Math.max(0, SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt.huntElapsedSeconds) * 80);',
    "clear bonus target",
  );
  write(path, source);
}

// 3) Update the fast contract so the pacing regression cannot silently return.
{
  const path = "tests/sky-sky-raid.test.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    '  SKY_DANCER_SKY_RAID_ACTS,\n  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,',
    '  SKY_DANCER_SKY_RAID_ACTS,\n  SKY_DANCER_SKY_RAID_ACT_SECONDS,\n  SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS,',
    "test act duration import",
  );
  source = replaceOnce(
    source,
    '  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n',
    '  SKY_DANCER_SKY_RAID_CHAIN_GRACE_SECONDS,\n  SKY_DANCER_SKY_RAID_TARGET_SECONDS,\n',
    "test target import",
  );
  source = replaceOnce(
    source,
    '  assert.equal(skyDancerSkyRaidActFor(24).id, "red-canyon");\n  assert.equal(skyDancerSkyRaidActFor(48).id, "cloud-fleet");\n  assert.equal(skyDancerSkyRaidActFor(72).id, "storm-carrier");\n  assert.equal(skyDancerSkyRaidActFor(96).id, "prism-citadel");\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 96);\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS < 120);',
    '  assert.equal(skyDancerSkyRaidActFor(45).id, "red-canyon");\n  assert.equal(skyDancerSkyRaidActFor(90).id, "cloud-fleet");\n  assert.equal(skyDancerSkyRaidActFor(135).id, "storm-carrier");\n  assert.equal(skyDancerSkyRaidActFor(180).id, "prism-citadel");\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS > 180);\n  assert.ok(SKY_DANCER_SKY_RAID_BOSS_TRIGGER_SECONDS < SKY_DANCER_SKY_RAID_TARGET_SECONDS);',
    "five act timing test",
  );
  if (!source.includes('SKY RAID V28 keeps each act long enough for a complete combat exchange')) {
    source += `\n\ntest("SKY RAID V28 keeps each act long enough for a complete combat exchange", () => {\n  assert.equal(SKY_DANCER_SKY_RAID_ACT_SECONDS, 45);\n  assert.equal(SKY_DANCER_SKY_RAID_TARGET_SECONDS, 225);\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.endSeconds - act.startSeconds), [45, 45, 45, 45, 45]);\n  assert.deepEqual(SKY_DANCER_SKY_RAID_ACTS.map((act) => act.killTarget), [7, 8, 9, 10, 10]);\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\\(true\\)/);\n  assert.match(raidSource, /setCartTurboHuntExternalProgressionEnabled\\(false\\)/);\n  assert.match(raidSource, /SKY_DANCER_SKY_RAID_TARGET_SECONDS - hunt\\.huntElapsedSeconds/);\n});\n`;
  }
  write(path, source);
}

// 4) Real-time phone WebGL audit of the entire first act and its transition.
write("scripts/webgl-sky-raid-stage-pacing-v28.mjs", `import fs from "node:fs";\nimport path from "node:path";\nimport { pathToFileURL } from "node:url";\n\nconst playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;\nconst playwrightModule = await import(playwrightUrl);\nconst chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;\nif (!chromium) throw new Error("playwright chromium export missing");\n\nconst out = "artifacts/sky-raid-stage-pacing-v28";\nfs.mkdirSync(out, { recursive: true });\nconst checkpoints = [3, 22, 43, 46];\nlet browser; let context; let page;\nconst watchdog = setTimeout(() => process.exit(124), 130000);\n\ntry {\n  browser = await chromium.launch({ headless: true, executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome", args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });\n  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });\n  page = await context.newPage();\n  const errors = [];\n  page.on("pageerror", (error) => errors.push(String(error)));\n  page.on("console", (message) => { if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text()); });\n  await page.goto(\`http://127.0.0.1:4173?menu=1&v28=\${Date.now()}\`, { waitUntil: "networkidle", timeout: 30000 });\n  await page.evaluate(() => {\n    window.__v28RaidSnapshot = null;\n    window.addEventListener("sky-dancer-sky-raid-snapshot", (event) => { window.__v28RaidSnapshot = event.detail; });\n  });\n  await page.locator("button").filter({ hasText: /^\\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });\n  await page.waitForTimeout(100);\n  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });\n  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });\n  await page.waitForFunction(() => window.__v28RaidSnapshot?.gameMode === "sky-raid", null, { timeout: 12000 });\n\n  const shot = page.locator("button").filter({ hasText: /^\\s*SHOT/i }).first();\n  const turbo = page.locator("button").filter({ hasText: /^\\s*TURBO/i }).first();\n  const samples = [];\n  let nextShotAt = 1.2; let nextTurboAt = 8.0;\n  for (const checkpoint of checkpoints) {\n    while (true) {\n      const elapsed = await page.evaluate(() => Number(window.__v28RaidSnapshot?.elapsedSeconds ?? 0));\n      if (elapsed >= checkpoint) break;\n      if (elapsed >= nextShotAt) { await shot.click({ force: true, timeout: 1500 }).catch(() => {}); nextShotAt += 1.25; }\n      if (elapsed >= nextTurboAt) { await turbo.click({ force: true, timeout: 1500 }).catch(() => {}); nextTurboAt += 11; }\n      await page.waitForTimeout(120);\n    }\n    const diagnostic = await page.evaluate(() => {\n      const snap = window.__v28RaidSnapshot;\n      const roles = window.__skyRaidGetRoleReadability?.().roles ?? [];\n      return {\n        elapsed: Number(snap?.elapsedSeconds ?? 0),\n        actIndex: Number(snap?.actIndex ?? -1),\n        actId: String(snap?.actId ?? ""),\n        actElapsed: Number(snap?.actElapsedSeconds ?? 0),\n        remaining: Number(snap?.actSecondsRemaining ?? 0),\n        kills: Number(snap?.actKills ?? 0),\n        target: Number(snap?.actKillTarget ?? 0),\n        activeRoles: roles.filter((role) => role.kitVisible).length,\n        bodyText: (document.body.innerText ?? "").replace(/\\s+/g, " ").trim().slice(0, 1200),\n      };\n    });\n    samples.push(diagnostic);\n    await page.screenshot({ path: path.join(out, \`checkpoint-\${String(checkpoint).padStart(2, "0")}s.png\`), timeout: 6000 });\n  }\n\n  if (samples[0].actIndex !== 0 || samples[0].remaining < 39 || samples[0].remaining > 43.5) throw new Error(\`bad opening duration: \${JSON.stringify(samples[0])}\`);\n  if (samples[2].actIndex !== 0 || samples[2].remaining > 3.2) throw new Error(\`act advanced before 45 s: \${JSON.stringify(samples[2])}\`);\n  if (samples[3].actIndex !== 1 || samples[3].actId !== "red-canyon" || samples[3].actElapsed > 3.5) throw new Error(\`act did not transition near 45 s: \${JSON.stringify(samples[3])}\`);\n  if (samples.some((sample) => sample.activeRoles < 3)) throw new Error(\`combat population became unreadably sparse: \${JSON.stringify(samples)}\`);\n  if (errors.length) throw new Error(\`browser errors: \${JSON.stringify(errors)}\`);\n  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ viewport: { width: 844, height: 390, dpr: 2 }, samples, errors }, null, 2));\n  console.log("SKY RAID V28 STAGE PACING PASS", JSON.stringify(samples));\n} catch (error) {\n  try { fs.writeFileSync(path.join(out, "failure.txt"), String(error?.stack ?? error)); await page?.screenshot({ path: path.join(out, "failure.png"), timeout: 6000 }); } catch {}\n  throw error;\n} finally {\n  clearTimeout(watchdog);\n  await context?.close().catch(() => {});\n  await browser?.close().catch(() => {});\n}\n`);

console.log("SKY RAID V28 stage pacing patch applied");
