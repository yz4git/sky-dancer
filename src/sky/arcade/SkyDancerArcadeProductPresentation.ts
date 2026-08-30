import * as THREE from "three";
import type { SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";

export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 32, sparks: 160, smoke: 56 } as const;
const SPEED_STREAK_COUNT = 40;
const RETIRE_SECONDS = .65;
const fract = (n: number) => n - Math.floor(n);
const noise = (n: number) => fract(Math.sin(n * 78.233 + 17.1) * 43758.5453);

interface SmokeRibbon {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  points: Float32Array;
  positions: Float32Array;
  count: number;
  width: number;
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
    const count = this.smoke ? 5 : 30;
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

function createRibbon(enemy: boolean): SmokeRibbon {
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
    uniforms: { tint: { value: new THREE.Color(enemy ? 0xff6654 : 0xc8f7ff) }, opacity: { value: .8 } },
    vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `varying vec2 vUv;uniform vec3 tint;uniform float opacity;
      void main(){float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),1.2);float tail=.18+.82*vUv.y;
      gl_FragColor=vec4(tint*(.7+.4*edge),edge*tail*opacity);}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "arcade-projectile-trail"; mesh.frustumCulled = false;
  return { mesh, points: new Float32Array(samples * 3), positions, count: 0, width: enemy ? .16 : .23, retiredAge: null };
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
  private readonly activeIds = new Set<number>();
  private readonly right = new THREE.Vector3();

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
    this.root.add(streaks, this.smoke.mesh, this.sparks.mesh); scene.add(this.root);
  }

  setStage(): void {
    this.clearTrails(); this.smoke.clear(); this.sparks.clear();
  }

  emitBurst(position: THREE.Vector3, size: number): void {
    this.smoke.emit(position, size); this.sparks.emit(position, size);
  }

  update(snapshot: SkyDancerArcadeSnapshot, delta: number, camera: THREE.Camera): void {
    this.updateSpeedStreaks(snapshot, delta);
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.updateProjectileTrails(snapshot, delta);
    this.smoke.update(delta, camera); this.sparks.update(delta, camera);
  }

  private updateSpeedStreaks(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const speed = snapshot.turboActive ? 150 : 58;
    for (let i = 0; i < SPEED_STREAK_COUNT; i++) {
      const k = i * 3, j = i * 6;
      let z = this.speedSeeds[k + 2] + speed * delta;
      if (z > 14) z = -158 - (i % 17) * 2.2;
      this.speedSeeds[k + 2] = z;
      const x = this.speedSeeds[k] - snapshot.playerX * 2.5;
      const y = this.speedSeeds[k + 1] - snapshot.playerY * .9;
      this.speedPositions.set([x, y, z, x, y, z - (snapshot.turboActive ? 9 : 2.4)], j);
    }
    this.speedGeometry.getAttribute("position").needsUpdate = true;
    this.speedMaterial.opacity += ((snapshot.turboActive ? .42 : .045) - this.speedMaterial.opacity) * Math.min(1, delta * 8);
  }

  private updateProjectileTrails(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.activeIds.clear();
    for (const p of snapshot.projectiles) {
      if (p.owner === "player-gun") continue;
      this.activeIds.add(p.id);
      let trail = this.trails.get(p.id);
      if (!trail && this.trails.size + this.retiredTrails.length < ARCADE_EFFECT_BUDGET.trails) {
        trail = createRibbon(p.owner === "enemy"); this.trails.set(p.id, trail); this.root.add(trail.mesh);
      }
      if (!trail) continue;
      const x = p.x * 8.4, y = 1.2 + p.y * 4.9, z = -p.depth;
      const last = Math.max(0, trail.count - 1) * 3;
      const moved = Math.hypot(x - trail.points[last], y - trail.points[last + 1], z - trail.points[last + 2]);
      if (trail.count === 0 || moved > .12) {
        if (trail.count === ARCADE_EFFECT_BUDGET.trailSamples) trail.points.copyWithin(0, 3);
        else trail.count++;
        trail.points.set([x, y, z], (trail.count - 1) * 3);
      }
      this.updateRibbon(trail);
    }
    for (const [id, trail] of this.trails) if (!this.activeIds.has(id)) {
      this.trails.delete(id); trail.retiredAge = 0; this.retiredTrails.push(trail);
    }
    for (let i = this.retiredTrails.length - 1; i >= 0; i--) {
      const trail = this.retiredTrails[i];
      trail.retiredAge = (trail.retiredAge ?? 0) + delta;
      if (trail.retiredAge >= RETIRE_SECONDS) {
        this.disposeTrail(trail); this.retiredTrails.splice(i, 1); continue;
      }
      trail.mesh.material.uniforms.opacity.value = .8 * (1 - trail.retiredAge / RETIRE_SECONDS);
      for (let j = 0; j < trail.count; j++) trail.points[j * 3 + 2] += delta * 4;
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
    this.clearTrails(); this.speedGeometry.dispose(); this.speedMaterial.dispose();
    this.smoke.dispose(); this.sparks.dispose(); this.root.clear(); this.scene.remove(this.root);
  }
}
