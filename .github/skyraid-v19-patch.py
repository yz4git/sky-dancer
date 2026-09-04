from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise SystemExit(f"missing marker: {label}")
    return source.replace(old, new, 1)


# 1) Missile warning: full halo -> four short arcs + nearest-threat pointer.
path = Path("src/sky/SkyDancerAirCombatFxV18.ts")
source = path.read_text()
source = replace_once(
    source,
    '  private readonly missileWarningRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;\n',
    '  private readonly missileWarningSegments: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];\n'
    '  private readonly missileWarningPointer: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;\n'
    '  private warningBearing = Math.PI * 0.5;\n',
    "warning fields",
)
start = source.index('    // This legacy camera-space cue used to fill most of a phone viewport')
end_marker = '    runtime.camera.add(this.missileWarningRoot);'
end = source.index(end_marker, start) + len(end_marker)
constructor_block = '''    // V19 threat cue: four short peripheral arcs plus one directional pointer.
    // The aircraft silhouette and central aiming lane stay open even when urgent.
    const segmentArc = Math.PI * 0.34;
    for (let index = 0; index < 4; index += 1) {
      const segment = new THREE.Mesh(
        new THREE.TorusGeometry(0.050, 0.0036, 4, 10, segmentArc),
        warningMaterial.clone(),
      );
      segment.rotation.z = index * Math.PI * 0.5 - segmentArc * 0.5;
      segment.renderOrder = 1200;
      this.missileWarningSegments.push(segment);
      this.missileWarningRoot.add(segment);
    }
    this.missileWarningPointer = new THREE.Mesh(
      new THREE.ConeGeometry(0.0072, 0.019, 3),
      warningMaterial.clone(),
    );
    this.missileWarningPointer.position.set(0, 0.071, 0.001);
    this.missileWarningPointer.renderOrder = 1201;
    this.missileWarningRoot.add(this.missileWarningPointer);
    runtime.camera.add(this.missileWarningRoot);'''
source = source[:start] + constructor_block + source[end:]
source = replace_once(
    source,
    '    this.updateMissileWarning(missiles, delta);',
    '    this.updateMissileWarning(snapshot, missiles, delta);',
    "warning call",
)
start = source.index('  private updateMissileWarning(')
end = source.index('\n\n\nprivate detectPlayerWeaponImpact()', start)
warning_method = '''  private updateMissileWarning(
    snapshot: CartArenaSessionSnapshot,
    missiles: SkyDancerMissileState,
    delta: number,
  ): void {
    let nearestMissile: SkyDancerMissileState["missiles"][number] | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    for (const missile of missiles.missiles) {
      if (missile.distanceToPlayer < nearest) {
        nearest = missile.distanceToPlayer;
        nearestMissile = missile;
      }
    }
    const threat = Number.isFinite(nearest) && nearest < 30;
    this.missileWarningRoot.visible = threat;
    if (!threat) return;

    const strength = THREE.MathUtils.clamp((30 - nearest) / 25, 0.12, 1);
    const urgent = nearest < 12;
    const color = urgent ? 0xff554d : 0xffbd55;
    const pulse = 0.86 + Math.sin(this.elapsedV18 * (urgent ? 18 : 10)) * 0.14;
    const dx = nearestMissile ? nearestMissile.x - snapshot.x : Math.sin(snapshot.heading + 0.62) * 8;
    const dz = nearestMissile ? nearestMissile.z - snapshot.z : Math.cos(snapshot.heading + 0.62) * 8;
    const missileHeading = Math.atan2(dx, dz);
    const relativeBearing = Math.atan2(
      Math.sin(missileHeading - snapshot.heading),
      Math.cos(missileHeading - snapshot.heading),
    );
    const targetBearing = Math.PI * 0.5 - relativeBearing;
    const bearingDelta = Math.atan2(
      Math.sin(targetBearing - this.warningBearing),
      Math.cos(targetBearing - this.warningBearing),
    );
    this.warningBearing += bearingDelta * (1 - Math.exp(-delta * 11));

    this.missileWarningRoot.scale.setScalar(0.96 + strength * 0.055 + pulse * 0.012);
    for (const segment of this.missileWarningSegments) {
      segment.material.color.setHex(color);
      segment.material.opacity = (0.10 + strength * 0.30) * pulse;
    }
    const pointerRadius = 0.071;
    this.missileWarningPointer.position.set(
      Math.cos(this.warningBearing) * pointerRadius,
      Math.sin(this.warningBearing) * pointerRadius,
      0.001,
    );
    this.missileWarningPointer.rotation.z = this.warningBearing - Math.PI * 0.5;
    this.missileWarningPointer.scale.setScalar(0.90 + strength * 0.22 + pulse * 0.06);
    this.missileWarningPointer.material.color.setHex(color);
    this.missileWarningPointer.material.opacity = 0.38 + strength * 0.50 * pulse;

    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
      (window as unknown as Record<string, unknown>).__skyRaidGetWarningPolish = () => ({
        visible: this.missileWarningRoot.visible,
        segmentCount: this.missileWarningSegments.length,
        fullRing: false,
        segmentRadius: 0.050,
        pointerRadius,
        pointerX: this.missileWarningPointer.position.x,
        pointerY: this.missileWarningPointer.position.y,
        pointerOpacity: this.missileWarningPointer.material.opacity,
        nearest,
      });
    }
  }'''
source = source[:start] + warning_method + source[end:]
path.write_text(source)


# 2) Formation rhythm director on top of existing offscreen presence safety net.
path = Path("src/sky/SkyDancerSkyRaid.ts")
source = path.read_text()
source = replace_once(
    source,
    'const raidEngagementBySession = new WeakMap<object, { cooldown: number; cursor: number }>();',
    'const raidEngagementBySession = new WeakMap<object, { cooldown: number; cursor: number; lastBeat: SkyRaidFormationBeat; beatAge: number }>();',
    "engagement state",
)
start = source.index('const SKY_RAID_ENGAGEMENT_SLOTS = [')
end = source.index('\n\nconst SKY_RAID_SCREEN_SLOTS = [', start)
formation_block = '''type SkyRaidFormationBeat = "spearhead" | "pincer" | "regroup" | "crossfire" | "breakaway";

type SkyRaidFormationSlot = { lateral: number; forward: number };

function skyRaidFormationPattern(elapsedSeconds: number): {
  beat: SkyRaidFormationBeat;
  progress: number;
  slots: readonly SkyRaidFormationSlot[];
  targetCount: number;
  correctionSpeed: number;
} {
  const act = skyDancerSkyRaidActFor(elapsedSeconds);
  const local = skyDancerSkyRaidActSeconds(elapsedSeconds, act);
  const rush = skyDancerSkyRaidRushActive(elapsedSeconds, act);
  const mirror = act.index % 2 === 0 ? 1 : -1;
  let beat: SkyRaidFormationBeat;
  let progress: number;
  if (local < 7) {
    beat = "spearhead";
    progress = clamp(local / 7, 0, 1);
  } else if (local < 13) {
    beat = "pincer";
    progress = clamp((local - 7) / 6, 0, 1);
  } else if (local < 17) {
    beat = "regroup";
    progress = clamp((local - 13) / 4, 0, 1);
  } else if (local < 21) {
    beat = "crossfire";
    progress = clamp((local - 17) / 4, 0, 1);
  } else {
    beat = "breakaway";
    progress = clamp((local - 21) / 3, 0, 1);
  }

  let slots: readonly SkyRaidFormationSlot[];
  switch (beat) {
    case "spearhead": {
      const wing = 5.5 + progress * 2.5;
      slots = [
        { lateral: 0, forward: 23 },
        { lateral: -wing * mirror, forward: 29 },
        { lateral: wing * mirror, forward: 29 },
        { lateral: -13 * mirror, forward: 38 },
        { lateral: 13 * mirror, forward: 38 },
      ];
      break;
    }
    case "pincer": {
      const flank = 15 - progress * 7;
      slots = [
        { lateral: -flank * mirror, forward: 23 },
        { lateral: flank * mirror, forward: 25 },
        { lateral: -(9 - progress * 4) * mirror, forward: 32 },
        { lateral: (9 - progress * 4) * mirror, forward: 34 },
        { lateral: 0, forward: 41 },
      ];
      break;
    }
    case "regroup":
      slots = [
        { lateral: -10 * mirror, forward: 29 },
        { lateral: 10 * mirror, forward: 29 },
        { lateral: 0, forward: 34 },
        { lateral: -15 * mirror, forward: 42 },
        { lateral: 15 * mirror, forward: 42 },
      ];
      break;
    case "crossfire": {
      const sweep = 13 - progress * 24;
      slots = [
        { lateral: sweep * mirror, forward: 23 },
        { lateral: -sweep * mirror, forward: 28 },
        { lateral: sweep * 0.58 * mirror, forward: 35 },
        { lateral: -sweep * 0.58 * mirror, forward: 39 },
        { lateral: 0, forward: 45 },
      ];
      break;
    }
    case "breakaway":
      slots = [
        { lateral: -16 * mirror, forward: 33 },
        { lateral: 16 * mirror, forward: 33 },
        { lateral: -8 * mirror, forward: 40 },
        { lateral: 8 * mirror, forward: 40 },
        { lateral: 0, forward: 48 },
      ];
      break;
  }

  return {
    beat,
    progress,
    slots,
    targetCount: rush ? 4 : 3,
    correctionSpeed: rush ? 7.4 : 4.6,
  };
}

/**
 * V19 authored attack rhythm. Existing AI keeps speed, weapons and avoidance.
 * Already-visible enemies receive only bounded continuous corrections; only
 * old offscreen candidates may still be recycled by the established safety net.
 */
function maintainSkyRaidEnemyPresence(session: CartArenaSession, delta: number, elapsedSeconds: number): void {
  const snapshot = session.snapshot();
  const live = session.enemies.filter(
    (enemy) => enemy.alive && enemy.kind !== "boss" && enemy.nodeId === snapshot.nodeId,
  );
  if (live.length < 2) return;

  const pattern = skyRaidFormationPattern(elapsedSeconds);
  const key = session as unknown as object;
  let state = raidEngagementBySession.get(key);
  if (!state) {
    state = { cooldown: 0, cursor: 0, lastBeat: pattern.beat, beatAge: 0 };
    raidEngagementBySession.set(key, state);
  }
  if (state.lastBeat !== pattern.beat) {
    state.lastBeat = pattern.beat;
    state.beatAge = 0;
    state.cooldown = 0;
  } else {
    state.beatAge += delta;
  }
  state.cooldown = Math.max(0, state.cooldown - delta);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.skyRaidFormationBeat = pattern.beat;
    document.documentElement.dataset.skyRaidFormationPhase = pattern.progress.toFixed(2);
  }

  const forwardX = Math.sin(snapshot.heading);
  const forwardZ = Math.cos(snapshot.heading);
  const rightX = Math.cos(snapshot.heading);
  const rightZ = -Math.sin(snapshot.heading);
  const local = (enemy: (typeof live)[number]) => {
    const dx = enemy.x - snapshot.x;
    const dz = enemy.z - snapshot.z;
    return {
      enemy,
      forward: dx * forwardX + dz * forwardZ,
      lateral: dx * rightX + dz * rightZ,
    };
  };

  const choreographed = live.map(local)
    .filter(({ forward, lateral }) => forward >= 7 && forward <= 58 && Math.abs(lateral) <= 27)
    .sort((left, right) => left.forward - right.forward)
    .slice(0, Math.min(pattern.targetCount, live.length));
  for (let index = 0; index < choreographed.length; index += 1) {
    const sample = choreographed[index];
    const slot = pattern.slots[index % pattern.slots.length];
    const lateralError = slot.lateral - sample.lateral;
    const forwardError = slot.forward - sample.forward;
    const sideStep = clamp(lateralError, -pattern.correctionSpeed * delta, pattern.correctionSpeed * delta);
    const forwardStep = clamp(forwardError, -pattern.correctionSpeed * 0.72 * delta, pattern.correctionSpeed * 0.72 * delta);
    sample.enemy.x += rightX * sideStep + forwardX * forwardStep;
    sample.enemy.z += rightZ * sideStep + forwardZ * forwardStep;
    const aimX = snapshot.x + forwardX * 7 + rightX * slot.lateral * 0.14;
    const aimZ = snapshot.z + forwardZ * 7 + rightZ * slot.lateral * 0.14;
    const desiredHeading = Math.atan2(aimX - sample.enemy.x, aimZ - sample.enemy.z);
    const turnError = Math.atan2(
      Math.sin(desiredHeading - sample.enemy.heading),
      Math.cos(desiredHeading - sample.enemy.heading),
    );
    sample.enemy.heading += clamp(turnError, -delta * 0.72, delta * 0.72);
  }

  const measured = live.map(local);
  const targetCount = Math.min(pattern.targetCount, live.length);
  const engaged = measured.filter(
    ({ forward, lateral }) => forward >= 10 && forward <= 53 && Math.abs(lateral) <= 22,
  );
  if (engaged.length >= targetCount) return;
  if (state.cooldown > 0) return;

  const engagedIds = new Set(engaged.map(({ enemy }) => enemy.id));
  const candidates = measured
    .filter(({ enemy }) => !engagedIds.has(enemy.id))
    .sort((left, right) => {
      const penalty = ({ forward, lateral }: typeof left) =>
        Math.abs(lateral)
        + Math.max(0, 10 - forward) * 2.2
        + Math.max(0, forward - 53) * 1.6;
      return penalty(right) - penalty(left);
    });
  const needed = Math.min(targetCount - engaged.length, candidates.length, 2);
  for (let index = 0; index < needed; index += 1) {
    const target = candidates[index].enemy;
    const slot = pattern.slots[(state.cursor + engaged.length + index) % pattern.slots.length];
    target.x = snapshot.x + forwardX * slot.forward + rightX * slot.lateral;
    target.z = snapshot.z + forwardZ * slot.forward + rightZ * slot.lateral;
    target.heading = Math.atan2(snapshot.x - target.x, snapshot.z - target.z);
    target.aiClock = 0;
    target.chargeTime = 0;
  }
  state.cursor = (state.cursor + needed) % pattern.slots.length;
  state.cooldown = needed > 0 ? 0.44 : 0.18;
}
'''
source = source[:start] + formation_block + source[end:]
source = replace_once(
    source,
    '''    const delta = clamp(fixedDelta, 0, 0.05);
    maintainSkyRaidEnemyPresence(this as unknown as CartArenaSession, delta);
    const hunt = getCartTurboHuntSnapshot(this as unknown as CartArenaSession);
    if (!hunt) return;
    const snapshot = updateRaid(this, hunt, delta);''',
    '''    const delta = clamp(fixedDelta, 0, 0.05);
    const hunt = getCartTurboHuntSnapshot(this as unknown as CartArenaSession);
    if (!hunt) return;
    maintainSkyRaidEnemyPresence(this as unknown as CartArenaSession, delta, hunt.huntElapsedSeconds);
    const snapshot = updateRaid(this, hunt, delta);''',
    "step order",
)
source = replace_once(
    source,
    '''        enemyCombatLane,
        enemyScreenSamples,''',
    '''        enemyCombatLane,
        formationBeat: document.documentElement.dataset.skyRaidFormationBeat ?? "",
        formationPhase: Number(document.documentElement.dataset.skyRaidFormationPhase ?? 0),
        enemyScreenSamples,''',
    "formation diagnostics",
)
path.write_text(source)


# 3) Audit-only forced warning hook adapted to new warning method.
path = Path("scripts/inject-sky-raid-v17-audit-hook.py")
source = path.read_text()
start = source.index("# 3) Force only the presentation cue")
source = source[:start] + '''# 3) Force only the presentation cue for the final visual screenshot.
path = Path("src/sky/SkyDancerAirCombatFxV18.ts")
source = path.read_text()
marker = '    const threat = Number.isFinite(nearest) && nearest < 30;'
replacement = '''    const auditThreat = typeof window !== "undefined"
      && typeof navigator !== "undefined"
      && navigator.webdriver
      && (window as unknown as { __skyRaidAuditForceMissileWarning?: unknown }).__skyRaidAuditForceMissileWarning === true;
    if (auditThreat) nearest = 6;
    const threat = auditThreat || (Number.isFinite(nearest) && nearest < 30);'''
if marker not in source:
    raise SystemExit("SKY RAID missile warning audit injection marker missing")
path.write_text(source.replace(marker, replacement, 1))
'''
path.write_text(source)


# 4) Browser audit: enforce segmented, directional cue.
path = Path("scripts/webgl-sky-raid-camera-edge-v17.mjs")
source = path.read_text()
source = replace_once(
    source,
    '''  await page.evaluate(() => { window.__skyRaidAuditForceMissileWarning = true; });
  await page.waitForTimeout(250);
  await screenshot("04-compact-missile-warning.png");
  await page.evaluate(() => { delete window.__skyRaidAuditForceMissileWarning; });''',
    '''  await page.evaluate(() => { window.__skyRaidAuditForceMissileWarning = true; });
  await page.waitForTimeout(250);
  const warningVisual = await page.evaluate(() => window.__skyRaidGetWarningPolish?.() ?? null);
  if (!warningVisual || warningVisual.visible !== true || warningVisual.segmentCount !== 4 || warningVisual.fullRing !== false) {
    throw new Error(`missile warning did not resolve to four directional segments: ${JSON.stringify(warningVisual)}`);
  }
  if (Number(warningVisual.segmentRadius ?? 1) > 0.055 || Number(warningVisual.pointerRadius ?? 1) > 0.078) {
    throw new Error(`missile warning geometry grew back over the aircraft: ${JSON.stringify(warningVisual)}`);
  }
  if (Number(warningVisual.pointerOpacity ?? 0) < 0.45) {
    throw new Error(`missile warning direction pointer is too faint: ${JSON.stringify(warningVisual)}`);
  }
  await screenshot("04-compact-missile-warning.png");
  await page.evaluate(() => { delete window.__skyRaidAuditForceMissileWarning; });''',
    "warning browser audit",
)
source = replace_once(
    source,
    'const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, reticleBox, decisionBox, combatDiagnostics, targetDownConfirmation, baseline, realClimb, high, beforeDive, realDive, low, errors };',
    'const report = { desiredPlayerNdcY, baselineFrameTolerance, padBox, visualRingBox, captionBox, reticleBox, decisionBox, combatDiagnostics, targetDownConfirmation, warningVisual, baseline, realClimb, high, beforeDive, realDive, low, errors };',
    "warning report",
)
path.write_text(source)


# 5) Source regressions for V19 contracts.
path = Path("tests/sky-sky-raid.test.ts")
source = path.read_text()
source = replace_once(
    source,
    '''  assert.match(fxSource, /sky-raid-target-down-burst-v18/);
  assert.match(fxSource, /progress < 0\\.08/);
  assert.match(hudSource, /width: 42px/);''',
    '''  assert.match(fxSource, /sky-raid-target-down-burst-v18/);
  assert.match(fxSource, /progress < 0\\.08/);
  assert.match(fxSource, /missileWarningSegments/);
  assert.match(fxSource, /segmentArc = Math\\.PI \\* 0\\.34/);
  assert.match(fxSource, /new THREE\\.ConeGeometry\\(0\\.0072, 0\\.019, 3\\)/);
  assert.doesNotMatch(fxSource, /new THREE\\.TorusGeometry\\(0\\.078, 0\\.0055/);
  assert.match(hudSource, /width: 42px/);''',
    "warning regression",
)
source = replace_once(
    source,
    '''  assert.match(raidSource, /SKY_RAID_SCREEN_SLOTS/);
  assert.match(raidSource, /SKY_RAID_ENGAGEMENT_SLOTS/);''',
    '''  assert.match(raidSource, /SKY_RAID_SCREEN_SLOTS/);
  assert.match(raidSource, /type SkyRaidFormationBeat = "spearhead" \\| "pincer" \\| "regroup" \\| "crossfire" \\| "breakaway"/);
  assert.match(raidSource, /skyRaidFormationPattern/);
  assert.match(raidSource, /correctionSpeed: rush \\? 7\\.4 : 4\\.6/);
  assert.match(raidSource, /dataset\\.skyRaidFormationBeat/);''',
    "formation regression",
)
path.write_text(source)
