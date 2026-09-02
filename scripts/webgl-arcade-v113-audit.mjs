import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v113-webgl";
const stages = [
  { id:"dawn-city", index:0, name:"DAWN CITY", progress:.35, beat:"GANTRY RUN" },
  { id:"red-canyon", index:1, name:"RED CANYON", progress:.35, beat:"CANYON COLLAPSE" },
  { id:"cloud-fleet", index:2, name:"CLOUD FLEET", progress:.35, beat:"DECK RUN", object:"arcade-v11-cloud-deck-section-" },
  { id:"storm-carrier", index:3, name:"STORM CARRIER", progress:.35, beat:"CARRIER SCREEN" },
  { id:"desert-fortress", index:4, name:"DESERT FORTRESS", progress:.35, beat:"SANDWALL BREACH" },
  { id:"ice-cavern", index:5, name:"ICE CAVERN", progress:.35, beat:"ICE COLLAPSE" },
  { id:"floating-ruins", index:6, name:"FLOATING RUINS", progress:.35, beat:"RUIN GATE SHIFT" },
  { id:"night-metro", index:7, name:"NIGHT METRO", progress:.35, beat:"NEON GANTRY", object:"arcade-v11-night-gantry-section-" },
  { id:"volcano-core", index:8, name:"VOLCANO CORE", progress:.35, beat:"ERUPTION RUN" },
  { id:"orbital-ascent", index:9, name:"ORBITAL ASCENT", progress:.35, beat:"DEBRIS LATTICE" },
  { id:"prism-citadel", index:10, name:"PRISM CITADEL", progress:.27, beat:"SEVEN SKY REMIX" },
];
const allIds = stages.map(stage => stage.id);
await mkdir(out, { recursive:true });
const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport:{width:852,height:393}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await context.addInitScript((ids) => {
  const records = Object.fromEntries(ids.map(id => [id,{clears:1,bestScore:0,bestRank:"D",noDamage:false,medals:[]} ]));
  localStorage.setItem("sky-dancer-arcade-progress-v2", JSON.stringify({
    version:2, clearedStageIds:ids, unlockedStageIds:ids, records,
    bestRunScore:0,bestRunRank:"D",completedRuns:0,oneCreditClears:0,totalKills:0,totalNearMisses:0,totalBossKills:0,totalArmorBreaks:0,totalFormationBreaks:0,bestChain:0,bestRoute:[],bestRouteScore:0,totalMedals:0,recentRoutes:[],unlockedPaintSchemes:["default"],unlockedLoadouts:["standard"],
  }));
}, allIds);

async function enterPractice(page, c) {
  await page.goto(`${baseUrl}?menu=1`, { waitUntil:"domcontentloaded" });
  const mode = page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first();
  await mode.waitFor({state:"visible"});
  await mode.click();
  const practice = page.locator('[aria-label="Select practice stage"]');
  await practice.waitFor({state:"visible"});
  await practice.locator("button").nth(c.index).click();
  await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
  await page.waitForFunction(() => Boolean(window.__skyDancerV113AuditDemo));
}

const report=[];
for (const c of stages) {
  const page = await context.newPage();
  const pageErrors=[];
  const criticalResponses=[];
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("response", response => {
    const type=response.request().resourceType();
    if (response.status() >= 400 && ["document","script","stylesheet","font","xhr","fetch"].includes(type)) criticalResponses.push({status:response.status(),url:response.url(),type});
  });
  await enterPractice(page,c);
  await page.evaluate((progress) => {
    const demo=window.__skyDancerV113AuditDemo;
    demo.runtime.triggerV11TimelineForTests(progress);
    demo.onSnapshot(demo.runtime.getSnapshot());
  }, c.progress);
  await page.waitForTimeout(420);
  const telemetry = await page.evaluate((prefix) => {
    const demo=window.__skyDancerV113AuditDemo;
    const s=demo.getSnapshot();
    const matches=[];
    demo.scene.traverse(object => {
      if (prefix && object.visible && object.name.startsWith(prefix)) matches.push({name:object.name,pos:[object.position.x,object.position.y,object.position.z],abs:object.userData.arcadeV11AbsoluteCourseDistance,depth:object.userData.arcadeV11RelativeDepth});
    });
    const timeline=document.querySelector('[aria-label="Current course beat"]')?.textContent ?? "";
    return {stage:s.stage.id,beat:s.timelineBeatLabel,setpiece:s.timelineSetpiece,distance:s.distance,matches,timeline};
  }, c.object || null);
  let anchorSpread=null;
  if (c.object) {
    const samples=[];
    await page.evaluate(() => window.__skyDancerV113AuditDemo.setTurbo(true));
    for (let i=0;i<8;i++) {
      const sample=await page.evaluate((prefix) => {
        const demo=window.__skyDancerV113AuditDemo;
        const s=demo.getSnapshot();
        let target=null;
        demo.scene.traverse(object => { if (!target && object.visible && object.name.startsWith(prefix)) target=object; });
        return target ? {distance:s.distance,depth:target.userData.arcadeV11RelativeDepth,absolute:s.distance+target.userData.arcadeV11RelativeDepth,name:target.name} : null;
      }, c.object);
      if (sample) samples.push(sample);
      await page.waitForTimeout(60);
    }
    await page.evaluate(() => window.__skyDancerV113AuditDemo.setTurbo(false));
    const absolutes=samples.map(sample => sample.absolute);
    anchorSpread=absolutes.length ? Math.max(...absolutes)-Math.min(...absolutes) : null;
  }
  await page.screenshot({path:`${out}/${String(c.index+1).padStart(2,"0")}-${c.id}.png`,fullPage:false});
  const row={...c,telemetry,anchorSpread,pageErrors,criticalResponses};
  report.push(row);
  if (telemetry.stage !== c.id || telemetry.beat !== c.beat || !telemetry.timeline.includes(c.beat) || pageErrors.length || criticalResponses.length) throw new Error(JSON.stringify(row));
  if (c.object && (telemetry.matches.length < 2 || anchorSpread === null || anchorSpread > .03)) throw new Error(JSON.stringify(row));
  await page.close();
}

// V11.3 result presentation: force a deterministic Dawn clear with the DANGER branch selected.
{
  const page=await context.newPage();
  const pageErrors=[];
  page.on("pageerror", error => pageErrors.push(String(error)));
  await enterPractice(page,stages[0]);
  await page.evaluate(() => {
    const demo=window.__skyDancerV113AuditDemo;
    demo.runtime.completeCurrentStageForTests("cloud-fleet");
    demo.onSnapshot(demo.runtime.getSnapshot());
  });
  const panel=page.locator('[aria-label="Section clear"]');
  await panel.waitFor({state:"visible"});
  await page.waitForTimeout(180);
  const text=await panel.innerText();
  const ledger=await page.evaluate(() => {
    const s=window.__skyDancerV113AuditDemo.getSnapshot();
    return {score:s.lastStageScore,breakdown:s.lastStageScoreBreakdown,medals:s.lastStageMedals,runMedals:s.runMedalsEarned};
  });
  await page.screenshot({path:`${out}/12-dawn-result.png`,fullPage:false});
  if (!text.includes("COMBAT") || !text.includes("PERFECT") || !text.includes("ROUTE") || !text.includes("PERFECT SKY") || ledger.breakdown.route !== 2200 || pageErrors.length) throw new Error(JSON.stringify({text,ledger,pageErrors}));
  report.push({id:"dawn-result",text,ledger,pageErrors});
  await page.close();
}

await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report.map(row => row.telemetry ? ({stage:row.id,beat:row.telemetry.beat,objects:row.telemetry.matches.length,anchorSpread:row.anchorSpread}) : ({stage:row.id,score:row.ledger.score,route:row.ledger.breakdown.route,medals:row.ledger.runMedals})),null,2));
