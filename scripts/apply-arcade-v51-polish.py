from pathlib import Path

ROOT = Path('.')

def read(path): return (ROOT / path).read_text()
def write(path, text): (ROOT / path).write_text(text)
def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    return text.replace(old, new, 1)

# Keep near-pass structures dramatic without letting them occlude the player/corridor.
world_path = 'src/sky/arcade/SkyDancerArcadeReferenceWorld.ts'
world = read(world_path)
world = replace_once(world,
'''      const x=side*(20.5+r(j+71)*7.2);
      if(stage.biome==="city" || stage.biome==="night"){
        const h=25+r(j+11)*31;
        const w=2.8+r(j+19)*2.8;
        const tower=mesh(group,new THREE.BoxGeometry(w,h,4.8+r(j+23)*3.4),j%3===0?secondary:primary,x,-25+h/2,z);
        tower.rotation.y=(r(j+31)-.5)*.08;
        if(j%2===0) mesh(group,new THREE.BoxGeometry(.18,3.8+r(j+55)*5,.18),glow,x,-24+h+2.2,z);
''',
'''      const x=side*(25+r(j+71)*8.5);
      if(stage.biome==="city" || stage.biome==="night"){
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
''', 'near-pass city detail')
write(world_path, world)

# Turn confirmed kills into a brief screen-space punctuation: flash + expanding shock ring.
pres_path = 'src/sky/arcade/SkyDancerArcadeProductPresentation.ts'
pres = read(pres_path)
pres = replace_once(pres,
'''  private readonly climaxMaterial = new THREE.SpriteMaterial({ color: 0xffe4b0, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly climaxFlash = new THREE.Sprite(this.climaxMaterial);
  private climaxEnergy = 0;
''',
'''  private readonly climaxMaterial = new THREE.SpriteMaterial({ color: 0xffe4b0, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly climaxFlash = new THREE.Sprite(this.climaxMaterial);
  private readonly climaxRingMaterial = new THREE.MeshBasicMaterial({ color: 0xffefc8, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly climaxRing = new THREE.Mesh(new THREE.RingGeometry(.58, .72, 48), this.climaxRingMaterial);
  private climaxEnergy = 0;
  private climaxPulse = 0;
''', 'climax ring fields')
pres = replace_once(pres,
'''    this.climaxFlash.name = "arcade-climax-flash-v5";
    this.climaxFlash.visible = false;
    this.climaxFlash.renderOrder = 999;
    this.root.add(streaks, this.smoke.mesh, this.sparks.mesh, this.climaxFlash); scene.add(this.root);
''',
'''    this.climaxFlash.name = "arcade-climax-flash-v5";
    this.climaxFlash.visible = false;
    this.climaxFlash.renderOrder = 999;
    this.climaxRing.name = "arcade-climax-shock-ring-v51";
    this.climaxRing.visible = false;
    this.climaxRing.renderOrder = 998;
    this.root.add(streaks, this.smoke.mesh, this.sparks.mesh, this.climaxFlash, this.climaxRing); scene.add(this.root);
''', 'climax ring setup')
pres = replace_once(pres,
'''    this.climaxEnergy = 0; this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0;
''',
'''    this.climaxEnergy = 0; this.climaxPulse = 0;
    this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0;
    this.climaxRing.visible = false; this.climaxRingMaterial.opacity = 0;
''', 'climax reset')
pres = replace_once(pres,
'''    this.climaxEnergy = Math.max(this.climaxEnergy, power);
''',
'''    this.climaxEnergy = Math.max(this.climaxEnergy, Math.max(.68, power * .82));
    this.climaxPulse = 1;
''', 'climax energy')
pres = replace_once(pres,
'''  private updateClimax(delta: number, camera: THREE.Camera): void {
    if (this.climaxEnergy <= .001) {
      this.climaxEnergy = 0; this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0; return;
    }
    this.climaxEnergy = Math.max(0, this.climaxEnergy - delta * (this.climaxEnergy > 1 ? 3.4 : 2.8));
    camera.getWorldDirection(this.forward);
    this.climaxFlash.position.copy(camera.position).addScaledVector(this.forward, 2.4);
    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.7;
    this.climaxFlash.scale.set(7.5 * aspect, 7.5, 1);
    this.climaxMaterial.opacity = Math.min(.38, .035 + this.climaxEnergy * .22);
    this.climaxFlash.visible = true;
  }
''',
'''  private updateClimax(delta: number, camera: THREE.Camera): void {
    if (this.climaxEnergy <= .001 && this.climaxPulse <= .001) {
      this.climaxEnergy = 0; this.climaxPulse = 0;
      this.climaxFlash.visible = false; this.climaxMaterial.opacity = 0;
      this.climaxRing.visible = false; this.climaxRingMaterial.opacity = 0;
      return;
    }
    this.climaxEnergy = Math.max(0, this.climaxEnergy - delta * (this.climaxEnergy > 1 ? 4.4 : 3.6));
    this.climaxPulse = Math.max(0, this.climaxPulse - delta * 2.65);
    camera.getWorldDirection(this.forward);
    this.climaxFlash.position.copy(camera.position).addScaledVector(this.forward, 2.35);
    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.7;
    this.climaxFlash.scale.set(10.5 * aspect, 10.5, 1);
    this.climaxMaterial.opacity = Math.min(.48, .055 + this.climaxEnergy * .36);
    this.climaxFlash.visible = this.climaxEnergy > .001;
    this.climaxRing.position.copy(camera.position).addScaledVector(this.forward, 2.2);
    this.climaxRing.quaternion.copy(camera.quaternion);
    this.climaxRing.scale.setScalar(.82 + (1 - this.climaxPulse) * 2.8);
    this.climaxRingMaterial.opacity = Math.min(.62, this.climaxPulse * .7);
    this.climaxRing.visible = this.climaxPulse > .001;
  }
''', 'climax update')
pres = replace_once(pres,
'''    this.smoke.dispose(); this.sparks.dispose(); this.climaxMaterial.dispose(); this.root.clear(); this.scene.remove(this.root);
''',
'''    this.smoke.dispose(); this.sparks.dispose(); this.climaxMaterial.dispose();
    this.climaxRing.geometry.dispose(); this.climaxRingMaterial.dispose();
    this.root.clear(); this.scene.remove(this.root);
''', 'climax dispose')
write(pres_path, pres)

webgl_path = 'src/sky/arcade/SkyDancerArcadeWebGLDemo.ts'
webgl = read(webgl_path)
webgl = replace_once(webgl,
'''        const climaxStrength = previous.boss ? 1.55 : previous.kind === "bomber" || previous.kind === "missile-boat" ? .78 : .52;
''',
'''        const climaxStrength = previous.boss ? 1.7 : previous.kind === "bomber" || previous.kind === "missile-boat" ? 1.02 : .72;
''', 'kill climax strength')
write(webgl_path, webgl)

menu_path = 'app/CartGameMenu.tsx'
menu = read(menu_path)
menu = menu.replace('BRANCHING FIXED COURSE · 7 SECTIONS · ABOUT 2 MINUTES', 'BRANCHING FIXED COURSE · 7 SECTIONS · ABOUT 4 MINUTES')
menu = menu.replace('FIXED COURSE · 7 SECTIONS · 2 MIN', 'FIXED COURSE · 7 SECTIONS · 4 MIN')
write(menu_path, menu)

test_path = 'tests/sky-arcade-run.test.ts'
tests = read(test_path)
if 'V5.1 near-pass framing and shock-ring climax stay readable' not in tests:
    anchor = 'test("environment density and destruction climax V5 stay authored and bounded", async () => {'
    addition = '''test("V5.1 near-pass framing and shock-ring climax stay readable", async () => {
  const [world, presentation, menu] = await Promise.all([
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeReferenceWorld.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sky/arcade/SkyDancerArcadeProductPresentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/CartGameMenu.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(world, /const x=side\*\(25\+r\(j\+71\)\*8\.5\)/);
  assert.match(world, /w\*1\.38,h\*\.22,d\*1\.18/);
  assert.match(presentation, /arcade-climax-shock-ring-v51/);
  assert.match(presentation, /RingGeometry\(\.58, \.72, 48\)/);
  assert.match(menu, /7 SECTIONS · 4 MIN/);
});

'''
    tests = replace_once(tests, anchor, addition + anchor, 'V5.1 test')
write(test_path, tests)

print('Arcade Run V5.1 visual polish applied')
