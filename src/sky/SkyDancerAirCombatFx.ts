import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";

export interface SkyDancerFxRuntime {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  playerVisual: THREE.Group;
  enemyGroups: Map<string, THREE.Group>;
  cameraShake: number;
  impactFlash: number;
  impactOverlayMaterial: THREE.MeshBasicMaterial;
  emitImpactSparks(position: THREE.Vector3, count: number): void;
}

interface AirBurst {
  root: THREE.Group;
  life: number;
  maxLife: number;
}

interface AnimatedFlame {
  mesh: THREE.Mesh;
  baseLength: number;
  baseOpacity: number;
  phase: number;
  material: THREE.MeshBasicMaterial;
}

export class SkyDancerAirCombatFx {
  private readonly runtime: SkyDancerFxRuntime;
  private readonly flames: AnimatedFlame[] = [];
  private readonly enemyAlive = new Map<string, boolean>();
  private readonly bursts: AirBurst[] = [];
  private readonly damageRoot = new THREE.Group();
  private readonly smokeMeshes: THREE.Mesh[] = [];
  private readonly fireMeshes: THREE.Mesh[] = [];
  private readonly damageRing: THREE.Mesh;
  private readonly edgeMaterial: THREE.ShaderMaterial;
  private readonly edgeOverlay: THREE.Mesh;
  private readonly warningMaterial: THREE.ShaderMaterial;
  private readonly warningOverlay: THREE.Mesh;
  private lastHitSerial = 0;
  private elapsed = 0;
  private damagePulse = 0;
  private smokeLife = 0;
  private hitRoll = 0;

  constructor(runtime: SkyDancerFxRuntime) {
    this.runtime = runtime;
    this.damageRoot.name = "sky-dancer-player-damage-fx";

    const smokeGeometry = new THREE.DodecahedronGeometry(0.32, 0);
    for (let index = 0; index < 9; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0x1a1719 : 0x30343a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const smoke = new THREE.Mesh(smokeGeometry, material);
      smoke.name = `sky-dancer-damage-smoke-${index}`;
      smoke.visible = false;
      this.smokeMeshes.push(smoke);
      this.damageRoot.add(smoke);
    }

    for (const x of [-0.44, 0.44]) {
      const outer = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 1.18, 7, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xff642d,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      outer.name = "sky-dancer-damage-fire";
      outer.rotation.x = -Math.PI / 2;
      outer.position.set(x, 0.42, -2.0);
      outer.visible = false;
      this.fireMeshes.push(outer);
      this.damageRoot.add(outer);
    }

    this.damageRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.08, 6, 28),
      new THREE.MeshBasicMaterial({
        color: 0xff9a56,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.damageRing.name = "sky-dancer-damage-shock-ring";
    this.damageRing.rotation.x = Math.PI / 2;
    this.damageRing.position.y = 0.62;
    this.damageRoot.add(this.damageRing);

    this.edgeMaterial = this.createEdgeMaterial(0xff2e35);
    this.edgeOverlay = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.43), this.edgeMaterial);
    this.edgeOverlay.name = "sky-dancer-missile-hit-vignette";
    this.edgeOverlay.position.z = -0.221;
    this.edgeOverlay.renderOrder = 10020;
    this.edgeOverlay.frustumCulled = false;
    runtime.camera.add(this.edgeOverlay);

    this.warningMaterial = this.createEdgeMaterial(0xffb429);
    this.warningOverlay = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.43), this.warningMaterial);
    this.warningOverlay.name = "sky-dancer-missile-lock-vignette";
    this.warningOverlay.position.z = -0.222;
    this.warningOverlay.renderOrder = 10019;
    this.warningOverlay.frustumCulled = false;
    runtime.camera.add(this.warningOverlay);
  }

  attachPlayerEffects(playerVisual: THREE.Group): void {
    if (this.damageRoot.parent !== playerVisual) playerVisual.add(this.damageRoot);
  }

  decorateFighter(fighter: THREE.Group, enemy: boolean, boss: boolean): void {
    const outerColor = enemy ? (boss ? 0xff543b : 0xffb34f) : 0x4fdcff;
    const innerColor = enemy ? 0xfff0ad : 0xe8fdff;
    const engineX = boss ? 0.48 : 0.34;
    for (const x of [-engineX, engineX]) {
      const outerOpacity = enemy ? 0.54 : 0.66;
      const outerMaterial = new THREE.MeshBasicMaterial({
        color: outerColor,
        transparent: true,
        opacity: outerOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const outer = new THREE.Mesh(new THREE.ConeGeometry(boss ? 0.28 : 0.22, boss ? 2.15 : 1.7, 8, 1, true), outerMaterial);
      outer.name = "sky-dancer-jet-flame";
      outer.rotation.x = -Math.PI / 2;
      outer.position.set(x, 0.35, boss ? -2.65 : -2.45);
      fighter.add(outer);
      this.flames.push({ mesh: outer, baseLength: outer.scale.z, baseOpacity: outerOpacity, phase: this.flames.length * 0.83, material: outerMaterial });

      const innerOpacity = enemy ? 0.68 : 0.9;
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: innerColor,
        transparent: true,
        opacity: innerOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const inner = new THREE.Mesh(new THREE.ConeGeometry(boss ? 0.11 : 0.09, boss ? 1.65 : 1.25, 7, 1, true), innerMaterial);
      inner.name = "sky-dancer-jet-core";
      inner.rotation.x = -Math.PI / 2;
      inner.position.set(x, 0.35, boss ? -2.38 : -2.18);
      fighter.add(inner);
      this.flames.push({ mesh: inner, baseLength: inner.scale.z, baseOpacity: innerOpacity, phase: this.flames.length * 0.61, material: innerMaterial });
    }

    const vaporMaterial = new THREE.MeshBasicMaterial({
      color: 0xeafaff,
      transparent: true,
      opacity: enemy ? 0.12 : 0.19,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const span = boss ? 2.65 : 2.2;
    const length = boss ? 5.2 : enemy ? 3.8 : 5.6;
    for (const x of [-span, span]) {
      const vapor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.16, length, 6, 1, true), vaporMaterial.clone());
      vapor.name = "sky-dancer-wingtip-vapor";
      vapor.rotation.x = Math.PI / 2;
      vapor.position.set(x, 0.28, -length * 0.53);
      fighter.add(vapor);
    }
  }

  decorateMissile(group: THREE.Group, boss: boolean): void {
    const smokeMaterial = new THREE.MeshBasicMaterial({
      color: boss ? 0xd6c5bd : 0xe8edf0,
      transparent: true,
      opacity: boss ? 0.46 : 0.38,
      depthWrite: false,
    });
    const smoke = new THREE.Mesh(new THREE.ConeGeometry(boss ? 0.24 : 0.18, boss ? 4.8 : 3.9, 7, 1, true), smokeMaterial);
    smoke.name = "sky-dancer-missile-smoke";
    smoke.rotation.x = -Math.PI / 2;
    smoke.position.z = boss ? -3.25 : -2.65;
    group.add(smoke);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(boss ? 0.42 : 0.34, 0.045, 5, 18),
      new THREE.MeshBasicMaterial({
        color: boss ? 0xff3152 : 0xffb632,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.name = "sky-dancer-missile-halo";
    halo.position.z = boss ? 0.8 : 0.64;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  }

  update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    this.elapsed += delta;
    this.damagePulse = Math.max(0, this.damagePulse - delta * 1.45);
    this.smokeLife = Math.max(0, this.smokeLife - delta);
    this.hitRoll *= Math.max(0, 1 - delta * 3.6);

    for (const flame of this.flames) {
      const flicker = 0.88 + Math.sin(this.elapsed * 24 + flame.phase) * 0.12 + Math.sin(this.elapsed * 43 + flame.phase * 2) * 0.06;
      flame.mesh.scale.z = flame.baseLength * flicker;
      flame.material.opacity = flame.baseOpacity * (0.92 + Math.sin(this.elapsed * 31 + flame.phase) * 0.08);
    }

    this.updateEnemyDestruction(snapshot);
    this.updateDamageFx();
    this.updateBursts(delta);

    const incomingStrength = missiles.incomingCount <= 0
      ? 0
      : Math.min(1, 0.38 + missiles.incomingCount * 0.12 + Math.sin(this.elapsed * 9.5) * 0.15);
    this.warningMaterial.uniforms.uOpacity.value = incomingStrength * 0.14;

    if (missiles.hitSerial > this.lastHitSerial) {
      this.lastHitSerial = missiles.hitSerial;
      this.triggerMissileHit(missiles);
    }
  }

  getCameraRollImpulse(): number {
    return this.hitRoll;
  }

  private triggerMissileHit(missiles: SkyDancerMissileState): void {
    const runtime = this.runtime;
    const hit = new THREE.Vector3(missiles.lastHitX, 1.1, missiles.lastHitZ);
    runtime.emitImpactSparks(hit, 30);
    runtime.cameraShake = Math.max(runtime.cameraShake, 1.24);
    runtime.impactFlash = Math.max(runtime.impactFlash, 1);
    runtime.impactOverlayMaterial.color.setHex(0xff4b34);
    this.damagePulse = 1;
    this.smokeLife = Math.max(this.smokeLife, 1.75);
    this.hitRoll = (missiles.hitSerial % 2 === 0 ? -1 : 1) * 0.21;
    this.spawnAirBurst(hit, 0xff6b35, 1.5);
  }

  private updateDamageFx(): void {
    const pulse = this.damagePulse;
    this.edgeMaterial.uniforms.uOpacity.value = pulse * (0.58 + Math.sin(this.elapsed * 34) * 0.08);
    this.damageRoot.visible = this.smokeLife > 0 || pulse > 0.001;

    const smokeRatio = Math.min(1, this.smokeLife / 1.75);
    for (let index = 0; index < this.smokeMeshes.length; index += 1) {
      const smoke = this.smokeMeshes[index];
      const phase = (this.elapsed * (0.72 + index * 0.027) + index * 0.13) % 1;
      smoke.visible = this.smokeLife > 0;
      smoke.position.set(
        Math.sin(index * 2.3 + this.elapsed * 2) * (0.22 + phase * 0.48),
        0.5 + phase * 1.3,
        -1.9 - phase * (3.4 + index * 0.12),
      );
      const size = (0.45 + phase * 1.18) * (0.7 + smokeRatio * 0.45);
      smoke.scale.set(size * 1.12, size, size * 1.35);
      const material = smoke.material as THREE.MeshBasicMaterial;
      material.opacity = smokeRatio * (1 - phase) * 0.34;
      smoke.rotation.set(index * 0.31, this.elapsed * 0.6 + index, index * 0.17);
    }

    for (let index = 0; index < this.fireMeshes.length; index += 1) {
      const fire = this.fireMeshes[index];
      fire.visible = this.smokeLife > 0.45;
      const material = fire.material as THREE.MeshBasicMaterial;
      material.opacity = Math.min(0.82, smokeRatio * (0.52 + Math.sin(this.elapsed * 35 + index) * 0.18));
      fire.scale.setScalar(0.8 + Math.sin(this.elapsed * 29 + index * 2.1) * 0.18);
    }

    const ringMaterial = this.damageRing.material as THREE.MeshBasicMaterial;
    ringMaterial.opacity = pulse * 0.74;
    this.damageRing.scale.setScalar(1 + (1 - pulse) * 2.8);
  }

  private updateEnemyDestruction(snapshot: CartArenaSessionSnapshot): void {
    for (const enemy of snapshot.enemies) {
      const previous = this.enemyAlive.get(enemy.id);
      if (previous === true && !enemy.alive) {
        const group = this.runtime.enemyGroups.get(enemy.id);
        if (group) {
          const position = group.position.clone();
          position.y = Math.max(1.1, position.y + 0.4);
          this.spawnAirBurst(position, enemy.kind === "boss" ? 0xff4055 : 0xffa43b, enemy.kind === "boss" ? 2.3 : 1.25);
        }
      }
      this.enemyAlive.set(enemy.id, enemy.alive);
    }
  }

  private spawnAirBurst(position: THREE.Vector3, color: number, scale: number): void {
    const root = new THREE.Group();
    root.position.copy(position);
    root.name = "sky-dancer-air-explosion";
    const bright = new THREE.MeshBasicMaterial({
      color: 0xfff4c7,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const hot = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const smoke = new THREE.MeshBasicMaterial({ color: 0x34343a, transparent: true, opacity: 0.48, depthWrite: false });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.82 * scale, 0), bright);
    core.name = "air-burst-core";
    root.add(core);
    const hotShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.28 * scale, 1), hot);
    hotShell.name = "air-burst-hot";
    root.add(hotShell);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35 * scale, 0.1 * scale, 6, 28), bright.clone());
    ring.name = "air-burst-ring";
    ring.rotation.x = Math.PI / 2;
    root.add(ring);

    for (let index = 0; index < 7; index += 1) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 * scale, 0), smoke.clone());
      puff.name = "air-burst-smoke";
      const angle = index / 7 * Math.PI * 2;
      puff.position.set(Math.cos(angle) * scale * 0.72, (index % 3 - 1) * 0.24 * scale, Math.sin(angle) * scale * 0.72);
      puff.userData.airBurstIndex = index;
      root.add(puff);
    }

    this.runtime.scene.add(root);
    this.bursts.push({ root, life: 0.72, maxLife: 0.72 });
  }

  private updateBursts(delta: number): void {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index];
      burst.life -= delta;
      const ratio = Math.max(0, burst.life / burst.maxLife);
      const progress = 1 - ratio;
      const core = burst.root.getObjectByName("air-burst-core") as THREE.Mesh | undefined;
      const shell = burst.root.getObjectByName("air-burst-hot") as THREE.Mesh | undefined;
      const ring = burst.root.getObjectByName("air-burst-ring") as THREE.Mesh | undefined;
      if (core) {
        core.scale.setScalar(0.7 + progress * 2.4);
        (core.material as THREE.MeshBasicMaterial).opacity = ratio * 0.95;
      }
      if (shell) {
        shell.scale.setScalar(0.65 + progress * 2.1);
        (shell.material as THREE.MeshBasicMaterial).opacity = ratio * 0.72;
      }
      if (ring) {
        ring.scale.setScalar(0.8 + progress * 3.4);
        (ring.material as THREE.MeshBasicMaterial).opacity = ratio * 0.78;
      }
      burst.root.children.forEach((object) => {
        if (!(object instanceof THREE.Mesh) || object.name !== "air-burst-smoke") return;
        const puffIndex = Number(object.userData.airBurstIndex ?? 0);
        const angle = puffIndex / 7 * Math.PI * 2;
        object.position.x += Math.cos(angle) * delta * 3.1;
        object.position.z += Math.sin(angle) * delta * 3.1;
        object.position.y += delta * (1.2 + (puffIndex % 3) * 0.3);
        object.scale.setScalar(0.9 + progress * 1.75);
        (object.material as THREE.MeshBasicMaterial).opacity = ratio * 0.38;
      });

      if (burst.life <= 0) {
        this.runtime.scene.remove(burst.root);
        burst.root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
        this.bursts.splice(index, 1);
      }
    }
  }

  private createEdgeMaterial(color: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          vec2 p = abs(vUv - 0.5) * 2.0;
          float edge = smoothstep(0.38, 1.0, max(p.x, p.y));
          float corner = smoothstep(0.58, 1.22, length(p));
          float alpha = clamp(max(edge * 0.88, corner * 0.62), 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
  }
}
