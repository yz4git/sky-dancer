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
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
    const canvasRect = canvas?.getBoundingClientRect();
    const fire = document.querySelector('[aria-label="Fire missile"]');
    const fireRect = fire?.getBoundingClientRect();
    const fireStyle = fire ? getComputedStyle(fire) : null;
    const warning = document.querySelector('[aria-label="Missile warning"]');
    const warningRect = warning?.getBoundingClientRect();
    const alerts = [...document.querySelectorAll('[data-sd-noncritical-alert]')].map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        kind: node.getAttribute('data-sd-noncritical-alert'),
        display: style.display,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 1 && rect.height > 1,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
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
          };
        }
      } catch {}
    }
    const snapshots = window.__v32Snapshots || [];
    return {
      canvas: canvasRect ? { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height } : null,
      fireButton: fireRect ? { x: fireRect.x, y: fireRect.y, width: fireRect.width, height: fireRect.height, transform: fireStyle?.transform || '' } : null,
      warning: warningRect ? { x: warningRect.x, y: warningRect.y, width: warningRect.width, height: warningRect.height, text: warning.textContent || '' } : null,
      noncriticalAlerts: alerts,
      mode: root.dataset.skyDancerMode || '',
      act: root.dataset.skyRaidAct || '',
      formation: root.dataset.skyRaidFormationBeat || '',
      doctrine: root.dataset.skyRaidCombatDoctrine || '',
      enemyClasses: root.dataset.skyRaidEnemyClasses || '',
      enemyPackage: root.dataset.skyRaidEnemyPackage || '',
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1800),
      webgl,
      latestSnapshot: snapshots.at(-1) || null,
    };
  });
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(state, null, 2));
  return state;
}

async function clickActual(locator, count, delay) {
  let done = 0;
  for (let i = 0; i < count; i += 1) {
    const box = await locator.boundingBox();
    if (!box) break;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(70);
    await page.mouse.up();
    done += 1;
    await page.waitForTimeout(delay);
  }
  return done;
}

const opening = await capture('01-opening');
const fireButton = page.getByRole('button', { name: /Fire missile/i }).first();
const shotClicks = await clickActual(fireButton, 7, 260);
const turbo = page.getByRole('button', { name: /TURBO/i }).first();
let turboHeld = false;
const turboBox = await turbo.boundingBox();
if (turboBox) {
  await page.mouse.move(turboBox.x + turboBox.width / 2, turboBox.y + turboBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(720);
  await page.mouse.up();
  turboHeld = true;
}

// Real pointer drag across the lower-left virtual stick.
await page.mouse.move(105, 304);
await page.mouse.down();
await page.mouse.move(158, 270, { steps: 8 });
await page.waitForTimeout(650);
await page.mouse.move(72, 326, { steps: 8 });
await page.waitForTimeout(550);
await page.mouse.up();
await page.waitForTimeout(1600);
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

const report = { errors, controls: { shotClicks, turboHeld }, opening, combat, midAct, actEnd, nextAct };
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log('SKY RAID V32 PLAYCHECK', JSON.stringify({
  errors,
  controls: report.controls,
  opening: { webgl: opening.webgl, fireButton: opening.fireButton, act: opening.act },
  combat: { act: combat.act, kills: combat.latestSnapshot?.actKills },
  midAct: { act: midAct.act, warning: midAct.warning, alerts: midAct.noncriticalAlerts },
  actEnd: { act: actEnd.act, warning: actEnd.warning, alerts: actEnd.noncriticalAlerts },
  nextAct: { act: nextAct.act, warning: nextAct.warning, alerts: nextAct.noncriticalAlerts },
}));

if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
if (opening.mode !== 'sky-raid' || !opening.canvas || !opening.webgl) throw new Error('real WebGL SKY RAID did not start');
if (!opening.fireButton || opening.fireButton.width < 60 || opening.fireButton.height < 60) throw new Error(`phone missile target too small: ${JSON.stringify(opening.fireButton)}`);
if (shotClicks < 5 || !turboHeld) throw new Error('combat controls did not respond to actual pointer input');
if ((combat.latestSnapshot?.actKills ?? 0) < 1) throw new Error('combat input produced no confirmed target defeat');
if (midAct.act !== 'dawn-city' || actEnd.act !== 'dawn-city' || nextAct.act !== 'red-canyon') throw new Error('Act pacing/transition mismatch');
for (const sample of [midAct, actEnd, nextAct]) {
  if (!sample.warning) continue;
  const visibleNoncritical = sample.noncriticalAlerts.filter((alert) => alert.visible);
  if (visibleNoncritical.length) throw new Error(`critical warning lane overlap: ${JSON.stringify(visibleNoncritical)}`);
}
await browser.close();
