import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.cwd(), '.audit-runtime/node_modules/playwright-core'));
const outDir = path.join(process.cwd(), 'artifacts/sky-raid-v32-playcheck');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.SKY_DANCER_CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error' && !/Failed to load resource:.*404/i.test(message.text())) errors.push(message.text());
});

await page.goto('http://127.0.0.1:4176/?menu=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate(() => {
  window.__v32Snapshots = [];
  window.addEventListener('sky-dancer-sky-raid-snapshot', (event) => {
    const detail = event?.detail;
    if (detail && typeof detail === 'object') window.__v32Snapshots.push(detail);
    if (window.__v32Snapshots.length > 240) window.__v32Snapshots.splice(0, window.__v32Snapshots.length - 240);
  });
});
await page.locator('button').filter({ hasText: 'SKY RAID' }).first().click();
await page.getByRole('button', { name: /START SKY RAID/i }).click();
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3500);

async function capture(name) {
  const state = await page.evaluate(() => {
    const root = document.documentElement;
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll('button')]
      .filter((button) => {
        const r = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return r.width > 2 && r.height > 2 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((button) => {
        const r = button.getBoundingClientRect();
        return { text: (button.textContent || '').trim(), x: r.x, y: r.y, width: r.width, height: r.height };
      });
    let webgl = null;
    if (canvas) {
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          webgl = {
            version: gl.getParameter(gl.VERSION),
            renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          };
        }
      } catch {}
    }
    const snapshots = window.__v32Snapshots || [];
    return {
      canvas: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      mode: root.dataset.skyDancerMode || '',
      act: root.dataset.skyRaidAct || '',
      formation: root.dataset.skyRaidFormationBeat || '',
      doctrine: root.dataset.skyRaidCombatDoctrine || '',
      enemyClasses: root.dataset.skyRaidEnemyClasses || '',
      enemyPackage: root.dataset.skyRaidEnemyPackage || '',
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1800),
      buttons,
      webgl,
      latestSnapshot: snapshots.at(-1) || null,
    };
  });
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(state, null, 2));
  return state;
}

const opening = await capture('01-opening');

async function clickControl(pattern, count = 1, delay = 320) {
  const locator = page.getByRole('button', { name: pattern }).first();
  if (!(await locator.count())) return 0;
  let done = 0;
  for (let i = 0; i < count; i += 1) {
    try {
      await locator.click({ timeout: 2500 });
      done += 1;
    } catch {}
    await page.waitForTimeout(delay);
  }
  return done;
}

const shotClicks = await clickControl(/^SHOT$/i, 8, 260);
const missileClicks = await clickControl(/MISSILE/i, 3, 420);
const turbo = page.getByRole('button', { name: /TURBO/i }).first();
let turboHeld = false;
if (await turbo.count()) {
  try {
    await turbo.dispatchEvent('pointerdown', { pointerId: 71, pointerType: 'touch', isPrimary: true, buttons: 1 });
    await page.waitForTimeout(700);
    await turbo.dispatchEvent('pointerup', { pointerId: 71, pointerType: 'touch', isPrimary: true, buttons: 0 });
    turboHeld = true;
  } catch {}
}

// Exercise the lower-left virtual stick with a real pointer drag. Coordinates are
// intentionally based on the actual 844x390 phone viewport rather than a test hook.
await page.mouse.move(105, 304);
await page.mouse.down();
await page.mouse.move(158, 270, { steps: 8 });
await page.waitForTimeout(800);
await page.mouse.move(72, 326, { steps: 8 });
await page.waitForTimeout(650);
await page.mouse.up();
await page.waitForTimeout(1800);
const combat = await capture('02-combat-inputs');

await page.evaluate(() => { window.__skyRaidAuditElapsedSeconds = 54; });
await page.waitForTimeout(2500);
const midAct = await capture('03-54s');
await page.evaluate(() => { window.__skyRaidAuditElapsedSeconds = 89; });
await page.waitForTimeout(2500);
const actEnd = await capture('04-89s');
await page.evaluate(() => { window.__skyRaidAuditElapsedSeconds = 91; });
await page.waitForTimeout(2500);
const nextAct = await capture('05-91s');

const report = {
  errors,
  controls: { shotClicks, missileClicks, turboHeld },
  opening,
  combat,
  midAct,
  actEnd,
  nextAct,
};
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log('SKY RAID V32 PLAYCHECK', JSON.stringify({
  errors,
  controls: report.controls,
  opening: { webgl: opening.webgl, act: opening.act, snapshot: opening.latestSnapshot },
  combat: { act: combat.act, snapshot: combat.latestSnapshot },
  midAct: { act: midAct.act, snapshot: midAct.latestSnapshot },
  actEnd: { act: actEnd.act, snapshot: actEnd.latestSnapshot },
  nextAct: { act: nextAct.act, snapshot: nextAct.latestSnapshot },
}));
if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
if (opening.mode !== 'sky-raid' || !opening.canvas) throw new Error('SKY RAID did not enter gameplay canvas');
if (shotClicks < 4 || missileClicks < 1 || !turboHeld) throw new Error('combat controls did not respond to audit input');
if (midAct.act !== 'dawn-city' || actEnd.act !== 'dawn-city' || nextAct.act !== 'red-canyon') throw new Error('Act pacing/transition mismatch');
await browser.close();
