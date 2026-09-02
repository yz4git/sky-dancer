import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v120-combat-director";
const stages = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
await mkdir(out,{recursive:true});

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args:["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport:{width:852,height:393}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const report={viewport:{width:852,height:393,dpr:2},modes:{},pageErrors:[],criticalResponses:[],failures:[]};
const progress={
  version:2,clearedStageIds:stages,unlockedStageIds:stages,
  records:Object.fromEntries(stages.map(id=>[id,{clears:2,bestScore:18000,bestRank:"A",noDamage:true,medals:["score","signature","no-damage"]}])),
  bestRunScore:72000,bestRunRank:"S",completedRuns:2,oneCreditClears:1,totalKills:140,totalNearMisses:30,totalBossKills:12,
  totalArmorBreaks:24,totalFormationBreaks:18,bestChain:14,bestRoute:["dawn-city","cloud-fleet"],bestRouteScore:72000,totalMedals:33,recentRoutes:[],
  unlockedPaintSchemes:["default","sunset","storm","prism"],unlockedLoadouts:["standard","missile-focus","gun-focus"],selectedPaintScheme:"prism",selectedLoadout:"standard",
};

async function openSortie(tag){
  const page=await context.newPage();
  page.on("pageerror",e=>report.pageErrors.push(`${tag}: ${String(e)}`));
  page.on("response",r=>{const t=r.request().resourceType();if(r.status()>=400&&["document","script","stylesheet","font","xhr","fetch"].includes(t))report.criticalResponses.push({tag,status:r.status(),url:r.url(),type:t});});
  await page.addInitScript(value=>localStorage.setItem("sky-dancer-arcade-progress-v2",JSON.stringify(value)),progress);
  await page.goto(`${baseUrl}?menu=1&v120=${tag}`,{waitUntil:"domcontentloaded"});
  await page.locator('[aria-label="Sky Dancer title screen"]').waitFor({state:"visible"});
  await page.locator('[aria-label="Select game mode"] button').filter({hasText:/STAGE PRACTICE/i}).first().click();
  const start=page.locator("button").filter({hasText:/START STAGE PRACTICE/i}).first();
  await start.waitFor({state:"visible"});
  await start.click();
  await page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]').waitFor({state:"visible"});
  await page.waitForFunction(()=>Boolean(window.__skyDancerV120AuditDemo));
  await page.evaluate(()=>window.__skyDancerV120AuditDemo.pause());
  return page;
}

async function forcePlan(page,signals){
  return page.evaluate((s)=>{
    const d=window.__skyDancerV120AuditDemo;
    d.runtime.enemies.length=0;
    d.runtime.projectiles.length=0;
    d.runtime.hazards.length=0;
    d.runtime.setV12DirectorSignalsForTests(s.gun,s.missile,s.turbo,s.damage,s.hp);
    d.runtime.spawnV12EncounterForTests();
    const snapshot=d.runtime.getSnapshot();
    d.sync(snapshot,1/60);
    d.cinematic.render(d.scene,d.camera,snapshot.turboActive,d.presentationFx);
    d.onSnapshot(snapshot);
    d.previousSnapshot=snapshot;
    return snapshot;
  },signals);
}

async function inspect(page){
  await page.waitForTimeout(80);
  return page.evaluate(()=>{
    const d=window.__skyDancerV120AuditDemo;
    const s=d.runtime.getSnapshot();
    const canvas=document.querySelector('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]');
    const gl=canvas?.getContext("webgl2")||canvas?.getContext("webgl");
    const director=document.querySelector('[data-director]');
    const controls=document.querySelector('[aria-label="Arcade combat controls"]');
    const rect=el=>{const r=el?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;};
    return {
      renderer:gl?"webgl":"missing",width:canvas?.clientWidth??0,height:canvas?.clientHeight??0,
      scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
      mode:s.combatDirectorMode,style:s.combatDirectorPlayerStyle,label:s.combatDirectorLabel,intent:s.combatDirectorIntent,
      pressure:s.combatDirectorPressure,intensity:s.combatDirectorIntensity,waveSerial:s.combatDirectorWaveSerial,
      enemyCount:s.enemies.length,enemyKinds:s.enemies.map(x=>x.kind),maneuvers:s.enemies.map(x=>x.maneuver),
      directorText:director?.textContent??"",directorRect:rect(director),controlsRect:rect(controls),hp:s.playerHp,
    };
  });
}

function validate(tag,state,expected){
  if(state.renderer!=="webgl"||state.width!==852||state.height!==393)report.failures.push(`${tag} renderer/viewport ${JSON.stringify(state)}`);
  if(state.scrollWidth>852||state.scrollHeight>393)report.failures.push(`${tag} overflow ${state.scrollWidth}x${state.scrollHeight}`);
  if(state.mode!==expected.mode||state.style!==expected.style)report.failures.push(`${tag} plan ${state.mode}/${state.style}`);
  if(!state.directorText.includes("COMBAT DIRECTOR")||!state.directorText.includes(expected.label))report.failures.push(`${tag} HUD ${state.directorText}`);
  const a=state.directorRect,b=state.controlsRect;
  if(!a||a.top<0||a.bottom>393||a.left<0||a.right>852)report.failures.push(`${tag} director clipped ${JSON.stringify(a)}`);
  if(a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom))report.failures.push(`${tag} director overlaps controls`);
  if(state.waveSerial<1||state.enemyCount<2||state.enemyCount>6)report.failures.push(`${tag} encounter density ${state.enemyCount}`);
}

const cases=[
  {tag:"armor",file:"01-armor-screen.png",signals:{gun:2.55,missile:.12,turbo:.1,damage:0,hp:1},expected:{mode:"armor-screen",style:"gun",label:"ARMOR SCREEN"}},
  {tag:"hunter",file:"02-hunter-sweep.png",signals:{gun:.12,missile:2.55,turbo:.1,damage:0,hp:1},expected:{mode:"hunter-sweep",style:"missile",label:"HUNTER SWEEP"}},
  {tag:"jammer",file:"03-jammer-net.png",signals:{gun:.12,missile:.1,turbo:2.55,damage:0,hp:1},expected:{mode:"jammer-net",style:"turbo",label:"JAMMER NET"}},
  {tag:"relief",file:"04-relief-window.png",signals:{gun:2.55,missile:.1,turbo:.1,damage:1.4,hp:.25},expected:{mode:"relief-window",style:"recover",label:"RELIEF WINDOW"}},
];

try{
  for(const c of cases){
    const page=await openSortie(c.tag);
    await forcePlan(page,c.signals);
    const state=await inspect(page);
    validate(c.tag,state,c.expected);
    report.modes[c.tag]=state;
    await page.screenshot({path:`${out}/${c.file}`});
    await page.close();
  }
  const armor=report.modes.armor,relief=report.modes.relief;
  if(armor&&relief&&!(relief.enemyCount<armor.enemyCount))report.failures.push(`relief density not lower ${relief.enemyCount} vs armor ${armor.enemyCount}`);
  if(relief&&!relief.directorText.includes("REBUILD TURBO"))report.failures.push("relief recovery intent missing");
}catch(error){report.failures.push(String(error));}

if(report.pageErrors.length)report.failures.push(`pageErrors ${report.pageErrors.length}`);
if(report.criticalResponses.length)report.failures.push(`criticalResponses ${report.criticalResponses.length}`);
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report,null,2));
if(report.failures.length)throw new Error(`V12.0 Combat Director audit failures: ${JSON.stringify(report.failures)}`);
