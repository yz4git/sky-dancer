import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import {
  attachSkyDancerArcadeV4030EnemyDamage,
  resetSkyDancerArcadeV4030DamageRegistry,
  skyDancerArcadeV4030DamageForEnemy,
  skyDancerArcadeV4030DamageProfile,
  syncSkyDancerArcadeV4030DamageRegistry,
} from "../src/sky/arcade/SkyDancerArcadeV4030EnemyDamageState";

const makeEnemy = () => {
  const group = new THREE.Group();
  const readable = new THREE.Group();
  readable.name = "arcade-enemy-v19-readable-attitude-rig";
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, .3, 1.8), new THREE.MeshStandardMaterial({ color: 0x8899aa }));
  body.name = "arcade-v4030-test-body";
  readable.add(body);
  group.add(readable);
  return { group, readable, body };
};

test("V40.30 maps remaining hull HP into clean plus three readable damage bands", () => {
  assert.equal(skyDancerArcadeV4030DamageProfile(100, 100).band, "clean");
  assert.equal(skyDancerArcadeV4030DamageProfile(65, 100).band, "scarred");
  assert.equal(skyDancerArcadeV4030DamageProfile(35, 100).band, "damaged");
  assert.equal(skyDancerArcadeV4030DamageProfile(12, 100).band, "critical");
  assert.equal(skyDancerArcadeV4030DamageProfile(100, 100).severity, 0);
  assert.ok(skyDancerArcadeV4030DamageProfile(12, 100).severity > .9);
});

test("V40.30 registry follows authoritative HP but excludes hero combat identities", () => {
  resetSkyDancerArcadeV4030DamageRegistry();
  syncSkyDancerArcadeV4030DamageRegistry([
    { id: 1, kind: "fighter", hp: 30, maxHp: 100, boss: false },
    { id: 2, kind: "ace", hp: 5, maxHp: 100, boss: false, rivalAce: true },
    { id: 3, kind: "gunship", hp: 5, maxHp: 100, boss: false, worldBreakTarget: true },
    { id: 4, kind: "boss", hp: 5, maxHp: 100, boss: true },
  ], [], 7, .016);
  assert.equal(skyDancerArcadeV4030DamageForEnemy(1).band, "damaged");
  assert.equal(skyDancerArcadeV4030DamageForEnemy(2).band, "clean");
  assert.equal(skyDancerArcadeV4030DamageForEnemy(3).band, "clean");
  assert.equal(skyDancerArcadeV4030DamageForEnemy(4).band, "clean");
});

test("V40.30 mounts local scars breaches and sparks on the visual body without dynamic lights", () => {
  resetSkyDancerArcadeV4030DamageRegistry();
  const { group, readable } = makeEnemy();
  const rig = attachSkyDancerArcadeV4030EnemyDamage(group, 7, "fighter");
  assert.equal(rig.parent, readable);
  assert.equal(rig.userData.arcadeV4030PresentationOnly, true);
  assert.equal(rig.userData.arcadeV4030GameplayUnchanged, true);
  assert.equal(rig.userData.arcadeV4030CollisionUnchanged, true);
  assert.equal(rig.getObjectsByProperty("name", "arcade-v4030-damage-scar").length, 3);
  assert.equal(rig.getObjectsByProperty("name", "arcade-v4030-damage-breach").length, 3);
  assert.ok(rig.getObjectByName("arcade-v4030-damage-sparks") instanceof THREE.Points);
  let lights = 0;
  rig.traverse((object) => { if (object instanceof THREE.Light) lights += 1; });
  assert.equal(lights, 0);
  assert.equal(group.userData.arcadeV4030LogicalCollisionUnchanged, true);
});

test("V40.30 destroyed impacts force a short critical handoff for V40.29 wrecks", () => {
  resetSkyDancerArcadeV4030DamageRegistry();
  syncSkyDancerArcadeV4030DamageRegistry([
    { id: 12, kind: "interceptor", hp: 100, maxHp: 100, boss: false },
  ], [
    { enemyId: 12, kind: "interceptor", boss: false, destroyed: true },
  ], 9, .016);
  assert.equal(skyDancerArcadeV4030DamageForEnemy(12).band, "critical");
  assert.equal(skyDancerArcadeV4030DamageForEnemy(12).severity, 1);
  syncSkyDancerArcadeV4030DamageRegistry([], [], 9, .5);
  assert.equal(skyDancerArcadeV4030DamageForEnemy(12).band, "critical");
  for (let i = 0; i < 20; i += 1) syncSkyDancerArcadeV4030DamageRegistry([], [], 9, .1);
  assert.equal(skyDancerArcadeV4030DamageForEnemy(12).band, "clean");
});

test("V40.30 is wired only through presentation/model rendering and never runtime gameplay", () => {
  const director = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadePresentationDirector.ts", import.meta.url), "utf8");
  const models = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeModels.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  const breakup = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV4029EnemyBreakup.ts", import.meta.url), "utf8");
  assert.match(director, /syncSkyDancerArcadeV4030DamageRegistry/);
  assert.match(models, /attachSkyDancerArcadeV4030EnemyDamage/);
  assert.match(breakup, /this\.root\.add\(group, fragmentSet\.root\)/);
  assert.equal(runtime.includes("V4030EnemyDamageState"), false);
});
