from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
test = "tests/sky-arcade-reference.test.ts"

replace_once(world,
'''      if(kind==="ice"){
        cue.name="arcade-ice-wave-cue";
        const radius=21.5+(i%3===0?-2.5:i%3===1?1.3:3.4);
        const arch=mesh(cue,new THREE.TorusGeometry(radius,1.15,6,32,Math.PI),i%2?secondary:primary,0,-10.5,0);
        arch.name="arcade-ice-wave-arch";
        arch.rotation.z=(i%2?1:-1)*.055;
        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.42,5,28,Math.PI*.78),glow,0,-10.2,.18);
        inner.rotation.z=Math.PI*.11+(i%2?-.045:.045);
        for(const side of [-1,1]){
          const fang=mesh(cue,new THREE.ConeGeometry(1.35,7.5+(i%3)*1.2,5),i%2?primary:secondary,side*radius*.48,7+(i%2)*1.8,1);
          fang.name="arcade-ice-pressure-fang";
          fang.rotation.z=side*(.16+(i%3)*.025);
        }
        if(i%2===0){
          const floorShard=mesh(cue,new THREE.ConeGeometry(1.15,6.6,5),glow,(i%4===0?1:-1)*7.5,-20.5,.5);
          floorShard.rotation.z=Math.PI+(i%4===0?.08:-.08);
        }
''',
'''      if(kind==="ice"){
        cue.name="arcade-ice-wave-cue";
        // V8.8: use broken, alternating ribs rather than seven complete hoops. The route stays readable,
        // but the player sees the canyon climb/dive instead of a repeated tunnel silhouette.
        const radius=21+(i%3===0?-2.2:i%3===1?1.6:3.2);
        const arc=Math.PI*(i%3===0?.56:i%3===1?.64:.5);
        const arch=mesh(cue,new THREE.TorusGeometry(radius,1.02,6,28,arc),i%2?secondary:primary,(i%2?1:-1)*3.8,-10.5,0);
        arch.name="arcade-ice-wave-arch";
        arch.rotation.z=(i%2?Math.PI*.12:Math.PI*.88)+(i%3-1)*.045;
        arch.rotation.y=(i%2?1:-1)*.06;
        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.34,5,24,arc*.78),glow,(i%2?1:-1)*3.2,-10.1,.18);
        inner.rotation.z=arch.rotation.z+(i%2?-.05:.05);
        for(const side of [-1,1]){
          const fang=mesh(cue,new THREE.ConeGeometry(1.05,6.2+(i%3)*.9,5),i%2?primary:secondary,side*(radius*.6+3),6.2+(i%2)*1.2,1);
          fang.name="arcade-ice-pressure-fang";
          fang.rotation.z=side*(.12+(i%3)*.02);
        }
        if(i%2===0){
          const floorShard=mesh(cue,new THREE.ConeGeometry(.95,5.4,5),glow,(i%4===0?1:-1)*11.5,-20.6,.5);
          floorShard.rotation.z=Math.PI+(i%4===0?.07:-.07);
        }
''',
"broken ice ribs")

replace_once(world,
'''      case "ice":{
        for(const side of [-1,1])for(let j=0;j<5;j++){
          const crystal=mesh(group,new THREE.ConeGeometry(3.5,25+r(j)*18,5),j%2?primary:secondary,side*(22+j%2*14),-7,-42+j*21);
          crystal.rotation.z=side*(.12+r(j)*.24);
        }
        const arch=mesh(group,new THREE.TorusGeometry(29,2.2,6,36,Math.PI),secondary,0,-17,0);
        arch.name="arcade-ice-vault";
        break;
      }
''',
'''      case "ice":{
        group.userData.arcadeIceV88CanyonClearance=true;
        // V8.8: open the centre lane. Side shelves and ceiling teeth sell a cavern without repeatedly
        // blocking the flight path with a full-width arch in every streamed chunk.
        for(const side of [-1,1])for(let j=0;j<4;j++){
          const sideX=side*(34+(j%2)*12);
          const h=18+r(j)*18;
          const crystal=mesh(group,new THREE.ConeGeometry(2.6+r(j+5)*1.8,h,5),j%2?primary:secondary,sideX,-18+h/2,-46+j*29);
          crystal.rotation.z=side*(.08+r(j)*.16);
          if(j%2===0){
            const tooth=mesh(group,new THREE.ConeGeometry(2.2+r(j+17)*1.5,12+r(j+23)*10,5),j%2?secondary:primary,side*(28+r(j+31)*8),20,-31+j*31);
            tooth.rotation.z=Math.PI+side*(.08+r(j+41)*.12);
          }
        }
        for(const side of [-1,1]){
          // Keep shoulders unnamed so the static geometry baker can merge them by material.
          const shelf=mesh(group,new THREE.BoxGeometry(24,2.4,24),side<0?primary:secondary,side*34,13+(index%3-1)*3.5,-4);
          shelf.rotation.z=side*(.08+(index%3)*.018);
          shelf.rotation.y=side*.04;
          mesh(group,new THREE.BoxGeometry(21,.26,22),glow,side*34,11.9+(index%3-1)*3.5,-4);
        }
        break;
      }
''',
"open ice canyon chunk")

replace_once(world,
'''      const z=-51+j*24+r(j+41)*6;
      const x=side*(25+r(j+71)*8.5);
      const volcanoX=side*(33+r(j+71)*8);
''',
'''      const z=-51+j*24+r(j+41)*6;
      const x=side*(25+r(j+71)*8.5);
      const volcanoX=side*(33+r(j+71)*8);
      const iceX=side*(35+r(j+71)*11.5);
''',
"ice near-pass lane")

replace_once(world,
'''      } else if(stage.biome==="ice"){
        const h=24+r(j+8)*31;
        const crystal=mesh(group,new THREE.ConeGeometry(2.7+r(j+12)*2.2,h,5),j%2?primary:secondary,x,-19+h/2,z);
        crystal.rotation.z=side*(.12+r(j+24)*.22);
        if(j%2===1) mesh(group,new THREE.OctahedronGeometry(2.6+r(j+44)*2.1,0),glow,x-side*3,2+r(j+66)*8,z+3);
''',
'''      } else if(stage.biome==="ice"){
        const h=19+r(j+8)*24;
        // Unnamed static crystals stay eligible for bakeArcadeAirframe batching.
        const crystal=mesh(group,new THREE.ConeGeometry(2.2+r(j+12)*1.8,h,5),j%2?primary:secondary,iceX,-21+h/2,z);
        crystal.rotation.z=side*(.08+r(j+24)*.16);
        if(j%2===1) mesh(group,new THREE.OctahedronGeometry(2.1+r(j+44)*1.6,0),glow,iceX-side*3,-1+r(j+66)*6,z+3);
''',
"ice near-pass clearance")

replace_once(test,
'''test("V8.7 ice cavern exposes its real vertical wave with sparse ribs and a continuous glacial fissure", () => {
''',
'''test("V8.8 ice cavern exposes its vertical canyon without repeated full-screen hoops", () => {
''',
"V8.8 ice test name")

replace_once(test,
'''  assert.equal(scene.getObjectsByProperty("name", "arcade-ice-wave-arch").length, 7);
  const ys = cues.map((cue) => cue.position.y);
''',
'''  const arches=scene.getObjectsByProperty("name", "arcade-ice-wave-arch") as THREE.Mesh[];
  assert.equal(arches.length, 7);
  for(const arch of arches){
    const parameters=(arch.geometry as THREE.TorusGeometry).parameters;
    assert.ok(parameters.arc < Math.PI*.7, "ice guide ribs must stay broken/open rather than recreate a hoop tunnel");
  }
  const chunks=scene.children[0].children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));
  assert.equal(chunks.length,8);
  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeIceV88CanyonClearance===true),
    "every streamed ice chunk keeps the V8.8 open-centre canyon layout");
  const ys = cues.map((cue) => cue.position.y);
''',
"V8.8 open-rib test")

print("Applied Ice Cavern V8.8 canyon readability pass")
