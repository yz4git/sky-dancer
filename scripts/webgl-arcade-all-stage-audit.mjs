import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-all-stage-audit";
await mkdir(outputDir, { recursive: true });

const stages = [
  ["dawn-city", "CITY", "DAWN CITY"],
  ["red-canyon", "CANYON", "RED CANYON"],
  ["cloud-fleet", "FLEET", "CLOUD FLEET"],
  ["storm-carrier", "STORM", "STORM CARRIER"],
  ["desert-fortress", "DESERT", "DESERT FORTRESS"],
  ["ice-cavern", "ICE", "ICE CAVERN"],
  ["floating-ruins", "RUINS", "FLOATING RUINS"],
  ["night-metro", "METRO", "NIGHT METRO"],
  ["volcano-core", "VOLCANO", "VOLCANO CORE"],
  ["orbital-ascent", "ORBIT", "ORBITAL ASCENT"],
  ["prism-citadel", "CITADEL", "PRISM CITADEL"],
];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const fullProgress = {
  version: 1,
  clearedStageIds: stages.map(([id]) => id),
  unlockedStageIds: stages.map(([id]) => id),
  records: {},
  bestRunScore: 0,
  bestRunRank: "D",
  completedRuns: 0,
  oneCreditClears: 0,
};

const results = [];
for (let index = 0; index < stages.length; index += 1) {
  const [id, shortName, fullName] = stages[index];
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

  const menuUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}menu=1&stageAudit=${encodeURIComponent(id)}`;
  await page.goto(menuUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate((progress) => localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify(progress)), fullProgress);
  await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('button').filter({ hasText: /^\s*STAGE PRACTICE/i }).first().click({ force: true });
  const grid = page.locator('[aria-label="Select practice stage"]');
  await grid.waitFor({ state: "visible", timeout: 15_000 });
  const stageButton = grid.locator("button").filter({ hasText: new RegExp(`\\b${shortName}\\b`, "i") }).first();
  await stageButton.click({ force: true });
  const start = page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).last();
  await start.scrollIntoViewIfNeeded();
  await start.click({ force: true });

  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  const captureCanvas = async (suffix) => {
    const box = await canvas.boundingBox();
    if (!box) throw new Error(`No canvas box for ${id}`);
    await page.screenshot({ path: `${outputDir}/${String(index + 1).padStart(2, "0")}-${id}-${suffix}.png`, clip: box });
  };

  await page.waitForTimeout(1500);
  await captureCanvas("opening");
  await page.waitForTimeout(2600);
  await page.keyboard.down(" ");
  await page.waitForTimeout(950);
  await captureCanvas("signature");
  await page.keyboard.up(" ");

  const text = await page.locator("body").innerText();
  const hp = Number((text.match(/AIRFRAME\s*([0-9]+)%/i) || [0, 0])[1]);
  const stageSeen = new RegExp(fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text);
  const renderState = await canvas.evaluate((element) => {
    const c = element;
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    return { webgl: Boolean(gl), width: c.width, height: c.height };
  });
  const blockingHttpErrors = httpErrors.filter(({ status, url }) => !(status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname)));
  results.push({ id, fullName, stageSeen, hp, renderState, consoleErrors, pageErrors, blockingHttpErrors });
  await page.close();
}

await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify({ stages: results }, null, 2));
await browser.close();

const failures = results.filter((result) => !result.stageSeen || !result.renderState.webgl || result.consoleErrors.length || result.pageErrors.length || result.blockingHttpErrors.length);
if (failures.length) throw new Error(`All-stage audit failures: ${JSON.stringify(failures)}`);
