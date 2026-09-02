import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const auditRequire=createRequire(new URL("../.audit-runtime/package.json",import.meta.url));
const {chromium}=auditRequire("playwright-core");
const baseUrl=process.env.SKY_DANCER_AUDIT_URL||"http://127.0.0.1:4173";
const out="artifacts/v113-anchor-audit";
const cases=[
 {id:"cloud-fleet",index:2,progress:.35,prefix:"arcade-v11-cloud-deck-section-",beat:"DECK RUN"},
 {id:"night-metro",index:7,progress:.36,prefix:"arcade-v11-night-gantry-section-",beat:"NEON GANTRY"},
];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"]});
const context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
 const ids=["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
 const records=Object.fromEntries(ids.map(id=>[id,{clears:1,bestScore:0,bestRank:"D",noDamage:false,medals:[]} ]));
 localStorage.setItem("sky-dancer-arcade-progress-v2",JSON.stringify({version:2,clearedStageIds:ids,unlockedStageIds:ids,records,unlockedPaintSchemes:["default"],unlockedLoadouts:["standard"]}));
});
async function enter(page,c){
 await page.goto(`${baseUrl}?menu=1`,{waitUntil:"domcontentloaded"});
 const mode=page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first(); await mode.waitFor({state:"visible"}); await mode.click();
 const selector=page.locator('[aria-label="Select practice stage"]'); await selector.waitFor({state:"visible"}); await selector.locator("button").nth(c.index).click();
 await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
 await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
 await page.waitForFunction(()=>Boolean(window.__skyDancerV113AnchorAuditDemo));
}
const report=[];
for(const c of cases){
 const page=await context.newPage(); const pageErrors=[]; page.on("pageerror",e=>pageErrors.push(String(e)));
 await enter(page,c);
 const initial=await page.evaluate(({progress,prefix})=>{
  const demo=window.__skyDancerV113AnchorAuditDemo; demo.runtime.triggerV11TimelineForTests(progress); const s=demo.runtime.getSnapshot(); demo.v11Setpieces.update(s); demo.onSnapshot(s);
  const choices=[]; demo.scene.traverse(o=>{if(o.visible&&o.name.startsWith(prefix))choices.push({name:o.name,abs:o.userData.arcadeV11AbsoluteCourseDistance,depth:o.userData.arcadeV11RelativeDepth});});
  choices.sort((a,b)=>Math.abs(a.depth-35)-Math.abs(b.depth-35));
  return {stage:s.stage.id,beat:s.timelineBeatLabel,distance:s.distance,target:choices[0]??null,visibleCount:choices.length};
 },c);
 if(!initial.target)throw new Error(`No visible target ${JSON.stringify(initial)}`);
 const samples=[];
 await page.evaluate(()=>window.__skyDancerV113AnchorAuditDemo.setTurbo(true));
 for(let i=0;i<14;i++){
  await page.waitForTimeout(65);
  samples.push(await page.evaluate(name=>{
   const demo=window.__skyDancerV113AnchorAuditDemo; const s=demo.runtime.getSnapshot(); demo.v11Setpieces.update(s); const o=demo.scene.getObjectByName(name);
   if(!o)return null;
   return {distance:s.distance,abs:o.userData.arcadeV11AbsoluteCourseDistance,depth:o.userData.arcadeV11RelativeDepth,visible:o.visible,closure:(o.userData.arcadeV11AbsoluteCourseDistance-o.userData.arcadeV11RelativeDepth)-s.distance};
  },initial.target.name));
 }
 await page.evaluate(()=>window.__skyDancerV113AnchorAuditDemo.setTurbo(false));
 await page.screenshot({path:`${out}/${c.id}.png`,fullPage:false});
 const valid=samples.filter(Boolean); const absValues=valid.map(s=>s.abs); const closures=valid.map(s=>Math.abs(s.closure));
 const absoluteSpread=Math.max(...absValues)-Math.min(...absValues); const maxClosure=Math.max(...closures);
 const row={...c,initial,targetName:initial.target.name,absoluteSpread,maxClosure,samples:valid,pageErrors}; report.push(row);
 if(initial.stage!==c.id||initial.beat!==c.beat||initial.visibleCount<2||valid.length!==14||absoluteSpread>1e-8||maxClosure>1e-8||pageErrors.length)throw new Error(JSON.stringify(row));
 await page.close();
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report.map(r=>({stage:r.id,target:r.targetName,visible:r.initial.visibleCount,absoluteSpread:r.absoluteSpread,maxClosure:r.maxClosure})),null,2));
