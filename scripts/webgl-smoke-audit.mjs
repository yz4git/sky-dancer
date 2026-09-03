import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-smoke";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(20_000);
page.setDefaultNavigationTimeout(30_000);
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
const canvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
if (!(await canvas.isVisible().catch(() => false))) {
  const start = page.getByRole("button", { name: /START(?: HARD)? RUN/i }).first();
  if (await start.isVisible().catch(() => false)) await start.click();
}
try {
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
} catch (error) {
  const failure = {
    body: (await page.locator("body").innerText()).slice(0, 2400),
    canvases: await page.locator("canvas").evaluateAll((items) => items.map((item) => item.getAttribute("aria-label"))),
    consoleErrors,
    pageErrors,
  };
  await writeFile(`${outputDir}/startup-failure.json`, JSON.stringify(failure, null, 2));
  throw new Error(`Default WebGL canvas is unavailable: ${JSON.stringify(failure)}`, { cause: error });
}
await page.waitForTimeout(850);

const shot = page.getByRole("button", { name: "Fire missile" });
await shot.waitFor({ state: "visible" });
const shotBox = await shot.boundingBox();
if (shotBox) await page.touchscreen.tap(shotBox.x + shotBox.width * 0.5, shotBox.y + shotBox.height * 0.5);
await page.waitForTimeout(180);
await page.keyboard.down("ArrowRight");
await page.waitForTimeout(260);
await page.keyboard.up("ArrowRight");
await page.keyboard.down("Space");
await page.waitForTimeout(180);
await page.keyboard.up("Space");
await page.waitForTimeout(260);

const pad = page.getByRole("slider", { name: /Arcade steering virtual pad|Sky Raid two-axis flight stick/ }).first();
await pad.waitFor({ state: "visible", timeout: 10_000 });
const padRecovery = await pad.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  const point = (fractionX) => ({ x: rect.left + rect.width * fractionX, y: rect.top + rect.height * 0.5 });
  const make = (type, pointerId, fractionX, isPrimary = true) => {
    const p = point(fractionX);
    return new PointerEvent(type, {
      pointerId,
      pointerType: "touch",
      isPrimary,
      bubbles: true,
      cancelable: true,
      clientX: p.x,
      clientY: p.y,
      buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    });
  };
  const read = () => Number(element.getAttribute("aria-valuenow"));
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  return (async () => {
    // Lost element-level pointerup: only the window capture fallback receives it.
    element.dispatchEvent(make("pointerdown", 401, 0.16));
    element.dispatchEvent(make("pointermove", 401, 0.16));
    const lostReleaseHeld = read();
    window.dispatchEvent(make("pointerup", 401, 0.16));
    await nextFrame();
    const lostReleaseNeutral = read();

    // Releasing another finger must not cancel the pointer that owns steering.
    element.dispatchEvent(make("pointerdown", 501, 0.84, true));
    element.dispatchEvent(make("pointermove", 501, 0.84, true));
    window.dispatchEvent(make("pointerup", 502, 0.5, false));
    await nextFrame();
    const afterSecondaryRelease = read();
    window.dispatchEvent(make("pointerup", 501, 0.84, true));
    await nextFrame();
    const afterPrimaryRelease = read();

    // Browser lifecycle transitions can swallow pointer termination on iOS.
    element.dispatchEvent(make("pointerdown", 601, 0.16));
    element.dispatchEvent(make("pointermove", 601, 0.16));
    const lifecycleHeld = read();
    window.dispatchEvent(new Event("pagehide"));
    await nextFrame();
    const lifecycleNeutral = read();

    return {
      lostReleaseHeld,
      lostReleaseNeutral,
      afterSecondaryRelease,
      afterPrimaryRelease,
      lifecycleHeld,
      lifecycleNeutral,
    };
  })();
});

const state = await canvas.evaluate((element) => {
  const gl = element.getContext("webgl2") || element.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  const rect = element.getBoundingClientRect();
  return {
    webgl: Boolean(gl),
    width: rect.width,
    height: rect.height,
    backingWidth: element.width,
    backingHeight: element.height,
    renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    directFireAvailable: typeof window.__skyDancerFireMissile === "function",
  };
});
const body = await page.locator("body").innerText();
const blockingConsoleErrors = consoleErrors.filter((message) => !/Failed to load resource:.*404/i.test(message));
const diagnostics = {
  state,
  padRecovery,
  shotVisible: await shot.isVisible().catch(() => false),
  failed: /AIRFRAME LOST|MISSION FAILED/i.test(body),
  consoleErrors,
  blockingConsoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!state.webgl || state.width < 800 || state.height < 360) throw new Error(`Default WebGL surface is invalid: ${JSON.stringify(diagnostics)}`);
if (!diagnostics.shotVisible || !state.directFireAvailable) throw new Error(`Flight controls are not wired: ${JSON.stringify(diagnostics)}`);
if (padRecovery.lostReleaseHeld !== -1 || padRecovery.lostReleaseNeutral !== 0) throw new Error(`Virtual pad stayed latched after lost pointerup: ${JSON.stringify(diagnostics)}`);
if (padRecovery.afterSecondaryRelease !== 1 || padRecovery.afterPrimaryRelease !== 0) throw new Error(`Virtual pad pointer ownership failed under multi-touch: ${JSON.stringify(diagnostics)}`);
if (padRecovery.lifecycleHeld !== -1 || padRecovery.lifecycleNeutral !== 0) throw new Error(`Virtual pad stayed latched across page lifecycle: ${JSON.stringify(diagnostics)}`);
if (diagnostics.failed) throw new Error(`Default WebGL smoke lost the airframe: ${JSON.stringify(diagnostics)}`);
if (blockingConsoleErrors.length || pageErrors.length) throw new Error(`Default WebGL smoke errors: ${JSON.stringify(diagnostics)}`);
console.log(`[webgl-smoke] success ${state.width}x${state.height} renderer=${state.renderer || "unknown"} padRecovery=${JSON.stringify(padRecovery)}`);
