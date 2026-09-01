from pathlib import Path

world = Path('src/sky/arcade/SkyDancerArcadeReferenceWorld.ts')
s = world.read_text()

old = '''  private cityRiver:{ surface:THREE.Mesh; bed:THREE.Mesh }|null=null;\n  private cityBanks:{ left:THREE.Mesh; right:THREE.Mesh }|null=null;\n  private stage:SkyDancerArcadeStageDefinition|null=null;'''
new = '''  private cityRiver:{ surface:THREE.Mesh; bed:THREE.Mesh }|null=null;\n  private cityBanks:{ left:THREE.Mesh; right:THREE.Mesh }|null=null;\n  private backdrop:THREE.Group|null=null;\n  private stage:SkyDancerArcadeStageDefinition|null=null;'''
assert old in s
s = s.replace(old, new, 1)

old = '''    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;this.cityBanks=null;'''
new = '''    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;this.iceRibbon=null;this.volcanoRibbon=null;this.cityRiver=null;this.cityBanks=null;this.backdrop=null;'''
assert old in s
s = s.replace(old, new, 1)

old = '''    this.root.add(hemi,key,rim,createArcadeSky(stage),this.buildBackdrop(stage));'''
new = '''    this.backdrop=this.buildBackdrop(stage);\n    this.backdrop.userData.arcadeBackdropCourseFollowV1035=stage.biome!=="orbit"&&stage.biome!=="citadel";\n    this.root.add(hemi,key,rim,createArcadeSky(stage),this.backdrop);'''
assert old in s
s = s.replace(old, new, 1)

old = '''      chunk.group.rotation.y=course.yaw*1.08;\n      chunk.group.rotation.x=course.pitch*.94;\n      chunk.group.rotation.z=course.bank*.38;\n    }\n    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);'''
new = '''      const skylineStage=this.stage.biome==="city"||this.stage.biome==="night";\n      // V10.3.5: city architecture is a scenery wall, not the flight deck itself.\n      // Let the continuous river/banks carry the exact turn and keep rigid building chunks from over-banking.\n      chunk.group.rotation.y=course.yaw*(skylineStage?.82:1.08);\n      chunk.group.rotation.x=course.pitch*(skylineStage?.7:.94);\n      chunk.group.rotation.z=course.bank*(skylineStage?.23:.38);\n    }\n    if(this.backdrop)this.updateBackdrop(distance);\n    if(this.cityRiver)this.updateCityRiver(distance,playerX,playerY);'''
assert old in s
s = s.replace(old, new, 1)

needle = '''  private makeCityRiverRibbon(width:number,name:string,material:THREE.Material,renderOrder:number):THREE.Mesh {'''
insert = '''  private updateBackdrop(distance:number):void {\n    if(!this.stage||!this.backdrop)return;\n    const followsCourse=this.stage.biome!=="orbit"&&this.stage.biome!=="citadel";\n    if(!followsCourse){\n      this.backdrop.position.set(0,0,0);\n      this.backdrop.rotation.set(0,0,0);\n      return;\n    }\n    // V10.3.5: the old far field was world-fixed while the streamed corridor used course-relative coordinates.\n    // On video that made the skyline visibly slide sideways against the river whenever the route turned.\n    // Anchor the far field to a distant sample of the same spline. It deliberately follows less than the\n    // foreground so the shot keeps depth parallax without looking like two unrelated worlds.\n    const cityLike=this.stage.biome==="city"||this.stage.biome==="night";\n    const depth=cityLike?430:520;\n    const far=arcadeCourseRelativePose(this.stage,distance,depth);\n    this.backdrop.position.x=far.x*(cityLike?.72:.58);\n    this.backdrop.position.y=far.y*(cityLike?.46:.38);\n    this.backdrop.position.z=0;\n    this.backdrop.rotation.set(0,0,0);\n    this.backdrop.userData.arcadeBackdropDepthV1035=depth;\n    this.backdrop.userData.arcadeBackdropXFollowV1035=cityLike?.72:.58;\n    this.backdrop.userData.arcadeBackdropYFollowV1035=cityLike?.46:.38;\n  }\n\n'''+needle
assert needle in s
s = s.replace(needle, insert, 1)
world.write_text(s)

camera = Path('src/sky/arcade/SkyDancerArcadeWebGLDemo.ts')
s = camera.read_text()
old = '''    // Stronger horizon roll makes the corridor visibly bank while remaining below motion-sickness territory.\n    this.camera.rotateZ(pose.roll + course.bank * .56 + nearCourse.bank * .14);'''
new = '''    // V10.3.5: dense city silhouettes amplify roll far more than open terrain.\n    // Keep the aircraft banking, but stabilize the city horizon so buildings do not appear to detach and orbit the camera.\n    const denseSkyline = snapshot.stage.biome === "city" || snapshot.stage.biome === "night";\n    this.camera.rotateZ(\n      pose.roll + course.bank * (denseSkyline ? .34 : .56) + nearCourse.bank * (denseSkyline ? .07 : .14),\n    );'''
assert old in s
s = s.replace(old, new, 1)
camera.write_text(s)

test = Path('tests/sky-arcade-reference.test.ts')
s = test.read_text()
needle = '''  world.dispose();\n});\n\ntest("missile trails and explosions keep a bounded mesh and buffer count under load", () => {'''
insert = '''  world.dispose();\n});\n\ntest("V10.3.5 far-field skyline follows the same course without steering swim or city over-bank", () => {\n  const city=SKY_DANCER_ARCADE_STAGES.find(stage=>stage.biome==="city");\n  assert.ok(city);\n  const scene=new THREE.Scene();\n  const world=new SkyDancerArcadeReferenceWorld(scene);\n  world.setStage(city);\n  const backdrop=scene.getObjectByName("arcade-product-backdrop") as THREE.Group;\n  assert.ok(backdrop instanceof THREE.Group);\n  assert.equal(backdrop.userData.arcadeBackdropCourseFollowV1035,true);\n  assert.equal(backdrop.userData.arcadeBackdropDepthV1035,430);\n  const length=city.durationSeconds*city.courseSpeed;\n  const xs:number[]=[],ys:number[]=[];\n  let maxChunkBank=0;\n  for(const progress of [.06,.12,.18,.25,.32,.4]){\n    world.update(length*progress,0,0);\n    xs.push(backdrop.position.x);ys.push(backdrop.position.y);\n    for(let i=0;i<8;i++){\n      const chunk=scene.getObjectByName(`arcade-course-chunk-${i}`);\n      assert.ok(chunk);maxChunkBank=Math.max(maxChunkBank,Math.abs(chunk.rotation.z));\n    }\n  }\n  const range=(values:number[])=>Math.max(...values)-Math.min(...values);\n  assert.ok(range(xs)>2||range(ys)>1.5,`far field must follow the authored route: x=${range(xs)} y=${range(ys)}`);\n  assert.ok(maxChunkBank<.3,`dense city chunks should not over-bank: ${maxChunkBank}`);\n  world.update(length*.25,1,.8);const steeredX=backdrop.position.x,steeredY=backdrop.position.y;\n  world.update(length*.25,-1,-.8);\n  assert.ok(Math.abs(backdrop.position.x-steeredX)<1e-9&&Math.abs(backdrop.position.y-steeredY)<1e-9,"far skyline must not swim with steering input");\n  world.dispose();\n});\n\ntest("missile trails and explosions keep a bounded mesh and buffer count under load", () => {'''
assert needle in s
s = s.replace(needle, insert, 1)
test.write_text(s)
