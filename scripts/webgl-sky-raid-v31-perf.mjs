import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.cwd(), '.audit-runtime/node_modules/playwright-core'));
const label = process.env.SKY_RAID_PERF_LABEL || 'sample';
const port = Number(process.env.SKY_RAID_PERF_PORT || 4173);
const checkpoints = process.env.SKY_RAID_PERF_CHECKPOINTS === '1';
const outDir = path.join(process.cwd(), 'artifacts/sky-raid-v31-performance');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(`http://127.0.0.1:${port}/?menu=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.locator('button').filter({ hasText: 'SKY RAID' }).first().click();
await page.getByRole('button', { name: /START SKY RAID/i }).click();
await page.waitForSelector('canvas', { timeout: 20000 });
await page.evaluate(() => { window.__skyRaidAuditElapsedSeconds = 20; });
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(outDir, `${label}-opening.png`) });

const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]));
const before = await metrics();
await page.evaluate(() => {
  window.__v31PerfFrames = [];
  window.__v31PerfActive = true;
  let previous = performance.now();
  const tick = (now) => {
    if (!window.__v31PerfActive) return;
    window.__v31PerfFrames.push(now - previous);
    previous = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const wallStart = Date.now();
await page.waitForTimeout(12000);
const wallSeconds = (Date.now() - wallStart) / 1000;
const after = await metrics();
const frameTimes = await page.evaluate(() => {
  window.__v31PerfActive = false;
  return window.__v31PerfFrames || [];
});
const sorted = frameTimes.filter((value) => Number.isFinite(value) && value > 0).sort((left, right) => left - right);
const meanFrameMs = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
const p95FrameMs = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
const fps = meanFrameMs > 0 ? 1000 / meanFrameMs : 0;
const result = {
  label,
  fps,
  meanFrameMs,
  p95FrameMs,
  frameSamples: sorted.length,
  taskMsPerSecond: ((after.TaskDuration || 0) - (before.TaskDuration || 0)) * 1000 / wallSeconds,
  scriptMsPerSecond: ((after.ScriptDuration || 0) - (before.ScriptDuration || 0)) * 1000 / wallSeconds,
  heapUsedMB: (after.JSHeapUsedSize || 0) / 1048576,
  errors,
};

if (checkpoints) {
  result.checkpoints = [];
  for (const second of [54, 89, 91]) {
    await page.evaluate((value) => { window.__skyRaidAuditElapsedSeconds = value; }, second);
    await page.waitForTimeout(2400);
    const camera = await page.evaluate(() => typeof window.__skyRaidGetCameraPolish === 'function' ? window.__skyRaidGetCameraPolish() : null);
    result.checkpoints.push({ second, camera });
    await page.screenshot({ path: path.join(outDir, `${label}-${second}s.png`) });
  }
}

fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(result, null, 2));
console.log(`SKY RAID V31 PERF ${label.toUpperCase()}`, JSON.stringify(result));
if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
if (checkpoints) {
  for (const checkpoint of result.checkpoints) {
    if (!checkpoint.camera?.playerVisible) throw new Error(`player not visible at ${checkpoint.second}s`);
    if ((checkpoint.camera?.enemyVisible ?? 0) > 8) throw new Error(`phone enemy clutter at ${checkpoint.second}s`);
    if ((checkpoint.camera?.enemyCombatLane ?? 0) < 1) throw new Error(`empty combat lane at ${checkpoint.second}s`);
  }
}
await browser.close();
