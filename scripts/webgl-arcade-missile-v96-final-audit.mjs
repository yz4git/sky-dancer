import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-missile-v96-final";
const allStageIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome", headless: true, args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version: 1, clearedStageIds: ids, unlockedStageIds: ids, records: {}, bestRunScore: 0, bestRunRank: "D", completedRuns: 0, oneCreditClears: 0 })), allStageIds);
const page = await context.newPage(); page.setDefaultTimeout(30_000); page.setDefaultNavigationTimeout(30_000);
const consoleErrors = [], pageErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); }); page.on("pageerror", (e) => pageErrors.push(String(e)));

await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
const mode = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
await page.waitForFunction(() => { const b = [...document.querySelectorAll('[aria-label="Select game mode"] button')].find((c) => c.textContent?.includes("STAGE PRACTICE")); return Boolean(b && !b.disabled); });
await mode.click();
const practice = page.locator('[aria-label="Select practice stage"] button'); let target = null;
for (let i = 0; i < await practice.count(); i++) { const b = practice.nth(i); if ((await b.locator("strong").textContent())?.trim() === "CITY") { target = b; break; } }
if (!target) throw new Error("CITY practice stage not found"); await target.click();
await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]'); await canvas.waitFor({ state: "visible" });
await page.waitForFunction(() => Boolean(window.__skyDancerAuditDemo?.getSnapshot));
const captures = []; const shot = async (label) => { await canvas.screenshot({ path: `${outputDir}/${label}.png`, timeout: 60_000 }); captures.push(label); console.log(`[v96-final] ${label}`); };
await page.waitForTimeout(950); await shot("00-entry");

// The audit build exposes the existing demo handle only to observe real enemy coordinates.
// Steering, locking, missile launch, runtime timing and hit rules remain the product implementation.
await page.waitForFunction(() => window.__skyDancerAuditDemo.getSnapshot().enemies.some((e) => e.depth >= 4 && e.depth <= 92), null, { timeout: 8000 });
await page.evaluate(() => window.__skyDancerAuditDemo.setLock(true));
let locked = 0;
for (let cycle = 0; cycle < 100 && locked === 0; cycle++) {
  const state = await page.evaluate(() => window.__skyDancerAuditDemo.getSnapshot());
  locked = state.lockedCount;
  if (locked > 0) break;
  const candidate = state.enemies.filter((e) => e.depth >= 4 && e.depth <= 92 && !e.locked)
    .sort((a, b) => Math.hypot(a.x - state.playerX, a.y - state.playerY) - Math.hypot(b.x - state.playerX, b.y - state.playerY))[0];
  if (candidate) {
    const dx = candidate.x - state.playerX, dy = candidate.y - state.playerY;
    const x = Math.max(-1, Math.min(1, dx * 1.35));
    const y = Math.max(-1, Math.min(1, dy * 1.35));
    await page.evaluate(({ x, y }) => window.__skyDancerAuditDemo.setMove(x, y), { x, y });
  }
  await page.waitForTimeout(70);
}
if (locked <= 0) { await page.evaluate(() => { window.__skyDancerAuditDemo.setMove(0,0); window.__skyDancerAuditDemo.setLock(false); }); throw new Error("No real missile lock acquired while tracking live enemy coordinates"); }
await page.evaluate(() => window.__skyDancerAuditDemo.setMove(0, 0));
await shot("01-real-lock");
const serialBefore = await page.evaluate(() => window.__skyDancerAuditDemo.getSnapshot().missileSerial);
await page.evaluate(() => window.__skyDancerAuditDemo.setLock(false));
await page.waitForFunction((serial) => window.__skyDancerAuditDemo.getSnapshot().missileSerial > serial, serialBefore, { timeout: 1500 });
const launchState = await page.evaluate(() => window.__skyDancerAuditDemo.getSnapshot());
if (!launchState.projectiles.some((p) => p.owner === "player-missile")) throw new Error("Missile serial advanced without a live player missile");
await page.waitForTimeout(12); await shot("02-salvo-launch");
await page.waitForTimeout(55); await shot("03-white-plume-a");
await page.waitForTimeout(80); await shot("04-white-plume-b");
await page.waitForTimeout(120); await shot("05-white-smoke-tail");

const body = await page.locator("body").innerText(); const hp = Number((body.match(/AIRFRAME\s*([0-9]+)%/i) || [0,0])[1]);
const finalState = await page.evaluate(() => window.__skyDancerAuditDemo.getSnapshot());
const glState = await canvas.evaluate((element) => { const gl = element.getContext("webgl2") || element.getContext("webgl"); const debug = gl?.getExtension("WEBGL_debug_renderer_info"); return { webgl: Boolean(gl), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null }; });
const blockingConsoleErrors = consoleErrors.filter((m) => !/Failed to load resource:.*404/i.test(m));
const diagnostics = { stageVisible: body.includes("DAWN CITY"), hp, lockedBeforeLaunch: locked, missileSerialBefore: serialBefore, missileSerialAfter: finalState.missileSerial, glState, captures, blockingConsoleErrors, pageErrors, failed: /AIRFRAME LOST|MISSION FAILED/i.test(body) };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2)); await browser.close();
if (!diagnostics.stageVisible || !glState.webgl || glState.width < 800 || glState.height < 360) throw new Error(`Invalid render: ${JSON.stringify(diagnostics)}`);
if (hp <= 0 || diagnostics.failed || locked <= 0 || diagnostics.missileSerialAfter <= diagnostics.missileSerialBefore) throw new Error(`Invalid combat state: ${JSON.stringify(diagnostics)}`);
if (captures.length !== 6) throw new Error(`Missing captures: ${JSON.stringify(diagnostics)}`);
if (blockingConsoleErrors.length || pageErrors.length) throw new Error(`Browser errors: ${JSON.stringify(diagnostics)}`);
console.log(`[v96-final] complete / lock ${locked} / missile ${diagnostics.missileSerialBefore}->${diagnostics.missileSerialAfter} / hp ${hp}`);
