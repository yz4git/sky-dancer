from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
source = runtime_path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    source = source.replace(old, new, 1)


replace_once(
'''const ARCADE_SECTION_RESULT_SECONDS = 1.35;\nconst PRACTICE_RESULT_SECONDS = 2.8;\nconst PLAYER_MOVE_SPEED_X = 3.7;''',
'''const ARCADE_SECTION_RESULT_SECONDS = 1.35;\nconst PRACTICE_RESULT_SECONDS = 2.8;\n// V40.14: the climax gets one readable breath on entry and exit.\nconst BOSS_INGRESS_HOLD_SECONDS = 1.2;\nconst BOSS_OUTRO_HOLD_SECONDS = 0.9;\nconst PLAYER_MOVE_SPEED_X = 3.7;''',
"climax pacing constants",
)

replace_once(
'''  private bossPhaseTransitionTimer = 0;\n  private pendingBossPhaseMechanic: SkyDancerArcadeBossPhase | null = null;\n  // V32: fresh routes and continues get a short establishing/rejoin beat before combat pressure resumes.''',
'''  private bossPhaseTransitionTimer = 0;\n  private pendingBossPhaseMechanic: SkyDancerArcadeBossPhase | null = null;\n  // V40.14: boss presentation owns a short entry/exit window without stopping player flight.\n  private bossIngressTimer = 0;\n  private bossOpeningStrikePending = false;\n  private bossOutroTimer = 0;\n  // V32: fresh routes and continues get a short establishing/rejoin beat before combat pressure resumes.''',
"climax pacing fields",
)

replace_once(
'''    this.stageEntryTimer = rewindTime > 0 ? 1.2 : .82;\n    this.bossPhaseTransitionTimer = 0;\n    this.pendingBossPhaseMechanic = null;\n    this.enemies = [];''',
'''    this.stageEntryTimer = rewindTime > 0 ? 1.2 : .82;\n    this.bossPhaseTransitionTimer = 0;\n    this.pendingBossPhaseMechanic = null;\n    this.bossIngressTimer = 0;\n    this.bossOpeningStrikePending = false;\n    this.bossOutroTimer = 0;\n    this.enemies = [];''',
"reset climax pacing",
)

replace_once(
'''    this.messageTimer = Math.max(0, this.messageTimer - delta);\n    this.stageEntryTimer = Math.max(0, this.stageEntryTimer - delta);\n    this.damageCooldown = Math.max(0, this.damageCooldown - delta);''',
'''    this.messageTimer = Math.max(0, this.messageTimer - delta);\n    this.stageEntryTimer = Math.max(0, this.stageEntryTimer - delta);\n    this.bossIngressTimer = Math.max(0, this.bossIngressTimer - delta);\n    this.bossOutroTimer = Math.max(0, this.bossOutroTimer - delta);\n    this.damageCooldown = Math.max(0, this.damageCooldown - delta);''',
"tick climax timers",
)

replace_once(
'''    this.updateV11Timeline();\n    this.updateDirector();\n    this.updateLocking(delta);\n    this.updateWeapons(delta);\n    this.updateEnemies(delta, turboActive);''',
'''    this.updateV11Timeline();\n    this.updateDirector();\n    // Once the climax is resolved, preserve steering but stop spawning fresh player ordnance into the result shot.\n    if (this.bossOutroTimer <= 0) {\n      this.updateLocking(delta);\n      this.updateWeapons(delta);\n    }\n    this.updateEnemies(delta, turboActive);''',
"suppress weapons during climax outro",
)

replace_once(
'''    if (this.stageTime >= this.stage.durationSeconds) {\n      if (!this.bossDefeated) this.breakClimaxTargetAtCourseEnd();\n      this.completeStage();\n    }''',
'''    if (this.stageTime >= this.stage.durationSeconds) {\n      if (!this.bossDefeated) this.breakClimaxTargetAtCourseEnd();\n      // V40.14: let the departing boss / wreck read before the SECTION CLEAR card takes over.\n      if (this.bossOutroTimer <= 0) this.completeStage();\n    }''',
"defer section clear until climax outro",
)

replace_once(
'''  private launchLockedMissiles(): void {\n    if (this.status !== "running") return;''',
'''  private launchLockedMissiles(): void {\n    if (this.status !== "running" || this.bossOutroTimer > 0) return;''',
"suppress lock release during climax outro",
)

replace_once(
'''  private updateEnemyCounterplay(enemy: ArcadeEnemy, delta: number, turboActive: boolean): void {\n    if (enemy.boss && this.bossPhaseTransitionTimer > 0) {''',
'''  private updateEnemyCounterplay(enemy: ArcadeEnemy, delta: number, turboActive: boolean): void {\n    if (enemy.boss && (this.bossPhaseTransitionTimer > 0 || this.bossIngressTimer > 0)) {''',
"suppress boss counterplay during ingress",
)

replace_once(
'''      if (enemy.boss) {\n        const nextPhase = skyDancerArcadeBossPhase(enemy.hp, enemy.maxHp);\n        if (nextPhase !== enemy.bossPhase) {''',
'''      if (enemy.boss) {\n        if (this.bossIngressTimer > 0) {\n          // The boss can be tracked and approached, but does not attack or expose a weakpoint during the reveal.\n          enemy.weakpointOpen = false;\n          enemy.counterplay = "none";\n          enemy.counterplayTimer = 0;\n          enemy.counterplayIntensity = 0;\n          enemy.fireCooldown = Math.max(enemy.fireCooldown, this.bossIngressTimer + .38);\n        } else if (this.bossOpeningStrikePending) {\n          // Release the first attack only after the V40.13 focus animation has opened back out.\n          this.bossOpeningStrikePending = false;\n          enemy.fireCooldown = clamp(enemy.fireCooldown, .28, .42);\n          this.stageEventSerial += 1;\n          this.stageEventLabel = "CLIMAX ENGAGED";\n          this.stageEventTimer = 1.15;\n          this.message = `ENGAGE · ${this.bossMechanicLabel(1)} · OPENING VOLLEY`;\n          this.messageTimer = 1.4;\n        }\n        const nextPhase = skyDancerArcadeBossPhase(enemy.hp, enemy.maxHp);\n        if (this.bossIngressTimer <= 0 && nextPhase !== enemy.bossPhase) {''',
"boss ingress hold and opening volley",
)

replace_once(
'''        enemy.weakpointOpen = this.pendingBossPhaseMechanic === null\n          && skyDancerArcadeV11BossWeakpointOpen(this.stage.id, enemy.bossPhase, enemy.age);''',
'''        enemy.weakpointOpen = this.bossIngressTimer <= 0\n          && this.pendingBossPhaseMechanic === null\n          && skyDancerArcadeV11BossWeakpointOpen(this.stage.id, enemy.bossPhase, enemy.age);''',
"boss weakpoint ingress gate",
)

replace_once(
'''    const final = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n    const reactiveContract = final''',
'''    const final = this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE;\n    this.bossIngressTimer = final ? BOSS_INGRESS_HOLD_SECONDS + .18 : BOSS_INGRESS_HOLD_SECONDS;\n    this.bossOpeningStrikePending = true;\n    this.bossOutroTimer = 0;\n    const reactiveContract = final''',
"arm boss ingress timer",
)

replace_once(
'''      amplitude: 1.42,\n      fireCooldown: 1.4,\n      scoreValue: final ? 24000 : 12000,''',
'''      amplitude: 1.42,\n      fireCooldown: this.bossIngressTimer + .42,\n      scoreValue: final ? 24000 : 12000,''',
"boss first fire cooldown",
)

replace_once(
'''    this.bossKills += 1;\n    this.bossDefeated = true;\n    this.pendingBossPhaseMechanic = null;\n    this.bossPhaseTransitionTimer = 0;\n    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {''',
'''    this.bossKills += 1;\n    this.bossDefeated = true;\n    this.pendingBossPhaseMechanic = null;\n    this.bossPhaseTransitionTimer = 0;\n    this.bossIngressTimer = 0;\n    this.bossOpeningStrikePending = false;\n    this.bossOutroTimer = Math.max(this.bossOutroTimer, BOSS_OUTRO_HOLD_SECONDS);\n    // Make the entire remaining frame harmless while the destroyed silhouette clears the camera.\n    this.retireStagePresentationActors();\n    this.stageEventSerial += 1;\n    this.stageEventLabel = "CLIMAX BREAK";\n    this.stageEventTimer = 1.35;\n    if (this.stage.id === SKY_DANCER_ARCADE_FINAL_STAGE && this.finalBossContract) {''',
"arm boss defeat outro",
)

replace_once(
'''    this.messageTimer = 2.4;\n    if (this.stageTime >= this.stage.durationSeconds) this.completeStage();\n  }''',
'''    this.messageTimer = 2.4;\n  }''',
"remove immediate stage clear from boss defeat",
)

replace_once(
'''    this.bossDefeated = true;\n    this.message = "COURSE BREAK · TARGET DISENGAGING";\n    this.messageTimer = 1.35;\n  }''',
'''    this.bossDefeated = true;\n    this.bossIngressTimer = 0;\n    this.bossOpeningStrikePending = false;\n    this.bossOutroTimer = Math.max(this.bossOutroTimer, BOSS_OUTRO_HOLD_SECONDS);\n    this.retireStagePresentationActors();\n    this.stageEventSerial += 1;\n    this.stageEventLabel = "CLIMAX DISENGAGE";\n    this.stageEventTimer = 1.15;\n    this.message = "COURSE BREAK · TARGET DISENGAGING";\n    this.messageTimer = 1.35;\n  }''',
"arm timeout outro",
)

runtime_path.write_text(source)

test_path = Path("tests/sky-arcade-v4014-climax-pacing.test.ts")
test_path.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V40.14 boss reveal keeps the opening beat free of hostile fire", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "stage-practice",
    startStageId: "dawn-city",
    difficulty: "normal",
    seed: 401401,
  });
  runtime.setBossHpRatioForTests(.9);
  assert.equal(runtime.getSnapshot().bossActive, true);
  for (let frame = 0; frame < 18; frame += 1) runtime.step(.05);
  const reveal = runtime.getSnapshot();
  assert.equal(reveal.projectiles.some((projectile) => projectile.owner === "enemy"), false, "reveal beat should not already contain a boss volley");
  assert.equal(reveal.bossWeakpointOpen, false, "weakpoint stays closed while the reveal owns the frame");
});

test("V40.14 real boss kill near the course end holds the wreck shot before SECTION CLEAR", () => {
  const runtime = new SkyDancerArcadeRuntime({
    mode: "arcade-run",
    difficulty: "normal",
    seed: 401402,
  });
  const duration = runtime.getSnapshot().stageDurationSeconds;
  runtime.triggerV11TimelineForTests(.999);
  runtime.setBossHpRatioForTests(.02);
  const boss = runtime.getSnapshot().enemies.find((enemy) => enemy.boss);
  assert.ok(boss);
  runtime.spawnEnemyForTests("fighter", 1.15, .18, 24);
  runtime.damageEnemyForTests(boss.id, 100000, true);

  const killed = runtime.getSnapshot();
  assert.equal(killed.status, "running");
  assert.equal(killed.bossActive, false, "combat HUD releases the boss while its wreck remains visible");
  assert.ok(killed.enemies.some((enemy) => enemy.id === boss.id), "destroyed boss silhouette survives the kill frame");
  assert.equal(killed.stageEventLabel, "CLIMAX BREAK");

  for (let frame = 0; frame < 8; frame += 1) runtime.step(.05);
  const held = runtime.getSnapshot();
  assert.ok(held.stageTimeSeconds >= duration, "course has already crossed its authored end");
  assert.equal(held.status, "running", "SECTION CLEAR waits for the destruction beat");
  assert.equal(held.projectiles.some((projectile) => projectile.owner === "enemy"), false, "outro pressure is harmless");

  for (let frame = 0; frame < 18 && runtime.getSnapshot().status === "running"; frame += 1) runtime.step(.05);
  assert.equal(runtime.getSnapshot().status, "stage-clear", "result card arrives after the short wreck hold");
});

test("V40.14 source gates opening pressure and result transition with dedicated climax timers", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.match(source, /private bossIngressTimer = 0/);
  assert.match(source, /private bossOutroTimer = 0/);
  assert.match(source, /this\.bossIngressTimer > 0[\s\S]*enemy\.fireCooldown = Math\.max/);
  assert.match(source, /if \(this\.bossOutroTimer <= 0\) this\.completeStage\(\)/);
  assert.doesNotMatch(source, /this\.messageTimer = 2\.4;\s*if \(this\.stageTime >= this\.stage\.durationSeconds\) this\.completeStage\(\)/);
});
''')

print("Applied Arcade Run V40.14 climax pacing patch")
