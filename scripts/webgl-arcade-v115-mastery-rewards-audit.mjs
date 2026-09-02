import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v115-mastery-rewards";
const allIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => {
  const records = Object.fromEntries(ids.map((id) => [id, { clears: 1, bestScore: 8000, bestRank: "C", noDamage: false, medals: [] }]));
  records["dawn-city"] = { clears: 3, bestScore: 18400, bestRank: "A", noDamage: false, medals: ["score", "signature"] };
  records["red-canyon"] = { clears: 2, bestScore: 13100, bestRank: "B", noDamage: false, medals: ["score", "signature"] };
  records["cloud-fleet"] = { clears: 1, bestScore: 9900, bestRank: "C", noDamage: false, medals: ["score"] };
  localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify({
    version: 2,
    clearedStageIds: ids,
    unlockedStageIds: ids,
    records,
    bestRunScore: 48600,
    bestRunRank: "A",
    completedRuns: 1,
    oneCreditClears: 0,
    totalKills: 10,
    totalNearMisses: 4,
    totalBossKills: 1,
    totalArmorBreaks: 2,
    totalFormationBreaks: 2,
    bestChain: 5,
    bestRoute: ["dawn-city","cloud-fleet"],
    bestRouteScore: 48600,
    totalMedals: 5,
    recentRoutes: [],
    unlockedPaintSchemes: ["default"],
    unlockedLoadouts: ["standard"],
  }));
}, allIds);

const report = { viewport: { width: 852, height: 393, dpr: 2 }, menu: null, flight: null, result: null, pageErrors: [], criticalResponses: [], failures: [] };
const page = await context.newPage();
page.on("pageerror", (error) => report.pageErrors.push(String(error)));
page.on("response", (response) => {
  const type = response.request().resourceType();
  if (response.status() >= 400 && ["document","script","stylesheet","font","xhr","fetch"].includes(type)) report.criticalResponses.push({ status: response.status(), url: response.url(), type });
});

try {
  await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
  const stagePractice = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
  await stagePractice.waitFor({ state: "visible" });
  await stagePractice.click();
  const practice = page.locator('[aria-label="Select practice stage"]');
  await practice.waitFor({ state: "visible" });
  await practice.locator("button").first().click();
  const mastery = page.locator('[aria-label="Selected stage mastery"]');
  await mastery.waitFor({ state: "visible" });
  const start = page.locator("button").filter({ hasText: /START STAGE PRACTICE/i }).first();
  await start.waitFor({ state: "visible" });
  const menuText = await page.locator('[aria-label="Sky Dancer title screen"]').innerText();
  const menuGeometry = await page.evaluate(() => {
    const box = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height }; })() : null;
    const masteryEl = document.querySelector('[aria-label="Selected stage mastery"]');
    const startEl = [...document.querySelectorAll("button")].find((el) => /START STAGE PRACTICE/i.test(el.textContent || ""));
    return { mastery: box(masteryEl), start: box(startEl), innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
  });
  report.menu = { text: menuText, geometry: menuGeometry };
  await page.screenshot({ path: `${out}/01-mastery-reward-menu.png`, fullPage: false });
  for (const token of ["MASTERY 2/3", "PILOT 5/33", "NEXT SUNSET @6◆", "START STAGE PRACTICE"]) if (!menuText.includes(token)) report.failures.push(`menu missing ${token}`);
  if (!menuGeometry.start || menuGeometry.start.bottom > 393 || menuGeometry.start.top < 0) report.failures.push(`start clipped ${JSON.stringify(menuGeometry.start)}`);
  if (!menuGeometry.mastery || menuGeometry.mastery.bottom > 393 || menuGeometry.mastery.top < 0) report.failures.push(`mastery clipped ${JSON.stringify(menuGeometry.mastery)}`);
  if (menuGeometry.scrollWidth > 852 || menuGeometry.scrollHeight > 393) report.failures.push(`menu overflow ${menuGeometry.scrollWidth}x${menuGeometry.scrollHeight}`);

  await start.click();
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV115AuditDemo));
  await page.waitForTimeout(220);
  const flight = await page.evaluate(() => {
    const demo = window.__skyDancerV115AuditDemo;
    const snapshot = demo.runtime.getSnapshot();
    const canvas = document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    return { stage: snapshot.stage.id, status: snapshot.status, renderer: gl ? "webgl" : "missing", width: canvas?.clientWidth ?? 0, height: canvas?.clientHeight ?? 0 };
  });
  report.flight = flight;
  await page.screenshot({ path: `${out}/02-mastery-reward-flight.png`, fullPage: false });
  if (flight.stage !== "dawn-city" || flight.status !== "running" || flight.renderer !== "webgl" || flight.width !== 852 || flight.height !== 393) report.failures.push(`flight ${JSON.stringify(flight)}`);

  await page.evaluate(() => {
    const demo = window.__skyDancerV115AuditDemo;
    demo.runtime.damageTaken = 12;
    demo.runtime.completeCurrentStageForTests("cloud-fleet");
    demo.runtime.advanceResultForTests();
    demo.onSnapshot(demo.runtime.getSnapshot());
  });
  const result = page.locator('[aria-label="Arcade result"]');
  await result.waitFor({ state: "visible" });
  const resultText = await result.innerText();
  const resultGeometry = await page.evaluate(() => {
    const box = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height }; })() : null;
    const masteryEl = document.querySelector('[aria-label="Stage mastery result"]');
    const retryEl = [...document.querySelectorAll("button")].find((el) => /RETRY STAGE/i.test(el.textContent || ""));
    return { mastery: box(masteryEl), retry: box(retryEl), innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
  });
  report.result = { text: resultText, geometry: resultGeometry };
  await page.screenshot({ path: `${out}/03-mastery-reward-result.png`, fullPage: false });
  for (const token of ["STAGE MASTERY", "2/3 · 5◆", "RETRY STAGE", "CHASE PERFECT SKY · SUNSET @6◆"]) if (!resultText.includes(token)) report.failures.push(`result missing ${token}`);
  if (!resultGeometry.mastery || resultGeometry.mastery.bottom > 393 || resultGeometry.mastery.top < 0) report.failures.push(`result mastery clipped ${JSON.stringify(resultGeometry.mastery)}`);
  if (!resultGeometry.retry || resultGeometry.retry.bottom > 393 || resultGeometry.retry.top < 0) report.failures.push(`retry clipped ${JSON.stringify(resultGeometry.retry)}`);
  if (resultGeometry.scrollWidth > 852 || resultGeometry.scrollHeight > 393) report.failures.push(`result overflow ${resultGeometry.scrollWidth}x${resultGeometry.scrollHeight}`);
} catch (error) {
  report.failures.push(String(error));
}
if (report.pageErrors.length) report.failures.push(`pageErrors ${report.pageErrors.length}`);
if (report.criticalResponses.length) report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) throw new Error(`V11.5 mastery reward audit failures: ${JSON.stringify(report.failures)}`);
