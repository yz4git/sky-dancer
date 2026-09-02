import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v118-loadout-reactions";
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
  await page.goto(`${baseUrl}?menu=1&v118=${loadout}`,{waitUntil:"domcontentloaded"});
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({state:"visible"});
  await page.locator('[aria-label="Open hangar"]').click();
  const hangar=page.locator('[aria-label="Arcade hangar"]');
  await hangar.waitFor({state:"visible"});
  const text=await hangar.innerText();
  const doctrine=loadout==="standard"?"FUSION LINK · TURBO FINISH · SCORE + REFUND":loadout==="missile-focus"?"RAPID MULTI · RIPPLE SHOCK · ARMOR CRUSH":"TWIN BURST · ARMOR SHRED · CANNON STAGGER";
  if(!text.includes(doctrine)) report.failures.push(`${loadout} V11.8 hangar doctrine missing`);
  if(captureHangar){
    const geometry=await page.evaluate(()=>{const el=document.querySelector('[aria-label="Arcade hangar"] > div');const r=el?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;});
    report.hangar={text,geometry};
    await page.screenshot({path:`${out}/00-hangar-v118-doctrines.png`});
    if(!geometry||geometry.top<0||geometry.bottom>393||geometry.left<0||geometry.right>852) report.failures.push(`hangar clipped ${JSON.stringify(geometry)}`);
  }
  await hangar.locator("button").filter({hasText:/^READY/}).click();
  await page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first().click();
  const start=page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first();
  await start.waitFor({state:"visible"});
  await start.click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
  await page.waitForFunction(()=>Boolean(window.__skyDancerV118AuditDemo));
  return page;
}

async function syncRender(page, frames=1) {
  return page.evaluate((count)=>{
    const demo=window.__skyDancerV118AuditDemo;
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
    const demo=window.__skyDancerV118AuditDemo; const s=demo.runtime.getSnapshot();
    const canvas=document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl=canvas?.getContext("webgl2")||canvas?.getContext("webgl");
    const card=document.querySelector('[class*="v118LoadoutStatus"]');
    const controls=document.querySelector('[aria-label="Arcade combat controls"]');
    const cr=card?.getBoundingClientRect(); const rr=controls?.getBoundingClientRect();
    return {
      stage:s.stage.id,status:s.status,loadout:s.loadout,paintScheme:s.paintScheme,renderer:gl?"webgl":"missing",
      width:canvas?.clientWidth??0,height:canvas?.clientHeight??0,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      cardText:card?.textContent??"", cardRect:cr?{top:cr.top,bottom:cr.bottom,left:cr.left,right:cr.right,width:cr.width,height:cr.height}:null,
      controlsRect:rr?{top:rr.top,bottom:rr.bottom,left:rr.left,right:rr.right,width:rr.width,height:rr.height}:null,
    };
  });
}

async function triggerFinish(page, loadout, missile, turbo=false){
  return page.evaluate(({loadout,missile,turbo})=>{
    const d=window.__skyDancerV118AuditDemo;
    if(turbo) d.setTurbo(true);
    if(turbo) d.runtime.step(1/60);
    const id=d.runtime.spawnEnemyForTests(loadout==="gun-focus"||loadout==="missile-focus"?"bomber":"fighter",0.25,0,24);
    d.runtime.damageEnemyForTests(id,999,missile);
    const s=d.runtime.getSnapshot();
    const impact=s.impacts.findLast?.(x=>x.enemyId===id) ?? [...s.impacts].reverse().find(x=>x.enemyId===id);
    return {id,reaction:impact?.reaction,armorBreak:impact?.armorBreak,destroyed:impact?.destroyed,label:s.loadoutReactionLabel,bonus:s.loadoutBonusScore,serial:s.loadoutReactionSerial,turbo:s.turbo};
  },{loadout,missile,turbo});
}

try {
  // STANDARD: idle hit remains neutral; Turbo Link converts the same gun finish into Fusion reaction/reward.
  {
    const page=await openSortie("standard",true);
    const idle=await page.evaluate(()=>{
      const d=window.__skyDancerV118AuditDemo;
      const id=d.runtime.spawnEnemyForTests("fighter",-0.4,0,28);
      d.runtime.damageEnemyForTests(id,12,false);
      const s=d.runtime.getSnapshot(); const hit=[...s.impacts].reverse().find(x=>x.enemyId===id);
      return {reaction:hit?.reaction,bonus:s.loadoutBonusScore};
    });
    await syncRender(page,1);
    const fusion=await triggerFinish(page,"standard",false,true);
    await syncRender(page,1);
    await page.waitForTimeout(50);
    const state=await baseState(page);
    report.standard={...state,idle,fusion};
    if(idle.reaction!=="none"||idle.bonus!==0) report.failures.push(`standard idle not neutral ${JSON.stringify(idle)}`);
    if(fusion.reaction!=="fusion-link"||fusion.bonus<=0||!String(fusion.label).includes("FUSION")) report.failures.push(`standard fusion missing ${JSON.stringify(fusion)}`);
    if(!state.cardText.includes("FUSION DOCTRINE")||!state.cardText.includes("TACTICAL BONUS +")) report.failures.push(`standard HUD doctrine missing ${state.cardText}`);
    await page.screenshot({path:`${out}/01-standard-fusion-finish.png`});
    await page.close();
  }

  // MISSILE: direct deterministic missile finish must report Ripple Shock family and tactical reward.
  {
    const page=await openSortie("missile-focus");
    const ripple=await triggerFinish(page,"missile-focus",true,false);
    await syncRender(page,1);
    await page.waitForTimeout(50);
    const state=await baseState(page);
    report.missile={...state,ripple};
    if(ripple.reaction!=="ripple-shock"||ripple.bonus<=0||!String(ripple.label).match(/RIPPLE/)) report.failures.push(`missile ripple reaction missing ${JSON.stringify(ripple)}`);
    if(!state.cardText.includes("RIPPLE DOCTRINE")||!state.cardText.includes("TACTICAL BONUS +")) report.failures.push(`missile HUD doctrine missing ${state.cardText}`);
    await page.screenshot({path:`${out}/02-missile-ripple-break.png`});
    await page.close();
  }

  // GUN: deterministic gun finish must report Twin Cannon family and tactical reward.
  {
    const page=await openSortie("gun-focus");
    const cannon=await triggerFinish(page,"gun-focus",false,false);
    await syncRender(page,1);
    await page.waitForTimeout(50);
    const state=await baseState(page);
    report.gun={...state,cannon};
    if(cannon.reaction!=="twin-cannon"||cannon.bonus<=0||!String(cannon.label).match(/CANNON/)) report.failures.push(`gun cannon reaction missing ${JSON.stringify(cannon)}`);
    if(!state.cardText.includes("CANNON DOCTRINE")||!state.cardText.includes("TACTICAL BONUS +")) report.failures.push(`gun HUD doctrine missing ${state.cardText}`);
    await page.screenshot({path:`${out}/03-gun-cannon-finish.png`});
    await page.close();
  }
} catch(error){ report.failures.push(String(error)); }

for(const key of ["standard","missile","gun"]){
  const s=report[key]; if(!s) continue;
  if(s.renderer!=="webgl"||s.width!==852||s.height!==393||s.stage!=="dawn-city"||s.status!=="running") report.failures.push(`${key} base ${JSON.stringify(s)}`);
  if(s.scrollWidth>852||s.scrollHeight>393) report.failures.push(`${key} overflow ${s.scrollWidth}x${s.scrollHeight}`);
  if(!s.cardRect||s.cardRect.top<0||s.cardRect.bottom>393||s.cardRect.left<0||s.cardRect.right>852) report.failures.push(`${key} tactical card clipped ${JSON.stringify(s.cardRect)}`);
  if(s.cardRect&&s.controlsRect&&s.cardRect.right>s.controlsRect.left) report.failures.push(`${key} tactical card overlaps controls ${JSON.stringify({card:s.cardRect,controls:s.controlsRect})}`);
}
if(report.pageErrors.length)report.failures.push(`pageErrors ${report.pageErrors.length}`);
if(report.criticalResponses.length)report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report,null,2));
if(report.failures.length)throw new Error(`V11.8 deterministic audit failures: ${JSON.stringify(report.failures)}`);
