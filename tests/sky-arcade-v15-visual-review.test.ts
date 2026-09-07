import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeEnvironment } from "../src/sky/arcade/SkyDancerArcadeEnvironment";
import {
  skyDancerArcadeV15CorridorVertexX,
  skyDancerArcadeV15IceFangX,
  skyDancerArcadeV15OrbitChunkVisible,
  skyDancerArcadeV15OrbitCueVisible,
} from "../src/sky/arcade/SkyDancerArcadeV15VisualTuning";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

test("V15 phone corridor tuning moves side decoration outward without touching the center", () => {
  const canyon = stage("red-canyon");
  const ice = stage("ice-cavern");
  const volcano = stage("volcano-core");
  assert.equal(skyDancerArcadeV15CorridorVertexX(ice, 6), 6);
  assert.ok(skyDancerArcadeV15CorridorVertexX(canyon, 32) > 32);
  assert.ok(skyDancerArcadeV15CorridorVertexX(ice, -32) < -32);
  assert.ok(skyDancerArcadeV15CorridorVertexX(volcano, 28) >= 38);
  assert.equal(skyDancerArcadeV15IceFangX(12), 18.5);
});

test("V15 live Ice Cavern keeps pressure fangs outside the hero line", () => {
  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("ice-cavern"));
  const fangs = scene.getObjectsByProperty("name", "arcade-ice-pressure-fang");
  assert.ok(fangs.length > 0);
  assert.ok(fangs.every((fang) => Math.abs(fang.position.x) >= 18));
  assert.ok(fangs.every((fang) => fang.scale.x <= .8));
  const root = scene.getObjectByName("arcade-course-environment")!;
  const chunks = root.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
  assert.ok(chunks.every((chunk) => chunk.userData.arcadeV15PhoneCorridorTuned === true));
  environment.dispose();
});

test("V15 Orbital Ascent breaks the repeated concentric tunnel rhythm", () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => skyDancerArcadeV15OrbitChunkVisible(index)), [true,false,true,false,true,false,true,false]);
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => skyDancerArcadeV15OrbitCueVisible(index)), [true,false,true,false,true,false]);

  const scene = new THREE.Scene();
  const environment = new SkyDancerArcadeEnvironment(scene);
  environment.setStage(stage("orbital-ascent"));
  const root = scene.getObjectByName("arcade-course-environment")!;
  const chunks = root.children.filter((object) => object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.filter((chunk) => chunk.visible).length, 4);

  const cues = scene.getObjectsByProperty("name", "arcade-orbit-helix-cue");
  assert.equal(cues.filter((cue) => cue.visible).length, 5, "ten authored cues become five open-space beats");
  for (const cue of cues.filter((candidate) => candidate.visible)) {
    const visibleTori: THREE.Mesh[] = [];
    cue.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry.type === "TorusGeometry" && object.visible) visibleTori.push(object);
    });
    assert.equal(visibleTori.length, 1, "each visible orbital beat keeps one offset arc, not a reconstructed ring");
  }
  environment.dispose();
});
