import * as THREE from "three";
import type { SkyDancerArcadeStageDefinition } from "./SkyDancerArcadeData";

export const ARCADE_SUN_DIRECTION = new THREE.Vector3(-.62, .25, -.73).normalize();
export const ARCADE_FOG_NEAR = 88;
export const ARCADE_FOG_FAR = 560;

export const ARCADE_NOISE_GLSL = `
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return .57*noise21(p)+.28*noise21(p*2.03+7.1)+.15*noise21(p*4.09+19.3);}
`;

export function referenceAtmosphere(stage: SkyDancerArcadeStageDefinition) {
  const city = stage.biome === "city";
  const night = ["night", "orbit", "citadel"].includes(stage.biome);
  return {
    zenith: new THREE.Color(city ? 0x0b6198 : stage.palette.sky),
    horizon: new THREE.Color(city ? 0xffb866 : stage.palette.fog),
    fog: new THREE.Color(city ? 0x879caf : stage.palette.fog),
    cloudLight: new THREE.Color(city ? 0xffddb0 : night ? 0x7283b5 : stage.biome === "storm" ? 0x90a5b9 : 0xeaf6ff),
    cloudShadow: new THREE.Color(city ? 0x405d78 : stage.biome === "storm" ? 0x253e5b : night ? 0x151e43 : 0x557b98),
    key: city ? 0xffc77b : night ? 0x98b4ff : stage.biome === "volcano" ? 0xff774a : 0xffe7c4,
    keyIntensity: city ? 3.35 : night ? 1.4 : 2.5,
    ambient: city ? .7 : night ? .8 : 1.3,
    night,
  };
}

export function createArcadeSky(stage: SkyDancerArcadeStageDefinition): THREE.Mesh {
  const palette = referenceAtmosphere(stage);
  const shader = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: palette.zenith }, horizon: { value: palette.horizon },
      sunDirection: { value: ARCADE_SUN_DIRECTION },
      night: { value: palette.night ? 1 : 0 }, storm: { value: stage.biome === "storm" ? 1 : 0 },
    },
    vertexShader: `varying vec3 vSkyDirection; void main(){vSkyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform vec3 zenith,horizon,sunDirection;
      uniform float night,storm;
      varying vec3 vSkyDirection;
      ${ARCADE_NOISE_GLSL}
      void main(){
        vec3 d=normalize(vSkyDirection);
        float sunDot=max(0.0,dot(d,sunDirection));
        float upper=smoothstep(-.08,.65,d.y);
        vec3 c=mix(horizon,zenith,upper);
        float glow=pow(sunDot,14.0);
        c=mix(c,vec3(1.2,.59,.17),glow*.58*(1.0-night)*(1.0-storm));
        c+=vec3(1.0,.64,.28)*pow(sunDot,90.0)*.6*(1.0-night);
        float disc=smoothstep(.9993,.99972,sunDot);
        c+=mix(vec3(9.0,5.1,2.1),vec3(.52,.7,1.0),night)*disc;
        vec2 cloudUV=d.xz/max(.12,d.y+.28)*3.0;
        float cloud=fbm(cloudUV*vec2(.8,2.5));
        float bank=smoothstep(.53,.77,cloud)*smoothstep(-.03,.2,d.y)*(1.0-smoothstep(.48,.83,d.y));
        vec3 cloudColor=mix(vec3(.18,.29,.43),mix(vec3(1.03,.65,.3),vec3(.65,.82,1.0),upper),glow*.75+.22);
        c=mix(c,cloudColor,bank*(.36+.28*storm)*(1.0-night*.65));
        if(night>.5){float stars=step(.9987,hash21(floor(d.xy*vec2(800.0,540.0))));c+=stars*smoothstep(.05,.4,d.y)*.6;}
        c=mix(c,horizon*.5,1.0-smoothstep(-.4,-.03,d.y));
        gl_FragColor=vec4(c,1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(980,32,18),shader);
  sky.name="arcade-product-gradient-sky";
  sky.renderOrder=-100;
  return sky;
}

/** InstanceColor supplies body paint; windows use world-sized cells, not giant glowing rectangles. */
export function createArcadeFacadeMaterial(night: boolean): THREE.MeshStandardMaterial {
  const material=new THREE.MeshStandardMaterial({ color:0xffffff,roughness:.6,metalness:.28 });
  material.onBeforeCompile=shader=>{
    shader.uniforms.arcadeNight={value:night?1:0};
    shader.vertexShader=shader.vertexShader
      .replace("#include <common>","#include <common>\nvarying vec3 vFacadePosition; varying vec3 vFacadeNormal; varying vec3 vFacadeSize; varying float vBuildingSeed;")
      .replace("#include <begin_vertex>",`
        #include <begin_vertex>
        vFacadePosition=position;
        vFacadeNormal=normal;
        vFacadeSize=vec3(1.0);vBuildingSeed=0.0;
        #ifdef USE_INSTANCING
          vFacadeSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
          vBuildingSeed=instanceMatrix[3].x+instanceMatrix[3].z;
        #endif
      `);
    shader.fragmentShader=shader.fragmentShader
      .replace("#include <common>",`#include <common>
        uniform float arcadeNight;
        varying vec3 vFacadePosition,vFacadeNormal,vFacadeSize;
        varying float vBuildingSeed;
        ${ARCADE_NOISE_GLSL}
      `)
      .replace("#include <color_fragment>",`
        #include <color_fragment>
        vec3 facade=(vFacadePosition+.5)*vFacadeSize;
        vec2 fuv=vec2(abs(vFacadeNormal.x)>.5?facade.z:facade.x,facade.y);
        vec2 cell=fract(fuv*vec2(.48,.36));
        vec2 cellID=floor(fuv*vec2(.48,.36));
        float windowMask=step(.25,cell.x)*step(cell.x,.72)*step(.28,cell.y)*step(cell.y,.69);
        float wall=1.0-step(.5,abs(vFacadeNormal.y));
        float floorLine=1.0-smoothstep(.018,.05,cell.y);
        float verticalPanel=smoothstep(.82,.94,fract(fuv.x*.075+vBuildingSeed*.031)); diffuseColor.rgb*=1.0-wall*(windowMask*.14+floorLine*.055+verticalPanel*.09);
      `)
      .replace("#include <emissivemap_fragment>",`
        #include <emissivemap_fragment>
        float occupied=step(.48-arcadeNight*.12,hash21(cellID+vBuildingSeed));
        vec3 lightColor=mix(vec3(.1,.63,1.0),vec3(1.0,.5,.13),step(.28,hash21(vec2(vBuildingSeed,cellID.y))));
        totalEmissiveRadiance+=lightColor*windowMask*wall*occupied*(.38+arcadeNight*1.0);
      `);
  };
  material.customProgramCacheKey=()=>"arcade-city-facade-reference-v2";
  return material;
}

export function createArcadeCloudMaterial(stage: SkyDancerArcadeStageDefinition): THREE.ShaderMaterial {
  const palette=referenceAtmosphere(stage);
  return new THREE.ShaderMaterial({
    uniforms:{
      lit:{value:palette.cloudLight},shade:{value:palette.cloudShadow},
      sunDirection:{value:ARCADE_SUN_DIRECTION},fogColor:{value:palette.fog},
    },
    vertexShader:`
      varying vec3 vNormal,vWorld,vView;varying float vDepth;
      void main(){
        vec4 world=vec4(position,1.0);
        vec3 n=normal;
        #ifdef USE_INSTANCING
          world=instanceMatrix*world;
          n=mat3(instanceMatrix)*n;
        #endif
        world=modelMatrix*world;
        vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*n);
        vView=cameraPosition-world.xyz;
        vec4 mv=viewMatrix*world;vDepth=-mv.z;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform vec3 lit,shade,sunDirection,fogColor;
      varying vec3 vNormal,vWorld,vView;varying float vDepth;
      ${ARCADE_NOISE_GLSL}
      void main(){
        vec3 n=normalize(vNormal);
        float facing=max(0.0,dot(n,normalize(vView)));
        float soft=smoothstep(.0,.52,facing);
        float billow=fbm(vWorld.xz*.16+vWorld.y*.03);
        float light=clamp(dot(n,sunDirection)*.5+.55,0.0,1.0);
        vec3 c=mix(shade,lit,pow(light,.72));
        c*=.91+billow*.19;
        c+=lit*pow(1.0-facing,3.0)*light*.32;
        float fog=smoothstep(90.0,545.0,vDepth);
        c=mix(c,fogColor,fog);
        float edgeLight=pow(max(0.0,1.0-facing),2.5)*light; c+=lit*edgeLight*.13; gl_FragColor=vec4(c,soft*(.42+billow*.13)*(1.0-fog*.82));
      }`,
    transparent:true,depthWrite:false,side:THREE.FrontSide,
  });
}

export function createArcadeWaterMaterial(stage: SkyDancerArcadeStageDefinition): THREE.ShaderMaterial {
  const palette=referenceAtmosphere(stage);
  return new THREE.ShaderMaterial({
    uniforms:{time:{value:0},night:{value:palette.night?1:0},fogColor:{value:palette.fog}},
    vertexShader:`varying vec3 vWorld;varying float vDepth;void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;vec4 mv=viewMatrix*world;vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`
      uniform float time,night;uniform vec3 fogColor;
      varying vec3 vWorld;varying float vDepth;
      ${ARCADE_NOISE_GLSL}
      void main(){
        vec2 uv=vWorld.xz;
        float broad=fbm(uv*vec2(.055,.24)+vec2(time*.018,time*.12)); float cross=fbm(uv*vec2(.17,.075)+vec2(-time*.055,time*.035)+17.0); float ripples=mix(broad,cross,.34);
        float glint=pow(max(0.0,cross*.9+broad*.55-.63),5.0);
        float sunPath=exp(-pow((uv.x+11.0)/18.0,2.0));
        vec3 water=mix(vec3(.025,.13,.19),vec3(.035,.27,.38),ripples);
        water+=mix(vec3(1.05,.42,.07),vec3(.04,.42,.78),night)*sunPath*(.075+glint*.48);
        water=mix(water,fogColor,smoothstep(105.0,560.0,vDepth));
        gl_FragColor=vec4(water,1.0);
      }`,
  });
}
