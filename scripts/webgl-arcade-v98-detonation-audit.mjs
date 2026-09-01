import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v98-detonation";
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
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (/Failed to load resource: the server responded with a status of 404/i.test(text)) return;
  consoleErrors.push(text);
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });

const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForTimeout(1100);

const captureCanvas = async (name) => {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Arcade canvas has no bounding box");
  await page.screenshot({ path: `${outputDir}/${name}.png`, clip: box });
};

const renderState = await canvas.evaluate((element) => {
  const c = element;
  const rect = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    webgl: Boolean(gl),
    width: rect.width,
    height: rect.height,
    backingWidth: c.width,
    backingHeight: c.height,
    renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
  };
});
const bridge = await page.evaluate(() => Boolean(window.__skyV98Audit));
await captureCanvas("00-baseline");

const captures = [];
const trigger = async (kind, delay, name) => {
  await page.evaluate((effect) => {
    window.__skyV98Audit.clear();
    window.__skyV98Audit.emit(effect);
  }, kind);
  await page.waitForTimeout(delay);
  await captureCanvas(name);
  captures.push({ kind, delay, name });
  await page.waitForTimeout(1000);
};

await trigger("missile", 105, "01-missile-impact");
await trigger("small", 125, "02-small-kill");
await trigger("heavy", 175, "03-heavy-kill");
await trigger("boss", 95, "04-boss-primary");
await page.waitForTimeout(155);
await captureCanvas("05-boss-secondary");
captures.push({ kind: "boss-secondary", delay: 250, name: "05-boss-secondary" });

const text = await page.locator("body").innerText();
const hpMatch = text.match(/AIRFRAME\s*([0-9]+)%/i);
const diagnostics = {
  bridge,
  renderState,
  hp: hpMatch ? Number(hpMatch[1]) : null,
  stageVisible: /DAWN CITY|STAGE/i.test(text),
  captures,
  consoleErrors,
  pageErrors,
  failed: !bridge || !renderState.webgl || renderState.width < 800 || renderState.height < 360 || consoleErrors.length > 0 || pageErrors.length > 0,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (diagnostics.failed) throw new Error(`V9.8 visual audit failed: ${JSON.stringify(diagnostics)}`);
