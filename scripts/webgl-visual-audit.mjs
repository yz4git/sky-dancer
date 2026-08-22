import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/webgl-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
  ],
});

const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
await page.screenshot({ path: `${outputDir}/00-title.png`, fullPage: true });

const start = page.getByRole("button", { name: /START RUN/i });
await start.waitFor({ state: "visible", timeout: 20_000 });
await start.click();

const webglCanvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
await webglCanvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForTimeout(1_600);

const webgl = await webglCanvas.evaluate((canvas) => {
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return { ok: false };
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    ok: true,
    width: canvas.width,
    height: canvas.height,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  };
});

if (!webgl.ok) throw new Error("WebGL context was not created");

await page.screenshot({ path: `${outputDir}/01-gameplay-start.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/01-gameplay-start-canvas.png` });

// Exercise steering so banking and world-space wing trails appear.
await page.keyboard.down("ArrowRight");
await page.waitForTimeout(1_500);
await page.keyboard.up("ArrowRight");
await page.waitForTimeout(700);
await page.screenshot({ path: `${outputDir}/02-banked-turn.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/02-banked-turn-canvas.png` });

// Exercise Turbo/boost presentation.
await page.keyboard.down("Space");
await page.waitForTimeout(1_200);
await page.keyboard.up("Space");
await page.waitForTimeout(450);
await page.screenshot({ path: `${outputDir}/03-turbo.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/03-turbo-canvas.png` });

// Let enemy aircraft and missile attacks develop naturally.
await page.keyboard.down("ArrowLeft");
await page.waitForTimeout(900);
await page.keyboard.up("ArrowLeft");
await page.waitForTimeout(7_000);
await page.screenshot({ path: `${outputDir}/04-combat.png`, fullPage: true });
await webglCanvas.screenshot({ path: `${outputDir}/04-combat-canvas.png` });

const text = await page.locator("body").innerText();
const diagnostics = {
  capturedAt: new Date().toISOString(),
  url: page.url(),
  viewport: page.viewportSize(),
  webgl,
  bodyTextSample: text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 80),
  consoleErrors,
  pageErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));

if (pageErrors.length) {
  throw new Error(`Page errors during WebGL audit: ${pageErrors.join(" | ")}`);
}

await browser.close();

// Trigger a PR-scoped audit run that this ChatGPT session can retrieve.
