import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire=createRequire(new URL("../.audit-runtime/package.json",import.meta.url));
const { chromium }=auditRequire("playwright-core");
const baseUrl=process.env.SKY_DANCER_AUDIT_URL||"http://127.0.0.1:4173";
const outputDir=process.env.SKY_DANCER_AUDIT_DIR||"artifacts/arcade-v92-sweep";
const allStageIds=["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
const stages=[
  ["CITY","dawn-city","DAWN CITY"],
  ["CANYON","red-canyon","RED CANYON"],
  ["FLEET","cloud-fleet","CLOUD FLEET"],
  ["STORM","storm-carrier","STORM CARRIER"],
  ["DESERT","desert-fortress","DESERT FORTRESS"],
];
await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",headless:true,args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"]});
const diagnostics=[];
for(const [shortName,slug,fullName] of stages){
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.addInitScript((ids)=>localStorage.setItem("sky-dancer-arcade-progress-v1",JSON.stringify({version:1,clearedStageIds:ids,unlockedStageIds:ids,records:{},bestRunScore:0,bestRunRank:"D",completedRuns:0,oneCreditClears:0})),allStageIds);
  const page=await context.newPage();page.setDefaultTimeout(30_000);page.setDefaultNavigationTimeout(30_000);
  const consoleErrors=[],pageErrors=[];page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});page.on("pageerror",e=>pageErrors.push(String(e)));
  await page.goto(`${baseUrl}?menu=1`,{waitUntil:"domcontentloaded"});
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({state:"visible"});
  const mode=page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first();
  await page.waitForFunction(()=>{const b=[...document.querySelectorAll('[aria-label="Select game mode"] button')].find(c=>c.textContent?.includes("STAGE PRACTICE"));return Boolean(b&&!b.disabled);});
  await mode.click();
  const practice=page.locator('[aria-label="Select practice stage"] button');let target=null;
  for(let i=0;i<await practice.count();i++){const b=practice.nth(i);if((await b.locator("strong").textContent())?.trim()===shortName){target=b;break;}}
  if(!target)throw new Error(`${shortName} practice stage not found`);await target.click();
  await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
  const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');await canvas.waitFor({state:"visible"});
  const captures=[];const shot=async(label)=>{await canvas.screenshot({path:`${outputDir}/${slug}-${label}.png`,timeout:60_000});captures.push(label);};
  await page.waitForTimeout(900);await shot("00-entry");
  await page.waitForTimeout(2600);await shot("01-mid");
  await page.keyboard.down(" ");await page.waitForTimeout(950);await shot("02-turbo");await page.keyboard.up(" ");
  const body=await page.locator("body").innerText();const hp=Number((body.match(/AIRFRAME\s*([0-9]+)%/i)||[0,0])[1]);
  const glState=await canvas.evaluate(element=>{const gl=element.getContext("webgl2")||element.getContext("webgl");const debug=gl?.getExtension("WEBGL_debug_renderer_info");return {webgl:Boolean(gl),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,renderer:debug&&gl?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};});
  const blockingConsoleErrors=consoleErrors.filter(m=>!/Failed to load resource:.*404/i.test(m));
  const record={slug,stageVisible:body.includes(fullName),hp,glState,captures,blockingConsoleErrors,pageErrors,failed:/AIRFRAME LOST|MISSION FAILED/i.test(body)};
  diagnostics.push(record);
  if(!record.stageVisible||!glState.webgl||hp<=0||record.failed||blockingConsoleErrors.length||pageErrors.length)throw new Error(`Invalid ${slug}: ${JSON.stringify(record)}`);
  await context.close();
}
await writeFile(`${outputDir}/diagnostics.json`,JSON.stringify(diagnostics,null,2));await browser.close();
console.log(`[v92-sweep] complete / ${diagnostics.length} stages`);
