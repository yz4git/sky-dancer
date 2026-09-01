import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const outputDir = "artifacts/arcade-v1042-city-hazard-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage", "--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
page.on("console", (message) => { if (message.type() === "error" && !/status of 404/i.test(message.text())) consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("response", (response) => { if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() }); });

await page.goto("http://127.0.0.1:4173/?menu=1&v1042-hazard-audit=1", { waitUntil: "networkidle", timeout: 60000 });
const arcade = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
await arcade.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30000 });
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1042HazardAudit), null, { timeout: 30000 });
const box = await canvas.boundingBox();
if (!box) throw new Error("missing WebGL canvas box");

const samples = [];
for (const distance of [1450, 1620, 1790]) {
  const state = await page.evaluate((value) => globalThis.__skyDancerV1042HazardAudit.sample(value), distance);
  samples.push(state);
  await page.screenshot({ path: `${outputDir}/dawn-city-${distance}.png`, type: "png", clip: box });
}

const optional = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optional(entry));
const report = { samples, consoleErrors, pageErrors, httpErrors, blockingHttpErrors };
await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
await browser.close();

if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
for (const sample of samples) {
  if (sample.stageId !== "dawn-city") throw new Error(`wrong stage ${sample.stageId}`);
  if (sample.hazards.length !== 2) throw new Error(`expected 2 hazards, got ${sample.hazards.length}`);
  for (const hazard of sample.hazards) {
    if (!hazard.anchored) throw new Error(`${hazard.name} is not anchored`);
    const drift = hazard.rotationAfter.map((value, index) => Math.abs(value - hazard.rotationBefore[index]));
    if (drift.some((value) => value > 1e-9)) throw new Error(`${hazard.name} rotated independently: ${JSON.stringify(drift)}`);
  }
}
