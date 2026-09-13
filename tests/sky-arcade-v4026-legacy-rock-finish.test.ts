import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function legacyStructureMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const environment = scene.getObjectByName("arcade-course-environment")!;
  const meshes: THREE.Mesh[] = [];
  for (const chunk of environment.children.filter((object) => object.name.startsWith("arcade-course-chunk-"))) {
    for (const container of chunk.children) {
      if (!(container instanceof THREE.Group) || container.name !== "") continue;
      for (const object of container.children) {
        if (object instanceof THREE.Mesh && object.name === "arcade-baked-airframe") meshes.push(object);
      }
    }
  }
  return meshes;
}

for (const id of ["red-canyon", "volcano-core"] as const) {
  test(`V40.26 ${id} finishes only legacy baked structure scenery`, () => {
    const scene = new THREE.Scene();
    const environment = new SkyDancerArcadeEnvironment(scene);
    environment.setStage(stage(id));
    const meshes = legacyStructureMeshes(scene);
    const finished = meshes.filter((mesh) => mesh.userData.arcadeV4026NaturalRockFinish === true);
    assert.ok(meshes.length > 0);
    assert.equal(finished.length, meshes.length);
    assert.ok(finished.every((mesh) => mesh.userData.arcadeV4026PresentationOnly === true));

    const heroName = id === "red-canyon" ? "arcade-v16-canyon-broken-arch" : "arcade-v16-volcano-caldera-spire";
    const hero = scene.getObjectByName(heroName)!;
    const heroBaked = hero.getObjectsByProperty("name", "arcade-baked-airframe");
    assert.ok(heroBaked.length > 0);
    assert.ok(heroBaked.every((object) => object.userData.arcadeV4026NaturalRockFinish !== true));
    environment.dispose();
  });
}

test("V40.26 stays presentation-only and outside runtime ownership", () => {
  const source = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV4026LegacyRockFinish.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(source, /arcadeV4026LogicalCollisionUnchanged/);
  assert.match(source, /container\.name !== ""/);
  assert.match(source, /object\.name === "arcade-baked-airframe"/);
  assert.equal(runtime.includes("V4026"), false);
  assert.equal(runtime.includes("arcadeV4026"), false);
});
