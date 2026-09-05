import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const label = process.env.SKY_RAID_PERF_LABEL || "baseline";
const port = Number(process.env.SKY_RAID_PERF_PORT || 4173);
const checkpointAudit = process.env.SKY_RAID_PERF_CHECKPOINTS === "1";
const out = "artifacts/sky-raid-v30-performance";
fs.mkdirSync(out, { recursive: true });
const watchdog = setTimeout(() => process.exit(124), 150000);
let browser; let context; let page;

function metricMap(response) {
  return Object.fromEntries((response.metrics || []).map((entry) => [entry.name, entry.value]));
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

async function visualSample(name) {
  const sample = await page.evaluate(() => {
    const snap = window.__v30RaidSnapshot;
    const camera = window.__skyRaidGetCameraPolish?.() ?? {};
    return {
      elapsed: Number(snap?.elapsedSeconds ?? 0),
      actIndex: Number(snap?.actIndex ?? -1),
      actId: String(snap?.actId ?? ""),
      remaining: Number(snap?.actSecondsRemaining ?? 0),
      enemyVisible: Number(camera.enemyVisible ?? 0),
      enemyCombatLane: Number(camera.enemyCombatLane ?? 0),
      playerVisible: camera.playerVisible === true,
      fov: Number(camera.fov ?? 0),
      bodyText: (document.body.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 1200),
    };
  });
  await page.screenshot({ path: path.join(out, `${label}-${name}.png`), timeout: 7000 });
  return sample;
}

async function perfWindow(cdp, seconds = 4) {
  const before = metricMap(await cdp.send("Performance.getMetrics"));
  const raf = await page.evaluate(async (durationMs) => {
    const shot = [...document.querySelectorAll("button")].find((button) => /^\s*SHOT/i.test(button.textContent || ""));
    const turbo = [...document.querySelectorAll("button")].find((button) => /^\s*TURBO/i.test(button.textContent || ""));
    let shotTimer = 0;
    let turboTimer = 0;
    const intervals = [];
    const start = performance.now();
    let last = start;
    await new Promise((resolve) => {
      function tick(now) {
        const dt = now - last;
        last = now;
        if (now > start) intervals.push(dt);
        if (now - shotTimer > 720) {
          shotTimer = now;
          shot?.click();
        }
        if (now - turboTimer > 1900) {
          turboTimer = now;
          turbo?.click();
        }
        if (now - start >= durationMs) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    intervals.sort((a, b) => a - b);
    const sum = intervals.reduce((total, value) => total + value, 0);
    const p95 = intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95))] ?? 0;
    const p99 = intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * 0.99))] ?? 0;
    return {
      frameCount: intervals.length,
      wallMs: performance.now() - start,
      meanFrameMs: intervals.length ? sum / intervals.length : 0,
      p95FrameMs: p95,
      p99FrameMs: p99,
      over33ms: intervals.filter((value) => value > 33.34).length,
      over50ms: intervals.filter((value) => value > 50).length,
    };
  }, seconds * 1000);
  const after = metricMap(await cdp.send("Performance.getMetrics"));
  const wallSeconds = Math.max(0.001, raf.wallMs / 1000);
  const delta = (name) => Math.max(0, Number(after[name] ?? 0) - Number(before[name] ?? 0));
  return {
    ...raf,
    fps: raf.frameCount / wallSeconds,
    taskMsPerSecond: delta("TaskDuration") * 1000 / wallSeconds,
    scriptMsPerSecond: delta("ScriptDuration") * 1000 / wallSeconds,
    layoutMsPerSecond: delta("LayoutDuration") * 1000 / wallSeconds,
    styleMsPerSecond: delta("RecalcStyleDuration") * 1000 / wallSeconds,
    heapUsedMB: Number(after.JSHeapUsedSize ?? 0) / 1048576,
    nodes: Number(after.Nodes ?? 0),
  };
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !/404/.test(message.text())) errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}?menu=1&perf=${label}-${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    window.__v30RaidSnapshot = null;
    window.addEventListener("sky-dancer-sky-raid-snapshot", (event) => { window.__v30RaidSnapshot = event.detail; });
  });
  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => window.__v30RaidSnapshot?.gameMode === "sky-raid", null, { timeout: 12000 });
  await page.waitForTimeout(2500);

  const opening = await visualSample("opening");
  if (!opening.playerVisible || opening.enemyVisible < 3 || opening.enemyVisible > 8 || opening.enemyCombatLane < 1) {
    throw new Error(`opening visual gate failed: ${JSON.stringify(opening)}`);
  }

  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const windows = [];
  for (let index = 0; index < 3; index += 1) windows.push(await perfWindow(cdp, 4));
  const summary = {
    label,
    viewport: { width: 844, height: 390, dpr: 2 },
    opening,
    windows,
    median: {
      fps: median(windows.map((entry) => entry.fps)),
      meanFrameMs: median(windows.map((entry) => entry.meanFrameMs)),
      p95FrameMs: median(windows.map((entry) => entry.p95FrameMs)),
      taskMsPerSecond: median(windows.map((entry) => entry.taskMsPerSecond)),
      scriptMsPerSecond: median(windows.map((entry) => entry.scriptMsPerSecond)),
      heapUsedMB: median(windows.map((entry) => entry.heapUsedMB)),
    },
    checkpoints: [],
    errors,
  };

  if (checkpointAudit) {
    for (const checkpoint of [54, 89, 91]) {
      await page.evaluate((elapsed) => { window.__skyRaidAuditElapsedSeconds = elapsed; }, checkpoint);
      await page.waitForFunction((elapsed) => Number(window.__v30RaidSnapshot?.elapsedSeconds ?? 0) >= elapsed, checkpoint, { timeout: 8000, polling: 50 });
      await page.waitForTimeout(450);
      const visual = await visualSample(`${checkpoint}s`);
      if (!visual.playerVisible || visual.enemyVisible < 3 || visual.enemyVisible > 8 || visual.enemyCombatLane < 1) {
        throw new Error(`checkpoint visual gate failed: ${JSON.stringify(visual)}`);
      }
      summary.checkpoints.push(visual);
    }
  }

  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);
  fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(summary, null, 2));
  console.log(`SKY RAID V30 PERF ${label.toUpperCase()}`, JSON.stringify(summary.median));
} catch (error) {
  try {
    fs.writeFileSync(path.join(out, `${label}-failure.txt`), String(error?.stack ?? error));
    await page?.screenshot({ path: path.join(out, `${label}-failure.png`), timeout: 7000 });
  } catch {}
  throw error;
} finally {
  clearTimeout(watchdog);
  try { await page?.evaluate(() => { delete window.__skyRaidAuditElapsedSeconds; }); } catch {}
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}
