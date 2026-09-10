from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")

runtime = runtime_path.read_text()
webgl = webgl_path.read_text()

# Runtime: extend V27 close-range density protection with a V27.1 front-band budget.
v27_import = '''import {
  SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
  SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
  skyDancerArcadeV27CloseCombatCrowded,
  skyDancerArcadeV27DensityCaps,
} from "./SkyDancerArcadeV27CombatReadability";
'''
v271_runtime_import = '''import {
  SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
  SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
  skyDancerArcadeV27DensityCaps,
} from "./SkyDancerArcadeV27CombatReadability";
import { skyDancerArcadeV271CombatCorridorCrowded } from "./SkyDancerArcadeV271ScreenPolish";
'''
assert v27_import in runtime, "V27 runtime import block changed"
runtime = runtime.replace(v27_import, v271_runtime_import, 1)

assert 'const crowdedV27 = skyDancerArcadeV27CloseCombatCrowded(' in runtime
runtime = runtime.replace(
    'const crowdedV27 = skyDancerArcadeV27CloseCombatCrowded(',
    'const crowdedV271 = skyDancerArcadeV271CombatCorridorCrowded(',
    1,
)
runtime = runtime.replace(
    'if (crowdedV27 && this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {',
    'if (crowdedV271 && this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {',
    1,
)

assert 'const closeCrowdedV27 = skyDancerArcadeV27CloseCombatCrowded(' in runtime
runtime = runtime.replace(
    'const closeCrowdedV27 = skyDancerArcadeV27CloseCombatCrowded(',
    'const corridorCrowdedV271 = skyDancerArcadeV271CombatCorridorCrowded(',
    1,
)
runtime = runtime.replace(
    'if (!this.bossSpawned && !closeCrowdedV27 && this.encounterPhaseQueue.length === 0',
    'if (!this.bossSpawned && !corridorCrowdedV271 && this.encounterPhaseQueue.length === 0',
    1,
)

# WebGL: rank targeting information so the most relevant threats get the full marker footprint.
v27_webgl_import = 'import { skyDancerArcadeV27CuePointSize, skyDancerArcadeV27EnemyPresenceScale } from "./SkyDancerArcadeV27CombatReadability";\n'
v271_webgl_import = v27_webgl_import + '''import {
  skyDancerArcadeV271CueBudget,
  skyDancerArcadeV271ThreatCueScore,
} from "./SkyDancerArcadeV271ScreenPolish";
'''
assert v27_webgl_import in webgl, "V27 WebGL import changed"
webgl = webgl.replace(v27_webgl_import, v271_webgl_import, 1)

sync_start = '''  private syncEnemies(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const active = new Set<number>();
    for (const enemy of snapshot.enemies) {
'''
sync_v271 = '''  private syncEnemies(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const active = new Set<number>();
    const compactLandscapeV271 = this.renderWidth > this.renderHeight && this.renderHeight <= 560;
    const cueBudgetV271 = skyDancerArcadeV271CueBudget(compactLandscapeV271);
    const cueScoreV271 = (enemy: SkyDancerArcadeSnapshot["enemies"][number]): number =>
      skyDancerArcadeV271ThreatCueScore(
        enemy.depth,
        Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY),
        enemy.locked,
        enemy.boss,
      );
    const primaryLockIdsV271 = new Set(
      snapshot.enemies
        .filter((enemy) => enemy.locked)
        .sort((a, b) => cueScoreV271(b) - cueScoreV271(a))
        .slice(0, cueBudgetV271.primaryLocks)
        .map((enemy) => enemy.id),
    );
    const aimCueIdsV271 = new Set(
      snapshot.enemies
        .filter((enemy) => {
          if (enemy.locked || enemy.depth <= 7 || enemy.depth >= 68) return false;
          const aimDistance = Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY);
          const aimThreshold = enemy.boss ? 1.62 : enemy.kind === "bomber" ? .96 : .82;
          return aimDistance < aimThreshold;
        })
        .sort((a, b) => cueScoreV271(b) - cueScoreV271(a))
        .slice(0, cueBudgetV271.aimCues)
        .map((enemy) => enemy.id),
    );
    const counterplayCueIdsV271 = new Set(
      snapshot.enemies
        .filter((enemy) => enemy.counterplay !== "none" && !enemy.locked && enemy.depth > 7 && enemy.depth < 56)
        .sort((a, b) => cueScoreV271(b) - cueScoreV271(a))
        .slice(0, cueBudgetV271.counterplayCues)
        .map((enemy) => enemy.id),
    );
    for (const enemy of snapshot.enemies) {
'''
assert sync_start in webgl, "syncEnemies opening changed"
webgl = webgl.replace(sync_start, sync_v271, 1)

aim_block = '''      const aimDistance = Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY);
      const aimThreshold = enemy.boss ? 1.62 : enemy.kind === "bomber" ? .96 : .82;
      const showAimCue = !enemy.locked && enemy.depth > 7 && enemy.depth < 68 && aimDistance < aimThreshold;
'''
assert aim_block in webgl, "aim cue block changed"
webgl = webgl.replace(aim_block, '      const showAimCue = aimCueIdsV271.has(enemy.id);\n', 1)

counter_open = '''      let counterplayRing = group.getObjectByName("arcade-counterplay-ring");
      if (enemy.counterplay !== "none" && !counterplayRing) {
'''
counter_v271 = '''      const showCounterplayCueV271 = counterplayCueIdsV271.has(enemy.id);
      let counterplayRing = group.getObjectByName("arcade-counterplay-ring");
      if (showCounterplayCueV271 && !counterplayRing) {
'''
assert counter_open in webgl, "counterplay opening changed"
webgl = webgl.replace(counter_open, counter_v271, 1)

counter_close = '''      } else if (enemy.counterplay === "none" && counterplayRing) {
        group.remove(counterplayRing);
        this.disposeObject(counterplayRing);
        counterplayRing = undefined;
      }
'''
counter_close_v271 = '''      } else if (!showCounterplayCueV271 && counterplayRing) {
        group.remove(counterplayRing);
        this.disposeObject(counterplayRing);
        counterplayRing = undefined;
      }
'''
assert counter_close in webgl, "counterplay close changed"
webgl = webgl.replace(counter_close, counter_close_v271, 1)

lock_size = '''      if (lockRing) {
        lockRing.scale.setScalar(1);
        setArcadeCuePointSizeV27(lockRing, skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "lock"));
      }
'''
lock_size_v271 = '''      if (lockRing) {
        lockRing.scale.setScalar(1);
        const fullLockSizeV271 = skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "lock");
        const primaryLockV271 = enemy.boss || primaryLockIdsV271.has(enemy.id);
        setArcadeCuePointSizeV27(
          lockRing,
          primaryLockV271
            ? fullLockSizeV271
            : Math.max(18, Math.round(fullLockSizeV271 * cueBudgetV271.secondaryLockScale)),
        );
      }
'''
assert lock_size in webgl, "lock size block changed"
webgl = webgl.replace(lock_size, lock_size_v271, 1)

runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
print("V27.1 runtime/WebGL screen polish patch applied")
