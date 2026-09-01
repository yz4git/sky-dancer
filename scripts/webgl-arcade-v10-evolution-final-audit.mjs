import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v10-evolution-final";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (/Failed to load resource: the server responded with a status of 404/i.test(text)) return;
  consoleErrors.push(text);
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("response", (response) => { if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() }); });

const capturePage = async (name) => page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: false });

await page.goto(`${baseUrl}?menu=1&v10Audit=1`, { waitUntil: "networkidle", timeout: 60_000 });
await page.evaluate(() => {
  localStorage.removeItem("sky-dancer-arcade-progress-v2");
  localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({
    version: 1,
    clearedStageIds: ["dawn-city"], unlockedStageIds: ["dawn-city"], records: {},
    bestRunScore: 12345, bestRunRank: "A", completedRuns: 0, oneCreditClears: 0,
  }));
});
await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
const legacyText = await page.locator("body").innerText();
if (!/BEST 12345 A/i.test(legacyText)) throw new Error("V1 meta progress did not migrate into V10 title readout");

await page.evaluate(() => {
  localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify({
    version: 2,
    clearedStageIds: ["dawn-city"], unlockedStageIds: ["dawn-city"], records: {},
    bestRunScore: 987654, bestRunRank: "SS", completedRuns: 3, oneCreditClears: 1,
    totalKills: 210, totalNearMisses: 44, totalBossKills: 12, totalArmorBreaks: 35,
    totalFormationBreaks: 18, bestChain: 14,
    bestRoute: ["dawn-city", "red-canyon"], bestRouteScore: 987654,
    unlockedPaintSchemes: ["default", "sunset", "storm", "prism"],
    unlockedLoadouts: ["standard", "missile-focus", "gun-focus"],
  }));
});
await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
const metaText = await page.locator("body").innerText();
if (!/BEST 987654 SS/i.test(metaText) || !/BOSS 12/i.test(metaText) || !/CHAIN ×14/i.test(metaText) || !/UNLOCKS 7/i.test(metaText)) {
  throw new Error("V10 meta summary is not visible on the title screen");
}
await capturePage("00-meta-title");

const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START ARCADE RUN/i }).first();
if (!(await start.count())) throw new Error("No START ARCADE RUN action");
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => typeof window.__skyV10Audit === "function", null, { timeout: 30_000 });
await page.waitForTimeout(220);

const glState = await canvas.evaluate((element) => {
  const gl = element.getContext("webgl2") || element.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return { webgl: Boolean(gl), width: element.clientWidth, height: element.clientHeight, backingWidth: element.width, backingHeight: element.height, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
});
const hpFromBody = async () => Number(((await page.locator("body").innerText()).match(/AIRFRAME\s*([0-9]+)%/i) || [null, "0"])[1]);
const invoke = (mode) => page.evaluate((nextMode) => window.__skyV10Audit(nextMode), mode);

const baseline = await invoke("status");
await capturePage("01-combat-baseline");

const stageEvent = await invoke("stage-event");
await page.waitForTimeout(65);
await capturePage("02-stage-event-cinematic");
const stageHazards = await invoke("stage-hazards");
await page.waitForTimeout(80);
await capturePage("03-stage-event-hazards");

const formationSetup = await invoke("formation-setup");
await page.waitForTimeout(80);
await capturePage("04-formation-setup");
const formationBreak = await invoke("formation-break");
await page.waitForTimeout(70);
await capturePage("05-formation-break");

const boss1 = await invoke("boss-1");
await page.waitForTimeout(80);
await capturePage("06-boss-phase1-armor");
const armorBreak = await invoke("armor-break");
await page.waitForTimeout(65);
await capturePage("07-boss-armor-break");
const boss2 = await invoke("boss-2");
await page.waitForTimeout(75);
await capturePage("08-boss-phase2-core-open");
const boss3 = await invoke("boss-3");
await page.waitForTimeout(75);
await capturePage("09-boss-phase3-final-assault");
const bossKill = await invoke("boss-kill");
await page.waitForTimeout(65);
await capturePage("10-boss-kill-primary");
await page.waitForTimeout(260);
await capturePage("11-boss-kill-debris");

const finalStatus = await invoke("status");
const optionalHttpProbe = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optionalHttpProbe(entry));
const diagnostics = {
  glState,
  hp: await hpFromBody(),
  baseline, stageEvent, stageHazards, formationSetup, formationBreak,
  boss1, armorBreak, boss2, boss3, bossKill, finalStatus,
  legacyMigrationVisible: /BEST 12345 A/i.test(legacyText),
  metaVisible: /BEST 987654 SS/i.test(metaText) && /UNLOCKS 7/i.test(metaText),
  consoleErrors, pageErrors, httpErrors, blockingHttpErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!glState.webgl || glState.width < 800 || glState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(glState)}`);
if (diagnostics.hp <= 0) throw new Error(`Airframe lost: ${diagnostics.hp}`);
if (!stageEvent?.ok || stageEvent.stageEventSerial < 1 || !stageEvent.stageEventLabel) throw new Error(`Stage evolution failed: ${JSON.stringify(stageEvent)}`);
if (!formationBreak?.ok || formationBreak.formationBreaks < 1 || formationBreak.bestChain < 3) throw new Error(`Formation Break failed: ${JSON.stringify(formationBreak)}`);
if (!boss1?.ok || boss1.phase !== 1 || boss1.maxArmor <= 0) throw new Error(`Boss phase 1 armor failed: ${JSON.stringify(boss1)}`);
if (!armorBreak?.ok || armorBreak.armorBreaks < 1 || armorBreak.armor > 0) throw new Error(`Armor break failed: ${JSON.stringify(armorBreak)}`);
if (!boss2?.ok || boss2.phase !== 2 || !boss2.coreOpen) throw new Error(`Boss phase 2 core-open failed: ${JSON.stringify(boss2)}`);
if (!boss3?.ok || boss3.phase !== 3 || !boss3.coreOpen) throw new Error(`Boss phase 3 failed: ${JSON.stringify(boss3)}`);
if (!bossKill?.ok || bossKill.bossKills < 1) throw new Error(`Boss kill failed: ${JSON.stringify(bossKill)}`);
if (!diagnostics.legacyMigrationVisible || !diagnostics.metaVisible) throw new Error("Arcade meta layer visibility failed");
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
