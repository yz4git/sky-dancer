import * as THREE from "three";
import type { SkyDancerArcadePresentationFrame } from "./SkyDancerArcadePresentationDirector";

const ZERO_FX: SkyDancerArcadePresentationFrame = {
  rush: 0, turboKick: 0, nearMiss: 0, impact: 0, damage: 0, kill: 0, boss: 0, transition: 0,
  fovKick: 0, cameraShake: 0, pullback: 0, bloomBoost: 0, exposureBoost: 0,
};

export const SKY_DANCER_ARCADE_SUPPRESSED_SCREEN_FLASH_OBJECTS_V21 = [
  "arcade-climax-flash-v5",
  "arcade-climax-shock-ring-v51",
] as const;

export interface SkyDancerArcadeCinematicPostFxV21 {
  bloomStrength: number;
  rushStrength: number;
  impactStrength: number;
  damageStrength: number;
  bossStrength: number;
  transitionStrength: number;
  exposureBoost: number;
}

/**
 * V21 hard-bounds whole-frame light changes so dense combat cannot turn ordinary hits/kills
 * into brightness flicker. Local explosion meshes remain untouched and carry the impact instead.
 */
export function skyDancerArcadeCinematicPostFxV21(
  turbo: boolean,
  fx: SkyDancerArcadePresentationFrame = ZERO_FX,
): SkyDancerArcadeCinematicPostFxV21 {
  return {
    bloomStrength: Math.min(.5, (turbo ? .36 : .22) + Math.min(.24, Math.max(0, fx.bloomBoost))),
    rushStrength: Math.min(1, Math.max(0, fx.rush)),
    impactStrength: Math.min(.42, Math.max(Math.max(0, fx.impact) * .42, Math.max(0, fx.kill) * .26)),
    damageStrength: Math.min(1, Math.max(0, fx.damage)),
    bossStrength: Math.min(1, Math.max(0, fx.boss)),
    transitionStrength: Math.min(1, Math.max(0, fx.transition)),
    exposureBoost: Math.min(.1, Math.max(0, fx.exposureBoost)),
  };
}

export interface SkyDancerArcadeCinematicTargetSizeV22 {
  width: number;
  height: number;
  pixelRatio: number;
  compactLandscape: boolean;
}

/**
 * V22 render stability.
 *
 * iPhone Safari can report a sequence of tiny visual-viewport size changes while its browser
 * chrome settles. Reallocating a half-float post target at full DPR for every one of those
 * changes can briefly present an empty backing store. Compact landscape therefore uses a
 * bounded post-process DPR, while larger displays keep the previous quality ceiling.
 */
export function skyDancerArcadeCinematicTargetSizeV22(
  width: number,
  height: number,
  rendererPixelRatio: number,
): SkyDancerArcadeCinematicTargetSizeV22 {
  const cssWidth = Math.max(1, Math.round(width));
  const cssHeight = Math.max(1, Math.round(height));
  const compactLandscape = cssWidth > cssHeight && cssHeight <= 520;
  const ratioCeiling = compactLandscape ? 1.3 : 1.6;
  const pixelRatio = Math.min(ratioCeiling, Math.max(1, rendererPixelRatio || 1));
  return {
    width: Math.max(1, Math.round(cssWidth * pixelRatio)),
    height: Math.max(1, Math.round(cssHeight * pixelRatio)),
    pixelRatio,
    compactLandscape,
  };
}

/**
 * Single bounded HDR target and nine-tap highlight composite.
 * V9.5 adds only two velocity-color taps and scalar uniforms: no bloom pyramid, blur veil,
 * full-screen particle layer, shadow map, or extra render target.
 */
export class SkyDancerArcadeCinematicRenderer {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private targetWidth = 0;
  private targetHeight = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    const hdr = renderer.extensions.has("EXT_color_buffer_float");
    const compactLandscape = typeof window !== "undefined"
      && window.innerWidth > window.innerHeight
      && window.innerHeight <= 520;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      // The renderer canvas already owns antialiasing. A second MSAA half-float target is an
      // expensive duplicate allocation on phone GPUs and is the most fragile path during resize.
      samples: compactLandscape ? 0 : 2,
    });
    this.target.texture.name = "arcade-hdr-scene";
    this.target.texture.generateMipmaps = false;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        sceneColor: { value: this.target.texture }, texel: { value: new THREE.Vector2(1, 1) },
        bloomStrength: { value: .23 }, rushStrength: { value: 0 }, impactStrength: { value: 0 },
        damageStrength: { value: 0 }, bossStrength: { value: 0 }, transitionStrength: { value: 0 },
        exposureBoost: { value: 0 },
      },
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
      fragmentShader: `
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
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  resize(width: number, height: number): void {
    const size = skyDancerArcadeCinematicTargetSizeV22(width, height, this.renderer.getPixelRatio());
    // ResizeObserver is allowed to fire even when the integer backing-store size is unchanged.
    // Avoid throwing away a valid rendered frame and reallocating GPU memory in that case.
    if (size.width === this.targetWidth && size.height === this.targetHeight) return;
    this.targetWidth = size.width;
    this.targetHeight = size.height;
    this.target.setSize(size.width, size.height);
    this.material.uniforms.texel.value.set(1 / size.width, 1 / size.height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, turbo: boolean, fx: SkyDancerArcadePresentationFrame = ZERO_FX): void {
    const postFx = skyDancerArcadeCinematicPostFxV21(turbo, fx);
    this.material.uniforms.bloomStrength.value = postFx.bloomStrength;
    this.material.uniforms.rushStrength.value = postFx.rushStrength;
    this.material.uniforms.impactStrength.value = postFx.impactStrength;
    this.material.uniforms.damageStrength.value = postFx.damageStrength;
    this.material.uniforms.bossStrength.value = postFx.bossStrength;
    this.material.uniforms.transitionStrength.value = postFx.transitionStrength;
    this.material.uniforms.exposureBoost.value = postFx.exposureBoost;

    // Legacy presentation still owns two camera-facing additive meshes that intentionally filled
    // the viewport. They stay suppressed; V22 addresses the separate backing-store flicker path.
    const suppressed = SKY_DANCER_ARCADE_SUPPRESSED_SCREEN_FLASH_OBJECTS_V21
      .map((name) => scene.getObjectByName(name))
      .filter((object): object is THREE.Object3D => Boolean(object));
    const visibility = suppressed.map((object) => object.visible);
    for (const object of suppressed) object.visible = false;
    try {
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(scene, camera);
    } finally {
      suppressed.forEach((object, index) => { object.visible = visibility[index]; });
    }
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
    this.scene.clear();
  }
}
