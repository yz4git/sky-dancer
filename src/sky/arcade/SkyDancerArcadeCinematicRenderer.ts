import * as THREE from "three";
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
