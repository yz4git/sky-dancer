from pathlib import Path

world=Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
s=world.read_text()

s=s.replace(
'''  private cityBanks:{ left:THREE.Mesh; right:THREE.Mesh }|null=null;\n  private backdrop:THREE.Group|null=null;''',
'''  private cityBanks:{ left:THREE.Mesh; right:THREE.Mesh }|null=null;\n  private terrainRibbon:THREE.Mesh|null=null;\n  private backdrop:THREE.Group|null=null;''',1)

s=s.replace(
'''    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;this.cityBanks=null;this.backdrop=null;''',
'''    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;this.cityBanks=null;this.terrainRibbon=null;this.backdrop=null;''',1)

old='''    for(let i=0;i<CHUNK_COUNT;i++){\n      const group=this.buildChunk(stage,i,facade,cloud);\n      this.root.add(group);this.chunks.push({group,index:i});\n    }\n    if(stage.biome==="city"){this.buildCityRiver(stage);this.buildCityBanks(stage);}'''
new='''    for(let i=0;i<CHUNK_COUNT;i++){\n      const group=this.buildChunk(stage,i,facade,cloud);\n      this.root.add(group);this.chunks.push({group,index:i});\n    }\n    if(["canyon","desert","ice","volcano"].includes(stage.biome))this.buildContinuousTerrain(stage);\n    if(stage.biome==="city"){this.buildCityRiver(stage);this.buildCityBanks(stage);}'''
assert old in s
s=s.replace(old,new,1)

old='''    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);\n    if(this.cityBanks)this.updateCityBanks(distance,playerX,playerY);'''
new='''    if(this.terrainRibbon)this.updateContinuousTerrain(distance,playerX,playerY);\n    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);\n    if(this.cityBanks)this.updateCityBanks(distance,playerX,playerY);'''
assert old in s
s=s.replace(old,new,1)

needle='''  private makeCityRiverRibbon(width:number,name:string,material:THREE.Material,renderOrder:number):THREE.Mesh {'''
insert='''  private buildContinuousTerrain(stage:SkyDancerArcadeStageDefinition):void {\n    const depthSamples=42,lateralSamples=25,width=260;\n    const geometry=new THREE.BufferGeometry();\n    const positions=new Float32Array(depthSamples*lateralSamples*3);\n    const colors=new Float32Array(depthSamples*lateralSamples*3);\n    const indices:number[]=[];\n    for(let d=0;d<depthSamples-1;d++)for(let l=0;l<lateralSamples-1;l++){\n      const a=d*lateralSamples+l,b=a+lateralSamples;\n      indices.push(a,b,a+1,a+1,b,b+1);\n    }\n    const position=new THREE.BufferAttribute(positions,3);position.setUsage(THREE.DynamicDrawUsage);\n    const color=new THREE.BufferAttribute(colors,3);color.setUsage(THREE.DynamicDrawUsage);\n    geometry.setAttribute("position",position);geometry.setAttribute("color",color);geometry.setIndex(indices);\n    const material=new THREE.MeshStandardMaterial({\n      color:0xffffff,vertexColors:true,roughness:.86,metalness:.04,side:THREE.DoubleSide,depthWrite:true,depthTest:true,\n    });\n    const terrain=new THREE.Mesh(geometry,material);\n    terrain.name="arcade-continuous-terrain-ribbon";terrain.frustumCulled=false;terrain.renderOrder=0;\n    terrain.userData.arcadeContinuousTerrainV1037=true;\n    terrain.userData.arcadeTerrainDepthSamples=depthSamples;terrain.userData.arcadeTerrainLateralSamples=lateralSamples;terrain.userData.arcadeTerrainWidth=width;\n    this.root.add(terrain);this.terrainRibbon=terrain;this.updateContinuousTerrain(0,0,0);\n  }\n\n  private updateContinuousTerrain(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage||!this.terrainRibbon)return;\n    const terrain=this.terrainRibbon;\n    const depthSamples=Number(terrain.userData.arcadeTerrainDepthSamples);\n    const lateralSamples=Number(terrain.userData.arcadeTerrainLateralSamples);\n    const width=Number(terrain.userData.arcadeTerrainWidth);\n    const position=terrain.geometry.getAttribute("position") as THREE.BufferAttribute;\n    const color=terrain.geometry.getAttribute("color") as THREE.BufferAttribute;\n    const p=position.array as Float32Array,cArray=color.array as Float32Array;\n    const low=new THREE.Color(this.stage.palette.ground),high=new THREE.Color(this.stage.palette.secondary),c=new THREE.Color();\n    const bankScale=this.stage.biome==="desert"?.1:this.stage.biome==="ice"?.12:.16;\n    for(let d=0;d<depthSamples;d++){\n      // Start slightly behind the player so the floor remains continuous, but construct every row directly on the spline.\n      // No full-width rigid plane is ever yawed through the camera.\n      const depth=-12+d*13.8;\n      const course=arcadeCourseRelativePose(this.stage,distance,depth);\n      const cosYaw=Math.cos(course.yaw),sinYaw=Math.sin(course.yaw);\n      const worldDepth=distance+depth;\n      for(let l=0;l<lateralSamples;l++){\n        const lateral=(l/(lateralSamples-1)-.5)*width;\n        const ridge=Math.max(0,Math.abs(lateral)-16);\n        const ripple=Math.sin(worldDepth*.028+lateral*.014)*Math.cos(lateral*.13-worldDepth*.008);\n        const micro=Math.sin(worldDepth*.16+lateral*.21)*Math.cos(lateral*.31-worldDepth*.09);\n        const h=-27+Math.pow(ridge,.82)*(this.stage.biome==="desert"?.6:1.45)+(3+ridge*.07)*ripple+micro*(this.stage.biome==="desert"?.7:1.45);\n        const bankY=Math.tan(course.bank*bankScale)*lateral;\n        const i=(d*lateralSamples+l)*3;\n        p[i]=course.x-playerX*.35+cosYaw*lateral;\n        p[i+1]=course.y-playerY*.16+h+bankY;\n        p[i+2]=-depth-sinYaw*lateral;\n        c.copy(low).lerp(high,Math.min(.9,Math.max(0,(h+29)/77)));\n        cArray[i]=c.r;cArray[i+1]=c.g;cArray[i+2]=c.b;\n      }\n    }\n    position.needsUpdate=true;color.needsUpdate=true;terrain.geometry.computeVertexNormals();\n  }\n\n'''+needle
assert needle in s
s=s.replace(needle,insert,1)

old='''    if(stage.biome==="city" || stage.biome==="night"){\n      this.addCity(group,stage,index,facade);\n      if(stage.biome==="night")this.addNightMetroPursuit(group,index,primary,secondary,dark,glow);\n    } else if(!["cloud","storm","orbit","citadel","ruins"].includes(stage.biome)){\n      const ground=this.buildTerrain(stage,index);\n      const groundMaterial=primary.clone();groundMaterial.vertexColors=true;groundMaterial.color.setHex(0xffffff);\n      // V10.3.2: steep course pitch/bank can expose the mathematical underside of the terrain plane.\n      // Keep it solid from either side, while the widened surface overlaps the neighbouring rigid chunk.\n      groundMaterial.side=THREE.DoubleSide;groundMaterial.depthWrite=true;groundMaterial.depthTest=true;\n      const terrain=mesh(group,ground,groundMaterial);terrain.name="arcade-continuous-terrain";\n      terrain.userData.arcadeTerrainSolidV1032=true;\n    }'''
new='''    if(stage.biome==="city" || stage.biome==="night"){\n      this.addCity(group,stage,index,facade);\n      if(stage.biome==="night")this.addNightMetroPursuit(group,index,primary,secondary,dark,glow);\n    }'''
assert old in s
s=s.replace(old,new,1)

old='''      const x=side*(25+r(j+71)*8.5);\n      const volcanoX=side*(33+r(j+71)*8);'''
new='''      const x=side*(25+r(j+71)*8.5);\n      // V10.3.7: canyon fins need more screen-space clearance than city towers; sharp spline yaw otherwise lets a near fin wipe the phone display.\n      const canyonX=side*(34+r(j+71)*10);\n      const volcanoX=side*(37+r(j+71)*9);'''
assert old in s
s=s.replace(old,new,1)

old='''        const rockX=stage.biome==="volcano"?volcanoX:x;'''
new='''        const rockX=stage.biome==="volcano"?volcanoX:canyonX;'''
assert old in s
s=s.replace(old,new,1)

start=s.find('''  private buildTerrain(stage:SkyDancerArcadeStageDefinition,index:number):THREE.BufferGeometry {''')
assert start!=-1
end=s.find('''\n  dispose():void {''',start)
assert end!=-1
s=s[:start]+s[end:]
world.write_text(s)

test=Path('tests/sky-arcade-reference.test.ts')
s=test.read_text()
old='''  world.setStage(canyon);\n  const terrains=scene.getObjectsByProperty("name","arcade-continuous-terrain") as THREE.Mesh[];\n  assert.equal(terrains.length,8);\n  for(const terrain of terrains){\n    assert.equal((terrain.material as THREE.Material).side,THREE.DoubleSide);\n    assert.equal(terrain.userData.arcadeTerrainSolidV1032,true);\n    assert.ok((terrain.geometry as THREE.PlaneGeometry).parameters.height>=140);\n  }\n  world.dispose();'''
new='''  world.setStage(canyon);\n  const terrain=scene.getObjectByName("arcade-continuous-terrain-ribbon") as THREE.Mesh;\n  assert.ok(terrain instanceof THREE.Mesh);\n  assert.equal(terrain.userData.arcadeContinuousTerrainV1037,true);\n  assert.equal((terrain.material as THREE.Material).side,THREE.DoubleSide);\n  assert.equal(Number(terrain.userData.arcadeTerrainDepthSamples),42);\n  assert.equal(Number(terrain.userData.arcadeTerrainLateralSamples),25);\n  assert.equal(Number(terrain.userData.arcadeTerrainWidth),260);\n  const length=canyon.durationSeconds*canyon.courseSpeed;\n  for(const progress of [.12,.25,.39,.51]){\n    world.update(length*progress,.8,-.6);\n    const pos=terrain.geometry.getAttribute("position") as THREE.BufferAttribute;\n    assert.ok(Array.from(pos.array).every(Number.isFinite),`continuous terrain remains finite at ${progress}`);\n    const lateralSamples=Number(terrain.userData.arcadeTerrainLateralSamples);\n    const centres:THREE.Vector3[]=[];\n    for(let d=0;d<Number(terrain.userData.arcadeTerrainDepthSamples);d++){\n      const i=d*lateralSamples+Math.floor(lateralSamples/2);\n      centres.push(new THREE.Vector3().fromBufferAttribute(pos,i));\n    }\n    for(let i=1;i<centres.length;i++)assert.ok(centres[i].distanceTo(centres[i-1])<25,`terrain centerline follows one continuous spline at ${progress}`);\n  }\n  assert.equal(scene.getObjectsByProperty("name","arcade-continuous-terrain").length,0,"legacy rigid terrain slabs must be gone");\n  world.dispose();'''
assert old in s
s=s.replace(old,new,1)

test.write_text(s)
