import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { normalizeArcadeStick } from "../src/sky/arcade/SkyDancerArcadeInput";
import { arcadeCameraPose } from "../src/sky/arcade/SkyDancerArcadeCamera";
import { createReferenceFighter, createReferenceCarrier } from "../src/sky/arcade/SkyDancerArcadeReferenceAirframes";
import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";
import { ARCADE_EFFECT_BUDGET, SkyDancerArcadeProductPresentation } from "../src/sky/arcade/SkyDancerArcadeProductPresentation";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import { SkyDancerArcadeRuntime } from "../src/sky/arcade/SkyDancerArcadeRuntime";

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
  assert.equal(facades, 8); assert.equal(rivers, 8); world.dispose();
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
  assert.equal(sparks.count, ARCADE_EFFECT_BUDGET.sparks);
  assert.equal(smoke.count, ARCADE_EFFECT_BUDGET.smoke);
  snapshot.projectiles = [];
  for (let i = 0; i < 60; i++) presentation.update(snapshot, 1 / 60, camera);
  assert.equal(scene.getObjectsByProperty("name", "arcade-projectile-trail").length, 0);
  presentation.dispose(); assert.equal(scene.children.length, 0);
});


test("V8.8 ice cavern exposes its vertical canyon without repeated full-screen hoops", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const ice = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "ice-cavern")!;
  world.setStage(ice);
  world.update(ice.courseSpeed * 10, 0, 0);
  const cues = scene.getObjectsByProperty("name", "arcade-ice-wave-cue");
  assert.equal(cues.length, 7);
  const arches=scene.getObjectsByProperty("name", "arcade-ice-wave-arch") as THREE.Mesh[];
  assert.equal(arches.length, 7);
  for(const arch of arches){
    const parameters=(arch.geometry as THREE.TorusGeometry).parameters;
    assert.ok(parameters.arc < Math.PI*.7, "ice guide ribs must stay broken/open rather than recreate a hoop tunnel");
  }
  const chunks=scene.children[0].children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeIceV88CanyonClearance===true),
    "every streamed ice chunk keeps the V8.8 open-centre canyon layout");
  const ys = cues.map((cue) => cue.position.y);
  const pitches = cues.map((cue) => cue.rotation.x);
  const xs = cues.map((cue) => cue.position.x);
  assert.ok(Math.max(...ys)-Math.min(...ys)>28,
    "ice tunnel ribs must visibly climb and dive through the cavern");
  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.28,
    "ice tunnel ribs must rotate with the course pitch, not form a flat straight tube");
  assert.ok(Math.max(...xs)-Math.min(...xs)>25,
    "ice tunnel keeps its horizontal slalom while adding the vertical wave");
  const fissure=scene.getObjectByName("arcade-ice-course-fissure-outer") as THREE.Mesh;
  const core=scene.getObjectByName("arcade-ice-course-fissure-core") as THREE.Mesh;
  assert.ok(fissure instanceof THREE.Mesh && core instanceof THREE.Mesh);
  const fissurePosition=fissure.geometry.getAttribute("position") as THREE.BufferAttribute;
  assert.equal(fissurePosition.count,56);
  const fissureY:number[]=[];
  for(let i=0;i<fissurePosition.count;i+=2)fissureY.push((fissurePosition.getY(i)+fissurePosition.getY(i+1))*.5);
  assert.ok(Math.max(...fissureY)-Math.min(...fissureY)>12,
    "continuous glacial fissure must reveal the upcoming climb/dive");
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
