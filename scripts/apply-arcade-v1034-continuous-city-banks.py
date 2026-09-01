from pathlib import Path

WORLD=Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
TESTS=Path('tests/sky-arcade-reference.test.ts')
world=WORLD.read_text(); tests=TESTS.read_text()

def rep(text,old,new,label):
    c=text.count(old)
    if c!=1: raise SystemExit(f'{label}: expected 1 match, got {c}')
    return text.replace(old,new,1)

world=rep(world,
'  private cityRiver:{ surface:THREE.Mesh; bed:THREE.Mesh }|null=null;\n',
'  private cityRiver:{ surface:THREE.Mesh; bed:THREE.Mesh }|null=null;\n  private cityBanks:{ left:THREE.Mesh; right:THREE.Mesh }|null=null;\n',
'city banks field')
world=rep(world,
'disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;',
'disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;this.cityBanks=null;',
'city banks reset')
world=rep(world,
'    if(stage.biome==="city")this.buildCityRiver(stage);\n',
'    if(stage.biome==="city"){this.buildCityRiver(stage);this.buildCityBanks(stage);}\n',
'build city banks')
world=rep(world,
'    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);\n',
'    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);\n    if(this.cityBanks)this.updateCityBanks(distance,playerX,playerY);\n',
'update city banks')

marker='  private makeIceRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {\n'
assert world.count(marker)==1
helpers='''  private makeCityBankRibbon(side:-1|1,stage:SkyDancerArcadeStageDefinition):THREE.Mesh {
    const samples=40;
    const positions=new Float32Array(samples*2*3);
    const indices:number[]=[];
    for(let i=0;i<samples-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    const geometry=new THREE.BufferGeometry();
    const attribute=new THREE.BufferAttribute(positions,3);attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position",attribute);geometry.setIndex(indices);
    const material=new THREE.MeshBasicMaterial({
      color:new THREE.Color(stage.palette.ground).multiplyScalar(.82),side:THREE.DoubleSide,depthWrite:true,depthTest:true,
    });
    const ribbon=new THREE.Mesh(geometry,material);
    ribbon.name=side<0?"arcade-city-bank-ribbon-left":"arcade-city-bank-ribbon-right";
    ribbon.frustumCulled=false;ribbon.renderOrder=0;this.root.add(ribbon);
    ribbon.userData.arcadeCityBankV1034=true;
    ribbon.userData.arcadeCityBankInner=22;
    ribbon.userData.arcadeCityBankOuter=116;
    return ribbon;
  }

  private buildCityBanks(stage:SkyDancerArcadeStageDefinition):void {
    this.cityBanks={left:this.makeCityBankRibbon(-1,stage),right:this.makeCityBankRibbon(1,stage)};
  }

  private updateCityBanks(distance:number,playerX:number,playerY:number):void {
    if(!this.stage || !this.cityBanks)return;
    const update=(ribbon:THREE.Mesh,side:-1|1)=>{
      const attribute=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array=attribute.array as Float32Array;
      const samples=attribute.count/2;
      const inner=side*22,outer=side*116;
      for(let i=0;i<samples;i++){
        const depth=8+i*13.6;
        const course=arcadeCourseRelativePose(this.stage!,distance,depth);
        const cx=course.x-playerX*.35;
        const cy=course.y-playerY*.16-25.82;
        const cz=-depth;
        const write=(offset:number,base:number)=>{
          array[base]=cx+Math.cos(course.yaw)*offset;
          array[base+1]=cy+course.bank*offset*.22;
          array[base+2]=cz-Math.sin(course.yaw)*offset;
        };
        const base=i*6;write(inner,base);write(outer,base+3);
      }
      attribute.needsUpdate=true;
    };
    update(this.cityBanks.left,-1);update(this.cityBanks.right,1);
  }

'''
world=world.replace(marker,helpers+marker,1)

old='''    group.userData.arcadeCityCompositionV1033=true;
    group.userData.arcadeCityQuayCountV1033=2;
    const cityFloor=paint(stage.biome==="night"?0x111d31:0x213746);
    for(const side of [-1,1]){
      const quay=mesh(group,new THREE.BoxGeometry(96,1,CITY_QUAY_DEPTH),cityFloor,side*72,-26);
      quay.userData.arcadeCityQuayV1033=true;
    }
    if(stage.biome==="night"){
'''
new='''    group.userData.arcadeCityCompositionV1033=true;
    // V10.3.4: Dawn City ground is no longer a pair of rigid, rotating 124m slabs.
    // Only Night Metro keeps rigid district bases; Dawn City owns two root-level continuous bank ribbons.
    group.userData.arcadeCityRigidQuayCountV1034=stage.biome==="night"?2:0;
    const cityFloor=paint(stage.biome==="night"?0x111d31:0x213746);
    if(stage.biome==="night")for(const side of [-1,1])mesh(group,new THREE.BoxGeometry(96,1,CITY_QUAY_DEPTH),cityFloor,side*72,-26);
    if(stage.biome==="night"){
'''
world=rep(world,old,new,'remove Dawn City rigid quays')

old='''      for(let r=0;r<4;r++)mesh(group,new THREE.BoxGeometry(83,.14,2.2),road,side*66,-24.6,-53+r*28);
'''
new='''      // V10.3.4: side streets stop well outside the river corridor so a yawed chunk cannot form a giant diagonal card.
      group.userData.arcadeCityCrossStreetInnerClearanceV1034=46;
      for(let r=0;r<4;r++)mesh(group,new THREE.BoxGeometry(48,.14,2.2),road,side*70,-24.6,-53+r*28);
'''
world=rep(world,old,new,'shorten city cross streets')

start=tests.index('test("V10.3.3 Dawn City keeps the river continuous without intersecting giant rigid slabs", () => {')
end=tests.index('test("missile trails and explosions keep a bounded mesh and buffer count under load", () => {',start)
newtest='''test("V10.3.4 Dawn City uses continuous riverbanks instead of rigid slabs on sharp turns", () => {
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
  const terrains=scene.getObjectsByProperty("name","arcade-continuous-terrain") as THREE.Mesh[];
  assert.equal(terrains.length,8);
  for(const terrain of terrains){
    assert.equal((terrain.material as THREE.Material).side,THREE.DoubleSide);
    assert.equal(terrain.userData.arcadeTerrainSolidV1032,true);
    assert.ok((terrain.geometry as THREE.PlaneGeometry).parameters.height>=140);
  }
  world.dispose();
});

'''
tests=tests[:start]+newtest+tests[end:]
WORLD.write_text(world);TESTS.write_text(tests)
