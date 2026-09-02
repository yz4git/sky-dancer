import test from "node:test";
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
