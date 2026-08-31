from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p=Path(path); text=p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old,new,1))

world="src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
tests="tests/sky-arcade-reference.test.ts"

# Distant white flagship gives CLOUD FLEET an unmistakable armada silhouette.
replace_once(world,
'''    if(stage.biome==="night"){
''',
'''    if(stage.biome==="cloud"){
      // V9.2: the daylight fleet gets a recognizable carrier silhouette in the distance rather than
      // a horizon made only from abstract masts and plates.
      const flagship=new THREE.Group();flagship.name="arcade-cloud-fleet-flagship";flagship.position.set(-72,10,-360);
      const fleetWhite=paint(stage.palette.primary),fleetSteel=paint(stage.palette.secondary);
      const fleetGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const hull=mesh(flagship,new THREE.BoxGeometry(28,8,96),fleetWhite,0,0,0);hull.rotation.z=-.025;
      const bow=mesh(flagship,new THREE.ConeGeometry(14,30,6),fleetWhite,0,0,-60);bow.rotation.x=Math.PI/2;
      mesh(flagship,new THREE.BoxGeometry(54,2.2,44),fleetSteel,0,5,-4);
      mesh(flagship,new THREE.BoxGeometry(40,.45,37),fleetGlow,0,6.4,-5);
      const bridge=mesh(flagship,new THREE.BoxGeometry(9,18,13),fleetSteel,8,14,5);bridge.rotation.z=-.045;
      mesh(flagship,new THREE.BoxGeometry(2.2,12,14),fleetGlow,3.8,14,5);
      for(const side of [-1,1]){
        const fin=mesh(flagship,new THREE.BoxGeometry(3,13,20),fleetSteel,side*12,10,28);fin.rotation.z=side*.13;
        mesh(flagship,new THREE.BoxGeometry(4.5,2.4,11),fleetGlow,side*8,-2,48);
      }
      flagship.scale.setScalar(.92);group.add(flagship);
    }
    if(stage.biome==="night"){
''',
"cloud flagship backdrop")

# Split CLOUD from STORM and build actual warships that alternate near/far sides.
replace_once(world,
'''      case "cloud":case "storm":{
        for(const side of [-1,1]){
          const mast=mesh(group,new THREE.BoxGeometry(2.8,24,5),primary,side*32,-7,0);
          mast.rotation.z=side*.17;
          mesh(group,new THREE.BoxGeometry(17,.9,21),secondary,side*35,-12,0);
          mesh(group,new THREE.BoxGeometry(13,.1,.25),glow,side*35,-11.45,-7);
        }
        if(stage.biome==="storm"){
          const lightning=new THREE.Group();
          const stormSide=index%2===0?1:-1;
          for(let j=0;j<6;j++){
            const bolt=mesh(lightning,new THREE.CylinderGeometry(.11,.2,8.5+j*.7,5),glow,stormSide*(24+(j%3)*7),24-j*6,-39+j*15);
            bolt.rotation.z=stormSide*(j%2?-.34:.31);
          }
          group.add(lightning);
        }
        break;
      }
''',
'''      case "cloud":{
        // V9.2: broad hulls, tapered bows and bridge towers replace the old T-shaped abstract plates.
        group.userData.arcadeCloudV92SkyArmada=true;
        const leadSide=index%2===0?1:-1;
        group.userData.arcadeCloudV92LeadSide=leadSide;
        for(const side of [-1,1]){
          const lead=side===leadSide;
          const shipX=side*(lead?29:49);
          const shipY=(lead?-7:-13)+(((index+(side>0?1:0))%3)-1)*4.4;
          const shipZ=lead?-5:12;
          const hull=mesh(group,new THREE.BoxGeometry(lead?15:12,lead?5.4:4.4,lead?43:34),primary,shipX,shipY,shipZ);
          hull.rotation.z=side*(lead?.025:-.018);hull.rotation.y=side*(lead?.045:-.025);
          const bow=mesh(group,new THREE.ConeGeometry(lead?7.4:6,lead?15:12,6),primary,shipX,shipY,shipZ-28);
          bow.rotation.x=Math.PI/2;bow.rotation.z=side*.03;
          const flightDeck=mesh(group,new THREE.BoxGeometry(lead?25:19,.85,lead?27:22),secondary,shipX,shipY+3.4,shipZ-1);
          flightDeck.rotation.z=side*(lead?.018:-.012);
          mesh(group,new THREE.BoxGeometry(lead?19:14,.22,lead?23:18),glow,shipX-side*1.2,shipY+4,shipZ-2);
          const bridge=mesh(group,new THREE.BoxGeometry(4.6,lead?9:7,6.5),secondary,shipX+side*4.2,shipY+7,shipZ+4);
          bridge.rotation.z=side*.07;
          mesh(group,new THREE.BoxGeometry(.7,lead?7:5.2,6.8),glow,shipX+side*2.7,shipY+7,shipZ+4);
          for(const engineSide of [-1,1])mesh(group,new THREE.BoxGeometry(2.7,1.8,5.5),glow,shipX+engineSide*(lead?4.3:3.3),shipY-1.2,shipZ+22);
        }
        break;
      }
      case "storm":{
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
"cloud armada chunks")

# CLOUD close passes become small escort craft; STORM keeps its old machinery language.
replace_once(world,
'''      } else if(stage.biome==="cloud" || stage.biome==="storm"){
        const y=-5+r(j+6)*15;
        const deck=mesh(group,new THREE.BoxGeometry(8+r(j+16)*6,1.1,13+r(j+26)*9),j%2?secondary:primary,x,y,z);
        deck.rotation.z=side*(r(j+32)-.5)*.09;
        mesh(group,new THREE.BoxGeometry(.22,.18,11+r(j+52)*7),glow,x-side*1.7,y+.72,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(1.1,11+r(j+62)*9,1.1),dark,x+side*2.2,y+6,z+2);
''',
'''      } else if(stage.biome==="cloud"){
        // V9.2: escort silhouettes create close naval fly-bys without blocking the center corridor.
        const escortX=side*(39+r(j+71)*12+(j%2)*3);
        const y=-7+r(j+6)*14;
        const length=14+r(j+26)*10;
        const escort=mesh(group,new THREE.BoxGeometry(5.5+r(j+16)*3,2.2,length),j%2?secondary:primary,escortX,y,z);
        escort.rotation.z=side*(r(j+32)-.5)*.08;escort.rotation.y=side*(r(j+42)-.5)*.08;
        const nose=mesh(group,new THREE.ConeGeometry(3.1,length*.28,5),j%2?secondary:primary,escortX,y,z-length*.63);
        nose.rotation.x=Math.PI/2;
        mesh(group,new THREE.BoxGeometry(8+r(j+35)*4,.35,length*.48),secondary,escortX,y+1.7,z-1);
        if((j+index)%2===0){
          const tower=mesh(group,new THREE.BoxGeometry(1.8,4+r(j+55)*4,3),dark,escortX+side*2,y+4,z+1);
          tower.rotation.z=side*.08;
          mesh(group,new THREE.BoxGeometry(.3,3.5,3.2),glow,escortX+side*.9,y+4,z+1);
        }
      } else if(stage.biome==="storm"){
        const y=-5+r(j+6)*15;
        const deck=mesh(group,new THREE.BoxGeometry(8+r(j+16)*6,1.1,13+r(j+26)*9),j%2?secondary:primary,x,y,z);
        deck.rotation.z=side*(r(j+32)-.5)*.09;
        mesh(group,new THREE.BoxGeometry(.22,.18,11+r(j+52)*7),glow,x-side*1.7,y+.72,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(1.1,11+r(j+62)*9,1.1),dark,x+side*2.2,y+6,z+2);
''',
"cloud escort near passes")

# Add regression contract before Night Metro's test.
p=Path(tests);text=p.read_text()
anchor='''test("V9.1 night metro reads as a neon express pursuit rather than a recolored city river", () => {\n'''
insert='''test("V9.2 cloud fleet reads as a sky armada instead of floating T-shaped plates", () => {\n  const scene=new THREE.Scene();\n  const world=new SkyDancerArcadeReferenceWorld(scene);\n  const fleet=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="cloud-fleet")!;\n  world.setStage(fleet);\n  world.update(fleet.courseSpeed*5,0,0);\n  assert.ok(scene.getObjectByName("arcade-cloud-fleet-flagship") instanceof THREE.Group,\n    "cloud fleet must expose a distant carrier silhouette");\n  const environment=scene.getObjectByName("arcade-course-environment")!;\n  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));\n  assert.equal(chunks.length,8);\n  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeCloudV92SkyArmada===true),\n    "every cloud chunk must author broad warship silhouettes");\n  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeCloudV92LeadSide)).size,2,\n    "hero warships must alternate sides to create fleet weave rather than a symmetric corridor");\n  world.dispose();\n});\n\n'''
if anchor not in text: raise SystemExit("missing Night Metro test anchor")
p.write_text(text.replace(anchor,insert+anchor,1))
print("Applied CLOUD FLEET V9.2 sky armada reconstruction")
