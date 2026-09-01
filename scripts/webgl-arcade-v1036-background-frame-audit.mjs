import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v1036-background-frame-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/i.test(m.text())) consoleErrors.push(m.text());
});
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400) httpErrors.push({ status: r.status(), url: r.url() }); });

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcade = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcade.count()) await arcade.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1036FrameAudit), null, { timeout: 30_000 });

const box = await canvas.boundingBox();
if (!box) throw new Error("Arcade Run canvas has no bounding box");
const renderState = await canvas.evaluate((c) => {
  const rect = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    webgl: Boolean(gl), width: rect.width, height: rect.height,
    backingWidth: c.width, backingHeight: c.height,
    renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
  };
});

const cases = [
  { stageId: "dawn-city", progress: .16, moveX: 0, moveY: 0, turbo: false, label: "city-neutral" },
  { stageId: "dawn-city", progress: .29, moveX: 1, moveY: .65, turbo: false, label: "city-right-climb" },
  { stageId: "dawn-city", progress: .41, moveX: -1, moveY: -.65, turbo: true, label: "city-left-dive" },
  { stageId: "red-canyon", progress: .22, moveX: 1, moveY: -.45, turbo: false, label: "canyon-right" },
  { stageId: "red-canyon", progress: .39, moveX: -1, moveY: .55, turbo: true, label: "canyon-left" },
  { stageId: "night-metro", progress: .18, moveX: 0, moveY: 0, turbo: false, label: "night-neutral" },
  { stageId: "night-metro", progress: .31, moveX: 1, moveY: .5, turbo: true, label: "night-right" },
  { stageId: "night-metro", progress: .44, moveX: -1, moveY: -.5, turbo: false, label: "night-left" },
  { stageId: "volcano-core", progress: .21, moveX: 1, moveY: -.4, turbo: false, label: "volcano-right" },
  { stageId: "volcano-core", progress: .38, moveX: -1, moveY: .45, turbo: true, label: "volcano-left" },
];

const samples = [];
for (const entry of cases) {
  const state = await page.evaluate((params) => globalThis.__skyDancerV1036FrameAudit.sample(params), entry);
  samples.push({ ...entry, ...state });
  await page.screenshot({ path: `${outputDir}/${entry.label}.png`, type: "png", clip: box });
}

const optional = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optional(entry));
const diagnostics = { renderState, samples, consoleErrors, pageErrors, httpErrors, blockingHttpErrors };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!renderState.webgl || renderState.width < 800 || renderState.height < 360) throw new Error(`invalid WebGL surface ${JSON.stringify(renderState)}`);
if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
for (const sample of samples) {
  if (!sample.backdropStable) throw new Error(`${sample.label} backdrop is not marked stable`);
  if (!sample.backdrop || sample.backdrop.some((value) => Math.abs(value) > 1e-8)) throw new Error(`${sample.label} backdrop moved: ${JSON.stringify(sample.backdrop)}`);
  if (!sample.chunkUnified || sample.chunkCount !== 8) throw new Error(`${sample.label} course frame ownership invalid`);
}
