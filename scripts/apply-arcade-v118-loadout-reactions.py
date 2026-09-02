from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing patch marker in {path}: {old[:100]!r}")
    path.write_text(text.replace(old, new, 1))

runtime = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
mode = Path("app/SkyDancerArcadeMode.tsx")
css = Path("app/SkyDancerArcadeProduct.module.css")
webgl = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
tests = Path("tests/sky-arcade-run.test.ts")
menu = Path("app/CartGameMenu.tsx")

replace_once(runtime,
'''export type SkyDancerArcadeEnemyManeuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";\n''',
'''export type SkyDancerArcadeEnemyManeuver = "approach" | "close-bank" | "overtake" | "parallel" | "cross-pass";\nexport type SkyDancerArcadeLoadoutReaction = "none" | "fusion-link" | "ripple-shock" | "twin-cannon";\n''')

replace_once(runtime,
'''  boss: boolean;\n  missile: boolean;\n  destroyed: boolean;\n}\n''',
'''  boss: boolean;\n  missile: boolean;\n  destroyed: boolean;\n  reaction: SkyDancerArcadeLoadoutReaction;\n  armorBreak: boolean;\n}\n''')

replace_once(runtime,
'''  armorBreaks: number;\n  formationBreaks: number;\n  bossKills: number;\n''',
'''  armorBreaks: number;\n  formationBreaks: number;\n  loadoutBonusScore: number;\n  loadoutReactionSerial: number;\n  loadoutReactionLabel: string | null;\n  loadoutReactionIntensity: number;\n  bossKills: number;\n''')

replace_once(runtime,
'''  maneuverClock: number;\n  maneuverSign: number;\n}\n''',
'''  maneuverClock: number;\n  maneuverSign: number;\n  loadoutStaggerRewarded: boolean;\n}\n''')

replace_once(runtime,
'''  private damageSerial = 0;\n  private damageCooldown = 0;\n  private stageSerial = 1;\n''',
'''  private damageSerial = 0;\n  private damageCooldown = 0;\n  private loadoutBonusScore = 0;\n  private loadoutReactionSerial = 0;\n  private loadoutReactionLabel: string | null = null;\n  private loadoutReactionTimer = 0;\n  private stageSerial = 1;\n''')

replace_once(runtime,
'''    this.damageCooldown = 0;\n    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n''',
'''    this.damageCooldown = 0;\n    this.loadoutReactionLabel = null;\n    this.loadoutReactionTimer = 0;\n    const finalStage = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n''')

replace_once(runtime,
'''    this.damageCooldown = Math.max(0, this.damageCooldown - delta);\n    this.stageEventTimer = Math.max(0, this.stageEventTimer - delta);\n''',
'''    this.damageCooldown = Math.max(0, this.damageCooldown - delta);\n    this.loadoutReactionTimer = Math.max(0, this.loadoutReactionTimer - delta);\n    if (this.loadoutReactionTimer <= 0) this.loadoutReactionLabel = null;\n    this.stageEventTimer = Math.max(0, this.stageEventTimer - delta);\n''')

# Both normal enemies and bosses receive a one-shot tactical stagger reward guard.
text = runtime.read_text()
needle = '''      maneuverClock: 0,\n      maneuverSign: maneuverSign < 0 ? -1 : 1,\n    });\n'''
if text.count(needle) != 1:
    raise SystemExit(f"expected one normal enemy marker, found {text.count(needle)}")
text = text.replace(needle, '''      maneuverClock: 0,\n      maneuverSign: maneuverSign < 0 ? -1 : 1,\n      loadoutStaggerRewarded: false,\n    });\n''', 1)
needle = '''      maneuverClock: 0,\n      maneuverSign: 1,\n    });\n'''
if text.count(needle) != 1:
    raise SystemExit(f"expected one boss marker, found {text.count(needle)}")
text = text.replace(needle, '''      maneuverClock: 0,\n      maneuverSign: 1,\n      loadoutStaggerRewarded: false,\n    });\n''', 1)
runtime.write_text(text)

replace_once(runtime,
'''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {\n    if (!enemy.alive) return;\n    const hpBefore = enemy.hp;\n    const armorBefore = enemy.armor;\n    let hullDamage = amount;\n    if (enemy.armor > 0) {\n      const armorDamage = amount * (missile ? 1.35 : .7);\n      enemy.armor = Math.max(0, enemy.armor - armorDamage);\n      hullDamage *= missile ? .9 : .72;\n    }\n    if (enemy.boss && enemy.weakpointOpen) hullDamage *= missile ? 1.65 : 1.35;\n    enemy.hp = Math.max(0, enemy.hp - hullDamage);\n    enemy.stagger = clamp(enemy.stagger + hullDamage / Math.max(1, enemy.maxHp) * (missile ? 5.2 : 3.2), 0, 1);\n    if (armorBefore > 0 && enemy.armor <= 0) {\n      this.armorBreaks += 1;\n      this.addScore(enemy.boss ? 1800 : enemy.kind === "bomber" ? 900 : 650, true);\n      this.turbo = Math.min(100, this.turbo + (enemy.boss ? 11 : 6));\n      this.message = enemy.boss ? "BOSS ARMOR BREAK · CORE EXPOSED" : "ARMOR BREAK";\n      this.messageTimer = 1.05;\n    }\n    this.hitSerial += 1;\n    const destroyed = enemy.hp <= 0;\n    this.impactEvents.push({\n      serial: this.hitSerial,\n      enemyId: enemy.id,\n      kind: enemy.kind,\n      x: enemy.x,\n      y: enemy.y,\n      depth: enemy.depth,\n      hpBefore,\n      hpAfter: enemy.hp,\n      maxHp: enemy.maxHp,\n      boss: enemy.boss,\n      missile,\n      destroyed,\n    });\n''',
'''  private loadoutReactionForHit(missile: boolean): SkyDancerArcadeLoadoutReaction {\n    const turboLink = this.input.turbo && this.turbo > 0.5;\n    if (this.options.loadout === "missile-focus" && missile) return "ripple-shock";\n    if (this.options.loadout === "gun-focus" && !missile) return "twin-cannon";\n    if (arcadeStandardFusionActive(this.options.loadout, turboLink)) return "fusion-link";\n    return "none";\n  }\n\n  private rewardLoadoutReaction(label: string, baseScore: number, turboGain: number, duration = .9): void {\n    const awarded = this.addScore(baseScore, true);\n    this.loadoutBonusScore += awarded;\n    this.loadoutReactionSerial += 1;\n    this.loadoutReactionLabel = label;\n    this.loadoutReactionTimer = duration;\n    this.turbo = Math.min(100, this.turbo + turboGain);\n    this.message = label;\n    this.messageTimer = Math.max(this.messageTimer, duration);\n  }\n\n  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {\n    if (!enemy.alive) return;\n    const hpBefore = enemy.hp;\n    const armorBefore = enemy.armor;\n    const staggerBefore = enemy.stagger;\n    const reaction = this.loadoutReactionForHit(missile);\n    let hullDamage = amount;\n    if (enemy.armor > 0) {\n      let armorScale = missile ? 1.35 : .7;\n      if (reaction === "ripple-shock") armorScale = 1.72;\n      else if (reaction === "twin-cannon") armorScale = 1.04;\n      else if (reaction === "fusion-link") armorScale = missile ? 1.52 : .9;\n      enemy.armor = Math.max(0, enemy.armor - amount * armorScale);\n      hullDamage *= missile ? .9 : .72;\n      if (reaction === "twin-cannon") hullDamage *= 1.08;\n      if (reaction === "fusion-link") hullDamage *= 1.08;\n    }\n    if (enemy.boss && enemy.weakpointOpen) hullDamage *= missile ? 1.65 : 1.35;\n    enemy.hp = Math.max(0, enemy.hp - hullDamage);\n    const staggerScale = reaction === "ripple-shock" ? 7.4 : reaction === "twin-cannon" ? 4.7 : reaction === "fusion-link" ? 5.9 : missile ? 5.2 : 3.2;\n    enemy.stagger = clamp(enemy.stagger + hullDamage / Math.max(1, enemy.maxHp) * staggerScale, 0, 1);\n    const armorBreak = armorBefore > 0 && enemy.armor <= 0;\n    if (armorBreak) {\n      this.armorBreaks += 1;\n      this.addScore(enemy.boss ? 1800 : enemy.kind === "bomber" ? 900 : 650, true);\n      this.turbo = Math.min(100, this.turbo + (enemy.boss ? 11 : 6));\n      this.message = enemy.boss ? "BOSS ARMOR BREAK · CORE EXPOSED" : "ARMOR BREAK";\n      this.messageTimer = 1.05;\n      if (reaction === "twin-cannon") this.rewardLoadoutReaction("TWIN CANNON SHRED", enemy.boss ? 700 : 420, enemy.boss ? 6 : 4, 1.05);\n      else if (reaction === "ripple-shock") this.rewardLoadoutReaction("RIPPLE ARMOR CRUSH", enemy.boss ? 820 : 520, enemy.boss ? 7 : 5, 1.05);\n      else if (reaction === "fusion-link") this.rewardLoadoutReaction("FUSION BREACH", enemy.boss ? 760 : 480, enemy.boss ? 7 : 5, 1.05);\n    }\n    if (reaction !== "none" && !enemy.loadoutStaggerRewarded && staggerBefore < .72 && enemy.stagger >= .72) {\n      enemy.loadoutStaggerRewarded = true;\n      if (reaction === "twin-cannon") this.rewardLoadoutReaction("CANNON STAGGER", enemy.boss ? 460 : 260, 3);\n      else if (reaction === "ripple-shock") this.rewardLoadoutReaction("RIPPLE SHOCK", enemy.boss ? 540 : 320, 4);\n      else this.rewardLoadoutReaction("FUSION OVERDRIVE", enemy.boss ? 520 : 300, 4);\n    }\n    this.hitSerial += 1;\n    const destroyed = enemy.hp <= 0;\n    this.impactEvents.push({\n      serial: this.hitSerial,\n      enemyId: enemy.id,\n      kind: enemy.kind,\n      x: enemy.x,\n      y: enemy.y,\n      depth: enemy.depth,\n      hpBefore,\n      hpAfter: enemy.hp,\n      maxHp: enemy.maxHp,\n      boss: enemy.boss,\n      missile,\n      destroyed,\n      reaction,\n      armorBreak,\n    });\n''')

replace_once(runtime,
'''    if (missile && this.projectiles.filter((projectile) => projectile.owner === "player-missile" && projectile.life > 0).length >= 2) {\n      this.multiLockKills += 1;\n      this.addScore(350, true);\n    }\n    if (!enemy.boss) return;\n''',
'''    if (missile && this.projectiles.filter((projectile) => projectile.owner === "player-missile" && projectile.life > 0).length >= 2) {\n      this.multiLockKills += 1;\n      this.addScore(350, true);\n    }\n    if (reaction === "twin-cannon") this.rewardLoadoutReaction("TWIN CANNON FINISH", enemy.boss ? 720 : 360, enemy.boss ? 5 : 2);\n    else if (reaction === "ripple-shock") this.rewardLoadoutReaction("RIPPLE BREAK", enemy.boss ? 840 : 420, enemy.boss ? 6 : 3);\n    else if (reaction === "fusion-link") this.rewardLoadoutReaction("FUSION LINK FINISH", enemy.boss ? 960 : 520, enemy.boss ? 8 : 5);\n    if (!enemy.boss) return;\n''')

replace_once(runtime,
'''  private addScore(base: number, risk: boolean): void {\n    const chainMultiplier = 1 + Math.min(12, this.chain) * 0.1;\n    const riskMultiplier = risk ? 1.25 : 1;\n    this.score += Math.round(base * chainMultiplier * riskMultiplier);\n  }\n''',
'''  private addScore(base: number, risk: boolean): number {\n    const chainMultiplier = 1 + Math.min(12, this.chain) * 0.1;\n    const riskMultiplier = risk ? 1.25 : 1;\n    const awarded = Math.round(base * chainMultiplier * riskMultiplier);\n    this.score += awarded;\n    return awarded;\n  }\n''')

replace_once(runtime,
'''      armorBreaks: this.armorBreaks,\n      formationBreaks: this.formationBreaks,\n      bossKills: this.bossKills,\n''',
'''      armorBreaks: this.armorBreaks,\n      formationBreaks: this.formationBreaks,\n      loadoutBonusScore: this.loadoutBonusScore,\n      loadoutReactionSerial: this.loadoutReactionSerial,\n      loadoutReactionLabel: this.loadoutReactionLabel,\n      loadoutReactionIntensity: this.loadoutReactionTimer > 0 ? clamp(this.loadoutReactionTimer / 1.05, 0, 1) : 0,\n      bossKills: this.bossKills,\n''')

replace_once(runtime,
'''  /** Deterministic V11 hook for timeline/director regression tests. */\n''',
'''  /** Deterministic V11.8 hooks for loadout combat regression tests. */\n  spawnEnemyForTests(kind: SkyDancerArcadeEnemyKind, x = 0, y = 0, depth = 30): number {\n    const id = this.nextEntityId;\n    this.spawnEnemy(kind, x, y, depth);\n    return id;\n  }\n\n  damageEnemyForTests(enemyId: number, amount: number, missile: boolean): void {\n    const enemy = this.enemies.find((candidate) => candidate.id === enemyId && candidate.alive);\n    if (enemy) this.damageEnemy(enemy, amount, missile);\n  }\n\n  /** Deterministic V11 hook for timeline/director regression tests. */\n''')

# V11.8 WebGL hit reactions: the same impact message now carries doctrine-specific physical weight.
replace_once(webgl,
'''    const mass = impact.boss ? .46 : heavyCraft ? .7 : 1;\n    const missilePower = impact.missile ? 1 : .28;\n    const impulse = {\n      x: side * .28 * missilePower * mass,\n      y: vertical * .17 * missilePower * mass,\n      z: -(impact.missile ? 1.32 : .3) * mass,\n      pitch: vertical * (impact.missile ? .16 : .045) * mass,\n      roll: -side * (impact.missile ? .34 : .1) * mass,\n      flash: impact.missile ? 1 : .72,\n      missile: impact.missile,\n    };\n''',
'''    const mass = impact.boss ? .46 : heavyCraft ? .7 : 1;\n    const doctrinePower = impact.reaction === "ripple-shock" ? 1.34 : impact.reaction === "twin-cannon" ? 1.2 : impact.reaction === "fusion-link" ? 1.28 : 1;\n    const missilePower = (impact.missile ? 1 : .28) * doctrinePower;\n    const impulse = {\n      x: side * .28 * missilePower * mass,\n      y: vertical * .17 * missilePower * mass,\n      z: -(impact.missile ? 1.32 : .3) * mass * doctrinePower,\n      pitch: vertical * (impact.missile ? .16 : .045) * mass * doctrinePower,\n      roll: -side * (impact.missile ? .34 : .1) * mass * doctrinePower,\n      flash: (impact.missile ? 1 : .72) * Math.min(1.25, doctrinePower),\n      missile: impact.missile,\n    };\n''')

replace_once(webgl,
'''      this.applyEnemyHitReaction(impact, snapshot, heavyCraft);\n      if (impact.destroyed) {\n''',
'''      this.applyEnemyHitReaction(impact, snapshot, heavyCraft);\n      if (impact.armorBreak && impact.reaction !== "none") {\n        this.presentation.emitRushAccent();\n        this.cameraImpactKick = Math.max(this.cameraImpactKick, impact.reaction === "ripple-shock" ? .34 : .28);\n      }\n      if (impact.destroyed) {\n''')

replace_once(webgl,
'''    if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated) this.audio.tone(236, .08, .018, "triangle");\n    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }\n''',
'''    if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated) this.audio.tone(236, .08, .018, "triangle");\n    if (snapshot.loadoutReactionSerial !== this.previousSnapshot.loadoutReactionSerial) {\n      const frequency = snapshot.loadout === "gun-focus" ? 980 : snapshot.loadout === "missile-focus" ? 640 : 760;\n      this.audio.tone(frequency, .09, .02, snapshot.loadout === "missile-focus" ? "square" : "triangle");\n      this.audio.tone(frequency * .5, .13, .018, "sawtooth");\n    }\n    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }\n''')

# HUD doctrine status.
replace_once(mode,
'''  const turboDoctrine = snapshot.loadout === "standard" ? (standardFusionActive ? "FUSION LINK" : "LINK DRIVE") : snapshot.turboActive ? "SMASH" : "HOLD";\n\n  return (\n''',
'''  const turboDoctrine = snapshot.loadout === "standard" ? (standardFusionActive ? "FUSION LINK" : "LINK DRIVE") : snapshot.turboActive ? "SMASH" : "HOLD";\n  const loadoutTacticalName = snapshot.loadout === "gun-focus" ? "CANNON DOCTRINE" : snapshot.loadout === "missile-focus" ? "RIPPLE DOCTRINE" : "FUSION DOCTRINE";\n  const loadoutTacticalHint = snapshot.loadout === "gun-focus" ? "SHRED ARMOR · FORCE STAGGER" : snapshot.loadout === "missile-focus" ? "CRUSH ARMOR · SHOCK TARGET" : "TURBO LINK · FINISH FOR REFUND";\n\n  return (\n''')

replace_once(mode,
'''          <div className={styles.meterCard}>\n            <div><span>AIRFRAME</span><strong>{hpPercent}%</strong></div>\n            <i className={styles.hpTrack}><b style={{ width: `${hpPercent}%` }} /></i>\n            <small>CONTINUE ×{snapshot.continuesRemaining} <span>NEAR MISS {snapshot.nearMisses}</span></small>\n          </div>\n        </div>\n''',
'''          <div className={styles.meterCard}>\n            <div><span>AIRFRAME</span><strong>{hpPercent}%</strong></div>\n            <i className={styles.hpTrack}><b style={{ width: `${hpPercent}%` }} /></i>\n            <small>CONTINUE ×{snapshot.continuesRemaining} <span>NEAR MISS {snapshot.nearMisses}</span></small>\n          </div>\n          <div className={productStyles.v118LoadoutStatus} data-loadout={snapshot.loadout} data-active={snapshot.loadoutReactionIntensity > 0}>\n            <small>{loadoutTacticalName}</small>\n            <strong>{snapshot.loadoutReactionLabel ?? loadoutTacticalHint}</strong>\n            <span>TACTICAL BONUS +{snapshot.loadoutBonusScore}</span>\n          </div>\n        </div>\n''')

mode_text = mode.read_text().replace('`3D FLIGHT · V11.7 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}`', '`3D FLIGHT · V11.8 · ${snapshot.paintScheme.toUpperCase()} · ${snapshot.loadout.toUpperCase()}`').replace('`COMPATIBILITY · CANVAS · V11.7 · ${snapshot.loadout.toUpperCase()}`', '`COMPATIBILITY · CANVAS · V11.8 · ${snapshot.loadout.toUpperCase()}`')
mode.write_text(mode_text)

# Hangar copy describes the tactical identity now rewarded in combat.
menu_text = menu.read_text()
menu_text = menu_text.replace('FUSION LINK · TURBO BOOSTS FIRE + LOCK', 'FUSION LINK · TURBO FINISH · SCORE + REFUND')
menu_text = menu_text.replace('RAPID MULTI · WIDE LOCK · TWIN RIPPLE', 'RAPID MULTI · RIPPLE SHOCK · ARMOR CRUSH')
menu_text = menu_text.replace('TWIN BURST · DUAL CANNON · HIGH RATE', 'TWIN BURST · ARMOR SHRED · CANNON STAGGER')
menu.write_text(menu_text)

css.write_text(css.read_text() + r'''

/* V11.8 Loadout Identity: tactical reaction card stays compact beside the airframe meter. */
.v118LoadoutStatus {
  min-width: 176px;
  max-width: 238px;
  padding: 7px 10px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 10px;
  background: rgba(4,10,18,.58);
  backdrop-filter: blur(7px);
  display: grid;
  gap: 1px;
  opacity: .82;
  transform: translateZ(0);
  transition: opacity .12s ease, transform .12s ease, box-shadow .12s ease;
}
.v118LoadoutStatus small { font-size: 8px; letter-spacing: .13em; opacity: .7; }
.v118LoadoutStatus strong { font-size: 10px; line-height: 1.05; letter-spacing: .04em; white-space: nowrap; }
.v118LoadoutStatus span { font-size: 8px; letter-spacing: .08em; opacity: .78; }
.v118LoadoutStatus[data-active="true"] { opacity: 1; transform: scale(1.025); box-shadow: 0 0 18px rgba(255,255,255,.14); }
.v118LoadoutStatus[data-loadout="gun-focus"] strong { color: #ffe07b; }
.v118LoadoutStatus[data-loadout="missile-focus"] strong { color: #78eaff; }
.v118LoadoutStatus[data-loadout="standard"] strong { color: #c79cff; }
@media (max-width: 720px) {
  .v118LoadoutStatus { min-width: 142px; max-width: 170px; padding: 6px 8px; }
  .v118LoadoutStatus strong { font-size: 9px; }
}
''')

# Append deterministic behavior tests.
tests.write_text(tests.read_text() + r'''


test("V11.8 Gun Focus converts twin-cannon hits into armor shred and tactical rewards", () => {
  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1181 });
  const gun = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "gun-focus", seed: 0x1181 });
  const standardId = standard.spawnEnemyForTests("bomber", 0, 0, 30);
  const gunId = gun.spawnEnemyForTests("bomber", 0, 0, 30);
  standard.damageEnemyForTests(standardId, 18, false);
  gun.damageEnemyForTests(gunId, 18, false);
  const standardEnemy = standard.getSnapshot().enemies.find((enemy) => enemy.id === standardId);
  const gunEnemy = gun.getSnapshot().enemies.find((enemy) => enemy.id === gunId);
  assert.ok(standardEnemy && gunEnemy);
  assert.ok(gunEnemy.armor < standardEnemy.armor, `${gunEnemy.armor} < ${standardEnemy.armor}`);
  assert.ok(gunEnemy.stagger > standardEnemy.stagger, `${gunEnemy.stagger} > ${standardEnemy.stagger}`);
  assert.equal(gun.getSnapshot().impacts.at(-1)?.reaction, "twin-cannon");
  gun.damageEnemyForTests(gunId, 999, false);
  assert.ok(gun.getSnapshot().loadoutBonusScore > 0);
  assert.ok(gun.getSnapshot().loadoutReactionSerial > 0);
});

test("V11.8 Missile Focus creates a stronger ripple shock reaction than a standard missile", () => {
  const standard = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1182 });
  const missile = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "missile-focus", seed: 0x1182 });
  const standardId = standard.spawnEnemyForTests("bomber", 0, 0, 30);
  const missileId = missile.spawnEnemyForTests("bomber", 0, 0, 30);
  standard.damageEnemyForTests(standardId, 16, true);
  missile.damageEnemyForTests(missileId, 16, true);
  const standardEnemy = standard.getSnapshot().enemies.find((enemy) => enemy.id === standardId);
  const rippleEnemy = missile.getSnapshot().enemies.find((enemy) => enemy.id === missileId);
  assert.ok(standardEnemy && rippleEnemy);
  assert.ok(rippleEnemy.armor < standardEnemy.armor, `${rippleEnemy.armor} < ${standardEnemy.armor}`);
  assert.ok(rippleEnemy.stagger > standardEnemy.stagger, `${rippleEnemy.stagger} > ${standardEnemy.stagger}`);
  assert.equal(missile.getSnapshot().impacts.at(-1)?.reaction, "ripple-shock");
  missile.damageEnemyForTests(missileId, 999, true);
  assert.ok(missile.getSnapshot().loadoutBonusScore > 0);
});

test("V11.8 Standard only earns Fusion tactical finish rewards while Turbo Link is active", () => {
  const idle = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1183 });
  const linked = new SkyDancerArcadeRuntime({ difficulty: "normal", mode: "stage-practice", startStageId: "dawn-city", loadout: "standard", seed: 0x1183 });
  const idleId = idle.spawnEnemyForTests("fighter", 0, 0, 30);
  const linkedId = linked.spawnEnemyForTests("fighter", 0, 0, 30);
  linked.setTurbo(true);
  idle.damageEnemyForTests(idleId, 999, false);
  linked.damageEnemyForTests(linkedId, 999, false);
  assert.equal(idle.getSnapshot().impacts.at(-1)?.reaction, "none");
  assert.equal(idle.getSnapshot().loadoutBonusScore, 0);
  assert.equal(linked.getSnapshot().impacts.at(-1)?.reaction, "fusion-link");
  assert.ok(linked.getSnapshot().loadoutBonusScore > 0);
  assert.match(linked.getSnapshot().loadoutReactionLabel ?? "", /FUSION/);
});

test("V11.8 tactical doctrine is visible in HUD, hangar and WebGL enemy reaction code", async () => {
  const [modeSource, menuSource, webglSource, cssSource, runtimeSource] = await Promise.all([
    readFile(new URL("../app/SkyDancerArcadeMode.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SkyDancerArcadeProduct.module.css", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"),
  ]);
  assert.match(modeSource, /V11\.8/);
  assert.match(modeSource, /TACTICAL BONUS \+\{snapshot\.loadoutBonusScore\}/);
  assert.match(menuSource, /ARMOR SHRED · CANNON STAGGER/);
  assert.match(menuSource, /RIPPLE SHOCK · ARMOR CRUSH/);
  assert.match(menuSource, /TURBO FINISH · SCORE \+ REFUND/);
  assert.match(webglSource, /impact\.reaction === "ripple-shock"/);
  assert.match(webglSource, /snapshot\.loadoutReactionSerial/);
  assert.match(cssSource, /v118LoadoutStatus/);
  assert.match(runtimeSource, /TWIN CANNON SHRED/);
  assert.match(runtimeSource, /RIPPLE ARMOR CRUSH/);
  assert.match(runtimeSource, /FUSION LINK FINISH/);
});
''')

print("V11.8 product patch prepared")
