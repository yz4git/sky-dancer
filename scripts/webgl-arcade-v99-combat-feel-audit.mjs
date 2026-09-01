import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v99-combat-feel";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));

await page.goto(`${baseUrl}?menu=1&v99Audit=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => typeof window.__skyV99Audit === "function", null, { timeout: 30_000 });
await page.waitForFunction(() => window.__skyV99Audit("status").enemyCount > 0, null, { timeout: 12_000, polling: 100 });
await page.waitForTimeout(700);

const capture = async (name) => {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("missing canvas box");
  await page.screenshot({ path: `${outputDir}/${name}.png`, clip: box });
};

const glState = await canvas.evaluate((element) => {
  const gl = element.getContext("webgl2") || element.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return { webgl: Boolean(gl), width: element.clientWidth, height: element.clientHeight, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
});
const hp = Number(((await page.locator("body").innerText()).match(/AIRFRAME\s*([0-9]+)%/i) || [null, "0"])[1]);
const status = await page.evaluate(() => window.__skyV99Audit("status"));
await capture("00-baseline");

const gun = await page.evaluate(() => window.__skyV99Audit("gun"));
await page.waitForTimeout(42);
await capture("01-gun-hit-recoil");
await page.waitForTimeout(420);

const missile = await page.evaluate(() => window.__skyV99Audit("missile"));
await page.waitForTimeout(42);
await capture("02-missile-hit-recoil");
await page.waitForTimeout(480);

const debris = await page.evaluate(() => window.__skyV99Audit("debris"));
await page.waitForTimeout(95);
await capture("03-kill-debris-primary");
await page.waitForTimeout(260);
await capture("04-kill-debris-tumble");

const player = await page.evaluate(() => window.__skyV99Audit("player"));
await page.waitForTimeout(35);
await capture("05-player-hit-kick");

const diagnostics = { hp, glState, status, gun, missile, debris, player, consoleErrors, pageErrors, failed: !glState.webgl || hp <= 0 || consoleErrors.length > 0 || pageErrors.length > 0 };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
if (diagnostics.failed) throw new Error(JSON.stringify(diagnostics));
