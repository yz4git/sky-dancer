import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  createSkyDancerArcadeEnemy,
  createSkyDancerArcadeLockRing,
  skyDancerArcadeEnemyVisualScaleV17,
} from "../src/sky/arcade/SkyDancerArcadeModels";
import type { SkyDancerArcadeEnemySnapshot } from "../src/sky/arcade/SkyDancerArcadeRuntime";

const stage = SKY_DANCER_ARCADE_STAGES[0];

function enemy(kind: SkyDancerArcadeEnemySnapshot["kind"]): SkyDancerArcadeEnemySnapshot {
  return {
    id: 17,
    kind,
    x: 0,
    y: 0,
    depth: 56,
    hp: 24,
    maxHp: 24,
    locked: false,
    boss: kind === "boss",
    phase: 0,
    maneuver: "approach",
    role: kind === "boss" ? "climax" : "skirmisher",
    armor: 0,
    maxArmor: 0,
    bossPhase: 1,
    weakpointOpen: false,
    stagger: 0,
    counterplay: "none",
    counterplayIntensity: 0,
  };
}

test("V17 increases phone-scale presence most for small fast aircraft", () => {
  assert.equal(skyDancerArcadeEnemyVisualScaleV17("fighter"), 1.42);
  assert.equal(skyDancerArcadeEnemyVisualScaleV17("interceptor"), 1.38);
  assert.equal(skyDancerArcadeEnemyVisualScaleV17("ace"), 1.34);
  assert.ok(skyDancerArcadeEnemyVisualScaleV17("bomber") < skyDancerArcadeEnemyVisualScaleV17("fighter"));
  assert.equal(skyDancerArcadeEnemyVisualScaleV17("boss"), 1);
});

test("V17 visual enlargement stays presentation-only after the V18 airframe replacement", () => {
  const fighter = createSkyDancerArcadeEnemy(stage, enemy("fighter"));
  const bomber = createSkyDancerArcadeEnemy(stage, enemy("bomber"));

  assert.ok(fighter.scale.x >= .73, `fighter visual scale ${fighter.scale.x}`);
  assert.ok(bomber.scale.x >= .86, `bomber visual scale ${bomber.scale.x}`);
  assert.equal(fighter.userData.arcadeEnemyReadabilityV17, true);
  assert.equal(fighter.userData.arcadeEnemyLogicalCollisionUnchangedV17, true);
  assert.equal(fighter.userData.arcadeEnemyVisualScaleV17, 1.42);
  const beacons = fighter.getObjectByName("arcade-enemy-v18-round-beacons");
  assert.ok(beacons instanceof THREE.Points);
  assert.ok(beacons.material instanceof THREE.ShaderMaterial);
  assert.match(beacons.material.fragmentShader, /if\(r>1\.0\)discard/);
});

test("V17 lock point sprite survives V27 distance-aware phone sizing", () => {
  const ring = createSkyDancerArcadeLockRing(0xff3970);
  const marker = ring.getObjectByName("arcade-lock-ring-mesh");
  assert.ok(marker instanceof THREE.Points);
  assert.ok(marker.material instanceof THREE.ShaderMaterial);
  assert.match(marker.material.vertexShader, /uniform float pointSize/);
  assert.match(marker.material.vertexShader, /gl_PointSize=pointSize/);
  assert.equal(marker.material.uniforms.pointSize.value, 76);
  assert.equal(marker.userData.arcadeEnemyReadabilityV17, true);
  assert.equal(marker.userData.arcadeCombatReadabilityV27, true);
});