from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

runtime = "src/sky/arcade/SkyDancerArcadeRuntime.ts"
replace_once(runtime, '''function arcadeLoadoutGunCooldown(loadout: SkyDancerArcadeLoadout | undefined): number {
  return GUN_COOLDOWN * (loadout === "gun-focus" ? 0.74 : loadout === "missile-focus" ? 1.08 : 1);
}

function arcadeLoadoutGunDamage(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "gun-focus" ? 1.18 : loadout === "missile-focus" ? 0.92 : 1;
}

function arcadeLoadoutLockInterval(loadout: SkyDancerArcadeLoadout | undefined): number {
  return LOCK_INTERVAL * (loadout === "missile-focus" ? 0.72 : loadout === "gun-focus" ? 1.1 : 1);
}

function arcadeLoadoutMissileDamage(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "missile-focus" ? 1.22 : loadout === "gun-focus" ? 0.92 : 1;
}

function arcadeLoadoutMissileSpeed(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "missile-focus" ? 1.1 : loadout === "gun-focus" ? 0.96 : 1;
}
''', '''function arcadeStandardFusionActive(loadout: SkyDancerArcadeLoadout | undefined, turboActive: boolean): boolean {
  return (loadout ?? "standard") === "standard" && turboActive;
}

function arcadeLoadoutGunCooldown(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "gun-focus") return GUN_COOLDOWN * 0.74;
  if (loadout === "missile-focus") return GUN_COOLDOWN * 1.08;
  return GUN_COOLDOWN * (arcadeStandardFusionActive(loadout, turboActive) ? 0.86 : 1);
}

/** V11.7 damage is per projectile: Gun Focus fires a matched twin pair. */
function arcadeLoadoutGunDamage(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "gun-focus") return 0.59;
  if (loadout === "missile-focus") return 0.92;
  return arcadeStandardFusionActive(loadout, turboActive) ? 1.12 : 1;
}

function arcadeLoadoutGunProjectiles(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "gun-focus" ? 2 : 1;
}

function arcadeLoadoutLockInterval(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "missile-focus") return LOCK_INTERVAL * 0.72;
  if (loadout === "gun-focus") return LOCK_INTERVAL * 1.1;
  return LOCK_INTERVAL * (arcadeStandardFusionActive(loadout, turboActive) ? 0.88 : 1);
}

function arcadeLoadoutLockThreshold(loadout: SkyDancerArcadeLoadout | undefined, boss: boolean, turboActive = false): number {
  const base = boss ? 1.85 : 1.45;
  if (loadout === "missile-focus") return base + (boss ? 0.42 : 0.4);
  if (loadout === "gun-focus") return base - (boss ? 0.12 : 0.16);
  return base + (arcadeStandardFusionActive(loadout, turboActive) ? (boss ? 0.2 : 0.18) : 0);
}

/** V11.7 damage is per missile: Missile Focus launches two missiles per locked target. */
function arcadeLoadoutMissileDamage(loadout: SkyDancerArcadeLoadout | undefined, turboActive = false): number {
  if (loadout === "missile-focus") return 0.7;
  if (loadout === "gun-focus") return 0.92;
  return arcadeStandardFusionActive(loadout, turboActive) ? 1.12 : 1;
}

function arcadeLoadoutMissileCount(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "missile-focus" ? 2 : 1;
}

function arcadeLoadoutMissileSpeed(loadout: SkyDancerArcadeLoadout | undefined): number {
  return loadout === "missile-focus" ? 1.12 : loadout === "gun-focus" ? 0.96 : 1;
}
''')

replace_once(runtime, '''  private updateLocking(delta: number): void {
    this.lockCooldown = Math.max(0, this.lockCooldown - delta);
    if (!this.input.lock || this.lockCooldown > 0) return;
    const locked = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;
    if (locked >= SKY_DANCER_ARCADE_MAX_LOCKS) return;
    let candidate: ArcadeEnemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.locked || enemy.depth < 4 || enemy.depth > 92) continue;
      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const reticleDistance = Math.hypot(dx, dy);
      const threshold = enemy.boss ? 1.85 : 1.45;
      if (reticleDistance > threshold) continue;
      const score = reticleDistance * 20 + enemy.depth * 0.05 - skyDancerArcadeTargetPriority(enemy.role);
      if (score < best) {
        best = score;
        candidate = enemy;
      }
    }
    if (candidate) {
      candidate.locked = true;
      this.lockCooldown = arcadeLoadoutLockInterval(this.options.loadout);
      this.message = `LOCK ${locked + 1}`;
      this.messageTimer = 0.35;
    }
  }
''', '''  private updateLocking(delta: number): void {
    this.lockCooldown = Math.max(0, this.lockCooldown - delta);
    if (!this.input.lock || this.lockCooldown > 0) return;
    const locked = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;
    if (locked >= SKY_DANCER_ARCADE_MAX_LOCKS) return;
    const turboLink = this.input.turbo && this.turbo > 0.5;
    let candidate: ArcadeEnemy | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.locked || enemy.depth < 4 || enemy.depth > 92) continue;
      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const reticleDistance = Math.hypot(dx, dy);
      const threshold = arcadeLoadoutLockThreshold(this.options.loadout, enemy.boss, turboLink);
      if (reticleDistance > threshold) continue;
      const score = reticleDistance * 20 + enemy.depth * 0.05 - skyDancerArcadeTargetPriority(enemy.role);
      if (score < best) {
        best = score;
        candidate = enemy;
      }
    }
    if (candidate) {
      candidate.locked = true;
      this.lockCooldown = arcadeLoadoutLockInterval(this.options.loadout, turboLink);
      this.message = this.options.loadout === "missile-focus"
        ? `RAPID LOCK ${locked + 1}`
        : arcadeStandardFusionActive(this.options.loadout, turboLink)
          ? `FUSION LOCK ${locked + 1}`
          : `LOCK ${locked + 1}`;
      this.messageTimer = 0.35;
    }
  }
''')

replace_once(runtime, '''  private updateWeapons(delta: number): void {
    this.gunCooldown = Math.max(0, this.gunCooldown - delta);
    if (!this.input.fire || this.gunCooldown > 0) return;
    this.gunCooldown = arcadeLoadoutGunCooldown(this.options.loadout);
    const target = this.chooseGunTarget();
    this.projectiles.push({
      id: this.nextEntityId++,
      owner: "player-gun",
      x: this.playerX,
      y: this.playerY,
      depth: 1.2,
      targetEnemyId: target?.id ?? null,
      speed: 118,
      damage: (this.options.difficulty === "hard" ? 8 : 9.5) * arcadeLoadoutGunDamage(this.options.loadout),
      life: 1.05,
      vx: target ? (target.x - this.playerX) * 0.48 : 0,
      vy: target ? (target.y - this.playerY) * 0.48 : 0,
      guidance: 0,
      nearMissChecked: false,
    });
    this.shotSerial += 1;
  }
''', '''  private updateWeapons(delta: number): void {
    this.gunCooldown = Math.max(0, this.gunCooldown - delta);
    if (!this.input.fire || this.gunCooldown > 0) return;
    const turboLink = this.input.turbo && this.turbo > 0.5;
    this.gunCooldown = arcadeLoadoutGunCooldown(this.options.loadout, turboLink);
    const target = this.chooseGunTarget();
    const volleyCount = arcadeLoadoutGunProjectiles(this.options.loadout);
    for (let index = 0; index < volleyCount; index += 1) {
      const side = volleyCount === 1 ? 0 : (index === 0 ? -1 : 1);
      this.projectiles.push({
        id: this.nextEntityId++,
        owner: "player-gun",
        x: this.playerX + side * 0.055,
        y: this.playerY + side * 0.012,
        depth: 1.2,
        targetEnemyId: target?.id ?? null,
        speed: this.options.loadout === "gun-focus" ? 126 : 118,
        damage: (this.options.difficulty === "hard" ? 8 : 9.5) * arcadeLoadoutGunDamage(this.options.loadout, turboLink),
        life: 1.05,
        vx: target ? (target.x - this.playerX) * 0.48 + side * 0.028 : side * 0.024,
        vy: target ? (target.y - this.playerY) * 0.48 - side * 0.012 : -side * 0.01,
        guidance: 0,
        nearMissChecked: false,
      });
    }
    this.shotSerial += 1;
  }
''')

replace_once(runtime, '''  private launchLockedMissiles(): void {
    if (this.status !== "running") return;
    let targets = this.enemies.filter((enemy) => enemy.alive && enemy.locked).slice(0, SKY_DANCER_ARCADE_MAX_LOCKS);
    if (targets.length === 0) {
      const fallback = this.chooseGunTarget();
      if (fallback) targets = [fallback];
    }
    targets.forEach((target, index) => {
      target.locked = false;
      this.projectiles.push({
        id: this.nextEntityId++,
        owner: "player-missile",
        x: this.playerX + (index % 2 === 0 ? -0.08 : 0.08),
        y: this.playerY - 0.05,
        depth: 0.8,
        targetEnemyId: target.id,
        speed: 62 * arcadeLoadoutMissileSpeed(this.options.loadout),
        damage: (target.boss ? 34 : 46) * arcadeLoadoutMissileDamage(this.options.loadout),
        life: 2.8,
        vx: 0,
        vy: 0,
        guidance: 0,
        nearMissChecked: false,
      });
    });
    if (targets.length > 0) {
      this.missileSerial += 1;
      this.message = targets.length >= 4 ? `MULTI LOCK ×${targets.length}` : "FOX TWO";
      this.messageTimer = 0.9;
    }
  }
''', '''  private launchLockedMissiles(): void {
    if (this.status !== "running") return;
    let targets = this.enemies.filter((enemy) => enemy.alive && enemy.locked).slice(0, SKY_DANCER_ARCADE_MAX_LOCKS);
    if (targets.length === 0) {
      const fallback = this.chooseGunTarget();
      if (fallback) targets = [fallback];
    }
    const turboLink = this.input.turbo && this.turbo > 0.5;
    const rippleCount = arcadeLoadoutMissileCount(this.options.loadout);
    targets.forEach((target, targetIndex) => {
      target.locked = false;
      for (let ripple = 0; ripple < rippleCount; ripple += 1) {
        const side = (targetIndex + ripple) % 2 === 0 ? -1 : 1;
        this.projectiles.push({
          id: this.nextEntityId++,
          owner: "player-missile",
          x: this.playerX + side * (rippleCount === 2 ? 0.13 : 0.08),
          y: this.playerY - 0.05 + (rippleCount === 2 ? (ripple === 0 ? -0.025 : 0.035) : 0),
          depth: 0.8 + ripple * 0.08,
          targetEnemyId: target.id,
          speed: 62 * arcadeLoadoutMissileSpeed(this.options.loadout) * (1 + ripple * 0.025),
          damage: (target.boss ? 34 : 46) * arcadeLoadoutMissileDamage(this.options.loadout, turboLink),
          life: 2.8,
          vx: side * (rippleCount === 2 ? 0.035 : 0),
          vy: rippleCount === 2 ? (ripple === 0 ? -0.018 : 0.018) : 0,
          guidance: 0,
          nearMissChecked: false,
        });
      }
    });
    if (targets.length > 0) {
      this.missileSerial += 1;
      const missileCount = targets.length * rippleCount;
      this.message = this.options.loadout === "missile-focus"
        ? `RAPID RIPPLE ×${missileCount}`
        : arcadeStandardFusionActive(this.options.loadout, turboLink)
          ? `FUSION SALVO ×${missileCount}`
          : targets.length >= 4 ? `MULTI LOCK ×${targets.length}` : "FOX TWO";
      this.messageTimer = 0.9;
    }
  }
''')

menu = "app/CartGameMenu.tsx"
replace_once(menu, '''const LOADOUT_OPTIONS: readonly { id: SkyDancerArcadeLoadout; label: string; detail: string; unlock: number }[] = [
  { id: "standard", label: "STANDARD", detail: "BALANCED GUN / LOCK / MISSILE", unlock: 0 },
  { id: "missile-focus", label: "MISSILE", detail: "LOCK +28% · MISSILE +22% · GUN -8%", unlock: 12 },
  { id: "gun-focus", label: "GUN", detail: "GUN RATE +35% · DAMAGE +18% · MISSILE -8%", unlock: 24 },
];
''', '''const LOADOUT_OPTIONS: readonly { id: SkyDancerArcadeLoadout; label: string; detail: string; unlock: number }[] = [
  { id: "standard", label: "STANDARD", detail: "FUSION LINK · TURBO BOOSTS FIRE + LOCK", unlock: 0 },
  { id: "missile-focus", label: "MISSILE", detail: "RAPID MULTI · WIDE LOCK · TWIN RIPPLE", unlock: 12 },
  { id: "gun-focus", label: "GUN", detail: "TWIN BURST · DUAL CANNON · HIGH RATE", unlock: 24 },
];
''')

mode = "app/SkyDancerArcadeMode.tsx"
replace_once(mode, '''  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !persistedPracticeMedals.includes(medal.id) && !medal.earned);

  return (
''', '''  const practiceNextTarget = snapshot.lastStageMedals.find((medal) => !persistedPracticeMedals.includes(medal.id) && !medal.earned);
  const standardFusionActive = snapshot.loadout === "standard" && snapshot.turboActive;
  const fireDoctrine = snapshot.loadout === "gun-focus" ? "TWIN BURST" : snapshot.loadout === "missile-focus" ? "BACKUP GUN" : standardFusionActive ? "FUSION GUN" : "HOLD · GUN";
  const lockDoctrine = snapshot.loadout === "missile-focus" ? "RAPID MULTI" : snapshot.loadout === "gun-focus" ? "TACTICAL LOCK" : standardFusionActive ? "FUSION SALVO" : "RELEASE SALVO";
  const turboDoctrine = snapshot.loadout === "standard" ? (standardFusionActive ? "FUSION LINK" : "LINK DRIVE") : snapshot.turboActive ? "SMASH" : "HOLD";

  return (
''')
replace_once(mode, '''            <div className={styles.actions} aria-label="Arcade combat controls">
''', '''            <div className={styles.actions} aria-label="Arcade combat controls" data-loadout={snapshot.loadout} data-fusion={standardFusionActive}>
''')
replace_once(mode, '''              ><CombatIcon kind="fire" /><strong>FIRE</strong><small>HOLD · GUN</small></button>
''', '''              ><CombatIcon kind="fire" /><strong>FIRE</strong><small>{fireDoctrine}</small></button>
''')
replace_once(mode, '''              ><CombatIcon kind="lock" /><strong>LOCK <span>{snapshot.lockedCount}/8</span></strong><small>RELEASE SALVO</small></button>
''', '''              ><CombatIcon kind="lock" /><strong>LOCK <span>{snapshot.lockedCount}/8</span></strong><small>{lockDoctrine}</small></button>
''')
replace_once(mode, '''              ><CombatIcon kind="turbo" /><strong>TURBO</strong><small>{Math.round(snapshot.turbo)}% · {snapshot.turboActive ? "SMASH" : "HOLD"}</small></button>
''', '''              ><CombatIcon kind="turbo" /><strong>TURBO</strong><small>{Math.round(snapshot.turbo)}% · {turboDoctrine}</small></button>
''')
replace_once(mode, '''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? `3D FLIGHT · V11.6 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}` : `COMPATIBILITY · CANVAS · V11.6 · ${snapshot.loadout.toUpperCase()}`}</span>
''', '''        <span className={productStyles.rendererBadge}>{rendererName === "WEBGL" ? `3D FLIGHT · V11.7 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}` : `COMPATIBILITY · CANVAS · V11.7 · ${snapshot.loadout.toUpperCase()}`}</span>
''')

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl, '''        const enemyMissile = projectile.owner === "enemy";
        const color = enemyMissile ? 0xff8a2b : projectile.owner === "player-missile" ? 0xfff4de : 0xc8f8ff;
        const geometry = projectile.owner === "player-missile"
''', '''        const enemyMissile = projectile.owner === "enemy";
        const color = enemyMissile
          ? 0xff8a2b
          : projectile.owner === "player-missile"
            ? snapshot.loadout === "missile-focus" ? 0x8cf6ff : snapshot.loadout === "gun-focus" ? 0xffe6c4 : 0xfff4de
            : snapshot.loadout === "gun-focus" ? 0xffdf72 : snapshot.loadout === "missile-focus" ? 0x9ddfff : 0xc8f8ff;
        const geometry = projectile.owner === "player-missile"
''')
replace_once(webgl, '''        if (projectile.owner === "enemy") mesh.renderOrder = 8;
        this.projectileMeshes.set(projectile.id, mesh);
''', '''        if (projectile.owner === "enemy") mesh.renderOrder = 8;
        mesh.userData.arcadeLoadoutV117 = snapshot.loadout;
        this.projectileMeshes.set(projectile.id, mesh);
''')
replace_once(webgl, '''      const pulse = projectile.owner === "player-missile"
        ? 1.35 + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : 1;
''', '''      const pulse = projectile.owner === "player-missile"
        ? (snapshot.loadout === "missile-focus" ? 1.55 : 1.35) + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : snapshot.loadout === "gun-focus" ? 1.16 : 1;
''')

css = "app/SkyDancerArcadeProduct.module.css"
p = Path(css)
text = p.read_text()
marker = '.productShell [aria-label="Arcade combat controls"] button:active { background: #9ee7ff4d; box-shadow: 0 0 22px #7de4ff54; }\n'
if marker not in text:
    raise SystemExit("missing product css action marker")
addition = marker + '''.productShell [aria-label="Arcade combat controls"][data-loadout="gun-focus"] button:first-child { border-color: #ffe08fbf; color: #fff0bd; box-shadow: inset 0 0 20px #ffd66a12,0 0 12px #ffc84a16; }
.productShell [aria-label="Arcade combat controls"][data-loadout="missile-focus"] button:nth-child(2) { border-color: #8ff5ffcc; color: #c9fbff; box-shadow: inset 0 0 22px #6defff16,0 0 14px #6defff1c; }
.productShell [aria-label="Arcade combat controls"][data-loadout="standard"][data-fusion="true"] button { border-color: #d5a9ffbf; color: #f0ddff; box-shadow: inset 0 0 20px #c786ff14,0 0 14px #bd74ff1d; }
'''
p.write_text(text.replace(marker, addition, 1))

tests = "tests/sky-arcade-run.test.ts"
p = Path(tests)
text = p.read_text()
append = r'''

test("V11.7 Gun Focus fires a visible twin-cannon burst instead of a scalar-only buff", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1171 });
  runtime.setFire(true);
  runtime.step(1 / 60);
  const shots = runtime.getSnapshot().projectiles.filter((projectile) => projectile.owner === "player-gun");
  assert.equal(runtime.getSnapshot().shotSerial, 1);
  assert.equal(shots.length, 2);
  assert.ok(shots[0].x < shots[1].x, "twin cannons originate from separate left/right lanes");
});

test("V11.7 Missile Focus widens acquisition and releases a twin ripple per lock", () => {
  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1172 });
  const missile = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "missile-focus", seed: 0x1172 });
  const standardDebug = standard as unknown as { spawnEnemy(kind: "fighter", x: number, y: number, depth: number): void };
  const missileDebug = missile as unknown as { spawnEnemy(kind: "fighter", x: number, y: number, depth: number): void };
  standardDebug.spawnEnemy("fighter", 1.68, 0, 30);
  missileDebug.spawnEnemy("fighter", 1.68, 0, 30);
  standard.setLock(true);
  missile.setLock(true);
  standard.step(1 / 60);
  missile.step(1 / 60);
  assert.equal(standard.getSnapshot().lockedCount, 0, "standard cone leaves the edge target outside acquisition");
  assert.equal(missile.getSnapshot().lockedCount, 1, "missile focus acquires the wider edge target");
  missile.setLock(false);
  const ripple = missile.getSnapshot().projectiles.filter((projectile) => projectile.owner === "player-missile");
  assert.equal(ripple.length, 2, "one lock becomes a two-missile ripple");
  assert.equal(ripple[0].targetEnemyId, ripple[1].targetEnemyId);
});

test("V11.7 Standard Fusion Link changes weapon cadence only while Turbo is engaged", () => {
  const normal = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1173 });
  const linked = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1173 });
  normal.setFire(true);
  linked.setFire(true);
  linked.setTurbo(true);
  for (let frame = 0; frame < 60; frame += 1) {
    normal.step(1 / 60);
    linked.step(1 / 60);
  }
  assert.ok(linked.getSnapshot().shotSerial > normal.getSnapshot().shotSerial, `${linked.getSnapshot().shotSerial} should exceed ${normal.getSnapshot().shotSerial}`);
});

test("V11.7 loadout doctrine is visible in hangar controls and projectile presentation", async () => {
  const [menuSource, modeSource, webglSource, cssSource] = await Promise.all([
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeProduct.module.css", import.meta.url), "utf8"),
  ]);
  assert.match(menuSource, /FUSION LINK · TURBO BOOSTS FIRE \+ LOCK/);
  assert.match(menuSource, /RAPID MULTI · WIDE LOCK · TWIN RIPPLE/);
  assert.match(menuSource, /TWIN BURST · DUAL CANNON · HIGH RATE/);
  assert.match(modeSource, /data-loadout=\{snapshot\.loadout\}/);
  assert.match(modeSource, /V11\.7/);
  assert.match(webglSource, /arcadeLoadoutV117/);
  assert.match(webglSource, /snapshot\.loadout === "gun-focus" \? 0xffdf72/);
  assert.match(cssSource, /data-loadout="gun-focus"/);
  assert.match(cssSource, /data-fusion="true"/);
});
'''
if 'V11.7 Gun Focus fires a visible twin-cannon burst' in text:
    raise SystemExit('V11.7 tests already present')
p.write_text(text + append)

print("V11.7 loadout identity patch applied")
