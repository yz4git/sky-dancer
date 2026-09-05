import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const out = "artifacts/sky-raid-v34-stick-release";
fs.mkdirSync(out, { recursive: true });
let browser;
let page;
const watchdog = setTimeout(() => process.exit(124), 90000);

const state = () => page.evaluate(() => window.__skyDancerGetInputState?.() ?? null);
const screenshot = async (name) => page.screenshot({ path: path.join(out, name), timeout: 6000 });

function assertNeutral(sample, label) {
  if (!sample) throw new Error(`${label}: input diagnostics missing`);
  if (sample.virtualX !== 0 || sample.virtualY !== 0 || sample.virtualActive !== false) {
    throw new Error(`${label}: virtual stick stayed active ${JSON.stringify(sample)}`);
  }
  if ((sample.keys ?? []).length !== 0) throw new Error(`${label}: key state stayed latched ${JSON.stringify(sample)}`);
  if (sample.steerPointerId !== null) throw new Error(`${label}: steer pointer stayed owned ${JSON.stringify(sample)}`);
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text());
  });

  await page.goto(`http://127.0.0.1:4177?menu=1&stick=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => typeof window.__skyDancerGetInputState === "function", null, { timeout: 10000 });

  const legacySteeringCount = await page.locator('[aria-label="Steering"]').count();
  if (legacySteeringCount !== 0) throw new Error(`legacy steering surface still overlaps SKY RAID: ${legacySteeringCount}`);

  const pad = page.locator('[aria-label="Sky Raid two-axis flight stick"]');
  const box = await pad.boundingBox();
  if (!box || box.width < 100 || box.height < 100) throw new Error(`flight stick touch target missing: ${JSON.stringify(box)}`);

  const centerX = box.x + box.width * 0.5;
  const centerY = box.y + box.height * 0.5;
  await page.evaluate(({ x, y }) => {
    const pad = document.querySelector('[aria-label="Sky Raid two-axis flight stick"]');
    if (!(pad instanceof HTMLElement)) throw new Error("pad missing in touch injection");
    const makeTouchEvent = (type, touches, changedTouches) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: touches, configurable: true });
      Object.defineProperty(event, "targetTouches", { value: touches, configurable: true });
      Object.defineProperty(event, "changedTouches", { value: changedTouches, configurable: true });
      return event;
    };
    const touch = { identifier: 941, clientX: x - 38, clientY: y + 38, pageX: x - 38, pageY: y + 38, screenX: x - 38, screenY: y + 38, target: pad };
    pad.dispatchEvent(makeTouchEvent("touchstart", [touch], [touch]));
  }, { x: centerX, y: centerY });
  await page.waitForFunction(() => {
    const sample = window.__skyDancerGetInputState?.();
    return sample?.virtualActive === true && sample.virtualX === -1 && sample.virtualY === -1;
  }, null, { timeout: 5000 });
  const held = await state();
  await screenshot("01-stick-held-touch.png");

  await page.evaluate(() => {
    const event = new Event("touchend", { bubbles: true, cancelable: true });
    const ended = { identifier: 941, clientX: 0, clientY: 0 };
    Object.defineProperty(event, "touches", { value: [], configurable: true });
    Object.defineProperty(event, "targetTouches", { value: [], configurable: true });
    Object.defineProperty(event, "changedTouches", { value: [ended], configurable: true });
    document.dispatchEvent(event);
  });
  await page.waitForFunction(() => {
    const sample = window.__skyDancerGetInputState?.();
    return sample?.virtualActive === false && sample.virtualX === 0 && sample.virtualY === 0;
  }, null, { timeout: 5000 });
  const touchReleased = await state();
  assertNeutral(touchReleased, "global touchend");
  await screenshot("02-stick-neutral-after-touchend.png");

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("sky-dancer-virtual-stick", { detail: { x: 1, y: 1, active: true, source: "audit" } }));
  });
  await page.waitForFunction(() => window.__skyDancerGetInputState?.().virtualActive === true, null, { timeout: 3000 });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await page.waitForTimeout(50);
  const pagehideReleased = await state();
  assertNeutral(pagehideReleased, "pagehide");

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true })));
  await page.waitForFunction(() => (window.__skyDancerGetInputState?.().keys ?? []).includes("arrowleft"), null, { timeout: 3000 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(50);
  const blurReleased = await state();
  assertNeutral(blurReleased, "blur");

  const knobTransform = await pad.locator('span[aria-hidden="true"]').nth(1).evaluate((element) => getComputedStyle(element).transform);
  const summary = { errors, legacySteeringCount, held, touchReleased, pagehideReleased, blurReleased, knobTransform };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);
  console.log("SKY RAID V34 STICK RELEASE PASS", JSON.stringify(summary));
} finally {
  clearTimeout(watchdog);
  await browser?.close();
}
