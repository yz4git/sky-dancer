import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
const NORMAL_RUN_MS = 42_000;
const BOSS_RUN_MS = 32_000;
const SAMPLE_MS = 180;

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
const start = page.getByRole("button", { name: /START(?: HARD)? RUN/i });
if (await start.isVisible().catch(() => false)) await start.click();
const canvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
const shot = page.getByRole("button", { name: "Fire missile" });
await shot.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(900);

const decisionClasses = new Set();
let sawLock = false;
let sawNumericAltitude = false;
let sawReadyWindow = false;
let sawHoldWindow = false;
let sawNormalSpeedState = false;
let sawTurboSpeedState = false;
let maxPlayerRibbonPoints = 0;
let speedFxCount = 0;
let backgroundTuned = false;
let backgroundMaterials = 0;
let combatShotCaptured = false;
let steering = "ArrowRight";
let nextSteerSwitch = 5_200;
let nextTurbo = 10_000;
let turboHeld = false;
let turboReleaseAt = 0;
const began = Date.now();
await page.keyboard.down(steering);

async function tapShot() {
  const box = await shot.boundingBox();
  if (box) await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
}

async function readV45() {
  return page.evaluate(() => typeof window.__skyDancerGetV45DecisionHierarchy === "function"
    ? window.__skyDancerGetV45DecisionHierarchy()
    : null);
}

while (Date.now() - began < NORMAL_RUN_MS) {
  const elapsed = Date.now() - began;
  if (elapsed >= nextSteerSwitch) {
    await page.keyboard.up(steering);
    steering = steering === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    await page.keyboard.down(steering);
    nextSteerSwitch += 5_200;
  }
  if (!turboHeld && elapsed >= nextTurbo) {
    await page.keyboard.down("Space");
    turboHeld = true;
    turboReleaseAt = elapsed + 760;
  }
  if (turboHeld && elapsed >= turboReleaseAt) {
    await page.keyboard.up("Space");
    turboHeld = false;
    nextTurbo = elapsed + 9_000;
  }
  if (elapsed % 650 < 210) await tapShot();
  await page.waitForTimeout(SAMPLE_MS);

  const v45 = await readV45();
  if (!v45) continue;
  const decision = v45.decision;
  maxPlayerRibbonPoints = Math.max(maxPlayerRibbonPoints, Number(v45.maxPlayerRibbonPoints || 0));
  speedFxCount = Math.max(speedFxCount, Number(v45.speedFxCount || 0));
  backgroundTuned ||= v45.backgroundTuned === true;
  backgroundMaterials = Math.max(backgroundMaterials, Number(v45.backgroundMaterials || 0));
  if (decision?.boostActive) sawTurboSpeedState = true;
  else sawNormalSpeedState = true;
  if (decision?.targetEnemyId) {
    sawLock = true;
    if (decision.className) decisionClasses.add(decision.className);
    sawReadyWindow ||= decision.vulnerable === true;
    sawHoldWindow ||= decision.vulnerable === false;
    const lockText = await page.getByLabel("V45 target decision").innerText().catch(() => "");
    sawNumericAltitude ||= /(?:▲ \+|▼ -)\d+m|◆ LEVEL/.test(lockText);
    if (!combatShotCaptured && maxPlayerRibbonPoints >= 6 && sawNumericAltitude) {
      combatShotCaptured = true;
      await page.screenshot({ path: `${outputDir}/70-v45-combat-decision.png`, fullPage: true });
      await canvas.screenshot({ path: `${outputDir}/70-v45-combat-decision-canvas.png` });
    }
  }
}
await page.keyboard.up(steering).catch(() => {});
await page.keyboard.up("Space").catch(() => {});

const forcedBoss = await page.evaluate(() => typeof window.__skyDancerForceBossAuditV34 === "function"
  ? window.__skyDancerForceBossAuditV34()
  : false);
let sawBoss = false;
let sawBossStrike = false;
let sawBossBreak = false;
let sawBossDirective = false;
let sawBossStrikeCue = false;
let bossHudOverlapPixels = Number.POSITIVE_INFINITY;
let bossShotCaptured = false;
const bossBegan = Date.now();

while (Date.now() - bossBegan < BOSS_RUN_MS) {
  await page.waitForTimeout(SAMPLE_MS);
  const v45 = await readV45();
  if (!v45?.decision) continue;
  const decision = v45.decision;
  sawBoss ||= decision.bossActive === true;
  sawBossStrike ||= decision.bossMode === "strike";
  sawBossBreak ||= decision.bossMode === "break" || decision.bossCoreOpen === true;
  sawBossStrikeCue ||= v45.bossStrikeCueObserved === true;
  const directive = page.getByLabel("V45 boss directive");
  if (await directive.isVisible().catch(() => false)) sawBossDirective = true;

  const overlap = await page.evaluate(() => {
    const stage = document.querySelector(".skyDancerStageV40");
    const heat = document.querySelector('[class*="heatCard"]');
    if (!(stage instanceof HTMLElement) || !(heat instanceof HTMLElement)) return null;
    const a = stage.getBoundingClientRect();
    const b = heat.getBoundingClientRect();
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y;
  });
  if (overlap != null) bossHudOverlapPixels = Math.min(bossHudOverlapPixels, overlap);

  if (!bossShotCaptured && sawBossStrike && sawBossDirective && sawBossStrikeCue) {
    bossShotCaptured = true;
    await page.screenshot({ path: `${outputDir}/71-v45-boss-hierarchy.png`, fullPage: true });
    await canvas.screenshot({ path: `${outputDir}/71-v45-boss-hierarchy-canvas.png` });
  }
  if (sawBossStrike && sawBossBreak && bossShotCaptured) break;
}

const diagnostics = {
  sawLock,
  decisionClasses: [...decisionClasses],
  sawNumericAltitude,
  sawReadyWindow,
  sawHoldWindow,
  maxPlayerRibbonPoints,
  speedFxCount,
  normalSpeedStrength: 0.34,
  sawNormalSpeedState,
  sawTurboSpeedState,
  backgroundTuned,
  backgroundMaterials,
  forcedBoss,
  sawBoss,
  sawBossStrike,
  sawBossBreak,
  sawBossDirective,
  sawBossStrikeCue,
  bossHudOverlapPixels: Number.isFinite(bossHudOverlapPixels) ? bossHudOverlapPixels : null,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/v45-decision-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
console.log(JSON.stringify(diagnostics, null, 2));
await browser.close();

if (pageErrors.length) throw new Error(`V45 page errors: ${pageErrors.join(" | ")}`);
if (!sawLock || !sawNumericAltitude) throw new Error(`V45 never produced a readable numeric target decision: ${JSON.stringify(diagnostics)}`);
if (maxPlayerRibbonPoints < 6) throw new Error(`V45 player missile smoke ribbon never became readable: ${JSON.stringify(diagnostics)}`);
if (!backgroundTuned || backgroundMaterials < 1) throw new Error(`V45 background hierarchy was not applied: ${JSON.stringify(diagnostics)}`);
if (!sawNormalSpeedState || !sawTurboSpeedState) throw new Error(`V45 did not exercise both normal/Turbo hierarchy states: ${JSON.stringify(diagnostics)}`);
if (!forcedBoss || !sawBoss || !sawBossStrike || !sawBossDirective || !sawBossStrikeCue) throw new Error(`V45 boss attack-run hierarchy was not observed: ${JSON.stringify(diagnostics)}`);
if (Number.isFinite(bossHudOverlapPixels) && bossHudOverlapPixels > 4) throw new Error(`V45 Boss stage/HEAT HUD still overlaps: ${JSON.stringify(diagnostics)}`);
