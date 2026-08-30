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
const diagnostics = {
  arcadeHud: /STAGE|DAWN CITY|CITY/i.test(bodyText),
  buttonLabels,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!diagnostics.arcadeHud) throw new Error(`Arcade Run HUD was not found: ${JSON.stringify(diagnostics)}`);
if (pageErrors.length) throw new Error(`Arcade Run page errors: ${pageErrors.join(" | ")}`);
