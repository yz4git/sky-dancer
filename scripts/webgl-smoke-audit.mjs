import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

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
await page.locator("button").first().waitFor({ state: "attached" });
const start = page.getByRole("button", { name: /START(?: HARD)? RUN/i }).first();
if (!(await start.isVisible().catch(() => false))) {
  const failure = { body: (await page.locator("body").innerText()).slice(0, 2400), consoleErrors, pageErrors };
  await writeFile(`${outputDir}/startup-failure.json`, JSON.stringify(failure, null, 2));
  throw new Error(`Default flight START action is unavailable: ${JSON.stringify(failure)}`);
}
await start.click();

const canvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
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
const diagnostics = {
  state,
  shotVisible: await shot.isVisible().catch(() => false),
  failed: /AIRFRAME LOST|MISSION FAILED/i.test(body),
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!state.webgl || state.width < 800 || state.height < 360) throw new Error(`Default WebGL surface is invalid: ${JSON.stringify(diagnostics)}`);
if (!diagnostics.shotVisible || !state.directFireAvailable) throw new Error(`Flight controls are not wired: ${JSON.stringify(diagnostics)}`);
if (diagnostics.failed) throw new Error(`Default WebGL smoke lost the airframe: ${JSON.stringify(diagnostics)}`);
if (consoleErrors.length || pageErrors.length) throw new Error(`Default WebGL smoke errors: ${JSON.stringify(diagnostics)}`);
console.log(`[webgl-smoke] success ${state.width}x${state.height} renderer=${state.renderer || "unknown"}`);
