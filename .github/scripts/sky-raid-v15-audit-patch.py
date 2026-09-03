from pathlib import Path

p = Path("src/sky/SkyDancerSkyRaid.ts")
s = p.read_text()

old = "let latestSkyRaidSnapshot: SkyDancerSkyRaidSnapshot | null = null;\n"
new = old + 'let skyRaidAuditForcedActId: SkyDancerSkyRaidAct["id"] | null = null;\n'
if old not in s:
    raise SystemExit("snapshot marker missing")
s = s.replace(old, new, 1)

old = """  const raid = updateRaid(demo.session as unknown as RaidSession, hunt, 0);
  publishSkyRaidWorldStyle(raid);
"""
new = """  const baseRaid = updateRaid(demo.session as unknown as RaidSession, hunt, 0);
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidAuditForceAct = (actId: SkyDancerSkyRaidAct["id"] | null) => {
      skyRaidAuditForcedActId = actId && SKY_DANCER_SKY_RAID_ACTS.some((candidate) => candidate.id === actId) ? actId : null;
    };
  }
  const forcedAct = skyRaidAuditForcedActId
    ? SKY_DANCER_SKY_RAID_ACTS.find((candidate) => candidate.id === skyRaidAuditForcedActId) ?? null
    : null;
  const raid: SkyDancerSkyRaidSnapshot = forcedAct
    ? { ...baseRaid, actIndex: forcedAct.index, actId: forcedAct.id, actLabel: forcedAct.label, actSubtitle: forcedAct.subtitle, setpiece: forcedAct.setpiece, elapsedSeconds: forcedAct.startSeconds + 6, actElapsedSeconds: 6, actSecondsRemaining: Math.max(0, forcedAct.endSeconds - forcedAct.startSeconds - 6), rushActive: false, palette: forcedAct.palette }
    : baseRaid;
  publishSkyRaidWorldStyle(raid);
  if (forcedAct) broadcast(raid);
"""
if old not in s:
    raise SystemExit("raid update marker missing")
s = s.replace(old, new, 1)

old = """  visual.arcadeWorld.update(raid.actId, base.x, base.z, base.heading, flight.altitude, raid.elapsedSeconds, delta);

  visual.speedFx.visible = base.boostActive || raid.rushActive;
"""
new = """  visual.arcadeWorld.update(raid.actId, base.x, base.z, base.heading, flight.altitude, raid.elapsedSeconds, delta);
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidAuditFlightState = () => {
      demo.scene.updateMatrixWorld(true);
      demo.camera.updateMatrixWorld(true);
      const player = new THREE.Vector3();
      demo.playerVisual.getWorldPosition(player);
      const projected = player.clone().project(demo.camera);
      return {
        altitude: Number(demo.scene.userData.skyRaidPlayerAltitude ?? 0),
        verticalSpeed: Number(demo.scene.userData.skyRaidPlayerVerticalSpeed ?? 0),
        pitch: Number(demo.scene.userData.skyRaidPlayerPitch ?? 0),
        bank: Number(demo.scene.userData.skyRaidPlayerBank ?? 0),
        cameraFov: Number(demo.camera.fov.toFixed(3)),
        boostActive: base.boostActive,
        freeFlightSectors: Number(demo.scene.userData.skyRaidArcadeFreeFlightSectorCount ?? 0),
        worldLocked: Boolean(demo.scene.userData.skyRaidArcadeWorldLocked),
        playerWorld: { x: Number(player.x.toFixed(3)), y: Number(player.y.toFixed(3)), z: Number(player.z.toFixed(3)) },
        playerNdc: { x: Number(projected.x.toFixed(4)), y: Number(projected.y.toFixed(4)), z: Number(projected.z.toFixed(4)), visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 },
      };
    };
    (window as unknown as Record<string, unknown>).__skyRaidAuditPrepareCombatTarget = () => {
      const current = demo.session.snapshot();
      const enemies = demo.session.enemies
        .filter((enemy) => enemy.alive && enemy.nodeId === demo.session.location.node.id)
        .slice(0, 6);
      const sideX = Math.cos(current.heading);
      const sideZ = -Math.sin(current.heading);
      enemies.forEach((enemy, index) => {
        const ahead = 9 + index * 1.4;
        const lateral = (index - (enemies.length - 1) * 0.5) * 1.15;
        enemy.x = current.x + Math.sin(current.heading) * ahead + sideX * lateral;
        enemy.z = current.z + Math.cos(current.heading) * ahead + sideZ * lateral;
        enemy.heading = current.heading + Math.PI;
      });
      return enemies.map((enemy) => ({ id: enemy.id, x: enemy.x, z: enemy.z, kind: enemy.kind }));
    };
  }

  visual.speedFx.visible = base.boostActive || raid.rushActive;
"""
if old not in s:
    raise SystemExit("world update marker missing")
p.write_text(s.replace(old, new, 1))
print("V15 audit hooks injected")
