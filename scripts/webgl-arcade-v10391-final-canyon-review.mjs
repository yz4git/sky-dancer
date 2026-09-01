import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../.audit-runtime/node_modules/playwright-core/index.mjs';

const outDir=path.resolve('artifacts/arcade-v10391-final-canyon-review');
await fs.rm(outDir,{recursive:true,force:true});
await fs.mkdir(outDir,{recursive:true});

const browser=await chromium.launch({
  executablePath:process.env.SKY_DANCER_CHROME_PATH||'/usr/bin/google-chrome',
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist'],
});
const context=await browser.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,hasTouch:true,isMobile:false});
await context.addInitScript(()=>{
  const ids=['dawn-city','red-canyon','cloud-fleet','storm-carrier','desert-fortress','ice-cavern','floating-ruins','night-metro','volcano-core','orbital-ascent','prism-citadel'];
  const records=Object.fromEntries(ids.map(id=>[id,{clears:1,bestScore:25000,bestRank:'A',noDamage:false}]));
  localStorage.setItem('sky-dancer-arcade-progress-v2',JSON.stringify({version:2,clearedStageIds:ids,unlockedStageIds:ids,records,bestRunScore:180000,bestRunRank:'A',completedRuns:1,oneCreditClears:0,totalKills:120,totalNearMisses:40,totalBossKills:11,totalArmorBreaks:20,totalFormationBreaks:14,bestChain:12,bestRoute:['dawn-city','red-canyon','storm-carrier','ice-cavern','night-metro','orbital-ascent','prism-citadel'],bestRouteScore:180000,unlockedPaintSchemes:['default','sunset','storm','prism'],unlockedLoadouts:['standard','missile-focus','gun-focus']}));
});

const page=await context.newPage();
const consoleErrors=[];const pageErrors=[];
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));

await page.goto('http://127.0.0.1:4173/?menu=1&v10391-final-canyon=1',{waitUntil:'networkidle'});
await page.getByRole('dialog',{name:'Sky Dancer title screen'}).waitFor({state:'visible',timeout:20000});
await page.getByRole('button',{name:/STAGE PRACTICE/i}).click();
const stage=page.getByRole('button',{name:/CANYON/i}).first();
await stage.waitFor({state:'visible',timeout:10000});
await stage.click();
await page.getByRole('button',{name:/START STAGE PRACTICE/i}).click();
await page.getByRole('application',{name:'Flight stick'}).waitFor({state:'visible',timeout:20000});
await page.waitForTimeout(1400);
await page.screenshot({path:path.join(outDir,'canyon-01-entry.png')});

await page.keyboard.down('f');
await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1000);await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ArrowUp');await page.waitForTimeout(500);await page.keyboard.up('ArrowUp');
await page.keyboard.down('ArrowRight');await page.waitForTimeout(1350);await page.keyboard.up('ArrowRight');
await page.keyboard.up('f');
await page.keyboard.down('Shift');await page.keyboard.down('ArrowDown');await page.waitForTimeout(850);await page.keyboard.up('ArrowDown');await page.keyboard.up('Shift');
await page.waitForTimeout(550);
await page.screenshot({path:path.join(outDir,'canyon-02-turn.png')});

const metrics=await page.evaluate(()=>{
  const r=document.querySelector('canvas.sky-dancer-arcade-canvas')?.getBoundingClientRect();
  const renderer=[...document.querySelectorAll('span')].find(e=>(e.textContent||'').includes('3D FLIGHT')||(e.textContent||'').includes('COMPATIBILITY'))?.textContent||null;
  return {viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],canvas:r?[r.x,r.y,r.width,r.height]:null,renderer,bodySample:(document.body.innerText||'').slice(0,800)};
});
await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify({generatedAt:new Date().toISOString(),metrics,consoleErrors,pageErrors},null,2));
await browser.close();
