import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
const start = page.getByRole("button", { name: /START(?: HARD)? RUN/i });
if (await start.isVisible().catch(() => false)) await start.click();
const canvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForTimeout(900);

const forceAvailable = await page.evaluate(() => typeof window.__skyDancerForceBossAuditV34 === "function");
if (!forceAvailable) throw new Error("V34 webdriver boss audit control is unavailable");
await page.evaluate(() => window.__skyDancerForceBossAuditV34());

let boss = null;
for (let attempt = 0; attempt < 80; attempt += 1) {
  await page.waitForTimeout(100);
  boss = await page.evaluate(() => typeof window.__skyDancerGetBossQualityV34 === "function" ? window.__skyDancerGetBossQualityV34() : null);
  if (boss?.active) break;
}
if (!boss?.active) throw new Error(`Boss did not enter the live airspace: ${JSON.stringify(boss)}`);
if (Number(boss.maxHp) < 192) throw new Error(`Boss durability floor did not apply: ${JSON.stringify(boss)}`);
if (Number(boss.distance) < 10 || Number(boss.distance) > 80) throw new Error(`Boss arrival distance is unreadable: ${JSON.stringify(boss)}`);

await page.waitForTimeout(650);
const phaseHudVisible = await page.getByLabel("Boss phase status").isVisible().catch(() => false);
if (!phaseHudVisible) throw new Error("V34 boss phase HUD is not visible");
await page.screenshot({ path: `${outputDir}/07-boss-phase1.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/07-boss-phase1-canvas.png` });

// SwiftShader can execute fewer fixed simulation steps than wall-clock time.
// Observe the actual director state instead of assuming 8.5 wall-clock seconds
// always advances the 60 Hz combat clock through the complete phase-1 cycle.
const samples = [];
const modes = new Set();
let coreOpenObserved = false;
for (let index = 0; index < 180; index += 1) {
  await page.waitForTimeout(100);
  const sample = await page.evaluate(() => typeof window.__skyDancerGetBossQualityV34 === "function" ? window.__skyDancerGetBossQualityV34() : null);
  if (sample?.active) {
    samples.push(sample);
    modes.add(sample.mode);
    coreOpenObserved ||= Boolean(sample.coreOpen);
  }
  if (modes.has("orbit") && modes.has("strike") && modes.has("break") && coreOpenObserved && samples.length >= 30) break;
}
const finalBoss = samples.at(-1) ?? boss;
await page.screenshot({ path: `${outputDir}/08-boss-cadence.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/08-boss-cadence-canvas.png` });

const diagnostics = {
  initialBoss: boss,
  finalBoss,
  observedModes: [...modes],
  coreOpenObserved,
  phaseHudVisible,
  sampleCount: samples.length,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/boss-diagnostics.json`, JSON.stringify(diagnostics, null, 2));

if (!modes.has("orbit") || !modes.has("strike") || !modes.has("break")) {
  throw new Error(`Boss did not execute a full attack cadence: ${JSON.stringify(diagnostics)}`);
}
if (!coreOpenObserved) throw new Error(`Boss recovery never exposed the V34 core: ${JSON.stringify(diagnostics)}`);
if (pageErrors.length) throw new Error(`Page errors during boss audit: ${pageErrors.join(" | ")}`);
await browser.close();
