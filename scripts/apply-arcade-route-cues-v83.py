from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world_path = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"

replace_once(
    world_path,
    "interface CourseChunk { group: THREE.Group; index: number }\n",
    "interface CourseChunk { group: THREE.Group; index: number }\ninterface RouteCue { group: THREE.Group; depth: number; phase: number; kind: \"volcano\" | \"orbit\" }\n",
    "route cue interface",
)

replace_once(
    world_path,
    "  private readonly chunks:CourseChunk[]=[];\n  private stage:SkyDancerArcadeStageDefinition|null=null;\n",
    "  private readonly chunks:CourseChunk[]=[];\n  private readonly routeCues:RouteCue[]=[];\n  private stage:SkyDancerArcadeStageDefinition|null=null;\n",
    "route cue field",
)

replace_once(
    world_path,
    "    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;\n",
    "    disposeTree(this.root);this.water?.dispose();this.chunks.length=0;this.routeCues.length=0;\n",
    "route cue reset",
)

replace_once(
    world_path,
    "      this.root.add(group);this.chunks.push({group,index:i});\n    }\n    this.update(0,0,0);\n",
    "      this.root.add(group);this.chunks.push({group,index:i});\n    }\n    this.buildRouteCues(stage);\n    this.update(0,0,0);\n",
    "route cue build call",
)

replace_once(
    world_path,
    "    }\n    if(this.water)this.water.uniforms.time.value=distance/this.stage.courseSpeed;\n  }\n\n  private buildBackdrop(stage:SkyDancerArcadeStageDefinition):THREE.Group {\n",
    "    }\n    for(const cue of this.routeCues){\n      const course=arcadeCourseRelativePose(this.stage,distance,cue.depth);\n      cue.group.position.set(course.x-playerX*.35,course.y-playerY*.16,-cue.depth);\n      cue.group.rotation.y=course.yaw*.98;\n      cue.group.rotation.x=course.pitch*.78;\n      cue.group.rotation.z=cue.kind===\"orbit\"\n        ? cue.phase+(distance+cue.depth)*.0068\n        : course.bank*.08;\n    }\n    if(this.water)this.water.uniforms.time.value=distance/this.stage.courseSpeed;\n  }\n\n  private buildRouteCues(stage:SkyDancerArcadeStageDefinition):void {\n    if(stage.biome!==\"volcano\" && stage.biome!==\"orbit\")return;\n    const kind=stage.biome;\n    const primary=paint(stage.palette.primary);\n    const secondary=paint(stage.palette.secondary);\n    const glow=new THREE.MeshBasicMaterial({\n      color:stage.palette.accent,transparent:true,opacity:kind===\"volcano\"?.88:.84,\n      blending:THREE.AdditiveBlending,depthWrite:false,\n    });\n    const dark=paint(stage.palette.ground);\n    for(let i=0;i<10;i++){\n      const cue=new THREE.Group();\n      const depth=26+i*43;\n      const phase=i*.64;\n      if(kind===\"volcano\"){\n        cue.name=\"arcade-volcano-route-cue\";\n        const river=mesh(cue,new THREE.BoxGeometry(20,.26,46),glow,0,-24.3,0);\n        river.name=\"arcade-volcano-bent-lava-ribbon\";\n        for(const side of [-1,1]){\n          const rim=mesh(cue,new THREE.BoxGeometry(3.2,1.1,45),i%2?secondary:primary,side*12,-24.6,0);\n          rim.rotation.z=side*(i%2?.025:-.018);\n          mesh(cue,new THREE.BoxGeometry(.34,.18,43),glow,side*9.9,-23.9,0);\n        }\n        if(i%2===0){\n          const beacon=mesh(cue,new THREE.ConeGeometry(.42,7.5,6),glow,(i%4===0?1:-1)*16,-20,4);\n          beacon.rotation.z=(i%4===0?1:-1)*.16;\n        }\n      }else{\n        cue.name=\"arcade-orbit-helix-cue\";\n        const arcA=mesh(cue,new THREE.TorusGeometry(29,.62,5,30,Math.PI*.78),glow,0,0,0);\n        arcA.name=\"arcade-orbit-helix-arc\";\n        const arcB=mesh(cue,new THREE.TorusGeometry(29,.34,5,24,Math.PI*.58),secondary,0,0,.15);\n        arcB.rotation.z=Math.PI;\n        const node=mesh(cue,new THREE.OctahedronGeometry(2.2,0),glow,29,0,0);\n        node.name=\"arcade-orbit-helix-node\";\n        mesh(cue,new THREE.BoxGeometry(7,.45,18),dark,-34,0,-1);\n      }\n      this.root.add(cue);\n      this.routeCues.push({group:cue,depth,phase,kind});\n    }\n  }\n\n  private buildBackdrop(stage:SkyDancerArcadeStageDefinition):THREE.Group {\n",
    "route cue update and builder",
)

replace_once(
    world_path,
    '''        if(stage.biome==="volcano"){\n          const lava=mesh(group,new THREE.PlaneGeometry(23,114,8,8),glow,0,-25);\n          lava.rotation.x=-Math.PI/2;\n          for(let i=0;i<5;i++){\n            const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);\n            vent.rotation.z=.15;\n          }\n        }\n''',
    '''        if(stage.biome==="volcano"){\n          // V8.3: the continuous lava corridor is route-following, not one straight plane per rigid chunk.\n          for(let i=0;i<5;i++){\n            const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);\n            vent.rotation.z=.15;\n          }\n        }\n''',
    "remove straight volcano lava plane",
)

replace_once(
    world_path,
    '''      case "orbit":{\n        const ring=mesh(group,new THREE.TorusGeometry(33,1.9,8,48),primary,0,0,0);ring.rotation.z=index*.3;\n        const light=mesh(group,new THREE.TorusGeometry(31,.16,5,48),glow,0,0,.2);\n        light.name="arcade-orbital-guide";\n        for(const side of [-1,1]){\n          mesh(group,new THREE.BoxGeometry(4,24,10),secondary,side*36,0,-5);\n          mesh(group,new THREE.BoxGeometry(18,.2,32),dark,side*49,5,-5);\n          for(let j=0;j<5;j++)mesh(group,new THREE.BoxGeometry(.12,.25,31),glow,side*(42+j*3),5.2,-5);\n        }\n        break;\n      }\n''',
    '''      case "orbit":{\n        // V8.3: avoid a stack of full concentric rings, which flattened the real corkscrew into a straight tunnel.\n        const frame=mesh(group,new THREE.TorusGeometry(33,1.35,7,42,Math.PI*1.12),primary,0,0,0);\n        frame.name="arcade-orbital-open-frame";frame.rotation.z=index*.71;\n        for(const side of [-1,1]){\n          mesh(group,new THREE.BoxGeometry(4,24,10),secondary,side*36,0,-5);\n          mesh(group,new THREE.BoxGeometry(18,.2,32),dark,side*49,5,-5);\n          for(let j=0;j<5;j++)mesh(group,new THREE.BoxGeometry(.12,.25,31),glow,side*(42+j*3),5.2,-5);\n        }\n        break;\n      }\n''',
    "open orbital chunk frame",
)

test_path = Path("tests/sky-arcade-reference.test.ts")
test_text = test_path.read_text()
append = r'''

test("V8.3 volcano ribbon and orbital helix expose the real course shape on screen", () => {
  const scene = new THREE.Scene();
  const world = new SkyDancerArcadeReferenceWorld(scene);
  const volcano = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "volcano-core")!;
  world.setStage(volcano);
  world.update(640, 0, 0);
  const lava = scene.getObjectsByProperty("name", "arcade-volcano-route-cue");
  assert.equal(lava.length, 10);
  assert.ok(Math.max(...lava.map((cue) => cue.position.x)) - Math.min(...lava.map((cue) => cue.position.x)) > 12,
    "volcano route ribbon should visibly sweep sideways");
  assert.equal(scene.getObjectsByProperty("name", "arcade-volcano-bent-lava-ribbon").length, 10);

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
'''
if "V8.3 volcano ribbon and orbital helix" in test_text:
    raise SystemExit("V8.3 test already present")
test_path.write_text(test_text + append)

Path("scripts/apply-arcade-route-cues-v83.py").unlink(missing_ok=True)
Path(".github/workflows/arcade-route-cues-v83-once.yml").unlink(missing_ok=True)
