import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-stage-identity-v82";
const stages = [
  { id: "dawn-city", short: "CITY", name: "DAWN CITY" },
  { id: "red-canyon", short: "CANYON", name: "RED CANYON" },
  { id: "cloud-fleet", short: "FLEET", name: "CLOUD FLEET" },
  { id: "storm-carrier", short: "STORM", name: "STORM CARRIER" },
  { id: "desert-fortress", short: "DESERT", name: "DESERT FORTRESS" },
  { id: "ice-cavern", short: "ICE", name: "ICE CAVERN" },
  { id: "floating-ruins", short: "RUINS", name: "FLOATING RUINS" },
  { id: "night-metro", short: "METRO", name: "NIGHT METRO" },
  { id: "volcano-core", short: "VOLCANO", name: "VOLCANO CORE" },
  { id: "orbital-ascent", short: "ORBIT", name: "ORBITAL ASCENT" },
  { id: "prism-citadel", short: "CITADEL", name: "PRISM CITADEL" },
];
const allStageIds = stages.map((stage) => stage.id);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => {
  localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version: 1, clearedStageIds: ids, unlockedStageIds: ids, records: {}, bestRunScore: 0, bestRunRank: "D", completedRuns: 0, oneCreditClears: 0 }));
}, allStageIds);

async function selectPracticeStage(page, shortName) {
  const modeSelect = page.locator('[aria-label="Select game mode"]');
  const practiceMode = modeSelect.locator("button").filter({ hasText: /STAGE PRACTICE/i }).first();
  await practiceMode.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const mode = document.querySelector('[aria-label="Select game mode"]');
    const button = mode && [...mode.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("STAGE PRACTICE"));
    return Boolean(button && !button.disabled);
  });
  await practiceMode.click();
  const practiceSelect = page.locator('[aria-label="Select practice stage"]');
  await practiceSelect.waitFor({ state: "visible" });
  const buttons = practiceSelect.locator("button");
  const count = await buttons.count();
  let target = null;
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const strong = (await button.locator("strong").textContent())?.trim();
    if (strong === shortName) { target = button; break; }
  }
  if (!target) throw new Error(`Practice stage ${shortName} not found: ${JSON.stringify(await buttons.allTextContents())}`);
  await target.click();
  await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
}

async function captureCanvas(page, canvas, path) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Arcade Run canvas has no bounding box");
  await page.screenshot({ path, clip: box, timeout: 60_000 });
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

const diagnostics = [];
for (const [index, stage] of stages.entries()) {
  console.log(`[stage-audit:v82] ${stage.id}: open`);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
  await selectPracticeStage(page, stage.short);
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });

  const prefix = `${String(index + 1).padStart(2, "0")}-${stage.id}`;
  const captures = [];
  const shot = async (suffix) => {
    const metadata = await captureCanvas(page, canvas, `${outputDir}/${prefix}-${suffix}.png`);
    captures.push({ suffix, ...metadata });
    console.log(`[stage-audit:v82] ${stage.id}: captured ${suffix}`);
  };

  await page.waitForTimeout(1200);
  await shot("entry");

  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(2500);
  await shot("signature-a");

  await page.keyboard.down(" ");
  await page.waitForTimeout(900);
  await shot("turbo");
  await page.keyboard.up(" ");

  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(950);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(5000);
  await shot("signature-b");

  const body = await page.locator("body").innerText();
  const hp = Number((body.match(/AIRFRAME\s*([0-9]+)%/i) || [0, 0])[1]);
  const glState = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl2") || element.getContext("webgl");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      webgl: Boolean(gl),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      backingWidth: element.width,
      backingHeight: element.height,
      renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    };
  });
  const blockingConsoleErrors = consoleErrors.filter((message) => !/Failed to load resource:.*404/i.test(message));
  const result = {
    stage: stage.id,
    stageVisible: body.includes(stage.name),
    hp,
    glState,
    captures,
    consoleErrors,
    blockingConsoleErrors,
    pageErrors,
    failed: /AIRFRAME LOST|MISSION FAILED/i.test(body),
  };
  diagnostics.push(result);
  console.log(`[stage-audit:v82] ${stage.id}: ${JSON.stringify(result)}`);
  await page.close();
}

await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

for (const item of diagnostics) {
  if (!item.stageVisible) throw new Error(`Stage HUD mismatch: ${JSON.stringify(item)}`);
  if (!item.glState.webgl || item.glState.width < 800 || item.glState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(item)}`);
  if (item.hp <= 0 || item.failed) throw new Error(`Stage identity audit lost airframe: ${JSON.stringify(item)}`);
  if (item.captures.length !== 4) throw new Error(`Unexpected visual capture count: ${JSON.stringify(item)}`);
  if (item.blockingConsoleErrors.length || item.pageErrors.length) throw new Error(`Stage identity audit errors: ${JSON.stringify(item)}`);
}
console.log(`[stage-audit:v82] complete: ${diagnostics.length} stages, ${diagnostics.reduce((n, item) => n + item.captures.length, 0)} captures`);
