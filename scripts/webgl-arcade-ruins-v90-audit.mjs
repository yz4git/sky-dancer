import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const outputDir = process.env.SKY_DANCER_AUDIT_DIR || "artifacts/arcade-ruins-v90";
const allStageIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => {
  localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version: 1, clearedStageIds: ids, unlockedStageIds: ids, records: {}, bestRunScore: 0, bestRunRank: "D", completedRuns: 0, oneCreditClears: 0 }));
}, allStageIds);
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(30_000);
const consoleErrors = [], pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(String(error)));
await page.goto(`${baseUrl}?menu=1`, { waitUntil: "domcontentloaded" });
await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({ state: "visible" });
const mode = page.locator('[aria-label="Select game mode"] button').filter({ hasText: /STAGE PRACTICE/i }).first();
await page.waitForFunction(() => {
  const button = [...document.querySelectorAll('[aria-label="Select game mode"] button')].find((candidate) => candidate.textContent?.includes("STAGE PRACTICE"));
  return Boolean(button && !button.disabled);
});
await mode.click();
const practice = page.locator('[aria-label="Select practice stage"] button');
let target = null;
for(let i=0;i<await practice.count();i++){
  const button=practice.nth(i);
  if((await button.locator("strong").textContent())?.trim()==="RUINS"){target=button;break;}
}
if(!target)throw new Error("RUINS practice stage not found");
await target.click();
await page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first().click();
const canvas=page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
await canvas.waitFor({state:"visible"});
const captures=[];
const shot=async(label)=>{
  const path=`${outputDir}/${label}.png`;
  await canvas.screenshot({path,timeout:60_000});
  captures.push(label);
  console.log(`[v90-ruins] ${label}`);
};
await page.waitForTimeout(900); await shot("00-entry");
for(const [delay,label] of [[1700,"01-labyrinth-a"],[1800,"02-labyrinth-b"],[1900,"03-labyrinth-c"],[2000,"04-labyrinth-d"]]){
  await page.waitForTimeout(delay); await shot(label);
}
await page.keyboard.down(" "); await page.waitForTimeout(950); await shot("05-turbo"); await page.keyboard.up(" ");
const body=await page.locator("body").innerText();
const hp=Number((body.match(/AIRFRAME\s*([0-9]+)%/i)||[0,0])[1]);
const glState=await canvas.evaluate((element)=>{
  const gl=element.getContext("webgl2")||element.getContext("webgl");
  const debug=gl?.getExtension("WEBGL_debug_renderer_info");
  return {webgl:Boolean(gl),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height,
    renderer:debug&&gl?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};
});
const blockingConsoleErrors=consoleErrors.filter((message)=>!/Failed to load resource:.*404/i.test(message));
const diagnostics={stageVisible:body.includes("FLOATING RUINS"),hp,glState,captures,blockingConsoleErrors,pageErrors,failed:/AIRFRAME LOST|MISSION FAILED/i.test(body)};
await writeFile(`${outputDir}/diagnostics.json`,JSON.stringify(diagnostics,null,2));
await browser.close();
if(!diagnostics.stageVisible||!glState.webgl||glState.width<800||glState.height<360)throw new Error(`Invalid render: ${JSON.stringify(diagnostics)}`);
if(hp<=0||diagnostics.failed)throw new Error(`Airframe lost: ${JSON.stringify(diagnostics)}`);
if(captures.length!==6)throw new Error(`Missing captures: ${JSON.stringify(diagnostics)}`);
if(blockingConsoleErrors.length||pageErrors.length)throw new Error(`Browser errors: ${JSON.stringify(diagnostics)}`);
console.log(`[v90-ruins] complete / hp ${hp}`);
