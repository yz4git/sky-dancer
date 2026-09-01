import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v102-course";
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
page.on("response", (response) => {
  if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() });
});

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });

const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV102Audit), null, { timeout: 30_000 });
await page.waitForTimeout(250);

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

await captureCanvas("00-opening");
const cases = [
  ["dawn-city", 0.11, "01-dawn-turn-a"],
  ["dawn-city", 0.25, "02-dawn-turn-b"],
  ["dawn-city", 0.39, "03-dawn-turn-c"],
  ["dawn-city", 0.50, "04-dawn-turn-d"],
  ["ice-cavern", 0.22, "05-ice-climb"],
  ["ice-cavern", 0.38, "06-ice-dive"],
  ["orbital-ascent", 0.42, "07-orbit-ascent"],
];
const captures = [];
for (const [stageId, progress, name] of cases) {
  const state = await page.evaluate(({ stageId, progress }) => globalThis.__skyDancerV102Audit.setCourse(stageId, progress), { stageId, progress });
  await page.waitForTimeout(120);
  await captureCanvas(name);
  captures.push({ name, ...state });
}
await page.screenshot({ path: `${outputDir}/08-final-full.png`, fullPage: true });

const body = await page.locator("body").innerText();
const hpMatch = body.match(/AIRFRAME\s*([0-9]+)%/i);
const optionalHttpProbe = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optionalHttpProbe(entry));
const dawn = captures.filter((c) => c.stageId === "dawn-city");
const dawnRolls = dawn.map((c) => c.cameraRoll);
const diagnostics = {
  renderState,
  hp: hpMatch ? Number(hpMatch[1]) : null,
  stageVisible: /ORBITAL ASCENT|ARCADE RUN|STAGE/i.test(body),
  captures,
  dawnRollSpan: Math.max(...dawnRolls) - Math.min(...dawnRolls),
  dawnRollHasBothSigns: dawnRolls.some((v) => v < -0.04) && dawnRolls.some((v) => v > 0.04),
  consoleErrors,
  pageErrors,
  httpErrors,
  blockingHttpErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!renderState.webgl || renderState.width < 800 || renderState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(renderState)}`);
if (diagnostics.hp !== null && diagnostics.hp <= 0) throw new Error(`Airframe lost during deterministic course audit: ${diagnostics.hp}`);
if (!diagnostics.stageVisible) throw new Error(`Arcade HUD/stage not visible: ${body.slice(0, 400)}`);
if (diagnostics.dawnRollSpan < 0.12) throw new Error(`Dawn City horizon bank did not vary enough: ${diagnostics.dawnRollSpan}`);
if (!diagnostics.dawnRollHasBothSigns) throw new Error(`Dawn City did not visibly reverse bank: ${JSON.stringify(dawnRolls)}`);
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
