import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v1141-mastery";
const allIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => {
  const records = Object.fromEntries(ids.map((id) => [id, { clears: 1, bestScore: 0, bestRank: "D", noDamage: false, medals: [] }]));
  records["dawn-city"] = { clears: 3, bestScore: 18400, bestRank: "A", noDamage: false, medals: ["score", "signature"] };
  localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify({
    version: 2,
    clearedStageIds: ids,
    unlockedStageIds: ids,
    records,
    bestRunScore: 48600,
    bestRunRank: "A",
    completedRuns: 1,
    oneCreditClears: 0,
    totalKills: 80,
    totalNearMisses: 18,
    totalBossKills: 4,
    totalArmorBreaks: 11,
    totalFormationBreaks: 7,
    bestChain: 14,
    bestRoute: ["dawn-city","cloud-fleet"],
    bestRouteScore: 48600,
    totalMedals: 2,
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
  if (response.status() >= 400 && ["document","script","stylesheet","font","xhr","fetch"].includes(type)) {
    report.criticalResponses.push({ status: response.status(), url: response.url(), type });
  }
});

const rects = () => {
  const rect = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height }; })() : null;
  const mastery = document.querySelector('[aria-label="Selected stage mastery"]');
  const start = [...document.querySelectorAll("button")].find((el) => /START STAGE PRACTICE/i.test(el.textContent || ""));
  return { mastery: rect(mastery), start: rect(start), innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
};

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
  const menuText = await mastery.innerText();
  const firstStage = practice.locator("button").first();
  const firstStageText = await firstStage.innerText();
  const firstStageLabel = await firstStage.locator('[aria-label$="of 3 medals"]').getAttribute("aria-label");
  const menuGeometry = await page.evaluate(rects);
  report.menu = { text: menuText, firstStageText, firstStageLabel, geometry: menuGeometry };
  await page.screenshot({ path: `${out}/01-stage-practice-menu.png`, fullPage: false });

  for (const token of ["STAGE MASTERY", "2/3", "BEST A", "NEXT TARGET", "PERFECT SKY"]) {
    if (!menuText.includes(token)) report.failures.push(`menu missing ${token}`);
  }
  if (firstStageLabel !== "2 of 3 medals") report.failures.push(`menu medal aria ${firstStageLabel}`);
  if (!firstStageText.includes("◆◆◇")) report.failures.push("menu medal glyphs missing");
  if (!menuGeometry.start || menuGeometry.start.bottom > 393 || menuGeometry.start.top < 0) report.failures.push(`start button clipped ${JSON.stringify(menuGeometry.start)}`);
  if (!menuGeometry.mastery || menuGeometry.mastery.bottom > 393 || menuGeometry.mastery.top < 0) report.failures.push(`mastery panel clipped ${JSON.stringify(menuGeometry.mastery)}`);
  if (menuGeometry.scrollWidth > 852) report.failures.push(`horizontal overflow ${menuGeometry.scrollWidth}`);

  await start.click();
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV1141AuditDemo));
  await page.waitForTimeout(220);
  const flightTelemetry = await page.evaluate(() => {
    const demo = window.__skyDancerV1141AuditDemo;
    const snapshot = demo.runtime.getSnapshot();
    const canvas = document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    return { stage: snapshot.stage.id, status: snapshot.status, renderer: gl ? "webgl" : "missing", width: canvas?.clientWidth ?? 0, height: canvas?.clientHeight ?? 0 };
  });
  report.flight = flightTelemetry;
  await page.screenshot({ path: `${out}/02-stage-practice-flight.png`, fullPage: false });
  if (flightTelemetry.stage !== "dawn-city" || flightTelemetry.status !== "running" || flightTelemetry.renderer !== "webgl") {
    report.failures.push(`flight telemetry ${JSON.stringify(flightTelemetry)}`);
  }

  await page.evaluate(() => {
    const demo = window.__skyDancerV1141AuditDemo;
    demo.runtime.damageTaken = 12;
    demo.runtime.completeCurrentStageForTests("cloud-fleet");
    demo.runtime.advanceResultForTests();
    demo.onSnapshot(demo.runtime.getSnapshot());
  });
  const resultMastery = page.locator('[aria-label="Stage mastery result"]');
  await resultMastery.waitFor({ state: "visible" });
  const resultPanel = page.locator('[aria-label="Section clear"]');
  await resultPanel.waitFor({ state: "visible" });
  await page.waitForTimeout(120);
  const resultText = await resultPanel.innerText();
  const resultGeometry = await page.evaluate(() => {
    const sectionEl = document.querySelector('[aria-label="Section clear"]');
    const masteryEl = document.querySelector('[aria-label="Stage mastery result"]');
    const retryEl = [...document.querySelectorAll("button")].find((el) => /RETRY STAGE/i.test(el.textContent || ""));
    const rect = (el) => el ? (() => { const r = el.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height }; })() : null;
    return { section: rect(sectionEl), mastery: rect(masteryEl), retry: rect(retryEl), innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
  });
  report.result = { text: resultText, geometry: resultGeometry };
  await page.screenshot({ path: `${out}/03-stage-practice-result.png`, fullPage: false });
  for (const token of ["STAGE MASTERY", "2/3", "NEXT TARGET", "PERFECT SKY", "RETRY STAGE", "CHASE PERFECT SKY"]) {
    if (!resultText.includes(token)) report.failures.push(`result missing ${token}`);
  }
  if (!resultGeometry.mastery || resultGeometry.mastery.bottom > 393 || resultGeometry.mastery.top < 0) report.failures.push(`result mastery clipped ${JSON.stringify(resultGeometry.mastery)}`);
  if (!resultGeometry.retry || resultGeometry.retry.bottom > 393 || resultGeometry.retry.top < 0) report.failures.push(`retry clipped ${JSON.stringify(resultGeometry.retry)}`);
  if (resultGeometry.scrollWidth > 852) report.failures.push(`result horizontal overflow ${resultGeometry.scrollWidth}`);
} catch (error) {
  report.failures.push(String(error));
}

if (report.pageErrors.length) report.failures.push(`pageErrors ${report.pageErrors.length}`);
if (report.criticalResponses.length) report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) throw new Error(`V11.4.1 mastery audit failures: ${JSON.stringify(report.failures)}`);
