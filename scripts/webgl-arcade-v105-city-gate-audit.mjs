import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const auditRequire = createRequire(new URL("../.audit-runtime/package.json", import.meta.url));
const { chromium } = auditRequire("playwright-core");
const baseUrl = process.env.SKY_DANCER_AUDIT_URL || "http://127.0.0.1:4173";
const out = "artifacts/v105-city-gate";
const allIds = ["dawn-city","red-canyon","cloud-fleet","storm-carrier","desert-fortress","ice-cavern","floating-ruins","night-metro","volcano-core","orbital-ascent","prism-citadel"];
const cases = [
  { id: "dawn-city", index: 0, name: "DAWN CITY", identity: "city-gantry" },
  { id: "night-metro", index: 7, name: "NIGHT METRO", identity: "neon-gantry" },
];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.SKY_DANCER_CHROME_PATH || "/usr/bin/google-chrome", headless: true, args: ["--use-angle=swiftshader","--enable-webgl","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await context.addInitScript((ids) => localStorage.setItem("sky-dancer-arcade-progress-v1", JSON.stringify({ version:1, clearedStageIds:ids, unlockedStageIds:ids, records:{}, bestRunScore:0, bestRunRank:"D", completedRuns:0, oneCreditClears:0 })), allIds);
const report = [];
for (const c of cases) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`${baseUrl}?menu=1`, { waitUntil:"domcontentloaded" });
  const mode = page.locator('[aria-label="Select game mode"] button').filter({ hasText:/STAGE PRACTICE/i }).first();
  await mode.waitFor({ state:"visible" }); await mode.click();
  const practice = page.locator('[aria-label="Select practice stage"]'); await practice.waitFor({ state:"visible" });
  await practice.locator("button").nth(c.index).click();
  await page.locator("button").filter({ hasText:/START STAGE PRACTICE/i }).first().click();
  const canvas = page.locator('canvas[aria-label="Sky Dancer Arcade Run WebGL game view"]'); await canvas.waitFor({ state:"visible" });
  await page.waitForFunction(() => Boolean(window.__skyDancerV105GateDemo));
  const targetId = await page.evaluate(() => {
    const demo = window.__skyDancerV105GateDemo;
    demo.runtime.spawnHazardPattern("arch");
    const list = demo.getSnapshot().hazards.filter(h => h.kind === "arch");
    return list[list.length - 1]?.id ?? null;
  });
  if (targetId === null) throw new Error(`${c.id}: no forced arch`);
  await page.waitForTimeout(120);
  await canvas.screenshot({ path:`${out}/${c.id}-gate-a.png` });
  const samples = [];
  await page.keyboard.down(" ");
  for (let i=0;i<10;i++) {
    const sample = await page.evaluate((id) => {
      const demo = window.__skyDancerV105GateDemo; const s=demo.getSnapshot(); const h=s.hazards.find(x=>x.id===id); const g=demo.hazardGroups.get(id);
      return h&&g ? { distance:s.distance, depth:h.depth, anchor:s.distance+h.depth, identity:g.userData.arcadeHazardIdentityV105, anchored:g.userData.arcadeWorldAnchoredHazardV105===true, position:[g.position.x,g.position.y,g.position.z], rotation:[g.rotation.x,g.rotation.y,g.rotation.z] } : null;
    }, targetId);
    if (sample) samples.push(sample);
    await page.waitForTimeout(65);
  }
  await page.keyboard.up(" ");
  await canvas.screenshot({ path:`${out}/${c.id}-gate-b.png` });
  const anchors=samples.map(s=>s.anchor); const spread=Math.max(...anchors)-Math.min(...anchors);
  const body=await page.locator("body").innerText();
  const row={...c,targetId,samples,spread,errors,stageVisible:body.includes(c.name)}; report.push(row);
  if (!row.stageVisible || samples.length<5 || !samples.every(s=>s.anchored) || !samples.every(s=>s.identity===c.identity) || spread>0.02 || errors.length) throw new Error(JSON.stringify(row));
  await page.close();
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report.map(r=>({stage:r.id,identity:r.identity,spread:r.spread,samples:r.samples.length})),null,2));
