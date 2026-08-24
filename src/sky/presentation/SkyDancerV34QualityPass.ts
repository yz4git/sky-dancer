import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { skyDancerBossPhaseV34 } from "../SkyDancerBossCombatV34";

const SKY_RADIUS = 1020;

/**
 * V34 product-quality pass.
 *
 * Keeps the V32 reference composition, but improves atmospheric depth and
 * material hierarchy, makes cumulus banks less slab-like, tones down combat
 * obstruction, and gives the boss a dedicated readable silhouette/core.
 */
export class SkyDancerV34QualityPass {
  private readonly skyGradient: THREE.Mesh;
  private worldTuned = false;
  private elapsed = 0;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    this.skyGradient = this.buildSkyGradient();
    runtime.scene.add(this.skyGradient);
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    this.elapsed += 1 / 60;
    this.skyGradient.position.set(snapshot.x, 0, snapshot.z);
    if (!this.worldTuned) {
      this.worldTuned = true;
      this.tuneGroundHierarchy();
      this.tuneCloudSilhouettes();
      this.tuneCityDepth();
    }
    this.enforceAtmosphericDepth();
    this.reduceMissileWarningObstruction();
    this.updateBossIdentity(snapshot);
  }

  private buildSkyGradient(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(SKY_RADIUS, 24, 12);
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const horizon = new THREE.Color(0x76b8d8);
    const zenith = new THREE.Color(0x225f9e);
    const lower = new THREE.Color(0x8cc3d8);
    const color = new THREE.Color();
    for (let index = 0; index < position.count; index += 1) {
      const normalizedY = THREE.MathUtils.clamp(position.getY(index) / SKY_RADIUS, -1, 1);
      if (normalizedY >= 0) color.lerpColors(horizon, zenith, Math.pow(normalizedY, 0.62));
      else color.lerpColors(horizon, lower, Math.min(1, -normalizedY * 1.7));
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "sky-dancer-v34-sky-gradient";
    mesh.frustumCulled = false;
    mesh.renderOrder = -1000;
    return mesh;
  }

  private tuneGroundHierarchy(): void {
    const fields = this.runtime.scene.getObjectByName("sky-dancer-v31-patchwork-fields");
    if (fields instanceof THREE.InstancedMesh && fields.material instanceof THREE.MeshBasicMaterial) {
      // Multiplying the existing instance palette by a neutral olive reduces the
      // board-game checkerboard effect without throwing away deterministic fields.
      fields.material.color.setHex(0xc4cfad);
      fields.material.fog = true;
      fields.material.needsUpdate = true;
    }
    const roads = this.runtime.scene.getObjectByName("sky-dancer-v31-road-network");
    if (roads instanceof THREE.InstancedMesh && roads.material instanceof THREE.MeshBasicMaterial) {
      roads.material.color.setHex(0xaebfbd);
      roads.material.fog = true;
      roads.material.needsUpdate = true;
    }
    const forest = this.runtime.scene.getObjectByName("sky-dancer-v31-forest-belts");
    if (forest instanceof THREE.InstancedMesh && forest.material instanceof THREE.MeshLambertMaterial) {
      forest.material.color.setHex(0xc2d0b9);
      forest.material.fog = true;
      forest.material.needsUpdate = true;
    }
  }

  private tuneCloudSilhouettes(): void {
    for (const name of ["sky-dancer-v32-polish-cloud-main", "sky-dancer-v32-polish-cloud-shade"] as const) {
      const cloud = this.runtime.scene.getObjectByName(name);
      if (!(cloud instanceof THREE.InstancedMesh)) continue;
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      for (let index = 0; index < cloud.count; index += 1) {
        cloud.getMatrixAt(index, matrix);
        matrix.decompose(position, quaternion, scale);
        scale.x *= 0.84;
        scale.y *= 1.28;
        scale.z *= 0.9;
        position.y += scale.y * 0.035;
        matrix.compose(position, quaternion, scale);
        cloud.setMatrixAt(index, matrix);
      }
      cloud.instanceMatrix.needsUpdate = true;
      if (cloud.material instanceof THREE.MeshBasicMaterial) {
        cloud.material.opacity = name.endsWith("shade") ? 0.2 : 0.8;
        cloud.material.depthWrite = false;
        cloud.material.fog = true;
        cloud.material.needsUpdate = true;
      }
    }
  }

  private tuneCityDepth(): void {
    const colors = new Map<string, number>([
      ["sky-dancer-v32-polish-city-low", 0x526c78],
      ["sky-dancer-v32-polish-city-mid", 0x6c828c],
      ["sky-dancer-v32-polish-city-high", 0x879ba3],
    ]);
    for (const [name, color] of colors) {
      const city = this.runtime.scene.getObjectByName(name);
      if (!(city instanceof THREE.InstancedMesh) || !(city.material instanceof THREE.MeshStandardMaterial)) continue;
      city.material.color.setHex(color);
      city.material.roughness = 0.76;
      city.material.metalness = 0.02;
      city.material.fog = true;
      city.material.needsUpdate = true;
    }
  }

  private enforceAtmosphericDepth(): void {
    const fog = this.runtime.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.color.setHex(0x83b5c8);
      fog.near = 500;
      fog.far = 1420;
    }
    this.runtime.scene.background = new THREE.Color(0x76b8d8);
  }

  private reduceMissileWarningObstruction(): void {
    const warning = this.runtime.camera.getObjectByName("sky-dancer-v18-missile-warning");
    if (!warning || !warning.visible) return;
    // V18 writes an absolute scale/opacity every frame before this pass, so this
    // multiplier is non-accumulating and safely leaves its threat logic intact.
    warning.scale.multiplyScalar(0.64);
    for (const child of warning.children) {
      if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshBasicMaterial)) continue;
      child.material.opacity *= 0.48;
    }
  }

  private ensureBossIdentity(group: THREE.Group): THREE.Group {
    const existing = group.getObjectByName("sky-dancer-v34-boss-identity");
    if (existing instanceof THREE.Group) return existing;
    const identity = new THREE.Group();
    identity.name = "sky-dancer-v34-boss-identity";

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xff665f,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), coreMaterial);
    core.name = "sky-dancer-v34-boss-core";
    core.position.set(0, 2.25, 1.35);

    const ringMaterial = coreMaterial.clone();
    ringMaterial.opacity = 0.34;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.065, 5, 28), ringMaterial);
    ring.name = "sky-dancer-v34-boss-core-ring";
    ring.position.copy(core.position);

    const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0xb33e58, transparent: true, opacity: 0.82, toneMapped: false });
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.72), bladeMaterial);
      blade.position.set(side * 4.15, 1.42, -0.25);
      blade.rotation.z = side * 0.22;
      blade.rotation.y = side * -0.08;
      identity.add(blade);
    }
    identity.add(core, ring);
    group.add(identity);
    return identity;
  }

  private updateBossIdentity(snapshot: CartArenaSessionSnapshot): void {
    for (const enemy of snapshot.enemies) {
      if (enemy.kind !== "boss") continue;
      const group = this.runtime.enemyGroups.get(enemy.id);
      if (!group) continue;
      const identity = this.ensureBossIdentity(group);
      identity.visible = enemy.alive;
      if (!enemy.alive) continue;

      const core = identity.getObjectByName("sky-dancer-v34-boss-core");
      const ring = identity.getObjectByName("sky-dancer-v34-boss-core-ring");
      const open = Boolean(enemy.weakPointExposed);
      const phase = skyDancerBossPhaseV34(enemy);
      const phasePulse = 0.5 + 0.5 * Math.sin(this.elapsed * (phase === 3 ? 9.5 : 6.2));
      if (core instanceof THREE.Mesh && core.material instanceof THREE.MeshBasicMaterial) {
        core.material.color.setHex(open ? 0x7ff8ff : phase === 3 ? 0xff405d : 0xff6a63);
        core.material.opacity = open ? 0.96 : 0.5 + phasePulse * 0.16;
        core.scale.setScalar(open ? 1.28 + phasePulse * 0.12 : 0.92 + phasePulse * 0.08);
      }
      if (ring instanceof THREE.Mesh && ring.material instanceof THREE.MeshBasicMaterial) {
        ring.material.color.setHex(open ? 0xa5fbff : 0xff7180);
        ring.material.opacity = open ? 0.66 : 0.24 + phasePulse * 0.12;
        ring.scale.setScalar(open ? 1.12 + phasePulse * 0.08 : 1);
        ring.rotation.z += open ? 0.045 : 0.015;
      }
    }
  }
}
