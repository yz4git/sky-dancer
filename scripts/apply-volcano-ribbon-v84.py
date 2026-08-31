from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
test = "tests/sky-arcade-reference.test.ts"

replace_once(
    world,
    '  private readonly routeCues:RouteCue[]=[];\n  private stage:SkyDancerArcadeStageDefinition|null=null;\n',
    '  private readonly routeCues:RouteCue[]=[];\n  private volcanoRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;\n  private stage:SkyDancerArcadeStageDefinition|null=null;\n',
    "volcano ribbon field",
)

replace_once(
    world,
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;\n',
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.volcanoRibbon=null;\n',
    "volcano ribbon reset",
)

replace_once(
    world,
    '    this.buildRouteCues(stage);\n    this.update(0,0,0);\n',
    '    this.buildRouteCues(stage);\n    if(stage.biome==="volcano")this.buildVolcanoRibbon(stage);\n    this.update(0,0,0);\n',
    "volcano ribbon build call",
)

replace_once(
    world,
    '    }\n    if(this.water)this.water.uniforms.time.value=distance/this.stage.courseSpeed;\n  }\n\n  private buildRouteCues(stage:SkyDancerArcadeStageDefinition):void {\n',
    '''    }\n    if(this.volcanoRibbon)this.updateVolcanoRibbon(distance,playerX,playerY);\n    if(this.water)this.water.uniforms.time.value=distance/this.stage.courseSpeed;\n  }\n\n  private makeVolcanoRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {\n    const samples=30;\n    const positions=new Float32Array(samples*2*3);\n    const indices:number[]=[];\n    for(let i=0;i<samples-1;i++){\n      const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);\n    }\n    const geometry=new THREE.BufferGeometry();\n    const attribute=new THREE.BufferAttribute(positions,3);\n    attribute.setUsage(THREE.DynamicDrawUsage);\n    geometry.setAttribute("position",attribute);geometry.setIndex(indices);\n    const color=name.includes("core")\n      ? new THREE.Color(stage.palette.accent)\n      : new THREE.Color(stage.palette.secondary).lerp(new THREE.Color(stage.palette.accent),.58);\n    const material=new THREE.MeshBasicMaterial({\n      color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,\n    });\n    const ribbon=new THREE.Mesh(geometry,material);\n    ribbon.name=name;ribbon.frustumCulled=false;ribbon.renderOrder=2;this.root.add(ribbon);\n    ribbon.userData.arcadeVolcanoRibbonWidth=width;\n    return ribbon;\n  }\n\n  private buildVolcanoRibbon(stage:SkyDancerArcadeStageDefinition):void {\n    this.volcanoRibbon={\n      outer:this.makeVolcanoRibbonMesh(stage,19,"arcade-volcano-course-ribbon-outer",.62),\n      core:this.makeVolcanoRibbonMesh(stage,10,"arcade-volcano-course-ribbon-core",.92),\n    };\n  }\n\n  private updateVolcanoRibbon(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage || !this.volcanoRibbon)return;\n    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{\n      const attribute=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;\n      const array=attribute.array as Float32Array;\n      const half=width*.5;\n      const samples=attribute.count/2;\n      for(let i=0;i<samples;i++){\n        const depth=16+i*13.2;\n        const course=arcadeCourseRelativePose(this.stage,distance,depth);\n        const cx=course.x-playerX*.35;\n        const cy=course.y-playerY*.16-24.05+lift;\n        const cz=-depth;\n        const lateralX=Math.cos(course.yaw)*half;\n        const lateralZ=-Math.sin(course.yaw)*half;\n        const bankY=course.bank*half*.28;\n        const left=i*6,right=left+3;\n        array[left]=cx-lateralX;array[left+1]=cy-bankY;array[left+2]=cz-lateralZ;\n        array[right]=cx+lateralX;array[right+1]=cy+bankY;array[right+2]=cz+lateralZ;\n      }\n      attribute.needsUpdate=true;\n    };\n    update(this.volcanoRibbon.outer,19,0);\n    update(this.volcanoRibbon.core,10,.11);\n  }\n\n  private buildRouteCues(stage:SkyDancerArcadeStageDefinition):void {\n''',
    "dynamic volcano ribbon methods",
)

replace_once(
    world,
    '''      if(kind==="volcano"){\n        cue.name="arcade-volcano-route-cue";\n        const river=mesh(cue,new THREE.BoxGeometry(20,.26,46),glow,0,-24.3,0);\n        river.name="arcade-volcano-bent-lava-ribbon";\n        for(const side of [-1,1]){\n          const rim=mesh(cue,new THREE.BoxGeometry(3.2,1.1,45),i%2?secondary:primary,side*12,-24.6,0);\n          rim.rotation.z=side*(i%2?.025:-.018);\n          mesh(cue,new THREE.BoxGeometry(.34,.18,43),glow,side*9.9,-23.9,0);\n        }\n''',
    '''      if(kind==="volcano"){\n        cue.name="arcade-volcano-route-cue";\n        // Short rim markers preserve depth rhythm while the continuous ribbon shows the true curve.\n        for(const side of [-1,1]){\n          const rim=mesh(cue,new THREE.BoxGeometry(2.8,.9,14),i%2?secondary:primary,side*12,-24.6,0);\n          rim.rotation.z=side*(i%2?.025:-.018);\n          mesh(cue,new THREE.BoxGeometry(.34,.18,13),glow,side*9.9,-23.9,0);\n        }\n''',
    "remove segmented volcano road",
)

replace_once(
    world,
    '      const x=side*(25+r(j+71)*8.5);\n',
    '      const x=side*(25+r(j+71)*8.5);\n      const volcanoX=side*(33+r(j+71)*8);\n',
    "preserve near pass base and add volcano offset",
)

replace_once(
    world,
    '      } else if(stage.biome==="canyon" || stage.biome==="desert" || stage.biome==="volcano"){\n        const h=24+r(j+9)*36;\n        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,x,-26+h/2,z);\n        fin.rotation.z=side*(.06+r(j+27)*.16);\n        fin.rotation.y=r(j+37)*Math.PI;\n        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,x-side*2,-13,z+2);\n',
    '      } else if(stage.biome==="canyon" || stage.biome==="desert" || stage.biome==="volcano"){\n        const h=stage.biome==="volcano"?20+r(j+9)*27:24+r(j+9)*36;\n        const rockX=stage.biome==="volcano"?volcanoX:x;\n        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,rockX,-26+h/2,z);\n        fin.rotation.z=side*(.06+r(j+27)*.16);\n        fin.rotation.y=r(j+37)*Math.PI;\n        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,rockX-side*2,-13,z+2);\n',
    "widen and lower only volcano near pass occluders",
)

old_test = '''test("V8.3 volcano ribbon and orbital helix expose the real course shape on screen", () => {\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  const volcano = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "volcano-core")!;\n  world.setStage(volcano);\n  world.update(640, 0, 0);\n  const lava = scene.getObjectsByProperty("name", "arcade-volcano-route-cue");\n  assert.equal(lava.length, 10);\n  assert.ok(Math.max(...lava.map((cue) => cue.position.x)) - Math.min(...lava.map((cue) => cue.position.x)) > 12,\n    "volcano route ribbon should visibly sweep sideways");\n  assert.equal(scene.getObjectsByProperty("name", "arcade-volcano-bent-lava-ribbon").length, 10);\n\n  const orbit = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "orbital-ascent")!;\n  world.setStage(orbit);\n  world.update(720, 0, 0);\n  const helix = scene.getObjectsByProperty("name", "arcade-orbit-helix-cue");\n  assert.equal(helix.length, 10);\n  assert.ok(Math.max(...helix.map((cue) => cue.position.x)) - Math.min(...helix.map((cue) => cue.position.x)) > 10,\n    "orbital helix centers should bend across the view");\n  assert.ok(Math.max(...helix.map((cue) => cue.rotation.z)) - Math.min(...helix.map((cue) => cue.rotation.z)) > 1,\n    "orbital guide arcs should visibly wind around the ascent axis");\n  assert.equal(scene.getObjectsByProperty("name", "arcade-orbit-helix-arc").length, 10);\n  world.dispose();\n});'''

new_test = '''test("V8.4 continuous volcano ribbon and orbital helix expose the real course shape on screen", () => {\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  const volcano = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "volcano-core")!;\n  world.setStage(volcano);\n  world.update(volcano.courseSpeed * 4, 0, 0);\n  const outer = scene.getObjectByName("arcade-volcano-course-ribbon-outer") as THREE.Mesh;\n  const core = scene.getObjectByName("arcade-volcano-course-ribbon-core") as THREE.Mesh;\n  assert.ok(outer instanceof THREE.Mesh && core instanceof THREE.Mesh);\n  assert.equal(scene.getObjectsByProperty("name", "arcade-volcano-bent-lava-ribbon").length, 0,\n    "old segmented road must stay removed");\n  const position = outer.geometry.getAttribute("position") as THREE.BufferAttribute;\n  assert.equal(position.count, 60);\n  const centersX:number[] = [], centersY:number[] = [];\n  for(let i=0;i<position.count;i+=2){\n    centersX.push((position.getX(i)+position.getX(i+1))*.5);\n    centersY.push((position.getY(i)+position.getY(i+1))*.5);\n  }\n  assert.ok(Math.max(...centersX)-Math.min(...centersX)>35,\n    "continuous magma river must visibly sweep across the crater");\n  assert.ok(Math.max(...centersY)-Math.min(...centersY)>8,\n    "magma river must also show the pressure dive instead of lying flat");\n  assert.equal(scene.getObjectsByProperty("name", "arcade-volcano-route-cue").length, 10);\n\n  const orbit = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "orbital-ascent")!;\n  world.setStage(orbit);\n  world.update(720, 0, 0);\n  const helix = scene.getObjectsByProperty("name", "arcade-orbit-helix-cue");\n  assert.equal(helix.length, 10);\n  assert.ok(Math.max(...helix.map((cue) => cue.position.x)) - Math.min(...helix.map((cue) => cue.position.x)) > 10,\n    "orbital helix centers should bend across the view");\n  assert.ok(Math.max(...helix.map((cue) => cue.rotation.z)) - Math.min(...helix.map((cue) => cue.rotation.z)) > 1,\n    "orbital guide arcs should visibly wind around the ascent axis");\n  assert.equal(scene.getObjectsByProperty("name", "arcade-orbit-helix-arc").length, 10);\n  world.dispose();\n});'''
replace_once(test, old_test, new_test, "V8.4 visual route regression")

print("Applied V8.4 continuous volcano ribbon pass")
