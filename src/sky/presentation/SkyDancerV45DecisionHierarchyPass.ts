import * as THREE from "three";
import type { CartArenaSessionSnapshot } from "../../cart/CartArenaSession";
import type { SkyDancerFxRuntime } from "../SkyDancerAirCombatFxV2";
import { getLatestSkyDancerBossQualityV34 } from "../SkyDancerBossCombatV34";
import {
  getSkyDancerPlayerLockSnapshotV45,
  getSkyDancerPlayerWeaponState,
  type SkyDancerPlayerLockSnapshotV45,
} from "../SkyDancerPlayerWeapons";
import {
  SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT,
  getSkyDancerEnemyVerticalSnapshotV43,
} from "../SkyDancerVerticalFlightV43";

export const SKY_DANCER_COMBAT_DECISION_EVENT_V45 = "sky-dancer-combat-decision-v45";
const GLOBAL_DEBUG_KEY = "__skyDancerGetV45DecisionHierarchy";
const RIBBON_POINTS = 42;
const RIBBON_MAX_AGE = 0.86;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const TMP_TANGENT = new THREE.Vector3();
const TMP_SIDE = new THREE.Vector3();
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();

export interface SkyDancerCombatDecisionSnapshotV45 extends SkyDancerPlayerLockSnapshotV45 {
  boostActive: boolean;
  bossActive: boolean;
  bossMode: "orbit" | "strike" | "break" | null;
  bossCoreOpen: boolean;
  shotSerial: number;
  hitSerial: number;
}

interface RibbonPoint {
  position: THREE.Vector3;
  age: number;
}

function verticalWorldOffset(meters: number): number {
  const skyRaid = typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
  return skyRaid ? meters : meters / SKY_DANCER_VERTICAL_RENDER_METERS_PER_UNIT;
}

class V45MissileRibbon {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly points: RibbonPoint[] = [];
  private readonly positions = new Float32Array(RIBBON_POINTS * 2 * 3);
  private readonly alpha = new Float32Array(RIBBON_POINTS * 2 * 3);
  private missingSeconds = 0;

  constructor(scene: THREE.Scene, serial: number) {
    const geometry = new THREE.BufferGeometry();
    const indices: number[] = [];
    for (let index = 0; index < RIBBON_POINTS - 1; index += 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.alpha, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);
    geometry.setDrawRange(0, 0);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.44,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = `sky-dancer-v45-player-missile-smoke-${serial}`;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 24;
    scene.add(this.mesh);
  }

  add(position: THREE.Vector3): void {
    this.missingSeconds = 0;
    const last = this.points[this.points.length - 1];
    if (last && last.position.distanceToSquared(position) < 0.025) {
      last.position.copy(position);
      last.age = 0;
    } else {
      this.points.push({ position: position.clone(), age: 0 });
      while (this.points.length > RIBBON_POINTS) this.points.shift();
    }
  }

  update(delta: number, active: boolean): number {
    for (const point of this.points) point.age += delta;
    while (this.points.length > 0 && this.points[0].age > RIBBON_MAX_AGE) this.points.shift();
    if (!active) this.missingSeconds += delta;
    this.rebuild();
    return this.points.length;
  }

  expired(): boolean {
    return this.missingSeconds > RIBBON_MAX_AGE && this.points.length < 2;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

  private rebuild(): void {
    const count = this.points.length;
    this.mesh.visible = count >= 2;
    if (!this.mesh.visible) {
      this.mesh.geometry.setDrawRange(0, 0);
      return;
    }
    for (let index = 0; index < count; index += 1) {
      const point = this.points[index];
      const previous = this.points[Math.max(0, index - 1)].position;
      const next = this.points[Math.min(count - 1, index + 1)].position;
      TMP_TANGENT.subVectors(next, previous).normalize();
      TMP_SIDE.crossVectors(TMP_TANGENT, WORLD_UP);
      if (TMP_SIDE.lengthSq() < 0.0001) TMP_SIDE.set(1, 0, 0);
      else TMP_SIDE.normalize();
      const freshness = THREE.MathUtils.clamp(1 - point.age / RIBBON_MAX_AGE, 0, 1);
      const width = 0.105 + freshness * 0.16;
      TMP_A.copy(point.position);
      TMP_A.y += point.age * 0.10;
      TMP_B.copy(TMP_SIDE).multiplyScalar(width);
      const vertex = index * 2;
      for (const side of [0, 1]) {
        const sign = side === 0 ? -1 : 1;
        const offset = (vertex + side) * 3;
        this.positions[offset] = TMP_A.x + TMP_B.x * sign;
        this.positions[offset + 1] = TMP_A.y + TMP_B.y * sign;
        this.positions[offset + 2] = TMP_A.z + TMP_B.z * sign;
        const shade = (0.28 + freshness * 0.72) * (side === 0 ? 0.88 : 1);
        this.alpha[offset] = 0.80 * shade;
        this.alpha[offset + 1] = 0.91 * shade;
        this.alpha[offset + 2] = 0.94 * shade;
      }
    }
    (this.mesh.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.mesh.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, Math.max(0, count - 1) * 6);
  }
}

/**
 * V45 is the final visual hierarchy owner. It communicates the decision that
 * V45 combat rules now ask the player to make, while reducing scenery and
 * normal-speed effects that previously competed with targets.
 */
export class SkyDancerV45DecisionHierarchyPass {
  private readonly playerRibbons = new Map<number, V45MissileRibbon>();
  private readonly activeRibbonIds = new Set<number>();
  private readonly speedMaterials = new Map<THREE.Material, number>();
  private readonly bossLane: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly bossPulse: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private backgroundTuned = false;
  private speedScanClock = 0;
  private broadcastClock = 0;
  private elapsed = 0;
  private maxPlayerRibbonPoints = 0;
  private bossStrikeCueObserved = false;
  private speedFxCount = 0;
  private dedicatedTurboSeen = false;
  private maxDedicatedTurboOpacity = 0;
  private latestDecision: SkyDancerCombatDecisionSnapshotV45 | null = null;

  constructor(private readonly runtime: SkyDancerFxRuntime) {
    const laneGeometry = new THREE.BufferGeometry();
    laneGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    this.bossLane = new THREE.Line(
      laneGeometry,
      new THREE.LineBasicMaterial({
        color: 0xff6d52,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.bossLane.name = "sky-dancer-v45-boss-attack-lane";
    this.bossLane.renderOrder = 26;
    this.bossLane.frustumCulled = false;

    this.bossPulse = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.07, 5, 30),
      new THREE.MeshBasicMaterial({
        color: 0xff8f64,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.bossPulse.name = "sky-dancer-v45-boss-strike-pulse";
    this.bossPulse.rotation.x = Math.PI / 2;
    this.bossPulse.renderOrder = 27;
    runtime.scene.add(this.bossLane, this.bossPulse);
    runtime.scene.userData.skyDancerV45DecisionHierarchy = true;
  }

  update(snapshot: CartArenaSessionSnapshot): void {
    const delta = 1 / 60;
    this.elapsed += delta;
    this.updatePlayerMissileRibbons(delta);
    this.updateSpeedHierarchy(snapshot, delta);
    this.tuneBackgroundHierarchy();
    this.updateBossAttackLane(snapshot);
    this.publishDecision(snapshot, delta);
    this.installAuditBridge();
  }

  private updatePlayerMissileRibbons(delta: number): void {
    this.activeRibbonIds.clear();
    const weapon = getSkyDancerPlayerWeaponState(this.runtime.session);
    for (const missile of weapon.missiles) {
      this.activeRibbonIds.add(missile.id);
      const ribbon = this.playerRibbons.get(missile.id) ?? new V45MissileRibbon(this.runtime.scene, missile.id);
      this.playerRibbons.set(missile.id, ribbon);
      ribbon.add(new THREE.Vector3(
        missile.x,
        1.02 + verticalWorldOffset(missile.altitudeOffsetMeters),
        missile.z,
      ));
    }
    for (const [id, ribbon] of this.playerRibbons) {
      const count = ribbon.update(delta, this.activeRibbonIds.has(id));
      this.maxPlayerRibbonPoints = Math.max(this.maxPlayerRibbonPoints, count);
      if (!this.activeRibbonIds.has(id) && ribbon.expired()) {
        ribbon.dispose();
        this.playerRibbons.delete(id);
      }
    }
  }

  private updateSpeedHierarchy(snapshot: CartArenaSessionSnapshot, delta: number): void {
    this.speedScanClock -= delta;
    if (this.speedScanClock <= 0) {
      this.speedScanClock = 0.9;
      this.scanSpeedEffects(this.runtime.scene);
      this.scanSpeedEffects(this.runtime.camera);
      this.speedFxCount = this.speedMaterials.size;
    }
    const strength = snapshot.boostActive ? 1 : 0.34;
    for (const [material, baseOpacity] of this.speedMaterials) {
      if (!("opacity" in material)) continue;
      const target = baseOpacity * strength;
      (material as THREE.Material & { opacity: number }).opacity = target;
      material.needsUpdate = true;
    }

    // V37 owns a dedicated Turbo-only line set whose inactive opacity is zero.
    // V45 must not scale it from that zero; instead verify that it still reaches
    // its own intended strength during a real Turbo presentation frame.
    const turboLines = this.runtime.scene.getObjectByName("sky-dancer-v37-turbo-speed-lines");
    if (snapshot.boostActive && turboLines?.visible) {
      this.dedicatedTurboSeen = true;
      turboLines.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (!("opacity" in material)) continue;
          const opacity = Number((material as THREE.Material & { opacity: number }).opacity);
          if (Number.isFinite(opacity)) this.maxDedicatedTurboOpacity = Math.max(this.maxDedicatedTurboOpacity, opacity);
        }
      });
    }
  }

  private scanSpeedEffects(root: THREE.Object3D): void {
    root.traverse((object) => {
      const name = object.name.toLowerCase();
      if (!(name.includes("speed") || name.includes("streak") || name.includes("rush"))) return;
      if (name.includes("missile") || name.includes("trail") || name.includes("target") || name.includes("turbo")) return;
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || this.speedMaterials.has(material) || !("opacity" in material)) continue;
        const opacity = Number((material as THREE.Material & { opacity: number }).opacity);
        // Dedicated/conditional effects often sit at opacity 0 while inactive
        // and write their real strength later. Never capture zero as a base.
        if (!Number.isFinite(opacity) || opacity <= 0.01) continue;
        this.speedMaterials.set(material, opacity);
      }
    });
  }

  private tuneBackgroundHierarchy(): void {
    if (this.backgroundTuned) return;
    const targets: Array<[string, number, number]> = [
      ["sky-dancer-v35-reference-focus-city", 0.76, 0.90],
      ["sky-dancer-v40-multi-direction-city", 0.72, 0.88],
      ["sky-dancer-v31-patchwork-fields", 0.82, 0.82],
    ];
    let touched = 0;
    for (const [name, colorScale, opacityScale] of targets) {
      const root = this.runtime.scene.getObjectByName(name);
      if (!root) continue;
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          const anyMaterial = material as THREE.Material & { color?: THREE.Color; opacity?: number; transparent?: boolean };
          if (anyMaterial.userData.skyDancerV45HierarchyTuned === true) continue;
          if (anyMaterial.color) anyMaterial.color.multiplyScalar(colorScale);
          if (typeof anyMaterial.opacity === "number" && anyMaterial.opacity < 1) anyMaterial.opacity *= opacityScale;
          anyMaterial.userData.skyDancerV45HierarchyTuned = true;
          material.needsUpdate = true;
          touched += 1;
        }
      });
    }
    this.backgroundTuned = touched > 0;
    this.runtime.scene.userData.skyDancerV45BackgroundMaterials = touched;
  }

  private updateBossAttackLane(snapshot: CartArenaSessionSnapshot): void {
    const bossState = getLatestSkyDancerBossQualityV34();
    const boss = this.runtime.session.enemies.find((enemy) => enemy.kind === "boss" && enemy.alive) ?? null;
    const strike = Boolean(bossState?.active && bossState.mode === "strike" && boss);
    this.bossLane.visible = strike;
    this.bossPulse.visible = strike;
    if (!strike || !boss) {
      this.bossLane.material.opacity = 0;
      this.bossPulse.material.opacity = 0;
      return;
    }
    this.bossStrikeCueObserved = true;
    const vertical = getSkyDancerEnemyVerticalSnapshotV43(boss);
    const bossY = 1.7 + verticalWorldOffset(vertical.altitudeOffsetMeters);
    const playerAltitude = getSkyDancerPlayerLockSnapshotV45(this.runtime.session).playerAltitudeMeters;
    const playerY = 1.02 + verticalWorldOffset(playerAltitude);
    const positions = this.bossLane.geometry.getAttribute("position") as THREE.BufferAttribute;
    positions.setXYZ(0, boss.x, bossY, boss.z);
    positions.setXYZ(1, snapshot.x, playerY, snapshot.z);
    positions.needsUpdate = true;
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 11.5);
    this.bossLane.material.opacity = 0.16 + pulse * 0.17;
    this.bossPulse.material.opacity = 0.20 + pulse * 0.24;
    this.bossPulse.position.set(boss.x, bossY, boss.z);
    this.bossPulse.scale.setScalar(0.85 + pulse * 0.65);
  }

  private publishDecision(snapshot: CartArenaSessionSnapshot, delta: number): void {
    const skyRaid = typeof document !== "undefined" && document.documentElement.dataset.skyDancerMode === "sky-raid";
    this.broadcastClock -= delta;
    if (!skyRaid && this.broadcastClock > 0) return;
    this.broadcastClock = skyRaid ? 0 : 0.08;
    const lock = getSkyDancerPlayerLockSnapshotV45(this.runtime.session);
    const weapon = getSkyDancerPlayerWeaponState(this.runtime.session);
    const boss = getLatestSkyDancerBossQualityV34();
    this.latestDecision = {
      ...lock,
      boostActive: snapshot.boostActive,
      bossActive: Boolean(boss?.active),
      bossMode: boss?.active ? boss.mode : null,
      bossCoreOpen: Boolean(boss?.active && boss.coreOpen),
      shotSerial: weapon.shotSerial,
      hitSerial: weapon.hitSerial,
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<SkyDancerCombatDecisionSnapshotV45>(
        SKY_DANCER_COMBAT_DECISION_EVENT_V45,
        { detail: this.latestDecision },
      ));
    }
  }

  private installAuditBridge(): void {
    if (typeof window === "undefined" || !navigator.webdriver) return;
    (window as unknown as Record<string, unknown>)[GLOBAL_DEBUG_KEY] = () => ({
      decision: this.latestDecision ? { ...this.latestDecision } : null,
      playerRibbonCount: this.playerRibbons.size,
      maxPlayerRibbonPoints: this.maxPlayerRibbonPoints,
      speedFxCount: this.speedFxCount,
      normalSpeedStrength: 0.34,
      dedicatedTurboSeen: this.dedicatedTurboSeen,
      maxDedicatedTurboOpacity: this.maxDedicatedTurboOpacity,
      bossStrikeCueObserved: this.bossStrikeCueObserved,
      backgroundTuned: this.backgroundTuned,
      backgroundMaterials: Number(this.runtime.scene.userData.skyDancerV45BackgroundMaterials ?? 0),
    });
  }
}
