from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
models = "src/sky/arcade/SkyDancerArcadeModels.ts"
tests = "tests/sky-arcade-reference.test.ts"

replace_once(world,
'''    if(stage.biome==="orbit" || stage.biome==="citadel"){
      const planet=mesh(group,new THREE.SphereGeometry(190,48,28),new THREE.MeshStandardMaterial({color:0x267599,roughness:.93,metalness:.04}),-245,-225,-560);
      planet.name="arcade-orbital-planet";
      const atmosphere=mesh(group,new THREE.SphereGeometry(195,32,20),new THREE.MeshBasicMaterial({
        color:0x77bbff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,
      }),-245,-225,-560);
      atmosphere.name="arcade-planet-atmosphere";
      return group;
    }
''',
'''    if(stage.biome==="orbit" || stage.biome==="citadel"){
      const planet=mesh(group,new THREE.SphereGeometry(190,48,28),new THREE.MeshStandardMaterial({color:0x267599,roughness:.93,metalness:.04}),-245,-225,-560);
      planet.name="arcade-orbital-planet";
      const atmosphere=mesh(group,new THREE.SphereGeometry(195,32,20),new THREE.MeshBasicMaterial({
        color:0x77bbff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,
      }),-245,-225,-560);
      atmosphere.name="arcade-planet-atmosphere";
      if(stage.biome==="citadel"){
        // V8.9: the final stage now has a destination. A single distant fortress breaks the old
        // infinite-ring read and makes every streamed chunk feel like an approach to the sovereign.
        const fortress=new THREE.Group();fortress.name="arcade-citadel-final-fortress";
        fortress.position.set(0,-5,-430);
        const citadelDark=paint(0x17122f);
        const citadelArmor=paint(stage.palette.primary);
        const citadelLight=paint(stage.palette.secondary);
        const citadelGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
        const keep=mesh(fortress,new THREE.OctahedronGeometry(31,0),citadelArmor,0,24,0);keep.scale.set(1.18,2.65,.82);
        keep.rotation.z=Math.PI*.25;
        const core=mesh(fortress,new THREE.BoxGeometry(5,88,5),citadelGlow,0,25,5);core.name="arcade-citadel-final-core";
        mesh(fortress,new THREE.BoxGeometry(74,7,34),citadelDark,0,-18,4);
        for(const side of [-1,1]){
          const tower=mesh(fortress,new THREE.OctahedronGeometry(18,0),side<0?citadelLight:citadelArmor,side*46,5,-1);
          tower.scale.set(.78,2.15,.72);tower.rotation.z=side*.34;
          mesh(fortress,new THREE.BoxGeometry(2.2,52,4),citadelGlow,side*44,8,5);
        }
        group.add(fortress);
      }
      return group;
    }
''',
"citadel final fortress backdrop")

replace_once(world,
'''      case "citadel":{
        for(const side of [-1,1]){
          const prism=mesh(group,new THREE.OctahedronGeometry(13,0),primary,side*34,0,0);prism.scale.y=2.4;
          const core=mesh(group,new THREE.OctahedronGeometry(6,0),glow,side*31,2,0);core.scale.y=2.9;
          mesh(group,new THREE.BoxGeometry(35,1.2,5),secondary,side*20,-19,0);
        }
        mesh(group,new THREE.TorusGeometry(25,.48,6,6),glow,0,0,-42);
        break;
      }
''',
'''      case "citadel":{
        // V8.9: turn the repeated hex tunnel into an asymmetric open fortress assault.
        group.userData.arcadeCitadelV89FinalAssault=true;
        group.userData.arcadeCitadelV89GateSide=index%2===0?1:-1;
        const gateSide=index%2===0?1:-1;
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const bastionX=side*(39+(index%3)*3.5);
          const lift=tier*4.8;
          const prism=mesh(group,new THREE.OctahedronGeometry(10.5+(index%2)*1.5,0),side===gateSide?secondary:primary,bastionX,-1+lift,-5);
          prism.scale.set(.74,2.55,.9);prism.rotation.z=side*(.24+tier*.055);prism.rotation.y=side*.16;
          const core=mesh(group,new THREE.BoxGeometry(1.6,31,2.2),glow,bastionX-side*2.2,1+lift,-4);
          core.rotation.z=side*.08;
          const terrace=mesh(group,new THREE.BoxGeometry(24,1.5,34),dark,side*35,-18+lift*.25,2);
          terrace.rotation.z=side*(.045+tier*.012);
          mesh(group,new THREE.BoxGeometry(17,.26,29),glow,side*34,-16.9+lift*.25,2);
          const blade=mesh(group,new THREE.BoxGeometry(2.4,24,3),side===gateSide?primary:secondary,side*(27+tier*2.2),8+lift,-30+(index%2)*10);
          blade.rotation.z=side*(.28+tier*.035);
          if(side===gateSide){
            const crown=mesh(group,new THREE.OctahedronGeometry(5.8,0),secondary,side*20,17+lift,-34);
            crown.scale.set(.55,1.8,.65);crown.rotation.z=side*.42;
            mesh(group,new THREE.BoxGeometry(.8,18,1.5),glow,side*18.2,17+lift,-34);
          }
        }
        // Paired floor rails point at the distant keep without enclosing the player in another ring.
        for(const side of [-1,1]){
          const rail=mesh(group,new THREE.BoxGeometry(2.1,.36,58),side<0?primary:secondary,side*11,-19.2,0);
          rail.rotation.y=side*.035;
          mesh(group,new THREE.BoxGeometry(.34,.12,55),glow,side*9.7,-18.85,0);
        }
        break;
      }
''',
"citadel open assault chunks")

replace_once(world,
'''      } else if(stage.biome==="citadel"){
        const prism=mesh(group,new THREE.OctahedronGeometry(4.6+r(j+3)*3.6,0),j%2?secondary:primary,x,-1+r(j+13)*9,z);
        prism.scale.y=1.7+r(j+33)*1.1;
        prism.rotation.z=side*(.15+r(j+43)*.22);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.3,18,3),glow,x-side*3,2,z+2);
      }
''',
'''      } else if(stage.biome==="citadel"){
        // V8.9: keep near-pass pressure at the outer walls and vary the side rhythm instead of
        // building a matched pair of giant prisms around every view.
        const citadelX=side*(36+r(j+71)*13+(j%2)*4);
        const prism=mesh(group,new THREE.OctahedronGeometry(3.8+r(j+3)*2.9,0),j%2?secondary:primary,citadelX,-4+r(j+13)*10,z);
        prism.scale.set(.72,1.45+r(j+33)*.9,.78);
        prism.rotation.z=side*(.2+r(j+43)*.24);
        prism.rotation.y=side*(.08+r(j+53)*.12);
        if((j+index)%3===0){
          const spine=mesh(group,new THREE.BoxGeometry(.42,20+r(j+63)*10,2.4),glow,citadelX-side*3.4,1,z+2);
          spine.rotation.z=side*.08;
        }
      }
''',
"citadel near-pass asymmetry")

replace_once(models,
'''  } else if (hazard.kind === "arch") {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.28, 7, 24, Math.PI), primary);
    arch.rotation.z = Math.PI;
    group.add(arch);
''',
'''  } else if (hazard.kind === "arch") {
    if (stage.biome === "citadel") {
      // V8.9: Citadel arches are split sovereign blades, not another circular tunnel motif.
      for (const side of [-1, 1]) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.9, 0.6), primary);
        blade.position.set(side * 1.55, 0.1, 0);
        blade.rotation.z = side * 0.42;
        group.add(blade);
      }
      const crown = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 0.52), warning);
      crown.position.y = 2.15;
      group.add(crown);
    } else {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.28, 7, 24, Math.PI), primary);
      arch.rotation.z = Math.PI;
      group.add(arch);
    }
''',
"citadel split arch hazard")

insert='''test("V8.9 prism citadel reads as an open final assault rather than a repeated ring tunnel", () => {\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  const citadel = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "prism-citadel")!;\n  world.setStage(citadel);\n  world.update(citadel.courseSpeed * 8, 0, 0);\n  const fortress=scene.getObjectByName("arcade-citadel-final-fortress");\n  const core=scene.getObjectByName("arcade-citadel-final-core");\n  assert.ok(fortress instanceof THREE.Group && core instanceof THREE.Mesh,\n    "final stage must expose a single distant fortress destination and sovereign core");\n  const environment=scene.getObjectByName("arcade-course-environment")!;\n  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));\n  assert.equal(chunks.length,8);\n  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeCitadelV89FinalAssault===true),\n    "every citadel chunk must use the V8.9 open-assault layout");\n  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeCitadelV89GateSide)).size,2,\n    "citadel fortress pressure must alternate sides instead of repeating a symmetric tunnel");\n  let torusCount=0;\n  for(const chunk of chunks)chunk.traverse((object)=>{\n    if(object instanceof THREE.Mesh && object.geometry.type==="TorusGeometry")torusCount++;\n  });\n  assert.equal(torusCount,0,"streamed citadel architecture must not rebuild the old hex-ring tunnel");\n  world.dispose();\n});\n\n'''
anchor='''test("V8.4 continuous volcano ribbon and orbital helix expose the real course shape on screen", () => {\n'''
p=Path(tests);text=p.read_text()
if anchor not in text: raise SystemExit("missing V8.4 test anchor")
p.write_text(text.replace(anchor,insert+anchor,1))

print("Applied Prism Citadel V8.9 final assault reconstruction")
