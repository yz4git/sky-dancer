from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
V16 = ROOT / "src/sky/arcade/SkyDancerArcadeV16Setpieces.ts"
HELPER = ROOT / "src/sky/arcade/SkyDancerArcadeV4022EnvironmentalFx.ts"
TEST = ROOT / "tests/sky-arcade-v4022-environment-naturalization.test.ts"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


helper = r'''import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";
import { createSkyDancerArcadeLightningEffect } from "./SkyDancerArcadeV4021LightningEffect";

function hash01(seed: number): number {
  const value = Math.sin(seed * 17.113 + 91.731) * 43758.5453;
  return value - Math.floor(value);
}

function additiveLine(color: number | THREE.Color, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function plumeLine(
  points: readonly THREE.Vector3[],
  material: THREE.LineBasicMaterial,
  name: string,
): THREE.Line {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.name = name;
  line.frustumCulled = false;
  line.renderOrder = 9;
  return line;
}

/** V40.22: reuse the proven V40.21 discharge language for background storm scenery. */
export function createSkyDancerArcadeEnvironmentalLightningFx(
  stage: SkyDancerArcadeStageDefinition,
  seed: number,
  height = 38,
): THREE.Group {
  const effect = createSkyDancerArcadeLightningEffect(stage, {
    id: 40_220 + seed,
    kind: "lightning",
    x: 0,
    y: 0,
    depth: 0,
    scale: 1,
  });
  effect.name = `arcade-v4022-environment-lightning-${seed}`;
  effect.scale.set(.82, Math.max(.35, height / 9.8), .82);
  effect.userData.arcadeV4022EnvironmentalFx = "lightning";
  effect.userData.arcadeV4022PresentationOnly = true;
  effect.userData.arcadeV4022SolidGeometryRemoved = true;
  // Decorative storm bolts should not add a bank of dynamic lights on mobile.
  effect.traverse((object) => {
    if (object instanceof THREE.PointLight) object.visible = false;
  });
  return effect;
}

/**
 * V40.22 presentation-only volcanic emission. The old solid cones/boxes made heat and lava look
 * like physical spikes. Lines + embers keep the same authored placement while reading as energy.
 */
export function createSkyDancerArcadeVolcanicPlumeFx(
  accent: number,
  seed: number,
  height = 18,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `arcade-v4022-volcanic-plume-${seed}`;
  group.userData.arcadeV4022EnvironmentalFx = "volcanic-plume";
  group.userData.arcadeV4022PresentationOnly = true;
  group.userData.arcadeV4022SolidGeometryRemoved = true;

  const hot = new THREE.Color(accent).lerp(new THREE.Color(0xfff0a3), .5);
  const coreMaterial = additiveLine(hot, .82);
  const glowMaterial = additiveLine(new THREE.Color(accent), .34);
  const sideMaterial = additiveLine(new THREE.Color(accent).lerp(new THREE.Color(0xff6a2f), .35), .3);
  const segments = 7;
  const mainPoints: THREE.Vector3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const taper = 1 - t * .62;
    const x = (hash01(seed * 31 + index * 13) - .5) * 1.55 * taper + Math.sin(index * 1.7 + seed) * .22;
    const z = (hash01(seed * 43 + index * 19) - .5) * 1.1 * taper;
    mainPoints.push(new THREE.Vector3(x, height * t, z));
  }

  const glow = plumeLine(mainPoints, glowMaterial, "arcade-v4022-plume-glow");
  glow.scale.set(1.35, 1, 1.35);
  const core = plumeLine(mainPoints, coreMaterial, "arcade-v4022-plume-core");
  group.add(glow, core);

  for (let branch = 0; branch < 3; branch += 1) {
    const anchorT = .18 + branch * .2;
    const anchorIndex = Math.min(segments - 1, Math.round(anchorT * segments));
    const anchor = mainPoints[anchorIndex];
    const side = hash01(seed * 67 + branch * 7) > .5 ? 1 : -1;
    const reach = 1.5 + hash01(seed * 71 + branch * 11) * 1.8;
    const branchPoints = [
      anchor.clone(),
      anchor.clone().add(new THREE.Vector3(side * reach * .45, height * .09, .15)),
      anchor.clone().add(new THREE.Vector3(side * reach, height * .18, -.2)),
    ];
    group.add(plumeLine(branchPoints, sideMaterial.clone(), `arcade-v4022-plume-jet-${branch}`));
  }

  const emberCount = 16;
  const positions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index += 1) {
    const t = hash01(seed * 83 + index * 17);
    positions[index * 3] = (hash01(seed * 89 + index * 23) - .5) * (2.2 + t * 4.4);
    positions[index * 3 + 1] = height * (.08 + t * .88);
    positions[index * 3 + 2] = (hash01(seed * 97 + index * 29) - .5) * (1.7 + t * 2.6);
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const emberMaterial = new THREE.PointsMaterial({
    color: hot,
    size: .34,
    sizeAttenuation: true,
    transparent: true,
    opacity: .68,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const embers = new THREE.Points(emberGeometry, emberMaterial);
  embers.name = "arcade-v4022-plume-embers";
  embers.frustumCulled = false;
  embers.renderOrder = 10;
  group.add(embers);

  const phase = hash01(seed * 101) * Math.PI * 2;
  core.onBeforeRender = () => {
    const time = performance.now() * .001;
    const pulse = .78 + Math.sin(time * 11.2 + phase) * .16 + Math.sin(time * 19.7 + phase * .7) * .06;
    coreMaterial.opacity = THREE.MathUtils.clamp(.7 + pulse * .22, .7, .98);
    glowMaterial.opacity = THREE.MathUtils.clamp(.23 + pulse * .16, .23, .46);
    emberMaterial.opacity = THREE.MathUtils.clamp(.48 + pulse * .2, .48, .75);
    embers.position.y = Math.sin(time * 2.3 + phase) * .18;
  };

  return group;
}
'''
HELPER.write_text(helper, encoding="utf-8")

test = r'''import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { SKY_DANCER_ARCADE_STAGES } from "../src/sky/arcade/SkyDancerArcadeData";
import {
  createSkyDancerArcadeEnvironmentalLightningFx,
  createSkyDancerArcadeVolcanicPlumeFx,
} from "../src/sky/arcade/SkyDancerArcadeV4022EnvironmentalFx";

const stage = (id: string) => SKY_DANCER_ARCADE_STAGES.find((candidate) => candidate.id === id)!;

function renderables(root: THREE.Object3D): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  root.traverse((object) => objects.push(object));
  return objects;
}

test("V40.22 storm scenery uses additive lightning FX with no solid bolt meshes", () => {
  const effect = createSkyDancerArcadeEnvironmentalLightningFx(stage("storm-carrier"), 3, 38);
  const objects = renderables(effect);
  assert.ok(objects.some((object) => object instanceof THREE.Line));
  assert.ok(objects.some((object) => object instanceof THREE.Points));
  assert.equal(objects.some((object) => object instanceof THREE.Mesh), false);
  assert.equal(effect.userData.arcadeV4022PresentationOnly, true);
});

test("V40.22 volcanic emissions are lines and embers rather than solid cones", () => {
  const effect = createSkyDancerArcadeVolcanicPlumeFx(0xffa743, 9, 24);
  const objects = renderables(effect);
  assert.ok(objects.some((object) => object instanceof THREE.Line));
  assert.ok(objects.some((object) => object instanceof THREE.Points));
  assert.equal(objects.some((object) => object instanceof THREE.Mesh), false);
  assert.equal(effect.userData.arcadeV4022SolidGeometryRemoved, true);
});

test("V40.22 removes the audited storm and volcano solid-effect primitives", () => {
  const world = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8");
  assert.equal(world.includes("new THREE.CylinderGeometry(.12,.23,9+j*.8,5)"), false);
  assert.equal(world.includes("new THREE.ConeGeometry(.4,11+r(i)*9,6)"), false);
  assert.equal(world.includes("new THREE.ConeGeometry(.28,8+r(j+57)*10,5)"), false);
  assert.match(world, /createSkyDancerArcadeEnvironmentalLightningFx/);
  assert.match(world, /createSkyDancerArcadeVolcanicPlumeFx/);
});

test("V40.22 replaces V16 foreground boards and solid lava columns with faceted rock plus FX", () => {
  const source = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeV16Setpieces.ts", import.meta.url), "utf8");
  assert.equal(source.includes("new THREE.BoxGeometry(34, 5.2, 9)"), false);
  assert.equal(source.includes("new THREE.BoxGeometry(31, 4.5, 18)"), false);
  assert.equal(source.includes("new THREE.BoxGeometry(2.3, 30, 2.1)"), false);
  assert.equal(source.includes("new THREE.ConeGeometry(1.25, 26, 7)"), false);
  assert.match(source, /DodecahedronGeometry/);
  assert.match(source, /createSkyDancerArcadeVolcanicPlumeFx/);
});

test("V40.22 stays out of runtime gameplay ownership", () => {
  const runtime = readFileSync(new URL("../src/sky/arcade/SkyDancerArcadeRuntime.ts", import.meta.url), "utf8");
  assert.equal(runtime.includes("V4022EnvironmentalFx"), false);
});
'''
TEST.write_text(test, encoding="utf-8")

world = WORLD.read_text(encoding="utf-8")
world = replace_once(
    world,
    'import type { SkyDancerArcadeV4018EnvironmentFramingProfile } from "./SkyDancerArcadeV4018EnvironmentFraming";\n',
    'import type { SkyDancerArcadeV4018EnvironmentFramingProfile } from "./SkyDancerArcadeV4018EnvironmentFraming";\nimport {\n  createSkyDancerArcadeEnvironmentalLightningFx,\n  createSkyDancerArcadeVolcanicPlumeFx,\n} from "./SkyDancerArcadeV4022EnvironmentalFx";\n',
    "ReferenceWorld V40.22 import",
)
old_volcano = '''      case "volcano":{\n        for(const side of [-1,1])for(let j=0;j<4;j++){\n          const h=17+r(j+side*15)*32;\n          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);\n          rock.rotation.y=r(j+19)*2;\n        }\n        // V8.3: the continuous lava corridor is route-following, not one straight plane per rigid chunk.\n        for(let i=0;i<5;i++){\n          const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);\n          vent.rotation.z=.15;\n        }\n        break;\n      }'''
new_volcano = '''      case "volcano":{\n        for(const side of [-1,1])for(let j=0;j<4;j++){\n          const h=17+r(j+side*15)*32;\n          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);\n          rock.rotation.y=r(j+19)*2;\n        }\n        // V40.22: heat/magma is emission, not a row of solid cone objects.\n        for(let i=0;i<3;i++){\n          const plumeHeight=11+r(i)*9;\n          const vent=createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent,index*101+i*17+3,plumeHeight);\n          vent.position.set(r(i+8)*50-25,-20,r(i+4)*100-50);\n          vent.scale.set(.82,1,.82);\n          group.add(vent);\n        }\n        break;\n      }'''
world = replace_once(world, old_volcano, new_volcano, "ReferenceWorld volcano vents")
old_storm = '''        const lightning=new THREE.Group();\n        for(let j=0;j<5;j++){\n          const boltX=stormSide*(31+(j%2)*8);\n          const bolt=mesh(lightning,new THREE.CylinderGeometry(.12,.23,9+j*.8,5),glow,boltX,29-j*8,-42+j*18);\n          bolt.rotation.z=stormSide*(j%2?-.31:.27);\n        }\n        group.add(lightning);'''
new_storm = '''        // V40.22: one branching additive discharge replaces the old chain of solid cylinders.\n        const lightning=createSkyDancerArcadeEnvironmentalLightningFx(stage,index*23+7,40);\n        lightning.position.set(stormSide*35,10,-6);\n        lightning.rotation.z=stormSide*.08;\n        group.add(lightning);'''
world = replace_once(world, old_storm, new_storm, "ReferenceWorld storm lightning")
old_near = '        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,rockX-side*2,-13,z+2);'
new_near = '''        if(stage.biome==="volcano" && j%2===0){\n          const plume=createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent,index*131+j*19+11,8+r(j+57)*10);\n          plume.position.set(rockX-side*2,-19,z+2);\n          plume.scale.set(.68,1,.68);\n          group.add(plume);\n        }'''
world = replace_once(world, old_near, new_near, "ReferenceWorld near-pass volcano emission")
WORLD.write_text(world, encoding="utf-8")

v16 = V16.read_text(encoding="utf-8")
v16 = replace_once(
    v16,
    'import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";\n',
    'import { bakeArcadeAirframe } from "./SkyDancerArcadeReferenceAirframes";\nimport { createSkyDancerArcadeVolcanicPlumeFx } from "./SkyDancerArcadeV4022EnvironmentalFx";\n',
    "V16 V40.22 import",
)
old_canyon = '''  // Broken arch fragments define a dramatic "almost overhead" silhouette but stop around |x|=18.\n  const spanA = addMesh(group, new THREE.BoxGeometry(34, 5.2, 9), warm, heroSide * 36, 11.5, -2);\n  spanA.rotation.z = heroSide * -.22;\n  spanA.rotation.y = heroSide * .09;\n  const spanB = addMesh(group, new THREE.BoxGeometry(23, 3.8, 7), rock, heroSide * 29.5, 18, 5);\n  spanB.rotation.z = heroSide * -.31;\n  spanB.rotation.y = heroSide * .18;\n\n  // High-contrast mineral cuts make the authored arch readable through the warm canyon palette.\n  const spanEdge = addMesh(group, new THREE.BoxGeometry(29, .62, 2), edge, heroSide * 34.5, 9.2, -1.5);\n  spanEdge.rotation.z = heroSide * -.22;\n  spanEdge.rotation.y = heroSide * .09;\n  const vein = addMesh(group, new THREE.BoxGeometry(.72, 38, 1.8), edge, heroSide * 43, 3, -6);\n  vein.rotation.z = heroSide * -.34;\n'''
new_canyon = '''  // V40.22 visual audit: the old rectangular spans read as giant floating boards at phone distance.\n  // Build the same broken-arch silhouette from separate faceted rock masses instead.\n  const archA = addMesh(group, new THREE.DodecahedronGeometry(7.2, 0), warm, heroSide * 37, 12, -2);\n  archA.scale.set(1.55, .62, .82);\n  archA.rotation.z = heroSide * -.24;\n  archA.rotation.y = heroSide * .12;\n  const archB = addMesh(group, new THREE.DodecahedronGeometry(5.8, 0), rock, heroSide * 29.5, 18.2, 4.5);\n  archB.scale.set(1.35, .7, .86);\n  archB.rotation.z = heroSide * -.34;\n  archB.rotation.y = heroSide * .2;\n  const archChip = addMesh(group, new THREE.OctahedronGeometry(4.2, 0), warm, heroSide * 23.5, 21, 8);\n  archChip.scale.set(1.15, .72, .8);\n  archChip.rotation.z = heroSide * -.46;\n\n  // Small mineral nodes keep the warm accent without drawing a rigid neon ruler across the rock.\n  for (let mineral = 0; mineral < 3; mineral += 1) {\n    const node = addMesh(\n      group,\n      new THREE.OctahedronGeometry(.9 + mineral * .16, 0),\n      edge,\n      heroSide * (40.5 - mineral * 4.8),\n      7.5 + mineral * 5.2,\n      -1 + mineral * 2.7,\n    );\n    node.scale.set(.7, 1.35, .7);\n    node.rotation.z = heroSide * (.45 + mineral * .12);\n  }\n'''
v16 = replace_once(v16, old_canyon, new_canyon, "V16 canyon board spans")
old_v = '''  // Terraces aim toward the continuous magma ribbon without ever becoming a floor replacement.\n  const shelf = addMesh(group, new THREE.BoxGeometry(31, 4.5, 18), crust, heroSide * 37, -12, 12);\n  shelf.rotation.z = heroSide * -.1;\n  shelf.rotation.y = heroSide * .07;\n  const shelfEdge = addMesh(group, new THREE.BoxGeometry(25, .62, 14), lava, heroSide * 34.5, -9.5, 11);\n  shelfEdge.rotation.z = heroSide * -.1;\n  shelfEdge.rotation.y = heroSide * .07;\n\n  // A vertical lava fall is the signature read at phone scale and visually connects wall to river.\n  const lavaFall = addMesh(group, new THREE.BoxGeometry(2.3, 30, 2.1), lava, heroSide * 39.5, 2.5, -5);\n  lavaFall.rotation.z = heroSide * -.09;\n  const splitCrown = addMesh(group, new THREE.BoxGeometry(24, 3.6, 7), hotRock, heroSide * 32, 14.5, -3);\n  splitCrown.rotation.z = heroSide * -.2;\n  splitCrown.rotation.y = heroSide * .12;\n  const crownSeam = addMesh(group, new THREE.BoxGeometry(19, .55, 2), lava, heroSide * 30.5, 12.7, -2.5);\n  crownSeam.rotation.z = heroSide * -.2;\n  crownSeam.rotation.y = heroSide * .12;\n\n  // An opposing pressure vent keeps the composition asymmetric and sells an active crater.\n  const ventX = -heroSide * 45;\n  const ventCore = addMesh(group, new THREE.ConeGeometry(1.25, 26, 7), lava, ventX, -7, 9);\n  ventCore.rotation.z = -heroSide * .09;\n  const ventShell = addMesh(group, new THREE.ConeGeometry(4.9, 22, 6), hotRock, ventX, -16, 10);\n  ventShell.rotation.z = -heroSide * .09;\n  const ember = addMesh(group, new THREE.OctahedronGeometry(3.9, 0), lava, ventX + heroSide * 3, 10, 7);\n  ember.scale.set(.62, 1.9, .62);\n\n  bakeArcadeAirframe(group);\n  return group;'''
new_v = '''  // V40.22 visual audit: faceted caldera shelves replace broad rectangular slabs.\n  const shelf = addMesh(group, new THREE.DodecahedronGeometry(7.4, 0), crust, heroSide * 37, -12, 12);\n  shelf.scale.set(2.05, .58, 1.15);\n  shelf.rotation.z = heroSide * -.12;\n  shelf.rotation.y = heroSide * .1;\n  const splitCrown = addMesh(group, new THREE.DodecahedronGeometry(6.2, 0), hotRock, heroSide * 32, 14.5, -3);\n  splitCrown.scale.set(1.65, .55, .88);\n  splitCrown.rotation.z = heroSide * -.22;\n  splitCrown.rotation.y = heroSide * .15;\n  for (let seam = 0; seam < 3; seam += 1) {\n    const magmaNode = addMesh(\n      group,\n      new THREE.OctahedronGeometry(1.05 + seam * .18, 0),\n      lava,\n      heroSide * (35 - seam * 3.5),\n      9.5 + seam * 3.2,\n      -1 + seam * 1.7,\n    );\n    magmaNode.scale.set(.62, 1.45, .62);\n  }\n\n  // An opposing physical vent shell remains rock; its emission is now additive FX.\n  const ventX = -heroSide * 45;\n  const ventShell = addMesh(group, new THREE.ConeGeometry(4.9, 22, 6), hotRock, ventX, -16, 10);\n  ventShell.rotation.z = -heroSide * .09;\n\n  bakeArcadeAirframe(group);\n\n  const lavaFall = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 5, 30);\n  lavaFall.name = "arcade-v4022-volcano-lava-fall";\n  lavaFall.position.set(heroSide * 39.5, -12, -5);\n  lavaFall.rotation.z = heroSide * -.09;\n  lavaFall.scale.set(.82, 1, .82);\n  group.add(lavaFall);\n\n  const ventCore = createSkyDancerArcadeVolcanicPlumeFx(stage.palette.accent, index * 43 + 17, 26);\n  ventCore.name = "arcade-v4022-volcano-pressure-vent";\n  ventCore.position.set(ventX, -18, 9);\n  ventCore.rotation.z = -heroSide * .09;\n  ventCore.scale.set(.9, 1, .9);\n  group.add(ventCore);\n  return group;'''
v16 = replace_once(v16, old_v, new_v, "V16 volcano slab/emission block")
V16.write_text(v16, encoding="utf-8")

print("V40.22 environment naturalization patch applied")
