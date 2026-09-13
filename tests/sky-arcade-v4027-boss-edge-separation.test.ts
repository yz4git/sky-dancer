import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { createReferenceCarrier } from "../src/sky/arcade/SkyDancerArcadeReferenceAirframes";
import { createSkyDancerArcadeEnemy } from "../src/sky/arcade/SkyDancerArcadeModels";
import type { SkyDancerArcadeEnemySnapshot } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { skyDancerArcadeV4020WeakpointContrast } from "../src/sky/arcade/SkyDancerArcadeV4020WeakpointContrast";
import {
  applySkyDancerArcadeV4027BossEdgeSeparation,
  skyDancerArcadeV4027BossEdgeProfile,
} from "../src/sky/arcade/SkyDancerArcadeV4027BossEdgeSeparation";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function edgeShells(root: THREE.Object3D): THREE.Mesh[] {
  return root.getObjectsByProperty("name", "arcade-v4027-boss-edge-shell")
    .filter((object): object is THREE.Mesh => object instanceof THREE.Mesh);
}

test("V40.27 keeps the boss body edge subtle, bounded and stronger on phone landscape", () => {
  for (const definition of SKY_DANCER_ARCADE_STAGES) {
    const desktop = skyDancerArcadeV4027BossEdgeProfile(definition.id, false);
    const compact = skyDancerArcadeV4027BossEdgeProfile(definition.id, true);
    assert.ok(compact.opacity > desktop.opacity, definition.id);
    assert.ok(compact.opacity <= .2, definition.id);
    assert.ok(desktop.opacity <= .09, definition.id);
    assert.ok(compact.scale >= 1.01 && compact.scale <= 1.018, definition.id);
  }
});

test("V40.27 reserves the strongest body separation for clutter-heavy boss worlds", () => {
  const dawn = skyDancerArcadeV4027BossEdgeProfile("dawn-city", true).opacity;
  assert.ok(skyDancerArcadeV4027BossEdgeProfile("storm-carrier", true).opacity > dawn * 2);
  assert.ok(skyDancerArcadeV4027BossEdgeProfile("volcano-core", true).opacity > dawn * 2);
  assert.ok(skyDancerArcadeV4027BossEdgeProfile("prism-citadel", true).opacity > dawn * 2);
  assert.ok(skyDancerArcadeV4027BossEdgeProfile("night-metro", true).opacity > dawn);
  assert.ok(skyDancerArcadeV4027BossEdgeProfile("ice-cavern", true).opacity > dawn);
});

test("V40.27 body edge remains subordinate to the V40.20 OPEN weakpoint cue", () => {
  const weakpoint = skyDancerArcadeV4020WeakpointContrast({
    stageId: "prism-citadel",
    compactLandscape: true,
    weakpointOpen: true,
    bossPhase: 3,
    hpRatio: .2,
  });
  const edge = skyDancerArcadeV4027BossEdgeProfile("prism-citadel", true);
  assert.ok(edge.opacity < weakpoint.outlineOpacity * .3);
  assert.ok(edge.scale < weakpoint.outlineScale);
});

test("V40.27 outlines only non-emissive baked carrier body meshes with shared geometry", () => {
  const carrier = createReferenceCarrier(stage("storm-carrier"));
  const shellCount = applySkyDancerArcadeV4027BossEdgeSeparation(carrier, stage("storm-carrier"));
  const shells = edgeShells(carrier);
  assert.equal(shellCount, shells.length);
  assert.ok(shells.length >= 4 && shells.length <= 12);
  for (const shell of shells) {
    assert.equal(shell.userData.arcadeV4027PresentationOnly, true);
    assert.equal(shell.userData.arcadeV4027SharedGeometry, true);
    assert.equal(shell.parent?.name, "arcade-baked-airframe");
    assert.equal(shell.geometry, (shell.parent as THREE.Mesh).geometry);
    assert.ok(shell.material instanceof THREE.MeshBasicMaterial);
    const material = shell.material as THREE.MeshBasicMaterial;
    assert.equal(material.side, THREE.BackSide);
    assert.equal(material.blending, THREE.AdditiveBlending);
    assert.equal(material.depthWrite, false);
  }
  assert.equal(carrier.userData.arcadeV4027LogicalCollisionUnchanged, true);
  assert.equal(carrier.userData.arcadeV4027GameplayUnchanged, true);
});

test("V40.27 leaves Prism final-form decoration outside the carrier edge shell", () => {
  const enemy = {
    id: 4027,
    kind: "boss",
    boss: true,
    finalBossForm: "PRISM_CROWN",
    finalBossAccent: 0xcaff61,
  } as unknown as SkyDancerArcadeEnemySnapshot;
  const boss = createSkyDancerArcadeEnemy(stage("prism-citadel"), enemy);
  const finalRig = boss.getObjectByName("arcade-v405-final-boss-form");
  assert.ok(finalRig);
  assert.ok(edgeShells(boss).length > 0);
  assert.equal(edgeShells(finalRig!).length, 0);
});

test("V40.27 stays outside runtime gameplay ownership", () => {
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.equal(runtime.includes("V4027BossEdgeSeparation"), false);
});
