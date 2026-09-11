import * as THREE from "three";
import type { SkyDancerArcadeRuntimeOptions } from "./SkyDancerArcadeRuntime";
import { SkyDancerArcadeRuntime, type SkyDancerArcadeImpactSnapshot, type SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import { SkyDancerArcadeEnvironment } from "./SkyDancerArcadeEnvironment";
import { SkyDancerArcadeProductPresentation } from "./SkyDancerArcadeProductPresentation";
import { SkyDancerArcadeCinematicRenderer } from "./SkyDancerArcadeCinematicRenderer";
import { SkyDancerArcadePresentationDirector, type SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";
import { arcadeCameraPose } from "./SkyDancerArcadeCamera";
import { arcadeCoursePose, arcadeCourseRelativeVisualPose } from "./SkyDancerArcadeCoursePath";
import { ARCADE_SUN_DIRECTION, referenceAtmosphere } from "./SkyDancerArcadeReferenceMaterials";
import { arcadeGroundSurfaceLocalYV1052, arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";
import { SkyDancerArcadeV11SetpieceDirector } from "./SkyDancerArcadeV11Setpieces";
import { skyDancerArcadeV25VisualAttitude } from "./SkyDancerArcadeV25CoordinatedFlight";
import { skyDancerArcadeV27CuePointSize, skyDancerArcadeV27EnemyPresenceScale } from "./SkyDancerArcadeV27CombatReadability";
import {
  skyDancerArcadeV271CueBudget,
  skyDancerArcadeV271ThreatCueScore,
} from "./SkyDancerArcadeV271ScreenPolish";
import { skyDancerArcadeV28ReadableAttitude } from "./SkyDancerArcadeV28DogfightReadability";
import { skyDancerArcadeV401WorldBreakBriefing } from "./SkyDancerArcadeV401WorldBreakPolish";
import { skyDancerArcadeV402CelebrationFromMessage } from "./SkyDancerArcadeV402WorldBreakCelebration";
import {
  skyDancerArcadeV403ComebackFromCelebration,
  skyDancerArcadeV403RecoveryFromMessage,
  skyDancerArcadeV403ResolvedRecoveryFromMessage,
} from "./SkyDancerArcadeV403WorldBreakRecovery";
import {
  skyDancerArcadeV406BossDrone,
  skyDancerArcadeV406FinalBossCue,
  skyDancerArcadeV406FormMotion,
  type SkyDancerArcadeV406FinalBossCue,
} from "./SkyDancerArcadeV406FinalBossPresentation";
import {
  createSkyDancerArcadeEnemy,
  createSkyDancerArcadeHazard,
  createSkyDancerArcadeLockRing,
  createSkyDancerArcadePlayer,
  extendArcadeGroundConnectorsV1052,
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

interface EnemyHitReaction {
  x: number;
  y: number;
  z: number;
  pitch: number;
  roll: number;
  flash: number;
  missile: boolean;
}

function setArcadeCuePointSizeV27(root: THREE.Object3D, pointSize: number): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Points) || !(object.material instanceof THREE.ShaderMaterial)) return;
    const uniform = object.material.uniforms.pointSize;
    if (uniform) uniform.value = pointSize;
  });
}

class SkyDancerArcadeAudio {
  private context: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private bossDrone: OscillatorNode | null = null;
  private bossDroneGain: GainNode | null = null;

  activate(): void {
    if (typeof AudioContext === "undefined") return;
    if (!this.context) {
      this.context = new AudioContext();
      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      this.bossDrone = this.context.createOscillator();
      this.bossDroneGain = this.context.createGain();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 62;
      this.engineGain.gain.value = 0.018;
      this.engine.connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
      this.bossDrone.type = "triangle";
      this.bossDrone.frequency.value = 54;
      this.bossDroneGain.gain.value = 0;
      this.bossDrone.connect(this.bossDroneGain).connect(this.context.destination);
      this.bossDrone.start();
    }
    if (this.context.state === "suspended") void this.context.resume();
  }

  update(snapshot: SkyDancerArcadeSnapshot): void {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    this.engine.frequency.setTargetAtTime(snapshot.turboActive ? 118 : 68 + snapshot.stage.courseSpeed * 0.12, now, 0.08);
    this.engineGain.gain.setTargetAtTime(snapshot.status === "running" ? (snapshot.turboActive ? 0.032 : 0.018) : 0.006, now, 0.12);
    const bossDrone = skyDancerArcadeV406BossDrone(snapshot.finalBossForm, snapshot.bossPhase, snapshot.finalBossReactive && snapshot.bossActive && snapshot.status === "running");
    this.bossDrone?.frequency.setTargetAtTime(bossDrone.frequencyHz, now, .18);
    this.bossDroneGain?.gain.setTargetAtTime(bossDrone.gain, now, .28);
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
      this.bossDrone?.stop();
    } catch {
      // The oscillator may already have been stopped during a renderer handoff.
    }
    void this.context?.close();
    this.context = null;
    this.engine = null;
    this.engineGain = null;
    this.bossDrone = null;
    this.bossDroneGain = null;
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
  private readonly v11Setpieces: SkyDancerArcadeV11SetpieceDirector;
  private readonly player: THREE.Group;
  private readonly entityRoot = new THREE.Group();
  private readonly projectileRoot = new THREE.Group();
  private readonly hazardRoot = new THREE.Group();
  private readonly branchRoot = new THREE.Group();
  private readonly worldBreakRoot = new THREE.Group();
  private readonly worldBreakKnifeRoot = new THREE.Group();
  private readonly worldBreakStormRoot = new THREE.Group();
  private readonly worldBreakFortressRoot = new THREE.Group();
  private readonly worldBreakIceRoot = new THREE.Group();
  private readonly worldBreakPortalRoot = new THREE.Group();
  private readonly worldBreakPursuitRoot = new THREE.Group();
  private readonly worldBreakMagmaRoot = new THREE.Group();
  private readonly worldBreakOrbitRoot = new THREE.Group();
  private readonly worldBreakPrismRoot = new THREE.Group();
  private readonly enemyGroups = new Map<number, THREE.Group>();
  private readonly projectileMeshes = new Map<number, THREE.Mesh>();
  private readonly hazardGroups = new Map<number, THREE.Group>();
  private readonly worldBreakGateGroups = new Map<number, THREE.Group>();
  private readonly engineGlows: THREE.Object3D[];
  private readonly engineTrails: THREE.Object3D[];
  private readonly audio = new SkyDancerArcadeAudio();
  private readonly resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private resizeFrame = 0;
  private contextRecoveryTimer = 0;
  private disposed = false;
  private contextLost = false;
  private renderWidth = 0;
  private renderHeight = 0;
  private lastFrame = 0;
  private accumulator = 0;
  private snapshotClock = 0;
  private previousSnapshot: SkyDancerArcadeSnapshot;
  private currentStageId: string;
  // V33: route gates own a short exit shot after route resolution instead of hard-toggling invisible.
  private branchGateExitTimer = 0;
  private branchGateExitSelection: string | null = null;
  private cameraShake = 0;
  private cameraImpactKick = 0;
  // V40.2: presentation-only success accent. No runtime time-scale, collision, score or input changes.
  private worldBreakCelebrationTimer = 0;
  private worldBreakCelebrationDuration = 1;
  private worldBreakCelebrationStrength = 0;
  private worldBreakCelebrationPullback = 0;
  private worldBreakCelebrationFovKick = 0;
  // V40.3: presentation-only failure debt and one-shot comeback framing.
  private worldBreakRecoveryTimer = 0;
  private worldBreakRecoveryDuration = 1;
  private worldBreakRecoveryStrength = 0;
  private worldBreakRecoveryPullback = 0;
  private worldBreakRecoveryFovKick = 0;
  private worldBreakRecoveryMode: "failure" | "comeback" | null = null;
  private worldBreakRecoveryDebt = false;
  private worldBreakRecoveryResolvedMessage: string | null = null;
  // V40.6: final-boss presentation consumes V40.5 telemetry only; simulation timing and hit rules remain untouched.
  private finalBossPresentationTimer = 0;
  private finalBossPresentationDuration = 1;
  private finalBossPresentationCue: SkyDancerArcadeV406FinalBossCue | null = null;
  // V10.3.8: sightline and roll persist across stage handoffs so the camera has one coherent damped frame.
  private readonly cameraLookTarget = new THREE.Vector3(0, .8, -34);
  private cameraRoll = 0;
  private playerDamageKick = 0;
  private playerDamageSign = 1;
  private readonly enemyHitReactions = new Map<number, EnemyHitReaction>();
  // V25: previous render-space velocity lets bank follow acceleration rather than sideways displacement.
  private readonly enemyVelocityHistory = new Map<number, { vx: number; vy: number }>();
  private readonly presentationDirector = new SkyDancerArcadePresentationDirector();
  private presentationFx: SkyDancerArcadePresentationFrame = { rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0, fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0 };

  constructor(
    mount: HTMLElement,
    options: SkyDancerArcadeRuntimeOptions,
    onSnapshot: SnapshotHandler,
    onRuntimeFailure: (message: string, error: unknown) => void,
  ) {
    this.mount = mount;
    this.player = createSkyDancerArcadePlayer(options.paintScheme ?? "default");
    this.engineGlows = this.player.getObjectsByProperty("name", "arcade-engine-glow");
    this.engineTrails = this.player.getObjectsByProperty("name", "arcade-engine-trail");
    this.runtime = new SkyDancerArcadeRuntime(options);
    this.onSnapshot = onSnapshot;
    this.onRuntimeFailure = onRuntimeFailure;
    this.previousSnapshot = this.runtime.getSnapshot();
    this.currentStageId = this.previousSnapshot.stage.id;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    const compactLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 520;
    this.renderer.setPixelRatio(Math.min(compactLandscape ? 1.4 : 1.6, window.devicePixelRatio || 1));
    this.renderer.domElement.className = "sky-dancer-arcade-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Sky Dancer Arcade Run WebGL game view");
    this.renderer.domElement.addEventListener("webglcontextlost", this.handleContextLost, false);
    this.renderer.domElement.addEventListener("webglcontextrestored", this.handleContextRestored, false);
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
    this.worldBreakRoot.name = "arcade-world-break-gates";
    this.worldBreakKnifeRoot.name = "arcade-world-break-knife-run";
    this.worldBreakStormRoot.name = "arcade-world-break-lightning-grid";
    this.worldBreakFortressRoot.name = "arcade-world-break-fortress-gate";
    this.worldBreakIceRoot.name = "arcade-world-break-crystal-collapse";
    this.worldBreakPortalRoot.name = "arcade-world-break-sky-labyrinth";
    this.worldBreakPursuitRoot.name = "arcade-world-break-neon-pursuit";
    this.worldBreakMagmaRoot.name = "arcade-world-break-magma-pressure";
    this.worldBreakOrbitRoot.name = "arcade-world-break-zero-g-ascent";
    this.worldBreakPrismRoot.name = "arcade-world-break-route-reprise";
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);
    this.worldBreakRoot.add(this.worldBreakOrbitRoot, this.worldBreakPrismRoot);
    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);
    this.environment = new SkyDancerArcadeEnvironment(this.scene);
    this.environment.setStage(this.previousSnapshot.stage);
    this.v11Setpieces = new SkyDancerArcadeV11SetpieceDirector(this.scene);
    this.v11Setpieces.setStage(this.previousSnapshot.stage);
    this.updateReflections(this.previousSnapshot);
    this.presentation = new SkyDancerArcadeProductPresentation(this.scene);
    this.presentation.setStage();
    this.scene.userData.arcadeProductReference = "docs/arcade-run-product-reference.png";
    this.buildBranchGates(this.previousSnapshot);

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(mount);
    this.resize(true);
    this.onSnapshot(this.previousSnapshot);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    if (this.disposed) return;
    this.contextLost = true;
    this.lastFrame = performance.now();
    if (this.contextRecoveryTimer) window.clearTimeout(this.contextRecoveryTimer);
    this.contextRecoveryTimer = window.setTimeout(() => {
      this.contextRecoveryTimer = 0;
      if (!this.contextLost || this.disposed) return;
      this.onRuntimeFailure(
        "3D描画の復旧に時間がかかったためCanvas表示へ切り替えます。",
        new Error("Sky Dancer Arcade WebGL context did not recover"),
      );
    }, 1800);
  };

  private readonly handleContextRestored = (): void => {
    if (this.disposed) return;
    this.contextLost = false;
    if (this.contextRecoveryTimer) {
      window.clearTimeout(this.contextRecoveryTimer);
      this.contextRecoveryTimer = 0;
    }
    this.lastFrame = performance.now();
    this.resize(true);
  };

  private readonly frame = (now: number): void => {
    if (this.disposed) return;
    if (this.contextLost) {
      this.lastFrame = now;
      this.animationFrame = requestAnimationFrame(this.frame);
      return;
    }
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
      this.v11Setpieces.setStage(snapshot.stage);
      this.updateReflections(snapshot);
      this.presentation.setStage();
      this.worldBreakRecoveryDebt = false;
      this.worldBreakRecoveryResolvedMessage = null;
      this.worldBreakRecoveryTimer = 0;
      this.worldBreakRecoveryMode = null;
      this.clearEntityVisuals();
      this.buildBranchGates(snapshot);
    }
    this.environment.update(snapshot.distance, snapshot.playerX, snapshot.playerY);
    this.v11Setpieces.update(snapshot);
    this.syncPlayer(snapshot, delta);
    this.syncEnemies(snapshot, delta);
    this.syncProjectiles(snapshot);
    this.syncHazards(snapshot, delta);
    this.syncWorldBreakGates(snapshot, delta);
    this.syncWorldBreakKnifeRun(snapshot);
    this.syncWorldBreakStormLane(snapshot);
    this.syncWorldBreakFortressBreach(snapshot);
    this.syncWorldBreakIceCollapse(snapshot);
    this.syncWorldBreakFloatingPortals(snapshot);
    this.syncWorldBreakNeonPursuit(snapshot);
    this.syncWorldBreakMagmaPressure(snapshot);
    this.syncWorldBreakOrbitalAscent(snapshot);
    this.syncWorldBreakPrismReprise(snapshot);
    this.syncBranchGates(snapshot, delta);
    this.syncEffects(snapshot);
    this.syncFinalBossPresentation(snapshot, delta);
    this.syncWorldBreakRecovery(snapshot, delta);
    this.syncWorldBreakCelebration(snapshot, delta);
    this.syncAudio(snapshot);
    this.updateCamera(snapshot, delta);
    this.camera.updateMatrixWorld();
    this.presentation.update(snapshot, delta, this.camera, this.presentationFx);
  }

  private syncPlayer(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const course = arcadeCoursePose(snapshot.stage, snapshot.distance);
    this.playerDamageKick *= Math.exp(-delta * 7.4);
    const targetX = snapshot.playerX * 7.8 + this.playerDamageSign * this.playerDamageKick * .42;
    const targetY = 1.1 + snapshot.playerY * 4.25 + this.playerDamageKick * .16;
    this.player.position.x += (targetX - this.player.position.x) * Math.min(1, delta * 12);
    this.player.position.y += (targetY - this.player.position.y) * Math.min(1, delta * 12);
    this.player.position.z = 2.8 + this.playerDamageKick * .32;
    const vx = delta > 0 ? (snapshot.playerX - this.previousSnapshot.playerX) / delta : 0;
    const vy = delta > 0 ? (snapshot.playerY - this.previousSnapshot.playerY) / delta : 0;
    const targetRoll = THREE.MathUtils.clamp(-vx * .3, -.48, .48) - snapshot.playerX * .06 + course.bank * 1.08 + this.playerDamageSign * this.playerDamageKick * .22;
    const targetPitch = THREE.MathUtils.clamp(vy * .08, -.12, .12) + course.pitch * .66 + this.playerDamageKick * .12;
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
      active.add(enemy.id);
      let group = this.enemyGroups.get(enemy.id);
      if (!group) {
        group = createSkyDancerArcadeEnemy(snapshot.stage, enemy);
        const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, enemy.depth);
        group.userData.arcadeCombatBaseScale = group.scale.x;
        if (enemy.rivalAce) {
          // V40.4: NOVA-7 keeps one unmistakable magenta/cyan signature across every biome.
          const identity = new THREE.Group();
          identity.name = "arcade-rival-ace-identity";
          const magenta = new THREE.MeshBasicMaterial({ color: 0xff4fc8, transparent: true, opacity: .88, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
          const cyan = new THREE.MeshBasicMaterial({ color: 0x67edff, transparent: true, opacity: .78, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
          const left = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 5), magenta);
          const right = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 5), cyan);
          left.position.set(-.68, .08, .26); right.position.set(.68, .08, .26);
          const halo = new THREE.Mesh(new THREE.TorusGeometry(.82, .035, 5, 24), magenta.clone());
          halo.rotation.x = Math.PI / 2; halo.position.z = .42;
          identity.add(left, right, halo);
          group.add(identity);
        }
        group.rotation.y = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;
        group.position.set(enemy.x * 8.4 + course.x, 1.2 + enemy.y * 4.9 + course.y, course.z);
        this.enemyGroups.set(enemy.id, group);
        this.entityRoot.add(group);
      }
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, enemy.depth);
      const reaction = this.enemyHitReactions.get(enemy.id);
      if (reaction) {
        const damping = Math.exp(-delta * (reaction.missile ? 5.1 : 8.6));
        reaction.x *= damping; reaction.y *= damping; reaction.z *= damping;
        reaction.pitch *= damping; reaction.roll *= damping; reaction.flash = Math.max(0, reaction.flash - delta * 5.6);
        if (Math.abs(reaction.x) + Math.abs(reaction.y) + Math.abs(reaction.z) + Math.abs(reaction.roll) + reaction.flash < .018) this.enemyHitReactions.delete(enemy.id);
      }
      const targetX = enemy.x * 8.4 + course.x + (reaction?.x ?? 0);
      const targetY = 1.2 + enemy.y * 4.9 + course.y + (reaction?.y ?? 0);
      const targetZ = course.z + (reaction?.z ?? 0);
      group.position.x += (targetX - group.position.x) * Math.min(1, delta * 13);
      group.position.y += (targetY - group.position.y) * Math.min(1, delta * 13);
      group.position.z += (targetZ - group.position.z) * Math.min(1, delta * 13);
      const previousEnemy = this.previousSnapshot.enemies.find((previous) => previous.id === enemy.id);
      const safeDelta = Math.max(delta, 1 / 120);
      const lateralVelocity = previousEnemy ? (enemy.x - previousEnemy.x) / safeDelta : 0;
      const verticalVelocity = previousEnemy ? (enemy.y - previousEnemy.y) / safeDelta : 0;
      const previousVelocity = this.enemyVelocityHistory.get(enemy.id);
      const lateralAcceleration = previousVelocity
        ? THREE.MathUtils.clamp((lateralVelocity - previousVelocity.vx) / safeDelta, -12, 12)
        : 0;
      const verticalAcceleration = previousVelocity
        ? THREE.MathUtils.clamp((verticalVelocity - previousVelocity.vy) / safeDelta, -10, 10)
        : 0;
      this.enemyVelocityHistory.set(enemy.id, { vx: lateralVelocity, vy: verticalVelocity });
      const coordinated = enemy.boss
        ? null
        : skyDancerArcadeV25VisualAttitude(
            lateralVelocity, verticalVelocity, lateralAcceleration, verticalAcceleration, enemy.maneuver,
          );
      const baseHeading = enemy.maneuver === "overtake" ? course.yaw : Math.PI + course.yaw;
      const targetHeading = baseHeading + (coordinated?.headingOffset ?? 0);
      const headingDelta = Math.atan2(Math.sin(targetHeading - group.rotation.y), Math.cos(targetHeading - group.rotation.y));
      // V25: roll follows acceleration, so the airframe banks before its path visibly bends instead of skidding sideways.
      group.rotation.y += headingDelta * Math.min(1, delta * (enemy.maneuver === "overtake" ? 5.2 : 4.45));
      const bossTurnLift = enemy.boss ? Math.min(.055, Math.abs(lateralVelocity) * .022) : 0;
      const targetPitch = course.pitch * .72
        + (coordinated?.pitchOffset ?? THREE.MathUtils.clamp(verticalVelocity * .042, -.24, .24) + bossTurnLift)
        + (reaction?.pitch ?? 0);
      const maneuverBank = coordinated?.bank ?? THREE.MathUtils.clamp(-lateralVelocity * .095, -.64, .64);
      const targetBank = maneuverBank + course.bank * .46
        + Math.sin(enemy.phase + snapshot.runTimeSeconds * 1.35) * (enemy.boss ? .025 : .032)
        + (reaction?.roll ?? 0);
      group.rotation.x += (targetPitch - group.rotation.x) * Math.min(1, delta * 6.2);
      group.rotation.z += (targetBank - group.rotation.z) * Math.min(1, delta * 7.4);

      // V28: animate only the nested visual body so close dogfight aircraft reveal top/underside/side
      // surfaces without touching authoritative heading, lock UI, collision or hit reactions.
      const readableRigV28 = group.getObjectByName("arcade-enemy-v19-readable-attitude-rig");
      if (!enemy.boss && readableRigV28 instanceof THREE.Group) {
        const readableV28 = skyDancerArcadeV28ReadableAttitude({
          kind: enemy.kind,
          maneuver: enemy.maneuver,
          depth: enemy.depth,
          relativeX: enemy.x - snapshot.playerX,
          relativeY: enemy.y - snapshot.playerY,
          lateralVelocity,
          verticalVelocity,
          lateralAcceleration,
          verticalAcceleration,
          id: enemy.id,
          runTimeSeconds: snapshot.runTimeSeconds,
        });
        const basePitchV19 = Number(readableRigV28.userData.arcadeEnemyPitchBiasV19 ?? 0);
        const baseYawV19 = Number(readableRigV28.userData.arcadeEnemyYawBiasV19 ?? 0);
        const baseRollV19 = Number(readableRigV28.userData.arcadeEnemyRollBiasV19 ?? 0);
        const attitudeResponseV28 = Math.min(1, delta * readableV28.response);
        readableRigV28.rotation.x += (basePitchV19 + readableV28.pitchOffset - readableRigV28.rotation.x) * attitudeResponseV28;
        readableRigV28.rotation.y += (baseYawV19 + readableV28.yawOffset - readableRigV28.rotation.y) * attitudeResponseV28;
        readableRigV28.rotation.z += (baseRollV19 + readableV28.rollOffset - readableRigV28.rotation.z) * attitudeResponseV28;
        readableRigV28.userData.arcadeEnemyReadableAttitudeV28 = true;
        readableRigV28.userData.arcadeEnemyRevealV28 = readableV28.reveal;
        group.userData.arcadeEnemyLogicalCollisionUnchangedV28 = true;
      }
      let missionRing = group.getObjectByName("arcade-world-break-target-ring");
      if (enemy.worldBreakTarget && !missionRing) {
        missionRing = createSkyDancerArcadeLockRing(0xffdf69);
        missionRing.name = "arcade-world-break-target-ring";
        missionRing.position.z = .16;
        missionRing.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const material = object.material as THREE.MeshBasicMaterial;
          material.opacity = .58;
        });
        group.add(missionRing);
      }
      if (missionRing) {
        missionRing.rotation.y = -group.rotation.y;
        missionRing.rotation.z = -group.rotation.z;
        missionRing.rotation.x = this.camera.rotation.x;
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 7 + enemy.id) * .06;
        setArcadeCuePointSizeV27(missionRing, skyDancerArcadeV27CuePointSize(enemy.kind, false, enemy.depth, "counterplay") * 1.18 * pulse);
      }
      let existingRing = group.getObjectByName("arcade-lock-ring");
      if (enemy.locked && !existingRing) {
        group.add(createSkyDancerArcadeLockRing(0xff3970));
        existingRing = group.getObjectByName("arcade-lock-ring");
      }
      if (enemy.locked && existingRing) {
        // V9.7.1: the point-sprite lock marker owns a fixed 64px footprint, so distance and aircraft bank cannot erase it.
        existingRing.position.z = -0.08;
      }
      if (!enemy.locked && existingRing) {
        group.remove(existingRing);
        this.disposeObject(existingRing);
      }
      const showAimCue = aimCueIdsV271.has(enemy.id);
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
      const showCounterplayCueV271 = counterplayCueIdsV271.has(enemy.id);
      let counterplayRing = group.getObjectByName("arcade-counterplay-ring");
      if (showCounterplayCueV271 && !counterplayRing) {
        const counterColor = enemy.counterplay === "armor-brace" ? 0xffd56a : enemy.counterplay === "evasive-roll" ? 0x6feeff : 0xe68cff;
        counterplayRing = createSkyDancerArcadeLockRing(counterColor);
        counterplayRing.name = "arcade-counterplay-ring";
        counterplayRing.userData.arcadeEnemyCounterplayV119 = enemy.counterplay;
        counterplayRing.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const material = object.material as THREE.MeshBasicMaterial;
          material.opacity = .42;
        });
        group.add(counterplayRing);
      } else if (!showCounterplayCueV271 && counterplayRing) {
        group.remove(counterplayRing);
        this.disposeObject(counterplayRing);
        counterplayRing = undefined;
      }
      if (counterplayRing) counterplayRing.position.z = .12;
      const lockRing = group.getObjectByName("arcade-lock-ring");
      for (const ring of [lockRing, aimRing, counterplayRing]) {
        if (!ring) continue;
        ring.rotation.y = -group.rotation.y;
        ring.rotation.z = -group.rotation.z;
        ring.rotation.x = this.camera.rotation.x;
      }
      if (lockRing) {
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
      const rivalIdentity = group.getObjectByName("arcade-rival-ace-identity");
      if (rivalIdentity) {
        const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 8.5 + enemy.id) * .08;
        rivalIdentity.scale.setScalar(pulse);
        rivalIdentity.rotation.z = -group.rotation.z * .35;
      }
      if (!enemy.boss) {
        const baseScale = typeof group.userData.arcadeCombatBaseScale === "number" ? group.userData.arcadeCombatBaseScale : group.scale.x;
        const closePresenceV27 = skyDancerArcadeV27EnemyPresenceScale(enemy.depth);
        const maneuverPresence = enemy.maneuver === "parallel" || enemy.maneuver === "close-bank" ? 1.02 : 1;
        const impactPulse = 1 + (reaction?.flash ?? 0) * .045;
        group.scale.setScalar(baseScale * maneuverPresence * closePresenceV27 * impactPulse);
        if (enemy.counterplay === "armor-brace") { group.scale.x *= 1.045; group.scale.y *= .96; }
        if (enemy.counterplay === "evasive-roll") group.rotation.z += Math.sin(snapshot.runTimeSeconds * 12 + enemy.id) * .065 * enemy.counterplayIntensity;
      }
      if (enemy.boss) {
        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        const baseScale = typeof group.userData.arcadeBaseScale === "number" ? group.userData.arcadeBaseScale : 1;
        group.scale.setScalar(baseScale * (1 + (reaction?.flash ?? 0) * .035));
        for (const weakPoint of group.getObjectsByProperty("name", "arcade-boss-weakpoint")) {
          const openPulse = enemy.weakpointOpen ? .42 : 0;
          weakPoint.scale.setScalar(.86 + Math.sin(snapshot.runTimeSeconds * (enemy.weakpointOpen ? 18 : 12) + enemy.id) * .12 + (1 - hpRatio) * .1 + openPulse);
          weakPoint.rotation.y += delta * (enemy.weakpointOpen ? 4.2 : 1.8);
          if (weakPoint instanceof THREE.Mesh && weakPoint.material instanceof THREE.MeshStandardMaterial) {
            weakPoint.material.emissive.setHex(enemy.weakpointOpen ? 0xff315e : 0x34121d);
            weakPoint.material.emissiveIntensity = enemy.weakpointOpen ? 2.8 : .75;
          }
        }
        const finalBossRig = group.getObjectByName("arcade-v405-final-boss-form");
        if (finalBossRig) {
          const formMotion = skyDancerArcadeV406FormMotion(enemy.finalBossForm, enemy.bossPhase, snapshot.runTimeSeconds);
          finalBossRig.scale.setScalar(formMotion.scale);
          finalBossRig.rotation.z += delta * formMotion.spinZ;
          finalBossRig.rotation.y += delta * formMotion.spinY;
          finalBossRig.rotation.x = formMotion.wobble;
        }
      }
    }
    for (const [id, group] of this.enemyGroups) {
      if (active.has(id)) continue;
      this.enemyGroups.delete(id);
      this.enemyHitReactions.delete(id);
      this.enemyVelocityHistory.delete(id);
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
        const color = enemyMissile
          ? 0xff8a2b
          : projectile.owner === "player-missile"
            ? snapshot.loadout === "missile-focus" ? 0x8cf6ff : snapshot.loadout === "gun-focus" ? 0xffe6c4 : 0xfff4de
            : snapshot.loadout === "gun-focus" ? 0xffdf72 : snapshot.loadout === "missile-focus" ? 0x9ddfff : 0xc8f8ff;
        const geometry = projectile.owner === "player-missile"
          ? new THREE.ConeGeometry(0.28, 1.58, 8)
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
        mesh.userData.arcadeLoadoutV117 = snapshot.loadout;
        this.projectileMeshes.set(projectile.id, mesh);
        this.projectileRoot.add(mesh);
      }
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, projectile.depth);
      mesh.position.set(projectile.x * 8.4 + course.x, 1.2 + projectile.y * 4.9 + course.y, course.z);
      mesh.rotation.y = course.yaw;
      mesh.rotation.x = course.pitch;
      const pulse = projectile.owner === "player-missile"
        ? (snapshot.loadout === "missile-focus" ? 1.55 : 1.35) + Math.sin(performance.now() * 0.025 + projectile.id) * 0.15
        : projectile.owner === "enemy"
          ? 1.1 + Math.sin(performance.now() * 0.018 + projectile.id) * 0.08
          : snapshot.loadout === "gun-focus" ? 1.16 : 1;
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
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, hazard.depth);
      const hazardLateral = hazard.x * 8.4;
      group.position.set(hazardLateral + course.x, 1.2 + hazard.y * 4.9 + course.y, course.z);
      if (group.userData.arcadeWorldAnchoredHazardV105 === true) {
        // V10.5: terrain and architecture are one part of the course world, never independent actors.
        const sceneryAttitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);
        group.rotation.set(sceneryAttitude.pitch, sceneryAttitude.yaw, sceneryAttitude.roll);
        // V10.5.2: keep the authored top/collision lane fixed and extend only foundations down to the actual floor.
        const surfaceLocalY = arcadeGroundSurfaceLocalYV1052(snapshot.stage, snapshot.distance, hazard.depth, hazardLateral);
        if (surfaceLocalY !== null) {
          const groundWorldY = course.y - snapshot.playerY * .16 + surfaceLocalY;
          extendArcadeGroundConnectorsV1052(group, groundWorldY - group.position.y);
        }
      } else if (group.userData.arcadeAtmosphericHazardV105 === true) {
        // Lightning translates with the weather hazard but does not tumble like a solid object.
        group.rotation.set(0, 0, 0);
      } else {
        // Only genuinely free objects (mine/debris) retain independent tumble.
        group.rotation.x += delta * 0.42;
        group.rotation.y += delta * 0.58;
      }
    }
    for (const [id, group] of this.hazardGroups) {
      if (active.has(id)) continue;
      this.hazardGroups.delete(id);
      this.hazardRoot.remove(group);
      this.disposeObject(group);
    }
  }

  private syncWorldBreakGates(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    const active = new Set<number>();
    for (const gate of snapshot.worldBreakGates) {
      active.add(gate.id);
      let group = this.worldBreakGateGroups.get(gate.id);
      if (!group) {
        group = new THREE.Group();
        group.name = `arcade-world-break-gate-${gate.index}`;
        const material = new THREE.MeshBasicMaterial({ color: 0x66ecff, transparent: true, opacity: .88, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        const outer = new THREE.Mesh(new THREE.TorusGeometry(5.15, .19, 7, 40), material);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(4.48, .055, 5, 36), material.clone());
        inner.rotation.z = Math.PI / 4;
        group.add(outer, inner);
        for (let markerIndex = 0; markerIndex < 4; markerIndex += 1) {
          const marker = new THREE.Mesh(new THREE.BoxGeometry(1.25, .12, .12), material.clone());
          const angle = markerIndex / 4 * Math.PI * 2;
          marker.position.set(Math.cos(angle) * 5.15, Math.sin(angle) * 5.15, 0);
          marker.rotation.z = angle + Math.PI / 2;
          group.add(marker);
        }
        this.worldBreakGateGroups.set(gate.id, group);
        this.worldBreakRoot.add(group);
      }
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, gate.depth);
      group.position.set(gate.x * 8.4 + course.x, 1.2 + gate.y * 4.9 + course.y, course.z);
      group.rotation.y = course.yaw;
      group.rotation.x = course.pitch;
      group.rotation.z += delta * .9;
      const pulse = gate.resolved ? (gate.success ? 1.16 : .88) : 1 + Math.sin(snapshot.runTimeSeconds * 8 + gate.index) * .035;
      group.scale.setScalar(pulse);
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.color.setHex(gate.resolved ? (gate.success ? 0x75ffab : 0xff647b) : 0x66ecff);
        object.material.opacity = gate.resolved ? .5 : .88;
      });
    }
    for (const [id, group] of this.worldBreakGateGroups) {
      if (active.has(id)) continue;
      this.worldBreakGateGroups.delete(id);
      this.worldBreakRoot.remove(group);
      this.disposeObject(group);
    }
  }

  private syncWorldBreakKnifeRun(snapshot: SkyDancerArcadeSnapshot): void {
    this.worldBreakKnifeRoot.visible = snapshot.worldBreakKnifeActive;
    if (!snapshot.worldBreakKnifeActive) return;
    if (this.worldBreakKnifeRoot.children.length === 0) {
      const material = new THREE.MeshBasicMaterial({ color: 0x72eeff, transparent: true, opacity: .38, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      for (let index = 0; index < 4; index += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, .075, 5, 28), material.clone());
        ring.userData.arcadeKnifeDepth = 22 + index * 18;
        this.worldBreakKnifeRoot.add(ring);
      }
    }
    this.worldBreakKnifeRoot.children.forEach((child, index) => {
      const depth = Number(child.userData.arcadeKnifeDepth ?? (22 + index * 18));
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, depth);
      child.position.set(course.x, 1.2 + snapshot.worldBreakKnifeCeilingY * 4.9 + course.y, course.z);
      child.rotation.set(course.pitch, course.yaw, 0);
      child.scale.setScalar(snapshot.worldBreakKnifeAltitudeOk ? 1.08 : .94);
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.color.setHex(snapshot.worldBreakKnifeAltitudeOk ? 0x76ffba : 0x72eeff);
        object.material.opacity = snapshot.worldBreakKnifeAltitudeOk ? .62 : .32;
      });
    });
  }

  private syncWorldBreakStormLane(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "storm-carrier"
      && snapshot.worldBreakStormActive
      && snapshot.worldBreakStormIndex >= 0;
    this.worldBreakStormRoot.visible = active;
    if (!active) return;
    if (this.worldBreakStormRoot.children.length === 0) {
      for (const side of [-1, 1]) {
        const barrier = new THREE.Group();
        barrier.name = side < 0 ? "arcade-world-break-storm-left" : "arcade-world-break-storm-right";
        const material = new THREE.MeshBasicMaterial({
          color: 0x8df3ff, transparent: true, opacity: .68, depthWrite: false,
          blending: THREE.AdditiveBlending, toneMapped: false,
        });
        for (let rod = 0; rod < 7; rod += 1) {
          const spark = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.55, .22), material.clone());
          spark.position.y = (rod - 3) * 1.72;
          spark.rotation.z = (rod % 2 === 0 ? 1 : -1) * .08;
          barrier.add(spark);
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(.24, 11.8, .32), material.clone());
        rail.material.opacity = .28;
        barrier.add(rail);
        this.worldBreakStormRoot.add(barrier);
      }
      const floorGuide = new THREE.Mesh(
        new THREE.BoxGeometry(1, .08, 1.25),
        new THREE.MeshBasicMaterial({ color: 0xffe46b, transparent: true, opacity: .55, depthWrite: false, toneMapped: false }),
      );
      floorGuide.name = "arcade-world-break-storm-guide";
      floorGuide.position.y = -5.7;
      this.worldBreakStormRoot.add(floorGuide);
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakStormDepth);
    this.worldBreakStormRoot.position.set(snapshot.worldBreakStormSafeX * 8.4 + course.x, 1.2 + course.y, course.z);
    this.worldBreakStormRoot.rotation.set(course.pitch, course.yaw, course.bank);
    const corridorHalfWidth = Math.max(3.8, snapshot.worldBreakStormWidth * 8.4);
    const left = this.worldBreakStormRoot.getObjectByName("arcade-world-break-storm-left");
    const right = this.worldBreakStormRoot.getObjectByName("arcade-world-break-storm-right");
    if (left) left.position.x = -corridorHalfWidth;
    if (right) right.position.x = corridorHalfWidth;
    const guide = this.worldBreakStormRoot.getObjectByName("arcade-world-break-storm-guide");
    if (guide) guide.scale.x = corridorHalfWidth * 1.7;
    const pulse = .54 + Math.sin(snapshot.runTimeSeconds * 18 + snapshot.worldBreakStormIndex) * .18;
    this.worldBreakStormRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      if (object.name === "arcade-world-break-storm-guide") object.material.opacity = .42 + pulse * .16;
      else object.material.opacity = Math.max(.2, Math.min(.88, pulse));
    });
  }

  private syncWorldBreakFortressBreach(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "desert-fortress" && snapshot.worldBreakFortressBreachActive;
    this.worldBreakFortressRoot.visible = active;
    if (!active) return;
    if (this.worldBreakFortressRoot.children.length === 0) {
      const stone = new THREE.MeshStandardMaterial({ color: 0x8d6940, roughness: .8, metalness: .08 });
      const glow = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .78, depthWrite: false, toneMapped: false });
      const shutterMaterial = new THREE.MeshBasicMaterial({ color: 0x4d3421, transparent: true, opacity: .88, depthWrite: true });
      const left = new THREE.Mesh(new THREE.BoxGeometry(12, 19, 3.2), stone.clone());
      const right = new THREE.Mesh(new THREE.BoxGeometry(12, 19, 3.2), stone.clone());
      const top = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 3.2), stone.clone());
      left.position.set(-11.5, 0, 0); right.position.set(11.5, 0, 0); top.position.set(0, 7.7, 0);
      this.worldBreakFortressRoot.add(left, right, top);
      for (const [x, y, sx, sy] of [[-6.2, 0, .22, 10], [6.2, 0, .22, 10], [0, 5.1, 12.6, .22], [0, -5.1, 12.6, .22]] as const) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, .4), glow.clone());
        edge.position.set(x, y, -1.9);
        edge.name = "arcade-world-break-fortress-edge";
        this.worldBreakFortressRoot.add(edge);
      }
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(11.8, 9.6, 2.2), shutterMaterial);
      shutter.name = "arcade-world-break-fortress-shutter";
      this.worldBreakFortressRoot.add(shutter);
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakFortressBreachDepth);
    this.worldBreakFortressRoot.position.set(
      snapshot.worldBreakFortressBreachX * 8.4 + course.x,
      1.2 + snapshot.worldBreakFortressBreachY * 4.9 + course.y,
      course.z,
    );
    this.worldBreakFortressRoot.rotation.set(course.pitch, course.yaw, course.bank);
    const shutter = this.worldBreakFortressRoot.getObjectByName("arcade-world-break-fortress-shutter");
    if (shutter instanceof THREE.Mesh && shutter.material instanceof THREE.MeshBasicMaterial) {
      shutter.visible = !snapshot.worldBreakFortressBreachOpen;
      shutter.material.opacity = snapshot.worldBreakFortressBreachResolved ? .25 : .88;
    }
    const edgeColor = snapshot.worldBreakFortressBreachOpen ? 0x75ffab : 0xffcf72;
    const edgeOpacity = snapshot.worldBreakFortressBreachResolved ? .34 : .72 + Math.sin(snapshot.runTimeSeconds * 12) * .12;
    for (const edge of this.worldBreakFortressRoot.getObjectsByProperty("name", "arcade-world-break-fortress-edge")) {
      if (!(edge instanceof THREE.Mesh) || !(edge.material instanceof THREE.MeshBasicMaterial)) continue;
      edge.material.color.setHex(edgeColor);
      edge.material.opacity = edgeOpacity;
    }
  }


  private syncWorldBreakIceCollapse(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "ice-cavern" && snapshot.worldBreakIceActive && snapshot.worldBreakIceIndex >= 0;
    this.worldBreakIceRoot.visible = active;
    if (!active) return;
    if (this.worldBreakIceRoot.children.length === 0) {
      const crystal = new THREE.MeshBasicMaterial({ color: 0xb7f5ff, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, .17, 5, 8), crystal.clone());
      ring.name = "arcade-world-break-ice-ring";
      ring.rotation.z = Math.PI / 8;
      this.worldBreakIceRoot.add(ring);
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * Math.PI * 2;
        const shard = new THREE.Mesh(new THREE.ConeGeometry(.38, 2.2, 4), crystal.clone());
        shard.position.set(Math.cos(angle) * 6.1, Math.sin(angle) * 5.4, 0);
        shard.rotation.z = angle - Math.PI / 2;
        shard.name = "arcade-world-break-ice-shard";
        this.worldBreakIceRoot.add(shard);
      }
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakIceDepth);
    this.worldBreakIceRoot.position.set(snapshot.worldBreakIceX * 8.4 + course.x, 1.2 + snapshot.worldBreakIceY * 4.9 + course.y, course.z);
    this.worldBreakIceRoot.rotation.set(course.pitch, course.yaw, course.bank);
    const sx = Math.max(.45, snapshot.worldBreakIceRadiusX / .72);
    const sy = Math.max(.45, snapshot.worldBreakIceRadiusY / .69);
    this.worldBreakIceRoot.scale.set(sx, sy, 1);
    const pulse = .58 + Math.sin(snapshot.runTimeSeconds * 14 + snapshot.worldBreakIceIndex) * .16;
    this.worldBreakIceRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      object.material.opacity = object.name === "arcade-world-break-ice-ring" ? .72 + pulse * .12 : .38 + pulse * .2;
    });
  }

  private syncWorldBreakFloatingPortals(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "floating-ruins" && (snapshot.worldBreakPortalActive || snapshot.worldBreakPortalChoiceIndex >= 0) && snapshot.worldBreakPortalDepth > -18;
    this.worldBreakPortalRoot.visible = active;
    if (!active) return;
    if (this.worldBreakPortalRoot.children.length === 0) {
      const colors = [0x76efff, 0xffdd73, 0xff6e96];
      for (let index = 0; index < 3; index += 1) {
        const group = new THREE.Group();
        group.name = `arcade-world-break-portal-${index}`;
        const material = new THREE.MeshBasicMaterial({ color: colors[index], transparent: true, opacity: .76, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        const outer = new THREE.Mesh(new THREE.TorusGeometry(4.25, .22, 7, 40), material.clone());
        const inner = new THREE.Mesh(new THREE.TorusGeometry(3.35, .07, 5, 32), material.clone());
        inner.rotation.z = Math.PI / 5;
        group.add(outer, inner);
        this.worldBreakPortalRoot.add(group);
      }
    }
    for (const portal of snapshot.worldBreakPortals) {
      const group = this.worldBreakPortalRoot.getObjectByName(`arcade-world-break-portal-${portal.index}`);
      if (!group) continue;
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, portal.depth);
      group.position.set(portal.x * 8.4 + course.x, 1.2 + portal.y * 4.9 + course.y, course.z);
      group.rotation.set(course.pitch, course.yaw, snapshot.runTimeSeconds * (portal.index === 1 ? -.34 : .34));
      const selected = portal.selected;
      const dismissed = snapshot.worldBreakPortalChoiceIndex >= 0 && !selected;
      group.visible = !dismissed;
      group.scale.setScalar(selected ? 1.35 : 1 + Math.sin(snapshot.runTimeSeconds * 5 + portal.index) * .04);
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.opacity = selected ? .95 : .66;
      });
    }
  }

  private syncWorldBreakNeonPursuit(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "night-metro" && snapshot.worldBreakPursuitActive && snapshot.worldBreakPursuitDepth > -14;
    this.worldBreakPursuitRoot.visible = active;
    if (!active) return;
    if (this.worldBreakPursuitRoot.children.length === 0) {
      const neon = new THREE.MeshBasicMaterial({ color: 0xff4fbb, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const cyan = new THREE.MeshBasicMaterial({ color: 0x41f2ff, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const body = new THREE.Mesh(new THREE.ConeGeometry(.54, 3.8, 5), neon.clone());
      body.rotation.x = Math.PI / 2;
      body.position.z = -.2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(4.8, .12, 1.2), cyan.clone());
      wing.rotation.x = -.12;
      const trail = new THREE.Mesh(new THREE.CylinderGeometry(.12, .42, 6.4, 6), neon.clone());
      trail.rotation.x = Math.PI / 2;
      trail.position.z = 3.9;
      trail.material.opacity = .38;
      this.worldBreakPursuitRoot.add(body, wing, trail);
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, Math.max(-12, snapshot.worldBreakPursuitDepth));
    this.worldBreakPursuitRoot.position.set(snapshot.worldBreakPursuitX * 8.4 + course.x, 1.2 + snapshot.worldBreakPursuitY * 4.9 + course.y, course.z);
    this.worldBreakPursuitRoot.rotation.set(course.pitch, course.yaw + Math.PI, course.bank + Math.sin(snapshot.runTimeSeconds * 7.5) * .08);
    const caughtPulse = snapshot.worldBreakPursuitCaught ? 1.35 : 1 + Math.sin(snapshot.runTimeSeconds * 12) * .08;
    this.worldBreakPursuitRoot.scale.setScalar(caughtPulse);
  }

  private syncWorldBreakMagmaPressure(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "volcano-core" && (snapshot.worldBreakMagmaActive || (snapshot.worldBreakMagmaResolved && snapshot.worldBreakMagmaPressure > .08));
    this.worldBreakMagmaRoot.visible = active;
    if (!active) return;
    if (this.worldBreakMagmaRoot.children.length === 0) {
      const heat = new THREE.MeshBasicMaterial({ color: 0xff6a22, transparent: true, opacity: .2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), heat.clone());
      wall.name = "arcade-world-break-magma-wall";
      this.worldBreakMagmaRoot.add(wall);
      for (let index = 0; index < 9; index += 1) {
        const jet = new THREE.Mesh(new THREE.ConeGeometry(.5 + (index % 3) * .15, 3.2 + (index % 2) * 1.4, 6), heat.clone());
        jet.position.set((index - 4) * 3.2, -2.1 + (index % 2) * .7, -.35);
        jet.name = "arcade-world-break-magma-jet";
        this.worldBreakMagmaRoot.add(jet);
      }
    }
    const pressure = snapshot.worldBreakMagmaPressure;
    this.worldBreakMagmaRoot.position.set(0, -5.7 + pressure * 2.2, 4.8 + pressure * .9);
    this.worldBreakMagmaRoot.scale.set(1 + pressure * .16, .72 + pressure * .48, 1);
    const pulse = .12 + pressure * .32 + Math.sin(snapshot.runTimeSeconds * 19) * .035;
    this.worldBreakMagmaRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      object.material.opacity = object.name === "arcade-world-break-magma-wall" ? Math.max(.08, pulse * .7) : Math.max(.1, pulse);
      object.material.color.setHex(snapshot.worldBreakMagmaHits > 0 ? 0xff4020 : 0xff7a24);
    });
  }

  private syncWorldBreakOrbitalAscent(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "orbital-ascent" && snapshot.worldBreakOrbitActive;
    this.worldBreakOrbitRoot.visible = active;
    if (!active) return;
    if (this.worldBreakOrbitRoot.children.length === 0) {
      const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x59ddff, transparent: true, opacity: .48, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      for (let index = 0; index < 6; index += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.7, .11, 6, 32), axisMaterial.clone());
        ring.name = "arcade-world-break-orbit-ring";
        ring.userData.depth = 14 + index * 14;
        this.worldBreakOrbitRoot.add(ring);
      }
      for (let index = 0; index < 10; index += 1) {
        const debris = new THREE.Mesh(new THREE.BoxGeometry(.55 + index % 3 * .22, .42, .7), axisMaterial.clone());
        debris.name = "arcade-world-break-orbit-debris";
        debris.userData.angle = index / 10 * Math.PI * 2;
        debris.userData.depth = 20 + (index % 5) * 15;
        this.worldBreakOrbitRoot.add(debris);
      }
    }
    const safeWorldX = snapshot.worldBreakOrbitSafeX * 8.4;
    for (const child of this.worldBreakOrbitRoot.children) {
      const depth = Number(child.userData.depth ?? 24);
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, depth);
      if (child.name === "arcade-world-break-orbit-ring") {
        child.position.set(safeWorldX + course.x, 2.3 + course.y, course.z);
        child.rotation.set(course.pitch, course.yaw, snapshot.runTimeSeconds * .35);
        const scale = .82 + snapshot.worldBreakOrbitAltitude / Math.max(1, snapshot.worldBreakOrbitTargetAltitude) * .24;
        child.scale.setScalar(scale);
      } else {
        const angle = Number(child.userData.angle ?? 0) + snapshot.runTimeSeconds * .42;
        child.position.set(safeWorldX + Math.cos(angle) * 7.2 + course.x, 2.3 + Math.sin(angle) * 5.4 + course.y, course.z);
        child.rotation.set(snapshot.runTimeSeconds * .7 + angle, snapshot.runTimeSeconds * .55, angle);
      }
      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        object.material.color.setHex(snapshot.worldBreakOrbitAligned ? 0x75ffca : 0x59ddff);
        object.material.opacity = child.name === "arcade-world-break-orbit-ring" ? (snapshot.worldBreakOrbitAligned ? .68 : .42) : .28;
      });
    }
  }

  private syncWorldBreakPrismReprise(snapshot: SkyDancerArcadeSnapshot): void {
    const active = snapshot.stage.id === "prism-citadel" && snapshot.worldBreakPrismActive && snapshot.worldBreakPrismIndex >= 0;
    this.worldBreakPrismRoot.visible = active;
    if (!active) return;
    if (this.worldBreakPrismRoot.children.length === 0) {
      const outerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .86, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const outer = new THREE.Mesh(new THREE.TorusGeometry(4.8, .2, 7, 42), outerMaterial.clone());
      outer.name = "arcade-world-break-prism-outer";
      const inner = new THREE.Mesh(new THREE.TorusGeometry(3.7, .07, 5, 36), outerMaterial.clone());
      inner.name = "arcade-world-break-prism-inner";
      inner.rotation.z = Math.PI / 4;
      this.worldBreakPrismRoot.add(outer, inner);
      for (let index = 0; index < 7; index += 1) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(.24, 1.35, 4), outerMaterial.clone());
        const angle = index / 7 * Math.PI * 2;
        shard.position.set(Math.cos(angle) * 5.7, Math.sin(angle) * 5.7, 0);
        shard.rotation.z = angle - Math.PI / 2;
        shard.name = "arcade-world-break-prism-shard";
        this.worldBreakPrismRoot.add(shard);
      }
    }
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, snapshot.worldBreakPrismDepth);
    this.worldBreakPrismRoot.position.set(snapshot.worldBreakPrismX * 8.4 + course.x, 1.2 + snapshot.worldBreakPrismY * 4.9 + course.y, course.z);
    this.worldBreakPrismRoot.rotation.set(course.pitch, course.yaw, snapshot.runTimeSeconds * .42 + snapshot.worldBreakPrismIndex * .28);
    const palette = [0x72eeff, 0xffd86b, 0xff77a6, 0x9cff8d, 0xa58cff, 0xff9a62, 0xffffff];
    const color = palette[snapshot.worldBreakPrismIndex % palette.length] ?? 0xffffff;
    const pulse = 1 + Math.sin(snapshot.runTimeSeconds * 10 + snapshot.worldBreakPrismIndex) * .055;
    this.worldBreakPrismRoot.scale.setScalar(Math.max(.55, snapshot.worldBreakPrismRadius / .7) * pulse);
    this.worldBreakPrismRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
      object.material.color.setHex(color);
      object.material.opacity = object.name === "arcade-world-break-prism-outer" ? .88 : .58;
    });
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
    const resolvedThisFrame = this.previousSnapshot.branchActive && !snapshot.branchActive && snapshot.branchSelection !== null;
    if (snapshot.branchActive) {
      this.branchGateExitTimer = .82;
      this.branchGateExitSelection = snapshot.branchSelection;
    } else if (resolvedThisFrame) {
      this.branchGateExitTimer = .82;
      this.branchGateExitSelection = snapshot.branchSelection;
    } else {
      this.branchGateExitTimer = Math.max(0, this.branchGateExitTimer - delta);
    }

    const exiting = !snapshot.branchActive && this.branchGateExitTimer > 0;
    const presenting = snapshot.branchActive || exiting;
    this.branchRoot.visible = presenting;
    if (!presenting) return;

    const exitProgress = exiting ? THREE.MathUtils.clamp(1 - this.branchGateExitTimer / .82, 0, 1) : 0;
    const gateDepth = exiting ? 82 - exitProgress * 34 : 82;
    const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, gateDepth);
    const selectedId = snapshot.branchSelection ?? this.branchGateExitSelection;
    this.branchRoot.children.forEach((child, index) => {
      const baseX = typeof child.userData.baseX === "number" ? child.userData.baseX : 0;
      const selected = selectedId === snapshot.branchOptions[index];
      const side = Math.abs(baseX) > .01 ? Math.sign(baseX) : index % 2 === 0 ? -1 : 1;
      const exitX = exiting && !selected ? side * exitProgress * 4.6 : 0;
      child.position.set(baseX + exitX + course.x, 1.2 + course.y + (exiting && selected ? exitProgress * .35 : 0), course.z);
      child.rotation.y = course.yaw;
      child.rotation.x = course.pitch;
      child.rotation.z += delta * (index % 2 === 0 ? 0.7 : -0.7) * (exiting ? 1.75 : 1);

      if (exiting) {
        child.scale.setScalar(selected ? 1.2 + exitProgress * 1.18 : Math.max(.2, .92 * (1 - exitProgress * .72)));
      } else {
        child.scale.setScalar(selected ? 1.2 + Math.sin(performance.now() * 0.012) * 0.08 : 0.92);
      }

      child.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshBasicMaterial)) return;
        if (!exiting) {
          object.material.opacity = .82;
          return;
        }
        const selectedAlpha = exitProgress < .3
          ? .82 + exitProgress * .4
          : Math.max(0, .94 * (1 - (exitProgress - .3) / .7));
        object.material.opacity = selected ? selectedAlpha : .82 * Math.pow(1 - exitProgress, 1.7);
      });
    });
    if (!snapshot.branchActive && this.branchGateExitTimer <= 0) this.branchGateExitSelection = null;
  }

  private applyEnemyHitReaction(impact: SkyDancerArcadeImpactSnapshot, snapshot: SkyDancerArcadeSnapshot, heavyCraft: boolean): void {
    if (impact.destroyed) return;
    const current = this.enemyHitReactions.get(impact.enemyId);
    const sideDelta = impact.x - snapshot.playerX;
    const verticalDelta = impact.y - snapshot.playerY;
    const side = Math.abs(sideDelta) > .04 ? Math.sign(sideDelta) : (impact.serial % 2 === 0 ? 1 : -1);
    const vertical = Math.abs(verticalDelta) > .04 ? Math.sign(verticalDelta) : (impact.serial % 3 === 0 ? -1 : 1);
    const mass = impact.boss ? .46 : heavyCraft ? .7 : 1;
    const doctrinePower = impact.reaction === "ripple-shock" ? 1.34 : impact.reaction === "twin-cannon" ? 1.2 : impact.reaction === "fusion-link" ? 1.28 : 1;
    const missilePower = (impact.missile ? 1 : .28) * doctrinePower;
    const impulse = {
      x: side * .28 * missilePower * mass,
      y: vertical * .17 * missilePower * mass,
      z: -(impact.missile ? 1.32 : .3) * mass * doctrinePower,
      pitch: vertical * (impact.missile ? .16 : .045) * mass * doctrinePower,
      roll: -side * (impact.missile ? .34 : .1) * mass * doctrinePower,
      flash: (impact.missile ? 1 : .72) * Math.min(1.25, doctrinePower),
      missile: impact.missile,
    };
    if (current) {
      current.x = THREE.MathUtils.clamp(current.x + impulse.x, -.62, .62);
      current.y = THREE.MathUtils.clamp(current.y + impulse.y, -.42, .42);
      current.z = THREE.MathUtils.clamp(current.z + impulse.z, -1.7, .1);
      current.pitch = THREE.MathUtils.clamp(current.pitch + impulse.pitch, -.3, .3);
      current.roll = THREE.MathUtils.clamp(current.roll + impulse.roll, -.58, .58);
      current.flash = Math.max(current.flash, impulse.flash);
      current.missile = current.missile || impact.missile;
    } else this.enemyHitReactions.set(impact.enemyId, impulse);
  }

  private syncEffects(snapshot: SkyDancerArcadeSnapshot): void {
    for (const impact of snapshot.impacts) {
      if (impact.serial <= this.previousSnapshot.hitSerial) continue;
      const course = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, impact.depth);
      const position = new THREE.Vector3(impact.x * 8.4 + course.x, 1.2 + impact.y * 4.9 + course.y, course.z);
      const heavyCraft = impact.kind === "bomber" || impact.kind === "gunship" || impact.kind === "missile-boat";
      this.applyEnemyHitReaction(impact, snapshot, heavyCraft);
      if (impact.armorBreak && impact.reaction !== "none") {
        this.presentation.emitRushAccent();
        this.cameraImpactKick = Math.max(this.cameraImpactKick, impact.reaction === "ripple-shock" ? .34 : .28);
      }
      if (impact.destroyed) {
        if (impact.boss) {
          this.presentation.emitBossExplosion(position, impact.missile);
          this.cameraImpactKick = Math.max(this.cameraImpactKick, .62);
          this.cameraShake = Math.min(1.2, this.cameraShake + .82);
          this.audio.tone(42, .5, .075, "sawtooth");
          this.audio.tone(84, .36, .045, "triangle");
          this.audio.tone(214, .2, .025, "square");
        } else if (heavyCraft) {
          this.presentation.emitHeavyExplosion(position, impact.missile);
          this.cameraImpactKick = Math.max(this.cameraImpactKick, impact.missile ? .4 : .28);
          this.cameraShake = Math.min(.82, this.cameraShake + (impact.missile ? .34 : .27));
          this.audio.tone(62, .25, .045, "sawtooth");
          this.audio.tone(176, .13, .02, "triangle");
        } else {
          this.presentation.emitSmallExplosion(position, impact.missile);
          this.cameraImpactKick = Math.max(this.cameraImpactKick, impact.missile ? .25 : .14);
          this.cameraShake = Math.min(.54, this.cameraShake + (impact.missile ? .17 : .12));
          this.audio.tone(112, .11, .022, "triangle");
        }
      } else if (impact.missile) {
        const strength = impact.boss ? 1.55 : heavyCraft ? 1.22 : .96;
        this.presentation.emitMissileImpact(position, strength);
        this.cameraImpactKick = Math.max(this.cameraImpactKick, .16 * strength);
        this.cameraShake = Math.min(.48, this.cameraShake + .15 * strength);
        this.audio.tone(126, .07, .018, "triangle");
        this.audio.tone(610, .045, .009, "square");
      } else {
        this.presentation.emitBurst(position, impact.boss ? .62 : heavyCraft ? .52 : .42);
        this.cameraShake = Math.min(.38, this.cameraShake + .055);
      }
    }
    if (snapshot.worldBreakStormSerial !== this.previousSnapshot.worldBreakStormSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .22);
      this.cameraShake = Math.min(.62, this.cameraShake + .18);
      this.audio.tone(snapshot.worldBreakStormMisses > this.previousSnapshot.worldBreakStormMisses ? 72 : 420, .16, .022, "square");
    }
    if (snapshot.worldBreakFortressSerial !== this.previousSnapshot.worldBreakFortressSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .34);
      this.cameraShake = Math.min(.72, this.cameraShake + .22);
      this.audio.tone(snapshot.worldBreakFortressBreachOpen ? 260 : 92, .22, .028, "sawtooth");
    }
    if (snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial && !snapshot.finalBossReactive) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .5);
      this.cameraShake = Math.min(.9, this.cameraShake + .28);
      this.audio.tone(74, .32, .05, "sawtooth");
      this.audio.tone(296, .2, .018, "triangle");
    }
    if (snapshot.stageEventSerial !== this.previousSnapshot.stageEventSerial) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .28);
      this.cameraShake = Math.min(.65, this.cameraShake + .16);
      this.audio.tone(196, .16, .022, "triangle");
      this.audio.tone(392, .11, .012, "square");
    }
    if (snapshot.armorBreaks > this.previousSnapshot.armorBreaks) {
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .22);
      this.audio.tone(98, .12, .032, "sawtooth");
      this.audio.tone(740, .07, .014, "square");
    }
    if (snapshot.formationBreaks > this.previousSnapshot.formationBreaks) {
      this.presentation.emitRushAccent();
      this.audio.tone(520, .1, .018, "triangle");
      this.audio.tone(780, .08, .012, "triangle");
    }
    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {
      this.playerDamageKick = 1;
      this.playerDamageSign = snapshot.damageSerial % 2 === 0 ? 1 : -1;
      this.cameraImpactKick = Math.max(this.cameraImpactKick, .3);
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

  private syncFinalBossPresentation(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.finalBossPresentationTimer = Math.max(0, this.finalBossPresentationTimer - delta);
    if (!snapshot.finalBossReactive || !snapshot.finalBossForm) {
      this.finalBossPresentationCue = null;
      return;
    }
    const arrival = snapshot.bossActive && !this.previousSnapshot.bossActive;
    const phaseShift = snapshot.bossPhaseSerial !== this.previousSnapshot.bossPhaseSerial;
    const defeat = snapshot.finalBossSerial !== this.previousSnapshot.finalBossSerial && snapshot.message?.startsWith("SOVEREIGN DOWN");
    const event = defeat ? "defeat" : phaseShift ? "phase" : arrival ? "arrival" : null;
    if (event) {
      const cue = skyDancerArcadeV406FinalBossCue(snapshot.finalBossForm, snapshot.bossPhase, event);
      if (cue) {
        this.finalBossPresentationCue = cue;
        this.finalBossPresentationTimer = cue.durationSeconds;
        this.finalBossPresentationDuration = cue.durationSeconds;
        this.cameraShake = Math.min(1, this.cameraShake + cue.cameraShake);
        this.cameraImpactKick = Math.max(this.cameraImpactKick, event === "defeat" ? .78 : .46 * cue.strength);
        this.presentation.emitRushAccent();
        this.audio.tone(cue.audioLowHz, event === "defeat" ? .48 : .31, .035 + cue.strength * .012, event === "defeat" ? "sawtooth" : "triangle");
        this.audio.tone(cue.audioHighHz, event === "defeat" ? .34 : .2, .018 + cue.strength * .007, event === "phase" ? "square" : "triangle");
        if (event === "defeat") this.audio.tone(cue.audioHighHz * .5, .72, .024, "sine");
      }
    }
    const envelope = this.finalBossPresentationTimer > 0
      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)
      : 0;
    if (envelope > 0 && this.finalBossPresentationCue) {
      this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, envelope * this.finalBossPresentationCue.bloomBoost);
      this.presentationFx.exposureBoost = Math.max(this.presentationFx.exposureBoost, envelope * this.finalBossPresentationCue.exposureBoost);
    }
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

  private syncWorldBreakRecovery(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.worldBreakRecoveryTimer = Math.max(0, this.worldBreakRecoveryTimer - delta);
    const newMessage = snapshot.message !== this.previousSnapshot.message;
    const recovery = skyDancerArcadeV403RecoveryFromMessage(snapshot.stage.id, snapshot.message);
    const baseCelebration = skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, snapshot.message);
    const resolvedRecovery = skyDancerArcadeV403ResolvedRecoveryFromMessage(snapshot.stage.id, snapshot.message);

    if (newMessage) {
      const comeback = resolvedRecovery
        ?? (baseCelebration && this.worldBreakRecoveryDebt
          ? skyDancerArcadeV403ComebackFromCelebration(snapshot.stage.id, baseCelebration)
          : null);
      if (recovery) {
        this.worldBreakRecoveryDebt = recovery.retryable;
        this.worldBreakRecoveryResolvedMessage = null;
        this.worldBreakRecoveryTimer = recovery.durationSeconds;
        this.worldBreakRecoveryDuration = recovery.durationSeconds;
        this.worldBreakRecoveryStrength = recovery.strength;
        this.worldBreakRecoveryPullback = recovery.cameraPullback;
        this.worldBreakRecoveryFovKick = recovery.cameraFovKick;
        this.worldBreakRecoveryMode = "failure";
        this.cameraShake = Math.min(.88, this.cameraShake + recovery.cameraShake);
        this.audio.tone(recovery.audioLowHz, .17, .02 + recovery.strength * .006, "sawtooth");
        this.audio.tone(recovery.audioHighHz, .09, .009 + recovery.strength * .004, "triangle");
      } else if (comeback) {
        this.worldBreakRecoveryDebt = false;
        this.worldBreakRecoveryResolvedMessage = snapshot.message;
        this.worldBreakRecoveryTimer = comeback.durationSeconds;
        this.worldBreakRecoveryDuration = comeback.durationSeconds;
        this.worldBreakRecoveryStrength = comeback.strength;
        this.worldBreakRecoveryPullback = comeback.cameraPullback;
        this.worldBreakRecoveryFovKick = comeback.cameraFovKick;
        this.worldBreakRecoveryMode = "comeback";
        this.cameraShake = Math.min(.9, this.cameraShake + comeback.cameraShake);
        this.presentation.emitRushAccent();
        this.audio.tone(comeback.audioLowHz, .2, .022, comeback.tone === "assault" ? "sawtooth" : "triangle");
        this.audio.tone(comeback.audioHighHz, .14, .018, "triangle");
        this.audio.tone(comeback.audioHighHz * 1.25, .08, .01, comeback.tone === "final" ? "square" : "triangle");
      } else if (baseCelebration) {
        this.worldBreakRecoveryDebt = false;
        this.worldBreakRecoveryResolvedMessage = null;
      } else {
        this.worldBreakRecoveryResolvedMessage = null;
      }
    }

    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
    if (worldBreakRecoveryEnvelope > 0 && this.worldBreakRecoveryMode === "comeback") {
      this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, worldBreakRecoveryEnvelope * .15 * this.worldBreakRecoveryStrength);
      this.presentationFx.exposureBoost = Math.max(this.presentationFx.exposureBoost, worldBreakRecoveryEnvelope * .052 * this.worldBreakRecoveryStrength);
    }
  }

  private syncWorldBreakCelebration(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.worldBreakCelebrationTimer = Math.max(0, this.worldBreakCelebrationTimer - delta);
    const celebration = snapshot.message === this.worldBreakRecoveryResolvedMessage
      ? null
      : skyDancerArcadeV402CelebrationFromMessage(snapshot.stage.id, snapshot.message);
    if (celebration && snapshot.message !== this.previousSnapshot.message) {
      this.worldBreakCelebrationTimer = celebration.durationSeconds;
      this.worldBreakCelebrationDuration = celebration.durationSeconds;
      this.worldBreakCelebrationStrength = celebration.strength;
      this.worldBreakCelebrationPullback = celebration.cameraPullback;
      this.worldBreakCelebrationFovKick = celebration.cameraFovKick;
      this.cameraShake = Math.min(.86, this.cameraShake + celebration.cameraShake);
      this.presentation.emitRushAccent();
      this.audio.tone(celebration.audioLowHz, .18 + celebration.strength * .035, .014 + celebration.strength * .006, celebration.tone === "assault" ? "sawtooth" : "triangle");
      this.audio.tone(celebration.audioHighHz, .11 + celebration.strength * .025, .01 + celebration.strength * .004, celebration.tone === "final" ? "square" : "triangle");
    }
    const worldBreakCelebrationEnvelope = this.worldBreakCelebrationTimer > 0
      ? Math.sin((1 - this.worldBreakCelebrationTimer / Math.max(.001, this.worldBreakCelebrationDuration)) * Math.PI)
      : 0;
    if (worldBreakCelebrationEnvelope > 0) {
      this.presentationFx.bloomBoost = Math.max(this.presentationFx.bloomBoost, worldBreakCelebrationEnvelope * .13 * this.worldBreakCelebrationStrength);
      this.presentationFx.exposureBoost = Math.max(this.presentationFx.exposureBoost, worldBreakCelebrationEnvelope * .045 * this.worldBreakCelebrationStrength);
    }
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
    if (snapshot.enemyCounterplaySerial !== this.previousSnapshot.enemyCounterplaySerial) {
      const frequency = snapshot.turboJammed ? 310 : snapshot.loadout === "gun-focus" ? 540 : 860;
      this.audio.tone(frequency, .105, .018, snapshot.turboJammed ? "sawtooth" : "square");
    }
    if (snapshot.loadoutReactionSerial !== this.previousSnapshot.loadoutReactionSerial) {
      const frequency = snapshot.loadout === "gun-focus" ? 980 : snapshot.loadout === "missile-focus" ? 640 : 760;
      this.audio.tone(frequency, .09, .02, snapshot.loadout === "missile-focus" ? "square" : "triangle");
      this.audio.tone(frequency * .5, .13, .018, "sawtooth");
    }
    if (snapshot.rivalAceSerial !== this.previousSnapshot.rivalAceSerial) {
      const playerWon = snapshot.rivalAceOutcome === "BROKEN" || snapshot.rivalAceOutcome === "OUTFLOWN";
      this.presentation.emitRushAccent();
      this.cameraImpactKick = Math.max(this.cameraImpactKick, playerWon ? .42 : .28);
      this.cameraShake = Math.min(.82, this.cameraShake + (playerWon ? .24 : .14));
      if (snapshot.rivalAceOutcome === "NONE") { this.audio.tone(126, .3, .032, "sawtooth"); this.audio.tone(504, .14, .018, "triangle"); }
      else if (playerWon) { this.audio.tone(220, .22, .03, "triangle"); this.audio.tone(880, .13, .02, "triangle"); }
      else { this.audio.tone(92, .26, .028, "sawtooth"); this.audio.tone(184, .13, .012, "square"); }
    }
    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }
    if (snapshot.bossMechanicSerial !== this.previousSnapshot.bossMechanicSerial) { this.audio.tone(96, .2, .035, "sawtooth"); this.audio.tone(288, .12, .018, "triangle"); }
    if (snapshot.stageSerial !== this.previousSnapshot.stageSerial) this.audio.tone(330, .18, .025, "triangle");
    if (snapshot.timelineSerial !== this.previousSnapshot.timelineSerial) { this.audio.tone(520, .12, .018, "triangle"); this.audio.tone(780, .08, .012, "square"); }
    if (snapshot.worldBreakGateSerial !== this.previousSnapshot.worldBreakGateSerial) {
      const clean = snapshot.worldBreakGateHits > this.previousSnapshot.worldBreakGateHits;
      this.audio.tone(clean ? 1040 : 180, clean ? .12 : .18, .026, clean ? "triangle" : "sawtooth");
      if (clean) this.audio.tone(1560, .07, .014, "triangle");
    }
    if (snapshot.worldBreakKnifeSerial !== this.previousSnapshot.worldBreakKnifeSerial) {
      const complete = snapshot.worldBreakKnifeComplete && !this.previousSnapshot.worldBreakKnifeComplete;
      this.audio.tone(complete ? 920 : 660, complete ? .2 : .07, complete ? .03 : .012, "triangle");
      if (complete) this.presentation.emitRushAccent();
    }
    if (snapshot.worldBreakTargetSerial !== this.previousSnapshot.worldBreakTargetSerial) {
      const destroyed = snapshot.worldBreakTargetHits > this.previousSnapshot.worldBreakTargetHits;
      this.audio.tone(destroyed ? 128 : 190, destroyed ? .24 : .13, destroyed ? .045 : .02, destroyed ? "sawtooth" : "triangle");
      if (destroyed) this.presentation.emitRushAccent();
    }
    if (snapshot.worldBreakIceSerial !== this.previousSnapshot.worldBreakIceSerial) {
      const clean = snapshot.worldBreakIceHits > this.previousSnapshot.worldBreakIceHits;
      this.audio.tone(clean ? 1160 : 150, clean ? .1 : .2, clean ? .024 : .04, clean ? "triangle" : "sawtooth");
      if (snapshot.worldBreakIcePerfect && !this.previousSnapshot.worldBreakIcePerfect) this.presentation.emitRushAccent();
    }
    if (snapshot.worldBreakPortalSerial !== this.previousSnapshot.worldBreakPortalSerial) {
      const frequency = snapshot.worldBreakPortalDoctrine === "DANGER" ? 250 : snapshot.worldBreakPortalDoctrine === "SCORE" ? 720 : 980;
      this.audio.tone(frequency, .2, .032, snapshot.worldBreakPortalDoctrine === "DANGER" ? "sawtooth" : "triangle");
      this.presentation.emitRushAccent();
    }
    const incoming = snapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    const wasIncoming = this.previousSnapshot.projectiles.some((projectile) => projectile.owner === "enemy" && projectile.depth > 2.2 && projectile.depth < 30);
    if (incoming && !wasIncoming) this.audio.tone(880, 0.12, 0.026, "square");
  }

  private updateCamera(snapshot: SkyDancerArcadeSnapshot, delta: number): void {
    this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);
    this.cameraImpactKick = Math.max(0, this.cameraImpactKick - delta * 3.8);
    const pose = arcadeCameraPose(snapshot.playerX, snapshot.playerY, this.camera.aspect, snapshot.turboActive);
    // V10.4: one owner for course motion.  Scenery/combat are already converted into the
    // player-local course frame, so the chase camera must not yaw/pitch/translate by the path again.
    const totalShake = this.cameraShake + this.presentationFx.cameraShake;
    const shakeX = Math.sin(snapshot.runTimeSeconds * 79) * totalShake * .25;
    const shakeY = Math.cos(snapshot.runTimeSeconds * 91) * totalShake * .18;

    // V10.3.8: position, sightline, FOV and roll all use frame-rate-independent exponential damping.
    // Previously position trailed the course while lookAt()/roll jumped directly to the new spline frame.
    // That mismatch made an otherwise coherent world read as if the background snapped or rotated separately,
    // especially on sharp turns and at stage handoffs where distance returns to zero.
    const xAlpha = 1 - Math.exp(-delta * 3.45);
    const yAlpha = 1 - Math.exp(-delta * 3.62);
    const zAlpha = 1 - Math.exp(-delta * 6.42);
    const fovAlpha = 1 - Math.exp(-delta * 7.45);
    const lookAlpha = 1 - Math.exp(-delta * 8.8);
    const rollAlpha = 1 - Math.exp(-delta * 9.2);

    const targetX = pose.x + shakeX;
    const targetY = pose.y + shakeY;
    const worldBreakBriefing = skyDancerArcadeV401WorldBreakBriefing(
      snapshot.stage.id,
      snapshot.stageProgress,
      snapshot.stageDurationSeconds,
      snapshot.status === "running" && !snapshot.bossActive,
    );
    const worldBreakAnticipation = worldBreakBriefing.active
      ? Math.sin(worldBreakBriefing.progress * Math.PI * .5)
      : 0;
    const worldBreakCelebrationEnvelope = this.worldBreakCelebrationTimer > 0
      ? Math.sin((1 - this.worldBreakCelebrationTimer / Math.max(.001, this.worldBreakCelebrationDuration)) * Math.PI)
      : 0;
    const worldBreakRecoveryEnvelope = this.worldBreakRecoveryTimer > 0
      ? Math.sin((1 - this.worldBreakRecoveryTimer / Math.max(.001, this.worldBreakRecoveryDuration)) * Math.PI)
      : 0;
    const finalBossEnvelope = this.finalBossPresentationTimer > 0 && this.finalBossPresentationCue
      ? Math.sin((1 - this.finalBossPresentationTimer / Math.max(.001, this.finalBossPresentationDuration)) * Math.PI)
      : 0;
    this.camera.position.x += (targetX - this.camera.position.x) * xAlpha;
    this.camera.position.y += (targetY - this.camera.position.y) * yAlpha;
    // V40.1 opens the frame slightly before a signature challenge; gameplay/world transforms remain untouched.
    this.camera.position.z += (pose.z + this.presentationFx.pullback + snapshot.timelineCameraPullback + this.cameraImpactKick + worldBreakAnticipation * .72 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationPullback + worldBreakRecoveryEnvelope * this.worldBreakRecoveryPullback + finalBossEnvelope * (this.finalBossPresentationCue?.cameraPullback ?? 0) - this.camera.position.z) * zAlpha;
    this.camera.fov += (pose.fov + this.presentationFx.fovKick + snapshot.timelineCameraFov + worldBreakAnticipation * 1.5 + worldBreakCelebrationEnvelope * this.worldBreakCelebrationFovKick + worldBreakRecoveryEnvelope * this.worldBreakRecoveryFovKick + finalBossEnvelope * (this.finalBossPresentationCue?.cameraFovKick ?? 0) - this.camera.fov) * fovAlpha;
    this.camera.updateProjectionMatrix();

    const desiredLookX = pose.lookX;
    const desiredLookY = pose.lookY + finalBossEnvelope * (this.finalBossPresentationCue?.lookLift ?? 0);
    const desiredLookZ = pose.lookZ - finalBossEnvelope * (this.finalBossPresentationCue?.strength ?? 0) * .72;
    this.cameraLookTarget.x += (desiredLookX - this.cameraLookTarget.x) * lookAlpha;
    this.cameraLookTarget.y += (desiredLookY - this.cameraLookTarget.y) * lookAlpha;
    this.cameraLookTarget.z += (desiredLookZ - this.cameraLookTarget.z) * lookAlpha;
    this.camera.lookAt(this.cameraLookTarget);

    // Course roll is already expressed by the single local scenery frame and by aircraft attitude.
    const desiredRoll = pose.roll + finalBossEnvelope * (this.finalBossPresentationCue?.cameraRoll ?? 0);
    this.cameraRoll += (desiredRoll - this.cameraRoll) * rollAlpha;
    this.camera.rotateZ(this.cameraRoll);
  }

  private scheduleResize(): void {
    if (this.disposed || this.resizeFrame) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.resize();
    });
  }

  private resize(force = false): void {
    const width = Math.max(1, Math.round(this.mount.clientWidth));
    const height = Math.max(1, Math.round(this.mount.clientHeight));
    // Safari may briefly report a collapsed visual viewport while browser chrome animates.
    // Preserve the last valid WebGL backing store instead of clearing it to 1x1 for one frame.
    if (width < 64 || height < 64) return;
    if (!force && width === this.renderWidth && height === this.renderHeight) return;
    this.renderWidth = width;
    this.renderHeight = height;
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
    for (const group of this.worldBreakGateGroups.values()) this.disposeObject(group);
    for (const child of this.worldBreakKnifeRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakStormRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakFortressRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakIceRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPortalRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPursuitRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakMagmaRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakOrbitRoot.children) this.disposeObject(child);
    for (const child of this.worldBreakPrismRoot.children) this.disposeObject(child);
    this.entityRoot.clear();
    this.projectileRoot.clear();
    this.hazardRoot.clear();
    this.worldBreakKnifeRoot.clear();
    this.worldBreakStormRoot.clear();
    this.worldBreakFortressRoot.clear();
    this.worldBreakIceRoot.clear();
    this.worldBreakPortalRoot.clear();
    this.worldBreakPursuitRoot.clear();
    this.worldBreakMagmaRoot.clear();
    this.worldBreakOrbitRoot.clear();
    this.worldBreakPrismRoot.clear();
    this.worldBreakRoot.clear();
    this.worldBreakRoot.add(this.worldBreakKnifeRoot, this.worldBreakStormRoot, this.worldBreakFortressRoot, this.worldBreakIceRoot, this.worldBreakPortalRoot);
    this.worldBreakRoot.add(this.worldBreakPursuitRoot, this.worldBreakMagmaRoot);
    this.worldBreakRoot.add(this.worldBreakOrbitRoot, this.worldBreakPrismRoot);
    this.enemyGroups.clear();
    this.projectileMeshes.clear();
    this.hazardGroups.clear();
    this.worldBreakGateGroups.clear();
  }

  private disposeObject(group: THREE.Object3D): void {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
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
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    if (this.contextRecoveryTimer) window.clearTimeout(this.contextRecoveryTimer);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.handleContextLost, false);
    this.renderer.domElement.removeEventListener("webglcontextrestored", this.handleContextRestored, false);
    this.audio.dispose();
    this.presentation.dispose();
    this.environment.dispose();
    this.v11Setpieces.dispose();
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
