import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v103-background";
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

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV103Audit), null, { timeout: 30_000 });

const captureCanvas = async (name) => {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Arcade canvas has no bounding box");
  await page.screenshot({ path: `${outputDir}/${name}.png`, clip: box });
};
const renderState = await canvas.evaluate((element) => {
  const c = element; const rect = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return { webgl: Boolean(gl), width: rect.width, height: rect.height, backingWidth: c.width, backingHeight: c.height, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
});

// Real gameplay sequence: exercise course motion, evasive input, turbo and combat while scenery streams.
await page.waitForTimeout(900); await captureCanvas("00-live-opening");
await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp"); await page.waitForTimeout(1000); await captureCanvas("01-live-right-climb");
await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
await page.keyboard.down(" "); await page.waitForTimeout(900); await captureCanvas("02-live-turbo"); await page.keyboard.up(" ");
await page.keyboard.down("ArrowLeft"); await page.keyboard.down("ArrowDown"); await page.keyboard.down("c"); await page.keyboard.down("x");
await page.waitForTimeout(1300); await captureCanvas("03-live-combat-left-dive");
await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowDown"); await page.keyboard.up("c"); await page.keyboard.up("x");

const cases = [
  ["dawn-city", .18], ["dawn-city", .43],
  ["red-canyon", .19], ["red-canyon", .46],
  ["cloud-sea", .20], ["cloud-sea", .44],
  ["storm-carrier", .18], ["storm-carrier", .47],
  ["desert-fortress", .20], ["desert-fortress", .45],
  ["ice-cavern", .22], ["ice-cavern", .41],
  ["floating-ruins", .18], ["floating-ruins", .46],
  ["neon-metro", .20], ["neon-metro", .43],
  ["volcano-core", .19], ["volcano-core", .47],
  ["orbital-ascent", .21], ["orbital-ascent", .48],
  ["prism-citadel", .19], ["prism-citadel", .46],
];
const captures = [];
let n = 10;
for (const [stageId, progress] of cases) {
  const state = await page.evaluate(({ stageId, progress }) => globalThis.__skyDancerV103Audit.setCourse(stageId, progress), { stageId, progress });
  await page.waitForTimeout(80);
  const name = `${String(n).padStart(2, "0")}-${stageId}-${String(Math.round(progress * 100)).padStart(2, "0")}`;
  await captureCanvas(name);
  captures.push({ name, ...state }); n += 1;
}
await page.screenshot({ path: `${outputDir}/99-final-full.png`, fullPage: true });
const body = await page.locator("body").innerText();
const optionalHttpProbe = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optionalHttpProbe(entry));
const diagnostics = { renderState, captures, consoleErrors, pageErrors, httpErrors, blockingHttpErrors, bodyPreview: body.slice(0, 500) };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!renderState.webgl || renderState.width < 800 || renderState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(renderState)}`);
for (const capture of captures) {
  if (capture.chunkCount !== 8) throw new Error(`${capture.stageId}: expected 8 streamed chunks, got ${capture.chunkCount}`);
  if (!capture.backdrop) throw new Error(`${capture.stageId}: backdrop disappeared`);
  if (capture.visibleChunkCount < 3) throw new Error(`${capture.stageId}: too few visible course chunks: ${capture.visibleChunkCount}`);
  if (!Number.isFinite(capture.cameraX) || !Number.isFinite(capture.cameraY) || !Number.isFinite(capture.cameraRoll)) throw new Error(`${capture.stageId}: non-finite camera state`);
}
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
