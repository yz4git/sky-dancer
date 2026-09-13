import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  SkyDancerArcadePresentationDirector,
  type SkyDancerArcadePresentationSignals,
} from "../src/sky/arcade/SkyDancerArcadePresentationDirector";
import {
  createSkyDancerArcadeV4028BossWreckFx,
  skyDancerArcadeV4028BossWreckProfile,
  syncSkyDancerArcadeV4028BossWreckFx,
} from "../src/sky/arcade/SkyDancerArcadeV4028BossWreckFx";

const signal = (overrides: Partial<SkyDancerArcadePresentationSignals> = {}): SkyDancerArcadePresentationSignals => ({
  turboActive: false,
  nearMisses: 0,
  enemiesDefeated: 4,
  bossActive: true,
  hitSerial: 0,
  damageSerial: 0,
  stageSerial: 0,
  resultSerial: 0,
  ...overrides,
});

function makeBossScene(): { scene: THREE.Scene; boss: THREE.Group } {
  const scene = new THREE.Scene();
  const boss = new THREE.Group();
  boss.name = "arcade-enemy-99";
  const weakpoint = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.5, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  weakpoint.name = "arcade-boss-weakpoint";
  boss.add(weakpoint);
  scene.add(boss);
  return { scene, boss };
}

test("V40.28 raises the wreck envelope only for a real boss kill", () => {
  const director = new SkyDancerArcadePresentationDirector();
  const previous = signal();
  const destroyed = signal({ bossActive: false, enemiesDefeated: 5, hitSerial: 1 });
  const frame = director.update(destroyed, previous, 1 / 60);
  assert.ok((frame.bossWreck ?? 0) > .95);

  director.reset();
  const disengaged = signal({ bossActive: false, enemiesDefeated: 4 });
  const disengageFrame = director.update(disengaged, previous, 1 / 60);
  assert.equal(disengageFrame.bossWreck ?? 0, 0);
});

test("V40.28 keeps the local destruction budget bounded", () => {
  const cold = skyDancerArcadeV4028BossWreckProfile(-2);
  const hot = skyDancerArcadeV4028BossWreckProfile(4);
  assert.equal(cold.strength, 0);
  assert.equal(hot.strength, 1);
  assert.ok(hot.sparkOpacity <= .92);
  assert.ok(hot.emberOpacity <= .86);
  assert.ok(hot.smokeOpacity <= .48);
  assert.ok(hot.breachOpacity <= .72);

  const root = createSkyDancerArcadeV4028BossWreckFx();
  let lineSegments = 0;
  let points = 0;
  let meshes = 0;
  let lights = 0;
  root.traverse((object) => {
    if (object instanceof THREE.LineSegments) lineSegments += 1;
    if (object instanceof THREE.Points) points += 1;
    if (object instanceof THREE.Mesh) meshes += 1;
    if (object instanceof THREE.Light) lights += 1;
  });
  assert.equal(lineSegments, 1);
  assert.equal(points, 2);
  assert.equal(meshes, 8);
  assert.equal(lights, 0);
  assert.equal(root.userData.arcadeV4028PresentationOnly, true);
  assert.equal(root.userData.arcadeV4028GameplayUnchanged, true);
  assert.equal(root.userData.arcadeV4028CollisionUnchanged, true);
});

test("V40.28 attaches to the retained boss wreck and hides when the envelope ends", () => {
  const { scene, boss } = makeBossScene();
  assert.equal(syncSkyDancerArcadeV4028BossWreckFx(scene, .9, 10), true);
  const root = boss.getObjectByName("arcade-v4028-boss-wreck-fx");
  assert.ok(root instanceof THREE.Group);
  assert.equal(root.visible, true);
  assert.ok((root.userData.arcadeV4028Strength as number) >= .89);

  assert.equal(syncSkyDancerArcadeV4028BossWreckFx(scene, 0, 11), false);
  assert.equal(root.visible, false);
});

test("V40.28 does not create wreck FX when no boss silhouette is retained", () => {
  const scene = new THREE.Scene();
  const normal = new THREE.Group();
  normal.name = "arcade-enemy-7";
  scene.add(normal);
  assert.equal(syncSkyDancerArcadeV4028BossWreckFx(scene, 1, 3), false);
  assert.equal(scene.getObjectByName("arcade-v4028-boss-wreck-fx"), undefined);
});

test("V40.28 is wired through presentation rendering and stays outside runtime gameplay ownership", () => {
  const cinematic = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeCinematicRenderer.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(cinematic, /syncSkyDancerArcadeV4028BossWreckFx/);
  assert.match(cinematic, /fx\.bossWreck \?\? 0/);
  assert.equal(runtime.includes("V4028BossWreck"), false);
});
