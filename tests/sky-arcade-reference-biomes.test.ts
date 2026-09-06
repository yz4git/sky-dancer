import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { arcadeCourseRelativeVisualPose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";
import { SkyDancerArcadeReferenceWorld } from "../src/sky/arcade/SkyDancerArcadeReferenceWorld";
import { referenceAtmosphere } from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";

test("ice cavern exposes its vertical canyon without repeated full-screen hoops", () => {
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
    const authored=arcadeCourseRelativeVisualPose(ice,auditDistance,depth);
    assert.ok(Math.abs(cue.position.x-authored.x)<1e-6 && Math.abs(cue.position.y-authored.y)<1e-6 && Math.abs(cue.position.z-authored.z)<1e-6,
      "ice guide ribs must remain tethered to the complete player-local course centre instead of floating independently");
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

test("floating ruins reads as a broken sky labyrinth instead of a column forest", () => {
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

test("storm carrier reads as a thunderhead dreadnought instead of floating T-bars", () => {
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

test("red canyon keeps dramatic walls outside the phone foreground safety lane", () => {
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

test("desert fortress reads as a sandwall assault instead of a recolored canyon", () => {
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

test("cloud fleet reads as a sky armada instead of floating T-shaped plates", () => {
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

test("night metro reads as a neon express pursuit rather than a recolored city river", () => {
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

test("prism citadel reads as an open final assault rather than a repeated ring tunnel", () => {
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

test("continuous volcano ribbon and orbital helix expose the real course shape on screen", () => {
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
