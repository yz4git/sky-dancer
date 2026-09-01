from pathlib import Path

root = Path(__file__).resolve().parents[1]
runtime_path = root / "src/sky/arcade/SkyDancerArcadeRuntime.ts"
presentation_path = root / "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"
webgl_path = root / "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
test_path = root / "tests/sky-arcade-reference.test.ts"

runtime = runtime_path.read_text()
presentation = presentation_path.read_text()
webgl = webgl_path.read_text()
tests = test_path.read_text()

# --- Runtime: retain exact hit/kill cause and position for presentation. ---
anchor = '''export interface SkyDancerArcadeProjectileSnapshot {
  id: number;
  owner: "player-gun" | "player-missile" | "enemy";
  x: number;
  y: number;
  depth: number;
  targetEnemyId: number | null;
}
'''
insert = anchor + '''
export interface SkyDancerArcadeImpactSnapshot {
  serial: number;
  enemyId: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  x: number;
  y: number;
  depth: number;
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  boss: boolean;
  missile: boolean;
  destroyed: boolean;
}
'''
assert anchor in runtime
runtime = runtime.replace(anchor, insert, 1)

anchor = '''  enemies: SkyDancerArcadeEnemySnapshot[];
  projectiles: SkyDancerArcadeProjectileSnapshot[];
  hazards: SkyDancerArcadeHazardSnapshot[];
'''
insert = '''  enemies: SkyDancerArcadeEnemySnapshot[];
  projectiles: SkyDancerArcadeProjectileSnapshot[];
  impacts: SkyDancerArcadeImpactSnapshot[];
  hazards: SkyDancerArcadeHazardSnapshot[];
'''
assert anchor in runtime
runtime = runtime.replace(anchor, insert, 1)

anchor = '''  private enemies: ArcadeEnemy[] = [];
  private projectiles: ArcadeProjectile[] = [];
  private hazards: ArcadeHazard[] = [];
'''
insert = '''  private enemies: ArcadeEnemy[] = [];
  private projectiles: ArcadeProjectile[] = [];
  private impactEvents: SkyDancerArcadeImpactSnapshot[] = [];
  private hazards: ArcadeHazard[] = [];
'''
assert anchor in runtime
runtime = runtime.replace(anchor, insert, 1)

anchor = '''    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];
'''
insert = '''    this.enemies = [];
    this.projectiles = [];
    this.impactEvents = [];
    this.hazards = [];
'''
assert anchor in runtime
runtime = runtime.replace(anchor, insert, 1)

old = '''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive) return;
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.hitSerial += 1;
    if (enemy.hp > 0) return;
    enemy.alive = false;
    enemy.locked = false;
    this.enemiesDefeated += 1;
    this.chain = Math.min(99, this.chain + 1);
    this.chainTimer = 4.6;
    this.addScore(enemy.scoreValue, this.input.turbo);
    if (missile && this.projectiles.filter((projectile) => projectile.owner === "player-missile" && projectile.life > 0).length >= 2) {
      this.multiLockKills += 1;
      this.addScore(350, true);
    }
    if (!enemy.boss) return;
    this.bossDefeated = true;
    this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · EXIT COURSE";
    this.messageTimer = 2.4;
    if (this.stageTime >= this.stage.durationSeconds) this.completeStage();
  }
'''
new = '''  private damageEnemy(enemy: ArcadeEnemy, amount: number, missile: boolean): void {
    if (!enemy.alive) return;
    const hpBefore = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - amount);
    this.hitSerial += 1;
    const destroyed = enemy.hp <= 0;
    this.impactEvents.push({
      serial: this.hitSerial,
      enemyId: enemy.id,
      kind: enemy.kind,
      x: enemy.x,
      y: enemy.y,
      depth: enemy.depth,
      hpBefore,
      hpAfter: enemy.hp,
      maxHp: enemy.maxHp,
      boss: enemy.boss,
      missile,
      destroyed,
    });
    if (this.impactEvents.length > 16) this.impactEvents.splice(0, this.impactEvents.length - 16);
    if (!destroyed) return;
    enemy.alive = false;
    enemy.locked = false;
    this.enemiesDefeated += 1;
    this.chain = Math.min(99, this.chain + 1);
    this.chainTimer = 4.6;
    this.addScore(enemy.scoreValue, this.input.turbo);
    if (missile && this.projectiles.filter((projectile) => projectile.owner === "player-missile" && projectile.life > 0).length >= 2) {
      this.multiLockKills += 1;
      this.addScore(350, true);
    }
    if (!enemy.boss) return;
    this.bossDefeated = true;
    this.message = this.stageTime >= this.stage.durationSeconds ? "CLIMAX TARGET DOWN" : "TARGET DOWN · EXIT COURSE";
    this.messageTimer = 2.4;
    if (this.stageTime >= this.stage.durationSeconds) this.completeStage();
  }
'''
assert old in runtime
runtime = runtime.replace(old, new, 1)

anchor = '''      projectiles: this.projectiles.filter((projectile) => projectile.life > 0).map((projectile) => ({
        id: projectile.id,
        owner: projectile.owner,
        x: projectile.x,
        y: projectile.y,
        depth: projectile.depth,
        targetEnemyId: projectile.targetEnemyId,
      })),
      hazards: this.hazards.map((hazard) => ({
'''
insert = '''      projectiles: this.projectiles.filter((projectile) => projectile.life > 0).map((projectile) => ({
        id: projectile.id,
        owner: projectile.owner,
        x: projectile.x,
        y: projectile.y,
        depth: projectile.depth,
        targetEnemyId: projectile.targetEnemyId,
      })),
      impacts: this.impactEvents.map((impact) => ({ ...impact })),
      hazards: this.hazards.map((hazard) => ({
'''
assert anchor in runtime
runtime = runtime.replace(anchor, insert, 1)

# --- Product presentation: pooled local detonation flash/rings + delayed secondary bursts. ---
presentation = presentation.replace(
    'export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 240, smoke: 84, missileSmoke: 160 } as const;',
    'export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 240, smoke: 84, missileSmoke: 160, detonationPulses: 24 } as const;',
    1,
)

anchor = '''interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  duration: number;
  size: number;
  rotation: number;
}
'''
insert = anchor + '''
interface DetonationPulse {
  position: THREE.Vector3;
  age: number;
  duration: number;
  delay: number;
  size: number;
  heat: number;
}

interface PendingBurst {
  position: THREE.Vector3;
  delay: number;
  size: number;
}
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

marker = '\nfunction createRibbon(enemy: boolean, playerMissile: boolean): SmokeRibbon {'
assert marker in presentation
pool_class = r'''

/** Local flash + shock-ring pool shared by missile hits and all kill classes. */
class DetonationPulsePool {
  readonly ring: THREE.InstancedMesh<THREE.RingGeometry, THREE.ShaderMaterial>;
  readonly flash: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly pulses: DetonationPulse[];
  private readonly ringAlpha: THREE.InstancedBufferAttribute;
  private readonly ringHeat: THREE.InstancedBufferAttribute;
  private readonly flashAlpha: THREE.InstancedBufferAttribute;
  private readonly flashHeat: THREE.InstancedBufferAttribute;
  private readonly dummy = new THREE.Object3D();
  private cursor = 0;

  constructor(count: number) {
    const ringGeometry = new THREE.RingGeometry(.58, .78, 36);
    this.ringAlpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.ringHeat = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    ringGeometry.setAttribute("lifeAlpha", this.ringAlpha);
    ringGeometry.setAttribute("heat", this.ringHeat);
    const ringMaterial = new THREE.ShaderMaterial({
      vertexShader: `attribute float lifeAlpha;attribute float heat;varying float vAlpha;varying float vHeat;
        void main(){vAlpha=lifeAlpha;vHeat=heat;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying float vAlpha;varying float vHeat;
        void main(){vec3 ember=vec3(3.8,.16,.018);vec3 white=vec3(4.8,3.1,1.25);vec3 color=mix(ember,white,clamp(vHeat,0.0,1.0));gl_FragColor=vec4(color,vAlpha);}`,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.ring = new THREE.InstancedMesh(ringGeometry, ringMaterial, count);
    this.ring.name = "arcade-pooled-detonation-rings";
    this.ring.frustumCulled = false;
    this.ring.renderOrder = 42;
    this.ring.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const flashGeometry = new THREE.PlaneGeometry(1, 1);
    this.flashAlpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.flashHeat = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    flashGeometry.setAttribute("lifeAlpha", this.flashAlpha);
    flashGeometry.setAttribute("heat", this.flashHeat);
    const flashMaterial = new THREE.ShaderMaterial({
      vertexShader: `attribute float lifeAlpha;attribute float heat;varying vec2 vUv;varying float vAlpha;varying float vHeat;
        void main(){vUv=uv;vAlpha=lifeAlpha;vHeat=heat;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec2 vUv;varying float vAlpha;varying float vHeat;
        void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float core=pow(max(0.0,1.0-r),2.2);if(core<.015)discard;
          vec3 ember=vec3(4.4,.18,.02);vec3 white=vec3(6.2,4.6,2.2);vec3 color=mix(ember,white,clamp(vHeat,0.0,1.0));gl_FragColor=vec4(color,core*vAlpha);}`,
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.flash = new THREE.InstancedMesh(flashGeometry, flashMaterial, count);
    this.flash.name = "arcade-pooled-detonation-flashes";
    this.flash.frustumCulled = false;
    this.flash.renderOrder = 41;
    this.flash.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.pulses = Array.from({ length: count }, () => ({
      position: new THREE.Vector3(), age: 1, duration: 0, delay: 0, size: 0, heat: 0,
    }));
    this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
    for (let i = 0; i < count; i++) {
      this.ring.setMatrixAt(i, this.dummy.matrix);
      this.flash.setMatrixAt(i, this.dummy.matrix);
    }
  }

  emit(position: THREE.Vector3, size: number, delay = 0, duration = .34, heat = .72): void {
    const index = this.cursor++ % this.pulses.length;
    const pulse = this.pulses[index];
    pulse.position.copy(position);
    pulse.age = 0;
    pulse.delay = Math.max(0, delay);
    pulse.duration = Math.max(.08, duration);
    pulse.size = Math.max(.1, size);
    pulse.heat = THREE.MathUtils.clamp(heat, 0, 1);
  }

  update(delta: number, camera: THREE.Camera): void {
    for (let i = 0; i < this.pulses.length; i++) {
      const pulse = this.pulses[i];
      pulse.age += delta;
      const localAge = pulse.age - pulse.delay;
      if (localAge < 0 || localAge >= pulse.duration || pulse.duration <= 0) {
        this.ringAlpha.setX(i, 0); this.flashAlpha.setX(i, 0);
        this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
        this.ring.setMatrixAt(i, this.dummy.matrix); this.flash.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      const t = localAge / pulse.duration;
      this.dummy.position.copy(pulse.position);
      this.dummy.quaternion.copy(camera.quaternion);
      const ringSize = pulse.size * (.42 + t * 2.05);
      this.dummy.scale.setScalar(ringSize); this.dummy.updateMatrix(); this.ring.setMatrixAt(i, this.dummy.matrix);
      this.ringAlpha.setX(i, Math.pow(1 - t, .78) * .82);
      this.ringHeat.setX(i, pulse.heat);
      const flashSize = pulse.size * (1.05 + t * .78);
      this.dummy.scale.set(flashSize * 1.18, flashSize, 1); this.dummy.updateMatrix(); this.flash.setMatrixAt(i, this.dummy.matrix);
      this.flashAlpha.setX(i, Math.pow(1 - t, 2.25) * .88);
      this.flashHeat.setX(i, Math.min(1, pulse.heat + .12));
    }
    this.ring.instanceMatrix.needsUpdate = true; this.flash.instanceMatrix.needsUpdate = true;
    this.ringAlpha.needsUpdate = true; this.ringHeat.needsUpdate = true;
    this.flashAlpha.needsUpdate = true; this.flashHeat.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < this.pulses.length; i++) {
      const pulse = this.pulses[i]; pulse.age = 1; pulse.duration = 0; pulse.delay = 0;
      this.ringAlpha.setX(i, 0); this.flashAlpha.setX(i, 0);
    }
    this.ringAlpha.needsUpdate = true; this.flashAlpha.needsUpdate = true;
  }

  dispose(): void {
    this.ring.dispose(); this.ring.geometry.dispose(); this.ring.material.dispose();
    this.flash.dispose(); this.flash.geometry.dispose(); this.flash.material.dispose();
  }
}
'''
presentation = presentation.replace(marker, pool_class + marker, 1)

anchor = '''  private readonly missileSmoke = new MissileSmokePool(ARCADE_EFFECT_BUDGET.missileSmoke);
  private readonly missileSmokeLast = new Map<number, THREE.Vector3>();
'''
insert = '''  private readonly missileSmoke = new MissileSmokePool(ARCADE_EFFECT_BUDGET.missileSmoke);
  private readonly detonation = new DetonationPulsePool(ARCADE_EFFECT_BUDGET.detonationPulses);
  private readonly pendingBursts: PendingBurst[] = [];
  private readonly missileSmokeLast = new Map<number, THREE.Vector3>();
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

anchor = '''    this.root.add(streaks, this.missileSmoke.mesh, this.smoke.mesh, this.sparks.mesh, this.climaxFlash, this.climaxRing); scene.add(this.root);
'''
insert = '''    this.root.add(streaks, this.missileSmoke.mesh, this.smoke.mesh, this.sparks.mesh, this.detonation.flash, this.detonation.ring, this.climaxFlash, this.climaxRing); scene.add(this.root);
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

anchor = '''    this.clearTrails(); this.missileSmokeLast.clear(); this.missileSmoke.clear(); this.smoke.clear(); this.sparks.clear();
'''
insert = '''    this.clearTrails(); this.missileSmokeLast.clear(); this.missileSmoke.clear(); this.smoke.clear(); this.sparks.clear(); this.detonation.clear();
    this.pendingBursts.length = 0;
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

anchor = '''  emitBurst(position: THREE.Vector3, size: number): void {
    this.smoke.emit(position, size); this.sparks.emit(position, size);
  }

  emitRushAccent(): void { this.rushAccent = 1; }
'''
insert = '''  emitBurst(position: THREE.Vector3, size: number): void {
    this.smoke.emit(position, size); this.sparks.emit(position, size);
  }

  emitMissileImpact(position: THREE.Vector3, strength = 1): void {
    const power = THREE.MathUtils.clamp(strength, .55, 1.8);
    this.sparks.emit(position, .48 + power * .28);
    this.smoke.emit(position, .22 + power * .2);
    this.detonation.emit(position, .62 + power * .38, 0, .22 + power * .055, .98);
    this.climaxEnergy = Math.max(this.climaxEnergy, .12 + power * .08);
  }

  emitSmallExplosion(position: THREE.Vector3, missileKill = false): void {
    this.emitBurst(position, missileKill ? .82 : .7);
    this.detonation.emit(position, missileKill ? 1.22 : 1.02, 0, .32, missileKill ? .96 : .68);
    if (missileKill) this.detonation.emit(position, .68, .045, .24, 1);
    this.climaxEnergy = Math.max(this.climaxEnergy, missileKill ? .34 : .24);
    this.climaxPulse = Math.max(this.climaxPulse, missileKill ? .34 : .22);
  }

  emitHeavyExplosion(position: THREE.Vector3, missileKill = false): void {
    this.emitBurst(position, missileKill ? 1.24 : 1.08);
    this.detonation.emit(position, missileKill ? 1.9 : 1.62, 0, .42, missileKill ? .98 : .78);
    for (let i = 0; i < 2; i++) {
      const angle = i * 2.7 + .85;
      const offset = new THREE.Vector3(Math.cos(angle) * 1.45, Math.sin(angle) * .82, (i - .5) * 1.25);
      const secondary = position.clone().add(offset);
      const delay = .075 + i * .07;
      this.queueBurst(secondary, .72 + i * .08, delay);
      this.detonation.emit(secondary, .92 + i * .12, delay, .34, .82 + i * .08);
    }
    if (missileKill) this.detonation.emit(position, 1.1, .06, .3, 1);
    this.climaxEnergy = Math.max(this.climaxEnergy, missileKill ? .72 : .58);
    this.climaxPulse = Math.max(this.climaxPulse, .62);
  }

  emitBossExplosion(position: THREE.Vector3, missileKill = false): void {
    this.emitBurst(position, missileKill ? 2.35 : 2.12);
    this.detonation.emit(position, missileKill ? 3.45 : 3.08, 0, .58, .98);
    for (let i = 0; i < 6; i++) {
      const angle = i * 2.399963 + .45;
      const radius = 2.1 + (i % 3) * .52;
      const secondary = position.clone().add(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * (1.25 + (i % 2) * .38), (i - 2.5) * .72));
      const delay = .07 + i * .055;
      this.queueBurst(secondary, 1.02 + (i % 2) * .22, delay);
      this.detonation.emit(secondary, 1.18 + (i % 3) * .2, delay, .4, .82 + (i % 2) * .12);
    }
    this.detonation.emit(position, 2.25, .17, .5, 1);
    this.climaxEnergy = Math.max(this.climaxEnergy, missileKill ? 1.82 : 1.62);
    this.climaxPulse = 1;
    this.bossArrival = Math.max(this.bossArrival, .72);
  }

  private queueBurst(position: THREE.Vector3, size: number, delay: number): void {
    if (this.pendingBursts.length >= 16) return;
    this.pendingBursts.push({ position: position.clone(), size, delay: Math.max(0, delay) });
  }

  private updatePendingBursts(delta: number): void {
    for (let i = this.pendingBursts.length - 1; i >= 0; i--) {
      const pending = this.pendingBursts[i];
      pending.delay -= delta;
      if (pending.delay > 0) continue;
      this.emitBurst(pending.position, pending.size);
      this.pendingBursts.splice(i, 1);
    }
  }

  emitRushAccent(): void { this.rushAccent = 1; }
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

anchor = '''    this.updateSpeedStreaks(snapshot, delta, fx);
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.updateProjectileTrails(snapshot, delta);
    this.updateClimax(delta, camera);
    this.missileSmoke.update(delta, camera);
'''
insert = '''    this.updateSpeedStreaks(snapshot, delta, fx);
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.updateProjectileTrails(snapshot, delta);
    this.updatePendingBursts(delta);
    this.detonation.update(delta, camera);
    this.updateClimax(delta, camera);
    this.missileSmoke.update(delta, camera);
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

anchor = '''    this.missileSmoke.dispose(); this.smoke.dispose(); this.sparks.dispose(); this.climaxMaterial.dispose();
'''
insert = '''    this.missileSmoke.dispose(); this.smoke.dispose(); this.sparks.dispose(); this.detonation.dispose(); this.climaxMaterial.dispose();
'''
assert anchor in presentation
presentation = presentation.replace(anchor, insert, 1)

# --- WebGL demo: route exact impact events into differentiated VFX/audio and remove cull false positives. ---
old = '''    for (const [id, group] of this.enemyGroups) {
      if (active.has(id)) continue;
      this.enemyGroups.delete(id);
      const previous = this.previousSnapshot.enemies.find(enemy => enemy.id === id);
      if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated && previous && previous.depth > 3) {
        const heavyCraft = previous.kind === "bomber" || previous.kind === "missile-boat";
        if (previous.boss) {
          this.presentation.emitClimax(group.position, 1.5);
        } else if (heavyCraft) {
          this.presentation.emitBurst(group.position, .98);
        } else {
          this.presentation.emitBurst(group.position, .72);
        }
        this.cameraShake = Math.min(1.08, this.cameraShake + (previous.boss ? .68 : heavyCraft ? .14 : .1));
        this.audio.tone(previous.boss ? 48 : 74, previous.boss ? .42 : .15, previous.boss ? .07 : .028, "sawtooth");
      }
      this.entityRoot.remove(group);
      this.disposeObject(group);
    }
'''
new = '''    for (const [id, group] of this.enemyGroups) {
      if (active.has(id)) continue;
      this.enemyGroups.delete(id);
      this.entityRoot.remove(group);
      this.disposeObject(group);
    }
'''
assert old in webgl
webgl = webgl.replace(old, new, 1)

old = '''  private syncEffects(snapshot: SkyDancerArcadeSnapshot): void {
    if (snapshot.hitSerial !== this.previousSnapshot.hitSerial) {
      this.cameraShake = Math.min(.38, this.cameraShake + .075);
      const target = snapshot.enemies.find(enemy => {
        const old = this.previousSnapshot.enemies.find(previous => previous.id === enemy.id);
        return old && enemy.hp < old.hp;
      });
      if (target) {
        const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, target.depth);
        this.presentation.emitBurst(new THREE.Vector3(target.x * 8.4 + course.x, 1.2 + target.y * 4.9 + course.y, -target.depth), .52);
      }
    }
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {
'''
new = '''  private syncEffects(snapshot: SkyDancerArcadeSnapshot): void {
    for (const impact of snapshot.impacts) {
      if (impact.serial <= this.previousSnapshot.hitSerial) continue;
      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, impact.depth);
      const position = new THREE.Vector3(impact.x * 8.4 + course.x, 1.2 + impact.y * 4.9 + course.y, -impact.depth);
      const heavyCraft = impact.kind === "bomber" || impact.kind === "missile-boat";
      if (impact.destroyed) {
        if (impact.boss) {
          this.presentation.emitBossExplosion(position, impact.missile);
          this.cameraShake = Math.min(1.2, this.cameraShake + .82);
          this.audio.tone(42, .5, .075, "sawtooth");
          this.audio.tone(84, .36, .045, "triangle");
          this.audio.tone(214, .2, .025, "square");
        } else if (heavyCraft) {
          this.presentation.emitHeavyExplosion(position, impact.missile);
          this.cameraShake = Math.min(.82, this.cameraShake + (impact.missile ? .34 : .27));
          this.audio.tone(62, .25, .045, "sawtooth");
          this.audio.tone(176, .13, .02, "triangle");
        } else {
          this.presentation.emitSmallExplosion(position, impact.missile);
          this.cameraShake = Math.min(.54, this.cameraShake + (impact.missile ? .17 : .12));
          this.audio.tone(112, .11, .022, "triangle");
        }
      } else if (impact.missile) {
        const strength = impact.boss ? 1.55 : heavyCraft ? 1.22 : .96;
        this.presentation.emitMissileImpact(position, strength);
        this.cameraShake = Math.min(.48, this.cameraShake + .12 * strength);
        this.audio.tone(126, .07, .018, "triangle");
        this.audio.tone(610, .045, .009, "square");
      } else {
        this.presentation.emitBurst(position, impact.boss ? .62 : heavyCraft ? .52 : .42);
        this.cameraShake = Math.min(.38, this.cameraShake + .055);
      }
    }
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {
'''
assert old in webgl
webgl = webgl.replace(old, new, 1)

# --- Tests: prove hierarchy is pooled, visibly distinct, and retires. ---
marker = '\n\ntest("V8.8 ice cavern exposes its vertical canyon without repeated full-screen hoops", () => {'
assert marker in tests
new_test = r'''

test("V9.8 detonation hierarchy differentiates small, heavy, boss and missile impacts without unbounded meshes", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, .1, 1200);
  camera.position.set(0, 5, 16); camera.lookAt(0, 0, -28); camera.updateMatrixWorld();
  const presentation = new SkyDancerArcadeProductPresentation(scene);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 98 });
  const snapshot = runtime.getSnapshot();
  const position = new THREE.Vector3(0, 1.8, -24);
  const rings = scene.getObjectByName("arcade-pooled-detonation-rings") as THREE.InstancedMesh;
  const flashes = scene.getObjectByName("arcade-pooled-detonation-flashes") as THREE.InstancedMesh;
  assert.ok(rings instanceof THREE.InstancedMesh);
  assert.ok(flashes instanceof THREE.InstancedMesh);
  assert.equal(rings.count, ARCADE_EFFECT_BUDGET.detonationPulses);
  assert.equal(flashes.count, ARCADE_EFFECT_BUDGET.detonationPulses);
  const active = () => Array.from((rings.geometry.getAttribute("lifeAlpha") as THREE.InstancedBufferAttribute).array)
    .filter((value) => Number(value) > .02).length;

  presentation.emitSmallExplosion(position, false);
  presentation.update(snapshot, 1 / 60, camera);
  const small = active();
  assert.ok(small >= 1, "small craft must produce a local shock pulse");

  presentation.setStage();
  presentation.emitHeavyExplosion(position, true);
  for (let i = 0; i < 9; i++) presentation.update(snapshot, 1 / 60, camera);
  const heavy = active();
  assert.ok(heavy > small, `heavy detonation ${heavy} must exceed small ${small}`);

  presentation.setStage();
  presentation.emitBossExplosion(position, true);
  for (let i = 0; i < 12; i++) presentation.update(snapshot, 1 / 60, camera);
  const boss = active();
  assert.ok(boss > heavy, `boss detonation ${boss} must exceed heavy ${heavy}`);

  presentation.setStage();
  presentation.emitMissileImpact(position, 1.2);
  presentation.update(snapshot, 1 / 60, camera);
  assert.ok(active() >= 1, "missile impact must have a dedicated white-hot local pulse");
  for (let i = 0; i < 180; i++) presentation.update(snapshot, 1 / 60, camera);
  assert.equal(active(), 0, "detonation pulses must fully retire rather than accumulate");
  assert.equal(scene.getObjectsByProperty("name", "arcade-pooled-detonation-rings").length, 1);
  assert.equal(scene.getObjectsByProperty("name", "arcade-pooled-detonation-flashes").length, 1);
  presentation.dispose();
  assert.equal(scene.children.length, 0);
});
'''
tests = tests.replace(marker, new_test + marker, 1)

runtime_path.write_text(runtime)
presentation_path.write_text(presentation)
webgl_path.write_text(webgl)
test_path.write_text(tests)
print("Applied Arcade V9.8 detonation hierarchy pass")
