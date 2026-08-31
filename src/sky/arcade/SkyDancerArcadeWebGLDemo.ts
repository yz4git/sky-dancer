import * as THREE from "three";
import type { SkyDancerArcadeRuntimeOptions } from "./SkyDancerArcadeRuntime";
import { SkyDancerArcadeRuntime, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import { SkyDancerArcadeEnvironment } from "./SkyDancerArcadeEnvironment";
import { SkyDancerArcadeProductPresentation } from "./SkyDancerArcadeProductPresentation";
import { SkyDancerArcadeCinematicRenderer } from "./SkyDancerArcadeCinematicRenderer";
import { SkyDancerArcadePresentationDirector, type SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";
import { arcadeCameraPose } from "./SkyDancerArcadeCamera";
import { arcadeCoursePose, arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";
import { ARCADE_SUN_DIRECTION, referenceAtmosphere } from "./SkyDancerArcadeReferenceMaterials";
import {
  createSkyDancerArcadeEnemy,
  createSkyDancerArcadeHazard,
  createSkyDancerArcadeLockRing,
  createSkyDancerArcadePlayer,
} from "./SkyDancerArcadeModels";

export interface SkyDancerArcadeDemoHandle {
  setMove(x: number, y: number): void;
  setFire(active: boolean): void;
  setLock(active: boolean): void;
  setTurbo(active: boolean): void;
  releaseInputs(): void;
  pause(): void;
  resume(): void;
  continueRun(): boolean;
  getSnapshot(): SkyDancerArcadeSnapshot;
  dispose(): void;
}

type SnapshotHandler = (snapshot: SkyDancerArcadeSnapshot) => void;

class SkyDancerArcadeAudio {
  private context: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  activate(): void {
    if (typeof AudioContext === "undefined") return;
    if (!this.context) {
      this.context = new AudioContext();
      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 62;
      this.engineGain.gain.value = 0.018;
      this.engine.connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
    }
    if (this.context.state === "suspended") void this.context.resume();
  }

  update(snapshot: SkyDancerArcadeSnapshot): void {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    this.engine.frequency.setTargetAtTime(snapshot.turboActive ? 118 : 68 + snapshot.stage.courseSpeed * 0.12, now, 0.08);
    this.engineGain.gain.setTargetAtTime(snapshot.status === "running" ? (snapshot.turboActive ? 0.032 : 0.018) : 0.006, now, 0.12);
  }

  tone(frequency: number, duration: number, volume: number, type: OscillatorType = "square"): void {
    this.activate();
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  dispose(): void {
    try {
      this.engine?.stop();
    } catch {
      // The oscillator may already have been stopped during a renderer handoff.
    }
    void this.context?.close();
    this.context = null;
    this.engine = null;
    this.engineGain = null;
  }
}

export class SkyDancerArcadeWebGLDemo implements SkyDancerArcadeDemoHandle {
  private readonly mount: HTMLElement;
  private readonly runtime: SkyDancerArcadeRuntime;
  private readonly onSnapshot: SnapshotHandler;
  private readonly onRuntimeFailure: (message: string, error: unknown) => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(55, 1, 0.04, 1200);
  private readonly cinematic: SkyDancerArcadeCinematicRenderer;
  private environmentMap: THREE.WebGLRenderTarget | null = null;
  private readonly environment: SkyDancerArcadeEnvironment;
  private readonly presentation: SkyDancerArcadeProductPresentation;
  private readonly player = createSkyDancerArcadePlayer();
  private readonly entityRoot = new THREE.Group();
  private readonly projectileRoot = new THREE.Group();
  private readonly hazardRoot = new THREE.Group();
  private readonly branchRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();
  private readonly projectileMeshes = new Map<number, THREE.Mesh>();
  private readonly hazardGroups = new Map<number, THREE.Group>();
  private readonly engineGlows = this.player.getObjectsByProperty("name", "arcade-engine-glow");
  private readonly engineTrails = this.player.getObjectsByProperty("name", "arcade-engine-trail");
  private readonly audio = new SkyDancerArcadeAudio();
  private readonly resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private disposed = false;
  private lastFrame = 0;
  private accumulator = 0;
  private snapshotClock = 0;
  private previousSnapshot: SkyDancerArcadeSnapshot;
  private currentStageId: string;
  private cameraShake = 0;
  private readonly presentationDirector = new SkyDancerArcadePresentationDirector();
  private presentationFx: SkyDancerArcadePresentationFrame = { rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0, fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0 };

  constructor(
    mount: HTMLElement,
    options: SkyDancerArcadeRuntimeOptions,
    onSnapshot: SnapshotHandler,
    onRuntimeFailure: (message: string, error: unknown) => void,
  ) {
    this.mount = mount;
    this.runtime = new SkyDancerArcadeRuntime(options);
    this.onSnapshot = onSnapshot;
    this.onRuntimeFailure = onRuntimeFailure;
    this.previousSnapshot = this.runtime.getSnapshot();
    this.currentStageId = this.previousSnapshot.stage.id;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(Math.min(1.6, window.devicePixelRatio || 1));
    this.renderer.domElement.className = "sky-dancer-arcade-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Sky Dancer Arcade Run WebGL game view");
    mount.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 5.2, 15.8);
    this.camera.lookAt(0, .8, -34);
    this.player.position.set(0, 1.1, 2.8);
    this.player.scale.setScalar(.86);
    this.cinematic = new SkyDancerArcadeCinematicRenderer(this.renderer);

    this.entityRoot.name = "arcade-enemies";
    this.projectileRoot.name = "arcade-projectiles";
    this.hazardRoot.name = "arcade-hazards";
    this.branchRoot.name = "arcade-route-gates";
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.player);
    this.environment = new SkyDancerArcadeEnvironment(this.scene);
    this.environment.setStage(this.previousSnapshot.stage);
    this.updateReflections(this.previousSnapshot);
    this.presentation = new SkyDancerArcadeProductPresentation(this.scene);
    this.presentation.setStage();
    this.scene.userData.arcadeProductReference = "docs/arcade-run-product-reference.png";
    this.buildBranchGates(this.previousSnapshot);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(mount);
    this.resize();
    this.onSnapshot(this.previousSnapshot);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    if (this.disposed) return;
    try {
      const elapsed = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      this.accumulator += elapsed;
      while (this.accumulator >= 1 / 60) {
        this.runtime.step(1 / 60);
        this.accumulator -= 1 / 60;
      }
      const snapshot = this.runtime.getSnapshot();
      this.sync(snapshot, snapshot.status === "paused" ? 0 : elapsed);
      this.cinematic.render(this.scene, this.camera, snapshot.turboActive, this.presentationFx);
      this.snapshotClock += elapsed;
      if (this.snapshotClock >= 0.075 || snapshot.status !== this.previousSnapshot.status || snapshot.stageSerial !== this.previousSnapshot.stageSerial) {
        this.snapshotClock = 0;
        this.onSnapshot(snapshot);
      }
      this.previousSnapshot = snapshot;
      this.animationFrame = requestAnimationFrame(this.frame);
    } catch (error) {
      this.onRuntimeFailure("3Dアーケード表示に失敗したためCanvas表示へ切り替えます。", error);
    }
  };

  private sync(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.presentationFx = this.presentationDirector.update(snapshot, this.previousSnapshot, delta);
    if (snapshot.stage.id !== this.currentStageId) {
      this.currentStageId = snapshot.stage.id;
      this.environment.setStage(snapshot.stage);
      this.updateReflections(snapshot);
      this.presentation.setStage();
      this.clearEntityVisuals();
      this.buildBranchGates(snapshot);
    }
    this.environment.update(snapshot.distance, snapshot.playerX, snapshot.playerY);
    this.syncPlayer(snapshot, delta);
    this.syncEnemies(snapshot, delta);
    this.syncProjectiles(snapshot);
    this.syncHazards(snapshot, delta);
    this.syncBranchGates(snapshot, delta);
    this.syncEffects(snapshot);
    this.syncAudio(snapshot);
    this.updateCamera(snapshot, delta);
    this.camera.updateMatrixWorld();
    this.presentation.update(snapshot, delta, this.camera, this.presentationFx);
  }

  private syncPlayer(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const course = arcadeCoursePose(snapshot.stage, snapshot.distance);
    const targetX = snapshot.playerX * 7.8;
    const targetY = 1.1 + snapshot.playerY * 4.25;
    this.player.position.x += (targetX - this.player.position.x) * Math.min(1, delta * 12);
    this.player.position.y += (targetY - this.player.position.y) * Math.min(1, delta * 12);
    this.player.position.z = 2.8;
    const vx = delta > 0 ? (snapshot.playerX - this.previousSnapshot.playerX) / delta : 0;
    const vy = delta > 0 ? (snapshot.playerY - this.previousSnapshot.playerY) / delta : 0;
    const targetRoll = THREE.MathUtils.clamp(-vx * .3, -.48, .48) - snapshot.playerX * .06 + course.bank * .82;
    const targetPitch = THREE.MathUtils.clamp(vy * .08, -.12, .12) + course.pitch * .46;
    this.player.rotation.z += (targetRoll - this.player.rotation.z) * Math.min(1, delta * 8);
    this.player.rotation.x += (targetPitch - this.player.rotation.x) * Math.min(1, delta * 7);
    for (const object of this.engineGlows) {
      const pulse = snapshot.turboActive ? 1.3 : .94 + Math.sin(snapshot.runTimeSeconds * 28) * .06;
      object.scale.set(pulse, pulse, .35);
    }
    for (const object of this.engineTrails) {
      object.scale.set(1, snapshot.turboActive ? 2.1 : 1, 1);
      object.position.z = 2.05 + .31 * (snapshot.turboActive ? 9.5 : 5.2);
    }
  }

  private syncEnemies(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const active = new Set<number>();
    for (const enemy of snapshot.enemies) {
      active.add(enemy.id);
      let group = this.enemyGroups.get(enemy.id);
      if (!group) {
        group = createSkyDancerArcadeEnemy(snapshot.stage, enemy);
        const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, enemy.depth);
        group.userData.arcadeCombatBaseScale = group.scale.x;
        group.rotation.y = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;
        group.position.set(enemy.x * 8.4 + course.x, 1.2 + enemy.y * 4.9 + course.y, -enemy.depth);
        this.enemyGroups.set(enemy.id, group);
        this.entityRoot.add(group);
      }
      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, enemy.depth);
      const targetX = enemy.x * 8.4 + course.x;
      const targetY = 1.2 + enemy.y * 4.9 + course.y;
      const targetZ = -enemy.depth;
      group.position.x += (targetX - group.position.x) * Math.min(1, delta * 13);
      group.position.y += (targetY - group.position.y) * Math.min(1, delta * 13);
      group.position.z += (targetZ - group.position.z) * Math.min(1, delta * 13);
      const previousEnemy = this.previousSnapshot.enemies.find((previous) => previous.id === enemy.id);
      const safeDelta = Math.max(delta, 1 / 120);
      const lateralVelocity = previousEnemy ? (enemy.x - previousEnemy.x) / safeDelta : 0;
      const verticalVelocity = previousEnemy ? (enemy.y - previousEnemy.y) / safeDelta : 0;
      const targetHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;
      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));
      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 7.5 : 5.8));
      const targetPitch = course.pitch * .72 + THREE.MathUtils.clamp(verticalVelocity * .035, -.2, .2);
      const maneuverBank = THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);
      const targetBank = maneuverBank + course.bank * .46 + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.8) * (enemy.boss ? .025 : .08);
      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 8);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 9);
      const existingRing = group.getObjectByName("arcade-lock-ring");
      if (enemy.locked && !existingRing) group.add(createSkyDancerArcadeLockRing(0xff4c58));
      if (!enemy.locked && existingRing) {
        group.remove(existingRing);
        this.disposeObject(existingRing);
      }
      const aimDistance = Math.hypot(enemy.x - snapshot.playerX, enemy.y - snapshot.playerY);
      const aimThreshold = enemy.boss ? 1.62 : enemy.kind === "bomber" ? .96 : .82;
      const showAimCue = !enemy.locked && enemy.depth > 7 && enemy.depth < 68 && aimDistance < aimThreshold;
      let aimRing = group.getObjectByName("arcade-aim-ring");
      if (showAimCue && !aimRing) {
        aimRing = createSkyDancerArcadeLockRing(0x78eeff);
        aimRing.name = "arcade-aim-ring";
        aimRing.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const material = object.material as THREE.MeshBasicMaterial;
          material.opacity = .34;
        });
        group.add(aimRing);
      } else if (!showAimCue && aimRing) {
        group.remove(aimRing);
        this.disposeObject(aimRing);
        aimRing = undefined;
      }
      const lockRing = group.getObjectByName("arcade-lock-ring");
      for (const ring of [lockRing, aimRing]) {
        if (!ring) continue;
        ring.rotation.y = -group.rotation.y;
        ring.rotation.z = -group.rotation.z;
        ring.rotation.x = this.camera.rotation.x;
      }
      if (lockRing) lockRing.scale.setScalar(enemy.boss ? 4.2 : enemy.kind === "bomber" ? 1.7 : 1.1);
      if (aimRing) aimRing.scale.setScalar(enemy.boss ? 3.7 : enemy.kind === "bomber" ? 1.5 : .92);
      if (!enemy.boss) {
        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;
        const extremeCloseClamp = 1 - THREE.MathUtils.clamp((18 - enemy.depth) / 15, 0, 1) * .18;
        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.035 : 1;
        group.scale.setScalar(baseScale * maneuverPresence * extremeCloseClamp);
      }
      if (enemy.boss) {
        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        const baseScale = typeof group.userData.arcadeBaseScale === "number" ? group.userData.arcadeBaseScale : 1;
        group.scale.setScalar(baseScale);
        for (const weakPoint of group.getObjectsByProperty("name", "arcade-boss-weakpoint")) {
          weakPoint.scale.setScalar(.86 + Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .12 + (1 - hpRatio) * .1);
          weakPoint.rotation.y += delta * 1.8;
        }
      }
    }
    for (const [id, group] of this.enemyGroups) {
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
  }

  private syncProjectiles(snapshot: SkyDancerArcadeSnapshot): void {
    const active = new Set<number>();
    for (const projectile of snapshot.projectiles) {
      active.add(projectile.id);
      let mesh = this.projectileMeshes.get(projectile.id);
      if (!mesh) {
        const enemyMissile = projectile.owner === "enemy";
        const color = enemyMissile ? 0xff8a2b : projectile.owner === "player-missile" ? 0x64e9ff : 0xc8f8ff;
        const geometry = projectile.owner === "player-missile"
          ? new THREE.ConeGeometry(0.16, 1.02, 7)
          : enemyMissile
            ? new THREE.ConeGeometry(0.36, 1.62, 8)
            : new THREE.CylinderGeometry(0.04, 0.072, 1.55, 5);
        geometry.rotateX(Math.PI / 2);
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color,
            transparent: !enemyMissile,
            opacity: enemyMissile ? 1 : 0.94,
            blending: enemyMissile ? THREE.NormalBlending : THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        if (projectile.owner === "enemy") mesh.renderOrder = 8;
        this.projectileMeshes.set(projectile.id, mesh);
        this.projectileRoot.add(mesh);
      }
      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, projectile.depth);
      mesh.position.set(projectile.x * 8.4 + course.x, 1.2 + projectile.y * 4.9 + course.y, -projectile.depth);
      mesh.rotation.y = course.yaw;
      mesh.rotation.x = course.pitch;
      const pulse = projectile.owner === "player-missile"
        ? 1.35 + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : 1;
      mesh.scale.setScalar(pulse);
    }
    for (const [id, mesh] of this.projectileMeshes) {
      if (active.has(id)) continue;
      this.projectileMeshes.delete(id);
      this.projectileRoot.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  private syncHazards(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const active = new Set<number>();
    for (const hazard of snapshot.hazards) {
      active.add(hazard.id);
      let group = this.hazardGroups.get(hazard.id);
      if (!group) {
        group = createSkyDancerArcadeHazard(snapshot.stage, hazard);
        this.hazardGroups.set(hazard.id, group);
        this.hazardRoot.add(group);
      }
      const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, hazard.depth);
      group.position.set(hazard.x * 8.4 + course.x, 1.2 + hazard.y * 4.9 + course.y, -hazard.depth);
      group.rotation.x += delta * 0.42;
      group.rotation.y += delta * 0.58;
    }
    for (const [id, group] of this.hazardGroups) {
      if (active.has(id)) continue;
      this.hazardGroups.delete(id);
      this.hazardRoot.remove(group);
      this.disposeObject(group);
    }
  }

  private buildBranchGates(snapshot: SkyDancerArcadeSnapshot): void {
    for (const child of this.branchRoot.children) this.disposeObject(child);
    this.branchRoot.clear();
    const options = snapshot.stage.next;
    options.forEach((_, index) => {
      const count = options.length;
      const x = count <= 1 ? 0 : (index / (count - 1)) * 15 - 7.5;
      const color = index === 0 ? 0x5ee5ff : index === 1 ? 0xffd65e : 0xff6ca2;
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const gate = new THREE.Group();
      gate.name = `arcade-branch-gate-${index}`;
      const radius = count === 3 ? 2.6 : 3.2;
      const outer = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.2, 6, 32), material);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.78, 0.055, 5, 32), material.clone());
      inner.rotation.z = Math.PI / 8;
      gate.add(outer, inner);
      for (let chevron = 0; chevron < 4; chevron += 1) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.12), material.clone());
        const angle = chevron / 4 * Math.PI * 2;
        marker.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        marker.rotation.z = angle + Math.PI / 2;
        gate.add(marker);
      }
      gate.userData.baseX = x;
      gate.position.set(x, 1.2, -82);
      this.branchRoot.add(gate);
    });
    this.branchRoot.visible = false;
  }

  private syncBranchGates(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.branchRoot.visible = snapshot.branchActive;
    if (!snapshot.branchActive) return;
    const gateDepth = 82;
    const course = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, gateDepth);
    this.branchRoot.children.forEach((child, index) => {
      const baseX = typeof child.userData.baseX === "number" ? child.userData.baseX : 0;
      child.position.set(baseX + course.x, 1.2 + course.y, -gateDepth);
      child.rotation.y = course.yaw;
      child.rotation.x = course.pitch;
      child.rotation.z += delta * (index % 2 === 0 ? 0.7 : -0.7);
      const selected = snapshot.branchSelection === snapshot.branchOptions[index];
      child.scale.setScalar(selected ? 1.2 + Math.sin(performance.now() * 0.012) * 0.08 : 0.92);
    });
  }

  private syncEffects(snapshot: SkyDancerArcadeSnapshot): void {
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
      this.cameraShake = Math.min(.8, this.cameraShake + .4);
      this.presentation.emitBurst(this.player.position, .45);
    }
    if (snapshot.nearMisses > this.previousSnapshot.nearMisses) {
      this.cameraShake = Math.min(.82, this.cameraShake + .11);
      this.presentation.emitRushAccent();
    }
    if (snapshot.turboActive && !this.previousSnapshot.turboActive) this.presentation.emitRushAccent();
    if (snapshot.bossActive && !this.previousSnapshot.bossActive) this.presentation.emitBossArrival();
  }

  /** Small deterministic outdoor reflection map for the ceramic skin and canopy. */
  private updateReflections(snapshot: SkyDancerArcadeSnapshot): void {
    const palette = referenceAtmosphere(snapshot.stage);
    const width = 128, height = 64;
    const data = new Float32Array(width * height * 4);
    const direction = new THREE.Vector3();
    const color = new THREE.Color();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const theta = Math.PI * (y + .5) / height;
      const phi = Math.PI * 2 * (x + .5) / width;
      direction.set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
      const up = THREE.MathUtils.smoothstep(direction.y, -.08, .7);
      color.copy(palette.horizon).lerp(palette.zenith, up);
      if (direction.y < 0) color.multiplyScalar(.3);
      const sun = Math.pow(Math.max(0, direction.dot(ARCADE_SUN_DIRECTION)), 170) * (palette.night ? .2 : 4);
      const k = (y * width + x) * 4;
      data[k] = color.r + sun; data[k + 1] = color.g + sun * .7;
      data[k + 2] = color.b + sun * .4; data[k + 3] = 1;
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    const generator = new THREE.PMREMGenerator(this.renderer);
    const target = generator.fromEquirectangular(texture);
    this.scene.environment = target.texture;
    this.scene.environmentIntensity = .65;
    this.environmentMap?.dispose(); this.environmentMap = target;
    generator.dispose(); texture.dispose();
  }

  private syncAudio(snapshot: SkyDancerArcadeSnapshot): void {
    this.audio.update(snapshot);
    if (snapshot.shotSerial !== this.previousSnapshot.shotSerial) this.audio.tone(170, 0.035, 0.012, "sawtooth");
    if (snapshot.missileSerial !== this.previousSnapshot.missileSerial) this.audio.tone(430, 0.16, 0.04, "square");
    if (snapshot.hitSerial !== this.previousSnapshot.hitSerial) this.audio.tone(90, 0.08, 0.035, "triangle");
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) this.audio.tone(54, 0.22, 0.06, "sawtooth");
    if (snapshot.resultSerial !== this.previousSnapshot.resultSerial) this.audio.tone(660, 0.32, 0.045, "triangle");
    if (snapshot.turboActive && !this.previousSnapshot.turboActive) this.audio.tone(132, .2, .035, "sawtooth");
    if (snapshot.nearMisses > this.previousSnapshot.nearMisses) this.audio.tone(1180, .075, .018, "triangle");
    if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated) this.audio.tone(236, .08, .018, "triangle");
    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }
    if (snapshot.stageSerial !== this.previousSnapshot.stageSerial) this.audio.tone(330, .18, .025, "triangle");
    const incoming = snapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    const wasIncoming = this.previousSnapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    if (incoming && !wasIncoming) this.audio.tone(880, 0.12, 0.026, "square");
  }

  private updateCamera(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);
    const pose = arcadeCameraPose(snapshot.playerX, snapshot.playerY, this.camera.aspect, snapshot.turboActive);
    const course = arcadeCoursePose(snapshot.stage, snapshot.distance);
    // V7.1: use two look-ahead samples but deliberately lag the spline. The near sample keeps
    // the player aimed into the corridor while the far sample is weak enough that the next bend
    // remains visibly off-centre instead of being camera-corrected into a straight tunnel.
    const nearCourse = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, 42);
    const farCourse = arcadeCourseRelativePose(snapshot.stage, snapshot.distance, 132);
    const totalShake = this.cameraShake + this.presentationFx.cameraShake;
    const shakeX = Math.sin(snapshot.runTimeSeconds * 79) * totalShake * .25;
    const shakeY = Math.cos(snapshot.runTimeSeconds * 91) * totalShake * .18;
    const iceCourse = snapshot.stage.biome === "ice";
    const targetX = pose.x + shakeX - nearCourse.x * .018;
    const targetY = pose.y + shakeY - nearCourse.y * (iceCourse ? 0 : .012);
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, delta * 4.0);
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, delta * 4.0);
    this.camera.position.z += (pose.z + this.presentationFx.pullback - this.camera.position.z) * Math.min(1, delta * 4.5);
    this.camera.fov += (pose.fov + this.presentationFx.fovKick - this.camera.fov) * Math.min(1, delta * 7.2);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(
      pose.lookX + nearCourse.x * .055 + farCourse.x * .028,
      pose.lookY + nearCourse.y * (iceCourse ? .006 : .07) + farCourse.y * (iceCourse ? 0 : .018),
      pose.lookZ,
    );
    // Bank enough to sell the turn, but do not rotate the horizon so far that the bend disappears.
    this.camera.rotateZ(pose.roll + course.bank * .32 + nearCourse.bank * .05);
  }

  private resize(): void {
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.renderer.setSize(width, height, false);
    this.cinematic.resize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private clearEntityVisuals(): void {
    for (const group of this.enemyGroups.values()) this.disposeObject(group);
    for (const mesh of this.projectileMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const group of this.hazardGroups.values()) this.disposeObject(group);
    this.entityRoot.clear();
    this.projectileRoot.clear();
    this.hazardRoot.clear();
    this.enemyGroups.clear();
    this.projectileMeshes.clear();
    this.hazardGroups.clear();
  }

  private disposeObject(group: THREE.Object3D): void {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }

  setMove(x: number, y: number): void {
    this.audio.activate();
    this.runtime.setMove(x, y);
  }

  setFire(active: boolean): void {
    if (active) this.audio.activate();
    this.runtime.setFire(active);
  }

  setLock(active: boolean): void {
    if (active) this.audio.activate();
    this.runtime.setLock(active);
  }

  setTurbo(active: boolean): void {
    if (active) this.audio.activate();
    this.runtime.setTurbo(active);
  }

  releaseInputs(): void {
    this.runtime.releaseInputs();
  }

  pause(): void {
    this.runtime.pause();
  }

  resume(): void {
    this.runtime.resume();
  }

  continueRun(): boolean {
    this.audio.activate();
    return this.runtime.continueRun();
  }

  getSnapshot(): SkyDancerArcadeSnapshot {
    return this.runtime.getSnapshot();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.audio.dispose();
    this.presentation.dispose();
    this.environment.dispose();
    this.clearEntityVisuals();
    for (const child of this.branchRoot.children) this.disposeObject(child);
    this.branchRoot.clear();
    this.disposeObject(this.player);
    this.environmentMap?.dispose();
    this.cinematic.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
