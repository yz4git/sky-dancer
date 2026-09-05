import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.cwd(), '.audit-runtime/node_modules/playwright-core'));
const outDir = path.join(process.cwd(), 'artifacts/sky-raid-v33-natural-entry');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error' && !/Failed to load resource:.*404/i.test(message.text())) errors.push(message.text());
});

await page.goto('http://127.0.0.1:4177/?menu=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.locator('button').filter({ hasText: 'SKY RAID' }).first().click();
await page.getByRole('button', { name: /START SKY RAID/i }).click();
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3000);

async function state(name) {
  const value = await page.evaluate(() => {
    const root = document.documentElement;
    const camera = typeof window.__skyRaidGetCameraPolish === 'function' ? window.__skyRaidGetCameraPolish() : null;
    return {
      act: root.dataset.skyRaidAct || '',
      entries: Number(root.dataset.skyRaidNaturalEntries || 0),
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
      camera,
    };
  });
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(value, null, 2));
  return value;
}

const opening = await state('01-opening-natural-entry');
const samples = [];
for (let i = 0; i < 8; i += 1) {
  try { await page.getByRole('button', { name: /Fire missile/i }).click({ timeout: 2500 }); } catch {}
  await page.waitForTimeout(520);
  const sample = await page.evaluate(() => {
    const data = typeof window.__skyRaidGetCameraPolish === 'function' ? window.__skyRaidGetCameraPolish() : null;
    return {
      entries: Number(document.documentElement.dataset.skyRaidNaturalEntries || 0),
      enemies: (data?.enemyScreenSamples || []).map((enemy) => ({ id: enemy.id, forward: enemy.forward, lateral: enemy.lateral, visible: enemy.visible })),
    };
  });
  samples.push(sample);
}
const combat = await state('02-combat-natural-entry');

let maxSameEnemyStep = 0;
for (let i = 1; i < samples.length; i += 1) {
  const previous = new Map(samples[i - 1].enemies.map((enemy) => [enemy.id, enemy]));
  for (const enemy of samples[i].enemies) {
    const before = previous.get(enemy.id);
    if (!before) continue;
    maxSameEnemyStep = Math.max(maxSameEnemyStep, Math.hypot(enemy.forward - before.forward, enemy.lateral - before.lateral));
  }
}

async function forceClock(seconds, name) {
  await page.evaluate((value) => { window.__skyRaidAuditElapsedSeconds = value; }, seconds);
  await page.waitForTimeout(1800);
  return state(name);
}
const s119 = await forceClock(119, '03-stage1-119s');
const s121 = await forceClock(121, '04-stage2-121s');
const s239 = await forceClock(239, '05-stage2-239s');
const s241 = await forceClock(241, '06-stage3-241s');

const report = { errors, opening, combat, samples, maxSameEnemyStep, s119, s121, s239, s241 };
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log('SKY RAID V33 NATURAL ENTRY PASS', JSON.stringify({
  errors,
  entriesOpening: opening.entries,
  entriesCombat: combat.entries,
  maxSameEnemyStep,
  acts: [s119.act, s121.act, s239.act, s241.act],
}));

if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
if (opening.entries < 4) throw new Error(`initial aircraft were not staged through natural entry: ${opening.entries}`);
if (maxSameEnemyStep > 28) throw new Error(`live aircraft position jump detected: ${maxSameEnemyStep.toFixed(2)}m`);
if (s119.act !== 'dawn-city' || s121.act !== 'red-canyon' || s239.act !== 'red-canyon' || s241.act !== 'cloud-fleet') {
  throw new Error(`opening stage pacing mismatch: ${[s119.act, s121.act, s239.act, s241.act].join(',')}`);
}
await browser.close();
