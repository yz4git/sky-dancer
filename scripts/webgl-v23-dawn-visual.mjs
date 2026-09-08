import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = "artifacts/v23-dawn-review";
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

const page = await context.newPage();
page.setDefaultTimeout(30_000);
await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
const modeSelect = page.locator('[aria-label="Select game mode"]');
await modeSelect.locator("button").filter({ hasText: /STAGE PRACTICE/i }).first().click();
const practiceSelect = page.locator('[aria-label="Select practice stage"]');
await practiceSelect.waitFor({ state: "visible" });
const buttons = practiceSelect.locator("button");
let target = null;
for (let index = 0; index < await buttons.count(); index += 1) {
  const button = buttons.nth(index);
  if ((await button.locator("strong").textContent())?.trim() === "CITY") { target = button; break; }
}
if (!target) throw new Error("Dawn City practice button not found");
await target.click();
await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible" });
const box = await canvas.boundingBox();
if (!box) throw new Error("Dawn City canvas has no bounds");
const shot = async (name) => page.screenshot({ path: `${outputDir}/${name}.png`, clip: box, timeout: 60_000 });

await page.waitForTimeout(1200);
await shot("01-dawn-entry");
await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(900);
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowUp");
await page.waitForTimeout(3500);
await shot("02-dawn-bank");
await page.keyboard.down("c");
await page.waitForTimeout(1000);
await page.keyboard.up("c");
await page.waitForTimeout(1700);
await shot("03-dawn-combat");

const body = await page.locator("body").innerText();
const diagnostics = {
  stageVisible: body.includes("DAWN CITY"),
  failed: /AIRFRAME LOST|MISSION FAILED/i.test(body),
  viewport: { width: box.width, height: box.height },
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
if (!diagnostics.stageVisible || diagnostics.failed || box.width < 800 || box.height < 360) throw new Error(`Dawn City visual review failed: ${JSON.stringify(diagnostics)}`);
