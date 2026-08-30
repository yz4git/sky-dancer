from pathlib import Path


def rep(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

runtime = 'src/sky/arcade/SkyDancerArcadeRuntime.ts'
rep(runtime,
'''        enemy.x = clamp(this.playerX * 0.42 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.32 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.68, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);''',
'''        enemy.x = clamp(this.playerX * 0.5 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.4 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.74, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);''')
rep(runtime,
'''        const pursuit = clamp((62 - enemy.depth) / 62, 0.08, enemy.kind === "ace" ? 0.62 : enemy.kind === "interceptor" ? 0.52 : 0.38);''',
'''        const pursuit = clamp((62 - enemy.depth) / 62, 0.1, enemy.kind === "ace" ? 0.72 : enemy.kind === "interceptor" ? 0.62 : 0.46);''')
rep(runtime,
'''    const spreadCount = enemy.boss ? (hard ? 6 : 4) : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 3 : enemy.kind === "ace" ? 2 : 1;''',
'''    const spreadCount = enemy.boss ? (hard ? 5 : 4) : enemy.kind === "missile-boat" || enemy.kind === "bomber" ? 2 : enemy.kind === "ace" ? 2 : 1;''')
rep(runtime,
'''      const guidance = enemy.boss ? 1.18 : enemy.kind === "missile-boat" ? 1.42 : enemy.kind === "bomber" ? 1.16 : enemy.kind === "ace" ? 1.05 : 0.82;''',
'''      const guidance = enemy.boss ? 1.34 : enemy.kind === "missile-boat" ? 1.52 : enemy.kind === "bomber" ? 1.26 : enemy.kind === "ace" ? 1.12 : 0.88;''')
rep(runtime,
'''        if (projectile.guidance > 0 && projectile.depth > 11) {
          const desiredVX = clamp((this.playerX - projectile.x) * 0.72, -1.95, 1.95);
          const desiredVY = clamp((this.playerY - projectile.y) * 0.72, -1.7, 1.7);
          projectile.vx = moveToward(projectile.vx, desiredVX, delta * 1.85);
          projectile.vy = moveToward(projectile.vy, desiredVY, delta * 1.7);
          projectile.guidance = Math.max(0, projectile.guidance - delta);
        }
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;''',
'''        if (projectile.guidance > 0 && projectile.depth > 15) {
          const curvePhase = projectile.id * 1.731 + projectile.life * 4.6;
          const desiredVX = clamp((this.playerX - projectile.x) * 0.76 + Math.sin(curvePhase) * 0.46, -2.05, 2.05);
          const desiredVY = clamp((this.playerY - projectile.y) * 0.76 + Math.cos(curvePhase * 0.83) * 0.3, -1.78, 1.78);
          projectile.vx = moveToward(projectile.vx, desiredVX, delta * 2.15);
          projectile.vy = moveToward(projectile.vy, desiredVY, delta * 1.95);
          projectile.guidance = Math.max(0, projectile.guidance - delta);
        } else if (projectile.depth <= 15) {
          projectile.guidance = 0;
        }
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;''')

camera = 'src/sky/arcade/SkyDancerArcadeCamera.ts'
rep(camera,
'''    y: 5.2 + phone * 3 + playerY * 3.82,
    z: 16.2 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (5.55 + phone * 1.8),
    lookY: .8 + playerY * 3.48,''',
'''    y: 5.2 + phone * 3 + playerY * 2.72,
    z: 16.2 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (5.55 + phone * 1.8),
    lookY: .8 + playerY * 2.28,''')

webgl = 'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts'
rep(webgl,
'''        const color = projectile.owner === "enemy" ? 0xff5b32 : projectile.owner === "player-missile" ? 0x64e9ff : 0xc8f8ff;
        const geometry = projectile.owner === "player-missile"
          ? new THREE.ConeGeometry(0.16, 1.02, 7)
          : projectile.owner === "enemy"
            ? new THREE.ConeGeometry(0.24, 2.35, 8)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);
        geometry.rotateX(Math.PI / 2);
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false }),
        );''',
'''        const enemyMissile = projectile.owner === "enemy";
        const color = enemyMissile ? 0xff8a2b : projectile.owner === "player-missile" ? 0x64e9ff : 0xc8f8ff;
        const geometry = projectile.owner === "player-missile"
          ? new THREE.ConeGeometry(0.16, 1.02, 7)
          : enemyMissile
            ? new THREE.ConeGeometry(0.3, 2.62, 8)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);
        geometry.rotateX(Math.PI / 2);
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color,
            transparent: !enemyMissile,
            opacity: enemyMissile ? 1 : 0.94,
            blending: enemyMissile ? THREE.NormalBlending : THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        );''')
rep(webgl,
'''          ? 1.18 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.16''',
'''          ? 1.14 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.12''')

presentation = 'src/sky/arcade/SkyDancerArcadeProductPresentation.ts'
rep(presentation,
'''uniforms: { tint: { value: new THREE.Color(enemy ? 0xff5b32 : 0xc8f7ff) }, opacity: { value: enemy ? .98 : .8 } },''',
'''uniforms: { tint: { value: new THREE.Color(enemy ? 0xff7a2e : 0xc8f7ff) }, opacity: { value: enemy ? .9 : .8 } },''')
rep(presentation,
'''return { mesh, points: new Float32Array(samples * 3), positions, count: 0, width: enemy ? .38 : .25, retiredAge: null };''',
'''return { mesh, points: new Float32Array(samples * 3), positions, count: 0, width: enemy ? .31 : .25, retiredAge: null };''')

test = 'tests/sky-arcade-run.test.ts'
p = Path(test)
text = p.read_text()
text = text.replace('assert.match(webglSource, /ConeGeometry\\(0\\.24, 2\\.35, 8\\)/);', 'assert.match(webglSource, /ConeGeometry\\(0\\.3, 2\\.62, 8\\)/);')
text = text.replace('assert.match(presentationSource, /width: enemy \\? \\.38 : \\.25/);', 'assert.match(presentationSource, /width: enemy \\? \\.31 : \\.25/);')
anchor = '''test("climax targets survive a real attack run", () => {'''
addition = '''test("enemy missiles curve during guidance then commit to a dodgeable terminal path", async () => {
  const runtimeSource = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(runtimeSource, /curvePhase = projectile\.id \* 1\.731/);
  assert.match(runtimeSource, /projectile\.depth > 15/);
  assert.match(runtimeSource, /projectile\.depth <= 15/);
  assert.match(runtimeSource, /projectile\.guidance = 0/);
});

'''
if text.count(anchor) != 1:
    raise SystemExit('climax test anchor mismatch')
text = text.replace(anchor, addition + anchor, 1)
p.write_text(text)
