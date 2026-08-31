from pathlib import Path
import re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    (ROOT / path).write_text(text)

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old, new, 1)

# 1) Double every authored section and the full seven-section run.
data_path = 'src/sky/arcade/SkyDancerArcadeData.ts'
data = read(data_path)
if 'SKY_DANCER_ARCADE_RUN_DURATION_SECONDS = 120' in data:
    data = data.replace('SKY_DANCER_ARCADE_RUN_DURATION_SECONDS = 120', 'SKY_DANCER_ARCADE_RUN_DURATION_SECONDS = 240', 1)
    matches = list(re.finditer(r'durationSeconds: (\d+),', data))
    if len(matches) != 11:
        raise SystemExit(f'expected 11 authored stage durations, found {len(matches)}')
    data = re.sub(r'durationSeconds: (\d+),', lambda m: f'durationSeconds: {int(m.group(1)) * 2},', data)
elif 'SKY_DANCER_ARCADE_RUN_DURATION_SECONDS = 240' not in data:
    raise SystemExit('unexpected Arcade Run duration constant')
write(data_path, data)

# 2) Increase visual depth/density and add close, non-colliding fly-by set pieces.
world_path = 'src/sky/arcade/SkyDancerArcadeReferenceWorld.ts'
world = read(world_path)
if 'arcade-near-pass-setpieces-v5' not in world:
    world = replace_once(world, 'for(let layer=0;layer<3;layer++){', 'for(let layer=0;layer<4;layer++){', 'backdrop depth layers')
    world = replace_once(world, 'paint(0x526b7d),108);', 'paint(0x526b7d),160);', 'distant city capacity')
    world = replace_once(world, 'for(let i=0;i<108;i++){', 'for(let i=0;i<160;i++){', 'distant city population')
    world = replace_once(world, '    // Static structural detail is batched. Instanced towers/clouds remain their own batches.\n', '''    // Visual-only near-pass geometry: deliberately close to the flight corridor so speed is readable.\n    this.addNearPassSetPieces(group,stage,index,primary,secondary,dark,glow);\n    // Static structural detail is batched. Instanced towers/clouds remain their own batches.\n''', 'near-pass call')
    method = r'''
  private addNearPassSetPieces(
    group:THREE.Group,
    stage:SkyDancerArcadeStageDefinition,
    index:number,
    primary:THREE.Material,
    secondary:THREE.Material,
    dark:THREE.Material,
    glow:THREE.Material,
  ):void {
    // arcade-near-pass-setpieces-v5: these are visual-only and never enter the hazard/collision runtime.
    group.userData.arcadeNearPassSetpiecesV5=true;
    const r=(i:number)=>random(index*631+stage.order*173+i*7.13);
    for(const side of [-1,1])for(let j=0;j<5;j++){
      const z=-51+j*24+r(j+41)*6;
      const x=side*(20.5+r(j+71)*7.2);
      if(stage.biome==="city" || stage.biome==="night"){
        const h=25+r(j+11)*31;
        const w=2.8+r(j+19)*2.8;
        const tower=mesh(group,new THREE.BoxGeometry(w,h,4.8+r(j+23)*3.4),j%3===0?secondary:primary,x,-25+h/2,z);
        tower.rotation.y=(r(j+31)-.5)*.08;
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.18,3.8+r(j+55)*5,.18),glow,x,-24+h+2.2,z);
      } else if(stage.biome==="canyon" || stage.biome==="desert" || stage.biome==="volcano"){
        const h=24+r(j+9)*36;
        const fin=mesh(group,new THREE.CylinderGeometry(1.8+r(j+7)*2.7,4.6+r(j+17)*3.3,h,5,2),j%2?secondary:primary,x,-26+h/2,z);
        fin.rotation.z=side*(.06+r(j+27)*.16);
        fin.rotation.y=r(j+37)*Math.PI;
        if(stage.biome==="volcano" && j%2===0) mesh(group,new THREE.ConeGeometry(.28,8+r(j+57)*10,5),glow,x-side*2,-13,z+2);
      } else if(stage.biome==="ice"){
        const h=24+r(j+8)*31;
        const crystal=mesh(group,new THREE.ConeGeometry(2.7+r(j+12)*2.2,h,5),j%2?primary:secondary,x,-19+h/2,z);
        crystal.rotation.z=side*(.12+r(j+24)*.22);
        if(j%2===1) mesh(group,new THREE.OctahedronGeometry(2.6+r(j+44)*2.1,0),glow,x-side*3,2+r(j+66)*8,z+3);
      } else if(stage.biome==="cloud" || stage.biome==="storm"){
        const y=-5+r(j+6)*15;
        const deck=mesh(group,new THREE.BoxGeometry(8+r(j+16)*6,1.1,13+r(j+26)*9),j%2?secondary:primary,x,y,z);
        deck.rotation.z=side*(r(j+32)-.5)*.09;
        mesh(group,new THREE.BoxGeometry(.22,.18,11+r(j+52)*7),glow,x-side*1.7,y+.72,z);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(1.1,11+r(j+62)*9,1.1),dark,x+side*2.2,y+6,z+2);
      } else if(stage.biome==="ruins"){
        const h=19+r(j+5)*22;
        mesh(group,new THREE.CylinderGeometry(1.3,1.8,h,8),j%2?secondary:primary,x,-9+h/2,z);
        mesh(group,new THREE.BoxGeometry(8+r(j+15)*5,1.1,7+r(j+25)*4),dark,x,-10,z);
        if(j%2===0) mesh(group,new THREE.TorusGeometry(4.2,.28,5,18,Math.PI),glow,x,5+r(j+35)*7,z+2);
      } else if(stage.biome==="orbit"){
        const y=-7+r(j+4)*18;
        const pylon=mesh(group,new THREE.BoxGeometry(1.6,18+r(j+14)*14,5.5),j%2?secondary:primary,x,y,z);
        pylon.rotation.z=side*(r(j+34)-.5)*.12;
        mesh(group,new THREE.BoxGeometry(.2,15+r(j+54)*9,5.7),glow,x-side*1,y,z-.1);
      } else if(stage.biome==="citadel"){
        const prism=mesh(group,new THREE.OctahedronGeometry(4.6+r(j+3)*3.6,0),j%2?secondary:primary,x,-1+r(j+13)*9,z);
        prism.scale.y=1.7+r(j+33)*1.1;
        prism.rotation.z=side*(.15+r(j+43)*.22);
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.3,18,3),glow,x-side*3,2,z+2);
      }
    }
  }

'''
    world = replace_once(world, '  private addCity(group:THREE.Group,stage:SkyDancerArcadeStageDefinition,index:number,facade:THREE.Material):void {\n', method + '  private addCity(group:THREE.Group,stage:SkyDancerArcadeStageDefinition,index:number,facade:THREE.Material):void {\n', 'near-pass method')
    world = replace_once(world, '    const count=48;\n', '    const count=72;\n', 'city tower count')
    world = replace_once(world, 'paint(0x697989),48);', 'paint(0x697989),72);', 'city spire capacity')
    world = replace_once(world, 'for(const side of [-1,1])for(let row=0;row<4;row++)for(let lane=0;lane<6;lane++){', 'for(const side of [-1,1])for(let row=0;row<6;row++)for(let lane=0;lane<6;lane++){', 'city tower rows')
    world = replace_once(world, '      const z=-43+row*27+random(seed+61)*6;\n', '      const z=-50+row*19+random(seed+61)*4.5;\n', 'city longitudinal density')
    world = replace_once(world, '    const g=new THREE.PlaneGeometry(260,114,32,20);g.rotateX(-Math.PI/2);\n', '    const g=new THREE.PlaneGeometry(260,114,48,30);g.rotateX(-Math.PI/2);\n', 'terrain tessellation')
    world = replace_once(world, '      const ripple=Math.sin(z*.028+x*.014)*Math.cos(x*.13-z*.008);\n      const h=-27+Math.pow(ridge,.82)*(stage.biome==="desert"?.6:1.45)+(3+ridge*.07)*ripple;\n', '      const ripple=Math.sin(z*.028+x*.014)*Math.cos(x*.13-z*.008);\n      const micro=Math.sin(z*.16+x*.21)*Math.cos(x*.31-z*.09);\n      const h=-27+Math.pow(ridge,.82)*(stage.biome==="desert"?.6:1.45)+(3+ridge*.07)*ripple+micro*(stage.biome==="desert"?.7:1.45);\n', 'terrain micro detail')
write(world_path, world)

# 3) Stronger full-screen kill climax while keeping pooled/controlled effects.
presentation_path = 'src/sky/arcade/SkyDancerArcadeProductPresentation.ts'
presentation = read(presentation_path)
if 'arcade-climax-flash-v5' not in presentation:
    presentation = replace_once(presentation, 'export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 160, smoke: 56 } as const;', 'export const ARCADE_EFFECT_BUDGET = { trails: 48, trailSamples: 18, sparks: 240, smoke: 84 } as const;', 'effect budget')
    presentation = replace_once(presentation, '    const count = this.smoke ? 5 : 30;\n', '    const count = this.smoke ? 6 : 36;\n', 'burst particle count')
    presentation = replace_once(presentation, '  private readonly right = new THREE.Vector3();\n', '''  private readonly right = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly climaxMaterial = new THREE.SpriteMaterial({ color: 0xffe4b0, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly climaxFlash = new THREE.Sprite(this.climaxMaterial);
  private climaxEnergy = 0;
''', 'climax fields')
    presentation = replace_once(presentation, '    this.root.add(streaks, this.smoke.mesh, this.sparks.mesh); scene.add(this.root);\n', '''    this.climaxFlash.name = "arcade-climax-flash-v5";
    this.climaxFlash.visible = false;
    this.climaxFlash.renderOrder = 999;
    this.root.add(streaks, this.smoke.mesh, this.sparks.mesh, this.climaxFlash); scene.add(this.root);
''', 'climax sprite setup')
    presentation = replace_once(presentation, '  setStage(): void {\n    this.clearTrails(); this.smoke.clear(); this.sparks.clear();\n  }\n', '''  setStage(): void {
    this.clearTrails(); this.smoke.clear(); this.sparks.clear();
    this.climaxEnergy = 0; this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0;
  }
''', 'climax reset')
    presentation = replace_once(presentation, '  emitBurst(position: THREE.Vector3, size: number): void {\n    this.smoke.emit(position, size); this.sparks.emit(position, size);\n  }\n', '''  emitBurst(position: THREE.Vector3, size: number): void {
    this.smoke.emit(position, size); this.sparks.emit(position, size);
  }

  emitClimax(position: THREE.Vector3, strength: number): void {
    const power = Math.max(.35, strength);
    this.emitBurst(position, 1 + power * 1.35);
    for (let i = 0; i < (power > 1 ? 4 : 2); i++) {
      const angle = i * 2.399963 + power;
      const offset = new THREE.Vector3(Math.cos(angle) * (1.4 + power * 1.7), Math.sin(angle) * (1 + power), (i - 1.5) * 1.15);
      this.emitBurst(position.clone().add(offset), .65 + power * .72);
    }
    this.climaxEnergy = Math.max(this.climaxEnergy, power);
  }
''', 'emit climax')
    presentation = replace_once(presentation, '    this.updateProjectileTrails(snapshot, delta);\n    this.smoke.update(delta, camera); this.sparks.update(delta, camera);\n', '    this.updateProjectileTrails(snapshot, delta);\n    this.updateClimax(delta, camera);\n    this.smoke.update(delta, camera); this.sparks.update(delta, camera);\n', 'climax update call')
    presentation = replace_once(presentation, '    const speed = snapshot.turboActive ? 150 : 58;\n', '    const impactBoost = Math.min(1, this.climaxEnergy);\n    const speed = (snapshot.turboActive ? 150 : 58) + impactBoost * 72;\n', 'impact speed streak boost')
    presentation = replace_once(presentation, '    this.speedMaterial.opacity += ((snapshot.turboActive ? .42 : .045) - this.speedMaterial.opacity) * Math.min(1, delta * 8);\n  }\n\n  private updateProjectileTrails', '    const targetOpacity = (snapshot.turboActive ? .42 : .045) + impactBoost * .24;\n    this.speedMaterial.opacity += (targetOpacity - this.speedMaterial.opacity) * Math.min(1, delta * 8);\n  }\n\n  private updateClimax(delta: number, camera: THREE.Camera): void {\n    if (this.climaxEnergy <= .001) {\n      this.climaxEnergy = 0; this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0; return;\n    }\n    this.climaxEnergy = Math.max(0, this.climaxEnergy - delta * (this.climaxEnergy > 1 ? 3.4 : 2.8));\n    camera.getWorldDirection(this.forward);\n    this.climaxFlash.position.copy(camera.position).addScaledVector(this.forward, 2.4);\n    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.7;\n    this.climaxFlash.scale.set(7.5 * aspect, 7.5, 1);\n    this.climaxMaterial.opacity = Math.min(.38, .035 + this.climaxEnergy * .22);\n    this.climaxFlash.visible = true;\n  }\n\n  private updateProjectileTrails', 'climax update method')
    presentation = replace_once(presentation, '    this.smoke.dispose(); this.sparks.dispose(); this.root.clear(); this.scene.remove(this.root);\n', '    this.smoke.dispose(); this.sparks.dispose(); this.climaxMaterial.dispose(); this.root.clear(); this.scene.remove(this.root);\n', 'climax dispose')
write(presentation_path, presentation)

# 4) Trigger screen-wide climax, stronger debris energy and camera impact on confirmed enemy destruction.
webgl_path = 'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts'
webgl = read(webgl_path)
if 'emitClimax(group.position' not in webgl:
    webgl = replace_once(webgl, '''      if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated && previous && previous.depth > 3) {
        this.presentation.emitBurst(group.position, previous.boss ? 3.2 : 1);
      }
''', '''      if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated && previous && previous.depth > 3) {
        const climaxStrength = previous.boss ? 1.55 : previous.kind === "bomber" || previous.kind === "missile-boat" ? .78 : .52;
        this.presentation.emitClimax(group.position, climaxStrength);
        this.cameraShake = Math.min(1.18, this.cameraShake + (previous.boss ? .74 : .18));
        this.audio.tone(previous.boss ? 48 : 74, previous.boss ? .42 : .15, previous.boss ? .07 : .028, "sawtooth");
      }
''', 'destroy climax trigger')
write(webgl_path, webgl)

# 5) Update regression expectations and add V5 guarantees.
test_path = 'tests/sky-arcade-run.test.ts'
tests = read(test_path)
tests = tests.replace('stage.durationSeconds >= 14 && stage.durationSeconds <= 21', 'stage.durationSeconds >= 28 && stage.durationSeconds <= 42')
tests = tests.replace('every authored route is a seven-section two-minute start-to-finale run', 'every authored route is a seven-section four-minute start-to-finale run')
if 'environment density and destruction climax V5' not in tests:
    anchor = 'test("route graph references only authored stages and has one finale", () => {'
    addition = '''test("environment density and destruction climax V5 stay authored and bounded", async () => {
  assert.equal(SKY_DANCER_ARCADE_RUN_DURATION_SECONDS, 240);
  const [world, presentation, webgl] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeWebGLDemo.ts", import.meta.url), "utf8"),
  ]);
  assert.match(world, /arcade-near-pass-setpieces-v5/);
  assert.match(world, /const count=72/);
  assert.match(world, /PlaneGeometry\(260,114,48,30\)/);
  assert.match(presentation, /arcade-climax-flash-v5/);
  assert.match(presentation, /sparks: 240, smoke: 84/);
  assert.match(webgl, /emitClimax\(group\.position/);
});

'''
    tests = replace_once(tests, anchor, addition + anchor, 'V5 test insertion')
write(test_path, tests)

# 6) Keep the product reference aligned with the new pacing and visual pass.
doc_path = 'docs/ARCADE_RUN_PRODUCT_REFERENCE.md'
doc = read(doc_path)
doc = doc.replace('while each seven-section run is paced to roughly two minutes.', 'while each seven-section run is now paced to roughly four minutes, with every authored section doubled in play time.')
if '## Environment density and climax pass — 2026-08-31' not in doc:
    doc += '''\n\n## Environment density and climax pass — 2026-08-31\n\nArcade sections now run at twice their previous duration. The streamed world adds a fourth\nbackdrop depth layer, denser city blocks, higher-resolution terrain relief, and biome-specific\nvisual-only near-pass structures that skim the flight corridor without changing collision\nauthority. Enemy destruction now drives pooled multi-burst debris, a short full-screen additive\nflash, speed-streak energy and extra camera/audio impact; boss kills scale the same system up\ninstead of using a separate unbounded effect path.\n'''
write(doc_path, doc)

print('Arcade Run environment/climax V5 patch applied')
