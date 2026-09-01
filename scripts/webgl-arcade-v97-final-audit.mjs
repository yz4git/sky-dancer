import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-v971-final";
const ids = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome", headless: true, args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((stageIds) => localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version: 1, clearedStageIds: stageIds, unlockedStageIds: stageIds, records: {}, bestRunScore: 0, bestRunRank: "D", completedRuns: 0, oneCreditClears: 0 })), ids);
const page = await context.newPage(); page.setDefaultTimeout(30000);
const consoleErrors = [], pageErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => pageErrors.push(String(e)));
await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
await page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first().click();
const stages = page.locator('[aria-label="Select practice stage"] button'); let city = null;
for (let i = 0; i < await stages.count(); i++) { const b = stages.nth(i); if ((await b.locator("strong").textContent())?.trim() === "CITY") { city = b; break; } }
if (!city) throw new Error("CITY practice stage not found");
await city.click(); await page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first().click();
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]'); await canvas.waitFor({ state: "visible" });
await page.waitForFunction(() => Boolean(window.__skyDancerAuditDemo?.getSnapshot));
const captures = [];
const canvasShot = async (label) => { await canvas.screenshot({ path: `${outputDir}/${label}.png`, timeout: 60000 }); captures.push(label); };
const pageShot = async (label) => { await page.screenshot({ path: `${outputDir}/${label}.png`, timeout: 60000 }); captures.push(label); };
await page.waitForTimeout(500); await pageShot("00-entry-full-ui");

const setup = await page.evaluate(() => {
  const demo = window.__skyDancerAuditDemo; const runtime = demo.runtime;
  // Advance actual product runtime, then force the exact product sync method once so the slow SwiftShader rAF
  // cannot lag behind the authoritative snapshot during the visual assertion.
  for (let i = 0; i < 190; i++) runtime.step(1/60);
  demo.setLock(true);
  for (let i = 0; i < 520; i++) {
    const s = runtime.getSnapshot();
    if (s.lockedCount >= 3) break;
    const e = s.enemies.filter((enemy) => enemy.depth >= 12 && enemy.depth <= 82 && !enemy.locked)
      .sort((a,b) => Math.hypot(a.x-s.playerX,a.y-s.playerY) - Math.hypot(b.x-s.playerX,b.y-s.playerY))[0];
    if (e) demo.setMove(Math.max(-1, Math.min(1, (e.x-s.playerX)*1.55)), Math.max(-1, Math.min(1, (e.y-s.playerY)*1.55)));
    runtime.step(1/60);
  }
  demo.setMove(0,0);
  const s = runtime.getSnapshot();
  demo.sync(s, 1/60);
  demo.pause();
  return { locked:s.lockedCount, serial:s.missileSerial, enemies:s.enemies.length, stageTime:s.stageTimeSeconds };
});
if (setup.locked < 1) throw new Error(`Lock failed ${JSON.stringify(setup)}`);
await page.waitForTimeout(80);
await canvasShot("01-lock-readable"); await pageShot("02-lock-full-ui");
const targetVisuals = await page.evaluate(() => {
  const demo = window.__skyDancerAuditDemo;
  return {
    lockRings: demo.scene.getObjectsByProperty("name", "arcade-lock-ring").length,
    lockMeshes: demo.scene.getObjectsByProperty("name", "arcade-lock-ring-mesh").length,
    beacons: demo.scene.getObjectsByProperty("name", "arcade-enemy-visibility-beacons").length,
  };
});

const launch = await page.evaluate(() => {
  const demo = window.__skyDancerAuditDemo; demo.resume(); demo.setLock(true); demo.setLock(false);
  const s=demo.getSnapshot(); demo.sync(s,1/60); demo.pause();
  return { serial:s.missileSerial, missiles:s.projectiles.filter((p)=>p.owner==="player-missile").length };
});
if (launch.serial <= setup.serial || launch.missiles < 1) throw new Error(`Launch failed ${JSON.stringify({setup,launch})}`);
await page.waitForTimeout(80); await canvasShot("03-missile-launch");
for (const [steps,label] of [[4,"04-missile-chase"],[8,"05-smoke-tail"]]) {
  await page.evaluate((count) => { const d=window.__skyDancerAuditDemo; d.resume(); for(let i=0;i<count;i++) d.runtime.step(1/60); const s=d.getSnapshot(); d.sync(s,1/60); d.pause(); }, steps);
  await page.waitForTimeout(80); await canvasShot(label);
}

const body = await page.locator("body").innerText();
const hp = Number((body.match(/AIRFRAME\s*([0-9]+)%/i)||[0,0])[1]);
const final = await page.evaluate(() => window.__skyDancerAuditDemo.getSnapshot());
const glState = await canvas.evaluate((el) => { const gl=el.getContext("webgl2")||el.getContext("webgl"); const ext=gl?.getExtension("WEBGL_debug_renderer_info"); return { webgl:Boolean(gl), width:el.getBoundingClientRect().width, height:el.getBoundingClientRect().height, renderer:ext&&gl?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null }; });
const blockingConsoleErrors = consoleErrors.filter((m) => !/Failed to load resource:.*404/i.test(m));
const diagnostics = { stageVisible:body.includes("DAWN CITY"), hp, setup, targetVisuals, launch, missileSerialAfter:final.missileSerial, glState, captures, blockingConsoleErrors, pageErrors, failed:/AIRFRAME LOST|MISSION FAILED/i.test(body) };
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics,null,2)); await browser.close();
if (!diagnostics.stageVisible || !glState.webgl || hp <= 0 || diagnostics.failed || setup.locked < 1 || targetVisuals.lockRings < 1 || targetVisuals.lockMeshes < 1 || targetVisuals.beacons < 1 || launch.missiles < 1 || captures.length !== 6 || blockingConsoleErrors.length || pageErrors.length) throw new Error(`Audit failed ${JSON.stringify(diagnostics)}`);
console.log(`[v971] complete lock=${setup.locked} rings=${targetVisuals.lockRings} beacons=${targetVisuals.beacons} missiles=${launch.missiles} hp=${hp}`);
