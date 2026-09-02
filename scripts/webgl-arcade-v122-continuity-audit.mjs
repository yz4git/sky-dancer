import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v122-continuity";
const allIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
const cases = [
  { name: "right-break", playerX: 1.1, playerVX: 1.35, sign: 1, hud: "BLOCK R" },
  { name: "left-break", playerX: -1.1, playerVX: -1.35, sign: -1, hud: "BLOCK L" },
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({
  version: 1,
  clearedStageIds: ids,
  unlockedStageIds: ids,
  records: {},
  bestRunScore: 0,
  bestRunRank: "D",
  completedRuns: 0,
  oneCreditClears: 0,
})), allIds);

const report = [];
for (const [index, c] of cases.entries()) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
  const mode = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
  await mode.waitFor({ state: "visible" });
  await mode.click();
  const practice = page.locator('[aria-label="Select practice stage"]');
  await practice.waitFor({ state: "visible" });
  await practice.locator("button").first().click();
  await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({ state: "visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV122Demo));

  const sample = await page.evaluate(({ playerX, playerVX }) => {
    const demo = window.__skyDancerV122Demo;
    const runtime = demo.runtime;
    runtime.setV12DirectorSignalsForTests(.1, 1.8, .1);
    runtime.setV122PlayerFlowForTests(playerX, playerVX);
    runtime.spawnV12EncounterForTests();
    const first = demo.getSnapshot();
    const firstIds = first.enemies.filter((enemy) => !enemy.boss).map((enemy) => enemy.id);
    const advanced = runtime.advanceV121EncounterForTests();
    const second = demo.getSnapshot();
    const carried = firstIds.filter((id) => second.enemies.some((enemy) => enemy.id === id));
    const reinforcements = second.enemies.filter((enemy) => !enemy.boss && !firstIds.includes(enemy.id));
    const reinforcementAverageX = reinforcements.length > 0
      ? reinforcements.reduce((sum, enemy) => sum + enemy.x, 0) / reinforcements.length
      : null;
    return {
      advanced,
      firstIds,
      carried,
      reinforcementIds: reinforcements.map((enemy) => enemy.id),
      reinforcementXs: reinforcements.map((enemy) => enemy.x),
      reinforcementAverageX,
      continuityLabel: second.encounterContinuityLabel,
      breakSign: second.encounterContinuityBreakSign,
      entrySign: second.encounterContinuityEntrySign,
      survivorCount: second.encounterContinuitySurvivors,
      lateralBias: second.encounterContinuityLateralBias,
      phaseIndex: second.encounterGrammarPhaseIndex,
      grammar: second.encounterGrammarLabel,
      renderer: demo.renderer?.domElement ? "WEBGL" : "UNKNOWN",
    };
  }, c);

  await page.waitForTimeout(260);
  const bodyText = await page.locator("body").innerText();
  await page.screenshot({ path: `${out}/${String(index + 1).padStart(2, "0")}-${c.name}.png`, fullPage: true });
  const row = { case: c.name, expectedSign: c.sign, expectedHud: c.hud, ...sample, hudVisible: bodyText.includes(c.hud), errors };
  report.push(row);

  if (!sample.advanced) throw new Error(`${c.name}: phase did not advance`);
  if (sample.phaseIndex !== 2) throw new Error(`${c.name}: expected phase 2, got ${sample.phaseIndex}`);
  if (sample.breakSign !== c.sign || sample.entrySign !== c.sign) throw new Error(`${c.name}: continuity sign mismatch ${JSON.stringify(row)}`);
  if (sample.firstIds.length === 0 || sample.carried.length !== sample.firstIds.length) throw new Error(`${c.name}: survivor IDs were not preserved ${JSON.stringify(row)}`);
  if (sample.reinforcementIds.length === 0 || sample.reinforcementAverageX === null) throw new Error(`${c.name}: no phase-two reinforcement ${JSON.stringify(row)}`);
  if (Math.sign(sample.reinforcementAverageX) !== c.sign || Math.abs(sample.reinforcementAverageX) < .05) throw new Error(`${c.name}: reinforcement lane mismatch ${JSON.stringify(row)}`);
  if (!row.hudVisible || !sample.continuityLabel.includes(c.hud)) throw new Error(`${c.name}: continuity HUD missing ${JSON.stringify(row)}`);
  if (errors.length) throw new Error(`${c.name}: page errors ${JSON.stringify(errors)}`);
  await page.close();
}

await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
