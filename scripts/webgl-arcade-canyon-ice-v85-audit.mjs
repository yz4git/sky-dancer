import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-canyon-ice-v85";
const stages = [
  { id: "red-canyon", short: "CANYON", name: "RED CANYON" },
  { id: "ice-cavern", short: "ICE", name: "ICE CAVERN" },
];
const allStageIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
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

const diagnostics = [];
for (const [index, stage] of stages.entries()) {
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
    const path = `${outputDir}/${prefix}-${suffix}.png`;
    await canvas.screenshot({ path, timeout: 60_000 });
    const box = await canvas.boundingBox();
    captures.push({ suffix, width: Math.round(box?.width || 0), height: Math.round(box?.height || 0) });
    console.log(`[v85-audit] ${stage.id}: ${suffix}`);
  };

  await page.waitForTimeout(900);
  await shot("entry");
  await page.waitForTimeout(2400);
  await shot("signature-a");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down(stage.id === "ice-cavern" ? "ArrowUp" : "ArrowDown");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up(stage.id === "ice-cavern" ? "ArrowUp" : "ArrowDown");
  await page.waitForTimeout(1800);
  await shot("signature-b");
  await page.keyboard.down(" ");
  await page.waitForTimeout(850);
  await shot("turbo");
  await page.keyboard.up(" ");

  const body = await page.locator("body").innerText();
  const hp = Number((body.match(/AIRFRAME\s*([0-9]+)%/i) || [0, 0])[1]);
  const glState = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl2") || element.getContext("webgl");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return { webgl: Boolean(gl), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
      renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
  });
  const blockingConsoleErrors = consoleErrors.filter((message) => !/Failed to load resource:.*404/i.test(message));
  diagnostics.push({ stage: stage.id, stageVisible: body.includes(stage.name), hp, glState, captures, blockingConsoleErrors, pageErrors,
    failed: /AIRFRAME LOST|MISSION FAILED/i.test(body) });
  await page.close();
}

await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
for (const item of diagnostics) {
  if (!item.stageVisible || !item.glState.webgl || item.glState.width < 800 || item.glState.height < 360) throw new Error(`Invalid stage render: ${JSON.stringify(item)}`);
  if (item.hp <= 0 || item.failed) throw new Error(`Airframe lost: ${JSON.stringify(item)}`);
  if (item.captures.length !== 4) throw new Error(`Missing captures: ${JSON.stringify(item)}`);
  if (item.blockingConsoleErrors.length || item.pageErrors.length) throw new Error(`Browser errors: ${JSON.stringify(item)}`);
}
console.log(`[v85-audit] complete: ${diagnostics.length} stages / 8 captures`);
