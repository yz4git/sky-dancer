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

const report = {};
{
  const { context, page, canvas, errors } = await startMode("ARCADE RUN", "Sky Dancer Arcade Run WebGL game view");
  await page.waitForTimeout(1500);
  await captureCanvas(page, canvas, `${outputDir}/arcade-00-opening.png`);
  await page.waitForTimeout(2500);
  await captureCanvas(page, canvas, `${outputDir}/arcade-01-course.png`);
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1300);
  await captureCanvas(page, canvas, `${outputDir}/arcade-02-maneuver.png`);
  await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
  report.arcade = { errors, body: (await page.locator("body").innerText()).slice(0, 2000) };
  await context.close();
}
{
  const { context, page, canvas, errors } = await startMode("SKY RAID", "Sky Dancer WebGL game view");
  await page.waitForTimeout(1500);
  await captureCanvas(page, canvas, `${outputDir}/raid-00-opening.png`);
  const opening = await page.evaluate(() => ({ mode: document.documentElement.dataset.skyDancerMode, act: document.documentElement.dataset.skyRaidAct, style: document.documentElement.dataset.skyRaidWorldStyle }));
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1300);
  await captureCanvas(page, canvas, `${outputDir}/raid-01-maneuver.png`);
  await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(22500);
  await captureCanvas(page, canvas, `${outputDir}/raid-02-act2.png`);
  const act2 = await page.evaluate(() => ({ mode: document.documentElement.dataset.skyDancerMode, act: document.documentElement.dataset.skyRaidAct, style: document.documentElement.dataset.skyRaidWorldStyle }));
  report.raid = { opening, act2, errors, body: (await page.locator("body").innerText()).slice(0, 2000) };
  await context.close();
}
await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
