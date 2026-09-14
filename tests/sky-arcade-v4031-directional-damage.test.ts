import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { attachSkyDancerArcadeV4030EnemyDamage } from "../src/sky/arcade/SkyDancerArcadeV4030EnemyDamageState";
import {
  applySkyDancerArcadeV4031DirectionalDamage,
  resetSkyDancerArcadeV4031DirectionalDamage,
  skyDancerArcadeV4031DirectionalForEnemy,
  skyDancerArcadeV4031ResolveDamageZone,
  syncSkyDancerArcadeV4031DirectionalDamage,
} from "../src/sky/arcade/SkyDancerArcadeV4031DirectionalDamage";

test("V40.31 resolves side altitude and rear attack lines into different aircraft zones", () => {
  assert.equal(skyDancerArcadeV4031ResolveDamageZone({ impactX: 1, impactY: 0, playerX: -1, playerY: 0, missile: false, serial: 1 }), "left-wing");
  assert.equal(skyDancerArcadeV4031ResolveDamageZone({ impactX: -1, impactY: 0, playerX: 1, playerY: 0, missile: false, serial: 2 }), "right-wing");
  assert.equal(skyDancerArcadeV4031ResolveDamageZone({ impactX: 0, impactY: .8, playerX: 0, playerY: -.8, missile: false, serial: 3 }), "fuselage");
  assert.equal(skyDancerArcadeV4031ResolveDamageZone({ impactX: 0, impactY: 0, playerX: .05, playerY: .04, missile: true, serial: 4 }), "tail");
});

test("V40.31 keeps the last three real impact zones and deduplicates snapshot serials", () => {
  resetSkyDancerArcadeV4031DirectionalDamage();
  const impacts = [
    { serial: 11, enemyId: 7, kind: "fighter" as const, x: 1, y: 0, boss: false, missile: false, destroyed: false },
    { serial: 12, enemyId: 7, kind: "fighter" as const, x: 0, y: .8, boss: false, missile: false, destroyed: false },
    { serial: 13, enemyId: 7, kind: "fighter" as const, x: 0, y: 0, boss: false, missile: true, destroyed: true },
  ];
  syncSkyDancerArcadeV4031DirectionalDamage(impacts, 4, 0, 0);
  syncSkyDancerArcadeV4031DirectionalDamage(impacts, 4, 0, 0);
  const state = skyDancerArcadeV4031DirectionalForEnemy(7);
  assert.equal(state.hitCount, 3);
  assert.deepEqual(state.zones, ["left-wing", "fuselage", "tail"]);
  assert.equal(state.latestZone, "tail");
});

test("V40.31 repositions the existing V40.30 scars breaches and sparks instead of adding a second damage rig", () => {
  resetSkyDancerArcadeV4031DirectionalDamage();
  const group = new THREE.Group();
  const readable = new THREE.Group();
  readable.name = "arcade-enemy-v19-readable-attitude-rig";
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, .3, 1.8), new THREE.MeshStandardMaterial());
  body.name = "arcade-v4031-test-body";
  readable.add(body);
  group.add(readable);
  const rig = attachSkyDancerArcadeV4030EnemyDamage(group, 21, "fighter");
  syncSkyDancerArcadeV4031DirectionalDamage([
    { serial: 40, enemyId: 21, kind: "fighter", x: 1, y: 0, boss: false, missile: false, destroyed: false },
  ], 8, -1, 0);
  applySkyDancerArcadeV4031DirectionalDamage(rig, 21, "fighter");
  const scar = rig.getObjectsByProperty("name", "arcade-v4030-damage-scar")[0];
  const breach = rig.getObjectsByProperty("name", "arcade-v4030-damage-breach")[0];
  const sparks = rig.getObjectByName("arcade-v4030-damage-sparks");
  assert.ok(scar.position.x < 0);
  assert.ok(breach.position.x < 0);
  assert.ok((sparks?.position.x ?? 0) < 0);
  assert.equal(scar.userData.arcadeV4031DamageZone, "left-wing");
  assert.equal(rig.userData.arcadeV4031DirectionalDamage, true);
  assert.equal(rig.userData.arcadeV4031GameplayUnchanged, true);
  assert.equal(rig.userData.arcadeV4031CollisionUnchanged, true);
  assert.equal(group.getObjectsByProperty("name", "arcade-v4030-damage-rig").length, 1);
});

test("V40.31 stage handoff clears old local damage history", () => {
  resetSkyDancerArcadeV4031DirectionalDamage();
  syncSkyDancerArcadeV4031DirectionalDamage([
    { serial: 1, enemyId: 5, kind: "interceptor", x: 1, y: 0, boss: false, missile: false, destroyed: false },
  ], 1, -1, 0);
  assert.equal(skyDancerArcadeV4031DirectionalForEnemy(5).hitCount, 1);
  syncSkyDancerArcadeV4031DirectionalDamage([], 2, 0, 0);
  assert.equal(skyDancerArcadeV4031DirectionalForEnemy(5).hitCount, 0);
});

test("V40.31 stays in presentation rendering and never becomes a runtime gameplay owner", () => {
  const director = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadePresentationDirector.ts", import.meta.url), "utf8");
  const damage = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV4030EnemyDamageState.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(director, /syncSkyDancerArcadeV4031DirectionalDamage/);
  assert.match(damage, /applySkyDancerArcadeV4031DirectionalDamage/);
  assert.equal(runtime.includes("V4031DirectionalDamage"), false);
});
