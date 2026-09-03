from pathlib import Path

p = Path('src/sky/SkyDancerSkyRaid.ts')
s = p.read_text()
old = '''  const verticalLead = clamp(verticalSpeed * 0.14 + pitch * 4.6, -2.6, 3.0);
  const cameraLift = 4.45 - pitch * 1.25 + clamp(verticalSpeed * 0.045, -0.52, 0.70) + turboCamera * 0.24;'''
new = '''  const rawVerticalLead = clamp(verticalSpeed * 0.14 + pitch * 4.6, -2.6, 3.0);
  // Near either altitude stop, keep the aircraft as the visual anchor instead
  // of continuing to look farther up/down after the craft can no longer move.
  const altitudeEdgeBlend = clamp(Math.max((altitude - 48) / 16, (-10 - altitude) / 8, 0), 0, 1);
  const verticalLead = rawVerticalLead * (1 - altitudeEdgeBlend * 0.88);
  // Camera Y follows the actual aircraft Y almost one-to-one; pitch and vertical
  // velocity only add a small cinematic offset.
  const cameraLift = 4.70 - pitch * 0.55 + clamp(verticalSpeed * 0.018, -0.22, 0.28) + turboCamera * 0.24;'''
if old not in s:
    raise SystemExit('camera lead marker missing')
s = s.replace(old, new, 1)

old = '''  this.camera.up.set(0, 1, 0);
  this.camera.lookAt(
    playerPosition.x + forwardX * lookAhead,
    playerPosition.y + 0.92 + verticalLead - cameraFx.hitKick * 0.08,
    playerPosition.z + forwardZ * lookAhead,
  );
  this.camera.rotateZ(bank * (0.085 + turboCamera * 0.018) + hitShake * 0.035);'''
new = '''  this.camera.up.set(0, 1, 0);
  let lookTargetY = playerPosition.y + 0.96 + verticalLead - cameraFx.hitKick * 0.08;
  this.camera.lookAt(
    playerPosition.x + forwardX * lookAhead,
    lookTargetY,
    playerPosition.z + forwardZ * lookAhead,
  );

  // Screen-space framing assist. Keep the aircraft in a safe lower-center band
  // even while climb/dive input is held against the altitude limit.
  this.camera.updateMatrixWorld(true);
  const preFrameProjection = playerPosition.clone().project(this.camera);
  const desiredPlayerNdcY = -0.22;
  const verticalFrameError = clamp(preFrameProjection.y - desiredPlayerNdcY, -0.70, 0.70);
  const frameAssist = clamp(0.58 + Math.abs(verticalSpeed) / 16 * 0.20 + altitudeEdgeBlend * 0.34, 0.58, 1.0);
  const frameCorrection = clamp(verticalFrameError * 3.4 * frameAssist, -1.85, 1.85);
  if (Math.abs(frameCorrection) > 0.01) {
    lookTargetY += frameCorrection;
    this.camera.lookAt(
      playerPosition.x + forwardX * lookAhead,
      lookTargetY,
      playerPosition.z + forwardZ * lookAhead,
    );
  }
  this.camera.rotateZ(bank * (0.085 + turboCamera * 0.018) + hitShake * 0.035);'''
if old not in s:
    raise SystemExit('camera lookAt marker missing')
s = s.replace(old, new, 1)

old = '''  this.scene.userData.skyRaidCameraVerticalLead = verticalLead;
  this.scene.userData.skyRaidCameraTurboBlend = turboCamera;'''
new = '''  this.scene.userData.skyRaidCameraVerticalLead = verticalLead;
  this.scene.userData.skyRaidCameraAltitudeEdgeBlend = altitudeEdgeBlend;
  this.scene.userData.skyRaidCameraFrameCorrection = frameCorrection;
  this.scene.userData.skyRaidCameraTurboBlend = turboCamera;'''
if old not in s:
    raise SystemExit('camera userData marker missing')
s = s.replace(old, new, 1)

old = '''        altitude, verticalSpeed, verticalLead,
        cameraY: this.camera.position.y,
        playerY: player.y,
        fov: this.camera.fov,'''
new = '''        altitude, verticalSpeed, verticalLead,
        altitudeEdgeBlend,
        frameCorrection,
        cameraY: this.camera.position.y,
        playerY: player.y,
        playerNdcY: projected.y,
        fov: this.camera.fov,'''
if old not in s:
    raise SystemExit('camera audit helper marker missing')
s = s.replace(old, new, 1)
p.write_text(s)

t = Path('tests/sky-sky-raid-reference-world.test.ts')
ts = t.read_text()
marker = '''  assert.match(raid, /this\\.playerVisual\\.rotation\\.z = bank/);\n  assert.doesNotMatch(raid, /demo\\.camera\\.position\\.y \\+= flight\\.altitude/);'''
replacement = '''  assert.match(raid, /this\\.playerVisual\\.rotation\\.z = bank/);\n  assert.match(raid, /altitudeEdgeBlend/);\n  assert.match(raid, /desiredPlayerNdcY = -0\\.22/);\n  assert.match(raid, /frameCorrection/);\n  assert.doesNotMatch(raid, /demo\\.camera\\.position\\.y \\+= flight\\.altitude/);'''
if marker not in ts:
    raise SystemExit('camera regression marker missing')
t.write_text(ts.replace(marker, replacement, 1))
