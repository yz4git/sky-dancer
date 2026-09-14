from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEBGL = ROOT / "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
MODULE = ROOT / "src/sky/arcade/SkyDancerArcadeV4029EnemyBreakup.ts"
TEST = ROOT / "tests/sky-arcade-v4029-enemy-breakup.test.ts"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"V40.29 patch anchor missing: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"V40.29 patch anchor not unique: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


module = r'''import * as THREE from "three";
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
'''

test = r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  SKY_DANCER_ARCADE_V4029_MAX_WRECKS,
  SkyDancerArcadeV4029EnemyBreakupDirector,
  skyDancerArcadeV4029BreakupProfile,
} from "../src/sky/arcade/SkyDancerArcadeV4029EnemyBreakup";

const makeEnemy = (id: number) => {
  const group = new THREE.Group();
  group.name = `arcade-enemy-${id}`;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1, .3, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const lock = new THREE.Group();
  lock.name = "arcade-lock-ring";
  group.add(lock);
  const beacon = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
  beacon.name = "arcade-enemy-v18-round-beacons";
  group.add(beacon);
  return group;
};

test("V40.29 gives light, agile and heavy kills materially different wreck motion", () => {
  const light = skyDancerArcadeV4029BreakupProfile("fighter");
  const agile = skyDancerArcadeV4029BreakupProfile("ace");
  const heavy = skyDancerArcadeV4029BreakupProfile("gunship");
  assert.equal(light.className, "snap-roll");
  assert.equal(agile.className, "wing-over");
  assert.equal(heavy.className, "heavy-drop");
  assert.ok(light.rollSpeed > agile.rollSpeed && agile.rollSpeed > heavy.rollSpeed);
  assert.ok(agile.lateralSpeed > light.lateralSpeed && light.lateralSpeed > heavy.lateralSpeed);
  assert.ok(heavy.durationSeconds > agile.durationSeconds && agile.durationSeconds > light.durationSeconds);
  assert.ok(heavy.fragmentCount > light.fragmentCount);
});

test("V40.29 missile kills add impulse without changing the aircraft reaction class", () => {
  const gun = skyDancerArcadeV4029BreakupProfile("interceptor", false);
  const missile = skyDancerArcadeV4029BreakupProfile("interceptor", true);
  assert.equal(gun.className, missile.className);
  assert.equal(gun.durationSeconds, missile.durationSeconds);
  assert.ok(missile.forwardDrift > gun.forwardDrift);
  assert.ok(missile.lateralSpeed > gun.lateralSpeed);
});

test("V40.29 retires targeting cues and keeps the wreck pool bounded", () => {
  const director = new SkyDancerArcadeV4029EnemyBreakupDirector();
  let retired = 0;
  for (let id = 1; id <= SKY_DANCER_ARCADE_V4029_MAX_WRECKS + 2; id += 1) {
    const group = makeEnemy(id);
    retired += director.adopt(group, { enemyId: id, kind: id % 3 === 0 ? "gunship" : "fighter", missile: false }).length;
    assert.equal(group.getObjectByName("arcade-lock-ring")?.visible, false);
    assert.equal(group.getObjectByName("arcade-enemy-v18-round-beacons")?.visible, false);
  }
  assert.equal(director.activeCount, SKY_DANCER_ARCADE_V4029_MAX_WRECKS);
  assert.equal(retired, 4);
  let lights = 0;
  director.root.traverse((object) => { if (object instanceof THREE.Light) lights += 1; });
  assert.equal(lights, 0);
  assert.equal(director.root.userData.arcadeV4029CollisionUnchanged, true);
});

test("V40.29 wrecks visibly fall, tumble, then fully retire", () => {
  const director = new SkyDancerArcadeV4029EnemyBreakupDirector();
  const group = makeEnemy(7);
  group.position.set(2, 3, -20);
  director.adopt(group, { enemyId: 7, kind: "ace", missile: true });
  const start = group.position.clone();
  for (let i = 0; i < 12; i += 1) director.update(.05);
  assert.notEqual(group.position.x, start.x);
  assert.ok(group.position.y < start.y);
  assert.ok(group.position.z < start.z);
  assert.notEqual(group.rotation.z, 0);
  let retired: THREE.Object3D[] = [];
  for (let i = 0; i < 20; i += 1) retired = retired.concat(director.update(.05));
  assert.equal(director.activeCount, 0);
  assert.ok(retired.includes(group));
});

test("V40.29 consumes real destroyed impacts in WebGL only and never owns runtime gameplay", () => {
  const webgl = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(webgl, /SkyDancerArcadeV4029EnemyBreakupDirector/);
  assert.match(webgl, /impact\.destroyed/);
  assert.match(webgl, /v4029PendingBreakups/);
  assert.match(webgl, /v4029Breakups\.adopt/);
  assert.equal(runtime.includes("V4029EnemyBreakup"), false);
});
'''

MODULE.write_text(module, encoding="utf-8")
TEST.write_text(test, encoding="utf-8")

text = WEBGL.read_text(encoding="utf-8")
text = replace_once(
    text,
    'import { skyDancerArcadeV4018EnvironmentFraming } from "./SkyDancerArcadeV4018EnvironmentFraming";\n',
    'import { skyDancerArcadeV4018EnvironmentFraming } from "./SkyDancerArcadeV4018EnvironmentFraming";\n'
    'import { SkyDancerArcadeV4029EnemyBreakupDirector, type SkyDancerArcadeV4029BreakupRequest } from "./SkyDancerArcadeV4029EnemyBreakup";\n',
    "import",
)
text = replace_once(
    text,
    '  private readonly enemyGroups = new Map<number, THREE.Group>();\n  private readonly projectileMeshes = new Map<number, THREE.Mesh>();\n',
    '  private readonly enemyGroups = new Map<number, THREE.Group>();\n'
    '  // V40.29: real destroyed impacts hand the already-rendered aircraft to a bounded presentation-only wreck pool.\n'
    '  private readonly v4029Breakups = new SkyDancerArcadeV4029EnemyBreakupDirector();\n'
    '  private readonly v4029PendingBreakups = new Map<number, SkyDancerArcadeV4029BreakupRequest>();\n'
    '  private readonly projectileMeshes = new Map<number, THREE.Mesh>();\n',
    "fields",
)
text = replace_once(
    text,
    '    this.scene.add(this.entityRoot, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);\n',
    '    this.scene.add(this.entityRoot, this.v4029Breakups.root, this.projectileRoot, this.hazardRoot, this.branchRoot, this.worldBreakRoot, this.player);\n',
    "scene-root",
)
text = replace_once(
    text,
    '    this.syncPlayer(snapshot, delta);\n    this.syncEnemies(snapshot, delta);\n    this.syncProjectiles(snapshot);\n',
    '    this.syncPlayer(snapshot, delta);\n'
    '    this.captureV4029DestroyedEnemies(snapshot);\n'
    '    this.syncEnemies(snapshot, delta);\n'
    '    for (const retired of this.v4029Breakups.update(delta)) this.disposeObject(retired);\n'
    '    this.syncProjectiles(snapshot);\n',
    "frame-wiring",
)
method_anchor = '  private syncEnemies(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n'
method_insert = '''  private captureV4029DestroyedEnemies(snapshot: SkyDancerArcadeSnapshot): void {\n    for (const impact of snapshot.impacts) {\n      if (!impact.destroyed || impact.boss || impact.kind === "boss") continue;\n      // The old visual must still exist. Despawns, stage handoffs and unseen instant kills stay on the proven explosion-only path.\n      if (!this.enemyGroups.has(impact.enemyId)) continue;\n      this.v4029PendingBreakups.set(impact.enemyId, {\n        enemyId: impact.enemyId,\n        kind: impact.kind,\n        missile: impact.missile,\n      });\n    }\n  }\n\n  private syncEnemies(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n'''
text = replace_once(text, method_anchor, method_insert, "capture-method")
old_removal = '''    for (const [id, group] of this.enemyGroups) {\n      if (active.has(id)) continue;\n      this.enemyGroups.delete(id);\n      this.enemyHitReactions.delete(id);\n      this.enemyVelocityHistory.delete(id);\n      this.entityRoot.remove(group);\n      this.disposeObject(group);\n    }\n'''
new_removal = '''    for (const [id, group] of this.enemyGroups) {\n      if (active.has(id)) continue;\n      this.enemyGroups.delete(id);\n      this.enemyHitReactions.delete(id);\n      this.enemyVelocityHistory.delete(id);\n      const breakup = this.v4029PendingBreakups.get(id);\n      this.v4029PendingBreakups.delete(id);\n      const rivalIdentity = group.getObjectByName("arcade-rival-ace-identity");\n      if (breakup && !rivalIdentity) {\n        // Re-parent the exact rendered aircraft after the logical actor is gone: no duplicate hitbox or target survives.\n        for (const retired of this.v4029Breakups.adopt(group, breakup)) this.disposeObject(retired);\n        continue;\n      }\n      this.entityRoot.remove(group);\n      this.disposeObject(group);\n    }\n'''
text = replace_once(text, old_removal, new_removal, "enemy-removal")
text = replace_once(
    text,
    '  private clearEntityVisuals(): void {\n    for (const group of this.enemyGroups.values()) this.disposeObject(group);\n',
    '  private clearEntityVisuals(): void {\n'
    '    for (const wreck of this.v4029Breakups.clear()) this.disposeObject(wreck);\n'
    '    this.v4029PendingBreakups.clear();\n'
    '    for (const group of this.enemyGroups.values()) this.disposeObject(group);\n',
    "clear",
)
WEBGL.write_text(text, encoding="utf-8")
print("V40.29 patch applied")
