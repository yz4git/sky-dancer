import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
  ],
});

const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
await page.screenshot({ path: `${outputDir}/00-startup.png`, fullPage: true });
const start = page.getByRole("button", { name: /START(?: HARD)? RUN/i });
if (await start.isVisible().catch(() => false)) await start.click();

const webglCanvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
await webglCanvas.waitFor({ state: "visible", timeout: 30_000 });
const shot = page.getByRole("button", { name: "Fire missile" });
await shot.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(1_600);

const webgl = await webglCanvas.evaluate((canvas) => {
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return { ok: false };
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    ok: true,
    width: canvas.width,
    height: canvas.height,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  };
});
if (!webgl.ok) throw new Error("WebGL context was not created");

const controlState = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const brakeButtons = buttons.filter((button) => button.textContent?.trim() === "BRAKE");
  const visibleBrakeButtons = brakeButtons.filter((button) => getComputedStyle(button).display !== "none");
  const shotButton = buttons.find((button) => button.getAttribute("aria-label") === "Fire missile");
  return { shotVisible: Boolean(shotButton && getComputedStyle(shotButton).display !== "none"), brakeCount: brakeButtons.length, visibleBrakeCount: visibleBrakeButtons.length };
});
if (!controlState.shotVisible || controlState.visibleBrakeCount !== 0) throw new Error(`Control replacement failed: ${JSON.stringify(controlState)}`);

const openingFlight = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
if (!openingFlight) throw new Error("Flight telemetry unavailable at opening");
if (Math.abs(Number(openingFlight.altitudeMeters) - 88) > 0.6) throw new Error(`Unexpected flight level: ${JSON.stringify(openingFlight)}`);
if (openingFlight.minEnemyDistance != null && Number(openingFlight.minEnemyDistance) < 14) {
  throw new Error(`Opening fighter spawned too close: ${JSON.stringify(openingFlight)}`);
}

await page.screenshot({ path: `${outputDir}/01-gameplay-start.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/01-gameplay-start-canvas.png` });

const weaponBefore = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
const shotBox = await shot.boundingBox();
if (!shotBox) throw new Error("Shot button has no touchable bounds");
await page.touchscreen.tap(shotBox.x + shotBox.width * 0.5, shotBox.y + shotBox.height * 0.5);
const weaponImmediatelyAfter = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
if (!weaponBefore || !weaponImmediatelyAfter || weaponImmediatelyAfter.shotSerial <= weaponBefore.shotSerial || !Array.isArray(weaponImmediatelyAfter.missiles) || weaponImmediatelyAfter.missiles.length < 1) {
  throw new Error(`Touch Shot did not create an active missile: before=${JSON.stringify(weaponBefore)} after=${JSON.stringify(weaponImmediatelyAfter)}`);
}
const launched = weaponImmediatelyAfter.missiles[0];
await page.waitForTimeout(120);
const weaponAfter = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
if (!weaponAfter) throw new Error("Weapon telemetry disappeared after launch");
const sameMissile = Array.isArray(weaponAfter.missiles) ? weaponAfter.missiles.find((missile) => missile.id === launched.id) : null;
const missileTravel = sameMissile ? Math.hypot(sameMissile.x - launched.x, sameMissile.z - launched.z) : null;
const moved = sameMissile
  ? missileTravel > 0.2 || sameMissile.life < launched.life - 0.02
  : weaponAfter.hitSerial > weaponImmediatelyAfter.hitSerial;
if (!moved) throw new Error(`Player missile was created but did not advance: launch=${JSON.stringify(launched)} after=${JSON.stringify(weaponAfter)}`);

await page.screenshot({ path: `${outputDir}/02-player-shot.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/02-player-shot-canvas.png` });

await page.keyboard.down("ArrowRight");
await page.waitForTimeout(1_350);
const turnFlight = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
await page.screenshot({ path: `${outputDir}/03-banked-turn.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/03-banked-turn-canvas.png` });
await page.keyboard.up("ArrowRight");
await page.waitForTimeout(320);

const turboBefore = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
await page.keyboard.down("Space");
await page.waitForTimeout(850);
const turboDuring = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
if (!turboBefore || !turboDuring) throw new Error(`Turbo telemetry unavailable: before=${JSON.stringify(turboBefore)} during=${JSON.stringify(turboDuring)}`);
const beforeForward = Math.abs(Number(turboBefore.forwardVelocity) || 0);
const duringForward = Math.abs(Number(turboDuring.forwardVelocity) || 0);
if (beforeForward > 1 && duringForward < beforeForward * 0.99) throw new Error(`Turbo hold lost forward speed: before=${beforeForward.toFixed(3)} during=${duringForward.toFixed(3)}`);
if (beforeForward > 1 && beforeForward < 23.2 && duringForward < beforeForward + 0.5) {
  throw new Error(`Turbo hold failed to accelerate: before=${beforeForward.toFixed(3)} during=${duringForward.toFixed(3)}`);
}
await page.waitForTimeout(200);
await page.screenshot({ path: `${outputDir}/04-turbo-hold.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/04-turbo-hold-canvas.png` });
await page.keyboard.up("Space");
await page.waitForTimeout(180);
await page.screenshot({ path: `${outputDir}/05-turbo-release.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/05-turbo-release-canvas.png` });

await page.keyboard.down("ArrowLeft");
await page.waitForTimeout(900);
await page.keyboard.up("ArrowLeft");
await page.waitForTimeout(3_000);

const combatWeaponBefore = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
for (let index = 0; index < 3; index += 1) {
  const combatBox = await shot.boundingBox();
  if (combatBox) await page.touchscreen.tap(combatBox.x + combatBox.width * 0.5, combatBox.y + combatBox.height * 0.5);
  await page.waitForTimeout(390);
}
await page.waitForTimeout(2_400);
const combatWeaponAfter = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
const combatFlight = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
const warningVisible = await page.getByLabel("Missile warning").isVisible().catch(() => false);
await page.screenshot({ path: `${outputDir}/06-combat.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/06-combat-canvas.png` });

const text = await page.locator("body").innerText();
const legacyTerms = ["WALL RIDE", "TURBO RAM", "HOLD DRIFT · RELEASE DASH"];
const legacyVisible = legacyTerms.filter((term) => text.includes(term));
if (legacyVisible.length) throw new Error(`Legacy vehicle HUD text still visible: ${legacyVisible.join(", ")}`);

const diagnostics = {
  capturedAt: new Date().toISOString(), url: page.url(), viewport: page.viewportSize(), webgl, controlState,
  openingFlight, weaponBefore, weaponImmediatelyAfter, weaponAfter, missileTravel,
  turnFlight, turboBefore, turboDuring, combatWeaponBefore, combatWeaponAfter, combatFlight,
  warningVisible, legacyVisible,
  bodyTextSample: text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 120), consoleErrors, pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
if (pageErrors.length) throw new Error(`Page errors during WebGL audit: ${pageErrors.join(" | ")}`);
await browser.close();
