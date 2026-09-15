import * as THREE from "three";
import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";
import { applySkyDancerArcadeV4031DirectionalDamage } from "./SkyDancerArcadeV4031DirectionalDamage";

export type SkyDancerArcadeV4030DamageBand = "clean" | "scarred" | "damaged" | "critical";

export interface SkyDancerArcadeV4030DamageProfile {
  band: SkyDancerArcadeV4030DamageBand;
  hpRatio: number;
  severity: number;
  activeScars: number;
  activeBreaches: number;
  sparkStrength: number;
}

export interface SkyDancerArcadeV4030EnemySignal {
  id: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  hp: number;
  maxHp: number;
  boss: boolean;
  rivalAce?: boolean;
  worldBreakTarget?: boolean;
}

export interface SkyDancerArcadeV4030ImpactSignal {
  enemyId: number;
  kind: SkyDancerArcadeEnemyKind | "boss";
  boss: boolean;
  destroyed: boolean;
}

interface RegistryEntry {
  profile: SkyDancerArcadeV4030DamageProfile;
  forcedCriticalSeconds: number;
}

const registry = new Map<number, RegistryEntry>();
let registryStageSerial = -1;

const clamp01 = (value: number): number => THREE.MathUtils.clamp(value, 0, 1);
const heavyKinds = new Set<SkyDancerArcadeEnemyKind>(["bomber", "missile-boat", "gunship"]);
const agileKinds = new Set<SkyDancerArcadeEnemyKind>(["ace", "striker", "raider"]);

export function skyDancerArcadeV4030DamageProfile(hp: number, maxHp: number): SkyDancerArcadeV4030DamageProfile {
  const hpRatio = maxHp > 0 ? clamp01(hp / maxHp) : 0;
  const severity = clamp01((.78 - hpRatio) / .68);
  const band: SkyDancerArcadeV4030DamageBand = hpRatio > .76
    ? "clean"
    : hpRatio > .48
      ? "scarred"
      : hpRatio > .22
        ? "damaged"
        : "critical";
  return {
    band,
    hpRatio,
    severity,
    activeScars: band === "clean" ? 0 : band === "scarred" ? 1 : band === "damaged" ? 2 : 3,
    activeBreaches: band === "clean" ? 0 : band === "scarred" ? 0 : band === "damaged" ? 1 : 3,
    sparkStrength: band === "critical" ? clamp01((.22 - hpRatio) / .22) : 0,
  };
}

const criticalProfile = (): SkyDancerArcadeV4030DamageProfile => ({
  band: "critical",
  hpRatio: 0,
  severity: 1,
  activeScars: 3,
  activeBreaches: 3,
  sparkStrength: 1,
});

/**
 * Copies authoritative HP into a render-only lookup. It never writes simulation state.
 * Destroyed impacts stay critical briefly so V40.29 can re-parent the exact aircraft as a wreck.
 */
export function syncSkyDancerArcadeV4030DamageRegistry(
  enemies: readonly SkyDancerArcadeV4030EnemySignal[],
  impacts: readonly SkyDancerArcadeV4030ImpactSignal[],
  stageSerial: number,
  deltaSeconds: number,
): void {
  if (stageSerial !== registryStageSerial) {
    registry.clear();
    registryStageSerial = stageSerial;
  }

  const delta = Math.max(0, Math.min(.1, deltaSeconds));
  for (const [id, entry] of registry) {
    if (entry.forcedCriticalSeconds <= 0) continue;
    entry.forcedCriticalSeconds = Math.max(0, entry.forcedCriticalSeconds - delta);
    if (entry.forcedCriticalSeconds > 0) entry.profile = criticalProfile();
    registry.set(id, entry);
  }

  const liveIds = new Set<number>();
  for (const enemy of enemies) {
    if (enemy.boss || enemy.kind === "boss" || enemy.rivalAce || enemy.worldBreakTarget) continue;
    liveIds.add(enemy.id);
    const previous = registry.get(enemy.id);
    if (previous && previous.forcedCriticalSeconds > 0) continue;
    registry.set(enemy.id, {
      profile: skyDancerArcadeV4030DamageProfile(enemy.hp, enemy.maxHp),
      forcedCriticalSeconds: 0,
    });
  }

  const destroyedIds = new Set<number>();
  for (const impact of impacts) {
    if (!impact.destroyed || impact.boss || impact.kind === "boss") continue;
    destroyedIds.add(impact.enemyId);
    registry.set(impact.enemyId, { profile: criticalProfile(), forcedCriticalSeconds: 1.9 });
  }

  for (const [id, entry] of registry) {
    if (liveIds.has(id) || destroyedIds.has(id) || entry.forcedCriticalSeconds > 0) continue;
    registry.delete(id);
  }
}

export function skyDancerArcadeV4030DamageForEnemy(enemyId: number): SkyDancerArcadeV4030DamageProfile {
  return registry.get(enemyId)?.profile ?? skyDancerArcadeV4030DamageProfile(1, 1);
}

export function resetSkyDancerArcadeV4030DamageRegistry(): void {
  registry.clear();
  registryStageSerial = -1;
}

function damageHost(group: THREE.Group): THREE.Object3D {
  return group.getObjectByName("arcade-enemy-v19-readable-attitude-rig") ?? group;
}

function createScar(index: number, enemyId: number, bulk: number): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.18, -.03, 0),
    new THREE.Vector3(-.04, .075, .018),
    new THREE.Vector3(.07, -.055, .032),
    new THREE.Vector3(.2, .035, .045),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: 0x181b20,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const scar = new THREE.Line(geometry, material);
  scar.name = "arcade-v4030-damage-scar";
  const side = (enemyId + index) % 2 === 0 ? 1 : -1;
  scar.position.set(side * (.23 + index * .16) * bulk, .08 - index * .085, .02 + index * .17);
  scar.rotation.set(.16 * side, .12 * side, .34 * side + index * .21);
  scar.renderOrder = 6;
  scar.userData.arcadeV4030PresentationOnly = true;
  return scar;
}

function createBreach(index: number, enemyId: number, bulk: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    color: index === 0 ? 0xff6a2b : 0xffb15a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const breach = new THREE.Mesh(new THREE.IcosahedronGeometry(.075 + index * .018, 0), material);
  breach.name = "arcade-v4030-damage-breach";
  const side = (enemyId + index + 1) % 2 === 0 ? 1 : -1;
  breach.position.set(side * (.3 + index * .18) * bulk, .035 - index * .055, .07 + index * .17);
  breach.renderOrder = 7;
  breach.userData.arcadeV4030PresentationOnly = true;
  return breach;
}

function createSparks(enemyId: number, bulk: number): THREE.Points {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < 6; index += 1) {
    const side = (enemyId + index) % 2 === 0 ? 1 : -1;
    points.push(new THREE.Vector3(
      side * (.08 + index * .035) * bulk,
      (index - 2.5) * .035,
      .08 + index * .045,
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.PointsMaterial({
    color: 0xffb45f,
    size: .085,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const sparks = new THREE.Points(geometry, material);
  sparks.name = "arcade-v4030-damage-sparks";
  sparks.position.set(0, .02, .26);
  sparks.renderOrder = 8;
  sparks.userData.arcadeV4030PresentationOnly = true;
  return sparks;
}

function applyDamageRig(rig: THREE.Group, profile: SkyDancerArcadeV4030DamageProfile, enemyId: number): void {
  const blend = profile.severity;
  rig.userData.arcadeV4030DamageBand = profile.band;
  rig.userData.arcadeV4030DamageBlend = blend;
  const now = typeof performance === "undefined" ? 0 : performance.now() * .001;
  const scars = rig.getObjectsByProperty("name", "arcade-v4030-damage-scar");
  const breaches = rig.getObjectsByProperty("name", "arcade-v4030-damage-breach");
  const scarThresholds = [.08, .36, .66];
  const breachThresholds = [.4, .68, .82];
  for (let index = 0; index < scars.length; index += 1) {
    const scar = scars[index];
    if (!(scar instanceof THREE.Line) || !(scar.material instanceof THREE.LineBasicMaterial)) continue;
    const local = clamp01((blend - scarThresholds[index]) / .24);
    scar.material.opacity = local * .72;
    scar.material.color.setHex(local > .72 ? 0x6c2b1c : 0x181b20);
    scar.scale.setScalar(.88 + local * .28);
  }
  for (let index = 0; index < breaches.length; index += 1) {
    const breach = breaches[index];
    if (!(breach instanceof THREE.Mesh) || !(breach.material instanceof THREE.MeshBasicMaterial)) continue;
    const local = clamp01((blend - breachThresholds[index]) / .22);
    const flicker = .78 + Math.sin(now * (19 + index * 4) + enemyId * .37 + index) * .22;
    breach.material.opacity = local * flicker * .82;
    breach.scale.setScalar(.72 + local * (.55 + index * .08));
  }
  const sparks = rig.getObjectByName("arcade-v4030-damage-sparks");
  if (sparks instanceof THREE.Points && sparks.material instanceof THREE.PointsMaterial) {
    const critical = clamp01((blend - .74) / .26);
    const pulse = .55 + Math.sin(now * 27 + enemyId * .71) * .45;
    sparks.material.opacity = critical * (.38 + pulse * .46);
    sparks.rotation.z = now * (1.4 + critical * 2.1);
    sparks.scale.setScalar(.86 + critical * .42);
  }
}

/** Adds a local damage layer to a standard enemy without adding a draw-loop owner or hitbox. */
export function attachSkyDancerArcadeV4030EnemyDamage(
  group: THREE.Group,
  enemyId: number,
  kind: SkyDancerArcadeEnemyKind,
): THREE.Group {
  const existing = group.getObjectByName("arcade-v4030-damage-rig");
  if (existing instanceof THREE.Group) return existing;

  const rig = new THREE.Group();
  rig.name = "arcade-v4030-damage-rig";
  rig.userData.arcadeV4030PresentationOnly = true;
  rig.userData.arcadeV4030GameplayUnchanged = true;
  rig.userData.arcadeV4030CollisionUnchanged = true;
  rig.userData.arcadeV4030DamageBand = "clean";
  rig.userData.arcadeV4030DamageBlend = 0;
  const bulk = heavyKinds.has(kind) ? 1.24 : agileKinds.has(kind) ? .92 : 1;
  for (let index = 0; index < 3; index += 1) {
    rig.add(createScar(index, enemyId, bulk));
    rig.add(createBreach(index, enemyId, bulk));
  }
  rig.add(createSparks(enemyId, bulk));
  damageHost(group).add(rig);

  const renderDrivers: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.name.startsWith("arcade-v4030-")) renderDrivers.push(object);
  });
  const driver = renderDrivers[0];
  if (driver) {
    driver.onBeforeRender = () => {
      applyDamageRig(rig, skyDancerArcadeV4030DamageForEnemy(enemyId), enemyId);
      applySkyDancerArcadeV4031DirectionalDamage(rig, enemyId, kind);
    };
  }
  applyDamageRig(rig, skyDancerArcadeV4030DamageForEnemy(enemyId), enemyId);
  applySkyDancerArcadeV4031DirectionalDamage(rig, enemyId, kind);
  group.userData.arcadeV4030ProgressiveDamage = true;
  group.userData.arcadeV4030LogicalCollisionUnchanged = true;
  return rig;
}
