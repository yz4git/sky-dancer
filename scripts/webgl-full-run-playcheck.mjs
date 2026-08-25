import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
const MAX_WALL_MS = 240_000;
const SAMPLE_MS = 420;

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
await page.waitForTimeout(1_200);

const timeline = [];
const transitionScreens = new Set();
let lastTextKey = "";
let lastHitSerial = 0;
let lastShotSerial = 0;
let reachedStage2 = false;
let reachedCleanup = false;
let reachedBoss = false;
let reachedClear = false;
let turboReleases = 0;
let steeringDirection = "ArrowRight";
let nextSteerSwitch = 4_800;
let nextTurboAt = 5_600;
let turboHeld = false;
let turboReleaseAt = 0;
const began = Date.now();

await page.keyboard.down(steeringDirection);
await page.screenshot({ path: `${outputDir}/20-full-run-opening.png`, fullPage: true });

async function bodyState() {
  const bodyText = await page.locator("body").innerText();
  const objective = bodyText.split("\n").map((line) => line.trim()).find((line) => /^STAGE \d+/.test(line)) ?? "";
  const weapon = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
  const flight = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
  return { bodyText, objective, weapon, flight };
}

async function captureOnce(key, filename) {
  if (transitionScreens.has(key)) return;
  transitionScreens.add(key);
  await page.screenshot({ path: `${outputDir}/${filename}.png`, fullPage: true });
  await canvas.screenshot({ path: `${outputDir}/${filename}-canvas.png` });
}

while (Date.now() - began < MAX_WALL_MS && !reachedStage2) {
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

  const state = await bodyState();
  const objective = state.objective;
  const key = objective.replace(/\s+/g, " ");
  const weapon = state.weapon;
  const hitSerial = Number(weapon?.hitSerial ?? 0);
  const shotSerial = Number(weapon?.shotSerial ?? 0);
  const changed = key !== lastTextKey || hitSerial !== lastHitSerial;
  if (changed) {
    timeline.push({
      wallSeconds: Number(((Date.now() - began) / 1000).toFixed(2)),
      objective,
      shotSerial,
      hitSerial,
      hitDelta: hitSerial - lastHitSerial,
      altitudeMeters: state.flight?.altitudeMeters ?? null,
      forwardVelocity: state.flight?.forwardVelocity ?? null,
      minEnemyDistance: state.flight?.minEnemyDistance ?? null,
    });
    lastTextKey = key;
    lastHitSerial = hitSerial;
    lastShotSerial = shotSerial;
  }

  if (/WIPE OUT/i.test(state.bodyText)) {
    reachedCleanup = true;
    await captureOnce("cleanup", "21-full-run-cleanup");
  }
  if (/DESTROY BOSS/i.test(state.bodyText) || /BOSS P[123]/i.test(state.bodyText)) {
    reachedBoss = true;
    await captureOnce("boss", "22-full-run-boss");
  }
  if (/STAGE 1 CLEAR/i.test(state.bodyText)) {
    reachedClear = true;
    await captureOnce("clear", "23-full-run-clear");
  }
  if (/STAGE 2/i.test(state.bodyText)) {
    reachedStage2 = true;
    await captureOnce("stage2", "24-full-run-stage2");
  }
}

await page.keyboard.up(steeringDirection).catch(() => {});
if (turboHeld) await page.keyboard.up("Space").catch(() => {});
const final = await bodyState();
const shots = Number(final.weapon?.shotSerial ?? lastShotSerial);
const hits = Number(final.weapon?.hitSerial ?? lastHitSerial);
const diagnostics = {
  completed: reachedStage2,
  reachedCleanup,
  reachedBoss,
  reachedClear,
  reachedStage2,
  wallSeconds: Number(((Date.now() - began) / 1000).toFixed(2)),
  shots,
  hits,
  hitRate: shots > 0 ? Number((hits / shots).toFixed(3)) : 0,
  turboReleases,
  finalObjective: final.objective,
  finalFlight: final.flight,
  finalWeapon: final.weapon,
  timeline,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/full-run-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await page.screenshot({ path: `${outputDir}/25-full-run-final.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/25-full-run-final-canvas.png` });
await browser.close();

if (pageErrors.length) throw new Error(`Page errors during full-run playcheck: ${pageErrors.join(" | ")}`);
if (!reachedStage2) throw new Error(`Full-run did not reach Stage 2 within ${MAX_WALL_MS / 1000}s: ${JSON.stringify(diagnostics)}`);
