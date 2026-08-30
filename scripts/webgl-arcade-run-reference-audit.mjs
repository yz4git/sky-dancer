import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-run-reference";
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

const menuUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}menu=1`;
await page.goto(menuUrl, { waitUntil: "networkidle", timeout: 60_000 });
await page.locator("button").first().waitFor({ state: "attached", timeout: 30_000 });
await page.screenshot({ path: `${outputDir}/title.png`, fullPage: true });
const buttonLabels = (await page.locator("button").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
console.log("Title buttons:", buttonLabels);

// Arcade Run is the title-screen default. Select it explicitly when the mode card is present,
// then start through the first rendered START action instead of coupling the audit to exact copy.
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
await page.waitForTimeout(100);
const start = page.locator("button").filter({ hasText: /START/i }).last();
if (!(await start.count())) {
  await writeFile(`${outputDir}/startup-diagnostics.json`, JSON.stringify({ buttonLabels, body: await page.locator("body").innerText(), consoleErrors, pageErrors }, null, 2));
  throw new Error(`No START action on title screen: ${JSON.stringify(buttonLabels)}`);
}
await start.scrollIntoViewIfNeeded();
await start.click({ force: true });

const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
const captureCanvas = async (path) => {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Arcade Run canvas has no bounding box");
  await page.screenshot({ path, clip: box });
};
await page.waitForTimeout(1400);
const renderState = await canvas.evaluate((element) => {
  const c = element;
  const rect = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    backingWidth: c.width,
    backingHeight: c.height,
    cssWidth: rect.width,
    cssHeight: rect.height,
    webgl: Boolean(gl),
    renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    mode: document.documentElement.dataset.skyDancerMode || document.body.dataset.skyDancerMode || null,
  };
});
await page.screenshot({ path: `${outputDir}/00-opening.png`, fullPage: true });
await captureCanvas(`${outputDir}/00-opening-canvas.png`);

await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outputDir}/01-wide-right-top.png`, fullPage: true });
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowUp");

await page.keyboard.down("ArrowLeft");
await page.keyboard.down("ArrowDown");
await page.waitForTimeout(2200);
await page.screenshot({ path: `${outputDir}/01b-wide-left-bottom.png`, fullPage: true });
await page.keyboard.up("ArrowLeft");
await page.keyboard.up("ArrowDown");
await page.waitForTimeout(900);
await page.screenshot({ path: `${outputDir}/01c-wide-field-enemies.png`, fullPage: true });

await page.keyboard.down("x");
await page.keyboard.down("c");
await page.waitForTimeout(1400);
await page.screenshot({ path: `${outputDir}/02-combat.png`, fullPage: true });
await captureCanvas(`${outputDir}/02-combat-canvas.png`);
await page.keyboard.up("x");
await page.keyboard.up("c");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outputDir}/02a-missile-approach.png`, fullPage: true });
await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(650);
await page.screenshot({ path: `${outputDir}/02b-enemy-missile-evasion.png`, fullPage: true });
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowUp");

await page.keyboard.down(" ");
await page.waitForTimeout(900);
await page.screenshot({ path: `${outputDir}/03-turbo.png`, fullPage: true });
await captureCanvas(`${outputDir}/03-turbo-canvas.png`);
await page.keyboard.up(" ");
await page.waitForTimeout(450);

const bodyText = await page.locator("body").innerText();
const diagnostics = {
  arcadeHud: /STAGE|DAWN CITY|CITY/i.test(bodyText),
  buttonLabels,
  renderState,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!diagnostics.arcadeHud) throw new Error(`Arcade Run HUD was not found: ${JSON.stringify(diagnostics)}`);
if (!renderState.webgl || renderState.cssWidth < 800 || renderState.cssHeight < 360) throw new Error(`Arcade Run WebGL surface is invalid: ${JSON.stringify(renderState)}`);
if (consoleErrors.length) throw new Error(`Arcade Run console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`Arcade Run page errors: ${pageErrors.join(" | ")}`);
