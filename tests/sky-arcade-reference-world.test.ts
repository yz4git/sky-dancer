import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { arcadeCourseRelativeVisualPose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";
import { ARCADE_NEAR_PASS_CLEARANCE_V1039, arcadeCourseVisualBankScaleV104, arcadeGroundSurfaceLocalYV1052, arcadeSharedSceneryAttitudeV1041, SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";
import { createSkyDancerArcadeHazard, extendArcadeGroundConnectorsV1052 } from "../src/sky/arcade/SkyDancerArcadeModels";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";

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
    world.update(10, 0, 0); const before = chunks[0].position.clone();
    world.update(11, 0, 0);
    const streamedStep = chunks[0].position.distanceTo(before);
    assert.ok(Number.isFinite(streamedStep) && streamedStep > .01 && streamedStep < 8, `${stage.id} streamed step ${streamedStep}`);
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

test("Dawn City uses continuous riverbanks instead of rigid slabs on sharp turns", () => {
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

test("uses one player-local course frame for horizon, streamed scenery and ribbons", () => {
  const city=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="city")!;
  const volcano=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="volcano")!;
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(city);
  const backdrop=scene.getObjectByName("arcade-product-backdrop") as THREE.Group;
  assert.ok(backdrop instanceof THREE.Group);
  const length=city.durationSeconds*city.courseSpeed;
  for(const progress of [.06,.12,.18,.25,.32,.4]){
    const distance=length*progress;
    world.update(distance,.8,-.6);
    assert.equal(backdrop.userData.arcadeUnifiedHorizonFrameV104,true);
    assert.ok(Number.isFinite(backdrop.rotation.x+backdrop.rotation.y+backdrop.rotation.z));
    for(let i=0;i<8;i++){
      const chunk=scene.getObjectByName(`arcade-course-chunk-${i}`) as THREE.Group;
      assert.ok(chunk && chunk.userData.arcadeSingleCourseFrameV104===true);
      const local=((i*112-distance)%(112*8)+(112*8))%(112*8);
      const depth=local-140;
      const authored=arcadeCourseRelativeVisualPose(city,distance,depth);
      assert.ok(Math.abs(chunk.position.x-(authored.x-.8*.35))<1e-8);
      assert.ok(Math.abs(chunk.position.y-(authored.y-(-.6)*.16))<1e-8);
      assert.ok(Math.abs(chunk.position.z-authored.z)<1e-8);
      const attitude=arcadeSharedSceneryAttitudeV1041(city,distance);
      assert.ok(Math.abs(chunk.rotation.x-attitude.pitch)<1e-9);
      assert.ok(Math.abs(chunk.rotation.y-attitude.yaw)<1e-9);
      assert.ok(Math.abs(chunk.rotation.z-attitude.roll)<1e-9);
      assert.equal(chunk.userData.arcadeSharedSceneryAttitudeV1041,true);
      assert.ok(Math.abs(chunk.rotation.x-backdrop.rotation.x)<1e-9 && Math.abs(chunk.rotation.y-backdrop.rotation.y)<1e-9 && Math.abs(chunk.rotation.z-backdrop.rotation.z)<1e-9);
    }
  }
  world.setStage(volcano);
  const volcanoDistance=volcano.durationSeconds*volcano.courseSpeed*.29;
  world.update(volcanoDistance,-.7,.5);
  const terrain=scene.getObjectByName("arcade-continuous-terrain-ribbon") as THREE.Mesh;
  assert.ok(terrain instanceof THREE.Mesh);
  const cues=scene.getObjectsByProperty("name","arcade-volcano-route-cue") as THREE.Group[];
  for(const cue of cues){
    const depth=Number(cue.userData.arcadeRouteDepth);
    const authored=arcadeCourseRelativeVisualPose(volcano,volcanoDistance,depth);
    assert.ok(Math.abs(cue.position.z-authored.z)<1e-8);
    assert.ok(Math.abs(cue.rotation.z-authored.bank*arcadeCourseVisualBankScaleV104(volcano))<1e-9);
  }
  world.dispose();
});

test("rigid background chunks rotate together instead of swivelling independently", () => {
  const scene=new THREE.Scene();
  const world=new SkyDancerArcadeReferenceWorld(scene);
  for(const stage of SKY_DANCER_ARCADE_STAGES){
    world.setStage(stage);
    const distance=stage.durationSeconds*stage.courseSpeed*.347;
    world.update(distance,.35,-.2);
    const backdrop=scene.getObjectByName("arcade-product-backdrop") as THREE.Group;
    const chunks=Array.from({length:8},(_,i)=>scene.getObjectByName(`arcade-course-chunk-${i}`) as THREE.Group);
    assert.ok(backdrop && chunks.every(Boolean));
    const attitude=arcadeSharedSceneryAttitudeV1041(stage,distance);
    for(const chunk of chunks){
      assert.equal(chunk.userData.arcadeSharedSceneryAttitudeV1041,true);
      assert.ok(Math.abs(chunk.rotation.x-attitude.pitch)<1e-9);
      assert.ok(Math.abs(chunk.rotation.y-attitude.yaw)<1e-9);
      assert.ok(Math.abs(chunk.rotation.z-attitude.roll)<1e-9);
      assert.ok(Math.abs(chunk.rotation.x-backdrop.rotation.x)+Math.abs(chunk.rotation.y-backdrop.rotation.y)+Math.abs(chunk.rotation.z-backdrop.rotation.z)<1e-9);
    }
  }
  world.dispose();
});

test("preserves a phone-readable central corridor for visual-only near passes", async () => {
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

test("grounded structural hazards preserve their top while foundations reach the visible floor", () => {
  const city = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "city");
  assert.ok(city);
  const surface = arcadeGroundSurfaceLocalYV1052(city, 120, 90, 0);
  assert.equal(surface, -25.82);
  const gate = createSkyDancerArcadeHazard(city, { id: 991, kind: "arch" } as never);
  const connectors: THREE.Mesh[] = [];
  gate.traverse(object => {
    if (object instanceof THREE.Mesh && object.userData.arcadeGroundConnectorV1052 === true) connectors.push(object);
  });
  assert.equal(connectors.length, 2, "city gate has two terrain-reaching supports");
  const tops = connectors.map(object => Number(object.userData.arcadeGroundConnectorTopYV1052));
  extendArcadeGroundConnectorsV1052(gate, -27.02);
  connectors.forEach((object, index) => {
    const baseHeight = Number(object.userData.arcadeGroundConnectorBaseHeightV1052);
    const baseScaleY = Number(object.userData.arcadeGroundConnectorBaseScaleYV1052);
    const height = baseHeight * object.scale.y / baseScaleY;
    assert.ok(Math.abs((object.position.y + height * .5) - tops[index]) < 1e-9, "gate top remains fixed in flight lane");
    assert.ok(Math.abs((object.position.y - height * .5) - (-27.02)) < 1e-9, "support bottom reaches ground datum");
  });
  assert.equal(gate.userData.arcadeGroundConnectedV1052, true);

  const orbit = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "orbit");
  assert.ok(orbit);
  assert.equal(arcadeGroundSurfaceLocalYV1052(orbit, 120, 90, 0), null, "space rings remain intentionally airborne");
});
