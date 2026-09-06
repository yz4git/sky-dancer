import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "https://yz4git.github.io/sky-dancer/";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/live-stage-playcheck";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", e => pageErrors.push(String(e)));

const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}menu=1&livePlaycheck=${Date.now()}`;
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.screenshot({ path: `${outputDir}/00-title.jpg`, fullPage: true, type: "jpeg", quality: 78 });

const turboMode = page.locator("button").filter({ hasText: /^\s*TURBO HUNT/i }).first();
if (!(await turboMode.count())) throw new Error(`TURBO HUNT mode button missing: ${await page.locator("body").innerText()}`);
await turboMode.click({ force: true });
await page.waitForTimeout(150);
const start = page.locator("button").filter({ hasText: /START TURBO HUNT/i }).first();
if (!(await start.count())) throw new Error(`START TURBO HUNT missing: ${await page.locator("body").innerText()}`);
await start.click({ force: true });

const canvas = page.locator('canvas[aria-label="Sky Dancer WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
const shot = page.getByRole("button", { name: "Fire missile" });
await shot.waitFor({ state: "visible", timeout: 15_000 });
const stageHud = page.getByLabel("Sky Dancer stage status");
await stageHud.waitFor({ state: "visible", timeout: 15_000 });

const captures = [2, 15, 35, 65, 88];
const captured = new Set();
const samples = [];
const started = Date.now();
let steer = "ArrowRight";
let nextSteer = 5500;
let nextTurbo = 8000;
let turboHeld = false;
let turboRelease = 0;
await page.keyboard.down(steer);

async function capture(seconds) {
  const tag = String(seconds).padStart(2, "0");
  await page.screenshot({ path: `${outputDir}/${tag}s-full.jpg`, fullPage: true, type: "jpeg", quality: 82 });
  await canvas.screenshot({ path: `${outputDir}/${tag}s-canvas.jpg`, type: "jpeg", quality: 84 });
}

while ((Date.now() - started) / 1000 < 92) {
  const elapsedMs = Date.now() - started;
  const elapsed = elapsedMs / 1000;
  if (elapsedMs >= nextSteer) {
    await page.keyboard.up(steer);
    steer = steer === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    await page.keyboard.down(steer);
    nextSteer += 5500;
  }
  if (!turboHeld && elapsedMs >= nextTurbo) {
    await page.keyboard.down("Space");
    turboHeld = true;
    turboRelease = elapsedMs + 700;
  }
  if (turboHeld && elapsedMs >= turboRelease) {
    await page.keyboard.up("Space");
    turboHeld = false;
    nextTurbo = elapsedMs + 8000;
  }

  const box = await shot.boundingBox();
  if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(340);

  for (const second of captures) {
    if (!captured.has(second) && elapsed >= second) {
      captured.add(second);
      await capture(second);
    }
  }

  if (samples.length === 0 || elapsed - samples[samples.length - 1].elapsed >= 2.5) {
    const hudText = (await stageHud.innerText()).replace(/\s+/g, " ").trim();
    const weapon = await page.evaluate(() => typeof window.__skyDancerGetWeaponState === "function" ? window.__skyDancerGetWeaponState() : null);
    const flight = await page.evaluate(() => typeof window.__skyDancerGetFlightDebug === "function" ? window.__skyDancerGetFlightDebug() : null);
    const stage = await page.evaluate(() => typeof window.__skyDancerGetStageCycle === "function" ? window.__skyDancerGetStageCycle() : null);
    samples.push({ elapsed: Number(elapsed.toFixed(2)), hudText, weapon, flight, stage });
  }
}

await page.keyboard.up(steer).catch(() => {});
if (turboHeld) await page.keyboard.up("Space").catch(() => {});
const finalText = await page.locator("body").innerText();
const diagnostics = {
  url,
  captured: [...captured],
  finalHud: (await stageHud.innerText()).replace(/\s+/g, " ").trim(),
  bodyTail: finalText.slice(-1800),
  consoleErrors,
  pageErrors,
  samples,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
