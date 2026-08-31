from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p=Path(path); text=p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old,new,1))

world="src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
tests="tests/sky-arcade-reference.test.ts"

# Add a single distant fortress destination so the stage reads as an assault, not another canyon.
replace_once(world,
'''    if(stage.biome==="cloud"){
''',
'''    if(stage.biome==="desert"){
      // V9.3: a monumental sandwall citadel anchors the route and separates this stage from Red Canyon.
      const fortress=new THREE.Group();fortress.name="arcade-desert-fortress-citadel";fortress.position.set(0,-7,-335);
      const sand=paint(stage.palette.primary),bronze=paint(stage.palette.secondary),fortressDark=paint(stage.palette.ground);
      const fortressGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      for(const side of [-1,1]){
        mesh(fortress,new THREE.BoxGeometry(70,28,18),fortressDark,side*54,-3,0);
        const tower=mesh(fortress,new THREE.BoxGeometry(20,58,22),sand,side*35,12,-2);tower.rotation.z=side*.025;
        mesh(fortress,new THREE.BoxGeometry(10,14,24),bronze,side*35,47,-2);
        mesh(fortress,new THREE.BoxGeometry(1.8,43,24),fortressGlow,side*27.5,15,-1);
      }
      const keep=mesh(fortress,new THREE.BoxGeometry(42,46,34),sand,0,20,20);keep.rotation.z=-.018;
      mesh(fortress,new THREE.BoxGeometry(28,10,36),bronze,0,49,20);
      mesh(fortress,new THREE.BoxGeometry(5,35,36),fortressGlow,0,21,19);
      group.add(fortress);
    }
    if(stage.biome==="cloud"){
''',
"desert fortress backdrop")

# Split Desert away from the shared Canyon/Volcano rock language and author stepped battlements.
replace_once(world,
'''      case "canyon":case "desert":case "volcano":{
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const h=17+r(j+side*15)*32;
          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);
          rock.rotation.y=r(j+19)*2;
          if(stage.biome==="desert" && j%2===0){
            mesh(group,new THREE.BoxGeometry(12,2,9),dark,side*(28+j%2*28),h-24,-42+j*27);
            mesh(group,new THREE.BoxGeometry(.22,3,8),glow,side*(28+j%2*28),h-22,-42+j*27);
          }
        }
        if(stage.biome==="desert" && index%3===1){
          const gate=index%2===0?9:-9;
          mesh(group,new THREE.BoxGeometry(50,28,6),dark,gate-42,-11,8);
          mesh(group,new THREE.BoxGeometry(50,28,6),dark,gate+42,-11,8);
          mesh(group,new THREE.BoxGeometry(34,4.5,7),secondary,gate,7.2,8);
          mesh(group,new THREE.BoxGeometry(31,.34,7.2),glow,gate,4.8,7.8);
          for(const side of [-1,1]) mesh(group,new THREE.BoxGeometry(.3,18,6.4),glow,gate+side*17,-8,8);
        }
        if(stage.biome==="volcano"){
          // V8.3: the continuous lava corridor is route-following, not one straight plane per rigid chunk.
          for(let i=0;i<5;i++){
            const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);
            vent.rotation.z=.15;
          }
        }
        break;
      }
''',
'''      case "canyon":{
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const h=17+r(j+side*15)*32;
          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);
          rock.rotation.y=r(j+19)*2;
        }
        break;
      }
      case "desert":{
        // V9.3: streamed chunks are fortress districts with an alternating breach, not recolored canyon rocks.
        group.userData.arcadeDesertV93SandwallCitadel=true;
        const breachSide=index%2===0?1:-1;
        group.userData.arcadeDesertV93BreachSide=breachSide;
        for(const side of [-1,1]){
          const tier=((index+(side>0?1:0))%3)-1;
          const breach=side===breachSide;
          const wallX=side*(breach?31:45);
          const wallY=-17+tier*2.6;
          const wall=mesh(group,new THREE.BoxGeometry(breach?25:31,15+(index%2)*3,42),dark,wallX,wallY,2);
          wall.rotation.z=side*(breach?.018:-.012);
          mesh(group,new THREE.BoxGeometry(breach?22:28,3.6,37),primary,wallX,wallY+9.2,2);
          for(const edge of [-1,1]){
            const towerX=wallX+edge*(breach?9.8:12.2);
            const towerH=24+(edge===side?5:0)+Math.abs(tier)*3;
            const tower=mesh(group,new THREE.BoxGeometry(6.5,towerH,9),edge===side?secondary:primary,towerX,-24+towerH/2+tier*2,edge*8);
            tower.rotation.z=side*edge*.018;
            mesh(group,new THREE.BoxGeometry(.42,towerH*.62,9.2),glow,towerX-side*1.9,-22+towerH*.52+tier*2,edge*8);
          }
          // The breach side projects toward the route but never closes the center corridor.
          if(breach){
            const ramp=mesh(group,new THREE.BoxGeometry(18,1.1,31),secondary,side*21,-14+tier*2,-8);
            ramp.rotation.z=side*-.08;ramp.rotation.y=side*.035;
            mesh(group,new THREE.BoxGeometry(13,.22,27),glow,side*20,-13.2+tier*2,-8);
          }
          for(let c=-1;c<=1;c++)mesh(group,new THREE.BoxGeometry(4.2,4.2,6),secondary,wallX+c*(breach?7:9),wallY+13.2,0);
        }
        break;
      }
      case "volcano":{
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const h=17+r(j+side*15)*32;
          const rock=mesh(group,new THREE.CylinderGeometry(4+r(j+3)*5,8+r(j+5)*7,h,7,3),j%2?primary:secondary,side*(28+j%2*28),-25+h/2,-42+j*27);
          rock.rotation.y=r(j+19)*2;
        }
        // V8.3: the continuous lava corridor is route-following, not one straight plane per rigid chunk.
        for(let i=0;i<5;i++){
          const vent=mesh(group,new THREE.ConeGeometry(.4,11+r(i)*9,6),new THREE.MeshBasicMaterial({color:0xffa743,transparent:true,opacity:.6,depthWrite:false}),r(i+8)*50-25,-15,r(i+4)*100-50);
          vent.rotation.z=.15;
        }
        break;
      }
''',
"desert chunk split")

# Replace Desert close rock fins with architectural buttresses and wall fragments.
replace_once(world,
'''      } else if(stage.biome==="canyon" || stage.biome==="desert" || stage.biome==="volcano"){
        const h=stage.biome==="volcano"?20+r(j+9)*27:24+r(j+9)*36;
        const rockX=stage.biome==="volcano"?volcanoX:x;
        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,rockX,-26+h/2,z);
        fin.rotation.z=side*(.06+r(j+27)*.16);
        fin.rotation.y=r(j+37)*Math.PI;
        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,rockX-side*2,-13,z+2);
''',
'''      } else if(stage.biome==="canyon" || stage.biome==="volcano"){
        const h=stage.biome==="volcano"?20+r(j+9)*27:24+r(j+9)*36;
        const rockX=stage.biome==="volcano"?volcanoX:x;
        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,rockX,-26+h/2,z);
        fin.rotation.z=side*(.06+r(j+27)*.16);
        fin.rotation.y=r(j+37)*Math.PI;
        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,rockX-side*2,-13,z+2);
      } else if(stage.biome==="desert"){
        // V9.3: close passes are fortress buttresses and crenelated wall fragments, not stone fins.
        const fortressX=side*(37+r(j+71)*11+(j%2)*4);
        const h=17+r(j+9)*25;
        const buttress=mesh(group,new THREE.BoxGeometry(5.5+r(j+17)*4,h,9+r(j+27)*5),j%2?secondary:primary,fortressX,-25+h/2,z);
        buttress.rotation.z=side*(.025+r(j+37)*.06);
        mesh(group,new THREE.BoxGeometry(8+r(j+47)*5,3,11+r(j+57)*5),dark,fortressX,-25+h-1,z);
        mesh(group,new THREE.BoxGeometry(.38,h*.58,10+r(j+67)*4),glow,fortressX-side*2.2,-25+h*.57,z+.2);
        if((j+index)%2===0){
          const wall=mesh(group,new THREE.BoxGeometry(13+r(j+15)*8,6+r(j+25)*5,4.5),dark,fortressX-side*7,-19+r(j+35)*4,z+6);
          wall.rotation.y=side*(.04+r(j+45)*.05);
          for(const c of [-1,0,1])mesh(group,new THREE.BoxGeometry(2.8,3.6,4.7),secondary,fortressX-side*7+c*4,-13+r(j+35)*4,z+6);
        }
''',
"desert near-pass fortress language")

# Regression contract before Cloud Fleet's V9.2 test.
p=Path(tests);text=p.read_text()
anchor='''test("V9.2 cloud fleet reads as a sky armada instead of floating T-shaped plates", () => {\n'''
insert='''test("V9.3 desert fortress reads as a sandwall assault instead of a recolored canyon", () => {\n  const scene=new THREE.Scene();\n  const world=new SkyDancerArcadeReferenceWorld(scene);\n  const desert=SKY_DANCER_ARCADE_STAGES.find((stage)=>stage.id==="desert-fortress")!;\n  world.setStage(desert);\n  world.update(desert.courseSpeed*5,0,0);\n  assert.ok(scene.getObjectByName("arcade-desert-fortress-citadel") instanceof THREE.Group,\n    "desert fortress must expose one monumental citadel destination");\n  const environment=scene.getObjectByName("arcade-course-environment")!;\n  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));\n  assert.equal(chunks.length,8);\n  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeDesertV93SandwallCitadel===true),\n    "every desert chunk must use the V9.3 fortress district architecture");\n  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeDesertV93BreachSide)).size,2,\n    "the sandwall breach must alternate sides instead of forming one repeated symmetric gate");\n  world.dispose();\n});\n\n'''
if anchor not in text: raise SystemExit("missing Cloud Fleet test anchor")
p.write_text(text.replace(anchor,insert+anchor,1))
print("Applied DESERT FORTRESS V9.3 sandwall citadel reconstruction")
