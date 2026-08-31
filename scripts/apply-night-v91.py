from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} in {path}")
    p.write_text(text.replace(old, new, 1))

world = "src/sky/arcade/SkyDancerArcadeReferenceWorld.ts"
tests = "tests/sky-arcade-reference.test.ts"

# Give NIGHT METRO a destination that is not just another wall of generic towers.
replace_once(world,
'''    if(stage.biome==="ruins"){
''',
'''    if(stage.biome==="night"){
      // V9.1: a recognizable metro interchange anchors the pursuit in the distance instead of
      // reading as Dawn City with a darker palette.
      const hub=new THREE.Group();hub.name="arcade-night-metro-hub";hub.position.set(0,-3,-330);
      const hubDark=paint(0x0b1025),hubPurple=paint(stage.palette.secondary);
      const hubGlow=new THREE.MeshBasicMaterial({color:stage.palette.accent,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const concourse=mesh(hub,new THREE.BoxGeometry(74,8,30),hubDark,0,-2,0);
      concourse.rotation.z=-.025;
      for(const side of [-1,1]){
        const tower=mesh(hub,new THREE.BoxGeometry(11,72,13),hubPurple,side*38,23,0);
        tower.rotation.z=side*.055;
        mesh(hub,new THREE.BoxGeometry(1.2,60,14),hubGlow,side*32,23,2);
        const rail=mesh(hub,new THREE.BoxGeometry(26,2.2,64),hubDark,side*18,-9,20);
        rail.rotation.y=side*.035;
        mesh(hub,new THREE.BoxGeometry(.55,.35,60),hubGlow,side*13.5,-7.7,20);
      }
      const crown=mesh(hub,new THREE.BoxGeometry(42,3.5,9),hubPurple,0,42,1);crown.rotation.z=.035;
      mesh(hub,new THREE.BoxGeometry(30,.7,9.4),hubGlow,0,44.2,1);
      group.add(hub);
    }
    if(stage.biome==="ruins"){
''',
"night metro hub backdrop")

# Add a stage-specific elevated transit/pursuit layer immediately after the shared city shell.
replace_once(world,
'''    if(stage.biome==="city" || stage.biome==="night"){
      this.addCity(group,stage,index,facade);
    } else if(!["cloud","storm","orbit","citadel","ruins"].includes(stage.biome)){
''',
'''    if(stage.biome==="city" || stage.biome==="night"){
      this.addCity(group,stage,index,facade);
      if(stage.biome==="night")this.addNightMetroPursuit(group,index,primary,secondary,dark,glow);
    } else if(!["cloud","storm","orbit","citadel","ruins"].includes(stage.biome)){
''',
"night pursuit chunk hook")

# Split NIGHT near-pass language away from the daytime city tower treatment.
replace_once(world,
'''      if(stage.biome==="city" || stage.biome==="night"){
        const h=25+r(j+11)*31;
        const w=2.2+r(j+19)*1.8;
        const d=4+r(j+23)*2.2;
        const tower=mesh(group,new THREE.BoxGeometry(w,h,d),j%3===0?secondary:primary,x,-25+h/2,z);
        tower.rotation.y=(r(j+31)-.5)*.07;
        mesh(group,new THREE.BoxGeometry(w*1.38,h*.22,d*1.18),dark,x,-25+h*.11,z);
        mesh(group,new THREE.BoxGeometry(w*.72,1.15,d*.76),secondary,x,-24.42+h,z);
        for(let band=0;band<3;band++){
          mesh(group,new THREE.BoxGeometry(w*1.06,.13,d*1.03),glow,x,-25+h*(.34+band*.2),z);
        }
        mesh(group,new THREE.BoxGeometry(.12,h*.62,d*1.04),glow,x-side*w*.34,-25+h*.54,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.16,4+r(j+55)*5,.16),glow,x,-23.8+h+2.2,z);
''',
'''      if(stage.biome==="city"){
        const h=25+r(j+11)*31;
        const w=2.2+r(j+19)*1.8;
        const d=4+r(j+23)*2.2;
        const tower=mesh(group,new THREE.BoxGeometry(w,h,d),j%3===0?secondary:primary,x,-25+h/2,z);
        tower.rotation.y=(r(j+31)-.5)*.07;
        mesh(group,new THREE.BoxGeometry(w*1.38,h*.22,d*1.18),dark,x,-25+h*.11,z);
        mesh(group,new THREE.BoxGeometry(w*.72,1.15,d*.76),secondary,x,-24.42+h,z);
        for(let band=0;band<3;band++){
          mesh(group,new THREE.BoxGeometry(w*1.06,.13,d*1.03),glow,x,-25+h*(.34+band*.2),z);
        }
        mesh(group,new THREE.BoxGeometry(.12,h*.62,d*1.04),glow,x-side*w*.34,-25+h*.54,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.16,4+r(j+55)*5,.16),glow,x,-23.8+h+2.2,z);
      } else if(stage.biome==="night"){
        // V9.1: close passes alternate station blades, signs and canopy fragments instead of ten more skyscrapers.
        const metroX=side*(34+r(j+71)*10+(j%2)*3);
        const y=-6+r(j+6)*15;
        if((j+index)%2===0){
          const blade=mesh(group,new THREE.BoxGeometry(1.1,16+r(j+5)*13,7+r(j+25)*5),secondary,metroX,y+7,z);
          blade.rotation.z=side*(.08+r(j+52)*.12);
          mesh(group,new THREE.BoxGeometry(.35,12+r(j+12)*8,7.2),glow,metroX-side*.8,y+7,z+.1);
        }else{
          const canopy=mesh(group,new THREE.BoxGeometry(10+r(j+15)*6,1.1,12+r(j+25)*8),dark,metroX,y,z);
          canopy.rotation.z=side*(r(j+32)-.5)*.1;
          mesh(group,new THREE.BoxGeometry(7+r(j+35)*5,.22,10+r(j+45)*6),glow,metroX-side*1.5,y+.72,z);
          const mast=mesh(group,new THREE.BoxGeometry(1.2,11+r(j+55)*8,1.2),secondary,metroX+side*3,y-5,z+2);
          mast.rotation.z=side*.07;
        }
''',
"night near-pass transit language")

# Replace the bright shader river in NIGHT with a dark expressway/metro trench, keeping the city river intact.
replace_once(world,
'''    if(this.water){const river=mesh(group,new THREE.PlaneGeometry(40,114),this.water,-.4,-25.35);river.rotation.x=-Math.PI/2;}
    const bank=paint(stage.biome==="night"?0x314559:0x506879),road=paint(0x132635),light=paint(0xffc06e,0xff963b);
''',
'''    if(this.water && stage.biome!=="night"){
      const river=mesh(group,new THREE.PlaneGeometry(40,114),this.water,-.4,-25.35);river.rotation.x=-Math.PI/2;
    }
    if(stage.biome==="night"){
      const metroBed=paint(0x080e20),metroGlow=paint(stage.palette.accent,stage.palette.accent);
      mesh(group,new THREE.BoxGeometry(38,.32,114),metroBed,0,-25.2,0);
      for(const side of [-1,1]){
        mesh(group,new THREE.BoxGeometry(.34,.14,112),metroGlow,side*10.5,-24.95,0);
        mesh(group,new THREE.BoxGeometry(.18,.11,112),secondary,side*15.5,-24.92,0);
      }
    }
    const bank=paint(stage.biome==="night"?0x314559:0x506879),road=paint(0x132635),light=paint(0xffc06e,0xff963b);
''',
"night express trench")

# Insert the stage-specific structural authoring before addCity.
replace_once(world,
'''  private addCity(group:THREE.Group,stage:SkyDancerArcadeStageDefinition,index:number,facade:THREE.Material):void {
''',
'''  private addNightMetroPursuit(
    group:THREE.Group,
    index:number,
    primary:THREE.Material,
    secondary:THREE.Material,
    dark:THREE.Material,
    glow:THREE.Material,
  ):void {
    // V9.1: streamed chunks alternate the close transit side so the chicane reads as a pursuit route,
    // while every structure remains outside the center flight lane and eligible for static batching.
    group.userData.arcadeNightV91NeonPursuit=true;
    const leadSide=index%2===0?1:-1;
    group.userData.arcadeNightV91LeadSide=leadSide;
    const tier=(index%3)-1;
    const leadY=-7+tier*4.2;
    const farY=-14-tier*2.6;

    for(const side of [-1,1]){
      const lead=side===leadSide;
      const railX=side*(lead?19:31);
      const railY=lead?leadY:farY;
      const deck=mesh(group,new THREE.BoxGeometry(lead?10:7,1.1,84),lead?secondary:dark,railX,railY,0);
      deck.rotation.z=side*(lead?.035:-.018);
      mesh(group,new THREE.BoxGeometry(.42,.22,80),glow,railX-side*(lead?3.3:2.2),railY+.78,0);
      mesh(group,new THREE.BoxGeometry(.28,.18,80),primary,railX+side*(lead?3.2:2.1),railY+.72,0);

      if(lead){
        const canopy=mesh(group,new THREE.BoxGeometry(16,1.3,26),dark,side*26,6+tier*2,-14);
        canopy.rotation.z=side*.055;canopy.rotation.y=side*.025;
        mesh(group,new THREE.BoxGeometry(12,.28,23),glow,side*24.5,6.9+tier*2,-14);
        for(const z of [-23,-5]){
          const support=mesh(group,new THREE.BoxGeometry(1.5,18,1.5),secondary,side*31,-2+tier*2,z);
          support.rotation.z=side*.06;
        }
      }
    }

    // Split gantries mark speed beats without recreating a full-screen hoop/tunnel.
    if(index%2===1){
      for(const side of [-1,1]){
        const post=mesh(group,new THREE.BoxGeometry(1.4,25,2),secondary,side*31,2,-32);
        post.rotation.z=side*.035;
        const arm=mesh(group,new THREE.BoxGeometry(12,1.3,2),side===leadSide?primary:dark,side*25,14,-32);
        arm.rotation.z=side*(side===leadSide?-.04:.025);
        mesh(group,new THREE.BoxGeometry(7,.3,2.2),glow,side*21.5,15,-32);
      }
    }
  }

  private addCity(group:THREE.Group,stage:SkyDancerArcadeStageDefinition,index:number,facade:THREE.Material):void {
''',
"night pursuit authoring function")

# Regression test: distinctive destination, alternating pursuit side, and no shader river in NIGHT.
p=Path(tests);text=p.read_text()
anchor='''test("V8.9 prism citadel reads as an open final assault rather than a repeated ring tunnel", () => {\n'''
insert='''test("V9.1 night metro reads as a neon express pursuit rather than a recolored city river", () => {\n  const scene = new THREE.Scene();\n  const world = new SkyDancerArcadeReferenceWorld(scene);\n  const night = SKY_DANCER_ARCADE_STAGES.find((stage) => stage.id === "night-metro")!;\n  world.setStage(night);\n  world.update(night.courseSpeed * 6, 0, 0);\n  assert.ok(scene.getObjectByName("arcade-night-metro-hub") instanceof THREE.Group,\n    "night metro must expose a dedicated interchange destination");\n  const environment=scene.getObjectByName("arcade-course-environment")!;\n  const chunks=environment.children.filter((object)=>object.name.startsWith("arcade-course-chunk-"));\n  assert.equal(chunks.length,8);\n  assert.ok(chunks.every((chunk)=>chunk.userData.arcadeNightV91NeonPursuit===true),\n    "every night chunk must use the V9.1 elevated transit pursuit layer");\n  assert.equal(new Set(chunks.map((chunk)=>chunk.userData.arcadeNightV91LeadSide)).size,2,\n    "close transit pressure must alternate sides so the chicane reads on screen");\n  let animatedRivers=0;\n  scene.traverse((object)=>{\n    if(object instanceof THREE.Mesh && !Array.isArray(object.material) && object.material instanceof THREE.ShaderMaterial && object.material.uniforms.time)animatedRivers++;\n  });\n  assert.equal(animatedRivers,0,"night metro replaces the Dawn City river with an expressway/metro trench");\n  world.dispose();\n});\n\n'''
if anchor not in text: raise SystemExit("missing V8.9 test anchor")
p.write_text(text.replace(anchor,insert+anchor,1))

print("Applied NIGHT METRO V9.1 neon express pursuit reconstruction")
