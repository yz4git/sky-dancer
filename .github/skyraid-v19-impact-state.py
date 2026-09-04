from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"missing marker: {label}")
    return source.replace(old, new, 1)


# V20.2: use the same proven keyboard path as the dedicated Turbo isolation
# browser audit. Space is the product Turbo input and correctly enters the
# physics-neutral hold model before release triggers the dash.
path = Path("scripts/webgl-sky-raid-camera-edge-v17.mjs")
source = path.read_text()
old = '''  // V20 speed review: hold the real Turbo control so the screenshot validates\n  // peripheral airflow and camera-language response rather than a debug-only FX.\n  const turboButton = page.locator("button").filter({ hasText: /TURBO/i }).last();\n  const turboBox = await turboButton.boundingBox();\n  if (!turboBox) throw new Error("Turbo control missing for V20 speed audit");\n  await page.mouse.move(turboBox.x + turboBox.width * 0.5, turboBox.y + turboBox.height * 0.5);\n  await page.mouse.down();\n  await page.waitForFunction(() => window.__skyRaidGetSpeedPolish?.()?.turboHeld === true, null, { timeout: 3000 });\n  await page.waitForTimeout(420);\n  const speedVisual = await page.evaluate(() => window.__skyRaidGetSpeedPolish?.() ?? null);\n  if (!speedVisual || speedVisual.visible !== true || Number(speedVisual.intensity ?? 0) < 0.70) {\n    throw new Error(`Turbo speed language is too weak: ${JSON.stringify(speedVisual)}`);\n  }\n  if (Number(speedVisual.lineCount ?? 0) < 20 || Number(speedVisual.peripheralGap ?? 0) < 12) {\n    throw new Error(`Turbo speed streaks invaded the central combat lane: ${JSON.stringify(speedVisual)}`);\n  }\n  await screenshot("05-turbo-speed-polish.png");\n  await page.mouse.up();\n  await page.waitForTimeout(100);\n\n  await page.mouse.up();\n  await clearAuditAltitude();\n\n  const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, reticleBox, decisionBox, combatDiagnostics, targetDownConfirmation, warningVisual, speedVisual, baseline, realClimb, high, beforeDive, realDive, low, errors };'''
new = '''  // V20 speed review: use the proven real product Turbo input path from the\n  // dedicated Turbo isolation audit. Space enters the same hold/release model\n  // as the touch control while remaining deterministic in headless Chromium.\n  await page.keyboard.down("Space");\n  await page.waitForFunction(() => window.__skyRaidGetSpeedPolish?.()?.turboHeld === true, null, { timeout: 3000 });\n  await page.waitForTimeout(420);\n  const speedVisual = await page.evaluate(() => window.__skyRaidGetSpeedPolish?.() ?? null);\n  if (!speedVisual || speedVisual.visible !== true || Number(speedVisual.intensity ?? 0) < 0.70) {\n    throw new Error(`Turbo speed language is too weak: ${JSON.stringify(speedVisual)}`);\n  }\n  if (Number(speedVisual.lineCount ?? 0) < 20 || Number(speedVisual.peripheralGap ?? 0) < 12) {\n    throw new Error(`Turbo speed streaks invaded the central combat lane: ${JSON.stringify(speedVisual)}`);\n  }\n  await screenshot("05-turbo-speed-polish.png");\n  await page.keyboard.up("Space");\n  await page.waitForTimeout(160);\n  const speedReleaseVisual = await page.evaluate(() => window.__skyRaidGetSpeedPolish?.() ?? null);\n  if (!speedReleaseVisual || speedReleaseVisual.turboHeld !== false || Number(speedReleaseVisual.turboReleaseFx ?? 0) < 0.45) {\n    throw new Error(`Turbo release speed tail is missing: ${JSON.stringify(speedReleaseVisual)}`);\n  }\n  await screenshot("06-turbo-release-polish.png");\n\n  await clearAuditAltitude();\n\n  const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, reticleBox, decisionBox, combatDiagnostics, targetDownConfirmation, warningVisual, speedVisual, speedReleaseVisual, baseline, realClimb, high, beforeDive, realDive, low, errors };'''
source = replace_once(source, old, new, "V20 Turbo browser input path")
path.write_text(source)

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
marker = '''  assert.match(auditSource, /turboHeld === true/);\n  assert.match(raidSource, /const cruiseFov = clamp/);'''
if marker in source:
    replacement = '''  assert.match(auditSource, /page\\.keyboard\\.down\\("Space"\\)/);\n  assert.match(auditSource, /turboHeld === true/);\n  assert.match(auditSource, /06-turbo-release-polish\\.png/);\n  assert.match(auditSource, /Turbo release speed tail is missing/);\n  assert.match(raidSource, /const cruiseFov = clamp/);'''
    source = replace_once(source, marker, replacement, "V20 keyboard Turbo regression assertions")
else:
    marker = '''  assert.match(auditSource, /turboHeld === true/);\n  assert.match(raidSource, /const cruiseFov = clamp\\(\\(speed - 18\\) \\* 0\\.10, 0, 2\\.2\\)/);'''
    replacement = '''  assert.match(auditSource, /page\\.keyboard\\.down\\("Space"\\)/);\n  assert.match(auditSource, /turboHeld === true/);\n  assert.match(auditSource, /06-turbo-release-polish\\.png/);\n  assert.match(auditSource, /Turbo release speed tail is missing/);\n  assert.match(raidSource, /const cruiseFov = clamp\\(\\(speed - 18\\) \\* 0\\.10, 0, 2\\.2\\)/);'''
    source = replace_once(source, marker, replacement, "V20 keyboard Turbo regression assertions")
path.write_text(source)
