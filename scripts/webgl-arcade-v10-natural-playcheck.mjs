import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = "artifacts/arcade-v10-natural-playcheck";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleErrors = [], pageErrors = [], httpErrors = [];
page.on("console", m => { if (m.type() === "error" && !/404/i.test(m.text())) consoleErrors.push(m.text()); });
page.on("pageerror", e => pageErrors.push(String(e)));
page.on("response", r => { if (r.status() >= 400) httpErrors.push({ status: r.status(), url: r.url() }); });

await page.goto(`${baseUrl}?menu=1&naturalAudit=1`, { waitUntil: "networkidle", timeout: 60000 });
const arcadeMode = page.locator("button").filter({ hasText: /^\s*ARCADE RUN/i }).first();
if (await arcadeMode.count()) await arcadeMode.click({ force: true });
const start = page.locator("button").filter({ hasText: /START ARCADE RUN/i }).first();
if (!(await start.count())) throw new Error("No START ARCADE RUN action");
await start.click({ force: true });
const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({ state: "visible", timeout: 30000 });
await page.waitForFunction(() => typeof window.__skyNaturalAudit === "function", null, { timeout: 30000 });
const glState = await canvas.evaluate(el => {
  const gl = el.getContext("webgl2") || el.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return { webgl: Boolean(gl), width: el.clientWidth, height: el.clientHeight, backingWidth: el.width, backingHeight: el.height, renderer: debug && gl ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
});
const capture = async name => page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: false });
const tick = command => page.evaluate(c => window.__skyNaturalAudit(c), command);
let snapshot = await tick({ frames: 1, x: 0, y: 0, fire: false, lock: false, turbo: false });
await capture("00-sortie");

const metrics = { minHp: snapshot.playerHp, maxEnemies: 0, maxProjectiles: 0, maxIncoming: 0, maxLocks: 0, stageEvents: [], bossPhases: [], captures: [], gameOver: false };
let eventSerial = snapshot.stageEventSerial || 0;
let bossPhase = 0;
let capturedMid = false;
let capturedBossIntro = false;
let lockCycle = 0;
for (let chunk = 0; chunk < 260; chunk++) {
  const alive = (snapshot.enemies || []).filter(e => e.hp > 0);
  const target = alive.sort((a, b) => (Number(b.boss) - Number(a.boss)) || ((b.role === "artillery" ? 3 : b.role === "heavy" ? 2 : b.role === "ace" ? 1 : 0) - (a.role === "artillery" ? 3 : a.role === "heavy" ? 2 : a.role === "ace" ? 1 : 0)) || a.depth - b.depth)[0];
  const phase = snapshot.runTimeSeconds || 0;
  const dodgeX = Math.sin(phase * 1.37) * .32;
  const dodgeY = Math.sin(phase * .91 + 1.2) * .24;
  const dx = target ? target.x - snapshot.playerX : dodgeX;
  const dy = target ? target.y - snapshot.playerY : dodgeY;
  const x = Math.max(-1, Math.min(1, dx * .92 + dodgeX));
  const y = Math.max(-1, Math.min(1, dy * .88 + dodgeY));
  lockCycle = (lockCycle + 1) % 5;
  const lock = lockCycle !== 4;
  const incoming = (snapshot.projectiles || []).filter(p => p.owner === "enemy" && p.depth < 28 && p.depth > 2).length;
  const turbo = incoming >= 2 || chunk % 17 === 0;
  snapshot = await tick({ frames: 18, x, y, fire: true, lock, turbo });
  metrics.minHp = Math.min(metrics.minHp, snapshot.playerHp);
  metrics.maxEnemies = Math.max(metrics.maxEnemies, snapshot.enemies.length);
  metrics.maxProjectiles = Math.max(metrics.maxProjectiles, snapshot.projectiles.length);
  metrics.maxIncoming = Math.max(metrics.maxIncoming, incoming);
  metrics.maxLocks = Math.max(metrics.maxLocks, snapshot.lockedCount || 0);

  if ((snapshot.stageEventSerial || 0) > eventSerial) {
    eventSerial = snapshot.stageEventSerial;
    metrics.stageEvents.push({ serial: eventSerial, label: snapshot.stageEventLabel, time: snapshot.stageTimeSeconds, hazards: snapshot.hazards.length });
    const name = `01-event-${String(eventSerial).padStart(2, "0")}`;
    await capture(name); metrics.captures.push(name);
  }
  if (!capturedMid && snapshot.stageProgress > .38 && !snapshot.bossActive) {
    capturedMid = true; await capture("02-mid-combat"); metrics.captures.push("02-mid-combat");
  }
  if (snapshot.bossActive && !capturedBossIntro) {
    capturedBossIntro = true; await capture("03-boss-intro"); metrics.captures.push("03-boss-intro");
  }
  if (snapshot.bossActive && snapshot.bossPhase && snapshot.bossPhase !== bossPhase) {
    bossPhase = snapshot.bossPhase;
    metrics.bossPhases.push({ phase: bossPhase, hp: snapshot.bossHp, maxHp: snapshot.bossMaxHp, armor: snapshot.bossArmor, core: snapshot.bossWeakpointOpen, time: snapshot.stageTimeSeconds });
    const name = `04-boss-phase-${bossPhase}`;
    await capture(name); metrics.captures.push(name);
  }
  if (snapshot.status === "game-over" || snapshot.status === "continue") { metrics.gameOver = true; await capture("90-airframe-lost"); break; }
  if (snapshot.bossDefeated || snapshot.status === "stage-clear") { await capture("05-boss-defeated"); metrics.captures.push("05-boss-defeated"); break; }
}
await capture("99-final-state");
const bodyText = await page.locator("body").innerText();
const optionalHttp = ({ status, url }) => status === 404 && /\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors = httpErrors.filter(e => !optionalHttp(e));
const diagnostics = {
  glState,
  final: {
    status: snapshot.status, stage: snapshot.stage?.id, stageTime: snapshot.stageTimeSeconds, stageProgress: snapshot.stageProgress,
    hp: snapshot.playerHp, maxHp: snapshot.playerMaxHp, score: snapshot.score, kills: snapshot.enemiesDefeated,
    formationBreaks: snapshot.formationBreaks, armorBreaks: snapshot.armorBreaks, nearMisses: snapshot.nearMisses,
    bossActive: snapshot.bossActive, bossDefeated: snapshot.bossDefeated, bossPhase: snapshot.bossPhase,
  },
  metrics, controlsVisible: /FIRE/i.test(bodyText) && /LOCK/i.test(bodyText) && /TURBO/i.test(bodyText),
  consoleErrors, pageErrors, httpErrors, blockingHttpErrors,
};
await writeFile(`${outputDir}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
await browser.close();
if (!glState.webgl || glState.width < 800 || glState.height < 360) throw new Error(`Invalid WebGL surface ${JSON.stringify(glState)}`);
if (consoleErrors.length || pageErrors.length || blockingHttpErrors.length) throw new Error(`Runtime errors ${JSON.stringify({consoleErrors,pageErrors,blockingHttpErrors})}`);
if (!diagnostics.controlsVisible) throw new Error("Touch combat controls are not visible");
if (!metrics.stageEvents.length) throw new Error("Natural run did not reach a stage event");
if (!capturedBossIntro) throw new Error(`Natural run did not reach boss: ${JSON.stringify(diagnostics.final)}`);
