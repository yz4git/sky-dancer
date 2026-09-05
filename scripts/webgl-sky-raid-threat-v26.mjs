import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightUrl = pathToFileURL(path.join(process.cwd(), ".audit-runtime/node_modules/playwright-core/index.js")).href;
const playwrightModule = await import(playwrightUrl);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
if (!chromium) throw new Error("playwright chromium export missing");

const out = "artifacts/sky-raid-threat-v26";
fs.mkdirSync(out, { recursive: true });

const ROLE_CUES = {
  boss: "FINAL THREAT",
  heavy: "ARMORED",
  striker: "FAST DIVE",
  orbiter: "VERTICAL",
  bomber: "LONG RANGE",
  drifter: "JINKER",
  standard: "INTERCEPT",
};

const WARNING_CUES = {
  boss: "BOSS MISSILE",
  heavy: "HEAVY MISSILE",
  striker: "STRIKER MISSILE",
  orbiter: "ORBITER MISSILE",
  bomber: "BOMBER SALVO",
  drifter: "JINKER MISSILE",
  standard: "MISSILE WARNING",
};

const ACTS = [
  { elapsed: 3, actId: "dawn-city", active: 6 },
  { elapsed: 27, actId: "red-canyon", active: 6 },
  { elapsed: 51, actId: "cloud-fleet", active: 7 },
  { elapsed: 75, actId: "storm-carrier", active: 7 },
  { elapsed: 99, actId: "prism-citadel", active: 7 },
];

let browser;
let context;
let page;
const watchdog = setTimeout(() => process.exit(124), 120000);

async function sampleAct(spec, index) {
  await page.evaluate((elapsed) => { window.__skyRaidAuditElapsedSeconds = elapsed; }, spec.elapsed);
  await page.waitForFunction(
    (actId) => document.documentElement.dataset.skyRaidAct === actId,
    spec.actId,
    { timeout: 6000, polling: 50 },
  );
  await page.waitForFunction(() => typeof window.__skyRaidGetRoleReadability === "function", null, { timeout: 6000 });
  await page.waitForTimeout(850);

  const diagnostics = await page.evaluate(() => {
    const role = window.__skyRaidGetRoleReadability?.() ?? null;
    const decisionBridge = window.__skyDancerGetV45DecisionHierarchy?.() ?? null;
    const lock = document.querySelector('[aria-label="V45 target decision"]');
    const camera = window.__skyRaidGetCameraPolish?.() ?? null;
    return {
      actId: document.documentElement.dataset.skyRaidAct ?? "",
      role,
      decision: decisionBridge?.decision ?? null,
      lock: lock ? {
        className: lock.getAttribute("data-class") ?? "",
        roleCue: lock.getAttribute("data-role-cue") ?? "",
        text: (lock.textContent ?? "").replace(/\s+/g, " ").trim(),
      } : null,
      camera,
    };
  });

  const failures = [];
  if (diagnostics.actId !== spec.actId) failures.push(`act=${diagnostics.actId}`);
  const roles = diagnostics.role?.roles ?? [];
  if (roles.length !== spec.active) failures.push(`activeRoles=${roles.length}, expected=${spec.active}`);
  for (const role of roles) {
    if (!role.kitVisible) failures.push(`${role.id}:kit-hidden`);
    if (!role.roleSignature) failures.push(`${role.id}:silhouette-missing`);
    if (!role.trailSignature) failures.push(`${role.id}:trail-signature-missing`);
    if (Number(role.trailCount ?? 0) < 1) failures.push(`${role.id}:trail-count=${role.trailCount}`);
    if (!role.trailVisible) failures.push(`${role.id}:trail-hidden`);
  }

  const lock = diagnostics.lock;
  if (lock?.className && ROLE_CUES[lock.className]) {
    if (lock.roleCue !== ROLE_CUES[lock.className]) failures.push(`lock-cue=${lock.roleCue}, class=${lock.className}`);
    if (!lock.text.includes(ROLE_CUES[lock.className])) failures.push(`lock-text-missing=${ROLE_CUES[lock.className]}`);
  }

  const camera = diagnostics.camera;
  if (!camera?.playerVisible) failures.push("player-not-visible");
  if (Number(camera?.enemyVisible ?? 0) < 2) failures.push(`enemyVisible=${camera?.enemyVisible}`);
  if (Number(camera?.enemyVisible ?? 0) > 8) failures.push(`screen-clutter=${camera?.enemyVisible}`);
  if (Number(camera?.enemyCombatLane ?? 0) < 1) failures.push(`combatLane=${camera?.enemyCombatLane}`);

  const result = { ...spec, ...diagnostics, failures };
  fs.writeFileSync(path.join(out, `${String(index + 1).padStart(2, "0")}-${spec.actId}.json`), JSON.stringify(result, null, 2));
  await page.screenshot({ path: path.join(out, `${String(index + 1).padStart(2, "0")}-${spec.actId}.png`), timeout: 6000 });
  if (failures.length) throw new Error(`${spec.actId} V26 role audit failed: ${failures.join("; ")}`);

  // Give the natural AI a short observation window without requiring a class to
  // fire on command. Some doctrines (notably Red Canyon strikers) deliberately
  // choose a close knife pass instead of a missile whenever geometry favors it.
  await page.waitForTimeout(1400);
  return result;
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

  await page.goto(`http://127.0.0.1:4173?menu=1&v26=${Date.now()}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    window.__v26MissileClassHistory = [];
    window.__v26WarningHistory = [];
    window.addEventListener("sky-dancer-missile-snapshot", (event) => {
      const detail = event.detail;
      const actId = document.documentElement.dataset.skyRaidAct ?? "";
      for (const missile of detail?.missiles ?? []) {
        if (!missile?.sourceClass) continue;
        window.__v26MissileClassHistory.push({ actId, sourceClass: missile.sourceClass, distance: missile.distanceToPlayer });
        if (window.__v26MissileClassHistory.length > 500) window.__v26MissileClassHistory.splice(0, 200);
      }
    });
    const recordWarning = () => {
      const node = document.querySelector('[aria-label="Missile warning"]');
      if (!node) return;
      const entry = {
        actId: document.documentElement.dataset.skyRaidAct ?? "",
        sourceClass: node.getAttribute("data-source-class") ?? "",
        text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
      const previous = window.__v26WarningHistory[window.__v26WarningHistory.length - 1];
      if (!previous || previous.actId !== entry.actId || previous.sourceClass !== entry.sourceClass || previous.text !== entry.text) {
        window.__v26WarningHistory.push(entry);
      }
    };
    new MutationObserver(recordWarning).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
  });

  await page.locator("button").filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(100);
  await page.locator("button").filter({ hasText: /START/i }).last().click({ force: true, timeout: 10000 });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => typeof window.__skyRaidGetCameraPolish === "function", null, { timeout: 12000 });
  await page.waitForTimeout(500);

  const results = [];
  for (let index = 0; index < ACTS.length; index += 1) results.push(await sampleAct(ACTS[index], index));

  // Hold the fleet doctrine long enough to observe whichever real non-standard
  // aircraft gets a valid launch solution. This checks the complete live path
  // without changing AI behavior just to satisfy the audit.
  await page.evaluate(() => { window.__skyRaidAuditElapsedSeconds = 51; });
  await page.waitForFunction(() => document.documentElement.dataset.skyRaidAct === "cloud-fleet", null, { timeout: 6000, polling: 50 });
  await page.waitForFunction(
    () => (window.__v26MissileClassHistory ?? []).some((entry) => entry.sourceClass && entry.sourceClass !== "standard"),
    null,
    { timeout: 15000, polling: 100 },
  );
  await page.waitForFunction(
    () => (window.__v26WarningHistory ?? []).some((entry) => entry.sourceClass && entry.sourceClass !== "standard"),
    null,
    { timeout: 15000, polling: 100 },
  );

  const liveHistory = await page.evaluate(() => ({
    missileClasses: window.__v26MissileClassHistory ?? [],
    warnings: window.__v26WarningHistory ?? [],
  }));

  const roleMap = new Map();
  for (const result of results) {
    for (const role of result.role?.roles ?? []) roleMap.set(role.roleClass, role.trailSignature);
  }
  if (roleMap.size !== 6) throw new Error(`V26 did not observe all six role classes: ${JSON.stringify([...roleMap.entries()])}`);
  if (new Set(roleMap.values()).size !== 6) throw new Error(`V26 role trails are not unique: ${JSON.stringify([...roleMap.entries()])}`);

  const nonStandardMissileClasses = [...new Set(
    liveHistory.missileClasses
      .map((entry) => entry.sourceClass)
      .filter((sourceClass) => sourceClass && sourceClass !== "standard"),
  )];
  if (nonStandardMissileClasses.length < 1) {
    throw new Error(`V26 never observed a live role-aware missile source: ${JSON.stringify(liveHistory.missileClasses.slice(-30))}`);
  }

  const roleAwareWarnings = liveHistory.warnings.filter((entry) => entry.sourceClass && entry.sourceClass !== "standard");
  if (roleAwareWarnings.length < 1) throw new Error(`V26 never rendered a role-aware missile warning: ${JSON.stringify(liveHistory.warnings)}`);
  for (const warning of roleAwareWarnings) {
    const expected = WARNING_CUES[warning.sourceClass];
    if (expected && !warning.text.includes(expected)) throw new Error(`warning mismatch for ${warning.sourceClass}: ${warning.text}`);
  }

  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);
  await page.screenshot({ path: path.join(out, "06-final-threat-state.png"), timeout: 6000 });

  const summary = {
    viewport: { width: 844, height: 390, dpr: 2 },
    actCount: results.length,
    roleTrailSignatures: Object.fromEntries(roleMap),
    observedMissileClasses: [...new Set(liveHistory.missileClasses.map((entry) => entry.sourceClass))],
    observedNonStandardMissileClasses: nonStandardMissileClasses,
    warningSamples: roleAwareWarnings.slice(0, 12),
    results: results.map((result) => ({
      actId: result.actId,
      activeRoles: result.role?.roles?.length ?? 0,
      lock: result.lock,
      enemyVisible: result.camera?.enemyVisible ?? 0,
      enemyCombatLane: result.camera?.enemyCombatLane ?? 0,
    })),
    errors,
  };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("SKY RAID THREAT V26 PASS", JSON.stringify(summary));
} catch (error) {
  try {
    fs.writeFileSync(path.join(out, "failure.txt"), `${error?.stack ?? error}\n`);
    await page?.screenshot({ path: path.join(out, "failure.png"), timeout: 6000 });
  } catch {}
  throw error;
} finally {
  clearTimeout(watchdog);
  try { await page?.evaluate(() => { delete window.__skyRaidAuditElapsedSeconds; }); } catch {}
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}
