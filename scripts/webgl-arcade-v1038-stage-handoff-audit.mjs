import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../.audit-runtime/node_modules/playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = "artifacts/arcade-v1038-stage-handoff-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless:true, executablePath:process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome", args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport:{ width:844,height:390 }, deviceScaleFactor:1, isMobile:true, hasTouch:true });
const page = await context.newPage();
const consoleErrors=[], pageErrors=[];
page.on("console",m=>{ if(m.type()==="error"&&!/Failed to load resource: the server responded with a status of 404/i.test(m.text()))consoleErrors.push(m.text()); });
page.on("pageerror",e=>pageErrors.push(String(e)));
await page.goto(`${baseUrl}?menu=1`,{waitUntil:"networkidle",timeout:60_000});
const arcade=page.locator("button").filter({hasText:/^\s*ARCADE RUN/i}).first(); if(await arcade.count())await arcade.click({force:true});
const start=page.locator("button").filter({hasText:/START/i}).last(); await start.waitFor({state:"visible",timeout:30_000}); await start.click({force:true});
const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]'); await canvas.waitFor({state:"visible",timeout:30_000});
await page.waitForFunction(()=>Boolean(globalThis.__skyDancerV1038HandoffAudit),null,{timeout:30_000});
const box=await canvas.boundingBox(); if(!box)throw new Error("missing canvas bounds");

const transitions=[
  {from:"dawn-city",to:"red-canyon",label:"city-canyon"},
  {from:"storm-carrier",to:"ice-cavern",label:"storm-ice"},
  {from:"volcano-core",to:"orbital-ascent",label:"volcano-orbit"},
  {from:"orbital-ascent",to:"prism-citadel",label:"orbit-citadel"},
];
const angle=(a,b)=>{const d=Math.min(1,Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]));return 2*Math.acos(d);};
const reports=[];
for(const transition of transitions){
  const pre=await page.evaluate(p=>globalThis.__skyDancerV1038HandoffAudit.prepare(p),transition);
  await page.screenshot({path:`${outputDir}/${transition.label}-before.png`,type:"png",clip:box});
  const frames=[];
  for(let i=0;i<45;i++){
    const state=await page.evaluate(()=>globalThis.__skyDancerV1038HandoffAudit.step());
    frames.push(state);
    if(i===0||i===7||i===29)await page.screenshot({path:`${outputDir}/${transition.label}-${String(i+1).padStart(2,"0")}.png`,type:"png",clip:box});
  }
  const deltas=[]; let previous=pre.cameraQuaternion;
  for(const frame of frames){deltas.push(angle(previous,frame.cameraQuaternion));previous=frame.cameraQuaternion;}
  reports.push({ ...transition, firstAngleStep:deltas[0], maxAngleStep:Math.max(...deltas), angleAt8:deltas[7], finalStage:frames.at(-1)?.stageId, backdropMoved:frames.some(f=>f.backdrop.some(v=>Math.abs(v)>1e-8)) });
}
await writeFile(`${outputDir}/diagnostics.json`,JSON.stringify({reports,consoleErrors,pageErrors},null,2));
await browser.close();
if(consoleErrors.length||pageErrors.length)throw new Error(JSON.stringify({consoleErrors,pageErrors}));
for(const report of reports){
  if(report.finalStage!==report.to)throw new Error(`${report.label}: handoff stage mismatch`);
  if(report.backdropMoved)throw new Error(`${report.label}: stable horizon moved`);
  if(report.firstAngleStep>.075)throw new Error(`${report.label}: first handoff angle step ${report.firstAngleStep}`);
  if(report.maxAngleStep>.085)throw new Error(`${report.label}: max handoff angle step ${report.maxAngleStep}`);
}
