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

await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
const arcadeMode = page.getByRole("button", { name: /ARCADE RUN/i }).first();
if (await arcadeMode.isVisible().catch(() => false)) await arcadeMode.click();
const start = page.getByRole("button", { name: /START ARCADE RUN/i });
await start.waitFor({ state: "visible", timeout: 15_000 });
await start.click();

const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${outputDir}/00-opening.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/00-opening-canvas.png` });

await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outputDir}/01-banked-climb.png`, fullPage: true });
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowUp");

await page.keyboard.down("x");
await page.keyboard.down("c");
await page.waitForTimeout(1400);
await page.screenshot({ path: `${outputDir}/02-combat.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/02-combat-canvas.png` });
await page.keyboard.up("x");
await page.keyboard.up("c");

await page.keyboard.down(" ");
await page.waitForTimeout(900);
await page.screenshot({ path: `${outputDir}/03-turbo.png`, fullPage: true });
await canvas.screenshot({ path: `${outputDir}/03-turbo-canvas.png` });
await page.keyboard.up(" ");
await page.waitForTimeout(450);

const bodyText = await page.locator("body").innerText();
const renderer = await page.evaluate(() => {
  const canvas = document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  const gl = canvas instanceof HTMLCanvasElement ? (canvas.getContext("webgl2") || canvas.getContext("webgl")) : null;
  return gl ? String(gl.getParameter(gl.RENDERER)) : null;
});
const diagnostics = {
  arcadeHud: /STAGE|DAWN CITY|CITY/i.test(bodyText),
  renderer,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!diagnostics.arcadeHud) throw new Error(`Arcade Run HUD was not found: ${JSON.stringify(diagnostics)}`);
if (pageErrors.length) throw new Error(`Arcade Run page errors: ${pageErrors.join(" | ")}`);
