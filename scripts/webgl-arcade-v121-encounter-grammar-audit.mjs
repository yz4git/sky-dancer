import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v121-encounter-grammar";
const stages = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const report = { viewport:{width:852,height:393,dpr:2}, phases:[], relief:null, pageErrors:[], criticalResponses:[], failures:[] };

const progress = {
  version:2,
  clearedStageIds:stages,
  unlockedStageIds:stages,
  records:Object.fromEntries(stages.map(id => [id,{clears:2,bestScore:18000,bestRank:"A",noDamage:true,medals:["score","signature","no-damage"]}])),
  bestRunScore:72000,bestRunRank:"S",completedRuns:2,oneCreditClears:1,totalKills:140,totalNearMisses:30,totalBossKills:12,
  totalArmorBreaks:24,totalFormationBreaks:18,bestChain:14,bestRoute:["dawn-city","cloud-fleet"],bestRouteScore:72000,totalMedals:33,recentRoutes:[],
  unlockedPaintSchemes:["default","sunset","storm","prism"],unlockedLoadouts:["standard","missile-focus","gun-focus"],
  selectedPaintScheme:"prism",selectedLoadout:"standard",
};

async function openSortie(tag) {
  const page = await context.newPage();
  page.on("pageerror", error => report.pageErrors.push(`${tag}: ${String(error)}`));
  page.on("response", response => {
    const type = response.request().resourceType();
    if (response.status() >= 400 && ["document","script","stylesheet","font","xhr","fetch"].includes(type)) {
      report.criticalResponses.push({ tag, status:response.status(), url:response.url(), type });
    }
  });
  await page.addInitScript(value => localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify(value)), progress);
  await page.goto(`${baseUrl}?menu=1&v121=${tag}`, { waitUntil:"domcontentloaded" });
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state:"visible" });
  await page.locator('[aria-label="Open hangar"]').click();
  const hangar = page.locator('[aria-label="Arcade hangar"]');
  await hangar.waitFor({ state:"visible" });
  await hangar.locator("button").filter({ hasText:/^READY/ }).click();
  await page.locator('[aria-label="Select game mode"] button').filter({ hasText:/STAGE PRACTICE/i }).first().click();
  const start = page.locator("button").filter({ hasText:/START STAGE PRACTICE/i }).first();
  await start.waitFor({ state:"visible" });
  await start.click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({ state:"visible" });
  await page.locator('[aria-label="Arcade combat controls"]').waitFor({ state:"visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV121AuditDemo));
  return page;
}

async function renderNow(page) {
  return page.evaluate(() => {
    const demo = window.__skyDancerV121AuditDemo;
    const snapshot = demo.runtime.getSnapshot();
    demo.sync(snapshot, 1/60);
    demo.cinematic.render(demo.scene, demo.camera, snapshot.turboActive, demo.presentationFx);
    demo.onSnapshot(snapshot);
    demo.previousSnapshot = snapshot;
    return snapshot;
  });
}

async function sample(page) {
  await page.waitForTimeout(80);
  return page.evaluate(() => {
    const demo = window.__skyDancerV121AuditDemo;
    const s = demo.runtime.getSnapshot();
    const canvas = document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const beat = document.querySelector('[aria-label="Current course beat"]');
    const controls = document.querySelector('[aria-label="Arcade combat controls"]');
    const badge = [...document.querySelectorAll("span")].find(el => el.textContent?.includes("V12.1"));
    const rect = el => { const r = el?.getBoundingClientRect(); return r ? {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height} : null; };
    return {
      renderer:gl?"webgl":"missing", width:canvas?.clientWidth??0, height:canvas?.clientHeight??0,
      scrollWidth:document.documentElement.scrollWidth, scrollHeight:document.documentElement.scrollHeight,
      stage:s.stage.id, status:s.status, mode:s.combatDirectorMode,
      grammar:s.encounterGrammarLabel, grammarId:s.encounterGrammarId, intent:s.encounterGrammarIntent,
      phase:s.encounterGrammarPhaseLabel, phaseIndex:s.encounterGrammarPhaseIndex, phaseCount:s.encounterGrammarPhaseCount,
      grammarSerial:s.encounterGrammarSerial, enemyCount:s.enemies.length,
      enemyKinds:s.enemies.map(enemy=>enemy.kind), maneuvers:s.enemies.map(enemy=>enemy.maneuver),
      beatText:beat?.textContent??"", beatRect:rect(beat), controlsRect:rect(controls), badgeText:badge?.textContent??"",
    };
  });
}

function baseChecks(label, state) {
  if (state.renderer !== "webgl" || state.width !== 852 || state.height !== 393 || state.stage !== "dawn-city" || state.status !== "running") {
    report.failures.push(`${label} base ${JSON.stringify(state)}`);
  }
  if (state.scrollWidth > 852 || state.scrollHeight > 393) report.failures.push(`${label} overflow ${state.scrollWidth}x${state.scrollHeight}`);
  const b = state.beatRect;
  if (!b || b.top < 0 || b.bottom > 393 || b.left < 0 || b.right > 852) report.failures.push(`${label} beat clipped ${JSON.stringify(b)}`);
  if (!state.controlsRect) report.failures.push(`${label} controls missing`);
  if (!state.beatText.includes("COMBAT DIRECTOR") || !state.beatText.includes("ENCOUNTER")) report.failures.push(`${label} grammar HUD missing`);
  if (!state.badgeText.includes("V12.1")) report.failures.push(`${label} V12.1 badge missing`);
}

try {
  const page = await openSortie("sequence");
  await page.evaluate(() => {
    const runtime = window.__skyDancerV121AuditDemo.runtime;
    runtime.setV12DirectorSignalsForTests(.2, 2.5, .2, 0, 1);
    runtime.spawnV12EncounterForTests();
  });
  await renderNow(page);
  const first = await sample(page);
  baseChecks("phase1", first);
  if (first.phaseIndex !== 1 || first.phaseCount !== 3 || first.enemyCount < 1) report.failures.push(`phase1 contract ${JSON.stringify(first)}`);
  report.phases.push(first);
  await page.screenshot({ path:`${out}/01-dawn-phase-1.png` });

  await page.evaluate(() => window.__skyDancerV121AuditDemo.runtime.advanceV121EncounterForTests());
  await renderNow(page);
  const second = await sample(page);
  baseChecks("phase2", second);
  if (second.phaseIndex !== 2 || second.phase === first.phase || second.enemyCount <= first.enemyCount) report.failures.push(`phase2 sequencing ${JSON.stringify({first,second})}`);
  report.phases.push(second);
  await page.screenshot({ path:`${out}/02-dawn-phase-2.png` });

  await page.evaluate(() => window.__skyDancerV121AuditDemo.runtime.advanceV121EncounterForTests());
  await renderNow(page);
  const third = await sample(page);
  baseChecks("phase3", third);
  if (third.phaseIndex !== 3 || third.phase === second.phase || third.enemyCount < second.enemyCount) report.failures.push(`phase3 sequencing ${JSON.stringify({second,third})}`);
  if (new Set([...first.maneuvers, ...second.maneuvers, ...third.maneuvers]).size < 2) report.failures.push("grammar did not produce maneuver variety");
  report.phases.push(third);
  await page.screenshot({ path:`${out}/03-dawn-phase-3.png` });
  await page.close();

  const reliefPage = await openSortie("relief");
  await reliefPage.evaluate(() => {
    const runtime = window.__skyDancerV121AuditDemo.runtime;
    runtime.setV12DirectorSignalsForTests(2.4, .1, .1, 1.5, .24);
    runtime.spawnV12EncounterForTests();
  });
  await renderNow(reliefPage);
  const relief = await sample(reliefPage);
  baseChecks("relief", relief);
  if (relief.mode !== "relief-window" || relief.phaseCount !== 2 || relief.enemyCount >= first.enemyCount) report.failures.push(`relief contract ${JSON.stringify({first,relief})}`);
  report.relief = relief;
  await reliefPage.screenshot({ path:`${out}/04-relief-open-sky.png` });
  await reliefPage.close();
} catch (error) {
  report.failures.push(String(error));
}

if (report.pageErrors.length) report.failures.push(`pageErrors ${report.pageErrors.length}`);
if (report.criticalResponses.length) report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) throw new Error(`V12.1 encounter grammar audit failures: ${JSON.stringify(report.failures)}`);
