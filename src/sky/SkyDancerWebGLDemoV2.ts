import * as THREE from "three";
import type { CartArenaSession } from "../cart/CartArenaSession";
import type { CartRogueSnapshotHandler } from "../cart/CartRogueDemo";
import { SkyDancerWebGLDemo } from "./SkyDancerWebGLDemo";
import {
  getSkyDancerPlayerWeaponState,
  installSkyDancerPlayerWeapons,
  requestSkyDancerPlayerMissile,
} from "./SkyDancerPlayerWeapons";

interface WeaponVisualRuntime {
  scene: THREE.Scene;
  session: CartArenaSession;
  playerVisual: THREE.Group;
  updateVisuals(delta: number): void;
}

export class SkyDancerWebGLDemoV2 extends SkyDancerWebGLDemo {
  private readonly playerMissileRoot = new THREE.Group();
  private readonly playerMissileGroups = new Map<number, THREE.Group>();
  private readonly runtimeV2: WeaponVisualRuntime;
  private muzzleFlashLife = 0;
  private readonly muzzleFlash: THREE.PointLight;

  constructor(
    mount: HTMLElement,
    onSnapshot: CartRogueSnapshotHandler,
    onRuntimeFailure: (message: string, error: unknown) => void,
  ) {
    super(mount, onSnapshot, onRuntimeFailure);
    installSkyDancerPlayerWeapons();
    this.runtimeV2 = this as unknown as WeaponVisualRuntime;
    this.playerMissileRoot.name = "sky-dancer-player-missile-root";
    this.runtimeV2.scene.add(this.playerMissileRoot);

    this.muzzleFlash = new THREE.PointLight(0x8defff, 0, 12, 2);
    this.muzzleFlash.position.set(0, 0.4, 2.5);
    this.runtimeV2.playerVisual.add(this.muzzleFlash);

    const previousUpdate = this.runtimeV2.updateVisuals.bind(this);
    this.runtimeV2.updateVisuals = (delta: number) => {
      previousUpdate(delta);
      this.updatePlayerMissiles(delta);
    };
  }

  fireMissile(): void {
    if (requestSkyDancerPlayerMissile(this.runtimeV2.session)) {
      this.muzzleFlashLife = 0.085;
      this.muzzleFlash.intensity = 5.6;
    }
  }

  private updatePlayerMissiles(delta: number): void {
    const state = getSkyDancerPlayerWeaponState(this.runtimeV2.session);
    const active = new Set<number>();
    this.muzzleFlashLife = Math.max(0, this.muzzleFlashLife - delta);
    this.muzzleFlash.intensity += ((this.muzzleFlashLife > 0 ? 5.6 : 0) - this.muzzleFlash.intensity) * Math.min(1, delta * 24);

    for (const missile of state.missiles) {
      active.add(missile.id);
      let group = this.playerMissileGroups.get(missile.id);
      if (!group) {
        group = this.buildPlayerMissile();
        this.playerMissileGroups.set(missile.id, group);
        this.playerMissileRoot.add(group);
      }
      group.visible = true;
      group.position.set(missile.x, 1.12 + Math.sin(missile.id * 0.43 + performance.now() * 0.008) * 0.035, missile.z);
      group.rotation.y = missile.heading;
      const lifeRatio = Math.max(0, Math.min(1, missile.life / missile.maxLife));
      group.scale.setScalar(0.94 + lifeRatio * 0.08);
      const tail = group.getObjectByName("player-missile-tail");
      if (tail instanceof THREE.Mesh && tail.material instanceof THREE.MeshBasicMaterial) {
        tail.material.opacity = 0.62 + Math.sin(performance.now() * 0.028 + missile.id) * 0.17;
        tail.scale.z = 0.9 + Math.sin(performance.now() * 0.035 + missile.id) * 0.13;
      }
      const lock = group.getObjectByName("player-missile-lock-ring");
      if (lock instanceof THREE.Mesh) {
        lock.visible = Boolean(missile.targetEnemyId);
        lock.rotation.z += delta * 4.2;
      }
    }

    for (const [id, group] of this.playerMissileGroups) {
      if (active.has(id)) continue;
      this.playerMissileGroups.delete(id);
      group.removeFromParent();
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    }
  }

  private buildPlayerMissile(): THREE.Group {
    const root = new THREE.Group();
    root.name = "sky-dancer-player-missile";

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.12, 1.08, 8),
      new THREE.MeshStandardMaterial({
        color: 0xe9f7fa,
        roughness: 0.28,
        metalness: 0.44,
        flatShading: true,
        emissive: 0x123e4d,
        emissiveIntensity: 0.18,
      }),
    );
    body.geometry.rotateX(Math.PI / 2);

    const noseGeometry = new THREE.ConeGeometry(0.12, 0.38, 8);
    noseGeometry.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(
      noseGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x6be8ff,
        roughness: 0.24,
        metalness: 0.25,
        emissive: 0x1a91b8,
        emissiveIntensity: 0.72,
        flatShading: true,
      }),
    );
    nose.position.z = 0.72;

    const finMaterial = new THREE.MeshStandardMaterial({ color: 0x23546a, roughness: 0.54, metalness: 0.18, flatShading: true });
    for (const rotation of [0, Math.PI / 2]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.31), finMaterial.clone());
      fin.position.z = -0.36;
      fin.rotation.z = rotation;
      root.add(fin);
    }

    const tailGeometry = new THREE.CylinderGeometry(0.025, 0.11, 1.35, 8, 1, true);
    tailGeometry.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(
      tailGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x5ce9ff,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    tail.name = "player-missile-tail";
    tail.position.z = -1.05;

    const coreGeometry = new THREE.CylinderGeometry(0.018, 0.045, 0.9, 7, 1, true);
    coreGeometry.rotateX(-Math.PI / 2);
    const core = new THREE.Mesh(
      coreGeometry,
      new THREE.MeshBasicMaterial({ color: 0xf0ffff, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    core.position.z = -0.85;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.018, 4, 18),
      new THREE.MeshBasicMaterial({ color: 0x8ff3ff, transparent: true, opacity: 0.54, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    ring.name = "player-missile-lock-ring";
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.04;

    root.add(body, nose, tail, core, ring);
    return root;
  }
}
