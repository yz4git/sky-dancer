import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { skyDancerArcadeStageById } from "../src/sky/arcade/SkyDancerArcadeData";
import { createSkyDancerArcadeHazard } from "../src/sky/arcade/SkyDancerArcadeModels";

test("V40.21 renders lightning as additive FX instead of solid bolt meshes", () => {
  const stage = skyDancerArcadeStageById("storm-carrier");
  const lightning = createSkyDancerArcadeHazard(stage, {
    id: 4021,
    kind: "lightning",
    x: 0,
    y: 0,
    depth: 32,
    scale: 1,
  });

  const meshes: THREE.Mesh[] = [];
  const lines: THREE.Line[] = [];
  const points: THREE.Points[] = [];
  const lights: THREE.PointLight[] = [];
  lightning.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
    if (object instanceof THREE.Line) lines.push(object);
    if (object instanceof THREE.Points) points.push(object);
    if (object instanceof THREE.PointLight) lights.push(object);
  });

  assert.equal(lightning.name, "arcade-hazard-4021");
  assert.equal(lightning.userData.arcadeV4021LightningEffect, true);
  assert.equal(lightning.userData.arcadeV4021SolidGeometryRemoved, true);
  assert.equal(lightning.userData.arcadeV4021GameplayUnchanged, true);
  assert.equal(meshes.length, 0, "lightning should no longer be assembled from solid BoxGeometry meshes");
  assert.ok(lines.length >= 5, "main stroke, glow copies and branches should be line effects");
  assert.equal(points.length, 1, "one soft additive flash point should accompany the strike");
  assert.equal(lights.length, 1, "the strike should briefly light nearby geometry");
  assert.ok(lines.every((line) => line.material instanceof THREE.LineBasicMaterial));
  assert.ok(lines.every((line) => (line.material as THREE.LineBasicMaterial).blending === THREE.AdditiveBlending));
});

test("V40.21 leaves non-lightning hazard rendering on the proven legacy path", () => {
  const stage = skyDancerArcadeStageById("red-canyon");
  const rock = createSkyDancerArcadeHazard(stage, {
    id: 77,
    kind: "rock",
    x: 0,
    y: 0,
    depth: 36,
    scale: 1,
  });

  assert.notEqual(rock.userData.arcadeV4021LightningEffect, true);
  assert.ok(rock.children.some((child) => child instanceof THREE.Mesh));
});
