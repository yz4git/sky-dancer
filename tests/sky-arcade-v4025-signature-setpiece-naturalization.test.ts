import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeV11SetpieceDirector } from "../src/sky/arcade/SkyDancerArcadeV11Setpieces";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function groups(scene: THREE.Scene, prefix: string): THREE.Group[] {
  const result: THREE.Group[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Group && object.name.startsWith(prefix)) result.push(object);
  });
  return result;
}

function meshGeometryTypes(root: THREE.Object3D): string[] {
  const types: string[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) types.push(object.geometry.type);
  });
  return types;
}

test("V40.25 Red Canyon knife-floor has seven natural rock signatures and no box walls", () => {
  const scene = new THREE.Scene();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(stage("red-canyon"));
  const sections = groups(scene, "arcade-v13-canyon-knife-");
  assert.equal(sections.length, 7);
  assert.ok(sections.every((section) => section.userData.arcadeV4025NaturalSignature === "canyon-rock-corridor"));
  assert.ok(sections.every((section) => !meshGeometryTypes(section).includes("BoxGeometry")));
  assert.ok(sections.every((section) => meshGeometryTypes(section).includes("IcosahedronGeometry")));
  director.dispose();
});

test("V40.25 Volcano magma-rift has seven basalt signatures and no box walls", () => {
  const scene = new THREE.Scene();
  const director = new SkyDancerArcadeV11SetpieceDirector(scene);
  director.setStage(stage("volcano-core"));
  const sections = groups(scene, "arcade-v13-magma-rift-");
  assert.equal(sections.length, 7);
  assert.ok(sections.every((section) => section.userData.arcadeV4025NaturalSignature === "basalt-rift-corridor"));
  assert.ok(sections.every((section) => !meshGeometryTypes(section).includes("BoxGeometry")));
  assert.ok(sections.every((section) => meshGeometryTypes(section).includes("DodecahedronGeometry")));
  director.dispose();
});
