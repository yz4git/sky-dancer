import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire=createRequire(new URL("../.audit-runtime/package.json",import.meta.url));
const { chromium }=auditRequire("playwright-core");
const baseUrl=process.env.SKY_DANCER_AUDIT_URL||"http://127.0.0.1:4173";
const outputDir=process.env.SKY_DANCER_AUDIT_DIR||"artifacts/arcade-v94-all-stage-sweep";
const stages=[
  {id:"dawn-city",short:"CITY",name:"DAWN CITY"},
  {id:"red-canyon",short:"CANYON",name:"RED CANYON"},
  {id:"cloud-fleet",short:"FLEET",name:"CLOUD FLEET"},
  {id:"storm-carrier",short:"STORM",name:"STORM CARRIER"},
  {id:"desert-fortress",short:"DESERT",name:"DESERT FORTRESS"},
  {id:"ice-cavern",short:"ICE",name:"ICE CAVERN"},
  {id:"floating-ruins",short:"RUINS",name:"FLOATING RUINS"},
  {id:"night-metro",short:"METRO",name:"NIGHT METRO"},
  {id:"volcano-core",short:"VOLCANO",name:"VOLCANO CORE"},
  {id:"orbital-ascent",short:"ORBIT",name:"ORBITAL ASCENT"},
  {id:"prism-citadel",short:"CITADEL",name:"PRISM CITADEL"},
];
const allStageIds=stages.map(stage=>stage.id);
await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"]});
const diagnostics=[];
for(let index=0;index<stages.length;index++){
  const stage=stages[index];
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.addInitScript((ids)=>localStorage.setItem("sky-dancer-arcade-progress-v1",JSON.stringify({version:1,clearedStageIds:ids,unlockedStageIds:ids,records:{},bestRunScore:0,bestRunRank:"D",completedRuns:0,oneCreditClears:0})),allStageIds);
  const page=await context.newPage();page.setDefaultTimeout(30_000);page.setDefaultNavigationTimeout(30_000);
  const consoleErrors=[],pageErrors=[];page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});page.on("pageerror",e=>pageErrors.push(String(e)));
  try{
    await page.goto(`${baseUrl}?menu=1`,{waitUntil:"domcontentloaded"});
    await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({state:"visible"});
    const mode=page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first();
    await page.waitForFunction(()=>{const b=[...document.querySelectorAll('[aria-label="Select game mode"] button')].find(c=>c.textContent?.includes("STAGE PRACTICE"));return Boolean(b&&!b.disabled);});
    await mode.click();
    const practice=page.locator('[aria-label="Select practice stage"] button');let target=null;
    for(let i=0;i<await practice.count();i++){const b=practice.nth(i);if((await b.locator("strong").textContent())?.trim()===stage.short){target=b;break;}}
    if(!target)throw new Error(`${stage.short} practice stage not found`);
    await target.click();await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
    const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');await canvas.waitFor({state:"visible"});
    await page.waitForTimeout(2300);
    const file=`${String(index+1).padStart(2,"0")}-${stage.id}.png`;
    await canvas.screenshot({path:`${outputDir}/${file}`,timeout:60_000});
    const body=await page.locator("body").innerText();
    const hp=Number((body.match(/AIRFRAME\s*([0-9]+)%/i)||[0,0])[1]);
    const glState=await canvas.evaluate(element=>{const gl=element.getContext("webgl2")||element.getContext("webgl");const debug=gl?.getExtension("WEBGL_debug_renderer_info");return {webgl:Boolean(gl),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,renderer:debug&&gl?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};});
    const blockingConsoleErrors=consoleErrors.filter(m=>!/Failed to load resource:.*404/i.test(m));
    const record={...stage,file,stageVisible:body.includes(stage.name),hp,glState,blockingConsoleErrors,pageErrors,failed:/AIRFRAME LOST|MISSION FAILED/i.test(body)};
    diagnostics.push(record);console.log(`[v94-sweep] ${stage.id} hp=${hp}`);
  }catch(error){diagnostics.push({...stage,file:null,stageVisible:false,hp:0,glState:null,blockingConsoleErrors:consoleErrors,pageErrors:[...pageErrors,String(error)],failed:true});}
  await context.close();
}
await browser.close();
await writeFile(`${outputDir}/diagnostics.json`,JSON.stringify(diagnostics,null,2));
const invalid=diagnostics.filter(record=>!record.stageVisible||record.failed||record.hp<=0||!record.glState?.webgl||record.glState.width<800||record.glState.height<360||record.blockingConsoleErrors.length||record.pageErrors.length);
if(invalid.length)throw new Error(`Invalid stages: ${JSON.stringify(invalid)}`);
if(diagnostics.length!==stages.length)throw new Error(`Expected ${stages.length} stages, got ${diagnostics.length}`);
console.log(`[v94-sweep] complete ${diagnostics.length}/${stages.length}`);
