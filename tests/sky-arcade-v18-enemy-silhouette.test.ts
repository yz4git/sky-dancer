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
    depth: 52,
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

test("V18 gives every normal enemy a dedicated aircraft silhouette", () => {
  const identities = new Set<string>();
  kinds.forEach((kind, index) => {
    const group = createSkyDancerArcadeEnemy(stage, snapshot(kind, index + 1));
    assert.equal(group.userData.arcadeEnemySilhouetteV18, true, kind);
    assert.equal(group.userData.arcadeEnemyLogicalCollisionUnchangedV18, true, kind);
    assert.equal(group.userData.arcadeEnemyBodyReadabilityV18, true, kind);
    assert.ok(typeof group.userData.arcadeEnemySilhouetteIdentityV18 === "string", kind);
    identities.add(group.userData.arcadeEnemySilhouetteIdentityV18 as string);
    assert.equal(group.getObjectByName("arcade-enemy-visibility-beacons"), undefined, `${kind} still exposes the old square beacon`);
    assert.ok(group.getObjectByName("arcade-enemy-v18-round-beacons"), `${kind} has no round beacon`);
  });
  assert.equal(identities.size, kinds.length);
});

test("V18 airframes retain real nose-to-tail volume instead of reducing to a screen-space bar", () => {
  for (const [index, kind] of kinds.entries()) {
    const group = createSkyDancerArcadeEnemy(stage, snapshot(kind, index + 20));
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.z > 2.2, `${kind} depth ${size.z}`);
    assert.ok(size.y > .35, `${kind} height ${size.y}`);
    assert.ok(size.x / Math.max(.01, size.z) < 2.35, `${kind} width/depth ${size.x / size.z}`);
  }
});

test("V18 visibility points are circular and subordinate to the aircraft body", () => {
  const fighter = createSkyDancerArcadeEnemy(stage, snapshot("fighter", 99));
  const beacons = fighter.getObjectByName("arcade-enemy-v18-round-beacons");
  assert.ok(beacons instanceof THREE.Points);
  assert.ok(beacons.material instanceof THREE.ShaderMaterial);
  assert.match(beacons.material.vertexShader, /gl_PointSize=4\.2/);
  assert.match(beacons.material.fragmentShader, /if\(r>1\.0\)discard/);
  assert.equal(beacons.userData.arcadeEnemyBeaconPointSizeV18, 4.2);
});