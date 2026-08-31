from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p=Path(path); text=p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old,new,1))

world="src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
tests="tests/sky-arcade-reference.test.ts"

# Give STORM CARRIER one unmistakable dreadnought destination in the thunderhead.
replace_once(world,
'''    if(stage.biome==="desert"){
''',
'''    if(stage.biome==="storm"){
      // V9.4: the stage name finally appears in the silhouette — a massive armored carrier sits inside the storm.
      const dreadnought=new THREE.Group();dreadnought.name="arcade-storm-dreadnought";dreadnought.position.set(66,18,-345);
      const armor=paint(stage.palette.primary),stormSteel=paint(stage.palette.secondary),stormDark=paint(stage.palette.ground);
      const stormGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.88,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const hull=mesh(dreadnought,new THREE.BoxGeometry(34,12,112),stormDark,0,0,0);hull.rotation.z=.025;
      const bow=mesh(dreadnought,new THREE.ConeGeometry(17,35,6),armor,0,-1,-72);bow.rotation.x=Math.PI/2;
      const deck=mesh(dreadnought,new THREE.BoxGeometry(68,3,58),armor,-4,8,-2);deck.rotation.z=-.018;
      mesh(dreadnought,new THREE.BoxGeometry(51,.55,49),stormGlow,-6,10,-4);
      const island=mesh(dreadnought,new THREE.BoxGeometry(13,28,17),stormSteel,17,23,8);island.rotation.z=.055;
      mesh(dreadnought,new THREE.BoxGeometry(2.1,23,18),stormGlow,10.5,22,8);
      for(const side of [-1,1]){
        const fin=mesh(dreadnought,new THREE.BoxGeometry(4,20,25),stormSteel,side*17,15,28);fin.rotation.z=side*.16;
        mesh(dreadnought,new THREE.BoxGeometry(7,3.2,15),stormGlow,side*11,-4,53);
      }
      const lightningRod=mesh(dreadnought,new THREE.CylinderGeometry(.65,.9,35,6),stormSteel,17,52,8);
      lightningRod.rotation.z=.04;mesh(dreadnought,new THREE.SphereGeometry(2.4,8,6),stormGlow,17,70,8);
      dreadnought.scale.setScalar(.88);group.add(dreadnought);
    }
    if(stage.biome==="desert"){
''',
"storm dreadnought backdrop")

# Replace the old paired T-bars with asymmetric armored carrier sections and lightning conductors.
replace_once(world,
'''      case "storm":{
        for(const side of [-1,1]){
          const mast=mesh(group,new THREE.BoxGeometry(2.8,24,5),primary,side*32,-7,0);
          mast.rotation.z=side*.17;
          mesh(group,new THREE.BoxGeometry(17,.9,21),secondary,side*35,-12,0);
          mesh(group,new THREE.BoxGeometry(13,.1,.25),glow,side*35,-11.45,-7);
        }
        const lightning=new THREE.Group();
        const stormSide=index%2===0?1:-1;
        for(let j=0;j<6;j++){
          const bolt=mesh(lightning,new THREE.CylinderGeometry(.11,.2,8.5+j*.7,5),glow,stormSide*(24+(j%3)*7),24-j*6,-39+j*15);
          bolt.rotation.z=stormSide*(j%2?-.34:.31);
        }
        group.add(lightning);
        break;
      }
''',
'''      case "storm":{
        // V9.4: alternating dreadnought sections create a violent fly-by while leaving the center lane readable.
        group.userData.arcadeStormV94ThunderheadDreadnought=true;
        const stormSide=index%2===0?1:-1;
        group.userData.arcadeStormV94PressureSide=stormSide;
        const tier=(index%3)-1;
        for(const side of [-1,1]){
          const pressure=side===stormSide;
          const shipX=side*(pressure?29:48);
          const shipY=(pressure?-5:-13)+tier*(pressure?4.8:2.4);
          const shipZ=pressure?-5:13;
          const hull=mesh(group,new THREE.BoxGeometry(pressure?18:12,pressure?7:4.5,pressure?50:31),pressure?dark:primary,shipX,shipY,shipZ);
          hull.rotation.z=side*(pressure?.045:-.018);hull.rotation.y=side*(pressure?.035:-.02);
          const bow=mesh(group,new THREE.ConeGeometry(pressure?8.8:5.8,pressure?17:11,6),pressure?primary:secondary,shipX,shipY,shipZ-(pressure?33:21));
          bow.rotation.x=Math.PI/2;bow.rotation.z=side*.035;
          const deck=mesh(group,new THREE.BoxGeometry(pressure?31:18,1.15,pressure?31:20),secondary,shipX,shipY+(pressure?4.8:3),shipZ-1);
          deck.rotation.z=side*(pressure?.025:-.012);
          mesh(group,new THREE.BoxGeometry(pressure?23:13,.28,pressure?26:16),glow,shipX-side*1.5,shipY+(pressure?5.6:3.7),shipZ-2);
          if(pressure){
            const island=mesh(group,new THREE.BoxGeometry(5.5,13,7.5),primary,shipX+side*5.4,shipY+11,shipZ+3);island.rotation.z=side*.085;
            const rod=mesh(group,new THREE.CylinderGeometry(.35,.5,18,6),secondary,shipX+side*5.4,shipY+26,shipZ+3);rod.rotation.z=side*.04;
            mesh(group,new THREE.SphereGeometry(1.25,7,5),glow,shipX+side*5.9,shipY+35,shipZ+3);
            for(const engineSide of [-1,1])mesh(group,new THREE.BoxGeometry(3.2,2.2,6.5),glow,shipX+engineSide*5.2,shipY-2,shipZ+25);
          }
        }
        const lightning=new THREE.Group();
        for(let j=0;j<5;j++){
          const boltX=stormSide*(31+(j%2)*8);
          const bolt=mesh(lightning,new THREE.CylinderGeometry(.12,.23,9+j*.8,5),glow,boltX,29-j*8,-42+j*18);
          bolt.rotation.z=stormSide*(j%2?-.31:.27);
        }
        group.add(lightning);
        break;
      }
''',
"storm chunk dreadnought")

# Turn close storm passes into armored conductor pods rather than floating decks with sticks.
replace_once(world,
'''      } else if(stage.biome==="storm"){
        const y=-5+r(j+6)*15;
        const deck=mesh(group,new THREE.BoxGeometry(8+r(j+16)*6,1.1,13+r(j+26)*9),j%2?secondary:primary,x,y,z);
        deck.rotation.z=side*(r(j+32)-.5)*.09;
        mesh(group,new THREE.BoxGeometry(.22,.18,11+r(j+52)*7),glow,x-side*1.7,y+.72,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(1.1,11+r(j+62)*9,1.1),dark,x+side*2.2,y+6,z+2);
''',
'''      } else if(stage.biome==="storm"){
        // V9.4: armored outrigger pods and lightning conductors replace the old abstract T-shapes.
        const stormX=side*(38+r(j+71)*12+(j%2)*3);
        const y=-7+r(j+6)*14;
        const length=15+r(j+26)*12;
        const pod=mesh(group,new THREE.BoxGeometry(6+r(j+16)*4,4.2,length),j%2?dark:primary,stormX,y,z);
        pod.rotation.z=side*(r(j+32)-.5)*.1;pod.rotation.y=side*(r(j+42)-.5)*.08;
        const nose=mesh(group,new THREE.ConeGeometry(3.4,length*.24,5),secondary,stormX,y,z-length*.62);nose.rotation.x=Math.PI/2;
        mesh(group,new THREE.BoxGeometry(4+r(j+35)*3,.3,length*.55),glow,stormX-side*1.5,y+2.4,z-1);
        if((j+index)%2===0){
          const rod=mesh(group,new THREE.CylinderGeometry(.28,.42,12+r(j+55)*9,6),secondary,stormX+side*2.5,y+10,z+2);
          rod.rotation.z=side*.08;
          mesh(group,new THREE.SphereGeometry(.9+r(j+65)*.5,6,5),glow,stormX+side*3.2,y+18,z+2);
        }
''',
"storm near-pass pods")

# Regression contract: carrier destination + all streamed chunks use alternating pressure sides.
p=Path(tests);text=p.read_text()
anchor='''test("V9.3 desert fortress reads as a sandwall assault instead of a recolored canyon", () => {\n'''
insert='''test("V9.4 storm carrier reads as a thunderhead dreadnought instead of floating T-bars", () => {\n  const scene=new THREE.Scene();\n  const world=new SkyDancerArcadeReferenceWorld(scene);\n  const storm=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="storm-carrier")!;\n  world.setStage(storm);\n  world.update(storm.courseSpeed*5,0,0);\n  assert.ok(scene.getObjectByName("arcade-storm-dreadnought") instanceof THREE.Group,\n    "storm carrier must expose one massive dreadnought silhouette in the thunderhead");\n  const environment=scene.getObjectByName("arcade-course-environment")!;\n  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));\n  assert.equal(chunks.length,8);\n  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeStormV94ThunderheadDreadnought===true),\n    "every storm chunk must use armored carrier-section geometry");\n  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeStormV94PressureSide)).size,2,\n    "storm carrier pressure must alternate sides rather than repeat paired T-bars");\n  world.dispose();\n});\n\n'''
if anchor not in text: raise SystemExit("missing V9.3 desert test anchor")
p.write_text(text.replace(anchor,insert+anchor,1))
print("Applied STORM CARRIER V9.4 thunderhead dreadnought reconstruction")
