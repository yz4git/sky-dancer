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
const pad = page.getByRole("slider", { name: "Arcade steering virtual pad" });
await pad.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(900);

const readFlight = () => page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
const box = await pad.boundingBox();
if (!box) throw new Error("Arcade virtual pad had no bounding box");
const bounds = { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, width: 844, height: 390 };
const before = await readFlight();
await page.screenshot({ path: `${outputDir}/90-arcade-pad-neutral.png`, fullPage: true });

const cx = box.x + box.width * 0.5;
const cy = box.y + box.height * 0.5;
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx - box.width * 0.34, cy, { steps: 8 });
await page.waitForTimeout(1400);
const leftValue = Number(await pad.getAttribute("aria-valuenow"));
const left = await readFlight();
await page.screenshot({ path: `${outputDir}/91-arcade-pad-left.png`, fullPage: true });
await page.mouse.up();
await page.waitForTimeout(180);
const neutralAfterLeft = Number(await pad.getAttribute("aria-valuenow"));

await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + box.width * 0.34, cy, { steps: 8 });
await page.waitForTimeout(2200);
const rightValue = Number(await pad.getAttribute("aria-valuenow"));
const right = await readFlight();
await page.screenshot({ path: `${outputDir}/92-arcade-pad-right.png`, fullPage: true });
await page.mouse.up();
await page.waitForTimeout(180);
const neutralAfterRight = Number(await pad.getAttribute("aria-valuenow"));
const final = await readFlight();

const leftDeltaX = Number(left?.x ?? 0) - Number(before?.x ?? 0);
const rightDeltaX = Number(right?.x ?? 0) - Number(left?.x ?? 0);
const diagnostics = {
  bounds,
  before,
  left,
  right,
  final,
  leftValue,
  rightValue,
  neutralAfterLeft,
  neutralAfterRight,
  leftDeltaX,
  rightDeltaX,
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/arcade-pad-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
console.log(JSON.stringify(diagnostics, null, 2));
await browser.close();

if (pageErrors.length) throw new Error(`Arcade pad page errors: ${pageErrors.join(" | ")}`);
if (bounds.left < -1 || bounds.top < -1 || bounds.right > bounds.width + 1 || bounds.bottom > bounds.height + 1) throw new Error(`Arcade pad exceeds iPhone landscape viewport: ${JSON.stringify(diagnostics)}`);
if (box.width < 90 || box.height < 90) throw new Error(`Arcade pad touch target too small: ${JSON.stringify(diagnostics)}`);
if (leftValue !== -1 || rightValue !== 1) throw new Error(`Arcade pad did not resolve both steering directions: ${JSON.stringify(diagnostics)}`);
if (neutralAfterLeft !== 0 || neutralAfterRight !== 0) throw new Error(`Arcade pad did not return to neutral on release: ${JSON.stringify(diagnostics)}`);
if (!(Math.abs(leftDeltaX) > 0.15)) throw new Error(`Left arcade steering did not move aircraft: ${JSON.stringify(diagnostics)}`);
if (!(Math.abs(rightDeltaX) > 0.15)) throw new Error(`Right arcade steering did not move aircraft: ${JSON.stringify(diagnostics)}`);
