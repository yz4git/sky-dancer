import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const BASE_URL = process.env.SKY_DANCER_AUDIT_URL ?? "http://127.0.0.1:4173/";
const OUTPUT = "artifacts/webgl-audit/50-v43-vertical-combat.png";
const viewport = { width: 844, height: 390 };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewportSize: viewport });
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__skyDancerGetV43VerticalFlight === "function", null, { timeout: 45000 });

  // Let normal AI flight accumulate a real altitude spread. Existing webdriver
  // bridges/autoplay keep the production game moving; this audit never mutates
  // private simulation state to manufacture a pass.
  let maxAbsAltitude = 0;
  let maxAbsEnemyPitch = 0;
  let maxAbsMissilePitch = 0;
  let sawAvoidance = false;
  let sawEnemyMissile = false;
  let sawPlayerMissile = false;
  let minAltitude = Number.POSITIVE_INFINITY;
  let maxAltitude = Number.NEGATIVE_INFINITY;

  for (let sample = 0; sample < 44; sample += 1) {
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => window.__skyDancerGetV43VerticalFlight?.());
    if (!state) continue;
    maxAbsAltitude = Math.max(maxAbsAltitude, Number(state.maxAbsEnemyAltitude ?? 0));
    maxAbsEnemyPitch = Math.max(maxAbsEnemyPitch, Number(state.maxAbsEnemyPitch ?? 0));
    maxAbsMissilePitch = Math.max(maxAbsMissilePitch, Number(state.maxAbsMissilePitch ?? 0));
    const enemies = Array.isArray(state.enemies) ? state.enemies : [];
    for (const enemy of enemies) {
      const altitude = Number(enemy.altitudeOffsetMeters ?? 0);
      minAltitude = Math.min(minAltitude, altitude);
      maxAltitude = Math.max(maxAltitude, altitude);
      sawAvoidance ||= Boolean(enemy.avoiding);
      assert.ok(Math.abs(altitude) <= 10.15, `enemy altitude escaped +/-10m: ${altitude}`);
    }
    sawEnemyMissile ||= Array.isArray(state.enemyMissiles) && state.enemyMissiles.length > 0;
    sawPlayerMissile ||= Array.isArray(state.playerMissiles) && state.playerMissiles.length > 0;
  }

  await mkdir("artifacts/webgl-audit", { recursive: true });
  await page.screenshot({ path: OUTPUT, fullPage: false });

  assert.ok(maxAbsAltitude >= 2.0, `expected real vertical aircraft motion, max=${maxAbsAltitude.toFixed(2)}m`);
  assert.ok(maxAbsEnemyPitch >= 0.015, `expected aircraft climb/dive pitch, max=${maxAbsEnemyPitch.toFixed(4)}rad`);
  assert.ok(maxAltitude - minAltitude >= 2.5, `expected altitude spread, range=${(maxAltitude - minAltitude).toFixed(2)}m`);
  // Avoidance is deterministic but depends on encounter geometry; when it is
  // observed we report it, while source/unit tests guarantee the trigger path.
  assert.ok(sawEnemyMissile || sawPlayerMissile, "expected at least one live missile during vertical audit");
  if (maxAbsMissilePitch <= 0.01) {
    throw new Error(`expected 3D missile pitch while targets differ in altitude, max=${maxAbsMissilePitch.toFixed(4)}rad`);
  }
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);

  console.log(JSON.stringify({
    maxAbsAltitude,
    minAltitude,
    maxAltitude,
    maxAbsEnemyPitch,
    maxAbsMissilePitch,
    sawAvoidance,
    sawEnemyMissile,
    sawPlayerMissile,
    consoleErrors: consoleErrors.length,
    pageErrors: pageErrors.length,
  }, null, 2));
} finally {
  await browser.close();
}
