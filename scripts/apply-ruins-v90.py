from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
tests = "tests/sky-arcade-reference.test.ts"

replace_once(world,
'''    if(stage.biome==="city" || stage.biome==="night"){
      const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),paint(0x526b7d),144);
      towers.name="arcade-distant-metropolis";
      for(let i=0;i<144;i++){
        const x=(random(i+19)-.5)*760;
        const hero=i%13===0; const h=14+random(i+117)*55+(hero?35:0);
        this.matrixObject.position.set(x,-39+h/2,-315-random(i+613)*250);
        this.matrixObject.scale.set((hero?2.7:4)+random(i+13)*8,h,(hero?3.4:5)+random(i+201)*9);
        this.matrixObject.rotation.set(0,0,0);this.matrixObject.updateMatrix();
        towers.setMatrixAt(i,this.matrixObject.matrix);
        towers.setColorAt(i,new THREE.Color(0x6d7b8c).lerp(palette.fog,random(i)*.4));
      }
      towers.computeBoundingSphere();group.add(towers);
    }
    return group;
''',
'''    if(stage.biome==="city" || stage.biome==="night"){
      const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),paint(0x526b7d),144);
      towers.name="arcade-distant-metropolis";
      for(let i=0;i<144;i++){
        const x=(random(i+19)-.5)*760;
        const hero=i%13===0; const h=14+random(i+117)*55+(hero?35:0);
        this.matrixObject.position.set(x,-39+h/2,-315-random(i+613)*250);
        this.matrixObject.scale.set((hero?2.7:4)+random(i+13)*8,h,(hero?3.4:5)+random(i+201)*9);
        this.matrixObject.rotation.set(0,0,0);this.matrixObject.updateMatrix();
        towers.setMatrixAt(i,this.matrixObject.matrix);
        towers.setColorAt(i,new THREE.Color(0x6d7b8c).lerp(palette.fog,random(i)*.4));
      }
      towers.computeBoundingSphere();group.add(towers);
    }
    if(stage.biome==="ruins"){
      // V9.0: a single sky temple gives the labyrinth a destination and a recognizable ancient silhouette.
      const temple=new THREE.Group();temple.name="arcade-ruins-sky-temple";temple.position.set(0,18,-390);
      const stone=paint(stage.palette.primary),gold=paint(stage.palette.secondary);
      const templeGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const island=mesh(temple,new THREE.ConeGeometry(43,40,9),paint(stage.palette.ground),0,-29,0);island.rotation.x=Math.PI;
      mesh(temple,new THREE.CylinderGeometry(42,39,4.5,9),stone,0,-7,0);
      for(const side of [-1,1]){
        const pylon=mesh(temple,new THREE.BoxGeometry(8,52,8),gold,side*24,18,0);pylon.rotation.z=side*.08;
        mesh(temple,new THREE.BoxGeometry(3,43,2.2),templeGlow,side*18,18,5);
      }
      const lintel=mesh(temple,new THREE.BoxGeometry(55,7,9),stone,0,42,0);lintel.rotation.z=-.045;
      const relic=mesh(temple,new THREE.OctahedronGeometry(9,0),templeGlow,0,22,5);relic.scale.set(.7,1.7,.7);relic.rotation.z=.78;
      group.add(temple);
    }
    return group;
''',
"ruins sky temple backdrop")

replace_once(world,
'''      case "ruins":{
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const lift=tier*8.5;
          const island=mesh(group,new THREE.ConeGeometry(18,22,9),dark,side*31,-22+lift,0);island.rotation.x=Math.PI;
          island.rotation.z=side*tier*.035;
          mesh(group,new THREE.CylinderGeometry(18,16,1.1,9),primary,side*31,-10.5+lift,0);
          for(let i=0;i<4;i++){
            const broken=i===((index+(side>0?2:0))%4);
            const column=mesh(group,new THREE.CylinderGeometry(1.1,1.5,broken?9:17,10),secondary,side*31+(i%2?7:-7),(broken?-6:-2)+lift,-7+Math.floor(i/2)*14);
            if(broken) column.rotation.z=side*.18;
          }
          mesh(group,new THREE.BoxGeometry(20,1.7,21),primary,side*31,7.3+lift,0);
          mesh(group,new THREE.BoxGeometry(17,.2,.22),glow,side*31,8.3+lift,-9);
          const relic=mesh(group,new THREE.TorusGeometry(6.2,.34,6,24,Math.PI*1.35),glow,side*31,15+lift,2);
          relic.rotation.z=side*(.45+tier*.12);
        }
        if(index%2===0){
          const shard=mesh(group,new THREE.OctahedronGeometry(4.8,0),secondary,0,13+(index%4)*3,15);
          shard.scale.y=2.1;shard.rotation.z=.38;
        }
        break;
      }
''',
'''      case "ruins":{
        // V9.0: fewer poles, more readable ruins. Alternating hero sides create a broken causeway
        // that feels like a labyrinth while leaving the center flight lane open.
        group.userData.arcadeRuinsV90SkyLabyrinth=true;
        const heroSide=index%2===0?1:-1;
        group.userData.arcadeRuinsV90HeroSide=heroSide;
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const hero=side===heroSide;
          const lift=tier*9.5+(hero?3:-3);
          const x=side*(hero?29:43);
          const radius=hero?19:14.5;
          const island=mesh(group,new THREE.ConeGeometry(radius,hero?24:18,9),dark,x,-23+lift,hero?-5:9);island.rotation.x=Math.PI;
          island.rotation.z=side*(tier*.045+(hero?.025:-.018));
          mesh(group,new THREE.CylinderGeometry(radius,radius-2.2,1.25,9),primary,x,-10.5+lift,hero?-5:9);
          // Only two architectural supports per island; one is always visibly broken or leaning.
          for(let i=0;i<2;i++){
            const h=hero?(i===0?17:10):(i===0?12:7.5);
            const column=mesh(group,new THREE.BoxGeometry(2.7,h,2.7),i===0?secondary:primary,x+side*(i===0?-6:6),-1+h*.5+lift,hero?-10+i*13:4+i*10);
            column.rotation.z=side*(i===1?.2:.035);
            if(i===1)column.rotation.x=.08*(tier||1);
          }
          // Broken bridge/causeway projects toward the route but never spans the entire screen.
          const bridgeX=side*(hero?18.5:31);
          const bridge=mesh(group,new THREE.BoxGeometry(hero?23:15,1.25,6.5),hero?secondary:primary,bridgeX,5.8+lift,hero?1:5);
          bridge.rotation.z=side*(hero?-.12:.08);bridge.rotation.y=side*(hero?.07:-.04);
          mesh(group,new THREE.BoxGeometry(hero?18:10,.2,.36),glow,bridgeX-side*1.5,6.55+lift,hero?-1:3);
          const lintel=mesh(group,new THREE.BoxGeometry(hero?17:12,2.3,3.2),secondary,x,14+lift,hero?-2:8);
          lintel.rotation.z=side*(hero?.14:-.09);
          if(hero){
            const relic=mesh(group,new THREE.OctahedronGeometry(4.4,0),glow,x-side*3,20+lift,-2);
            relic.scale.set(.62,1.55,.62);relic.rotation.z=side*.72;
          }
        }
        if(index%3===1){
          // One free-floating fragment occasionally crosses the composition, not one in every chunk.
          const shard=mesh(group,new THREE.OctahedronGeometry(4.1,0),secondary,-heroSide*8,11+(index%3)*4,18);
          shard.scale.set(.65,1.75,.6);shard.rotation.z=heroSide*.48;
        }
        break;
      }
''',
"ruins sky labyrinth chunks")

replace_once(world,
'''      } else if(stage.biome==="ruins"){
        const h=19+r(j+5)*22;
        mesh(group,new THREE.CylinderGeometry(1.3,1.8,h,8),j%2?secondary:primary,x,-9+h/2,z);
        mesh(group,new THREE.BoxGeometry(8+r(j+15)*5,1.1,7+r(j+25)*4),dark,x,-10,z);
        if(j%2===0) mesh(group,new THREE.TorusGeometry(4.2,.28,5,18,Math.PI),glow,x,5+r(j+35)*7,z+2);
''',
'''      } else if(stage.biome==="ruins"){
        // V9.0: near passes are broken walls and hanging slabs, not a forest of full-height columns.
        const ruinsX=side*(36+r(j+71)*13+(j%2)*3);
        const y=-9+r(j+6)*13;
        const slab=mesh(group,new THREE.BoxGeometry(8+r(j+15)*7,1.2,8+r(j+25)*6),j%2?dark:primary,ruinsX,y,z);
        slab.rotation.z=side*(r(j+32)-.5)*.18;slab.rotation.y=side*(r(j+42)-.5)*.12;
        if((j+index)%2===0){
          const h=10+r(j+5)*13;
          const stump=mesh(group,new THREE.BoxGeometry(2.4,h,2.4),secondary,ruinsX-side*3.3,y+h*.5,z+2);
          stump.rotation.z=side*(.08+r(j+52)*.16);
        }
        if((j+index)%3===0){
          const rune=mesh(group,new THREE.OctahedronGeometry(2.3+r(j+35)*1.4,0),glow,ruinsX+side*3,y+6,z-2);
          rune.scale.set(.62,1.35,.62);rune.rotation.z=side*.7;
        }
''',
"ruins near-pass walls")

insert='''test("V9.0 floating ruins reads as a broken sky labyrinth instead of a column forest", () => {\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  const ruins = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "floating-ruins")!;\n  world.setStage(ruins);\n  world.update(ruins.courseSpeed * 7, 0, 0);\n  const temple=scene.getObjectByName("arcade-ruins-sky-temple");\n  assert.ok(temple instanceof THREE.Group,\n    "floating ruins must expose one distant sky-temple destination");\n  const environment=scene.getObjectByName("arcade-course-environment")!;\n  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));\n  assert.equal(chunks.length,8);\n  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeRuinsV90SkyLabyrinth===true),\n    "every ruins chunk must use the V9.0 broken-labyrinth layout");\n  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeRuinsV90HeroSide)).size,2,\n    "hero causeways must alternate sides to avoid a repeated paired-column corridor");\n  world.dispose();\n});\n\n'''
anchor='''test("V8.9 prism citadel reads as an open final assault rather than a repeated ring tunnel", () => {\n'''
p=Path(tests);text=p.read_text()
if anchor not in text: raise SystemExit("missing V8.9 test anchor")
p.write_text(text.replace(anchor,insert+anchor,1))

print("Applied Floating Ruins V9.0 sky labyrinth reconstruction")
