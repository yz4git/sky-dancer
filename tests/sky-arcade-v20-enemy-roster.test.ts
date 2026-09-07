import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  SKY_DANCER_ARCADE_ENEMY_KINDS,
  SKY_DANCER_ARCADE_STAGES,
  type SkyDancerArcadeEnemyKind,
} from "../src/sky/arcade/SkyDancerArcadeData";
import { createSkyDancerArcadeEnemyAirframeV18 } from "../src/sky/arcade/SkyDancerArcadeEnemyAirframes";
import { createSkyDancerArcadeEnemy } from "../src/sky/arcade/SkyDancerArcadeModels";
import {
  skyDancerArcadeEnemyHitRadiusV20,
  skyDancerArcadeEnemyStatsV20,
  type SkyDancerArcadeEnemySnapshot,
} from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { skyDancerArcadeArmorRatio, skyDancerArcadeEnemyRole } from "../src/sky/arcade/SkyDancerArcadeV10Systems";

const stage = SKY_DANCER_ARCADE_STAGES[0];
const newKinds = ["drone", "striker", "gunship", "raider"] as const satisfies readonly SkyDancerArcadeEnemyKind[];

function snapshot(kind: SkyDancerArcadeEnemyKind, id: number): SkyDancerArcadeEnemySnapshot {
  const stats = skyDancerArcadeEnemyStatsV20(kind, false);
  const armor = Math.round(stats.hp * skyDancerArcadeArmorRatio(kind));
  return {
    id, kind, x: 0, y: 0, depth: 48,
    hp: stats.hp, maxHp: stats.hp, locked: false, boss: false, phase: 0,
    maneuver: "approach", role: skyDancerArcadeEnemyRole(kind),
    armor, maxArmor: armor, bossPhase: 1, weakpointOpen: false, stagger: 0,
    counterplay: "none", counterplayIntensity: 0,
  };
}

test("V20 expands the normal Arcade Run roster from five to nine enemy kinds", () => {
  assert.equal(SKY_DANCER_ARCADE_ENEMY_KINDS.length, 9);
  assert.equal(new Set(SKY_DANCER_ARCADE_ENEMY_KINDS).size, 9);
  for (const kind of newKinds) assert.ok(SKY_DANCER_ARCADE_ENEMY_KINDS.includes(kind));
});

test("V20 introduces new enemies progressively and the finale can remix the full roster", () => {
  assert.ok(SKY_DANCER_ARCADE_STAGES[0].enemies.includes("drone"));
  const finale = SKY_DANCER_ARCADE_STAGES.find(stage => stage.id === "prism-citadel");
  assert.ok(finale);
  assert.deepEqual(new Set(finale.enemies), new Set(SKY_DANCER_ARCADE_ENEMY_KINDS));
  for (const kind of newKinds) {
    const appearances = SKY_DANCER_ARCADE_STAGES.filter(stage => stage.enemies.includes(kind)).length;
    assert.ok(appearances >= 3, `${kind} only appears in ${appearances} stages`);
  }
});

test("V20 new enemy classes occupy different combat niches", () => {
  const drone = skyDancerArcadeEnemyStatsV20("drone", false);
  const fighter = skyDancerArcadeEnemyStatsV20("fighter", false);
  const raider = skyDancerArcadeEnemyStatsV20("raider", false);
  const striker = skyDancerArcadeEnemyStatsV20("striker", false);
  const gunship = skyDancerArcadeEnemyStatsV20("gunship", false);
  const bomber = skyDancerArcadeEnemyStatsV20("bomber", false);
  assert.ok(drone.hp < fighter.hp && drone.speed > fighter.speed);
  assert.ok(raider.speed > fighter.speed && raider.hp > fighter.hp);
  assert.ok(striker.hp > fighter.hp && striker.speed > fighter.speed);
  assert.ok(gunship.hp > bomber.hp && gunship.speed < bomber.speed);
  assert.equal(skyDancerArcadeEnemyRole("gunship"), "heavy");
  assert.equal(skyDancerArcadeEnemyRole("raider"), "hunter");
  assert.ok(skyDancerArcadeArmorRatio("gunship") > skyDancerArcadeArmorRatio("bomber"));
  assert.ok(skyDancerArcadeEnemyHitRadiusV20("drone") < skyDancerArcadeEnemyHitRadiusV20("gunship"));
});

test("V20 new aircraft have unique procedural silhouettes and retain V19 3D-readable attitude", () => {
  const identities = new Set<string>();
  newKinds.forEach((kind, index) => {
    const airframe = createSkyDancerArcadeEnemyAirframeV18(stage, kind);
    assert.equal(airframe.userData.arcadeEnemyRosterV20, kind);
    assert.equal(airframe.userData.arcadeEnemyLogicalCollisionUnchangedV18, true);
    const identity = String(airframe.userData.arcadeEnemySilhouetteIdentityV18);
    assert.ok(identity.length > 4);
    identities.add(identity);

    const enemy = createSkyDancerArcadeEnemy(stage, snapshot(kind, 700 + index));
    const rig = enemy.getObjectByName("arcade-enemy-v19-readable-attitude-rig");
    assert.ok(rig instanceof THREE.Group, `${kind} missing readable attitude rig`);
    assert.ok(Math.abs(rig.rotation.x) >= .11, `${kind} pitch too flat`);
    assert.ok(Math.abs(rig.rotation.y) >= .03, `${kind} yaw too flat`);
    assert.ok(Math.abs(rig.rotation.z) >= .045, `${kind} roll too flat`);
  });
  assert.equal(identities.size, newKinds.length);
});
