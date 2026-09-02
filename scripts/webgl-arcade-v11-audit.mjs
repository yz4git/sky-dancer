import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v11-webgl";
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
const allIds = stages.map(s=>s.id);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"]});
const context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await context.addInitScript((ids)=>localStorage.setItem("sky-dancer-arcade-progress-v1",JSON.stringify({version:1,clearedStageIds:ids,unlockedStageIds:ids,records:{},bestRunScore:0,bestRunRank:"D",completedRuns:0,oneCreditClears:0})),allIds);
const report=[];
for(const c of stages){
  const page=await context.newPage();
  const errors=[]; const consoleErrors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
  await page.goto(`${baseUrl}?menu=1`,{waitUntil:"domcontentloaded"});
  const mode=page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first();
  await mode.waitFor({state:"visible"}); await mode.click();
  const practice=page.locator('[aria-label="Select practice stage"]'); await practice.waitFor({state:"visible"});
  await practice.locator("button").nth(c.index).click();
  await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
  const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
  await canvas.waitFor({state:"visible"});
  await page.waitForFunction(()=>Boolean(window.__skyDancerV11AuditDemo));
  await page.evaluate((progress)=>window.__skyDancerV11AuditDemo.runtime.triggerV11TimelineForTests(progress),c.progress);
  await page.waitForTimeout(220);
  const body=await page.locator("body").innerText();
  const telemetry=await page.evaluate((prefix)=>{
    const demo=window.__skyDancerV11AuditDemo; const s=demo.getSnapshot();
    const matches=[];
    demo.scene.traverse(o=>{if(prefix&&o.visible&&o.name.startsWith(prefix))matches.push({name:o.name,pos:[o.position.x,o.position.y,o.position.z],abs:o.userData.arcadeV11AbsoluteCourseDistance,depth:o.userData.arcadeV11RelativeDepth});});
    return {stage:s.stage.id,beat:s.timelineBeatLabel,setpiece:s.timelineSetpiece,distance:s.distance,matches};
  },c.object||null);
  let anchorSpread=null;
  if(c.object){
    const samples=[];
    await page.keyboard.down(" ");
    for(let i=0;i<8;i++){
      const sample=await page.evaluate((prefix)=>{
        const demo=window.__skyDancerV11AuditDemo; const s=demo.getSnapshot(); let target=null;
        demo.scene.traverse(o=>{if(!target&&o.visible&&o.name.startsWith(prefix))target=o;});
        return target?{distance:s.distance,depth:target.userData.arcadeV11RelativeDepth,absolute:s.distance+target.userData.arcadeV11RelativeDepth,name:target.name}:null;
      },c.object);
      if(sample)samples.push(sample);
      await page.waitForTimeout(55);
    }
    await page.keyboard.up(" ");
    const absolutes=samples.map(s=>s.absolute);
    anchorSpread=absolutes.length?Math.max(...absolutes)-Math.min(...absolutes):null;
  }
  await canvas.screenshot({path:`${out}/${String(c.index+1).padStart(2,"0")}-${c.id}.png`});
  const row={...c,telemetry,anchorSpread,errors,consoleErrors,stageVisible:body.includes(c.name),beatVisible:body.includes(c.beat)};
  report.push(row);
  if(!row.stageVisible||!row.beatVisible||errors.length||consoleErrors.length)throw new Error(JSON.stringify(row));
  if(c.object&&(telemetry.matches.length<2||anchorSpread===null||anchorSpread>.03))throw new Error(JSON.stringify(row));
  await page.close();
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report.map(r=>({stage:r.id,beat:r.beat,objects:r.telemetry.matches.length,anchorSpread:r.anchorSpread,errors:r.errors.length+ r.consoleErrors.length})),null,2));
