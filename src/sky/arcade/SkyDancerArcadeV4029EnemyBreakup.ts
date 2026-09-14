import * as THREE from "three";
import type { SkyDancerArcadeEnemyKind } from "./SkyDancerArcadeData";

export const SKY_DANCER_ARCADE_V4029_MAX_WRECKS = 6;

export type SkyDancerArcadeV4029BreakupClass = "snap-roll" | "wing-over" | "heavy-drop";

export interface SkyDancerArcadeV4029BreakupRequest {
  enemyId: number;
  kind: SkyDancerArcadeEnemyKind;
  missile: boolean;
}

export interface SkyDancerArcadeV4029BreakupProfile {
  className: SkyDancerArcadeV4029BreakupClass;
  durationSeconds: number;
  lateralSpeed: number;
  sinkSpeed: number;
  forwardDrift: number;
  rollSpeed: number;
  pitchSpeed: number;
  fragmentCount: number;
  breachCount: number;
}

interface BreakupFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
}

interface BreakupEntry {
  group: THREE.Group;
  fragmentsRoot: THREE.Group;
  fragments: BreakupFragment[];
  breaches: THREE.Mesh[];
  profile: SkyDancerArcadeV4029BreakupProfile;
  age: number;
  side: number;
  baseScale: THREE.Vector3;
}

const heavyKinds = new Set<SkyDancerArcadeEnemyKind>(["bomber", "missile-boat", "gunship"]);
const agileKinds = new Set<SkyDancerArcadeEnemyKind>(["ace", "striker", "raider"]);

export function skyDancerArcadeV4029BreakupProfile(
  kind: SkyDancerArcadeEnemyKind,
  missile = false,
): SkyDancerArcadeV4029BreakupProfile {
  const missilePush = missile ? 1.16 : 1;
  if (heavyKinds.has(kind)) {
    return {
      className: "heavy-drop",
      durationSeconds: 1.42,
      lateralSpeed: 1.7 * missilePush,
      sinkSpeed: 5.4,
      forwardDrift: 5.6 * missilePush,
      rollSpeed: 2.05,
      pitchSpeed: 2.65,
      fragmentCount: 3,
      breachCount: 2,
    };
  }
  if (agileKinds.has(kind)) {
    return {
      className: "wing-over",
      durationSeconds: 1.04,
      lateralSpeed: 5.8 * missilePush,
      sinkSpeed: 3.8,
      forwardDrift: 8.4 * missilePush,
      rollSpeed: 5.45,
      pitchSpeed: 3.25,
      fragmentCount: 2,
      breachCount: 1,
    };
  }
  return {
    className: "snap-roll",
    durationSeconds: .82,
    lateralSpeed: 4.35 * missilePush,
    sinkSpeed: 4.75,
    forwardDrift: 9.6 * missilePush,
    rollSpeed: 8.2,
    pitchSpeed: 1.85,
    fragmentCount: 2,
    breachCount: 1,
  };
}

function hideCombatCues(group: THREE.Group): void {
  group.traverse((object) => {
    const cueName = object.name.toLowerCase();
    if (cueName.includes("lock-ring") || cueName.includes("aim-ring") || cueName.includes("counterplay-ring") || cueName.includes("beacon")) {
      object.visible = false;
      object.userData.arcadeV4029RetiredCombatCue = true;
    }
  });
}

function createBreaches(profile: SkyDancerArcadeV4029BreakupProfile, enemyId: number): THREE.Mesh[] {
  const breaches: THREE.Mesh[] = [];
  for (let index = 0; index < profile.breachCount; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0xff7a32 : 0xffd36b,
      transparent: true,
      opacity: .72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.16 + index * .045, 0), material);
    const side = (enemyId + index) % 2 === 0 ? 1 : -1;
    mesh.name = "arcade-v4029-wreck-breach";
    mesh.position.set(side * (.42 + index * .28), .06 - index * .13, .15 + index * .3);
    mesh.renderOrder = 9;
    mesh.userData.arcadeV4029PresentationOnly = true;
    breaches.push(mesh);
  }
  return breaches;
}

function createFragments(
  profile: SkyDancerArcadeV4029BreakupProfile,
  enemyId: number,
): { root: THREE.Group; fragments: BreakupFragment[] } {
  const root = new THREE.Group();
  root.name = "arcade-v4029-wreck-fragments";
  root.userData.arcadeV4029PresentationOnly = true;
  const fragments: BreakupFragment[] = [];
  for (let index = 0; index < profile.fragmentCount; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0xabb4bf : 0x5e6670,
      transparent: true,
      opacity: .88,
      depthWrite: true,
    });
    const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(.13 + index * .035, 0), material);
    const side = (enemyId + index) % 2 === 0 ? 1 : -1;
    mesh.position.set(side * (.34 + index * .18), .08 * (index - 1), .12 * index);
    root.add(mesh);
    fragments.push({
      mesh,
      velocity: new THREE.Vector3(
        side * (1.1 + index * .55),
        .6 - index * .4,
        -(1.4 + index * .75),
      ),
      spin: new THREE.Vector3(
        2.4 + index * .7,
        side * (3.1 + index * .6),
        side * (4.2 + index * .8),
      ),
    });
  }
  return { root, fragments };
}

/**
 * Presentation-only owner for defeated standard-aircraft silhouettes.
 * Runtime actors are already gone before this director takes ownership: no hitbox, score,
 * target, collision or AI state survives into a wreck.
 */
export class SkyDancerArcadeV4029EnemyBreakupDirector {
  readonly root = new THREE.Group();
  private readonly entries: BreakupEntry[] = [];

  constructor() {
    this.root.name = "arcade-v4029-enemy-wrecks";
    this.root.userData.arcadeV4029PresentationOnly = true;
    this.root.userData.arcadeV4029GameplayUnchanged = true;
    this.root.userData.arcadeV4029CollisionUnchanged = true;
  }

  get activeCount(): number {
    return this.entries.length;
  }

  adopt(group: THREE.Group, request: SkyDancerArcadeV4029BreakupRequest): THREE.Object3D[] {
    const profile = skyDancerArcadeV4029BreakupProfile(request.kind, request.missile);
    hideCombatCues(group);
    group.userData.arcadeV4029Wreck = true;
    group.userData.arcadeV4029EnemyKind = request.kind;
    group.userData.arcadeV4029BreakupClass = profile.className;
    group.userData.arcadeV4029PresentationOnly = true;
    group.userData.arcadeV4029GameplayUnchanged = true;
    group.userData.arcadeV4029CollisionUnchanged = true;

    const breaches = createBreaches(profile, request.enemyId);
    for (const breach of breaches) group.add(breach);
    const fragmentSet = createFragments(profile, request.enemyId);
    fragmentSet.root.position.copy(group.position);
    this.root.add(group, fragmentSet.root);

    const side = request.enemyId % 2 === 0 ? 1 : -1;
    this.entries.push({
      group,
      fragmentsRoot: fragmentSet.root,
      fragments: fragmentSet.fragments,
      breaches,
      profile,
      age: 0,
      side,
      baseScale: group.scale.clone(),
    });

    const retired: THREE.Object3D[] = [];
    while (this.entries.length > SKY_DANCER_ARCADE_V4029_MAX_WRECKS) {
      const oldest = this.entries.shift();
      if (!oldest) break;
      this.root.remove(oldest.group, oldest.fragmentsRoot);
      retired.push(oldest.group, oldest.fragmentsRoot);
    }
    return retired;
  }

  update(deltaSeconds: number): THREE.Object3D[] {
    const delta = Math.max(0, Math.min(.05, deltaSeconds));
    const retired: THREE.Object3D[] = [];
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      entry.age += delta;
      const progress = Math.min(1, entry.age / entry.profile.durationSeconds);
      const lateFall = .42 + progress * .9;
      entry.group.position.x += entry.side * entry.profile.lateralSpeed * delta * (1 - progress * .28);
      entry.group.position.y -= entry.profile.sinkSpeed * lateFall * delta;
      entry.group.position.z -= entry.profile.forwardDrift * delta;
      entry.group.rotation.z += entry.side * entry.profile.rollSpeed * delta;
      entry.group.rotation.x += entry.profile.pitchSpeed * delta;
      entry.group.scale.copy(entry.baseScale).multiplyScalar(1 - progress * .08);

      entry.fragmentsRoot.position.x += entry.side * entry.profile.lateralSpeed * .52 * delta;
      entry.fragmentsRoot.position.y -= entry.profile.sinkSpeed * (.35 + progress * .75) * delta;
      entry.fragmentsRoot.position.z -= entry.profile.forwardDrift * .72 * delta;
      for (const fragment of entry.fragments) {
        fragment.mesh.position.addScaledVector(fragment.velocity, delta);
        fragment.mesh.rotation.x += fragment.spin.x * delta;
        fragment.mesh.rotation.y += fragment.spin.y * delta;
        fragment.mesh.rotation.z += fragment.spin.z * delta;
        fragment.velocity.y -= 2.5 * delta;
        if (fragment.mesh.material instanceof THREE.MeshBasicMaterial) {
          fragment.mesh.material.opacity = .88 * (1 - Math.max(0, progress - .58) / .42);
        }
      }
      for (const breach of entry.breaches) {
        if (!(breach.material instanceof THREE.MeshBasicMaterial)) continue;
        breach.material.opacity = .72 * (1 - progress);
        breach.scale.setScalar(.82 + Math.sin(entry.age * 19 + entry.side) * .13);
      }

      if (entry.age < entry.profile.durationSeconds) continue;
      this.entries.splice(index, 1);
      this.root.remove(entry.group, entry.fragmentsRoot);
      retired.push(entry.group, entry.fragmentsRoot);
    }
    return retired;
  }

  clear(): THREE.Object3D[] {
    const retired: THREE.Object3D[] = [];
    for (const entry of this.entries) {
      this.root.remove(entry.group, entry.fragmentsRoot);
      retired.push(entry.group, entry.fragmentsRoot);
    }
    this.entries.length = 0;
    return retired;
  }
}
