import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/sky-raid-v2-compare";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});

async function startMode(modeLabel, canvasLabel) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${baseUrl}?menu=1&audit=${Date.now()}`, { waitUntil: "networkidle", timeout: 60_000 });
  const mode = page.locator("button").filter({ hasText: new RegExp(`^\\s*${modeLabel}`, "i") }).first();
  if (!(await mode.count())) throw new Error(`Missing mode button ${modeLabel}: ${JSON.stringify(await page.locator("button").allTextContents())}`);
  await mode.click({ force: true });
  await page.waitForTimeout(100);
  const start = page.locator("button").filter({ hasText: /START/i }).last();
  await start.click({ force: true });
  const canvas = page.locator(`canvas[aria-label="${canvasLabel}"]`);
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  return { context, page, canvas, errors };
}

async function captureCanvas(page, canvas, path) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  await page.screenshot({ path, clip: box });
}

async function readLegacyVisualOwners(page) {
  return page.evaluate(() => ({
    v35: typeof window.__skyDancerGetReferenceVisualV35 === "function" ? window.__skyDancerGetReferenceVisualV35() : null,
    v36: typeof window.__skyDancerGetV36WorldDebug === "function" ? window.__skyDancerGetV36WorldDebug() : null,
    v39: typeof window.__skyDancerGetReferenceVisualV39 === "function" ? window.__skyDancerGetReferenceVisualV39() : null,
  }));
}

async function raidState(page) {
  return page.evaluate(() => ({
    mode: document.documentElement.dataset.skyDancerMode,
    act: document.documentElement.dataset.skyRaidAct,
    style: document.documentElement.dataset.skyRaidWorldStyle,
    body: document.body.innerText,
  }));
}

const report = {};
{
  const { context, page, canvas, errors } = await startMode("ARCADE RUN", "Sky Dancer Arcade Run WebGL game view");
  await page.waitForTimeout(1500);
  await captureCanvas(page, canvas, `${outputDir}/arcade-00-opening.png`);
  await page.waitForTimeout(2500);
  await captureCanvas(page, canvas, `${outputDir}/arcade-01-course.png`);
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1300);
  await captureCanvas(page, canvas, `${outputDir}/arcade-02-maneuver.png`);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowUp");
  report.arcade = { errors, body: (await page.locator("body").innerText()).slice(0, 2000) };
  await context.close();
}
{
  const { context, page, canvas, errors } = await startMode("SKY RAID", "Sky Dancer WebGL game view");
  const acts = ["dawn-city", "red-canyon", "cloud-fleet", "storm-carrier", "prism-citadel"];
  const actReports = [];
  for (let index = 0; index < acts.length; index += 1) {
    const expected = acts[index];
    await page.waitForFunction((act) => document.documentElement.dataset.skyRaidAct === act, expected, { timeout: index === 0 ? 15_000 : 40_000 });
    await page.waitForTimeout(index === 0 ? 1500 : 900);
    await captureCanvas(page, canvas, `${outputDir}/raid-act${index + 1}-${expected}.png`);
    const state = await raidState(page);
    const legacyOwners = await readLegacyVisualOwners(page);
    const forbiddenHud = ["STAGE 1", "WAVE", "HEAD-ON CROSS", "CITY AIRSPACE", "ABOVE", "BELOW", "GAS 100%"].filter((text) => state.body.includes(text));
    actReports.push({ index, expected, state: { mode: state.mode, act: state.act, style: state.style }, legacyOwners, forbiddenHud });
    if (index === 0) {
      const pad = page.locator('[aria-label="Sky Raid two-axis flight stick"]');
      if (await pad.count()) {
        const box = await pad.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.22, { steps: 8 });
          await page.waitForTimeout(1100);
          await captureCanvas(page, canvas, `${outputDir}/raid-act1-flight-stick-maneuver.png`);
          await page.mouse.up();
        }
      }
    }
  }
  report.raid = { acts: actReports, errors, body: (await page.locator("body").innerText()).slice(0, 2500) };
  await context.close();
}
await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
