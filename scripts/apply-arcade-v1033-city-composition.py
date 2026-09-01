from pathlib import Path

WORLD = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
TESTS = Path('tests/sky-arcade-reference.test.ts')

world = WORLD.read_text()
tests = TESTS.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)

world = replace_once(
    world,
    'const SURFACE_CHUNK_DEPTH = CHUNK_LENGTH + 32; // V10.3.2: overlap pitched chunks so sky can never show through a terrain seam.\n',
    'const SURFACE_CHUNK_DEPTH = CHUNK_LENGTH + 32; // V10.3.2: overlap pitched chunks so sky can never show through a terrain seam.\nconst CITY_QUAY_DEPTH = CHUNK_LENGTH + 12; // V10.3.3: city banks overlap modestly; the river itself is now a continuous spline ribbon.\n',
    'city quay depth constant',
)

world = replace_once(
    world,
    '  private volcanoRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;\n',
    '  private volcanoRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;\n  private cityRiver:{ surface:THREE.Mesh; bed:THREE.Mesh }|null=null;\n',
    'city river field',
)

world = replace_once(
    world,
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;\n',
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;\n',
    'city river reset',
)

world = replace_once(
    world,
    '    for(let i=0;i<CHUNK_COUNT;i++){\n      const group=this.buildChunk(stage,i,facade,cloud);\n      this.root.add(group);this.chunks.push({group,index:i});\n    }\n    this.buildRouteCues(stage);\n',
    '    for(let i=0;i<CHUNK_COUNT;i++){\n      const group=this.buildChunk(stage,i,facade,cloud);\n      this.root.add(group);this.chunks.push({group,index:i});\n    }\n    if(stage.biome==="city")this.buildCityRiver(stage);\n    this.buildRouteCues(stage);\n',
    'build continuous city river',
)

world = replace_once(
    world,
    '    for(const cue of this.routeCues){\n',
    '    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);\n    for(const cue of this.routeCues){\n',
    'update continuous city river',
)

insert_marker = '  private makeIceRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {\n'
if world.count(insert_marker) != 1:
    raise SystemExit('city ribbon helper insertion marker changed')
city_helpers = '''  private makeCityRiverRibbon(width:number,name:string,material:THREE.Material,renderOrder:number):THREE.Mesh {
    const samples=40;
    const positions=new Float32Array(samples*2*3);
    const indices:number[]=[];
    for(let i=0;i<samples-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    const geometry=new THREE.BufferGeometry();
    const attribute=new THREE.BufferAttribute(positions,3);attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position",attribute);geometry.setIndex(indices);
    const ribbon=new THREE.Mesh(geometry,material);
    ribbon.name=name;ribbon.frustumCulled=false;ribbon.renderOrder=renderOrder;this.root.add(ribbon);
    ribbon.userData.arcadeCityCompositionV1033=true;
    ribbon.userData.arcadeCityRiverWidth=width;
    return ribbon;
  }

  private buildCityRiver(stage:SkyDancerArcadeStageDefinition):void {
    if(!this.water)return;
    const bedMaterial=new THREE.MeshBasicMaterial({
      color:new THREE.Color(stage.palette.ground).multiplyScalar(.58),side:THREE.DoubleSide,depthWrite:true,depthTest:true,
    });
    this.cityRiver={
      bed:this.makeCityRiverRibbon(43,"arcade-city-river-ribbon-bed",bedMaterial,0),
      surface:this.makeCityRiverRibbon(40,"arcade-city-river-ribbon-surface",this.water,1),
    };
  }

  private updateCityRiver(distance:number,playerX:number,playerY:number):void {
    if(!this.stage || !this.cityRiver)return;
    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{
      const attribute=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array=attribute.array as Float32Array;
      const half=width*.5;
      const samples=attribute.count/2;
      for(let i=0;i<samples;i++){
        const depth=8+i*13.6;
        const course=arcadeCourseRelativePose(this.stage!,distance,depth);
        const cx=course.x-playerX*.35-.4;
        const cy=course.y-playerY*.16-25.34+lift;
        const cz=-depth;
        const lateralX=Math.cos(course.yaw)*half;
        const lateralZ=-Math.sin(course.yaw)*half;
        const bankY=course.bank*half*.22;
        const left=i*6,right=left+3;
        array[left]=cx-lateralX;array[left+1]=cy-bankY;array[left+2]=cz-lateralZ;
        array[right]=cx+lateralX;array[right+1]=cy+bankY;array[right+2]=cz+lateralZ;
      }
      attribute.needsUpdate=true;
    };
    update(this.cityRiver.bed,43,-.48);
    update(this.cityRiver.surface,40,0);
  }

'''
world = world.replace(insert_marker, city_helpers + insert_marker, 1)

world = replace_once(
    world,
    '      const x=side*(31+lane*15+random(seed+7)*4.2);\n',
    '      // V10.3.3: preserve a real river/flight corridor instead of letting foreground towers collide with route surfaces.\n      const x=side*(38+lane*15+random(seed+7)*4.2);\n',
    'city tower clearance',
)

old_city_surface = '''    group.add(towers,roofs,spires);
    // V10.3.2: rigid course chunks pitch independently. Give every ground/water slab generous longitudinal
    // overlap, and place an opaque river bed under the shader surface so a seam can never reveal the sky.
    const cityFloor=paint(stage.biome==="night"?0x111d31:0x213746);
    mesh(group,new THREE.BoxGeometry(250,1,SURFACE_CHUNK_DEPTH),cityFloor,0,-26);
    if(this.water && stage.biome!=="night"){
      mesh(group,new THREE.BoxGeometry(42,.72,SURFACE_CHUNK_DEPTH),cityFloor,-.4,-25.78,0);
      const river=mesh(group,new THREE.PlaneGeometry(40,SURFACE_CHUNK_DEPTH,1,12),this.water,-.4,-25.34,0);
      river.name="arcade-city-river-surface";river.rotation.x=-Math.PI/2;river.frustumCulled=false;river.renderOrder=1;
      river.userData.arcadeTerrainSolidV1032=true;
    }
'''
new_city_surface = '''    group.add(towers,roofs,spires);
    // V10.3.3 composition cleanup: never rotate one full-width city slab through the camera.
    // The river is a root-level spline ribbon; rigid chunks own only the two river-bank districts.
    group.userData.arcadeCityCompositionV1033=true;
    const cityFloor=paint(stage.biome==="night"?0x111d31:0x213746);
    for(const side of [-1,1]){
      const quay=mesh(group,new THREE.BoxGeometry(96,1,CITY_QUAY_DEPTH),cityFloor,side*72,-26);
      quay.userData.arcadeCityQuayV1033=true;
    }
'''
world = replace_once(world, old_city_surface, new_city_surface, 'city split quays')

world = world.replace('new THREE.BoxGeometry(38,.32,SURFACE_CHUNK_DEPTH)', 'new THREE.BoxGeometry(38,.32,CITY_QUAY_DEPTH)', 1)
world = world.replace('new THREE.BoxGeometry(.34,.14,SURFACE_CHUNK_DEPTH-2)', 'new THREE.BoxGeometry(.34,.14,CITY_QUAY_DEPTH-2)', 1)
world = world.replace('new THREE.BoxGeometry(.18,.11,SURFACE_CHUNK_DEPTH-2)', 'new THREE.BoxGeometry(.18,.11,CITY_QUAY_DEPTH-2)', 1)
world = world.replace('new THREE.BoxGeometry(2.4,1.3,SURFACE_CHUNK_DEPTH)', 'new THREE.BoxGeometry(2.4,1.3,CITY_QUAY_DEPTH)', 1)
world = world.replace('new THREE.BoxGeometry(3.5,.12,SURFACE_CHUNK_DEPTH)', 'new THREE.BoxGeometry(3.5,.12,CITY_QUAY_DEPTH)', 1)
world = world.replace('new THREE.BoxGeometry(.07,.06,SURFACE_CHUNK_DEPTH-2)', 'new THREE.BoxGeometry(.07,.06,CITY_QUAY_DEPTH-2)', 1)

old_bridge = '''    if(index%3===1){
      mesh(group,new THREE.BoxGeometry(52,.9,4),bank,0,-18.5,0);
      mesh(group,new THREE.BoxGeometry(51,.05,2.5),road,0,-18,0);
      for(const side of [-1,1]){
        mesh(group,new THREE.CylinderGeometry(.55,.7,9,8),bank,side*18,-21,0);
        mesh(group,new THREE.BoxGeometry(52,.06,.08),light,0,-17.85,side*1.65);
      }
    }
'''
new_bridge = '''    if(index%3===1){
      // V10.3.3: read as a bridge, not a giant opaque card when this chunk is pitched toward the camera.
      const deck=mesh(group,new THREE.BoxGeometry(50,.26,3.2),road,0,-21.25,0);
      deck.userData.arcadeCityBridgeDeckV1033=true;
      for(const z of [-1.82,1.82]){
        mesh(group,new THREE.BoxGeometry(50,.34,.24),bank,0,-20.88,z);
        mesh(group,new THREE.BoxGeometry(49,.06,.1),light,0,-20.64,z);
      }
      for(const side of [-1,1]){
        mesh(group,new THREE.CylinderGeometry(.42,.58,5.4,8),bank,side*18,-23.4,0);
        mesh(group,new THREE.BoxGeometry(1.1,4.1,3.7),bank,side*18,-22.1,0);
      }
    }
'''
world = replace_once(world, old_bridge, new_bridge, 'structured city bridge')

# City renderer now owns exactly one continuous water shader instead of eight rigid planes.
tests = replace_once(
    tests,
    '  assert.equal(facades, 8); assert.equal(rivers, 8); world.dispose();\n',
    '  assert.equal(facades, 8); assert.equal(rivers, 1); world.dispose();\n',
    'city renderer river count',
)

start = tests.index('test("V10.3.2 pitched terrain and river surfaces stay solid instead of exposing the sky", () => {')
end = tests.index('test("missile trails and explosions keep a bounded mesh and buffer count under load", () => {', start)
replacement = '''test("V10.3.3 Dawn City keeps the river continuous without intersecting giant rigid slabs", () => {
  const city = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "city");
  const canyon = SKY_DANCER_ARCADE_STAGES.find(stage => stage.biome === "canyon");
  assert.ok(city && canyon);

  const water = createArcadeWaterMaterial(city);
  assert.equal(water.side, THREE.DoubleSide);
  assert.equal(water.depthWrite, true);
  assert.equal(water.depthTest, true);
  water.dispose();

  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  world.setStage(city);
  const cityChunks = Array.from({ length: 8 }, (_, i) => scene.getObjectByName(`arcade-course-chunk-${i}`));
  assert.ok(cityChunks.every(Boolean));
  assert.ok(cityChunks.every(chunk => chunk!.userData.arcadeCityCompositionV1033 === true));

  const surface = scene.getObjectByName("arcade-city-river-ribbon-surface") as THREE.Mesh;
  const bed = scene.getObjectByName("arcade-city-river-ribbon-bed") as THREE.Mesh;
  assert.ok(surface instanceof THREE.Mesh && bed instanceof THREE.Mesh);
  assert.equal(scene.getObjectsByProperty("name", "arcade-city-river-surface").length, 0, "per-chunk river planes must be gone");
  assert.equal((surface.material as THREE.Material).side, THREE.DoubleSide);

  let giantRigidCitySlabs = 0;
  const quays: THREE.Mesh[] = [];
  const bridgeDecks: THREE.Mesh[] = [];
  for (const chunk of cityChunks) chunk!.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !(object.geometry instanceof THREE.BoxGeometry)) return;
    const p = object.geometry.parameters;
    if (p.width >= 200 && p.depth >= 100) giantRigidCitySlabs++;
    if (object.userData.arcadeCityQuayV1033) quays.push(object);
    if (object.userData.arcadeCityBridgeDeckV1033) bridgeDecks.push(object);
  });
  assert.equal(giantRigidCitySlabs, 0, "no full-width rigid slab may rotate across the flight corridor");
  assert.equal(quays.length, 16, "each streamed chunk owns two separated river banks");
  assert.ok(quays.every(quay => (quay.geometry as THREE.BoxGeometry).parameters.width <= 96));
  assert.ok(bridgeDecks.length >= 2);
  assert.ok(bridgeDecks.every(deck => (deck.geometry as THREE.BoxGeometry).parameters.height <= .3), "crossings must be thin bridge decks, not opaque cards");

  const length = city.durationSeconds * city.courseSpeed;
  for (const progress of [.12, .18, .25, .29, .39, .43, .51]) {
    world.update(length * progress, 0, 0);
    const position = surface.geometry.getAttribute("position") as THREE.BufferAttribute;
    const centres: THREE.Vector3[] = [];
    for (let i = 0; i < position.count; i += 2) {
      const left = new THREE.Vector3().fromBufferAttribute(position, i);
      const right = new THREE.Vector3().fromBufferAttribute(position, i + 1);
      centres.push(left.add(right).multiplyScalar(.5));
    }
    assert.ok(Array.from(position.array).every(Number.isFinite));
    for (let i = 1; i < centres.length; i++) {
      assert.ok(centres[i].distanceTo(centres[i - 1]) < 32, `river must remain a continuous spline at progress ${progress}`);
    }
  }

  world.setStage(canyon);
  const terrains = scene.getObjectsByProperty("name", "arcade-continuous-terrain") as THREE.Mesh[];
  assert.equal(terrains.length, 8);
  for (const terrain of terrains) {
    assert.equal((terrain.material as THREE.Material).side, THREE.DoubleSide);
    assert.equal(terrain.userData.arcadeTerrainSolidV1032, true);
    const geometry = terrain.geometry as THREE.PlaneGeometry;
    assert.ok(geometry.parameters.height >= 140);
  }
  world.dispose();
});

'''
tests = tests[:start] + replacement + tests[end:]

WORLD.write_text(world)
TESTS.write_text(tests)
