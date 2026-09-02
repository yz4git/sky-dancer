from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing patch needle in {path}: {old[:120]!r}")
    p.write_text(s.replace(old, new, 1))

setpieces = r'''import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import type { SkyDancerArcadeSnapshot } from "./SkyDancerArcadeRuntime";
import { arcadeCourseRelativeVisualPose } from "./SkyDancerArcadeCoursePath";
import { arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";

interface V11SetpieceAnchor {
  group: THREE.Group;
  fraction: number;
  beatIds: readonly string[];
  movingTrain?: THREE.Group;
  trainPhase?: number;
}

function material(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: .62,
    metalness: .34,
    emissive,
    emissiveIntensity: emissive ? 1.55 : 0,
  });
}

function glow(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}

function box(
  group: THREE.Group,
  size: [number, number, number],
  mat: THREE.Material,
  position: [number, number, number],
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  if (name) mesh.name = name;
  group.add(mesh);
  return mesh;
}

function disposeTree(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((mat) => mat.dispose());
  root.clear();
}

/**
 * V11.1 signature setpiece owner.
 *
 * These pieces are not a second scrolling background. Every rigid section owns one absolute
 * course distance and is transformed through the same V10.4 player-local course frame as the
 * reference world. The only independent translation is the named Night Metro train, which
 * moves along a visibly authored rail and therefore reads as an actor rather than scenery drift.
 */
export class SkyDancerArcadeV11SetpieceDirector {
  private readonly root = new THREE.Group();
  private readonly anchors: V11SetpieceAnchor[] = [];
  private stageId = "";

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = "arcade-v11-signature-setpieces";
    this.root.userData.arcadeV11CourseAnchoredSetpieces = true;
    this.scene.add(this.root);
  }

  setStage(stage: SkyDancerArcadeStageDefinition): void {
    if (this.stageId === stage.id) return;
    this.clear();
    this.stageId = stage.id;
    if (stage.id === "cloud-fleet") this.buildCloudFleet(stage);
    if (stage.id === "night-metro") this.buildNightMetro(stage);
  }

  update(snapshot: SkyDancerArcadeSnapshot): void {
    if (this.stageId !== snapshot.stage.id) this.setStage(snapshot.stage);
    const stageLength = snapshot.stage.durationSeconds * snapshot.stage.courseSpeed;
    const attitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);
    for (const anchor of this.anchors) {
      const anchorDistance = stageLength * anchor.fraction;
      const depth = anchorDistance - snapshot.distance;
      const pose = arcadeCourseRelativeVisualPose(snapshot.stage, snapshot.distance, depth);
      anchor.group.position.set(pose.x, pose.y, pose.z);
      anchor.group.rotation.set(attitude.pitch, attitude.yaw, attitude.roll);
      anchor.group.visible = anchor.beatIds.includes(snapshot.timelineBeatId) && depth > -95 && depth < 210;
      anchor.group.userData.arcadeV11AbsoluteCourseDistance = anchorDistance;
      anchor.group.userData.arcadeV11RelativeDepth = depth;
      if (anchor.movingTrain) {
        const phase = anchor.trainPhase ?? 0;
        const travel = ((snapshot.runTimeSeconds * 24 + phase) % 46) - 23;
        anchor.movingTrain.position.z = travel;
        anchor.movingTrain.userData.arcadeV11IntentionalRailTravel = true;
      }
    }
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.root);
  }

  private addAnchor(group: THREE.Group, fraction: number, beatIds: readonly string[], movingTrain?: THREE.Group, trainPhase?: number): void {
    group.userData.arcadeV11CourseAnchor = true;
    this.root.add(group);
    this.anchors.push({ group, fraction, beatIds, movingTrain, trainPhase });
  }

  private buildCloudFleet(stage: SkyDancerArcadeStageDefinition): void {
    const hull = material(0xdce9ef);
    const dark = material(0x32495d);
    const deck = material(0x71899a);
    const light = glow(stage.palette.accent);
    const engine = glow(0xffcb63);

    // Six overlapping 34m course anchors make one readable capital-ship deck traversal while
    // still following the curved course instead of becoming one giant straight slab.
    for (let index = 0; index < 6; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-cloud-deck-section-${index}`;
      section.userData.arcadeV11SetpieceIdentity = "capital-ship-deck-run";
      box(section, [34, 1.15, 38], deck, [0, -7.8, 0], "arcade-v11-cloud-flight-deck");
      box(section, [24, 7.8, 34], hull, [0, -12.1, 2]);
      box(section, [33.2, .18, .38], light, [0, -7.05, -16.5]);
      box(section, [33.2, .18, .38], light, [0, -7.05, 16.5]);
      const islandSide = index % 2 === 0 ? 1 : -1;
      box(section, [5.8, 11.5, 8], dark, [islandSide * 18.8, -1.7, 2]);
      box(section, [.8, 8.5, 8.2], light, [islandSide * 15.5, -1.7, 2]);
      this.addAnchor(section, .325 + index * .0118, ["deck-run"]);
    }

    // Approach past the flagship engines: a side-mounted mass leaves the combat lane open but
    // gives the boss ingress a scale reference that is much larger than ordinary enemy craft.
    for (let index = 0; index < 5; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-cloud-cruiser-section-${index}`;
      section.userData.arcadeV11SetpieceIdentity = "cumulus-cruiser-approach";
      const side = index % 2 === 0 ? 1 : -1;
      box(section, [20, 8.5, 42], dark, [side * 24, -7, 0]);
      box(section, [26, 1, 30], deck, [side * 22, -2.4, -2]);
      box(section, [6, 13, 8], hull, [side * 29, 4.2, 3]);
      for (const engineSide of [-1, 1]) {
        box(section, [4.8, 3, 6], engine, [side * 24 + engineSide * 5.4, -10.5, 16]);
      }
      this.addAnchor(section, .475 + index * .014, ["cruiser-approach", "cumulus-cruiser"]);
    }
  }

  private buildNightMetro(stage: SkyDancerArcadeStageDefinition): void {
    const rail = material(0x10182a);
    const structure = material(0x273554);
    const purple = material(stage.palette.secondary);
    const cyan = glow(stage.palette.accent);
    const pink = glow(0xff4f91);

    // Pursuit rails follow the actual spline in short bands. This avoids the old failure mode where
    // one long transit slab visibly slid or swivelled against the world on sharp turns.
    for (let index = 0; index < 7; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-night-rail-section-${index}`;
      section.userData.arcadeV11SetpieceIdentity = "elevated-metro-pursuit";
      for (const side of [-1, 1]) {
        box(section, [8.5, 1.3, 34], rail, [side * 20, -8.4, 0]);
        box(section, [.32, .22, 33], cyan, [side * 16.5, -7.55, 0]);
        box(section, [1.2, 12, 1.2], structure, [side * 23.5, -14.2, -10]);
        box(section, [1.2, 12, 1.2], structure, [side * 23.5, -14.2, 10]);
      }
      this.addAnchor(section, .145 + index * .015, ["metro-chase"]);
    }

    const trainSection = new THREE.Group();
    trainSection.name = "arcade-v11-night-train-anchor";
    trainSection.userData.arcadeV11SetpieceIdentity = "metro-train-actor";
    box(trainSection, [8.5, 1.3, 58], rail, [20, -8.4, 0]);
    box(trainSection, [.32, .22, 56], cyan, [16.5, -7.55, 0]);
    const train = new THREE.Group();
    train.name = "arcade-v11-night-train";
    box(train, [9, 5.4, 22], purple, [20, -4.8, 0]);
    box(train, [8.2, 1.1, 20], pink, [20, -1.6, 0]);
    for (let windowIndex = -3; windowIndex <= 3; windowIndex += 1) {
      box(train, [.18, 1.5, 1.8], cyan, [15.42, -4.2, windowIndex * 2.6]);
    }
    trainSection.add(train);
    this.addAnchor(trainSection, .235, ["metro-chase", "neon-gantry"], train, 7);

    // Repeated short gantry/tunnel ribs are each course anchored. The opening remains wider than
    // the player's full control envelope; they create a chase tunnel without becoming unfair walls.
    for (let index = 0; index < 8; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-night-gantry-section-${index}`;
      section.userData.arcadeV11SetpieceIdentity = "neon-transit-gate-run";
      box(section, [1.3, 25, 2], structure, [-22, 1, 0]);
      box(section, [1.3, 25, 2], structure, [22, 1, 0]);
      box(section, [45, 1.35, 2], purple, [0, 13.3, 0]);
      box(section, [38, .22, 2.2], cyan, [0, 12.35, 0]);
      box(section, [9, .7, 28], rail, [-20, -9.4, 0]);
      box(section, [9, .7, 28], rail, [20, -9.4, 0]);
      this.addAnchor(section, .305 + index * .0145, ["neon-gantry"]);
    }

    for (let index = 0; index < 5; index += 1) {
      const section = new THREE.Group();
      section.name = `arcade-v11-night-phantom-section-${index}`;
      section.userData.arcadeV11SetpieceIdentity = "phantom-tunnel-exit";
      const side = index % 2 === 0 ? 1 : -1;
      box(section, [8, 19, 32], structure, [side * 27, 0, 0]);
      box(section, [1, 17, 33], pink, [side * 22.8, 0, 0]);
      box(section, [34, .9, 28], rail, [0, -10, 0]);
      box(section, [31, .18, 27], cyan, [0, -9.35, 0]);
      this.addAnchor(section, .472 + index * .016, ["phantom-pursuit", "neon-phantom"]);
    }
  }

  private clear(): void {
    for (const child of [...this.root.children]) {
      this.root.remove(child);
      disposeTree(child);
    }
    this.anchors.length = 0;
  }
}
'''
Path("src/sky/arcade/SkyDancerArcadeV11Setpieces.ts").write_text(setpieces)

webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
replace_once(webgl,
'''import { arcadeGroundSurfaceLocalYV1052, arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";\n''',
'''import { arcadeGroundSurfaceLocalYV1052, arcadeSharedSceneryAttitudeV1041 } from "./SkyDancerArcadeReferenceWorld";\nimport { SkyDancerArcadeV11SetpieceDirector } from "./SkyDancerArcadeV11Setpieces";\n''')
replace_once(webgl,
'''  private readonly presentation: SkyDancerArcadeProductPresentation;\n  private readonly player = createSkyDancerArcadePlayer();\n''',
'''  private readonly presentation: SkyDancerArcadeProductPresentation;\n  private readonly v11Setpieces: SkyDancerArcadeV11SetpieceDirector;\n  private readonly player = createSkyDancerArcadePlayer();\n''')
replace_once(webgl,
'''    this.environment = new SkyDancerArcadeEnvironment(this.scene);\n    this.environment.setStage(this.previousSnapshot.stage);\n    this.updateReflections(this.previousSnapshot);\n''',
'''    this.environment = new SkyDancerArcadeEnvironment(this.scene);\n    this.environment.setStage(this.previousSnapshot.stage);\n    this.v11Setpieces = new SkyDancerArcadeV11SetpieceDirector(this.scene);\n    this.v11Setpieces.setStage(this.previousSnapshot.stage);\n    this.updateReflections(this.previousSnapshot);\n''')
replace_once(webgl,
'''      this.environment.setStage(snapshot.stage);\n      this.updateReflections(snapshot);\n''',
'''      this.environment.setStage(snapshot.stage);\n      this.v11Setpieces.setStage(snapshot.stage);\n      this.updateReflections(snapshot);\n''')
replace_once(webgl,
'''    this.environment.update(snapshot.distance, snapshot.playerX, snapshot.playerY);\n    this.syncPlayer(snapshot, delta);\n''',
'''    this.environment.update(snapshot.distance, snapshot.playerX, snapshot.playerY);\n    this.v11Setpieces.update(snapshot);\n    this.syncPlayer(snapshot, delta);\n''')
replace_once(webgl,
'''    this.environment.dispose();\n    this.clearEntityVisuals();\n''',
'''    this.environment.dispose();\n    this.v11Setpieces.dispose();\n    this.clearEntityVisuals();\n''')

test_file = r'''import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { SkyDancerArcadeV11SetpieceDirector } from "../src/sky/arcade/SkyDancerArcadeV11Setpieces";
import { arcadeSharedSceneryAttitudeV1041 } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";

function visibleNamed(scene: THREE.Scene, prefix: string): THREE.Object3D[] {
  const result: THREE.Object3D[] = [];
  scene.traverse((object) => { if (object.visible && object.name.startsWith(prefix)) result.push(object); });
  return result;
}

test("V11.1 Cloud Fleet deck run is real course-anchored geometry", () => {
  const scene = new THREE.Scene();
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", startStageId: "cloud-fleet", difficulty: "normal", seed: 311 });
  runtime.triggerV11TimelineForTests(.35);
  const snapshot = runtime.getSnapshot();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(snapshot.stage);
  director.update(snapshot);
  const sections = visibleNamed(scene, "arcade-v11-cloud-deck-section-");
  assert.ok(sections.length >= 2, `visible deck sections ${sections.length}`);
  const attitude = arcadeSharedSceneryAttitudeV1041(snapshot.stage, snapshot.distance);
  for (const section of sections) {
    assert.equal(section.userData.arcadeV11CourseAnchor, true);
    assert.equal(section.userData.arcadeV11SetpieceIdentity, "capital-ship-deck-run");
    assert.ok(Math.abs(section.rotation.x - attitude.pitch) < 1e-9);
    assert.ok(Math.abs(section.rotation.y - attitude.yaw) < 1e-9);
    assert.ok(Math.abs(section.rotation.z - attitude.roll) < 1e-9);
    assert.ok(Number.isFinite(section.position.x + section.position.y + section.position.z));
  }
  director.dispose();
  assert.equal(scene.getObjectByName("arcade-v11-signature-setpieces"), undefined);
});

test("V11.1 Night Metro train moves deliberately on a course-anchored rail", () => {
  const scene = new THREE.Scene();
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", startStageId: "night-metro", difficulty: "normal", seed: 312 });
  runtime.triggerV11TimelineForTests(.235);
  const snapshot = runtime.getSnapshot();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(snapshot.stage);
  director.update(snapshot);
  const anchor = scene.getObjectByName("arcade-v11-night-train-anchor");
  const train = scene.getObjectByName("arcade-v11-night-train");
  assert.ok(anchor && anchor.visible);
  assert.ok(train);
  const beforeAnchor = anchor!.position.clone();
  const beforeTrainZ = train!.position.z;
  director.update({ ...snapshot, runTimeSeconds: snapshot.runTimeSeconds + 1 });
  assert.ok(anchor!.position.distanceTo(beforeAnchor) < 1e-9, "rail anchor must not drift when only actor time changes");
  assert.notEqual(train!.position.z, beforeTrainZ, "train deliberately advances along its rail");
  assert.equal(train!.userData.arcadeV11IntentionalRailTravel, true);
  director.dispose();
});

test("V11.1 Night Metro gantries form a repeated but course-coherent tunnel beat", () => {
  const scene = new THREE.Scene();
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", startStageId: "night-metro", difficulty: "normal", seed: 313 });
  runtime.triggerV11TimelineForTests(.36);
  const snapshot = runtime.getSnapshot();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(snapshot.stage);
  director.update(snapshot);
  const sections = visibleNamed(scene, "arcade-v11-night-gantry-section-");
  assert.ok(sections.length >= 2, `visible gantry sections ${sections.length}`);
  assert.ok(sections.every((section) => section.userData.arcadeV11SetpieceIdentity === "neon-transit-gate-run"));
  director.dispose();
});
'''
Path("tests/sky-arcade-v111-setpieces.test.ts").write_text(test_file)

p = Path("docs/ARCADE_V11_EVOLUTION.md")
s = p.read_text()
s += r'''

## V11.1 — Signature Setpiece Traversal
- Cloud Fleet DECK RUN now owns a multi-anchor capital-ship deck corridor that follows the real spline.
- CUMULUS CRUISER approach gains close flagship mass and engine scale references.
- Night Metro METRO CHASE gains course-anchored elevated rails plus one clearly intentional moving train actor.
- NEON GANTRY and PHANTOM PURSUIT gain short course-anchored tunnel/gate bands rather than one long sliding slab.
- All rigid V11.1 setpieces use the V10.4 shared world attitude; no signature structure receives an independent background scroll speed.
'''
p.write_text(s)

print("V11.1 signature setpieces applied")
