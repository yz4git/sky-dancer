from pathlib import Path
import re

WORLD = Path("src/sky/arcade/SkyDancerArcadeReferenceWorld.ts")
TEST = Path("tests/sky-arcade-reference.test.ts")

world = WORLD.read_text()

old = 'interface RouteCue { group: THREE.Group; depth: number; phase: number; kind: "volcano" | "orbit" }'
new = 'interface RouteCue { group: THREE.Group; depth: number; phase: number; kind: "ice" | "volcano" | "orbit" }'
if old not in world:
    raise SystemExit("missing RouteCue kind contract")
world = world.replace(old, new, 1)

old = '''      cue.group.position.set(course.x-playerX*.35,course.y-playerY*.16,-cue.depth);\n      cue.group.rotation.y=course.yaw*.98;\n      cue.group.rotation.x=course.pitch*.78;\n      cue.group.rotation.z=cue.kind==="orbit"\n        ? cue.phase+(distance+cue.depth)*.0068\n        : course.bank*.08;'''
new = '''      const yScale=cue.kind==="ice"?1.18:1;\n      cue.group.position.set(course.x-playerX*.35,course.y*yScale-playerY*.16,-cue.depth);\n      cue.group.rotation.y=course.yaw*(cue.kind==="ice"?1.05:.98);\n      cue.group.rotation.x=course.pitch*(cue.kind==="ice"?1.6:.78);\n      cue.group.rotation.z=cue.kind==="orbit"\n        ? cue.phase+(distance+cue.depth)*.0068\n        : course.bank*(cue.kind==="ice"?.18:.08);'''
if old not in world:
    raise SystemExit("missing route cue update block")
world = world.replace(old, new, 1)

method = '''  private buildRouteCues(stage:SkyDancerArcadeStageDefinition):void {\n    if(!["ice","volcano","orbit"].includes(stage.biome))return;\n    const kind=stage.biome as RouteCue["kind"];\n    const primary=paint(stage.palette.primary);\n    const secondary=paint(stage.palette.secondary);\n    const glow=new THREE.MeshBasicMaterial({\n      color:stage.palette.accent,transparent:true,opacity:kind==="volcano"?.88:kind==="ice"?.76:.84,\n      blending:THREE.AdditiveBlending,depthWrite:false,\n    });\n    const dark=paint(stage.palette.ground);\n    const count=kind==="ice"?11:10;\n    for(let i=0;i<count;i++){\n      const cue=new THREE.Group();\n      const depth=kind==="ice"?22+i*31:26+i*43;\n      const phase=i*.64;\n      if(kind==="ice"){\n        cue.name="arcade-ice-wave-cue";\n        const radius=21.5+(i%3===0?-2.5:i%3===1?1.3:3.4);\n        const arch=mesh(cue,new THREE.TorusGeometry(radius,1.15,6,32,Math.PI),i%2?secondary:primary,0,-10.5,0);\n        arch.name="arcade-ice-wave-arch";\n        arch.rotation.z=(i%2?1:-1)*.055;\n        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.42,5,28,Math.PI*.78),glow,0,-10.2,.18);\n        inner.rotation.z=Math.PI*.11+(i%2?-.045:.045);\n        for(const side of [-1,1]){\n          const fang=mesh(cue,new THREE.ConeGeometry(1.35,7.5+(i%3)*1.2,5),i%2?primary:secondary,side*radius*.48,7+(i%2)*1.8,1);\n          fang.name="arcade-ice-pressure-fang";\n          fang.rotation.z=side*(.16+(i%3)*.025);\n        }\n        if(i%2===0){\n          const floorShard=mesh(cue,new THREE.ConeGeometry(1.15,6.6,5),glow,(i%4===0?1:-1)*7.5,-20.5,.5);\n          floorShard.rotation.z=Math.PI+(i%4===0?.08:-.08);\n        }\n      }else if(kind==="volcano"){\n        cue.name="arcade-volcano-route-cue";\n        // Short rim markers preserve depth rhythm while the continuous ribbon shows the true curve.\n        for(const side of [-1,1]){\n          const rim=mesh(cue,new THREE.BoxGeometry(2.8,.9,14),i%2?secondary:primary,side*12,-24.6,0);\n          rim.rotation.z=side*(i%2?.025:-.018);\n          mesh(cue,new THREE.BoxGeometry(.34,.18,13),glow,side*9.9,-23.9,0);\n        }\n        if(i%2===0){\n          const beacon=mesh(cue,new THREE.ConeGeometry(.42,7.5,6),glow,(i%4===0?1:-1)*16,-20,4);\n          beacon.rotation.z=(i%4===0?1:-1)*.16;\n        }\n      }else{\n        cue.name="arcade-orbit-helix-cue";\n        const arcA=mesh(cue,new THREE.TorusGeometry(29,.62,5,30,Math.PI*.78),glow,0,0,0);\n        arcA.name="arcade-orbit-helix-arc";\n        const arcB=mesh(cue,new THREE.TorusGeometry(29,.34,5,24,Math.PI*.58),secondary,0,0,.15);\n        arcB.rotation.z=Math.PI;\n        const node=mesh(cue,new THREE.OctahedronGeometry(2.2,0),glow,29,0,0);\n        node.name="arcade-orbit-helix-node";\n        mesh(cue,new THREE.BoxGeometry(7,.45,18),dark,-34,0,-1);\n      }\n      this.root.add(cue);\n      this.routeCues.push({group:cue,depth,phase,kind});\n    }\n  }\n\n'''
pattern = re.compile(r'  private buildRouteCues\(stage:SkyDancerArcadeStageDefinition\):void \{.*?\n  \}\n\n  private buildBackdrop', re.S)
match = pattern.search(world)
if not match:
    raise SystemExit("missing buildRouteCues method")
world = world[:match.start()] + method + '  private buildBackdrop' + world[match.end():]
WORLD.write_text(world)

test = TEST.read_text()
marker = '\n\ntest("V8.4 continuous volcano ribbon and orbital helix expose the real course shape on screen", () => {'
if marker not in test:
    raise SystemExit("missing V8.4 visual route regression marker")
insert = '''\n\ntest("V8.5 ice cavern visual ribs follow the real vertical course wave", () => {\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  const ice = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "ice-cavern")!;\n  world.setStage(ice);\n  world.update(ice.courseSpeed * 10, 0, 0);\n  const cues = scene.getObjectsByProperty("name", "arcade-ice-wave-cue");\n  assert.equal(cues.length, 11);\n  assert.equal(scene.getObjectsByProperty("name", "arcade-ice-wave-arch").length, 11);\n  const ys = cues.map((cue) => cue.position.y);\n  const pitches = cues.map((cue) => cue.rotation.x);\n  const xs = cues.map((cue) => cue.position.x);\n  assert.ok(Math.max(...ys)-Math.min(...ys)>12,\n    "ice tunnel ribs must visibly climb and dive through the cavern");\n  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.18,\n    "ice tunnel ribs must rotate with the course pitch, not form a flat straight tube");\n  assert.ok(Math.max(...xs)-Math.min(...xs)>25,\n    "ice tunnel keeps its horizontal slalom while adding the vertical wave");\n  world.dispose();\n});'''
test = test.replace(marker, insert + marker, 1)
TEST.write_text(test)

print("Applied V8.5 ice cavern vertical-wave presentation")
