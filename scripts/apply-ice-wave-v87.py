from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
webgl = "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts"
reference_test = "tests/sky-arcade-reference.test.ts"
run_test = "tests/sky-arcade-run.test.ts"

replace_once(world,
    '  private readonly routeCues:RouteCue[]=[];\n  private volcanoRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;\n',
    '  private readonly routeCues:RouteCue[]=[];\n  private iceRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;\n  private volcanoRibbon:{ outer:THREE.Mesh; core:THREE.Mesh }|null=null;\n',
    "ice ribbon field")
replace_once(world,
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.volcanoRibbon=null;\n',
    '    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;\n',
    "ice ribbon reset")
replace_once(world,
    '    this.buildRouteCues(stage);\n    if(stage.biome==="volcano")this.buildVolcanoRibbon(stage);\n',
    '    this.buildRouteCues(stage);\n    if(stage.biome==="ice")this.buildIceRibbon(stage);\n    if(stage.biome==="volcano")this.buildVolcanoRibbon(stage);\n',
    "ice ribbon build")
replace_once(world,
    '    if(this.volcanoRibbon)this.updateVolcanoRibbon(distance,playerX,playerY);\n',
    '    if(this.iceRibbon)this.updateIceRibbon(distance,playerX,playerY);\n    if(this.volcanoRibbon)this.updateVolcanoRibbon(distance,playerX,playerY);\n',
    "ice ribbon update")
replace_once(world,
    '      const yScale=cue.kind==="ice"?1.55:1;\n',
    '      const yScale=cue.kind==="ice"?1.85:1;\n',
    "ice cue y scale")
replace_once(world,
    '      cue.group.rotation.x=course.pitch*(cue.kind==="ice"?1.95:.78);\n',
    '      cue.group.rotation.x=course.pitch*(cue.kind==="ice"?2.15:.78);\n',
    "ice cue pitch")
replace_once(world,
    '    const count=kind==="ice"?9:10;\n',
    '    const count=kind==="ice"?7:10;\n',
    "ice cue count")
replace_once(world,
    '      const depth=kind==="ice"?24+i*40:26+i*43;\n',
    '      const depth=kind==="ice"?26+i*52:26+i*43;\n',
    "ice cue spacing")

marker = '  private makeVolcanoRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {\n'
ice_methods = '''  private makeIceRibbonMesh(stage:SkyDancerArcadeStageDefinition,width:number,name:string,opacity:number):THREE.Mesh {\n    const samples=28;\n    const positions=new Float32Array(samples*2*3);\n    const indices:number[]=[];\n    for(let i=0;i<samples-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}\n    const geometry=new THREE.BufferGeometry();\n    const attribute=new THREE.BufferAttribute(positions,3);attribute.setUsage(THREE.DynamicDrawUsage);\n    geometry.setAttribute("position",attribute);geometry.setIndex(indices);\n    const color=name.includes("core")\n      ? new THREE.Color(stage.palette.accent).lerp(new THREE.Color(0xffffff),.34)\n      : new THREE.Color(stage.palette.secondary).lerp(new THREE.Color(stage.palette.accent),.42);\n    const material=new THREE.MeshBasicMaterial({\n      color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,\n    });\n    const ribbon=new THREE.Mesh(geometry,material);\n    ribbon.name=name;ribbon.frustumCulled=false;ribbon.renderOrder=2;this.root.add(ribbon);\n    ribbon.userData.arcadeIceRibbonWidth=width;\n    return ribbon;\n  }\n\n  private buildIceRibbon(stage:SkyDancerArcadeStageDefinition):void {\n    this.iceRibbon={\n      outer:this.makeIceRibbonMesh(stage,16,"arcade-ice-course-fissure-outer",.34),\n      core:this.makeIceRibbonMesh(stage,3.2,"arcade-ice-course-fissure-core",.92),\n    };\n  }\n\n  private updateIceRibbon(distance:number,playerX:number,playerY:number):void {\n    if(!this.stage || !this.iceRibbon)return;\n    const update=(ribbon:THREE.Mesh,width:number,lift:number)=>{\n      const attribute=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute;\n      const array=attribute.array as Float32Array;\n      const half=width*.5;\n      const samples=attribute.count/2;\n      for(let i=0;i<samples;i++){\n        const depth=14+i*14.2;\n        const course=arcadeCourseRelativePose(this.stage,distance,depth);\n        const cx=course.x-playerX*.35;\n        const cy=course.y-playerY*.16-20.6+lift;\n        const cz=-depth;\n        const lateralX=Math.cos(course.yaw)*half;\n        const lateralZ=-Math.sin(course.yaw)*half;\n        const bankY=course.bank*half*.2;\n        const left=i*6,right=left+3;\n        array[left]=cx-lateralX;array[left+1]=cy-bankY;array[left+2]=cz-lateralZ;\n        array[right]=cx+lateralX;array[right+1]=cy+bankY;array[right+2]=cz+lateralZ;\n      }\n      attribute.needsUpdate=true;\n    };\n    update(this.iceRibbon.outer,16,0);\n    update(this.iceRibbon.core,3.2,.09);\n  }\n\n'''
replace_once(world, marker, ice_methods + marker, "ice dynamic fissure methods")

replace_once(webgl,
    '    const targetY = pose.y + shakeY - nearCourse.y * (iceCourse ? .004 : .012);\n',
    '    const targetY = pose.y + shakeY - nearCourse.y * (iceCourse ? 0 : .012);\n',
    "ice camera position lag")
replace_once(webgl,
    '      pose.lookY + nearCourse.y * (iceCourse ? .025 : .07) + farCourse.y * (iceCourse ? .004 : .018),\n',
    '      pose.lookY + nearCourse.y * (iceCourse ? .006 : .07) + farCourse.y * (iceCourse ? 0 : .018),\n',
    "ice camera look lag")

replace_once(reference_test,
    'test("V8.6 ice cavern visual ribs expose the stronger real vertical course wave", () => {\n',
    'test("V8.7 ice cavern exposes its real vertical wave with sparse ribs and a continuous glacial fissure", () => {\n',
    "V8.7 ice test name")
replace_once(reference_test,
    '  assert.equal(cues.length, 9);\n  assert.equal(scene.getObjectsByProperty("name", "arcade-ice-wave-arch").length, 9);\n',
    '  assert.equal(cues.length, 7);\n  assert.equal(scene.getObjectsByProperty("name", "arcade-ice-wave-arch").length, 7);\n',
    "V8.7 ice cue count")
replace_once(reference_test,
    '  assert.ok(Math.max(...ys)-Math.min(...ys)>22,\n',
    '  assert.ok(Math.max(...ys)-Math.min(...ys)>28,\n',
    "V8.7 ice cue vertical threshold")
replace_once(reference_test,
    '  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.24,\n',
    '  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.28,\n',
    "V8.7 ice cue pitch threshold")
replace_once(reference_test,
    '  assert.ok(Math.max(...xs)-Math.min(...xs)>25,\n    "ice tunnel keeps its horizontal slalom while adding the vertical wave");\n  world.dispose();\n});\n',
    '''  assert.ok(Math.max(...xs)-Math.min(...xs)>25,\n    "ice tunnel keeps its horizontal slalom while adding the vertical wave");\n  const fissure=scene.getObjectByName("arcade-ice-course-fissure-outer") as THREE.Mesh;\n  const core=scene.getObjectByName("arcade-ice-course-fissure-core") as THREE.Mesh;\n  assert.ok(fissure instanceof THREE.Mesh && core instanceof THREE.Mesh);\n  const fissurePosition=fissure.geometry.getAttribute("position") as THREE.BufferAttribute;\n  assert.equal(fissurePosition.count,56);\n  const fissureY:number[]=[];\n  for(let i=0;i<fissurePosition.count;i+=2)fissureY.push((fissurePosition.getY(i)+fissurePosition.getY(i+1))*.5);\n  assert.ok(Math.max(...fissureY)-Math.min(...fissureY)>12,\n    "continuous glacial fissure must reveal the upcoming climb/dive");\n  world.dispose();\n});\n''',
    "V8.7 ice fissure test")

replace_once(run_test,
    '  assert.match(webgl, /nearCourse\\.y \\* \\(iceCourse \\? \\.025 : \\.07\\)/);\n  assert.match(webgl, /farCourse\\.y \\* \\(iceCourse \\? \\.004 : \\.018\\)/);\n',
    '  assert.match(webgl, /nearCourse\\.y \\* \\(iceCourse \\? \\.006 : \\.07\\)/);\n  assert.match(webgl, /farCourse\\.y \\* \\(iceCourse \\? 0 : \\.018\\)/);\n',
    "V8.7 ice camera regression")

print("Applied Ice Cavern V8.7 readable vertical wave pass")
