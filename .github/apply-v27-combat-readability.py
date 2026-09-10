from pathlib import Path

runtime_path = Path("src/sky/arcade/SkyDancerArcadeRuntime.ts")
webgl_path = Path("src/sky/arcade/SkyDancerArcadeWebGLDemo.ts")
legacy_path = Path("src/sky/arcade/SkyDancerArcadeModelsLegacy.ts")

runtime = runtime_path.read_text()
webgl = webgl_path.read_text()
legacy = legacy_path.read_text()

# Runtime: V27 limits and density controller.
rt_import = 'import { skyDancerArcadeV26FormationCommand } from "./SkyDancerArcadeV26FormationTactics";\n'
rt_v27_import = rt_import + '''import {
  SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT,
  SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT,
  skyDancerArcadeV27CloseCombatCrowded,
  skyDancerArcadeV27DensityCaps,
} from "./SkyDancerArcadeV27CombatReadability";
'''
if 'SkyDancerArcadeV27CombatReadability' not in runtime:
    assert rt_import in runtime
    runtime = runtime.replace(rt_import, rt_v27_import, 1)

runtime = runtime.replace('const PLAYER_X_LIMIT = 2.2;\nconst PLAYER_Y_LIMIT = 1.75;', 'const PLAYER_X_LIMIT = SKY_DANCER_ARCADE_V27_PLAYER_X_LIMIT;\nconst PLAYER_Y_LIMIT = SKY_DANCER_ARCADE_V27_PLAYER_Y_LIMIT;', 1)

old_queue = '''  private updateV121EncounterQueue(): void {
    if (this.bossSpawned) {
      this.encounterPhaseQueue = [];
      return;
    }
    while (this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {
'''
new_queue = '''  private updateV121EncounterQueue(): void {
    if (this.bossSpawned) {
      this.encounterPhaseQueue = [];
      return;
    }
    const hardV27 = this.options.difficulty === "hard";
    const crowdedV27 = skyDancerArcadeV27CloseCombatCrowded(
      this.enemies.filter((enemy) => enemy.alive && !enemy.boss).map((enemy) => enemy.depth),
      hardV27,
    );
    // V27: authored follow-up phases wait briefly if the phone-sized combat corridor is already full.
    // The phase is delayed, not discarded, so encounter grammar survives while visual pile-ups do not.
    if (crowdedV27 && this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {
      this.encounterPhaseQueue[0].at = this.stageTime + .28;
      return;
    }
    while (this.encounterPhaseQueue.length > 0 && this.encounterPhaseQueue[0].at <= this.stageTime) {
'''
if 'authored follow-up phases wait briefly' not in runtime:
    assert old_queue in runtime
    runtime = runtime.replace(old_queue, new_queue, 1)

old_director = '''    // Keep the proven V6.2 readability ceiling; V11 changes cadence/composition, not simultaneous clutter.
    const enemyCap = this.options.difficulty === "hard" ? 15 : 11;
    if (!this.bossSpawned && this.encounterPhaseQueue.length === 0 && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < enemyCap) {
      this.spawnWave();
'''
new_director = '''    // V27: total population and, more importantly, near-camera population have separate readability ceilings.
    const hardV27 = this.options.difficulty === "hard";
    const densityV27 = skyDancerArcadeV27DensityCaps(hardV27);
    const closeCrowdedV27 = skyDancerArcadeV27CloseCombatCrowded(
      this.enemies.filter((enemy) => enemy.alive && !enemy.boss).map((enemy) => enemy.depth),
      hardV27,
    );
    if (!this.bossSpawned && !closeCrowdedV27 && this.encounterPhaseQueue.length === 0 && this.stageTime >= this.nextWaveAt && this.enemies.filter((enemy) => enemy.alive).length < densityV27.enemyCap) {
      this.spawnWave();
'''
if 'total population and, more importantly, near-camera population' not in runtime:
    assert old_director in runtime
    runtime = runtime.replace(old_director, new_director, 1)

old_phase_cap = '''    const enemyCap = this.options.difficulty === "hard" ? 15 : 11;
    const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
    const count = Math.max(0, Math.min(plannedCount, enemyCap - aliveNonBoss));
'''
new_phase_cap = '''    const densityV27 = skyDancerArcadeV27DensityCaps(this.options.difficulty === "hard");
    const aliveNonBoss = this.enemies.filter((enemy) => enemy.alive && !enemy.boss).length;
    const count = Math.max(0, Math.min(plannedCount, densityV27.enemyCap - aliveNonBoss));
'''
if 'const densityV27 = skyDancerArcadeV27DensityCaps(this.options.difficulty === "hard");' not in runtime:
    assert old_phase_cap in runtime
    runtime = runtime.replace(old_phase_cap, new_phase_cap, 1)

# WebGL: distance-aware cue sizes and close-airframe presence.
webgl_import = 'import { skyDancerArcadeV25VisualAttitude } from "./SkyDancerArcadeV25CoordinatedFlight";\n'
webgl_v27_import = webgl_import + 'import { skyDancerArcadeV27CuePointSize, skyDancerArcadeV27EnemyPresenceScale } from "./SkyDancerArcadeV27CombatReadability";\n'
if 'skyDancerArcadeV27CuePointSize' not in webgl:
    assert webgl_import in webgl
    webgl = webgl.replace(webgl_import, webgl_v27_import, 1)

helper_marker = '''interface EnemyHitReaction {
  x: number;
  y: number;
  z: number;
  pitch: number;
  roll: number;
  flash: number;
  missile: boolean;
}
'''
helper_replacement = helper_marker + '''
function setArcadeCuePointSizeV27(root: THREE.Object3D, pointSize: number): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Points) || !(object.material instanceof THREE.ShaderMaterial)) return;
    const uniform = object.material.uniforms.pointSize;
    if (uniform) uniform.value = pointSize;
  });
}
'''
if 'function setArcadeCuePointSizeV27' not in webgl:
    assert helper_marker in webgl
    webgl = webgl.replace(helper_marker, helper_replacement, 1)

old_ring_scales = '''      if (lockRing) lockRing.scale.setScalar(enemy.boss ? 4.2 : enemy.kind === "gunship" ? 1.85 : enemy.kind === "bomber" ? 1.7 : 1.1);
      if (aimRing) aimRing.scale.setScalar(enemy.boss ? 3.7 : enemy.kind === "gunship" ? 1.65 : enemy.kind === "bomber" ? 1.5 : .92);
      if (counterplayRing) {
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 15 + enemy.id) * .08;
        counterplayRing.scale.setScalar((enemy.boss ? 4.75 : enemy.kind === "gunship" ? 2.2 : enemy.kind === "bomber" ? 2.05 : 1.38) * pulse);
      }
'''
new_ring_scales = '''      if (lockRing) {
        lockRing.scale.setScalar(1);
        setArcadeCuePointSizeV27(lockRing, skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "lock"));
      }
      if (aimRing) {
        aimRing.scale.setScalar(1);
        setArcadeCuePointSizeV27(aimRing, skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "aim"));
      }
      if (counterplayRing) {
        counterplayRing.scale.setScalar(1);
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .045;
        setArcadeCuePointSizeV27(
          counterplayRing,
          skyDancerArcadeV27CuePointSize(enemy.kind, enemy.boss, enemy.depth, "counterplay") * pulse,
        );
      }
'''
if 'skyDancerArcadeV27CuePointSize(enemy.kind' not in webgl:
    assert old_ring_scales in webgl
    webgl = webgl.replace(old_ring_scales, new_ring_scales, 1)

old_close_scale = '''        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;
        const extremeCloseClamp = 1 - THREE.MathUtils.clamp((18 - enemy.depth) / 15, 0, 1) * .18;
        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.035 : 1;
        const impactPulse = 1 + (reaction?.flash ?? 0) * .055;
        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp * impactPulse);
'''
new_close_scale = '''        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;
        const closePresenceV27 = skyDancerArcadeV27EnemyPresenceScale(enemy.depth);
        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.02 : 1;
        const impactPulse = 1 + (reaction?.flash ?? 0) * .045;
        group.scale.setScalar(baseScale * maneuverPresence * closePresenceV27 * impactPulse);
'''
if 'const closePresenceV27 = skyDancerArcadeV27EnemyPresenceScale' not in webgl:
    assert old_close_scale in webgl
    webgl = webgl.replace(old_close_scale, new_close_scale, 1)

# Lock-marker shader: make the formerly hard-coded 76px footprint controllable per cue and distance.
old_shader = '''  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: `void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=76.0;}`,
'''
new_shader = '''  const material = new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: new THREE.Color(color) },
      pointSize: { value: 76 },
    },
    vertexShader: `uniform float pointSize;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=pointSize;}`,
'''
if 'uniform float pointSize;void main()' not in legacy:
    assert old_shader in legacy
    legacy = legacy.replace(old_shader, new_shader, 1)

legacy = legacy.replace('  marker.userData.arcadeEnemyReadabilityV17 = true;\n', '  marker.userData.arcadeEnemyReadabilityV17 = true;\n  marker.userData.arcadeCombatReadabilityV27 = true;\n', 1)

runtime_path.write_text(runtime)
webgl_path.write_text(webgl)
legacy_path.write_text(legacy)
print("V27 combat readability patch applied")
