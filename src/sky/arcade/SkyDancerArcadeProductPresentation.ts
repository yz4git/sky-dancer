import * as THREE from "three";
import type { SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import { arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";
import type { SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";

export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 240, smoke: 84, missileSmoke: 160 } as const;
const SPEED_STREAK_COUNT = 52;
const RETIRE_SECONDS = .32;
const fract = (n: number) => n - Math.floor(n);
const noise = (n: number) => fract(Math.sin(n * 78.233 + 17.1) * 43758.5453);

interface SmokeRibbon {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  points: Float32Array;
  positions: Float32Array;
  count: number;
  width: number;
  playerMissile: boolean;
  retireSeconds: number;
  retiredAge: number | null;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  duration: number;
  size: number;
  rotation: number;
}

/** Preallocated quads; explosions never allocate a new mesh, material or buffer. */
class BurstPool {
  readonly mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly particles: Particle[];
  private readonly alpha: THREE.InstancedBufferAttribute;
  private readonly dummy = new THREE.Object3D();
  private cursor = 0;
  private serial = 0;

  constructor(count: number, private readonly smoke: boolean) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    geometry.setAttribute("lifeAlpha", this.alpha);
    const material = new THREE.ShaderMaterial({
      uniforms: { smoke: { value: smoke ? 1 : 0 } },
      vertexShader: `attribute float lifeAlpha;varying vec2 vUv;varying float vAlpha;
        void main(){vUv=uv;vAlpha=lifeAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float smoke;varying vec2 vUv;varying float vAlpha;
        void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float a=pow(max(0.0,1.0-r),smoke>.5?1.6:2.4);
          vec3 color=smoke>.5?mix(vec3(.16,.20,.24),vec3(.77,.62,.43),vUv.y):mix(vec3(5.2,.48,.025),vec3(7.4,4.7,1.55),a);
          gl_FragColor=vec4(color,a*vAlpha);}`,
      transparent: true, depthWrite: false,
      blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.name = smoke ? "arcade-pooled-explosion-smoke" : "arcade-pooled-hot-sparks";
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles = Array.from({ length: count }, () => ({
      position: new THREE.Vector3(), velocity: new THREE.Vector3(), age: 1, duration: 0, size: 0, rotation: 0,
    }));
    this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  emit(position: THREE.Vector3, scale: number): void {
    const count = this.smoke ? 6 : 36;
    for (let i = 0; i < count; i++) {
      const index = this.cursor++ % this.particles.length;
      const particle = this.particles[index];
      const seed = ++this.serial * 11.7;
      particle.position.copy(position);
      particle.velocity.set(noise(seed) - .5, noise(seed + 1) - .3, noise(seed + 2) - .5)
        .normalize().multiplyScalar((this.smoke ? 2 : 7 + noise(seed + 3) * 10) * scale);
      particle.age = 0;
      particle.duration = this.smoke ? .7 + noise(seed + 4) * .65 : .28 + noise(seed + 4) * .62;
      particle.size = (this.smoke ? 1.15 + noise(seed + 5) * 1.9 : .28 + noise(seed + 5) * .72) * scale;
      particle.rotation = noise(seed + 6) * Math.PI * 2;
    }
  }

  update(delta: number, camera: THREE.Camera): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += delta;
      const t = p.duration > 0 ? p.age / p.duration : 1;
      if (t >= 1) {
        this.alpha.setX(i, 0); this.dummy.scale.setScalar(0);
      } else {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.multiplyScalar(Math.exp(-delta * (this.smoke ? 1.6 : 2.3)));
        p.velocity.y += (this.smoke ? 2 : -.8) * delta;
        p.position.z += delta * 5;
        this.dummy.position.copy(p.position);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.rotateZ(p.rotation);
        const size = p.size * (this.smoke ? .75 + t * 2.7 : 1 - t * .5);
        this.dummy.scale.set(size * (this.smoke ? 1.2 : .38), size, 1);
        this.alpha.setX(i, (1 - t) * (this.smoke ? .46 : 1));
      }
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.alpha.needsUpdate = true;
  }

  clear(): void { for (const p of this.particles) p.age = p.duration; }
  dispose(): void { this.mesh.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

class MissileSmokePool {
  readonly mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly particles: Particle[];
  private readonly alpha: THREE.InstancedBufferAttribute;
  private readonly dummy = new THREE.Object3D();
  private cursor = 0;
  private serial = 0;

  constructor(count: number) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    geometry.setAttribute("lifeAlpha", this.alpha);
    const material = new THREE.ShaderMaterial({
      vertexShader: `attribute float lifeAlpha;varying vec2 vUv;varying float vAlpha;
        void main(){vUv=uv;vAlpha=lifeAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec2 vUv;varying float vAlpha;
        void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float core=1.0-smoothstep(.08,1.0,r);
          float cloud=pow(max(0.0,core),1.12);vec3 whiteSmoke=mix(vec3(.82,.86,.91),vec3(1.48,1.5,1.52),cloud);
          gl_FragColor=vec4(whiteSmoke,cloud*vAlpha*.96);}`,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.NormalBlending, toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.name = "arcade-pooled-missile-white-smoke";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles = Array.from({ length: count }, () => ({
      position: new THREE.Vector3(), velocity: new THREE.Vector3(), age: 1, duration: 0, size: 0, rotation: 0,
    }));
    this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  emit(position: THREE.Vector3, scale = 1): void {
    // Two overlapping puffs make the exhaust read as dense white missile smoke even on a phone-sized viewport.
    for (let plume = 0; plume < 2; plume++) {
      const index = this.cursor++ % this.particles.length;
      const particle = this.particles[index];
      const seed = ++this.serial * 9.37;
      particle.position.copy(position);
      particle.position.x += (noise(seed + 6) - .5) * .3 * scale;
      particle.position.y += (noise(seed + 7) - .5) * .22 * scale;
      particle.velocity.set((noise(seed) - .5) * .82, .34 + noise(seed + 1) * .76, (noise(seed + 2) - .5) * .5);
      particle.age = 0;
      particle.duration = .86 + noise(seed + 3) * .52;
      particle.size = (1.12 + noise(seed + 4) * .82) * scale;
      particle.rotation = noise(seed + 5) * Math.PI * 2;
    }
  }

  update(delta: number, camera: THREE.Camera): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += delta;
      const t = p.duration > 0 ? p.age / p.duration : 1;
      if (t >= 1) {
        this.alpha.setX(i, 0); this.dummy.scale.setScalar(0);
      } else {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.multiplyScalar(Math.exp(-delta * 2.1));
        p.position.z += delta * 6.2;
        this.dummy.position.copy(p.position);
        this.dummy.quaternion.copy(camera.quaternion);
        this.dummy.rotateZ(p.rotation + t * .45);
        const size = p.size * (.92 + t * 2.2);
        this.dummy.scale.set(size * (1.12 + t * .32), size, 1);
        this.alpha.setX(i, Math.pow(1 - t, .82));
      }
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.alpha.needsUpdate = true;
  }

  clear(): void { for (const p of this.particles) p.age = p.duration; }
  dispose(): void { this.mesh.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

function createRibbon(enemy: boolean, playerMissile: boolean): SmokeRibbon {
  const samples = ARCADE_EFFECT_BUDGET.trailSamples;
  const positions = new Float32Array(samples * 2 * 3);
  const uv = new Float32Array(samples * 2 * 2);
  const indices: number[] = [];
  for (let i = 0; i < samples; i++) {
    uv.set([0, i / (samples - 1), 1, i / (samples - 1)], i * 4);
    if (i < samples - 1) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: new THREE.Color(enemy ? 0xff7a2e : playerMissile ? 0xf7fbff : 0xc8f7ff) },
      opacity: { value: enemy ? .62 : playerMissile ? 1 : .76 },
      smokeBody: { value: playerMissile ? 1 : 0 },
    },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `varying vec2 vUv;uniform vec3 tint;uniform float opacity;uniform float smokeBody;
      void main(){float side=abs(vUv.x*2.0-1.0);float edge=pow(max(0.0,1.0-side),smokeBody>.5?.72:1.35);
      float tail=pow(clamp(vUv.y,0.0,1.0),smokeBody>.5?.82:2.25);
      float breakup=smokeBody>.5?(.84+.16*sin(vUv.y*51.0+side*9.0)):1.0;
      gl_FragColor=vec4(tint*(smokeBody>.5?1.12:.72+.38*edge),edge*tail*opacity*breakup);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: playerMissile ? THREE.NormalBlending : THREE.NormalBlending, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "arcade-projectile-trail"; mesh.frustumCulled = false;
  if (playerMissile) mesh.renderOrder = 5;
  return {
    mesh, points: new Float32Array(samples * 3), positions, count: 0,
    width: enemy ? .19 : playerMissile ? .72 : .22, playerMissile,
    retireSeconds: playerMissile ? .76 : RETIRE_SECONDS, retiredAge: null,
  };
}
/** Actual missile history, camera-facing smoke and pooled bursts. No changes to hit authority. */
export class SkyDancerArcadeProductPresentation {
  private readonly root = new THREE.Group();
  private readonly speedGeometry = new THREE.BufferGeometry();
  private readonly speedMaterial = new THREE.LineBasicMaterial({
    color: 0xd7f6ff, transparent: true, opacity: .065, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  private readonly speedPositions = new Float32Array(SPEED_STREAK_COUNT * 6);
  private readonly speedSeeds = new Float32Array(SPEED_STREAK_COUNT * 3);
  private readonly trails = new Map<number, SmokeRibbon>();
  private readonly retiredTrails: SmokeRibbon[] = [];
  private readonly sparks = new BurstPool(ARCADE_EFFECT_BUDGET.sparks, false);
  private readonly smoke = new BurstPool(ARCADE_EFFECT_BUDGET.smoke, true);
  private readonly missileSmoke = new MissileSmokePool(ARCADE_EFFECT_BUDGET.missileSmoke);
  private readonly missileSmokeLast = new Map<number, THREE.Vector3>();
  private readonly missilePoint = new THREE.Vector3();
  private readonly missileMidpoint = new THREE.Vector3();
  private readonly activeIds = new Set<number>();
  private readonly right = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly climaxMaterial = new THREE.SpriteMaterial({ color: 0xffe4b0, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly climaxFlash = new THREE.Sprite(this.climaxMaterial);
  private readonly climaxRingMaterial = new THREE.MeshBasicMaterial({ color: 0xffefc8, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly climaxRing = new THREE.Mesh(new THREE.RingGeometry(.58, .72, 48), this.climaxRingMaterial);
  private climaxEnergy = 0;
  private climaxPulse = 0;
  private rushAccent = 0;
  private bossArrival = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = "arcade-product-presentation";
    for (let i = 0; i < SPEED_STREAK_COUNT; i++) {
      const angle = i * 2.399963;
      const radius = 8 + (i * 37 % 31) * .46;
      this.speedSeeds.set([Math.cos(angle) * radius, 2.2 + Math.sin(angle) * radius * .65, -18 - (i * 53 % 137)], i * 3);
    }
    this.speedGeometry.setAttribute("position", new THREE.BufferAttribute(this.speedPositions, 3));
    const streaks = new THREE.LineSegments(this.speedGeometry, this.speedMaterial);
    streaks.name = "arcade-product-speed-streaks"; streaks.frustumCulled = false;
    this.climaxFlash.name = "arcade-climax-flash-v5";
    this.climaxFlash.visible = false;
    this.climaxFlash.renderOrder = 999;
    this.climaxRing.name = "arcade-climax-shock-ring-v51";
    this.climaxRing.visible = false;
    this.climaxRing.renderOrder = 998;
    this.root.add(streaks, this.missileSmoke.mesh, this.smoke.mesh, this.sparks.mesh, this.climaxFlash, this.climaxRing); scene.add(this.root);
  }

  setStage(): void {
    this.clearTrails(); this.missileSmokeLast.clear(); this.missileSmoke.clear(); this.smoke.clear(); this.sparks.clear();
    this.climaxEnergy = 0; this.climaxPulse = 0; this.rushAccent = 0; this.bossArrival = 0;
    this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0;
    this.climaxRing.visible = false; this.climaxRingMaterial.opacity = 0;
  }

  emitBurst(position: THREE.Vector3, size: number): void {
    this.smoke.emit(position, size); this.sparks.emit(position, size);
  }

  emitRushAccent(): void { this.rushAccent = 1; }

  emitBossArrival(): void { this.bossArrival = 1; this.climaxEnergy = Math.max(this.climaxEnergy, .34); this.climaxPulse = Math.max(this.climaxPulse, .58); }

  emitClimax(position: THREE.Vector3, strength: number): void {
    const power = Math.max(.35, strength);
    this.emitBurst(position, 1 + power * 1.35);
    for (let i = 0; i < (power > 1 ? 4 : 2); i++) {
      const angle = i * 2.399963 + power;
      const offset = new THREE.Vector3(Math.cos(angle) * (1.4 + power * 1.7), Math.sin(angle) * (1 + power), (i - 1.5) * 1.15);
      this.emitBurst(position.clone().add(offset), .65 + power * .72);
    }
    this.climaxEnergy = Math.max(this.climaxEnergy, Math.max(.68, power * .82));
    this.climaxPulse = 1;
  }

  update(snapshot: SkyDancerArcadeSnapshot, delta: number, camera: THREE.Camera, fx?: SkyDancerArcadePresentationFrame): void {
    this.rushAccent = Math.max(0, this.rushAccent - delta * 4.2);
    this.bossArrival = Math.max(0, this.bossArrival - delta * 1.55);
    this.updateSpeedStreaks(snapshot, delta, fx);
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.updateProjectileTrails(snapshot, delta);
    this.updateClimax(delta, camera);
    this.missileSmoke.update(delta, camera);
    this.smoke.update(delta, camera); this.sparks.update(delta, camera);
  }

  private updateSpeedStreaks(snapshot: SkyDancerArcadeSnapshot, delta: number, fx?: SkyDancerArcadePresentationFrame): void {
    const impactBoost = Math.min(1, this.climaxEnergy);
    const rush = Math.min(1.35, (fx?.rush ?? 0) + this.rushAccent * .58 + this.bossArrival * .18);
    const speed = (snapshot.turboActive ? 205 : 78) + impactBoost * 82 + rush * 68;
    for (let i = 0; i < SPEED_STREAK_COUNT; i++) {
      const k = i * 3, j = i * 6;
      let z = this.speedSeeds[k + 2] + speed * delta;
      if (z > 14) z = -158 - (i % 17) * 2.2;
      this.speedSeeds[k + 2] = z;
      const x = this.speedSeeds[k] - snapshot.playerX * 2.5;
      const y = this.speedSeeds[k + 1] - snapshot.playerY * .9;
      const length = (snapshot.turboActive ? 13 : 4.2) + rush * 7.2 + this.bossArrival * 2.1;
      this.speedPositions.set([x, y, z, x, y, z - length], j);
    }
    this.speedGeometry.getAttribute("position").needsUpdate = true;
    const targetOpacity = Math.min(.76, (snapshot.turboActive ? .52 : .075) + impactBoost * .24 + rush * .16 + this.bossArrival * .09);
    this.speedMaterial.opacity += (targetOpacity - this.speedMaterial.opacity) * Math.min(1, delta * 8);
  }

  private updateClimax(delta: number, camera: THREE.Camera): void {
    if (this.climaxEnergy <= .001 && this.climaxPulse <= .001) {
      this.climaxEnergy = 0; this.climaxPulse = 0;
      this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0;
      this.climaxRing.visible = false; this.climaxRingMaterial.opacity = 0;
      return;
    }
    this.climaxEnergy = Math.max(0, this.climaxEnergy - delta * (this.climaxEnergy > 1 ? 4.4 : 3.6));
    this.climaxPulse = Math.max(0, this.climaxPulse - delta * 2.65);
    camera.getWorldDirection(this.forward);
    this.climaxFlash.position.copy(camera.position).addScaledVector(this.forward, 2.35);
    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.7;
    this.climaxFlash.scale.set(10.5 * aspect, 10.5, 1);
    this.climaxMaterial.opacity = Math.min(.2, .018 + this.climaxEnergy * .15);
    this.climaxFlash.visible = this.climaxEnergy > .001;
    this.climaxRing.position.copy(camera.position).addScaledVector(this.forward, 3.8);
    this.climaxRing.quaternion.copy(camera.quaternion);
    this.climaxRing.scale.setScalar(.62 + (1 - this.climaxPulse) * 1.2);
    this.climaxRingMaterial.opacity = Math.min(.24, this.climaxPulse * .27);
    this.climaxRing.visible = this.climaxPulse > .001;
  }

  private updateProjectileTrails(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.activeIds.clear();
    const playerMissileCount = snapshot.projectiles.reduce((count, projectile) => count + (projectile.owner === "player-missile" ? 1 : 0), 0);
    // V9.7.1: preserve a bold single-missile plume while preventing 4-8 missile salvos from becoming a white screen wipe.
    const salvoSmokeScale = THREE.MathUtils.clamp(1 / Math.sqrt(Math.max(1, playerMissileCount) * .55), .58, 1);
    for (const p of snapshot.projectiles) {
      if (p.owner === "player-gun") continue;
      this.activeIds.add(p.id);
      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, p.depth);
      const x = p.x * 8.4 + course.x, y = 1.2 + p.y * 4.9 + course.y, z = -p.depth;

      // V9.6: a real missile silhouette needs a persistent white exhaust mass, not only a neon line.
      if (p.owner === "player-missile") {
        this.missilePoint.set(x, y, z);
        let anchor = this.missileSmokeLast.get(p.id);
        if (!anchor) {
          anchor = this.missilePoint.clone();
          this.missileSmokeLast.set(p.id, anchor);
          this.missileSmoke.emit(this.missilePoint, 1.52 * salvoSmokeScale);
        } else {
          const movedSq = anchor.distanceToSquared(this.missilePoint);
          if (movedSq > .1) {
            if (movedSq > .64) {
              this.missileMidpoint.copy(anchor).lerp(this.missilePoint, .5);
              this.missileSmoke.emit(this.missileMidpoint, 1.15 * salvoSmokeScale);
            }
            this.missileSmoke.emit(this.missilePoint, 1.24 * salvoSmokeScale);
            anchor.copy(this.missilePoint);
          }
        }
      }

      let trail = this.trails.get(p.id);
      if (!trail && this.trails.size + this.retiredTrails.length < ARCADE_EFFECT_BUDGET.trails) {
        trail = createRibbon(p.owner === "enemy", p.owner === "player-missile"); this.trails.set(p.id, trail); this.root.add(trail.mesh);
      }
      if (!trail) continue;
      const last = Math.max(0, trail.count - 1) * 3;
      const moved = Math.hypot(x - trail.points[last], y - trail.points[last + 1], z - trail.points[last + 2]);
      if (trail.count === 0 || moved > .12) {
        if (trail.count === ARCADE_EFFECT_BUDGET.trailSamples) trail.points.copyWithin(0, 3);
        else trail.count++;
        trail.points.set([x, y, z], (trail.count - 1) * 3);
      }
      this.updateRibbon(trail);
    }
    for (const id of this.missileSmokeLast.keys()) if (!this.activeIds.has(id)) this.missileSmokeLast.delete(id);
    for (const [id, trail] of this.trails) if (!this.activeIds.has(id)) {
      this.trails.delete(id); trail.retiredAge = 0; this.retiredTrails.push(trail);
    }
    for (let i = this.retiredTrails.length - 1; i >= 0; i--) {
      const trail = this.retiredTrails[i];
      trail.retiredAge = (trail.retiredAge ?? 0) + delta;
      if (trail.retiredAge >= trail.retireSeconds) {
        this.disposeTrail(trail); this.retiredTrails.splice(i, 1); continue;
      }
      const baseOpacity = trail.playerMissile ? .88 : .48;
      trail.mesh.material.uniforms.opacity.value = baseOpacity * (1 - trail.retiredAge / trail.retireSeconds);
      for (let j = 0; j < trail.count; j++) trail.points[j * 3 + 2] += delta * (trail.playerMissile ? 7 : 4);
      this.updateRibbon(trail);
    }
  }

  private updateRibbon(trail: SmokeRibbon): void {
    for (let i = 0; i < trail.count; i++) {
      const t = i / Math.max(1, trail.count - 1);
      const width = trail.width * (.25 + (1 - t) * 1.6);
      const k = i * 3, p = i * 6;
      for (let axis = 0; axis < 3; axis++) {
        const offset = this.right.getComponent(axis) * width;
        trail.positions[p + axis] = trail.points[k + axis] - offset;
        trail.positions[p + 3 + axis] = trail.points[k + axis] + offset;
      }
    }
    trail.mesh.geometry.getAttribute("position").needsUpdate = true;
    trail.mesh.geometry.setDrawRange(0, Math.max(0, trail.count - 1) * 6);
  }

  private disposeTrail(trail: SmokeRibbon): void {
    this.root.remove(trail.mesh); trail.mesh.geometry.dispose(); trail.mesh.material.dispose();
  }
  private clearTrails(): void {
    for (const trail of this.trails.values()) this.disposeTrail(trail);
    this.retiredTrails.forEach(trail => this.disposeTrail(trail));
    this.trails.clear(); this.retiredTrails.length = 0;
  }
  dispose(): void {
    this.clearTrails(); this.missileSmokeLast.clear(); this.speedGeometry.dispose(); this.speedMaterial.dispose();
    this.missileSmoke.dispose(); this.smoke.dispose(); this.sparks.dispose(); this.climaxMaterial.dispose();
    this.climaxRing.geometry.dispose(); this.climaxRingMaterial.dispose();
    this.root.clear(); this.scene.remove(this.root);
  }
}
