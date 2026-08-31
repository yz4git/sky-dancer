import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-stage-identity";
const stages = [
  { id: "red-canyon", short: "CANYON", name: "RED CANYON" },
  { id: "ice-cavern", short: "ICE", name: "ICE CAVERN" },
  { id: "volcano-core", short: "VOLCANO", name: "VOLCANO CORE" },
  { id: "orbital-ascent", short: "ORBIT", name: "ORBITAL ASCENT" },
];
const allStageIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });
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
    if (strong === shortName) {
      target = button;
      break;
    }
  }
  if (!target) {
    const labels = await buttons.allTextContents();
    throw new Error(`Practice stage ${shortName} not found. Buttons: ${JSON.stringify(labels)}`);
  }
  await target.click();
  await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
}

const diagnostics = [];
for (const [index, stage] of stages.entries()) {
  console.log(`[stage-audit] ${stage.id}: open`);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(20_000);
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
  await selectPracticeStage(page, stage.short);
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });
  console.log(`[stage-audit] ${stage.id}: running`);
  const prefix = `${String(index + 1).padStart(2, "0")}-${stage.id}`;
  const shot = async (suffix) => page.screenshot({ path: `${outputDir}/${prefix}-${suffix}.png`, timeout: 15_000 });
  await page.waitForTimeout(1400);
  await shot("entry");
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(850);
  await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(2900);
  await shot("signature-a");
  await page.keyboard.down(" ");
  await page.waitForTimeout(1100);
  await shot("turbo");
  await page.keyboard.up(" ");
  await page.keyboard.down("ArrowLeft"); await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(950);
  await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(3300);
  await shot("signature-b");
  const body = await page.locator("body").innerText();
  const hp = Number((body.match(/AIRFRAME\s*([0-9]+)%/i) || [0, 0])[1]);
  const glState = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl2") || element.getContext("webgl");
    return { webgl: Boolean(gl), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height };
  });
  const result = { stage: stage.id, stageVisible: body.includes(stage.name), hp, glState, consoleErrors, pageErrors, failed: /AIRFRAME LOST|MISSION FAILED/i.test(body) };
  diagnostics.push(result);
  console.log(`[stage-audit] ${stage.id}: ${JSON.stringify(result)}`);
  await page.close();
}
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
for (const item of diagnostics) {
  if (!item.stageVisible) throw new Error(`Stage HUD mismatch: ${JSON.stringify(item)}`);
  if (!item.glState.webgl || item.glState.width < 800 || item.glState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(item)}`);
  if (item.failed) throw new Error(`Stage identity audit lost airframe: ${JSON.stringify(item)}`);
  if (item.consoleErrors.length || item.pageErrors.length) throw new Error(`Stage identity audit errors: ${JSON.stringify(item)}`);
}
console.log(`[stage-audit] complete: ${diagnostics.length} stages`);
