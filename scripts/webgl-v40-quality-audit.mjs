import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
const MAX_WALL_MS = 360_000;
const SAMPLE_MS = 420;
const CLEANUP_LIMIT_SECONDS = 35;

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
const stageHud = page.getByLabel("Sky Dancer stage status");
await stageHud.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(1_200);

const openingPresentation = await page.evaluate(() => {
  const city = typeof window.__skyDancerGetV40CityDebug === "function" ? window.__skyDancerGetV40CityDebug() : null;
  const gunsight = document.querySelector(".skyDancerGunsight");
  const style = gunsight ? getComputedStyle(gunsight) : null;
  return {
    city,
    gunsight: style ? { width: parseFloat(style.width), height: parseFloat(style.height), opacity: parseFloat(style.opacity) } : null,
  };
});
if (!openingPresentation.city || openingPresentation.city.sectorCount !== 3 || openingPresentation.city.totalBuildings < 150) {
  throw new Error(`V40 multi-direction city did not initialize: ${JSON.stringify(openingPresentation.city)}`);
}
if (!openingPresentation.gunsight || openingPresentation.gunsight.width > 42 || openingPresentation.gunsight.height > 42) {
  throw new Error(`V40 gunsight reduction did not apply: ${JSON.stringify(openingPresentation.gunsight)}`);
}
if (Math.abs(Number(openingPresentation.city.burstLinearScale) - 0.55) > 0.001) {
  throw new Error(`V40 dynamic combat-ring reduction did not initialize: ${JSON.stringify(openingPresentation.city)}`);
}
if (openingPresentation.city.airBurstScale != null && Number(openingPresentation.city.airBurstScale) > 0.33) {
  throw new Error(`V40 air-burst ring remained oversized: ${JSON.stringify(openingPresentation.city)}`);
}

await page.screenshot({ path: `${outputDir}/30-v40-opening.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/30-v40-opening-canvas.png` });

const timeline = [];
const phaseScreens = new Set();
let lastPhaseKey = "";
let lastHitSerial = 0;
let firstHitSeconds = null;
let cleanupSeconds = null;
let bossSeconds = null;
let clearSeconds = null;
let stage2Seconds = null;
let cleanupMaxDistance = 0;
let cleanupCorrectionFrames = 0;
let cleanupMaxLockAngle = 0;
let cleanupPeakLockCandidates = 0;
let bossDuplicateVisible = false;
let turboReleases = 0;
let steeringDirection = "ArrowRight";
let nextSteerSwitch = 4_800;
let nextTurboAt = 5_600;
let turboHeld = false;
let turboReleaseAt = 0;
const began = Date.now();

await page.keyboard.down(steeringDirection);

async function captureOnce(key, filename) {
  if (phaseScreens.has(key)) return;
  phaseScreens.add(key);
  await page.screenshot({ path: `${outputDir}/${filename}.png`, fullPage: true });
  await canvas.screenshot({ path: `${outputDir}/${filename}-canvas.png` });
}

async function readState() {
  const hudText = (await stageHud.innerText()).replace(/\s+/g, " ").trim();
  const weapon = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
  const flight = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
  const reengagement = await page.evaluate(() => typeof window.__skyDancerGetReengagementV40 === "function" ? window.__skyDancerGetReengagementV40() : null);
  const boss = await page.evaluate(() => typeof window.__skyDancerGetBossQualityV34 === "function" ? window.__skyDancerGetBossQualityV34() : null);
  const presentation = await page.evaluate(() => typeof window.__skyDancerGetV40CityDebug === "function" ? window.__skyDancerGetV40CityDebug() : null);
  return { hudText, weapon, flight, reengagement, boss, presentation };
}

while (Date.now() - began < MAX_WALL_MS && stage2Seconds == null) {
  const elapsed = Date.now() - began;
  if (elapsed >= nextSteerSwitch) {
    await page.keyboard.up(steeringDirection);
    steeringDirection = steeringDirection === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    await page.keyboard.down(steeringDirection);
    nextSteerSwitch += 4_800;
  }
  if (!turboHeld && elapsed >= nextTurboAt) {
    await page.keyboard.down("Space");
    turboHeld = true;
    turboReleaseAt = elapsed + 720;
  }
  if (turboHeld && elapsed >= turboReleaseAt) {
    await page.keyboard.up("Space");
    turboHeld = false;
    turboReleases += 1;
    nextTurboAt = elapsed + 5_600;
  }

  const box = await shot.boundingBox();
  if (box) await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForTimeout(SAMPLE_MS);

  const state = await readState();
  const wallSeconds = Number(((Date.now() - began) / 1000).toFixed(2));
  const hits = Number(state.weapon?.hitSerial ?? 0);
  const shots = Number(state.weapon?.shotSerial ?? 0);
  if (firstHitSeconds == null && hits > 0) firstHitSeconds = wallSeconds;

  const isCleanup = /STAGE 1.*CLEANUP/i.test(state.hudText);
  const isBoss = /STAGE 1.*BOSS/i.test(state.hudText);
  const isClear = /STAGE 1.*CLEAR/i.test(state.hudText);
  const isStage2 = /STAGE 2.*WAVE/i.test(state.hudText);

  if (isCleanup) {
    if (cleanupSeconds == null) {
      cleanupSeconds = wallSeconds;
      await captureOnce("cleanup", "31-v40-cleanup");
    }
    cleanupMaxDistance = Math.max(cleanupMaxDistance, Number(state.reengagement?.maxEnemyDistance ?? 0));
    cleanupMaxLockAngle = Math.max(cleanupMaxLockAngle, Number(state.reengagement?.maxLockAngle ?? 0));
    cleanupPeakLockCandidates = Math.max(cleanupPeakLockCandidates, Number(state.reengagement?.lockConeCandidates ?? 0));
    if (Number(state.reengagement?.correctedEnemies ?? 0) > 0) cleanupCorrectionFrames += 1;
  }
  if (isBoss && bossSeconds == null) {
    bossSeconds = wallSeconds;
    const oldBossChip = page.getByLabel("Boss phase status");
    bossDuplicateVisible = await oldBossChip.isVisible().catch(() => false);
    await captureOnce("boss", "32-v40-boss");
  }
  if (isClear && clearSeconds == null) {
    clearSeconds = wallSeconds;
    await captureOnce("clear", "33-v40-clear");
  }
  if (isStage2 && stage2Seconds == null) {
    stage2Seconds = wallSeconds;
    await captureOnce("stage2", "34-v40-stage2");
  }

  const phaseKey = `${state.hudText}|${hits}`;
  if (phaseKey !== lastPhaseKey) {
    timeline.push({
      wallSeconds,
      hudText: state.hudText,
      shotSerial: shots,
      hitSerial: hits,
      hitDelta: hits - lastHitSerial,
      reengagement: state.reengagement,
      boss: state.boss,
      altitudeMeters: state.flight?.altitudeMeters ?? null,
      forwardVelocity: state.flight?.forwardVelocity ?? null,
      minEnemyDistance: state.flight?.minEnemyDistance ?? null,
      airBurstScale: state.presentation?.airBurstScale ?? null,
    });
    lastPhaseKey = phaseKey;
    lastHitSerial = hits;
  }
}

await page.keyboard.up(steeringDirection).catch(() => {});
if (turboHeld) await page.keyboard.up("Space").catch(() => {});
const final = await readState();
const shots = Number(final.weapon?.shotSerial ?? 0);
const hits = Number(final.weapon?.hitSerial ?? 0);
const cleanupDurationSeconds = cleanupSeconds != null && bossSeconds != null
  ? Number((bossSeconds - cleanupSeconds).toFixed(2))
  : null;
const diagnostics = {
  completed: stage2Seconds != null,
  wallSeconds: Number(((Date.now() - began) / 1000).toFixed(2)),
  firstHitSeconds,
  cleanupSeconds,
  bossSeconds,
  clearSeconds,
  stage2Seconds,
  cleanupDurationSeconds,
  cleanupTargetWindowSeconds: [20, 30],
  cleanupLimitSeconds: CLEANUP_LIMIT_SECONDS,
  cleanupMaxDistance,
  cleanupMaxLockAngle,
  cleanupPeakLockCandidates,
  cleanupCorrectionFrames,
  bossDuplicateVisible,
  shots,
  hits,
  hitRate: shots > 0 ? Number((hits / shots).toFixed(3)) : 0,
  turboReleases,
  openingPresentation,
  finalPresentation: final.presentation,
  finalHudText: final.hudText,
  finalFlight: final.flight,
  consoleErrors,
  pageErrors,
  timeline,
};
await writeFile(`${outputDir}/v40-quality-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await page.screenshot({ path: `${outputDir}/35-v40-final.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/35-v40-final-canvas.png` });
await browser.close();

if (pageErrors.length) throw new Error(`Page errors during V40 playcheck: ${pageErrors.join(" | ")}`);
if (cleanupSeconds == null) throw new Error(`V40 playcheck never entered CLEANUP: ${JSON.stringify(diagnostics)}`);
if (bossSeconds == null) throw new Error(`V40 playcheck never reached BOSS: ${JSON.stringify(diagnostics)}`);
if (cleanupDurationSeconds == null || cleanupDurationSeconds > CLEANUP_LIMIT_SECONDS) {
  throw new Error(`V40 cleanup exceeded ${CLEANUP_LIMIT_SECONDS}s: ${JSON.stringify(diagnostics)}`);
}
if (cleanupPeakLockCandidates < 1) throw new Error(`V40 cleanup never presented a lock-cone target: ${JSON.stringify(diagnostics)}`);
if (bossDuplicateVisible) throw new Error(`Legacy boss phase chip remained visible during V40 boss HUD: ${JSON.stringify(diagnostics)}`);
if (clearSeconds == null || stage2Seconds == null) throw new Error(`V40 playcheck did not show CLEAR then STAGE 2: ${JSON.stringify(diagnostics)}`);
