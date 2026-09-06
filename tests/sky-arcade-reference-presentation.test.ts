import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ARCADE_EFFECT_BUDGET, SkyDancerArcadeProductPresentation } from "../src/sky/arcade/SkyDancerArcadeProductPresentation";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { createDefaultSkyDancerArcadeProgress } from "../src/sky/arcade/SkyDancerArcadeProgress";
import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";
import { skyDancerArcadeArmorRatio, skyDancerArcadeBossPhase, skyDancerArcadeBossStartProgress, skyDancerArcadeBossWeakpointOpen, skyDancerArcadeEnemyRole, skyDancerArcadeStageEvolutionProfile, skyDancerArcadeStageEventCheckpoint } from "../src/sky/arcade/SkyDancerArcadeV10Systems";

test("missile trails and explosions keep a bounded mesh and buffer count under load", () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 16 / 9, .1, 1200);
  camera.position.set(0, 5, 16); camera.lookAt(0, 0, -30); camera.updateMatrixWorld();
  const presentation = new SkyDancerArcadeProductPresentation(scene);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 82 });
  const snapshot = runtime.getSnapshot();
  for (let frame = 0; frame < 200; frame++) {
    snapshot.projectiles = Array.from({ length: 75 }, (_, i) => ({
      id: frame % 30 < 20 ? i : i + 100, owner: "player-missile" as const,
      x: Math.sin(frame * .1 + i), y: Math.cos(i), depth: 4 + frame % 20,
      targetEnemyId: null,
    }));
    presentation.emitBurst(new THREE.Vector3(0, 2, -20), 1);
    presentation.update(snapshot, 1 / 60, camera);
    assert.ok(scene.getObjectsByProperty("name", "arcade-projectile-trail").length <= ARCADE_EFFECT_BUDGET.trails);
  }
  const sparks = scene.getObjectByName("arcade-pooled-hot-sparks") as THREE.InstancedMesh;
  const smoke = scene.getObjectByName("arcade-pooled-explosion-smoke") as THREE.InstancedMesh;
  const missileSmoke = scene.getObjectByName("arcade-pooled-missile-white-smoke") as THREE.InstancedMesh;
  assert.equal(sparks.count, ARCADE_EFFECT_BUDGET.sparks);
  assert.equal(smoke.count, ARCADE_EFFECT_BUDGET.smoke);
  assert.equal(missileSmoke.count, ARCADE_EFFECT_BUDGET.missileSmoke);
  const missileLife = missileSmoke.geometry.getAttribute("lifeAlpha") as THREE.InstancedBufferAttribute;
  assert.ok(Array.from(missileLife.array).some((value) => Number(value) > .05), "player missiles must leave visible pooled white smoke");
  snapshot.projectiles = [];
  for (let i = 0; i < 120; i++) presentation.update(snapshot, 1 / 60, camera);
  assert.equal(scene.getObjectsByProperty("name", "arcade-projectile-trail").length, 0);
  assert.ok(Array.from(missileLife.array).every((value) => Number(value) === 0), "missile smoke must fully retire within two seconds instead of accumulating");
  presentation.dispose(); assert.equal(scene.children.length, 0);
});

test("detonation hierarchy differentiates small, heavy, boss and missile impacts without unbounded meshes", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, .1, 1200);
  camera.position.set(0, 5, 16); camera.lookAt(0, 0, -28); camera.updateMatrixWorld();
  const presentation = new SkyDancerArcadeProductPresentation(scene);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 98 });
  const snapshot = runtime.getSnapshot();
  const position = new THREE.Vector3(0, 1.8, -24);
  const rings = scene.getObjectByName("arcade-pooled-detonation-rings") as THREE.InstancedMesh;
  const flashes = scene.getObjectByName("arcade-pooled-detonation-flashes") as THREE.InstancedMesh;
  assert.ok(rings instanceof THREE.InstancedMesh);
  assert.ok(flashes instanceof THREE.InstancedMesh);
  assert.equal(rings.count, ARCADE_EFFECT_BUDGET.detonationPulses);
  assert.equal(flashes.count, ARCADE_EFFECT_BUDGET.detonationPulses);
  const active = () => Array.from((rings.geometry.getAttribute("lifeAlpha") as THREE.InstancedBufferAttribute).array)
    .filter((value) => Number(value) > .02).length;

  presentation.emitSmallExplosion(position, false);
  presentation.update(snapshot, 1 / 60, camera);
  const small = active();
  assert.ok(small >= 1, "small craft must produce a local shock pulse");

  presentation.setStage();
  presentation.emitHeavyExplosion(position, true);
  for (let i = 0; i < 9; i++) presentation.update(snapshot, 1 / 60, camera);
  const heavy = active();
  assert.ok(heavy > small, `heavy detonation ${heavy} must exceed small ${small}`);

  presentation.setStage();
  presentation.emitBossExplosion(position, true);
  for (let i = 0; i < 12; i++) presentation.update(snapshot, 1 / 60, camera);
  const boss = active();
  assert.ok(boss > heavy, `boss detonation ${boss} must exceed heavy ${heavy}`);

  presentation.setStage();
  presentation.emitMissileImpact(position, 1.2);
  presentation.update(snapshot, 1 / 60, camera);
  assert.ok(active() >= 1, "missile impact must have a dedicated white-hot local pulse");
  for (let i = 0; i < 180; i++) presentation.update(snapshot, 1 / 60, camera);
  assert.equal(active(), 0, "detonation pulses must fully retire rather than accumulate");
  assert.equal(scene.getObjectsByProperty("name", "arcade-pooled-detonation-rings").length, 1);
  assert.equal(scene.getObjectsByProperty("name", "arcade-pooled-detonation-flashes").length, 1);
  presentation.dispose();
  assert.equal(scene.children.length, 0);
});

test("combat feel keeps tumbling kill debris bounded and fully retires it", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, .1, 1200);
  camera.position.set(0, 5, 16); camera.lookAt(0, 0, -28); camera.updateMatrixWorld();
  const presentation = new SkyDancerArcadeProductPresentation(scene);
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 99 });
  const snapshot = runtime.getSnapshot();
  const debris = scene.getObjectByName("arcade-pooled-airframe-debris") as THREE.InstancedMesh;
  assert.ok(debris instanceof THREE.InstancedMesh);
  assert.equal(debris.count, ARCADE_EFFECT_BUDGET.debris);
  const matrix = new THREE.Matrix4();
  const activeDebris = () => {
    let active = 0;
    for (let i = 0; i < debris.count; i++) {
      debris.getMatrixAt(i, matrix);
      if (Math.abs(matrix.determinant()) > 1e-8) active++;
    }
    return active;
  };

  presentation.emitSmallExplosion(new THREE.Vector3(0, 2, -24), false);
  presentation.update(snapshot, 1 / 60, camera);
  const small = activeDebris();
  assert.ok(small >= 8, `small kill debris should be visible, got ${small}`);

  presentation.setStage();
  presentation.emitHeavyExplosion(new THREE.Vector3(0, 2, -24), true);
  presentation.update(snapshot, 1 / 60, camera);
  const heavy = activeDebris();
  assert.ok(heavy > small, `heavy kill debris ${heavy} should exceed small ${small}`);

  presentation.setStage();
  presentation.emitBossExplosion(new THREE.Vector3(0, 2, -24), true);
  presentation.update(snapshot, 1 / 60, camera);
  const boss = activeDebris();
  assert.ok(boss > heavy, `boss kill debris ${boss} should exceed heavy ${heavy}`);

  for (let i = 0; i < 260; i++) presentation.update(snapshot, 1 / 60, camera);
  assert.equal(activeDebris(), 0, "airframe debris must fully retire instead of accumulating");
  assert.equal(scene.getObjectsByProperty("name", "arcade-pooled-airframe-debris").length, 1);
  presentation.dispose();
});

test("Combat 2.0 assigns readable roles, meaningful armor and threat priorities", () => {
  assert.equal(skyDancerArcadeEnemyRole("fighter"), "skirmisher");
  assert.equal(skyDancerArcadeEnemyRole("interceptor"), "hunter");
  assert.equal(skyDancerArcadeEnemyRole("missile-boat"), "artillery");
  assert.equal(skyDancerArcadeEnemyRole("bomber"), "heavy");
  assert.equal(skyDancerArcadeEnemyRole("ace"), "ace");
  assert.equal(skyDancerArcadeEnemyRole("boss", true), "climax");
  assert.equal(skyDancerArcadeArmorRatio("fighter"), 0, "ordinary fighters stay quick kills");
  assert.ok(skyDancerArcadeArmorRatio("bomber") > skyDancerArcadeArmorRatio("missile-boat"));
  assert.ok(skyDancerArcadeArmorRatio("boss", true) > 0);
});

test("Boss Battle 2.0 has three HP phases and recurring core-open attack windows", () => {
  assert.equal(skyDancerArcadeBossPhase(100, 100), 1);
  assert.equal(skyDancerArcadeBossPhase(60, 100), 2);
  assert.equal(skyDancerArcadeBossPhase(25, 100), 3);
  assert.equal(skyDancerArcadeBossWeakpointOpen(1, 100), false);
  assert.ok(Array.from({ length: 80 }, (_, i) => skyDancerArcadeBossWeakpointOpen(2, i / 20)).some(Boolean));
  assert.ok(Array.from({ length: 80 }, (_, i) => skyDancerArcadeBossWeakpointOpen(3, i / 20)).some(Boolean));
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", difficulty: "normal", seed: 1002 });
  runtime.setBossHpRatioForTests(.6);
  const phase2 = runtime.getSnapshot();
  assert.equal(phase2.bossPhase, 2);
  assert.ok(phase2.bossPhaseSerial >= 1);
  runtime.setBossHpRatioForTests(.24);
  const phase3 = runtime.getSnapshot();
  assert.equal(phase3.bossPhase, 3);
  assert.ok(phase3.bossPhaseSerial > phase2.bossPhaseSerial);
});

test("Stage Evolution gives every biome two authored gameplay beats and bounded checkpoints", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const profile = skyDancerArcadeStageEvolutionProfile(stage.biome);
    assert.equal(profile.labels.length, 2);
    assert.equal(profile.eventHazards.length, 2);
    assert.ok(profile.labels.every((label) => label.length >= 8));
    assert.ok(profile.scoreBonus >= 900);
  }
  assert.equal(skyDancerArcadeStageEventCheckpoint(.1), 0);
  assert.equal(skyDancerArcadeStageEventCheckpoint(.2), 1);
  assert.equal(skyDancerArcadeStageEventCheckpoint(.45), 1, "route selection must finish before event #2");
  assert.equal(skyDancerArcadeStageEventCheckpoint(.47), 2);
  assert.equal(skyDancerArcadeStageEventCheckpoint(.35, true), 2, "finale advances its second beat before the early final boss");
  assert.ok(skyDancerArcadeBossStartProgress(false) > .47, "normal bosses start after event #2");
  assert.ok(skyDancerArcadeBossStartProgress(true) > .35, "final boss starts after the compressed final event #2");
  const runtime = new SkyDancerArcadeRuntime({ mode: "stage-practice", difficulty: "normal", seed: 1003 });
  runtime.triggerStageEvolutionForTests(.2);
  const first = runtime.getSnapshot();
  assert.equal(first.stageEventSerial, 1);
  assert.ok(first.stageEventLabel);
  runtime.triggerStageEvolutionForTests(.47);
  const second = runtime.getSnapshot();
  assert.equal(second.stageEventSerial, 2);
  assert.notEqual(second.stageEventLabel, first.stageEventLabel);
  assert.ok(second.hazards.length <= 10, "authored hazard beats remain bounded");
});

test("Cinematic Gameplay boosts camera language for stage, armor, formation and boss beats without gameplay pause", () => {
  const director = new SkyDancerArcadePresentationDirector();
  const base = { turboActive: false, nearMisses: 0, enemiesDefeated: 0, bossActive: true, hitSerial: 0, damageSerial: 0, stageSerial: 1, resultSerial: 0, bossPhaseSerial: 0, stageEventSerial: 0, armorBreaks: 0, formationBreaks: 0 };
  const boss = director.update({ ...base, bossPhaseSerial: 1 }, base, 1 / 60);
  assert.ok(boss.fovKick >= 3.3 && boss.pullback >= .8);
  director.reset();
  const stage = director.update({ ...base, stageEventSerial: 1 }, base, 1 / 60);
  assert.ok(stage.fovKick >= 2.6 && stage.cameraShake >= .09);
  director.reset();
  const armor = director.update({ ...base, armorBreaks: 1 }, base, 1 / 60);
  assert.ok(armor.bloomBoost >= .12);
  director.reset();
  const formation = director.update({ ...base, formationBreaks: 1 }, base, 1 / 60);
  assert.ok(formation.fovKick >= 1.8);
});

test("Arcade Meta Layer defaults to migrated v2 career records and milestone slots", () => {
  const progress = createDefaultSkyDancerArcadeProgress();
  assert.equal(progress.version, 2);
  assert.deepEqual(progress.unlockedPaintSchemes, ["default"]);
  assert.deepEqual(progress.unlockedLoadouts, ["standard"]);
  assert.deepEqual(progress.bestRoute, []);
  assert.equal(progress.totalBossKills, 0);
  assert.equal(progress.totalArmorBreaks, 0);
  assert.equal(progress.bestChain, 0);
});
