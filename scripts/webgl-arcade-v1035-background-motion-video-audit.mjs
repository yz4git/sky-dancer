import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v1035-background-motion-video";
const framesDir = `${outputDir}/frames`;
await mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/i.test(m.text())) consoleErrors.push(m.text());
});
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400) httpErrors.push({ status: r.status(), url: r.url() }); });

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcade = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcade.count()) await arcade.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1035MotionAudit), null, { timeout: 30_000 });
await page.evaluate(() => globalThis.__skyDancerV1035MotionAudit.begin());

const box = await canvas.boundingBox();
if (!box) throw new Error("Arcade Run canvas has no bounding box");
const renderState = await canvas.evaluate((c) => {
  const rect = c.getBoundingClientRect();
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    webgl: Boolean(gl), width: rect.width, height: rect.height,
    backingWidth: c.width, backingHeight: c.height,
    renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
  };
});

const fps = 12;
const seconds = 18;
const frames = fps * seconds;
const samples = [];
for (let frame = 0; frame < frames; frame += 1) {
  const t = frame / fps;
  let moveX = 0, moveY = 0, turbo = false, segment = "straight";
  if (t >= 3 && t < 7) { moveX = 1; moveY = .72; segment = "right-climb"; }
  else if (t >= 7 && t < 11) { moveX = -1; moveY = -.72; segment = "left-dive"; }
  else if (t >= 11 && t < 14.5) { moveX = 1; moveY = -.35; turbo = true; segment = "turbo-right"; }
  else if (t >= 14.5) { moveX = -1; moveY = .45; turbo = true; segment = "turbo-left"; }
  const state = await page.evaluate(({ moveX, moveY, turbo, steps }) => globalThis.__skyDancerV1035MotionAudit.advance(moveX, moveY, turbo, steps), { moveX, moveY, turbo, steps: 5 });
  samples.push({ frame, t, segment, ...state });
  await page.screenshot({
    path: `${framesDir}/frame-${String(frame).padStart(4, "0")}.jpg`,
    type: "jpeg", quality: 82, clip: box,
  });
}

execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-framerate", String(fps),
  "-i", `${framesDir}/frame-%04d.jpg`,
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  `${outputDir}/dawn-city-background-motion-current.mp4`,
], { stdio: "inherit" });

const optional = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter((entry) => !optional(entry));
const diagnostics = { renderState, fps, seconds, samples, consoleErrors, pageErrors, httpErrors, blockingHttpErrors };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (!renderState.webgl || renderState.width < 800 || renderState.height < 360) throw new Error(`invalid WebGL surface ${JSON.stringify(renderState)}`);
if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
if (blockingHttpErrors.length) throw new Error(`HTTP errors: ${JSON.stringify(blockingHttpErrors)}`);
