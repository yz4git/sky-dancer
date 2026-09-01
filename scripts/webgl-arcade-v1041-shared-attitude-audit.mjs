import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { chromium }=require("../.audit-runtime/node_modules/playwright-core");
const out="artifacts/arcade-v1041-shared-attitude";
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SKY_DANCER_CHROME_PATH||"/usr/bin/google-chrome",args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage","--no-sandbox"]});
const context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await context.newPage();
const consoleErrors=[],pageErrors=[],httpErrors=[];
page.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource: the server responded with a status of 404/i.test(m.text()))consoleErrors.push(m.text());});
page.on("pageerror",e=>pageErrors.push(String(e?.stack||e)));
page.on("response",r=>{if(r.status()>=400)httpErrors.push({status:r.status(),url:r.url()});});
await page.goto("http://127.0.0.1:4173/?menu=1&v1041-audit=1",{waitUntil:"networkidle",timeout:60000});
const arcade=page.locator("button").filter({hasText:/^\s*ARCADE RUN/i}).first();if(await arcade.count())await arcade.click({force:true});
const start=page.locator("button").filter({hasText:/START/i}).last();await start.waitFor({state:"visible",timeout:30000});await start.click({force:true});
const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');await canvas.waitFor({state:"visible",timeout:30000});
await page.waitForFunction(()=>Boolean(globalThis.__skyDancerV1041Audit),null,{timeout:30000});
const box=await canvas.boundingBox();if(!box)throw new Error("no canvas box");
const cases=[
 {stageId:"dawn-city",label:"city",progress:.285,moveX:1,moveY:.25,turbo:false},
 {stageId:"red-canyon",label:"canyon",progress:.315,moveX:-1,moveY:-.25,turbo:true},
 {stageId:"night-metro",label:"night",progress:.305,moveX:1,moveY:.35,turbo:true},
 {stageId:"volcano-core",label:"volcano",progress:.292,moveX:-1,moveY:-.3,turbo:false},
 {stageId:"orbital-ascent",label:"orbit",progress:.318,moveX:1,moveY:.2,turbo:true},
 {stageId:"ice-cavern",label:"ice",progress:.302,moveX:-1,moveY:.3,turbo:false},
];
const offsets=[0,.006,.012,.018],samples=[];
for(const seq of cases)for(let frame=0;frame<offsets.length;frame++){
 const params={...seq,progress:seq.progress+offsets[frame],frame};
 const state=await page.evaluate(p=>globalThis.__skyDancerV1041Audit.sample(p),params);samples.push({...params,...state});
 await page.screenshot({path:`${out}/${seq.label}-${String(frame+1).padStart(2,"0")}.png`,type:"png",clip:box});
}
const optional=({status,url})=>status===404&&/\/(?:favicon\.ico|apple-touch-icon(?:-[^/]*)?\.png)$/i.test(new URL(url).pathname);
const blockingHttpErrors=httpErrors.filter(e=>!optional(e));
await writeFile(`${out}/diagnostics.json`,JSON.stringify({samples,consoleErrors,pageErrors,httpErrors,blockingHttpErrors},null,2));
await browser.close();
if(consoleErrors.length||pageErrors.length||blockingHttpErrors.length)throw new Error(JSON.stringify({consoleErrors,pageErrors,blockingHttpErrors}));
for(const s of samples){if(!s.shared||s.chunkCount!==8||!s.finite)throw new Error(`${s.label}-${s.frame} shared attitude invalid`);if(s.maxAttitudeDelta>1e-8)throw new Error(`${s.label}-${s.frame} chunk/backdrop attitude delta ${s.maxAttitudeDelta}`);}
