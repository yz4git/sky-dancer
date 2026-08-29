import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
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
await page.waitForTimeout(700);

async function readBridge(name) {
  return page.evaluate((key) => {
    const fn = window[key];
    return typeof fn === "function" ? fn() : null;
  }, name);
}

const hudVisible = await page.getByLabel("V54 cinematic mission HUD").isVisible().catch(() => false);
const initialHud = await page.getByLabel("V54 cinematic mission HUD").innerText().catch(() => "");
const initialCinematicVisible = await page.getByLabel("V54 cinematic beat").isVisible().catch(() => false);
await page.screenshot({ path: `${outputDir}/80-v54-visual-master-opening.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/80-v54-visual-master-opening-canvas.png` });

let v50 = await readBridge("__skyDancerGetV50Atmosphere");
let v51 = await readBridge("__skyDancerGetV51Silhouette");
let v52 = await readBridge("__skyDancerGetV52SpeedFx");
let v53 = await readBridge("__skyDancerGetV53Setpieces");

const oldHudHidden = await page.evaluate(() => {
  const oldHud = document.querySelector(".skyDancerV49Mission");
  if (!(oldHud instanceof HTMLElement)) return false;
  const style = getComputedStyle(oldHud);
  return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.05;
});
const hudBounds = await page.evaluate(() => {
  const hud = document.querySelector(".skyDancerV54Rail");
  if (!(hud instanceof HTMLElement)) return null;
  const r = hud.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: innerWidth, height: innerHeight };
});

await page.keyboard.down("ArrowRight");
for (let index = 0; index < 10; index += 1) {
  const box = await shot.boundingBox();
  if (box) await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForTimeout(240);
}
await page.keyboard.up("ArrowRight");

// Turbo hold is intentionally physics-neutral in SkyDancerTurboModel. Measure
// V52 on the real release dash rather than requiring false speed feedback while
// the player is only charging the button.
await page.keyboard.down("Space");
await page.waitForTimeout(900);
await page.keyboard.up("Space");
await page.waitForTimeout(120);
v52 = await readBridge("__skyDancerGetV52SpeedFx");
await page.screenshot({ path: `${outputDir}/81-v54-turbo-release-speed-field.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/81-v54-turbo-release-speed-field-canvas.png` });
await page.waitForTimeout(380);

v50 = v50 ?? await readBridge("__skyDancerGetV50Atmosphere");
v51 = v51 ?? await readBridge("__skyDancerGetV51Silhouette");
v53 = v53 ?? await readBridge("__skyDancerGetV53Setpieces");

const diagnostics = {
  hudVisible,
  initialHud,
  initialCinematicVisible,
  oldHudHidden,
  hudBounds,
  v50,
  v51,
  v52,
  v53,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/v54-visual-master-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
console.log(JSON.stringify(diagnostics, null, 2));
await browser.close();

if (pageErrors.length) throw new Error(`V54 page errors: ${pageErrors.join(" | ")}`);
if (!hudVisible || !/FLOW/.test(initialHud)) throw new Error(`V54 cinematic HUD not readable: ${JSON.stringify(diagnostics)}`);
if (!oldHudHidden) throw new Error(`V54 did not replace the V49 visual hierarchy: ${JSON.stringify(diagnostics)}`);
if (!hudBounds || hudBounds.left < -1 || hudBounds.top < -1 || hudBounds.right > hudBounds.width + 1 || hudBounds.bottom > hudBounds.height + 1) {
  throw new Error(`V54 HUD exceeds iPhone landscape viewport: ${JSON.stringify(diagnostics)}`);
}
if (!v50?.hasGradientSky || v50.style !== "city" || !(v50.rimIntensity > 0.5)) throw new Error(`V50 atmosphere bridge invalid: ${JSON.stringify(diagnostics)}`);
if (!v51?.playerAttached || !(v51.playerParts >= 10) || !(v51.visualSpan >= 6.5)) throw new Error(`V51 silhouette bridge invalid: ${JSON.stringify(diagnostics)}`);
if (!v52?.speedVisible || !(v52.speedOpacity > 0.08) || !(v52.streaks >= 24)) throw new Error(`V52 speed field did not engage on Turbo release dash: ${JSON.stringify(diagnostics)}`);
if (!(v53?.setpieceCount >= 20) || !(v53?.rotatingCount >= 3)) throw new Error(`V53 route setpieces missing: ${JSON.stringify(diagnostics)}`);
