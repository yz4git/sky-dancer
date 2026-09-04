import * as THREE from "three";
import type { CartArenaSessionSnapshot, CartEnemySnapshot } from "../cart/CartArenaSession";
import type { SkyDancerMissileState } from "./SkyDancerFlightCombat";
import { SkyDancerAirCombatFxV17 } from "./SkyDancerAirCombatFxV17";
import type { SkyDancerFxRuntime } from "./SkyDancerAirCombatFxV2";
import { getSkyDancerPlayerWeaponState } from "./SkyDancerPlayerWeapons";
import { getSkyDancerEnemyAltitudeMetersV43 } from "./SkyDancerVerticalFlightV43";

interface VerticalState {
  y: number;
  verticalSpeed: number;
  phase: number;
}


interface RaidImpactBurst {
  root: THREE.Group;
  core: THREE.Mesh;
  hot: THREE.Mesh;
  rings: THREE.Mesh[];
  debris: THREE.Mesh[];
  light: THREE.PointLight;
  life: number;
  maxLife: number;
  strength: number;
  destroyed: boolean;
}

const STREAMED_SCENERY_DROP = 3.2;
const HIGHRISE_SCALE = 0.9;
const FLIGHT_DEBUG_KEY = "__skyDancerGetFlightDebug";

export class SkyDancerAirCombatFxV18 extends SkyDancerAirCombatFxV17 {
  private readonly runtimeV18: SkyDancerFxRuntime;
  private readonly enemyVertical = new Map<string, VerticalState>();
  private readonly missileWarningRoot = new THREE.Group();
  private readonly missileWarningRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly raidImpactBursts: RaidImpactBurst[] = [];
  private lastPlayerHitSerial = 0;
  private builtV18 = false;
  private elapsedV18 = 0;

  constructor(runtime: SkyDancerFxRuntime) {
    super(runtime);
    this.runtimeV18 = runtime;
    this.missileWarningRoot.name = "sky-dancer-v18-missile-warning";
    this.missileWarningRoot.position.set(0, 0.03, -0.62);
    this.missileWarningRoot.visible = false;

    const warningMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb84d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    // This legacy camera-space cue used to fill most of a phone viewport
    // under the newer SKY RAID chase camera. Keep it as a compact threat halo
    // around the aircraft; the top HUD now carries the explicit warning text.
    this.missileWarningRing = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.0055, 4, 24), warningMaterial);
    this.missileWarningRing.renderOrder = 1200;
    this.missileWarningRoot.add(this.missileWarningRing);
    for (let index = 0; index < 4; index += 1) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.007, 0.004), warningMaterial.clone());
      const angle = index * Math.PI * 0.5;
      marker.position.set(Math.cos(angle) * 0.108, Math.sin(angle) * 0.108, 0);
      marker.rotation.z = angle;
      marker.renderOrder = 1200;
      this.missileWarningRoot.add(marker);
    }
    runtime.camera.add(this.missileWarningRoot);
  }

  override update(snapshot: CartArenaSessionSnapshot, missiles: SkyDancerMissileState, delta: number): void {
    super.update(snapshot, missiles, delta);
    this.elapsedV18 += delta;
    if (!this.builtV18) {
      this.builtV18 = true;
      this.correctStreamedCityClearance();
    }
    this.updateEnemyThreeDimensionalFlight(snapshot.enemies, snapshot, delta);
    this.updateMissileWarning(missiles, delta);
    this.detectPlayerWeaponImpact();
    this.updateRaidImpactBursts(delta);
    this.publishFlightDebug(snapshot);
  }

  private correctStreamedCityClearance(): void {
    const root = this.runtimeV18.scene.getObjectByName("sky-dancer-q16-streamed-scenery");
    if (!root) return;
    // V17 lowered fixed scenery but the streamed V16 root was not matched by
    // its name filter. Align it with the same 88m presentation flight level.
    root.position.y -= STREAMED_SCENERY_DROP;

    const buildings = root.getObjectByName("sky-dancer-q16-city-blocks");
    if (buildings instanceof THREE.InstancedMesh) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      for (let index = 0; index < buildings.count; index += 1) {
        buildings.getMatrixAt(index, matrix);
        matrix.decompose(position, quaternion, scale);
        const oldHeight = scale.y;
        const newHeight = oldHeight * HIGHRISE_SCALE;
        position.y -= (oldHeight - newHeight) * 0.5;
        scale.y = newHeight;
        matrix.compose(position, quaternion, scale);
        buildings.setMatrixAt(index, matrix);
      }
      buildings.instanceMatrix.needsUpdate = true;
    }

    const roofs = root.getObjectByName("sky-dancer-q16-city-roofs");
    if (roofs instanceof THREE.InstancedMesh) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      for (let index = 0; index < roofs.count; index += 1) {
        roofs.getMatrixAt(index, matrix);
        matrix.decompose(position, quaternion, scale);
        position.y -= 1.15;
        matrix.compose(position, quaternion, scale);
        roofs.setMatrixAt(index, matrix);
      }
      roofs.instanceMatrix.needsUpdate = true;
    }
  }

  private updateEnemyThreeDimensionalFlight(
    enemies: readonly CartEnemySnapshot[],
    snapshot: CartArenaSessionSnapshot,
    delta: number,
  ): void {
    const active = new Set<string>();
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const group = this.runtimeV18.enemyGroups.get(enemy.id);
      if (!group) continue;
      active.add(enemy.id);
      let state = this.enemyVertical.get(enemy.id);
      if (!state) {
        let hash = 0;
        for (let index = 0; index < enemy.id.length; index += 1) hash = (hash * 31 + enemy.id.charCodeAt(index)) >>> 0;
        state = { y: group.position.y, verticalSpeed: 0, phase: (hash % 1000) / 1000 * Math.PI * 2 };
        this.enemyVertical.set(enemy.id, state);
      }

      const distance = Math.hypot(enemy.x - snapshot.x, enemy.z - snapshot.z);
      const side = Math.sin(state.phase) >= 0 ? 1 : -1;
      const baseY = enemy.kind === "boss" ? 1.9 : enemy.kind === "heavy" ? 1.48 : 1.22;
      const cruiseWave = Math.sin(this.elapsedV18 * 0.92 + state.phase) * (enemy.kind === "boss" ? 0.24 : 0.42);
      const closeManeuver = distance < 28
        ? (1 - distance / 28) * (enemy.kind === "heavy" || enemy.kind === "boss" ? 0.72 : 1.25) * side
        : 0;
      const breakClimb = distance < 17 ? (17 - distance) * 0.055 : 0;
      const targetY = baseY + cruiseWave + closeManeuver + breakClimb;
      const previousY = state.y;
      const blend = 1 - Math.exp(-delta * 2.3);
      state.y += (targetY - state.y) * blend;
      state.verticalSpeed = (state.y - previousY) / Math.max(0.001, delta);
      group.position.y = state.y;

      const pitchFromClimb = THREE.MathUtils.clamp(-state.verticalSpeed * 0.045, -0.22, 0.22);
      group.rotation.x += (pitchFromClimb - group.rotation.x) * (1 - Math.exp(-delta * 4.1));
      const maneuverBank = THREE.MathUtils.clamp(side * closeManeuver * 0.42, -0.55, 0.55);
      if (Math.abs(maneuverBank) > Math.abs(group.rotation.z) * 0.45) {
        group.rotation.z += (maneuverBank - group.rotation.z) * (1 - Math.exp(-delta * 3.6));
      }
    }
    for (const id of this.enemyVertical.keys()) if (!active.has(id)) this.enemyVertical.delete(id);
  }

  private updateMissileWarning(missiles: SkyDancerMissileState, delta: number): void {
    let nearest = Number.POSITIVE_INFINITY;
    for (const missile of missiles.missiles) nearest = Math.min(nearest, missile.distanceToPlayer);
    const threat = Number.isFinite(nearest) && nearest < 30;
    this.missileWarningRoot.visible = threat;
    if (!threat) return;

    const strength = THREE.MathUtils.clamp((30 - nearest) / 25, 0.12, 1);
    const urgent = nearest < 12;
    const color = urgent ? 0xff554d : 0xffbd55;
    const pulse = 0.85 + Math.sin(this.elapsedV18 * (urgent ? 19 : 11)) * 0.15;
    this.missileWarningRoot.rotation.z += delta * (urgent ? 0.72 : 0.38);
    this.missileWarningRoot.scale.setScalar(0.92 + strength * 0.12 + pulse * 0.025);
    for (const child of this.missileWarningRoot.children) {
      if (!(child instanceof THREE.Mesh)) continue;
      const material = child.material as THREE.MeshBasicMaterial;
      material.color.setHex(color);
      material.opacity = 0.18 + strength * 0.44 * pulse;
    }
  }


private detectPlayerWeaponImpact(): void {
  const weapon = getSkyDancerPlayerWeaponState(this.runtimeV18.session);
  if (weapon.hitSerial <= this.lastPlayerHitSerial) return;
  this.lastPlayerHitSerial = weapon.hitSerial;
  const enemy = weapon.lastHitEnemyId
    ? this.runtimeV18.session.enemies.find((candidate) => candidate.id === weapon.lastHitEnemyId) ?? null
    : null;
  const destroyed = Boolean(enemy && !enemy.alive);
  const altitude = enemy
    ? getSkyDancerEnemyAltitudeMetersV43(enemy)
    : Number(this.runtimeV18.scene.userData.skyRaidPlayerAltitude ?? 20);
  const point = new THREE.Vector3(weapon.lastHitX, 0.62 + altitude, weapon.lastHitZ);
  this.spawnRaidImpactBurst(point, destroyed);
  this.runtimeV18.emitImpactSparks(point, destroyed ? 56 : 30);
  this.runtimeV18.scene.userData.skyRaidImpactHitSerial = weapon.hitSerial;
  this.runtimeV18.scene.userData.skyRaidImpactBurstStrength = destroyed ? 1.35 : 0.82;
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.webdriver) {
    (window as unknown as Record<string, unknown>).__skyRaidGetImpactPolish = () => ({
      activeBursts: this.raidImpactBursts.length,
      lastHitSerial: this.lastPlayerHitSerial,
      lastStrength: Number(this.runtimeV18.scene.userData.skyRaidImpactBurstStrength ?? 0),
    });
  }
}

private spawnRaidImpactBurst(position: THREE.Vector3, destroyed: boolean): void {
  while (this.raidImpactBursts.length >= 4) this.disposeRaidImpactBurst(this.raidImpactBursts.shift()!);
  const root = new THREE.Group();
  root.name = destroyed ? "sky-raid-target-down-burst-v18" : "sky-raid-target-hit-burst-v18";
  root.position.copy(position);
  const strength = destroyed ? 1.35 : 0.82;
  const additive = (color: number, opacity: number) => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.56, 1), additive(0xfff7d2, 1));
  core.renderOrder = 1150;
  root.add(core);
  const hot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.94, 1), additive(destroyed ? 0xff7b2f : 0xffbf5b, 0.9));
  hot.renderOrder = 1149;
  root.add(hot);
  const rings: THREE.Mesh[] = [];
  for (let index = 0; index < 2; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.052, 5, 28), additive(index === 0 ? 0xffffff : 0xffa34d, 0.92));
    ring.rotation.set(index === 0 ? Math.PI / 2 : 0.52, index === 0 ? 0 : 0.62, index * 0.44);
    ring.renderOrder = 1151;
    rings.push(ring);
    root.add(ring);
  }
  const debris: THREE.Mesh[] = [];
  const debrisCount = destroyed ? 16 : 9;
  for (let index = 0; index < debrisCount; index += 1) {
    const piece = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.11 + (index % 3) * 0.035, 0),
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xffe0a3 : index % 3 === 1 ? 0xff7942 : 0x7f8994,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const angle = index / debrisCount * Math.PI * 2 + (index % 2) * 0.19;
    piece.userData.angle = angle;
    piece.userData.lift = -0.34 + (index % 5) * 0.21;
    piece.userData.twist = (index % 2 === 0 ? 1 : -1) * (2.8 + (index % 4) * 0.7);
    debris.push(piece);
    root.add(piece);
  }
  const light = new THREE.PointLight(destroyed ? 0xff8b46 : 0xffc768, destroyed ? 8.5 : 4.6, destroyed ? 22 : 12, 2);
  root.add(light);
  this.runtimeV18.scene.add(root);
  const maxLife = destroyed ? 0.88 : 0.44;
  this.raidImpactBursts.push({ root, core, hot, rings, debris, light, life: maxLife, maxLife, strength, destroyed });
}

private updateRaidImpactBursts(delta: number): void {
  for (let index = this.raidImpactBursts.length - 1; index >= 0; index -= 1) {
    const burst = this.raidImpactBursts[index];
    burst.life -= delta;
    const ratio = THREE.MathUtils.clamp(burst.life / burst.maxLife, 0, 1);
    const progress = 1 - ratio;
    // Hold the bright impact core for roughly the first 60-70 ms on a kill,
    // then let the shock ring and debris accelerate outward. This gives the
    // impact a hit-stop beat without freezing controls or the simulation.
    const visualProgress = progress < 0.08
      ? progress * 0.22
      : 0.0176 + ((progress - 0.08) / 0.92) * 0.9824;
    burst.core.scale.setScalar((0.62 + visualProgress * 3.0) * burst.strength);
    burst.hot.scale.setScalar((0.78 + visualProgress * 2.55) * burst.strength);
    (burst.core.material as THREE.MeshBasicMaterial).opacity = Math.min(1, ratio * 1.28);
    (burst.hot.material as THREE.MeshBasicMaterial).opacity = ratio * 0.82;
    burst.rings.forEach((ring, ringIndex) => {
      ring.scale.setScalar((0.72 + visualProgress * (burst.destroyed ? 5.7 : 3.8)) * burst.strength);
      ring.rotation.z += delta * (ringIndex === 0 ? 2.1 : -1.65);
      (ring.material as THREE.MeshBasicMaterial).opacity = ratio * (ringIndex === 0 ? 0.78 : 0.55);
    });
    burst.debris.forEach((piece) => {
      const angle = Number(piece.userData.angle ?? 0);
      const distance = visualProgress * (burst.destroyed ? 8.2 : 4.6) * burst.strength;
      piece.position.set(
        Math.sin(angle) * distance,
        Number(piece.userData.lift ?? 0) * distance + visualProgress * 0.7,
        Math.cos(angle) * distance,
      );
      const twist = Number(piece.userData.twist ?? 0);
      piece.rotation.x += delta * twist;
      piece.rotation.z += delta * twist * 0.73;
      (piece.material as THREE.MeshBasicMaterial).opacity = ratio * 0.88;
    });
    burst.light.intensity = ratio * ratio * (burst.destroyed ? 8.5 : 4.6);
    if (burst.life <= 0) {
      this.disposeRaidImpactBurst(burst);
      this.raidImpactBursts.splice(index, 1);
    }
  }
  this.runtimeV18.scene.userData.skyRaidImpactBurstCount = this.raidImpactBursts.length;
}

private disposeRaidImpactBurst(burst: RaidImpactBurst): void {
  this.runtimeV18.scene.remove(burst.root);
  burst.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}

  private publishFlightDebug(snapshot: CartArenaSessionSnapshot): void {
    if (typeof window === "undefined") return;
    let minEnemyDistance = Number.POSITIVE_INFINITY;
    let minEnemyY = Number.POSITIVE_INFINITY;
    let maxEnemyY = Number.NEGATIVE_INFINITY;
    for (const enemy of snapshot.enemies) {
      if (!enemy.alive) continue;
      minEnemyDistance = Math.min(minEnemyDistance, Math.hypot(enemy.x - snapshot.x, enemy.z - snapshot.z));
      const group = this.runtimeV18.enemyGroups.get(enemy.id);
      if (group) {
        minEnemyY = Math.min(minEnemyY, group.position.y);
        maxEnemyY = Math.max(maxEnemyY, group.position.y);
      }
    }
    (window as unknown as Record<string, unknown>)[FLIGHT_DEBUG_KEY] = () => ({
      forwardVelocity: this.runtimeV18.session.car.forwardVelocity,
      lateralVelocity: this.runtimeV18.session.car.lateralVelocity,
      speed: this.runtimeV18.session.snapshot().speed,
      x: snapshot.x,
      z: snapshot.z,
      altitudeMeters: this.runtimeV18.scene.userData.skyDancerAltitudeMeters,
      minEnemyDistance: Number.isFinite(minEnemyDistance) ? minEnemyDistance : null,
      enemyVerticalSpread: Number.isFinite(minEnemyY) && Number.isFinite(maxEnemyY) ? maxEnemyY - minEnemyY : 0,
    });
  }
}

export { SkyDancerAirCombatFxV18 as SkyDancerAirCombatFx };
