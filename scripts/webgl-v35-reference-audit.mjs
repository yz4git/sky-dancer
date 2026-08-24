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
await page.waitForTimeout(1400);

const bridgeAvailable = await page.evaluate(() => typeof window.__skyDancerGetReferenceVisualV35 === "function");
if (!bridgeAvailable) throw new Error("V35 webdriver visual audit bridge is unavailable");
const visual = await page.evaluate(() => window.__skyDancerGetReferenceVisualV35());

if (Number(visual.cityTotal) < 110) throw new Error(`V35 metro density is too low: ${JSON.stringify(visual)}`);
if (Number(visual.cityHigh) < 3) throw new Error(`V35 landmark/high-rise tier is missing: ${JSON.stringify(visual)}`);
if (Number(visual.roadCount) < 8 || Number(visual.riverCount) < 20) throw new Error(`V35 city structure is incomplete: ${JSON.stringify(visual)}`);
if (Number(visual.cloudCount) < 40) throw new Error(`V35 below-flight cloud layer is incomplete: ${JSON.stringify(visual)}`);
if (!visual.fieldsVisible || !visual.settlementsVisible || !visual.towersVisible) throw new Error(`Recovered V31 density is not visible: ${JSON.stringify(visual)}`);
if (visual.v34MassesVisible) throw new Error(`V34 broad terrain masses still override the reference hierarchy: ${JSON.stringify(visual)}`);
if (visual.legacyRidgesVisible) throw new Error(`Legacy stretched ridges are still visible: ${JSON.stringify(visual)}`);
if (!visual.cameraFramingInstalled) throw new Error(`V35 reference camera framing was not installed: ${JSON.stringify(visual)}`);
if (Number(visual.fogNear) < 600 || Number(visual.fogFar) < 1700) throw new Error(`V35 atmosphere clips metro depth: ${JSON.stringify(visual)}`);

await page.screenshot({ path: `${outputDir}/09-v35-reference.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/09-v35-reference-canvas.png` });
const diagnostics = { visual, consoleErrors, pageErrors };
await writeFile(`${outputDir}/v35-reference-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
if (consoleErrors.length) throw new Error(`Console errors during V35 reference audit: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`Page errors during V35 reference audit: ${pageErrors.join(" | ")}`);
await browser.close();
