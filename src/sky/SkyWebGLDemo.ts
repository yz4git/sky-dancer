import * as THREE from "three";
import { FIXED_STEP, SkySimulation } from "./SkySimulation";
import { SkyInput } from "./SkyInput";
import type { SkyDemoHandle } from "./SkyDemo";
import type { SkyEnemyState, SkyStats } from "./SkyTypes";

class SkyAudio {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  activate(): void {
    if (!this.enabled || typeof window === "undefined") return;
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    this.context ??= new AudioContextConstructor();
    void this.context.resume();
  }

  fire(): void {
    this.tone(620, 0.055, "square", 0.028);
  }

  hit(): void {
    this.tone(140, 0.12, "sawtooth", 0.045);
    window.setTimeout(() => this.tone(260, 0.08, "triangle", 0.025), 28);
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.enabled || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

function material(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    flatShading: true,
    roughness: 0.72,
    metalness: 0.18,
  });
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const current of materials) current.dispose();
  });
}

export class SkyWebGLDemo implements SkyDemoHandle {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 260);
  private readonly simulation = new SkySimulation();
  private readonly input: SkyInput;
  private readonly audio = new SkyAudio();
  private readonly clock = new THREE.Clock();
  private readonly planeGroup = new THREE.Group();
  private readonly platformVisuals: THREE.Group[] = [];
  private readonly enemyVisuals = new Map<number, THREE.Group>();
  private readonly bulletVisuals = new Map<number, THREE.Mesh>();
  private readonly onStats: (stats: SkyStats) => void;
  private frameId = 0;
  private accumulator = 0;
  private statsTimer = 0;
  private paused = false;
  private disposed = false;
  private previousHits = 0;
  private previousShots = 0;
  private previousPlaneX = 0;
  private previousPlaneY = 0;

  constructor(private readonly mount: HTMLElement, onStats: (stats: SkyStats) => void) {
    this.onStats = onStats;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.domElement.className = "sky-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Sky Dancer 3D air combat view");
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x07152d);
    this.scene.fog = new THREE.Fog(0x07152d, 70, 210);
    this.scene.add(new THREE.HemisphereLight(0x9bdcff, 0x111933, 2.2));
    const sun = new THREE.DirectionalLight(0xffe7ac, 2.5);
    sun.position.set(-30, 60, 24);
    this.scene.add(sun);
    this.scene.add(this.camera);

    this.createStars();
    this.createPlane();
    this.createPlatforms();
    this.scene.add(this.planeGroup);

    this.input = new SkyInput({
      onMove: (x, y) => this.simulation.setMove(x, y),
      onFire: (active) => this.simulation.setFire(active),
    });
    this.input.attach(window);
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.animate();
  }

  start(): void {
    this.audio.activate();
    this.simulation.start();
  }

  reset(): void {
    this.simulation.reset();
    this.previousHits = 0;
    this.previousShots = 0;
    this.audio.activate();
  }

  pause(): void {
    this.paused = true;
    this.input.clear();
  }

  resume(): void {
    this.paused = false;
    this.clock.getDelta();
  }

  setMove(x: number, y: number): void {
    this.simulation.setMove(x, y);
  }

  setFire(active: boolean): void {
    if (active) this.audio.activate();
    this.simulation.setFire(active);
  }

  getStats(): SkyStats {
    return this.simulation.getStats("webgl");
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.input.detach();
    this.audio.dispose();
    for (const group of this.platformVisuals) disposeObject(group);
    for (const group of this.enemyVisuals.values()) disposeObject(group);
    for (const mesh of this.bulletVisuals.values()) disposeObject(mesh);
    disposeObject(this.planeGroup);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createStars(): void {
    const positions = new Float32Array(420 * 3);
    let state = 0x2fca71;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
    for (let index = 0; index < 420; index += 1) {
      positions[index * 3] = (random() - 0.5) * 150;
      positions[index * 3 + 1] = 6 + random() * 70;
      positions[index * 3 + 2] = -180 + random() * 230;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc5eaff, size: 0.22, sizeAttenuation: true }));
    this.scene.add(stars);
  }

  private createPlane(): void {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 2.65), material(0x33b9d7, 0x0b728b, 0.55));
    body.position.z = 0.14;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 6), material(0xffd466, 0x7f4c11, 0.32));
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -1.55;
    const wings = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.12, 0.62), material(0x1e6cbd, 0x0a244d, 0.25));
    wings.position.z = 0.28;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.36), material(0x6ce7ff, 0x0b728b, 0.42));
    tail.position.set(0, 0.3, 0.98);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.42), material(0xffd466, 0x7f4c11, 0.3));
    fin.position.set(0, 0.48, 0.75);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 6), material(0xa9f4ff, 0x1e8fff, 0.7));
    cockpit.scale.set(0.72, 0.42, 1.2);
    cockpit.position.set(0, 0.34, -0.35);
    const engineGeometry = new THREE.SphereGeometry(0.14, 8, 6);
    const engineMaterial = material(0xff7e5d, 0xff3e1f, 2.4);
    for (const x of [-0.52, 0.52]) {
      const engine = new THREE.Mesh(engineGeometry, engineMaterial);
      engine.position.set(x, -0.06, 1.35);
      this.planeGroup.add(engine);
    }
    this.planeGroup.add(body, nose, wings, tail, fin, cockpit);
    this.planeGroup.scale.setScalar(1.1);
  }

  private createPlatforms(): void {
    const snapshot = this.simulation.getSnapshot();
    for (const platform of snapshot.platforms) {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(platform.width, 0.32, platform.depth), material(0x183c68, 0x0b2d61, 0.4));
      const edge = new THREE.Mesh(new THREE.BoxGeometry(platform.width * 0.92, 0.08, platform.depth * 0.72), material(0x27689d, 0x0b6e9d, 0.6));
      edge.position.y = 0.2;
      const railMaterial = material(0x61e6ff, 0x21b9ff, 1.4);
      for (const x of [-platform.width * 0.47, platform.width * 0.47]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, platform.depth * 0.86), railMaterial);
        rail.position.set(x, 0.38, 0);
        group.add(rail);
      }
      group.add(base, edge);
      this.platformVisuals.push(group);
      this.scene.add(group);
    }
  }

  private createEnemyVisual(enemy: SkyEnemyState): THREE.Group {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.76, 1), material(0xff6576, 0x8c1e44, 0.8));
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.34), material(0xffb55f, 0x7a321e, 0.5));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 16), material(0xff5e9d, 0xb31f68, 1.1));
    ring.rotation.x = Math.PI / 2;
    group.add(core, wing, ring);
    group.userData.enemyId = enemy.id;
    this.scene.add(group);
    return group;
  }

  private createBulletVisual(): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), material(0xffe477, 0xff8b17, 2.5));
    this.scene.add(mesh);
    return mesh;
  }

  private syncVisuals(): void {
    const snapshot = this.simulation.getSnapshot();
    for (let index = 0; index < snapshot.platforms.length; index += 1) {
      const platform = snapshot.platforms[index];
      const group = this.platformVisuals[index];
      if (!group) continue;
      group.position.set(platform.x, platform.y, platform.z);
      group.rotation.y = platform.rotation;
    }

    const liveEnemyIds = new Set(snapshot.enemies.map((enemy) => enemy.id));
    for (const [id, group] of this.enemyVisuals) {
      if (liveEnemyIds.has(id)) continue;
      disposeObject(group);
      group.removeFromParent();
      this.enemyVisuals.delete(id);
    }
    for (const enemy of snapshot.enemies) {
      const group = this.enemyVisuals.get(enemy.id) ?? this.createAndStoreEnemy(enemy);
      group.position.set(enemy.x, enemy.y, enemy.z);
      group.rotation.z = Math.sin(enemy.phase + enemy.z * 0.02) * 0.18;
      group.rotation.x = Math.cos(enemy.phase + enemy.z * 0.01) * 0.14;
    }

    const liveBulletIds = new Set(snapshot.bullets.map((bullet) => bullet.id));
    for (const [id, mesh] of this.bulletVisuals) {
      if (liveBulletIds.has(id)) continue;
      disposeObject(mesh);
      mesh.removeFromParent();
      this.bulletVisuals.delete(id);
    }
    for (const bullet of snapshot.bullets) {
      const mesh = this.bulletVisuals.get(bullet.id) ?? this.createAndStoreBullet(bullet.id);
      mesh.position.set(bullet.x, bullet.y, bullet.z);
    }

    const plane = snapshot.plane;
    this.planeGroup.position.set(plane.x, plane.y, plane.z);
    const deltaX = plane.x - this.previousPlaneX;
    const deltaY = plane.y - this.previousPlaneY;
    this.previousPlaneX = plane.x;
    this.previousPlaneY = plane.y;
    this.planeGroup.rotation.z = THREE.MathUtils.lerp(this.planeGroup.rotation.z, -deltaX * 0.42, 0.22);
    this.planeGroup.rotation.x = THREE.MathUtils.lerp(this.planeGroup.rotation.x, deltaY * 0.12, 0.22);

    this.camera.position.lerp(new THREE.Vector3(plane.x * 0.28, plane.y + 5.4, 17.5), 0.09);
    this.camera.lookAt(plane.x * 0.1, plane.y * 0.72, -23);
  }

  private createAndStoreEnemy(enemy: SkyEnemyState): THREE.Group {
    const group = this.createEnemyVisual(enemy);
    this.enemyVisuals.set(enemy.id, group);
    return group;
  }

  private createAndStoreBullet(id: number): THREE.Mesh {
    const mesh = this.createBulletVisual();
    this.bulletVisuals.set(id, mesh);
    return mesh;
  }

  private readonly animate = (): void => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (!this.paused) {
      this.input.update();
      this.accumulator += delta;
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < 5) {
        this.simulation.step(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps += 1;
      }
      this.syncVisuals();
      const stats = this.simulation.getStats("webgl");
      if (stats.shots > this.previousShots) this.audio.fire();
      if (stats.hits > this.previousHits) this.audio.hit();
      this.previousShots = stats.shots;
      this.previousHits = stats.hits;
      this.statsTimer += delta;
      if (this.statsTimer >= 0.15) {
        this.onStats(stats);
        this.statsTimer = 0;
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  private readonly resize = (): void => {
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") this.input.clear();
    else this.clock.getDelta();
  };
}
