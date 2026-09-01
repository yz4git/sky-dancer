import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v99-combat-feel-final";
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
const httpErrors = [];
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (/Failed to load resource: the server responded with a status of 404/i.test(text)) return;
  consoleErrors.push(text);
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("response", (response) => { if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() }); });

await page.goto(`${baseUrl}?menu=1&v99Audit=2`, { waitUntil: "networkidle", timeout: 60_000 });
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
if (!(await start.count())) throw new Error("No START action");
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => typeof window.__skyV99Audit === "function", null, { timeout: 30_000 });
await page.waitForFunction(() => window.__skyV99Audit("status").ready === true, null, { timeout: 8_000, polling: 50 });
await page.waitForTimeout(280);

const capture = async (name) => {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("missing canvas box");
  await page.screenshot({ path: `${outputDir}/${name}.png`, clip: box });
};
const glState = await canvas.evaluate((element) => {
  const gl = element.getContext("webgl2") || element.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return { webgl: Boolean(gl), width: element.clientWidth, height: element.clientHeight, backingWidth: element.width, backingHeight: element.height, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
});
const hpFromBody = async () => Number(((await page.locator("body").innerText()).match(/AIRFRAME\s*([0-9]+)%/i) || [null, "0"])[1]);
const status = await page.evaluate(() => window.__skyV99Audit("status"));
await capture("00-baseline");

const gun = await page.evaluate(() => window.__skyV99Audit("gun"));
await page.waitForTimeout(58);
await capture("01-gun-hit-recoil");
await page.waitForTimeout(520);
await capture("01b-gun-recovery");

const missile = await page.evaluate(() => window.__skyV99Audit("missile"));
await page.waitForTimeout(64);
await capture("02-missile-hit-recoil");
await page.waitForTimeout(540);
await capture("02b-missile-recovery");

const debris = await page.evaluate(() => window.__skyV99Audit("debris"));
await page.waitForTimeout(72);
await capture("03-kill-debris-primary");
await page.waitForTimeout(250);
await capture("04-kill-debris-tumble");
await page.waitForTimeout(520);
await capture("04b-kill-debris-late");

const player = await page.evaluate(() => window.__skyV99Audit("player"));
await page.waitForTimeout(48);
await capture("05-player-hit-kick");
await page.waitForTimeout(430);
await capture("05b-player-recovery");

const optionalHttpProbe = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optionalHttpProbe(entry));
const diagnostics = {
  hp: await hpFromBody(), glState, status, gun, missile, debris, player,
  consoleErrors, pageErrors, httpErrors, blockingHttpErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
if (!glState.webgl || glState.width < 800 || glState.height < 360) throw new Error(`Invalid WebGL surface: ${JSON.stringify(glState)}`);
if (diagnostics.hp <= 0) throw new Error(`Airframe lost: ${diagnostics.hp}`);
if (!gun?.ok || !missile?.ok || !debris?.ok || !player?.ok) throw new Error(`Audit bridge failed: ${JSON.stringify({gun,missile,debris,player})}`);
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
