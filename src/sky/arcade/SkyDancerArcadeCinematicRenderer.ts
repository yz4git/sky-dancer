import * as THREE from "three";

/**
 * Single bounded HDR target and nine-tap highlight composite.
 * No full-resolution bloom pyramid, blur veil, CSS color wash, or shadow map.
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
        bloomStrength:{value:.18},
      },
      vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
      fragmentShader:`
        uniform sampler2D sceneColor;uniform vec2 texel;uniform float bloomStrength;varying vec2 vUv;
        vec3 bright(vec2 uv){vec3 c=texture2D(sceneColor,uv).rgb;float l=max(c.r,max(c.g,c.b));return c*smoothstep(.86,1.8,l);}
        void main(){
          vec3 source=texture2D(sceneColor,vUv).rgb;
          vec2 r=texel*3.5;
          vec3 halo=bright(vUv)*.2;
          halo+=(bright(vUv+vec2(r.x,0))+bright(vUv-vec2(r.x,0))+bright(vUv+vec2(0,r.y))+bright(vUv-vec2(0,r.y)))*.125;
          halo+=(bright(vUv+r*1.6)+bright(vUv-r*1.6)+bright(vUv+vec2(-r.x,r.y)*1.6)+bright(vUv+vec2(r.x,-r.y)*1.6))*.075;
          vec2 p=(vUv-.5)*vec2(1.0,.8);
          float edge=smoothstep(.24,.62,length(p));
          vec3 result=(source+halo*bloomStrength)*(1.0-edge*.16);
          gl_FragColor=vec4(result,1.0);
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

  render(scene:THREE.Scene,camera:THREE.Camera,turbo:boolean):void {
    this.material.uniforms.bloomStrength.value=turbo ? .28 : .16;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene,camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene,this.camera);
  }

  dispose():void {
    this.target.dispose();this.material.dispose();this.quad.geometry.dispose();this.scene.clear();
  }
}
