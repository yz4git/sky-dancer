import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire=createRequire(new URL("../.audit-runtime/package.json",import.meta.url));
const {chromium}=auditRequire("playwright-core");
const baseUrl=process.env.SKY_DANCER_AUDIT_URL||"http://127.0.0.1:4173";
const out="artifacts/v113-webgl-v2";
const stages=[
 {id:"dawn-city",index:0,name:"DAWN CITY",progress:.35,beat:"GANTRY RUN"},
 {id:"red-canyon",index:1,name:"RED CANYON",progress:.35,beat:"CANYON COLLAPSE"},
 {id:"cloud-fleet",index:2,name:"CLOUD FLEET",progress:.35,beat:"DECK RUN",object:"arcade-v11-cloud-deck-section-"},
 {id:"storm-carrier",index:3,name:"STORM CARRIER",progress:.35,beat:"CARRIER SCREEN"},
 {id:"desert-fortress",index:4,name:"DESERT FORTRESS",progress:.35,beat:"SANDWALL BREACH"},
 {id:"ice-cavern",index:5,name:"ICE CAVERN",progress:.35,beat:"ICE COLLAPSE"},
 {id:"floating-ruins",index:6,name:"FLOATING RUINS",progress:.35,beat:"RUIN GATE SHIFT"},
 {id:"night-metro",index:7,name:"NIGHT METRO",progress:.36,beat:"NEON GANTRY",object:"arcade-v11-night-gantry-section-"},
 {id:"volcano-core",index:8,name:"VOLCANO CORE",progress:.35,beat:"ERUPTION RUN"},
 {id:"orbital-ascent",index:9,name:"ORBITAL ASCENT",progress:.35,beat:"DEBRIS LATTICE"},
 {id:"prism-citadel",index:10,name:"PRISM CITADEL",progress:.27,beat:"SEVEN SKY REMIX"},
];
const allIds=stages.map(s=>s.id);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"]});
const context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await context.addInitScript(ids=>{
 const records=Object.fromEntries(ids.map(id=>[id,{clears:1,bestScore:0,bestRank:"D",noDamage:false,medals:[]} ]));
 localStorage.setItem("sky-dancer-arcade-progress-v2",JSON.stringify({version:2,clearedStageIds:ids,unlockedStageIds:ids,records,bestRunScore:0,bestRunRank:"D",completedRuns:0,oneCreditClears:0,totalKills:0,totalNearMisses:0,totalBossKills:0,totalArmorBreaks:0,totalFormationBreaks:0,bestChain:0,bestRoute:[],bestRouteScore:0,totalMedals:0,recentRoutes:[],unlockedPaintSchemes:["default"],unlockedLoadouts:["standard"]}));
},allIds);

async function enterPractice(page,c){
 await page.goto(`${baseUrl}?menu=1`,{waitUntil:"domcontentloaded"});
 const mode=page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first();
 await mode.waitFor({state:"visible"}); await mode.click();
 const practice=page.locator('[aria-label="Select practice stage"]'); await practice.waitFor({state:"visible"});
 await practice.locator("button").nth(c.index).click();
 await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
 await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
 await page.waitForFunction(()=>Boolean(window.__skyDancerV113AuditDemo));
}

async function forceFrame(page,progress){
 return page.evaluate(p=>{
  const demo=window.__skyDancerV113AuditDemo;
  demo.runtime.triggerV11TimelineForTests(p);
  const s=demo.runtime.getSnapshot();
  demo.v11Setpieces.update(s);
  demo.environment.update(s.distance,s.playerX,s.playerY);
  demo.onSnapshot(s);
  return {id:s.stage.id,beatId:s.timelineBeatId,beat:s.timelineBeatLabel,setpiece:s.timelineSetpiece,distance:s.distance};
 },progress);
}

const report=[]; const failures=[];
for(const c of stages){
 const page=await context.newPage(); const pageErrors=[]; const criticalResponses=[];
 page.on("pageerror",e=>pageErrors.push(String(e)));
 page.on("response",r=>{const t=r.request().resourceType();if(r.status()>=400&&["document","script","stylesheet","font","xhr","fetch"].includes(t))criticalResponses.push({status:r.status(),url:r.url(),type:t});});
 try{
  await enterPractice(page,c);
  const forced=await forceFrame(page,c.progress);
  await page.waitForTimeout(160);
  // Re-assert the deterministic audit frame after normal RAF activity.
  await forceFrame(page,c.progress);
  await page.waitForTimeout(80);
  const telemetry=await page.evaluate(prefix=>{
   const demo=window.__skyDancerV113AuditDemo; const s=demo.runtime.getSnapshot();
   demo.v11Setpieces.update(s);
   const matches=[]; const allNamed=[];
   demo.scene.traverse(o=>{
    if(o.name.startsWith("arcade-v11-"))allNamed.push({name:o.name,visible:o.visible,identity:o.userData.arcadeV11SetpieceIdentity??null,abs:o.userData.arcadeV11AbsoluteCourseDistance??null,depth:o.userData.arcadeV11RelativeDepth??null});
    if(prefix&&o.visible&&o.name.startsWith(prefix))matches.push({name:o.name,abs:o.userData.arcadeV11AbsoluteCourseDistance,depth:o.userData.arcadeV11RelativeDepth});
   });
   return {stage:s.stage.id,beatId:s.timelineBeatId,beat:s.timelineBeatLabel,setpiece:s.timelineSetpiece,distance:s.distance,timeline:document.querySelector('[aria-label="Current course beat"]')?.textContent??"",matches,allNamed};
  },c.object||null);
  let anchorSpread=null;
  if(c.object){
   const samples=[];
   for(let i=0;i<8;i++){
    await page.evaluate(()=>window.__skyDancerV113AuditDemo.setTurbo(true));
    await page.waitForTimeout(55);
    const sample=await page.evaluate(prefix=>{
     const demo=window.__skyDancerV113AuditDemo; const s=demo.runtime.getSnapshot(); demo.v11Setpieces.update(s); let target=null;
     demo.scene.traverse(o=>{if(!target&&o.visible&&o.name.startsWith(prefix))target=o;});
     return target?{name:target.name,absolute:target.userData.arcadeV11AbsoluteCourseDistance,depth:target.userData.arcadeV11RelativeDepth,distance:s.distance}:null;
    },c.object);
    if(sample)samples.push(sample);
   }
   await page.evaluate(()=>window.__skyDancerV113AuditDemo.setTurbo(false));
   const values=samples.map(s=>s.absolute).filter(Number.isFinite);
   anchorSpread=values.length?Math.max(...values)-Math.min(...values):null;
  }
  await page.screenshot({path:`${out}/${String(c.index+1).padStart(2,"0")}-${c.id}.png`,fullPage:false});
  const row={...c,forced,telemetry,anchorSpread,pageErrors,criticalResponses}; report.push(row);
  const errs=[];
  if(telemetry.stage!==c.id)errs.push(`stage ${telemetry.stage}`);
  if(telemetry.beat!==c.beat)errs.push(`beat ${telemetry.beat}`);
  if(!telemetry.timeline.includes(c.beat))errs.push("HUD beat missing");
  if(pageErrors.length)errs.push(`pageErrors ${pageErrors.length}`);
  if(criticalResponses.length)errs.push(`criticalResponses ${criticalResponses.length}`);
  if(c.object&&(telemetry.matches.length<2||anchorSpread===null||anchorSpread>.03))errs.push(`setpiece matches=${telemetry.matches.length} spread=${anchorSpread}`);
  if(errs.length)failures.push({id:c.id,errors:errs,telemetry});
 }catch(error){failures.push({id:c.id,errors:[String(error)]});}
 await writeFile(`${out}/report.partial.json`,JSON.stringify({report,failures},null,2));
 await page.close();
}

// Deterministic V11.3 result screen and exact ledger.
{
 const page=await context.newPage(); const pageErrors=[];
 page.on("pageerror",e=>pageErrors.push(String(e)));
 try{
  await enterPractice(page,stages[0]);
  await page.evaluate(()=>{
   const demo=window.__skyDancerV113AuditDemo;
   demo.runtime.completeCurrentStageForTests("cloud-fleet");
   demo.onSnapshot(demo.runtime.getSnapshot());
  });
  const panel=page.locator('[aria-label="Section clear"]'); await panel.waitFor({state:"visible"}); await page.waitForTimeout(100);
  const text=await panel.innerText();
  const ledger=await page.evaluate(()=>{const s=window.__skyDancerV113AuditDemo.getSnapshot();return {score:s.lastStageScore,breakdown:s.lastStageScoreBreakdown,medals:s.lastStageMedals,runMedals:s.runMedalsEarned};});
  await page.screenshot({path:`${out}/12-dawn-result.png`,fullPage:false});
  report.push({id:"dawn-result",text,ledger,pageErrors});
  const errs=[];
  for(const token of ["COMBAT","PERFECT","ROUTE","PERFECT SKY"])if(!text.includes(token))errs.push(`missing ${token}`);
  if(ledger.breakdown.route!==2200)errs.push(`route bonus ${ledger.breakdown.route}`);
  if(ledger.score!==ledger.breakdown.total)errs.push("score ledger mismatch");
  if(pageErrors.length)errs.push(`pageErrors ${pageErrors.length}`);
  if(errs.length)failures.push({id:"dawn-result",errors:errs,ledger,text});
 }catch(error){failures.push({id:"dawn-result",errors:[String(error)]});}
 await page.close();
}

await writeFile(`${out}/report.json`,JSON.stringify({report,failures},null,2));
await browser.close();
console.log(JSON.stringify({summary:report.map(r=>r.telemetry?{stage:r.id,beat:r.telemetry.beat,objects:r.telemetry.matches.length,anchorSpread:r.anchorSpread}:{stage:r.id,score:r.ledger?.score,route:r.ledger?.breakdown?.route,medals:r.ledger?.runMedals}),failures},null,2));
if(failures.length)throw new Error(`V11.3 audit failures: ${JSON.stringify(failures)}`);
