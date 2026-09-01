from pathlib import Path

root = Path(__file__).resolve().parents[1]
presentation_path = root / "src/sky/arcade/SkyDancerArcadeProductPresentation.ts"
webgl_path = root / "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
test_path = root / "tests/sky-arcade-reference.test.ts"

presentation = presentation_path.read_text()
webgl = webgl_path.read_text()
tests = test_path.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)

# --- Product presentation: bounded tumbling airframe debris. ---
presentation = replace_once(
    presentation,
    'export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 240, smoke: 84, missileSmoke: 160, detonationPulses: 24 } as const;',
    'export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 240, smoke: 84, missileSmoke: 160, detonationPulses: 24, debris: 96 } as const;',
    "effect budget",
)

presentation = replace_once(
    presentation,
    '''interface PendingBurst {\n  position: THREE.Vector3;\n  delay: number;\n  size: number;\n}\n''',
    '''interface PendingBurst {\n  position: THREE.Vector3;\n  delay: number;\n  size: number;\n}\n\ninterface DebrisParticle {\n  position: THREE.Vector3;\n  velocity: THREE.Vector3;\n  rotation: THREE.Euler;\n  spin: THREE.Vector3;\n  age: number;\n  duration: number;\n  size: number;\n}\n''',
    "debris particle interface",
)

create_ribbon_anchor = '''function createRibbon(enemy: boolean, playerMissile: boolean): SmokeRibbon {'''
debris_class = r'''/** V9.9: pooled tumbling airframe shards keep a kill physically present after the enemy mesh is retired. */
class DebrisPool {
  readonly mesh: THREE.InstancedMesh<THREE.TetrahedronGeometry, THREE.MeshStandardMaterial>;
  private readonly particles: DebrisParticle[];
  private readonly dummy = new THREE.Object3D();
  private readonly hot = new THREE.Color(0xb84a24);
  private readonly cold = new THREE.Color(0x211b1c);
  private readonly color = new THREE.Color();
  private cursor = 0;
  private serial = 0;

  constructor(count: number) {
    const geometry = new THREE.TetrahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x4b3530, roughness: .48, metalness: .52 });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.name = "arcade-pooled-airframe-debris";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles = Array.from({ length: count }, () => ({
      position: new THREE.Vector3(), velocity: new THREE.Vector3(), rotation: new THREE.Euler(), spin: new THREE.Vector3(),
      age: 1, duration: 0, size: 0,
    }));
    this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  emit(position: THREE.Vector3, scale: number, requestedCount: number, forwardKick = .7): void {
    const count = Math.min(requestedCount, this.particles.length);
    for (let i = 0; i < count; i++) {
      const index = this.cursor++ % this.particles.length;
      const p = this.particles[index];
      const seed = ++this.serial * 13.71;
      p.position.copy(position);
      p.position.x += (noise(seed + 1) - .5) * scale * .7;
      p.position.y += (noise(seed + 2) - .5) * scale * .5;
      const radial = new THREE.Vector3(noise(seed + 3) - .5, noise(seed + 4) - .42, noise(seed + 5) - .5).normalize();
      p.velocity.copy(radial).multiplyScalar((3.5 + noise(seed + 6) * 7.5) * scale);
      p.velocity.z -= (4.5 + noise(seed + 7) * 6.5) * scale * forwardKick;
      p.age = 0;
      p.duration = 1.05 + noise(seed + 8) * 1.35 + scale * .18;
      p.size = (.11 + noise(seed + 9) * .34) * scale;
      p.rotation.set(noise(seed + 10) * Math.PI, noise(seed + 11) * Math.PI, noise(seed + 12) * Math.PI);
      p.spin.set((noise(seed + 13) - .5) * 12, (noise(seed + 14) - .5) * 12, (noise(seed + 15) - .5) * 12);
      this.color.copy(this.cold).lerp(this.hot, .08 + noise(seed + 16) * .42);
      this.mesh.setColorAt(index, this.color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(delta: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += delta;
      const t = p.duration > 0 ? p.age / p.duration : 1;
      if (t >= 1) {
        this.dummy.scale.setScalar(0);
      } else {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.multiplyScalar(Math.exp(-delta * 1.15));
        p.velocity.y -= delta * 4.8;
        p.rotation.x += p.spin.x * delta;
        p.rotation.y += p.spin.y * delta;
        p.rotation.z += p.spin.z * delta;
        this.dummy.position.copy(p.position);
        this.dummy.rotation.copy(p.rotation);
        const lifeScale = p.size * (.92 - t * .36);
        this.dummy.scale.set(lifeScale * 1.8, lifeScale * .58, lifeScale * .82);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    for (const p of this.particles) { p.age = 1; p.duration = 0; }
    this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
    for (let i = 0; i < this.particles.length; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void { this.mesh.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

'''
presentation = replace_once(presentation, create_ribbon_anchor, debris_class + create_ribbon_anchor, "debris pool insert")

presentation = replace_once(
    presentation,
    '  private readonly detonation = new DetonationPulsePool(ARCADE_EFFECT_BUDGET.detonationPulses);\n',
    '  private readonly detonation = new DetonationPulsePool(ARCADE_EFFECT_BUDGET.detonationPulses);\n  private readonly debris = new DebrisPool(ARCADE_EFFECT_BUDGET.debris);\n',
    "debris field",
)

presentation = replace_once(
    presentation,
    '    this.root.add(streaks, this.missileSmoke.mesh, this.smoke.mesh, this.sparks.mesh, this.detonation.flash, this.detonation.ring, this.climaxFlash, this.climaxRing); scene.add(this.root);',
    '    this.root.add(streaks, this.missileSmoke.mesh, this.smoke.mesh, this.sparks.mesh, this.debris.mesh, this.detonation.flash, this.detonation.ring, this.climaxFlash, this.climaxRing); scene.add(this.root);',
    "debris root",
)

presentation = replace_once(
    presentation,
    '    this.clearTrails(); this.missileSmokeLast.clear(); this.missileSmoke.clear(); this.smoke.clear(); this.sparks.clear(); this.detonation.clear();',
    '    this.clearTrails(); this.missileSmokeLast.clear(); this.missileSmoke.clear(); this.smoke.clear(); this.sparks.clear(); this.debris.clear(); this.detonation.clear();',
    "debris stage clear",
)

presentation = replace_once(
    presentation,
    '''  emitMissileImpact(position: THREE.Vector3, strength = 1): void {\n    const power = THREE.MathUtils.clamp(strength, .55, 1.8);\n    this.sparks.emit(position, .48 + power * .28);\n    this.smoke.emit(position, .22 + power * .2);\n    this.detonation.emit(position, .62 + power * .38, 0, .22 + power * .055, .98);\n    this.climaxEnergy = Math.max(this.climaxEnergy, .12 + power * .08);\n  }\n''',
    '''  emitMissileImpact(position: THREE.Vector3, strength = 1): void {\n    const power = THREE.MathUtils.clamp(strength, .55, 1.8);\n    this.sparks.emit(position, .48 + power * .28);\n    this.smoke.emit(position, .22 + power * .2);\n    this.debris.emit(position, .26 + power * .08, 3, 1.35);\n    this.detonation.emit(position, .62 + power * .38, 0, .22 + power * .055, .98);\n    this.climaxEnergy = Math.max(this.climaxEnergy, .12 + power * .08);\n  }\n''',
    "missile armor chips",
)

presentation = replace_once(
    presentation,
    '''  emitSmallExplosion(position: THREE.Vector3, missileKill = false): void {\n    this.emitBurst(position, missileKill ? .82 : .7);\n    this.detonation.emit(position, missileKill ? 1.22 : 1.02, 0, .32, missileKill ? .96 : .68);''',
    '''  emitSmallExplosion(position: THREE.Vector3, missileKill = false): void {\n    this.emitBurst(position, missileKill ? .82 : .7);\n    this.debris.emit(position, missileKill ? .88 : .72, missileKill ? 13 : 9, missileKill ? 1.35 : .78);\n    this.detonation.emit(position, missileKill ? 1.22 : 1.02, 0, .32, missileKill ? .96 : .68);''',
    "small debris",
)

presentation = replace_once(
    presentation,
    '''  emitHeavyExplosion(position: THREE.Vector3, missileKill = false): void {\n    this.emitBurst(position, missileKill ? 1.24 : 1.08);\n    this.detonation.emit(position, missileKill ? 1.9 : 1.62, 0, .42, missileKill ? .98 : .78);''',
    '''  emitHeavyExplosion(position: THREE.Vector3, missileKill = false): void {\n    this.emitBurst(position, missileKill ? 1.24 : 1.08);\n    this.debris.emit(position, missileKill ? 1.28 : 1.12, missileKill ? 22 : 18, missileKill ? 1.42 : .9);\n    this.detonation.emit(position, missileKill ? 1.9 : 1.62, 0, .42, missileKill ? .98 : .78);''',
    "heavy debris",
)

presentation = replace_once(
    presentation,
    '''  emitBossExplosion(position: THREE.Vector3, missileKill = false): void {\n    this.emitBurst(position, missileKill ? 2.35 : 2.12);\n    this.detonation.emit(position, missileKill ? 3.45 : 3.08, 0, .58, .98);''',
    '''  emitBossExplosion(position: THREE.Vector3, missileKill = false): void {\n    this.emitBurst(position, missileKill ? 2.35 : 2.12);\n    this.debris.emit(position, missileKill ? 1.92 : 1.72, missileKill ? 38 : 32, missileKill ? 1.5 : 1.02);\n    this.detonation.emit(position, missileKill ? 3.45 : 3.08, 0, .58, .98);''',
    "boss debris",
)

presentation = replace_once(
    presentation,
    '''    this.updatePendingBursts(delta);\n    this.detonation.update(delta, camera);\n    this.updateClimax(delta, camera);''',
    '''    this.updatePendingBursts(delta);\n    this.detonation.update(delta, camera);\n    this.debris.update(delta);\n    this.updateClimax(delta, camera);''',
    "debris update",
)

presentation = replace_once(
    presentation,
    '    this.missileSmoke.dispose(); this.smoke.dispose(); this.sparks.dispose(); this.detonation.dispose(); this.climaxMaterial.dispose();',
    '    this.missileSmoke.dispose(); this.smoke.dispose(); this.sparks.dispose(); this.debris.dispose(); this.detonation.dispose(); this.climaxMaterial.dispose();',
    "debris dispose",
)

# --- WebGL: recoil envelopes for enemies, player hit kick, and camera punch. ---
webgl = replace_once(
    webgl,
    'import { SkyDancerArcadeRuntime, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";',
    'import { SkyDancerArcadeRuntime, type SkyDancerArcadeImpactSnapshot, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";',
    "impact type import",
)

webgl = replace_once(
    webgl,
    'type SnapshotHandler = (snapshot: SkyDancerArcadeSnapshot) => void;\n',
    '''type SnapshotHandler = (snapshot: SkyDancerArcadeSnapshot) => void;\n\ninterface EnemyHitReaction {\n  x: number;\n  y: number;\n  z: number;\n  pitch: number;\n  roll: number;\n  flash: number;\n  missile: boolean;\n}\n''',
    "reaction interface",
)

webgl = replace_once(
    webgl,
    '  private cameraShake = 0;\n',
    '''  private cameraShake = 0;\n  private cameraImpactKick = 0;\n  private playerDamageKick = 0;\n  private playerDamageSign = 1;\n  private readonly enemyHitReactions = new Map<number, EnemyHitReaction>();\n''',
    "combat reaction fields",
)

webgl = replace_once(
    webgl,
    '''    const targetX = snapshot.playerX * 7.8;\n    const targetY = 1.1 + snapshot.playerY * 4.25;\n    this.player.position.x += (targetX - this.player.position.x) * Math.min(1, delta * 12);\n    this.player.position.y += (targetY - this.player.position.y) * Math.min(1, delta * 12);\n    this.player.position.z = 2.8;''',
    '''    this.playerDamageKick *= Math.exp(-delta * 7.4);\n    const targetX = snapshot.playerX * 7.8 + this.playerDamageSign * this.playerDamageKick * .42;\n    const targetY = 1.1 + snapshot.playerY * 4.25 + this.playerDamageKick * .16;\n    this.player.position.x += (targetX - this.player.position.x) * Math.min(1, delta * 12);\n    this.player.position.y += (targetY - this.player.position.y) * Math.min(1, delta * 12);\n    this.player.position.z = 2.8 + this.playerDamageKick * .32;''',
    "player positional hit kick",
)

webgl = replace_once(
    webgl,
    '''    const targetRoll = THREE.MathUtils.clamp(-vx * .3, -.48, .48) - snapshot.playerX * .06 + course.bank * .82;\n    const targetPitch = THREE.MathUtils.clamp(vy * .08, -.12, .12) + course.pitch * .46;''',
    '''    const targetRoll = THREE.MathUtils.clamp(-vx * .3, -.48, .48) - snapshot.playerX * .06 + course.bank * .82 + this.playerDamageSign * this.playerDamageKick * .22;\n    const targetPitch = THREE.MathUtils.clamp(vy * .08, -.12, .12) + course.pitch * .46 + this.playerDamageKick * .12;''',
    "player rotational hit kick",
)

webgl = replace_once(
    webgl,
    '''      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, enemy.depth);\n      const targetX = enemy.x * 8.4 + course.x;\n      const targetY = 1.2 + enemy.y * 4.9 + course.y;\n      const targetZ = -enemy.depth;''',
    '''      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, enemy.depth);\n      const reaction = this.enemyHitReactions.get(enemy.id);\n      if (reaction) {\n        const damping = Math.exp(-delta * (reaction.missile ? 5.1 : 8.6));\n        reaction.x *= damping; reaction.y *= damping; reaction.z *= damping;\n        reaction.pitch *= damping; reaction.roll *= damping; reaction.flash = Math.max(0, reaction.flash - delta * 5.6);\n        if (Math.abs(reaction.x) + Math.abs(reaction.y) + Math.abs(reaction.z) + Math.abs(reaction.roll) + reaction.flash < .018) this.enemyHitReactions.delete(enemy.id);\n      }\n      const targetX = enemy.x * 8.4 + course.x + (reaction?.x ?? 0);\n      const targetY = 1.2 + enemy.y * 4.9 + course.y + (reaction?.y ?? 0);\n      const targetZ = -enemy.depth + (reaction?.z ?? 0);''',
    "enemy positional recoil",
)

webgl = replace_once(
    webgl,
    '''      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .035, -.2, .2);\n      const maneuverBank = THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);\n      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.8) * (enemy.boss ? .025 : .08);''',
    '''      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .035, -.2, .2) + (reaction?.pitch ?? 0);\n      const maneuverBank = THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);\n      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.8) * (enemy.boss ? .025 : .08) + (reaction?.roll ?? 0);''',
    "enemy rotational recoil",
)

webgl = replace_once(
    webgl,
    '''        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.035 : 1;\n        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp);''',
    '''        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.035 : 1;\n        const impactPulse = 1 + (reaction?.flash ?? 0) * .055;\n        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp * impactPulse);''',
    "normal hit pulse",
)

webgl = replace_once(
    webgl,
    '''        const baseScale = typeof group.userData.arcadeBaseScale === "number" ? group.userData.arcadeBaseScale : 1;\n        group.scale.setScalar(baseScale);''',
    '''        const baseScale = typeof group.userData.arcadeBaseScale === "number" ? group.userData.arcadeBaseScale : 1;\n        group.scale.setScalar(baseScale * (1 + (reaction?.flash ?? 0) * .035));''',
    "boss hit pulse",
)

webgl = replace_once(
    webgl,
    '''      this.enemyGroups.delete(id);\n      this.entityRoot.remove(group);\n      this.disposeObject(group);''',
    '''      this.enemyGroups.delete(id);\n      this.enemyHitReactions.delete(id);\n      this.entityRoot.remove(group);\n      this.disposeObject(group);''',
    "reaction cleanup",
)

sync_effects_anchor = '''  private syncEffects(snapshot: SkyDancerArcadeSnapshot): void {\n'''
reaction_method = '''  private applyEnemyHitReaction(impact: SkyDancerArcadeImpactSnapshot, snapshot: SkyDancerArcadeSnapshot, heavyCraft: boolean): void {\n    if (impact.destroyed) return;\n    const current = this.enemyHitReactions.get(impact.enemyId);\n    const sideDelta = impact.x - snapshot.playerX;\n    const verticalDelta = impact.y - snapshot.playerY;\n    const side = Math.abs(sideDelta) > .04 ? Math.sign(sideDelta) : (impact.serial % 2 === 0 ? 1 : -1);\n    const vertical = Math.abs(verticalDelta) > .04 ? Math.sign(verticalDelta) : (impact.serial % 3 === 0 ? -1 : 1);\n    const mass = impact.boss ? .46 : heavyCraft ? .7 : 1;\n    const missilePower = impact.missile ? 1 : .28;\n    const impulse = {\n      x: side * .28 * missilePower * mass,\n      y: vertical * .17 * missilePower * mass,\n      z: -(impact.missile ? 1.32 : .3) * mass,\n      pitch: vertical * (impact.missile ? .16 : .045) * mass,\n      roll: -side * (impact.missile ? .34 : .1) * mass,\n      flash: impact.missile ? 1 : .72,\n      missile: impact.missile,\n    };\n    if (current) {\n      current.x = THREE.MathUtils.clamp(current.x + impulse.x, -.62, .62);\n      current.y = THREE.MathUtils.clamp(current.y + impulse.y, -.42, .42);\n      current.z = THREE.MathUtils.clamp(current.z + impulse.z, -1.7, .1);\n      current.pitch = THREE.MathUtils.clamp(current.pitch + impulse.pitch, -.3, .3);\n      current.roll = THREE.MathUtils.clamp(current.roll + impulse.roll, -.58, .58);\n      current.flash = Math.max(current.flash, impulse.flash);\n      current.missile = current.missile || impact.missile;\n    } else this.enemyHitReactions.set(impact.enemyId, impulse);\n  }\n\n'''
webgl = replace_once(webgl, sync_effects_anchor, reaction_method + sync_effects_anchor, "reaction method")

webgl = replace_once(
    webgl,
    '''      const heavyCraft = impact.kind === "bomber" || impact.kind === "missile-boat";\n      if (impact.destroyed) {''',
    '''      const heavyCraft = impact.kind === "bomber" || impact.kind === "missile-boat";\n      this.applyEnemyHitReaction(impact, snapshot, heavyCraft);\n      if (impact.destroyed) {''',
    "reaction dispatch",
)

webgl = replace_once(
    webgl,
    '''          this.presentation.emitBossExplosion(position, impact.missile);\n          this.cameraShake = Math.min(1.2, this.cameraShake + .82);''',
    '''          this.presentation.emitBossExplosion(position, impact.missile);\n          this.cameraImpactKick = Math.max(this.cameraImpactKick, .62);\n          this.cameraShake = Math.min(1.2, this.cameraShake + .82);''',
    "boss camera punch",
)

webgl = replace_once(
    webgl,
    '''          this.presentation.emitHeavyExplosion(position, impact.missile);\n          this.cameraShake = Math.min(.82, this.cameraShake + (impact.missile ? .34 : .27));''',
    '''          this.presentation.emitHeavyExplosion(position, impact.missile);\n          this.cameraImpactKick = Math.max(this.cameraImpactKick, impact.missile ? .4 : .28);\n          this.cameraShake = Math.min(.82, this.cameraShake + (impact.missile ? .34 : .27));''',
    "heavy camera punch",
)

webgl = replace_once(
    webgl,
    '''          this.presentation.emitSmallExplosion(position, impact.missile);\n          this.cameraShake = Math.min(.54, this.cameraShake + (impact.missile ? .17 : .12));''',
    '''          this.presentation.emitSmallExplosion(position, impact.missile);\n          this.cameraImpactKick = Math.max(this.cameraImpactKick, impact.missile ? .25 : .14);\n          this.cameraShake = Math.min(.54, this.cameraShake + (impact.missile ? .17 : .12));''',
    "small camera punch",
)

webgl = replace_once(
    webgl,
    '''        this.presentation.emitMissileImpact(position, strength);\n        this.cameraShake = Math.min(.48, this.cameraShake + .12 * strength);''',
    '''        this.presentation.emitMissileImpact(position, strength);\n        this.cameraImpactKick = Math.max(this.cameraImpactKick, .16 * strength);\n        this.cameraShake = Math.min(.48, this.cameraShake + .15 * strength);''',
    "missile camera punch",
)

webgl = replace_once(
    webgl,
    '''    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {\n      this.cameraShake = Math.min(.8, this.cameraShake + .4);\n      this.presentation.emitBurst(this.player.position, .45);\n    }''',
    '''    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {\n      this.playerDamageKick = 1;\n      this.playerDamageSign = snapshot.damageSerial % 2 === 0 ? 1 : -1;\n      this.cameraImpactKick = Math.max(this.cameraImpactKick, .3);\n      this.cameraShake = Math.min(.8, this.cameraShake + .4);\n      this.presentation.emitBurst(this.player.position, .45);\n    }''',
    "player hit reaction trigger",
)

webgl = replace_once(
    webgl,
    '''  private updateCamera(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);''',
    '''  private updateCamera(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);\n    this.cameraImpactKick = Math.max(0, this.cameraImpactKick - delta * 3.8);''',
    "camera kick decay",
)

webgl = replace_once(
    webgl,
    '    this.camera.position.z += (pose.z + this.presentationFx.pullback - this.camera.position.z) * Math.min(1, delta * 4.5);',
    '    this.camera.position.z += (pose.z + this.presentationFx.pullback + this.cameraImpactKick - this.camera.position.z) * Math.min(1, delta * 6.2);',
    "camera pushback",
)

# --- Regression contracts. ---
reference_anchor = '''test("V9.8 detonation hierarchy differentiates small, heavy, boss and missile impacts without unbounded meshes", () => {'''
if reference_anchor not in tests:
    raise SystemExit("missing V9.8 test anchor")

v99_test = r'''

test("V9.9 combat feel keeps tumbling kill debris bounded and fully retires it", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, .1, 1200);
  camera.position.set(0, 5, 16); camera.lookAt(0, 0, -28); camera.updateMatrixWorld();
  const presentation = new SkyDancerArcadeProductPresentation(scene);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 99 });
  const snapshot = runtime.getSnapshot();
  const debris = scene.getObjectByName("arcade-pooled-airframe-debris") as THREE.InstancedMesh;
  assert.ok(debris instanceof THREE.InstancedMesh);
  assert.equal(debris.count, ARCADE_EFFECT_BUDGET.debris);
  const matrix = new THREE.Matrix4();
  const activeDebris = () => {
    let active = 0;
    for (let i = 0; i < debris.count; i++) {
      debris.getMatrixAt(i, matrix);
      if (Math.abs(matrix.determinant()) > 1e-8) active++;
    }
    return active;
  };

  presentation.emitSmallExplosion(new THREE.Vector3(0, 2, -24), false);
  presentation.update(snapshot, 1 / 60, camera);
  const small = activeDebris();
  assert.ok(small >= 8, `small kill debris should be visible, got ${small}`);

  presentation.setStage();
  presentation.emitHeavyExplosion(new THREE.Vector3(0, 2, -24), true);
  presentation.update(snapshot, 1 / 60, camera);
  const heavy = activeDebris();
  assert.ok(heavy > small, `heavy kill debris ${heavy} should exceed small ${small}`);

  presentation.setStage();
  presentation.emitBossExplosion(new THREE.Vector3(0, 2, -24), true);
  presentation.update(snapshot, 1 / 60, camera);
  const boss = activeDebris();
  assert.ok(boss > heavy, `boss kill debris ${boss} should exceed heavy ${heavy}`);

  for (let i = 0; i < 260; i++) presentation.update(snapshot, 1 / 60, camera);
  assert.equal(activeDebris(), 0, "airframe debris must fully retire instead of accumulating");
  assert.equal(scene.getObjectsByProperty("name", "arcade-pooled-airframe-debris").length, 1);
  presentation.dispose();
});

test("V9.9 WebGL combat feedback gives missiles stronger target recoil plus player and camera hit kick", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"));
  assert.match(source, /enemyHitReactions/);
  assert.match(source, /impact\.missile \? 1\.32 : \.3/);
  assert.match(source, /reaction\.roll/);
  assert.match(source, /playerDamageKick = 1/);
  assert.match(source, /cameraImpactKick/);
});
'''

tests = tests.rstrip() + v99_test + "\n"

presentation_path.write_text(presentation)
webgl_path.write_text(webgl)
test_path.write_text(tests)
print("Applied Arcade V9.9 combat feel pass")
