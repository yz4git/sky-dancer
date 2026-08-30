from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def sub_once(path: str, pattern: str, repl: str) -> None:
    p = Path(path)
    text = p.read_text()
    next_text, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: regex expected one match, got {count}: {pattern[:120]!r}")
    p.write_text(next_text)

# Camera: preserve the wide playfield instead of recentering the craft too aggressively.
Path("src/sky/arcade/SkyDancerArcadeCamera.ts").write_text('''/** Wide-field chase camera: preserve visible screen-space travel before the camera catches up. */
export function arcadeCameraPose(playerX: number, playerY: number, aspect: number, turbo: boolean) {
  const portraitPullback = Math.max(0, 1.3 - aspect) * 17;
  const phone = Math.max(0, Math.min(1, (1.3 - aspect) / .5));
  return {
    x: playerX * (4.55 + phone * 1.05),
    y: 5.2 + phone * 3 + playerY * 1.68,
    z: 16.35 + portraitPullback + (turbo ? .8 : 0),
    lookX: playerX * (2.95 + phone * 1.2),
    lookY: .8 + playerY * 1.02,
    lookZ: -34,
    fov: turbo ? 64 : 56,
    roll: Math.max(-.085, Math.min(.085, -playerX * .034)),
  };
}
''')

runtime = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
replace_once(runtime,
'''        enemy.x = clamp(this.playerX * 0.5 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.4 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.74, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);''',
'''        enemy.x = clamp(this.playerX * 0.58 + Math.sin(enemy.age * frequency) * enemy.amplitude, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(this.playerY * 0.5 + enemy.baseY + Math.sin(enemy.age * 0.92 + 1.3) * 0.82, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);''')
replace_once(runtime,
'''        const pursuit = clamp((62 - enemy.depth) / 62, 0.1, enemy.kind === "ace" ? 0.72 : enemy.kind === "interceptor" ? 0.62 : 0.46);
        const weaveX = Math.sin(enemy.age * frequency + enemy.phase) * enemy.amplitude;
        const weaveY = Math.cos(enemy.age * frequency * 0.72 + enemy.phase) * enemy.amplitude * 0.72;
        enemy.x = clamp(enemy.baseX + weaveX + this.playerX * pursuit, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(enemy.baseY + weaveY + this.playerY * pursuit * 0.72, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);''',
'''        const pursuit = clamp((62 - enemy.depth) / 62, 0.12, enemy.kind === "ace" ? 0.84 : enemy.kind === "interceptor" ? 0.74 : 0.54);
        const close = clamp((68 - enemy.depth) / 54, 0, 1);
        const weaveX = Math.sin(enemy.age * frequency + enemy.phase) * enemy.amplitude;
        const weaveY = Math.cos(enemy.age * frequency * 0.72 + enemy.phase) * enemy.amplitude * 0.82;
        const flankX = Math.sin(enemy.phase * 1.91) * close * 0.42;
        const flankY = Math.cos(enemy.phase * 1.37) * close * 0.28;
        enemy.x = clamp(enemy.baseX + weaveX + this.playerX * pursuit + flankX, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(enemy.baseY + weaveY + this.playerY * pursuit * 0.82 + flankY, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);''')
replace_once(runtime,
'''        if (distance < 0.28) {
          projectile.life = 0;
          this.takeDamage(projectile.damage);
        } else if (!projectile.nearMissChecked && distance < 0.7) {''',
'''        if (distance < 0.26) {
          projectile.life = 0;
          this.takeDamage(projectile.damage);
        } else if (!projectile.nearMissChecked && distance < 0.82) {''')
replace_once(runtime,
'''        this.message = "SELECT ROUTE";
        this.messageTimer = end - this.stageTime;''',
'''        this.message = "SELECT ROUTE";
        this.messageTimer = Math.min(1.05, end - this.stageTime);''')

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl,
'''    this.player.position.set(0, 1.1, 2.8);
    this.cinematic = new SkyDancerArcadeCinematicRenderer(this.renderer);''',
'''    this.player.position.set(0, 1.1, 2.8);
    this.player.scale.setScalar(.9);
    this.cinematic = new SkyDancerArcadeCinematicRenderer(this.renderer);''')
replace_once(webgl,
'''          : enemyMissile
            ? new THREE.ConeGeometry(0.3, 2.62, 8)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);''',
'''          : enemyMissile
            ? new THREE.ConeGeometry(0.36, 1.62, 8)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);''')
replace_once(webgl,
'''        : projectile.owner === "enemy"
          ? 1.14 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.12
          : 1;''',
'''        : projectile.owner === "enemy"
          ? 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : 1;''')
replace_once(webgl,
'''    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 6.5);
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 6.5);
    this.camera.position.z += (pose.z - this.camera.position.z) * Math.min(1, delta * 5);
    this.camera.fov += (pose.fov - this.camera.fov) * Math.min(1, delta * 5);''',
'''    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 3.35);
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 3.35);
    this.camera.position.z += (pose.z - this.camera.position.z) * Math.min(1, delta * 4.5);
    this.camera.fov += (pose.fov - this.camera.fov) * Math.min(1, delta * 4.5);''')
replace_once(webgl,
'''  private syncAudio(snapshot: SkyDancerArcadeSnapshot): void {
    this.audio.update(snapshot);
    if (snapshot.shotSerial !== this.previousSnapshot.shotSerial) this.audio.tone(170, 0.035, 0.012, "sawtooth");
    if (snapshot.missileSerial !== this.previousSnapshot.missileSerial) this.audio.tone(430, 0.16, 0.04, "square");
    if (snapshot.hitSerial !== this.previousSnapshot.hitSerial) this.audio.tone(90, 0.08, 0.035, "triangle");
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) this.audio.tone(54, 0.22, 0.06, "sawtooth");
    if (snapshot.resultSerial !== this.previousSnapshot.resultSerial) this.audio.tone(660, 0.32, 0.045, "triangle");
  }''',
'''  private syncAudio(snapshot: SkyDancerArcadeSnapshot): void {
    this.audio.update(snapshot);
    if (snapshot.shotSerial !== this.previousSnapshot.shotSerial) this.audio.tone(170, 0.035, 0.012, "sawtooth");
    if (snapshot.missileSerial !== this.previousSnapshot.missileSerial) this.audio.tone(430, 0.16, 0.04, "square");
    if (snapshot.hitSerial !== this.previousSnapshot.hitSerial) this.audio.tone(90, 0.08, 0.035, "triangle");
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) this.audio.tone(54, 0.22, 0.06, "sawtooth");
    if (snapshot.resultSerial !== this.previousSnapshot.resultSerial) this.audio.tone(660, 0.32, 0.045, "triangle");
    const incoming = snapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    const wasIncoming = this.previousSnapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    if (incoming && !wasIncoming) this.audio.tone(880, 0.12, 0.026, "square");
  }''')

presentation = "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"
replace_once(presentation,
'''export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 32, sparks: 160, smoke: 56 } as const;
const SPEED_STREAK_COUNT = 40;
const RETIRE_SECONDS = .65;''',
'''export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 160, smoke: 56 } as const;
const SPEED_STREAK_COUNT = 40;
const RETIRE_SECONDS = .32;''')
replace_once(presentation,
'''    uniforms: { tint: { value: new THREE.Color(enemy ? 0xff7a2e : 0xc8f7ff) }, opacity: { value: enemy ? .9 : .8 } },''',
'''    uniforms: { tint: { value: new THREE.Color(enemy ? 0xff7a2e : 0xc8f7ff) }, opacity: { value: enemy ? .62 : .76 } },''')
replace_once(presentation,
'''      void main(){float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),1.2);float tail=.18+.82*vUv.y;
      gl_FragColor=vec4(tint*(.7+.4*edge),edge*tail*opacity);}``,'''.replace('}``,','}`,') if False else '''      void main(){float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),1.2);float tail=.18+.82*vUv.y;
      gl_FragColor=vec4(tint*(.7+.4*edge),edge*tail*opacity);}`,''',
'''      void main(){float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),1.35);float tail=pow(clamp(vUv.y,0.0,1.0),2.25);
      gl_FragColor=vec4(tint*(.72+.38*edge),edge*tail*opacity);}`,''')
replace_once(presentation,
'''  return { mesh, points: new Float32Array(samples * 3), positions, count: 0, width: enemy ? .31 : .25, retiredAge: null };''',
'''  return { mesh, points: new Float32Array(samples * 3), positions, count: 0, width: enemy ? .19 : .22, retiredAge: null };''')
replace_once(presentation,
'''      trail.mesh.material.uniforms.opacity.value = .8 * (1 - trail.retiredAge / RETIRE_SECONDS);''',
'''      trail.mesh.material.uniforms.opacity.value = .48 * (1 - trail.retiredAge / RETIRE_SECONDS);''')

mode = "app/SkyDancerArcadeMode.tsx"
replace_once(mode,
'''  const bossPercent = snapshot.bossMaxHp > 0 ? Math.round(snapshot.bossHp / snapshot.bossMaxHp * 100) : 0;
  const controlsVisible = snapshot.status === "running";''',
'''  const bossPercent = snapshot.bossMaxHp > 0 ? Math.round(snapshot.bossHp / snapshot.bossMaxHp * 100) : 0;
  const incomingMissiles = snapshot.projectiles.filter((projectile) => projectile.owner === "enemy"
    && projectile.depth > 2.2 && projectile.depth < 34
    && Math.hypot(projectile.x - snapshot.playerX, projectile.y - snapshot.playerY) < 1.9);
  const missileDanger = incomingMissiles.some((projectile) => projectile.depth < 17);
  const controlsVisible = snapshot.status === "running";''')
replace_once(mode,
'''        {snapshot.chain > 1 && <div className={`${styles.chain} ${productStyles.chainReadout}`}>CHAIN <strong>×{snapshot.chain}</strong></div>}

        {snapshot.bossActive && (''',
'''        {snapshot.chain > 1 && <div className={`${styles.chain} ${productStyles.chainReadout}`}>CHAIN <strong>×{snapshot.chain}</strong></div>}
        {incomingMissiles.length > 0 && (
          <div className={`${styles.missileWarning} ${missileDanger ? styles.missileDanger : ""}`} aria-live="polite">
            <span>MISSILE</span><strong>×{incomingMissiles.length}</strong><small>{missileDanger ? "BREAK NOW" : "INCOMING"}</small>
          </div>
        )}

        {snapshot.bossActive && (''')

css = "app/SkyDancerArcadeMode.module.css"
p = Path(css)
text = p.read_text()
old = '.routeOverlay{position:absolute;z-index:8;left:50%;top:max(76px,calc(env(safe-area-inset-top) + 72px));transform:translateX(-50%);width:min(400px,44vw);text-align:center;pointer-events:none}.routeOverlay>small{display:inline-block;padding:2px 7px;border-radius:999px;background:rgba(4,13,27,.38);font-size:6px;font-weight:1000;letter-spacing:.18em;color:rgba(255,255,255,.78)}.routeOptions{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-top:3px}.routeOption{padding:2px 5px;border:1px solid rgba(255,255,255,.12);border-radius:5px;background:rgba(6,13,30,.2);opacity:.34;transition:.12s}.routeOption span,.routeOption strong{display:block}.routeOption span{font-size:5px;font-weight:1000;letter-spacing:.13em;color:#6fe8ff}.routeOption strong{margin-top:1px;font-size:8px;letter-spacing:.06em}.routeSelected{transform:scale(1.015);border-color:rgba(255,224,107,.78);background:rgba(23,28,39,.34);box-shadow:0 0 9px rgba(255,209,75,.14);opacity:.78}'
new = '.routeOverlay{position:absolute;z-index:8;left:50%;top:max(82px,calc(env(safe-area-inset-top) + 76px));transform:translateX(-50%);width:min(330px,38vw);text-align:center;pointer-events:none}.routeOverlay>small{display:inline-block;padding:1px 6px;border-radius:999px;background:rgba(4,13,27,.28);font-size:5px;font-weight:1000;letter-spacing:.16em;color:rgba(255,255,255,.7)}.routeOptions{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;margin-top:2px}.routeOption{padding:1px 4px;border:1px solid rgba(255,255,255,.09);border-radius:4px;background:rgba(6,13,30,.1);opacity:.22;transition:.12s}.routeOption span,.routeOption strong{display:block}.routeOption span{font-size:4px;font-weight:1000;letter-spacing:.12em;color:#6fe8ff}.routeOption strong{margin-top:1px;font-size:7px;letter-spacing:.05em}.routeSelected{transform:scale(1.02);border-color:rgba(255,224,107,.7);background:rgba(23,28,39,.3);box-shadow:0 0 8px rgba(255,209,75,.12);opacity:.82}'
if text.count(old) != 1:
    raise SystemExit(f"route css expected one match, got {text.count(old)}")
text = text.replace(old, new, 1)
insert_after = '.chain strong{color:#ff668d}'
warning_css = '.missileWarning{position:absolute;z-index:11;right:max(126px,calc(env(safe-area-inset-right) + 116px));top:max(66px,calc(env(safe-area-inset-top) + 61px));display:flex;align-items:baseline;gap:5px;padding:4px 7px;border:1px solid rgba(255,167,74,.55);border-radius:5px;background:rgba(31,10,5,.58);box-shadow:0 0 14px rgba(255,93,42,.16);font-weight:1000;letter-spacing:.11em;pointer-events:none}.missileWarning span{font-size:7px;color:#ffb15c}.missileWarning strong{font-size:13px;color:#fff}.missileWarning small{font-size:5px;color:rgba(255,255,255,.72)}.missileDanger{border-color:rgba(255,69,65,.9);background:rgba(53,5,7,.76);box-shadow:0 0 18px rgba(255,56,45,.42);animation:missilePulse .36s steps(2,end) infinite}.missileDanger span,.missileDanger small{color:#ff6b58}@keyframes missilePulse{50%{transform:scale(1.06);filter:brightness(1.25)}}'
if insert_after not in text:
    raise SystemExit("missile warning css insertion point missing")
text = text.replace(insert_after, insert_after + warning_css, 1)
p.write_text(text)

audit = "scripts/webgl-arcade-run-reference-audit.mjs"
replace_once(audit, 'await page.waitForTimeout(1200);\nawait page.screenshot({ path: `${outputDir}/01-wide-right-top.png`, fullPage: true });', 'await page.waitForTimeout(1500);\nawait page.screenshot({ path: `${outputDir}/01-wide-right-top.png`, fullPage: true });')
replace_once(audit, 'await page.waitForTimeout(1450);\nawait page.screenshot({ path: `${outputDir}/01b-wide-left-bottom.png`, fullPage: true });', 'await page.waitForTimeout(2200);\nawait page.screenshot({ path: `${outputDir}/01b-wide-left-bottom.png`, fullPage: true });')
replace_once(audit,
'''await page.keyboard.up("x");
await page.keyboard.up("c");
await page.waitForTimeout(2300);
await page.screenshot({ path: `${outputDir}/02b-enemy-missile-evasion.png`, fullPage: true });''',
'''await page.keyboard.up("x");
await page.keyboard.up("c");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outputDir}/02a-missile-approach.png`, fullPage: true });
await page.keyboard.down("ArrowRight");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(650);
await page.screenshot({ path: `${outputDir}/02b-enemy-missile-evasion.png`, fullPage: true });
await page.keyboard.up("ArrowRight");
await page.keyboard.up("ArrowUp");''')

print("Arcade Run playcheck V3 patch applied")
