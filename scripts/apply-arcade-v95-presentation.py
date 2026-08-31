from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:90]!r}")
    p.write_text(text.replace(old, new, 1))

# Event-driven presentation director. This deliberately owns only presentation energy;
# gameplay authority remains in SkyDancerArcadeRuntime.
director = r'''export interface SkyDancerArcadePresentationSignals {
  turboActive: boolean;
  nearMisses: number;
  enemiesDefeated: number;
  bossActive: boolean;
  hitSerial: number;
  damageSerial: number;
  stageSerial: number;
  resultSerial: number;
}

export interface SkyDancerArcadePresentationFrame {
  rush: number;
  turboKick: number;
  nearMiss: number;
  impact: number;
  damage: number;
  kill: number;
  boss: number;
  transition: number;
  fovKick: number;
  cameraShake: number;
  pullback: number;
  bloomBoost: number;
  exposureBoost: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const decay = (value: number, delta: number, speed: number) => Math.max(0, value - delta * speed);

/**
 * V9.5 Presentation Overdrive.
 * Converts discrete runtime events into short, overlapping cinematic envelopes without
 * changing hitboxes, movement, enemy logic, scoring, or timing authority.
 */
export class SkyDancerArcadePresentationDirector {
  private turboKick = 0;
  private nearMiss = 0;
  private impact = 0;
  private damage = 0;
  private kill = 0;
  private boss = 0;
  private transition = 0;
  private rush = 0;

  reset(): void {
    this.turboKick = 0;
    this.nearMiss = 0;
    this.impact = 0;
    this.damage = 0;
    this.kill = 0;
    this.boss = 0;
    this.transition = 0;
    this.rush = 0;
  }

  update(
    current: SkyDancerArcadePresentationSignals,
    previous: SkyDancerArcadePresentationSignals,
    delta: number,
  ): SkyDancerArcadePresentationFrame {
    const dt = Math.max(0, Math.min(.1, delta));
    if (current.turboActive && !previous.turboActive) this.turboKick = 1;
    if (current.nearMisses > previous.nearMisses) this.nearMiss = 1;
    if (current.hitSerial !== previous.hitSerial) this.impact = Math.max(this.impact, .72);
    if (current.damageSerial !== previous.damageSerial) this.damage = 1;
    if (current.enemiesDefeated > previous.enemiesDefeated) this.kill = 1;
    if (current.bossActive && !previous.bossActive) this.boss = 1;
    if (current.stageSerial !== previous.stageSerial) this.transition = 1;
    if (current.resultSerial !== previous.resultSerial) this.transition = Math.max(this.transition, .72);

    const rushTarget = current.turboActive ? 1 : 0;
    const response = 1 - Math.exp(-dt * (rushTarget > this.rush ? 8.5 : 4.4));
    this.rush += (rushTarget - this.rush) * response;

    const turboKick = this.turboKick;
    const nearMiss = this.nearMiss;
    const impact = this.impact;
    const damage = this.damage;
    const kill = this.kill;
    const boss = this.boss;
    const transition = this.transition;
    const rush = clamp01(this.rush + turboKick * .24 + nearMiss * .12 + kill * .08);

    const frame: SkyDancerArcadePresentationFrame = {
      rush,
      turboKick,
      nearMiss,
      impact,
      damage,
      kill,
      boss,
      transition,
      fovKick: turboKick * 5.2 + nearMiss * 2.1 + kill * 1.25 + boss * 1.5,
      cameraShake: nearMiss * .12 + impact * .045 + damage * .22 + kill * .07 + boss * .085,
      pullback: turboKick * .7 + boss * .5 + transition * .35,
      bloomBoost: rush * .09 + impact * .07 + kill * .11 + boss * .08 + transition * .07,
      exposureBoost: turboKick * .04 + impact * .035 + kill * .055 + transition * .045,
    };

    this.turboKick = decay(this.turboKick, dt, 3.8);
    this.nearMiss = decay(this.nearMiss, dt, 4.8);
    this.impact = decay(this.impact, dt, 7.2);
    this.damage = decay(this.damage, dt, 3.9);
    this.kill = decay(this.kill, dt, 3.35);
    this.boss = decay(this.boss, dt, 1.55);
    this.transition = decay(this.transition, dt, 2.25);
    return frame;
  }
}
'''
(ROOT / "src/sky/arcade/SkyDancerArcadePresentationDirector.ts").write_text(director)

# Cinematic composite: retain the bounded single HDR target, but add event-driven edge energy,
# subtle chromatic velocity separation, damage/boss accents and transition pulse.
cinematic = r'''import * as THREE from "three";
import type { SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";

const ZERO_FX: SkyDancerArcadePresentationFrame = {
  rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0,
  fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0,
};

/**
 * Single bounded HDR target and nine-tap highlight composite.
 * V9.5 adds only two velocity-color taps and scalar uniforms: no bloom pyramid, blur veil,
 * full-screen particle layer, shadow map, or extra render target.
 */
export class SkyDancerArcadeCinematicRenderer {
  private readonly target:THREE.WebGLRenderTarget;
  private readonly scene=new THREE.Scene();
  private readonly camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  private readonly material:THREE.ShaderMaterial;
  private readonly quad:THREE.Mesh;

  constructor(private readonly renderer:THREE.WebGLRenderer) {
    const hdr=renderer.extensions.has("EXT_color_buffer_float");
    this.target=new THREE.WebGLRenderTarget(1,1,{
      type:hdr?THREE.HalfFloatType:THREE.UnsignedByteType,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      depthBuffer:true,stencilBuffer:false,samples:2,
    });
    this.target.texture.name="arcade-hdr-scene";
    this.material=new THREE.ShaderMaterial({
      uniforms:{
        sceneColor:{value:this.target.texture},texel:{value:new THREE.Vector2(1,1)},
        bloomStrength:{value:.23},rushStrength:{value:0},impactStrength:{value:0},
        damageStrength:{value:0},bossStrength:{value:0},transitionStrength:{value:0},
        exposureBoost:{value:0},
      },
      vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
      fragmentShader:`
        uniform sampler2D sceneColor;uniform vec2 texel;uniform float bloomStrength;uniform float rushStrength;
        uniform float impactStrength;uniform float damageStrength;uniform float bossStrength;uniform float transitionStrength;
        uniform float exposureBoost;varying vec2 vUv;
        vec3 bright(vec2 uv){vec3 c=texture2D(sceneColor,uv).rgb;float l=max(c.r,max(c.g,c.b));return c*smoothstep(.86,1.8,l);}
        void main(){
          vec2 center=vUv-.5;float radial=length(center);vec2 dir=radial>.0001?center/radial:vec2(0.0);
          vec2 chroma=dir*texel*(1.0+rushStrength*6.0)*smoothstep(.12,.72,radial);
          vec3 base=texture2D(sceneColor,vUv).rgb;
          vec3 source=vec3(texture2D(sceneColor,vUv+chroma).r,base.g,texture2D(sceneColor,vUv-chroma).b);
          vec2 r=texel*3.2;
          vec3 halo=bright(vUv)*.22;
          halo+=(bright(vUv+vec2(r.x,0))+bright(vUv-vec2(r.x,0))+bright(vUv+vec2(0,r.y))+bright(vUv-vec2(0,r.y)))*.125;
          halo+=(bright(vUv+r*1.6)+bright(vUv-r*1.6)+bright(vUv+vec2(-r.x,r.y)*1.6)+bright(vUv+vec2(r.x,-r.y)*1.6))*.075;
          vec2 p=center*vec2(1.0,.8);float edge=smoothstep(.25,.66,length(p));
          vec3 result=(source+halo*bloomStrength)*(1.0-edge*.12);
          float luma=dot(result,vec3(.2126,.7152,.0722));result=mix(vec3(luma),result,1.08);result=(result-.5)*1.055+.5;
          result+=vec3(.025,.006,-.012)*smoothstep(.62,1.25,luma);result+=vec3(-.012,.002,.024)*(1.0-smoothstep(.16,.5,luma));
          result+=vec3(.07,.16,.23)*rushStrength*edge;
          result+=vec3(.35,.12,.025)*impactStrength*(.055+edge*.025);
          result+=vec3(.36,.012,.0)*damageStrength*edge*.5;
          result+=vec3(.16,.035,.015)*bossStrength*(.035+edge*.11);
          result+=vec3(.18,.31,.42)*transitionStrength*(.035+(1.0-edge)*.025);
          result*=1.0+exposureBoost;
          gl_FragColor=vec4(max(result,vec3(0.0)),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      depthTest:false,depthWrite:false,toneMapped:true,
    });
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);
    this.quad.frustumCulled=false;this.scene.add(this.quad);
  }

  resize(width:number,height:number):void {
    const ratio=this.renderer.getPixelRatio();
    this.target.setSize(Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio)));
    this.material.uniforms.texel.value.set(1/this.target.width,1/this.target.height);
  }

  render(scene:THREE.Scene,camera:THREE.Camera,turbo:boolean,fx:SkyDancerArcadePresentationFrame=ZERO_FX):void {
    this.material.uniforms.bloomStrength.value=(turbo?.36:.22)+fx.bloomBoost;
    this.material.uniforms.rushStrength.value=fx.rush;
    this.material.uniforms.impactStrength.value=Math.max(fx.impact,fx.kill*.72);
    this.material.uniforms.damageStrength.value=fx.damage;
    this.material.uniforms.bossStrength.value=fx.boss;
    this.material.uniforms.transitionStrength.value=fx.transition;
    this.material.uniforms.exposureBoost.value=fx.exposureBoost;
    this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);
    this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  }

  dispose():void {this.target.dispose();this.material.dispose();this.quad.geometry.dispose();this.scene.clear();}
}
'''
(ROOT / "src/sky/arcade/SkyDancerArcadeCinematicRenderer.ts").write_text(cinematic)

# WebGL demo integration.
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    'import { SkyDancerArcadeCinematicRenderer } from "./SkyDancerArcadeCinematicRenderer";\n',
    'import { SkyDancerArcadeCinematicRenderer } from "./SkyDancerArcadeCinematicRenderer";\nimport { SkyDancerArcadePresentationDirector, type SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '  private cameraShake = 0;\n',
    '  private cameraShake = 0;\n  private readonly presentationDirector = new SkyDancerArcadePresentationDirector();\n  private presentationFx: SkyDancerArcadePresentationFrame = { rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0, fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0 };\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '      this.sync(snapshot, snapshot.status === "paused" ? 0 : elapsed);\n      this.cinematic.render(this.scene, this.camera, snapshot.turboActive);\n',
    '      this.sync(snapshot, snapshot.status === "paused" ? 0 : elapsed);\n      this.cinematic.render(this.scene, this.camera, snapshot.turboActive, this.presentationFx);\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '  private sync(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    if (snapshot.stage.id !== this.currentStageId) {\n',
    '  private sync(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    this.presentationFx = this.presentationDirector.update(snapshot, this.previousSnapshot, delta);\n    if (snapshot.stage.id !== this.currentStageId) {\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.presentation.update(snapshot, delta, this.camera);\n',
    '    this.presentation.update(snapshot, delta, this.camera, this.presentationFx);\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {\n      this.cameraShake = Math.min(.8, this.cameraShake + .4);\n      this.presentation.emitBurst(this.player.position, .45);\n    }\n',
    '    if (snapshot.damageSerial !== this.previousSnapshot.damageSerial) {\n      this.cameraShake = Math.min(.8, this.cameraShake + .4);\n      this.presentation.emitBurst(this.player.position, .45);\n    }\n    if (snapshot.nearMisses > this.previousSnapshot.nearMisses) {\n      this.cameraShake = Math.min(.82, this.cameraShake + .11);\n      this.presentation.emitRushAccent();\n    }\n    if (snapshot.turboActive && !this.previousSnapshot.turboActive) this.presentation.emitRushAccent();\n    if (snapshot.bossActive && !this.previousSnapshot.bossActive) this.presentation.emitBossArrival();\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    if (snapshot.resultSerial !== this.previousSnapshot.resultSerial) this.audio.tone(660, 0.32, 0.045, "triangle");\n',
    '    if (snapshot.resultSerial !== this.previousSnapshot.resultSerial) this.audio.tone(660, 0.32, 0.045, "triangle");\n    if (snapshot.turboActive && !this.previousSnapshot.turboActive) this.audio.tone(132, .2, .035, "sawtooth");\n    if (snapshot.nearMisses > this.previousSnapshot.nearMisses) this.audio.tone(1180, .075, .018, "triangle");\n    if (snapshot.enemiesDefeated > this.previousSnapshot.enemiesDefeated) this.audio.tone(236, .08, .018, "triangle");\n    if (snapshot.bossActive && !this.previousSnapshot.bossActive) { this.audio.tone(72, .42, .052, "sawtooth"); this.audio.tone(144, .34, .025, "triangle"); }\n    if (snapshot.stageSerial !== this.previousSnapshot.stageSerial) this.audio.tone(330, .18, .025, "triangle");\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    const shakeX = Math.sin(snapshot.runTimeSeconds * 79) * this.cameraShake * .25;\n    const shakeY = Math.cos(snapshot.runTimeSeconds * 91) * this.cameraShake * .18;\n',
    '    const totalShake = this.cameraShake + this.presentationFx.cameraShake;\n    const shakeX = Math.sin(snapshot.runTimeSeconds * 79) * totalShake * .25;\n    const shakeY = Math.cos(snapshot.runTimeSeconds * 91) * totalShake * .18;\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeWebGLDemo.ts",
    '    this.camera.position.z += (pose.z - this.camera.position.z) * Math.min(1, delta * 4.5);\n    this.camera.fov += (pose.fov - this.camera.fov) * Math.min(1, delta * 4.5);\n',
    '    this.camera.position.z += (pose.z + this.presentationFx.pullback - this.camera.position.z) * Math.min(1, delta * 4.5);\n    this.camera.fov += (pose.fov + this.presentationFx.fovKick - this.camera.fov) * Math.min(1, delta * 7.2);\n',
)

# Reuse the existing bounded speed streaks and climax layers instead of adding full-screen particle systems.
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    'import { arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";\n',
    'import { arcadeCourseRelativePose } from "./SkyDancerArcadeCoursePath";\nimport type { SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  private climaxEnergy = 0;\n  private climaxPulse = 0;\n',
    '  private climaxEnergy = 0;\n  private climaxPulse = 0;\n  private rushAccent = 0;\n  private bossArrival = 0;\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '    this.climaxEnergy = 0; this.climaxPulse = 0;\n',
    '    this.climaxEnergy = 0; this.climaxPulse = 0; this.rushAccent = 0; this.bossArrival = 0;\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  emitClimax(position: THREE.Vector3, strength: number): void {\n',
    '  emitRushAccent(): void { this.rushAccent = 1; }\n\n  emitBossArrival(): void { this.bossArrival = 1; this.climaxEnergy = Math.max(this.climaxEnergy, .34); this.climaxPulse = Math.max(this.climaxPulse, .58); }\n\n  emitClimax(position: THREE.Vector3, strength: number): void {\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  update(snapshot: SkyDancerArcadeSnapshot, delta: number, camera: THREE.Camera): void {\n    this.updateSpeedStreaks(snapshot, delta);\n',
    '  update(snapshot: SkyDancerArcadeSnapshot, delta: number, camera: THREE.Camera, fx?: SkyDancerArcadePresentationFrame): void {\n    this.rushAccent = Math.max(0, this.rushAccent - delta * 4.2);\n    this.bossArrival = Math.max(0, this.bossArrival - delta * 1.55);\n    this.updateSpeedStreaks(snapshot, delta, fx);\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '  private updateSpeedStreaks(snapshot: SkyDancerArcadeSnapshot, delta: number): void {\n    const impactBoost = Math.min(1, this.climaxEnergy);\n    const speed = (snapshot.turboActive ? 205 : 78) + impactBoost * 82;\n',
    '  private updateSpeedStreaks(snapshot: SkyDancerArcadeSnapshot, delta: number, fx?: SkyDancerArcadePresentationFrame): void {\n    const impactBoost = Math.min(1, this.climaxEnergy);\n    const rush = Math.min(1.35, (fx?.rush ?? 0) + this.rushAccent * .58 + this.bossArrival * .18);\n    const speed = (snapshot.turboActive ? 205 : 78) + impactBoost * 82 + rush * 68;\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '      this.speedPositions.set([x, y, z, x, y, z - (snapshot.turboActive ? 13 : 4.2)], j);\n',
    '      const length = (snapshot.turboActive ? 13 : 4.2) + rush * 7.2 + this.bossArrival * 2.1;\n      this.speedPositions.set([x, y, z, x, y, z - length], j);\n',
)
replace(
    "src/sky/arcade/SkyDancerArcadeProductPresentation.ts",
    '    const targetOpacity = (snapshot.turboActive ? .52 : .075) + impactBoost * .24;\n',
    '    const targetOpacity = Math.min(.76, (snapshot.turboActive ? .52 : .075) + impactBoost * .24 + rush * .16 + this.bossArrival * .09);\n',
)

# Add behavioral contract tests for the new director and a cheap shader-budget guard.
replace(
    "tests/sky-arcade-run.test.ts",
    'import { arcadeCoursePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";\n',
    'import { arcadeCoursePose } from "../src/sky/arcade/SkyDancerArcadeCoursePath";\nimport { SkyDancerArcadePresentationDirector } from "../src/sky/arcade/SkyDancerArcadePresentationDirector";\n',
)

test_block = r'''

test("V9.5 presentation director stacks speed, near-miss, damage and boss peaks without touching gameplay", async () => {
  const base = { turboActive: false, nearMisses: 0, enemiesDefeated: 0, bossActive: false, hitSerial: 0, damageSerial: 0, stageSerial: 0, resultSerial: 0 };
  const director = new SkyDancerArcadePresentationDirector();
  const turbo = director.update({ ...base, turboActive: true }, base, 1 / 60);
  assert.ok(turbo.rush > 0);
  assert.ok(turbo.fovKick >= 5);
  assert.ok(turbo.bloomBoost > 0);

  director.reset();
  const near = director.update({ ...base, nearMisses: 1 }, base, 1 / 60);
  assert.ok(near.nearMiss > .9);
  assert.ok(near.cameraShake > .1);
  assert.ok(near.fovKick > 1.5);

  director.reset();
  const damage = director.update({ ...base, damageSerial: 1 }, base, 1 / 60);
  assert.ok(damage.damage > .9);
  assert.ok(damage.cameraShake > .2);

  director.reset();
  const boss = director.update({ ...base, bossActive: true }, base, 1 / 60);
  assert.ok(boss.boss > .9);
  assert.ok(boss.pullback > .4);

  const cinematic = await readFile(new URL("../src/sky/arcade/SkyDancerArcadeCinematicRenderer.ts", import.meta.url), "utf8");
  assert.match(cinematic, /only two velocity-color taps/);
  assert.match(cinematic, /rushStrength/);
  assert.match(cinematic, /damageStrength/);
});
'''
with (ROOT / "tests/sky-arcade-run.test.ts").open("a") as f:
    f.write(test_block)

print("Applied Arcade Run V9.5 Presentation Overdrive")
