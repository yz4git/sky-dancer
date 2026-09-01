import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = "artifacts/arcade-v1038-continuous-motion-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [], pageErrors = [], httpErrors = [];
page.on("console", m => { if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/i.test(m.text())) consoleErrors.push(m.text()); });
page.on("pageerror", e => pageErrors.push(String(e)));
page.on("response", r => { if (r.status() >= 400) httpErrors.push({ status: r.status(), url: r.url() }); });

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "networkidle", timeout: 60_000 });
const arcade = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcade.count()) await arcade.click({ force: true });
const start = page.locator("button").filter({ hasText: /START/i }).last();
await start.waitFor({ state: "visible", timeout: 30_000 });
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30_000 });
await page.waitForFunction(() => Boolean(globalThis.__skyDancerV1038MotionAudit), null, { timeout: 30_000 });
const box = await canvas.boundingBox();
if (!box) throw new Error("missing canvas bounds");

const cases = [
  { stageId: "dawn-city", progress: .29, label: "city" },
  { stageId: "red-canyon", progress: .31, label: "canyon" },
  { stageId: "ice-cavern", progress: .31, label: "ice" },
  { stageId: "night-metro", progress: .31, label: "night" },
  { stageId: "volcano-core", progress: .31, label: "volcano" },
  { stageId: "orbital-ascent", progress: .31, label: "orbit" },
];

const qAngle = (a, b) => {
  const dot = Math.min(1, Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]));
  return 2 * Math.acos(dot);
};
const distance3 = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1, Math.floor((sorted.length-1)*p))];
};

const reports = [];
for (const entry of cases) {
  await page.evaluate(params => globalThis.__skyDancerV1038MotionAudit.reset(params), entry);
  const frames = [];
  for (let frame = 0; frame < 180; frame += 1) {
    const phase = frame / 179 * Math.PI * 2;
    const moveX = Math.sin(phase * 1.15);
    const moveY = Math.sin(phase * .72 + .6) * .62;
    const turbo = frame >= 54 && frame < 114;
    const state = await page.evaluate(params => globalThis.__skyDancerV1038MotionAudit.step(params), { moveX, moveY, turbo });
    frames.push(state);
    if (frame % 15 === 0) await page.screenshot({ path: `${outputDir}/${entry.label}-${String(frame).padStart(3,"0")}.png`, type: "png", clip: box });
  }
  const cameraPositionSteps = [], cameraAngleSteps = [], playerScreenSteps = [], chunkScreenSteps = [];
  for (let i = 1; i < frames.length; i += 1) {
    const a = frames[i-1], b = frames[i];
    cameraPositionSteps.push(distance3(a.cameraPosition, b.cameraPosition));
    cameraAngleSteps.push(qAngle(a.cameraQuaternion, b.cameraQuaternion));
    playerScreenSteps.push(Math.hypot(a.playerNdc[0]-b.playerNdc[0], a.playerNdc[1]-b.playerNdc[1]));
    const prev = new Map(a.chunks.map(c => [c.name, c]));
    for (const c of b.chunks) {
      const p = prev.get(c.name);
      if (!p || !p.front || !c.front || !p.onScreen || !c.onScreen) continue;
      chunkScreenSteps.push(Math.hypot(p.ndc[0]-c.ndc[0], p.ndc[1]-c.ndc[1]));
    }
  }
  reports.push({
    ...entry,
    maxCameraPositionStep: Math.max(...cameraPositionSteps),
    p95CameraPositionStep: percentile(cameraPositionSteps,.95),
    maxCameraAngleStep: Math.max(...cameraAngleSteps),
    p95CameraAngleStep: percentile(cameraAngleSteps,.95),
    maxPlayerScreenStep: Math.max(...playerScreenSteps),
    p95PlayerScreenStep: percentile(playerScreenSteps,.95),
    maxChunkScreenStep: Math.max(0,...chunkScreenSteps),
    p95ChunkScreenStep: percentile(chunkScreenSteps,.95),
    backdropMoved: frames.some(f => f.backdrop.some(v => Math.abs(v) > 1e-8)),
    legacyTerrainSeen: frames.some(f => f.legacyTerrainCount !== 0),
    continuousTerrainRequired: ["canyon","ice","volcano"].includes(entry.label),
    continuousTerrainMissing: ["canyon","ice","volcano"].includes(entry.label) && frames.some(f => !f.continuousTerrain),
  });
}

const optional = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter(entry => !optional(entry));
const diagnostics = { reports, consoleErrors, pageErrors, httpErrors, blockingHttpErrors };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();

if (consoleErrors.length || pageErrors.length || blockingHttpErrors.length) throw new Error(JSON.stringify({ consoleErrors, pageErrors, blockingHttpErrors }));
for (const report of reports) {
  if (report.backdropMoved) throw new Error(`${report.label}: distant backdrop moved`);
  if (report.legacyTerrainSeen) throw new Error(`${report.label}: legacy rigid terrain returned`);
  if (report.continuousTerrainMissing) throw new Error(`${report.label}: continuous terrain missing`);
  if (report.maxCameraAngleStep > .12) throw new Error(`${report.label}: camera angular discontinuity ${report.maxCameraAngleStep}`);
  if (report.maxCameraPositionStep > 1.35) throw new Error(`${report.label}: camera position discontinuity ${report.maxCameraPositionStep}`);
}
