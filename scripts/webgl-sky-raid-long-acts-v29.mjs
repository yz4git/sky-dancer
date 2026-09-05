import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");
const out = "artifacts/sky-raid-long-acts-v29";
fs.mkdirSync(out, { recursive: true });
let browser; let context; let page;
const watchdog = setTimeout(() => process.exit(124), 115000);

async function sample(label) {
  const data = await page.evaluate(() => {
    const snap = window.__v29RaidSnapshot;
    const camera = window.__skyRaidGetCameraPolish?.() ?? {};
    const roles = window.__skyRaidGetRoleReadability?.().roles ?? [];
    return {
      elapsed: Number(snap?.elapsedSeconds ?? 0),
      actIndex: Number(snap?.actIndex ?? -1),
      actId: String(snap?.actId ?? ""),
      remaining: Number(snap?.actSecondsRemaining ?? 0),
      kills: Number(snap?.actKills ?? 0),
      target: Number(snap?.actKillTarget ?? 0),
      actBreak: Boolean(snap?.actBreak),
      rush: Boolean(snap?.rushActive),
      formationBeat: String(camera.formationBeat ?? ""),
      enemyVisible: Number(camera.enemyVisible ?? 0),
      enemyCombatLane: Number(camera.enemyCombatLane ?? 0),
      playerVisible: camera.playerVisible === true,
      activeRoles: roles.filter((role) => role.kitVisible).length,
      bodyText: (document.body.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 1400),
    };
  });
  await page.screenshot({ path: path.join(out, `${label}.png`), timeout: 6000 });
  return data;
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:4173?menu=1&v29=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    window.__v29RaidSnapshot = null;
    window.addEventListener("sky-dancer-sky-raid-snapshot", (event) => { window.__v29RaidSnapshot = event.detail; });
  });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => window.__v29RaidSnapshot?.gameMode === "sky-raid", null, { timeout: 12000 });

  // Actually play the opening; later samples use a webdriver-only clock so
  // SwiftShader performance cannot turn a 90-second game Act into minutes of CI.
  const shot = page.locator("button").filter({ hasText: /^\s*SHOT/i }).first();
  let nextShotAt = 0.7;
  while (Number(await page.evaluate(() => window.__v29RaidSnapshot?.elapsedSeconds ?? 0)) < 3) {
    const elapsed = Number(await page.evaluate(() => window.__v29RaidSnapshot?.elapsedSeconds ?? 0));
    if (elapsed >= nextShotAt) {
      await shot.click({ force: true, timeout: 1500 }).catch(() => {});
      nextShotAt += 0.9;
    }
    await page.waitForTimeout(100);
  }

  const samples = [await sample("01-03s-real")];
  for (const checkpoint of [46, 54, 75, 89, 91]) {
    await page.evaluate((elapsed) => { window.__skyRaidAuditElapsedSeconds = elapsed; }, checkpoint);
    await page.waitForFunction((elapsed) => Number(window.__v29RaidSnapshot?.elapsedSeconds ?? 0) >= elapsed, checkpoint, { timeout: 8000, polling: 50 });
    await page.waitForTimeout(420);
    samples.push(await sample(`${String(checkpoint).padStart(2, "0")}s`));
  }

  const [opening, oldBoundary, lateRushA, lateRushB, ending, nextAct] = samples;
  if (opening.actIndex !== 0 || opening.remaining < 84 || opening.remaining > 88 || opening.target !== 14) throw new Error(`bad 90 s opening: ${JSON.stringify(opening)}`);
  if (oldBoundary.actIndex !== 0 || oldBoundary.remaining < 42 || oldBoundary.remaining > 46) throw new Error(`old 45 s boundary still advances: ${JSON.stringify(oldBoundary)}`);
  if (!lateRushA.rush || lateRushA.formationBeat !== "pincer") throw new Error(`54 s combat grammar is not active: ${JSON.stringify(lateRushA)}`);
  if (!lateRushB.rush || lateRushB.formationBeat !== "crossfire") throw new Error(`75 s combat grammar is not active: ${JSON.stringify(lateRushB)}`);
  if (ending.actIndex !== 0 || ending.remaining > 1.5) throw new Error(`Act advanced before 90 s: ${JSON.stringify(ending)}`);
  if (nextAct.actIndex !== 1 || nextAct.actId !== "red-canyon" || nextAct.target !== 16 || nextAct.remaining < 87 || nextAct.remaining > 90) throw new Error(`Act did not transition near 90 s: ${JSON.stringify(nextAct)}`);
  for (const entry of samples) {
    if (!entry.playerVisible) throw new Error(`player left frame: ${JSON.stringify(entry)}`);
    if (entry.enemyVisible < 3 || entry.enemyVisible > 8) throw new Error(`bad phone enemy density: ${JSON.stringify(entry)}`);
    if (entry.enemyCombatLane < 1) throw new Error(`empty combat lane: ${JSON.stringify(entry)}`);
    if (entry.activeRoles < 3) throw new Error(`role population too sparse: ${JSON.stringify(entry)}`);
  }
  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ viewport: { width: 844, height: 390, dpr: 2 }, samples, errors }, null, 2));
  console.log("SKY RAID V29 LONG ACTS PASS", JSON.stringify(samples));
} catch (error) {
  try {
    fs.writeFileSync(path.join(out, "failure.txt"), String(error?.stack ?? error));
    await page?.screenshot({ path: path.join(out, "failure.png"), timeout: 6000 });
  } catch {}
  throw error;
} finally {
  clearTimeout(watchdog);
  try { await page?.evaluate(() => { delete window.__skyRaidAuditElapsedSeconds; }); } catch {}
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}
