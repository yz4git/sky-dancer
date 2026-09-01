from pathlib import Path

world_path = Path("src/sky/arcade/SkyDancerArcadeReferenceWorld.ts")
s = world_path.read_text()

old = '''    for(const cue of this.routeCues){
      const course=arcadeCourseRelativePose(this.stage,distance,cue.depth);
      const yScale=cue.kind==="ice"?2.05:1;
      // V10.2: open ice ribs preview the next vertical lane before the craft reaches it.
      const iceCueLift=cue.kind==="ice" ? Math.sin(cue.phase*Math.PI/(2*.64))*18 : 0;
      cue.group.position.set(course.x-playerX*.35,course.y*yScale+iceCueLift-playerY*.16,-cue.depth);
      const cueAhead=arcadeCourseRelativePose(this.stage,distance,cue.depth+24);
      const cueSlope=Math.atan2(cueAhead.y-course.y,24);
      cue.group.rotation.y=course.yaw*(cue.kind==="ice"?1.18:1.1);
      cue.group.rotation.x=cue.kind==="ice" ? course.pitch*1.5+cueSlope*1.45 : course.pitch*1.02;
      cue.group.rotation.z=cue.kind==="orbit"
        ? cue.phase+(distance+cue.depth)*.0068+course.bank*.24
        : course.bank*(cue.kind==="ice"?.34:.3);
    }'''
new = '''    for(const cue of this.routeCues){
      const course=arcadeCourseRelativePose(this.stage,distance,cue.depth);
      const cueAhead=arcadeCourseRelativePose(this.stage,distance,cue.depth+24);
      const cueSlope=Math.atan2(cueAhead.y-course.y,24);
      // V10.3 background integrity: ice guide ribs stay physically tethered to the authored spline.
      // The old independent +/-18m lift made ribs float through the cavern and read as broken geometry.
      cue.group.position.set(course.x-playerX*.35,course.y-playerY*.16,-cue.depth);
      cue.group.rotation.y=course.yaw*1.1;
      cue.group.rotation.x=cue.kind==="ice" ? course.pitch*1.05+cueSlope*.9 : course.pitch*1.02;
      cue.group.rotation.z=cue.kind==="orbit"
        ? cue.phase+(distance+cue.depth)*.0068+course.bank*.24
        : course.bank*(cue.kind==="ice"?.26:.3);
    }'''
assert old in s, "route cue update block changed"
s = s.replace(old, new, 1)

old = '''    this.iceRibbon={
      outer:this.makeIceRibbonMesh(stage,16,"arcade-ice-course-fissure-outer",.34),
      core:this.makeIceRibbonMesh(stage,3.2,"arcade-ice-course-fissure-core",.92),
    };'''
new = '''    this.iceRibbon={
      // V10.3: a floor fissure, not a luminous road filling the foreground.
      outer:this.makeIceRibbonMesh(stage,10.5,"arcade-ice-course-fissure-outer",.18),
      core:this.makeIceRibbonMesh(stage,1.6,"arcade-ice-course-fissure-core",.62),
    };'''
assert old in s, "ice ribbon build block changed"
s = s.replace(old, new, 1)

old = '''        const depth=14+i*14.2;
        const course=arcadeCourseRelativePose(stage,distance,depth);
        const cx=course.x-playerX*.35;
        const cy=course.y-playerY*.16-20.6+lift;
        const cz=-depth;
        const lateralX=Math.cos(course.yaw)*half;
        const lateralZ=-Math.sin(course.yaw)*half;
        const bankY=course.bank*half*.2;'''
new = '''        const depth=30+i*13.8;
        const course=arcadeCourseRelativePose(stage,distance,depth);
        const cx=course.x-playerX*.35;
        const cy=course.y-playerY*.16-23.2+lift;
        const cz=-depth;
        const lateralX=Math.cos(course.yaw)*half;
        const lateralZ=-Math.sin(course.yaw)*half;
        const bankY=course.bank*half*.12;'''
assert old in s, "ice ribbon update block changed"
s = s.replace(old, new, 1)
assert "    update(this.iceRibbon.outer,16,0);\n    update(this.iceRibbon.core,3.2,.09);" in s
s = s.replace(
    "    update(this.iceRibbon.outer,16,0);\n    update(this.iceRibbon.core,3.2,.09);",
    "    update(this.iceRibbon.outer,10.5,0);\n    update(this.iceRibbon.core,1.6,.07);",
    1,
)

old = '''    const glow=new THREE.MeshBasicMaterial({
      color:stage.palette.accent,transparent:true,opacity:kind==="volcano"?.88:kind==="ice"?.76:.84,
      blending:THREE.AdditiveBlending,depthWrite:false,
    });'''
new = '''    const glow=new THREE.MeshBasicMaterial({
      color:stage.palette.accent,transparent:true,opacity:kind==="volcano"?.88:kind==="ice"?.5:.84,
      blending:THREE.AdditiveBlending,depthWrite:false,
    });'''
assert old in s, "route cue glow block changed"
s = s.replace(old, new, 1)
assert '      const depth=kind==="ice"?26+i*52:26+i*43;' in s
s = s.replace('      const depth=kind==="ice"?26+i*52:26+i*43;', '      const depth=kind==="ice"?42+i*58:26+i*43;', 1)
assert '      const phase=i*.64;' in s
s = s.replace('      const phase=i*.64;', '      const phase=i*.64;\n      cue.userData.arcadeRouteDepth=depth;', 1)

old = '''        const radius=21+(i%3===0?-2.2:i%3===1?1.6:3.2);
        const arc=Math.PI*(i%3===0?.56:i%3===1?.64:.5);'''
new = '''        const radius=18+(i%3===0?-1.5:i%3===1?1.2:2.1);
        const arc=Math.PI*(i%3===0?.44:i%3===1?.54:.48);'''
assert old in s, "ice arch proportions changed"
s = s.replace(old, new, 1)
assert '        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.34,5,24,arc*.78),glow,(i%2?1:-1)*3.2,-10.1,.18);' in s
s = s.replace(
    '        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.34,5,24,arc*.78),glow,(i%2?1:-1)*3.2,-10.1,.18);',
    '        const inner=mesh(cue,new THREE.TorusGeometry(radius*.9,.24,5,24,arc*.72),glow,(i%2?1:-1)*3.2,-10.1,.18);',
    1,
)

old = '''          const shelf=mesh(group,new THREE.BoxGeometry(24,2.4,24),side<0?primary:secondary,side*34,13+(index%3-1)*3.5,-4);
          shelf.rotation.z=side*(.08+(index%3)*.018);
          shelf.rotation.y=side*.04;
          mesh(group,new THREE.BoxGeometry(21,.26,22),glow,side*34,11.9+(index%3-1)*3.5,-4);'''
new = '''          const shelf=mesh(group,new THREE.BoxGeometry(18,1.8,18),side<0?primary:secondary,side*40,9+(index%3-1)*2.8,-6);
          shelf.rotation.z=side*(.08+(index%3)*.018);
          shelf.rotation.y=side*.04;
          mesh(group,new THREE.BoxGeometry(14.5,.2,16),glow,side*40,8.15+(index%3-1)*2.8,-6);'''
assert old in s, "ice shelf block changed"
s = s.replace(old, new, 1)
world_path.write_text(s)

test_path = Path("tests/sky-arcade-reference.test.ts")
s = test_path.read_text()
assert '    assert.ok(parameters.arc < Math.PI*.7, "ice guide ribs must stay broken/open rather than recreate a hoop tunnel");' in s
s = s.replace(
    '    assert.ok(parameters.arc < Math.PI*.7, "ice guide ribs must stay broken/open rather than recreate a hoop tunnel");',
    '    assert.ok(parameters.arc < Math.PI*.58, "ice guide ribs must stay short/open rather than recreate a hoop tunnel");',
    1,
)
old = '''  const ys = cues.map((cue) => cue.position.y);
  const pitches = cues.map((cue) => cue.rotation.x);
  const xs = cues.map((cue) => cue.position.x);
  assert.ok(Math.max(...ys)-Math.min(...ys)>28,
    "ice tunnel ribs must visibly climb and dive through the cavern");
  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.28,
    "ice tunnel ribs must rotate with the course pitch, not form a flat straight tube");
  assert.ok(Math.max(...xs)-Math.min(...xs)>25,
    "ice tunnel keeps its horizontal slalom while adding the vertical wave");'''
new = '''  const ys = cues.map((cue) => cue.position.y);
  const pitches = cues.map((cue) => cue.rotation.x);
  const xs = cues.map((cue) => cue.position.x);
  assert.ok(Math.max(...ys)-Math.min(...ys)>11,
    "ice guide ribs must reveal the real authored climb/dive without an artificial floating wave");
  assert.ok(Math.max(...pitches)-Math.min(...pitches)>.28,
    "ice tunnel ribs must rotate with the course slope, not form a flat straight tube");
  assert.ok(Math.max(...xs)-Math.min(...xs)>25,
    "ice tunnel keeps its horizontal slalom while following the real vertical course");
  const auditDistance=ice.courseSpeed*10;
  for(const cue of cues){
    const depth=Number(cue.userData.arcadeRouteDepth);
    assert.ok(depth>=42,"nearest ice guide must stay out of the camera/airframe foreground");
    const authored=arcadeCourseRelativePose(ice,auditDistance,depth);
    assert.ok(Math.abs(cue.position.y-authored.y)<1e-6,
      "ice guide ribs must remain tethered to the actual course centre instead of floating independently");
  }'''
assert old in s, "ice guide regression block changed"
s = s.replace(old, new, 1)
old = '''  assert.ok(Math.max(...fissureY)-Math.min(...fissureY)>12,
    "continuous glacial fissure must reveal the upcoming climb/dive");'''
new = '''  assert.ok(Math.max(...fissureY)-Math.min(...fissureY)>12,
    "continuous glacial fissure must reveal the upcoming climb/dive");
  assert.ok(Number(fissure.userData.arcadeIceRibbonWidth)<=11,
    "glacial fissure must stay narrow enough to read as a floor crack, not a luminous road");
  const fissureMaterial=fissure.material as THREE.MeshBasicMaterial;
  const coreMaterial=core.material as THREE.MeshBasicMaterial;
  assert.ok(fissureMaterial.opacity<=.2 && coreMaterial.opacity<=.65,
    "ice fissure glow must not wash out the foreground");
  const firstCenterZ=(fissurePosition.getZ(0)+fissurePosition.getZ(1))*.5;
  assert.ok(firstCenterZ<=-26,
    "continuous fissure must begin far enough ahead to avoid clipping into the camera/airframe");'''
assert old in s, "fissure regression block changed"
s = s.replace(old, new, 1)
test_path.write_text(s)
