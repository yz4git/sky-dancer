from pathlib import Path

runtime_path = Path('src/sky/arcade/SkyDancerArcadeRuntime.ts')
source = runtime_path.read_text()

def replace_once(old: str, new: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly one match, found {count}: {old[:120]!r}')
    source = source.replace(old, new, 1)

replace_once(
'''  private bossPhaseSerial = 0;
  private bossMechanicSerial = 0;
  private stageEventSerial = 0;''',
'''  private bossPhaseSerial = 0;
  private bossMechanicSerial = 0;
  // V32: phase mechanics arm after a readable telegraph instead of appearing on the HP-threshold frame.
  private bossPhaseTransitionTimer = 0;
  private pendingBossPhaseMechanic: SkyDancerArcadeBossPhase | null = null;
  // V32: fresh routes and continues get a short establishing/rejoin beat before combat pressure resumes.
  private stageEntryTimer = 0;
  private stageEventSerial = 0;''')

replace_once(
'''  private resetStageState(rewindTime: number): void {
    this.stageTime = Math.max(0, rewindTime);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.enemies = [];''',
'''  private resetStageState(rewindTime: number): void {
    this.stageTime = Math.max(0, rewindTime);
    this.distance = this.stageTime * this.stage.courseSpeed;
    this.stageEntryTimer = rewindTime > 0 ? 1.2 : .82;
    this.bossPhaseTransitionTimer = 0;
    this.pendingBossPhaseMechanic = null;
    this.enemies = [];''')

replace_once(
'''    this.stageEventLabel = null;
    this.stageEventTimer = 0;''',
'''    this.stageEventLabel = rewindTime > 0 ? "REJOIN VECTOR" : "ROUTE ENTRY";
    this.stageEventTimer = rewindTime > 0 ? 1.4 : 1.15;
    this.stageEventSerial += 1;''')

replace_once(
'''    if (this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();''',
'''    if (this.stageEntryTimer <= 0 && this.stageTime >= this.stage.durationSeconds * skyDancerArcadeBossStartProgress(finalStage)) this.spawnBoss();''')

replace_once(
'''  continueRun(): boolean {
    if (this.status !== "continue" || this.continuesRemaining <= 0) return false;
    this.continuesRemaining -= 1;
    this.continuesUsed += 1;
    this.playerHp = PLAYER_MAX_HP;
    this.turbo = 72;
    this.chain = 0;
    this.chainTimer = 0;
    this.status = "running";
    this.message = "CONTINUE · FORMATION RESTORED";
    this.messageTimer = 2.2;
    const rewindSeconds = Math.min(4, this.stageTime);
    this.runTime = Math.max(0, this.runTime - rewindSeconds);
    this.resetStageState(this.stageTime - rewindSeconds);
    return true;
  }''',
'''  continueRun(): boolean {
    if (this.status !== "continue" || this.continuesRemaining <= 0) return false;
    this.continuesRemaining -= 1;
    this.continuesUsed += 1;
    this.playerHp = PLAYER_MAX_HP;
    this.turbo = 72;
    this.chain = 0;
    this.chainTimer = 0;
    this.status = "running";
    const rewindSeconds = Math.min(4, this.stageTime);
    this.runTime = Math.max(0, this.runTime - rewindSeconds);
    this.resetStageState(this.stageTime - rewindSeconds);
    this.stageEntryTimer = Math.max(this.stageEntryTimer, 1.25);
    this.damageCooldown = Math.max(this.damageCooldown, 1.25);
    this.stageEventLabel = "REJOIN VECTOR";
    this.stageEventTimer = 1.4;
    this.stageEventSerial += 1;
    this.message = "CONTINUE · REJOINING FORMATION";
    this.messageTimer = 2.2;
    return true;
  }''')

replace_once(
'''    if (this.status === "paused" || this.status === "continue" || this.status === "game-over" || this.status === "run-clear" || this.status === "practice-clear") return;
    if (this.status === "stage-clear") {''',
'''    if (this.status === "paused" || this.status === "run-clear" || this.status === "practice-clear") return;
    if (this.status === "continue" || this.status === "game-over") {
      // V32: failure overlays sit over a harmless moving aftermath instead of freezing the combat frame.
      this.updateStageClearPresentation(delta);
      return;
    }
    if (this.status === "stage-clear") {''')

replace_once(
'''    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);''',
'''    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.stageEntryTimer = Math.max(0, this.stageEntryTimer - delta);
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);''')

replace_once(
'''  private updateDirector(): void {
    this.updateV121EncounterQueue();
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);''',
'''  private updateDirector(): void {
    // V32: route/continue establishing shots are presentation-only breathing room.
    if (this.stageEntryTimer > 0) return;
    this.updateV121EncounterQueue();
    const progress = clamp(this.stageTime / this.stage.durationSeconds, 0, 1);''')

replace_once(
'''  private updateEnemyCounterplay(enemy: ArcadeEnemy, delta: number, turboActive: boolean): void {
    if (enemy.counterplay !== "none") {''',
'''  private updateEnemyCounterplay(enemy: ArcadeEnemy, delta: number, turboActive: boolean): void {
    if (enemy.boss && this.bossPhaseTransitionTimer > 0) {
      enemy.counterplay = "none";
      enemy.counterplayTimer = 0;
      enemy.counterplayIntensity = 0;
      return;
    }
    if (enemy.counterplay !== "none") {''')

replace_once(
'''      if (enemy.retreating && !enemy.boss) {
        enemy.retreatTimer = (enemy.retreatTimer ?? 0) + delta;
        enemy.locked = false;
        enemy.counterplay = "none";
        enemy.counterplayTimer = 0;
        enemy.counterplayIntensity = 0;
        enemy.fireCooldown = 999;
        const retreatSign = enemy.retreatSign ?? (enemy.x < 0 ? -1 : 1);
        const depthDirection = enemy.retreatDepthDirection ?? 1;
        const verticalSign = enemy.id % 3 === 0 ? -1 : 1;
        const targetX = clamp(retreatSign * (2.34 + Math.min(.22, enemy.retreatTimer * .14)), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        const targetY = clamp(verticalSign * (1.3 + Math.min(.48, enemy.retreatTimer * .3)), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
        // Reuse the coordinated-flight solver so the exit is a banked aircraft maneuver rather than a tween.
        const flightState = skyDancerArcadeV25Step(''',
'''      if (enemy.retreating) {
        enemy.retreatTimer = (enemy.retreatTimer ?? 0) + delta;
        enemy.locked = false;
        enemy.counterplay = "none";
        enemy.counterplayTimer = 0;
        enemy.counterplayIntensity = 0;
        enemy.fireCooldown = 999;
        const retreatSign = enemy.retreatSign ?? (enemy.x < 0 ? -1 : 1);
        const depthDirection = enemy.retreatDepthDirection ?? 1;
        const verticalSign = enemy.id % 3 === 0 ? -1 : 1;
        if (enemy.boss) {
          // V32: the destroyed boss silhouette survives its explosion briefly, then falls out of the fight under motion.
          const lateralTarget = retreatSign * 1.65;
          const verticalTarget = -1.45 + verticalSign * .22;
          const lateralResponse = 1 - Math.exp(-delta * 1.85);
          const verticalResponse = 1 - Math.exp(-delta * 1.7);
          enemy.x += (lateralTarget - enemy.x) * lateralResponse;
          enemy.y += (verticalTarget - enemy.y) * verticalResponse;
          enemy.depth += depthDirection * (32 + Math.min(34, enemy.retreatTimer * 22)) * delta;
          if ((depthDirection > 0 && enemy.depth > 128) || (depthDirection < 0 && enemy.depth < -12.5) || enemy.retreatTimer > 1.55) enemy.alive = false;
          continue;
        }
        const targetX = clamp(retreatSign * (2.34 + Math.min(.22, enemy.retreatTimer * .14)), -ENEMY_X_LIMIT, ENEMY_X_LIMIT);
        const targetY = clamp(verticalSign * (1.3 + Math.min(.48, enemy.retreatTimer * .3)), -ENEMY_Y_LIMIT, ENEMY_Y_LIMIT);
        // Reuse the coordinated-flight solver so the exit is a banked aircraft maneuver rather than a tween.
        const flightState = skyDancerArcadeV25Step(''')

replace_once(
'''        if (nextPhase !== enemy.bossPhase) {
          enemy.bossPhase = nextPhase;
          this.bossPhaseSerial += 1;
          const mechanic = skyDancerArcadeV11BossMechanicLabel(this.stage.id, nextPhase);
          this.message = `PHASE ${nextPhase} · ${mechanic}`;
          this.messageTimer = 1.65;
          this.addScore(1000 + nextPhase * 650, true);
          this.turbo = Math.min(100, this.turbo + 9);
          this.triggerBossPhaseMechanic(nextPhase);
        }
        enemy.weakpointOpen = skyDancerArcadeV11BossWeakpointOpen(this.stage.id, enemy.bossPhase, enemy.age);''',
'''        if (nextPhase !== enemy.bossPhase) {
          enemy.bossPhase = nextPhase;
          this.bossPhaseSerial += 1;
          this.pendingBossPhaseMechanic = nextPhase;
          this.bossPhaseTransitionTimer = .72;
          const mechanic = skyDancerArcadeV11BossMechanicLabel(this.stage.id, nextPhase);
          enemy.weakpointOpen = false;
          enemy.counterplay = "none";
          enemy.counterplayTimer = 0;
          enemy.counterplayIntensity = 0;
          enemy.fireCooldown = Math.max(enemy.fireCooldown, .9);
          this.message = `PHASE ${nextPhase} SHIFT · ${mechanic}`;
          this.messageTimer = 1.65;
          this.addScore(1000 + nextPhase * 650, true);
          this.turbo = Math.min(100, this.turbo + 9);
        }
        if (this.pendingBossPhaseMechanic !== null) {
          this.bossPhaseTransitionTimer = Math.max(0, this.bossPhaseTransitionTimer - delta);
          enemy.fireCooldown = Math.max(enemy.fireCooldown, this.bossPhaseTransitionTimer + .18);
          if (this.bossPhaseTransitionTimer <= 0) {
            const armedPhase = this.pendingBossPhaseMechanic;
            this.pendingBossPhaseMechanic = null;
            this.triggerBossPhaseMechanic(armedPhase);
            this.message = `PHASE ${armedPhase} ACTIVE · ${skyDancerArcadeV11BossMechanicLabel(this.stage.id, armedPhase)}`;
            this.messageTimer = 1.15;
          }
        }
        enemy.weakpointOpen = this.pendingBossPhaseMechanic === null
          && skyDancerArcadeV11BossWeakpointOpen(this.stage.id, enemy.bossPhase, enemy.age);''')

replace_once(
'''      this.spawnEnemy(kind, sign * (1.35 + escort * .22), sign * .34, 38 + escort * 5, maneuver, sign);''',
'''      // V32: escorts enter from the far combat corridor after the phase telegraph instead of popping in near the boss.
      this.spawnEnemy(kind, sign * (1.35 + escort * .22), sign * .34, 68 + escort * 7, maneuver, sign);''')

replace_once(
'''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive) return;''',
'''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive || enemy.retreating) return;''')

replace_once(
'''    enemy.alive = false;
    enemy.locked = false;
    this.enemiesDefeated += 1;''',
'''    if (enemy.boss) {
      // V32: keep the defeated hull in the render snapshot long enough for the explosion to read as destruction, not deletion.
      enemy.locked = false;
      enemy.retreating = true;
      enemy.retreatTimer = 0;
      enemy.retreatSign = enemy.x < -0.05 ? -1 : enemy.x > 0.05 ? 1 : enemy.id % 2 === 0 ? -1 : 1;
      enemy.retreatDepthDirection = 1;
      enemy.counterplay = "none";
      enemy.counterplayTimer = 0;
      enemy.counterplayIntensity = 0;
      enemy.fireCooldown = 999;
    } else {
      enemy.alive = false;
      enemy.locked = false;
    }
    this.enemiesDefeated += 1;''')

replace_once(
'''    this.bossKills += 1;
    this.bossDefeated = true;
    this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · EXIT COURSE";''',
'''    this.bossKills += 1;
    this.bossDefeated = true;
    this.pendingBossPhaseMechanic = null;
    this.bossPhaseTransitionTimer = 0;
    this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · WRECK CLEARING";''')

replace_once(
'''  private enterContinue(): void {
    this.releaseInputs();
    this.status = this.continuesRemaining > 0 ? "continue" : "game-over";''',
'''  private enterContinue(): void {
    this.releaseInputs();
    // V32: clear lethal pressure but preserve motion behind the failure/continue overlay.
    this.retireStagePresentationActors();
    this.status = this.continuesRemaining > 0 ? "continue" : "game-over";''')

runtime_path.write_text(source)

# Dedicated regression coverage for the presentation-continuity changes.
test_path = Path('tests/sky-arcade-v32-transition-polish.test.ts')
test_path.write_text(r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

test("V32 defeated boss remains as a harmless moving wreck instead of disappearing on the kill frame", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode:"stage-practice", startStageId:"dawn-city", difficulty:"normal", seed:3201 });
  runtime.setBossHpRatioForTests(.02);
  const before = runtime.getSnapshot();
  const boss = before.enemies.find(enemy => enemy.boss);
  assert.ok(boss);
  runtime.damageEnemyForTests(boss.id, 100000, true);
  const killed = runtime.getSnapshot();
  assert.equal(killed.bossActive, false, "combat HUD releases a defeated boss immediately");
  const wreck = killed.enemies.find(enemy => enemy.id === boss.id);
  assert.ok(wreck, "boss hull remains visible on the destruction frame");
  assert.equal(wreck.hp, 0);
  const depth0 = wreck.depth;
  for (let i = 0; i < 8; i += 1) runtime.step(.05);
  const moving = runtime.getSnapshot().enemies.find(enemy => enemy.id === boss.id);
  assert.ok(moving, "wreck survives long enough for the explosion/exit shot to read");
  assert.ok(moving.depth > depth0 + 5, "wreck visibly clears away under motion");
  for (let i = 0; i < 28; i += 1) runtime.step(.05);
  assert.equal(runtime.getSnapshot().enemies.some(enemy => enemy.id === boss.id), false, "wreck eventually leaves the scene");
});

test("V32 boss phase mechanics arm after the phase-shift telegraph", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode:"stage-practice", startStageId:"dawn-city", difficulty:"normal", seed:3202 });
  runtime.triggerBossPhaseForTests(1);
  const base = runtime.getSnapshot();
  const serial = base.bossMechanicSerial;
  runtime.triggerBossPhaseForTests(2);
  const shifted = runtime.getSnapshot();
  assert.equal(shifted.bossPhase, 2);
  assert.equal(shifted.bossMechanicSerial, serial, "mechanic does not spawn on the HP threshold frame");
  for (let i = 0; i < 8; i += 1) runtime.step(.05);
  assert.equal(runtime.getSnapshot().bossMechanicSerial, serial, "telegraph remains readable for the first portion of the shift");
  for (let i = 0; i < 8; i += 1) runtime.step(.05);
  assert.ok(runtime.getSnapshot().bossMechanicSerial > serial, "mechanic arms after the telegraph window");
});

test("V32 source keeps failure and rejoin transitions moving and delays fresh pressure", () => {
  const source = readFileSync(resolve(process.cwd(), "src/sky/arcade/SkyDancerArcadeRuntime.ts"), "utf8");
  assert.match(source, /if \(this\.status === "continue" \|\| this\.status === "game-over"\) \{[\s\S]*updateStageClearPresentation\(delta\)/);
  assert.match(source, /retireStagePresentationActors\(\);[\s\S]*this\.status = this\.continuesRemaining/);
  assert.match(source, /CONTINUE · REJOINING FORMATION/);
  assert.match(source, /if \(this\.stageEntryTimer > 0\) return;/);
  assert.match(source, /PHASE \$\{nextPhase\} SHIFT/);
  assert.match(source, /68 \+ escort \* 7/);
});
''')

print('Applied Arcade Run V32 transition polish')
