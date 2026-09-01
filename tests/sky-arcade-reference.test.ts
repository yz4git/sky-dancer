import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { normalizeArcadeStick } from "../src/sky/arcade/SkyDancerArcadeInput";
import { arcadeCameraPose } from "../src/sky/arcade/SkyDancerArcadeCamera";
import { arcadeCoursePose, arcadeCourseRelativePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";
import { createReferenceFighter, createReferenceCarrier } from "../src/sky/arcade/SkyDancerArcadeReferenceAirframes";
import { ARCADE_NEAR_PASS_CLEARANCE_V1039, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";
import { createArcadeWaterMaterial, referenceAtmosphere } from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";
import { ARCADE_EFFECT_BUDGET, SkyDancerArcadeProductPresentation } from "../src/sky/arcade/SkyDancerArcadeProductPresentation";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";
import { createDefaultSkyDancerArcadeProgress } from "../src/sky/arcade/SkyDancerArcadeProgress";
import { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";
import {
  skyDancerArcadeArmorRatio,
  skyDancerArcadeBossPhase,
  skyDancerArcadeBossStartProgress,
  skyDancerArcadeBossWeakpointOpen,
  skyDancerArcadeEnemyRole,
  skyDancerArcadeStageEvolutionProfile,
  skyDancerArcadeStageEventCheckpoint,
} from "../src/sky/arcade/SkyDancerArcadeV10Systems";

test("stick maps from its visible center with radial dead zone and bounded diagonals", () => {
  assert.deepEqual(normalizeArcadeStick(0, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(normalizeArcadeStick(2, 1, 50), { x: 0, y: 0 });
  assert.equal(normalizeArcadeStick(0, 50, 50).y, -1);
  assert.equal(normalizeArcadeStick(0, -50, 50).y, 1);
  const diagonal = normalizeArcadeStick(100, 100, 50);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
  assert.deepEqual(normalizeArcadeStick(NaN, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(normalizeArcadeStick(10, 10, 0), { x: 0, y: 0 });
});

test("releasing a downward stick removes drift, including after pause/resume", () => {
  const runtime = new SkyDancerArcadeRuntime({ mode: "arcade-run", difficulty: "normal", seed: 73 });
  runtime.setMove(0, -1);
  for (let i = 0; i < 20; i++) runtime.step(1 / 60);
  const pressed = runtime.getSnapshot().playerY;
  runtime.pause(); runtime.releaseInputs(); runtime.resume();
  for (let i = 0; i < 90; i++) runtime.step(1 / 60);
  const released = runtime.getSnapshot().playerY;
  for (let i = 0; i < 90; i++) runtime.step(1 / 60);
  assert.ok(released > -.9, "release must not keep moving to lower limit");
  assert.ok(Math.abs(runtime.getSnapshot().playerY - released) < .001);
  assert.ok(pressed < 0);
});

test("hero airframe is solid, detailed and batched instead of hundreds of draw calls", () => {
  const player = createReferenceFighter();
  let meshCount = 0, vertices = 0;
  player.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount++;
    const position = object.geometry.getAttribute("position");
    vertices += position.count;
    for (const number of position.array) assert.ok(Number.isFinite(number));
    const normals = object.geometry.getAttribute("normal");
    for (const number of normals.array) assert.ok(Number.isFinite(number));
  });
  const box = new THREE.Box3().setFromObject(player);
  assert.ok(box.max.x - box.min.x > 8, "hero silhouette has broad swept wings");
  assert.ok(box.max.y > 1.2, "twin tail fins stand vertically");
  assert.ok(vertices > 5_000, "beveled panels, canopy and mechanical detail exist");
  assert.ok(meshCount <= 16, `airframe uses ${meshCount} draws`);
  const carrier = createReferenceCarrier(SKY_DANCER_ARCADE_STAGES[0]);
  assert.equal(carrier.getObjectsByProperty("name", "arcade-boss-weakpoint").length, 2);
  assert.equal(carrier.getObjectsByProperty("name", "arcade-engine-glow").length, 4);
});

test("actual airframe vertices fit landscape and portrait at all steering limits", () => {
  const player = createReferenceFighter();
  const vertex = new THREE.Vector3();
  for (const aspect of [16 / 9, 844 / 390, 390 / 844, 3 / 4]) {
    for (const x of [-1, 0, 1]) for (const y of [-.9, 0, .9]) for (const turbo of [false, true]) {
      const pose = arcadeCameraPose(x, y, aspect, turbo);
      const camera = new THREE.PerspectiveCamera(pose.fov, aspect, .1, 1200);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(pose.lookX, pose.lookY, pose.lookZ); camera.rotateZ(pose.roll); camera.updateMatrixWorld();
      player.position.set(x * 7.8, 1.1 + y * 4.25, 2.8); player.updateMatrixWorld(true);
      player.traverse(object => {
        if (!(object instanceof THREE.Mesh) || object.name === "arcade-engine-trail") return;
        const positions = object.geometry.getAttribute("position");
        for (let i = 0; i < positions.count; i++) {
          vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
          assert.ok(Math.abs(vertex.x) < .99 && Math.abs(vertex.y) < .99, `frame aspect=${aspect} x=${x} y=${y}: ${vertex.x},${vertex.y}`);
        }
      });
    }
  }
});

test("V10.2 flight courses contain visible chicanes, vertical beats and bank reversals before the boss", () => {
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    const length = stage.durationSeconds * stage.courseSpeed;
    const samples = Array.from({ length: 64 }, (_, i) => arcadeCoursePose(stage, length * (i / 63) * .55));
    const yawRange = Math.max(...samples.map(p => p.yaw)) - Math.min(...samples.map(p => p.yaw));
    const bankRange = Math.max(...samples.map(p => p.bank)) - Math.min(...samples.map(p => p.bank));
    const verticalRange = Math.max(...samples.map(p => p.y)) - Math.min(...samples.map(p => p.y));
    const signs = samples.map(p => p.yaw).filter(value => Math.abs(value) >= .035).map(Math.sign);
    const signChanges = signs.reduce((count, sign, i) => count + (i > 0 && sign !== signs[i - 1] ? 1 : 0), 0);
    assert.ok(yawRange > .24, `${stage.id} yaw range ${yawRange} must read as a real turn`);
    assert.ok(bankRange > .28, `${stage.id} bank range ${bankRange} must visibly reverse`);
    assert.ok(verticalRange > 4.5, `${stage.id} vertical range ${verticalRange} must climb/dive`);
    assert.ok(signChanges >= 2, `${stage.id} needs at least two heading reversals, got ${signChanges}`);
    const ahead = arcadeCourseRelativePose(stage, length * .31, 120);
    assert.ok(Math.abs(ahead.x) > 3 || Math.abs(ahead.y) > 3, `${stage.id} 120m look-ahead must leave the screen centre`);
  }
});

test("all eleven environments have bounded geometry and continuous streaming ownership", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  for (const stage of SKY_DANCER_ARCADE_STAGES) {
    world.setStage(stage);
    assert.equal(scene.children.length, 1, "stage changes replace, not stack, environments");
    assert.ok(scene.getObjectByName("arcade-product-gradient-sky"));
    const chunks = scene.getObjectsByProperty("name", "arcade-course-chunk-0");
    assert.equal(chunks.length, 1);
    let draws = 0;
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      draws++;
      if (object instanceof THREE.InstancedMesh) { assert.ok(object.count <= 150); assert.ok(object.count <= object.instanceMatrix.count, `${object.name} count ${object.count} exceeds capacity ${object.instanceMatrix.count}`); }
    });
    assert.ok(draws < 160, `${stage.biome} draw calls: ${draws}`);
    world.update(10, 0, 0); const before = chunks[0].position.z;
    world.update(11, 0, 0); assert.ok(Math.abs(chunks[0].position.z - before - 1) < 1e-6);
    world.update(1_000_000, 1, -.9);
    assert.ok(Number.isFinite(chunks[0].position.x));
  }
  world.dispose(); assert.equal(scene.children.length, 0);
});

test("city renderer contains a river, instanced windows and cloud layers without a decorative horizon carrier", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(SKY_DANCER_ARCADE_STAGES[0]);
  assert.ok(scene.getObjectByName("arcade-distant-metropolis") instanceof THREE.InstancedMesh);
  assert.equal(scene.getObjectByName("arcade-horizon-fleet-carrier"), undefined);
  assert.ok(scene.getObjectByName("arcade-product-cloud-deck-0") instanceof THREE.InstancedMesh);
  let facades = 0, rivers = 0;
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    if (object.material.customProgramCacheKey() === "arcade-city-facade-reference-v2") facades++;
    if (object.material instanceof THREE.ShaderMaterial && object.material.uniforms.time) rivers++;
  });
  assert.equal(facades, 8); assert.equal(rivers, 1); world.dispose();
});



test("V10.3.4 Dawn City uses continuous riverbanks instead of rigid slabs on sharp turns", () => {
  const city=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="city");
  const canyon=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="canyon");
  assert.ok(city && canyon);
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(city);
  const chunks=Array.from({length:8},(_,i)=>scene.getObjectByName(`arcade-course-chunk-${i}`));
  assert.ok(chunks.every(Boolean));
  assert.ok(chunks.every(chunk=>chunk!.userData.arcadeCityCompositionV1033===true));
  assert.ok(chunks.every(chunk=>chunk!.userData.arcadeCityRigidQuayCountV1034===0),"Dawn City must have no rigid broad quays");
  assert.ok(chunks.every(chunk=>Number(chunk!.userData.arcadeCityCrossStreetInnerClearanceV1034)>=46),"side streets stay outside the flight corridor");

  const river=scene.getObjectByName("arcade-city-river-ribbon-surface") as THREE.Mesh;
  const bed=scene.getObjectByName("arcade-city-river-ribbon-bed") as THREE.Mesh;
  const left=scene.getObjectByName("arcade-city-bank-ribbon-left") as THREE.Mesh;
  const right=scene.getObjectByName("arcade-city-bank-ribbon-right") as THREE.Mesh;
  assert.ok(river instanceof THREE.Mesh && bed instanceof THREE.Mesh && left instanceof THREE.Mesh && right instanceof THREE.Mesh);
  assert.equal(scene.getObjectsByProperty("name","arcade-city-river-surface").length,0);
  assert.equal((river.material as THREE.Material).side,THREE.DoubleSide);
  for(const bank of [left,right]){
    assert.equal(bank.userData.arcadeCityBankV1034,true);
    assert.equal((bank.material as THREE.Material).side,THREE.DoubleSide);
    assert.equal(bank.userData.arcadeCityBankInner,22);
    assert.equal(bank.userData.arcadeCityBankOuter,116);
  }

  const length=city.durationSeconds*city.courseSpeed;
  for(const progress of [.12,.18,.25,.29,.39,.43,.51]){
    world.update(length*progress,0,0);
    for(const ribbon of [river,left,right]){
      const pos=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;
      assert.ok(Array.from(pos.array).every(Number.isFinite));
      const centres:THREE.Vector3[]=[];
      for(let i=0;i<pos.count;i+=2){
        const a=new THREE.Vector3().fromBufferAttribute(pos,i);
        const b=new THREE.Vector3().fromBufferAttribute(pos,i+1);
        centres.push(a.add(b).multiplyScalar(.5));
      }
      for(let i=1;i<centres.length;i++)assert.ok(centres[i].distanceTo(centres[i-1])<34,`continuous city surface at ${progress}`);
    }
  }

  world.setStage(canyon);
  const terrain=scene.getObjectByName("arcade-continuous-terrain-ribbon") as THREE.Mesh;
  assert.ok(terrain instanceof THREE.Mesh);
  assert.equal(terrain.userData.arcadeContinuousTerrainV1037,true);
  assert.equal((terrain.material as THREE.Material).side,THREE.DoubleSide);
  assert.equal(Number(terrain.userData.arcadeTerrainDepthSamples),42);
  assert.equal(Number(terrain.userData.arcadeTerrainLateralSamples),25);
  assert.equal(Number(terrain.userData.arcadeTerrainWidth),260);
  const canyonLength=canyon.durationSeconds*canyon.courseSpeed;
  for(const progress of [.12,.25,.39,.51]){
    world.update(canyonLength*progress,.8,-.6);
    const pos=terrain.geometry.getAttribute("position") as THREE.BufferAttribute;
    assert.ok(Array.from(pos.array).every(Number.isFinite),`continuous terrain remains finite at ${progress}`);
    const lateralSamples=Number(terrain.userData.arcadeTerrainLateralSamples);
    const centres:THREE.Vector3[]=[];
    for(let d=0;d<Number(terrain.userData.arcadeTerrainDepthSamples);d++){
      const i=d*lateralSamples+Math.floor(lateralSamples/2);
      centres.push(new THREE.Vector3().fromBufferAttribute(pos,i));
    }
    for(let i=1;i<centres.length;i++)assert.ok(centres[i].distanceTo(centres[i-1])<25,`terrain centerline follows one continuous spline at ${progress}`);
  }
  assert.equal(scene.getObjectsByProperty("name","arcade-continuous-terrain").length,0,"legacy rigid terrain slabs must be gone");
  world.dispose();
});

test("V10.3.6 keeps the horizon stable while every course-bound layer shares one spline frame", () => {
  const city=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="city");
  const volcano=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="volcano");
  assert.ok(city && volcano);
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(city);
  const backdrop=scene.getObjectByName("arcade-product-backdrop") as THREE.Group;
  assert.ok(backdrop instanceof THREE.Group);
  assert.equal(backdrop.userData.arcadeBackdropStableHorizonV1036,true);
  const length=city.durationSeconds*city.courseSpeed;
  for(const progress of [.06,.12,.18,.25,.32,.4]){
    const distance=length*progress;
    world.update(distance,.8,-.6);
    assert.ok(backdrop.position.length()<1e-12,"far horizon must not translate independently of the course");
    assert.ok(Math.abs(backdrop.rotation.x)+Math.abs(backdrop.rotation.y)+Math.abs(backdrop.rotation.z)<1e-12,
      "far horizon must stay in the world/camera frame instead of receiving a second course rotation");
    for(let i=0;i<8;i++){
      const chunk=scene.getObjectByName(`arcade-course-chunk-${i}`) as THREE.Group;
      assert.ok(chunk);
      assert.equal(chunk.userData.arcadeUnifiedCourseFrameV1036,true);
      const depth=-chunk.position.z;
      const authored=arcadeCourseRelativePose(city,distance,depth);
      assert.ok(Math.abs(chunk.rotation.y-authored.yaw)<1e-9,`chunk ${i} yaw must equal the shared course yaw`);
      assert.ok(Math.abs(chunk.rotation.x-authored.pitch)<1e-9,`chunk ${i} pitch must equal the shared course pitch`);
      assert.ok(Math.abs(chunk.rotation.z-authored.bank*.22)<1e-9,`chunk ${i} bank must match the city river/bank frame`);
    }
  }

  world.setStage(volcano);
  const volcanoDistance=volcano.durationSeconds*volcano.courseSpeed*.29;
  world.update(volcanoDistance,-.7,.5);
  const cues=scene.getObjectsByProperty("name","arcade-volcano-route-cue") as THREE.Group[];
  assert.ok(cues.length>0);
  for(const cue of cues){
    const depth=Number(cue.userData.arcadeRouteDepth);
    const authored=arcadeCourseRelativePose(volcano,volcanoDistance,depth);
    assert.ok(Math.abs(cue.rotation.y-authored.yaw)<1e-9,"volcano marker yaw must use the same course frame");
    assert.ok(Math.abs(cue.rotation.x-authored.pitch)<1e-9,"volcano marker pitch must use the same course frame");
    assert.ok(Math.abs(cue.rotation.z-authored.bank*.28)<1e-9,"volcano marker bank must match the magma ribbon frame");
  }
  world.dispose();
});

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


test("V9.8 detonation hierarchy differentiates small, heavy, boss and missile impacts without unbounded meshes", () => {
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


test("V8.8 ice cavern exposes its vertical canyon without repeated full-screen hoops", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const ice = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "ice-cavern")!;
  world.setStage(ice);
  world.update(ice.courseSpeed * 10, 0, 0);
  const cues = scene.getObjectsByProperty("name", "arcade-ice-wave-cue");
  assert.equal(cues.length, 6);
  const arches=scene.getObjectsByProperty("name", "arcade-ice-wave-arch") as THREE.Mesh[];
  assert.equal(arches.length, 6);
  for(const arch of arches){
    const parameters=(arch.geometry as THREE.TorusGeometry).parameters;
    assert.ok(parameters.arc < Math.PI*.5, "ice guide ribs must stay compact/open rather than recreate a hoop tunnel");
  }
  const chunks=scene.children[0].children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeIceV88CanyonClearance===true),
    "every streamed ice chunk keeps the V8.8 open-centre canyon layout");
  const ys = cues.map((cue) => cue.position.y);
  const pitches = cues.map((cue) => cue.rotation.x);
  const xs = cues.map((cue) => cue.position.x);
  assert.ok(Math.max(...ys)-Math.min(...ys)>11,
    "ice guide ribs must reveal the real authored climb/dive without an artificial floating wave");
  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.28,
    "ice tunnel ribs must rotate with the course slope, not form a flat straight tube");
  assert.ok(Math.max(...xs)-Math.min(...xs)>25,
    "ice tunnel keeps its horizontal slalom while following the real vertical course");
  const auditDistance=ice.courseSpeed*10;
  for(const cue of cues){
    const depth=Number(cue.userData.arcadeRouteDepth);
    assert.ok(depth>=58,"nearest ice guide must stay well outside the camera/airframe foreground");
    const authored=arcadeCourseRelativePose(ice,auditDistance,depth);
    assert.ok(Math.abs(cue.position.y-authored.y)<1e-6,
      "ice guide ribs must remain tethered to the actual course centre instead of floating independently");
  }
  const fissure=scene.getObjectByName("arcade-ice-course-fissure-outer") as THREE.Mesh;
  const core=scene.getObjectByName("arcade-ice-course-fissure-core") as THREE.Mesh;
  assert.ok(fissure instanceof THREE.Mesh && core instanceof THREE.Mesh);
  const fissurePosition=fissure.geometry.getAttribute("position") as THREE.BufferAttribute;
  assert.equal(fissurePosition.count,56);
  const fissureY:number[]=[];
  for(let i=0;i<fissurePosition.count;i+=2)fissureY.push((fissurePosition.getY(i)+fissurePosition.getY(i+1))*.5);
  assert.ok(Math.max(...fissureY)-Math.min(...fissureY)>12,
    "continuous glacial fissure must reveal the upcoming climb/dive");
  assert.ok(Number(fissure.userData.arcadeIceRibbonWidth)<=5.5,
    "glacial fissure must stay narrow enough to read as a floor crack, not a luminous road");
  const fissureMaterial=fissure.material as THREE.MeshBasicMaterial;
  const coreMaterial=core.material as THREE.MeshBasicMaterial;
  assert.ok(fissureMaterial.opacity<=.12 && coreMaterial.opacity<=.5,
    "ice fissure glow must not wash out the foreground");
  const firstCenterZ=(fissurePosition.getZ(0)+fissurePosition.getZ(1))*.5;
  assert.ok(firstCenterZ<=-38,
    "continuous fissure must begin far enough ahead to avoid clipping into the camera/airframe");
  const fissureWidths:number[]=[];
  for(let i=0;i<fissurePosition.count;i+=2){
    const dx=fissurePosition.getX(i)-fissurePosition.getX(i+1);
    const dy=fissurePosition.getY(i)-fissurePosition.getY(i+1);
    const dz=fissurePosition.getZ(i)-fissurePosition.getZ(i+1);
    fissureWidths.push(Math.hypot(dx,dy,dz));
  }
  assert.ok(Math.max(...fissureWidths)-Math.min(...fissureWidths)>1.5,
    "ice fissure width must vary enough to read as a natural crack instead of a constant-width road");
  world.dispose();
});

test("V9.0 floating ruins reads as a broken sky labyrinth instead of a column forest", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const ruins = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "floating-ruins")!;
  world.setStage(ruins);
  world.update(ruins.courseSpeed * 7, 0, 0);
  const temple=scene.getObjectByName("arcade-ruins-sky-temple");
  assert.ok(temple instanceof THREE.Group,
    "floating ruins must expose one distant sky-temple destination");
  assert.ok(temple.position.z > -340 && temple.scale.x >= 1.1,
    "V9.0.1 sky temple must remain large and close enough to read through the stage haze");
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeRuinsV90SkyLabyrinth===true),
    "every ruins chunk must use the V9.0 broken-labyrinth layout");
  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeRuinsV90HeroSide)).size,2,
    "hero causeways must alternate sides to avoid a repeated paired-column corridor");
  world.dispose();
});

test("V9.4 storm carrier reads as a thunderhead dreadnought instead of floating T-bars", () => {
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  const storm=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="storm-carrier")!;
  world.setStage(storm);
  world.update(storm.courseSpeed*5,0,0);
  assert.ok(scene.getObjectByName("arcade-storm-dreadnought") instanceof THREE.Group,
    "storm carrier must expose one massive dreadnought silhouette in the thunderhead");
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeStormV94ThunderheadDreadnought===true),
    "every storm chunk must use armored carrier-section geometry");
  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeStormV94PressureSide)).size,2,
    "storm carrier pressure must alternate sides rather than repeat paired T-bars");
  world.dispose();
});

test("V10.3.1 red canyon keeps dramatic walls outside the phone foreground safety lane", () => {
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  const canyon=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="red-canyon")!;
  world.setStage(canyon);
  world.update(canyon.courseSpeed*6,0,0);
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeCanyonV1031Clearance===true),
    "every canyon chunk must preserve the V10.3.1 foreground clearance layout");
  world.dispose();
});


test("V9.3 desert fortress reads as a sandwall assault instead of a recolored canyon", () => {
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  const desert=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="desert-fortress")!;
  world.setStage(desert);
  world.update(desert.courseSpeed*5,0,0);
  assert.ok(scene.getObjectByName("arcade-desert-fortress-citadel") instanceof THREE.Group,
    "desert fortress must expose one monumental citadel destination");
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeDesertV93SandwallCitadel===true),
    "every desert chunk must use the V9.3 fortress district architecture");
  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeDesertV93BreachSide)).size,2,
    "the sandwall breach must alternate sides instead of forming one repeated symmetric gate");
  world.dispose();
});

test("V9.2 cloud fleet reads as a sky armada instead of floating T-shaped plates", () => {
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  const fleet=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="cloud-fleet")!;
  world.setStage(fleet);
  world.update(fleet.courseSpeed*5,0,0);
  assert.ok(scene.getObjectByName("arcade-cloud-fleet-flagship") instanceof THREE.Group,
    "cloud fleet must expose a distant carrier silhouette");
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeCloudV92SkyArmada===true),
    "every cloud chunk must author broad warship silhouettes");
  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeCloudV92LeadSide)).size,2,
    "hero warships must alternate sides to create fleet weave rather than a symmetric corridor");
  const atmosphere=referenceAtmosphere(fleet);
  assert.notEqual(atmosphere.fog.getHex(),fleet.palette.fog,
    "Cloud Fleet needs a dedicated midtone fog grade so white ships remain readable against the cloud sea");
  assert.ok(atmosphere.keyIntensity<2.3 && atmosphere.ambient<1.15,
    "Cloud Fleet lighting must stay restrained enough to avoid white-out on mobile");
  world.dispose();
});

test("V9.1 night metro reads as a neon express pursuit rather than a recolored city river", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const night = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "night-metro")!;
  world.setStage(night);
  world.update(night.courseSpeed * 6, 0, 0);
  assert.ok(scene.getObjectByName("arcade-night-metro-hub") instanceof THREE.Group,
    "night metro must expose a dedicated interchange destination");
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeNightV91NeonPursuit===true),
    "every night chunk must use the V9.1 elevated transit pursuit layer");
  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeNightV91LeadSide)).size,2,
    "close transit pressure must alternate sides so the chicane reads on screen");
  let animatedRivers=0;
  scene.traverse((object)=>{
    if(object instanceof THREE.Mesh && !Array.isArray(object.material) && object.material instanceof THREE.ShaderMaterial && object.material.uniforms.time)animatedRivers++;
  });
  assert.equal(animatedRivers,0,"night metro replaces the Dawn City river with an expressway/metro trench");
  world.dispose();
});

test("V8.9 prism citadel reads as an open final assault rather than a repeated ring tunnel", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const citadel = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "prism-citadel")!;
  world.setStage(citadel);
  world.update(citadel.courseSpeed * 8, 0, 0);
  const fortress=scene.getObjectByName("arcade-citadel-final-fortress");
  const core=scene.getObjectByName("arcade-citadel-final-core");
  assert.ok(fortress instanceof THREE.Group && core instanceof THREE.Mesh,
    "final stage must expose a single distant fortress destination and sovereign core");
  const environment=scene.getObjectByName("arcade-course-environment")!;
  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeCitadelV89FinalAssault===true),
    "every citadel chunk must use the V8.9 open-assault layout");
  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeCitadelV89GateSide)).size,2,
    "citadel fortress pressure must alternate sides instead of repeating a symmetric tunnel");
  let torusCount=0;
  for(const chunk of chunks)chunk.traverse((object)=>{
    if(object instanceof THREE.Mesh && object.geometry.type==="TorusGeometry")torusCount++;
  });
  assert.equal(torusCount,0,"streamed citadel architecture must not rebuild the old hex-ring tunnel");
  world.dispose();
});

test("V8.4 continuous volcano ribbon and orbital helix expose the real course shape on screen", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const volcano = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "volcano-core")!;
  world.setStage(volcano);
  world.update(volcano.courseSpeed * 4, 0, 0);
  const outer = scene.getObjectByName("arcade-volcano-course-ribbon-outer") as THREE.Mesh;
  const core = scene.getObjectByName("arcade-volcano-course-ribbon-core") as THREE.Mesh;
  assert.ok(outer instanceof THREE.Mesh && core instanceof THREE.Mesh);
  assert.equal(scene.getObjectsByProperty("name", "arcade-volcano-bent-lava-ribbon").length, 0,
    "old segmented road must stay removed");
  const position = outer.geometry.getAttribute("position") as THREE.BufferAttribute;
  assert.equal(position.count, 60);
  const centersX:number[] = [], centersY:number[] = [];
  for(let i=0;i<position.count;i+=2){
    centersX.push((position.getX(i)+position.getX(i+1))*.5);
    centersY.push((position.getY(i)+position.getY(i+1))*.5);
  }
  assert.ok(Math.max(...centersX)-Math.min(...centersX)>35,
    "continuous magma river must visibly sweep across the crater");
  assert.ok(Math.max(...centersY)-Math.min(...centersY)>8,
    "magma river must also show the pressure dive instead of lying flat");
  assert.equal(scene.getObjectsByProperty("name", "arcade-volcano-route-cue").length, 10);

  const orbit = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "orbital-ascent")!;
  world.setStage(orbit);
  world.update(720, 0, 0);
  const helix = scene.getObjectsByProperty("name", "arcade-orbit-helix-cue");
  assert.equal(helix.length, 10);
  assert.ok(Math.max(...helix.map((cue) => cue.position.x)) - Math.min(...helix.map((cue) => cue.position.x)) > 10,
    "orbital helix centers should bend across the view");
  assert.ok(Math.max(...helix.map((cue) => cue.rotation.z)) - Math.min(...helix.map((cue) => cue.rotation.z)) > 1,
    "orbital guide arcs should visibly wind around the ascent axis");
  assert.equal(scene.getObjectsByProperty("name", "arcade-orbit-helix-arc").length, 10);
  world.dispose();
});

test("V9.9 combat feel keeps tumbling kill debris bounded and fully retires it", () => {
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

test("V9.9 WebGL combat feedback gives missiles stronger target recoil plus player and camera hit kick", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"));
  assert.match(source, /enemyHitReactions/);
  assert.match(source, /impact\.missile \? 1\.32 : \.3/);
  assert.match(source, /reaction\.roll/);
  assert.match(source, /playerDamageKick = 1/);
  assert.match(source, /cameraImpactKick/);
});



test("V10 Combat 2.0 assigns readable roles, meaningful armor and threat priorities", () => {
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

test("V10 Boss Battle 2.0 has three HP phases and recurring core-open attack windows", () => {
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

test("V10 Stage Evolution gives every biome two authored gameplay beats and bounded checkpoints", () => {
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

test("V10 Cinematic Gameplay boosts camera language for stage, armor, formation and boss beats without gameplay pause", () => {
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

test("V10.1 boss ingress clears prior crossfire and suppresses generic boss hazards", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8"));
  assert.match(source, /projectiles = this\.projectiles\.filter\(\(projectile\) => projectile\.owner !== "enemy"\)/);
  assert.match(source, /this\.hazards = \[\]/);
  assert.match(source, /if \(!this\.bossSpawned && this\.stageTime >= this\.nextHazardAt/);
});

test("V10 Arcade Meta Layer defaults to migrated v2 career records and milestone slots", () => {
  const progress = createDefaultSkyDancerArcadeProgress();
  assert.equal(progress.version, 2);
  assert.deepEqual(progress.unlockedPaintSchemes, ["default"]);
  assert.deepEqual(progress.unlockedLoadouts, ["standard"]);
  assert.deepEqual(progress.bestRoute, []);
  assert.equal(progress.totalBossKills, 0);
  assert.equal(progress.totalArmorBreaks, 0);
  assert.equal(progress.bestChain, 0);
});


test("V10.3.9 preserves a phone-readable central corridor for visual-only near passes", async () => {
  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.city >= 30);
  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.night >= 39);
  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.canyon >= 42);
  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.volcano >= 44);
  assert.ok(ARCADE_NEAR_PASS_CLEARANCE_V1039.orbit >= 42);
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  for (const id of ["red-canyon", "night-metro", "volcano-core", "orbital-ascent"] as const) {
    const stage = SKY_DANCER_ARCADE_STAGES.find(candidate => candidate.id === id)!;
    world.setStage(stage);
    const root = scene.getObjectByName("arcade-course-environment");
    const chunks = root?.children.filter(child => child.name.startsWith("arcade-course-chunk-")) ?? [];
    assert.equal(chunks.length, 8);
    assert.ok(chunks.every(chunk => chunk.userData.arcadeReadableFlightCorridorV1039 === true), `${id} readable corridor marker`);
    if (id === "red-canyon") {
      assert.ok(chunks.every(chunk => chunk.userData.arcadeCanyonV10391PhoneWallClearance === true), "red-canyon authored walls keep phone clearance");
    }
  }
  world.dispose();
});
