import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v1032-terrain-solidity";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [], pageErrors = [], httpErrors = [];
page.on("console", m => { if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/i.test(m.text())) consoleErrors.push(m.text()); });
page.on("pageerror", e => pageErrors.push(String(e)));
page.on("response", r => { if (r.status() >= 400) httpErrors.push({ status: r.status(), url: r.url() }); });

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcade = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcade.count()) await arcade.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1032TerrainAudit), null, { timeout: 30_000 });

const shot = async name => {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("missing canvas bounds");
  await page.screenshot({ path: `${outputDir}/${name}.png`, clip: box });
};
const renderState = await canvas.evaluate(c => {
  const rect = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return { webgl: Boolean(gl), width: rect.width, height: rect.height, backingWidth: c.width, backingHeight: c.height, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
});

const captures = [];
const points = [.12, .18, .25, .29, .39, .43, .51];
let index = 0;
for (const progress of points) {
  const state = await page.evaluate(p => globalThis.__skyDancerV1032TerrainAudit.setCourse(p), progress);
  await page.waitForTimeout(160);
  const name = `${String(index).padStart(2,"0")}-dawn-city-${Math.round(progress*100)}pct`;
  await shot(name);
  captures.push({ name, ...state });
  index++;
}

// Also exercise live steering over the fixed product world after the deterministic seam checks.
await page.evaluate(() => globalThis.__skyDancerV1032TerrainAudit.resumeLive());
await page.waitForTimeout(500);
await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(900);
await shot("10-live-right-climb");
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowUp");
await page.keyboard.down("ArrowLeft");
await page.keyboard.down("ArrowDown");
await page.waitForTimeout(900);
await shot("11-live-left-dive");
await page.keyboard.up("ArrowLeft");
await page.keyboard.up("ArrowDown");

const finalSnapshot = await page.evaluate(() => globalThis.__skyDancerV1032TerrainAudit.snapshot());
const optional = ({status,url}) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter(e => !optional(e));
const diagnostics = { renderState, captures, finalSnapshot, consoleErrors, pageErrors, httpErrors, blockingHttpErrors };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!renderState.webgl || renderState.width < 800 || renderState.height < 360) throw new Error(`invalid WebGL surface ${JSON.stringify(renderState)}`);
for (const c of captures) {
  if (c.stageId !== "dawn-city") throw new Error(`wrong stage ${c.stageId}`);
  if (c.riverCount !== 8) throw new Error(`river count ${c.riverCount}`);
  if (!c.doubleSided) throw new Error(`river not double-sided at ${c.progress}`);
  if (c.minSurfaceDepth < 140) throw new Error(`surface overlap ${c.minSurfaceDepth}`);
  if (c.chunkCount !== 8) throw new Error(`chunk count ${c.chunkCount}`);
  if (!Number.isFinite(c.maxAbsPitch) || c.maxAbsPitch <= 0) throw new Error(`invalid pitch at ${c.progress}`);
}
if (finalSnapshot.hp <= 0) throw new Error(`player hp ${finalSnapshot.hp}`);
if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
