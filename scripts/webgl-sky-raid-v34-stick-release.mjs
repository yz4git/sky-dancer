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
const screenshot = async (name) => {
  try { await page?.screenshot({ path: path.join(out, name), timeout: 6000 }); } catch {}
};

function assertNeutral(sample, label) {
  if (!sample) throw new Error(`${label}: input diagnostics missing`);
  if (sample.virtualX !== 0 || sample.virtualY !== 0 || sample.virtualActive !== false) {
    throw new Error(`${label}: virtual stick stayed active ${JSON.stringify(sample)}`);
  }
  if ((sample.keys ?? []).length !== 0) throw new Error(`${label}: key state stayed latched ${JSON.stringify(sample)}`);
  if (sample.steerPointerId !== null) throw new Error(`${label}: steer pointer stayed owned ${JSON.stringify(sample)}`);
  if (sample.boostPointers !== 0 || sample.brakePointers !== 0) {
    throw new Error(`${label}: auxiliary pointer ownership survived reset ${JSON.stringify(sample)}`);
  }
}

let failure = null;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
  });
  // Keep the exact iPhone landscape geometry/DPR, but use a real mouse pointer
  // for this release audit. Chrome's CDP touch synthesizer does not dispatch the
  // React pad's input path reliably in headless mode; mouse input produces a
  // genuine browser PointerEvent and exercises the same pointer ownership,
  // capture, outside-drag and pointerup code used by Safari touch pointers.
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
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
  const heldX = centerX - 38;
  const heldY = centerY + 38;

  // Genuine browser pointer sequence: press inside, steer left+dive, then leave
  // the control surface while still held. The pointer must remain owned until
  // release, and release outside the pad must immediately neutralize input.
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(heldX, heldY, { steps: 3 });
  await page.waitForFunction(() => {
    const sample = window.__skyDancerGetInputState?.();
    return sample?.virtualActive === true && sample.virtualX === -1 && sample.virtualY === -1;
  }, null, { timeout: 5000 });
  const held = await state();
  await screenshot("01-stick-held-pointer.png");

  const outsideX = Math.min(820, centerX + 220);
  const outsideY = 38;
  await page.mouse.move(outsideX, outsideY, { steps: 5 });
  await page.waitForTimeout(80);
  const outsideHeld = await state();
  if (!outsideHeld?.virtualActive) throw new Error(`outside drag lost stick ownership before pointerup: ${JSON.stringify(outsideHeld)}`);

  await page.mouse.up();
  await page.waitForFunction(() => {
    const sample = window.__skyDancerGetInputState?.();
    return sample?.virtualActive === false && sample.virtualX === 0 && sample.virtualY === 0;
  }, null, { timeout: 5000 });
  const pointerReleased = await state();
  assertNeutral(pointerReleased, "pointerup outside pad");
  await screenshot("02-stick-neutral-after-outside-pointerup.png");

  // Simulate the exact failure class where the physical release is absent and a
  // browser lifecycle transition is the only signal. The game-level owner must
  // clear itself even if the pad never received a matching release event.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("sky-dancer-virtual-stick", { detail: { x: 1, y: 1, active: true, source: "audit" } }));
  });
  await page.waitForFunction(() => window.__skyDancerGetInputState?.().virtualActive === true, null, { timeout: 3000 });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await page.waitForTimeout(50);
  const pagehideReleased = await state();
  assertNeutral(pagehideReleased, "pagehide");

  // Real keyboard input remains supported, but a lost keyup can no longer latch
  // steering across focus loss because the same authoritative reset clears keys.
  await page.keyboard.down("ArrowLeft");
  await page.waitForFunction(() => (window.__skyDancerGetInputState?.().keys ?? []).includes("arrowleft"), null, { timeout: 3000 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(50);
  const blurReleased = await state();
  assertNeutral(blurReleased, "blur");
  await page.keyboard.up("ArrowLeft").catch(() => {});

  const knobTransform = await pad.locator('span[aria-hidden="true"]').nth(1).evaluate((element) => getComputedStyle(element).transform);
  const summary = {
    errors,
    viewport: { width: 844, height: 390, dpr: 2 },
    legacySteeringCount,
    held,
    outsideHeld,
    pointerReleased,
    pagehideReleased,
    blurReleased,
    knobTransform,
  };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);
  console.log("SKY RAID V34 STICK RELEASE PASS", JSON.stringify(summary));
} catch (error) {
  failure = error;
  const diagnostics = {
    message: String(error),
    inputState: page ? await state().catch(() => null) : null,
    url: page?.url() ?? null,
  };
  fs.writeFileSync(path.join(out, "failure.json"), JSON.stringify(diagnostics, null, 2));
  await screenshot("failure.png");
  throw error;
} finally {
  clearTimeout(watchdog);
  await browser?.close();
  if (failure) console.error("SKY RAID V34 STICK RELEASE FAIL", String(failure));
}
