import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { attachSkyDancerArcadeV4030EnemyDamage } from "../src/sky/arcade/SkyDancerArcadeV4030EnemyDamageState";
import {
  applySkyDancerArcadeV4031DirectionalDamage,
  resetSkyDancerArcadeV4031DirectionalDamage,
  syncSkyDancerArcadeV4031DirectionalDamage,
} from "../src/sky/arcade/SkyDancerArcadeV4031DirectionalDamage";
import {
  applySkyDancerArcadeV4032LocalizedReaction,
  skyDancerArcadeV4032ReactionProfile,
} from "../src/sky/arcade/SkyDancerArcadeV4032LocalizedReaction";

test("V40.32 keeps minor scars quiet and escalates wing body and tail history into distinct reactions", () => {
  const quiet = skyDancerArcadeV4032ReactionProfile({ latestZone: "left-wing", zones: ["left-wing"], hitCount: 1 }, .24);
  assert.equal(quiet.fragments, false);
  assert.equal(quiet.sparks, false);
  assert.equal(quiet.smoke, false);

  const damaged = skyDancerArcadeV4032ReactionProfile({
    latestZone: "left-wing",
    zones: ["tail", "fuselage", "left-wing"],
    hitCount: 3,
  }, .88);
  assert.equal(damaged.wingZone, "left-wing");
  assert.equal(damaged.fragments, true);
  assert.equal(damaged.sparks, true);
  assert.equal(damaged.smoke, true);
  assert.ok(damaged.intensity > .7);
});

test("V40.32 keeps all localized reactions inside one bounded presentation rig", () => {
  const rig = new THREE.Group();
  rig.userData.arcadeV4030DamageBlend = .92;
  applySkyDancerArcadeV4032LocalizedReaction(rig, 8, "fighter", {
    latestZone: "left-wing",
    zones: ["tail", "fuselage", "left-wing"],
    hitCount: 3,
  });

  const reaction = rig.getObjectByName("arcade-v4032-local-reaction");
  assert.ok(reaction instanceof THREE.Group);
  assert.equal(reaction.children.length, 3);
  assert.equal(rig.getObjectsByProperty("name", "arcade-v4032-local-reaction").length, 1);
  assert.equal(reaction.userData.arcadeV4032GameplayUnchanged, true);
  assert.equal(reaction.userData.arcadeV4032CollisionUnchanged, true);

  const fragments = reaction.getObjectByName("arcade-v4032-wing-fragments");
  const sparks = reaction.getObjectByName("arcade-v4032-local-sparks");
  const smoke = reaction.getObjectByName("arcade-v4032-tail-smoke");
  assert.ok(fragments instanceof THREE.LineSegments);
  assert.ok(sparks instanceof THREE.Points);
  assert.ok(smoke instanceof THREE.Points);
  assert.equal(fragments.visible, true);
  assert.equal(sparks.visible, true);
  assert.equal(smoke.visible, true);
  assert.ok(fragments.position.x < 0);

  let lights = 0;
  let meshes = 0;
  reaction.traverse((object) => {
    if (object instanceof THREE.Light) lights += 1;
    if (object instanceof THREE.Mesh) meshes += 1;
  });
  assert.equal(lights, 0);
  assert.equal(meshes, 0);
});

test("V40.32 moves wing debris to the newly damaged side without duplicating its reaction rig", () => {
  const rig = new THREE.Group();
  rig.userData.arcadeV4030DamageBlend = .84;
  applySkyDancerArcadeV4032LocalizedReaction(rig, 5, "striker", {
    latestZone: "left-wing",
    zones: ["left-wing"],
    hitCount: 1,
  });
  const fragments = rig.getObjectByName("arcade-v4032-wing-fragments");
  assert.ok(fragments instanceof THREE.LineSegments);
  assert.ok(fragments.position.x < 0);

  applySkyDancerArcadeV4032LocalizedReaction(rig, 5, "striker", {
    latestZone: "right-wing",
    zones: ["right-wing"],
    hitCount: 2,
  });
  assert.ok(fragments.position.x > 0);
  assert.equal(rig.getObjectsByProperty("name", "arcade-v4032-local-reaction").length, 1);
  assert.equal(rig.getObjectByName("arcade-v4032-tail-smoke")?.visible, false);
  assert.equal(rig.getObjectByName("arcade-v4032-local-sparks")?.visible, false);
});

test("V40.32 is driven by the existing V40.30 and V40.31 damage rig rather than a second render owner", () => {
  resetSkyDancerArcadeV4031DirectionalDamage();
  const group = new THREE.Group();
  const readable = new THREE.Group();
  readable.name = "arcade-enemy-v19-readable-attitude-rig";
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, .3, 1.8), new THREE.MeshStandardMaterial());
  body.name = "arcade-v4032-test-body";
  readable.add(body);
  group.add(readable);
  const rig = attachSkyDancerArcadeV4030EnemyDamage(group, 22, "fighter");
  rig.userData.arcadeV4030DamageBlend = 1;
  syncSkyDancerArcadeV4031DirectionalDamage([
    { serial: 71, enemyId: 22, kind: "fighter", x: 1, y: 0, boss: false, missile: false, destroyed: false },
    { serial: 72, enemyId: 22, kind: "fighter", x: -1, y: .8, boss: false, missile: false, destroyed: false },
    { serial: 73, enemyId: 22, kind: "fighter", x: -1, y: 0, boss: false, missile: true, destroyed: true },
  ], 9, -1, 0);
  applySkyDancerArcadeV4031DirectionalDamage(rig, 22, "fighter");

  const reaction = rig.getObjectByName("arcade-v4032-local-reaction");
  assert.ok(reaction instanceof THREE.Group);
  assert.equal(reaction.userData.arcadeV4032LocalizedReaction, true);
  assert.equal(reaction.userData.arcadeV4032LatestZone, "tail");
  assert.equal(group.getObjectsByProperty("name", "arcade-v4030-damage-rig").length, 1);
  assert.equal(group.getObjectsByProperty("name", "arcade-v4032-local-reaction").length, 1);
});

test("V40.32 wiring stays presentation-only and never enters Arcade runtime gameplay", () => {
  const directional = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV4031DirectionalDamage.ts", import.meta.url), "utf8");
  const localized = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV4032LocalizedReaction.ts", import.meta.url), "utf8");
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.match(directional, /applySkyDancerArcadeV4032LocalizedReaction/);
  assert.match(localized, /arcadeV4032GameplayUnchanged/);
  assert.match(localized, /arcadeV4032CollisionUnchanged/);
  assert.equal(runtime.includes("V4032LocalizedReaction"), false);
});
