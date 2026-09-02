import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v116-hangar";
const allIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => {
  const records = Object.fromEntries(ids.map((id) => [id, { clears: 2, bestScore: 18000, bestRank: "A", noDamage: true, medals: ["score", "signature", "no-damage"] }]));
  localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify({
    version: 2,
    clearedStageIds: ids,
    unlockedStageIds: ids,
    records,
    bestRunScore: 62000,
    bestRunRank: "S",
    completedRuns: 2,
    oneCreditClears: 1,
    totalKills: 150,
    totalNearMisses: 30,
    totalBossKills: 11,
    totalArmorBreaks: 30,
    totalFormationBreaks: 18,
    bestChain: 14,
    bestRoute: ids.slice(0, 7),
    bestRouteScore: 62000,
    totalMedals: 33,
    recentRoutes: [],
    unlockedPaintSchemes: ["default","sunset","storm","prism"],
    unlockedLoadouts: ["standard","missile-focus","gun-focus"],
    selectedPaintScheme: "default",
    selectedLoadout: "standard"
  }));
}, allIds);

const report = { viewport: { width: 852, height: 393, dpr: 2 }, hangar: null, menu: null, flight: null, pageErrors: [], criticalResponses: [], failures: [] };
const page = await context.newPage();
page.on("pageerror", (error) => report.pageErrors.push(String(error)));
page.on("response", (response) => {
  const type = response.request().resourceType();
  if (response.status() >= 400 && ["document","script","stylesheet","font","xhr","fetch"].includes(type)) report.criticalResponses.push({ status: response.status(), url: response.url(), type });
});

try {
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
  const hangarButton = page.locator('button[aria-label="Open hangar"]');
  await hangarButton.waitFor({ state: "visible" });
  await hangarButton.click();
  const hangar = page.locator('[aria-label="Arcade hangar"]');
  await hangar.waitFor({ state: "visible" });
  const hangarTextBefore = await hangar.innerText();
  for (const token of ["HANGAR", "CLASSIC", "SUNSET", "STORM", "PRISM", "STANDARD", "MISSILE", "GUN"]) if (!hangarTextBefore.includes(token)) report.failures.push(`hangar missing ${token}`);
  const disabledCount = await hangar.locator("button:disabled").count();
  if (disabledCount !== 0) report.failures.push(`hangar has ${disabledCount} locked choices at 33 medals`);
  await hangar.locator('section[aria-label="Paint schemes"] button').filter({ hasText: /^PRISM/ }).click();
  await hangar.locator('section[aria-label="Weapon loadouts"] button').filter({ hasText: /^GUN/ }).click();
  const hangarGeometry = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Arcade hangar"] > div');
    const r = el?.getBoundingClientRect();
    return r ? { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height, innerWidth, innerHeight } : null;
  });
  report.hangar = { text: await hangar.innerText(), geometry: hangarGeometry };
  await page.screenshot({ path: `${out}/01-hangar-prism-gun.png`, fullPage: false });
  if (!hangarGeometry || hangarGeometry.top < 0 || hangarGeometry.bottom > 393 || hangarGeometry.left < 0 || hangarGeometry.right > 852) report.failures.push(`hangar clipped ${JSON.stringify(hangarGeometry)}`);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("sky-dancer-arcade-progress-v2") || "{}"));
  if (stored.selectedPaintScheme !== "prism" || stored.selectedLoadout !== "gun-focus") report.failures.push(`selection not persisted ${JSON.stringify({ paint: stored.selectedPaintScheme, loadout: stored.selectedLoadout })}`);
  await hangar.locator("button").filter({ hasText: /READY/ }).last().click();

  const stagePractice = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
  await stagePractice.click();
  const practice = page.locator('[aria-label="Select practice stage"]');
  await practice.waitFor({ state: "visible" });
  await practice.locator("button").first().click();
  const start = page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first();
  const menuText = await page.locator('[aria-label="Sky Dancer title screen"]').innerText();
  const menuGeometry = await page.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((node) => /START STAGE PRACTICE/i.test(node.textContent || ""));
    const r = el?.getBoundingClientRect();
    return { start: r ? { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height } : null, innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
  });
  report.menu = { text: menuText, geometry: menuGeometry };
  await page.screenshot({ path: `${out}/02-title-equipped.png`, fullPage: false });
  for (const token of ["PRISM / GUN-FOCUS", "HANGAR", "START STAGE PRACTICE"]) if (!menuText.includes(token)) report.failures.push(`equipped menu missing ${token}`);
  if (!menuGeometry.start || menuGeometry.start.bottom > 393 || menuGeometry.start.top < 0) report.failures.push(`start clipped ${JSON.stringify(menuGeometry.start)}`);
  if (menuGeometry.scrollWidth > 852 || menuGeometry.scrollHeight > 393) report.failures.push(`menu overflow ${menuGeometry.scrollWidth}x${menuGeometry.scrollHeight}`);

  await start.click();
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV116AuditDemo));
  await page.waitForTimeout(220);
  const flight = await page.evaluate(() => {
    const demo = window.__skyDancerV116AuditDemo;
    const snapshot = demo.runtime.getSnapshot();
    const canvas = document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const badge = [...document.querySelectorAll("span")].find((el) => /3D FLIGHT · V11\.6/.test(el.textContent || ""))?.textContent || "";
    const beforeShots = snapshot.shotSerial;
    demo.runtime.setFire(true);
    for (let frame = 0; frame < 60; frame += 1) demo.runtime.step(1 / 60);
    demo.runtime.setFire(false);
    const after = demo.runtime.getSnapshot();
    return {
      stage: snapshot.stage.id,
      status: snapshot.status,
      paintScheme: snapshot.paintScheme,
      loadout: snapshot.loadout,
      playerPaint: demo.player?.userData?.arcadePaintSchemeV116 ?? null,
      renderer: gl ? "webgl" : "missing",
      width: canvas?.clientWidth ?? 0,
      height: canvas?.clientHeight ?? 0,
      badge,
      shotsInOneSecond: after.shotSerial - beforeShots,
    };
  });
  report.flight = flight;
  await page.screenshot({ path: `${out}/03-prism-gun-flight.png`, fullPage: false });
  if (flight.stage !== "dawn-city" || flight.status !== "running" || flight.renderer !== "webgl") report.failures.push(`flight state ${JSON.stringify(flight)}`);
  if (flight.paintScheme !== "prism" || flight.loadout !== "gun-focus" || flight.playerPaint !== "prism") report.failures.push(`equipment not applied ${JSON.stringify(flight)}`);
  if (!flight.badge.includes("PRISM") || !flight.badge.includes("GUN-FOCUS")) report.failures.push(`badge ${flight.badge}`);
  if (flight.width !== 852 || flight.height !== 393) report.failures.push(`canvas ${flight.width}x${flight.height}`);
  if (flight.shotsInOneSecond < 12) report.failures.push(`gun-focus rate too low ${flight.shotsInOneSecond}`);
} catch (error) {
  report.failures.push(String(error));
}
if (report.pageErrors.length) report.failures.push(`pageErrors ${report.pageErrors.length}`);
if (report.criticalResponses.length) report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) throw new Error(`V11.6 hangar audit failures: ${JSON.stringify(report.failures)}`);
