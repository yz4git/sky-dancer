import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v117-loadout-identity-retry";
const stages = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const report = { viewport:{width:852,height:393,dpr:2}, hangar:null, standard:null, missile:null, gun:null, pageErrors:[], criticalResponses:[], failures:[] };

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
  await page.goto(`${baseUrl}?menu=1&v117retry=${loadout}`,{waitUntil:"domcontentloaded"});
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({state:"visible"});
  await page.locator('[aria-label="Open hangar"]').click();
  const hangar=page.locator('[aria-label="Arcade hangar"]');
  await hangar.waitFor({state:"visible"});
  const text=await hangar.innerText();
  const doctrine=loadout==="standard"?"FUSION LINK · TURBO BOOSTS FIRE + LOCK":loadout==="missile-focus"?"RAPID MULTI · WIDE LOCK · TWIN RIPPLE":"TWIN BURST · DUAL CANNON · HIGH RATE";
  if(!text.includes(doctrine)) report.failures.push(`${loadout} hangar doctrine missing`);
  if(captureHangar){
    const geometry=await page.evaluate(()=>{const el=document.querySelector('[aria-label="Arcade hangar"] > div');const r=el?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;});
    report.hangar={text,geometry};
    await page.screenshot({path:`${out}/00-hangar-standard-doctrine.png`});
    if(!geometry||geometry.top<0||geometry.bottom>393||geometry.left<0||geometry.right>852) report.failures.push(`hangar clipped ${JSON.stringify(geometry)}`);
  }
  await hangar.locator("button").filter({hasText:/^READY/}).click();
  await page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first().click();
  const start=page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first();
  await start.waitFor({state:"visible"});
  await start.click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
  await page.waitForFunction(()=>Boolean(window.__skyDancerV117AuditDemo));
  return page;
}

async function syncRender(page, frames=1) {
  return page.evaluate((count)=>{
    const demo=window.__skyDancerV117AuditDemo;
    for(let i=0;i<count;i++) demo.runtime.step(1/60);
    const snapshot=demo.runtime.getSnapshot();
    demo.sync(snapshot,1/60);
    demo.cinematic.render(demo.scene,demo.camera,snapshot.turboActive,demo.presentationFx);
    demo.onSnapshot(snapshot);
    demo.previousSnapshot=snapshot;
    return snapshot;
  },frames);
}

async function baseState(page){
  return page.evaluate(()=>{
    const demo=window.__skyDancerV117AuditDemo; const s=demo.runtime.getSnapshot();
    const canvas=document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl=canvas?.getContext("webgl2")||canvas?.getContext("webgl");
    return {stage:s.stage.id,status:s.status,loadout:s.loadout,paintScheme:s.paintScheme,renderer:gl?"webgl":"missing",width:canvas?.clientWidth??0,height:canvas?.clientHeight??0,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};
  });
}

try {
  // STANDARD Fusion Link: deterministic 60 Hz step then React snapshot delivery.
  {
    const page=await openSortie("standard",true);
    const controls=page.locator('[aria-label="Arcade combat controls"]');
    const idle=await controls.innerText();
    await page.evaluate(()=>window.__skyDancerV117AuditDemo.setTurbo(true));
    await syncRender(page,2);
    await page.waitForTimeout(60);
    const fusion=await controls.innerText();
    const state=await baseState(page);
    report.standard={...state,idle,fusion,turboActive:(await page.evaluate(()=>window.__skyDancerV117AuditDemo.runtime.getSnapshot().turboActive))};
    for(const token of ["FUSION GUN","FUSION SALVO","FUSION LINK"]) if(!fusion.includes(token)) report.failures.push(`standard missing ${token}`);
    await page.screenshot({path:`${out}/01-standard-fusion-link.png`});
    await page.close();
  }

  // MISSILE Focus: edge target that Standard cannot acquire, then one lock -> two missiles.
  {
    const page=await openSortie("missile-focus");
    const controls=page.locator('[aria-label="Arcade combat controls"]');
    const controlsText=await controls.innerText();
    await page.evaluate(()=>{const d=window.__skyDancerV117AuditDemo;d.runtime.spawnEnemy("fighter",1.68,0,30);d.setLock(true);});
    await syncRender(page,2);
    const locked=await page.evaluate(()=>window.__skyDancerV117AuditDemo.runtime.getSnapshot().lockedCount);
    await page.evaluate(()=>window.__skyDancerV117AuditDemo.setLock(false));
    await syncRender(page,1);
    await page.waitForTimeout(40);
    const ripple=await page.evaluate(()=>{
      const d=window.__skyDancerV117AuditDemo,s=d.runtime.getSnapshot();
      const p=s.projectiles.filter(x=>x.owner==="player-missile");
      return {message:s.message,count:p.length,targetIds:p.map(x=>x.targetEnemyId),xs:p.map(x=>x.x),visualCount:[...d.projectileMeshes.values()].filter(m=>m.userData.arcadeLoadoutV117==="missile-focus").length};
    });
    const state=await baseState(page); report.missile={...state,controlsText,lockedBeforeRelease:locked,ripple};
    if(!controlsText.includes("RAPID MULTI")||!controlsText.includes("BACKUP GUN")) report.failures.push("missile control doctrine missing");
    if(locked!==1) report.failures.push(`missile edge lock ${locked}`);
    if(ripple.count!==2) report.failures.push(`missile ripple ${ripple.count}`);
    if(ripple.count===2&&new Set(ripple.targetIds).size!==1) report.failures.push(`missile targets ${JSON.stringify(ripple.targetIds)}`);
    if(!String(ripple.message).includes("RAPID RIPPLE ×2")) report.failures.push(`missile message ${ripple.message}`);
    if(ripple.visualCount<2) report.failures.push(`missile visuals ${ripple.visualCount}`);
    await page.screenshot({path:`${out}/02-missile-twin-ripple.png`});
    await page.close();
  }

  // GUN Focus: 6 frames span two high-rate volleys; every volley is a left/right pair.
  {
    const page=await openSortie("gun-focus");
    const controls=page.locator('[aria-label="Arcade combat controls"]');
    const controlsText=await controls.innerText();
    await page.evaluate(()=>window.__skyDancerV117AuditDemo.setFire(true));
    await syncRender(page,6);
    await page.evaluate(()=>window.__skyDancerV117AuditDemo.setFire(false));
    await syncRender(page,1);
    await page.waitForTimeout(35);
    const burst=await page.evaluate(()=>{
      const d=window.__skyDancerV117AuditDemo,s=d.runtime.getSnapshot(); const p=s.projectiles.filter(x=>x.owner==="player-gun");
      return {volleySerial:s.shotSerial,count:p.length,xs:p.map(x=>x.x),visualCount:[...d.projectileMeshes.values()].filter(m=>m.userData.arcadeLoadoutV117==="gun-focus").length};
    });
    const state=await baseState(page); report.gun={...state,controlsText,burst};
    if(!controlsText.includes("TWIN BURST")||!controlsText.includes("TACTICAL LOCK")) report.failures.push("gun control doctrine missing");
    if(burst.count<2) report.failures.push(`gun projectiles ${burst.count}`);
    if(burst.count&&!(Math.min(...burst.xs)<0&&Math.max(...burst.xs)>0)) report.failures.push(`gun lanes ${JSON.stringify(burst.xs)}`);
    if(burst.visualCount<2) report.failures.push(`gun visuals ${burst.visualCount}`);
    await page.screenshot({path:`${out}/03-gun-twin-burst.png`});
    await page.close();
  }
} catch(error){ report.failures.push(String(error)); }

for(const key of ["standard","missile","gun"]){const s=report[key];if(!s)continue;if(s.renderer!=="webgl"||s.width!==852||s.height!==393||s.stage!=="dawn-city"||s.status!=="running")report.failures.push(`${key} base ${JSON.stringify(s)}`);if(s.scrollWidth>852||s.scrollHeight>393)report.failures.push(`${key} overflow ${s.scrollWidth}x${s.scrollHeight}`);}
if(report.pageErrors.length)report.failures.push(`pageErrors ${report.pageErrors.length}`);
if(report.criticalResponses.length)report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report,null,2));
if(report.failures.length)throw new Error(`V11.7 deterministic audit failures: ${JSON.stringify(report.failures)}`);
