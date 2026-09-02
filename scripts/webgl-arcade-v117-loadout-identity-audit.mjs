import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v117-loadout-identity";
const stageIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const report = {
  viewport: { width: 852, height: 393, dpr: 2 },
  hangar: null,
  standard: null,
  missile: null,
  gun: null,
  pageErrors: [],
  criticalResponses: [],
  failures: [],
};

function seedProgress(loadout) {
  const records = Object.fromEntries(stageIds.map((id) => [id, {
    clears: 2, bestScore: 18000, bestRank: "A", noDamage: true,
    medals: ["score", "signature", "no-damage"],
  }]));
  return {
    version: 2,
    clearedStageIds: stageIds,
    unlockedStageIds: stageIds,
    records,
    bestRunScore: 72000,
    bestRunRank: "S",
    completedRuns: 2,
    oneCreditClears: 1,
    totalKills: 140,
    totalNearMisses: 30,
    totalBossKills: 12,
    totalArmorBreaks: 24,
    totalFormationBreaks: 18,
    bestChain: 14,
    bestRoute: ["dawn-city","cloud-fleet","storm-carrier"],
    bestRouteScore: 72000,
    totalMedals: 33,
    recentRoutes: [],
    unlockedPaintSchemes: ["default","sunset","storm","prism"],
    unlockedLoadouts: ["standard","missile-focus","gun-focus"],
    selectedPaintScheme: "prism",
    selectedLoadout: loadout,
  };
}

async function createSortiePage(loadout, captureHangar = false) {
  const page = await context.newPage();
  page.on("pageerror", (error) => report.pageErrors.push(`${loadout}: ${String(error)}`));
  page.on("response", (response) => {
    const type = response.request().resourceType();
    if (response.status() >= 400 && ["document","script","stylesheet","font","xhr","fetch"].includes(type)) {
      report.criticalResponses.push({ loadout, status: response.status(), url: response.url(), type });
    }
  });
  const progress = seedProgress(loadout);
  await page.addInitScript((value) => {
    localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify(value));
  }, progress);
  await page.goto(`${baseUrl}?menu=1&v117=${encodeURIComponent(loadout)}`, { waitUntil: "domcontentloaded" });
  const title = page.locator('[aria-label="Sky Dancer title screen"]');
  await title.waitFor({ state: "visible" });

  const hangarButton = page.locator('[aria-label="Open hangar"]');
  await hangarButton.click();
  const hangar = page.locator('[aria-label="Arcade hangar"]');
  await hangar.waitFor({ state: "visible" });
  const hangarText = await hangar.innerText();
  const expectedDoctrine = loadout === "standard"
    ? "FUSION LINK · TURBO BOOSTS FIRE + LOCK"
    : loadout === "missile-focus"
      ? "RAPID MULTI · WIDE LOCK · TWIN RIPPLE"
      : "TWIN BURST · DUAL CANNON · HIGH RATE";
  if (!hangarText.includes(expectedDoctrine)) report.failures.push(`${loadout} hangar missing doctrine ${expectedDoctrine}`);
  if (!hangarText.includes(`${loadout === "standard" ? "STANDARD" : loadout === "missile-focus" ? "MISSILE" : "GUN"}\nEQUIPPED`)) {
    report.failures.push(`${loadout} hangar selection not equipped`);
  }
  if (captureHangar) {
    const hangarGeometry = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Arcade hangar"] > div');
      const r = el?.getBoundingClientRect();
      return r ? { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height, innerWidth, innerHeight } : null;
    });
    report.hangar = { text: hangarText, geometry: hangarGeometry };
    await page.screenshot({ path: `${out}/00-hangar-doctrines.png`, fullPage: false });
    if (!hangarGeometry || hangarGeometry.top < 0 || hangarGeometry.bottom > 393 || hangarGeometry.left < 0 || hangarGeometry.right > 852) {
      report.failures.push(`hangar clipped ${JSON.stringify(hangarGeometry)}`);
    }
  }
  await hangar.locator("button").filter({ hasText: /^READY/ }).click();
  const practiceButton = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
  await practiceButton.click();
  const start = page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first();
  await start.waitFor({ state: "visible" });
  await start.click();
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV117AuditDemo));
  await page.waitForTimeout(180);
  return page;
}

async function baseFlightState(page) {
  return page.evaluate(() => {
    const demo = window.__skyDancerV117AuditDemo;
    const snapshot = demo.runtime.getSnapshot();
    const canvas = document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const root = document.documentElement;
    return {
      stage: snapshot.stage.id,
      status: snapshot.status,
      loadout: snapshot.loadout,
      paintScheme: snapshot.paintScheme,
      renderer: gl ? "webgl" : "missing",
      width: canvas?.clientWidth ?? 0,
      height: canvas?.clientHeight ?? 0,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
    };
  });
}

try {
  // STANDARD — Turbo becomes a real cross-system Fusion Link.
  {
    const page = await createSortiePage("standard", true);
    const controls = page.locator('[aria-label="Arcade combat controls"]');
    const idleText = await controls.innerText();
    if (!idleText.includes("LINK DRIVE") || !idleText.includes("HOLD · GUN") || !idleText.includes("RELEASE SALVO")) {
      report.failures.push(`standard idle doctrine ${JSON.stringify(idleText)}`);
    }
    await page.evaluate(() => window.__skyDancerV117AuditDemo.setTurbo(true));
    await page.waitForTimeout(180);
    const fusionText = await controls.innerText();
    const state = await baseFlightState(page);
    const turboState = await page.evaluate(() => window.__skyDancerV117AuditDemo.runtime.getSnapshot().turboActive);
    report.standard = { ...state, idleText, fusionText, turboActive: turboState };
    for (const token of ["FUSION GUN","FUSION SALVO","FUSION LINK"]) {
      if (!fusionText.includes(token)) report.failures.push(`standard fusion missing ${token}`);
    }
    if (!turboState) report.failures.push("standard fusion Turbo did not engage");
    await page.screenshot({ path: `${out}/01-standard-fusion-link.png`, fullPage: false });
    await page.close();
  }

  // MISSILE — wide edge acquisition produces two missiles from one lock.
  {
    const page = await createSortiePage("missile-focus");
    const controls = page.locator('[aria-label="Arcade combat controls"]');
    const controlsText = await controls.innerText();
    if (!controlsText.includes("RAPID MULTI") || !controlsText.includes("BACKUP GUN")) report.failures.push(`missile controls ${JSON.stringify(controlsText)}`);
    await page.evaluate(() => {
      const demo = window.__skyDancerV117AuditDemo;
      demo.runtime.spawnEnemy("fighter", 1.68, 0, 30);
      demo.setLock(true);
    });
    await page.waitForTimeout(180);
    const locked = await page.evaluate(() => window.__skyDancerV117AuditDemo.runtime.getSnapshot().lockedCount);
    await page.evaluate(() => window.__skyDancerV117AuditDemo.setLock(false));
    await page.waitForTimeout(45);
    const ripple = await page.evaluate(() => {
      const demo = window.__skyDancerV117AuditDemo;
      const snapshot = demo.runtime.getSnapshot();
      const missiles = snapshot.projectiles.filter((projectile) => projectile.owner === "player-missile");
      const visualCount = [...demo.projectileMeshes.values()].filter((mesh) => mesh.userData.arcadeLoadoutV117 === "missile-focus").length;
      return {
        message: snapshot.message,
        count: missiles.length,
        targetIds: missiles.map((projectile) => projectile.targetEnemyId),
        positions: missiles.map((projectile) => ({ x: projectile.x, y: projectile.y, depth: projectile.depth })),
        visualCount,
      };
    });
    const state = await baseFlightState(page);
    report.missile = { ...state, controlsText, lockedBeforeRelease: locked, ripple };
    if (locked < 1) report.failures.push(`missile wide lock failed ${locked}`);
    if (ripple.count !== 2) report.failures.push(`missile ripple expected 2 got ${ripple.count}`);
    if (new Set(ripple.targetIds).size !== 1) report.failures.push(`missile ripple target split ${JSON.stringify(ripple.targetIds)}`);
    if (!String(ripple.message).includes("RAPID RIPPLE ×2")) report.failures.push(`missile message ${ripple.message}`);
    if (ripple.visualCount < 2) report.failures.push(`missile visual projectile count ${ripple.visualCount}`);
    await page.screenshot({ path: `${out}/02-missile-twin-ripple.png`, fullPage: false });
    await page.close();
  }

  // GUN — each cadence produces a visibly separated left/right cannon pair.
  {
    const page = await createSortiePage("gun-focus");
    const controls = page.locator('[aria-label="Arcade combat controls"]');
    const controlsText = await controls.innerText();
    if (!controlsText.includes("TWIN BURST") || !controlsText.includes("TACTICAL LOCK")) report.failures.push(`gun controls ${JSON.stringify(controlsText)}`);
    await page.evaluate(() => window.__skyDancerV117AuditDemo.setFire(true));
    await page.waitForTimeout(95);
    await page.evaluate(() => window.__skyDancerV117AuditDemo.setFire(false));
    await page.waitForTimeout(20);
    const burst = await page.evaluate(() => {
      const demo = window.__skyDancerV117AuditDemo;
      const snapshot = demo.runtime.getSnapshot();
      const shots = snapshot.projectiles.filter((projectile) => projectile.owner === "player-gun");
      const visualCount = [...demo.projectileMeshes.values()].filter((mesh) => mesh.userData.arcadeLoadoutV117 === "gun-focus").length;
      return {
        volleySerial: snapshot.shotSerial,
        count: shots.length,
        xs: shots.map((projectile) => projectile.x),
        visualCount,
      };
    });
    const state = await baseFlightState(page);
    report.gun = { ...state, controlsText, burst };
    if (burst.count < 2) report.failures.push(`gun twin burst expected >=2 projectiles got ${burst.count}`);
    if (!(Math.min(...burst.xs) < 0 && Math.max(...burst.xs) > 0)) report.failures.push(`gun lanes not separated ${JSON.stringify(burst.xs)}`);
    if (burst.visualCount < 2) report.failures.push(`gun visual projectile count ${burst.visualCount}`);
    await page.screenshot({ path: `${out}/03-gun-twin-burst.png`, fullPage: false });
    await page.close();
  }
} catch (error) {
  report.failures.push(String(error));
}

for (const key of ["standard","missile","gun"]) {
  const state = report[key];
  if (!state) continue;
  if (state.renderer !== "webgl" || state.width !== 852 || state.height !== 393 || state.stage !== "dawn-city" || state.status !== "running") {
    report.failures.push(`${key} base flight invalid ${JSON.stringify(state)}`);
  }
  if (state.scrollWidth > 852 || state.scrollHeight > 393) report.failures.push(`${key} overflow ${state.scrollWidth}x${state.scrollHeight}`);
}
if (report.pageErrors.length) report.failures.push(`pageErrors ${report.pageErrors.length}`);
if (report.criticalResponses.length) report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) throw new Error(`V11.7 loadout audit failures: ${JSON.stringify(report.failures)}`);
