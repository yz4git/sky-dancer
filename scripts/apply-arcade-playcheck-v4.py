from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))

# Keep the wide landscape travel, but recover the aircraft sooner so a hard reversal
# never leaves the craft mostly outside the playable frame.
Path("src/sky/arcade/SkyDancerArcadeCamera.ts").write_text('''/** Wide-field chase camera with an elastic landscape safety margin. */
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  return {
    // Landscape still lets the craft cross the frame, while portrait keeps the proven safe framing.
    x: playerX * (5.15 + phone * 2.55),
    y: 5.2 + phone * 3 + playerY * (1.95 + phone * .77),
    z: 16.35 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (3.45 + phone * 3.9),
    lookY: .8 + playerY * (1.15 + phone * 1.13),
    lookZ: -34,
    fov: turbo ? 64 : 56,
    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),
  };
}
''')

runtime = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
replace_once(runtime,
'''const PLAYER_MOVE_RESPONSE = 19.5;\nconst ENEMY_FLYBY_CULL_DEPTH = -11.5;''',
'''const PLAYER_MOVE_RESPONSE = 19.5;\nconst ENEMY_FLYBY_CULL_DEPTH = -11.5;\nconst MAX_ENEMY_PROJECTILES_NORMAL = 6;\nconst MAX_ENEMY_PROJECTILES_HARD = 9;''')
replace_once(runtime,
'''      enemy.fireCooldown -= delta;\n      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) this.enemyFire(enemy);''',
'''      enemy.fireCooldown -= delta;\n      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {\n        // Route selection should stay tense without becoming an unreadable missile wall.\n        if (this.branchActive && !enemy.boss) enemy.fireCooldown = .48 + this.random() * .36;\n        else this.enemyFire(enemy);\n      }''')
replace_once(runtime,
'''  private enemyFire(enemy: ArcadeEnemy): void {\n    const hard = this.options.difficulty === "hard";\n    const spreadCount = enemy.boss ? (hard ? 5 : 4) : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;\n    for (let index = 0; index < spreadCount; index += 1) {''',
'''  private enemyFire(enemy: ArcadeEnemy): void {\n    const hard = this.options.difficulty === "hard";\n    const threatBudget = hard ? MAX_ENEMY_PROJECTILES_HARD : MAX_ENEMY_PROJECTILES_NORMAL;\n    const activeThreats = this.projectiles.filter((projectile) => projectile.owner === "enemy" && projectile.life > 0).length;\n    const desiredSpread = enemy.boss ? (hard ? 4 : 3) : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;\n    const spreadCount = Math.max(0, Math.min(desiredSpread, threatBudget - activeThreats));\n    if (spreadCount <= 0) {\n      enemy.fireCooldown = .38 + this.random() * .34;\n      return;\n    }\n    for (let index = 0; index < spreadCount; index += 1) {''')
replace_once(runtime,
'''    const base = enemy.boss ? 1.22 : enemy.kind === "missile-boat" ? 1.58 : enemy.kind === "bomber" ? 1.82 : enemy.kind === "ace" ? 1.72 : 2.18;''',
'''    const base = enemy.boss ? 1.38 : enemy.kind === "missile-boat" ? 1.68 : enemy.kind === "bomber" ? 1.9 : enemy.kind === "ace" ? 1.78 : 2.18;''')

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl, '    this.player.scale.setScalar(.9);', '    this.player.scale.setScalar(.86);')
replace_once(webgl,
'''      const existingRing = group.getObjectByName("arcade-lock-ring");\n      if (enemy.locked && !existingRing) group.add(createSkyDancerArcadeLockRing(0xff4c58));\n      if (!enemy.locked && existingRing) {\n        group.remove(existingRing);\n        this.disposeObject(existingRing);\n      }\n      const ring = group.getObjectByName("arcade-lock-ring");\n      if (ring) {\n        ring.rotation.y = -group.rotation.y;\n        ring.rotation.z = -group.rotation.z;\n        ring.scale.setScalar(enemy.boss ? 4.2 : enemy.kind === "bomber" ? 1.7 : 1.1);\n        ring.rotation.x = this.camera.rotation.x;\n      }''',
'''      const existingRing = group.getObjectByName("arcade-lock-ring");\n      if (enemy.locked && !existingRing) group.add(createSkyDancerArcadeLockRing(0xff4c58));\n      if (!enemy.locked && existingRing) {\n        group.remove(existingRing);\n        this.disposeObject(existingRing);\n      }\n      const aimDistance = Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY);\n      const aimThreshold = enemy.boss ? 1.62 : enemy.kind === "bomber" ? .96 : .82;\n      const showAimCue = !enemy.locked && enemy.depth > 7 && enemy.depth < 68 && aimDistance < aimThreshold;\n      let aimRing = group.getObjectByName("arcade-aim-ring");\n      if (showAimCue && !aimRing) {\n        aimRing = createSkyDancerArcadeLockRing(0x78eeff);\n        aimRing.name = "arcade-aim-ring";\n        aimRing.traverse((object) => {\n          if (!(object instanceof THREE.Mesh)) return;\n          const material = object.material as THREE.MeshBasicMaterial;\n          material.opacity = .34;\n        });\n        group.add(aimRing);\n      } else if (!showAimCue && aimRing) {\n        group.remove(aimRing);\n        this.disposeObject(aimRing);\n        aimRing = undefined;\n      }\n      const lockRing = group.getObjectByName("arcade-lock-ring");\n      for (const ring of [lockRing, aimRing]) {\n        if (!ring) continue;\n        ring.rotation.y = -group.rotation.y;\n        ring.rotation.z = -group.rotation.z;\n        ring.rotation.x = this.camera.rotation.x;\n      }\n      if (lockRing) lockRing.scale.setScalar(enemy.boss ? 4.2 : enemy.kind === "bomber" ? 1.7 : 1.1);\n      if (aimRing) aimRing.scale.setScalar(enemy.boss ? 3.7 : enemy.kind === "bomber" ? 1.5 : .92);''')
replace_once(webgl,
'''    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 3.35);\n    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 3.35);''',
'''    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 4.25);\n    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 4.25);''')

mode = "app/SkyDancerArcadeMode.tsx"
replace_once(mode,
'''          <div className={`${styles.missileWarning} ${missileDanger ? styles.missileDanger : ""}`} aria-live="polite">''',
'''          <div className={`${styles.missileWarning} ${snapshot.bossActive ? styles.missileWarningBoss : ""} ${missileDanger ? styles.missileDanger : ""}`} aria-live="polite">''')

css = "app/SkyDancerArcadeMode.module.css"
p = Path(css)
text = p.read_text()
needle = '.missileDanger span,.missileDanger small{color:#ff6b58}'
if text.count(needle) != 1:
    raise SystemExit("missile warning CSS insertion point missing")
text = text.replace(needle, needle + '.missileWarningBoss{top:max(108px,calc(env(safe-area-inset-top) + 103px));right:max(112px,calc(env(safe-area-inset-right) + 102px))}', 1)
p.write_text(text)

# Strengthen regression coverage for the exact issues found in the V3 visual playcheck.
test = "tests/sky-arcade-run.test.ts"
replace_once(test,
'''  assert.match(cameraSource, /playerX \\* \\(4\\.55 \\+ phone \\* 3\\.15\\)/);''',
'''  assert.match(cameraSource, /playerX \\* \\(5\\.15 \\+ phone \\* 2\\.55\\)/);\n  assert.match(runtimeSource, /MAX_ENEMY_PROJECTILES_NORMAL = 6/);\n  assert.match(runtimeSource, /threatBudget - activeThreats/);\n  assert.match(webglSource, /arcade-aim-ring/);''')
replace_once(test,
'''  assert.match(css, /\\.routeOption\\{padding:1px 4px/);''',
'''  assert.match(css, /\\.routeOption\\{padding:1px 4px/);\n  assert.match(css, /\\.missileWarningBoss\\{top:max\\(108px/);''')

# Add a behavioral cap test rather than relying only on source-string checks.
p = Path(test)
text = p.read_text()
anchor = '''test("enemy missiles curve during guidance then commit to a dodgeable terminal path", async () => {'''
if text.count(anchor) != 1:
    raise SystemExit("enemy missile test anchor missing")
behavior = '''test("normal difficulty caps simultaneous enemy missile pressure", () => {\n  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 31415 });\n  let maxThreats = 0;\n  for (let frame = 0; frame < 1500; frame += 1) {\n    runtime.step(1 / 60);\n    const snapshot = runtime.getSnapshot();\n    maxThreats = Math.max(maxThreats, snapshot.projectiles.filter((projectile) => projectile.owner === "enemy").length);\n    if (snapshot.status !== "running") break;\n  }\n  assert.ok(maxThreats <= 6, `normal threat budget ${maxThreats}`);\n});\n\n'''
text = text.replace(anchor, behavior + anchor, 1)
p.write_text(text)

print("Arcade Run playcheck V4 patch applied")
