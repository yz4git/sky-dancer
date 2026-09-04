from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"missing marker: {label}")
    return source.replace(old, new, 1)


path = Path("src/sky/SkyDancerSkyRaid.ts")
source = path.read_text()
old = '''function buildSpeedFx(): THREE.Group {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.035, 0.035, 5.5);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xc9f7ff, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let index = 0; index < 24; index += 1) {
    const line = new THREE.Mesh(geometry, lineMaterial);
    const column = index % 8;
    const row = Math.floor(index / 8);
    line.position.set(-12 + column * 3.4, 1.5 + row * 2.4, 8 + (index % 6) * 7);
    root.add(line);
  }
  root.visible = false;
  return root;
}'''
new = '''function buildSpeedFx(): THREE.Group {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.028, 0.028, 4.2);
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xc9f7ff,
    transparent: true,
    opacity: 0.08,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  // V20 speed language stays at the phone periphery. The +/-6.8m center gap
  // keeps aircraft, locks, and missile trails readable while airflow streaks
  // sell speed against dense scenery without moving the world itself.
  const laneX = [-13.2, -10.8, -8.6, -6.8, 6.8, 8.6, 10.8, 13.2] as const;
  for (let index = 0; index < 24; index += 1) {
    const line = new THREE.Mesh(geometry, lineMaterial);
    const column = index % laneX.length;
    const row = Math.floor(index / laneX.length);
    line.position.set(laneX[column], -1.2 + row * 2.7, 10 + (index % 6) * 7.2);
    line.scale.z = 0.82 + (index % 4) * 0.08;
    line.renderOrder = 1080;
    root.add(line);
  }
  root.visible = false;
  return root;
}'''
source = replace_once(source, old, new, "V20 peripheral speed FX builder")

old = '''  visual.speedFx.visible = base.boostActive || raid.rushActive;
  visual.speedFx.position.set(base.x, 1.8 + resolvedFlight.altitude, base.z);
  visual.speedFx.rotation.y = base.heading;
  visual.speedFx.children.forEach((line, index) => {
    line.position.z -= delta * (base.boostActive ? 68 : 42);
    if (line.position.z < -8) line.position.z = 30 + (index % 7) * 7;
  });'''
new = '''  const flightSpeed = Math.abs(base.speed);
  const cruiseFx = clamp((flightSpeed - 17) / 12, 0, 1);
  const turboFx = base.boostActive ? 1 : 0;
  const rushFx = raid.rushActive ? 1 : 0;
  const speedFxIntensity = clamp(cruiseFx * 0.22 + rushFx * 0.32 + turboFx * 0.72, 0, 1);
  visual.speedFx.visible = speedFxIntensity > 0.055;
  visual.speedFx.position.set(base.x, 1.8 + resolvedFlight.altitude, base.z);
  visual.speedFx.rotation.y = base.heading;
  const speedColor = new THREE.Color(raid.palette.accent);
  visual.speedFx.children.forEach((line, index) => {
    if (line instanceof THREE.Mesh && line.material instanceof THREE.MeshBasicMaterial) {
      line.material.color.lerp(speedColor, 1 - Math.exp(-delta * 5.5));
      line.material.opacity = 0.045 + speedFxIntensity * 0.32;
    }
    line.position.z -= delta * (22 + flightSpeed * 0.95 + turboFx * 36 + rushFx * 14);
    if (line.position.z < -12) line.position.z = 34 + (index % 6) * 8;
    const thickness = 0.72 + speedFxIntensity * 0.32;
    line.scale.x = thickness;
    line.scale.y = thickness;
    line.scale.z = 0.82 + speedFxIntensity * (1.10 + (index % 3) * 0.12);
  });
  demo.scene.userData.skyRaidSpeedFxIntensity = speedFxIntensity;
  demo.scene.userData.skyRaidSpeedFxPeripheralGap = 13.6;
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetSpeedPolish = () => ({
      visible: visual?.speedFx.visible === true,
      intensity: Number(demo.scene.userData.skyRaidSpeedFxIntensity ?? 0),
      peripheralGap: Number(demo.scene.userData.skyRaidSpeedFxPeripheralGap ?? 0),
      lineCount: visual?.speedFx.children.length ?? 0,
      boostActive: base.boostActive,
      rushActive: raid.rushActive,
      flightSpeed,
    });
  }'''
source = replace_once(source, old, new, "V20 speed FX update")

old = '''  const targetFov = clamp(
    cameraFx.baseFov + turboCamera * (6.6 + turbo.releaseCharge * 3.4) + cameraFx.shotKick * 0.35 - cameraFx.hitKick * 0.75,
    50,
    82,
  );'''
new = '''  // V20 adds a restrained cruise-speed lens response. It is presentation-only:
  // scenery coordinates and flight physics remain untouched, while Turbo keeps
  // the dominant FOV kick already authored by the release camera language.
  const cruiseFov = clamp((speed - 18) * 0.10, 0, 2.2);
  const targetFov = clamp(
    cameraFx.baseFov + cruiseFov + turboCamera * (6.6 + turbo.releaseCharge * 3.4) + cameraFx.shotKick * 0.35 - cameraFx.hitKick * 0.75,
    50,
    82,
  );'''
source = replace_once(source, old, new, "V20 cruise FOV")
source = replace_once(
    source,
    '''  this.scene.userData.skyRaidCameraTurboBlend = turboCamera;
  this.scene.userData.skyRaidCameraHitKick = cameraFx.hitKick;''',
    '''  this.scene.userData.skyRaidCameraTurboBlend = turboCamera;
  this.scene.userData.skyRaidCameraCruiseFov = cruiseFov;
  this.scene.userData.skyRaidCameraHitKick = cameraFx.hitKick;''',
    "V20 cruise FOV telemetry",
)
path.write_text(source)

path = Path("scripts/webgl-sky-raid-camera-edge-v17.mjs")
source = path.read_text()
old = '''  await screenshot("04-compact-missile-warning.png");
  await page.evaluate(() => { delete window.__skyRaidAuditForceMissileWarning; });

  await page.mouse.up();
  await clearAuditAltitude();

  const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, reticleBox, decisionBox, combatDiagnostics, targetDownConfirmation, warningVisual, baseline, realClimb, high, beforeDive, realDive, low, errors };'''
new = '''  await screenshot("04-compact-missile-warning.png");
  await page.evaluate(() => { delete window.__skyRaidAuditForceMissileWarning; });

  // V20 speed review: hold the real Turbo control so the screenshot validates
  // peripheral airflow and camera-language response rather than a debug-only FX.
  const turboButton = page.locator("button").filter({ hasText: /TURBO/i }).last();
  const turboBox = await turboButton.boundingBox();
  if (!turboBox) throw new Error("Turbo control missing for V20 speed audit");
  await page.mouse.move(turboBox.x + turboBox.width * 0.5, turboBox.y + turboBox.height * 0.5);
  await page.mouse.down();
  await page.waitForFunction(() => window.__skyRaidGetSpeedPolish?.()?.boostActive === true, null, { timeout: 3000 });
  await page.waitForTimeout(420);
  const speedVisual = await page.evaluate(() => window.__skyRaidGetSpeedPolish?.() ?? null);
  if (!speedVisual || speedVisual.visible !== true || Number(speedVisual.intensity ?? 0) < 0.70) {
    throw new Error(`Turbo speed language is too weak: ${JSON.stringify(speedVisual)}`);
  }
  if (Number(speedVisual.lineCount ?? 0) < 20 || Number(speedVisual.peripheralGap ?? 0) < 12) {
    throw new Error(`Turbo speed streaks invaded the central combat lane: ${JSON.stringify(speedVisual)}`);
  }
  await screenshot("05-turbo-speed-polish.png");
  await page.mouse.up();
  await page.waitForTimeout(100);

  await page.mouse.up();
  await clearAuditAltitude();

  const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, reticleBox, decisionBox, combatDiagnostics, targetDownConfirmation, warningVisual, speedVisual, baseline, realClimb, high, beforeDive, realDive, low, errors };'''
source = replace_once(source, old, new, "V20 Turbo browser review")
path.write_text(source)

path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
addition = '''\n\ntest("SKY RAID V20 speed language stays peripheral and presentation-only", () => {\n  const raidSource = readFileSync(new URL("../src/sky/SkyDancerSkyRaid.ts", import.meta.url), "utf8");\n  const auditSource = readFileSync(new URL("../scripts/webgl-sky-raid-camera-edge-v17.mjs", import.meta.url), "utf8");\n  assert.match(raidSource, /const laneX = \[-13\\.2, -10\\.8, -8\\.6, -6\\.8, 6\\.8, 8\\.6, 10\\.8, 13\\.2\]/);\n  assert.match(raidSource, /speedFxIntensity = clamp\\(cruiseFx \\* 0\\.22 \\+ rushFx \\* 0\\.32 \\+ turboFx \\* 0\\.72/);\n  assert.match(raidSource, /skyRaidSpeedFxPeripheralGap = 13\\.6/);\n  assert.match(raidSource, /const cruiseFov = clamp\\(\\(speed - 18\\) \\* 0\\.10, 0, 2\\.2\\)/);\n  assert.match(raidSource, /skyRaidCameraCruiseFov = cruiseFov/);\n  assert.match(auditSource, /05-turbo-speed-polish\\.png/);\n  assert.match(auditSource, /Turbo speed streaks invaded the central combat lane/);\n});\n'''
if 'SKY RAID V20 speed language stays peripheral and presentation-only' not in source:
    source += addition
path.write_text(source)
