/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require(process.cwd() + '/.audit-runtime/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const out = 'artifacts/sky-raid-v2-compare';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKY_DANCER_CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });

  await page.goto(`http://127.0.0.1:4173?menu=1&combatAudit=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('button').filter({ hasText: /^\s*SKY RAID/i }).first().click({ force: true });
  await page.waitForTimeout(100);
  await page.locator('button').filter({ hasText: /START/i }).last().click({ force: true });
  await page.locator('canvas[aria-label="Sky Dancer WebGL game view"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__skyRaidAuditFlightState === 'function' && typeof window.__skyRaidAuditPrepareCombatTarget === 'function', null, { timeout: 15000 });

  const pad = page.locator('[aria-label="Sky Raid two-axis flight stick"]');
  const box = await pad.boundingBox();
  if (!box) throw new Error('flight pad missing');
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.08, { steps: 7 });
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(120);

  const flightBeforeLock = await page.evaluate(() => window.__skyRaidAuditFlightState());
  if (!(flightBeforeLock.altitude > 5)) throw new Error(`player did not reach combat audit altitude: ${JSON.stringify(flightBeforeLock)}`);

  let prepared = await page.evaluate(() => window.__skyRaidAuditPrepareCombatTarget());
  if (!prepared?.length) throw new Error('no live enemy available for combat audit');
  await page.waitForTimeout(240);

  let decisionDebug = await page.evaluate(() => typeof window.__skyDancerGetV45DecisionHierarchy === 'function' ? window.__skyDancerGetV45DecisionHierarchy() : null);
  if (!decisionDebug?.decision?.targetEnemyId) {
    prepared = await page.evaluate(() => window.__skyRaidAuditPrepareCombatTarget());
    await page.waitForTimeout(240);
    decisionDebug = await page.evaluate(() => typeof window.__skyDancerGetV45DecisionHierarchy === 'function' ? window.__skyDancerGetV45DecisionHierarchy() : null);
  }
  const decision = decisionDebug?.decision;
  if (!decision?.targetEnemyId) throw new Error(`lock failed after deterministic target placement: ${JSON.stringify(decisionDebug)}`);
  if (Math.abs(decision.playerAltitudeMeters - flightBeforeLock.altitude) > 1.5) {
    throw new Error(`lock player altitude mismatch: flight=${flightBeforeLock.altitude}, lock=${decision.playerAltitudeMeters}`);
  }
  const lockHud = page.locator('[aria-label="V45 target decision"]');
  if (!(await lockHud.count())) throw new Error('SKY RAID target decision HUD not visible');
  await page.screenshot({ path: path.join(out, 'raid-combat-high-altitude-lock.png') });

  const beforeHit = Number(decision.hitSerial || 0);
  const shot = page.locator('button[aria-label="Fire missile"]');
  await shot.dispatchEvent('pointerdown', { pointerId: 51, pointerType: 'touch', isPrimary: true, clientX: 760, clientY: 300 });
  await page.waitForTimeout(100);

  await page.waitForFunction(() => {
    const state = typeof window.__skyDancerGetV43VerticalFlight === 'function' ? window.__skyDancerGetV43VerticalFlight() : null;
    return Boolean(state?.playerMissiles?.length);
  }, null, { timeout: 3000 });
  const vertical = await page.evaluate(() => window.__skyDancerGetV43VerticalFlight());
  const missile = vertical.playerMissiles[0];
  if (Math.abs(missile.altitudeOffsetMeters - flightBeforeLock.altitude) > 2.5) {
    throw new Error(`missile spawned at wrong altitude: player=${flightBeforeLock.altitude}, missile=${missile.altitudeOffsetMeters}`);
  }
  await page.screenshot({ path: path.join(out, 'raid-combat-high-altitude-shot.png') });

  let hitObserved = false;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(70);
    const debug = await page.evaluate(() => typeof window.__skyDancerGetV45DecisionHierarchy === 'function' ? window.__skyDancerGetV45DecisionHierarchy() : null);
    if (Number(debug?.decision?.hitSerial || 0) > beforeHit) {
      hitObserved = true;
      await page.screenshot({ path: path.join(out, 'raid-combat-high-altitude-hit.png') });
      break;
    }
  }
  if (!hitObserved) throw new Error('high-altitude missile did not produce a hit confirmation');

  const baseline = await page.evaluate(() => window.__skyRaidAuditFlightState());
  const turbo = page.locator('button').filter({ hasText: /TURBO/i }).last();
  const turboBox = await turbo.boundingBox();
  if (!turboBox) throw new Error('TURBO button missing');
  await page.mouse.move(turboBox.x + turboBox.width / 2, turboBox.y + turboBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(380);
  const turboState = await page.evaluate(() => window.__skyRaidAuditFlightState());
  await page.screenshot({ path: path.join(out, 'raid-combat-turbo-camera.png') });
  await page.mouse.up();
  if (!turboState.playerNdc.visible) throw new Error(`aircraft left frame during TURBO: ${JSON.stringify(turboState)}`);
  if (turboState.boostActive && turboState.cameraFov < baseline.cameraFov + 2) {
    throw new Error(`TURBO camera FOV did not expand: ${baseline.cameraFov} -> ${turboState.cameraFov}`);
  }

  const result = { errors, flightBeforeLock, prepared, decision, missile, hitObserved, turbo: { baseline, active: turboState } };
  fs.writeFileSync(path.join(out, 'combat-report.json'), JSON.stringify(result, null, 2));
  if (errors.length) throw new Error(`browser errors: ${JSON.stringify(errors)}`);
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
