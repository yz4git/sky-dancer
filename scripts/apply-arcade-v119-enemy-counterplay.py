from pathlib import Path


def patch(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing anchor in {path}: {old[:120]!r}")
    s = s.replace(old, new, count)
    p.write_text(s)

# Runtime: public contracts + state.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    'export type SkyDancerArcadeLoadoutReaction = "none" | "fusion-link" | "ripple-shock" | "twin-cannon";\n',
    'export type SkyDancerArcadeLoadoutReaction = "none" | "fusion-link" | "ripple-shock" | "twin-cannon";\nexport type SkyDancerArcadeEnemyCounterplay = "none" | "armor-brace" | "evasive-roll" | "turbo-jammer";\n',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  stagger: number;\n}\n\nexport interface SkyDancerArcadeProjectileSnapshot',
    '  stagger: number;\n  counterplay: SkyDancerArcadeEnemyCounterplay;\n  counterplayIntensity: number;\n}\n\nexport interface SkyDancerArcadeProjectileSnapshot',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  armorBreak: boolean;\n}\n\nexport interface SkyDancerArcadeHazardSnapshot',
    '  armorBreak: boolean;\n  counterplay: SkyDancerArcadeEnemyCounterplay;\n}\n\nexport interface SkyDancerArcadeHazardSnapshot',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  loadoutReactionIntensity: number;\n  bossKills: number;',
    '  loadoutReactionIntensity: number;\n  counterplayBreaks: number;\n  enemyCounterplaySerial: number;\n  enemyCounterplayLabel: string | null;\n  enemyCounterplayCount: number;\n  enemyCounterplayIntensity: number;\n  turboJammed: boolean;\n  bossKills: number;',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  loadoutStaggerRewarded: boolean;\n}\n\ninterface ArcadeProjectile',
    '  loadoutStaggerRewarded: boolean;\n  counterplayTimer: number;\n  counterplayCooldown: number;\n  counterplayRewarded: boolean;\n}\n\ninterface ArcadeProjectile',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private loadoutReactionTimer = 0;\n  private stageSerial = 1;',
    '  private loadoutReactionTimer = 0;\n  private counterplayBreaks = 0;\n  private enemyCounterplaySerial = 0;\n  private enemyCounterplayLabel: string | null = null;\n  private enemyCounterplayLabelTimer = 0;\n  private stageSerial = 1;',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.loadoutReactionLabel = null;\n    this.loadoutReactionTimer = 0;\n    const finalStage',
    '    this.loadoutReactionLabel = null;\n    this.loadoutReactionTimer = 0;\n    this.enemyCounterplayLabel = null;\n    this.enemyCounterplayLabelTimer = 0;\n    const finalStage',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    this.loadoutReactionTimer = Math.max(0, this.loadoutReactionTimer - delta);\n    if (this.loadoutReactionTimer <= 0) this.loadoutReactionLabel = null;\n    this.stageEventTimer',
    '    this.loadoutReactionTimer = Math.max(0, this.loadoutReactionTimer - delta);\n    if (this.loadoutReactionTimer <= 0) this.loadoutReactionLabel = null;\n    this.enemyCounterplayLabelTimer = Math.max(0, this.enemyCounterplayLabelTimer - delta);\n    if (this.enemyCounterplayLabelTimer <= 0) this.enemyCounterplayLabel = null;\n    this.stageEventTimer',
)

# Jammer changes the resource economy without disabling Turbo/Fusion outright.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    if (turboActive) this.turbo = Math.max(0, this.turbo - 29 * delta);\n    else this.turbo = Math.min(100, this.turbo + 13.5 * delta);',
    '    const jammerCount = this.activeTurboJammerCount();\n    const jammerDrain = Math.min(18, jammerCount * 9);\n    if (turboActive) this.turbo = Math.max(0, this.turbo - (29 + jammerDrain) * delta);\n    else this.turbo = Math.min(100, this.turbo + 13.5 * (jammerCount > 0 ? .58 : 1) * delta);',
)

# Evasive targets narrow reacquisition after their counterplay has started.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      const threshold = arcadeLoadoutLockThreshold(this.options.loadout, enemy.boss, turboLink);\n      if (reticleDistance > threshold) continue;',
    '      const counterplayScale = enemy.counterplay === "evasive-roll" ? (enemy.boss ? .82 : .72) : 1;\n      const threshold = arcadeLoadoutLockThreshold(this.options.loadout, enemy.boss, turboLink) * counterplayScale;\n      if (reticleDistance > threshold) continue;',
)

# Initialize enemy counterplay state without consuming RNG (preserves existing seeded choreography).
for anchor in [
    '      loadoutStaggerRewarded: false,\n    });\n  }\n\n  private spawnBoss()',
    '      loadoutStaggerRewarded: false,\n    });\n    const bossProfile',
]:
    replacement = anchor.replace(
        '      loadoutStaggerRewarded: false,\n',
        '      loadoutStaggerRewarded: false,\n      counterplay: "none",\n      counterplayIntensity: 0,\n      counterplayTimer: 0,\n      counterplayCooldown: .38 + (this.nextEntityId % 3) * .31,\n      counterplayRewarded: false,\n',
    )
    patch("src/sky/arcade/SkyDancerArcadeRuntime.ts", anchor, replacement)

# Enemy AI counterplay helpers.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  private updateEnemies(delta: number, turboActive: boolean): void {\n',
    '''  private counterplayTypeForEnemy(enemy: ArcadeEnemy): SkyDancerArcadeEnemyCounterplay {
    const loadout = this.options.loadout ?? "standard";
    if (loadout === "gun-focus") {
      if (enemy.boss || enemy.kind === "bomber" || enemy.kind === "missile-boat" || enemy.kind === "ace" || enemy.kind === "interceptor") return "armor-brace";
      return "none";
    }
    if (loadout === "missile-focus") {
      if (enemy.boss || enemy.kind === "fighter" || enemy.kind === "interceptor" || enemy.kind === "ace") return "evasive-roll";
      return "none";
    }
    if (enemy.boss || enemy.kind === "missile-boat" || enemy.kind === "bomber" || enemy.kind === "ace") return "turbo-jammer";
    return "none";
  }

  private counterplayLabel(type: SkyDancerArcadeEnemyCounterplay): string {
    if (type === "armor-brace") return "ARMOR BRACE";
    if (type === "evasive-roll") return "EVASIVE ROLL";
    if (type === "turbo-jammer") return "TURBO JAMMER";
    return "";
  }

  private activateEnemyCounterplay(enemy: ArcadeEnemy, type: SkyDancerArcadeEnemyCounterplay): void {
    if (type === "none") return;
    enemy.counterplay = type;
    enemy.counterplayTimer = (enemy.boss ? 1.62 : type === "turbo-jammer" ? 1.38 : type === "armor-brace" ? 1.24 : 1.12);
    enemy.counterplayIntensity = 1;
    enemy.counterplayRewarded = false;
    enemy.counterplayCooldown = (enemy.boss ? 2.15 : 2.7) + (enemy.id % 4) * .27;
    this.enemyCounterplaySerial += 1;
    this.enemyCounterplayLabel = this.counterplayLabel(type);
    this.enemyCounterplayLabelTimer = 1.05;
    this.message = `ENEMY COUNTER · ${this.enemyCounterplayLabel}`;
    this.messageTimer = Math.max(this.messageTimer, .72);
  }

  private updateEnemyCounterplay(enemy: ArcadeEnemy, delta: number, turboActive: boolean): void {
    if (enemy.counterplay !== "none") {
      enemy.counterplayTimer = Math.max(0, enemy.counterplayTimer - delta);
      const duration = enemy.boss ? 1.62 : enemy.counterplay === "turbo-jammer" ? 1.38 : enemy.counterplay === "armor-brace" ? 1.24 : 1.12;
      enemy.counterplayIntensity = clamp(enemy.counterplayTimer / duration, 0, 1);
      if (enemy.counterplayTimer <= 0) {
        enemy.counterplay = "none";
        enemy.counterplayIntensity = 0;
      }
      return;
    }
    enemy.counterplayCooldown = Math.max(0, enemy.counterplayCooldown - delta);
    enemy.counterplayIntensity = 0;
    if (enemy.counterplayCooldown > 0 || enemy.stagger > .68 || enemy.depth < 8 || enemy.depth > 62) return;
    const type = this.counterplayTypeForEnemy(enemy);
    if (type === "none") return;
    const missileThreat = this.input.lock || this.projectiles.some((projectile) => projectile.owner === "player-missile" && projectile.targetEnemyId === enemy.id && projectile.life > 0);
    const triggered = type === "armor-brace" ? this.input.fire : type === "evasive-roll" ? missileThreat : turboActive;
    if (triggered) this.activateEnemyCounterplay(enemy, type);
  }

  private activeTurboJammerCount(): number {
    return this.enemies.filter((enemy) => enemy.alive && enemy.counterplay === "turbo-jammer" && enemy.counterplayTimer > 0).length;
  }

  private rewardEnemyCounterplayBreak(
    enemy: ArcadeEnemy,
    counterplay: SkyDancerArcadeEnemyCounterplay,
    missile: boolean,
    destroyed: boolean,
    armorBreak: boolean,
  ): void {
    if (counterplay === "none" || enemy.counterplayRewarded) return;
    const qualifies = counterplay === "armor-brace"
      ? destroyed || armorBreak || enemy.stagger >= .72
      : counterplay === "evasive-roll"
        ? missile && (destroyed || armorBreak || enemy.stagger >= .32)
        : destroyed || armorBreak || enemy.stagger >= .72;
    if (!qualifies) return;
    enemy.counterplayRewarded = true;
    enemy.counterplay = "none";
    enemy.counterplayTimer = 0;
    enemy.counterplayIntensity = 0;
    enemy.counterplayCooldown = Math.max(enemy.counterplayCooldown, enemy.boss ? 2.8 : 3.25);
    this.counterplayBreaks += 1;
    this.enemyCounterplaySerial += 1;
    const label = counterplay === "armor-brace" ? "BRACE BREAK" : counterplay === "evasive-roll" ? "EVADE PUNISH" : "JAMMER BREAK";
    this.enemyCounterplayLabel = label;
    this.enemyCounterplayLabelTimer = 1.18;
    const base = counterplay === "armor-brace" ? (enemy.boss ? 760 : 430) : counterplay === "evasive-roll" ? (enemy.boss ? 820 : 470) : (enemy.boss ? 920 : 540);
    const turboGain = counterplay === "turbo-jammer" ? (enemy.boss ? 12 : 8) : enemy.boss ? 8 : 5;
    this.rewardLoadoutReaction(label, base, turboGain, 1.12);
  }

  private updateEnemies(delta: number, turboActive: boolean): void {
''',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      enemy.age += delta;\n      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));\n      if (enemy.boss) {',
    '      enemy.age += delta;\n      enemy.stagger = Math.max(0, enemy.stagger - delta * (enemy.boss ? .82 : 1.35));\n      this.updateEnemyCounterplay(enemy, delta, turboActive);\n      if (enemy.boss) {',
)
# Add visible evasive movement after normal/boss motion has been solved.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      enemy.fireCooldown -= delta;\n      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {',
    '''      if (enemy.counterplay === "evasive-roll") {
        const intensity = .35 + enemy.counterplayIntensity * .65;
        enemy.x = clamp(enemy.x + Math.sin(enemy.age * 10.4 + enemy.phase) * .44 * intensity + enemy.maneuverSign * .08, -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        enemy.y = clamp(enemy.y + Math.cos(enemy.age * 8.6 + enemy.phase * 1.3) * .28 * intensity, -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
      }
      if (enemy.counterplay === "armor-brace") enemy.fireCooldown += delta * .42;
      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0 && enemy.depth > 12 && enemy.depth < 72) {''',
)

# Counterplay defensive modifiers + break rewards.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    const reaction = this.loadoutReactionForHit(missile);\n    let hullDamage = amount;',
    '    const reaction = this.loadoutReactionForHit(missile);\n    const counterplay = enemy.counterplay;\n    let hullDamage = amount;',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      if (reaction === "ripple-shock") armorScale = 1.72;\n      else if (reaction === "twin-cannon") armorScale = 1.04;\n      else if (reaction === "fusion-link") armorScale = missile ? 1.52 : .9;\n      enemy.armor = Math.max(0, enemy.armor - amount * armorScale);\n      hullDamage *= missile ? .9 : .72;',
    '      if (reaction === "ripple-shock") armorScale = 1.72;\n      else if (reaction === "twin-cannon") armorScale = 1.04;\n      else if (reaction === "fusion-link") armorScale = missile ? 1.52 : .9;\n      if (counterplay === "armor-brace" && !missile) armorScale *= .62;\n      if (counterplay === "evasive-roll" && missile) armorScale *= .72;\n      enemy.armor = Math.max(0, enemy.armor - amount * armorScale);\n      hullDamage *= missile ? .9 : .72;\n      if (counterplay === "armor-brace" && !missile) hullDamage *= .78;\n      if (counterplay === "evasive-roll" && missile) hullDamage *= .7;',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    const staggerScale = reaction === "ripple-shock" ? 7.4 : reaction === "twin-cannon" ? 4.7 : reaction === "fusion-link" ? 5.9 : missile ? 5.2 : 3.2;\n    enemy.stagger = clamp(enemy.stagger + hullDamage / Math.max(1, enemy.maxHp) * staggerScale, 0, 1);',
    '    let staggerScale = reaction === "ripple-shock" ? 7.4 : reaction === "twin-cannon" ? 4.7 : reaction === "fusion-link" ? 5.9 : missile ? 5.2 : 3.2;\n    if (counterplay === "armor-brace" && !missile) staggerScale *= 1.24;\n    if (counterplay === "evasive-roll" && missile) staggerScale *= 1.16;\n    enemy.stagger = clamp(enemy.stagger + hullDamage / Math.max(1, enemy.maxHp) * staggerScale, 0, 1);',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      armorBreak,\n    });',
    '      armorBreak,\n      counterplay,\n    });',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    else if (reaction === "fusion-link") this.rewardLoadoutReaction("FUSION LINK FINISH", enemy.boss ? 960 : 520, enemy.boss ? 8 : 5);\n    if (!enemy.boss) return;',
    '    else if (reaction === "fusion-link") this.rewardLoadoutReaction("FUSION LINK FINISH", enemy.boss ? 960 : 520, enemy.boss ? 8 : 5);\n    this.rewardEnemyCounterplayBreak(enemy, counterplay, missile, destroyed, armorBreak);\n    if (!enemy.boss) return;',
)
# Non-lethal counterplay break must also resolve after impact telemetry is emitted.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    if (!destroyed) return;\n    enemy.alive = false;',
    '    if (!destroyed) {\n      this.rewardEnemyCounterplayBreak(enemy, counterplay, missile, false, armorBreak);\n      return;\n    }\n    enemy.alive = false;',
)

# Snapshot state and per-enemy counterplay telemetry.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '    const lockedCount = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;\n    const stageScore',
    '    const lockedCount = this.enemies.filter((enemy) => enemy.alive && enemy.locked).length;\n    const activeCounterplays = this.enemies.filter((enemy) => enemy.alive && enemy.counterplay !== "none");\n    const stageScore',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '      loadoutReactionIntensity: this.loadoutReactionTimer > 0 ? clamp(this.loadoutReactionTimer / 1.05, 0, 1) : 0,\n      bossKills:',
    '      loadoutReactionIntensity: this.loadoutReactionTimer > 0 ? clamp(this.loadoutReactionTimer / 1.05, 0, 1) : 0,\n      counterplayBreaks: this.counterplayBreaks,\n      enemyCounterplaySerial: this.enemyCounterplaySerial,\n      enemyCounterplayLabel: this.enemyCounterplayLabel,\n      enemyCounterplayCount: activeCounterplays.length,\n      enemyCounterplayIntensity: activeCounterplays.reduce((peak, enemy) => Math.max(peak, enemy.counterplayIntensity), 0),\n      turboJammed: activeCounterplays.some((enemy) => enemy.counterplay === "turbo-jammer"),\n      bossKills:',
)
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '        weakpointOpen: enemy.weakpointOpen,\n        stagger: enemy.stagger,\n      })),',
    '        weakpointOpen: enemy.weakpointOpen,\n        stagger: enemy.stagger,\n        counterplay: enemy.counterplay,\n        counterplayIntensity: enemy.counterplayIntensity,\n      })),',
)
# Test hook.
patch(
    "src/sky/arcade/SkyDancerArcadeRuntime.ts",
    '  damageEnemyForTests(enemyId: number, amount: number, missile: boolean): void {\n    const enemy = this.enemies.find((candidate) => candidate.id === enemyId && candidate.alive);\n    if (enemy) this.damageEnemy(enemy, amount, missile);\n  }\n\n  /** Deterministic V11 hook',
    '  damageEnemyForTests(enemyId: number, amount: number, missile: boolean): void {\n    const enemy = this.enemies.find((candidate) => candidate.id === enemyId && candidate.alive);\n    if (enemy) this.damageEnemy(enemy, amount, missile);\n  }\n\n  forceEnemyCounterplayForTests(enemyId: number): void {\n    const enemy = this.enemies.find((candidate) => candidate.id === enemyId && candidate.alive);\n    if (!enemy) return;\n    const type = this.counterplayTypeForEnemy(enemy);\n    if (type !== "none") this.activateEnemyCounterplay(enemy, type);\n  }\n\n  /** Deterministic V11 hook',
)

# WebGL: visible enemy counterplay ring/posture and dedicated cue sound.
patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      const lockRing = group.getObjectByName("arcade-lock-ring");\n      for (const ring of [lockRing, aimRing]) {',
    '''      let counterplayRing = group.getObjectByName("arcade-counterplay-ring");
      if (enemy.counterplay !== "none" && !counterplayRing) {
        const counterColor = enemy.counterplay === "armor-brace" ? 0xffd56a : enemy.counterplay === "evasive-roll" ? 0x6feeff : 0xe68cff;
        counterplayRing = createSkyDancerArcadeLockRing(counterColor);
        counterplayRing.name = "arcade-counterplay-ring";
        counterplayRing.userData.arcadeEnemyCounterplayV119 = enemy.counterplay;
        counterplayRing.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const material = object.material as THREE.MeshBasicMaterial;
          material.opacity = .42;
        });
        group.add(counterplayRing);
      } else if (enemy.counterplay === "none" && counterplayRing) {
        group.remove(counterplayRing);
        this.disposeObject(counterplayRing);
        counterplayRing = undefined;
      }
      if (counterplayRing) counterplayRing.position.z = .12;
      const lockRing = group.getObjectByName("arcade-lock-ring");
      for (const ring of [lockRing, aimRing, counterplayRing]) {''',
)
patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      if (lockRing) lockRing.scale.setScalar(enemy.boss ? 4.2 : enemy.kind === "bomber" ? 1.7 : 1.1);\n      if (aimRing) aimRing.scale.setScalar(enemy.boss ? 3.7 : enemy.kind === "bomber" ? 1.5 : .92);',
    '      if (lockRing) lockRing.scale.setScalar(enemy.boss ? 4.2 : enemy.kind === "bomber" ? 1.7 : 1.1);\n      if (aimRing) aimRing.scale.setScalar(enemy.boss ? 3.7 : enemy.kind === "bomber" ? 1.5 : .92);\n      if (counterplayRing) {\n        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 15 + enemy.id) * .08;\n        counterplayRing.scale.setScalar((enemy.boss ? 4.75 : enemy.kind === "bomber" ? 2.05 : 1.38) * pulse);\n      }',
)
patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp * impactPulse);\n      }',
    '        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp * impactPulse);\n        if (enemy.counterplay === "armor-brace") { group.scale.x *= 1.045; group.scale.y *= .96; }\n        if (enemy.counterplay === "evasive-roll") group.rotation.z += Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .065 * enemy.counterplayIntensity;\n      }',
)
patch(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    if (snapshot.loadoutReactionSerial !== this.previousSnapshot.loadoutReactionSerial) {\n      const frequency',
    '    if (snapshot.enemyCounterplaySerial !== this.previousSnapshot.enemyCounterplaySerial) {\n      const frequency = snapshot.turboJammed ? 310 : snapshot.loadout === "gun-focus" ? 540 : 860;\n      this.audio.tone(frequency, .105, .018, snapshot.turboJammed ? "sawtooth" : "square");\n    }\n    if (snapshot.loadoutReactionSerial !== this.previousSnapshot.loadoutReactionSerial) {\n      const frequency',
)

# HUD: active counterplay is visible without adding another floating panel.
patch(
    "app/SkyDancerArcadeMode.tsx",
    '  const loadoutTacticalHint = snapshot.loadout === "gun-focus" ? "SHRED ARMOR · FORCE STAGGER" : snapshot.loadout === "missile-focus" ? "CRUSH ARMOR · SHOCK TARGET" : "TURBO LINK · FINISH FOR REFUND";\n',
    '  const loadoutTacticalHint = snapshot.loadout === "gun-focus" ? "SHRED ARMOR · FORCE STAGGER" : snapshot.loadout === "missile-focus" ? "CRUSH ARMOR · SHOCK TARGET" : "TURBO LINK · FINISH FOR REFUND";\n  const activeCounterplay = snapshot.enemies.find((enemy) => enemy.counterplay !== "none")?.counterplay ?? "none";\n  const counterplayHudLabel = activeCounterplay === "armor-brace" ? "ARMOR BRACE · STAGGER IT" : activeCounterplay === "evasive-roll" ? "EVASIVE ROLL · TRACK IT" : activeCounterplay === "turbo-jammer" ? "TURBO JAMMER · BREAK IT" : "";\n',
)
patch(
    "app/SkyDancerArcadeMode.tsx",
    '<div className={productStyles.v118LoadoutStatus} data-loadout={snapshot.loadout} data-active={snapshot.loadoutReactionIntensity > 0}>\n            <small>{loadoutTacticalName}</small>\n            <strong>{snapshot.loadoutReactionLabel ?? loadoutTacticalHint}</strong>\n            <span>TACTICAL BONUS +{snapshot.loadoutBonusScore}</span>\n          </div>',
    '<div className={productStyles.v118LoadoutStatus} data-loadout={snapshot.loadout} data-active={snapshot.loadoutReactionIntensity > 0} data-countered={snapshot.enemyCounterplayCount > 0}>\n            <small>{loadoutTacticalName}</small>\n            <strong>{snapshot.loadoutReactionLabel ?? loadoutTacticalHint}</strong>\n            <span>TACTICAL BONUS +{snapshot.loadoutBonusScore} · COUNTER BREAK {snapshot.counterplayBreaks}</span>\n            {snapshot.enemyCounterplayCount > 0 && <em className={productStyles.v119Counterplay}>ENEMY COUNTER · {counterplayHudLabel} ×{snapshot.enemyCounterplayCount}</em>}\n          </div>',
)
# Version bump while preserving old regression intent.
patch("app/SkyDancerArcadeMode.tsx", '3D FLIGHT · V11.8 ·', '3D FLIGHT · V11.9 ·')
patch("app/SkyDancerArcadeMode.tsx", 'COMPATIBILITY · CANVAS · V11.8 ·', 'COMPATIBILITY · CANVAS · V11.9 ·')

# Hangar tells the player how enemies answer each doctrine while retaining V11.8 keyword contracts.
patch(
    "app/CartGameMenu.tsx",
    '{ id: "standard", label: "STANDARD", detail: "FUSION LINK · TURBO FINISH · SCORE + REFUND", unlock: 0 },',
    '{ id: "standard", label: "STANDARD", detail: "FUSION LINK · BREAK JAMMERS · TURBO FINISH · SCORE + REFUND", unlock: 0 },',
)
patch(
    "app/CartGameMenu.tsx",
    '{ id: "missile-focus", label: "MISSILE", detail: "RAPID MULTI · RIPPLE SHOCK · ARMOR CRUSH", unlock: 12 },',
    '{ id: "missile-focus", label: "MISSILE", detail: "RAPID MULTI · PUNISH EVASION · RIPPLE SHOCK · ARMOR CRUSH", unlock: 12 },',
)
patch(
    "app/CartGameMenu.tsx",
    '{ id: "gun-focus", label: "GUN", detail: "TWIN BURST · ARMOR SHRED · CANNON STAGGER", unlock: 24 },',
    '{ id: "gun-focus", label: "GUN", detail: "TWIN BURST · CRACK BRACE · ARMOR SHRED · CANNON STAGGER", unlock: 24 },',
)

# CSS for the embedded counterplay warning.
p = Path("app/SkyDancerArcadeProduct.module.css")
s = p.read_text()
if ".v119Counterplay" in s:
    raise SystemExit("V11.9 CSS already present")
s += '''

/* V11.9 Enemy Counterplay: one embedded warning line, no extra HUD panel. */
.v118LoadoutStatus[data-countered="true"] { border-color: rgba(255,193,112,.42); box-shadow: 0 0 18px rgba(255,139,86,.13); }
.v119Counterplay {
  margin-top: 3px;
  padding-top: 4px;
  border-top: 1px solid rgba(255,255,255,.12);
  color: #ffd19a;
  font-size: 7px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: .07em;
  line-height: 1.1;
  white-space: nowrap;
}
.v118LoadoutStatus[data-loadout="missile-focus"] .v119Counterplay { color: #8ff3ff; }
.v118LoadoutStatus[data-loadout="standard"] .v119Counterplay { color: #e5b5ff; }
@media (max-width: 720px) {
  .v119Counterplay { font-size: 6px; letter-spacing: .045em; }
}
'''
p.write_text(s)

# Migrate version-string-only contracts and append V11.9 behavioral regression tests.
p = Path("tests/sky-arcade-run.test.ts")
s = p.read_text()
s = s.replace('assert.match(modeSource, /V11\\.8/);', 'assert.match(modeSource, /V11\\.(?:8|9)/);')
if 'V11.9 Gun Focus provokes armor brace' in s:
    raise SystemExit("V11.9 tests already present")
s += r'''

test("V11.9 Gun Focus provokes armor brace that reduces direct cannon penetration but can be broken", () => {
  const braced = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1191 });
  const open = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1191 });
  const bracedId = braced.spawnEnemyForTests("bomber", 0, 0, 30);
  const openId = open.spawnEnemyForTests("bomber", 0, 0, 30);
  braced.forceEnemyCounterplayForTests(bracedId);
  assert.equal(braced.getSnapshot().enemies.find((enemy) => enemy.id === bracedId)?.counterplay, "armor-brace");
  braced.damageEnemyForTests(bracedId, 18, false);
  open.damageEnemyForTests(openId, 18, false);
  const bracedEnemy = braced.getSnapshot().enemies.find((enemy) => enemy.id === bracedId);
  const openEnemy = open.getSnapshot().enemies.find((enemy) => enemy.id === openId);
  assert.ok(bracedEnemy && openEnemy);
  assert.ok(bracedEnemy.armor > openEnemy.armor, `${bracedEnemy.armor} > ${openEnemy.armor}`);
  braced.damageEnemyForTests(bracedId, 999, false);
  assert.ok(braced.getSnapshot().counterplayBreaks >= 1);
  assert.match(braced.getSnapshot().loadoutReactionLabel ?? "", /BRACE BREAK/);
});

test("V11.9 Missile Focus provokes evasive roll and rewards a tracked missile punish", () => {
  const runtime = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "missile-focus", seed: 0x1192 });
  const id = runtime.spawnEnemyForTests("interceptor", .2, .1, 30);
  runtime.forceEnemyCounterplayForTests(id);
  const before = runtime.getSnapshot().enemies.find((enemy) => enemy.id === id);
  assert.equal(before?.counterplay, "evasive-roll");
  runtime.step(.05);
  const after = runtime.getSnapshot().enemies.find((enemy) => enemy.id === id);
  assert.ok(before && after);
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > .01, "evasive roll changes the target lane");
  runtime.damageEnemyForTests(id, 999, true);
  assert.ok(runtime.getSnapshot().counterplayBreaks >= 1);
  assert.match(runtime.getSnapshot().loadoutReactionLabel ?? "", /EVADE PUNISH/);
});

test("V11.9 Standard Turbo Link can be jammed until the counter aircraft is broken", () => {
  const jammed = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1193 });
  const clear = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1193 });
  const id = jammed.spawnEnemyForTests("missile-boat", 0, 0, 30);
  jammed.forceEnemyCounterplayForTests(id);
  jammed.setTurbo(true);
  clear.setTurbo(true);
  for (let frame = 0; frame < 24; frame += 1) { jammed.step(1 / 60); clear.step(1 / 60); }
  assert.equal(jammed.getSnapshot().turboJammed, true);
  assert.ok(jammed.getSnapshot().turbo < clear.getSnapshot().turbo, `${jammed.getSnapshot().turbo} < ${clear.getSnapshot().turbo}`);
  jammed.damageEnemyForTests(id, 999, false);
  assert.ok(jammed.getSnapshot().counterplayBreaks >= 1);
  assert.match(jammed.getSnapshot().loadoutReactionLabel ?? "", /JAMMER BREAK/);
});

test("V11.9 enemy counterplay is surfaced in HUD, hangar, runtime and WebGL presentation", async () => {
  const [modeSource, menuSource, webglSource, cssSource, runtimeSource] = await Promise.all([
    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeProduct.module.css", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
  ]);
  assert.match(modeSource, /V11\.9/);
  assert.match(modeSource, /ENEMY COUNTER/);
  assert.match(menuSource, /BREAK JAMMERS/);
  assert.match(menuSource, /PUNISH EVASION/);
  assert.match(menuSource, /CRACK BRACE/);
  assert.match(webglSource, /arcadeEnemyCounterplayV119/);
  assert.match(cssSource, /v119Counterplay/);
  assert.match(runtimeSource, /ARMOR BRACE/);
  assert.match(runtimeSource, /EVASIVE ROLL/);
  assert.match(runtimeSource, /TURBO JAMMER/);
});
'''
p.write_text(s)
print("V11.9 patch applied")
