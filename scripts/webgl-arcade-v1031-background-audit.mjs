import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v1031-background";
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
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1031Audit), null, { timeout: 30_000 });

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

// Real play sanity: scenery must remain continuous while steering, boosting and fighting.
await page.waitForTimeout(800); await shot("00-live-opening-v1031");
await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp"); await page.waitForTimeout(800); await shot("01-live-turn-v1031");
await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
await page.keyboard.down(" "); await page.waitForTimeout(650); await shot("02-live-turbo-v1031"); await page.keyboard.up(" ");
await page.keyboard.down("ArrowLeft"); await page.keyboard.down("c"); await page.keyboard.down("x"); await page.waitForTimeout(900); await shot("03-live-combat-v1031");
for (const key of ["ArrowLeft","c","x"]) await page.keyboard.up(key);

const cases = [
  ["red-canyon",.31],
  ["cloud-fleet",.31],
  ["ice-cavern",.22],
  ["ice-cavern",.41],
  ["storm-carrier",.31],
  ["prism-citadel",.31],
];
const captures=[];
let index=10;
for (const [stageId,progress] of cases) {
  const state=await page.evaluate(({stageId,progress})=>globalThis.__skyDancerV1031Audit.setCourse(stageId,progress),{stageId,progress});
  await page.waitForTimeout(120);
  const name=`${String(index).padStart(2,"0")}-${stageId}-${Math.round(progress*100)}-v1031`;
  await shot(name); captures.push({name,...state}); index++;
}
await page.screenshot({ path: `${outputDir}/99-final-full.png`, fullPage: true });
const optional=({status,url})=>status===404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors=httpErrors.filter(e=>!optional(e));
const diagnostics={renderState,captures,consoleErrors,pageErrors,httpErrors,blockingHttpErrors};
await writeFile(`${outputDir}/diagnostics.json`,JSON.stringify(diagnostics,null,2));
await browser.close();

if (!renderState.webgl || renderState.width < 800 || renderState.height < 360) throw new Error(`invalid WebGL surface ${JSON.stringify(renderState)}`);
for (const c of captures) {
  if (c.chunkCount !== 8) throw new Error(`${c.stageId}: chunkCount=${c.chunkCount}`);
  if (!c.backdrop) throw new Error(`${c.stageId}: backdrop missing`);
  if (c.visibleChunkCount < 3) throw new Error(`${c.stageId}: visible chunks=${c.visibleChunkCount}`);
  if (![c.cameraX,c.cameraY,c.cameraRoll].every(Number.isFinite)) throw new Error(`${c.stageId}: invalid camera`);
}
if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
