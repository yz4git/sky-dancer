import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES, type SkyDancerArcadeEnemyKind } from "../src/sky/arcade/SkyDancerArcadeData";
import { createSkyDancerArcadeEnemy } from "../src/sky/arcade/SkyDancerArcadeModels";
import type { SkyDancerArcadeEnemySnapshot } from "../src/sky/arcade/SkyDancerArcadeRuntime";

const stage = SKY_DANCER_ARCADE_STAGES[0];
const kinds: readonly SkyDancerArcadeEnemyKind[] = ["fighter", "interceptor", "missile-boat", "bomber", "ace"];

function snapshot(kind: SkyDancerArcadeEnemyKind, id: number): SkyDancerArcadeEnemySnapshot {
  return {
    id,
    kind,
    x: 0,
    y: 0,
    depth: 48,
    hp: 24,
    maxHp: 24,
    locked: false,
    boss: false,
    phase: 0,
    maneuver: "approach",
    role: kind === "bomber" ? "heavy" : kind === "ace" ? "ace" : "skirmisher",
    armor: 0,
    maxArmor: 0,
    bossPhase: 1,
    weakpointOpen: false,
    stagger: 0,
    counterplay: "none",
    counterplayIntensity: 0,
  };
}

test("V19 tilts every normal enemy visual body off perfect frontal projection", () => {
  for (const [index, kind] of kinds.entries()) {
    const enemy = createSkyDancerArcadeEnemy(stage, snapshot(kind, index + 30));
    const rig = enemy.getObjectByName("arcade-enemy-v19-readable-attitude-rig");
    assert.ok(rig instanceof THREE.Group, `${kind} missing V19 attitude rig`);
    assert.equal(enemy.userData.arcadeEnemyReadableAttitudeV19, true, kind);
    assert.equal(enemy.userData.arcadeEnemyLogicalCollisionUnchangedV19, true, kind);
    assert.ok(Math.abs(rig.rotation.x) >= .11, `${kind} pitch ${rig.rotation.x}`);
    assert.ok(Math.abs(rig.rotation.y) >= .03, `${kind} yaw ${rig.rotation.y}`);
    assert.ok(Math.abs(rig.rotation.z) >= .04, `${kind} roll ${rig.rotation.z}`);
  }
});

test("V19 produces both upper-surface and underside readable pitch signs across a formation", () => {
  const pitches = Array.from({ length: 8 }, (_, index) => {
    const enemy = createSkyDancerArcadeEnemy(stage, snapshot("fighter", 100 + index));
    const rig = enemy.getObjectByName("arcade-enemy-v19-readable-attitude-rig") as THREE.Group;
    return Math.sign(rig.rotation.x);
  });
  assert.ok(pitches.includes(1));
  assert.ok(pitches.includes(-1));
});

test("V19 visual thickness boost stays inside the presentation rig", () => {
  const enemy = createSkyDancerArcadeEnemy(stage, snapshot("fighter", 203));
  const rig = enemy.getObjectByName("arcade-enemy-v19-readable-attitude-rig") as THREE.Group;
  assert.ok(rig.scale.y > 1);
  assert.equal(enemy.scale.y, enemy.scale.x);
});
