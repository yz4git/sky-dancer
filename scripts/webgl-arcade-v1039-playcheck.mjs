import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../.audit-runtime/node_modules/playwright-core/index.mjs';

const outDir = path.resolve('artifacts/arcade-v1039-playcheck');
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, hasTouch: true, isMobile: false });
await context.addInitScript(() => {
  const ids = ['dawn-city','red-canyon','cloud-fleet','storm-carrier','desert-fortress','ice-cavern','floating-ruins','night-metro','volcano-core','orbital-ascent','prism-citadel'];
  const records = Object.fromEntries(ids.map((id) => [id, { clears: 1, bestScore: 25000, bestRank: 'A', noDamage: false }]));
  localStorage.setItem('sky-dancer-arcade-progress-v2', JSON.stringify({ version:2, clearedStageIds:ids, unlockedStageIds:ids, records, bestRunScore:180000, bestRunRank:'A', completedRuns:1, oneCreditClears:0, totalKills:120, totalNearMisses:40, totalBossKills:11, totalArmorBreaks:20, totalFormationBreaks:14, bestChain:12, bestRoute:['dawn-city','red-canyon','storm-carrier','ice-cavern','night-metro','orbital-ascent','prism-citadel'], bestRouteScore:180000, unlockedPaintSchemes:['default','sunset','storm','prism'], unlockedLoadouts:['standard','missile-focus','gun-focus'] }));
});
const page = await context.newPage();
const consoleErrors = [], pageErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => pageErrors.push(String(err?.stack || err)));
const base = 'http://127.0.0.1:4173/?menu=1&v1039-playcheck=1';
async function openMenu(){ await page.goto(base,{waitUntil:'networkidle'}); await page.getByRole('dialog',{name:'Sky Dancer title screen'}).waitFor({state:'visible',timeout:20000}); }
async function screenshot(name){ await page.screenshot({path:path.join(outDir,`${name}.png`)}); }
async function metrics(label){ return await page.evaluate((label)=>{ const rect=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}; const byText=(selector,text)=>[...document.querySelectorAll(selector)].find((el)=>(el.textContent||'').includes(text)); const canvas=document.querySelector('canvas.sky-dancer-arcade-canvas'); const stick=document.querySelector('[role="application"][aria-label="Flight stick"]'); const fire=byText('button','FIRE'),lock=byText('button','LOCK'),turbo=byText('button','TURBO'); const renderer=[...document.querySelectorAll('span')].find((el)=>(el.textContent||'').includes('3D FLIGHT')||(el.textContent||'').includes('COMPATIBILITY')); return{label,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,x:scrollX,y:scrollY},canvas:rect(canvas),stick:rect(stick),fire:rect(fire),lock:rect(lock),turbo:rect(turbo),renderer:renderer?.textContent||null,stageText:document.querySelector('header strong')?.textContent||null,bodyTextSample:(document.body.innerText||'').slice(0,1200)};},label); }
async function hold(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
async function playPattern(){await page.keyboard.down('f');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(850);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowUp');await page.waitForTimeout(550);await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');await page.keyboard.up('f');await hold('e',700);await page.keyboard.down('Shift');await page.keyboard.down('ArrowDown');await page.waitForTimeout(850);await page.keyboard.up('ArrowDown');await page.keyboard.up('Shift');await page.waitForTimeout(600);}
const cases=[['city','CITY'],['canyon','CANYON'],['ice','ICE'],['night','METRO'],['volcano','VOLCANO'],['orbit','ORBIT'],['citadel','CITADEL']];
const report={generatedAt:new Date().toISOString(),cases:[],consoleErrors,pageErrors};
await openMenu();await screenshot('00-title');
for(const [label,shortName] of cases){await openMenu();await page.getByRole('button',{name:/STAGE PRACTICE/i}).click();const stageButton=page.getByRole('button',{name:new RegExp(shortName,'i')}).first();await stageButton.waitFor({state:'visible',timeout:10000});await stageButton.click();await page.getByRole('button',{name:/START STAGE PRACTICE/i}).click();await page.getByRole('application',{name:'Flight stick'}).waitFor({state:'visible',timeout:20000});await page.waitForTimeout(1400);const before=await metrics(`${label}-before`);await screenshot(`${label}-01`);await playPattern();const after=await metrics(`${label}-after`);await screenshot(`${label}-02`);report.cases.push({label,shortName,before,after});}
report.consoleErrors=consoleErrors;report.pageErrors=pageErrors;await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify(report,null,2));await browser.close();
