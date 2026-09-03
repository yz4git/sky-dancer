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
const watchdog = setTimeout(() => process.exit(124), 110000);
const screenshot = async (name) => {
  try {
    await page?.screenshot({ path: path.join(out, name), timeout: 6000 });
  } catch {}
};
const camera = () => page.evaluate(() => window.__skyRaidGetCameraPolish?.());

async function holdVerticalUntil(fractionY, reached, maxMilliseconds) {
  const pad = page.locator('[aria-label="Sky Raid two-axis flight stick"]');
  const box = await pad.boundingBox();
  if (!box) throw new Error("flight pad missing");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * fractionY, { steps: 8 });
  const samples = [];
  const end = Date.now() + maxMilliseconds;
  while (Date.now() < end) {
    await page.waitForTimeout(140);
    const current = await camera();
    if (!current) continue;
    samples.push(current);
    if (reached(current)) break;
  }
  await page.mouse.up();
  await page.waitForTimeout(160);
  return samples;
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

  await page.goto(`http://127.0.0.1:4173?menu=1&v17=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => typeof window.__skyRaidGetCameraPolish === "function", null, { timeout: 12000 });

  const baseline = await camera();
  const climbSamples = await holdVerticalUntil(0.07, (sample) => sample.altitude >= 63.5, 30000);
  const high = await camera();
  const climbMaxY = Math.max(0, ...climbSamples.map((sample) => Math.abs(sample.playerNdcY || 0)));
  if (!(high.altitude >= 63.5)) throw new Error(`did not reach upper altitude stop: ${high.altitude}`);
  if (!high.playerVisible) throw new Error("aircraft clipped at upper altitude stop");
  if (Math.abs(high.playerNdcY) > 0.52) throw new Error(`upper framing too close to edge: ${high.playerNdcY}`);
  if (!(high.altitudeEdgeBlend > 0.92)) throw new Error(`upper edge blend inactive: ${high.altitudeEdgeBlend}`);
  if (climbMaxY > 0.68) throw new Error(`aircraft drifted too far during climb: ${climbMaxY}`);
  await screenshot("01-upper-altitude-stop.png");

  const diveSamples = await holdVerticalUntil(0.93, (sample) => sample.altitude <= -17.5, 42000);
  const low = await camera();
  const diveMaxY = Math.max(0, ...diveSamples.map((sample) => Math.abs(sample.playerNdcY || 0)));
  if (!(low.altitude <= -17.5)) throw new Error(`did not reach lower altitude stop: ${low.altitude}`);
  if (!low.playerVisible) throw new Error("aircraft clipped at lower altitude stop");
  if (Math.abs(low.playerNdcY) > 0.52) throw new Error(`lower framing too close to edge: ${low.playerNdcY}`);
  if (!(low.altitudeEdgeBlend > 0.92)) throw new Error(`lower edge blend inactive: ${low.altitudeEdgeBlend}`);
  if (diveMaxY > 0.68) throw new Error(`aircraft drifted too far during dive: ${diveMaxY}`);
  await screenshot("02-lower-altitude-stop.png");

  const report = {
    baseline,
    high,
    low,
    climbSamples: climbSamples.length,
    diveSamples: diveSamples.length,
    climbMaxAbsPlayerNdcY: climbMaxY,
    diveMaxAbsPlayerNdcY: diveMaxY,
    errors,
  };
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log("SKY RAID V17 PASS", JSON.stringify(report));
} catch (error) {
  failure = error;
  console.error("SKY RAID V17 FAIL", error?.stack || error);
  await screenshot("failure.png");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "failure.txt"), String(error?.stack || error));
} finally {
  clearTimeout(watchdog);
  try { await context?.close(); } catch {}
  try { await browser?.close(); } catch {}
}
if (failure) process.exitCode = 1;
