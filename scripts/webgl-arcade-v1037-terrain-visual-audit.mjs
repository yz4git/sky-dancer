import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = "artifacts/arcade-v1037-terrain-visual-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
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
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1037TerrainAudit), null, { timeout: 30_000 });
const box = await canvas.boundingBox();
if (!box) throw new Error("missing canvas bounds");

const cases = [
  { stageId: "red-canyon", progress: .22, moveX: 1, moveY: -.45, turbo: false, label: "canyon-right" },
  { stageId: "red-canyon", progress: .39, moveX: -1, moveY: .55, turbo: true, label: "canyon-left" },
  { stageId: "volcano-core", progress: .21, moveX: 1, moveY: -.4, turbo: false, label: "volcano-right" },
  { stageId: "volcano-core", progress: .38, moveX: -1, moveY: .45, turbo: true, label: "volcano-left" },
  { stageId: "ice-cavern", progress: .31, moveX: 1, moveY: .55, turbo: false, label: "ice-turn" },
  { stageId: "desert-fortress", progress: .34, moveX: -1, moveY: -.45, turbo: true, label: "desert-turn" },
];
const samples = [];
for (const entry of cases) {
  const state = await page.evaluate(params => globalThis.__skyDancerV1037TerrainAudit.sample(params), entry);
  samples.push({ ...entry, ...state });
  await page.screenshot({ path: `${outputDir}/${entry.label}.png`, type: "png", clip: box });
}
const optional = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter(entry => !optional(entry));
const diagnostics = { samples, consoleErrors, pageErrors, httpErrors, blockingHttpErrors };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (consoleErrors.length || pageErrors.length || blockingHttpErrors.length) throw new Error(JSON.stringify({ consoleErrors, pageErrors, blockingHttpErrors }));
for (const sample of samples) {
  if (!sample.continuousTerrain) throw new Error(`${sample.label}: missing V10.3.7 continuous terrain`);
  if (sample.legacyTerrainCount !== 0) throw new Error(`${sample.label}: legacy rigid terrain still present`);
  if (!sample.terrainFinite) throw new Error(`${sample.label}: non-finite terrain vertices`);
}
