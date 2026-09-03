import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const out = "artifacts/sky-raid-v17";
let browser;
let context;
let page;
let failure;
const watchdog = setTimeout(() => process.exit(124), 90000);
const screenshot = async (name) => {
  try { await page?.screenshot({ path: path.join(out, name), timeout: 6000 }); } catch {}
};
const camera = () => page.evaluate(() => window.__skyRaidGetCameraPolish?.());

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

  const baseline = await camera();
  await screenshot("00-baseline-flight.png");
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

  await forceAuditAltitude(0);
  const low = await camera();
  if (!(low.altitude >= -0.05 && low.altitude <= 0.05)) throw new Error(`lower altitude audit hook failed: ${low.altitude}`);
  if (!low.playerVisible) throw new Error("aircraft clipped at lower altitude stop");
  if (Math.abs(low.playerNdcY) > 0.52) throw new Error(`lower framing too close to edge: ${low.playerNdcY}`);
  await screenshot("02-lower-altitude-stop.png");
  await page.mouse.up();
  await clearAuditAltitude();

  const report = { baseline, realClimb, high, beforeDive, realDive, low, errors };
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
