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
  const cloud = stage.biome === "cloud";
  const night = ["night", "orbit", "citadel"].includes(stage.biome);
  const cloudHorizon = new THREE.Color(stage.palette.fog).lerp(new THREE.Color(stage.palette.secondary), .26);
  const cloudFog = new THREE.Color(stage.palette.fog).lerp(new THREE.Color(stage.palette.secondary), .34);
  return {
    // V40.45: commercial-cinematic dawn keeps a cool steel base with restrained warm sunlight.
    zenith: new THREE.Color(city ? 0x18384f : cloud ? 0x6d9fb8 : stage.palette.sky),
    horizon: city ? new THREE.Color(0xa17e6b) : cloud ? cloudHorizon : new THREE.Color(stage.palette.fog),
    fog: city ? new THREE.Color(0x6e808d) : cloud ? cloudFog : new THREE.Color(stage.palette.fog),
    cloudLight: new THREE.Color(city ? 0xcdbba7 : cloud ? 0xc9dce4 : night ? 0x7080a8 : stage.biome === "storm" ? 0x879bab : 0xdce8eb),
    cloudShadow: new THREE.Color(city ? 0x354b5e : cloud ? 0x4b6c7f : stage.biome === "storm" ? 0x263b50 : night ? 0x18213e : 0x506d80),
    key: city ? 0xe2bd8f : night ? 0x95aee0 : stage.biome === "volcano" ? 0xd97757 : 0xe1cfb5,
    keyIntensity: city ? 2.72 : cloud ? 1.92 : night ? 1.32 : 2.2,
    ambient: city ? .62 : cloud ? .94 : night ? .72 : 1.08,
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
        c=mix(c,vec3(1.05,.72,.46),glow*.5*(1.0-night)*(1.0-storm));
        c+=vec3(.94,.7,.42)*pow(sunDot,90.0)*.46*(1.0-night);
        float disc=smoothstep(.9993,.99972,sunDot);
        c+=mix(vec3(6.3,4.5,2.6),vec3(.5,.66,.92),night)*disc;
        vec2 cloudUV=d.xz/max(.12,d.y+.28)*3.0;
        float cloud=fbm(cloudUV*vec2(.8,2.5));
        float bank=smoothstep(.53,.77,cloud)*smoothstep(-.03,.2,d.y)*(1.0-smoothstep(.48,.83,d.y));
        vec3 cloudColor=mix(vec3(.17,.25,.34),mix(vec3(.82,.68,.54),vec3(.66,.79,.88),upper),glow*.62+.18);
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
        float verticalPanel=smoothstep(.82,.94,fract(fuv.x*.075+vBuildingSeed*.031));
        float panelSeed=hash21(cellID+floor(vBuildingSeed*.17));
        float panelTone=mix(.965,1.025,panelSeed);
        diffuseColor.rgb*=panelTone*(1.0-wall*(windowMask*.16+floorLine*.052+verticalPanel*.075));
      `)
      .replace("#include <roughnessmap_fragment>",`
        #include <roughnessmap_fragment>
        float arcadeGlass=windowMask*wall;
        roughnessFactor=mix(roughnessFactor,.24,arcadeGlass);
        roughnessFactor=mix(roughnessFactor,.72,wall*(1.0-arcadeGlass)*(.58+.42*hash21(cellID+13.7)));
      `)
      .replace("#include <metalnessmap_fragment>",`
        #include <metalnessmap_fragment>
        metalnessFactor=mix(metalnessFactor,.52,arcadeGlass);
        metalnessFactor=mix(metalnessFactor,.18,wall*(1.0-arcadeGlass));
      `)
      .replace("#include <emissivemap_fragment>",`
        #include <emissivemap_fragment>
        float occupied=step(.48-arcadeNight*.12,hash21(cellID+vBuildingSeed));
        vec3 lightColor=mix(vec3(.18,.48,.62),vec3(.82,.58,.35),step(.31,hash21(vec2(vBuildingSeed,cellID.y))));
        totalEmissiveRadiance+=lightColor*windowMask*wall*occupied*(.27+arcadeNight*.8);
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
        vec3 water=mix(vec3(.028,.105,.145),vec3(.045,.19,.25),ripples);
        water+=mix(vec3(.82,.56,.3),vec3(.11,.32,.5),night)*sunPath*(.05+glint*.31);
        water=mix(water,fogColor,smoothstep(105.0,560.0,vDepth));
        gl_FragColor=vec4(water,1.0);
      }`,
    // V10.3.2: the river follows pitched course chunks. Rendering only FrontSide made the surface
    // disappear whenever the camera crossed the local plane normal on a climb/dive.
    side:THREE.DoubleSide,depthWrite:true,depthTest:true,transparent:false,
  });
}
