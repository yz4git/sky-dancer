import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-full-run";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(20_000);
page.setDefaultNavigationTimeout(30_000);
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(`${baseUrl}?menu=1&fullRunAudit=1`, { waitUntil: "domcontentloaded" });
await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
await page.getByRole("button", { name: /START ARCADE RUN/i }).click();
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });

const stages = ["DAWN CITY","RED CANYON","CLOUD FLEET","STORM CARRIER","DESERT FORTRESS","ICE CAVERN","FLOATING RUINS","NIGHT METRO","VOLCANO CORE","ORBITAL ASCENT","PRISM CITADEL"];
const seen = [];
const captures = [];
let continuesUsed = 0;
let survivalGameOverSection = 0;
let forcedAdvances = 0;
let finalBossCaptured = false;
let lastSection = 0;
let lastStage = "";
let sample = 0;
const start = Date.now();

const shot = async (name) => {
  const box = await canvas.boundingBox();
  if (!box) return;
  const path = `${outputDir}/${String(captures.length + 1).padStart(2,"0")}-${name}.png`;
  await page.screenshot({ path, clip: box, timeout: 60_000 });
  captures.push({ name, path: path.replace(outputDir + "/", "") });
};

await page.keyboard.down("x");
while (Date.now() - start < 120_000) {
  await page.evaluate(() => window.__skyDancerArcadeAuditAdvance?.(1.2));
  await page.waitForTimeout(30);
  const auditSnapshot = await page.evaluate(() => window.__skyDancerArcadeAuditSnapshot?.() ?? null);
  const body = await page.locator("body").innerText();
  if (/ONE SKY · ARCADE RUN COMPLETE|ARCADE RUN CLEAR/i.test(body)) {
    await shot("run-clear");
    break;
  }
  if (auditSnapshot?.status === "game-over" || /MISSION FAILED|GAME OVER/i.test(body)) {
    const failedSection = Number(auditSnapshot?.stageNumber ?? lastSection);
    if (!survivalGameOverSection) survivalGameOverSection = failedSection;
    await shot(`survival-game-over-section-${failedSection}`);
    if (failedSection >= 6 && failedSection <= 7) {
      const forced = await page.evaluate(() => {
        if (!window.__skyDancerArcadeAuditForceAdvance) return false;
        window.__skyDancerArcadeAuditForceAdvance();
        return true;
      });
      if (forced) {
        forcedAdvances += 1;
        await page.waitForTimeout(50);
        continue;
      }
    }
    break;
  }
  if (auditSnapshot?.status === "continue" || /CONTINUE\?/i.test(body)) {
    const used = await page.evaluate(() => {
      if (!window.__skyDancerArcadeAuditContinue) return false;
      window.__skyDancerArcadeAuditContinue();
      return true;
    });
    if (used) {
      continuesUsed += 1;
      await page.waitForTimeout(70);
      continue;
    }
  }

  const section = Number(auditSnapshot?.stageNumber ?? lastSection);
  const stage = stages.includes(auditSnapshot?.stage?.name) ? auditSnapshot.stage.name : lastStage;
  if (section && stage && (section !== lastSection || stage !== lastStage)) {
    seen.push({ section, stage, realMs: Date.now() - start });
    lastSection = section;
    lastStage = stage;
    await shot(`section-${section}-${stage.toLowerCase().replaceAll(" ","-")}`);
  }
  if (section === 7 && auditSnapshot?.bossActive && !finalBossCaptured) {
    finalBossCaptured = true;
    await shot("section-7-final-boss");
  }
  if (/SECTION CLEAR/i.test(body) && captures.every((item) => item.name !== `section-${lastSection}-clear`)) {
    await shot(`section-${lastSection}-clear`);
  }

  if (auditSnapshot?.status === "run-clear") {
    await shot("run-clear");
    break;
  }

  const phase = sample % 8;
  await page.keyboard.up("ArrowLeft").catch(() => {});
  await page.keyboard.up("ArrowRight").catch(() => {});
  await page.keyboard.up("ArrowUp").catch(() => {});
  await page.keyboard.up("ArrowDown").catch(() => {});
  if (phase < 2) { await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowUp"); }
  else if (phase < 4) { await page.keyboard.down("ArrowLeft"); await page.keyboard.down("ArrowUp"); }
  else if (phase < 6) { await page.keyboard.down("ArrowLeft"); await page.keyboard.down("ArrowDown"); }
  else { await page.keyboard.down("ArrowRight"); await page.keyboard.down("ArrowDown"); }

  if (sample % 2 === 0) await page.keyboard.down("c");
  else await page.keyboard.up("c");
  if (sample % 5 < 2) await page.keyboard.down(" ");
  else await page.keyboard.up(" ");
  sample += 1;
  await page.waitForTimeout(20);
}
await page.keyboard.up("x").catch(() => {});
await page.keyboard.up("c").catch(() => {});
await page.keyboard.up(" ").catch(() => {});
for (const key of ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]) await page.keyboard.up(key).catch(() => {});

const body = await page.locator("body").innerText();
const finalSnapshot = await page.evaluate(() => window.__skyDancerArcadeAuditSnapshot?.() ?? null);
const hp = Number(finalSnapshot?.playerHp ?? (body.match(/AIRFRAME\s*([0-9]+)%/i) || [0,0])[1]);
const complete = finalSnapshot?.status === "run-clear" || /ONE SKY · ARCADE RUN COMPLETE|ARCADE RUN CLEAR/i.test(body);
const gameOver = finalSnapshot?.status === "game-over" || /MISSION FAILED|GAME OVER/i.test(body);
const blockingConsoleErrors = consoleErrors.filter((message) => !/Failed to load resource:.*404/i.test(message));
const diagnostics = { seen, captures, continuesUsed, survivalGameOverSection, forcedAdvances, finalBossCaptured, hp, complete, gameOver, elapsedRealMs: Date.now()-start, consoleErrors, blockingConsoleErrors, pageErrors };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics,null,2));
await browser.close();

if (seen.length < 7) throw new Error(`Full-run audit did not traverse seven sections: ${JSON.stringify(diagnostics)}`);
if (!complete) throw new Error(`Full-run audit did not reach run clear: ${JSON.stringify(diagnostics)}`);
if (gameOver) throw new Error(`Full-run flow audit did not recover from game over: ${JSON.stringify(diagnostics)}`);
if (survivalGameOverSection > 0 && survivalGameOverSection < 6) throw new Error(`Full-run survival ended too early: ${JSON.stringify(diagnostics)}`);
if (blockingConsoleErrors.length || pageErrors.length) throw new Error(`Full-run audit errors: ${JSON.stringify(diagnostics)}`);
console.log(`[full-run-audit] complete sections=${seen.map((item)=>item.stage).join(" -> ")} continues=${continuesUsed} survivalGameOverSection=${survivalGameOverSection || "none"} forcedAdvances=${forcedAdvances}`);
