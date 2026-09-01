from pathlib import Path

WORLD = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
MATERIALS = Path('src/sky/arcade/SkyDancerArcadeReferenceMaterials.ts')
TESTS = Path('tests/sky-arcade-reference.test.ts')

world = WORLD.read_text()
materials = MATERIALS.read_text()
tests = TESTS.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {text.count(old)}')
    return text.replace(old, new, 1)

world = replace_once(
    world,
    'const WORLD_SPAN = CHUNK_LENGTH * CHUNK_COUNT;\n',
    'const WORLD_SPAN = CHUNK_LENGTH * CHUNK_COUNT;\nconst SURFACE_CHUNK_DEPTH = CHUNK_LENGTH + 32; // V10.3.2: overlap pitched chunks so sky can never show through a terrain seam.\n',
    'surface depth constant',
)

world = replace_once(
    world,
    '    const group=new THREE.Group();group.name="arcade-course-chunk-"+index;\n',
    '    const group=new THREE.Group();group.name="arcade-course-chunk-"+index;\n    group.userData.arcadeSurfaceChunkDepth=SURFACE_CHUNK_DEPTH;\n',
    'chunk solidity metadata',
)

world = replace_once(
    world,
    '      const groundMaterial=primary.clone();groundMaterial.vertexColors=true;groundMaterial.color.setHex(0xffffff);\n      mesh(group,ground,groundMaterial).name="arcade-continuous-terrain";\n',
    '      const groundMaterial=primary.clone();groundMaterial.vertexColors=true;groundMaterial.color.setHex(0xffffff);\n      // V10.3.2: steep course pitch/bank can expose the mathematical underside of the terrain plane.\n      // Keep it solid from either side, while the widened surface overlaps the neighbouring rigid chunk.\n      groundMaterial.side=THREE.DoubleSide;groundMaterial.depthWrite=true;groundMaterial.depthTest=true;\n      const terrain=mesh(group,ground,groundMaterial);terrain.name="arcade-continuous-terrain";\n      terrain.userData.arcadeTerrainSolidV1032=true;\n',
    'terrain double side',
)

world = replace_once(
    world,
    '    group.add(towers,roofs,spires);\n    mesh(group,new THREE.BoxGeometry(250,1,114),paint(stage.biome==="night"?0x111d31:0x213746),0,-26);\n    if(this.water && stage.biome!=="night"){\n      const river=mesh(group,new THREE.PlaneGeometry(40,114),this.water,-.4,-25.35);river.rotation.x=-Math.PI/2;\n    }\n',
    '    group.add(towers,roofs,spires);\n    // V10.3.2: rigid course chunks pitch independently. Give every ground/water slab generous longitudinal\n    // overlap, and place an opaque river bed under the shader surface so a seam can never reveal the sky.\n    const cityFloor=paint(stage.biome==="night"?0x111d31:0x213746);\n    mesh(group,new THREE.BoxGeometry(250,1,SURFACE_CHUNK_DEPTH),cityFloor,0,-26);\n    if(this.water && stage.biome!=="night"){\n      mesh(group,new THREE.BoxGeometry(42,.72,SURFACE_CHUNK_DEPTH),cityFloor,-.4,-25.78,0);\n      const river=mesh(group,new THREE.PlaneGeometry(40,SURFACE_CHUNK_DEPTH,1,12),this.water,-.4,-25.34,0);\n      river.name="arcade-city-river-surface";river.rotation.x=-Math.PI/2;river.frustumCulled=false;river.renderOrder=1;\n      river.userData.arcadeTerrainSolidV1032=true;\n    }\n',
    'city floor and river solidity',
)

world = replace_once(
    world,
    '      mesh(group,new THREE.BoxGeometry(38,.32,114),metroBed,0,-25.2,0);\n      for(const side of [-1,1]){\n        mesh(group,new THREE.BoxGeometry(.34,.14,112),metroGlow,side*10.5,-24.95,0);\n        mesh(group,new THREE.BoxGeometry(.18,.11,112),paint(stage.palette.secondary),side*15.5,-24.92,0);\n',
    '      mesh(group,new THREE.BoxGeometry(38,.32,SURFACE_CHUNK_DEPTH),metroBed,0,-25.2,0);\n      for(const side of [-1,1]){\n        mesh(group,new THREE.BoxGeometry(.34,.14,SURFACE_CHUNK_DEPTH-2),metroGlow,side*10.5,-24.95,0);\n        mesh(group,new THREE.BoxGeometry(.18,.11,SURFACE_CHUNK_DEPTH-2),paint(stage.palette.secondary),side*15.5,-24.92,0);\n',
    'night floor overlap',
)

world = replace_once(
    world,
    '      mesh(group,new THREE.BoxGeometry(2.4,1.3,114),bank,side*21,-25.1);\n      mesh(group,new THREE.BoxGeometry(3.5,.12,114),road,side*24,-24.32);\n      mesh(group,new THREE.BoxGeometry(.07,.06,112),light,side*24,-24.22);\n',
    '      mesh(group,new THREE.BoxGeometry(2.4,1.3,SURFACE_CHUNK_DEPTH),bank,side*21,-25.1);\n      mesh(group,new THREE.BoxGeometry(3.5,.12,SURFACE_CHUNK_DEPTH),road,side*24,-24.32);\n      mesh(group,new THREE.BoxGeometry(.07,.06,SURFACE_CHUNK_DEPTH-2),light,side*24,-24.22);\n',
    'city bank overlap',
)

world = replace_once(
    world,
    '    const g=new THREE.PlaneGeometry(260,114,48,30);g.rotateX(-Math.PI/2);\n',
    '    // V10.3.2: 32m of extra depth overlaps neighbouring pitched/banked chunks instead of leaving a slit.\n    const g=new THREE.PlaneGeometry(260,SURFACE_CHUNK_DEPTH,48,36);g.rotateX(-Math.PI/2);\n',
    'terrain overlap geometry',
)

materials = replace_once(
    materials,
    '        gl_FragColor=vec4(water,1.0);\n      }`,\n  });\n}\n',
    '        gl_FragColor=vec4(water,1.0);\n      }`,\n    // V10.3.2: the river follows pitched course chunks. Rendering only FrontSide made the surface\n    // disappear whenever the camera crossed the local plane normal on a climb/dive.\n    side:THREE.DoubleSide,depthWrite:true,depthTest:true,transparent:false,\n  });\n}\n',
    'water double side',
)

tests = replace_once(
    tests,
    'import { referenceAtmosphere } from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";\n',
    'import { createArcadeWaterMaterial, referenceAtmosphere } from "../src/sky/arcade/SkyDancerArcadeReferenceMaterials";\n',
    'water test import',
)

marker = 'test("V10.3.2 pitched terrain and river surfaces stay solid instead of exposing the sky", () => {'
if marker not in tests:
    insertion = r'''

test("V10.3.2 pitched terrain and river surfaces stay solid instead of exposing the sky", () => {
  const city = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "city");
  const canyon = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "canyon");
  assert.ok(city && canyon);

  const water = createArcadeWaterMaterial(city);
  assert.equal(water.side, THREE.DoubleSide, "river shader must survive a view from below its local plane");
  assert.equal(water.depthWrite, true);
  assert.equal(water.depthTest, true);
  water.dispose();

  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(city);
  const cityChunks = Array.from({ length: 8 }, (_, i) => scene.getObjectByName(`arcade-course-chunk-${i}`));
  assert.ok(cityChunks.every(Boolean));
  assert.ok(cityChunks.every(chunk => Number(chunk!.userData.arcadeSurfaceChunkDepth) >= 140), "city slabs need substantial overlap across pitched seams");
  const rivers = scene.getObjectsByProperty("name", "arcade-city-river-surface") as THREE.Mesh[];
  assert.equal(rivers.length, 8);
  for (const river of rivers) {
    assert.ok(river.geometry instanceof THREE.PlaneGeometry);
    assert.ok(river.geometry.parameters.height >= 140, `river depth ${river.geometry.parameters.height} must overlap adjacent chunks`);
    assert.equal((river.material as THREE.Material).side, THREE.DoubleSide);
    assert.equal(river.userData.arcadeTerrainSolidV1032, true);
  }

  const length = city.durationSeconds * city.courseSpeed;
  for (const progress of [.12, .18, .25, .29, .39, .43, .51]) {
    world.update(length * progress, 0, 0);
    for (const river of rivers) {
      river.updateMatrixWorld(true);
      assert.ok(river.matrixWorld.elements.every(Number.isFinite), `river transform must stay finite at progress ${progress}`);
    }
  }

  world.setStage(canyon);
  const terrains = scene.getObjectsByProperty("name", "arcade-continuous-terrain") as THREE.Mesh[];
  assert.equal(terrains.length, 8);
  for (const terrain of terrains) {
    assert.equal((terrain.material as THREE.Material).side, THREE.DoubleSide);
    assert.equal(terrain.userData.arcadeTerrainSolidV1032, true);
    const geometry = terrain.geometry as THREE.PlaneGeometry;
    assert.ok(geometry.parameters.height >= 140, `terrain depth ${geometry.parameters.height} must overlap adjacent chunks`);
  }
  world.dispose();
});
'''
    anchor = 'test("missile trails and explosions keep a bounded mesh and buffer count under load", () => {'
    if anchor not in tests:
        raise SystemExit('test insertion anchor missing')
    tests = tests.replace(anchor, insertion + '\n' + anchor, 1)

WORLD.write_text(world)
MATERIALS.write_text(materials)
TESTS.write_text(tests)
print('Applied Arcade Run V10.3.2 terrain solidity patch')
