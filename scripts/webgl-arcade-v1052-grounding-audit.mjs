import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v1052-grounding";
const allIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
const cases = [
  { id:"dawn-city", index:0, name:"DAWN CITY", kind:"arch", identity:"city-gantry" },
  { id:"dawn-city", index:0, name:"DAWN CITY", kind:"tower", identity:"city-pylon" },
  { id:"night-metro", index:7, name:"NIGHT METRO", kind:"arch", identity:"neon-gantry" },
  { id:"night-metro", index:7, name:"NIGHT METRO", kind:"tower", identity:"neon-pylon" },
];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"]});
const context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await context.addInitScript((ids)=>localStorage.setItem("sky-dancer-arcade-progress-v1",JSON.stringify({version:1,clearedStageIds:ids,unlockedStageIds:ids,records:{},bestRunScore:0,bestRunRank:"D",completedRuns:0,oneCreditClears:0})),allIds);
const report=[];
for(const [caseIndex,c] of cases.entries()){
  const page=await context.newPage();
  const errors=[]; page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(`${baseUrl}?menu=1`,{waitUntil:"domcontentloaded"});
  const mode=page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first();
  await mode.waitFor({state:"visible"}); await mode.click();
  const practice=page.locator('[aria-label="Select practice stage"]'); await practice.waitFor({state:"visible"});
  await practice.locator("button").nth(c.index).click();
  await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
  const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]'); await canvas.waitFor({state:"visible"});
  await page.waitForFunction(()=>Boolean(window.__skyDancerV1052GroundDemo));
  const targetId=await page.evaluate((kind)=>{
    const demo=window.__skyDancerV1052GroundDemo;
    demo.runtime.spawnHazardPattern(kind);
    const matches=demo.runtime.hazards.filter(h=>h.kind===kind);
    const h=matches[matches.length-1];
    if(!h)return null;
    const s=demo.getSnapshot();
    h.x=kind==="arch"?0:.65; h.y=0; h.depth=46; h.courseAnchorDistance=s.distance+46;
    return h.id;
  },c.kind);
  if(targetId===null)throw new Error(`${c.id}/${c.kind}: no forced hazard`);
  await page.waitForTimeout(220);
  const inspect=async()=>page.evaluate((id)=>{
    const demo=window.__skyDancerV1052GroundDemo; const s=demo.getSnapshot(); const h=s.hazards.find(x=>x.id===id); const g=demo.hazardGroups.get(id);
    if(!h||!g)return null;
    const connectors=[];
    g.traverse(o=>{if(o.isMesh&&o.userData.arcadeGroundConnectorV1052===true){
      const baseHeight=Number(o.userData.arcadeGroundConnectorBaseHeightV1052); const baseScale=Number(o.userData.arcadeGroundConnectorBaseScaleYV1052);
      const height=baseHeight*o.scale.y/baseScale; const bottom=o.position.y-height*.5; const top=o.position.y+height*.5;
      connectors.push({bottom,top,target:Number(g.userData.arcadeGroundLocalYV1052),height,baseHeight});
    }});
    return {distance:s.distance,depth:h.depth,anchor:s.distance+h.depth,identity:g.userData.arcadeHazardIdentityV105,grounded:g.userData.arcadeGroundConnectedV1052===true,connectorCount:g.userData.arcadeGroundConnectorCountV1052,connectors,position:[g.position.x,g.position.y,g.position.z]};
  },targetId);
  const a=await inspect();
  await canvas.screenshot({path:`${out}/${String(caseIndex+1).padStart(2,"0")}-${c.id}-${c.kind}-a.png`});
  await page.keyboard.down(" "); await page.waitForTimeout(620); await page.keyboard.up(" "); await page.waitForTimeout(100);
  const b=await inspect();
  await canvas.screenshot({path:`${out}/${String(caseIndex+1).padStart(2,"0")}-${c.id}-${c.kind}-b.png`});
  const row={...c,targetId,a,b,errors}; report.push(row);
  for(const sample of [a,b]){
    if(!sample||sample.identity!==c.identity||!sample.grounded||sample.connectorCount<1)throw new Error(JSON.stringify(row));
    for(const con of sample.connectors){
      if(Math.abs(con.bottom-con.target)>.002)throw new Error(`ground gap ${c.id}/${c.kind}: ${JSON.stringify(con)}`);
      if(con.height<con.baseHeight)throw new Error(`connector shrank ${c.id}/${c.kind}: ${JSON.stringify(con)}`);
    }
  }
  if(Math.abs(a.anchor-b.anchor)>.03||errors.length)throw new Error(JSON.stringify(row));
  await page.close();
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report.map(r=>({stage:r.id,kind:r.kind,identity:r.identity,connectors:r.a.connectorCount,gap:Math.max(...r.a.connectors.map(c=>Math.abs(c.bottom-c.target))),anchorDelta:Math.abs(r.a.anchor-r.b.anchor)})),null,2));
