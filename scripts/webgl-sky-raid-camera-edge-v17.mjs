import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const out = "artifacts/sky-raid-v17";
const desiredPlayerNdcY = -0.22;
const baselineFrameTolerance = 0.30;
let browser;
let context;
let page;
let failure;
const watchdog = setTimeout(() => process.exit(124), 90000);
const screenshot = async (name) => {
  try { await page?.screenshot({ path: path.join(out, name), timeout: 6000 }); } catch {}
};
const camera = () => page.evaluate(() => window.__skyRaidGetCameraPolish?.());
const weaponDebug = () => page.evaluate(() => window.__skyDancerGetActiveWeaponDebug?.() ?? null);

async function beginVerticalHold(fractionY) {
  const pad = page.locator('[aria-label="Sky Raid two-axis flight stick"]');
  const box = await pad.boundingBox();
  if (!box) throw new Error("flight pad missing");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * fractionY, { steps: 8 });
}

async function forceAuditAltitude(altitude) {
  await page.evaluate((value) => { window.__skyRaidAuditForcedAltitude = value; }, altitude);
  await page.waitForTimeout(650);
}

async function clearAuditAltitude() {
  await page.evaluate(() => { delete window.__skyRaidAuditForcedAltitude; });
}

async function confirmLiveTargetDown() {
  const shot = page.locator('button[aria-label="Fire missile"]');
  await shot.waitFor({ state: "visible", timeout: 5000 });
  await page.waitForFunction(() => typeof window.__skyDancerGetActiveWeaponDebug === "function", null, { timeout: 5000 });
  const cue = page.locator('[data-sd-kill-confirm]');
  const samples = [];

  // The audited build opens the STRIKER counter window on demand so this test
  // exercises the real missile/kill pipeline deterministically instead of
  // depending on randomized tactical timing. Product source is not modified.
  await page.evaluate(() => { window.__skyRaidAuditForceVulnerable = true; });
  await page.waitForTimeout(100);
  const deadline = Date.now() + 4_000;
  let ready = null;
  while (Date.now() < deadline) {
    const debug = await weaponDebug();
    if (debug) {
      samples.push({
        t: Date.now(),
        action: debug.lock?.action ?? "",
        vulnerable: Boolean(debug.lock?.vulnerable),
        className: debug.lock?.className ?? null,
        target: debug.target ?? null,
        shotSerial: debug.weapon?.shotSerial ?? 0,
        hitSerial: debug.weapon?.hitSerial ?? 0,
        missileCount: debug.weapon?.missiles?.length ?? 0,
      });
      const className = debug.lock?.className;
      if (debug.lock?.vulnerable && debug.target?.alive && className !== "heavy" && className !== "boss") {
        ready = debug;
        break;
      }
    }
    await page.waitForTimeout(120);
  }
  if (!ready) {
    await page.evaluate(() => { delete window.__skyRaidAuditForceVulnerable; });
    fs.writeFileSync(path.join(out, "weapon-window-failure.json"), JSON.stringify(samples, null, 2));
    throw new Error(`no audited vulnerable missile window appeared: ${JSON.stringify(samples.slice(-8))}`);
  }

  const initialHitSerial = Number(ready.weapon?.hitSerial ?? 0);
  const initialShotSerial = Number(ready.weapon?.shotSerial ?? 0);
  const targetBefore = { ...ready.target };
  const lockBefore = { ...ready.lock };
  await shot.click({ force: true });

  await page.waitForFunction(
    (serial) => Number(window.__skyDancerGetActiveWeaponDebug?.()?.weapon?.hitSerial ?? 0) > serial,
    initialHitSerial,
    { timeout: 5000, polling: 40 },
  );
  const afterHit = await weaponDebug();
  await page.evaluate(() => { delete window.__skyRaidAuditForceVulnerable; });
  if (!afterHit) throw new Error("weapon diagnostics disappeared after live missile hit");
  if (Number(afterHit.weapon?.shotSerial ?? 0) <= initialShotSerial) {
    throw new Error(`SHOT did not increment shotSerial: before=${initialShotSerial} after=${afterHit.weapon?.shotSerial}`);
  }
  if (afterHit.weapon?.lastHitEnemyId !== targetBefore.id) {
    throw new Error(`live missile hit wrong target: expected=${targetBefore.id} actual=${afterHit.weapon?.lastHitEnemyId}`);
  }

  fs.writeFileSync(path.join(out, "weapon-impact.json"), JSON.stringify({
    targetBefore,
    lockBefore,
    afterHit,
    samples: samples.slice(-12),
  }, null, 2));

  await cue.waitFor({ state: "attached", timeout: 2500 });
  const text = (await cue.textContent()) ?? "";
  if (!/TARGET DOWN/i.test(text)) {
    throw new Error(`unexpected kill confirmation after physical hit: ${text}`);
  }
  // The cue animation reaches its fully-visible keyframe about 140 ms after
  // mount and remains on screen for more than a second. Capture in that stable
  // visual window instead of depending on browser-specific computed animation
  // opacity reporting, which proved unreliable under headless SwiftShader.
  await page.waitForTimeout(180);
  const cueVisual = await page.evaluate(() => {
    const element = document.querySelector('[data-sd-kill-confirm]');
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      opacity: style.opacity,
      display: style.display,
      visibility: style.visibility,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });
  fs.writeFileSync(path.join(out, "kill-cue-visual.json"), JSON.stringify(cueVisual, null, 2));
  const cueOpacity = Number.parseFloat(cueVisual?.opacity ?? "0");
  if (!cueVisual || cueVisual.width < 110 || cueVisual.height < 20 || cueVisual.display === "none" || cueVisual.visibility === "hidden" || cueOpacity < 0.85) {
    throw new Error(`kill confirmation is not visibly rendered: ${JSON.stringify(cueVisual)}`);
  }
  await screenshot("03-target-down-confirmation.png");
  const result = {
    text: text.replace(/\s+/g, " ").trim(),
    cueVisual,
    targetBefore,
    lockBefore,
    shotSerial: afterHit.weapon?.shotSerial ?? 0,
    hitSerial: afterHit.weapon?.hitSerial ?? 0,
    lastHitEnemyId: afterHit.weapon?.lastHitEnemyId ?? null,
    samples: samples.slice(-12),
  };
  fs.writeFileSync(path.join(out, "weapon-hit.json"), JSON.stringify(result, null, 2));
  return result;
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text());
  });

  await page.goto(`http://127.0.0.1:4173?menu=1&v18=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => typeof window.__skyRaidGetCameraPolish === "function", null, { timeout: 12000 });
  await page.waitForTimeout(450);

  const pad = page.locator('[aria-label="Sky Raid two-axis flight stick"]');
  const padBox = await pad.boundingBox();
  const visualRingBox = await pad.locator(':scope > span').first().boundingBox();
  const captionBox = await page.locator('[aria-label="Flight control"] > span').last().boundingBox();
  if (!padBox || padBox.width < 100 || padBox.height < 100) throw new Error(`flight pad touch target shrank: ${JSON.stringify(padBox)}`);
  if (!visualRingBox) throw new Error("flight pad visual ring missing");
  if (!captionBox) throw new Error("flight pad caption missing");
  if (captionBox.y < visualRingBox.y - 1 || captionBox.y + captionBox.height > visualRingBox.y + visualRingBox.height + 1) {
    throw new Error(`flight pad caption escaped visible ring: ring=${JSON.stringify(visualRingBox)} caption=${JSON.stringify(captionBox)}`);
  }

  const combatDiagnostics = await page.evaluate(() => ({
    populationProfile: document.documentElement.dataset.skyRaidPopulationProfile ?? "",
    enemyPool: Number(document.documentElement.dataset.skyRaidEnemyPool ?? 0),
    enemyActive: Number(document.documentElement.dataset.skyRaidEnemyActive ?? 0),
  }));
  if (combatDiagnostics.populationProfile !== "arcade-dense") throw new Error(`SKY RAID population profile missing: ${JSON.stringify(combatDiagnostics)}`);
  if (combatDiagnostics.enemyActive < 1) throw new Error(`SKY RAID has no live combat targets: ${JSON.stringify(combatDiagnostics)}`);
  if (combatDiagnostics.enemyPool < combatDiagnostics.enemyActive) throw new Error(`SKY RAID population diagnostics inconsistent: ${JSON.stringify(combatDiagnostics)}`);

  const baseline = await camera();
  if (!baseline.playerVisible) throw new Error("aircraft not visible after SKY RAID presentation settle");
  if (Math.abs(baseline.playerNdcY - desiredPlayerNdcY) > baselineFrameTolerance) {
    throw new Error(`baseline missed intended combat framing: ${baseline.playerNdcY} target=${desiredPlayerNdcY}`);
  }
  if (Number(baseline.enemyVisible ?? 0) < 2) {
    throw new Error(`too few enemies are actually visible in the SKY RAID opening frame: ${JSON.stringify(baseline.enemyScreenSamples ?? [])}`);
  }
  if (Number(baseline.enemyCombatLane ?? 0) < 1) {
    throw new Error(`SKY RAID opening has no enemy in the central combat lane: ${JSON.stringify(baseline.enemyScreenSamples ?? [])}`);
  }
  await screenshot("00-baseline-flight.png");

  const targetDownConfirmation = await confirmLiveTargetDown();

  await beginVerticalHold(0.07);
  await page.waitForTimeout(1500);
  const realClimb = await camera();
  if (!(realClimb.altitude > baseline.altitude + 1.0)) throw new Error(`real climb input weak: ${baseline.altitude}->${realClimb.altitude}`);

  await forceAuditAltitude(64);
  const high = await camera();
  if (!(high.altitude >= 63.95)) throw new Error(`upper altitude audit hook failed: ${high.altitude}`);
  if (!high.playerVisible) throw new Error("aircraft clipped at upper altitude stop");
  if (Math.abs(high.playerNdcY) > 0.52) throw new Error(`upper framing too close to edge: ${high.playerNdcY}`);
  if (!(high.altitudeEdgeBlend > 0.98)) throw new Error(`upper edge blend inactive: ${high.altitudeEdgeBlend}`);
  await screenshot("01-upper-altitude-stop.png");
  await page.mouse.up();
  await clearAuditAltitude();
  await page.waitForTimeout(250);

  const beforeDive = await camera();
  await beginVerticalHold(0.93);
  await page.waitForTimeout(1500);
  const realDive = await camera();
  if (!(realDive.altitude < beforeDive.altitude - 1.0)) throw new Error(`real dive input weak: ${beforeDive.altitude}->${realDive.altitude}`);

  await forceAuditAltitude(20);
  const low = await camera();
  if (!(low.altitude >= 19.95 && low.altitude <= 20.05)) throw new Error(`lower altitude audit hook failed: ${low.altitude}`);
  if (!low.playerVisible) throw new Error("aircraft clipped at lower altitude stop");
  if (Math.abs(low.playerNdcY) > 0.52) throw new Error(`lower framing too close to edge: ${low.playerNdcY}`);
  await screenshot("02-lower-altitude-stop.png");

  // Force only the live warning presentation in this injected audit build so
  // the final screenshot always captures the exact camera-space halo geometry.
  await page.evaluate(() => { window.__skyRaidAuditForceMissileWarning = true; });
  await page.waitForTimeout(250);
  await screenshot("04-compact-missile-warning.png");
  await page.evaluate(() => { delete window.__skyRaidAuditForceMissileWarning; });

  await page.mouse.up();
  await clearAuditAltitude();

  const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, combatDiagnostics, targetDownConfirmation, baseline, realClimb, high, beforeDive, realDive, low, errors };
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log("SKY RAID V18 PASS", JSON.stringify(report));
} catch (error) {
  failure = error;
  console.error("SKY RAID V18 FAIL", error?.stack || error);
  try { await page?.mouse.up(); } catch {}
  await screenshot("failure.png");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "failure.txt"), String(error?.stack || error));
} finally {
  clearTimeout(watchdog);
  try { await context?.close(); } catch {}
  try { await browser?.close(); } catch {}
}
if (failure) process.exitCode = 1;