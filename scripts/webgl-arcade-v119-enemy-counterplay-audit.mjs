import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v119-enemy-counterplay";
const stages = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const report = { viewport:{width:852,height:393,dpr:2}, hangar:null, gun:null, missile:null, standard:null, pageErrors:[], criticalResponses:[], failures:[] };

const progressFor = (loadout) => ({
  version:2,
  clearedStageIds:stages,
  unlockedStageIds:stages,
  records:Object.fromEntries(stages.map(id => [id,{clears:2,bestScore:18000,bestRank:"A",noDamage:true,medals:["score","signature","no-damage"]}])),
  bestRunScore:72000,bestRunRank:"S",completedRuns:2,oneCreditClears:1,totalKills:140,totalNearMisses:30,totalBossKills:12,
  totalArmorBreaks:24,totalFormationBreaks:18,bestChain:14,bestRoute:["dawn-city","cloud-fleet"],bestRouteScore:72000,totalMedals:33,recentRoutes:[],
  unlockedPaintSchemes:["default","sunset","storm","prism"],unlockedLoadouts:["standard","missile-focus","gun-focus"],
  selectedPaintScheme:"prism",selectedLoadout:loadout,
});

async function openSortie(loadout, captureHangar=false) {
  const page=await context.newPage();
  page.on("pageerror",e=>report.pageErrors.push(`${loadout}: ${String(e)}`));
  page.on("response",r=>{const t=r.request().resourceType(); if(r.status()>=400&&["document","script","stylesheet","font","xhr","fetch"].includes(t)) report.criticalResponses.push({loadout,status:r.status(),url:r.url(),type:t});});
  await page.addInitScript(value=>localStorage.setItem("sky-dancer-arcade-progress-v2",JSON.stringify(value)),progressFor(loadout));
  await page.goto(`${baseUrl}?menu=1&v119=${loadout}`,{waitUntil:"domcontentloaded"});
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({state:"visible"});
  await page.locator('[aria-label="Open hangar"]').click();
  const hangar=page.locator('[aria-label="Arcade hangar"]');
  await hangar.waitFor({state:"visible"});
  const text=await hangar.innerText();
  const doctrine=loadout==="standard"?"BREAK JAMMERS":loadout==="missile-focus"?"PUNISH EVASION":"CRACK BRACE";
  if(!text.includes(doctrine)) report.failures.push(`${loadout} hangar counter doctrine missing`);
  if(captureHangar){
    const geometry=await page.evaluate(()=>{const el=document.querySelector('[aria-label="Arcade hangar"] > div');const r=el?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;});
    report.hangar={text,geometry};
    await page.screenshot({path:`${out}/00-hangar-v119-counterplay.png`});
    if(!geometry||geometry.top<0||geometry.bottom>393||geometry.left<0||geometry.right>852) report.failures.push(`hangar clipped ${JSON.stringify(geometry)}`);
  }
  await hangar.locator("button").filter({hasText:/^READY/}).click();
  await page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first().click();
  const start=page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first();
  await start.waitFor({state:"visible"});
  await start.click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
  await page.waitForFunction(()=>Boolean(window.__skyDancerV119AuditDemo));
  return page;
}

async function syncRender(page, frames=1) {
  return page.evaluate((count)=>{
    const demo=window.__skyDancerV119AuditDemo;
    for(let i=0;i<count;i++) demo.runtime.step(1/60);
    const snapshot=demo.runtime.getSnapshot();
    demo.sync(snapshot,1/60);
    demo.cinematic.render(demo.scene,demo.camera,snapshot.turboActive,demo.presentationFx);
    demo.onSnapshot(snapshot);
    demo.previousSnapshot=snapshot;
    return snapshot;
  },frames);
}

async function baseState(page) {
  return page.evaluate(()=>{
    const demo=window.__skyDancerV119AuditDemo; const s=demo.runtime.getSnapshot();
    const canvas=document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl=canvas?.getContext("webgl2")||canvas?.getContext("webgl");
    const card=document.querySelector('[data-countered="true"]');
    const controls=document.querySelector('[aria-label="Arcade combat controls"]');
    const rect=(el)=>{const r=el?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;};
    return {stage:s.stage.id,status:s.status,loadout:s.loadout,renderer:gl?"webgl":"missing",width:canvas?.clientWidth??0,height:canvas?.clientHeight??0,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,cardText:card?.textContent??"",cardRect:rect(card),controlsRect:rect(controls)};
  });
}

async function counterVisual(page, id) {
  return page.evaluate((enemyId)=>{
    const d=window.__skyDancerV119AuditDemo;
    const s=d.runtime.getSnapshot();
    const enemy=s.enemies.find(x=>x.id===enemyId);
    const group=d.enemyGroups.get(enemyId);
    const ring=group?.getObjectByName("arcade-counterplay-ring");
    return {enemy,ringType:ring?.userData?.arcadeEnemyCounterplayV119??null,ringVisible:Boolean(ring),counterplayCount:s.enemyCounterplayCount,label:s.enemyCounterplayLabel,turboJammed:s.turboJammed};
  },id);
}

function checkLayout(label,state){
  if(state.renderer!=="webgl"||state.width!==852||state.height!==393||state.stage!=="dawn-city"||state.status!=="running") report.failures.push(`${label} base ${JSON.stringify(state)}`);
  if(state.scrollWidth>852||state.scrollHeight>393) report.failures.push(`${label} overflow ${state.scrollWidth}x${state.scrollHeight}`);
  const c=state.cardRect,k=state.controlsRect;
  if(!c||c.top<0||c.bottom>393||c.left<0||c.right>852) report.failures.push(`${label} counter card clipped ${JSON.stringify(c)}`);
  if(c&&k&&!(c.right<=k.left||c.left>=k.right||c.bottom<=k.top||c.top>=k.bottom)) report.failures.push(`${label} counter card overlaps controls`);
  if(!state.cardText.includes("ENEMY COUNTER")) report.failures.push(`${label} HUD warning missing`);
}

try {
  // GUN: armored bomber braces against direct cannon pressure; visible gold ring and break reward.
  {
    const page=await openSortie("gun-focus",true);
    const id=await page.evaluate(()=>{const d=window.__skyDancerV119AuditDemo;const id=d.runtime.spawnEnemyForTests("bomber",0,0,30);d.runtime.forceEnemyCounterplayForTests(id);return id;});
    await syncRender(page,1); await page.waitForTimeout(70);
    const active=await counterVisual(page,id); const state=await baseState(page);
    if(active.enemy?.counterplay!=="armor-brace"||active.ringType!=="armor-brace"||!active.ringVisible) report.failures.push(`gun brace visual ${JSON.stringify(active)}`);
    checkLayout("gun",state);
    await page.screenshot({path:`${out}/01-gun-armor-brace.png`});
    const broken=await page.evaluate((enemyId)=>{const d=window.__skyDancerV119AuditDemo;d.runtime.damageEnemyForTests(enemyId,18,false);let s=d.runtime.getSnapshot();if(s.counterplayBreaks===0)d.runtime.damageEnemyForTests(enemyId,999,false);return d.runtime.getSnapshot();},id);
    if(broken.counterplayBreaks<1) report.failures.push("gun brace did not break");
    report.gun={...state,active,breaks:broken.counterplayBreaks,bonus:broken.loadoutBonusScore,reaction:broken.loadoutReactionLabel};
    await page.close();
  }

  // MISSILE: interceptor performs a visible evasive roll and can be punished by a tracked missile hit.
  {
    const page=await openSortie("missile-focus");
    const id=await page.evaluate(()=>{const d=window.__skyDancerV119AuditDemo;const id=d.runtime.spawnEnemyForTests("interceptor",.18,.08,30);d.runtime.forceEnemyCounterplayForTests(id);return id;});
    await syncRender(page,1); const before=await counterVisual(page,id); await syncRender(page,3); await page.waitForTimeout(70); const active=await counterVisual(page,id); const state=await baseState(page);
    if(active.enemy?.counterplay!=="evasive-roll"||active.ringType!=="evasive-roll"||!active.ringVisible) report.failures.push(`missile evade visual ${JSON.stringify(active)}`);
    if(before.enemy&&active.enemy&&Math.hypot(active.enemy.x-before.enemy.x,active.enemy.y-before.enemy.y)<=.01) report.failures.push("missile evade did not move target");
    checkLayout("missile",state);
    await page.screenshot({path:`${out}/02-missile-evasive-roll.png`});
    const broken=await page.evaluate((enemyId)=>{const d=window.__skyDancerV119AuditDemo;d.runtime.damageEnemyForTests(enemyId,999,true);return d.runtime.getSnapshot();},id);
    if(broken.counterplayBreaks<1) report.failures.push("missile evade did not punish");
    report.missile={...state,active,breaks:broken.counterplayBreaks,bonus:broken.loadoutBonusScore,reaction:broken.loadoutReactionLabel};
    await page.close();
  }

  // STANDARD: jammer visibly contests Fusion/Turbo economy until destroyed.
  {
    const page=await openSortie("standard");
    const id=await page.evaluate(()=>{const d=window.__skyDancerV119AuditDemo;const id=d.runtime.spawnEnemyForTests("missile-boat",0,0,30);d.runtime.forceEnemyCounterplayForTests(id);d.setTurbo(true);return id;});
    const turboBefore=await page.evaluate(()=>window.__skyDancerV119AuditDemo.runtime.getSnapshot().turbo);
    await syncRender(page,12); await page.waitForTimeout(70);
    const active=await counterVisual(page,id); const state=await baseState(page); const turboAfter=await page.evaluate(()=>window.__skyDancerV119AuditDemo.runtime.getSnapshot().turbo);
    if(active.enemy?.counterplay!=="turbo-jammer"||active.ringType!=="turbo-jammer"||!active.ringVisible||!active.turboJammed) report.failures.push(`standard jammer visual ${JSON.stringify(active)}`);
    if(!(turboAfter<turboBefore)) report.failures.push(`standard jammer turbo ${turboBefore}->${turboAfter}`);
    checkLayout("standard",state);
    await page.screenshot({path:`${out}/03-standard-turbo-jammer.png`});
    const broken=await page.evaluate((enemyId)=>{const d=window.__skyDancerV119AuditDemo;d.runtime.damageEnemyForTests(enemyId,999,false);return d.runtime.getSnapshot();},id);
    if(broken.counterplayBreaks<1) report.failures.push("standard jammer did not break");
    report.standard={...state,active,turboBefore,turboAfter,breaks:broken.counterplayBreaks,bonus:broken.loadoutBonusScore,reaction:broken.loadoutReactionLabel};
    await page.close();
  }
} catch(error){ report.failures.push(String(error)); }

if(report.pageErrors.length) report.failures.push(`pageErrors ${report.pageErrors.length}`);
if(report.criticalResponses.length) report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report,null,2));
if(report.failures.length) throw new Error(`V11.9 counterplay audit failures: ${JSON.stringify(report.failures)}`);
